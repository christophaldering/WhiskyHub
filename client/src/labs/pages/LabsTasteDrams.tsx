import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useSession } from "@/lib/session";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { journalApi, tastingHistoryApi } from "@/lib/api";
import { useLocation, Link } from "wouter";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import type { JournalEntry } from "@shared/schema";
import { getStatusConfig } from "@/labs/utils/statusConfig";
import {
  BookOpen, Star, Plus, ChevronLeft, Pencil, Trash2, Check,
  Wine, Calendar, MapPin, X, Search, ScrollText, Trophy,
  Mic, Play as PlayIcon, Pause, ChevronDown, RotateCcw, Camera,
  ArrowUp, ArrowDown, SlidersHorizontal, Archive, Clock, FileEdit, MoreHorizontal,
  Users, Smile,
} from "lucide-react";
import WhiskyImage from "@/labs/components/WhiskyImage";
import WhiskyImageUpload from "@/components/WhiskyImageUpload";
import RatingFlowV2 from "@/labs/components/rating/RatingFlowV2";
import type { RatingData } from "@/labs/components/rating/types";

type FilterValue = "all" | "solo" | "tasting" | "drafts";
type ViewState = "list" | "detail" | "edit" | "trash" | "deepRate";
type DatePeriod = "all" | "7d" | "30d" | "3m" | "1y";
type ScoreRange = "all" | "90+" | "80-89" | "70-79" | "<70";
type SortBy = "date" | "score" | "name" | "saved";
type SortDirection = "asc" | "desc";

interface DramEntry extends JournalEntry {
  source: "solo" | "tasting" | "casksense";
  tastingTitle?: string;
  noseScore?: number | null;
  tasteScore?: number | null;
  finishScore?: number | null;
  savedAt?: string | Date | null;
}

const FILTER_KEYS: FilterValue[] = ["all", "solo", "tasting", "drafts"];
const FILTER_I18N: Record<FilterValue, string> = { all: "drams.tabAll", solo: "drams.tabSolo", tasting: "drams.tabTasting", drafts: "drams.tabDrafts" };

const DATE_PERIOD_KEYS: { key: DatePeriod; i18nKey: string; days: number }[] = [
  { key: "all", i18nKey: "drams.allTime", days: 0 },
  { key: "7d", i18nKey: "drams.sevenDays", days: 7 },
  { key: "30d", i18nKey: "drams.thirtyDays", days: 30 },
  { key: "3m", i18nKey: "drams.threeMonths", days: 90 },
  { key: "1y", i18nKey: "drams.oneYear", days: 365 },
];

function isJsonScoreString(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && ("noseScore" in parsed || "tasteScore" in parsed || "finishScore" in parsed);
  } catch {
    return false;
  }
}

function cleanTasteNotes(value: string): string {
  if (!value) return "";
  return isJsonScoreString(value) ? "" : value;
}

function splitRatingNotes(notes: string | null | undefined): {
  noseNotes: string | null;
  tasteNotes: string | null;
  finishNotes: string | null;
  body: string | null;
} {
  if (!notes || !notes.trim()) return { noseNotes: null, tasteNotes: null, finishNotes: null, body: null };

  const hasStructuredTags = /\[(SCORES|NOSE|TASTE|FINISH|BALANCE)\]/i.test(notes);
  if (!hasStructuredTags) {
    return { noseNotes: null, tasteNotes: null, finishNotes: null, body: notes.trim() };
  }

  let remaining = notes;
  let noseContent: string | null = null;
  let tasteContent: string | null = null;
  let finishContent: string | null = null;

  for (const dim of ["NOSE", "TASTE", "FINISH"]) {
    const rx = new RegExp(`\\[${dim}]\\s*(.+?)\\s*\\[\\/${dim}]`, "si");
    const m = remaining.match(rx);
    if (m) {
      const content = m[1].trim();
      if (dim === "NOSE") noseContent = content;
      else if (dim === "TASTE") tasteContent = content;
      else if (dim === "FINISH") finishContent = content;
    }
  }

  remaining = remaining.replace(/\[(SCORES|NOSE|TASTE|FINISH|BALANCE)\].*?\[\/\1\]/gsi, "");
  const bodyText = remaining.trim() || null;

  return {
    noseNotes: notes,
    tasteNotes: tasteContent,
    finishNotes: finishContent,
    body: bodyText,
  };
}

function parseNoseNotes(raw: string) {
  let cleanText = raw;
  let scores: { nose?: number; taste?: number; finish?: number } = {};
  const dims: Record<string, { chips: string[]; text: string }> = {};
  const scoresRx = /\[SCORES]\s*Nose:(\d+)\s*Taste:(\d+)\s*Finish:(\d+)(?:\s*Balance:\d+)?\s*\[\/SCORES]/gi;
  const scoresMatch = raw.match(/\[SCORES]\s*Nose:(\d+)\s*Taste:(\d+)\s*Finish:(\d+)(?:\s*Balance:\d+)?\s*\[\/SCORES]/i);
  if (scoresMatch) {
    scores = { nose: +scoresMatch[1], taste: +scoresMatch[2], finish: +scoresMatch[3] };
    cleanText = cleanText.replace(scoresRx, "");
  }
  for (const d of ["NOSE", "TASTE", "FINISH", "BALANCE"]) {
    const rxFirst = new RegExp(`\\[${d}]\\s*(.+?)\\s*\\[\\/${d}]`, "si");
    const rxAll = new RegExp(`\\[${d}]\\s*(.+?)\\s*\\[\\/${d}]`, "gsi");
    const m = cleanText.match(rxFirst);
    if (m) {
      const content = m[1].trim();
      const parts = content.split(" — ");
      dims[d.toLowerCase()] = {
        chips: parts[0] ? parts[0].split(",").map(c => c.trim()).filter(Boolean) : [],
        text: parts.length > 1 ? parts.slice(1).join(" — ").trim() : "",
      };
      cleanText = cleanText.replace(rxAll, "");
    }
  }
  return { cleanText: cleanText.trim(), scores, dims };
}

