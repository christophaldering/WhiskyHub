        import { useState, useEffect, useMemo, useCallback, useRef } from "react";
        import { createPortal } from "react-dom";
        import { useTranslation } from "react-i18next";
        import { useLocation, Link } from "wouter";
        import { useQuery } from "@tanstack/react-query";
        import { useSession } from "@/lib/session";
        import { pidHeaders } from "@/lib/api";
        import { apiUrl } from "@/lib/native";
        import {
          Search, ChevronRight, Wine,
          BookOpen,
          X, ChevronDown, Check, ArrowUp, ArrowDown,
        } from "lucide-react";

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

          const [search, setSearch] = useState("");
          const [visibleCount, setVisibleCount] = useState(20);
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

          const { data: whiskiesRaw = [] } = useQuery({
            queryKey: ["discovery-whiskies", search, sort, pid],
            queryFn: async () => {
              const url = apiUrl(`/api/labs/explore/whiskies?search=${encodeURIComponent(search)}&sort=${encodeURIComponent(sort)}`);
              const res = await fetch(url, {
                headers: { ...pidHeaders(), ...(pid ? { "x-participant-id": pid } : {}) },
              });

              if (!res.ok) {
                console.error("LabsEntdecken whiskies fetch failed", {
                  status: res.status,
                  statusText: res.statusText,
                  url,
                });
                return [];
              }

              return res.json();
            },
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
            const isScrollable = target.closest('[style*="overflow"]') || target.closest(".filter-dropdown-panel > div:last-child");
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
              filterPanelRef.current.style.transition = "none";
            }
          }, []);
          const handleSheetTouchEnd = useCallback(() => {
            if (dragStartY.current === null) return;
            const dy = dragCurrentY.current;
            if (filterPanelRef.current) {
              filterPanelRef.current.style.transition = "transform 200ms ease";
              if (dy > 100) {
                filterPanelRef.current.style.transform = "translateY(100%)";
                setTimeout(() => {
                  setExpandedFilter(null);
                  setFilterSearch("");
                  if (filterPanelRef.current) {
                    filterPanelRef.current.style.transform = "";
                    filterPanelRef.current.style.transition = "";
                  }
                }, 200);
              } else {
                filterPanelRef.current.style.transform = "translateY(0)";
                setTimeout(() => {
                  if (filterPanelRef.current) {
                    filterPanelRef.current.style.transform = "";
                    filterPanelRef.current.style.transition = "";
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
                const nameA = (a.name || "").toLowerCase();
                const nameB = (b.name || "").toLowerCase();
                return dir * nameA.localeCompare(nameB);
              }
            });
            return result;
          }, [whiskiesRaw, filters, activeFilterCount, sort, sortDirection]);

          useEffect(() => {
            setVisibleCount(20);
          }, [search, filters, sort, sortDirection]);

          useEffect(() => {
            if (prevWhiskyCountRef.current !== null && prevWhiskyCountRef.current !== whiskies.length) {
              setCountAnimating(true);
              const timer = setTimeout(() => setCountAnimating(false), 300);
              prevWhiskyCountRef.current = whiskies.length;
              return () => clearTimeout(timer);
            }
            prevWhiskyCountRef.current = whiskies.length;
          }, [whiskies.length]);

          return (
            <div className="labs-page" data-testid="labs-entdecken-page">
              <h1 className="labs-serif labs-fade-in" style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 2px" }}>
                {t("explore.title", "Explore")}
              </h1>
              <p className="labs-fade-in labs-stagger-1" style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: "0 0 24px", opacity: 0.6 }}>
                {t("explore.subtitle", "Find whiskies")}
              </p>

              <div className="labs-fade-in labs-stagger-1" style={{ marginBottom: 24 }}>
                <Link href="/labs/bibliothek" style={{ textDecoration: "none" }} data-testid="link-entdecken-bibliothek">
                  <div className="labs-card-interactive" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--labs-surface-elevated)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <BookOpen className="w-[18px] h-[18px]" style={{ color: "var(--labs-accent)" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)" }}>{t("bibliothek.title", "Library")}</div>
                      <div style={{ fontSize: 13, color: "var(--labs-text-muted)", marginTop: 1 }}>{t("explore.bibliothekSub", "Knowledge, reference & deep dive")}</div>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)", opacity: 0.75, flexShrink: 0 }} />
                  </div>
                </Link>
              </div>

              <div className="labs-fade-in labs-stagger-2" style={{ marginBottom: 32 }}>
                <p className="labs-section-label flex items-center gap-2" style={{ marginBottom: 10 }}>
                  <Wine className="w-3.5 h-3.5" />
                  {t("discover.whiskies", "Whiskies")}
                </p>

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

                  {whiskies.slice(0, visibleCount).map((w: any, i: number) => {
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
                          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)" }}>{w.name || "—"}</div>
                          <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{w.distillery}{w.region ? ` · ${w.region}` : ""}</div>
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

                  {visibleCount < whiskies.length && (
                    <button
                      onClick={() => setVisibleCount(prev => prev + 20)}
                      data-testid="button-show-more-whiskies"
                      className="labs-btn-ghost"
                      style={{
                        width: "100%",
                        minHeight: 48,
                        marginTop: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--labs-accent)",
                        border: "1px solid var(--labs-border)",
                        borderRadius: 12,
                        cursor: "pointer",
                        background: "var(--labs-surface)",
                      }}
                    >
                      {t("explore.loadMore", "Show more")} ({whiskies.length - visibleCount} {t("explore.remaining", "remaining")})
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }