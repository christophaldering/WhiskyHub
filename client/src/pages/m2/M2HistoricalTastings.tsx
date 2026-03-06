import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import {
  ChevronDown, ChevronRight, Search, Wine, Trophy,
  MapPin, Flame, Calendar, Hash, BarChart3,
} from "lucide-react";

interface HistoricalTasting {
  id: string;
  tastingNumber: number;
  titleDe: string | null;
  titleEn: string | null;
  tastingDate: string | null;
  whiskyCount: number;
}

interface HistoricalEntry {
  id: string;
  distilleryRaw: string | null;
  whiskyNameRaw: string | null;
  ageRaw: string | null;
  alcoholRaw: string | null;
  priceRaw: string | null;
  countryRaw: string | null;
  regionRaw: string | null;
  typeRaw: string | null;
  smokyRaw: string | null;
  caskRaw: string | null;
  noseScore: number | null;
  noseRank: number | null;
  tasteScore: number | null;
  tasteRank: number | null;
  finishScore: number | null;
  finishRank: number | null;
  totalScore: number | null;
  totalRank: number | null;
  normalizedAbv: number | null;
  normalizedAge: number | null;
  normalizedPrice: number | null;
  normalizedIsSmoky: boolean | null;
  normalizedRegion: string | null;
}

interface TastingDetail extends HistoricalTasting {
  entries: HistoricalEntry[];
}

interface AnalyticsData {
  totalTastings: number;
  totalEntries: number;
  topWhiskies: Array<{ distillery: string | null; name: string | null; totalScore: number | null; tastingNumber: number }>;
  regionBreakdown: Record<string, number>;
  smokyBreakdown: { smoky: number; nonSmoky: number; unknown: number };
  caskBreakdown: Record<string, number>;
  scoreDistribution: Array<{ range: string; count: number }>;
}

async function fetchJSON(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function formatDate(dateStr: string | null, lang: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === "de" ? "de-DE" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function ScoreBar({ value, max = 10 }: { value: number | null; max?: number }) {
  if (value == null) return <span style={{ color: v.muted }}>—</span>;
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 75 ? "#4ade80" : pct >= 50 ? v.accent : pct >= 25 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 50, height: 6, background: v.border, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, color: v.text, fontVariantNumeric: "tabular-nums", minWidth: 28 }}>{value.toFixed(1)}</span>
    </div>
  );
}

