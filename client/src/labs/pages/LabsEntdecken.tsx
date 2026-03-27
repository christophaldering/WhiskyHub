import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/session";
import { pidHeaders } from "@/lib/api";
import CommunityInsights from "@/labs/components/CommunityInsights";
import {
  Search, ChevronRight, ChevronLeft, Wine, Lock, Calendar,
  BookOpen, Building2, Package, FileText, Map,
  BookMarked, MessageSquare, Sparkles,
  Info, Heart, Flame, Globe, History, Archive,
  X, ChevronDown, Check, ArrowUp, ArrowDown,
} from "lucide-react";
import BackLink from "@/labs/components/BackLink";

type DiscoveryTab = "whiskys" | "tastings" | "insights";
type EntdeckenFilterDimension = "region" | "distillery" | "category" | "country" | "peatLevel";

const ENTDECKEN_FILTER_DIMENSIONS: { key: EntdeckenFilterDimension; labelKey: string; fallback: string }[] = [
  { key: "region", labelKey: "explore.filterRegion", fallback: "Region" },
  { key: "distillery", labelKey: "discover.filterDistillery", fallback: "Distillery" },
  { key: "category", labelKey: "explore.filterCategory", fallback: "Category" },
  { key: "country", labelKey: "explore.filterCountry", fallback: "Country" },
  { key: "peatLevel", labelKey: "explore.filterPeat", fallback: "Peat Level" },
];