export default function LabsTasteDrams() {
  const { t } = useTranslation();
  const session = useSession();
  const [, navigate] = useLocation();
  const goBackToTaste = useBackNavigation("/labs/taste");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [datePeriod, setDatePeriod] = useState<DatePeriod>("all");
  const [selectedEntry, setSelectedEntry] = useState<DramEntry | null>(null);
  const [viewState, setViewState] = useState<ViewState>("list");
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);
  const [detailMoreMenuOpen, setDetailMoreMenuOpen] = useState(false);
  useEffect(() => { setDetailMoreMenuOpen(false); }, [selectedEntry?.id, viewState]);
  const [search, setSearch] = useState("");
  const [filterDistillery, setFilterDistillery] = useState("all");
  const [filterRegion, setFilterRegion] = useState("all");
  const [filterCaskType, setFilterCaskType] = useState("all");
  const [scoreRange, setScoreRange] = useState<ScoreRange>("all");
  const [sortBy, setSortBy] = useState<SortBy>("saved");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const statsInitRef = useRef(false);
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [editStructured, setEditStructured] = useState<{
    hasStructured: boolean;
    generalNotes: string;
    scores: { nose: string; taste: string; finish: string };
    dims: Record<string, { chips: string; text: string }>;
  } | null>(null);

  const { data: journal = [], isLoading, isError, refetch } = useQuery<JournalEntry[]>({
    queryKey: ["journal", session.pid],
    queryFn: async () => {
      const result = await journalApi.getAll(session.pid!);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!session.pid,
    retry: 2,
  });

  useEffect(() => {
    if (statsInitRef.current) return;
    if (isLoading) return;
    const hasDrafts = journal.some((e: any) => e.status === "draft");
    if (hasDrafts) setStatsExpanded(true);
    statsInitRef.current = true;
  }, [journal, isLoading]);

  const { data: tastingHistory } = useQuery({
    queryKey: ["tasting-history", session.pid],
    queryFn: () => tastingHistoryApi.get(session.pid!),
    enabled: !!session.pid,
    retry: 2,
  });

  const tastingWhiskies = useMemo(() => {
    if (!tastingHistory?.tastings || !Array.isArray(tastingHistory.tastings)) return [];
    return tastingHistory.tastings.flatMap((tasting: any) => {
      if (!tasting) return [];
      return (Array.isArray(tasting.whiskies) ? tasting.whiskies : []).filter((w: any) => w?.myRating).map((w: any) => {
        const parsedNotes = splitRatingNotes(w.myRating?.notes);
        return {
          id: `tw-${tasting.id}-${w.id}`,
          title: w.name || w.whiskyName || "—",
          name: w.name || w.whiskyName || null,
          distillery: w.distillery || null,
          country: w.country || null,
          region: w.region || null,
          age: w.age ? String(w.age) : null,
          abv: w.abv ? String(w.abv) : null,
          caskType: w.caskType || null,
          personalScore: w.myRating.overall ?? null,
          noseScore: w.myRating.nose ?? null,
          tasteScore: w.myRating.taste ?? null,
          finishScore: w.myRating.finish ?? null,
          createdAt: tasting.date || tasting.createdAt,
          savedAt: w.myRating.updatedAt || w.myRating.createdAt || tasting.date || tasting.createdAt,
          source: "tasting" as const,
          tastingTitle: tasting.title,
          noseNotes: parsedNotes.noseNotes,
          tasteNotes: parsedNotes.tasteNotes,
          finishNotes: parsedNotes.finishNotes,
          imageUrl: w.imageUrl || null,
        };
      });
    });
  }, [tastingHistory]);

  const allItems = useMemo(() => [
    ...journal.map((e: any) => ({ ...e, source: e.source || "solo" })),
    ...tastingWhiskies,
  ], [journal, tastingWhiskies]);

  const uniqueDistilleries = useMemo(() => Array.from(new Set(allItems.map((e: any) => e.distillery).filter(Boolean))).sort(), [allItems]);
  const uniqueRegions = useMemo(() => Array.from(new Set(allItems.map((e: any) => e.region).filter(Boolean))).sort(), [allItems]);
  const uniqueCaskTypes = useMemo(() => Array.from(new Set(allItems.map((e: any) => e.caskType).filter(Boolean))).sort(), [allItems]);

  const hasAdvancedFilters = filterDistillery !== "all" || filterRegion !== "all" || filterCaskType !== "all" || scoreRange !== "all" || datePeriod !== "all";
  const hasAnyFilter = activeFilter !== "all" || datePeriod !== "all" || search.trim() !== "" || hasAdvancedFilters || sortBy !== "saved" || sortDirection !== "desc";

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (datePeriod !== "all") count++;
    if (scoreRange !== "all") count++;
    if (filterDistillery !== "all") count++;
    if (filterRegion !== "all") count++;
    if (filterCaskType !== "all") count++;
    return count;
  }, [datePeriod, scoreRange, filterDistillery, filterRegion, filterCaskType]);

  const activeFilterChips = useMemo(() => {
    const chips: { label: string; onClear: () => void }[] = [];
    if (datePeriod !== "all") {
      const label = t(DATE_PERIOD_KEYS.find(p => p.key === datePeriod)?.i18nKey || "drams.allTime");
      chips.push({ label, onClear: () => setDatePeriod("all") });
    }
    if (scoreRange !== "all") chips.push({ label: t("drams.scoreChip", { range: scoreRange }), onClear: () => setScoreRange("all") });
    if (filterDistillery !== "all") chips.push({ label: filterDistillery, onClear: () => setFilterDistillery("all") });
    if (filterRegion !== "all") chips.push({ label: filterRegion, onClear: () => setFilterRegion("all") });
    if (filterCaskType !== "all") chips.push({ label: filterCaskType, onClear: () => setFilterCaskType("all") });
    return chips;
  }, [datePeriod, scoreRange, filterDistillery, filterRegion, filterCaskType]);

  const resetAllFilters = () => {
    setActiveFilter("all"); setDatePeriod("all"); setSearch("");
    setFilterDistillery("all"); setFilterRegion("all"); setFilterCaskType("all"); setScoreRange("all"); setSortBy("saved"); setSortDirection("desc"); setSortDropdownOpen(false);
  };

  const clearAdvancedFilters = () => {
    setDatePeriod("all"); setScoreRange("all"); setFilterDistillery("all"); setFilterRegion("all"); setFilterCaskType("all");
  };

  const filteredEntries = useMemo(() => {
    let items: any[] = [];
    if (activeFilter === "drafts") {
      items = journal.filter((e: any) => e.status === "draft").map((e: any) => ({ ...e, source: e.source || "solo" }));
    } else {
      if (activeFilter === "all" || activeFilter === "solo") items.push(...journal.map((e: any) => ({ ...e, source: e.source || "solo" })));
      if (activeFilter === "all" || activeFilter === "tasting") items.push(...tastingWhiskies);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((e: any) => (e.name || e.title || "").toLowerCase().includes(q) || (e.distillery || "").toLowerCase().includes(q));
    }
    if (datePeriod !== "all") {
      const days = DATE_PERIOD_KEYS.find(p => p.key === datePeriod)?.days || 0;
      if (days > 0) {
        const cutoff = Date.now() - days * 86400000;
        items = items.filter((e: any) => e.createdAt && new Date(e.createdAt).getTime() >= cutoff);
      }
    }
    if (filterDistillery !== "all") items = items.filter((e: any) => e.distillery === filterDistillery);
    if (filterRegion !== "all") items = items.filter((e: any) => e.region === filterRegion);
    if (filterCaskType !== "all") items = items.filter((e: any) => e.caskType === filterCaskType);
    if (scoreRange !== "all") {
      items = items.filter((e: any) => {
        const s = e.personalScore;
        if (s == null) return false;
        if (scoreRange === "90+") return s >= 90;
        if (scoreRange === "80-89") return s >= 80 && s < 90;
        if (scoreRange === "70-79") return s >= 70 && s < 80;
        return s < 70;
      });
    }
    const dir = sortDirection === "asc" ? 1 : -1;
    items.sort((a: any, b: any) => {
      const da = a.status === "draft" ? 0 : 1;
      const db = b.status === "draft" ? 0 : 1;
      if (da !== db) return da - db;
      if (sortBy === "score") {
        const sa = a.personalScore ?? -1;
        const sb = b.personalScore ?? -1;
        return (sa - sb) * dir;
      }
      if (sortBy === "name") {
        const na = (a.name || a.title || "").toLowerCase();
        const nb = (b.name || b.title || "").toLowerCase();
        return na.localeCompare(nb) * dir;
      }
      if (sortBy === "saved") {
        const sa = a.source === "tasting" ? (a.savedAt ? new Date(a.savedAt).getTime() : 0) : (a.updatedAt ? new Date(a.updatedAt).getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const sb = b.source === "tasting" ? (b.savedAt ? new Date(b.savedAt).getTime() : 0) : (b.updatedAt ? new Date(b.updatedAt).getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return (sa - sb) * dir;
      }
      return ((a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0)) * dir;
    });
    return items;
  }, [journal, tastingWhiskies, activeFilter, search, datePeriod, filterDistillery, filterRegion, filterCaskType, scoreRange, sortBy, sortDirection]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => journalApi.update(session.pid!, id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["journal"] }); setViewState("list"); setSelectedEntry(null); },
  });

  const [deepRateDraftFlash, setDeepRateDraftFlash] = useState(false);

  const deepRateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => journalApi.update(session.pid!, id, data),
    onSuccess: async (updatedEntry: any) => {
      await queryClient.invalidateQueries({ queryKey: ["journal"] });
      if (updatedEntry && selectedEntry) {
        setSelectedEntry({ ...selectedEntry, ...updatedEntry });
      }
      setViewState("detail");
    },
  });

  const deepRateDraftMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => journalApi.update(session.pid!, id, data),
    onSuccess: async (updatedEntry: any) => {
      await queryClient.invalidateQueries({ queryKey: ["journal"] });
      if (updatedEntry && selectedEntry) {
        setSelectedEntry({ ...selectedEntry, ...updatedEntry });
      }
      setDeepRateDraftFlash(true);
      setTimeout(() => setDeepRateDraftFlash(false), 2000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => journalApi.delete(session.pid!, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["journal"] }); queryClient.invalidateQueries({ queryKey: ["journal-trash"] }); setDeleteTarget(null); if (selectedEntry?.id === deleteTarget?.id) { setSelectedEntry(null); setViewState("list"); } },
  });

  const { data: trashEntries = [] } = useQuery<JournalEntry[]>({
    queryKey: ["journal-trash", session.pid],
    queryFn: () => journalApi.getTrash(session.pid!),
    enabled: !!session.pid && viewState === "trash",
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => journalApi.restore(session.pid!, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["journal"] }); queryClient.invalidateQueries({ queryKey: ["journal-trash"] }); },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => journalApi.permanentDelete(session.pid!, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["journal-trash"] }); },
  });

  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<JournalEntry | null>(null);

  const handleView = (entry: any) => {
    setSelectedEntry(entry);
    if (entry.status === "draft" && isSoloEntry(entry)) {
      setViewState("deepRate");
    } else {
      setViewState("detail");
    }
  };

  const handleEdit = (entry: any) => {
    setSelectedEntry(entry);
    setEditImageUrl(entry.imageUrl || null);
    const raw = entry.noseNotes || "";
    const hasStructured = /\[(SCORES|NOSE|TASTE|FINISH|BALANCE)\]/i.test(raw);
    if (hasStructured) {
      const parsed = parseNoseNotes(raw);
      const flatTaste = cleanTasteNotes(entry.tasteNotes || "");
      const flatFinish = entry.finishNotes || "";
      const tasteChips = parsed.dims.taste?.chips.join(", ") || "";
      const tasteText = parsed.dims.taste?.text || "";
      const finishChips = parsed.dims.finish?.chips.join(", ") || "";
      const finishText = parsed.dims.finish?.text || "";
      setEditStructured({
        hasStructured: true, generalNotes: parsed.cleanText,
        scores: { nose: parsed.scores.nose != null ? String(parsed.scores.nose) : "", taste: parsed.scores.taste != null ? String(parsed.scores.taste) : "", finish: parsed.scores.finish != null ? String(parsed.scores.finish) : "" },
        dims: {
          nose: { chips: parsed.dims.nose?.chips.join(", ") || "", text: parsed.dims.nose?.text || "" },
          taste: { chips: tasteChips, text: tasteText || flatTaste },
          finish: { chips: finishChips, text: finishText || flatFinish },
        },
      });
    } else { setEditStructured(null); }
    setEditForm({ title: entry.title || entry.name || "", name: entry.name || "", distillery: entry.distillery || "", country: entry.country || "", region: entry.region || "", age: entry.age || "", abv: entry.abv != null ? String(entry.abv) : "", caskType: entry.caskType || "", personalScore: entry.personalScore ?? "", noseScore: entry.noseScore != null ? String(entry.noseScore) : "", tasteScore: entry.tasteScore != null ? String(entry.tasteScore) : "", finishScore: entry.finishScore != null ? String(entry.finishScore) : "", noseNotes: raw, tasteNotes: cleanTasteNotes(entry.tasteNotes || ""), finishNotes: entry.finishNotes || "", overallNotes: entry.overallNotes || "" });
    setViewState("edit");
  };

  const reassembleStructuredNotes = useCallback(() => {
    if (!editStructured) return editForm.noseNotes;
    let result = editStructured.generalNotes.trim();
    const s = editStructured.scores;
    if (s.nose || s.taste || s.finish) {
      result += `\n\n[SCORES] Nose:${s.nose || "0"} Taste:${s.taste || "0"} Finish:${s.finish || "0"} [/SCORES]`;
    }
    for (const dim of ["nose", "taste", "finish"] as const) {
      const d = editStructured.dims[dim];
      if (d && (d.chips.trim() || d.text.trim())) {
        const tag = dim.toUpperCase();
        const content = d.chips.trim() && d.text.trim() ? `${d.chips.trim()} — ${d.text.trim()}` : d.chips.trim() || d.text.trim();
        result += `\n[${tag}] ${content} [/${tag}]`;
      }
    }
    return result.trim();
  }, [editStructured, editForm.noseNotes]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!selectedEntry || !session.pid) return;
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`/api/journal/${session.pid}/${selectedEntry.id}/image`, { method: "POST", body: formData });
      if (res.ok) {
        const updated = await res.json();
        setEditImageUrl(updated.imageUrl);
        setSelectedEntry({ ...selectedEntry, imageUrl: updated.imageUrl });
        queryClient.invalidateQueries({ queryKey: ["journal"] });
      }
    } catch {}
    setImageUploading(false);
  }, [selectedEntry, session.pid]);

  const handleSaveEdit = () => {
    if (!selectedEntry) return;
    const data: any = { ...editForm };
    if (editStructured) {
      data.noseNotes = reassembleStructuredNotes();
      const tasteDim = editStructured.dims.taste;
      const tasteChipsVal = tasteDim?.chips.trim() || "";
      const tasteTextVal = tasteDim?.text.trim() || "";
      const tasteDedup = tasteTextVal && tasteChipsVal && tasteTextVal.toLowerCase() === tasteChipsVal.toLowerCase() ? "" : tasteTextVal;
      const tasteParts = [tasteChipsVal, tasteDedup].filter(Boolean);
      data.tasteNotes = tasteParts.length ? tasteParts.join(". ") : "";
      const finishDim = editStructured.dims.finish;
      const finishChipsVal = finishDim?.chips.trim() || "";
      const finishTextVal = finishDim?.text.trim() || "";
      const finishDedup = finishTextVal && finishChipsVal && finishTextVal.toLowerCase() === finishChipsVal.toLowerCase() ? "" : finishTextVal;
      const finishParts = [finishChipsVal, finishDedup].filter(Boolean);
      data.finishNotes = finishParts.length ? finishParts.join(". ") : "";
    }
    if (data.personalScore === "") data.personalScore = null;
    else data.personalScore = parseFloat(data.personalScore);
    if (selectedEntry.status === "draft") {
      if (editStructured) {
        data.noseScore = editStructured.scores.nose !== "" ? parseFloat(editStructured.scores.nose) : null;
        data.tasteScore = editStructured.scores.taste !== "" ? parseFloat(editStructured.scores.taste) : null;
        data.finishScore = editStructured.scores.finish !== "" ? parseFloat(editStructured.scores.finish) : null;
      } else {
        if (data.noseScore === "" || data.noseScore == null) data.noseScore = null;
        else data.noseScore = parseFloat(data.noseScore);
        if (data.tasteScore === "" || data.tasteScore == null) data.tasteScore = null;
        else data.tasteScore = parseFloat(data.tasteScore);
        if (data.finishScore === "" || data.finishScore == null) data.finishScore = null;
        else data.finishScore = parseFloat(data.finishScore);
      }
    } else {
      delete data.noseScore;
      delete data.tasteScore;
      delete data.finishScore;
    }
    updateMutation.mutate({ id: selectedEntry.id, data });
  };

  const handleBack = () => { setViewState("list"); setSelectedEntry(null); };
  const isSoloEntry = (entry: any) => !entry.source || entry.source === "solo" || entry.source === "casksense";
  const isQuickRating = (entry: DramEntry) => {
    if (!isSoloEntry(entry)) return false;
    if (entry.status !== "final") return false;
    if (entry.noseScore != null || entry.tasteScore != null || entry.finishScore != null) return false;
    if (entry.noseNotes && /\[(SCORES|NOSE|TASTE|FINISH|BALANCE)\]/i.test(entry.noseNotes)) return false;
    const hasTasteNotes = entry.tasteNotes && entry.tasteNotes.trim() && !isJsonScoreString(entry.tasteNotes);
    const hasFinishNotes = entry.finishNotes && entry.finishNotes.trim();
    if (hasTasteNotes || hasFinishNotes) return false;
    return true;
  };

  if (viewState === "trash") {
    return (
      <div className="labs-page" data-testid="labs-drams-trash">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => setViewState("list")} className="labs-btn-ghost flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }} data-testid="button-labs-back-from-trash">
            <ChevronLeft className="w-4 h-4" /> {t("drams.drams")}
          </button>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <Archive className="w-5 h-5" style={{ color: "var(--labs-text-muted)" }} />
          <h2 className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }}>{t("drams.trash")}</h2>
        </div>
        <p className="text-sm mb-5" style={{ color: "var(--labs-text-muted)", lineHeight: 1.5 }}>
          {t("drams.trashDesc")}
        </p>
        {trashEntries.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--labs-surface-elevated, var(--labs-card-bg, rgba(255,255,255,0.045)))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Trash2 className="w-6 h-6" style={{ color: "var(--labs-text-muted)" }} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--labs-text)", marginBottom: 6 }}>{t("drams.trashEmpty")}</h3>
            <p style={{ fontSize: 14, color: "var(--labs-text-muted)" }}>{t("drams.noDeletedDrams")}</p>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 10 }}>
            {trashEntries.map((entry: JournalEntry) => {
              const deletedAt = entry.deletedAt ? new Date(entry.deletedAt).getTime() : Date.now();
              const daysLeft = Math.max(0, 30 - Math.floor((Date.now() - deletedAt) / 86400000));
              return (
                <div key={entry.id} className="labs-card" style={{ padding: "16px 18px", borderRadius: 14, opacity: 0.85 }} data-testid={`labs-trash-item-${entry.id}`}>
                  <div className="flex items-start gap-3">
                    <WhiskyImage imageUrl={entry.imageUrl} name={entry.name || entry.title || ""} size={44} height={56} className="flex-shrink-0" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--labs-text)", lineHeight: 1.3, marginBottom: 3 }} className="truncate">{entry.name || entry.title || "—"}</div>
                      {entry.distillery && <div style={{ fontSize: 13, color: "var(--labs-text-secondary, var(--labs-text-muted))", marginBottom: 6 }} className="truncate">{entry.distillery}</div>}
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" style={{ color: daysLeft <= 3 ? "var(--labs-danger)" : "var(--labs-text-muted)" }} />
                        <span style={{ fontSize: 11, color: daysLeft <= 3 ? "var(--labs-danger)" : "var(--labs-text-muted)" }}>
                          {daysLeft === 0 ? t("drams.expiresToday") : daysLeft === 1 ? t("drams.dayLeft", { count: daysLeft }) : t("drams.daysLeft", { count: daysLeft })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5" style={{ flexShrink: 0 }}>
                      <button
                        onClick={() => restoreMutation.mutate(entry.id)}
                        disabled={restoreMutation.isPending}
                        style={{ padding: "6px 12px", fontSize: 12, fontWeight: 500, borderRadius: 8, cursor: "pointer", background: "var(--labs-accent-muted, rgba(212,168,71,0.12))", color: "var(--labs-accent)", border: "1px solid color-mix(in srgb, var(--labs-accent) 25%, transparent)" }}
                        data-testid={`button-restore-${entry.id}`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setPermanentDeleteTarget(entry)}
                        style={{ padding: "6px 12px", fontSize: 12, fontWeight: 500, borderRadius: 8, cursor: "pointer", background: "transparent", color: "var(--labs-danger)", border: "1px solid var(--labs-danger)", opacity: 0.8 }}
                        data-testid={`button-permanent-delete-${entry.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {permanentDeleteTarget && (
          <div style={{ position: "fixed", inset: 0, zIndex: "var(--z-overlay)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--overlay-backdrop)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)" }} data-testid="dialog-permanent-delete">
            <div className="labs-card" style={{ maxWidth: 380, width: "90%", padding: 24 }}>
              <h3 className="labs-h3 mb-2" style={{ color: "var(--labs-text)" }}>{t("drams.permanentDelete")}</h3>
              <p className="text-sm mb-5" style={{ color: "var(--labs-text-secondary)" }}>{t("drams.permanentDeleteDesc", { name: permanentDeleteTarget.name || permanentDeleteTarget.title })}</p>
              <div className="flex justify-end gap-2.5">
                <button onClick={() => setPermanentDeleteTarget(null)} className="labs-btn-secondary" style={{ padding: "8px 16px", fontSize: 14 }} data-testid="button-cancel-permanent-delete">{t("drams.cancel")}</button>
                <button onClick={() => { permanentDeleteMutation.mutate(permanentDeleteTarget.id); setPermanentDeleteTarget(null); }} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, color: "var(--labs-bg)", background: "var(--labs-danger)", border: "none", borderRadius: 8, cursor: "pointer" }} data-testid="button-confirm-permanent-delete">
                  {t("drams.deleteForever")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (viewState === "detail" && selectedEntry) {
    const openDrafts = journal
      .filter((e: any) => e.status === "draft" && e.id !== selectedEntry.id)
      .slice()
      .sort((a: any, b: any) => {
        const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return tb - ta;
      });
    const showNextDraftButton = isSoloEntry(selectedEntry) && selectedEntry.status === "final" && openDrafts.length > 0;
    return (
      <div className="labs-page" data-testid="labs-dram-detail">
        <div className="flex items-center justify-between mb-5">
          <button onClick={handleBack} className="labs-btn-ghost flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }} data-testid="button-labs-back-drams">
            <ChevronLeft className="w-4 h-4" /> {t("drams.drams")}
          </button>
          {isSoloEntry(selectedEntry) && (
            <div className="flex gap-2 items-center">
              <button onClick={() => handleEdit(selectedEntry)} className="labs-btn-secondary flex items-center gap-1.5" style={{ padding: "6px 12px", fontSize: 13 }} data-testid="button-labs-edit-dram">
                <Pencil className="w-3.5 h-3.5" /> {t("drams.edit")}
              </button>
              {selectedEntry.status === "final" && isQuickRating(selectedEntry) && (
                <button
                  onClick={() => setViewState("deepRate")}
                  className="labs-btn-secondary flex items-center gap-1.5"
                  style={{ padding: "6px 12px", fontSize: 13 }}
                  data-testid="button-labs-deep-rate-dram"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> {t("labs.deepRate.button", "Ausführlich bewerten")}
                </button>
              )}
              {selectedEntry.status === "final" && (
                <button
                  onClick={() => {
                    const retasteData = {
                      name: selectedEntry.name || selectedEntry.title || "",
                      distillery: selectedEntry.distillery || "",
                      country: selectedEntry.country || "",
                      region: selectedEntry.region || "",
                      age: selectedEntry.age || "",
                      abv: selectedEntry.abv || "",
                      caskType: selectedEntry.caskType || "",
                    };
                    sessionStorage.setItem("cs_retaste_context", JSON.stringify(retasteData));
                    navigate("/labs/solo");
                  }}
                  className="labs-btn-secondary flex items-center gap-1.5"
                  style={{ padding: "6px 12px", fontSize: 13 }}
                  data-testid="button-labs-retaste-dram"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> {t("labs.editOrRetaste.retaste", "Nochmal verkosten")}
                </button>
              )}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setDetailMoreMenuOpen(v => !v)}
                  className="labs-btn-ghost flex items-center justify-center"
                  style={{ padding: "6px 8px", color: "var(--labs-text-muted)" }}
                  aria-label="More actions"
                  data-testid="button-labs-more-menu"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {detailMoreMenuOpen && (
                  <>
                    <div
                      onClick={() => setDetailMoreMenuOpen(false)}
                      style={{ position: "fixed", inset: 0, zIndex: 10 }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        right: 0,
                        zIndex: 11,
                        minWidth: 140,
                        background: "var(--labs-bg-elevated, var(--labs-bg))",
                        border: "1px solid var(--labs-border)",
                        borderRadius: 8,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                        padding: 4,
                      }}
                      data-testid="menu-labs-more"
                    >
                      <button
                        onClick={() => {
                          setDetailMoreMenuOpen(false);
                          setDeleteTarget(selectedEntry);
                        }}
                        className="flex items-center gap-1.5 w-full"
                        style={{
                          padding: "8px 12px",
                          fontSize: 13,
                          color: "var(--labs-danger)",
                          background: "transparent",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                        data-testid="button-labs-delete-dram"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> {t("drams.delete")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        {showNextDraftButton && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                const nextDraft = openDrafts[0] as DramEntry;
                setSelectedEntry({ ...nextDraft, source: (nextDraft as any).source || "solo" });
                setDetailMoreMenuOpen(false);
                setViewState("deepRate");
              }}
              className="flex items-center gap-1.5"
              style={{
                padding: "6px 12px",
                fontSize: 13,
                color: "var(--labs-accent)",
                background: "transparent",
                border: "1px solid var(--labs-accent)",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 500,
              }}
              data-testid="button-next-open-draft"
            >
              {t("drams.nextOpenDraft", "Next open Draft →")}
            </button>
          </div>
        )}

        {selectedEntry.status === "draft" && isSoloEntry(selectedEntry) && (
          <div className="flex gap-2 mb-4">
            <button onClick={() => {
              setViewState("deepRate");
            }} className="labs-btn-primary flex-1 flex items-center justify-center gap-2" data-testid="button-labs-finalize-dram">
              <SlidersHorizontal className="w-4 h-4" /> {t("v2.drams.finishRating", "Bewertung vervollständigen")}
            </button>
            <button onClick={() => updateMutation.mutate({ id: selectedEntry.id, data: { status: "final" } })} className="labs-btn-secondary flex items-center justify-center gap-2" style={{ padding: "8px 14px" }} data-testid="button-labs-quick-finalize-dram">
              <Check className="w-4 h-4" /> {t("v2.drams.markFinal", "Als fertig markieren")}
            </button>
          </div>
        )}

        <div className="labs-card p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <WhiskyImage imageUrl={selectedEntry.imageUrl} name={selectedEntry.name || selectedEntry.title || ""} size={64} height={88} className="flex-shrink-0" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="labs-h3" style={{ color: "var(--labs-accent)", margin: 0 }}>
                {selectedEntry.name || selectedEntry.title || "—"}
              </h2>
              {selectedEntry.distillery && <div className="text-sm mt-1" style={{ color: "var(--labs-text-secondary)" }}>{selectedEntry.distillery}</div>}
              <div className="flex items-center gap-2 mt-1">
                {selectedEntry.status === "draft" && <span className={getStatusConfig("draft").cssClass}>{t(getStatusConfig("draft").labelKey, getStatusConfig("draft").fallbackLabel)}</span>}
                {selectedEntry.createdAt && (
                  <span className="text-xs flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                    <Calendar className="w-3 h-3" />{new Date(selectedEntry.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            {selectedEntry.personalScore != null && (
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div className="labs-h1" style={{ color: "var(--labs-accent)" }}>{Number(selectedEntry.personalScore).toFixed(1)}</div>
                <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>{t("drams.score")}</div>
              </div>
            )}
          </div>

          <TastingContextLine raw={selectedEntry.tastingContext} />

          {(selectedEntry.country || selectedEntry.region || selectedEntry.age || selectedEntry.abv || selectedEntry.caskType) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedEntry.country && <MetaBadge label={t("drams.country")} value={selectedEntry.country} />}
              {selectedEntry.region && <MetaBadge label={t("drams.region")} value={selectedEntry.region} />}
              {selectedEntry.age && <MetaBadge label={t("drams.age")} value={selectedEntry.age} />}
              {selectedEntry.abv && <MetaBadge label={t("drams.abv")} value={selectedEntry.abv} />}
              {selectedEntry.caskType && <MetaBadge label={t("drams.cask")} value={selectedEntry.caskType} />}
            </div>
          )}

          {(() => {
            const hasStructuredTags = selectedEntry.noseNotes && /\[(SCORES|NOSE|TASTE|FINISH|BALANCE)\]/i.test(selectedEntry.noseNotes);
            const hasIndividualScores = selectedEntry.noseScore != null || selectedEntry.tasteScore != null || selectedEntry.finishScore != null;
            const hasEmbeddedScores = selectedEntry.noseNotes && /\[SCORES\]/i.test(selectedEntry.noseNotes);
            const showScoreBoxes = hasIndividualScores && !hasEmbeddedScores;

            return (
              <>
                {showScoreBoxes && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--labs-border)" }}>
                    <div className="flex flex-wrap gap-2">
                      {selectedEntry.noseScore != null && (
                        <div data-testid="score-nose" style={{ background: "var(--labs-surface-elevated)", borderRadius: 8, padding: "6px 12px", textAlign: "center", minWidth: 56 }}>
                          <div className="labs-h3" style={{ color: "var(--labs-accent)" }}>{Number(selectedEntry.noseScore).toFixed(0)}</div>
                          <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>{t("drams.nose")}</div>
                        </div>
                      )}
                      {selectedEntry.tasteScore != null && (
                        <div data-testid="score-taste" style={{ background: "var(--labs-surface-elevated)", borderRadius: 8, padding: "6px 12px", textAlign: "center", minWidth: 56 }}>
                          <div className="labs-h3" style={{ color: "var(--labs-accent)" }}>{Number(selectedEntry.tasteScore).toFixed(0)}</div>
                          <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>{t("drams.taste")}</div>
                        </div>
                      )}
                      {selectedEntry.finishScore != null && (
                        <div data-testid="score-finish" style={{ background: "var(--labs-surface-elevated)", borderRadius: 8, padding: "6px 12px", textAlign: "center", minWidth: 56 }}>
                          <div className="labs-h3" style={{ color: "var(--labs-accent)" }}>{Number(selectedEntry.finishScore).toFixed(0)}</div>
                          <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>{t("drams.finish")}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {hasStructuredTags && <ParsedNotesSection raw={selectedEntry.noseNotes!} />}
                {!hasStructuredTags && (
                  <>
                    {selectedEntry.noseNotes && (
                      <NoteSection label={selectedEntry.source === "tasting" ? t("drams.notes") : t("drams.nose")} value={selectedEntry.noseNotes} />
                    )}
                    {selectedEntry.tasteNotes && !isJsonScoreString(selectedEntry.tasteNotes) && <NoteSection label={t("drams.taste")} value={selectedEntry.tasteNotes} />}
                    {selectedEntry.finishNotes && <NoteSection label={t("drams.finish")} value={selectedEntry.finishNotes} />}
                  </>
                )}
              </>
            );
          })()}

          <VoiceMemoSection url={selectedEntry.voiceMemoUrl} transcript={selectedEntry.voiceMemoTranscript} duration={selectedEntry.voiceMemoDuration} />

          <FriendsAlsoRated
            pid={session.pid || ""}
            whiskyName={selectedEntry.name || selectedEntry.title || ""}
            distillery={selectedEntry.distillery || ""}
            ownOverall={selectedEntry.personalScore ?? null}
            ownNose={selectedEntry.noseScore ?? null}
            ownTaste={selectedEntry.tasteScore ?? null}
            ownFinish={selectedEntry.finishScore ?? null}
          />

          {selectedEntry.tastingTitle && (
            <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text-secondary)" }}>
              <Wine className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} /> {t("drams.fromTasting")} {selectedEntry.tastingTitle}
            </div>
          )}

          <HistoricalAppearances distillery={selectedEntry.distillery || ""} whiskyName={selectedEntry.name || selectedEntry.title || ""} />
        </div>

        {deleteTarget && <DeleteDialog onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} isPending={deleteMutation.isPending} />}
      </div>
    );
  }

  if (viewState === "deepRate" && selectedEntry) {
    const deepRateWhisky = {
      name: selectedEntry.name || selectedEntry.title || "",
      region: selectedEntry.region || "",
      cask: selectedEntry.caskType || "",
    };
    const deepRateInitialData: RatingData = {
      scores: {
        nose: selectedEntry.noseScore ?? selectedEntry.personalScore ?? 80,
        palate: selectedEntry.tasteScore ?? selectedEntry.personalScore ?? 80,
        finish: selectedEntry.finishScore ?? selectedEntry.personalScore ?? 80,
        overall: selectedEntry.personalScore ?? 80,
      },
      tags: { nose: [], palate: [], finish: [], overall: [] },
      notes: {
        nose: selectedEntry.noseNotes || "",
        palate: selectedEntry.tasteNotes ? cleanTasteNotes(selectedEntry.tasteNotes) : "",
        finish: selectedEntry.finishNotes || "",
        overall: selectedEntry.notes || "",
      },
    };
    const handleDeepRateDone = (data: RatingData) => {
      const noseNoteParts = [data.notes.nose, ...(data.tags.nose || [])].filter(Boolean).join(", ");
      const patchData: any = {
        personalScore: data.scores.overall,
        noseScore: data.scores.nose,
        tasteScore: data.scores.palate,
        finishScore: data.scores.finish,
        noseNotes: noseNoteParts || selectedEntry.noseNotes || "",
        tasteNotes: [data.notes.palate, ...(data.tags.palate || [])].filter(Boolean).join(", ") || selectedEntry.tasteNotes || "",
        finishNotes: [data.notes.finish, ...(data.tags.finish || [])].filter(Boolean).join(", ") || selectedEntry.finishNotes || "",
        ...(selectedEntry.status === "draft" && data.overallExplicit ? { status: "final" } : {}),
      };
      deepRateMutation.mutate({ id: selectedEntry.id, data: patchData });
    };
    const handleDeepRateSaveAsDraft = (data: RatingData) => {
      const noseNoteParts = [data.notes.nose, ...(data.tags.nose || [])].filter(Boolean).join(", ");
      const patchData: any = {
        personalScore: data.scores.overall,
        noseScore: data.scores.nose,
        tasteScore: data.scores.palate,
        finishScore: data.scores.finish,
        noseNotes: noseNoteParts || selectedEntry.noseNotes || "",
        tasteNotes: [data.notes.palate, ...(data.tags.palate || [])].filter(Boolean).join(", ") || selectedEntry.tasteNotes || "",
        finishNotes: [data.notes.finish, ...(data.tags.finish || [])].filter(Boolean).join(", ") || selectedEntry.finishNotes || "",
      };
      deepRateDraftMutation.mutate({ id: selectedEntry.id, data: patchData });
    };
    return (
      <div className="labs-page" data-testid="labs-dram-deep-rate">
        {deepRateDraftFlash && (
          <div style={{
            position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
            zIndex: 100, padding: "8px 20px", borderRadius: 10,
            background: "var(--labs-accent-muted)", color: "var(--labs-accent)",
            fontSize: 13, fontWeight: 600, boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
          }} data-testid="deep-rate-draft-flash">
            {t("v2.saveDraftInline", "Zwischenstand sichern")} ✓
          </div>
        )}
        <RatingFlowV2
          whisky={deepRateWhisky}
          initialData={deepRateInitialData}
          onDone={handleDeepRateDone}
          onBack={() => setViewState(selectedEntry.status === "draft" ? "list" : "detail")}
          onSaveAsDraft={handleDeepRateSaveAsDraft}
          hideQuick
        />
      </div>
    );
  }

  if (viewState === "edit" && selectedEntry) {
    return (
      <div className="labs-page" data-testid="labs-dram-edit">
        <div className="flex items-center justify-between mb-5">
          <button onClick={handleBack} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer" }} data-testid="button-labs-cancel-edit">
            <ChevronLeft className="w-4 h-4" /> {t("drams.cancel")}
          </button>
          <button onClick={handleSaveEdit} disabled={updateMutation.isPending} className="labs-btn-primary" style={{ padding: "8px 20px", fontSize: 14, opacity: updateMutation.isPending ? 0.6 : 1 }} data-testid="button-labs-save-dram">
            {updateMutation.isPending ? t("drams.saving") : t("drams.save")}
          </button>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-3.5">
            <WhiskyImageUpload
              imageUrl={editImageUrl}
              onFileSelected={(file) => handleImageUpload(file)}
              onImageDeleted={() => setEditImageUrl(null)}
              canDelete={false}
              variant="labs"
              size="sm"
              testIdPrefix="labs-dram-image"
            />
            <div className="flex-1 flex flex-col gap-2">
              <EditField label={t("drams.whiskyName")} value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v, title: v })} testId="input-labs-edit-whiskyName" />
              <EditField label={t("drams.distillery")} value={editForm.distillery} onChange={(v) => setEditForm({ ...editForm, distillery: v })} testId="input-labs-edit-distillery" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <EditField label={t("drams.country")} value={editForm.country || ""} onChange={(v) => setEditForm({ ...editForm, country: v })} testId="input-labs-edit-country" />
            <EditField label={t("drams.region")} value={editForm.region} onChange={(v) => setEditForm({ ...editForm, region: v })} testId="input-labs-edit-region" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <EditField label={t("drams.age")} value={editForm.age} onChange={(v) => setEditForm({ ...editForm, age: v })} testId="input-labs-edit-age" />
            <EditField label={t("drams.abv")} value={editForm.abv} onChange={(v) => setEditForm({ ...editForm, abv: v })} testId="input-labs-edit-abv" />
            <EditField label={t("drams.caskType")} value={editForm.caskType} onChange={(v) => setEditForm({ ...editForm, caskType: v })} testId="input-labs-edit-caskType" />
          </div>
          <EditField label={t("drams.score")} value={editForm.personalScore} onChange={(v) => setEditForm({ ...editForm, personalScore: v })} testId="input-labs-edit-score" type="number" />

          {selectedEntry.status === "draft" && !editStructured && (
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--labs-text-muted)" }}>{t("drams.individualScores")}</label>
              <div className="grid grid-cols-3 gap-2">
                {(["nose", "taste", "finish"] as const).map((dim) => (
                  <div key={dim}>
                    <label className="text-[11px] font-medium uppercase tracking-wider block mb-0.5" style={{ color: "var(--labs-text-muted)" }}>{t(`drams.${dim}`)}</label>
                    <input
                      type="number" min="0" max="100"
                      value={editForm[`${dim}Score`] || ""}
                      onChange={(e) => setEditForm({ ...editForm, [`${dim}Score`]: e.target.value })}
                      style={{ width: "100%", padding: "8px 6px", textAlign: "center", background: "var(--labs-surface)", border: "1px solid var(--labs-border)", borderRadius: 8, fontSize: 16, fontWeight: 700, color: "var(--labs-accent)", outline: "none", boxSizing: "border-box" }}
                      data-testid={`input-labs-edit-${dim}Score`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {editStructured ? (
            <div className="flex flex-col gap-3">
              <EditTextarea label={t("drams.notes")} value={editStructured.generalNotes} onChange={(v) => setEditStructured({ ...editStructured, generalNotes: v })} testId="input-labs-edit-general-notes" />
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--labs-text-muted)" }}>{t("drams.subScores")}</label>
                <div className="labs-auto-grid" style={{ "--grid-min": "70px", gap: "0.5rem" } as React.CSSProperties}>
                  {(["nose", "taste", "finish"] as const).map((dim) => (
                    <div key={dim}>
                      <label className="text-[11px] font-medium uppercase tracking-wider block mb-0.5" style={{ color: "var(--labs-text-muted)" }}>{t(`drams.${dim}`)}</label>
                      <input type="number" min="0" max="100" value={editStructured.scores[dim]} onChange={(e) => setEditStructured({ ...editStructured, scores: { ...editStructured.scores, [dim]: e.target.value } })}
                        style={{ width: "100%", padding: "8px 6px", textAlign: "center", background: "var(--labs-surface)", border: "1px solid var(--labs-border)", borderRadius: 8, fontSize: 16, fontWeight: 700, color: "var(--labs-accent)", outline: "none", boxSizing: "border-box" }}
                        data-testid={`input-labs-edit-score-${dim}`} />
                    </div>
                  ))}
                </div>
              </div>
              {(["nose", "taste", "finish"] as const).map((dim) => {
                const d = editStructured.dims[dim];
                if (!d) return null;
                return (
                  <div key={dim}>
                    <label className="text-xs font-semibold block mb-1" style={{ color: "var(--labs-text-muted)" }}>{t(`drams.${dim}`)}</label>
                    <EditField label={t("drams.descriptors")} value={d.chips} onChange={(v) => setEditStructured({ ...editStructured, dims: { ...editStructured.dims, [dim]: { ...d, chips: v } } })} testId={`input-labs-edit-chips-${dim}`} />
                    <div className="mt-1"><EditTextarea label={t("drams.description")} value={d.text} onChange={(v) => setEditStructured({ ...editStructured, dims: { ...editStructured.dims, [dim]: { ...d, text: v } } })} testId={`input-labs-edit-text-${dim}`} /></div>
                  </div>
                );
              })}
              <EditTextarea label={t("drams.overall")} value={editForm.overallNotes} onChange={(v) => setEditForm({ ...editForm, overallNotes: v })} testId="input-labs-edit-overall" />
            </div>
          ) : (
            <>
              <EditTextarea label={t("drams.nose")} value={editForm.noseNotes} onChange={(v) => setEditForm({ ...editForm, noseNotes: v })} testId="input-labs-edit-nose" />
              <EditTextarea label={t("drams.taste")} value={editForm.tasteNotes} onChange={(v) => setEditForm({ ...editForm, tasteNotes: v })} testId="input-labs-edit-taste" />
              <EditTextarea label={t("drams.finish")} value={editForm.finishNotes} onChange={(v) => setEditForm({ ...editForm, finishNotes: v })} testId="input-labs-edit-finish" />
              <EditTextarea label={t("drams.overall")} value={editForm.overallNotes} onChange={(v) => setEditForm({ ...editForm, overallNotes: v })} testId="input-labs-edit-overall" />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="labs-page" style={{ paddingBottom: 32 }} data-testid="labs-taste-drams">
      <div>
        <button onClick={goBackToTaste} className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-3" style={{ color: "var(--labs-text-muted)", fontSize: 13 }} data-testid="button-labs-back-taste">
          <ChevronLeft className="w-4 h-4" /> {t("drams.backTaste")}
        </button>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h1 className="labs-serif" style={{ fontSize: 26, fontWeight: 700, color: "var(--labs-text)", margin: 0 }} data-testid="labs-drams-title">{t("drams.title")}</h1>
          <button onClick={() => navigate("/labs/solo")} className="labs-btn-primary flex items-center gap-1.5" style={{ padding: "7px 14px", fontSize: 13, borderRadius: 10 }} data-testid="button-labs-add-dram">
            <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("drams.addDram")}
          </button>
        </div>
      </div>

      {!session.signedIn ? (
        <div style={{ padding: "0 20px" }}>
          <AuthGateMessage
            icon={<Wine className="w-10 h-10" style={{ color: "var(--labs-accent)" }} />}
            title={t("authGate.drams.title")}
            bullets={[t("authGate.drams.bullet1"), t("authGate.drams.bullet2"), t("authGate.drams.bullet3")]}
            className="labs-empty"
            compact
          />
        </div>
      ) : (
        <>
          {allItems.length > 0 && (
            <div style={{ padding: "0 20px", marginBottom: 12 }}>
              <button
                onClick={() => setStatsExpanded(!statsExpanded)}
                className="w-full flex items-center justify-between"
                style={{ padding: "10px 14px", background: "var(--labs-surface-elevated, var(--labs-card-bg, rgba(255,255,255,0.045)))", border: "1px solid var(--labs-border)", borderRadius: 12, cursor: "pointer", color: "var(--labs-text)" }}
                data-testid="button-labs-toggle-stats"
              >
                <div className="flex items-center gap-3">
                  <span className="labs-serif" style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-accent)" }}>{allItems.length}</span>
                  <span style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>{t("drams.dramsLogged")}</span>
                </div>
                <ChevronDown className="w-4 h-4" style={{ color: "var(--labs-text-muted)", transition: "transform 0.2s", transform: statsExpanded ? "rotate(180deg)" : "rotate(0)" }} />
              </button>
              {statsExpanded && (
                <div className="labs-auto-grid" style={{ "--grid-min": "100px", gap: "0.5rem", marginTop: 8 } as React.CSSProperties} data-testid="labs-drams-overview">
                  {[
                    { value: allItems.length, label: t("drams.total") },
                    { value: journal.filter((e: any) => e.status !== "draft").length, label: t("drams.solo") },
                    { value: tastingWhiskies.length, label: t("drams.tastings") },
                    { value: journal.filter((e: any) => e.status === "draft").length, label: t("drams.drafts") },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "center", padding: "10px 4px", background: "var(--labs-surface-elevated, var(--labs-card-bg, rgba(255,255,255,0.045)))", borderRadius: 10, border: "1px solid var(--labs-border)" }}>
                      <div className="labs-h2" style={{ color: "var(--labs-accent)", fontSize: 20 }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeFilter !== "drafts" && journal.filter((e: any) => e.status === "draft").length > 0 && (
            <div style={{ padding: "0 20px", marginBottom: 12 }} data-testid="labs-draft-banner">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "rgba(200,134,26,0.08)",
                  border: "1px solid rgba(200,134,26,0.2)",
                  cursor: "pointer",
                }}
                onClick={() => setActiveFilter("drafts")}
              >
                <FileEdit style={{ width: 16, height: 16, color: "#c8861a", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>
                    {t("v2.drams.draftBanner", "{{count}} offene Drafts — direkt zum Drafts-Tab →", { count: journal.filter((e: any) => e.status === "draft").length })}
                  </div>
                </div>
                <ChevronLeft style={{ width: 16, height: 16, color: "#c8861a", transform: "rotate(180deg)" }} />
              </div>
            </div>
          )}

          <div style={{ padding: "0 20px", marginBottom: 12 }}>
            <div className="labs-segmented" style={{ marginBottom: 0 }}>
              {FILTER_KEYS.map(fk => (
                <button key={fk} onClick={() => setActiveFilter(fk)}
                  className={`labs-segmented-btn ${activeFilter === fk ? "labs-segmented-btn-active" : ""}`}
                  style={{ fontSize: 13, padding: "6px 0" }}
                  data-testid={`labs-filter-${fk}`}>{t(FILTER_I18N[fk])}</button>
              ))}
            </div>
          </div>

          <div style={{ padding: "0 20px", marginBottom: 8 }}>
            <button
              onClick={() => setViewState("trash")}
              className="flex items-center gap-1.5"
              style={{ fontSize: 12, color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
              data-testid="button-labs-open-trash"
            >
              <Trash2 className="w-3.5 h-3.5" /> {t("drams.trash")}
            </button>
          </div>

          <div style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--labs-bg, #0e0b05)", padding: "8px 20px", borderBottom: "1px solid var(--labs-border)", maxWidth: "100%", boxSizing: "border-box", overflowX: "clip" }}>
            <div className="flex items-center gap-2" style={{ minWidth: 0, maxWidth: "100%" }}>
              <div className="relative" style={{ flex: "1 1 0", minWidth: 0 }}>
                <Search className="absolute" style={{ left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "var(--labs-text-muted)" }} />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("drams.search")}
                  className="labs-input" style={{ paddingLeft: 36, fontSize: 14, height: 38, borderRadius: 10, width: "100%", minWidth: 0 }}
                  data-testid="input-labs-search-drams" />
                {search && (
                  <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", padding: 2 }} data-testid="button-labs-clear-search">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setFilterSheetOpen(true)}
                className="flex items-center gap-1.5"
                style={{
                  padding: "8px 12px", fontSize: 13, fontWeight: 500, borderRadius: 10, cursor: "pointer",
                  background: activeFilterCount > 0 ? "var(--labs-accent-muted, rgba(212,168,71,0.12))" : "var(--labs-surface-elevated, var(--labs-card-bg, rgba(255,255,255,0.045)))",
                  border: `1px solid ${activeFilterCount > 0 ? "var(--labs-accent)" : "var(--labs-border)"}`,
                  color: activeFilterCount > 0 ? "var(--labs-accent)" : "var(--labs-text-muted)",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}
                data-testid="button-labs-open-filters"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {t("drams.filter")}
                {activeFilterCount > 0 && (
                  <span style={{ background: "var(--labs-accent)", color: "var(--labs-bg, #0e0b05)", fontSize: 11, fontWeight: 700, borderRadius: 999, minWidth: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{activeFilterCount}</span>
                )}
              </button>
              <div className="relative" style={{ flexShrink: 0 }}>
                <button
                  onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  className="flex items-center gap-1.5"
                  style={{
                    padding: "8px 12px", fontSize: 13, fontWeight: 500, borderRadius: 10, cursor: "pointer",
                    background: "var(--labs-surface-elevated, var(--labs-card-bg, rgba(255,255,255,0.045)))",
                    border: "1px solid var(--labs-border)", color: "var(--labs-text-muted)", whiteSpace: "nowrap",
                  }}
                  data-testid="button-sort-dropdown"
                >
                  {sortDirection === "desc" ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
                  {sortBy === "saved" ? t("drams.saved") : sortBy === "date" ? t("drams.date") : sortBy === "score" ? t("drams.score") : t("drams.name")}
                </button>
                {sortDropdownOpen && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setSortDropdownOpen(false)} />
                    <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50, minWidth: 180, background: "var(--labs-card-bg, #1a1a2e)", border: "1px solid var(--labs-border, #2a2a4a)", borderRadius: 12, padding: 6, boxShadow: "0 12px 32px rgba(0,0,0,0.4)" }}>
                      <div style={{ padding: "6px 10px 4px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--labs-text-muted)" }}>{t("drams.sortBy")}</div>
                      {([
                        { key: "saved" as SortBy, label: t("drams.sortSaved") },
                        { key: "date" as SortBy, label: t("drams.sortDate") },
                        { key: "score" as SortBy, label: t("drams.sortScore") },
                        { key: "name" as SortBy, label: t("drams.sortName") },
                      ]).map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => { setSortBy(opt.key); setSortDropdownOpen(false); }}
                          className="w-full text-left flex items-center gap-2"
                          style={{ fontSize: 13, padding: "8px 10px", borderRadius: 8, color: sortBy === opt.key ? "var(--labs-accent, #f59e0b)" : "var(--labs-text, #e2e2e2)", background: sortBy === opt.key ? "rgba(245,158,11,0.08)" : "transparent", border: "none", cursor: "pointer", transition: "background 0.15s" }}
                          data-testid={`sort-option-${opt.key}`}
                        >
                          {sortBy === opt.key && <Check className="w-3.5 h-3.5" />}
                          <span style={{ marginLeft: sortBy === opt.key ? 0 : 18 }}>{opt.label}</span>
                        </button>
                      ))}
                      <div style={{ height: 1, background: "var(--labs-border)", margin: "4px 0" }} />
                      <div style={{ padding: "6px 10px 4px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--labs-text-muted)" }}>{t("drams.direction")}</div>
                      {([
                        { key: "desc" as SortDirection, label: t("drams.descending"), icon: <ArrowDown className="w-3.5 h-3.5" /> },
                        { key: "asc" as SortDirection, label: t("drams.ascending"), icon: <ArrowUp className="w-3.5 h-3.5" /> },
                      ]).map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => { setSortDirection(opt.key); setSortDropdownOpen(false); }}
                          className="w-full text-left flex items-center gap-2"
                          style={{ fontSize: 13, padding: "8px 10px", borderRadius: 8, color: sortDirection === opt.key ? "var(--labs-accent, #f59e0b)" : "var(--labs-text, #e2e2e2)", background: sortDirection === opt.key ? "rgba(245,158,11,0.08)" : "transparent", border: "none", cursor: "pointer", transition: "background 0.15s" }}
                          data-testid={`sort-direction-${opt.key}`}
                        >
                          {sortDirection === opt.key ? opt.icon : <span style={{ width: 14 }} />}
                          <span style={{ marginLeft: sortDirection === opt.key ? 0 : 4 }}>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {activeFilterChips.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap" style={{ padding: "8px 20px 0" }}>
              {activeFilterChips.map((chip, i) => (
                <button
                  key={i}
                  onClick={chip.onClear}
                  className="flex items-center gap-1"
                  style={{ padding: "4px 10px", fontSize: 12, fontWeight: 500, borderRadius: 999, background: "var(--labs-accent-muted, rgba(212,168,71,0.12))", color: "var(--labs-accent)", border: "1px solid color-mix(in srgb, var(--labs-accent) 25%, transparent)", cursor: "pointer" }}
                  data-testid={`filter-chip-${i}`}
                >
                  {chip.label}
                  <X className="w-3 h-3" />
                </button>
              ))}
              {activeFilterChips.length > 1 && (
                <button
                  onClick={clearAdvancedFilters}
                  style={{ padding: "4px 8px", fontSize: 11, fontWeight: 500, color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}
                  data-testid="button-labs-clear-all-filters"
                >
                  {t("drams.clearAll")}
                </button>
              )}
            </div>
          )}

          <div style={{ padding: "12px 20px 0" }}>
            {isError ? (
              <div className="labs-card" style={{ padding: "40px 20px", textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "color-mix(in srgb, var(--labs-danger, #ef4444) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <RotateCcw className="w-5 h-5" style={{ color: "var(--labs-danger, #ef4444)" }} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", marginBottom: 4 }}>{t("drams.failedToLoad")}</p>
                <p style={{ fontSize: 13, color: "var(--labs-text-muted)", marginBottom: 16 }}>{t("drams.failedToLoadDesc")}</p>
                <button onClick={() => refetch()} className="labs-btn-secondary flex items-center gap-1.5" style={{ margin: "0 auto", padding: "8px 20px", fontSize: 13 }} data-testid="button-labs-retry">
                  <RotateCcw className="w-3.5 h-3.5" /> {t("drams.retry")}
                </button>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="labs-card" style={{ padding: "16px 18px" }} data-testid={`skeleton-card-${i}`}>
                    <div className="flex items-start gap-3">
                      <div style={{ width: 44, height: 56, borderRadius: 8, background: "var(--labs-border)", opacity: 0.5, animation: "pulse 1.5s ease-in-out infinite" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 16, width: "65%", borderRadius: 6, background: "var(--labs-border)", opacity: 0.5, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
                        <div style={{ height: 12, width: "40%", borderRadius: 5, background: "var(--labs-border)", opacity: 0.35, marginBottom: 10, animation: "pulse 1.5s ease-in-out infinite", animationDelay: "0.15s" }} />
                        <div style={{ height: 10, width: "30%", borderRadius: 4, background: "var(--labs-border)", opacity: 0.25, animation: "pulse 1.5s ease-in-out infinite", animationDelay: "0.3s" }} />
                      </div>
                      <div style={{ width: 42, height: 28, borderRadius: 14, background: "var(--labs-border)", opacity: 0.4, animation: "pulse 1.5s ease-in-out infinite", animationDelay: "0.2s" }} />
                    </div>
                  </div>
                ))}
                <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }`}</style>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                {allItems.length === 0 ? (
                  <>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--labs-accent-muted, rgba(212,168,71,0.12))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                      <BookOpen className="w-6 h-6" style={{ color: "var(--labs-accent)" }} />
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--labs-text)", marginBottom: 6 }}>{t("drams.noEntries")}</h3>
                    <p style={{ fontSize: 14, color: "var(--labs-text-muted)", marginBottom: 20, lineHeight: 1.5 }}>{t("drams.noEntriesDesc")}</p>
                    <button onClick={() => navigate("/labs/solo")} className="labs-btn-primary flex items-center gap-1.5" style={{ margin: "0 auto", padding: "10px 20px", fontSize: 14 }} data-testid="button-labs-add-first-dram">
                      <Plus className="w-4 h-4" /> {t("drams.addFirstDram")}
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--labs-surface-elevated, var(--labs-card-bg, rgba(255,255,255,0.045)))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                      <Search className="w-6 h-6" style={{ color: "var(--labs-text-muted)" }} />
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--labs-text)", marginBottom: 6 }}>{t("drams.noMatches")}</h3>
                    <p style={{ fontSize: 14, color: "var(--labs-text-muted)", marginBottom: 16, lineHeight: 1.5 }}>{t("drams.noMatchesDesc")}</p>
                    <button onClick={resetAllFilters} className="labs-btn-secondary flex items-center gap-1.5" style={{ margin: "0 auto", padding: "8px 16px", fontSize: 13 }} data-testid="button-labs-reset-filters">
                      <RotateCcw className="w-3.5 h-3.5" /> {t("drams.clearAllFilters")}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap: 10 }}>
                <div style={{ fontSize: 12, color: "var(--labs-text-muted)", padding: "0 2px" }}>
                  {hasAnyFilter ? t("drams.entriesOfCount", { filtered: filteredEntries.length, total: allItems.length }) : t("drams.entriesCount", { count: filteredEntries.length })}
                </div>
                {filteredEntries.map((entry: any) => (
                  <div key={entry.id} onClick={() => handleView(entry)} className="labs-card labs-card-interactive" style={{ padding: "16px 18px", cursor: "pointer", borderRadius: 14, ...(entry.status === "draft" ? { borderStyle: "dashed", borderColor: "rgba(200,134,26,0.35)", background: "rgba(200,134,26,0.04)" } : {}) }} data-testid={`labs-dram-${entry.id}`}>
                    <div className="flex items-start gap-3">
                      <WhiskyImage imageUrl={entry.imageUrl} name={entry.name || entry.title || ""} size={44} height={56} className="flex-shrink-0" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--labs-text)", lineHeight: 1.3, marginBottom: 3 }} className="truncate">{entry.name || entry.title || "—"}</div>
                        {entry.distillery && <div style={{ fontSize: 13, color: "var(--labs-text-secondary, var(--labs-text-muted))", marginBottom: 6 }} className="truncate">{entry.distillery}</div>}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {entry.status === "draft" && (
                            <span className={getStatusConfig("draft").cssClass} data-testid={`labs-badge-draft-${entry.id}`}>{t(getStatusConfig("draft").labelKey, getStatusConfig("draft").fallbackLabel)}</span>
                          )}
                          {entry.source === "tasting" && (
                            <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 999, background: "color-mix(in srgb, var(--labs-accent) 12%, transparent)", color: "var(--labs-accent)" }}>{t("drams.tasting")}</span>
                          )}
                          {entry.createdAt && (
                            <span className="flex items-center gap-1" style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
                              <Calendar className="w-3 h-3" />{new Date(entry.createdAt).toLocaleDateString()}
                            </span>
                          )}
                          {entry.region && (
                            <span className="flex items-center gap-1" style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
                              <MapPin className="w-3 h-3" />{entry.region}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        {entry.personalScore != null && (
                          <div style={{ background: "var(--labs-accent-muted, rgba(212,168,71,0.12))", borderRadius: 12, padding: "6px 10px", textAlign: "center", minWidth: 44 }}>
                            <div className="labs-serif" style={{ fontSize: 17, fontWeight: 700, color: "var(--labs-accent)", lineHeight: 1.1 }}>{Number(entry.personalScore).toFixed(1)}</div>
                          </div>
                        )}
                        {(entry.noseScore != null || entry.tasteScore != null || entry.finishScore != null) && (
                          <div className="flex gap-1" data-testid={`labs-dram-subscores-${entry.id}`}>
                            {entry.noseScore != null && (
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 6, background: "var(--labs-surface-elevated, rgba(255,255,255,0.06))", color: "var(--labs-text-muted)", lineHeight: 1.4 }} data-testid={`labs-badge-nose-${entry.id}`}>N {Number(entry.noseScore).toFixed(0)}</span>
                            )}
                            {entry.tasteScore != null && (
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 6, background: "var(--labs-surface-elevated, rgba(255,255,255,0.06))", color: "var(--labs-text-muted)", lineHeight: 1.4 }} data-testid={`labs-badge-taste-${entry.id}`}>T {Number(entry.tasteScore).toFixed(0)}</span>
                            )}
                            {entry.finishScore != null && (
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 6, background: "var(--labs-surface-elevated, rgba(255,255,255,0.06))", color: "var(--labs-text-muted)", lineHeight: 1.4 }} data-testid={`labs-badge-finish-${entry.id}`}>F {Number(entry.finishScore).toFixed(0)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {filterSheetOpen && (
            <FilterBottomSheet
              datePeriod={datePeriod} setDatePeriod={setDatePeriod}
              scoreRange={scoreRange} setScoreRange={setScoreRange}
              filterDistillery={filterDistillery} setFilterDistillery={setFilterDistillery}
              filterRegion={filterRegion} setFilterRegion={setFilterRegion}
              filterCaskType={filterCaskType} setFilterCaskType={setFilterCaskType}
              uniqueDistilleries={uniqueDistilleries} uniqueRegions={uniqueRegions} uniqueCaskTypes={uniqueCaskTypes}
              onClose={() => setFilterSheetOpen(false)}
              onClear={clearAdvancedFilters}
              activeCount={activeFilterCount}
            />
          )}
        </>
      )}

      {deleteTarget && <DeleteDialog onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} isPending={deleteMutation.isPending} />}
    </div>
  );
}

