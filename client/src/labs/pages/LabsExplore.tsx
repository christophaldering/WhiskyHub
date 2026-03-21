import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Search, Star, ChevronRight, ChevronDown, ChevronLeft, Globe, Filter, X } from "lucide-react";
import { Link } from "wouter";
import WhiskyImage from "@/labs/components/WhiskyImage";
import { exploreApi } from "@/lib/api";
import { SkeletonList } from "@/labs/components/LabsSkeleton";
import ExploreStatistics from "@/labs/components/ExploreStatistics";

type SortOption = "alphabetical" | "alphabetical_desc" | "region" | "category" | "age" | "abv" | "highest_rated" | "most_rated";
type ExploreTab = "all";
type FilterDimension = "region" | "caskInfluence" | "peatLevel" | "ageBand" | "abvBand" | "category" | "country";

const BATCH_SIZE = 50;

const FILTER_DIMENSIONS: { key: FilterDimension; labelKey: string; fallback: string }[] = [
  { key: "region", labelKey: "explore.filterRegion", fallback: "Region" },
  { key: "country", labelKey: "explore.filterCountry", fallback: "Country" },
  { key: "category", labelKey: "explore.filterCategory", fallback: "Category" },
  { key: "caskInfluence", labelKey: "explore.filterCask", fallback: "Cask" },
  { key: "peatLevel", labelKey: "explore.filterPeat", fallback: "Peat Level" },
  { key: "ageBand", labelKey: "explore.filterAge", fallback: "Age Band" },
  { key: "abvBand", labelKey: "explore.filterAbv", fallback: "ABV Band" },
];

