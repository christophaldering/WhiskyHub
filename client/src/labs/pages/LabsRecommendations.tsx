import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import MeineWeltActionBar from "@/labs/components/MeineWeltActionBar";
import WhiskyImage from "@/labs/components/WhiskyImage";
import { useSession } from "@/lib/session";
import { flavorProfileApi, communityApi } from "@/lib/api";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import {
  ChevronLeft, Sparkles, Wine, MapPin, Droplets, Flame, Users,
  Info, Bot, RefreshCw, ExternalLink, Calendar, Percent,
} from "lucide-react";

interface Whisky {
  id: string;
  name: string;
  distillery: string | null;
  age: string | null;
  abv: number | null;
  region: string | null;
  category: string | null;
  caskType: string | null;
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

interface AISuggestion {
  name: string;
  distillery: string | null;
  region: string | null;
  caskType: string | null;
  peatLevel: string | null;
  reason: string;
  whiskyId: string | null;
  whisky?: Whisky | null;
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
    if (weights.cask > 0 && w.caskType && topCasks.includes(w.caskType)) {
      score += (caskBreakdown[w.caskType]?.avgScore || 0) * weights.cask;
      reasons.push(w.caskType);
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

const cardLinkStyle: React.CSSProperties = {
  display: "block",
  textDecoration: "none",
  color: "inherit",
  cursor: "pointer",
  transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
};

function RecommendationCard({ rec, index, t }: { rec: Recommendation; index: number; t: (k: string, d?: any, o?: any) => string }) {
  return (
    <Link
      href={`/labs/explore/bottles/${rec.whisky.id}`}
      className="labs-card labs-fade-in"
      style={{ ...cardLinkStyle, padding: "14px 16px", animationDelay: `${index * 0.05}s` }}
      data-testid={`card-recommendation-${index}`}
      aria-label={rec.whisky.name}
    >
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
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "color-mix(in srgb, var(--labs-accent) 12%, transparent)", color: "var(--labs-accent)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3 }}>
                <MapPin style={{ width: 9, height: 9 }} />{rec.whisky.region}
              </span>
            )}
            {rec.whisky.caskType && (
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "color-mix(in srgb, var(--labs-accent) 10%, transparent)", color: "var(--labs-text-secondary)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Droplets style={{ width: 9, height: 9 }} />{rec.whisky.caskType}
              </span>
            )}
            {rec.whisky.peatLevel && (
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "color-mix(in srgb, var(--labs-danger) 10%, transparent)", color: "var(--labs-danger)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Flame style={{ width: 9, height: 9 }} />{rec.whisky.peatLevel}
              </span>
            )}
          </div>
          {rec.reasons.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--labs-text-muted)", borderLeft: "2px solid color-mix(in srgb, var(--labs-accent) 40%, transparent)", paddingLeft: 8, lineHeight: 1.5 }}>
              {t("labs.recommendations.match", "Match:")} {rec.reasons.join(" · ")}
            </div>
          )}
          {rec.communityScore && rec.communityRaters && rec.communityRaters >= 2 && (
            <div style={{ marginTop: 4, fontSize: 11, color: "var(--labs-text-muted)" }}>
              <Users style={{ width: 10, height: 10, display: "inline", verticalAlign: "text-bottom", marginRight: 3 }} />
              {t("labs.recommendations.communityRating", "Community: {{score}} ({{count}} ratings)", { score: rec.communityScore.toFixed(1), count: rec.communityRaters })}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function AISuggestionCard({ s, index, t, communityScores }: { s: AISuggestion; index: number; t: (k: string, d?: any, o?: any) => string; communityScores?: CommunityScore[] }) {
  const w = s.whisky;
  const community = useMemo(() => {
    if (!w || !communityScores) return undefined;
    const key = w.whiskybaseId
      ? `wb:${w.whiskybaseId}`
      : `name:${(w.name || "").toLowerCase().trim()}|${(w.distillery || "").toLowerCase().trim()}`;
    return communityScores.find(cs => cs.whiskyKey === key);
  }, [w, communityScores]);

  const inner = (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      {w ? (
        <WhiskyImage
          imageUrl={w.imageUrl}
          name={w.name}
          size={56}
          height={56}
          whiskyId={w.id}
          testId={`img-ai-recommendation-${index}`}
        />
      ) : (
        <div style={{
          width: 56, height: 56, flexShrink: 0, borderRadius: 12,
          background: "color-mix(in srgb, var(--labs-accent) 15%, transparent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "1px solid var(--labs-border)",
        }}>
          <Bot style={{ width: 24, height: 24, color: "var(--labs-accent)" }} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <div className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
            {s.name}
          </div>
          {!s.whiskyId && (
            <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, background: "color-mix(in srgb, var(--labs-text-muted) 15%, transparent)", color: "var(--labs-text-muted)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3 }}>
              <ExternalLink style={{ width: 9, height: 9 }} />
              {t("labs.recommendations.aiExternal", "External suggestion")}
            </span>
          )}
        </div>
        {s.distillery && (
          <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2 }}>
            {s.distillery}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {w?.age && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "color-mix(in srgb, var(--labs-text-muted) 12%, transparent)", color: "var(--labs-text-secondary)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Calendar style={{ width: 9, height: 9 }} />{w.age}
            </span>
          )}
          {w?.abv != null && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "color-mix(in srgb, var(--labs-text-muted) 12%, transparent)", color: "var(--labs-text-secondary)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Percent style={{ width: 9, height: 9 }} />{w.abv}%
            </span>
          )}
          {s.region && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "color-mix(in srgb, var(--labs-accent) 12%, transparent)", color: "var(--labs-accent)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3 }}>
              <MapPin style={{ width: 9, height: 9 }} />{s.region}
            </span>
          )}
          {s.caskType && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "color-mix(in srgb, var(--labs-accent) 10%, transparent)", color: "var(--labs-text-secondary)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Droplets style={{ width: 9, height: 9 }} />{s.caskType}
            </span>
          )}
          {s.peatLevel && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "color-mix(in srgb, var(--labs-danger) 10%, transparent)", color: "var(--labs-danger)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Flame style={{ width: 9, height: 9 }} />{s.peatLevel}
            </span>
          )}
        </div>
        {s.reason && (
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--labs-text-secondary)", borderLeft: "2px solid color-mix(in srgb, var(--labs-accent) 40%, transparent)", paddingLeft: 8, lineHeight: 1.55 }}>
            <span style={{ fontWeight: 600, color: "var(--labs-text)", marginRight: 4 }}>
              {t("labs.recommendations.aiReason", "Why this fits you")}:
            </span>
            {s.reason}
          </div>
        )}
        {community && community.totalRaters >= 2 && (
          <div style={{ marginTop: 4, fontSize: 11, color: "var(--labs-text-muted)" }} data-testid={`text-ai-community-${index}`}>
            <Users style={{ width: 10, height: 10, display: "inline", verticalAlign: "text-bottom", marginRight: 3 }} />
            {t("labs.recommendations.communityRating", "Community: {{score}} ({{count}} ratings)", { score: community.avgOverall.toFixed(1), count: community.totalRaters })}
          </div>
        )}
      </div>
    </div>
  );

  if (s.whiskyId) {
    return (
      <Link
        href={`/labs/explore/bottles/${s.whiskyId}`}
        className="labs-card labs-fade-in"
        style={{ ...cardLinkStyle, padding: "14px 16px", animationDelay: `${index * 0.05}s` }}
        data-testid={`card-ai-recommendation-${index}`}
        aria-label={s.name}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      className="labs-card labs-fade-in"
      style={{ padding: "14px 16px", animationDelay: `${index * 0.05}s` }}
      data-testid={`card-ai-recommendation-${index}`}
    >
      {inner}
    </div>
  );
}