function FilterBottomSheet({
  datePeriod, setDatePeriod, scoreRange, setScoreRange,
  filterDistillery, setFilterDistillery, filterRegion, setFilterRegion,
  filterCaskType, setFilterCaskType,
  uniqueDistilleries, uniqueRegions, uniqueCaskTypes,
  onClose, onClear, activeCount,
}: {
  datePeriod: DatePeriod; setDatePeriod: (v: DatePeriod) => void;
  scoreRange: ScoreRange; setScoreRange: (v: ScoreRange) => void;
  filterDistillery: string; setFilterDistillery: (v: string) => void;
  filterRegion: string; setFilterRegion: (v: string) => void;
  filterCaskType: string; setFilterCaskType: (v: string) => void;
  uniqueDistilleries: string[]; uniqueRegions: string[]; uniqueCaskTypes: string[];
  onClose: () => void; onClear: () => void; activeCount: number;
}) {
  const { t } = useTranslation();
  const selectStyle = (isActive: boolean) => ({
    width: "100%", padding: "10px 32px 10px 12px", fontSize: 14, fontWeight: isActive ? 600 : 400,
    color: isActive ? "var(--labs-accent)" : "var(--labs-text)",
    background: "var(--labs-surface-elevated, var(--labs-card-bg, rgba(255,255,255,0.045)))",
    border: `1px solid ${isActive ? "var(--labs-accent)" : "var(--labs-border)"}`,
    borderRadius: 10, cursor: "pointer", appearance: "none" as const, WebkitAppearance: "none" as const, outline: "none", boxSizing: "border-box" as const,
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100 }} data-testid="filter-bottom-sheet">
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "80vh", maxWidth: 672, margin: "0 auto", background: "var(--labs-bg, #0e0b05)", borderRadius: "20px 20px 0 0", overflow: "auto", padding: "0 0 env(safe-area-inset-bottom, 20px)", boxShadow: "0 -8px 32px rgba(0,0,0,0.4)" }}>
        <div style={{ position: "sticky", top: 0, background: "var(--labs-bg, #0e0b05)", padding: "16px 20px 12px", borderBottom: "1px solid var(--labs-border)", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--labs-text)", margin: 0 }}>{t("drams.filters")}</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--labs-surface-elevated, var(--labs-card-bg, rgba(255,255,255,0.045)))", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} data-testid="button-close-filter-sheet">
            <X className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
          </button>
        </div>

        <div style={{ padding: "16px 20px" }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--labs-text-muted)", display: "block", marginBottom: 8 }}>{t("drams.datePeriod")}</label>
            <div className="flex gap-2 flex-wrap">
              {DATE_PERIOD_KEYS.map(p => (
                <button key={p.key} onClick={() => setDatePeriod(p.key)}
                  style={{
                    padding: "7px 14px", fontSize: 13, fontWeight: datePeriod === p.key ? 600 : 400, borderRadius: 999, cursor: "pointer",
                    background: datePeriod === p.key ? "var(--labs-accent-muted, rgba(212,168,71,0.12))" : "var(--labs-surface-elevated, var(--labs-card-bg, rgba(255,255,255,0.045)))",
                    border: `1px solid ${datePeriod === p.key ? "var(--labs-accent)" : "var(--labs-border)"}`,
                    color: datePeriod === p.key ? "var(--labs-accent)" : "var(--labs-text-muted)",
                  }}
                  data-testid={`labs-period-${p.key}`}
                >{t(p.i18nKey)}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--labs-text-muted)", display: "block", marginBottom: 8 }}>{t("drams.scoreRange")}</label>
            <div className="flex gap-2 flex-wrap">
              {(["all", "90+", "80-89", "70-79", "<70"] as ScoreRange[]).map(sr => (
                <button key={sr} onClick={() => setScoreRange(sr)}
                  style={{
                    padding: "7px 14px", fontSize: 13, fontWeight: scoreRange === sr ? 600 : 400, borderRadius: 999, cursor: "pointer",
                    background: scoreRange === sr ? "var(--labs-accent-muted, rgba(212,168,71,0.12))" : "var(--labs-surface-elevated, var(--labs-card-bg, rgba(255,255,255,0.045)))",
                    border: `1px solid ${scoreRange === sr ? "var(--labs-accent)" : "var(--labs-border)"}`,
                    color: scoreRange === sr ? "var(--labs-accent)" : "var(--labs-text-muted)",
                  }}
                  data-testid={`labs-score-${sr}`}
                >{sr === "all" ? t("drams.all") : sr}</button>
              ))}
            </div>
          </div>

          {uniqueDistilleries.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--labs-text-muted)", display: "block", marginBottom: 8 }}>{t("drams.distillery")}</label>
              <div style={{ position: "relative" }}>
                <select value={filterDistillery} onChange={(e) => setFilterDistillery(e.target.value)} style={selectStyle(filterDistillery !== "all")} data-testid="labs-filter-distillery">
                  <option value="all">{t("drams.allDistilleries")}</option>
                  {uniqueDistilleries.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--labs-text-muted)", pointerEvents: "none" }} />
              </div>
            </div>
          )}

          {uniqueRegions.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--labs-text-muted)", display: "block", marginBottom: 8 }}>{t("drams.region")}</label>
              <div style={{ position: "relative" }}>
                <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} style={selectStyle(filterRegion !== "all")} data-testid="labs-filter-region">
                  <option value="all">{t("drams.allRegions")}</option>
                  {uniqueRegions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--labs-text-muted)", pointerEvents: "none" }} />
              </div>
            </div>
          )}

          {uniqueCaskTypes.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--labs-text-muted)", display: "block", marginBottom: 8 }}>{t("drams.caskType")}</label>
              <div style={{ position: "relative" }}>
                <select value={filterCaskType} onChange={(e) => setFilterCaskType(e.target.value)} style={selectStyle(filterCaskType !== "all")} data-testid="labs-filter-cask-type">
                  <option value="all">{t("drams.allCaskTypes")}</option>
                  {uniqueCaskTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--labs-text-muted)", pointerEvents: "none" }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "12px 20px 20px", borderTop: "1px solid var(--labs-border)", display: "flex", gap: 10 }}>
          {activeCount > 0 && (
            <button onClick={() => { onClear(); }} className="labs-btn-secondary" style={{ flex: 1, padding: "12px", fontSize: 14, borderRadius: 12 }} data-testid="button-filter-clear">
              {t("drams.clearAll")}
            </button>
          )}
          <button onClick={onClose} className="labs-btn-primary" style={{ flex: activeCount > 0 ? 2 : 1, padding: "12px", fontSize: 14, borderRadius: 12 }} data-testid="button-filter-apply">
            {activeCount > 0 ? t("drams.doneActive", { count: activeCount }) : t("drams.done")}
          </button>
        </div>
      </div>
    </div>
  );
}

