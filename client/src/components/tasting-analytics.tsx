import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { tastingApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
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

const CATEGORY_LABELS: Record<string, { en: string; de: string }> = {
  nose: { en: "Nose", de: "Nase" },
  taste: { en: "Taste", de: "Geschmack" },
  finish: { en: "Finish", de: "Abgang" },
  balance: { en: "Balance", de: "Balance" },
};

function KendallBadge({ value, isDE }: { value: number | null; isDE: boolean }) {
  if (value === null || value === undefined) return <span className="text-xs text-muted-foreground italic">n/a</span>;
  const color = value >= 0.7
    ? "text-green-600 bg-green-500/10 border-green-500/20"
    : value >= 0.4
      ? "text-amber-600 bg-amber-500/10 border-amber-500/20"
      : "text-red-600 bg-red-500/10 border-red-500/20";
  const label = value >= 0.7
    ? (isDE ? "stark" : "strong")
    : value >= 0.4
      ? (isDE ? "moderat" : "moderate")
      : (isDE ? "schwach" : "weak");
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`} data-testid="badge-kendall-w">
      W = {value.toFixed(2)} ({label})
    </span>
  );
}

function MedalIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Medal className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" />;
  return <span className="w-5 h-5 flex items-center justify-center text-xs text-muted-foreground font-bold">{rank}</span>;
}

export function TastingAnalytics({ tastingId }: { tastingId: string }) {
  const { i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const isDE = i18n.language === "de";

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
      <div className="bg-card border border-border/40 rounded-lg p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
        <span className="text-sm text-muted-foreground">{isDE ? "Lade Analyse…" : "Loading analytics…"}</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-card border border-border/40 rounded-lg p-6 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-destructive" />
        <span className="text-sm text-muted-foreground">{isDE ? "Analyse konnte nicht geladen werden." : "Could not load analytics."}</span>
      </div>
    );
  }

  const { whiskyAnalytics = [], totalRatings = 0, participantCount = 0, kendallW, overallDistribution = [] } = data;

  const ranked = [...whiskyAnalytics].sort((a: any, b: any) => (b.median ?? 0) - (a.median ?? 0));

  const downloadUrl = `/api/tastings/${tastingId}/analytics/download?requesterId=${currentParticipant.id}`;

  return (
    <div className="bg-card border border-border/40 rounded-lg overflow-hidden" data-testid="tasting-analytics-panel">
      <button
        className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-secondary/20 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="toggle-analytics"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-serif font-bold text-primary text-base md:text-lg">
              {isDE ? "Tasting-Analyse" : "Tasting Analytics"}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {participantCount} {isDE ? "Teilnehmer" : "participants"} · {totalRatings} {isDE ? "Bewertungen" : "ratings"}
              </span>
              <KendallBadge value={kendallW} isDE={isDE} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 md:px-5 pb-5 space-y-6 border-t border-border/40 pt-4">

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center bg-secondary/30 rounded-lg p-3" data-testid="stat-participants">
                  <Users className="w-4 h-4 text-primary mx-auto mb-1" />
                  <div className="text-xl font-serif font-bold text-primary">{participantCount}</div>
                  <div className="text-[10px] text-muted-foreground">{isDE ? "Teilnehmer" : "Participants"}</div>
                </div>
                <div className="text-center bg-secondary/30 rounded-lg p-3" data-testid="stat-ratings">
                  <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
                  <div className="text-xl font-serif font-bold text-primary">{totalRatings}</div>
                  <div className="text-[10px] text-muted-foreground">{isDE ? "Bewertungen" : "Ratings"}</div>
                </div>
                <div className="text-center bg-secondary/30 rounded-lg p-3" data-testid="stat-whiskies">
                  <Trophy className="w-4 h-4 text-primary mx-auto mb-1" />
                  <div className="text-xl font-serif font-bold text-primary">{whiskyAnalytics.length}</div>
                  <div className="text-[10px] text-muted-foreground">{isDE ? "Whiskys" : "Whiskies"}</div>
                </div>
              </div>

              {ranked.length > 0 && (
                <section>
                  <h4 className="font-serif font-bold text-primary text-sm mb-3 flex items-center gap-2" data-testid="text-ranking-title">
                    <Trophy className="w-4 h-4" />
                    {isDE ? "Ranking (nach Median)" : "Ranking (by Median)"}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid="ranking-table">
                      <thead>
                        <tr className="border-b border-border/40 text-muted-foreground text-xs">
                          <th className="text-left py-2 px-2 w-8">#</th>
                          <th className="text-left py-2 px-2">{isDE ? "Whisky" : "Whisky"}</th>
                          <th className="text-center py-2 px-2">{isDE ? "Median" : "Median"}</th>
                          <th className="text-center py-2 px-2 hidden sm:table-cell">Ø</th>
                          <th className="text-center py-2 px-2 hidden sm:table-cell">σ</th>
                          <th className="text-center py-2 px-2 hidden md:table-cell">IQR</th>
                          <th className="text-center py-2 px-2">{isDE ? "n" : "n"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranked.map((wa: any, idx: number) => (
                          <tr
                            key={wa.whisky?.id || idx}
                            className="border-b border-border/20 hover:bg-secondary/20 cursor-pointer transition-colors"
                            onClick={() => setExpandedWhisky(expandedWhisky === wa.whisky?.id ? null : wa.whisky?.id)}
                            data-testid={`ranking-row-${wa.whisky?.id || idx}`}
                          >
                            <td className="py-2 px-2"><MedalIcon rank={idx + 1} /></td>
                            <td className="py-2 px-2 font-medium">{wa.whisky?.name || `#${wa.whisky?.sortOrder}`}</td>
                            <td className="py-2 px-2 text-center font-semibold text-primary">{wa.median?.toFixed(1)}</td>
                            <td className="py-2 px-2 text-center text-muted-foreground hidden sm:table-cell">{wa.avg?.toFixed(1)}</td>
                            <td className="py-2 px-2 text-center text-muted-foreground hidden sm:table-cell">{wa.stdDev?.toFixed(1)}</td>
                            <td className="py-2 px-2 text-center text-muted-foreground hidden md:table-cell">{wa.iqr?.toFixed(1)}</td>
                            <td className="py-2 px-2 text-center text-muted-foreground">{wa.count}</td>
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

                const radarData = (["nose", "taste", "finish", "balance"] as const).map(cat => ({
                  category: CATEGORY_LABELS[cat]?.[isDE ? "de" : "en"] || cat,
                  [isDE ? "Gruppen-Ø" : "Group Avg"]: cats[cat]?.avg ?? 0,
                  ...(myRating ? { [isDE ? "Meine Bewertung" : "My Rating"]: myRating[cat] ?? 0 } : {}),
                }));

                return (
                  <motion.div
                    key={wa.whisky?.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-secondary/20 border border-border/30 rounded-lg p-4 space-y-4"
                    data-testid={`whisky-detail-${wa.whisky?.id}`}
                  >
                    <h5 className="font-serif font-bold text-primary text-sm">{wa.whisky?.name || `#${wa.whisky?.sortOrder}`}</h5>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      {(["nose", "taste", "finish", "balance"] as const).map(cat => (
                        <div key={cat} className="bg-card/50 rounded p-2">
                          <div className="text-muted-foreground mb-0.5">{CATEGORY_LABELS[cat]?.[isDE ? "de" : "en"]}</div>
                          <div className="font-semibold text-primary">Ø {cats[cat]?.avg?.toFixed(1) ?? "–"}</div>
                          <div className="text-[10px] text-muted-foreground">Md {cats[cat]?.median?.toFixed(1) ?? "–"}</div>
                          {myRating && (
                            <div className="text-[10px] text-amber-600 mt-0.5">
                              {isDE ? "Ich" : "Me"}: {myRating[cat] ?? "–"}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-center">
                      <ResponsiveContainer width="100%" height={250} maxHeight={280}>
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                          <Radar
                            name={isDE ? "Gruppen-Ø" : "Group Avg"}
                            dataKey={isDE ? "Gruppen-Ø" : "Group Avg"}
                            stroke="#8b5e3c"
                            fill="#8b5e3c"
                            fillOpacity={0.15}
                            strokeWidth={2}
                          />
                          {myRating && (
                            <Radar
                              name={isDE ? "Meine Bewertung" : "My Rating"}
                              dataKey={isDE ? "Meine Bewertung" : "My Rating"}
                              stroke="#c4956a"
                              fill="#c4956a"
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
                      <div className="text-center text-xs text-muted-foreground">
                        {isDE ? "Mein Gesamt:" : "My Overall:"}{" "}
                        <span className="font-semibold text-primary">{myRating.overall}</span>
                        <span className="mx-2">·</span>
                        {isDE ? "Gruppen-Median:" : "Group Median:"}{" "}
                        <span className="font-semibold text-primary">{wa.median?.toFixed(1)}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {overallDistribution.length > 0 && (
                <section>
                  <h4 className="font-serif font-bold text-primary text-sm mb-3 flex items-center gap-2" data-testid="text-distribution-title">
                    <BarChart3 className="w-4 h-4" />
                    {isDE ? "Gesamtverteilung der Bewertungen" : "Overall Score Distribution"}
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={overallDistribution}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="bin" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <RechartsTooltip
                        contentStyle={{ fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                        formatter={(v: number) => [v, isDE ? "Anzahl" : "Count"]}
                      />
                      <Bar dataKey="count" fill="#8b5e3c" radius={[3, 3, 0, 0]} name={isDE ? "Anzahl" : "Count"} />
                    </BarChart>
                  </ResponsiveContainer>
                </section>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  data-testid="button-download-analytics"
                >
                  <a href={downloadUrl} download>
                    <Download className="w-4 h-4 mr-1.5" />
                    {isDE ? "Excel herunterladen" : "Download Excel"}
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
