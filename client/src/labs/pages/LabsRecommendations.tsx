import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useSession } from "@/lib/session";
import { flavorProfileApi, communityApi } from "@/lib/api";
import {
  ChevronLeft, Sparkles, Wine, MapPin, Droplets, Flame, Users,
  Info, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";

interface Whisky {
  id: string;
  name: string;
  distillery: string | null;
  age: string | null;
  abv: number | null;
  region: string | null;
  category: string | null;
  caskInfluence: string | null;
  peatLevel: string | null;
  imageUrl: string | null;
  whiskybaseId: string | null;
}

interface CommunityScore {
  whiskyKey: string;
  avgOverall: number;
  totalRaters: number;
}

interface BreakdownEntry { count: number; avgScore: number }

type FactorKey = "region" | "cask" | "peat" | "community";

const FACTOR_DEFAULTS: Record<FactorKey, number> = { region: 0.35, cask: 0.25, peat: 0.25, community: 0.15 };
const FACTOR_META: { key: FactorKey; label: string; icon: typeof MapPin; pct: string }[] = [
  { key: "region", label: "Region", icon: MapPin, pct: "35%" },
  { key: "cask", label: "Cask", icon: Droplets, pct: "25%" },
  { key: "peat", label: "Peat", icon: Flame, pct: "25%" },
  { key: "community", label: "Community", icon: Users, pct: "15%" },
];

interface Recommendation {
  whisky: Whisky;
  score: number;
  reasons: string[];
  communityScore?: number;
  communityRaters?: number;
}

function computeRecommendations(
  ratedWhiskies: Array<{ whisky: Whisky; rating: { overall: number } }>,
  allWhiskies: Whisky[],
  regionBreakdown: Record<string, BreakdownEntry>,
  caskBreakdown: Record<string, BreakdownEntry>,
  peatBreakdown: Record<string, BreakdownEntry>,
  communityScores: CommunityScore[] | undefined,
  weights: Record<FactorKey, number>,
): Recommendation[] {
  const ratedIds = new Set(ratedWhiskies.map(r => r.whisky.id));
  const unrated = allWhiskies.filter(w => !ratedIds.has(w.id));
  if (unrated.length === 0) return [];

  const communityMap = new Map<string, CommunityScore>();
  if (communityScores) {
    for (const cs of communityScores) communityMap.set(cs.whiskyKey, cs);
  }

  const topRegions = Object.entries(regionBreakdown).sort((a, b) => b[1].avgScore - a[1].avgScore).slice(0, 3).map(([r]) => r);
  const topCasks = Object.entries(caskBreakdown).sort((a, b) => b[1].avgScore - a[1].avgScore).slice(0, 3).map(([c]) => c);
  const topPeat = Object.entries(peatBreakdown).sort((a, b) => b[1].avgScore - a[1].avgScore).slice(0, 2).map(([p]) => p);

  const scored = unrated.map(w => {
    let score = 0;
    const reasons: string[] = [];
    if (weights.region > 0 && w.region && topRegions.includes(w.region)) {
      score += (regionBreakdown[w.region]?.avgScore || 0) * weights.region;
      reasons.push(w.region);
    }
    if (weights.cask > 0 && w.caskInfluence && topCasks.includes(w.caskInfluence)) {
      score += (caskBreakdown[w.caskInfluence]?.avgScore || 0) * weights.cask;
      reasons.push(w.caskInfluence);
    }
    if (weights.peat > 0 && w.peatLevel && topPeat.includes(w.peatLevel)) {
      score += (peatBreakdown[w.peatLevel]?.avgScore || 0) * weights.peat;
      reasons.push(w.peatLevel);
    }
    const key = w.whiskybaseId
      ? `wb:${w.whiskybaseId}`
      : `name:${(w.name || "").toLowerCase().trim()}|${(w.distillery || "").toLowerCase().trim()}`;
    const cs = communityMap.get(key);
    if (weights.community > 0 && cs && cs.totalRaters >= 2) {
      score += cs.avgOverall * weights.community;
      reasons.push(`★ ${cs.avgOverall}`);
    }
    return { whisky: w, score, reasons, communityScore: cs?.avgOverall, communityRaters: cs?.totalRaters };
  });

  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 10);
}

function ScoreRing({ score }: { score: number }) {
  const r = 18, c = 2 * Math.PI * r, o = c - (score / 100) * c;
  const color = score >= 70 ? "var(--labs-success)" : score >= 40 ? "var(--labs-accent)" : "var(--labs-text-muted)";
  return (
    <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
      <svg width={44} height={44} style={{ transform: "rotate(-90deg)" }} viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--labs-border)" strokeWidth="3" />
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="3" stroke={color} strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" />
      </svg>
      <span className="labs-serif" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--labs-text)" }}>
        {Math.round(score)}
      </span>
    </div>
  );
}

