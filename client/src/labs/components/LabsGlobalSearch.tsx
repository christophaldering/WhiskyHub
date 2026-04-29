import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Search, X, Clock, ChevronRight, Compass, Radar, BookOpen, Users,
  Wine, Building2, Star, MapPin, Sparkles, BarChart3, FlameKindling,
  Download, Settings, Heart, Mic, Layers, FileText, Map, Beaker,
  GraduationCap, Calendar, History, Activity, Info, Gift, Shield, Lock,
  ArrowRight, MessageCircle, Loader2, Check, Minus,
} from "lucide-react";
import { triggerHaptic } from "@/labs/hooks/useHaptic";
import StatsChartCard, { type StatsToolPayload } from "./StatsChartCard";

interface SearchResult {
  id: string;
  category: "pages" | "whiskies" | "tastings" | "distilleries" | "lexicon";
  label: string;
  subtitle: string;
  snippet?: string;
  route: string;
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  extra?: { rating?: number; region?: string };
}

interface BackendHit {
  type: "whisky" | "tasting" | "distillery" | "lexicon";
  id: string | number;
  title: string;
  subtitle: string | null;
  snippet: string | null;
  score: number;
  meta: Record<string, unknown>;
}

interface BackendResponse {
  query: string;
  locale?: string;
  embeddingUsed?: boolean;
  counts: { whisky: number; tasting: number; distillery: number; lexicon: number };
  results: BackendHit[];
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

function getPagesRegistry(t: (key: string) => string): PageEntry[] {
  return [
    { label: t("globalSearchUi.tastings"), labelDe: "Tastings", route: "/labs/tastings", section: t("globalSearchUi.sectionMain"), sectionDe: "Haupt", icon: Wine, keywords: ["sessions", "events", "präsentation", "presentation", "rückblick", "recap", "auswertung", "results", "ergebnisse", "persönlich", "personal", "host-aktionen", "host actions", "reveal", "enthüllen"] },
    { label: t("globalSearchUi.explore"), labelDe: "Entdecken", route: "/labs/explore", section: t("globalSearchUi.sectionMain"), sectionDe: "Haupt", icon: Compass, keywords: ["search", "whiskies", "database", "suchen"] },
    { label: t("globalSearchUi.tasteHub"), labelDe: "Geschmack", route: "/labs/taste", section: t("globalSearchUi.sectionMain"), sectionDe: "Haupt", icon: Radar, keywords: ["profile", "analytics", "profil"] },
    { label: t("globalSearchUi.discover"), labelDe: "Entdecken", route: "/labs/discover", section: t("globalSearchUi.sectionMain"), sectionDe: "Haupt", icon: BookOpen, keywords: ["knowledge", "wissen"] },
    { label: t("globalSearchUi.circle"), labelDe: "Circle", route: "/labs/circle", section: t("globalSearchUi.sectionMain"), sectionDe: "Haupt", icon: Users, keywords: ["friends", "community", "freunde"] },
    { label: t("globalSearchUi.soloTasting"), labelDe: "Solo Verkostung", route: "/labs/solo", section: t("globalSearchUi.sectionTasting"), sectionDe: "Verkostung", icon: Wine, keywords: ["quick", "log", "dram", "schnell"] },
    { label: t("globalSearchUi.joinSession"), labelDe: "Session beitreten", route: "/labs/join", section: t("globalSearchUi.sectionTasting"), sectionDe: "Verkostung", icon: ArrowRight, keywords: ["code", "enter"] },
    { label: t("globalSearchUi.hostATasting"), labelDe: "Tasting hosten", route: "/labs/host", section: t("globalSearchUi.sectionTasting"), sectionDe: "Verkostung", icon: Sparkles, keywords: ["create", "new", "erstellen"] },
    { label: t("globalSearchUi.hostDashboard"), labelDe: "Host Dashboard", route: "/labs/host/dashboard", section: t("globalSearchUi.sectionTasting"), sectionDe: "Verkostung", icon: Layers, keywords: ["manage", "control"] },
    { label: t("globalSearchUi.calendar"), labelDe: "Kalender", route: "/labs/calendar", section: t("globalSearchUi.sectionTasting"), sectionDe: "Verkostung", icon: Calendar, keywords: ["schedule", "upcoming", "termine"] },
    { label: t("globalSearchUi.archive"), labelDe: "Archiv", route: "/labs/history", section: t("globalSearchUi.sectionTasting"), sectionDe: "Verkostung", icon: History, keywords: ["past", "archive", "vergangene", "insights", "analytics", "history", "verlauf"] },
    { label: t("globalSearchUi.flavorProfile"), labelDe: "Geschmacksprofil", route: "/labs/taste/profile", section: t("globalSearchUi.sectionTaste"), sectionDe: "Geschmack", icon: Radar, keywords: ["radar", "sweet spot", "style"] },
    { label: t("globalSearchUi.analytics"), labelDe: "Statistiken", route: "/labs/taste/analytics", section: t("globalSearchUi.sectionTaste"), sectionDe: "Geschmack", icon: BarChart3, keywords: ["trends", "evolution", "stats"] },
    { label: t("globalSearchUi.flavorWheel"), labelDe: "Aromarad", route: "/labs/taste/wheel", section: t("globalSearchUi.sectionTaste"), sectionDe: "Geschmack", icon: FlameKindling, keywords: ["aroma", "distribution"] },
    { label: t("globalSearchUi.tasteCompare"), labelDe: "Geschmacksvergleich", route: "/labs/taste/compare", section: t("globalSearchUi.sectionTaste"), sectionDe: "Geschmack", icon: BarChart3, keywords: ["community", "average"] },
    { label: t("globalSearchUi.recommendations"), labelDe: "Empfehlungen", route: "/labs/taste/recommendations", section: t("globalSearchUi.sectionTaste"), sectionDe: "Geschmack", icon: Sparkles, keywords: ["ai", "suggestions", "vorschläge"] },
    { label: t("globalSearchUi.pairings"), labelDe: "Paarungen", route: "/labs/taste/pairings", section: t("globalSearchUi.sectionTaste"), sectionDe: "Geschmack", icon: Heart, keywords: ["food", "essen"] },
    { label: t("globalSearchUi.benchmark"), labelDe: "Benchmark", route: "/labs/taste/benchmark", section: t("globalSearchUi.sectionTaste"), sectionDe: "Geschmack", icon: Beaker, keywords: ["ai", "metadata", "library"] },
    { label: t("globalSearchUi.collectionAnalysis"), labelDe: "Sammlungsanalyse", route: "/labs/taste/collection-analysis", section: t("globalSearchUi.sectionTaste"), sectionDe: "Geschmack", icon: BarChart3, keywords: ["cellar", "bottles", "flaschen"] },
    { label: t("globalSearchUi.palateLetter"), labelDe: "Palate Letter", route: "/labs/taste/connoisseur", section: t("globalSearchUi.sectionTaste"), sectionDe: "Geschmack", icon: FileText, keywords: ["pdf", "identity", "report", "letter", "connoisseur"] },
    { label: t("globalSearchUi.aiCuration"), labelDe: "AI Kuration", route: "/labs/taste/ai-curation", section: t("globalSearchUi.sectionTaste"), sectionDe: "Geschmack", icon: Sparkles, keywords: ["lineup", "flight", "builder"] },
    { label: t("globalSearchUi.myDrams"), labelDe: "Meine Drams", route: "/labs/taste/drams", section: t("globalSearchUi.sectionTaste"), sectionDe: "Geschmack", icon: Wine, keywords: ["journal", "notes", "notizen"] },
    { label: t("globalSearchUi.myCollection"), labelDe: "Meine Sammlung", route: "/labs/taste/collection", section: t("globalSearchUi.sectionTaste"), sectionDe: "Geschmack", icon: Layers, keywords: ["bottles", "cellar", "flaschen"] },
    { label: t("globalSearchUi.wishlist"), labelDe: "Wunschliste", route: "/labs/taste/wishlist", section: t("globalSearchUi.sectionTaste"), sectionDe: "Geschmack", icon: Heart, keywords: ["want", "try", "wish"] },
    { label: t("globalSearchUi.downloads"), labelDe: "Downloads", route: "/labs/taste/downloads", section: t("globalSearchUi.sectionTaste"), sectionDe: "Geschmack", icon: Download, keywords: ["export", "data", "präsentation", "presentation", "pdf", "deck", "slides", "story", "report", "podium"] },
    { label: t("globalSearchUi.settings"), labelDe: "Einstellungen", route: "/labs/taste/settings", section: t("globalSearchUi.sectionTaste"), sectionDe: "Geschmack", icon: Settings, keywords: ["preferences", "config"] },
    { label: t("globalSearchUi.lexicon"), labelDe: "Lexikon", route: "/labs/discover/lexicon", section: t("globalSearchUi.sectionDiscover"), sectionDe: "Entdecken", icon: BookOpen, keywords: ["dictionary", "terms", "begriffe", "wörterbuch"] },
    { label: t("globalSearchUi.distilleries"), labelDe: "Brennereien", route: "/labs/discover/distilleries", section: t("globalSearchUi.sectionDiscover"), sectionDe: "Entdecken", icon: Building2, keywords: ["map", "karte"] },
    { label: t("globalSearchUi.bottlers"), labelDe: "Abfüller", route: "/labs/discover/bottlers", section: t("globalSearchUi.sectionDiscover"), sectionDe: "Entdecken", icon: Building2, keywords: ["independent"] },
    { label: t("globalSearchUi.flavourMap"), labelDe: "Aromenlandkarte", route: "/labs/discover/flavour-map", section: t("globalSearchUi.sectionDiscover"), sectionDe: "Entdecken", icon: Map, keywords: ["vocabulary", "compass", "radar", "vokabular"] },
    { label: t("globalSearchUi.tastingGuide"), labelDe: "Verkostungsanleitung", route: "/labs/discover/guide", section: t("globalSearchUi.sectionDiscover"), sectionDe: "Entdecken", icon: GraduationCap, keywords: ["beginner", "how to", "anleitung"] },
    { label: t("globalSearchUi.templates"), labelDe: "Vorlagen", route: "/labs/discover/templates", section: t("globalSearchUi.sectionDiscover"), sectionDe: "Entdecken", icon: FileText, keywords: ["sheets", "vocabulary"] },
    { label: t("globalSearchUi.rabbitHole"), labelDe: "Rabbit Hole", route: "/labs/discover/rabbit-hole/themenspeicher", section: t("globalSearchUi.sectionDiscover"), sectionDe: "Entdecken", icon: Beaker, keywords: ["statistics", "models", "deep dive"] },
    { label: t("globalSearchUi.research"), labelDe: "Forschung", route: "/labs/discover/research", section: t("globalSearchUi.sectionDiscover"), sectionDe: "Entdecken", icon: GraduationCap, keywords: ["science", "perception", "wissenschaft"] },
    { label: t("globalSearchUi.activityFeed"), labelDe: "Aktivitäten", route: "/labs/activity", section: t("globalSearchUi.sectionCommunity"), sectionDe: "Community", icon: Activity, keywords: ["feed", "friends"] },
    { label: t("globalSearchUi.community"), labelDe: "Community", route: "/labs/community", section: t("globalSearchUi.sectionCommunity"), sectionDe: "Community", icon: Users, keywords: ["members", "directory"] },
    { label: t("globalSearchUi.about"), labelDe: "Über uns", route: "/labs/about", section: t("globalSearchUi.sectionInfo"), sectionDe: "Info", icon: Info, keywords: ["story", "mission", "support", "donate", "spenden", "hospice", "hospiz"] },
    { label: t("globalSearchUi.impressum"), labelDe: "Impressum", route: "/labs/impressum", section: t("globalSearchUi.sectionInfo"), sectionDe: "Info", icon: Shield, keywords: ["legal"] },
    { label: t("globalSearchUi.privacy"), labelDe: "Datenschutz", route: "/labs/privacy", section: t("globalSearchUi.sectionInfo"), sectionDe: "Info", icon: Lock, keywords: ["data", "daten"] },
    { label: t("globalSearchUi.termsOfUse"), labelDe: "Nutzungsbedingungen", route: "/labs/terms", section: t("globalSearchUi.sectionInfo"), sectionDe: "Info", icon: FileText, keywords: ["terms", "agb", "conditions", "nutzungsbedingungen", "copyright"] },
    { label: t("globalSearchUi.paperScan"), labelDe: "Papier-Scan", route: "/labs/paper-scan", section: t("globalSearchUi.sectionTools"), sectionDe: "Tools", icon: Mic, keywords: ["ocr", "import", "handwritten"] },
  ];
}

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

interface AskSource {
  type: "whisky" | "tasting" | "distillery" | "lexicon";
  id: string;
  title: string;
  subtitle?: string;
  route: string;
}

type KnowledgeMode = "user_data" | "general" | "mixed";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: AskSource[];
  truncated?: boolean;
  knowledgeMode?: KnowledgeMode;
  toolPayloads?: StatsToolPayload[];
}

