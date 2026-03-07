import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { flavorProfileApi, communityApi } from "@/lib/api";
import { getSession, useSession } from "@/lib/session";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { Sparkles, ExternalLink, Users, Info, ChevronDown } from "lucide-react";

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

interface FactorWeights {
  region: number;
  cask: number;
  peat: number;
  community: number;
}

type FactorKey = "region" | "cask" | "peat" | "community";

function computeRecommendations(
  ratedWhiskies: Array<{ whisky: Whisky; rating: { overall: number } }>,
  allWhiskies: Whisky[],
  regionBreakdown: Record<string, { count: number; avgScore: number }>,
  caskBreakdown: Record<string, { count: number; avgScore: number }>,
  peatBreakdown: Record<string, { count: number; avgScore: number }>,
  communityScores?: CommunityScore[],
  weights: FactorWeights = { region: 0.35, cask: 0.25, peat: 0.25, community: 0.15 }
) {
  const ratedIds = new Set(ratedWhiskies.map((r) => r.whisky.id));
  const unrated = allWhiskies.filter((w) => !ratedIds.has(w.id));
  if (unrated.length === 0) return [];

  const communityMap = new Map<string, CommunityScore>();
  if (communityScores) {
    for (const cs of communityScores) {
      communityMap.set(cs.whiskyKey, cs);
    }
  }

  const topRegions = Object.entries(regionBreakdown)
    .sort((a, b) => b[1].avgScore - a[1].avgScore)
    .slice(0, 3)
    .map(([r]) => r);
  const topCasks = Object.entries(caskBreakdown)
    .sort((a, b) => b[1].avgScore - a[1].avgScore)
    .slice(0, 3)
    .map(([c]) => c);
  const topPeat = Object.entries(peatBreakdown)
    .sort((a, b) => b[1].avgScore - a[1].avgScore)
    .slice(0, 2)
    .map(([p]) => p);

  const scored = unrated.map((w) => {
    let score = 0;
    const reasons: string[] = [];
    if (weights.region > 0 && w.region && topRegions.includes(w.region)) {
      const regionScore = regionBreakdown[w.region]?.avgScore || 0;
      score += regionScore * weights.region;
      reasons.push(w.region);
    }
    if (weights.cask > 0 && w.caskInfluence && topCasks.includes(w.caskInfluence)) {
      const caskScore = caskBreakdown[w.caskInfluence]?.avgScore || 0;
      score += caskScore * weights.cask;
      reasons.push(w.caskInfluence);
    }
    if (weights.peat > 0 && w.peatLevel && topPeat.includes(w.peatLevel)) {
      const peatScore = peatBreakdown[w.peatLevel]?.avgScore || 0;
      score += peatScore * weights.peat;
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

  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 10);
}

const FACTOR_DEFAULTS: Record<FactorKey, number> = { region: 0.35, cask: 0.25, peat: 0.25, community: 0.15 };

export default function M2TasteRecommendations() {
  const { t } = useTranslation();
  const session = useSession();

  const [infoOpen, setInfoOpen] = useState(false);
  const [activeFactors, setActiveFactors] = useState<Record<FactorKey, boolean>>({
    region: true,
    cask: true,
    peat: true,
    community: true,
  });

  const toggleFactor = (key: FactorKey) => {
    setActiveFactors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const weights: FactorWeights = useMemo(
    () => ({
      region: activeFactors.region ? FACTOR_DEFAULTS.region : 0,
      cask: activeFactors.cask ? FACTOR_DEFAULTS.cask : 0,
      peat: activeFactors.peat ? FACTOR_DEFAULTS.peat : 0,
      community: activeFactors.community ? FACTOR_DEFAULTS.community : 0,
    }),
    [activeFactors]
  );

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
        profile.ratedWhiskies || [],
        profile.allWhiskies || [],
        profile.regionBreakdown || {},
        profile.caskBreakdown || {},
        profile.peatBreakdown || {},
        communityScores,
        weights
      )
    : [];

  const hasRatings = (profile?.ratedWhiskies?.length || 0) > 0;

  const filterButtons: { key: FactorKey; label: string; pct: string }[] = [
    { key: "region", label: t("recommendations.filterRegion", "Region"), pct: "35%" },
    { key: "cask", label: t("recommendations.filterCask", "Cask"), pct: "25%" },
    { key: "peat", label: t("recommendations.filterPeat", "Peat"), pct: "25%" },
    { key: "community", label: t("recommendations.filterCommunity", "Community"), pct: "15%" },
  ];

  return (
    <div style={{ padding: "20px 16px" }} data-testid="m2-taste-recommendations">
      <M2BackButton />

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 6px" }}>
        <Sparkles style={{ width: 24, height: 24, color: v.accent }} />
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 24,
            fontWeight: 700,
            color: v.text,
            margin: 0,
          }}
          data-testid="text-m2-recommendations-title"
        >
          {t("recommendations.title", "Recommendations")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: v.textSecondary, marginBottom: 20 }}>
        {t("recommendations.subtitle", "Whiskies you might enjoy based on your taste profile.")}
      </p>

      {!session.signedIn && (
        <div
          style={{
            background: v.elevated,
            borderRadius: 12,
            padding: "32px 16px",
            textAlign: "center",
            color: v.textSecondary,
            fontSize: 14,
          }}
          data-testid="m2-recommendations-signin"
        >
          {t("common.signInToAccess", "Sign in to get started")}
        </div>
      )}

      {session.signedIn && (
        <>
          <button
            onClick={() => setInfoOpen(!infoOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: v.mutedLight,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 0",
              fontFamily: "system-ui, sans-serif",
              marginBottom: 12,
            }}
            data-testid="button-toggle-info"
          >
            <Info style={{ width: 14, height: 14 }} />
            <span>{t("recommendations.howItWorks", "How recommendations work")}</span>
            <ChevronDown
              style={{
                width: 13,
                height: 13,
                transition: "transform 0.2s",
                transform: infoOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {infoOpen && (
            <div
              style={{
                background: v.elevated,
                border: `1px solid ${v.border}`,
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 16,
                fontSize: 13,
                color: v.textSecondary,
              }}
              data-testid="info-how-it-works"
            >
              <p style={{ fontWeight: 600, color: v.text, marginBottom: 8 }}>
                {t("recommendations.howItWorksIntro", "Your recommendations are calculated based on:")}
              </p>
              <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                <li>
                  <strong style={{ color: v.text }}>{t("recommendations.factorRegion", "Region preference (35%)")}</strong>{" "}
                  — {t("recommendations.factorRegionDesc", "Whiskies from your highest-rated regions.")}
                </li>
                <li>
                  <strong style={{ color: v.text }}>{t("recommendations.factorCask", "Cask type affinity (25%)")}</strong>{" "}
                  — {t("recommendations.factorCaskDesc", "Whiskies aged in your preferred cask types.")}
                </li>
                <li>
                  <strong style={{ color: v.text }}>{t("recommendations.factorPeat", "Peat level preference (25%)")}</strong>{" "}
                  — {t("recommendations.factorPeatDesc", "Matching your peated vs. unpeated tendency.")}
                </li>
                <li>
                  <strong style={{ color: v.text }}>{t("recommendations.factorCommunity", "Community ratings (15%)")}</strong>{" "}
                  — {t("recommendations.factorCommunityDesc", "Highly rated by other CaskSense users.")}
                </li>
              </ul>
            </div>
          )}

          {hasRatings && (
            <div style={{ marginBottom: 20 }} data-testid="filter-toggles">
              <p style={{ fontSize: 11, color: v.mutedLight, marginBottom: 8 }}>
                {t("recommendations.activeFilters", "Active factors")}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {filterButtons.map(({ key, label, pct }) => (
                  <button
                    key={key}
                    onClick={() => toggleFactor(key)}
                    style={{
                      fontSize: 12,
                      padding: "6px 14px",
                      borderRadius: 20,
                      border: `1px solid ${activeFactors[key] ? v.accent : v.border}`,
                      background: activeFactors[key] ? v.accent : "transparent",
                      color: activeFactors[key] ? v.bg : v.textSecondary,
                      cursor: "pointer",
                      fontWeight: 500,
                      fontFamily: "system-ui, sans-serif",
                      transition: "all 0.15s",
                    }}
                    data-testid={`button-filter-${key}`}
                  >
                    {label} ({pct})
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 72,
                    background: v.elevated,
                    borderRadius: 12,
                    opacity: 0.5,
                  }}
                />
              ))}
            </div>
          ) : !hasRatings ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 16px",
                color: v.textSecondary,
              }}
            >
              <Sparkles style={{ width: 40, height: 40, margin: "0 auto 16px", opacity: 0.3, display: "block" }} />
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15 }}>
                {t("recommendations.empty", "Rate some whiskies first to receive personalized recommendations.")}
              </p>
            </div>
          ) : recommendations.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 16px",
                color: v.textSecondary,
              }}
            >
              <Sparkles style={{ width: 40, height: 40, margin: "0 auto 16px", opacity: 0.3, display: "block" }} />
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15 }}>
                {t("recommendations.noMatches", "No matching recommendations found yet.")}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recommendations.map((rec, index) => (
                <div
                  key={rec.whisky.id}
                  style={{
                    background: v.card,
                    border: `1px solid ${v.border}`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                  data-testid={`card-recommendation-${rec.whisky.id}`}
                >
                  <span
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: 18,
                      fontWeight: 700,
                      color: v.accent,
                      opacity: 0.4,
                      width: 28,
                      flexShrink: 0,
                      textAlign: "center",
                    }}
                  >
                    {index + 1}
                  </span>

                  {rec.whisky.imageUrl && (
                    <img
                      src={rec.whisky.imageUrl}
                      alt={rec.whisky.name}
                      style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                    />
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontFamily: "'Playfair Display', Georgia, serif",
                          fontSize: 14,
                          fontWeight: 600,
                          color: v.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {rec.whisky.name}
                      </span>
                      {rec.whisky.whiskybaseId && (
                        <a
                          href={`https://www.whiskybase.com/whiskies/whisky/${rec.whisky.whiskybaseId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: v.accent, opacity: 0.5, flexShrink: 0 }}
                          data-testid={`link-whiskybase-${rec.whisky.id}`}
                        >
                          <ExternalLink style={{ width: 13, height: 13 }} />
                        </a>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: 11,
                        color: v.textSecondary,
                        margin: "2px 0 0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {[
                        rec.whisky.distillery,
                        rec.whisky.region,
                        rec.whisky.age ? `${rec.whisky.age}y` : null,
                        rec.whisky.abv ? `${rec.whisky.abv}%` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                      {rec.reasons.map((reason) => (
                        <span
                          key={reason}
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 10,
                            background: v.pillBg,
                            color: v.pillText,
                            fontWeight: 500,
                          }}
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: v.mutedLight }}>{t("comparison.match", "Match")}</div>
                    <div
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: 20,
                        fontWeight: 700,
                        color: v.accent,
                      }}
                      data-testid={`text-score-${rec.whisky.id}`}
                    >
                      {Math.round(rec.score)}
                    </div>
                    {rec.communityScore && rec.communityRaters && rec.communityRaters >= 2 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                          fontSize: 10,
                          color: v.mutedLight,
                          justifyContent: "flex-end",
                          marginTop: 2,
                        }}
                      >
                        <Users style={{ width: 11, height: 11 }} />
                        {rec.communityScore}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <p
                style={{
                  fontSize: 11,
                  color: v.mutedLight,
                  textAlign: "center",
                  marginTop: 12,
                  fontStyle: "italic",
                }}
              >
                {t("recommendations.basedOn", "Recommendations are based on your preferred regions, cask types, and peat levels.")}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
