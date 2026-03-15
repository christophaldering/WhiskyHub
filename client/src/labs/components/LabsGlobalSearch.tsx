import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Search, X, Clock, ChevronRight, Compass, Radar, BookOpen, Users,
  Wine, Building2, Star, MapPin, Sparkles, BarChart3, FlameKindling,
  Download, Settings, Heart, Mic, Layers, FileText, Map, Beaker,
  GraduationCap, Calendar, History, Activity, Info, Gift, Shield, Lock,
  ArrowRight,
} from "lucide-react";
import { distilleries, type Distillery } from "@/data/distilleries";
import { triggerHaptic } from "@/labs/hooks/useHaptic";
import { lexiconData, categoryLabelMap, type LexiconEntry, type LexiconCategory } from "@/labs/data/lexiconData";

interface SearchResult {
  id: string;
  category: "pages" | "whiskies" | "distilleries" | "lexicon";
  label: string;
  subtitle: string;
  route: string;
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  extra?: { rating?: number; region?: string };
}

interface WhiskyResult {
  id: number;
  name: string;
  distillery?: string;
  region?: string;
  avgOverall?: number;
}

const RECENT_KEY = "cs_labs_recent_searches";
const MAX_RECENT = 5;

interface PageEntry {
  label: string;
  labelDe: string;
  route: string;
  section: string;
  sectionDe: string;
  icon: React.ElementType;
  keywords?: string[];
}

