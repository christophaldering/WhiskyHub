import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { v, alpha } from "@/lib/themeVars";
import { getParticipantId } from "@/lib/api";
import { getSession } from "@/lib/session";
import M2BackButton from "@/components/m2/M2BackButton";
import {
  Search, Wine, Trophy, Calendar, Hash, BarChart3,
  ArrowUpDown, ChevronRight, Archive, Sparkles, RefreshCw, Lock, LogIn,
} from "lucide-react";

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
  topWhiskies: Array<{ distillery: string | null; name: string | null; totalScore: number | null; tastingNumber: number }>;
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
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === "de" ? "de-DE" : "en-US", { year: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

function getWinnerLabel(t: EnrichedTasting): string {
  if (!t.winnerDistillery && !t.winnerName) return "—";
  const parts = [t.winnerDistillery, t.winnerName].filter(Boolean);
  return parts.join(" — ");
}

function Spinner() {
  return (
    <div style={{ textAlign: "center", padding: "60px 16px" }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        border: `3px solid ${v.border}`,
        borderTopColor: v.accent,
        animation: "spin 0.8s linear infinite",
        margin: "0 auto 16px",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function M2HistoricalTastings() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("number-desc");

  const session = getSession();
  const pid = getParticipantId();

  const { data: myCommunities, isLoading: commLoading } = useQuery<{ communities: Array<{ id: string; communityId: string; role: string }> }>({
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
  const isSignedIn = session.signedIn;

  const { data: tastingsData, isLoading, isError, refetch } = useQuery<{ tastings: EnrichedTasting[]; total: number }>({
    queryKey: ["historical-tastings-enriched", search],
    queryFn: () => fetchJSON(`/api/historical/tastings?limit=200&enriched=true&search=${encodeURIComponent(search)}`, pid),
    enabled: isMember,
  });

  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ["historical-analytics"],
    queryFn: () => fetchJSON("/api/historical/analytics", pid),
    enabled: isMember,
  });

  const tastings = tastingsData?.tastings ?? [];

  const sorted = useMemo(() => {
    const arr = [...tastings];
    switch (sortMode) {
      case "number-asc":
        return arr.sort((a, b) => a.tastingNumber - b.tastingNumber);
      case "number-desc":
        return arr.sort((a, b) => b.tastingNumber - a.tastingNumber);
      case "date-newest":
        return arr.sort((a, b) => {
          if (!a.tastingDate && !b.tastingDate) return 0;
          if (!a.tastingDate) return 1;
          if (!b.tastingDate) return -1;
          return new Date(b.tastingDate).getTime() - new Date(a.tastingDate).getTime();
        });
      case "date-oldest":
        return arr.sort((a, b) => {
          if (!a.tastingDate && !b.tastingDate) return 0;
          if (!a.tastingDate) return 1;
          if (!b.tastingDate) return -1;
          return new Date(a.tastingDate).getTime() - new Date(b.tastingDate).getTime();
        });
      case "quality":
        return arr.sort((a, b) => (b.avgTotalScore ?? 0) - (a.avgTotalScore ?? 0));
      default:
        return arr;
    }
  }, [tastings, sortMode]);

  const getTitle = (tasting: EnrichedTasting) =>
    (lang === "de" ? tasting.titleDe : tasting.titleEn) || tasting.titleDe || `Tasting #${tasting.tastingNumber}`;

  const totalWhiskies = analytics?.totalEntries ?? 0;
  const totalTastings = analytics?.totalTastings ?? 0;
  const regionCount = analytics ? Object.keys(analytics.regionBreakdown).length : 0;

  const sortOptions: { value: SortMode; label: string }[] = [
    { value: "number-desc", label: t("m2.historical.sortNewest", "# Newest first") },
    { value: "number-asc", label: t("m2.historical.sortOldest", "# Oldest first") },
    { value: "date-newest", label: t("m2.historical.sortDateNew", "Date ↓") },
    { value: "date-oldest", label: t("m2.historical.sortDateOld", "Date ↑") },
    { value: "quality", label: t("m2.historical.sortQuality", "Best rated") },
  ];

  return (
    <div style={{ padding: "16px 16px 100px", maxWidth: 800, margin: "0 auto" }}>
      <M2BackButton />

      <div style={{ marginTop: 12, marginBottom: 8 }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 24,
            fontWeight: 700,
            color: v.text,
            margin: 0,
          }}
          data-testid="historical-title"
        >
          {t("m2.historical.title", "Historical Tastings")}
        </h1>
        <p style={{ fontSize: 13, color: v.muted, marginTop: 4, lineHeight: 1.5, maxWidth: 520 }}>
          {t("m2.historical.archiveIntro", "A curated archive of past tasting events — browse, compare, and rediscover memorable drams.")}
        </p>
      </div>

      {!isMember && !commLoading && (
        <div style={{
          textAlign: "center",
          padding: "48px 20px",
          background: v.card,
          border: `1px solid ${v.border}`,
          borderRadius: 14,
          marginTop: 16,
        }} data-testid="historical-locked">
          {!isSignedIn ? (
            <>
              <LogIn style={{ width: 40, height: 40, color: v.muted, margin: "0 auto 16px", display: "block" }} strokeWidth={1.2} />
              <div style={{ fontSize: 16, fontWeight: 600, color: v.text, marginBottom: 6 }}>
                {t("m2.community.signInToView", "Sign in to access the archive")}
              </div>
              <div style={{ fontSize: 13, color: v.muted, lineHeight: 1.5, maxWidth: 360, margin: "0 auto" }}>
                {t("m2.community.signInHint", "Sign in to see if you have access to this community's tasting archive.")}
              </div>
            </>
          ) : (
            <>
              <Lock style={{ width: 40, height: 40, color: v.muted, margin: "0 auto 16px", display: "block" }} strokeWidth={1.2} />
              <div style={{ fontSize: 16, fontWeight: 600, color: v.text, marginBottom: 6 }}>
                {t("m2.community.membersOnly", "Community Members Only")}
              </div>
              <div style={{ fontSize: 13, color: v.muted, lineHeight: 1.5, maxWidth: 360, margin: "0 auto" }}>
                {t("m2.community.archiveRestricted", "This archive is available to community members. Contact the community admin to request access.")}
              </div>
            </>
          )}
        </div>
      )}

      {isMember && analytics && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
          gap: 8,
          marginBottom: 16,
          marginTop: 16,
        }}>
          <div
            style={{
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 12,
              padding: "14px 8px",
              textAlign: "center",
            }}
            data-testid="stat-tastings"
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>
              {totalTastings}
            </div>
            <div style={{ fontSize: 10, color: v.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("m2.historical.statTastings", "Tastings")}
            </div>
          </div>
          <div
            style={{
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 12,
              padding: "14px 8px",
              textAlign: "center",
            }}
            data-testid="stat-whiskies"
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>
              {totalWhiskies}
            </div>
            <div style={{ fontSize: 10, color: v.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("m2.historical.statWhiskies", "Whiskies")}
            </div>
          </div>
          <div
            style={{
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 12,
              padding: "14px 8px",
              textAlign: "center",
            }}
            data-testid="stat-regions"
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>
              {regionCount}
            </div>
            <div style={{ fontSize: 10, color: v.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("m2.historical.statRegions", "Regions")}
            </div>
          </div>
          <div
            style={{
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 12,
              padding: "14px 8px",
              textAlign: "center",
            }}
            data-testid="stat-smoky"
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>
              {analytics.smokyBreakdown.smoky > 0 ? Math.round((analytics.smokyBreakdown.smoky / analytics.totalEntries) * 100) : 0}%
            </div>
            <div style={{ fontSize: 10, color: v.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("m2.historical.statSmoky", "Smoky")}
            </div>
          </div>
        </div>
      )}

      {isMember && <Link href="/m2/taste/historical/insights" style={{ textDecoration: "none" }}>
        <div
          style={{
            background: v.card,
            border: `1px solid ${v.border}`,
            borderRadius: 12,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            marginBottom: 16,
          }}
          data-testid="link-insights"
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: alpha(v.accent, "15"),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BarChart3 style={{ width: 18, height: 18, color: v.accent }} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: v.text }}>
              {t("m2.historical.insightsLink", "Cross-Tasting Insights")}
            </div>
            <div style={{ fontSize: 12, color: v.muted, marginTop: 2 }}>
              {t("m2.historical.insightsDesc", "Top whiskies, regions, trends & group profile")}
            </div>
          </div>
          <ChevronRight style={{ width: 16, height: 16, color: v.muted, flexShrink: 0 }} strokeWidth={1.8} />
        </div>
      </Link>}

      {isMember && <>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "stretch", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 0 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: v.muted }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("m2.historical.searchPlaceholder", "Search tastings...")}
            style={{
              width: "100%",
              padding: "10px 12px 10px 34px",
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 10,
              color: v.text,
              fontSize: 14,
              outline: "none",
              height: "100%",
              boxSizing: "border-box",
            }}
            data-testid="historical-search"
          />
        </div>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <ArrowUpDown size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: v.muted, pointerEvents: "none" }} />
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            style={{
              appearance: "none",
              padding: "10px 32px 10px 28px",
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 10,
              color: v.text,
              fontSize: 13,
              cursor: "pointer",
              outline: "none",
              height: "100%",
            }}
            data-testid="historical-sort"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div data-testid="historical-loading">
          <Spinner />
          <div style={{ textAlign: "center", color: v.muted, fontSize: 14 }}>
            {t("m2.historical.loading", "Loading archive...")}
          </div>
        </div>
      )}

      {isError && (
        <div style={{
          textAlign: "center",
          padding: "48px 16px",
          background: v.card,
          border: `1px solid ${v.border}`,
          borderRadius: 12,
        }} data-testid="historical-error">
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ color: v.danger, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
            {t("m2.historical.loadError", "Could not load historical tastings.")}
          </div>
          <div style={{ color: v.muted, fontSize: 13, marginBottom: 16 }}>
            {t("m2.historical.loadErrorHint", "Please try again later.")}
          </div>
          <button
            onClick={() => refetch()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: v.accent,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
            data-testid="historical-retry"
          >
            <RefreshCw size={13} />
            {t("common.retry", "Retry")}
          </button>
        </div>
      )}

      {!isLoading && !isError && sorted.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "48px 16px",
          background: v.card,
          border: `1px solid ${v.border}`,
          borderRadius: 12,
        }} data-testid="historical-empty">
          <Archive style={{ width: 40, height: 40, color: v.muted, margin: "0 auto 12px", display: "block" }} strokeWidth={1.2} />
          <div style={{ color: v.text, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
            {t("m2.historical.emptyTitle", "No historical tastings found")}
          </div>
          <div style={{ color: v.muted, fontSize: 13 }}>
            {search
              ? t("m2.historical.emptySearch", "No results — try a different search term.")
              : t("m2.historical.empty", "No historical tasting data available yet.")}
          </div>
        </div>
      )}

      {!isLoading && !isError && sorted.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: v.muted, marginBottom: 8 }}>
            {sorted.length} {t("m2.historical.tastingsCount", "tastings")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sorted.map((tasting) => {
              const winnerLabel = getWinnerLabel(tasting);
              return (
                <Link
                  key={tasting.id}
                  href={`/m2/taste/historical/${tasting.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      background: v.card,
                      border: `1px solid ${v.border}`,
                      borderRadius: 12,
                      padding: "14px 16px",
                      cursor: "pointer",
                      transition: "border-color 0.15s",
                    }}
                    data-testid={`tasting-card-${tasting.tastingNumber}`}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: alpha(v.accent, "12"),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>
                          #{tasting.tastingNumber}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: v.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "100%",
                        }}>
                          {getTitle(tasting)}
                        </div>
                        <div style={{ display: "flex", gap: 12, fontSize: 12, color: v.muted, marginTop: 3, flexWrap: "wrap" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <Calendar size={11} />
                            {formatDate(tasting.tastingDate, lang)}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <Wine size={11} />
                            {tasting.whiskyCount}
                          </span>
                          {tasting.avgTotalScore != null && (
                            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                              <Sparkles size={11} />
                              Ø {tasting.avgTotalScore.toFixed(1)}
                            </span>
                          )}
                        </div>
                        {winnerLabel !== "—" && (
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            marginTop: 6,
                            fontSize: 12,
                            color: v.accent,
                            maxWidth: "100%",
                            overflow: "hidden",
                          }}>
                            <Trophy size={11} style={{ flexShrink: 0 }} />
                            <span style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                              minWidth: 0,
                            }}>
                              {winnerLabel}
                            </span>
                            {tasting.winnerScore != null && (
                              <span style={{ color: v.muted, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                                ({tasting.winnerScore.toFixed(1)})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <ChevronRight style={{ width: 16, height: 16, color: v.muted, flexShrink: 0, marginTop: 12 }} strokeWidth={1.8} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
      </>}
    </div>
  );
}