export default function LabsRecommendations() {
  const session = useSession();
  const [activeFactors, setActiveFactors] = useState<Record<FactorKey, boolean>>({ region: true, cask: true, peat: true, community: true });
  const [infoOpen, setInfoOpen] = useState(false);

  const weights = useMemo<Record<FactorKey, number>>(() => ({
    region: activeFactors.region ? FACTOR_DEFAULTS.region : 0,
    cask: activeFactors.cask ? FACTOR_DEFAULTS.cask : 0,
    peat: activeFactors.peat ? FACTOR_DEFAULTS.peat : 0,
    community: activeFactors.community ? FACTOR_DEFAULTS.community : 0,
  }), [activeFactors]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["flavor-profile", session.pid],
    queryFn: () => flavorProfileApi.get(session.pid!),
    enabled: !!session.pid,
  });

  const { data: communityScores } = useQuery<CommunityScore[]>({
    queryKey: ["community-scores"],
    queryFn: () => communityApi.getScores(),
    enabled: !!session.pid,
  });

  const recommendations = profile
    ? computeRecommendations(
        profile.ratedWhiskies || [], profile.allWhiskies || [],
        profile.regionBreakdown || {}, profile.caskBreakdown || {}, profile.peatBreakdown || {},
        communityScores, weights)
    : [];

  const hasRatings = (profile?.ratedWhiskies?.length || 0) > 0;

  if (!session.signedIn || !session.pid) {
    return (
      <div className="labs-empty" style={{ minHeight: "60vh" }}>
        <Sparkles className="w-12 h-12 mb-4" style={{ color: "var(--labs-accent)" }} />
        <p style={{ color: "var(--labs-text)", fontSize: 16, fontWeight: 600 }}>Recommendations</p>
        <p style={{ color: "var(--labs-text-muted)", fontSize: 13 }}>Sign in to get personalized whisky recommendations</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-recommendations">
      <Link href="/labs/taste" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-recommendations">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </Link>

      <div className="flex items-center gap-3 mb-1 labs-fade-in">
        <Sparkles className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
        <h1 className="labs-serif text-xl font-semibold" style={{ color: "var(--labs-text)" }} data-testid="text-recommendations-title">
          Recommendations
        </h1>
      </div>
      <p className="text-sm mb-5 labs-fade-in" style={{ color: "var(--labs-text-muted)" }}>
        Whiskies you might enjoy based on your taste profile
      </p>

      {isLoading ? (
        <div className="labs-card p-8 text-center"><div className="labs-spinner mx-auto" /></div>
      ) : !hasRatings ? (
        <div className="labs-empty labs-fade-in">
          <Wine className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)" }} />
          <p style={{ color: "var(--labs-text-secondary)", fontSize: 14 }}>Rate some whiskies first to get personalized recommendations</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="labs-card p-4 labs-fade-in">
            <div className="flex items-center justify-between mb-3">
              <span className="labs-section-label" style={{ marginBottom: 0 }}>Recommendation Factors</span>
              <button onClick={() => setInfoOpen(!infoOpen)} className="labs-btn-ghost" style={{ padding: 4 }} data-testid="button-info-toggle">
                <Info className="w-4 h-4" />
              </button>
            </div>
            {infoOpen && (
              <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)", lineHeight: 1.6 }}>
                Toggle factors on/off to adjust recommendations. Each factor has a default weight that influences the match score.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {FACTOR_META.map(f => (
                <button
                  key={f.key}
                  onClick={() => setActiveFactors(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                  data-testid={`button-factor-${f.key}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                    border: `1px solid ${activeFactors[f.key] ? "var(--labs-accent)" : "var(--labs-border)"}`,
                    background: activeFactors[f.key] ? "color-mix(in srgb, var(--labs-accent) 15%, transparent)" : "transparent",
                    color: activeFactors[f.key] ? "var(--labs-accent)" : "var(--labs-text-muted)",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <f.icon style={{ width: 12, height: 12 }} />
                  {f.label}
                  <span style={{ fontSize: 10, opacity: 0.7 }}>{f.pct}</span>
                </button>
              ))}
            </div>
          </div>

          {recommendations.length === 0 ? (
            <div className="labs-card p-6 text-center labs-fade-in">
              <p style={{ color: "var(--labs-text-muted)", fontSize: 13 }}>No recommendations found with current filters. Try enabling more factors.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recommendations.map((rec, i) => (
                <div key={rec.whisky.id} className="labs-card labs-fade-in" style={{ padding: "14px 16px", animationDelay: `${i * 0.05}s` }} data-testid={`card-recommendation-${i}`}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <ScoreRing score={rec.score} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
                        {rec.whisky.name}
                      </div>
                      {rec.whisky.distillery && (
                        <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2 }}>
                          {rec.whisky.distillery}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {rec.whisky.region && (
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "color-mix(in srgb, var(--labs-accent) 12%, transparent)", color: "var(--labs-accent)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <MapPin style={{ width: 9, height: 9 }} />{rec.whisky.region}
                          </span>
                        )}
                        {rec.whisky.caskInfluence && (
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "color-mix(in srgb, var(--labs-accent) 10%, transparent)", color: "var(--labs-text-secondary)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <Droplets style={{ width: 9, height: 9 }} />{rec.whisky.caskInfluence}
                          </span>
                        )}
                        {rec.whisky.peatLevel && (
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "color-mix(in srgb, var(--labs-danger) 10%, transparent)", color: "var(--labs-danger)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <Flame style={{ width: 9, height: 9 }} />{rec.whisky.peatLevel}
                          </span>
                        )}
                      </div>
                      {rec.reasons.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 11, color: "var(--labs-text-muted)", borderLeft: "2px solid color-mix(in srgb, var(--labs-accent) 40%, transparent)", paddingLeft: 8, lineHeight: 1.5 }}>
                          Match: {rec.reasons.join(" · ")}
                        </div>
                      )}
                      {rec.communityScore && rec.communityRaters && rec.communityRaters >= 2 && (
                        <div style={{ marginTop: 4, fontSize: 10, color: "var(--labs-text-muted)" }}>
                          <Users style={{ width: 10, height: 10, display: "inline", verticalAlign: "text-bottom", marginRight: 3 }} />
                          Community: {rec.communityScore.toFixed(1)} ({rec.communityRaters} ratings)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
