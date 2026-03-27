import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { tastingApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Users, Trophy, ChevronDown, ChevronUp, Download,
  Medal, TrendingUp, Loader2, AlertCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  CartesianGrid,
} from "recharts";
import { useAppleTheme, SP, withAlpha } from "@/labs/hooks/useAppleTheme";
import { formatScore } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, { en: string; de: string }> = {
  nose: { en: "Nose", de: "Nase" },
  taste: { en: "Taste", de: "Geschmack" },
  finish: { en: "Finish", de: "Abgang" },
};

function KendallBadge({ value }: { value: number | null }) {
  const th = useAppleTheme();
  const { t } = useTranslation();
  if (value === null || value === undefined) return <span style={{ fontSize: 12, color: th.faint, fontStyle: "italic" }}>n/a</span>;
  const color = value >= 0.7 ? th.green : value >= 0.4 ? th.gold : "#e06060";
  const label = value >= 0.7
    ? t("tastingAnalytics.strong")
    : value >= 0.4
      ? t("tastingAnalytics.moderate")
      : t("tastingAnalytics.weak");
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
      border: `1px solid ${withAlpha(color, 0.25)}`, background: withAlpha(color, 0.09), color: color,
    }} data-testid="badge-kendall-w">
      W = {value.toFixed(2)} ({label})
    </span>
  );
}

function MedalIcon({ rank }: { rank: number }) {
  const th = useAppleTheme();
  if (rank === 1) return <Medal style={{ width: 20, height: 20, color: th.gold }} />;
  if (rank === 2) return <Medal style={{ width: 20, height: 20, color: "#a8a8a8" }} />;
  if (rank === 3) return <Medal style={{ width: 20, height: 20, color: th.amber }} />;
  return <span style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: th.faint, fontWeight: 700 }}>{rank}</span>;
}