export default function LabsEntdecken() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { currentParticipant } = useSession();
  const pid = currentParticipant?.id;
  const lang = i18n.language;

  const [activeTab, setActiveTab] = useState<DiscoveryTab>("whiskys");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("avg");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [filterSearch, setFilterSearch] = useState("");
  const [filters, setFilters] = useState<Record<EntdeckenFilterDimension, Set<string>>>({
    region: new Set(),
    distillery: new Set(),
    category: new Set(),
    country: new Set(),
    peatLevel: new Set(),
  });
  const [expandedFilter, setExpandedFilter] = useState<EntdeckenFilterDimension | null>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const filterPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inChips = filterDropdownRef.current?.contains(target);
      const inPanel = filterPanelRef.current?.contains(target);
      if (!inChips && !inPanel) {
        setExpandedFilter(null);
        setFilterSearch("");
      }
    };
    if (expandedFilter) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [expandedFilter]);

  const knowledgeItems = [
    { icon: BookOpen, key: "lexicon", path: "/labs/discover/lexicon" },
    { icon: Building2, key: "distilleries", path: "/labs/discover/distilleries" },
    { icon: Package, key: "bottlers", path: "/labs/discover/bottlers" },
    { icon: MessageSquare, key: "vocabulary", path: "/labs/discover/flavour-map" },
  ];

  const tastingGuideItems = [
    { icon: Map, key: "guide", path: "/labs/discover/guide" },
    { icon: FileText, key: "templates", path: "/labs/discover/templates" },
    { icon: Sparkles, key: "aiCuration", path: "/labs/taste/ai-curation" },
  ];

  const deepDiveItems = [
    { icon: BookMarked, key: "rabbitHole", path: "/labs/discover/rabbit-hole" },
    { icon: Archive, key: "archive", path: "/labs/history" },
  ];

  const moreItems = [
    { icon: Info, key: "about", path: "/labs/about" },
    { icon: Heart, key: "donate", path: "/labs/donate" },
  ];

  const { data: whiskiesRaw = [] } = useQuery({
    queryKey: ["discovery-whiskies", search, sort, pid],
    queryFn: async () => {
      const res = await fetch(`/api/labs/explore/whiskies?search=${search}&sort=${sort}`, { headers: { ...pidHeaders(), ...(pid ? { "x-participant-id": pid } : {}) } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === "whiskys",
  });

  const filterValues = useMemo(() => {
    if (!Array.isArray(whiskiesRaw) || whiskiesRaw.length === 0) return {} as Record<EntdeckenFilterDimension, string[]>;
    const result: Record<EntdeckenFilterDimension, Set<string>> = {
      region: new Set(), distillery: new Set(), category: new Set(), country: new Set(), peatLevel: new Set(),
    };
    for (const w of whiskiesRaw) {
      if (w.region) result.region.add(w.region);
      if (w.distillery) result.distillery.add(w.distillery);
      if (w.category) result.category.add(w.category);
      if (w.country) result.country.add(w.country);
      if (w.peatLevel) result.peatLevel.add(w.peatLevel);
    }
    return {
      region: Array.from(result.region).sort(),
      distillery: Array.from(result.distillery).sort(),
      category: Array.from(result.category).sort(),
      country: Array.from(result.country).sort(),
      peatLevel: Array.from(result.peatLevel).sort(),
    };
  }, [whiskiesRaw]);

  const filterValueCounts = useMemo(() => {
    if (!Array.isArray(whiskiesRaw) || whiskiesRaw.length === 0) return {} as Record<EntdeckenFilterDimension, Record<string, number>>;
    const result: Record<string, Record<string, number>> = {};
    const dims: EntdeckenFilterDimension[] = ["region", "distillery", "category", "country", "peatLevel"];
    for (const dim of dims) {
      result[dim] = {};
      const otherFiltersMatch = (w: any) => {
        for (const d of dims) {
          if (d === dim) continue;
          if (filters[d].size > 0 && (!w[d] || !filters[d].has(w[d]))) return false;
        }
        return true;
      };
      for (const w of whiskiesRaw) {
        if (!w[dim]) continue;
        if (otherFiltersMatch(w)) {
          result[dim][w[dim]] = (result[dim][w[dim]] || 0) + 1;
        }
      }
    }
    return result as Record<EntdeckenFilterDimension, Record<string, number>>;
  }, [whiskiesRaw, filters]);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).reduce((sum, set) => sum + set.size, 0);
  }, [filters]);

  const toggleFilter = useCallback((dim: EntdeckenFilterDimension, value: string) => {
    setFilters(prev => {
      const newSet = new Set(prev[dim]);
      if (newSet.has(value)) newSet.delete(value);
      else newSet.add(value);
      return { ...prev, [dim]: newSet };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      region: new Set(), distillery: new Set(), category: new Set(), country: new Set(), peatLevel: new Set(),
    });
    setExpandedFilter(null);
  }, []);

  const clearDimensionFilter = useCallback((dim: EntdeckenFilterDimension) => {
    setFilters(prev => ({ ...prev, [dim]: new Set() }));
  }, []);

  const removeSingleFilter = useCallback((dim: EntdeckenFilterDimension, value: string) => {
    setFilters(prev => {
      const newSet = new Set(prev[dim]);
      newSet.delete(value);
      return { ...prev, [dim]: newSet };
    });
  }, []);

  const allActiveFilters = useMemo(() => {
    const result: { dim: EntdeckenFilterDimension; value: string; label: string }[] = [];
    for (const dimDef of ENTDECKEN_FILTER_DIMENSIONS) {
      for (const val of filters[dimDef.key]) {
        result.push({ dim: dimDef.key, value: val, label: val });
      }
    }
    return result;
  }, [filters]);

  const prevWhiskyCountRef = useRef<number | null>(null);
  const [countAnimating, setCountAnimating] = useState(false);

  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number>(0);
  const handleSheetTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const isScrollable = target.closest('[style*="overflow"]') || target.closest('.filter-dropdown-panel > div:last-child');
    if (isScrollable) {
      const scrollEl = isScrollable as HTMLElement;
      if (scrollEl.scrollTop > 0) return;
    }
    dragStartY.current = e.touches[0].clientY;
  }, []);
  const handleSheetTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    dragCurrentY.current = dy;
    if (dy > 0 && filterPanelRef.current) {
      filterPanelRef.current.style.transform = `translateY(${dy}px)`;
      filterPanelRef.current.style.transition = 'none';
    }
  }, []);
  const handleSheetTouchEnd = useCallback(() => {
    if (dragStartY.current === null) return;
    const dy = dragCurrentY.current;
    if (filterPanelRef.current) {
      filterPanelRef.current.style.transition = 'transform 200ms ease';
      if (dy > 100) {
        filterPanelRef.current.style.transform = 'translateY(100%)';
        setTimeout(() => {
          setExpandedFilter(null);
          setFilterSearch("");
          if (filterPanelRef.current) {
            filterPanelRef.current.style.transform = '';
            filterPanelRef.current.style.transition = '';
          }
        }, 200);
      } else {
        filterPanelRef.current.style.transform = 'translateY(0)';
        setTimeout(() => {
          if (filterPanelRef.current) {
            filterPanelRef.current.style.transform = '';
            filterPanelRef.current.style.transition = '';
          }
        }, 200);
      }
    }
    dragStartY.current = null;
    dragCurrentY.current = 0;
  }, []);

  const chipsScrollRef = useRef<HTMLDivElement>(null);
  const [chipsCanScroll, setChipsCanScroll] = useState(false);
  useEffect(() => {
    const el = chipsScrollRef.current;
    if (!el) return;
    const checkScroll = () => setChipsCanScroll(el.scrollWidth > el.clientWidth + 10);
    checkScroll();
    const obs = new ResizeObserver(checkScroll);
    obs.observe(el);
    return () => obs.disconnect();
  }, [filterValues]);

  const whiskies = useMemo(() => {
    if (!Array.isArray(whiskiesRaw)) return [];
    let result = [...whiskiesRaw];
    if (activeFilterCount > 0) {
      result = result.filter((w: any) => {
        if (filters.region.size > 0 && (!w.region || !filters.region.has(w.region))) return false;
        if (filters.distillery.size > 0 && (!w.distillery || !filters.distillery.has(w.distillery))) return false;
        if (filters.category.size > 0 && (!w.category || !filters.category.has(w.category))) return false;
        if (filters.country.size > 0 && (!w.country || !filters.country.has(w.country))) return false;
        if (filters.peatLevel.size > 0 && (!w.peatLevel || !filters.peatLevel.has(w.peatLevel))) return false;
        return true;
      });
    }
    const dir = sortDirection === "asc" ? 1 : -1;
    result.sort((a: any, b: any) => {
      if (sort === "avg") {
        return dir * ((b.avgScore ?? b.avgOverall ?? 0) - (a.avgScore ?? a.avgOverall ?? 0));
      } else if (sort === "most") {
        return dir * ((b.tastingCount ?? b.ratingCount ?? 0) - (a.tastingCount ?? a.ratingCount ?? 0));
      } else {
        const nameA = (a.name || a.whiskeyName || "").toLowerCase();
        const nameB = (b.name || b.whiskeyName || "").toLowerCase();
        return dir * nameA.localeCompare(nameB);
      }
    });
    return result;
  }, [whiskiesRaw, filters, activeFilterCount, sort, sortDirection]);

  useEffect(() => {
    if (prevWhiskyCountRef.current !== null && prevWhiskyCountRef.current !== whiskies.length) {
      setCountAnimating(true);
      const timer = setTimeout(() => setCountAnimating(false), 300);
      prevWhiskyCountRef.current = whiskies.length;
      return () => clearTimeout(timer);
    }
    prevWhiskyCountRef.current = whiskies.length;
  }, [whiskies.length]);

  const { data: tastingsData, isLoading: tastingsLoading } = useQuery({
    queryKey: ["discovery-tastings", pid],
    queryFn: async () => {
      const headers = { ...pidHeaders(), ...(pid ? { "x-participant-id": pid } : {}) };
      const [ownRes, histRes, insRes, unifiedRes] = await Promise.all([
        fetch("/api/tastings", { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch("/api/historical/tastings", { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/historical/public-insights", { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/historical/tastings?includeOwn=true&limit=200", { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      const ownTastings = unifiedRes?.ownTastings || ownRes || [];
      const archiveTastings = histRes?.tastings || [];
      const isMember = archiveTastings.length > 0 || ownTastings.length > 0;
      return { ownTastings, archiveTastings, insights: insRes, isMember };
    },
    enabled: activeTab === "tastings" || activeTab === "insights",
  });

  const ownTastings = tastingsData?.ownTastings || [];
  const archiveTastings = tastingsData?.archiveTastings || [];
  const insightsObj = tastingsData?.insights;
  const isMember = tastingsData?.isMember ?? false;

  const allTastings = [
    ...ownTastings.map((t2: any) => ({ ...t2, _source: "own" as const })),
    ...archiveTastings.map((t2: any) => ({ ...t2, _source: "archive" as const })),
  ];
  const filteredTastings = allTastings
    .filter((t2: any) => {
      if (!search) return true;
      const name = (t2.name || t2.title || "").toLowerCase();
      return name.includes(search.toLowerCase());
    })
    .sort((a: any, b: any) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());

  const regions = insightsObj?.regionBreakdown ? Object.keys(insightsObj.regionBreakdown) : [];
  const totalTastings = insightsObj?.totalTastings || archiveTastings.length;
  const totalWhiskies = insightsObj?.totalWhiskies || 0;
  const regionCount = regions.length;
  const smokyPct = insightsObj && insightsObj.totalWhiskies > 0
    ? Math.round(((insightsObj.smokyBreakdown?.smoky || 0) / insightsObj.totalWhiskies) * 100)
    : 0;

  const tabs: { id: DiscoveryTab; label: string }[] = [
    { id: "whiskys", label: t("discover.tabWhiskies", "Whiskies") },
    { id: "tastings", label: t("discover.tabTastings", "Tastings") },
    { id: "insights", label: t("discover.tabInsights", "Insights") },
  ];

  return (
    <div className="labs-page" data-testid="labs-entdecken-page">
      <BackLink href="/labs/tastings" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-entdecken">
          <ChevronLeft className="w-4 h-4" /> {t("ui.home")}
        </button>
      </BackLink>
      <h1 className="labs-serif labs-fade-in" style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 2px" }}>
        {t("discoverHub.title", "Entdecken")}
      </h1>
      <p className="labs-fade-in labs-stagger-1" style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: "0 0 24px", opacity: 0.6 }}>
        {t("discoverHub.subtitle", "Explore the whisky world")}
      </p>

      <CommunityInsights />

      <div className="labs-fade-in labs-stagger-1" style={{ marginBottom: 32 }}>
        <p className="labs-section-label flex items-center gap-2" style={{ marginBottom: 10 }}>
          <Wine className="w-3.5 h-3.5" />
          {t("discover.sectionWhiskysTastings", "Whiskies & Tastings")}
        </p>

        <div style={{ position: "sticky", top: 52, zIndex: 5, background: "var(--labs-bg)", paddingBottom: 8, marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 0, background: "var(--labs-surface)", borderRadius: 12, border: "1px solid var(--labs-border)", overflow: "hidden" }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearch(""); }}
                data-testid={`tab-discovery-${tab.id}`}
                style={{
                  flex: 1,
                  height: 44,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  fontFamily: "inherit",
                  background: activeTab === tab.id ? "var(--labs-accent)" : "transparent",
                  color: activeTab === tab.id ? "var(--labs-on-accent)" : "var(--labs-text-muted)",
                  transition: "all 150ms",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "whiskys" && (
          <div>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <Search className="w-4 h-4" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--labs-text-muted)", opacity: 0.5 }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t("discover.searchWhiskies", "Search whiskies...")}
                data-testid="input-discovery-whisky-search"
                style={{
                  width: "100%",
                  minHeight: 44,
                  borderRadius: 12,
                  border: "1px solid var(--labs-border)",
                  background: "var(--labs-surface)",
                  color: "var(--labs-text)",
                  fontSize: 15,
                  padding: "10px 14px 10px 36px",
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--labs-text-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {t("discover.sortLabel", "Sortieren")}
              </div>
              <div
                data-testid="sort-segmented-control"
                style={{
                  display: "flex",
                  background: "var(--labs-surface)",
                  borderRadius: 10,
                  border: "1px solid var(--labs-border)",
                  overflow: "hidden",
                  padding: 2,
                }}
              >
                {[
                  ["avg", t("discover.sortAvg", "Avg Score")],
                  ["most", t("discover.sortMost", "Most Tastings")],
                  ["alpha", t("discover.sortAlpha", "A-Z")],
                ].map(([id, label]) => {
                  const isActive = sort === id;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        if (sort === id) {
                          setSortDirection(prev => prev === "desc" ? "asc" : "desc");
                        } else {
                          setSort(id as string);
                          setSortDirection(id === "alpha" ? "asc" : "desc");
                        }
                      }}
                      data-testid={`sort-${id}`}
                      style={{
                        flex: 1,
                        minHeight: 44,
                        border: "none",
                        cursor: "pointer",
                        borderRadius: 8,
                        background: isActive ? "var(--labs-accent)" : "transparent",
                        color: isActive ? "var(--labs-on-accent)" : "var(--labs-text-muted)",
                        fontSize: 12,
                        fontWeight: isActive ? 700 : 400,
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 3,
                        transition: "all 150ms",
                      }}
                    >
                      {label}
                      {isActive && (
                        sortDirection === "desc"
                          ? <ArrowDown className="w-3 h-3" />
                          : <ArrowUp className="w-3 h-3" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--labs-border)", paddingTop: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--labs-text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {t("discover.filterLabel", "Filter")}
              </div>
            </div>

            <div ref={filterDropdownRef} style={{ position: "relative", marginBottom: 10 }}>
              <div ref={chipsScrollRef} className={`filter-chips-scroll${!chipsCanScroll ? " no-fade" : ""}`}>
                {ENTDECKEN_FILTER_DIMENSIONS.map(dim => {
                  const dimValues = filterValues[dim.key] || [];
                  if (dimValues.length === 0) return null;
                  const isActive = filters[dim.key].size > 0;
                  const isExpanded = expandedFilter === dim.key;
                  const selectedValues = Array.from(filters[dim.key]);
                  return (
                    <button
                      key={dim.key}
                      onClick={() => {
                        setExpandedFilter(isExpanded ? null : dim.key);
                        setFilterSearch("");
                      }}
                      data-testid={`filter-chip-${dim.key}`}
                      style={{
                        minHeight: 44,
                        padding: "0 16px",
                        borderRadius: 22,
                        border: isActive ? "1.5px solid var(--labs-accent)" : "1px solid var(--labs-border)",
                        cursor: "pointer",
                        background: isActive ? "var(--labs-accent)" : "var(--labs-surface)",
                        color: isActive ? "var(--labs-on-accent)" : "var(--labs-text)",
                        fontSize: 14,
                        fontWeight: isActive ? 600 : 500,
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        transition: "all 150ms",
                      }}
                    >
                      {isActive && selectedValues.length <= 2
                        ? selectedValues.join(", ")
                        : t(dim.labelKey, dim.fallback)}
                      {isActive && selectedValues.length > 2 && (
                        <span style={{ fontSize: 11, opacity: 0.9, fontWeight: 700, background: "rgba(255,255,255,0.25)", borderRadius: 10, padding: "2px 7px" }}>
                          {selectedValues.length}
                        </span>
                      )}
                      <ChevronDown className="w-3.5 h-3.5" style={{ opacity: 0.6, transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
                    </button>
                  );
                })}
              </div>

              {allActiveFilters.length > 0 && (
                <div className="filter-active-tags" data-testid="filter-active-tags">
                  {allActiveFilters.map(af => (
                    <button
                      key={`${af.dim}-${af.value}`}
                      className="filter-active-tag"
                      onClick={() => removeSingleFilter(af.dim, af.value)}
                      data-testid={`filter-tag-${af.dim}-${af.value}`}
                    >
                      {af.label}
                      <X className="w-3 h-3" style={{ opacity: 0.7 }} />
                    </button>
                  ))}
                  {activeFilterCount > 1 && (
                    <button
                      className="filter-active-tag"
                      onClick={clearAllFilters}
                      data-testid="filter-reset-all"
                      style={{ background: "transparent", border: "1px solid var(--labs-border)", color: "var(--labs-text-muted)" }}
                    >
                      {t("discover.resetFilters", "Reset All")}
                      <X className="w-3 h-3" style={{ opacity: 0.7 }} />
                    </button>
                  )}
                </div>
              )}

              {expandedFilter && (filterValues[expandedFilter] || []).length > 0 && (() => {
                const dimOptions = filterValues[expandedFilter] || [];
                const filteredOptions = filterSearch
                  ? dimOptions.filter(v => v.toLowerCase().includes(filterSearch.toLowerCase()))
                  : dimOptions;
                const counts = filterValueCounts[expandedFilter] || {};
                const dimLabel = ENTDECKEN_FILTER_DIMENSIONS.find(d => d.key === expandedFilter);
                const dimSelectedCount = filters[expandedFilter].size;
                const useAlphaGroups = (expandedFilter === "distillery" || expandedFilter === "region") && dimOptions.length > 15;
                const groupedOptions = useAlphaGroups
                  ? filteredOptions.reduce<Record<string, string[]>>((acc, val) => {
                      const letter = val.charAt(0).toUpperCase();
                      if (!acc[letter]) acc[letter] = [];
                      acc[letter].push(val);
                      return acc;
                    }, {})
                  : null;
                const sortedLetters = groupedOptions ? Object.keys(groupedOptions).sort() : [];

                const renderOption = (val: string) => {
                  const isSelected = filters[expandedFilter!].has(val);
                  const count = counts[val] || 0;
                  return (
                    <button
                      key={val}
                      onClick={() => toggleFilter(expandedFilter!, val)}
                      data-testid={`filter-option-${expandedFilter}-${val}`}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 14px",
                        border: "none",
                        cursor: "pointer",
                        background: isSelected ? "rgba(var(--labs-accent-rgb, 139,90,43), 0.08)" : "transparent",
                        color: isSelected ? "var(--labs-accent)" : "var(--labs-text)",
                        fontSize: 14,
                        fontFamily: "inherit",
                        textAlign: "left",
                        minHeight: 44,
                        transition: "background 100ms",
                      }}
                    >
                      <span style={{
                        width: 20, height: 20, borderRadius: 4,
                        border: isSelected ? "none" : "1.5px solid var(--labs-border)",
                        background: isSelected ? "var(--labs-accent)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        {isSelected && <Check className="w-3 h-3" style={{ color: "var(--labs-on-accent)" }} />}
                      </span>
                      <span style={{ flex: 1 }}>{val}</span>
                      <span style={{ fontSize: 12, color: "var(--labs-text-muted)", opacity: 0.6 }}>({count})</span>
                    </button>
                  );
                };

                const panelContent = (
                  <>
                    <div className="filter-bottom-sheet-overlay" onClick={() => { setExpandedFilter(null); setFilterSearch(""); }} />
                    <div
                      ref={filterPanelRef}
                      data-testid={`filter-dropdown-${expandedFilter}`}
                      className="filter-dropdown-panel"
                      onTouchStart={handleSheetTouchStart}
                      onTouchMove={handleSheetTouchMove}
                      onTouchEnd={handleSheetTouchEnd}
                    >
                      <div className="filter-dropdown-header">
                        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text)" }}>
                          {dimLabel ? t(dimLabel.labelKey, dimLabel.fallback) : expandedFilter}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {dimSelectedCount > 0 && (
                            <button
                              onClick={() => clearDimensionFilter(expandedFilter)}
                              data-testid={`filter-reset-${expandedFilter}`}
                              style={{
                                border: "none", background: "transparent", cursor: "pointer",
                                color: "var(--labs-accent)", fontSize: 13, fontWeight: 500, fontFamily: "inherit",
                                padding: "4px 8px", borderRadius: 6,
                              }}
                            >
                              {t("discover.resetDimension", "Reset")}
                            </button>
                          )}
                          <button
                            onClick={() => { setExpandedFilter(null); setFilterSearch(""); }}
                            data-testid={`filter-done-${expandedFilter}`}
                            style={{
                              border: "none", cursor: "pointer",
                              background: "var(--labs-accent)", color: "var(--labs-on-accent)",
                              fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                              padding: "6px 14px", borderRadius: 8, minHeight: 36,
                            }}
                          >
                            {t("discover.filterDone", "Done")}
                          </button>
                        </div>
                      </div>

                      <div style={{ padding: "8px 12px 4px", position: "sticky", top: 52, background: "var(--labs-surface)", zIndex: 2 }}>
                        <div style={{ position: "relative" }}>
                          <Search className="w-3.5 h-3.5" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--labs-text-muted)", opacity: 0.5 }} />
                          <input
                            value={filterSearch}
                            onChange={e => setFilterSearch(e.target.value)}
                            placeholder={t("discover.filterSearchPlaceholder", "Search...")}
                            data-testid={`filter-search-${expandedFilter}`}
                            autoFocus={typeof window !== "undefined" && window.innerWidth > 768}
                            style={{
                              width: "100%",
                              height: 38,
                              borderRadius: 10,
                              border: "1px solid var(--labs-border)",
                              background: "var(--labs-bg)",
                              color: "var(--labs-text)",
                              fontSize: 14,
                              padding: "0 12px 0 32px",
                              outline: "none",
                              fontFamily: "inherit",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ overflowY: "auto", maxHeight: "calc(70vh - 120px)" }}>
                        {useAlphaGroups && groupedOptions ? (
                          sortedLetters.map(letter => (
                            <div key={letter}>
                              <div className="filter-section-letter" data-testid={`filter-letter-${letter}`}>{letter}</div>
                              {groupedOptions[letter].map(renderOption)}
                            </div>
                          ))
                        ) : (
                          filteredOptions.map(renderOption)
                        )}
                        {filteredOptions.length === 0 && (
                          <div style={{ padding: "16px 14px", fontSize: 14, color: "var(--labs-text-muted)", textAlign: "center" }}>
                            {t("discover.noFilterResults", "No matches")}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
                const isMobileView = typeof window !== "undefined" && window.innerWidth <= 768;
                return isMobileView ? createPortal(panelContent, document.body) : panelContent;
              })()}
            </div>

            <div
              data-testid="text-whisky-count"
              className={countAnimating ? "whisky-count-animate" : ""}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
                padding: "0 2px",
              }}
            >
              <span className="whisky-count-transition" style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
                {whiskies.length} {t("discover.whiskies", "Whiskies")}
              </span>
              {activeFilterCount > 0 && (
                <span style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>
                  {t("discover.filteredFrom", "von")} {whiskiesRaw.length}
                </span>
              )}
            </div>

            {whiskies.map((w: any, i: number) => {
              const score = (w.avgScore ?? w.avgOverall) ? Math.round(w.avgScore ?? w.avgOverall) : null;
              const scoreColor = score != null
                ? score > 85 ? "#D4A017" : score > 75 ? "#A0A0A0" : "var(--labs-text-muted)"
                : "var(--labs-text-muted)";
              const scoreBg = score != null
                ? score > 85 ? "rgba(212, 160, 23, 0.12)" : score > 75 ? "rgba(160, 160, 160, 0.12)" : "rgba(128,128,128,0.08)"
                : "transparent";
              const scoreBorder = score != null
                ? score > 85 ? "rgba(212, 160, 23, 0.3)" : score > 75 ? "rgba(160, 160, 160, 0.25)" : "rgba(128,128,128,0.15)"
                : "transparent";
              return (
                <button
                  key={i}
                  onClick={() => w.id && navigate(`/labs/explore/bottles/${w.id}`)}
                  data-testid={`whisky-card-${w.id || i}`}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 0",
                    background: "none",
                    border: "none",
                    borderBottomWidth: 1,
                    borderBottomStyle: "solid",
                    borderBottomColor: "var(--labs-border)",
                    cursor: "pointer",
                    textAlign: "left",
                    gap: 10,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)" }}>{w.name || w.whiskeyName}</div>
                    <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{w.distillery}{w.region ? ` \u00b7 ${w.region}` : ""}</div>
                    {w.tastingCount > 0 && (
                      <div style={{ fontSize: 11, color: "var(--labs-phase-palate)", marginTop: 2 }}>
                        {t("discover.crossLinkTastings", "Tastings")}: {w.tastingCount}
                      </div>
                    )}
                  </div>
                  {score != null && (
                    <div
                      data-testid={`score-badge-${w.id || i}`}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        border: `2px solid ${scoreBorder}`,
                        background: scoreBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor }}>{score}</span>
                    </div>
                  )}
                  <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)", opacity: 0.5, flexShrink: 0 }} />
                </button>
              );
            })}
            {whiskies.length === 0 && (
              <div style={{ textAlign: "center", padding: 32, color: "var(--labs-text-muted)", fontSize: 14 }}>
                {(search || activeFilterCount > 0) ? t("discover.noResults", "No results found.") : t("discover.noWhiskies", "No whiskies yet.")}
              </div>
            )}
          </div>
        )}

        {activeTab === "tastings" && (
          <div>
            {tastingsLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                <div style={{ width: 28, height: 28, border: "2px solid var(--labs-border)", borderTopColor: "var(--labs-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              </div>
            ) : (
              <>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <Search className="w-4 h-4" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--labs-text-muted)", opacity: 0.5 }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t("discover.searchTastings", "Search tastings...")}
                    data-testid="input-discovery-tasting-search"
                    style={{
                      width: "100%",
                      minHeight: 44,
                      borderRadius: 12,
                      border: "1px solid var(--labs-border)",
                      background: "var(--labs-surface)",
                      color: "var(--labs-text)",
                      fontSize: 15,
                      padding: "10px 14px 10px 36px",
                      outline: "none",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginBottom: 8 }}>
                  {filteredTastings.length} Tastings
                </div>
                {filteredTastings.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 32 }}>
                    <Wine className="w-9 h-9" style={{ color: "var(--labs-text-muted)", opacity: 0.3, margin: "0 auto 8px" }} />
                    <div style={{ fontSize: 14, color: "var(--labs-text-muted)" }}>
                      {search
                        ? t("discover.noResults", "No results found.")
                        : t("discover.noTastings", "No tastings yet.")}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {filteredTastings.map((tasting: any, i: number) => {
                      const isOwn = tasting._source === "own";
                      const isParticipant = isOwn || isMember;
                      return (
                        <div
                          key={tasting.id || i}
                          className="labs-card"
                          style={{ padding: 16, position: "relative" }}
                          data-testid={`tasting-card-${tasting.id || i}`}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                            {tasting.tastingNumber && (
                              <div style={{
                                width: 40, height: 40, borderRadius: 10,
                                background: "var(--labs-phase-palate-dim)",
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                              }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--labs-accent)" }}>#{tasting.tastingNumber}</span>
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {tasting.name || tasting.title || `Tasting #${tasting.tastingNumber || ""}`}
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12, color: "var(--labs-text-muted)", marginTop: 3 }}>
                                {tasting.date && (
                                  <span>{new Date(tasting.date).toLocaleDateString(lang.startsWith("de") ? "de-DE" : "en-US", { year: "numeric", month: "short" })}</span>
                                )}
                                {tasting.whiskyCount > 0 && <span>{tasting.whiskyCount} {t("discover.whiskies", "Whiskies")}</span>}
                                {tasting.avgScore != null && <span>{t("discover.avg", "Avg")}: {Math.round(tasting.avgScore)}</span>}
                              </div>
                            </div>
                            {isOwn && (
                              <span style={{
                                fontSize: 11, padding: "3px 10px", borderRadius: 10, flexShrink: 0,
                                background: tasting.status === "open" ? "color-mix(in srgb, var(--labs-success) 15%, transparent)" : "var(--labs-surface)",
                                color: tasting.status === "open" ? "var(--labs-success)" : "var(--labs-text-muted)",
                              }}>{tasting.status}</span>
                            )}
                          </div>
                          {!isParticipant && (
                            <div style={{
                              display: "flex", alignItems: "center", gap: 6, marginTop: 8,
                              padding: "6px 10px",
                              background: "color-mix(in srgb, var(--labs-accent) 8%, transparent)",
                              borderRadius: 8,
                            }}>
                              <Lock className="w-3 h-3" style={{ color: "var(--labs-accent)" }} />
                              <span style={{ fontSize: 11, color: "var(--labs-accent)", fontWeight: 600 }}>
                                {t("discover.participantsOnly", "Participants Only")}
                              </span>
                              <span style={{ fontSize: 11, color: "var(--labs-text-muted)", marginLeft: "auto" }}>
                                {t("discover.aggregatedResults", "Aggregated results")}
                              </span>
                            </div>
                          )}
                          {tasting.whiskies && tasting.whiskies.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginBottom: 4 }}>
                                {t("discover.crossLinkWhiskys", "Whiskies")}:
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {tasting.whiskies.slice(0, 4).map((w: any, wi: number) => (
                                  <button
                                    key={wi}
                                    onClick={() => w.id && navigate(`/labs/explore/bottles/${w.id}`)}
                                    data-testid={`crosslink-whisky-${w.id || wi}`}
                                    style={{
                                      fontSize: 11, padding: "2px 8px", borderRadius: 8,
                                      background: "var(--labs-phase-palate-dim)",
                                      color: "var(--labs-phase-palate)",
                                      border: "none", cursor: w.id ? "pointer" : "default",
                                      fontFamily: "inherit",
                                    }}
                                  >
                                    {w.name || w.whiskeyName}
                                  </button>
                                ))}
                                {tasting.whiskies.length > 4 && (
                                  <span style={{ fontSize: 11, color: "var(--labs-text-muted)", padding: "2px 4px" }}>
                                    +{tasting.whiskies.length - 4}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "insights" && (
          <div>
            {tastingsLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                <div style={{ width: 28, height: 28, border: "2px solid var(--labs-border)", borderTopColor: "var(--labs-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--labs-text-muted)", margin: "0 0 12px" }}>
                  {t("discover.insightsCommunityStats", "Community Stats")}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
                  {[
                    { label: t("discover.insightsTotalTastings", "Tastings"), value: totalTastings, icon: <History className="w-5 h-5" style={{ color: "var(--labs-accent)" }} /> },
                    { label: t("discover.insightsTotalWhiskies", "Whiskies"), value: totalWhiskies || "\u2013", icon: <Wine className="w-5 h-5" style={{ color: "var(--labs-phase-palate)" }} /> },
                    { label: t("discover.insightsRegions", "Regions"), value: regionCount || "\u2013", icon: <Globe className="w-5 h-5" style={{ color: "var(--labs-phase-nose)" }} /> },
                    { label: t("discover.insightsSmoky", "Smoky"), value: `${smokyPct}%`, icon: <Flame className="w-5 h-5" style={{ color: "var(--labs-phase-finish)" }} /> },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className="labs-card"
                      style={{ padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
                      data-testid={`insight-stat-${i}`}
                    >
                      {s.icon}
                      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--labs-accent)", fontFamily: "var(--font-display)" }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: "var(--labs-text-muted)", textAlign: "center" }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {regions.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--labs-text-muted)", margin: "0 0 8px" }}>
                      {t("discover.insightsTopRegions", "Top Regions")}
                    </p>
                    <div className="labs-card" style={{ padding: 16 }}>
                      {regions
                        .sort((a, b) => (insightsObj.regionBreakdown[b] || 0) - (insightsObj.regionBreakdown[a] || 0))
                        .slice(0, 8)
                        .map((region, i, arr) => {
                          const count = insightsObj.regionBreakdown[region] || 0;
                          const maxCount = Math.max(...Object.values(insightsObj.regionBreakdown) as number[], 1);
                          const pct = (count / maxCount) * 100;
                          return (
                            <div
                              key={region}
                              data-testid={`insight-region-${i}`}
                              style={{
                                display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                                borderBottom: i < Math.min(arr.length, 8) - 1 ? "1px solid var(--labs-border)" : "none",
                              }}
                            >
                              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)", width: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{region}</span>
                              <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--labs-border)", overflow: "hidden" }}>
                                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg, var(--labs-accent), var(--labs-phase-overall))" }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--labs-accent)", minWidth: 28, textAlign: "right" }}>{count}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {insightsObj?.topWhiskies && insightsObj.topWhiskies.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--labs-text-muted)", margin: "0 0 8px" }}>
                      {t("discover.insightsTopWhiskys", "Top Whiskies")}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {insightsObj.topWhiskies.slice(0, 5).map((w: any, i: number) => (
                        <button
                          key={i}
                          onClick={() => w.id && navigate(`/labs/explore/bottles/${w.id}`)}
                          data-testid={`insight-top-whisky-${i}`}
                          className="labs-card labs-card-interactive"
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 14px", cursor: w.id ? "pointer" : "default",
                            textAlign: "left", border: "none", width: "100%",
                          }}
                        >
                          <div style={{
                            width: 28, height: 28, borderRadius: 14,
                            background: "linear-gradient(135deg, var(--labs-accent), var(--labs-phase-overall))",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700, color: "var(--labs-on-accent)", flexShrink: 0,
                          }}>{i + 1}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</div>
                            <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{w.distillery}{w.region ? ` \u00b7 ${w.region}` : ""}</div>
                          </div>
                          {w.avgScore && (
                            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-accent)" }}>{Math.round(w.avgScore)}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--labs-text-muted)", margin: "0 0 8px" }}>
                    {t("discover.insightsTastingFreq", "Tasting Frequency")}
                  </p>
                  <div className="labs-card" style={{ padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60 }}>
                      {Array.from({ length: 12 }, (_, month) => {
                        const monthTastings = archiveTastings.filter((t2: any) => {
                          const d = new Date(t2.date || t2.createdAt || 0);
                          return d.getMonth() === month;
                        }).length;
                        const maxM = Math.max(
                          ...Array.from({ length: 12 }, (_, m) =>
                            archiveTastings.filter((t2: any) => new Date(t2.date || t2.createdAt || 0).getMonth() === m).length
                          ),
                          1
                        );
                        return (
                          <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <div style={{
                              width: "100%",
                              background: monthTastings > 0 ? "var(--labs-accent)" : "var(--labs-border)",
                              borderRadius: "2px 2px 0 0",
                              height: `${Math.max((monthTastings / maxM) * 100, monthTastings > 0 ? 8 : 2)}%`,
                              minHeight: monthTastings > 0 ? 4 : 1,
                              opacity: monthTastings > 0 ? 0.8 : 0.3,
                            }} />
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                      {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map((m, i) => (
                        <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 8, color: "var(--labs-text-muted)" }}>{m}</div>
                      ))}
                    </div>
                  </div>
                </div>
                <Link href="/labs/history" style={{ textDecoration: "none" }}>
                  <div
                    className="labs-card-interactive"
                    style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}
                    data-testid="link-entdecken-history-full"
                  >
                    <Archive className="w-4 h-4" style={{ color: "var(--labs-accent)", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
                        {t("discover.viewHistoricalTastings", "Browse Historical Tastings")}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 1 }}>
                        {t("discover.viewHistoricalTastingsSub", "Full archive & cross-tasting insights")}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)", flexShrink: 0 }} />
                  </div>
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      <DiscoverSection
        title={t("discover.sectionKnowledge", "Knowledge & Reference")}
        items={knowledgeItems}
        navigate={navigate}
        t={t}
      />

      <DiscoverSection
        title={t("discover.sectionTasting", "Tasting & Guides")}
        items={tastingGuideItems}
        navigate={navigate}
        t={t}
      />

      <DiscoverSection
        title={t("discover.sectionDeepDive", "Deep Dives")}
        items={deepDiveItems}
        navigate={navigate}
        t={t}
      />

      <DiscoverSection
        title={t("discover.sectionMore", "More")}
        items={moreItems}
        navigate={navigate}
        t={t}
        isLast
      />
    </div>
  );
}

function DiscoverSection({
  title,
  items,
  navigate,
  t,
  isLast,
}: {
  title: string;
  items: Array<{ icon: any; key: string; path: string }>;
  navigate: (path: string) => void;
  t: (key: string, fallback: string) => string;
  isLast?: boolean;
}) {
  return (
    <div className="labs-fade-in labs-stagger-2" style={{ marginBottom: isLast ? 0 : 32 }}>
      <p className="labs-section-label" style={{ marginBottom: 8 }}>{title}</p>
      <div className="labs-grouped-list">
        {items.map((item) => (
          <Link key={item.key} href={item.path} style={{ textDecoration: "none" }}>
            <div className="labs-list-row" style={{ cursor: "pointer" }} data-testid={`link-entdecken-${item.key}`}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: "var(--labs-accent-muted)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <item.icon className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)" }}>
                  {t(`discover.${item.key}`, item.key)}
                </div>
                <div style={{ fontSize: 13, color: "var(--labs-text-muted)", marginTop: 1 }}>
                  {t(`discover.${item.key}Sub`, "")}
                </div>
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)", opacity: 0.5, flexShrink: 0 }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