export default function LabsRecommendations() {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const [activeFactors, setActiveFactors] = useState<Record<FactorKey, boolean>>({ region: true, cask: true, peat: true, community: true });
  const [infoOpen, setInfoOpen] = useState(false);
  const [aiRefreshKey, setAiRefreshKey] = useState(0);

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

  const hasRatings = (profile?.ratedWhiskies?.length || 0) > 0 || (profile?.sources?.journalEntries || 0) > 0;
  const language = i18n.language?.startsWith("de") ? "de" : "en";

  const aiQuery = useQuery<{ suggestions: AISuggestion[]; cached?: boolean }>({
    queryKey: ["ai-recommendations", session.pid, language, aiRefreshKey],
    queryFn: async () => {
      const res = await fetch("/api/recommendations/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session.pid ? { "x-participant-id": session.pid } : {}),
        },
        body: JSON.stringify({ language, force: aiRefreshKey > 0 }),
      });
      if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
      return res.json();
    },
    enabled: !!session.pid && hasRatings,
    staleTime: 15 * 60 * 1000,
    retry: 0,
  });

  if (!session.signedIn || !session.pid) {
    return (
      <AuthGateMessage
        icon={<Sparkles className="w-12 h-12" style={{ color: "var(--labs-accent)" }} />}
        title={t("authGate.recommendations.title")}
        bullets={[t("authGate.recommendations.bullet1"), t("authGate.recommendations.bullet2"), t("authGate.recommendations.bullet3")]}
      />
    );
  }

  return (
    <div className="labs-page" data-testid="labs-recommendations">
      <MeineWeltActionBar active="ai" />

      <div className="flex items-center gap-3 mb-1 labs-fade-in">
        <Sparkles className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
        <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="text-recommendations-title">
          {t("labs.recommendations.title", "Recommendations")}
        </h1>
      </div>
      <p className="text-sm mb-5 labs-fade-in" style={{ color: "var(--labs-text-muted)" }}>
        {t("labs.recommendations.subtitle", "Whiskies you might enjoy based on your taste profile")}
      </p>

      {isLoading ? (
        <div className="labs-card p-8 text-center"><div className="labs-spinner mx-auto" /></div>
      ) : !hasRatings ? (
        <div className="labs-empty labs-fade-in">
          <Wine className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)" }} />
          <p style={{ color: "var(--labs-text-secondary)", fontSize: 14 }}>{t("labs.recommendations.emptyHint", "Rate some whiskies first to get personalized recommendations")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <section style={{ display: "flex", flexDirection: "column", gap: 12 }} data-testid="section-statistical-recommendations">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 className="labs-section-label" style={{ marginBottom: 0 }} data-testid="text-statistical-section-title">
                {t("labs.recommendations.statisticalSection", "Based on your ratings")}
              </h2>
            </div>

            <div className="labs-card p-4 labs-fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="labs-section-label" style={{ marginBottom: 0 }}>{t("labs.recommendations.factors", "Recommendation Factors")}</span>
                <button onClick={() => setInfoOpen(!infoOpen)} className="labs-btn-ghost" style={{ padding: 4 }} data-testid="button-info-toggle">
                  <Info className="w-4 h-4" />
                </button>
              </div>
              {infoOpen && (
                <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)", lineHeight: 1.6 }}>
                  {t("labs.recommendations.factorsInfo", "Toggle factors on/off to adjust recommendations. Each factor has a default weight that influences the match score.")}
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
                    <span style={{ fontSize: 11, opacity: 0.75 }}>{f.pct}</span>
                  </button>
                ))}
              </div>
            </div>

            {recommendations.length === 0 ? (
              <div className="labs-card p-6 text-center labs-fade-in">
                <p style={{ color: "var(--labs-text-muted)", fontSize: 13 }}>{t("labs.recommendations.noResults", "No recommendations found with current filters. Try enabling more factors.")}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recommendations.map((rec, i) => (
                  <RecommendationCard key={rec.whisky.id} rec={rec} index={i} t={t} />
                ))}
              </div>
            )}
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: 12 }} data-testid="section-ai-recommendations">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Bot className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                <h2 className="labs-section-label" style={{ marginBottom: 0 }} data-testid="text-ai-section-title">
                  {t("labs.recommendations.aiSection", "AI Suggestions")}
                </h2>
              </div>
              <button
                className="labs-btn-ghost"
                onClick={() => setAiRefreshKey(k => k + 1)}
                disabled={aiQuery.isFetching}
                data-testid="button-refresh-ai-recommendations"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 }}
              >
                <RefreshCw className="w-3.5 h-3.5" style={{ opacity: aiQuery.isFetching ? 0.5 : 1 }} />
                {t("labs.recommendations.aiRefresh", "Refresh")}
              </button>
            </div>
            <p className="text-xs" style={{ color: "var(--labs-text-muted)", marginTop: -4 }}>
              {t("labs.recommendations.aiSubtitle", "Personalized picks generated for your taste profile")}
            </p>

            {aiQuery.isLoading || aiQuery.isFetching ? (
              <div className="labs-card p-6 text-center labs-fade-in" data-testid="state-ai-loading">
                <div className="labs-spinner mx-auto mb-3" />
                <p style={{ color: "var(--labs-text-muted)", fontSize: 13 }}>
                  {t("labs.recommendations.aiLoading", "Generating AI suggestions…")}
                </p>
              </div>
            ) : aiQuery.isError ? (
              <div className="labs-card p-6 text-center labs-fade-in" data-testid="state-ai-error">
                <p style={{ color: "var(--labs-text-muted)", fontSize: 13 }}>
                  {t("labs.recommendations.aiError", "Couldn't generate AI suggestions right now. Try again later.")}
                </p>
              </div>
            ) : !aiQuery.data?.suggestions?.length ? (
              <div className="labs-card p-6 text-center labs-fade-in" data-testid="state-ai-empty">
                <p style={{ color: "var(--labs-text-muted)", fontSize: 13 }}>
                  {t("labs.recommendations.aiEmpty", "No AI suggestions available yet.")}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {aiQuery.data.suggestions.map((s, i) => (
                  <AISuggestionCard key={`${s.name}-${i}`} s={s} index={i} t={t} communityScores={communityScores} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
