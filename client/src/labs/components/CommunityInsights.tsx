import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { publicInsightsApi } from "@/lib/api";
import { Star } from "lucide-react";
import WhiskyImage from "./WhiskyImage";

interface InsightsData {
  communityPulse: { totalRatings: number; totalWhiskies: number; totalTasters: number; avgOverall: number };
  topRated: Array<{ name: string; distillery: string | null; region: string | null; avgOverall: number; ratingCount: number; imageUrl: string | null }>;
  mostExplored: Array<{ name: string; distillery: string | null; region: string | null; avgOverall: number; ratingCount: number; imageUrl: string | null }>;
  regionalHighlights: Array<{ region: string; avgOverall: number; count: number }>;
  flavorTrends: { peatLevels: Record<string, number>; caskTypes: Record<string, number> };
  divisiveDrams: Array<{ name: string; distillery: string | null; region: string | null; avgOverall: number; variance: number; ratingCount: number; imageUrl: string | null }>;
}

function DonutChart({ data, size = 72 }: { data: Record<string, number>; size?: number }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return null;

  const colors = [
    "var(--labs-accent)",
    "#8b5cf6",
    "#f59e0b",
    "#10b981",
    "#ef4444",
    "#6366f1",
  ];

  const r = size / 2;
  const cx = r;
  const cy = r;
  const innerR = r * 0.55;
  let currentAngle = -Math.PI / 2;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {entries.map(([label, value], i) => {
          const angle = (value / total) * 2 * Math.PI;
          const startX = cx + r * Math.cos(currentAngle);
          const startY = cy + r * Math.sin(currentAngle);
          const endAngle = currentAngle + angle;
          const endX = cx + r * Math.cos(endAngle);
          const endY = cy + r * Math.sin(endAngle);
          const innerStartX = cx + innerR * Math.cos(endAngle);
          const innerStartY = cy + innerR * Math.sin(endAngle);
          const innerEndX = cx + innerR * Math.cos(currentAngle);
          const innerEndY = cy + innerR * Math.sin(currentAngle);
          const largeArc = angle > Math.PI ? 1 : 0;
          const d = `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY} L ${innerStartX} ${innerStartY} A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEndX} ${innerEndY} Z`;
          currentAngle = endAngle;
          return <path key={label} d={d} fill={colors[i % colors.length]} opacity={0.85} />;
        })}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {entries.slice(0, 5).map(([label, value], i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[i % colors.length], flexShrink: 0 }} />
            <span style={{ color: "var(--labs-text-secondary)" }}>{label}</span>
            <span style={{ color: "var(--labs-text-muted)", marginLeft: "auto" }}>{Math.round((value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CommunityInsights() {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const { data: insights, isLoading } = useQuery<InsightsData>({
    queryKey: ["public-insights"],
    queryFn: publicInsightsApi.get,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div style={{ marginBottom: 32 }}>
        <div className="labs-skeleton" style={{ height: 20, width: 180, borderRadius: 8, marginBottom: 12 }} />
        <div className="labs-skeleton" style={{ height: 100, borderRadius: 12, marginBottom: 8 }} />
      </div>
    );
  }

  if (!insights || insights.communityPulse.totalRatings === 0) return null;

  const { communityPulse, topRated, mostExplored, regionalHighlights, flavorTrends, divisiveDrams } = insights;
  const maxRegionScore = Math.max(...regionalHighlights.map(r => r.avgOverall), 1);

  return (
    <div style={{ marginBottom: 32 }} data-testid="section-community-insights">
      <h2 className="ty-section-title" style={{ marginBottom: 4 }} data-testid="text-insights-title">
        {t("insights.sectionTitle")}
      </h2>
      <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 16px" }} data-testid="text-insights-subtitle">
        {t("insights.sectionSubtitle")}
      </p>

      <div
        className="labs-grouped-list"
        style={{ marginBottom: 12 }}
        data-testid="card-community-pulse"
      >
        <div style={{ padding: "20px 18px" }}>
          <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }} data-testid="text-hero-avg">
                {communityPulse.avgOverall.toFixed(1)}
              </div>
              <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 4 }}>{t("insights.heroAvgScore")}</div>
            </div>
            <div style={{ width: 1, background: "var(--labs-border-subtle)" }} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }} data-testid="text-hero-ratings">
                {communityPulse.totalRatings.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 4 }}>{t("insights.heroTotalRatings")}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums" }}>
                {communityPulse.totalWhiskies.toLocaleString()}
              </span>
              <span style={{ fontSize: 12, color: "var(--labs-text-muted)", marginLeft: 6 }}>{t("insights.totalWhiskies")}</span>
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums" }}>
                {communityPulse.totalTasters.toLocaleString()}
              </span>
              <span style={{ fontSize: 12, color: "var(--labs-text-muted)", marginLeft: 6 }}>{t("insights.totalTasters")}</span>
            </div>
          </div>
        </div>
      </div>

      {!showAll && (
        <button
          onClick={() => setShowAll(true)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontSize: 15,
            fontWeight: 400,
            color: "var(--labs-accent)",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
          data-testid="button-all-insights"
        >
          {t("insights.allInsights")} ›
        </button>
      )}

      {showAll && (
        <div className="labs-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 8 }}>
          {topRated.length > 0 && (
            <div data-testid="card-top-rated">
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 10px" }}>
                {t("insights.topRatedTitle")}
              </h3>
              <div className="labs-grouped-list">
                {topRated.map((w, i) => (
                  <div
                    key={i}
                    className="labs-list-row"
                    data-testid={`card-top-rated-${i}`}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--labs-text-muted)", width: 18, textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
                    <WhiskyImage imageUrl={w.imageUrl} name={w.name} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "var(--labs-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</p>
                      <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: 0 }}>{w.distillery || w.region}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                      <Star style={{ width: 12, height: 12, color: "var(--labs-accent)", fill: "var(--labs-accent)" }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--labs-accent)" }}>{w.avgOverall.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mostExplored.length > 0 && (
            <div data-testid="card-most-explored">
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 10px" }}>
                {t("insights.mostExploredTitle")}
              </h3>
              <div className="labs-grouped-list">
                {mostExplored.map((w, i) => (
                  <div
                    key={i}
                    className="labs-list-row"
                    data-testid={`card-most-explored-${i}`}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--labs-text-muted)", width: 18, textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
                    <WhiskyImage imageUrl={w.imageUrl} name={w.name} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "var(--labs-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</p>
                      <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: 0 }}>{w.distillery || w.region}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--labs-text)" }}>{w.ratingCount}</span>
                      <p style={{ fontSize: 10, color: "var(--labs-text-muted)", margin: 0 }}>{t("explore.ratings")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {regionalHighlights.length > 0 && (
            <div data-testid="card-regional-highlights">
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 10px" }}>
                {t("insights.regionalTitle")}
              </h3>
              <div className="labs-grouped-list" style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {regionalHighlights.slice(0, 8).map((r, i) => (
                    <div key={i} data-testid={`card-region-${i}`}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--labs-text)" }}>{r.region}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-accent)" }}>{r.avgOverall.toFixed(1)}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: "var(--labs-border)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          borderRadius: 3,
                          background: "var(--labs-accent)",
                          width: `${(r.avgOverall / maxRegionScore) * 100}%`,
                          transition: "width 0.6s ease-out",
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{r.count} {t("insights.whiskies")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(Object.keys(flavorTrends.peatLevels).length > 0 || Object.keys(flavorTrends.caskTypes).length > 0) && (
            <div data-testid="card-flavor-trends">
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 10px" }}>
                {t("insights.flavorTitle")}
              </h3>
              <div className="labs-grouped-list" style={{ padding: "16px 18px" }}>
                {Object.keys(flavorTrends.peatLevels).length > 0 && (
                  <div style={{ marginBottom: Object.keys(flavorTrends.caskTypes).length > 0 ? 16 : 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text-secondary)", margin: "0 0 8px" }}>{t("insights.peatLevels")}</p>
                    <DonutChart data={flavorTrends.peatLevels} size={72} />
                  </div>
                )}
                {Object.keys(flavorTrends.caskTypes).length > 0 && (
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text-secondary)", margin: "0 0 8px" }}>{t("insights.caskType")}</p>
                    <DonutChart data={flavorTrends.caskTypes} size={72} />
                  </div>
                )}
              </div>
            </div>
          )}

          {divisiveDrams.length > 0 && (
            <div data-testid="card-divisive-drams">
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 10px" }}>
                {t("insights.divisiveTitle")}
              </h3>
              <div className="labs-grouped-list">
                {divisiveDrams.map((w, i) => (
                  <div
                    key={i}
                    className="labs-list-row"
                    data-testid={`card-divisive-${i}`}
                  >
                    <WhiskyImage imageUrl={w.imageUrl} name={w.name} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "var(--labs-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</p>
                      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
                          <Star style={{ width: 10, height: 10, display: "inline", verticalAlign: "middle", marginRight: 2 }} />{w.avgOverall.toFixed(1)}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--labs-accent)", fontWeight: 600 }}>
                          {t("insights.varianceLabel")}: {w.variance.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