export function TastingAnalytics({ tastingId }: { tastingId: string }) {
  const th = useAppleTheme();
  const { t, i18n } = useTranslation();
  const { currentParticipant } = useAppStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedWhisky, setExpandedWhisky] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tasting-analytics", tastingId, currentParticipant?.id],
    queryFn: () => tastingApi.getAnalytics(tastingId, currentParticipant?.id),
    enabled: !!currentParticipant?.id,
    staleTime: 60_000,
  });

  if (!currentParticipant) return null;

  if (isLoading) {
    return (
      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.lg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite", color: th.gold, marginRight: SP.sm }} />
        <span style={{ fontSize: 14, color: th.faint }}>{t("tastingAnalytics.loading")}</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.lg, display: "flex", alignItems: "center", gap: SP.sm }}>
        <AlertCircle style={{ width: 20, height: 20, color: "#e06060" }} />
        <span style={{ fontSize: 14, color: th.faint }}>{t("tastingAnalytics.loadError")}</span>
      </div>
    );
  }

  const { whiskyAnalytics = [], totalRatings = 0, participantCount = 0, kendallW, overallDistribution = [] } = data;

  const ranked = [...whiskyAnalytics].sort((a: any, b: any) => (b.median ?? 0) - (a.median ?? 0));

  const downloadUrl = `/api/tastings/${tastingId}/analytics/download?requesterId=${currentParticipant.id}`;

  return (
    <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, overflow: "hidden" }} data-testid="tasting-analytics-panel">
      <button
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: `${SP.md}px ${SP.lg}px`, background: "none", border: "none", cursor: "pointer",
          color: th.text, fontFamily: "system-ui, sans-serif",
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="toggle-analytics"
      >
        <div style={{ display: "flex", alignItems: "center", gap: SP.md }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: withAlpha(th.gold, 0.09), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <BarChart3 style={{ width: 20, height: 20, color: th.gold }} />
          </div>
          <div style={{ textAlign: "left" }}>
            <h3 style={{ fontFamily: "Playfair Display, serif", fontWeight: 700, color: th.text, fontSize: 16, margin: 0 }}>
              {t("tastingAnalytics.title")}
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: SP.sm, marginTop: 2 }}>
              <span style={{ fontSize: 12, color: th.faint }}>
                {participantCount} {t("tastingAnalytics.participants")} · {totalRatings} {t("tastingAnalytics.ratings")}
              </span>
              <KendallBadge value={kendallW} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: SP.sm }}>
          {isExpanded ? <ChevronUp style={{ width: 20, height: 20, color: th.faint }} /> : <ChevronDown style={{ width: 20, height: 20, color: th.faint }} />}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: `${SP.md}px ${SP.lg}px ${SP.lg}px`, borderTop: `1px solid ${th.border}`, display: "flex", flexDirection: "column", gap: SP.lg }}>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: SP.md }}>
                <div style={{ textAlign: "center", background: th.inputBg, borderRadius: 14, padding: SP.md }} data-testid="stat-participants">
                  <Users style={{ width: 16, height: 16, color: th.gold, margin: "0 auto 4px", display: "block" }} />
                  <div style={{ fontSize: 20, fontFamily: "Playfair Display, serif", fontWeight: 700, color: th.gold }}>{participantCount}</div>
                  <div style={{ fontSize: 10, color: th.faint }}>{t("tastingAnalytics.participantsLabel")}</div>
                </div>
                <div style={{ textAlign: "center", background: th.inputBg, borderRadius: 14, padding: SP.md }} data-testid="stat-ratings">
                  <TrendingUp style={{ width: 16, height: 16, color: th.gold, margin: "0 auto 4px", display: "block" }} />
                  <div style={{ fontSize: 20, fontFamily: "Playfair Display, serif", fontWeight: 700, color: th.gold }}>{totalRatings}</div>
                  <div style={{ fontSize: 10, color: th.faint }}>{t("tastingAnalytics.ratingsLabel")}</div>
                </div>
                <div style={{ textAlign: "center", background: th.inputBg, borderRadius: 14, padding: SP.md }} data-testid="stat-whiskies">
                  <Trophy style={{ width: 16, height: 16, color: th.gold, margin: "0 auto 4px", display: "block" }} />
                  <div style={{ fontSize: 20, fontFamily: "Playfair Display, serif", fontWeight: 700, color: th.gold }}>{whiskyAnalytics.length}</div>
                  <div style={{ fontSize: 10, color: th.faint }}>{t("tastingAnalytics.whiskiesLabel")}</div>
                </div>
              </div>

              {ranked.length > 0 && (
                <section>
                  <h4 style={{ fontFamily: "Playfair Display, serif", fontWeight: 700, color: th.text, fontSize: 14, marginBottom: SP.md, display: "flex", alignItems: "center", gap: SP.sm }} data-testid="text-ranking-title">
                    <Trophy style={{ width: 16, height: 16 }} />
                    {t("tastingAnalytics.rankingTitle")}
                  </h4>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }} data-testid="ranking-table">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${th.border}`, color: th.faint, fontSize: 12 }}>
                          <th style={{ textAlign: "left", padding: "8px 8px", width: 32 }}>#</th>
                          <th style={{ textAlign: "left", padding: "8px 8px" }}>{t("tastingAnalytics.whisky")}</th>
                          <th style={{ textAlign: "center", padding: "8px 8px" }}>{t("tastingAnalytics.median")}</th>
                          <th style={{ textAlign: "center", padding: "8px 8px" }}>Ø</th>
                          <th style={{ textAlign: "center", padding: "8px 8px" }}>σ</th>
                          <th style={{ textAlign: "center", padding: "8px 8px" }}>IQR</th>
                          <th style={{ textAlign: "center", padding: "8px 8px" }}>{t("tastingAnalytics.n")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranked.map((wa: any, idx: number) => (
                          <tr
                            key={wa.whisky?.id || idx}
                            style={{ borderBottom: `1px solid ${th.border}`, cursor: "pointer", transition: "background 0.15s" }}
                            onClick={() => setExpandedWhisky(expandedWhisky === wa.whisky?.id ? null : wa.whisky?.id)}
                            data-testid={`ranking-row-${wa.whisky?.id || idx}`}
                          >
                            <td style={{ padding: "8px 8px" }}><MedalIcon rank={idx + 1} /></td>
                            <td style={{ padding: "8px 8px", fontWeight: 500 }}>{wa.whisky?.name || `#${wa.whisky?.sortOrder}`}</td>
                            <td style={{ padding: "8px 8px", textAlign: "center", fontWeight: 600, color: th.gold }}>{formatScore(wa.median)}</td>
                            <td style={{ padding: "8px 8px", textAlign: "center", color: th.faint }}>{formatScore(wa.avg)}</td>
                            <td style={{ padding: "8px 8px", textAlign: "center", color: th.faint }}>{formatScore(wa.stdDev)}</td>
                            <td style={{ padding: "8px 8px", textAlign: "center", color: th.faint }}>{formatScore(wa.iqr)}</td>
                            <td style={{ padding: "8px 8px", textAlign: "center", color: th.faint }}>{wa.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {ranked.map((wa: any) => {
                if (expandedWhisky !== wa.whisky?.id) return null;
                const cats = wa.categories || {};
                const myRating = wa.myRating;

                const groupAvgLabel = t("tastingAnalytics.groupAvg");
                const myRatingLabel = t("tastingAnalytics.myRating");

                const radarData = (["nose", "taste", "finish"] as const).map(cat => ({
                  category: t("tastingAnalytics." + cat),
                  [groupAvgLabel]: cats[cat]?.avg ?? 0,
                  ...(myRating ? { [myRatingLabel]: myRating[cat] ?? 0 } : {}),
                }));

                return (
                  <motion.div
                    key={wa.whisky?.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ background: th.inputBg, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md, display: "flex", flexDirection: "column", gap: SP.md }}
                    data-testid={`whisky-detail-${wa.whisky?.id}`}
                  >
                    <h5 style={{ fontFamily: "Playfair Display, serif", fontWeight: 700, color: th.text, fontSize: 14, margin: 0 }}>{wa.whisky?.name || `#${wa.whisky?.sortOrder}`}</h5>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: SP.sm, textAlign: "center", fontSize: 12 }}>
                      {(["nose", "taste", "finish"] as const).map(cat => (
                        <div key={cat} style={{ background: th.bgCard, borderRadius: 10, padding: SP.sm }}>
                          <div style={{ color: th.faint, marginBottom: 2 }}>{t("tastingAnalytics." + cat)}</div>
                          <div style={{ fontWeight: 600, color: th.gold }}>Ø {cats[cat]?.avg != null ? formatScore(cats[cat].avg) : "–"}</div>
                          <div style={{ fontSize: 10, color: th.faint }}>Md {cats[cat]?.median != null ? formatScore(cats[cat].median) : "–"}</div>
                          {myRating && (
                            <div style={{ fontSize: 10, color: th.amber, marginTop: 2 }}>
                              {t("tastingAnalytics.me")}: {myRating[cat] ?? "–"}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <ResponsiveContainer width="100%" height={250} maxHeight={280}>
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                          <PolarGrid stroke={th.border} />
                          <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: th.faint }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                          <Radar
                            name={groupAvgLabel}
                            dataKey={groupAvgLabel}
                            stroke={th.gold}
                            fill={th.gold}
                            fillOpacity={0.15}
                            strokeWidth={2}
                          />
                          {myRating && (
                            <Radar
                              name={myRatingLabel}
                              dataKey={myRatingLabel}
                              stroke={th.amber}
                              fill={th.amber}
                              fillOpacity={0.1}
                              strokeWidth={2}
                              strokeDasharray="4 2"
                            />
                          )}
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    {myRating && (
                      <div style={{ textAlign: "center", fontSize: 12, color: th.faint }}>
                        {t("tastingAnalytics.myOverall")}{" "}
                        <span style={{ fontWeight: 600, color: th.gold }}>{myRating.overall}</span>
                        <span style={{ margin: "0 8px" }}>·</span>
                        {t("tastingAnalytics.groupMedian")}{" "}
                        <span style={{ fontWeight: 600, color: th.gold }}>{formatScore(wa.median)}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {overallDistribution.length > 0 && (
                <section>
                  <h4 style={{ fontFamily: "Playfair Display, serif", fontWeight: 700, color: th.text, fontSize: 14, marginBottom: SP.md, display: "flex", alignItems: "center", gap: SP.sm }} data-testid="text-distribution-title">
                    <BarChart3 style={{ width: 16, height: 16 }} />
                    {t("tastingAnalytics.distributionTitle")}
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={overallDistribution}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="bin" tick={{ fontSize: 10, fill: th.faint }} />
                      <YAxis tick={{ fontSize: 10, fill: th.faint }} allowDecimals={false} />
                      <RechartsTooltip
                        contentStyle={{ fontSize: 12, background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 10, color: th.text }}
                        formatter={(v: number) => [v, t("tastingAnalytics.count")]}
                      />
                      <Bar dataKey="count" fill={th.gold} radius={[3, 3, 0, 0]} name={t("tastingAnalytics.count")} />
                    </BarChart>
                  </ResponsiveContainer>
                </section>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: SP.sm }}>
                <a
                  href={downloadUrl}
                  download
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 16px", fontSize: 13, fontWeight: 500,
                    background: th.inputBg, border: `1px solid ${th.border}`, borderRadius: 10,
                    color: th.text, textDecoration: "none", cursor: "pointer",
                  }}
                  data-testid="button-download-analytics"
                >
                  <Download style={{ width: 16, height: 16 }} />
                  {t("tastingAnalytics.downloadExcel")}
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
