import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch, useLocation } from "wouter";
import { useSession } from "@/lib/session";
import { flavorProfileApi } from "@/lib/api";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from "recharts";
import {
  ChevronLeft, GitCompareArrows, Search, Download, ChevronDown,
  Wine, ArrowUpDown, Filter, X, Info,
} from "lucide-react";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { useTranslation } from "react-i18next";

const CHART_COLORS = ["#d4a256", "#6aa8d4", "#d97c5a"];

interface RatedWhiskyItem {
  whisky: { id: string; name: string; distillery: string | null; region: string | null; imageUrl: string | null };
  rating: { overall: number; nose: number; taste: number; finish: number; notes: string | null };
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

type SortOption = "delta_desc" | "delta_asc" | "your_desc" | "platform_desc" | "name_az";
type DirectionFilter = "all" | "positive" | "negative";
type DatePeriod = "all" | "30d" | "3m" | "1y";

const DATE_PERIODS: { key: DatePeriod; label: string; days: number }[] = [
  { key: "all", label: "All time", days: 0 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "3m", label: "3 months", days: 90 },
  { key: "1y", label: "1 year", days: 365 },
];

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "delta_desc", label: "Highest delta" },
  { key: "delta_asc", label: "Lowest delta" },
  { key: "your_desc", label: "Your score (high)" },
  { key: "platform_desc", label: "Platform (high)" },
  { key: "name_az", label: "Name A–Z" },
];

const DIMS = [
  { key: "nose", label: "Nose" },
  { key: "taste", label: "Taste" },
  { key: "finish", label: "Finish" },
  { key: "overall", label: "Overall" },
];

function parseSearch(s: string) {
  const p = new URLSearchParams(s);
  return {
    q: p.get("q") || "",
    sort: (p.get("sort") as SortOption) || "delta_desc",
    minN: parseInt(p.get("minN") || "1", 10),
    direction: (p.get("direction") as DirectionFilter) || "all",
    period: (p.get("period") as DatePeriod) || "all",
    page: parseInt(p.get("page") || "1", 10),
    perPage: parseInt(p.get("perPage") || "25", 10),
  };
}

function buildSearch(params: Record<string, string | number>): string {
  const sp = new URLSearchParams();
  for (const [k, val] of Object.entries(params)) {
    if (val !== "" && val !== "all" && val !== 1 && !(k === "sort" && val === "delta_desc") && !(k === "perPage" && val === 25)) {
      sp.set(k, String(val));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

function ChipButton({ active, onClick, children, testId }: { active: boolean; onClick: () => void; children: React.ReactNode; testId: string }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      style={{
        padding: "5px 12px",
        borderRadius: 20,
        border: `1px solid ${active ? "var(--labs-accent)" : "var(--labs-border)"}`,
        background: active ? "color-mix(in srgb, var(--labs-accent) 15%, transparent)" : "transparent",
        color: active ? "var(--labs-accent)" : "var(--labs-text-muted)",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

export default function LabsTasteCompare() {
  const session = useSession();
  const pid = session.pid || "";
  const searchStr = useSearch();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [radarSearch, setRadarSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filters = parseSearch(searchStr);

  const setFilter = (key: string, value: string | number) => {
    const next = { ...filters, [key]: value };
    if (key !== "page") next.page = 1;
    navigate(`/labs/taste/compare${buildSearch(next)}`, { replace: true });
  };

  const { data, isLoading } = useQuery<{ ratedWhiskies: RatedWhiskyItem[]; whiskyComparison?: WhiskyComparisonItem[]; hasMultipleScales?: boolean }>({
    queryKey: ["flavor-profile-compare", pid],
    queryFn: () => flavorProfileApi.getWhiskyProfile(pid, "all", "platform"),
    enabled: !!pid,
  });

  const ratedWhiskies = data?.ratedWhiskies || [];
  const whiskyComparison = data?.whiskyComparison || [];

  const filteredComparison = useMemo(() => {
    let items = [...whiskyComparison];
    if (filters.q) {
      const q = filters.q.toLowerCase();
      items = items.filter(w => w.whiskyName.toLowerCase().includes(q) || (w.distillery || "").toLowerCase().includes(q));
    }
    if (filters.minN > 1) items = items.filter(w => w.platformN >= filters.minN);
    if (filters.direction === "positive") items = items.filter(w => w.delta > 0);
    else if (filters.direction === "negative") items = items.filter(w => w.delta < 0);
    if (filters.period !== "all") {
      const days = DATE_PERIODS.find(p => p.key === filters.period)?.days || 0;
      if (days > 0) {
        const cutoff = Date.now() - days * 86400000;
        items = items.filter(w => w.ratedAt && new Date(w.ratedAt).getTime() >= cutoff);
      }
    }
    switch (filters.sort) {
      case "delta_desc": items.sort((a, b) => b.delta - a.delta); break;
      case "delta_asc": items.sort((a, b) => a.delta - b.delta); break;
      case "your_desc": items.sort((a, b) => b.userScore - a.userScore); break;
      case "platform_desc": items.sort((a, b) => b.platformMedian - a.platformMedian); break;
      case "name_az": items.sort((a, b) => a.whiskyName.localeCompare(b.whiskyName)); break;
    }
    return items;
  }, [whiskyComparison, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredComparison.length / filters.perPage));
  const currentPage = Math.min(filters.page, totalPages);
  const paginatedItems = filteredComparison.slice((currentPage - 1) * filters.perPage, currentPage * filters.perPage);

  const toggleWhisky = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 3 ? prev : [...prev, id]);
  };

  const selected = selectedIds.map(id => ratedWhiskies.find(r => r.whisky.id === id)).filter(Boolean) as RatedWhiskyItem[];

  const filteredWhiskiesRadar = ratedWhiskies.filter(r =>
    r.whisky.name.toLowerCase().includes(radarSearch.toLowerCase()) ||
    (r.whisky.distillery || "").toLowerCase().includes(radarSearch.toLowerCase())
  );

  const radarData = DIMS.map(dim => {
    const entry: Record<string, string | number> = { dimension: dim.label };
    selected.forEach((item, i) => { entry[`whisky${i}`] = (item.rating as Record<string, number>)[dim.key]; });
    return entry;
  });

  const handleExportCsv = () => {
    if (filteredComparison.length === 0) return;
    const header = ["Whisky", "Distillery", "Your Score", "Platform Median", "Delta", "N"];
    const rows = filteredComparison.map(item => [
      `"${item.whiskyName}"`, `"${item.distillery || ""}"`,
      item.userScore.toFixed(1), item.platformMedian.toFixed(1),
      (item.delta >= 0 ? "+" : "") + item.delta.toFixed(1), String(item.platformN),
    ]);
    const csv = [header.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "whisky-comparison.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (!session.signedIn || !pid) {
    return (
      <AuthGateMessage
        icon={<GitCompareArrows className="w-12 h-12" style={{ color: "var(--labs-accent)" }} />}
        message="Sign in to compare your scores with the community"
      />
    );
  }

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-taste-compare">
      <Link href="/labs/taste" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-compare">
          <ChevronLeft className="w-4 h-4" /> Taste
        </button>
      </Link>

      <div className="flex items-center gap-3 mb-1 labs-fade-in">
        <GitCompareArrows className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
        <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="text-compare-title">
          Compare
        </h1>
      </div>
      <p className="text-sm mb-4 labs-fade-in" style={{ color: "var(--labs-text-muted)" }}>
        Your scores vs. the platform community
      </p>
      {data?.hasMultipleScales && (
        <p className="text-xs flex items-center gap-1 mb-6 labs-fade-in" style={{ color: "var(--labs-text-muted)", opacity: 0.7 }} data-testid="compare-normalized-hint">
          <Info className="w-3 h-3 flex-shrink-0" />
          {t("labs.scoresNormalizedMultiScale", "Contains ratings from different scales, normalized to 100 points")}
        </p>
      )}

      {isLoading ? (
        <div className="labs-card p-8 text-center"><div className="labs-spinner mx-auto" /></div>
      ) : whiskyComparison.length === 0 && ratedWhiskies.length === 0 ? (
        <div className="labs-empty labs-fade-in">
          <Wine className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)" }} />
          <p style={{ color: "var(--labs-text-secondary)", fontSize: 14 }}>Rate whiskies to start comparing your scores</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {whiskyComparison.length > 0 && (
            <>
              <div className="labs-card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid var(--labs-border)" }}>
                  <div style={{ flex: 1, position: "relative" }}>
                    <Search className="w-4 h-4" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--labs-text-muted)" }} />
                    <input
                      type="text"
                      placeholder="Search whiskies..."
                      value={filters.q}
                      onChange={e => setFilter("q", e.target.value)}
                      data-testid="input-compare-table-search"
                      style={{
                        width: "100%", padding: "8px 10px 8px 34px", fontSize: 13,
                        background: "var(--labs-bg)", border: "1px solid var(--labs-border)",
                        borderRadius: 8, color: "var(--labs-text)", outline: "none", fontFamily: "inherit",
                      }}
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="labs-btn-ghost"
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "6px 10px" }}
                    data-testid="button-toggle-filters"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    Filters
                    <ChevronDown className="w-3 h-3" style={{ transform: showFilters ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  </button>
                </div>

                {showFilters && (
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--labs-border)", display: "flex", flexDirection: "column", gap: 10, background: "var(--labs-bg)" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--labs-text-muted)", fontWeight: 600, width: 60 }}>Sort:</span>
                      <select
                        value={filters.sort}
                        onChange={e => setFilter("sort", e.target.value)}
                        data-testid="select-sort"
                        style={{
                          padding: "5px 8px", fontSize: 12, background: "var(--labs-surface)",
                          border: "1px solid var(--labs-border)", borderRadius: 6,
                          color: "var(--labs-text)", cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--labs-text-muted)", fontWeight: 600, width: 60 }}>Min N:</span>
                      {[1, 5, 10, 20].map(n => (
                        <ChipButton key={n} active={filters.minN === n} onClick={() => setFilter("minN", n)} testId={`chip-min-n-${n}`}>
                          {n === 1 ? "All" : `≥${n}`}
                        </ChipButton>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--labs-text-muted)", fontWeight: 600, width: 60 }}>Delta:</span>
                      {(["all", "positive", "negative"] as DirectionFilter[]).map(dir => (
                        <ChipButton key={dir} active={filters.direction === dir} onClick={() => setFilter("direction", dir)} testId={`chip-direction-${dir}`}>
                          {dir === "all" ? "All" : dir === "positive" ? "Above ↑" : "Below ↓"}
                        </ChipButton>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--labs-text-muted)", fontWeight: 600, width: 60 }}>Period:</span>
                      {DATE_PERIODS.map(p => (
                        <ChipButton key={p.key} active={filters.period === p.key} onClick={() => setFilter("period", p.key)} testId={`chip-period-${p.key}`}>
                          {p.label}
                        </ChipButton>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--labs-border)" }}>
                  <span style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>
                    {filteredComparison.length} {filteredComparison.length === 1 ? "whisky" : "whiskies"}
                  </span>
                  <button
                    onClick={handleExportCsv}
                    className="labs-btn-ghost"
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, padding: "4px 8px" }}
                    data-testid="button-export-csv"
                  >
                    <Download className="w-3 h-3" /> CSV
                  </button>
                </div>

                <div style={{ overflowX: "auto", maxHeight: 500 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ position: "sticky", top: 0, background: "var(--labs-surface-elevated)", zIndex: 1 }}>
                        {["Whisky", "You", "Platform", "Delta", "N"].map(h => (
                          <th key={h} style={{
                            textAlign: h === "Whisky" ? "left" : "right",
                            padding: "8px 10px",
                            color: "var(--labs-text-muted)",
                            fontWeight: 600,
                            borderBottom: "2px solid var(--labs-border)",
                            whiteSpace: "nowrap",
                            fontSize: 11,
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.map(item => (
                        <tr key={item.whiskyId} data-testid={`row-compare-${item.whiskyId}`} style={{ borderBottom: "1px solid var(--labs-border)" }}>
                          <td style={{ padding: "8px 10px", color: "var(--labs-text)", fontWeight: 500 }}>
                            <div style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.whiskyName}
                            </div>
                            {item.distillery && (
                              <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 1 }}>
                                {[item.distillery, item.region].filter(Boolean).join(" · ")}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums" }}>
                            {item.userScore.toFixed(1)}
                          </td>
                          <td style={{ textAlign: "right", padding: "8px 10px", color: "var(--labs-text-muted)", fontVariantNumeric: "tabular-nums" }}>
                            {item.platformMedian.toFixed(1)}
                          </td>
                          <td style={{
                            textAlign: "right", padding: "8px 10px", fontWeight: 600, fontVariantNumeric: "tabular-nums",
                            color: item.delta > 0 ? "var(--labs-success)" : item.delta < 0 ? "var(--labs-danger)" : "var(--labs-text-muted)",
                          }}>
                            {item.delta > 0 ? "+" : ""}{item.delta.toFixed(1)}
                          </td>
                          <td style={{ textAlign: "right", padding: "8px 10px", color: "var(--labs-text-muted)", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
                            {item.platformN}
                          </td>
                        </tr>
                      ))}
                      {paginatedItems.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", padding: "20px 10px", color: "var(--labs-text-muted)", fontSize: 13 }}>
                            No whiskies match your filters
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--labs-border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>Rows:</span>
                      {[25, 50, 100].map(n => (
                        <ChipButton key={n} active={filters.perPage === n} onClick={() => setFilter("perPage", n)} testId={`chip-per-page-${n}`}>
                          {n}
                        </ChipButton>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        onClick={() => setFilter("page", Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                        className="labs-btn-ghost"
                        style={{ padding: "4px 8px", fontSize: 12, opacity: currentPage <= 1 ? 0.3 : 1 }}
                        data-testid="button-prev-page"
                      >
                        ‹
                      </button>
                      <span style={{ fontSize: 11, color: "var(--labs-text-muted)", fontVariantNumeric: "tabular-nums" }}>
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setFilter("page", Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages}
                        className="labs-btn-ghost"
                        style={{ padding: "4px 8px", fontSize: 12, opacity: currentPage >= totalPages ? 0.3 : 1 }}
                        data-testid="button-next-page"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {ratedWhiskies.length > 0 && (
            <div className="labs-fade-in labs-stagger-2">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpDown className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                <h2 className="labs-h3" style={{ color: "var(--labs-text)" }} data-testid="text-radar-title">
                  Whisky Radar Overlay
                </h2>
              </div>
              <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>
                Select up to 3 whiskies to overlay their dimension scores
              </p>

              <div style={{ position: "relative", marginBottom: 10 }}>
                <Search className="w-4 h-4" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--labs-text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search your rated whiskies..."
                  value={radarSearch}
                  onChange={e => setRadarSearch(e.target.value)}
                  data-testid="input-radar-search"
                  style={{
                    width: "100%", padding: "8px 10px 8px 34px", fontSize: 13,
                    background: "var(--labs-surface)", border: "1px solid var(--labs-border)",
                    borderRadius: 8, color: "var(--labs-text)", outline: "none", fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {selected.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {selected.map((item, i) => (
                    <span
                      key={item.whisky.id}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                        border: `1px solid ${CHART_COLORS[i]}`, color: CHART_COLORS[i],
                      }}
                      data-testid={`chip-selected-${item.whisky.id}`}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: CHART_COLORS[i] }} />
                      <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.whisky.name}
                      </span>
                      <button
                        onClick={() => toggleWhisky(item.whisky.id)}
                        style={{ background: "none", border: "none", color: CHART_COLORS[i], cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }}
                        data-testid={`button-deselect-${item.whisky.id}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="labs-card" style={{ maxHeight: 180, overflowY: "auto", padding: 0 }}>
                {filteredWhiskiesRadar.map(item => {
                  const isSelected = selectedIds.includes(item.whisky.id);
                  const colorIdx = selectedIds.indexOf(item.whisky.id);
                  return (
                    <button
                      key={item.whisky.id}
                      onClick={() => toggleWhisky(item.whisky.id)}
                      disabled={!isSelected && selectedIds.length >= 3}
                      data-testid={`button-select-${item.whisky.id}`}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 14px", background: isSelected ? "color-mix(in srgb, var(--labs-accent) 8%, transparent)" : "transparent",
                        border: "none", borderBottom: "1px solid var(--labs-border)",
                        color: "var(--labs-text)", cursor: !isSelected && selectedIds.length >= 3 ? "not-allowed" : "pointer",
                        opacity: !isSelected && selectedIds.length >= 3 ? 0.35 : 1,
                        textAlign: "left", fontSize: 13, fontFamily: "inherit",
                      }}
                    >
                      {isSelected ? (
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: CHART_COLORS[colorIdx], flexShrink: 0 }} />
                      ) : (
                        <span style={{ width: 10, height: 10, borderRadius: "50%", border: "1px solid var(--labs-text-muted)", flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.whisky.name}
                        </div>
                        {item.whisky.distillery && (
                          <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
                            {[item.whisky.distillery, item.whisky.region].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: "var(--labs-text-muted)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                        {item.rating.overall.toFixed(1)}
                      </span>
                    </button>
                  );
                })}
                {filteredWhiskiesRadar.length === 0 && (
                  <div style={{ padding: 16, textAlign: "center", color: "var(--labs-text-muted)", fontSize: 12 }}>
                    No whiskies found
                  </div>
                )}
              </div>

              {selected.length >= 2 && (
                <>
                  <div className="labs-card p-5 mt-4" data-testid="radar-chart-container">
                    <div style={{ height: 280 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                          <PolarGrid stroke="var(--labs-border)" />
                          <PolarAngleAxis dataKey="dimension" tick={{ fill: "var(--labs-text-muted)", fontSize: 11 }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "var(--labs-text-muted)", fontSize: 11 }} />
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
                    <div className="flex flex-wrap justify-center gap-3 mt-3">
                      {selected.map((item, i) => (
                        <div key={item.whisky.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: CHART_COLORS[i] }} />
                          <span style={{ color: CHART_COLORS[i], maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.whisky.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="labs-card mt-2" style={{ overflow: "hidden", padding: 0 }} data-testid="radar-comparison-table">
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--labs-border)" }}>
                          <th style={{ textAlign: "left", padding: "8px 14px", color: "var(--labs-text-muted)", fontWeight: 600, fontSize: 11 }}>Dimension</th>
                          {selected.map((item, i) => (
                            <th key={item.whisky.id} style={{
                              textAlign: "center", padding: "8px 6px", color: CHART_COLORS[i], fontWeight: 600, fontSize: 11,
                              maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {item.whisky.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {DIMS.map(dim => {
                          const vals = selected.map(s => (s.rating as Record<string, number>)[dim.key]);
                          const maxVal = Math.max(...vals);
                          return (
                            <tr key={dim.key} style={{ borderBottom: "1px solid var(--labs-border)" }}>
                              <td style={{ padding: "6px 14px", color: "var(--labs-text)", fontWeight: 500 }}>{dim.label}</td>
                              {selected.map((item, i) => {
                                const val = (item.rating as Record<string, number>)[dim.key];
                                return (
                                  <td key={item.whisky.id} style={{
                                    textAlign: "center", padding: "6px", fontVariantNumeric: "tabular-nums",
                                    fontWeight: val === maxVal ? 700 : 400,
                                    color: val === maxVal ? "var(--labs-accent)" : "var(--labs-text-muted)",
                                  }}>
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

              {selected.length < 2 && ratedWhiskies.length > 0 && (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--labs-text-muted)", fontSize: 13 }} data-testid="text-select-more">
                  Select at least 2 whiskies to compare their radar profiles
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