const PLACE_LABEL_KEYS: Record<string, string> = {
  atHome: "v2.contextAtHome", fair: "v2.contextFair", restaurant: "v2.contextRestaurant",
  bar: "v2.contextBar", onTheGo: "v2.contextOnTheGo", other: "v2.contextOther",
};
const COMPANY_LABEL_KEYS: Record<string, string> = {
  alone: "v2.contextAlone", withFriends: "v2.contextWithFriends",
  withFamily: "v2.contextWithFamily", withColleagues: "v2.contextWithColleagues",
  other: "v2.contextOther",
};
const MOOD_LABEL_KEYS: Record<string, string> = {
  relaxed: "v2.contextRelaxed", focused: "v2.contextFocused",
  celebratory: "v2.contextCelebratory", curious: "v2.contextCurious",
};

interface ParsedTastingContext {
  place?: string;
  placeCustom?: string;
  company?: string;
  companyCustom?: string;
  mood?: string;
}

function parseTastingContext(raw: string | null | undefined): ParsedTastingContext | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const obj = value as Record<string, unknown>;
    const out: ParsedTastingContext = {};
    if (typeof obj.place === "string") out.place = obj.place;
    if (typeof obj.placeCustom === "string") out.placeCustom = obj.placeCustom;
    if (typeof obj.company === "string") out.company = obj.company;
    if (typeof obj.companyCustom === "string") out.companyCustom = obj.companyCustom;
    if (typeof obj.mood === "string") out.mood = obj.mood;
    return out;
  } catch {
    return null;
  }
}