export default function LabsExplore() {
  const { t } = useTranslation();
  const [location, navigate] = useLocation();
  const getQueryParam = () => {
    try {
      return new URLSearchParams(window.location.search).get("q") || "";
    } catch { return ""; }
  };
  const initialQuery = getQueryParam();
  const [activeTab, setActiveTab] = useState<ExploreTab>("all");
  const [searchText, setSearchText] = useState(initialQuery);

  useEffect(() => {
    const q = getQueryParam();
    if (q && q !== searchText) {
      setSearchText(q);
      setActiveTab("all");
    }
  }, [location]);
  const [filters, setFilters] = useState<Record<FilterDimension, Set<string>>>({
    region: new Set(),
    caskInfluence: new Set(),
    peatLevel: new Set(),
    ageBand: new Set(),
    abvBand: new Set(),
    category: new Set(),
    country: new Set(),
  });
  const [expandedFilter, setExpandedFilter] = useState<FilterDimension | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("alphabetical");
  const [displayLimit, setDisplayLimit] = useState(BATCH_SIZE);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortBtnRef = useRef<HTMLButtonElement>(null);
  const listTopRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data: allWhiskies, isLoading: isLoadingAll } = useQuery({
    queryKey: ["labs-explore-whiskies", searchText],
    queryFn: () => exploreApi.getWhiskies(searchText || undefined),
    enabled: activeTab === "all",
  });

  const filterValues = useMemo(() => {
    if (!allWhiskies || !Array.isArray(allWhiskies)) return {} as Record<FilterDimension, string[]>;
    const result: Record<FilterDimension, Set<string>> = {
      region: new Set(),
      caskInfluence: new Set(),
      peatLevel: new Set(),
      ageBand: new Set(),
      abvBand: new Set(),
      category: new Set(),
      country: new Set(),
    };
    for (const w of allWhiskies) {
      if (w.region) result.region.add(w.region);
      if (w.caskInfluence) result.caskInfluence.add(w.caskInfluence);
      if (w.peatLevel) result.peatLevel.add(w.peatLevel);
      if (w.ageBand) result.ageBand.add(w.ageBand);
      if (w.abvBand) result.abvBand.add(w.abvBand);
      if (w.category) result.category.add(w.category);
      if (w.country) result.country.add(w.country);
    }
    const out: Record<FilterDimension, string[]> = {
      region: Array.from(result.region).sort(),
      caskInfluence: Array.from(result.caskInfluence).sort(),
      peatLevel: Array.from(result.peatLevel).sort(),
      ageBand: Array.from(result.ageBand).sort(),
      abvBand: Array.from(result.abvBand).sort(),
      category: Array.from(result.category).sort(),
      country: Array.from(result.country).sort(),
    };
    return out;
  }, [allWhiskies]);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).reduce((sum, set) => sum + set.size, 0);
  }, [filters]);

  const toggleFilter = useCallback((dim: FilterDimension, value: string) => {
    setFilters(prev => {
      const newSet = new Set(prev[dim]);
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      return { ...prev, [dim]: newSet };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      region: new Set(),
      caskInfluence: new Set(),
      peatLevel: new Set(),
      ageBand: new Set(),
      abvBand: new Set(),
      category: new Set(),
      country: new Set(),
    });
  }, []);

  const filteredWhiskies = useMemo(() => {
    if (!allWhiskies || !Array.isArray(allWhiskies)) return [];
    return allWhiskies.filter((w: any) => {
      if (filters.region.size > 0 && (!w.region || !filters.region.has(w.region))) return false;
      if (filters.caskInfluence.size > 0 && (!w.caskInfluence || !filters.caskInfluence.has(w.caskInfluence))) return false;
      if (filters.peatLevel.size > 0 && (!w.peatLevel || !filters.peatLevel.has(w.peatLevel))) return false;
      if (filters.ageBand.size > 0 && (!w.ageBand || !filters.ageBand.has(w.ageBand))) return false;
      if (filters.abvBand.size > 0 && (!w.abvBand || !filters.abvBand.has(w.abvBand))) return false;
      if (filters.category.size > 0 && (!w.category || !filters.category.has(w.category))) return false;
      if (filters.country.size > 0 && (!w.country || !filters.country.has(w.country))) return false;
      return true;
    });
  }, [allWhiskies, filters]);

  const collator = useMemo(() => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }), []);

  const sortedWhiskies = useMemo(() => {
    if (activeTab !== "all") return [];
    let list = [...filteredWhiskies];
    const parseNum = (v: string | null | undefined): number => {
      if (!v) return 0;
      const n = parseFloat(v.replace(/[^0-9.]/g, ""));
      return isNaN(n) ? 0 : n;
    };
    switch (sortBy) {
      case "alphabetical": list.sort((a: any, b: any) => collator.compare(a.name || "", b.name || "")); break;
      case "alphabetical_desc": list.sort((a: any, b: any) => collator.compare(b.name || "", a.name || "")); break;
      case "region": list.sort((a: any, b: any) => collator.compare(a.region || "zzz", b.region || "zzz") || collator.compare(a.name || "", b.name || "")); break;
      case "category": list.sort((a: any, b: any) => collator.compare(a.category || "zzz", b.category || "zzz") || collator.compare(a.name || "", b.name || "")); break;
      case "age": list.sort((a: any, b: any) => parseNum(b.age) - parseNum(a.age) || collator.compare(a.name || "", b.name || "")); break;
      case "abv": list.sort((a: any, b: any) => parseNum(b.abv) - parseNum(a.abv) || collator.compare(a.name || "", b.name || "")); break;
      case "highest_rated":
        list.sort((a: any, b: any) => {
          const aHas = a.avgOverall != null && a.avgOverall > 0 ? 1 : 0;
          const bHas = b.avgOverall != null && b.avgOverall > 0 ? 1 : 0;
          if (aHas !== bHas) return bHas - aHas;
          return (b.avgOverall || 0) - (a.avgOverall || 0) || collator.compare(a.name || "", b.name || "");
        });
        break;
      case "most_rated":
        list.sort((a: any, b: any) => {
          const aHas = a.ratingCount != null && a.ratingCount > 0 ? 1 : 0;
          const bHas = b.ratingCount != null && b.ratingCount > 0 ? 1 : 0;
          if (aHas !== bHas) return bHas - aHas;
          return (b.ratingCount || 0) - (a.ratingCount || 0) || collator.compare(a.name || "", b.name || "");
        });
        break;
    }
    return list;
  }, [filteredWhiskies, sortBy, activeTab, collator]);

  const visibleWhiskies = useMemo(() => sortedWhiskies.slice(0, displayLimit), [sortedWhiskies, displayLimit]);

  useEffect(() => {
    setDisplayLimit(BATCH_SIZE);
    if (listTopRef.current) {
      listTopRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [sortBy, searchText, filters]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setDisplayLimit(prev => {
            if (prev >= sortedWhiskies.length) return prev;
            return prev + BATCH_SIZE;
          });
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sortedWhiskies.length]);

  const handleSortChange = useCallback((opt: SortOption) => {
    setSortBy(opt);
    setShowSortMenu(false);
  }, []);

  const isLoading = isLoadingAll;

  const sortLabels: Record<SortOption, string> = {
    alphabetical: t("explore.sortAZ", "A\u2013Z"),
    alphabetical_desc: t("explore.sortZA", "Z\u2013A"),
    region: t("explore.sortRegion", "Region"),
    category: t("explore.sortCategory", "Category"),
    age: t("explore.sortAge", "Age"),
    abv: t("explore.sortAbv", "ABV"),
    highest_rated: t("explore.sortHighestRated", "Highest Rated"),
    most_rated: t("explore.sortMostRated", "Most Rated"),
  };

  const tabs: { key: ExploreTab; label: string; icon: any }[] = [
    { key: "all", label: t("myTastePage.database", "Database"), icon: Globe },
  ];

  const searchPlaceholder = t("explore.searchDatabase", "Search by name, distillery, region\u2026");

  return (
    <div className="labs-page-wide">
      <Link href="/labs/entdecken" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-explore">
          <ChevronLeft className="w-4 h-4" /> {t("discoverHub.title", "Discover")}
        </button>
      </Link>
      <div style={{ marginBottom: 20 }}>
        <h1
          className="labs-serif labs-fade-in"
          style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 2px" }}
          data-testid="labs-explore-title"
        >
          {t("myTastePage.database", "Database")}
        </h1>
        <p
          className="labs-fade-in labs-stagger-1"
          style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: 0 }}
        >
          {t("myTastePage.databaseDesc", "Browse all whiskies in the CaskSense database")}
        </p>
      </div>

      {tabs.length > 1 && (
        <div
          className="labs-fade-in"
          style={{
            display: "flex",
            gap: 0,
            marginBottom: 16,
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid var(--labs-border)",
            background: "var(--labs-surface)",
          }}
          data-testid="labs-explore-tabs"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSearchText(""); clearAllFilters(); }}
                data-testid={`labs-explore-tab-${tab.key}`}
                style={{
                  flex: 1,
                  padding: "10px 6px",
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  color: active ? "var(--labs-accent)" : "var(--labs-text-muted)",
                  background: active ? "var(--labs-accent-muted)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  transition: "all 0.2s",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                <Icon style={{ width: 14, height: 14 }} />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="relative labs-fade-in labs-stagger-1" style={{ marginBottom: 16 }}>
        <Search
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--labs-text-muted)", left: 14 }}
        />
        <input
          className="labs-input"
          style={{ paddingLeft: 40, fontSize: 15, height: 44 }}
          placeholder={searchPlaceholder}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          data-testid="labs-explore-search"
        />
      </div>

      {activeTab === "all" && (
        <div className="labs-fade-in labs-stagger-2" style={{ marginBottom: 16 }} data-testid="section-extended-filters">
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: expandedFilter ? 8 : 0,
            }}
          >
            {FILTER_DIMENSIONS.map(({ key, labelKey, fallback }) => {
              const values = filterValues[key] || [];
              if (values.length === 0) return null;
              const selected = filters[key];
              const isExpanded = expandedFilter === key;
              return (
                <button
                  key={key}
                  className={`labs-chip ${selected.size > 0 ? "labs-chip-active" : ""}`}
                  onClick={() => setExpandedFilter(isExpanded ? null : key)}
                  style={{ whiteSpace: "nowrap", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}
                  data-testid={`filter-chip-${key}`}
                >
                  <Filter style={{ width: 11, height: 11 }} />
                  {t(labelKey, fallback)}
                  {selected.size > 0 && (
                    <span style={{
                      background: "var(--labs-accent)",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      borderRadius: 10,
                      padding: "0 5px",
                      minWidth: 16,
                      textAlign: "center",
                      lineHeight: "16px",
                    }}>
                      {selected.size}
                    </span>
                  )}
                  <ChevronDown style={{ width: 10, height: 10, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }} />
                </button>
              );
            })}
            {activeFilterCount > 0 && (
              <button
                className="labs-chip"
                onClick={clearAllFilters}
                style={{ whiteSpace: "nowrap", flexShrink: 0, display: "flex", alignItems: "center", gap: 4, color: "var(--labs-text-muted)" }}
                data-testid="button-clear-filters"
              >
                <X style={{ width: 12, height: 12 }} />
                {t("explore.clearFilters", "Clear all")}
              </button>
            )}
          </div>

          {expandedFilter && (filterValues[expandedFilter] || []).length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                padding: "8px 0",
              }}
              data-testid={`filter-values-${expandedFilter}`}
            >
              {(filterValues[expandedFilter] || []).map((val) => {
                const isSelected = filters[expandedFilter].has(val);
                return (
                  <button
                    key={val}
                    className={`labs-chip ${isSelected ? "labs-chip-active" : ""}`}
                    onClick={() => toggleFilter(expandedFilter, val)}
                    style={{ whiteSpace: "nowrap", flexShrink: 0, fontSize: 12 }}
                    data-testid={`filter-value-${expandedFilter}-${val}`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "all" && !isLoading && filteredWhiskies.length > 0 && (
        <ExploreStatistics whiskies={filteredWhiskies} />
      )}

      {activeTab === "all" && (
        <div ref={listTopRef} className="flex items-center justify-between mb-4 labs-fade-in labs-stagger-2">
          <p className="text-xs font-medium" style={{ color: "var(--labs-text-muted)", margin: 0 }} data-testid="labs-explore-count">
            {t("explore.whiskyCount", { count: sortedWhiskies.length })}
          </p>
          <div style={{ position: "relative" }}>
            <button
              ref={sortBtnRef}
              onClick={() => setShowSortMenu(!showSortMenu)}
              data-testid="labs-explore-sort-toggle"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--labs-accent)",
                background: "var(--labs-accent-muted)",
                border: "1px solid var(--labs-accent)",
                borderRadius: 20,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {sortLabels[sortBy]}
              <ChevronDown style={{ width: 14, height: 14, transition: "transform 0.2s", transform: showSortMenu ? "rotate(180deg)" : "rotate(0)" }} />
            </button>
            {showSortMenu && (
              <>
                <div className="fixed inset-0" style={{ zIndex: "var(--z-overlay)" }} onClick={() => setShowSortMenu(false)} data-testid="labs-explore-sort-overlay" />
                <div
                  style={{
                    position: "fixed",
                    right: 20,
                    top: (() => {
                      const r = sortBtnRef.current?.getBoundingClientRect();
                      return r ? r.bottom + 6 : 100;
                    })(),
                    zIndex: "var(--z-toast)",
                    background: "var(--labs-surface-elevated)",
                    border: "1px solid var(--labs-border)",
                    borderRadius: 12,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
                    maxHeight: "60vh",
                    overflowY: "auto",
                    padding: "6px 0",
                    minWidth: 180,
                  }}
                >
                  {(["alphabetical", "alphabetical_desc", "highest_rated", "most_rated", "region", "category", "age", "abv"] as SortOption[]).map((opt) => {
                    const active = sortBy === opt;
                    return (
                      <button
                        key={opt}
                        className="w-full text-left transition-colors"
                        style={{
                          padding: "10px 16px",
                          fontSize: 14,
                          fontWeight: active ? 600 : 400,
                          color: active ? "var(--labs-accent)" : "var(--labs-text)",
                          background: active ? "var(--labs-accent-muted)" : "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                        onClick={() => handleSortChange(opt)}
                        data-testid={`labs-explore-sort-${opt}`}
                      >
                        <span>{sortLabels[opt]}</span>
                        {active && (
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--labs-accent)" }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isLoading && <SkeletonList count={5} showAvatar />}

      {activeTab === "all" && !isLoading && (
        <>
          {sortedWhiskies.length === 0 && (
            <div className="labs-empty labs-fade-in" style={{ minHeight: "40vh" }} data-testid="labs-explore-empty">
              <svg className="labs-empty-icon" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="0.5" opacity="0.15"/>
                <circle cx="20" cy="20" r="8" stroke="currentColor" strokeWidth="0.4" opacity="0.12"/>
                <circle cx="20" cy="20" r="2" fill="currentColor" opacity="0.2"/>
              </svg>
              <h2 className="labs-empty-title">
                {searchText || activeFilterCount > 0
                  ? t("explore.noMatchingWhiskies", "Keine Ergebnisse")
                  : t("explore.noWhiskiesYet", "Noch keine Whiskies")}
              </h2>
              <p className="labs-empty-sub">
                {searchText || activeFilterCount > 0
                  ? t("explore.adjustFilters", "Passe deine Suche oder Filter an.")
                  : t("explore.whiskiesWillAppear", "Whiskies erscheinen hier, sobald sie einer Session hinzugefügt werden.")}
              </p>
            </div>
          )}
          {sortedWhiskies.length > 0 && (
            <>
              <div className="labs-grouped-list labs-fade-in labs-stagger-3">
                {visibleWhiskies.map((w: any) => (
                  <div
                    key={w.id}
                    className="labs-list-row"
                    onClick={() => navigate(`/labs/explore/bottles/${w.id}`)}
                    data-testid={`labs-explore-whisky-${w.id}`}
                  >
                    <div style={{ flexShrink: 0 }}>
                      <WhiskyImage imageUrl={w.imageUrl} name={w.name || ""} size={44} testId={`labs-explore-whisky-img-${w.id}`} whiskyId={w.id} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {w.name}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                        {w.distillery && <span style={{ fontSize: 13, color: "var(--labs-text-secondary)" }}>{w.distillery}</span>}
                        {w.region && (
                          <span style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)", fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 4 }}>
                            {w.region}
                          </span>
                        )}
                        {(sortBy === "category" && w.category) && (
                          <span style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text-muted)", fontSize: 11, fontWeight: 500, padding: "1px 6px", borderRadius: 4 }}>
                            {w.category}
                          </span>
                        )}
                        {(sortBy === "age" && w.age) && (
                          <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{/\d$/.test(w.age) ? `${w.age}y` : w.age}</span>
                        )}
                        {(sortBy === "abv" && w.abv) && (
                          <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{/\d$/.test(w.abv) ? `${w.abv}%` : w.abv}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                      {w.avgOverall != null && w.avgOverall > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Star style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-accent)" }}>{Number(w.avgOverall).toFixed(1)}</span>
                        </div>
                      )}
                      {w.ratingCount != null && w.ratingCount > 0 && (
                        <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
                          {w.ratingCount} {w.ratingCount === 1 ? t("explore.rating", "rating") : t("explore.ratings", "ratings")}
                        </span>
                      )}
                    </div>
                    <ChevronRight style={{ width: 16, height: 16, flexShrink: 0, color: "var(--labs-text-muted)", opacity: 0.75 }} />
                  </div>
                ))}
              </div>
              {displayLimit < sortedWhiskies.length && (
                <div ref={sentinelRef} style={{ height: 1 }} />
              )}
              {displayLimit < sortedWhiskies.length && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "16px 0 8px" }}>
                  <div className="labs-skeleton" style={{ height: 44, width: "100%", borderRadius: "var(--labs-radius-sm)" }} />
                  <div className="labs-skeleton" style={{ height: 44, width: "100%", borderRadius: "var(--labs-radius-sm)" }} />
                </div>
              )}
            </>
          )}
        </>
      )}

    </div>
  );
}