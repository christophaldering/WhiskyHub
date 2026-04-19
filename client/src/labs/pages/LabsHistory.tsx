import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRoute, useLocation } from "wouter";
import { useLabsBack } from "@/labs/LabsLayout";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { useAppStore } from "@/lib/store";
import { formatScore } from "@/lib/utils";
import { getParticipantId } from "@/lib/api";
import { useSession } from "@/lib/session";
import { SkeletonList } from "@/labs/components/LabsSkeleton";
import {
  Search, Wine, Trophy, Calendar, BarChart3,
  ArrowUpDown, ChevronLeft, ChevronRight, Archive, Sparkles, RefreshCw,
  LogIn, MapPin, Flame, Droplets, TrendingUp,
  Loader2, UserCheck, Users,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

interface EnrichedTasting {
  id: string;
  tastingNumber: number;
  titleDe: string | null;
  titleEn: string | null;
  tastingDate: string | null;
  whiskyCount: number;
  avgTotalScore: number | null;
  winnerDistillery: string | null;
  winnerName: string | null;
  winnerScore: number | null;
}

interface AnalyticsData {
  totalTastings: number;
  totalEntries: number;
  topWhiskies: Array<{ distillery: string | null; name: string | null; totalScore: number | null; normalizedTotal: number | null; tastingNumber: number; titleDe?: string | null; titleEn?: string | null }>;
  regionBreakdown: Record<string, number>;
  smokyBreakdown: { smoky: number; nonSmoky: number; unknown: number };
  caskBreakdown: Record<string, number>;
  scoreDistribution: Array<{ range: string; count: number }>;
}

type SortMode = "number-asc" | "number-desc" | "date-newest" | "date-oldest" | "quality";

async function fetchJSON(url: string, pid?: string) {
  const headers: Record<string, string> = {};
  if (pid) headers["x-participant-id"] = pid;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function formatDate(dateStr: string | null, lang: string): string {
  if (!dateStr) return "\u2014";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === "de" ? "de-DE" : "en-US", { year: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

const CHART_COLORS = ["#d4a256", "#a8834a", "#6a9a5b", "#e57373", "#60a5fa", "#c084fc", "#f59e0b", "#4ade80", "#f472b6", "#34d399"];

function LabsHistoryList() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("number-desc");
  const pid = getParticipantId();
  const queryClient = useQueryClient();

  const { data: tastingsData, isLoading, isError, refetch } = useQuery<{ tastings: EnrichedTasting[]; total: number }>({
    queryKey: ["historical-tastings-enriched", search],
    queryFn: () => fetchJSON(`/api/historical/tastings?limit=200&enriched=true&search=${encodeURIComponent(search)}`, pid || undefined),
  });

  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ["historical-analytics"],
    queryFn: () => fetchJSON("/api/historical/analytics", pid || undefined),
  });

  const tastings = tastingsData?.tastings ?? [];
  const tastingIds = tastings.map(t => t.id);

  const { data: myParticipations } = useQuery<{ participations: Array<{ historicalTastingId: string }> }>({
    queryKey: ["historical-my-participations", pid],
    queryFn: () => fetchJSON("/api/historical/my-participations", pid || undefined),
    enabled: !!pid,
  });

  const { data: participantCountsData } = useQuery<{ counts: Record<string, number> }>({
    queryKey: ["historical-participant-counts", tastingIds.join(",")],
    queryFn: () => fetchJSON(`/api/historical/participant-counts?ids=${tastingIds.join(",")}`, pid || undefined),
    enabled: tastingIds.length > 0,
  });

  const myClaimedIds = new Set(myParticipations?.participations?.map(p => p.historicalTastingId) ?? []);
  const participantCounts = participantCountsData?.counts ?? {};

  const claimMutation = useMutation({
    mutationFn: async ({ tastingId, claim }: { tastingId: string; claim: boolean }) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (pid) headers["x-participant-id"] = pid;
      const method = claim ? "POST" : "DELETE";
      const res = await fetch(`/api/historical/tastings/${tastingId}/claim`, { method, headers });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historical-my-participations"] });
      queryClient.invalidateQueries({ queryKey: ["historical-participant-counts"] });
    },
  });

  const sorted = useMemo(() => {
    const arr = [...tastings];
    switch (sortMode) {
      case "number-asc": return arr.sort((a, b) => a.tastingNumber - b.tastingNumber);
      case "number-desc": return arr.sort((a, b) => b.tastingNumber - a.tastingNumber);
      case "date-newest": return arr.sort((a, b) => {
        if (!a.tastingDate && !b.tastingDate) return 0;
        if (!a.tastingDate) return 1; if (!b.tastingDate) return -1;
        return new Date(b.tastingDate).getTime() - new Date(a.tastingDate).getTime();
      });
      case "date-oldest": return arr.sort((a, b) => {
        if (!a.tastingDate && !b.tastingDate) return 0;
        if (!a.tastingDate) return 1; if (!b.tastingDate) return -1;
        return new Date(a.tastingDate).getTime() - new Date(b.tastingDate).getTime();
      });
      case "quality": return arr.sort((a, b) => (b.avgTotalScore ?? 0) - (a.avgTotalScore ?? 0));
      default: return arr;
    }
  }, [tastings, sortMode]);

  const getTitle = (tasting: EnrichedTasting) =>
    (lang.startsWith("de") ? tasting.titleDe : tasting.titleEn) || tasting.titleDe || `Tasting #${tasting.tastingNumber}`;

  const totalWhiskies = analytics?.totalEntries ?? 0;
  const totalTastings = analytics?.totalTastings ?? 0;
  const regionCount = analytics ? Object.keys(analytics.regionBreakdown).length : 0;

  const sortOptions: { value: SortMode; label: string }[] = [
    { value: "number-desc", label: t("m2.historical.sortNewest", "# Newest first") },
    { value: "number-asc", label: t("m2.historical.sortOldest", "# Oldest first") },
    { value: "date-newest", label: t("m2.historical.sortDateNew", "Date \u2193") },
    { value: "date-oldest", label: t("m2.historical.sortDateOld", "Date \u2191") },
    { value: "quality", label: t("m2.historical.sortQuality", "Best rated") },
  ];

  if (!pid) {
    return (
      <AuthGateMessage
        icon={<Archive className="w-12 h-12" style={{ color: "var(--labs-accent)" }} />}
        title={t("authGate.history.title")}
        bullets={[t("authGate.history.bullet1"), t("authGate.history.bullet2"), t("authGate.history.bullet3")]}
      />
    );
  }

  return (
    <>
      {analytics && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 8, marginBottom: 16 }}>
          {[
            { value: totalTastings, label: t("m2.historical.statTastings", "Tastings") },
            { value: totalWhiskies, label: t("m2.historical.statWhiskies", "Whiskies") },
            { value: regionCount, label: t("m2.historical.statRegions", "Regions") },
            { value: `${analytics.smokyBreakdown.smoky > 0 ? Math.round((analytics.smokyBreakdown.smoky / analytics.totalEntries) * 100) : 0}%`, label: t("m2.historical.statSmoky", "Smoky") },
          ].map(({ value, label }) => (
            <div key={label} className="labs-card" style={{ padding: "14px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
              <div style={{ fontSize: 11, color: "var(--labs-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "stretch", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 200px", minWidth: 0 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--labs-text-muted)" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("m2.historical.searchPlaceholder", "Search tastings...")}
              className="labs-input"
              style={{ paddingLeft: 36 }}
              data-testid="historical-search"
            />
          </div>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <ArrowUpDown size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--labs-text-muted)", pointerEvents: "none" }} />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="labs-input"
              style={{ paddingLeft: 28, paddingRight: 32, appearance: "none", cursor: "pointer" }}
              data-testid="historical-sort"
            >
              {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
      </div>

      {isLoading && (
        <div style={{ padding: "16px 0" }}>
          <SkeletonList count={4} showAvatar />
        </div>
      )}

      {isError && (
        <div className="labs-card" style={{ textAlign: "center", padding: "48px 16px" }}>
          <p style={{ color: "var(--labs-danger)", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{t("m2.historical.loadError", "Could not load historical tastings.")}</p>
          <button onClick={() => refetch()} className="labs-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }} data-testid="historical-retry">
            <RefreshCw size={13} /> {t("common.retry", "Retry")}
          </button>
        </div>
      )}

      {!isLoading && !isError && sorted.length === 0 && (
        <div className="labs-card" style={{ textAlign: "center", padding: "48px 16px" }}>
          <Archive style={{ width: 40, height: 40, color: "var(--labs-text-muted)", margin: "0 auto 12px", display: "block" }} strokeWidth={1.2} />
          <p style={{ color: "var(--labs-text)", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t("m2.historical.emptyTitle", "No historical tastings found")}</p>
          <p style={{ color: "var(--labs-text-muted)", fontSize: 13 }}>
            {search ? t("m2.historical.emptySearch", "No results \u2014 try a different search term.") : t("m2.historical.empty", "No historical tasting data available yet.")}
          </p>
        </div>
      )}

      {!isLoading && !isError && sorted.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginBottom: 8 }}>{sorted.length} {t("ui.tastings")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sorted.map(tasting => {
              const winnerLabel = [tasting.winnerDistillery, tasting.winnerName].filter(Boolean).join(" \u2014 ");
              const isClaimed = myClaimedIds.has(tasting.id);
              const pCount = participantCounts[tasting.id] || 0;
              return (
                <div key={tasting.id} className="labs-card-interactive" style={{ padding: "14px 16px" }} data-testid={`tasting-card-${tasting.tastingNumber}`}>
                  <Link href={`/labs/history/${tasting.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: isClaimed ? "var(--labs-success-muted)" : "var(--labs-accent-muted)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2,
                      }}>
                        {isClaimed
                          ? <UserCheck size={16} style={{ color: "var(--labs-success)" }} />
                          : <span style={{ fontSize: 14, fontWeight: 700, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>#{tasting.tastingNumber}</span>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {getTitle(tasting)}
                        </div>
                        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--labs-text-muted)", marginTop: 3, flexWrap: "wrap" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Calendar size={11} /> {formatDate(tasting.tastingDate, lang)}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Wine size={11} /> {tasting.whiskyCount}</span>
                          {tasting.avgTotalScore != null && (
                            <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Sparkles size={11} /> Ø {typeof tasting.avgTotalScore === "number" ? formatScore(tasting.avgTotalScore) : tasting.avgTotalScore}/100</span>
                          )}
                          {pCount > 0 && (
                            <span style={{ display: "flex", alignItems: "center", gap: 3 }} data-testid={`participant-count-${tasting.id}`}>
                              <Users size={11} /> {pCount}
                            </span>
                          )}
                        </div>
                        {winnerLabel && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, fontSize: 12, color: "var(--labs-accent)" }}>
                            <Trophy size={11} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{winnerLabel}</span>
                            {tasting.winnerScore != null && <span style={{ color: "var(--labs-text-muted)", flexShrink: 0 }}>({typeof tasting.winnerScore === "number" ? formatScore(tasting.winnerScore) : tasting.winnerScore}/100)</span>}
                          </div>
                        )}
                      </div>
                      <ChevronRight style={{ width: 16, height: 16, color: "var(--labs-text-muted)", flexShrink: 0, marginTop: 12 }} strokeWidth={1.8} />
                    </div>
                  </Link>
                  {pid && (
                    <div style={{ marginTop: 8, paddingLeft: 52 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          claimMutation.mutate({ tastingId: tasting.id, claim: !isClaimed });
                        }}
                        disabled={claimMutation.isPending}
                        className={isClaimed ? "labs-btn-ghost" : "labs-btn-primary"}
                        style={{
                          fontSize: 12, padding: "5px 12px", borderRadius: 8,
                          display: "inline-flex", alignItems: "center", gap: 5,
                          ...(isClaimed ? { color: "var(--labs-success)", border: "1px solid var(--labs-success)", background: "var(--labs-success-muted)" } : {}),
                        }}
                        data-testid={`claim-btn-${tasting.id}`}
                      >
                        {isClaimed ? <UserCheck size={12} /> : <Users size={12} />}
                        {isClaimed
                          ? t("m2.historical.claimed", "Ich war dabei ✓")
                          : t("m2.historical.claim", "Ich war dabei")
                        }
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

export function LabsHistoryInsights() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const session = useSession();
  const pid = getParticipantId();

  const { data: myCommunities, isLoading: commLoading } = useQuery<{ communities: Array<{ id: string }> }>({
    queryKey: ["my-communities", pid],
    queryFn: async () => {
      if (!pid) return { communities: [] };
      const res = await fetch("/api/communities/mine", { headers: { "x-participant-id": pid } });
      if (!res.ok) return { communities: [] };
      return res.json();
    },
    enabled: !!pid,
  });

  const isMember = session.role === "admin" || (myCommunities?.communities?.length ?? 0) > 0;
  const isAdmin = session.role === "admin";

  const { data: analytics, isLoading, isError, refetch } = useQuery<AnalyticsData>({
    queryKey: ["historical-analytics"],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (pid) headers["x-participant-id"] = pid;
      const res = await fetch("/api/historical/analytics", { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  if (isLoading || commLoading) {
    return (
      <div style={{ padding: "16px 0" }}>
        <SkeletonList count={3} />
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="labs-card" style={{ textAlign: "center", padding: "48px 16px" }}>
        <p style={{ color: "var(--labs-danger)", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{t("historyUi.couldNotLoadInsights")}</p>
        <button onClick={() => refetch()} className="labs-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={13} /> {t("ui.retry")}
        </button>
      </div>
    );
  }

  const topWhiskies = analytics.topWhiskies.slice(0, 20);
  const normalizedRegionBreakdown: Record<string, number> = {};
  for (const [name, value] of Object.entries(analytics.regionBreakdown)) {
    const normalized = name.replace(/lands$/i, "land").replace(/islands$/i, "island").replace(/^the\s+/i, "").trim();
    const key = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    normalizedRegionBreakdown[key] = (normalizedRegionBreakdown[key] ?? 0) + value;
  }
  const regionData = Object.entries(normalizedRegionBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  const caskData = Object.entries(analytics.caskBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  const smokyTotal = analytics.smokyBreakdown.smoky + analytics.smokyBreakdown.nonSmoky + analytics.smokyBreakdown.unknown;
  const smokyPieData = [
    { name: "Smoky", value: analytics.smokyBreakdown.smoky },
    { name: "Non-Smoky", value: analytics.smokyBreakdown.nonSmoky },
    ...(analytics.smokyBreakdown.unknown > 0 ? [{ name: "Unknown", value: analytics.smokyBreakdown.unknown }] : []),
  ].filter(d => d.value > 0);
  const smokyColors = ["#f59e0b", "#60a5fa", "#888"];
  const smokyPct = smokyTotal > 0 ? Math.round((analytics.smokyBreakdown.smoky / smokyTotal) * 100) : 0;

  const avgScore = analytics.totalEntries > 0 && topWhiskies.length > 0
    ? Math.round(topWhiskies.reduce((sum, w) => sum + (w.normalizedTotal ?? (w.totalScore ?? 0) * 10), 0) / topWhiskies.length).toString()
    : "\u2014";

  const topRegions = Object.entries(normalizedRegionBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topCasks = Object.entries(analytics.caskBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const profileData = [
    { subject: "Region Diversity", value: Math.min(Object.keys(analytics.regionBreakdown).length * 10, 100) },
    { subject: "Peat", value: smokyPct },
    { subject: "Cask Variety", value: Math.min(Object.keys(analytics.caskBreakdown).length * 12, 100) },
    { subject: "Volume", value: Math.min(analytics.totalEntries * 2, 100) },
    { subject: "Quality", value: Number(avgScore) || 50 },
  ];

  const tooltipStyle = { background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border)", borderRadius: 8, fontSize: 12, color: "var(--labs-text)" };

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          { icon: Wine, value: analytics.totalTastings, label: t("ui.tastings") },
          { icon: Droplets, value: analytics.totalEntries, label: t("tastingDetail.whiskies") },
          { icon: TrendingUp, value: avgScore !== "\u2014" ? `${avgScore}/100` : "\u2014", label: t("historyUi.avgScore") },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="labs-card" style={{ flex: "1 1 100px", padding: "14px 12px", textAlign: "center" }}>
            <Icon size={16} color="var(--labs-accent)" style={{ marginBottom: 6, display: "block", margin: "0 auto 6px" }} />
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
            <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      <SectionHeader icon={Trophy} title={t("historyUi.top20Whiskies")} />
      <div className="labs-card" style={{ padding: 16, marginBottom: 20 }} data-testid="insights-top-whiskies">
        {topWhiskies.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {topWhiskies.map((w, i) => {
              const isTop3 = i < 3;
              const medalColor = i === 0 ? "#d4a256" : i === 1 ? "#a8a8a8" : i === 2 ? "#cd7f32" : "var(--labs-text-muted)";
              const whiskyLabel = [w.distillery, w.name].filter(Boolean).join(" \u2014 ") || "\u2014";
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, fontSize: 13,
                  padding: "8px 6px",
                  background: isTop3 ? "var(--labs-accent-muted)" : "transparent",
                  borderRadius: 8,
                }} data-testid={`insights-top-whisky-${i}`}>
                  <span style={{ width: 26, textAlign: "right", color: medalColor, fontWeight: isTop3 ? 700 : 400, fontVariantNumeric: "tabular-nums", fontSize: isTop3 ? 15 : 13, flexShrink: 0 }}>{i + 1}.</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "var(--labs-text)", fontWeight: isTop3 ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{whiskyLabel}</div>
                  </div>
                  <span style={{ color: "var(--labs-accent)", fontWeight: 600, fontVariantNumeric: "tabular-nums", fontSize: 13, flexShrink: 0 }}>
                    {(w.normalizedTotal ?? (w.totalScore != null ? w.totalScore * 10 : null)) != null
                      ? `${Math.round(w.normalizedTotal ?? w.totalScore! * 10)}`
                      : "\u2014"}
                    {(w.normalizedTotal ?? w.totalScore) != null && <span style={{ fontSize: 11, color: "var(--labs-text-muted)", fontWeight: 400, marginLeft: 2 }}>/100</span>}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--labs-text-muted)", background: "var(--labs-accent-muted)", padding: "2px 6px", borderRadius: 8, flexShrink: 0 }}>{(lang.startsWith("de") ? w.titleDe : w.titleEn) || w.titleDe || (w.tastingNumber ? `#${w.tastingNumber}` : "")}</span>
                </div>
              );
            })}
          </div>
        ) : <EmptyState />}
      </div>

      <SectionHeader icon={MapPin} title={t("historyUi.bestPerformingRegions")} />
      <div className="labs-card" style={{ padding: 16, marginBottom: 20 }} data-testid="insights-regions">
        {regionData.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(regionData.length * 32, 120)}>
            <BarChart data={regionData} layout="vertical" margin={{ left: 10, right: 16, top: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fill: "var(--labs-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "var(--labs-text)", fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--labs-text)" }} itemStyle={{ color: "var(--labs-accent)" }} />
              <Bar dataKey="value" fill="var(--labs-accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState />}
      </div>

      <SectionHeader icon={Flame} title={t("historyUi.smokyVsNonSmoky")} />
      <div className="labs-card" style={{ padding: 16, marginBottom: 20 }} data-testid="insights-smoky">
        {smokyPieData.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div style={{ width: 160, height: 160, flexShrink: 0, margin: "0 auto" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={smokyPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" stroke="none">
                    {smokyPieData.map((_, i) => <Cell key={i} fill={smokyColors[i % smokyColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "var(--labs-text)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              {smokyPieData.map((d, i) => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: smokyColors[i], flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "var(--labs-text)", flex: 1 }}>{d.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>{d.value}</span>
                  <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>({smokyTotal > 0 ? Math.round((d.value / smokyTotal) * 100) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        ) : <EmptyState />}
      </div>

      <SectionHeader icon={Wine} title={t("historyUi.caskTypeComparison")} />
      <div className="labs-card" style={{ padding: 16, marginBottom: 20 }} data-testid="insights-cask">
        {caskData.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {caskData.map((c, i) => {
              const maxVal = caskData[0]?.value || 1;
              const pct = (c.value / maxVal) * 100;
              return (
                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 90, fontSize: 12, color: "var(--labs-text)", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{c.name}</span>
                  <div style={{ flex: 1, height: 8, background: "var(--labs-border)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--labs-text-muted)", fontVariantNumeric: "tabular-nums", width: 28, textAlign: "right" }}>{c.value}</span>
                </div>
              );
            })}
          </div>
        ) : <EmptyState />}
      </div>

      <SectionHeader icon={BarChart3} title={t("historyUi.scoreDistribution")} />
      <div className="labs-card" style={{ padding: 16, marginBottom: 20 }} data-testid="insights-score-dist">
        {analytics.scoreDistribution.filter(d => d.count > 0).length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.scoreDistribution} margin={{ left: 0, right: 0, top: 4, bottom: 4 }}>
              <XAxis dataKey="range" tick={{ fill: "var(--labs-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--labs-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--labs-text)" }} itemStyle={{ color: "var(--labs-accent)" }} />
              <Bar dataKey="count" fill="var(--labs-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState />}
      </div>

      <SectionHeader icon={Droplets} title={t("historyUi.groupTasteProfile")} />
      <div className="labs-card" style={{ padding: 16, marginBottom: 20 }} data-testid="insights-group-profile">
        <p style={{ fontSize: 13, color: "var(--labs-text-muted)", marginTop: 0, marginBottom: 16 }}>
          An aggregate view of taste tendencies across all historical tastings.
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={profileData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="var(--labs-border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--labs-text)", fontSize: 11 }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              <Radar dataKey="value" stroke="var(--labs-accent)" fill="var(--labs-accent)" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[
            { label: t("historyUi.topRegion"), value: topRegions[0]?.[0] ?? "\u2014" },
            { label: t("historyUi.topCask"), value: topCasks[0]?.[0] ?? "\u2014" },
            { label: t("historyUi.peatLevel"), value: `${smokyPct}%` },
          ].map(({ label, value }) => (
            <div key={label} style={{
              flex: "1 1 140px", minWidth: 120,
              background: "var(--labs-accent-muted)",
              borderRadius: 10, padding: "12px 14px",
            }}>
              <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, marginTop: 8 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, background: "var(--labs-accent-muted)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={14} color="var(--labs-accent)" />
      </div>
      <h2 className="labs-serif" style={{ fontSize: 15, fontWeight: 700, color: "var(--labs-text)", margin: 0 }}>{title}</h2>
    </div>
  );
}

function EmptyState() {
  return <div style={{ textAlign: "center", padding: 24, color: "var(--labs-text-muted)", fontSize: 13 }}>No data available</div>;
}

export default function LabsHistory() {
  const [isInsightsNew] = useRoute("/labs/history/insights");
  const [isInsightsOld] = useRoute("/labs/host/history/insights");
  const isInsights = isInsightsNew || isInsightsOld;
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const isHostRoute = window.location.pathname.startsWith("/labs/host/");
  const backFallback = isHostRoute ? "/labs/host/dashboard" : "/labs/bibliothek";
  const goBack = useLabsBack(backFallback);
  const tastingsPath = isHostRoute ? "/labs/host/history" : "/labs/history";
  const insightsPath = isHostRoute ? "/labs/host/history/insights" : "/labs/history/insights";

  return (
    <div className="labs-page labs-fade-in" data-testid="labs-history-page">
      <button
        onClick={goBack}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="labs-history-back"
      >
        <ChevronLeft className="w-4 h-4" />
        {isHostRoute ? t("history.backToDashboard", "Dashboard") : t("bibliothek.title", "Library")}
      </button>
      <h1
        className="labs-serif"
        style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 4px" }}
        data-testid="history-title"
      >
        {t("history.archiveTitle", "Archive")}
      </h1>
      <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 12px" }}>
        {t("history.archiveSubtitle", "Past tastings, analytics & group taste profile")}
      </p>

      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 16,
          background: "var(--labs-card-bg)",
          borderRadius: 12,
          padding: 3,
          border: "1px solid var(--labs-border-subtle)",
        }}
        data-testid="history-tab-switcher"
      >
        <button
          onClick={() => navigate(tastingsPath)}
          data-testid="history-tab-tastings"
          style={{
            flex: 1,
            padding: "8px 12px",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            transition: "all 200ms ease",
            background: !isInsights ? "var(--labs-accent)" : "transparent",
            color: !isInsights ? "#1a1714" : "var(--labs-text-muted)",
          }}
        >
          {t("history.tabTastings", "Tastings")}
        </button>
        <button
          onClick={() => navigate(insightsPath)}
          data-testid="history-tab-insights"
          style={{
            flex: 1,
            padding: "8px 12px",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            transition: "all 200ms ease",
            background: isInsights ? "var(--labs-accent)" : "transparent",
            color: isInsights ? "#1a1714" : "var(--labs-text-muted)",
          }}
        >
          {t("history.tabInsights", "Insights")}
        </button>
      </div>

      {isInsights ? <LabsHistoryInsights /> : <LabsHistoryList />}
    </div>
  );
}