function TastingContextLine({ raw }: { raw?: string | null }) {
  const { t } = useTranslation();
  const parsed = parseTastingContext(raw);
  if (!parsed) return null;

  const placeLabel = parsed.place === "other"
    ? (parsed.placeCustom || t("v2.contextOther", "Other"))
    : (parsed.place ? t(PLACE_LABEL_KEYS[parsed.place] || parsed.place, parsed.place) : "");
  const companyLabel = parsed.company === "other"
    ? (parsed.companyCustom || t("v2.contextOther", "Other"))
    : (parsed.company ? t(COMPANY_LABEL_KEYS[parsed.company] || parsed.company, parsed.company) : "");
  const moodLabel = parsed.mood ? t(MOOD_LABEL_KEYS[parsed.mood] || parsed.mood, parsed.mood) : "";

  if (!placeLabel && !companyLabel && !moodLabel) return null;

  return (
    <div
      data-testid="dram-tasting-context"
      style={{
        display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8,
        marginTop: 8, marginBottom: 8,
        fontSize: 12, color: "var(--labs-text-muted)",
      }}
    >
      {placeLabel && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <MapPin style={{ width: 12, height: 12 }} />{placeLabel}
        </span>
      )}
      {placeLabel && (companyLabel || moodLabel) && <span aria-hidden="true">·</span>}
      {companyLabel && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Users style={{ width: 12, height: 12 }} />{companyLabel}
        </span>
      )}
      {companyLabel && moodLabel && <span aria-hidden="true">·</span>}
      {moodLabel && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Smile style={{ width: 12, height: 12 }} />{moodLabel}
        </span>
      )}
    </div>
  );
}

function MetaBadge({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--labs-surface-elevated)", borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
      <span style={{ color: "var(--labs-text-muted)" }}>{label}: </span>
      <span style={{ color: "var(--labs-text)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function NoteSection({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--labs-border)" }}>
      <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--labs-text-muted)" }}>{label}</div>
      <div className="text-sm" style={{ color: "var(--labs-text-secondary)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{value}</div>
    </div>
  );
}

function ParsedNotesSection({ raw }: { raw: string }) {
  const { t } = useTranslation();
  const { cleanText, scores, dims } = parseNoseNotes(raw);
  const hasScores = Object.keys(scores).length > 0;
  const hasDims = Object.keys(dims).length > 0;
  const dimLabels: Record<string, string> = { nose: t("drams.nose"), taste: t("drams.taste"), finish: t("drams.finish") };
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--labs-border)" }}>
      {cleanText && (
        <div style={{ marginBottom: hasDims || hasScores ? 12 : 0 }}>
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--labs-text-muted)" }}>{t("drams.notes")}</div>
          <div className="text-sm" style={{ color: "var(--labs-text-secondary)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{cleanText}</div>
        </div>
      )}
      {hasScores && (
        <div className="flex flex-wrap gap-2" style={{ marginBottom: hasDims ? 12 : 0 }}>
          {(["nose", "taste", "finish"] as const).map(k => scores[k] != null ? (
            <div key={k} style={{ background: "var(--labs-surface-elevated)", borderRadius: 8, padding: "6px 12px", textAlign: "center", minWidth: 56 }}>
              <div className="labs-h3" style={{ color: "var(--labs-accent)" }}>{scores[k]}</div>
              <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>{dimLabels[k]}</div>
            </div>
          ) : null)}
        </div>
      )}
      {hasDims && (
        <div className="flex flex-col gap-2.5">
          {(["nose", "taste", "finish"] as const).map(k => {
            const dim = dims[k];
            if (!dim) return null;
            return (
              <div key={k}>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--labs-text-muted)" }}>{dimLabels[k]}</div>
                {dim.chips.length > 0 && (
                  <div className="flex flex-wrap gap-1" style={{ marginBottom: dim.text ? 4 : 0 }}>
                    {dim.chips.map(chip => (
                      <span key={chip} style={{ fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 999, background: "var(--labs-accent-muted)", color: "var(--labs-accent)", border: "1px solid color-mix(in srgb, var(--labs-accent) 20%, transparent)" }}>{chip}</span>
                    ))}
                  </div>
                )}
                {dim.text && <div className="text-sm" style={{ color: "var(--labs-text-secondary)", lineHeight: 1.5 }}>{dim.text}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VoiceMemoSection({ url, transcript, duration }: { url?: string | null; transcript?: string | null; duration?: number | null }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!url) { audioRef.current = null; return; }
    const a = new Audio(url);
    a.onended = () => setPlaying(false);
    audioRef.current = a;
    return () => { a.pause(); a.onended = null; audioRef.current = null; };
  }, [url]);
  useEffect(() => () => { audioRef.current?.pause(); }, []);
  if (!url && !transcript) return null;
  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); } else { a.play().catch(() => setPlaying(false)); setPlaying(true); }
  };
  const fmtDuration = duration && duration > 0 ? `${Math.floor(duration / 60)}:${String(Math.round(duration % 60)).padStart(2, "0")}` : null;
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--labs-border)" }}>
      <div className="text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: "var(--labs-text-muted)" }}>
        <Mic className="w-3 h-3" /> {t("drams.voiceMemo")} {fmtDuration && <span style={{ fontWeight: 400, fontSize: 11 }}>({fmtDuration})</span>}
      </div>
      {url && (
        <button type="button" onClick={togglePlay} className="inline-flex items-center gap-1.5 mb-2" style={{ padding: "6px 14px", borderRadius: 8, background: playing ? "color-mix(in srgb, var(--labs-danger) 15%, transparent)" : "var(--labs-accent-muted)", border: `1px solid ${playing ? "color-mix(in srgb, var(--labs-danger) 30%, transparent)" : "color-mix(in srgb, var(--labs-accent) 20%, transparent)"}`, color: playing ? "var(--labs-danger)" : "var(--labs-accent)", fontSize: 12, fontWeight: 600, cursor: "pointer" }} data-testid="button-labs-play-voice-memo">
          {playing ? <Pause className="w-3 h-3" /> : <PlayIcon className="w-3 h-3" />} {playing ? t("drams.pause") : t("drams.play")}
        </button>
      )}
      {transcript && (
        <div className="text-sm italic p-2.5 rounded-lg" style={{ color: "var(--labs-text-secondary)", lineHeight: 1.6, background: "var(--labs-surface-elevated)" }}>
          "{transcript}"
        </div>
      )}
    </div>
  );
}

function HistoricalAppearances({ distillery, whiskyName }: { distillery: string; whiskyName: string }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const session = useSession();
  const pid = session?.pid || "";
  const query = new URLSearchParams();
  if (distillery) query.set("distillery", distillery);
  if (whiskyName) query.set("name", whiskyName);
  const { data, isLoading } = useQuery<any>({
    queryKey: ["historical-appearances", distillery, whiskyName],
    queryFn: () => fetch(`/api/historical/whisky-appearances?${query.toString()}`, { headers: pid ? { "x-participant-id": pid } : {} }).then(r => r.json()),
    enabled: !!(distillery || whiskyName),
  });
  if (isLoading || !data || data.count === 0) return null;
  return (
    <div style={{ marginTop: 20 }} data-testid="labs-historical-appearances">
      <div className="flex items-center gap-2 mb-3">
        <ScrollText className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
        <span className="labs-serif text-sm font-bold" style={{ color: "var(--labs-text)" }}>{t("drams.historicalAppearances")}</span>
      </div>
      <div className="labs-auto-grid mb-3" style={{ "--grid-min": "120px", gap: "0.5rem" } as React.CSSProperties}>
        <div className="labs-card p-2.5 text-center">
          <div className="labs-h3" style={{ color: "var(--labs-accent)" }}>{data.count}</div>
          <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>{t("drams.appearances")}</div>
        </div>
        {(data.avgScoreNormalized ?? data.avgScore) != null && (
          <div className="labs-card p-2.5 text-center">
            <div className="labs-h3" style={{ color: "var(--labs-accent)" }}>
              {Math.round(data.avgScoreNormalized ?? (data.avgScore ?? 0) * 10)}<span className="text-xs font-normal" style={{ color: "var(--labs-text-muted)" }}>/100</span>
            </div>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>{t("drams.avgScore")}</div>
          </div>
        )}
        {data.bestPlacement && (
          <div className="labs-card p-2.5 text-center">
            <div className="flex items-center justify-center gap-1">
              <Trophy className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />
              <span className="labs-h3" style={{ color: "var(--labs-accent)" }}>#{data.bestPlacement.rank}</span>
            </div>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>{t("drams.bestRank")}</div>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {data.appearances.slice(0, 5).map((a: any, i: number) => (
          <button key={i} onClick={() => navigate(`/labs/host/history/${a.tastingId}`)} className="labs-card labs-card-interactive flex items-center gap-2.5 p-2.5 w-full text-left" data-testid={`labs-historical-appearance-${i}`}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--labs-accent-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--labs-accent)", flexShrink: 0 }}>
              #{a.tastingNumber}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="text-xs font-semibold truncate" style={{ color: "var(--labs-text)" }}>{a.whiskyName || a.distillery}</div>
              <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{a.tastingTitle}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              {(a.normalizedTotal ?? a.totalScore) != null && (
                <div className="text-sm font-bold" style={{ color: "var(--labs-accent)" }}>
                  {Math.round(a.normalizedTotal ?? (a.totalScore ?? 0) * 10)}<span className="text-[11px] font-normal" style={{ color: "var(--labs-text-muted)" }}>/100</span>
                </div>
              )}
              {a.totalRank != null && <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{t("drams.rank")} {a.totalRank}</div>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function EditField({ label, value, onChange, testId, type = "text" }: { label: string; value: string; onChange: (v: string) => void; testId: string; type?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold block mb-1" style={{ color: "var(--labs-text-muted)" }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", background: "var(--labs-surface)", border: "1px solid var(--labs-border)", borderRadius: 8, fontSize: 14, color: "var(--labs-text)", outline: "none", boxSizing: "border-box" }}
        data-testid={testId} />
    </div>
  );
}

function EditTextarea({ label, value, onChange, testId }: { label: string; value: string; onChange: (v: string) => void; testId: string }) {
  return (
    <div>
      <label className="text-xs font-semibold block mb-1" style={{ color: "var(--labs-text-muted)" }}>{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
        style={{ width: "100%", padding: "10px 12px", background: "var(--labs-surface)", border: "1px solid var(--labs-border)", borderRadius: 8, fontSize: 14, color: "var(--labs-text)", outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: 1.5 }}
        data-testid={testId} />
    </div>
  );
}

function DeleteDialog({ onCancel, onConfirm, isPending }: { onCancel: () => void; onConfirm: () => void; isPending: boolean }) {
  const { t } = useTranslation();
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: "var(--z-overlay)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--overlay-backdrop)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)" }} data-testid="dialog-labs-delete-dram">
      <div className="labs-card" style={{ maxWidth: 380, width: "90%", padding: 24 }}>
        <h3 className="labs-h3 mb-2" style={{ color: "var(--labs-text)" }}>{t("drams.deleteDram")}</h3>
        <p className="text-sm mb-5" style={{ color: "var(--labs-text-secondary)" }}>{t("drams.deleteDesc")}</p>
        <div className="flex justify-end gap-2.5">
          <button onClick={onCancel} className="labs-btn-secondary" style={{ padding: "8px 16px", fontSize: 14 }} data-testid="button-labs-cancel-delete">{t("drams.cancel")}</button>
          <button onClick={onConfirm} disabled={isPending} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, color: "var(--labs-bg)", background: "var(--labs-danger)", border: "none", borderRadius: 8, cursor: "pointer", opacity: isPending ? 0.6 : 1 }} data-testid="button-labs-confirm-delete">
            {isPending ? "..." : t("drams.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

function FriendsAlsoRated({
  pid,
  whiskyName,
  distillery,
  ownOverall,
  ownNose,
  ownTaste,
  ownFinish,
}: {
  pid: string;
  whiskyName: string;
  distillery: string;
  ownOverall: number | null;
  ownNose: number | null;
  ownTaste: number | null;
  ownFinish: number | null;
}) {
  const { t } = useTranslation();
  const trimmedName = whiskyName.trim();
  const enabled = !!pid && !!trimmedName;

  const { data, isLoading } = useQuery<any[]>({
    queryKey: ["shared-ratings", pid, trimmedName.toLowerCase(), distillery.trim().toLowerCase()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (distillery.trim()) params.set("distillery", distillery.trim());
      const url = `/api/journal/shared-ratings/${encodeURIComponent(trimmedName)}${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { headers: { "x-participant-id": pid } });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
    enabled,
    staleTime: 60_000,
  });

  if (!enabled || isLoading) return null;
  const friends = data || [];
  if (friends.length === 0) return null;

  const fmt = (v: number | null | undefined) => (v == null ? "—" : Number(v).toFixed(0));
  const deltaFor = (own: number | null, theirs: number | null) => {
    if (own == null || theirs == null) return null;
    const diff = own - theirs;
    if (Math.abs(diff) < 0.05) return { value: 0, color: "var(--labs-text-muted)" };
    if (diff > 0) return { value: diff, color: "#10b981" };
    return { value: diff, color: "#f59e0b" };
  };

  return (
    <div
      className="labs-card"
      style={{ marginTop: 16, padding: 16 }}
      data-testid="friends-also-rated"
    >
      <div
        className="text-xs uppercase tracking-wider mb-3"
        style={{ color: "var(--labs-text-muted)", display: "flex", alignItems: "center", gap: 6 }}
      >
        <Users style={{ width: 14, height: 14 }} />
        {t("drams.friendsAlsoRated", "Also rated by")} ({friends.length})
      </div>
      <div className="flex flex-col gap-3">
        {friends.map((f: any, idx: number) => {
          const initial = (f.name || "?").trim().charAt(0).toUpperCase();
          const overallDelta = deltaFor(ownOverall, f.overallScore);
          return (
            <div
              key={`${f.friendId}-${idx}`}
              data-testid={`friend-rating-${f.friendId}-${idx}`}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "8px 0",
                borderTop: idx === 0 ? "none" : "1px solid var(--labs-border)",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: f.photoUrl ? `center/cover no-repeat url(${JSON.stringify(f.photoUrl)})` : "var(--labs-surface-elevated)",
                  color: "var(--labs-accent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 14, flexShrink: 0,
                  border: "1px solid var(--labs-border)",
                }}
              >
                {!f.photoUrl && initial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="text-sm"
                  style={{
                    color: "var(--labs-text)", fontWeight: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                  data-testid={`friend-name-${f.friendId}-${idx}`}
                >
                  {f.name}
                </div>
                <div
                  className="text-[11px]"
                  style={{ color: "var(--labs-text-muted)", display: "flex", flexWrap: "wrap", gap: 8, marginTop: 2 }}
                >
                  <span>N {fmt(f.noseScore)}</span>
                  <span>P {fmt(f.tasteScore)}</span>
                  <span>F {fmt(f.finishScore)}</span>
                  <span style={{ fontWeight: 600 }}>Ø {fmt(f.overallScore)}</span>
                </div>
              </div>
              {overallDelta && (
                <div
                  style={{ textAlign: "right", flexShrink: 0 }}
                  data-testid={`friend-delta-${f.friendId}-${idx}`}
                  title={t("drams.yourScoreVsFriend", "vs. your score") as string}
                >
                  <div style={{ color: overallDelta.color, fontWeight: 700, fontSize: 14 }}>
                    {overallDelta.value === 0 ? "±0" : `${overallDelta.value > 0 ? "+" : ""}${overallDelta.value.toFixed(1)}`}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>
                    {t("drams.yourScoreVsFriend", "vs. your score")}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