const PAGES_REGISTRY: PageEntry[] = [
  { label: "Tastings", labelDe: "Tastings", route: "/labs/tastings", section: "Main", sectionDe: "Haupt", icon: Wine, keywords: ["sessions", "events"] },
  { label: "Explore", labelDe: "Entdecken", route: "/labs/explore", section: "Main", sectionDe: "Haupt", icon: Compass, keywords: ["search", "whiskies", "database", "suchen"] },
  { label: "Taste Hub", labelDe: "Geschmack", route: "/labs/taste", section: "Main", sectionDe: "Haupt", icon: Radar, keywords: ["profile", "analytics", "profil"] },
  { label: "Discover", labelDe: "Entdecken", route: "/labs/discover", section: "Main", sectionDe: "Haupt", icon: BookOpen, keywords: ["knowledge", "wissen"] },
  { label: "Circle", labelDe: "Circle", route: "/labs/circle", section: "Main", sectionDe: "Haupt", icon: Users, keywords: ["friends", "community", "freunde"] },
  { label: "Solo Tasting", labelDe: "Solo Verkostung", route: "/labs/solo", section: "Tasting", sectionDe: "Verkostung", icon: Wine, keywords: ["quick", "log", "dram", "schnell"] },
  { label: "Join Session", labelDe: "Session beitreten", route: "/labs/join", section: "Tasting", sectionDe: "Verkostung", icon: ArrowRight, keywords: ["code", "enter"] },
  { label: "Host a Tasting", labelDe: "Tasting hosten", route: "/labs/host", section: "Tasting", sectionDe: "Verkostung", icon: Sparkles, keywords: ["create", "new", "erstellen"] },
  { label: "Host Dashboard", labelDe: "Host Dashboard", route: "/labs/host/dashboard", section: "Tasting", sectionDe: "Verkostung", icon: Layers, keywords: ["manage", "control"] },
  { label: "Calendar", labelDe: "Kalender", route: "/labs/calendar", section: "Tasting", sectionDe: "Verkostung", icon: Calendar, keywords: ["schedule", "upcoming", "termine"] },
  { label: "Session History", labelDe: "Verlauf", route: "/labs/history", section: "Tasting", sectionDe: "Verkostung", icon: History, keywords: ["past", "archive", "vergangene"] },
  { label: "Flavor Profile", labelDe: "Geschmacksprofil", route: "/labs/taste/profile", section: "Taste", sectionDe: "Geschmack", icon: Radar, keywords: ["radar", "sweet spot", "style"] },
  { label: "Analytics", labelDe: "Statistiken", route: "/labs/taste/analytics", section: "Taste", sectionDe: "Geschmack", icon: BarChart3, keywords: ["trends", "evolution", "stats"] },
  { label: "Flavor Wheel", labelDe: "Aromarad", route: "/labs/taste/wheel", section: "Taste", sectionDe: "Geschmack", icon: FlameKindling, keywords: ["aroma", "distribution"] },
  { label: "Taste Compare", labelDe: "Geschmacksvergleich", route: "/labs/taste/compare", section: "Taste", sectionDe: "Geschmack", icon: BarChart3, keywords: ["community", "average"] },
  { label: "Recommendations", labelDe: "Empfehlungen", route: "/labs/taste/recommendations", section: "Taste", sectionDe: "Geschmack", icon: Sparkles, keywords: ["ai", "suggestions", "vorschläge"] },
  { label: "Pairings", labelDe: "Paarungen", route: "/labs/taste/pairings", section: "Taste", sectionDe: "Geschmack", icon: Heart, keywords: ["food", "essen"] },
  { label: "Benchmark", labelDe: "Benchmark", route: "/labs/taste/benchmark", section: "Taste", sectionDe: "Geschmack", icon: Beaker, keywords: ["ai", "metadata", "library"] },
  { label: "Collection Analysis", labelDe: "Sammlungsanalyse", route: "/labs/taste/collection-analysis", section: "Taste", sectionDe: "Geschmack", icon: BarChart3, keywords: ["cellar", "bottles", "flaschen"] },
  { label: "Connoisseur Report", labelDe: "Kenner-Report", route: "/labs/taste/connoisseur", section: "Taste", sectionDe: "Geschmack", icon: FileText, keywords: ["pdf", "identity", "report"] },
  { label: "AI Curation", labelDe: "AI Kuration", route: "/labs/taste/ai-curation", section: "Taste", sectionDe: "Geschmack", icon: Sparkles, keywords: ["lineup", "flight", "builder"] },
  { label: "My Drams", labelDe: "Meine Drams", route: "/labs/taste/drams", section: "Taste", sectionDe: "Geschmack", icon: Wine, keywords: ["journal", "notes", "notizen"] },
  { label: "My Collection", labelDe: "Meine Sammlung", route: "/labs/taste/collection", section: "Taste", sectionDe: "Geschmack", icon: Layers, keywords: ["bottles", "cellar", "flaschen"] },
  { label: "Wishlist", labelDe: "Wunschliste", route: "/labs/taste/wishlist", section: "Taste", sectionDe: "Geschmack", icon: Heart, keywords: ["want", "try", "wish"] },
  { label: "Downloads", labelDe: "Downloads", route: "/labs/taste/downloads", section: "Taste", sectionDe: "Geschmack", icon: Download, keywords: ["export", "data"] },
  { label: "Settings", labelDe: "Einstellungen", route: "/labs/taste/settings", section: "Taste", sectionDe: "Geschmack", icon: Settings, keywords: ["preferences", "config"] },
  { label: "Lexicon", labelDe: "Lexikon", route: "/labs/discover/lexicon", section: "Discover", sectionDe: "Entdecken", icon: BookOpen, keywords: ["dictionary", "terms", "begriffe", "wörterbuch"] },
  { label: "Distilleries", labelDe: "Brennereien", route: "/labs/discover/distilleries", section: "Discover", sectionDe: "Entdecken", icon: Building2, keywords: ["map", "karte"] },
  { label: "Bottlers", labelDe: "Abfüller", route: "/labs/discover/bottlers", section: "Discover", sectionDe: "Entdecken", icon: Building2, keywords: ["independent"] },
  { label: "Flavour Map", labelDe: "Aromenlandkarte", route: "/labs/discover/flavour-map", section: "Discover", sectionDe: "Entdecken", icon: Map, keywords: ["vocabulary", "compass", "radar", "vokabular"] },
  { label: "Tasting Guide", labelDe: "Verkostungsanleitung", route: "/labs/discover/guide", section: "Discover", sectionDe: "Entdecken", icon: GraduationCap, keywords: ["beginner", "how to", "anleitung"] },
  { label: "Templates", labelDe: "Vorlagen", route: "/labs/discover/templates", section: "Discover", sectionDe: "Entdecken", icon: FileText, keywords: ["sheets", "vocabulary"] },
  { label: "Rabbit Hole", labelDe: "Rabbit Hole", route: "/labs/discover/rabbit-hole", section: "Discover", sectionDe: "Entdecken", icon: Beaker, keywords: ["statistics", "models", "deep dive"] },
  { label: "Research", labelDe: "Forschung", route: "/labs/discover/research", section: "Discover", sectionDe: "Entdecken", icon: GraduationCap, keywords: ["science", "perception", "wissenschaft"] },
  { label: "Activity Feed", labelDe: "Aktivitäten", route: "/labs/activity", section: "Community", sectionDe: "Community", icon: Activity, keywords: ["feed", "friends"] },
  { label: "Community", labelDe: "Community", route: "/labs/community", section: "Community", sectionDe: "Community", icon: Users, keywords: ["members", "directory"] },
  { label: "About", labelDe: "Über uns", route: "/labs/about", section: "Info", sectionDe: "Info", icon: Info, keywords: ["story", "mission"] },
  { label: "Donate", labelDe: "Spenden", route: "/labs/donate", section: "Info", sectionDe: "Info", icon: Gift, keywords: ["support", "hospice"] },
  { label: "Impressum", labelDe: "Impressum", route: "/labs/impressum", section: "Info", sectionDe: "Info", icon: Shield, keywords: ["legal"] },
  { label: "Privacy", labelDe: "Datenschutz", route: "/labs/privacy", section: "Info", sectionDe: "Info", icon: Lock, keywords: ["data", "daten"] },
  { label: "Paper Scan", labelDe: "Papier-Scan", route: "/labs/paper-scan", section: "Tools", sectionDe: "Tools", icon: Mic, keywords: ["ocr", "import", "handwritten"] },
];

function getRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecent(query: string) {
  try {
    const list = getRecent().filter((q) => q !== query);
    list.unshift(query);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {}
}

function removeRecent(query: string) {
  try {
    const list = getRecent().filter((q) => q !== query);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}

interface LabsGlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export default function LabsGlobalSearch({ open, onClose }: LabsGlobalSearchProps) {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [whiskyResults, setWhiskyResults] = useState<WhiskyResult[]>([]);
  const [whiskyLoading, setWhiskyLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecent);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartY = useRef<number | null>(null);

  const lang = i18n.language?.startsWith("de") ? "de" : "en";
  const isDe = lang === "de";

  useEffect(() => {
    if (open) {
      setVisible(true);
      setExiting(false);
      setQuery("");
      setDebouncedQuery("");
      setWhiskyResults([]);
      setRecentSearches(getRecent());
      document.body.style.overflow = "hidden";
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      focusTimerRef.current = setTimeout(() => inputRef.current?.focus(), 100);
      window.history.pushState({ labsSearch: true }, "");
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setWhiskyResults([]);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setWhiskyLoading(true);

    fetch(`/api/labs/explore/whiskies?search=${encodeURIComponent(debouncedQuery)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: WhiskyResult[]) => {
        if (!controller.signal.aborted) {
          setWhiskyResults(data.slice(0, 5));
          setWhiskyLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setWhiskyResults([]);
          setWhiskyLoading(false);
        }
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  const pageResults = useMemo((): SearchResult[] => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return [];
    return PAGES_REGISTRY
      .filter((p) => {
        const label = (isDe ? p.labelDe : p.label).toLowerCase();
        const section = (isDe ? p.sectionDe : p.section).toLowerCase();
        const kw = (p.keywords || []).join(" ").toLowerCase();
        return label.includes(q) || section.includes(q) || kw.includes(q);
      })
      .slice(0, 5)
      .map((p) => ({
        id: `page-${p.route}`,
        category: "pages" as const,
        label: isDe ? p.labelDe : p.label,
        subtitle: isDe ? p.sectionDe : p.section,
        route: p.route,
        icon: p.icon,
        iconColor: "var(--labs-accent)",
        iconBg: "var(--labs-accent-muted)",
      }));
  }, [debouncedQuery, isDe]);

  const distilleryResults = useMemo((): SearchResult[] => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return [];
    return distilleries
      .filter((d: Distillery) =>
        d.name.toLowerCase().includes(q) ||
        d.region.toLowerCase().includes(q) ||
        d.country.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .map((d: Distillery) => ({
        id: `dist-${d.name}`,
        category: "distilleries" as const,
        label: d.name,
        subtitle: `${d.region}, ${d.country} · ${d.founded}`,
        route: "/labs/discover/distilleries",
        icon: Building2,
        iconColor: "var(--labs-info)",
        iconBg: "var(--labs-info-muted)",
      }));
  }, [debouncedQuery]);

  const lexiconResults = useMemo((): SearchResult[] => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return [];
    const categories = lexiconData[lang] ?? lexiconData.en;
    const catLabels = categoryLabelMap[lang] ?? categoryLabelMap.en;
    const results: SearchResult[] = [];
    for (const cat of categories) {
      for (const entry of cat.entries) {
        if (entry.term.toLowerCase().includes(q) || entry.definition.toLowerCase().includes(q)) {
          results.push({
            id: `lex-${cat.key}-${entry.term}`,
            category: "lexicon" as const,
            label: entry.term,
            subtitle: entry.definition.length > 60 ? entry.definition.slice(0, 57) + "..." : entry.definition,
            route: "/labs/discover/lexicon",
            icon: BookOpen,
            iconColor: "var(--labs-success)",
            iconBg: "var(--labs-success-muted)",
            extra: { region: catLabels[cat.key] },
          });
        }
        if (results.length >= 3) break;
      }
      if (results.length >= 3) break;
    }
    return results;
  }, [debouncedQuery, lang]);

  const whiskySearchResults = useMemo((): SearchResult[] => {
    return whiskyResults.map((w) => ({
      id: `whisky-${w.id}`,
      category: "whiskies" as const,
      label: w.name,
      subtitle: [w.distillery, w.region].filter(Boolean).join(" · ") || "",
      route: `/labs/explore/bottles/${w.id}`,
      icon: Wine,
      iconColor: "var(--labs-dim-nose)",
      iconBg: "rgba(201, 167, 108, 0.12)",
      extra: { rating: w.avgOverall ? Number(w.avgOverall) : undefined, region: w.region },
    }));
  }, [whiskyResults]);

  const allResults = useMemo(() => {
    const groups: { key: string; label: string; results: SearchResult[]; showAll?: { label: string; route: string } }[] = [];
    if (pageResults.length > 0) groups.push({ key: "pages", label: t("search.pages", "Pages & Features"), results: pageResults });
    if (whiskySearchResults.length > 0) groups.push({
      key: "whiskies",
      label: t("search.whiskies", "Whiskies"),
      results: whiskySearchResults,
      showAll: { label: t("search.showAllWhiskies", "Show all in Explore"), route: `/labs/explore?q=${encodeURIComponent(debouncedQuery)}` },
    });
    if (distilleryResults.length > 0) groups.push({ key: "distilleries", label: t("search.distilleries", "Distilleries"), results: distilleryResults });
    if (lexiconResults.length > 0) groups.push({ key: "lexicon", label: t("search.lexicon", "Lexicon"), results: lexiconResults });
    return groups;
  }, [pageResults, whiskySearchResults, distilleryResults, lexiconResults, debouncedQuery, t]);

  const firstResult = useMemo(() => {
    for (const g of allResults) {
      if (g.results.length > 0) return g.results[0];
    }
    return null;
  }, [allResults]);

  const handleClose = useCallback((fromPopState = false) => {
    setExiting(true);
    triggerHaptic("light");
    if (!fromPopState) {
      try { window.history.back(); } catch {}
    }
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setVisible(false);
      setExiting(false);
      onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handlePopState = () => {
      handleClose(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [open, handleClose]);

  const handleNavigate = useCallback((route: string) => {
    if (query.trim()) saveRecent(query.trim());
    triggerHaptic("light");
    setExiting(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setVisible(false);
      setExiting(false);
      onClose();
      navigate(route);
    }, 300);
  }, [query, navigate, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    } else if (e.key === "Enter" && firstResult) {
      e.preventDefault();
      handleNavigate(firstResult.route);
    }
  }, [handleClose, firstResult, handleNavigate]);

  const handleRemoveRecent = useCallback((q: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeRecent(q);
    setRecentSearches(getRecent());
    triggerHaptic("light");
  }, []);

  const handleClearAllRecent = useCallback(() => {
    try { localStorage.removeItem(RECENT_KEY); } catch {}
    setRecentSearches([]);
    triggerHaptic("light");
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (deltaY > 100) {
      handleClose();
    }
  }, [handleClose]);

  const [swipingRecent, setSwipingRecent] = useState<{ index: number; startX: number; offsetX: number } | null>(null);

  const handleRecentTouchStart = useCallback((index: number, e: React.TouchEvent) => {
    setSwipingRecent({ index, startX: e.touches[0].clientX, offsetX: 0 });
  }, []);

  const handleRecentTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipingRecent) return;
    const dx = e.touches[0].clientX - swipingRecent.startX;
    setSwipingRecent((prev) => prev ? { ...prev, offsetX: Math.min(0, dx) } : null);
  }, [swipingRecent]);

  const handleRecentTouchEnd = useCallback((q: string) => {
    if (!swipingRecent) return;
    if (swipingRecent.offsetX < -80) {
      removeRecent(q);
      setRecentSearches(getRecent());
      triggerHaptic("light");
    }
    setSwipingRecent(null);
  }, [swipingRecent]);

  const hasQuery = debouncedQuery.length >= 2;
  const hasResults = allResults.some((g) => g.results.length > 0);
  const isSearching = hasQuery && whiskyLoading;

  if (!open && !visible) return null;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "var(--labs-bg)",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "translateY(8px)" : "translateY(0)",
        transition: "opacity 300ms cubic-bezier(0.2, 0.8, 0.4, 1), transform 300ms cubic-bezier(0.2, 0.8, 0.4, 1)",
        animation: !exiting ? "labsSearchIn 300ms cubic-bezier(0.2, 0.8, 0.4, 1) both" : undefined,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      data-testid="labs-global-search-overlay"
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          background: "var(--labs-header-bg)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--labs-border-subtle)",
          padding: "12px 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              flex: 1,
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search
              style={{
                position: "absolute",
                left: 14,
                width: 18,
                height: 18,
                color: query ? "var(--labs-accent)" : "var(--labs-text-muted)",
                transition: "color 200ms ease",
                pointerEvents: "none",
              }}
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("search.placeholder", isDe ? "Whiskys, Seiten, Begriffe suchen..." : "Search whiskies, pages, terms...")}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              style={{
                flex: 1,
                background: "var(--labs-surface)",
                border: "1px solid var(--labs-border)",
                borderRadius: 14,
                color: "var(--labs-text)",
                fontSize: 17,
                fontFamily: "inherit",
                fontWeight: 400,
                padding: "14px 44px 14px 44px",
                outline: "none",
                transition: "border-color 200ms ease, box-shadow 200ms ease",
                caretColor: "var(--labs-accent)",
                WebkitAppearance: "none",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--labs-accent)";
                e.target.style.boxShadow = "0 0 0 3px var(--labs-accent-glow)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--labs-border)";
                e.target.style.boxShadow = "none";
              }}
              data-testid="input-global-search"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); inputRef.current?.focus(); triggerHaptic("light"); }}
                style={{
                  position: "absolute",
                  right: 4,
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "transparent",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--labs-text-muted)",
                  transition: "background 150ms ease",
                }}
                data-testid="button-clear-search"
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>
          <button
            onClick={handleClose}
            style={{
              flexShrink: 0,
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--labs-surface-elevated)",
              border: "1px solid var(--labs-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--labs-text-secondary)",
              transition: "background 150ms ease, transform 160ms cubic-bezier(0.2, 0.8, 0.4, 1)",
            }}
            data-testid="button-close-search"
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          padding: "8px 16px 32px",
        }}
      >
        {!hasQuery && recentSearches.length > 0 && (
          <div style={{ marginBottom: 24, animation: "labsFadeIn 300ms cubic-bezier(0.2, 0.8, 0.4, 1) both" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
                paddingLeft: 4,
                paddingRight: 4,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--labs-text-muted)",
                }}
              >
                {t("search.recent", isDe ? "Letzte Suchen" : "Recent")}
              </span>
              <button
                onClick={handleClearAllRecent}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--labs-accent)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 6,
                  fontFamily: "inherit",
                  minHeight: 44,
                  display: "flex",
                  alignItems: "center",
                }}
                data-testid="button-clear-all-recent"
              >
                {t("search.clearAll", isDe ? "Alle löschen" : "Clear all")}
              </button>
            </div>
            {recentSearches.map((q, i) => {
              const isSwiping = swipingRecent?.index === i;
              const offset = isSwiping ? swipingRecent.offsetX : 0;
              return (
                <div
                  key={q}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    borderRadius: 12,
                    animation: `labsFadeIn 300ms cubic-bezier(0.2, 0.8, 0.4, 1) ${i * 50}ms both`,
                  }}
                >
                  {offset < 0 && (
                    <div style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: Math.abs(offset),
                      background: "var(--labs-danger, #e74c3c)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "0 12px 12px 0",
                    }}>
                      <X style={{ width: 16, height: 16, color: "#fff" }} />
                    </div>
                  )}
                  <div
                    onClick={() => { setQuery(q); triggerHaptic("light"); }}
                    onTouchStart={(e) => handleRecentTouchStart(i, e)}
                    onTouchMove={handleRecentTouchMove}
                    onTouchEnd={() => handleRecentTouchEnd(q)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 8px",
                      cursor: "pointer",
                      minHeight: 44,
                      transition: isSwiping ? "none" : "background 150ms ease, transform 200ms ease",
                      transform: `translateX(${offset}px)`,
                      background: "var(--labs-bg)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--labs-surface)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "var(--labs-bg)")}
                    data-testid={`search-recent-${i}`}
                  >
                    <Clock style={{ width: 15, height: 15, color: "var(--labs-text-muted)", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 15, color: "var(--labs-text-secondary)" }}>{q}</span>
                    <button
                      onClick={(e) => handleRemoveRecent(q, e)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: "transparent",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "var(--labs-text-muted)",
                        flexShrink: 0,
                      }}
                      data-testid={`button-remove-recent-${i}`}
                    >
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!hasQuery && recentSearches.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 24px",
              animation: "labsFadeIn 400ms cubic-bezier(0.2, 0.8, 0.4, 1) both",
            }}
          >
            <Search style={{ width: 40, height: 40, color: "var(--labs-text-muted)", opacity: 0.3, marginBottom: 16 }} />
            <p style={{ fontSize: 15, fontWeight: 500, color: "var(--labs-text-secondary)", margin: 0, textAlign: "center" }}>
              {t("search.hint", isDe ? "Whiskys, Seiten, Brennereien oder Begriffe finden" : "Find whiskies, pages, distilleries, or terms")}
            </p>
          </div>
        )}

        {hasQuery && isSearching && !hasResults && (
          <div style={{ padding: "40px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 24, height: 24, border: "2px solid var(--labs-border)", borderTopColor: "var(--labs-accent)", borderRadius: "50%", animation: "labsSearchSpin 600ms linear infinite" }} />
          </div>
        )}

        {hasQuery && !isSearching && !hasResults && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 24px",
              animation: "labsFadeIn 300ms cubic-bezier(0.2, 0.8, 0.4, 1) both",
            }}
            data-testid="search-empty-state"
          >
            <Search style={{ width: 40, height: 40, color: "var(--labs-text-muted)", opacity: 0.2, marginBottom: 16 }} />
            <p style={{ fontSize: 15, fontWeight: 500, color: "var(--labs-text-secondary)", margin: "0 0 4px", textAlign: "center" }}>
              {t("search.noResults", isDe ? "Nichts gefunden" : "Nothing found")}
            </p>
            <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: 0, textAlign: "center" }}>
              {t("search.noResultsHint", isDe ? "Versuch andere Begriffe" : "Try different terms")}
            </p>
          </div>
        )}

        {hasQuery && hasResults && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {allResults.map((group, gi) => (
              <div
                key={group.key}
                style={{ animation: `labsFadeIn 300ms cubic-bezier(0.2, 0.8, 0.4, 1) ${gi * 60}ms both` }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "var(--labs-text-muted)",
                    marginBottom: 6,
                    paddingLeft: 4,
                  }}
                >
                  {group.label}
                </div>
                <div
                  style={{
                    background: "var(--labs-surface)",
                    borderRadius: 14,
                    border: "1px solid var(--labs-border-subtle)",
                    overflow: "hidden",
                  }}
                >
                  {group.results.map((result, ri) => {
                    const Icon = result.icon;
                    return (
                      <div
                        key={result.id}
                        onClick={() => handleNavigate(result.route)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 14px",
                          cursor: "pointer",
                          minHeight: 48,
                          borderBottom: ri < group.results.length - 1 ? "1px solid var(--labs-border-subtle)" : "none",
                          transition: "background 150ms ease, transform 100ms ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--labs-surface-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        onTouchStart={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                        onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        data-testid={`search-result-${result.id}`}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: result.iconBg || "var(--labs-accent-muted)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon style={{ width: 18, height: 18, color: result.iconColor || "var(--labs-accent)" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 600,
                              color: "var(--labs-text)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {result.label}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
                            <span
                              style={{
                                fontSize: 12,
                                color: "var(--labs-text-muted)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {result.subtitle}
                            </span>
                            {result.extra?.region && result.category === "whiskies" && (
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "var(--labs-accent-muted)", color: "var(--labs-accent)", flexShrink: 0 }}>
                                {result.extra.region}
                              </span>
                            )}
                            {result.extra?.region && result.category === "lexicon" && (
                              <span style={{ fontSize: 10, fontWeight: 500, padding: "1px 6px", borderRadius: 4, background: "var(--labs-success-muted)", color: "var(--labs-success)", flexShrink: 0 }}>
                                {result.extra.region}
                              </span>
                            )}
                          </div>
                        </div>
                        {result.extra?.rating && result.extra.rating > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                            <Star style={{ width: 13, height: 13, color: "var(--labs-accent)" }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-accent)" }}>{result.extra.rating.toFixed(1)}</span>
                          </div>
                        )}
                        <ChevronRight style={{ width: 14, height: 14, color: "var(--labs-text-muted)", opacity: 0.4, flexShrink: 0 }} />
                      </div>
                    );
                  })}
                </div>
                {group.showAll && (
                  <button
                    onClick={() => handleNavigate(group.showAll!.route)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      width: "100%",
                      padding: "10px",
                      marginTop: 6,
                      background: "transparent",
                      border: "none",
                      borderRadius: 10,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--labs-accent)",
                      fontFamily: "inherit",
                      transition: "background 150ms ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--labs-accent-muted)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    data-testid={`search-show-all-${group.key}`}
                  >
                    {group.showAll.label}
                    <ArrowRight style={{ width: 14, height: 14 }} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes labsSearchIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes labsSearchSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