export default function M2HistoricalTastings() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { data: tastingsData, isLoading: tastingsLoading, isError: tastingsError } = useQuery<{ tastings: HistoricalTasting[]; total: number }>({
    queryKey: ["historical-tastings", search],
    queryFn: () => fetchJSON(`/api/historical/tastings?limit=100&search=${encodeURIComponent(search)}`),
  });

  const { data: detailData } = useQuery<TastingDetail>({
    queryKey: ["historical-tasting", expandedId],
    queryFn: () => fetchJSON(`/api/historical/tastings/${expandedId}`),
    enabled: !!expandedId,
  });

  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ["historical-analytics"],
    queryFn: () => fetchJSON("/api/historical/analytics"),
  });

  const tastings = tastingsData?.tastings ?? [];
  const sorted = [...tastings].sort((a, b) => a.tastingNumber - b.tastingNumber);

  const getTitle = (t: HistoricalTasting) => (lang === "de" ? t.titleDe : t.titleEn) || t.titleDe || `Tasting #${t.tastingNumber}`;

  return (
    <div style={{ padding: "16px 16px 100px", maxWidth: 800, margin: "0 auto" }}>
      <M2BackButton />
      <h1 style={{ fontSize: 22, fontWeight: 700, color: v.text, marginTop: 12 }} data-testid="historical-title">
        {t("m2.historical.title", "Historical Tastings")}
      </h1>
      <p style={{ fontSize: 13, color: v.muted, marginTop: 4, marginBottom: 16 }}>
        {t("m2.historical.subtitle", "External tasting data from past events")}
      </p>

      {analytics && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 80, background: v.card, border: `1px solid ${v.border}`, borderRadius: 10, padding: "10px 8px", textAlign: "center" }} data-testid="stat-tastings">
            <div style={{ fontSize: 20, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>{analytics.totalTastings}</div>
            <div style={{ fontSize: 11, color: v.muted }}>{t("m2.historical.statTastings", "Tastings")}</div>
          </div>
          <div style={{ flex: 1, minWidth: 80, background: v.card, border: `1px solid ${v.border}`, borderRadius: 10, padding: "10px 8px", textAlign: "center" }} data-testid="stat-whiskies">
            <div style={{ fontSize: 20, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>{analytics.totalEntries}</div>
            <div style={{ fontSize: 11, color: v.muted }}>{t("m2.historical.statWhiskies", "Whiskies")}</div>
          </div>
          <div style={{ flex: 1, minWidth: 80, background: v.card, border: `1px solid ${v.border}`, borderRadius: 10, padding: "10px 8px", textAlign: "center" }} data-testid="stat-smoky">
            <div style={{ fontSize: 20, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>
              {analytics.smokyBreakdown.smoky > 0 ? Math.round((analytics.smokyBreakdown.smoky / analytics.totalEntries) * 100) : 0}%
            </div>
            <div style={{ fontSize: 11, color: v.muted }}>{t("m2.historical.statSmoky", "Smoky")}</div>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowAnalytics(!showAnalytics)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: v.card, border: `1px solid ${v.border}`, borderRadius: 10,
          padding: "12px 14px", color: v.text, cursor: "pointer", marginBottom: 12,
        }}
        data-testid="toggle-analytics"
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart3 size={16} color={v.accent} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>{t("m2.historical.analyticsTitle", "Cross-Tasting Analytics")}</span>
        </span>
        {showAnalytics ? <ChevronDown size={16} color={v.muted} /> : <ChevronRight size={16} color={v.muted} />}
      </button>

      {showAnalytics && analytics && (
        <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }} data-testid="analytics-panel">
          <h3 style={{ fontSize: 14, fontWeight: 600, color: v.accent, marginBottom: 12 }}>
            <Trophy size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            {t("m2.historical.topWhiskies", "Top 10 Whiskies")}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {analytics.topWhiskies.map((w, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <span style={{ width: 22, textAlign: "right", color: i < 3 ? v.accent : v.muted, fontWeight: i < 3 ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>{i + 1}.</span>
                <span style={{ flex: 1, color: v.text }}>{w.distillery}{w.distillery && w.name ? " — " : ""}{w.name}</span>
                <span style={{ color: v.accent, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{w.totalScore?.toFixed(1)}</span>
                <span style={{ fontSize: 11, color: v.muted }}>#{w.tastingNumber}</span>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: v.accent, marginTop: 20, marginBottom: 10 }}>
            <MapPin size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            {t("m2.historical.regionBreakdown", "Regions")}
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {Object.entries(analytics.regionBreakdown)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 15)
              .map(([region, count]) => (
                <span key={region} style={{
                  background: v.bg, border: `1px solid ${v.border}`, borderRadius: 16,
                  padding: "4px 10px", fontSize: 12, color: v.text,
                }}>
                  {region} <span style={{ color: v.muted }}>({count})</span>
                </span>
              ))}
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: v.accent, marginTop: 20, marginBottom: 10 }}>
            <Flame size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            {t("m2.historical.smokyLabel", "Smoky vs Non-Smoky")}
          </h3>
          <div style={{ display: "flex", gap: 8, height: 24, borderRadius: 6, overflow: "hidden" }}>
            <div style={{
              flex: analytics.smokyBreakdown.smoky,
              background: "#f59e0b",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600, color: "#000",
            }}>
              {analytics.smokyBreakdown.smoky > 0 && `${analytics.smokyBreakdown.smoky}`}
            </div>
            <div style={{
              flex: analytics.smokyBreakdown.nonSmoky,
              background: "#60a5fa",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600, color: "#000",
            }}>
              {analytics.smokyBreakdown.nonSmoky > 0 && `${analytics.smokyBreakdown.nonSmoky}`}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: v.muted, marginTop: 4 }}>
            <span>{t("m2.historical.smoky", "Smoky")}</span>
            <span>{t("m2.historical.nonSmoky", "Non-Smoky")}</span>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: v.accent, marginTop: 20, marginBottom: 10 }}>
            {t("m2.historical.scoreDistribution", "Score Distribution")}
          </h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 60 }}>
            {analytics.scoreDistribution.map((bucket) => {
              const maxCount = Math.max(...analytics.scoreDistribution.map(s => s.count), 1);
              const pct = (bucket.count / maxCount) * 100;
              return (
                <div key={bucket.range} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: "100%", height: `${Math.max(pct, 2)}%`,
                    background: bucket.count > 0 ? v.accent : v.border, borderRadius: 2,
                    minHeight: 2,
                  }} />
                  <span style={{ fontSize: 9, color: v.muted, marginTop: 2 }}>{bucket.range}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: v.muted }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("m2.historical.searchPlaceholder", "Search tastings...")}
          style={{
            width: "100%", padding: "10px 12px 10px 36px",
            background: v.card, border: `1px solid ${v.border}`, borderRadius: 10,
            color: v.text, fontSize: 14, outline: "none",
          }}
          data-testid="historical-search"
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((tasting) => {
          const isExpanded = expandedId === tasting.id;
          const entries = isExpanded && detailData?.id === tasting.id ? (detailData.entries ?? []) : [];
          const sortedEntries = [...entries].sort((a, b) => (a.totalRank ?? 999) - (b.totalRank ?? 999));

          return (
            <div key={tasting.id} data-testid={`tasting-card-${tasting.tastingNumber}`}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : tasting.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  background: isExpanded ? v.cardHover : v.card,
                  border: `1px solid ${isExpanded ? v.accent : v.border}`,
                  borderRadius: isExpanded ? "10px 10px 0 0" : 10,
                  padding: "12px 14px", cursor: "pointer", textAlign: "left",
                }}
                data-testid={`tasting-toggle-${tasting.tastingNumber}`}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: `${v.accent}22`, display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Hash size={16} color={v.accent} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: v.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {tasting.tastingNumber <= 999 ? `#${tasting.tastingNumber}` : ""} {getTitle(tasting)}
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 12, color: v.muted, marginTop: 2 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Calendar size={11} /> {formatDate(tasting.tastingDate, lang)}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Wine size={11} /> {tasting.whiskyCount} {t("m2.historical.whiskies", "Whiskies")}
                    </span>
                  </div>
                </div>
                {isExpanded ? <ChevronDown size={16} color={v.muted} /> : <ChevronRight size={16} color={v.muted} />}
              </button>

              {isExpanded && (
                <div style={{
                  background: v.card, border: `1px solid ${v.accent}`,
                  borderTop: "none", borderRadius: "0 0 10px 10px",
                  padding: 12,
                }}>
                  {sortedEntries.length === 0 ? (
                    <div style={{ color: v.muted, fontSize: 13, textAlign: "center", padding: 16 }}>
                      {t("m2.historical.loading", "Loading...")}
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${v.border}` }}>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: v.muted, fontWeight: 500, fontSize: 11 }}>{t("m2.historical.rank", "Rank")}</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: v.muted, fontWeight: 500, fontSize: 11 }}>{t("m2.historical.whisky", "Whisky")}</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: v.muted, fontWeight: 500, fontSize: 11 }}>{t("m2.historical.nose", "Nose")}</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: v.muted, fontWeight: 500, fontSize: 11 }}>{t("m2.historical.taste", "Taste")}</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: v.muted, fontWeight: 500, fontSize: 11 }}>{t("m2.historical.finish", "Finish")}</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: v.muted, fontWeight: 500, fontSize: 11 }}>{t("m2.historical.total", "Total")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedEntries.map((entry) => (
                            <tr key={entry.id} style={{ borderBottom: `1px solid ${v.border}22` }} data-testid={`entry-row-${entry.id}`}>
                              <td style={{ padding: "8px", color: entry.totalRank != null && entry.totalRank <= 3 ? v.accent : v.muted, fontWeight: entry.totalRank != null && entry.totalRank <= 3 ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>
                                {entry.totalRank ?? "—"}
                              </td>
                              <td style={{ padding: "8px" }}>
                                <div style={{ color: v.text, fontWeight: 500 }}>
                                  {entry.distilleryRaw}{entry.distilleryRaw && entry.whiskyNameRaw ? " — " : ""}{entry.whiskyNameRaw}
                                </div>
                                <div style={{ fontSize: 11, color: v.muted, marginTop: 1 }}>
                                  {[entry.regionRaw, entry.ageRaw ? `${entry.ageRaw}y` : null, entry.normalizedAbv ? `${entry.normalizedAbv.toFixed(1)}%` : null].filter(Boolean).join(" · ")}
                                </div>
                              </td>
                              <td style={{ padding: "8px" }}><ScoreBar value={entry.noseScore} /></td>
                              <td style={{ padding: "8px" }}><ScoreBar value={entry.tasteScore} /></td>
                              <td style={{ padding: "8px" }}><ScoreBar value={entry.finishScore} /></td>
                              <td style={{ padding: "8px" }}><ScoreBar value={entry.totalScore} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {tastingsLoading && (
        <div style={{ textAlign: "center", padding: "40px 16px", color: v.muted }}>
          {t("m2.historical.loading", "Loading...")}
        </div>
      )}

      {tastingsError && (
        <div style={{ textAlign: "center", padding: "40px 16px", color: "#ef4444" }}>
          {t("m2.historical.loadError", "Could not load historical tastings.")}
        </div>
      )}

      {!tastingsLoading && !tastingsError && sorted.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 16px", color: v.muted }}>
          {t("m2.historical.empty", "No historical tastings found.")}
        </div>
      )}
    </div>
  );
}