type SearchMode = "search" | "ask";

interface LabsGlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export default function LabsGlobalSearch({ open, onClose }: LabsGlobalSearchProps) {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [serverHits, setServerHits] = useState<BackendHit[]>([]);
  const [serverLoading, setServerLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecent);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartY = useRef<number | null>(null);

  const [mode, setMode] = useState<SearchMode>("search");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const askAbortRef = useRef<AbortController | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const lastUserMsgRef = useRef<HTMLDivElement | null>(null);
  const prevMsgCountRef = useRef(0);

  const lang = i18n.language?.startsWith("de") ? "de" : "en";
  const isDe = lang === "de";

  useEffect(() => {
    if (open) {
      setVisible(true);
      setExiting(false);
      setQuery("");
      setDebouncedQuery("");
      setServerHits([]);
      setRecentSearches(getRecent());
      setMode("search");
      setChatMessages([]);
      setStreamingText("");
      setStreamError(null);
      setIsStreaming(false);
      askAbortRef.current?.abort();
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
      askAbortRef.current?.abort();
      abortRef.current?.abort();
    };
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (mode !== "search") {
      setServerHits([]);
      setServerLoading(false);
      abortRef.current?.abort();
      return;
    }
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setServerHits([]);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setServerLoading(true);

    const pid = sessionStorage.getItem("session_pid") || localStorage.getItem("casksense_participant_id");
    const headers: Record<string, string> = {};
    if (pid) headers["x-participant-id"] = pid;

    fetch(
      `/api/labs/search?q=${encodeURIComponent(debouncedQuery)}&locale=${lang}&types=whisky,tasting,distillery,lexicon&limit=6`,
      { signal: controller.signal, headers },
    )
      .then((r) => r.json())
      .then((data: BackendResponse) => {
        if (!controller.signal.aborted) {
          setServerHits(Array.isArray(data?.results) ? data.results : []);
          setServerLoading(false);
          if (pid) {
            fetch("/api/analytics/search-log", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-participant-id": pid },
              body: JSON.stringify({
                participantId: pid,
                query: debouncedQuery,
                resultCount: data?.results?.length ?? 0,
                context: "global-search",
              }),
            }).catch(() => {});
          }
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setServerHits([]);
          setServerLoading(false);
        }
      });

    return () => controller.abort();
  }, [debouncedQuery, lang, mode]);

  useEffect(() => {
    const prevCount = prevMsgCountRef.current;
    const newCount = chatMessages.length;
    prevMsgCountRef.current = newCount;

    if (newCount === 0) {
      return;
    }

    const container = chatScrollRef.current;
    if (!container) return;

    if (prevCount === 0 && newCount > 0) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
      return;
    }

    const grew = newCount > prevCount;
    if (!grew) return;

    const last = chatMessages[newCount - 1];
    if (last.role !== "user") return;

    const node = lastUserMsgRef.current;
    if (!node) return;

    requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      const offset = nodeRect.top - containerRect.top + container.scrollTop - 12;
      const target = Math.max(0, offset);
      container.scrollTo({ top: target, behavior: "smooth" });
    });
  }, [chatMessages]);

  useEffect(() => {
    if (mode !== "ask") {
      askAbortRef.current?.abort();
    }
  }, [mode]);

  const sendAsk = useCallback(async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || isStreaming) return;

    const historyForRequest = chatMessages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
    const userMsg: ChatMessage = { role: "user", content: question };
    setChatMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setStreamingText("");
    setStreamError(null);
    setIsStreaming(true);
    triggerHaptic("light");

    askAbortRef.current?.abort();
    const controller = new AbortController();
    askAbortRef.current = controller;

    const pid = sessionStorage.getItem("session_pid") || localStorage.getItem("casksense_participant_id");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (pid) headers["x-participant-id"] = pid;

    try {
      const res = await fetch("/api/labs/ask", {
        method: "POST",
        headers,
        body: JSON.stringify({
          question,
          locale: lang,
          conversationHistory: historyForRequest,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data?.message === "string"
          ? data.message
          : (isDe ? "Antwort konnte nicht geladen werden." : "Failed to load answer.");
        throw new Error(msg);
      }
      if (!res.body) {
        throw new Error(isDe ? "Keine Antwort vom Server." : "No response body.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let finalSources: AskSource[] | undefined;
      let finalKnowledgeMode: KnowledgeMode | undefined;
      let finalToolPayloads: StatsToolPayload[] | undefined;
      let streamErr: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload) continue;
          try {
            const evt = JSON.parse(payload) as { delta?: string; done?: boolean; sources?: AskSource[]; knowledgeMode?: string; toolPayloads?: StatsToolPayload[]; error?: string };
            if (typeof evt.delta === "string") {
              accumulated += evt.delta;
              setStreamingText(accumulated);
            } else if (evt.done) {
              if (Array.isArray(evt.sources)) finalSources = evt.sources;
              if (evt.knowledgeMode === "user_data" || evt.knowledgeMode === "general" || evt.knowledgeMode === "mixed") {
                finalKnowledgeMode = evt.knowledgeMode;
              }
              if (Array.isArray(evt.toolPayloads)) {
                finalToolPayloads = evt.toolPayloads.filter(
                  (p): p is StatsToolPayload =>
                    !!p && typeof p === "object" && typeof (p as StatsToolPayload).name === "string",
                );
              }
            } else if (evt.error) {
              streamErr = String(evt.error);
            }
          } catch {
            continue;
          }
        }
      }

      if (streamErr && !accumulated) {
        throw new Error(streamErr);
      }

      const truncated = streamErr !== null;
      setChatMessages((prev) => [...prev, { role: "assistant", content: accumulated, sources: finalSources, truncated, knowledgeMode: finalKnowledgeMode, toolPayloads: finalToolPayloads }]);
      setStreamingText("");
      if (truncated && streamErr) {
        setStreamError(streamErr);
      }
      triggerHaptic("medium");
    } catch (err) {
      const error = err as { name?: string; message?: string };
      if (error.name === "AbortError") {
        setStreamingText("");
        return;
      }
      setStreamError(error.message ?? (isDe ? "Unbekannter Fehler." : "Unknown error."));
      setStreamingText("");
    } finally {
      setIsStreaming(false);
    }
  }, [chatMessages, isDe, isStreaming, lang]);

  const handleSourceClick = useCallback((source: AskSource) => {
    triggerHaptic("light");
    setExiting(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      onClose();
      navigate(source.route);
    }, 200);
  }, [navigate, onClose]);

  const pageResults = useMemo((): SearchResult[] => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return [];
    return getPagesRegistry(t)
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
  }, [debouncedQuery, isDe, t]);

  const whiskySearchResults = useMemo((): SearchResult[] => {
    return serverHits
      .filter((h) => h.type === "whisky")
      .map((h) => {
        const meta = h.meta || {};
        const region = typeof meta.region === "string" ? meta.region : undefined;
        return {
          id: `whisky-${h.id}`,
          category: "whiskies" as const,
          label: String(h.title ?? ""),
          subtitle: String(h.subtitle ?? ""),
          snippet: h.snippet ?? undefined,
          route: `/labs/explore/bottles/${h.id}`,
          icon: Wine,
          iconColor: "var(--labs-dim-nose)",
          iconBg: "rgba(201, 167, 108, 0.12)",
          extra: { region },
        };
      });
  }, [serverHits]);

  const tastingResults = useMemo((): SearchResult[] => {
    return serverHits
      .filter((h) => h.type === "tasting")
      .map((h) => ({
        id: `tasting-${h.id}`,
        category: "tastings" as const,
        label: String(h.title ?? ""),
        subtitle: String(h.subtitle ?? ""),
        snippet: h.snippet ?? undefined,
        route: `/labs/tastings/${h.id}`,
        icon: Wine,
        iconColor: "var(--labs-accent)",
        iconBg: "var(--labs-accent-muted)",
      }));
  }, [serverHits]);

  const distilleryResults = useMemo((): SearchResult[] => {
    return serverHits
      .filter((h) => h.type === "distillery")
      .map((h) => {
        const meta = h.meta || {};
        const region = typeof meta.region === "string" ? meta.region : undefined;
        return {
          id: `dist-${h.id}`,
          category: "distilleries" as const,
          label: String(h.title ?? ""),
          subtitle: String(h.subtitle ?? ""),
          snippet: h.snippet ?? undefined,
          route: `/labs/discover/distilleries?focus=${encodeURIComponent(String(h.title ?? ""))}`,
          icon: Building2,
          iconColor: "var(--labs-info)",
          iconBg: "var(--labs-info-muted)",
          extra: { region },
        };
      });
  }, [serverHits]);

  const lexiconResults = useMemo((): SearchResult[] => {
    return serverHits
      .filter((h) => h.type === "lexicon")
      .map((h) => {
        const meta = h.meta || {};
        const category = typeof meta.category === "string" ? meta.category : undefined;
        return {
          id: `lex-${h.id}`,
          category: "lexicon" as const,
          label: String(h.title ?? ""),
          subtitle: String(h.snippet ?? h.subtitle ?? ""),
          route: `/labs/discover/lexicon?term=${encodeURIComponent(String(h.title ?? ""))}`,
          icon: BookOpen,
          iconColor: "var(--labs-success)",
          iconBg: "var(--labs-success-muted)",
          extra: { region: category },
        };
      });
  }, [serverHits]);

  const allResults = useMemo(() => {
    const groups: { key: string; label: string; results: SearchResult[]; showAll?: { label: string; route: string } }[] = [];
    if (pageResults.length > 0) groups.push({ key: "pages", label: t("search.pages", "Pages & Features"), results: pageResults });
    if (whiskySearchResults.length > 0) groups.push({
      key: "whiskies",
      label: t("search.whiskies", "Whiskies"),
      results: whiskySearchResults,
      showAll: { label: t("search.showAllWhiskies", "Show all in Explore"), route: `/labs/explore?q=${encodeURIComponent(debouncedQuery)}` },
    });
    if (tastingResults.length > 0) groups.push({
      key: "tastings",
      label: t("search.tastings", isDe ? "Tastings" : "Tastings"),
      results: tastingResults,
      showAll: { label: t("search.showAllTastings", isDe ? "Alle Tastings" : "Show all tastings"), route: `/labs/tastings` },
    });
    if (distilleryResults.length > 0) groups.push({ key: "distilleries", label: t("search.distilleries", "Distilleries"), results: distilleryResults });
    if (lexiconResults.length > 0) groups.push({ key: "lexicon", label: t("search.lexicon", "Lexicon"), results: lexiconResults });
    return groups;
  }, [pageResults, whiskySearchResults, tastingResults, distilleryResults, lexiconResults, debouncedQuery, t, isDe]);

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
      return;
    }
    if (e.key === "Enter") {
      if (mode === "ask") {
        if (query.trim() && !isStreaming) {
          e.preventDefault();
          void sendAsk(query);
        }
      } else if (firstResult) {
        e.preventDefault();
        handleNavigate(firstResult.route);
      }
    }
  }, [handleClose, firstResult, handleNavigate, mode, query, isStreaming, sendAsk]);

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

  const handleHeaderTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      touchStartY.current = null;
      return;
    }
    const target = e.target as HTMLElement | null;
    if (target && target.closest('input, textarea, button, [role="button"]')) {
      touchStartY.current = null;
      return;
    }
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleHeaderTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (deltaY > 120) {
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

  const hasQuery = debouncedQuery.length >= 1;
  const hasResults = allResults.some((g) => g.results.length > 0);
  const isSearching = hasQuery && serverLoading;

  if (!open && !visible) return null;

  return (
    <div
      ref={(el) => {
        if (el) {
          el.style.setProperty("height", "100dvh");
        }
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        height: "100vh",
        zIndex: 60,
        background: "var(--labs-bg)",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "translateY(8px)" : "translateY(0)",
        transition: "opacity 300ms cubic-bezier(0.2, 0.8, 0.4, 1), transform 300ms cubic-bezier(0.2, 0.8, 0.4, 1)",
        animation: !exiting ? "labsSearchIn 300ms cubic-bezier(0.2, 0.8, 0.4, 1) both" : undefined,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        overscrollBehavior: "contain",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t("labs.search.dialogLabel", "CaskSense Suche")}
      data-testid="labs-global-search-overlay"
    >
      <div
        onTouchStart={handleHeaderTouchStart}
        onTouchEnd={handleHeaderTouchEnd}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          background: "var(--labs-header-bg)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--labs-border-subtle)",
          padding: "12px 16px",
          flexShrink: 0,
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
            {mode === "ask" ? (
              <MessageCircle
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
            ) : (
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
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === "ask"
                ? (isDe ? "Frag CaskSense..." : "Ask CaskSense...")
                : t("search.placeholder", isDe ? "Whiskys, Seiten, Begriffe suchen..." : "Search whiskies, pages, terms...")}
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
            onClick={() => handleClose()}
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

        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 12,
            padding: "4px",
            background: "var(--labs-surface)",
            border: "1px solid var(--labs-border)",
            borderRadius: 12,
            width: "fit-content",
          }}
          data-testid="mode-toggle"
        >
          <button
            type="button"
            onClick={() => {
              setMode("search");
              triggerHaptic("light");
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            data-testid="button-mode-search"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              background: mode === "search" ? "var(--labs-accent)" : "transparent",
              color: mode === "search" ? "var(--labs-bg)" : "var(--labs-text-secondary)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 200ms ease, color 200ms ease",
              fontFamily: "inherit",
            }}
          >
            <Search style={{ width: 14, height: 14 }} />
            {isDe ? "Suche" : "Search"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("ask");
              triggerHaptic("light");
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            data-testid="button-mode-ask"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              background: mode === "ask" ? "var(--labs-accent)" : "transparent",
              color: mode === "ask" ? "var(--labs-bg)" : "var(--labs-text-secondary)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 200ms ease, color 200ms ease",
              fontFamily: "inherit",
            }}
          >
            <Sparkles style={{ width: 14, height: 14 }} />
            {isDe ? "Frag CaskSense" : "Ask CaskSense"}
          </button>
        </div>
      </div>

      {mode === "ask" ? (
        <div
          ref={chatScrollRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            padding: "16px 16px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
          data-testid="chat-scroll"
        >
          {chatMessages.length === 0 && !isStreaming && !streamError && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 20px",
                textAlign: "center",
                color: "var(--labs-text-secondary)",
                gap: 12,
              }}
              data-testid="chat-empty-state"
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--labs-accent-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles style={{ width: 26, height: 26, color: "var(--labs-accent)" }} />
              </div>
              <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 22, color: "var(--labs-text)" }}>
                {isDe ? "Frag CaskSense" : "Ask CaskSense"}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.5, maxWidth: 380 }}>
                {isDe
                  ? "CaskSense st\u00fctzt sich zuerst auf deine eigenen Whisky-Daten und unser Lexikon. F\u00fcr allgemeines Whisky-Wissen darf es zus\u00e4tzlich aus seinem Hintergrundwissen antworten \u2014 das wird dann markiert."
                  : "CaskSense relies first on your own whisky data and our lexicon. For general whisky knowledge it may also answer from its background knowledge \u2014 this will be flagged."}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  width: "100%",
                  maxWidth: 380,
                  marginTop: 4,
                  textAlign: "left",
                }}
                data-testid="chat-capabilities"
              >
                <div
                  style={{
                    border: "1px solid var(--labs-border)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    background: "var(--labs-surface)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--labs-accent)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                    <Check style={{ width: 14, height: 14 }} />
                    {isDe ? "Geht gut" : "Works well"}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.55, color: "var(--labs-text)" }}>
                    {(isDe
                      ? [
                          "Konkrete Whiskys, Brennereien oder Begriffe (z. B. \u201eErz\u00e4hl mir was \u00fcber Lagavulin\u201c).",
                          "Deine eigenen Whiskys und Tastings (\u201ewelche Whiskys habe ich verkostet?\u201c).",
                          "Statistiken zu deinen Bewertungen (\u201ebestes Tasting\u201c, \u201eTop 3 Islay\u201c, \u201eDurchschnittsnote\u201c).",
                          "Erkl\u00e4rungen aus dem Lexikon (\u201ewas ist ein Octave?\u201c, \u201eFirst-Fill-Sherry?\u201c).",
                        ]
                      : [
                          "Specific whiskies, distilleries or terms (\u201cTell me about Lagavulin\u201d).",
                          "Your own whiskies and tastings (\u201cwhich whiskies have I tasted?\u201d).",
                          "Statistics across your ratings (\u201cbest tasting\u201d, \u201ctop 3 Islay\u201d, \u201caverage score\u201d).",
                          "Lexicon explanations (\u201cwhat is an Octave?\u201d, \u201cFirst-fill sherry?\u201d).",
                        ]
                    ).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div
                  style={{
                    border: "1px solid var(--labs-border)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    background: "var(--labs-surface)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--labs-text-secondary)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                    <Minus style={{ width: 14, height: 14 }} />
                    {isDe ? "Geht (noch) nicht" : "Not (yet) supported"}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.55, color: "var(--labs-text-secondary)" }}>
                    {(isDe
                      ? [
                          "Aktuelle Marktpreise, Verf\u00fcgbarkeit oder Auktionen.",
                          "Live-Recherche im Web, tagesaktuelle News oder Ger\u00fcchte.",
                        ]
                      : [
                          "Current market prices, availability or auctions.",
                          "Live web lookups, current news or rumors.",
                        ]
                    ).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--labs-text-secondary)", marginTop: 4 }}>
                {isDe ? "Beispielfragen:" : "Try one:"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {(isDe
                  ? ["Was war mein bestes Tasting?", "Was ist ein Octave?", "Erz\u00e4hl mir kurz etwas \u00fcber Lagavulin"]
                  : ["What was my best tasting?", "What is an Octave?", "Tell me briefly about Lagavulin"]
                ).map((suggestion, idx) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setQuery(suggestion);
                      void sendAsk(suggestion);
                    }}
                    data-testid={`button-suggestion-${idx}`}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      background: "var(--labs-surface)",
                      border: "1px solid var(--labs-border)",
                      color: "var(--labs-text-secondary)",
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "border-color 200ms ease, color 200ms ease",
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatMessages.map((msg, idx) => (
            <div
              key={`msg-${idx}`}
              ref={msg.role === "user" && idx === chatMessages.length - 1 ? lastUserMsgRef : undefined}
              data-testid={`chat-message-${idx}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                gap: 8,
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "12px 16px",
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.role === "user" ? "var(--labs-accent)" : "var(--labs-surface)",
                  color: msg.role === "user" ? "var(--labs-bg)" : "var(--labs-text)",
                  border: msg.role === "assistant" ? "1px solid var(--labs-border)" : "none",
                  fontSize: 15,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.content}
              </div>
              {msg.role === "assistant" && msg.toolPayloads && msg.toolPayloads.length > 0 && (
                <div
                  data-testid={`chat-stats-charts-${idx}`}
                  style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}
                >
                  {msg.toolPayloads.map((payload, pIdx) => (
                    <StatsChartCard
                      key={`${payload.name}-${pIdx}`}
                      payload={payload}
                      isDe={isDe}
                      testId={`stats-chart-${msg.toolPayloads && msg.toolPayloads.length > 1 ? `${payload.name}-${pIdx}` : payload.name}`}
                    />
                  ))}
                </div>
              )}
              {msg.role === "assistant" && (msg.truncated || (msg.knowledgeMode && msg.knowledgeMode !== "user_data")) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  {msg.truncated && (
                    <div
                      data-testid={`chat-truncated-${idx}`}
                      style={{
                        fontSize: 11,
                        color: "rgba(220, 120, 80, 0.95)",
                        background: "rgba(220, 120, 80, 0.08)",
                        border: "1px solid rgba(220, 120, 80, 0.25)",
                        padding: "3px 8px",
                        borderRadius: 999,
                        fontWeight: 600,
                        letterSpacing: 0.2,
                      }}
                    >
                      {isDe ? "Antwort unvollstaendig" : "Response incomplete"}
                    </div>
                  )}
                  {msg.knowledgeMode === "general" && (
                    <div
                      data-testid={`chat-knowledge-mode-${idx}`}
                      title={isDe ? "Allgemeines Whisky-Wissen, nicht aus deinen Daten" : "General whisky knowledge, not from your data"}
                      style={{
                        fontSize: 11,
                        color: "var(--labs-accent)",
                        background: "var(--labs-accent-muted)",
                        border: "1px solid rgba(201, 169, 97, 0.4)",
                        padding: "3px 8px",
                        borderRadius: 999,
                        fontWeight: 600,
                        letterSpacing: 0.2,
                      }}
                    >
                      {isDe ? "Allgemeines Wissen" : "General knowledge"}
                    </div>
                  )}
                  {msg.knowledgeMode === "mixed" && (
                    <div
                      data-testid={`chat-knowledge-mode-${idx}`}
                      title={isDe ? "Mischung aus deinen Daten und allgemeinem Whisky-Wissen" : "Mix of your data and general whisky knowledge"}
                      style={{
                        fontSize: 11,
                        color: "var(--labs-text-secondary)",
                        background: "var(--labs-surface)",
                        border: "1px solid var(--labs-border)",
                        padding: "3px 8px",
                        borderRadius: 999,
                        fontWeight: 600,
                        letterSpacing: 0.2,
                      }}
                    >
                      {isDe ? "Deine Daten + Allgemeinwissen" : "Your data + general"}
                    </div>
                  )}
                </div>
              )}
              {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: 6, maxWidth: "85%" }}
                  data-testid={`chat-sources-${idx}`}
                >
                  {msg.sources.map((src, srcIdx) => {
                    const Icon = src.type === "whisky" ? Wine
                      : src.type === "tasting" ? Calendar
                      : src.type === "distillery" ? Building2
                      : BookOpen;
                    const labelType = src.type === "whisky" ? (isDe ? "Whisky" : "Whisky")
                      : src.type === "tasting" ? (isDe ? "Tasting" : "Tasting")
                      : src.type === "distillery" ? (isDe ? "Brennerei" : "Distillery")
                      : (isDe ? "Begriff" : "Term");
                    return (
                      <button
                        key={`${src.type}-${src.id}-${srcIdx}`}
                        type="button"
                        onClick={() => handleSourceClick(src)}
                        data-testid={`chip-source-${src.type}-${src.id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: "var(--labs-surface)",
                          border: "1px solid var(--labs-border)",
                          color: "var(--labs-text-secondary)",
                          fontSize: 12,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          transition: "border-color 200ms ease, color 200ms ease",
                          maxWidth: 240,
                        }}
                        title={src.title}
                      >
                        <Icon style={{ width: 12, height: 12, color: "var(--labs-accent)", flexShrink: 0 }} />
                        <span style={{ fontWeight: 600 }}>{srcIdx + 1}.</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {src.title}
                        </span>
                        <span style={{ color: "var(--labs-text-muted)", fontSize: 11, flexShrink: 0 }}>{labelType}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {isStreaming && (
            <div
              data-testid="chat-streaming"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "12px 16px",
                  borderRadius: "18px 18px 18px 4px",
                  background: "var(--labs-surface)",
                  color: "var(--labs-text)",
                  border: "1px solid var(--labs-border)",
                  fontSize: 15,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  minHeight: 24,
                }}
              >
                {streamingText || (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--labs-text-muted)" }}>
                    <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                    {isDe ? "Denkt nach..." : "Thinking..."}
                  </span>
                )}
              </div>
            </div>
          )}

          {streamError && (
            <div
              data-testid="chat-error"
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                background: "rgba(220, 80, 80, 0.08)",
                border: "1px solid rgba(220, 80, 80, 0.3)",
                color: "var(--labs-text)",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {streamError}
            </div>
          )}
        </div>
      ) : (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehavior: "contain",
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
            <Search style={{ width: 40, height: 40, color: "var(--labs-text-muted)", opacity: 0.75, marginBottom: 16 }} />
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
                              <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "var(--labs-accent-muted)", color: "var(--labs-accent)", flexShrink: 0 }}>
                                {result.extra.region}
                              </span>
                            )}
                            {result.extra?.region && result.category === "lexicon" && (
                              <span style={{ fontSize: 11, fontWeight: 500, padding: "1px 6px", borderRadius: 4, background: "var(--labs-success-muted)", color: "var(--labs-success)", flexShrink: 0 }}>
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
                        <ChevronRight style={{ width: 14, height: 14, color: "var(--labs-text-muted)", opacity: 0.75, flexShrink: 0 }} />
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
      )}

      <style>{`
        @keyframes labsSearchIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes labsSearchSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
