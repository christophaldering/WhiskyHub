        import { useState, useEffect, useMemo, useCallback, useRef } from "react";
        import { createPortal } from "react-dom";
        import { useTranslation } from "react-i18next";
        import { useLocation, useSearch, Link } from "wouter";
        import { useQuery } from "@tanstack/react-query";
        import { useSession } from "@/lib/session";
        import { pidHeaders } from "@/lib/api";
        import { wishlistKey, useWishlistKeys, useCollectionKeys } from "@/lib/wishlistKey";
        import WishlistBadge from "@/labs/components/WishlistBadge";
        import CollectionBadge from "@/labs/components/CollectionBadge";
        import DiscoverActionBar from "@/labs/components/DiscoverActionBar";
        import { EmbeddedExploreProvider } from "@/labs/embeddedExploreContext";
        import { apiUrl } from "@/lib/native";
        import { HubTileGrid, HubTileCollapsible, type HubTileDef } from "@/labs/pages/hubTiles";
        import type { ElementType } from "react";
        import {
          Search, ChevronRight, Wine,
          BookOpen, List, BarChart3, Compass, Activity,
          X, ChevronDown, Check, Star, Archive,
          Map as MapIcon, FlaskConical, Heart, Info, Globe, Package,
          SlidersHorizontal, Factory, Microscope, Utensils,
        } from "lucide-react";
        import LabsLexicon from "@/labs/pages/LabsLexicon";
        import LabsDistilleries from "@/labs/pages/LabsDistilleries";
        import LabsBottlers from "@/labs/pages/LabsBottlers";
        import LabsHandoutLibrary from "@/labs/pages/LabsHandoutLibrary";
        import LabsGuide from "@/labs/pages/LabsGuide";
        import LabsBackground from "@/labs/pages/LabsBackground";
        import LabsMethod from "@/labs/pages/LabsMethod";
        import LabsResearch from "@/labs/pages/LabsResearch";
        import LabsPairings from "@/labs/pages/LabsPairings";
        import LabsThemenspeicher from "@/labs/pages/LabsThemenspeicher";
        import LabsAbout from "@/labs/pages/LabsAbout";

        type BibliothekSectionKey = "nachschlagewerk" | "tasting-wissen" | "rabbit-hole" | "ueber-casksense";

        interface BibliothekSubDef {
          sub: string;
          labelKey: string;
          labelFb: string;
          icon: ElementType;
          Component: React.ComponentType;
        }

        interface BibliothekSectionDef {
          key: BibliothekSectionKey;
          icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; strokeWidth?: number }>;
          labelKey: string;
          labelFb: string;
          descKey: string;
          descFb: string;
          subs: BibliothekSubDef[];
        }

        const BIBLIOTHEK_TILES: BibliothekSectionDef[] = [
          {
            key: "nachschlagewerk",
            icon: BookOpen,
            labelKey: "explore.bibliothek.nachschlagewerkTitle",
            labelFb: "Nachschlagewerk",
            descKey: "explore.bibliothek.nachschlagewerkDesc",
            descFb: "Lexikon, Destillerien, Bottlers",
            subs: [
              { sub: "lexikon", labelKey: "discover.lexicon", labelFb: "Lexikon", icon: BookOpen, Component: LabsLexicon },
              { sub: "destillerien", labelKey: "discover.distilleries", labelFb: "Destillerien", icon: Factory, Component: LabsDistilleries },
              { sub: "bottlers", labelKey: "discover.bottlers", labelFb: "Bottlers", icon: Package, Component: LabsBottlers },
              { sub: "community-handouts", labelKey: "bibliothek.communityHandouts", labelFb: "Community Handouts", icon: Globe, Component: LabsHandoutLibrary },
            ],
          },
          {
            key: "tasting-wissen",
            icon: FlaskConical,
            labelKey: "explore.bibliothek.tastingWissenTitle",
            labelFb: "Tasting-Wissen",
            descKey: "explore.bibliothek.tastingWissenDesc",
            descFb: "Guide, Hintergrund, Profilberechnung, Research, Pairings",
            subs: [
              { sub: "guide", labelKey: "discover.guide", labelFb: "Guide", icon: Compass, Component: LabsGuide },
              { sub: "hintergrund", labelKey: "bibliothek.whiskyProduction", labelFb: "Hintergrund", icon: BookOpen, Component: LabsBackground },
              { sub: "profilberechnung", labelKey: "bibliothek.howProfileCalculated", labelFb: "Profilberechnung", icon: Activity, Component: LabsMethod },
              { sub: "research", labelKey: "bibliothek.researchSensory", labelFb: "Research", icon: Microscope, Component: LabsResearch },
              { sub: "pairings", labelKey: "bibliothek.pairings", labelFb: "Pairings", icon: Utensils, Component: LabsPairings },
            ],
          },
          {
            key: "rabbit-hole",
            icon: Archive,
            labelKey: "rabbitHole.themenspeicherTitle",
            labelFb: "Rabbit Hole",
            descKey: "rabbitHole.themenspeicherDesc",
            descFb: "Themenspeicher",
            subs: [
              { sub: "themenspeicher", labelKey: "rabbitHole.themenspeicherTitle", labelFb: "Themenspeicher", icon: Archive, Component: LabsThemenspeicher },
            ],
          },
          {
            key: "ueber-casksense",
            icon: Info,
            labelKey: "about.title",
            labelFb: "Über CaskSense",
            descKey: "m2.discover.aboutSubtitle",
            descFb: "The story behind CaskSense",
            subs: [
              { sub: "about", labelKey: "about.title", labelFb: "About", icon: Info, Component: LabsAbout },
            ],
          },
        ];

        type WhiskyHubMode = "hub" | "list";
        type WhiskyHubPreset =
          | "topRated"
          | "mostTasted"
          | "alpha"
          | "flavourMap";

        const WHISKY_PILLS: { preset: WhiskyHubPreset; view: string; icon: typeof Wine; labelKey: string; labelFb: string }[] = [
          { preset: "topRated", view: "top-rated", icon: Star, labelKey: "explore.hub.topTitle", labelFb: "Top Rated" },
          { preset: "mostTasted", view: "most-tasted", icon: Activity, labelKey: "explore.hub.mostTitle", labelFb: "Most Tasted" },
          { preset: "alpha", view: "a-z", icon: List, labelKey: "discover.sortAlpha", labelFb: "A-Z" },
          { preset: "flavourMap", view: "flavour-map", icon: Compass, labelKey: "explore.hub.flavourTitle", labelFb: "Flavour Map" },
        ];

        type DistilleryGroup = {
          key: string;
          name: string;
          region: string | null;
          whiskies: any[];
          avgScore: number | null;
          totalRatings: number;
          totalTastings: number;
        };

        function stripDistilleryPrefix(name: string, distillery: string | null | undefined): string {
          if (!name) return "";
          if (!distillery) return name;
          const dl = distillery.trim().toLowerCase();
          if (!dl) return name;
          const lower = name.toLowerCase();
          if (lower === dl) return name;
          if (lower.startsWith(dl + " ")) return name.slice(distillery.length + 1).trim();
          if (lower.startsWith(dl + "-")) return name.slice(distillery.length + 1).trim();
          return name;
        }

        function getDistilleryColor(name: string): string {
          let hash = 0;
          for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
          const hue = Math.abs(hash) % 360;
          return `hsl(${hue}, 42%, 32%)`;
        }

        function getDistilleryInitial(name: string): string {
          const trimmed = (name || "").trim();
          if (!trimmed) return "?";
          return trimmed.charAt(0).toUpperCase();
        }

        function groupByDistillery(whiskies: any[]): DistilleryGroup[] {
          const map = new Map<string, DistilleryGroup>();
          for (const w of whiskies) {
            const distRaw = (w.distillery || "").trim();
            const name = distRaw || (w.name || "Unknown");
            const key = name.toLowerCase();
            let g = map.get(key);
            if (!g) {
              g = { key, name, region: w.region || null, whiskies: [], avgScore: null, totalRatings: 0, totalTastings: 0 };
              map.set(key, g);
            }
            g.whiskies.push(w);
            if (!g.region && w.region) g.region = w.region;
            g.totalRatings += w.ratingCount || 0;
            g.totalTastings += w.tastingCount || 0;
          }
          const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
          const groups: DistilleryGroup[] = Array.from(map.values());
          for (const g of groups) {
            const scored = g.whiskies.filter((w: any) => {
              const v = w.avgScore ?? w.avgOverall;
              return v != null && v > 0;
            });
            g.avgScore = scored.length > 0
              ? scored.reduce((s: number, w: any) => s + (w.avgScore ?? w.avgOverall ?? 0), 0) / scored.length
              : null;
            g.whiskies.sort((a: any, b: any) =>
              collator.compare(stripDistilleryPrefix(a.name || "", g.name), stripDistilleryPrefix(b.name || "", g.name))
            );
          }
          return groups;
        }

        type EntdeckenFilterDimension = "region" | "distillery" | "category" | "country" | "peatLevel";

        const EXPLORE_SNAPSHOT_KEY = "cs_explore_snapshot";
        const BACK_NAV_KEY = "cs_back_nav";

        type ExploreSnapshot = {
          activeView: "whiskies" | "bibliothek";
          whiskyHubMode: WhiskyHubMode;
          whiskyView: string | null;
          biblioSection: BibliothekSectionKey | null;
          biblioSub: string | null;
          search: string;
          visibleCount: number;
          sort: string;
          sortDirection: "desc" | "asc";
          filterSearch: string;
          filters: Record<EntdeckenFilterDimension, string[]>;
          expandedGroups: string[];
        };

        function readExploreSnapshot(): ExploreSnapshot | null {
          if (typeof window === "undefined") return null;
          try {
            const isBack = window.sessionStorage.getItem(BACK_NAV_KEY) === "1";
            if (!isBack) {
              window.sessionStorage.removeItem(EXPLORE_SNAPSHOT_KEY);
              return null;
            }
            const raw = window.sessionStorage.getItem(EXPLORE_SNAPSHOT_KEY);
            if (!raw) return null;
            return JSON.parse(raw) as ExploreSnapshot;
          } catch {
            return null;
          }
        }

        function writeExploreSnapshot(snap: ExploreSnapshot): void {
          if (typeof window === "undefined") return;
          try {
            window.sessionStorage.setItem(EXPLORE_SNAPSHOT_KEY, JSON.stringify(snap));
          } catch {}
        }

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
          const searchStr = useSearch();
          const initialUrlState = useMemo(() => {
            try {
              const params = new URLSearchParams(searchStr);
              const tab = params.get("tab");
              const view = params.get("view");
              const section = params.get("section");
              const sub = params.get("sub");
              return {
                tab: (tab === "whiskies" || tab === "bibliothek") ? tab as "whiskies" | "bibliothek" : null,
                view,
                section: (section === "nachschlagewerk" || section === "tasting-wissen" || section === "rabbit-hole" || section === "ueber-casksense") ? section as BibliothekSectionKey : null,
                sub,
              };
            } catch {}
            return { tab: null as null | "whiskies" | "bibliothek", view: null as string | null, section: null as BibliothekSectionKey | null, sub: null as string | null };
          }, []);
          const initialTabFromUrl = initialUrlState.tab;
          const { currentParticipant } = useSession();
          const pid = currentParticipant?.id;
          const savedKeys = useWishlistKeys(pid);
          const collectionKeys = useCollectionKeys(pid);

          const [initialSnapshot] = useState<ExploreSnapshot | null>(() => readExploreSnapshot());
          const restoredFromSnapshotRef = useRef<boolean>(initialSnapshot !== null);

          const [activeView, setActiveView] = useState<"whiskies" | "bibliothek">(
            () => initialTabFromUrl ?? initialSnapshot?.activeView ?? "whiskies",
          );
          const initialWhiskyView: string = (() => {
            if (initialUrlState.view && WHISKY_PILLS.some(p => p.view === initialUrlState.view)) {
              return initialUrlState.view;
            }
            const snap = initialSnapshot?.whiskyView;
            if (snap && WHISKY_PILLS.some(p => p.view === snap)) return snap;
            return "top-rated";
          })();
          const [whiskyView, setWhiskyView] = useState<string>(initialWhiskyView);
          const [biblioSection, setBiblioSection] = useState<BibliothekSectionKey | null>(
            () => initialUrlState.section ?? initialSnapshot?.biblioSection ?? null,
          );
          const [biblioSub, setBiblioSub] = useState<string | null>(
            () => initialUrlState.sub ?? initialSnapshot?.biblioSub ?? null,
          );
          const [whiskyHubMode] = useState<WhiskyHubMode>("list");

          useEffect(() => {
            if (typeof window === "undefined") return;
            try {
              const params = new URLSearchParams(window.location.search);
              params.set("tab", activeView);
              if (activeView === "whiskies") {
                if (whiskyView && WHISKY_PILLS.some(p => p.view === whiskyView)) params.set("view", whiskyView);
                else params.delete("view");
                params.delete("section");
                params.delete("sub");
              } else {
                params.delete("view");
                if (biblioSection) {
                  params.set("section", biblioSection);
                  if (biblioSub) params.set("sub", biblioSub);
                  else params.delete("sub");
                } else {
                  params.delete("section");
                  params.delete("sub");
                }
              }
              const qs = params.toString();
              const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
              window.history.replaceState(window.history.state, "", newUrl);
            } catch {}
          }, [activeView, whiskyView, biblioSection, biblioSub]);
          const [search, setSearch] = useState<string>(() => initialSnapshot?.search ?? "");
          const [visibleCount, setVisibleCount] = useState<number>(() => initialSnapshot?.visibleCount ?? 20);
          const [sort, setSort] = useState<string>(() => initialSnapshot?.sort ?? "avg");
          const [sortDirection, setSortDirection] = useState<"desc" | "asc">(
            () => initialSnapshot?.sortDirection ?? "desc",
          );
          const [filterSearch, setFilterSearch] = useState<string>(() => initialSnapshot?.filterSearch ?? "");
          const [filters, setFilters] = useState<Record<EntdeckenFilterDimension, Set<string>>>(() => {
            const f = initialSnapshot?.filters;
            return {
              region: new Set<string>(f?.region ?? []),
              distillery: new Set<string>(f?.distillery ?? []),
              category: new Set<string>(f?.category ?? []),
              country: new Set<string>(f?.country ?? []),
              peatLevel: new Set<string>(f?.peatLevel ?? []),
            };
          });
          const [expandedFilter, setExpandedFilter] = useState<EntdeckenFilterDimension | null>(null);
          const filterDropdownRef = useRef<HTMLDivElement>(null);

          const filterPanelRef = useRef<HTMLDivElement>(null);
          const biblioContentRef = useRef<HTMLDivElement>(null);

          // Role A: smooth auto-scroll for bibliothek section content (~60px offset)
          useEffect(() => {
            if (!biblioSection) return;
            const el = biblioContentRef.current;
            if (!el) return;
            const id = window.setTimeout(() => {
              try {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              } catch {}
            }, 50);
            return () => window.clearTimeout(id);
          }, [biblioSection, biblioSub]);

          // Role A: ESC closes the active bibliothek section on desktop
          useEffect(() => {
            if (!biblioSection) return;
            const handler = (e: KeyboardEvent) => {
              if (e.key !== "Escape") return;
              if (window.matchMedia("(hover: none)").matches) return;
              setBiblioSection(null);
              setBiblioSub(null);
            };
            window.addEventListener("keydown", handler);
            return () => window.removeEventListener("keydown", handler);
          }, [biblioSection]);
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

          const distilleryGroups = useMemo(() => {
            const groups = groupByDistillery(whiskies);
            const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
            const desc = sortDirection === "desc";
            if (sort === "avg") {
              groups.sort((a, b) => {
                const aHas = a.avgScore != null ? 1 : 0;
                const bHas = b.avgScore != null ? 1 : 0;
                if (aHas !== bHas) return bHas - aHas;
                const av = a.avgScore || 0;
                const bv = b.avgScore || 0;
                const cmp = desc ? bv - av : av - bv;
                return cmp || collator.compare(a.name, b.name);
              });
            } else if (sort === "most") {
              groups.sort((a, b) => {
                const cmp = desc ? b.totalTastings - a.totalTastings : a.totalTastings - b.totalTastings;
                return cmp || collator.compare(a.name, b.name);
              });
            } else {
              groups.sort((a, b) => (desc ? -1 : 1) * collator.compare(a.name, b.name));
            }
            return groups;
          }, [whiskies, sort, sortDirection]);

          const totalDistilleryCount = distilleryGroups.length;
          const visibleGroups = useMemo(() => distilleryGroups.slice(0, visibleCount), [distilleryGroups, visibleCount]);

          const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
            () => new Set<string>(initialSnapshot?.expandedGroups ?? []),
          );
          const toggleGroup = useCallback((key: string) => {
            setExpandedGroups(prev => {
              const next = new Set(prev);
              if (next.has(key)) next.delete(key);
              else next.add(key);
              return next;
            });
          }, []);
          const isGroupExpanded = useCallback(
            (key: string) => search.trim().length > 0 || expandedGroups.has(key),
            [expandedGroups, search],
          );

          const skipVisibleCountResetRef = useRef<boolean>(restoredFromSnapshotRef.current);
          useEffect(() => {
            if (skipVisibleCountResetRef.current) {
              skipVisibleCountResetRef.current = false;
              return;
            }
            setVisibleCount(20);
          }, [search, filters, sort, sortDirection]);

          useEffect(() => {
            writeExploreSnapshot({
              activeView,
              whiskyHubMode,
              whiskyView,
              biblioSection,
              biblioSub,
              search,
              visibleCount,
              sort,
              sortDirection,
              filterSearch,
              filters: {
                region: Array.from(filters.region),
                distillery: Array.from(filters.distillery),
                category: Array.from(filters.category),
                country: Array.from(filters.country),
                peatLevel: Array.from(filters.peatLevel),
              },
              expandedGroups: Array.from(expandedGroups),
            });
          }, [activeView, whiskyHubMode, whiskyView, biblioSection, biblioSub, search, visibleCount, sort, sortDirection, filterSearch, filters, expandedGroups]);

          const applyWhiskyHubPreset = useCallback((preset: WhiskyHubPreset) => {
            const pill = WHISKY_PILLS.find(p => p.preset === preset);
            if (pill) setWhiskyView(pill.view);
            if (preset === "flavourMap") {
              return;
            }
            if (preset === "topRated") {
              setSort("avg"); setSortDirection("desc");
            } else if (preset === "mostTasted") {
              setSort("most"); setSortDirection("desc");
            } else if (preset === "alpha") {
              setSort("alpha"); setSortDirection("asc");
            }
          }, []);

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
            <div className="labs-page labs-fade-in" data-testid="labs-entdecken-page">
              <DiscoverActionBar
                active={activeView}
                onSelect={(view) => {
                  // Role B: re-click on the active top-tab is a strict no-op
                  if (view === activeView) return;
                  // Tab-switch resets sub-tiles to default (closed)
                  setBiblioSection(null);
                  setBiblioSub(null);
                  setActiveView(view);
                  setExpandedFilter(null);
                }}
              />

              {activeView === "bibliothek" && (() => {
                const activeSection = biblioSection ? BIBLIOTHEK_TILES.find(s => s.key === biblioSection) ?? null : null;
                // Role A: when biblioSub is null, no sub is active and content stays closed.
                // For sections with exactly one sub we keep the legacy behaviour and auto-select it.
                const activeSub = activeSection
                  ? (biblioSub
                      ? (activeSection.subs.find(sb => sb.sub === biblioSub) ?? null)
                      : (activeSection.subs.length === 1 ? activeSection.subs[0] : null))
                  : null;
                const ActiveComponent = activeSub?.Component ?? null;
                const headTiles: HubTileDef[] = BIBLIOTHEK_TILES.map((section) => ({
                  icon: section.icon,
                  labelKey: section.labelKey,
                  labelFallback: section.labelFb,
                  descKey: section.descKey,
                  descFallback: section.descFb,
                  testId: `tile-explore-bibliothek-${section.key}`,
                  role: "nav",
                }));
                const activeHeadTestId = activeSection
                  ? `tile-explore-bibliothek-${activeSection.key}`
                  : undefined;
                return (
                  <div className="labs-fade-in labs-stagger-2" data-testid="explore-bibliothek-inline" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <HubTileGrid
                      tiles={headTiles}
                      t={t}
                      variant="four-row"
                      role="nav"
                      activeTestId={activeHeadTestId}
                      onTileClick={(tile) => {
                        const section = BIBLIOTHEK_TILES.find(
                          (s) => `tile-explore-bibliothek-${s.key}` === tile.testId,
                        );
                        if (!section) return;
                        if (biblioSection === section.key) {
                          setBiblioSection(null);
                          setBiblioSub(null);
                        } else {
                          setBiblioSection(section.key);
                          setBiblioSub(section.subs[0]?.sub ?? null);
                        }
                      }}
                    />

                    <HubTileCollapsible
                      open={activeSection !== null}
                      innerRef={biblioContentRef}
                      testId={
                        activeSection
                          ? `explore-bibliothek-section-${activeSection.key}`
                          : undefined
                      }
                    >
                      {activeSection && (() => {
                          if (activeSection.subs.length <= 1) return null;
                          const subTiles: HubTileDef[] = activeSection.subs.map((s) => ({
                            icon: s.icon,
                            labelKey: s.labelKey,
                            labelFallback: s.labelFb,
                            descKey: "",
                            descFallback: "",
                            testId: `tab-explore-bibliothek-${activeSection.key}-${s.sub}`,
                            role: "nav",
                          }));
                          const activeTestId = activeSub
                            ? `tab-explore-bibliothek-${activeSection.key}-${activeSub.sub}`
                            : undefined;
                          return (
                            <div style={{ marginBottom: 12 }}>
                              <HubTileGrid
                                tiles={subTiles}
                                t={t}
                                variant="single-row"
                                role="nav"
                                activeTestId={activeTestId}
                                onTileClick={(tile) => {
                                  const sub = activeSection.subs.find(
                                    (s) => `tab-explore-bibliothek-${activeSection.key}-${s.sub}` === tile.testId,
                                  );
                                  if (!sub) return;
                                  // Role A: re-click closes the active sub-tile
                                  if (biblioSub === sub.sub) setBiblioSub(null);
                                  else setBiblioSub(sub.sub);
                                }}
                              />
                            </div>
                          );
                        })()}
                      {ActiveComponent && activeSub && activeSection && (
                        <div data-testid={`explore-inline-${activeSection.key}-${activeSub.sub}`}>
                          <EmbeddedExploreProvider>
                            <ActiveComponent />
                          </EmbeddedExploreProvider>
                        </div>
                      )}
                    </HubTileCollapsible>
                  </div>
                );
              })()}

              {activeView === "whiskies" && (
              <div className="labs-fade-in labs-stagger-2" style={{ marginBottom: 32 }}>
                <div data-testid="explore-whiskies-pills" style={{ marginBottom: 14 }}>
                  {(() => {
                    const whiskyTiles: HubTileDef[] = WHISKY_PILLS.map((pill) => ({
                      icon: pill.icon,
                      labelKey: pill.labelKey,
                      labelFallback: pill.labelFb,
                      descKey: "",
                      descFallback: "",
                      testId: `pill-explore-whiskies-${pill.view}`,
                    }));
                    const activePillView = whiskyView === "flavour-map"
                      ? "flavour-map"
                      : sort === "most"
                        ? "most-tasted"
                        : sort === "alpha"
                          ? "a-z"
                          : "top-rated";
                    const activeTestId = `pill-explore-whiskies-${activePillView}`;
                    return (
                      <HubTileGrid
                        tiles={whiskyTiles}
                        t={t}
                        variant="single-row"
                        role="filter"
                        activeTestId={activeTestId}
                        onTileClick={(tile) => {
                          const pill = WHISKY_PILLS.find(
                            (p) => `pill-explore-whiskies-${p.view}` === tile.testId,
                          );
                          if (!pill) return;
                          // Role C: re-click on the active pill resets to default ("Top Rated")
                          if (`pill-explore-whiskies-${pill.view}` === activeTestId) {
                            applyWhiskyHubPreset("topRated");
                          } else {
                            applyWhiskyHubPreset(pill.preset);
                          }
                        }}
                      />
                    );
                  })()}
                </div>

                {whiskyView === "flavour-map" && (
                  <div data-testid="explore-inline-whiskies-flavour-map">
                    <EmbeddedExploreProvider>
                      <LabsLexicon forceTab="flavour-map" />
                    </EmbeddedExploreProvider>
                  </div>
                )}

                {whiskyView !== "flavour-map" && (
                <>


                <div>
                  <div style={{ position: "relative", marginBottom: 10 }}>
                    <Search className="w-4 h-4" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--labs-text-muted)", opacity: 0.5 }} />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder={t("explore.searchWhiskies", "Search whiskies\u2026")}
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

                  <div style={{ marginBottom: 10 }}>
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
                      {t("explore.distilleriesAndWhiskies", {
                        defaultValue: "{{distilleries}} distilleries · {{whiskies}} whiskies",
                        distilleries: totalDistilleryCount,
                        whiskies: whiskies.length,
                      })}
                    </span>
                    {activeFilterCount > 0 && (
                      <span style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>
                        {t("discover.filteredFrom", "von")} {whiskiesRaw.length}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {visibleGroups.map((g: DistilleryGroup) => {
                      const expanded = isGroupExpanded(g.key);
                      const color = getDistilleryColor(g.name);
                      const initial = getDistilleryInitial(g.name);
                      return (
                        <div
                          key={g.key}
                          style={{
                            background: "var(--labs-surface)",
                            border: "1px solid var(--labs-border)",
                            borderRadius: 12,
                            overflow: "hidden",
                          }}
                          data-testid={`distillery-group-${g.key}`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleGroup(g.key)}
                            aria-expanded={expanded}
                            data-testid={`distillery-group-header-${g.key}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              width: "100%",
                              minHeight: 56,
                              padding: "10px 14px",
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              textAlign: "left",
                              fontFamily: "inherit",
                              color: "var(--labs-text)",
                            }}
                          >
                            <div
                              aria-hidden="true"
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                background: color,
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: 16,
                                flexShrink: 0,
                              }}
                            >
                              {initial}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                className="labs-serif"
                                style={{
                                  fontSize: 16,
                                  fontWeight: 700,
                                  color: "var(--labs-text)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                data-testid={`distillery-name-${g.key}`}
                              >
                                {g.name}
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  color: "var(--labs-text-muted)",
                                  marginTop: 2,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {g.region ? `${g.region} · ` : ""}
                                {t("explore.whiskyCount", { count: g.whiskies.length })}
                              </div>
                            </div>
                            {g.avgScore != null && (
                              <div
                                style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                                data-testid={`distillery-avg-${g.key}`}
                              >
                                <Star className="w-3.5 h-3.5" style={{ color: "#D4A017" }} />
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#D4A017" }}>{g.avgScore.toFixed(1)}</span>
                              </div>
                            )}
                            {expanded ? (
                              <ChevronDown className="w-4 h-4" style={{ color: "var(--labs-text-muted)", flexShrink: 0 }} />
                            ) : (
                              <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)", flexShrink: 0 }} />
                            )}
                          </button>
                          {expanded && (
                            <div
                              style={{ borderTop: "1px solid var(--labs-border)", display: "flex", flexDirection: "column" }}
                              data-testid={`distillery-bottles-${g.key}`}
                            >
                              {g.whiskies.map((w: any, i: number) => {
                                const displayName = stripDistilleryPrefix(w.name || "", g.name) || w.name || "—";
                                const ageText = w.age ? (/\d$/.test(String(w.age)) ? `${w.age}y` : String(w.age)) : null;
                                const abvText = w.abv != null && w.abv !== "" ? (/\d$/.test(String(w.abv)) ? `${w.abv}%` : String(w.abv)) : null;
                                const meta = [ageText, abvText].filter(Boolean).join(" · ");
                                const scoreVal = w.avgScore ?? w.avgOverall;
                                const score = scoreVal != null && scoreVal > 0 ? Number(scoreVal) : null;
                                return (
                                  <button
                                    key={w.id || i}
                                    onClick={() => w.id && navigate(`/labs/explore/bottles/${w.id}`)}
                                    data-testid={`whisky-card-${w.id || i}`}
                                    style={{
                                      width: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 10,
                                      padding: "10px 14px 10px 28px",
                                      minHeight: 56,
                                      background: "none",
                                      border: "none",
                                      borderTopWidth: 1,
                                      borderTopStyle: "solid",
                                      borderTopColor: "var(--labs-border)",
                                      cursor: "pointer",
                                      textAlign: "left",
                                      fontFamily: "inherit",
                                      color: "var(--labs-text)",
                                    }}
                                  >
                                    <div
                                      aria-hidden="true"
                                      style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 8,
                                        background: w.imageUrl
                                          ? `center/cover no-repeat url("${w.imageUrl}")`
                                          : "var(--labs-surface-elevated)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        border: "1px solid var(--labs-border)",
                                      }}
                                    >
                                      {!w.imageUrl && <Wine className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                        <div
                                          style={{
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: "var(--labs-text)",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                          }}
                                          data-testid={`text-whisky-name-${w.id || i}`}
                                        >
                                          {displayName}
                                        </div>
                                        {savedKeys.has(wishlistKey(w.name, w.distillery)) && (
                                          <WishlistBadge size="xs" testId={`badge-wishlist-${w.id || i}`} />
                                        )}
                                        {collectionKeys.has(w.name, w.distillery, w.whiskybaseId) && (
                                          <CollectionBadge size="xs" testId={`badge-collection-${w.id || i}`} />
                                        )}
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--labs-text-muted)", marginTop: 2, flexWrap: "wrap" }}>
                                        {meta && <span>{meta}</span>}
                                        {w.tastingCount > 0 && (
                                          <span data-testid={`text-tastings-${w.id || i}`}>
                                            {t("explore.tastingsCount", { count: w.tastingCount, defaultValue: "{{count}} tastings" })}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {score != null ? (
                                      <div
                                        data-testid={`score-chip-${w.id || i}`}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 4,
                                          padding: "3px 8px",
                                          borderRadius: 999,
                                          background: "rgba(212, 160, 23, 0.12)",
                                          border: "1px solid rgba(212, 160, 23, 0.3)",
                                          flexShrink: 0,
                                        }}
                                      >
                                        <Star className="w-3 h-3" style={{ color: "#D4A017" }} />
                                        <span style={{ fontSize: 12, fontWeight: 700, color: "#D4A017" }}>{score.toFixed(1)}</span>
                                      </div>
                                    ) : w.isDraft ? (
                                      <div
                                        data-testid={`draft-badge-${w.id || i}`}
                                        style={{
                                          padding: "3px 8px",
                                          borderRadius: 999,
                                          background: "var(--labs-surface-elevated)",
                                          border: "1px solid var(--labs-border)",
                                          fontSize: 11,
                                          fontWeight: 600,
                                          color: "var(--labs-text-muted)",
                                          flexShrink: 0,
                                          textTransform: "uppercase",
                                          letterSpacing: "0.5px",
                                        }}
                                      >
                                        {t("explore.draft", "Draft")}
                                      </div>
                                    ) : null}
                                    <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)", opacity: 0.5, flexShrink: 0 }} />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {distilleryGroups.length === 0 && (
                    <div style={{ textAlign: "center", padding: 32, color: "var(--labs-text-muted)", fontSize: 14 }}>
                      {(search || activeFilterCount > 0) ? t("discover.noResults", "No results found.") : t("discover.noWhiskies", "No whiskies yet.")}
                    </div>
                  )}

                  {visibleCount < distilleryGroups.length && (
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
                      {t("explore.loadMore", "Show more")} ({distilleryGroups.length - visibleCount} {t("explore.remaining", "remaining")})
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  )}
                </div>
                </>
                )}
              </div>
              )}
            </div>
          );
        }