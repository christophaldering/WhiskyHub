import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import M2BackButton from "@/components/m2/M2BackButton";
import { flavorProfileApi } from "@/lib/api";
import { getSession, useSession } from "@/lib/session";
import { v } from "@/lib/themeVars";

const CHART_COLORS = ["#c8a864", "#6b9bd2", "#d97c5a"];

interface RatedWhiskyItem {
  whisky: { id: string; name: string; distillery: string | null; region: string | null; imageUrl: string | null };
  rating: { overall: number; nose: number; taste: number; finish: number; balance: number; notes: string | null };
}

interface WhiskyComparisonItem {
  whiskyId: string;
  whiskyName: string;
  distillery: string | null;
  region: string | null;
  userScore: number;
  platformMedian: number;
  delta: number;
  iqr: { q1: number; q3: number; iqr: number } | null;
  platformN: number;
  ratedAt: string | null;
}

type DatePeriodCompare = "all" | "30d" | "3m" | "1y";
const DATE_PERIODS_COMPARE: { key: DatePeriodCompare; labelKey: string; fallback: string; days: number }[] = [
  { key: "all", labelKey: "m2.taste.periodAll", fallback: "All time", days: 0 },
  { key: "30d", labelKey: "m2.taste.period30d", fallback: "30 days", days: 30 },
  { key: "3m", labelKey: "m2.taste.period3m", fallback: "3 months", days: 90 },
  { key: "1y", labelKey: "m2.taste.period1y", fallback: "1 year", days: 365 },
];

const DIMENSION_KEYS = [
  { key: "nose", labelKey: "m2.rating.nose", fallback: "Nose" },
  { key: "taste", labelKey: "m2.rating.taste", fallback: "Taste" },
  { key: "finish", labelKey: "m2.rating.finish", fallback: "Finish" },
  { key: "balance", labelKey: "m2.rating.balance", fallback: "Balance" },
  { key: "overall", labelKey: "m2.rating.overall", fallback: "Overall" },
];

type SortOption = "delta_desc" | "delta_asc" | "your_desc" | "platform_desc" | "name_az";
type DirectionFilter = "all" | "positive" | "negative";

function parseSearchParams(searchStr: string) {
  const params = new URLSearchParams(searchStr);
  return {
    q: params.get("q") || "",
    sort: (params.get("sort") as SortOption) || "delta_desc",
    minN: parseInt(params.get("minN") || "1", 10),
    direction: (params.get("direction") as DirectionFilter) || "all",
    period: (params.get("period") as DatePeriodCompare) || "all",
    page: parseInt(params.get("page") || "1", 10),
    perPage: parseInt(params.get("perPage") || "25", 10),
  };
}

function buildSearchString(params: Record<string, string | number>) {
  const sp = new URLSearchParams();
  for (const [k, val] of Object.entries(params)) {
    if (val !== "" && val !== "all" && val !== 1 && !(k === "sort" && val === "delta_desc") && !(k === "perPage" && val === 25)) {
      sp.set(k, String(val));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default function M2TasteCompare() {
  const { t } = useTranslation();
  const session = useSession();
  const pid = session.pid || "";
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [radarSearch, setRadarSearch] = useState("");
  const searchStr = useSearch();
  const [, navigate] = useLocation();

  const filters = parseSearchParams(searchStr);

  const setFilter = (key: string, value: string | number) => {
    const next = { ...filters, [key]: value };
    if (key !== "page") next.page = 1;
    navigate(`/m2/taste/compare${buildSearchString(next)}`, { replace: true });
  };

  const { data, isLoading } = useQuery<{ ratedWhiskies: RatedWhiskyItem[]; whiskyComparison?: WhiskyComparisonItem[] }>({
    queryKey: ["flavor-profile", pid],
    queryFn: () => flavorProfileApi.getWhiskyProfile(pid, "all", "platform"),
    enabled: !!pid,
  });

  const ratedWhiskies = data?.ratedWhiskies || [];
  const whiskyComparison = data?.whiskyComparison || [];

  const filteredComparison = useMemo(() => {
    let items = [...whiskyComparison];

    if (filters.q) {
      const q = filters.q.toLowerCase();
      items = items.filter(
        (item) =>
          item.whiskyName.toLowerCase().includes(q) ||
          (item.distillery || "").toLowerCase().includes(q)
      );
    }

    if (filters.minN > 1) {
      items = items.filter((item) => item.platformN >= filters.minN);
    }

    if (filters.direction === "positive") {
      items = items.filter((item) => item.delta > 0);
    } else if (filters.direction === "negative") {
      items = items.filter((item) => item.delta < 0);
    }

    if (filters.period !== "all") {
      const periodDays = DATE_PERIODS_COMPARE.find(p => p.key === filters.period)?.days || 0;
      if (periodDays > 0) {
        const cutoff = Date.now() - periodDays * 86400000;
        items = items.filter((item) => {
          if (!item.ratedAt) return false;
          return new Date(item.ratedAt).getTime() >= cutoff;
        });
      }
    }

    switch (filters.sort) {
      case "delta_desc":
        items.sort((a, b) => b.delta - a.delta);
        break;
      case "delta_asc":
        items.sort((a, b) => a.delta - b.delta);
        break;
      case "your_desc":
        items.sort((a, b) => b.userScore - a.userScore);
        break;
      case "platform_desc":
        items.sort((a, b) => b.platformMedian - a.platformMedian);
        break;
      case "name_az":
        items.sort((a, b) => a.whiskyName.localeCompare(b.whiskyName));
        break;
    }

    return items;
  }, [whiskyComparison, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredComparison.length / filters.perPage));
  const currentPage = Math.min(filters.page, totalPages);
  const paginatedItems = filteredComparison.slice(
    (currentPage - 1) * filters.perPage,
    currentPage * filters.perPage
  );

  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  if (!pid) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ textAlign: "center", padding: "60px 0", color: v.muted }} data-testid="text-sign-in-prompt">
          <p style={{ fontSize: 16 }}>{t("comparison.loginRequired")}</p>
        </div>
      </div>
    );
  }

  const selected = selectedIds.map((id) => ratedWhiskies.find((r) => r.whisky.id === id)).filter(Boolean) as RatedWhiskyItem[];

  const toggleWhisky = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const filteredWhiskiesRadar = ratedWhiskies.filter(
    (r) =>
      r.whisky.name.toLowerCase().includes(radarSearch.toLowerCase()) ||
      (r.whisky.distillery || "").toLowerCase().includes(radarSearch.toLowerCase())
  );

  const radarData = DIMENSION_KEYS.map((dim) => {
    const entry: Record<string, any> = { dimension: t(dim.labelKey, dim.fallback) };
    selected.forEach((item, i) => {
      entry[`whisky${i}`] = (item.rating as any)[dim.key];
    });
    return entry;
  });

  const handleExportCsv = () => {
    if (filteredComparison.length === 0) return;
    const header = [t("m2.taste.exportHeaderWhisky", "Whisky"), t("m2.taste.exportHeaderDistillery", "Distillery"), t("m2.taste.exportHeaderYourScore", "Your Score"), t("m2.taste.exportHeaderPlatformMedian", "Platform Median"), t("m2.taste.exportHeaderDelta", "Delta"), "N"];
    const rows = filteredComparison.map((item) => [
      `"${item.whiskyName}"`,
      `"${item.distillery || ""}"`,
      item.userScore.toFixed(1),
      item.platformMedian.toFixed(1),
      (item.delta >= 0 ? "+" : "") + item.delta.toFixed(1),
      item.platformN,
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "whisky-comparison.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: "5px 12px",
    borderRadius: 20,
    border: `1px solid ${active ? v.accent : v.border}`,
    background: active ? v.pillBg : "transparent",
    color: active ? v.pillText : v.muted,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
  });

  return (
    <div data-testid="m2-comparison-page" style={{ width: "100%", padding: 16 }}>
      <M2BackButton />
      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 24,
          color: v.accent,
          marginBottom: 6,
        }}
        data-testid="text-compare-title"
      >
        {t("comparison.tableTitle")}
      </h1>
      <p style={{ fontSize: 13, color: v.muted, marginBottom: 20 }}>
        {t("comparison.tableSubtitle")}
      </p>

      {isLoading ? (
        <div style={{ height: 200, background: v.card, borderRadius: 12, opacity: 0.5 }} />
      ) : whiskyComparison.length === 0 && ratedWhiskies.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: v.muted }} data-testid="text-empty">
          <p>{t("comparison.noData")}</p>
        </div>
      ) : (
        <>
          {whiskyComparison.length > 0 && (
            <>
              <div
                style={{
                  background: v.card,
                  border: `1px solid ${v.border}`,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
                data-testid="filter-bar"
              >
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder={t("comparison.searchPlaceholder")}
                    value={filters.q}
                    onChange={(e) => setFilter("q", e.target.value)}
                    data-testid="input-table-search"
                    style={{
                      flex: 1,
                      minWidth: 180,
                      padding: "8px 12px",
                      fontSize: 13,
                      background: v.elevated,
                      border: `1px solid ${v.border}`,
                      borderRadius: 8,
                      color: v.text,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <select
                    value={filters.sort}
                    onChange={(e) => setFilter("sort", e.target.value)}
                    data-testid="select-sort"
                    style={{
                      padding: "8px 12px",
                      fontSize: 13,
                      background: v.elevated,
                      border: `1px solid ${v.border}`,
                      borderRadius: 8,
                      color: v.text,
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    <option value="delta_desc">{t("comparison.sortDeltaDesc")}</option>
                    <option value="delta_asc">{t("comparison.sortDeltaAsc")}</option>
                    <option value="your_desc">{t("comparison.sortYourDesc")}</option>
                    <option value="platform_desc">{t("comparison.sortPlatformDesc")}</option>
                    <option value="name_az">{t("comparison.sortNameAz")}</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: v.muted, fontWeight: 600 }}>{t("comparison.minN")}:</span>
                  {[1, 5, 10, 20].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFilter("minN", n)}
                      style={chipStyle(filters.minN === n)}
                      data-testid={`chip-min-n-${n}`}
                    >
                      {n === 1 ? t("comparison.directionAll") : `≥${n}`}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: v.muted, fontWeight: 600 }}>{t("m2.taste.deltaLabel", "Delta")}:</span>
                  {(["all", "positive", "negative"] as DirectionFilter[]).map((dir) => (
                    <button
                      key={dir}
                      onClick={() => setFilter("direction", dir)}
                      style={chipStyle(filters.direction === dir)}
                      data-testid={`chip-direction-${dir}`}
                    >
                      {t(`comparison.direction${dir.charAt(0).toUpperCase() + dir.slice(1)}`)}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: v.muted, fontWeight: 600 }}>{t("m2.taste.periodLabel", "Period")}:</span>
                  {DATE_PERIODS_COMPARE.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setFilter("period", p.key)}
                      style={chipStyle(filters.period === p.key)}
                      data-testid={`chip-period-${p.key}`}
                    >
                      {t(p.labelKey, p.fallback)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: v.muted }}>
                  {filteredComparison.length} {filteredComparison.length === 1 ? t("m2.taste.whiskySingular", "whisky") : t("m2.taste.whiskyPlural", "whiskies")}
                </span>
                <button
                  onClick={handleExportCsv}
                  data-testid="button-export-csv"
                  style={{
                    padding: "6px 14px",
                    fontSize: 12,
                    background: "transparent",
                    border: `1px solid ${v.border}`,
                    borderRadius: 8,
                    color: v.accent,
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  {t("comparison.exportCsv")}
                </button>
              </div>

              <div
                style={{
                  background: v.card,
                  border: `1px solid ${v.border}`,
                  borderRadius: 12,
                  overflow: "auto",
                  marginBottom: 16,
                  maxHeight: 600,
                }}
                data-testid="comparison-table"
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${v.border}`, position: "sticky", top: 0, background: v.elevated, zIndex: 1 }}>
                      <th style={{ textAlign: "left", padding: "10px 14px", color: v.textSecondary, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {t("comparison.whiskyName")}
                      </th>
                      <th style={{ textAlign: "right", padding: "10px 8px", color: v.textSecondary, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {t("comparison.yourScore")}
                      </th>
                      <th style={{ textAlign: "right", padding: "10px 8px", color: v.textSecondary, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {t("comparison.platformMedian")}
                      </th>
                      <th style={{ textAlign: "right", padding: "10px 8px", color: v.textSecondary, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {t("comparison.delta")}
                      </th>
                      <th style={{ textAlign: "right", padding: "10px 14px", color: v.textSecondary, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {t("comparison.nRatings")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item) => (
                      <tr
                        key={item.whiskyId}
                        onMouseEnter={() => setHoveredRow(item.whiskyId)}
                        onMouseLeave={() => setHoveredRow(null)}
                        data-testid={`row-whisky-${item.whiskyId}`}
                        style={{
                          borderBottom: `1px solid ${v.border}`,
                          background: hoveredRow === item.whiskyId ? v.tableRowHover : "transparent",
                          transition: "background 0.15s",
                        }}
                      >
                        <td style={{ padding: "10px 14px", color: v.text, fontWeight: 500 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                            {item.whiskyName}
                          </div>
                          {item.distillery && (
                            <div style={{ fontSize: 11, color: v.muted, marginTop: 2 }}>
                              {[item.distillery, item.region].filter(Boolean).join(" · ")}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "right", padding: "10px 8px", fontVariantNumeric: "tabular-nums", fontWeight: 500, color: v.text, fontSize: 14 }}>
                          {item.userScore.toFixed(1)}
                        </td>
                        <td style={{ textAlign: "right", padding: "10px 8px", fontVariantNumeric: "tabular-nums", color: v.textSecondary, fontSize: 14 }}>
                          {item.platformMedian.toFixed(1)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "10px 8px",
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 600,
                            fontSize: 14,
                            color: item.delta > 0 ? v.deltaPositive : item.delta < 0 ? v.deltaNegative : v.muted,
                          }}
                        >
                          {item.delta > 0 ? "+" : ""}
                          {item.delta.toFixed(1)}
                        </td>
                        <td style={{ textAlign: "right", padding: "10px 14px", fontVariantNumeric: "tabular-nums", color: v.muted, fontSize: 12 }}>
                          {item.platformN}
                        </td>
                      </tr>
                    ))}
                    {paginatedItems.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "24px 14px", color: v.muted }}>
                          {t("comparison.noData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: v.muted }}>{t("comparison.rowsPerPage")}:</span>
                  {[25, 50, 100].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFilter("perPage", n)}
                      style={chipStyle(filters.perPage === n)}
                      data-testid={`chip-per-page-${n}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => setFilter("page", Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    data-testid="button-prev-page"
                    style={{
                      padding: "5px 10px",
                      fontSize: 12,
                      background: "transparent",
                      border: `1px solid ${v.border}`,
                      borderRadius: 6,
                      color: currentPage <= 1 ? v.muted : v.text,
                      cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                      opacity: currentPage <= 1 ? 0.4 : 1,
                    }}
                  >
                    ‹
                  </button>
                  <span style={{ fontSize: 12, color: v.textSecondary, fontVariantNumeric: "tabular-nums" }}>
                    {t("comparison.page")} {currentPage} {t("comparison.of")} {totalPages}
                  </span>
                  <button
                    onClick={() => setFilter("page", Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    data-testid="button-next-page"
                    style={{
                      padding: "5px 10px",
                      fontSize: 12,
                      background: "transparent",
                      border: `1px solid ${v.border}`,
                      borderRadius: 6,
                      color: currentPage >= totalPages ? v.muted : v.text,
                      cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                      opacity: currentPage >= totalPages ? 0.4 : 1,
                    }}
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
          )}

          {ratedWhiskies.length > 0 && (
            <>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 20,
                  color: v.accent,
                  marginBottom: 6,
                  marginTop: whiskyComparison.length > 0 ? 16 : 0,
                }}
                data-testid="text-radar-title"
              >
                {t("comparison.radarTitle")}
              </h2>
              <p style={{ fontSize: 13, color: v.muted, marginBottom: 16 }}>
                {t("comparison.subtitle")}
              </p>

              <input
                type="text"
                placeholder={t("comparison.searchPlaceholder")}
                value={radarSearch}
                onChange={(e) => setRadarSearch(e.target.value)}
                data-testid="input-compare-search"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: 14,
                  background: v.card,
                  border: `1px solid ${v.border}`,
                  borderRadius: 8,
                  color: v.text,
                  outline: "none",
                  marginBottom: 12,
                  boxSizing: "border-box",
                }}
              />

              {selected.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {selected.map((item, i) => (
                    <div
                      key={item.whisky.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 12px",
                        borderRadius: 20,
                        border: `1px solid ${CHART_COLORS[i]}`,
                        color: CHART_COLORS[i],
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                      data-testid={`chip-whisky-${item.whisky.id}`}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: CHART_COLORS[i],
                          display: "inline-block",
                        }}
                      />
                      <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.whisky.name}
                      </span>
                      <button
                        onClick={() => toggleWhisky(item.whisky.id)}
                        style={{ background: "none", border: "none", color: CHART_COLORS[i], cursor: "pointer", padding: 0, fontSize: 16, lineHeight: 1 }}
                        data-testid={`button-remove-whisky-${item.whisky.id}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div
                style={{
                  maxHeight: 200,
                  overflowY: "auto",
                  background: v.card,
                  border: `1px solid ${v.border}`,
                  borderRadius: 8,
                  marginBottom: 24,
                }}
              >
                {filteredWhiskiesRadar.map((item) => {
                  const isSelected = selectedIds.includes(item.whisky.id);
                  const colorIdx = selectedIds.indexOf(item.whisky.id);
                  return (
                    <button
                      key={item.whisky.id}
                      onClick={() => toggleWhisky(item.whisky.id)}
                      disabled={!isSelected && selectedIds.length >= 3}
                      data-testid={`button-select-whisky-${item.whisky.id}`}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        background: isSelected ? v.pillBg : "transparent",
                        border: "none",
                        borderBottom: `1px solid ${v.border}`,
                        color: v.text,
                        cursor: !isSelected && selectedIds.length >= 3 ? "not-allowed" : "pointer",
                        opacity: !isSelected && selectedIds.length >= 3 ? 0.4 : 1,
                        textAlign: "left",
                        fontSize: 14,
                      }}
                    >
                      {isSelected ? (
                        <span style={{ width: 12, height: 12, borderRadius: "50%", background: CHART_COLORS[colorIdx], flexShrink: 0 }} />
                      ) : (
                        <span style={{ width: 12, height: 12, borderRadius: "50%", border: `1px solid ${v.muted}`, flexShrink: 0 }} />
                      )}
                      {item.whisky.imageUrl && (
                        <img src={item.whisky.imageUrl} alt="" style={{ width: 24, height: 32, objectFit: "cover", borderRadius: 4, flexShrink: 0, background: v.bg }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.whisky.name}
                        </div>
                        <div style={{ fontSize: 11, color: v.muted }}>
                          {[item.whisky.distillery, item.whisky.region].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: v.muted, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{item.rating.overall.toFixed(1)}</span>
                    </button>
                  );
                })}
              </div>

              {selected.length >= 2 && (
                <>
                  <div
                    style={{
                      background: v.card,
                      border: `1px solid ${v.border}`,
                      borderRadius: 12,
                      padding: 20,
                      marginBottom: 24,
                    }}
                    data-testid="radar-chart-container"
                  >
                    <div style={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                          <PolarGrid stroke={v.border} />
                          <PolarAngleAxis dataKey="dimension" tick={{ fill: v.muted, fontSize: 12 }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: v.muted, fontSize: 10 }} />
                          {selected.map((item, i) => (
                            <Radar
                              key={item.whisky.id}
                              name={item.whisky.name}
                              dataKey={`whisky${i}`}
                              stroke={CHART_COLORS[i]}
                              fill={CHART_COLORS[i]}
                              fillOpacity={0.15}
                              strokeWidth={2}
                            />
                          ))}
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12 }}>
                      {selected.map((item, i) => (
                        <div key={item.whisky.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: CHART_COLORS[i], display: "inline-block" }} />
                          <span style={{ color: CHART_COLORS[i] }}>{item.whisky.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      background: v.card,
                      border: `1px solid ${v.border}`,
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                    data-testid="radar-comparison-table"
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${v.border}` }}>
                          <th style={{ textAlign: "left", padding: "10px 14px", color: v.muted, fontWeight: 600 }}>{t("comparison.dimension")}</th>
                          {selected.map((item, i) => (
                            <th key={item.whisky.id} style={{ textAlign: "center", padding: "10px 8px", color: CHART_COLORS[i], fontWeight: 600, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.whisky.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {DIMENSION_KEYS.map((dim) => {
                          const vals = selected.map((s) => (s.rating as any)[dim.key] as number);
                          const maxVal = Math.max(...vals);
                          return (
                            <tr key={dim.key} style={{ borderBottom: `1px solid ${v.border}` }}>
                              <td style={{ padding: "8px 14px", color: v.text, fontWeight: 500 }}>{t(dim.labelKey, dim.fallback)}</td>
                              {selected.map((item, i) => {
                                const val = (item.rating as any)[dim.key] as number;
                                return (
                                  <td
                                    key={item.whisky.id}
                                    style={{
                                      textAlign: "center",
                                      padding: "8px",
                                      fontWeight: val === maxVal ? 700 : 400,
                                      color: val === maxVal ? v.accent : v.muted,
                                      fontVariantNumeric: "tabular-nums",
                                    }}
                                  >
                                    {val.toFixed(1)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {selected.length < 2 && (
                <div style={{ textAlign: "center", padding: "30px 0", color: v.muted }} data-testid="text-select-more">
                  <p style={{ fontSize: 14 }}>{t("comparison.selectMore")}</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
