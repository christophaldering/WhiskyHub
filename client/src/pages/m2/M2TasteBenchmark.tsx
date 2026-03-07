import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { getSession, useSession } from "@/lib/session";
import { useAIStatus } from "@/hooks/use-ai-status";
import { benchmarkApi, tastingApi } from "@/lib/api";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import {
  Upload, FileText, Loader2, Check, X, Trash2, Save, Brain, AlertCircle,
  ChevronDown, ChevronUp, Search, Database, User, Clock, BookOpen, Heart, GlassWater,
  FolderOpen, BarChart3, Newspaper, MoreHorizontal
} from "lucide-react";

interface ExtractedEntry {
  whiskyName: string;
  distillery?: string | null;
  region?: string | null;
  country?: string | null;
  age?: string | null;
  abv?: string | null;
  caskType?: string | null;
  category?: string | null;
  noseNotes?: string | null;
  tasteNotes?: string | null;
  finishNotes?: string | null;
  overallNotes?: string | null;
  score?: number | null;
  scoreScale?: string | null;
  sourceAuthor?: string | null;
  selected?: boolean;
  addToDb?: boolean;
}

type LibraryTab = "import" | "tasting_notes" | "analysis" | "article" | "other";
type ClassifyAction = "library" | "wishlist" | "tasted";

const LIBRARY_CATEGORIES: { key: LibraryTab; icon: typeof BookOpen }[] = [
  { key: "import", icon: Upload },
  { key: "tasting_notes", icon: BookOpen },
  { key: "analysis", icon: BarChart3 },
  { key: "article", icon: Newspaper },
  { key: "other", icon: MoreHorizontal },
];

const TAB_LABELS: Record<LibraryTab, string> = {
  import: "benchmark.tabImport",
  tasting_notes: "benchmark.tabTastingNotes",
  analysis: "benchmark.tabAnalysis",
  article: "benchmark.tabArticles",
  other: "benchmark.tabOther",
};

export default function M2TasteBenchmark() {
  const { t } = useTranslation();
  const session = useSession();
  const pid = session.pid || '';
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<LibraryTab>("import");
  const [extractedEntries, setExtractedEntries] = useState<ExtractedEntry[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const { masterDisabled: aiDisabled } = useAIStatus();
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string>("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [searchDb, setSearchDb] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [showClassify, setShowClassify] = useState(false);
  const [classifyCategory, setClassifyCategory] = useState<LibraryTab>("tasting_notes");
  const [classifySelections, setClassifySelections] = useState<Record<number, ClassifyAction[]>>({});
  const [classifySuccess, setClassifySuccess] = useState<string>("");

  const { data: allTastings } = useQuery({
    queryKey: ["/api/tastings", pid],
    queryFn: () => tastingApi.getAll(pid),
    enabled: !!pid,
  });

  const isHost = allTastings?.some((t: any) => t.hostId === pid);
  const isAdmin = session.role === "admin";
  const hasAccess = isHost || isAdmin;

  const isLibraryTab = activeTab !== "import";
  const categoryFilter = isLibraryTab ? activeTab : undefined;

  const { data: savedEntries, isLoading: loadingSaved } = useQuery({
    queryKey: ["/api/benchmark", categoryFilter],
    queryFn: () => {
      let url = `/api/benchmark?participantId=${pid}`;
      if (categoryFilter) url += `&category=${categoryFilter}`;
      return fetch(url).then(r => r.json());
    },
    enabled: !!pid && hasAccess && isLibraryTab,
  });

  const saveMutation = useMutation({
    mutationFn: (data: { entries: ExtractedEntry[]; libraryCategory: string }) =>
      benchmarkApi.saveEntries(
        data.entries.map(e => ({ ...e, sourceDocument: fileName, libraryCategory: data.libraryCategory })),
        pid,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/benchmark"] });
      setClassifySuccess(t("benchmark.classifySaved"));
      setTimeout(() => setClassifySuccess(""), 3000);
    },
  });

  const wishlistMutation = useMutation({
    mutationFn: (entries: ExtractedEntry[]) =>
      benchmarkApi.toWishlist(entries, pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      setClassifySuccess(t("benchmark.classifyAddedToWishlist"));
      setTimeout(() => setClassifySuccess(""), 3000);
    },
  });

  const journalMutation = useMutation({
    mutationFn: (entries: ExtractedEntry[]) =>
      benchmarkApi.toJournal(entries, pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      setClassifySuccess(t("benchmark.classifyAddedToTasted"));
      setTimeout(() => setClassifySuccess(""), 3000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => benchmarkApi.deleteEntry(id, pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/benchmark"] });
      setDeleteConfirmId(null);
    },
  });

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setAnalyzing(true);
    setExtractedEntries([]);
    setFileName(file.name);
    setShowClassify(false);
    setClassifySuccess("");

    try {
      const result = await benchmarkApi.analyze(file, pid);
      const entries = (result.entries || []).map((entry: ExtractedEntry) => ({
        ...entry,
        selected: true,
        addToDb: false,
      }));
      setExtractedEntries(entries);
      if (entries.length === 0) {
        setError(t("benchmark.noDataFound"));
      } else {
        setShowClassify(true);
        const sels: Record<number, ClassifyAction[]> = {};
        entries.forEach((_: ExtractedEntry, i: number) => { sels[i] = ["library"]; });
        setClassifySelections(sels);
      }
    } catch (err: any) {
      setError(err.message || t("benchmark.analysisFailed"));
    } finally {
      setAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [t, pid]);

  const toggleClassifyAction = (idx: number, action: ClassifyAction) => {
    setClassifySelections(prev => {
      const current = prev[idx] || [];
      const has = current.includes(action);
      return { ...prev, [idx]: has ? current.filter(a => a !== action) : [...current, action] };
    });
  };

  const handleClassifySave = async () => {
    const libraryEntries = extractedEntries.filter((_, i) => classifySelections[i]?.includes("library"));
    const wishlistEntries = extractedEntries.filter((_, i) => classifySelections[i]?.includes("wishlist"));
    const tastedEntries = extractedEntries.filter((_, i) => classifySelections[i]?.includes("tasted"));

    const promises = [];
    if (libraryEntries.length > 0) {
      promises.push(saveMutation.mutateAsync({ entries: libraryEntries, libraryCategory: classifyCategory }));
    }
    if (wishlistEntries.length > 0) {
      promises.push(wishlistMutation.mutateAsync(wishlistEntries));
    }
    if (tastedEntries.length > 0) {
      promises.push(journalMutation.mutateAsync(tastedEntries));
    }

    await Promise.all(promises);
    setExtractedEntries([]);
    setFileName("");
    setShowClassify(false);
  };

  const updateEntry = (idx: number, field: string, value: any) => {
    setExtractedEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const removeEntry = (idx: number) => {
    setExtractedEntries(prev => prev.filter((_, i) => i !== idx));
    setClassifySelections(prev => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const handleDeleteConfirm = (id: string) => {
    deleteMutation.mutate(id);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "—";
    }
  };

  const filteredSaved = (savedEntries || []).filter((e: any) => {
    if (!searchDb.trim()) return true;
    const q = searchDb.toLowerCase();
    return (
      e.whiskyName?.toLowerCase().includes(q) ||
      e.distillery?.toLowerCase().includes(q) ||
      e.region?.toLowerCase().includes(q) ||
      e.sourceDocument?.toLowerCase().includes(q) ||
      e.uploaderName?.toLowerCase().includes(q)
    );
  });

  if (!pid) {
    return (
      <div style={{ padding: 16 }}>
        <M2BackButton />
        <div style={{ textAlign: "center", padding: "80px 0", color: v.muted }} data-testid="text-login-required">
          {t("benchmark.loginRequired")}
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div style={{ padding: 16 }}>
        <M2BackButton />
        <div style={{ textAlign: "center", padding: "80px 0", color: v.muted }} data-testid="text-access-denied">
          {t("benchmark.accessDenied")}
        </div>
      </div>
    );
  }

  const isSaving = saveMutation.isPending || wishlistMutation.isPending || journalMutation.isPending;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: v.inputBg,
    border: `1px solid ${v.inputBorder}`,
    borderRadius: 8,
    padding: "8px 12px",
    color: v.inputText,
    fontSize: 14,
    outline: "none",
    fontFamily: "system-ui, sans-serif",
  };

  const cardStyle: React.CSSProperties = {
    background: v.card,
    border: `1px solid ${v.border}`,
    borderRadius: 12,
    padding: 20,
  };

  const activeTabStyle: React.CSSProperties = {
    background: v.accent,
    color: v.bg,
    border: "none",
    borderRadius: 8,
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap" as const,
    fontFamily: "system-ui, sans-serif",
  };

  const inactiveTabStyle: React.CSSProperties = {
    background: v.inputBg,
    color: v.muted,
    border: "none",
    borderRadius: 8,
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap" as const,
    fontFamily: "system-ui, sans-serif",
  };

  const badgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: v.inputBg,
    color: v.muted,
    borderRadius: 9999,
    padding: "2px 8px",
    fontSize: 10,
    fontWeight: 500,
  };

  const badgeOutlineStyle: React.CSSProperties = {
    ...badgeStyle,
    background: "transparent",
    border: `1px solid ${v.border}`,
  };

  const badgeAccentStyle: React.CSSProperties = {
    ...badgeStyle,
    background: v.pillBg,
    color: v.accent,
  };

  const btnPrimary: React.CSSProperties = {
    background: v.accent,
    color: v.bg,
    border: "none",
    borderRadius: 10,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "system-ui, sans-serif",
  };

  const btnGhost: React.CSSProperties = {
    background: "transparent",
    color: v.muted,
    border: "none",
    borderRadius: 6,
    padding: 4,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const btnDanger: React.CSSProperties = {
    ...btnGhost,
    background: v.danger,
    color: "#fff",
  };

  const classifyChipStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 10,
    padding: "3px 8px",
    borderRadius: 9999,
    border: active ? `1px solid ${v.accent}` : `1px solid ${v.border}`,
    background: active ? v.pillBg : "transparent",
    color: active ? v.accent : v.muted,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontFamily: "system-ui, sans-serif",
  });

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }} data-testid="m2-benchmark-page">
      <M2BackButton />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginTop: 8 }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 24,
            fontWeight: 700,
            color: v.accent,
          }}
          data-testid="text-benchmark-title"
        >
          {t("benchmark.title")}
        </h1>
        <p style={{ fontSize: 14, color: v.muted, marginTop: 4 }}>{t("benchmark.subtitle")}</p>
        {aiDisabled && (
          <div style={{ marginTop: 12, background: v.pillBg, border: `1px solid ${v.accent}`, borderRadius: 10, padding: 12, fontSize: 13, color: v.accent, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
            {t("admin.aiDisabledHint")}
          </div>
        )}
        <div style={{ width: 48, height: 3, background: v.accent, marginTop: 12, borderRadius: 2, opacity: 0.5 }} />
      </motion.div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 0, marginTop: 20, borderBottom: `1px solid ${v.border}` }} data-testid="library-tabs">
        {LIBRARY_CATEGORIES.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={activeTab === key ? activeTabStyle : inactiveTabStyle}
            data-testid={`tab-${key}`}
          >
            <Icon style={{ width: 14, height: 14 }} />
            {t(TAB_LABELS[key])}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        {activeTab === "import" && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              style={cardStyle}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <div style={{ padding: 16, borderRadius: "50%", background: v.pillBg }}>
                  <Brain style={{ width: 32, height: 32, color: v.accent }} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <h2 style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: v.accent }}>{t("benchmark.uploadTitle")}</h2>
                  <p style={{ fontSize: 13, color: v.muted, maxWidth: 400, marginTop: 4 }}>{t("benchmark.uploadDesc")}</p>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  {["PDF", "Excel", "CSV", "TXT", "JPG/PNG"].map(fmt => (
                    <span key={fmt} style={badgeOutlineStyle}>{fmt}</span>
                  ))}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,.txt,.jpg,.jpeg,.png,.webp"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                  data-testid="input-file-upload"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={analyzing || aiDisabled}
                  style={{ ...btnPrimary, opacity: (analyzing || aiDisabled) ? 0.5 : 1 }}
                  data-testid="button-upload"
                  title={aiDisabled ? t("admin.aiDisabledHint") : undefined}
                >
                  {analyzing ? (
                    <>
                      <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                      {t("benchmark.analyzing")}
                    </>
                  ) : (
                    <>
                      <Upload style={{ width: 16, height: 16 }} />
                      {t("benchmark.selectFile")}
                    </>
                  )}
                </button>
              </div>
            </motion.div>

            {error && (
              <div style={{ background: v.danger, borderRadius: 10, padding: 16, display: "flex", alignItems: "flex-start", gap: 12, opacity: 0.15 }}>
                <AlertCircle style={{ width: 20, height: 20, color: v.danger, flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 13, color: v.danger }}>{error}</p>
              </div>
            )}

            {classifySuccess && (
              <div style={{ background: v.pillBg, border: `1px solid ${v.success}`, borderRadius: 10, padding: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <Check style={{ width: 16, height: 16, color: v.success }} />
                <span style={{ fontSize: 13, color: v.success }}>{classifySuccess}</span>
              </div>
            )}

            <AnimatePresence>
              {extractedEntries.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <h2 style={{ fontSize: 20, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: v.accent }}>{t("benchmark.results")}</h2>
                      <span style={badgeAccentStyle}>{extractedEntries.length} {t("benchmark.entries")}</span>
                      {fileName && <span style={{ ...badgeOutlineStyle, display: "inline-flex", alignItems: "center", gap: 4 }}><FileText style={{ width: 12, height: 12 }} />{fileName}</span>}
                    </div>
                  </div>

                  {pid && (
                    <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: v.muted, background: v.elevated, borderRadius: 10, padding: "8px 12px", flexWrap: "wrap" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <User style={{ width: 14, height: 14 }} />
                        {t("benchmark.uploadedBy")}: <span style={{ fontWeight: 500, color: v.text }}>{session.name || ''}</span>
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock style={{ width: 14, height: 14 }} />
                        {t("benchmark.uploadedAt")}: <span style={{ fontWeight: 500, color: v.text }}>{new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <FileText style={{ width: 14, height: 14 }} />
                        {fileName}
                      </span>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {extractedEntries.map((entry, idx) => (
                      <div
                        key={idx}
                        style={{ border: `1px solid ${v.border}`, borderRadius: 10, background: v.card }}
                        data-testid={`benchmark-entry-${idx}`}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, cursor: "pointer" }} onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, fontSize: 13, color: v.accent }}>{entry.whiskyName}</span>
                              {entry.distillery && <span style={{ fontSize: 12, color: v.muted }}>{t("m2.taste.by", "by")} {entry.distillery}</span>}
                              {entry.score != null && (
                                <span style={badgeAccentStyle}>
                                  {entry.score}{entry.scoreScale ? ` (${entry.scoreScale})` : "/100"}
                                </span>
                              )}
                              {entry.region && <span style={badgeOutlineStyle}>{entry.region}</span>}
                            </div>
                            {entry.noseNotes && (
                              <p style={{ fontSize: 12, color: v.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 500 }}>
                                {t("benchmark.nose")}: {entry.noseNotes}
                              </p>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                            <button style={{ ...btnGhost, width: 28, height: 28 }} onClick={(e) => { e.stopPropagation(); removeEntry(idx); }}>
                              <X style={{ width: 14, height: 14 }} />
                            </button>
                            {expandedIdx === idx ? <ChevronUp style={{ width: 16, height: 16, color: v.muted }} /> : <ChevronDown style={{ width: 16, height: 16, color: v.muted }} />}
                          </div>
                        </div>

                        {showClassify && (
                          <div style={{ padding: "0 12px 8px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <button
                              onClick={() => toggleClassifyAction(idx, "library")}
                              style={classifyChipStyle(!!classifySelections[idx]?.includes("library"))}
                              data-testid={`classify-library-${idx}`}
                            >
                              <Database style={{ width: 10, height: 10 }} />
                              {t("benchmark.classifySaveToLibrary")}
                            </button>
                            <button
                              onClick={() => toggleClassifyAction(idx, "wishlist")}
                              style={classifyChipStyle(!!classifySelections[idx]?.includes("wishlist"))}
                              data-testid={`classify-wishlist-${idx}`}
                            >
                              <Heart style={{ width: 10, height: 10 }} />
                              {t("benchmark.classifyAddToWishlist")}
                            </button>
                            <button
                              onClick={() => toggleClassifyAction(idx, "tasted")}
                              style={classifyChipStyle(!!classifySelections[idx]?.includes("tasted"))}
                              data-testid={`classify-tasted-${idx}`}
                            >
                              <GlassWater style={{ width: 10, height: 10 }} />
                              {t("benchmark.classifyAddToTasted")}
                            </button>
                          </div>
                        )}

                        <AnimatePresence>
                          {expandedIdx === idx && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              style={{ overflow: "hidden" }}
                            >
                              <div style={{ padding: "4px 12px 12px", borderTop: `1px solid ${v.border}` }}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
                                  <EditField label={t("benchmark.field.whiskyName")} value={entry.whiskyName} onChange={(val) => updateEntry(idx, "whiskyName", val)} inputStyle={inputStyle} />
                                  <EditField label={t("benchmark.field.distillery")} value={entry.distillery || ""} onChange={(val) => updateEntry(idx, "distillery", val)} inputStyle={inputStyle} />
                                  <EditField label={t("benchmark.field.region")} value={entry.region || ""} onChange={(val) => updateEntry(idx, "region", val)} inputStyle={inputStyle} />
                                  <EditField label={t("benchmark.field.country")} value={entry.country || ""} onChange={(val) => updateEntry(idx, "country", val)} inputStyle={inputStyle} />
                                  <EditField label={t("benchmark.field.age")} value={entry.age || ""} onChange={(val) => updateEntry(idx, "age", val)} inputStyle={inputStyle} />
                                  <EditField label={t("benchmark.field.abv")} value={entry.abv || ""} onChange={(val) => updateEntry(idx, "abv", val)} inputStyle={inputStyle} />
                                  <EditField label={t("benchmark.field.caskType")} value={entry.caskType || ""} onChange={(val) => updateEntry(idx, "caskType", val)} inputStyle={inputStyle} />
                                  <EditField label={t("benchmark.field.category")} value={entry.category || ""} onChange={(val) => updateEntry(idx, "category", val)} inputStyle={inputStyle} />
                                  <EditField label={t("benchmark.field.score")} value={entry.score?.toString() || ""} onChange={(val) => updateEntry(idx, "score", val ? parseFloat(val) : null)} inputStyle={inputStyle} />
                                  <EditField label={t("benchmark.field.scoreScale")} value={entry.scoreScale || ""} onChange={(val) => updateEntry(idx, "scoreScale", val)} inputStyle={inputStyle} />
                                  <EditField label={t("benchmark.field.sourceAuthor")} value={entry.sourceAuthor || ""} onChange={(val) => updateEntry(idx, "sourceAuthor", val)} inputStyle={inputStyle} />
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 8, marginTop: 8 }}>
                                  <EditArea label={t("benchmark.field.noseNotes")} value={entry.noseNotes || ""} onChange={(val) => updateEntry(idx, "noseNotes", val)} inputStyle={inputStyle} />
                                  <EditArea label={t("benchmark.field.tasteNotes")} value={entry.tasteNotes || ""} onChange={(val) => updateEntry(idx, "tasteNotes", val)} inputStyle={inputStyle} />
                                  <EditArea label={t("benchmark.field.finishNotes")} value={entry.finishNotes || ""} onChange={(val) => updateEntry(idx, "finishNotes", val)} inputStyle={inputStyle} />
                                  <EditArea label={t("benchmark.field.overallNotes")} value={entry.overallNotes || ""} onChange={(val) => updateEntry(idx, "overallNotes", val)} inputStyle={inputStyle} />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>

                  {showClassify && (
                    <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 12 }}>
                      <h3 style={{ fontSize: 14, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: v.accent }}>{t("benchmark.classifyTitle")}</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: v.muted }}>{t("benchmark.classifyChooseCategory")}:</span>
                        {(["tasting_notes", "analysis", "article", "other"] as const).map(cat => (
                          <button
                            key={cat}
                            onClick={() => setClassifyCategory(cat)}
                            style={classifyCategory === cat ? { ...activeTabStyle, padding: "4px 10px" } : { ...inactiveTabStyle, padding: "4px 10px" }}
                            data-testid={`category-${cat}`}
                          >
                            {t(TAB_LABELS[cat])}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleClassifySave}
                        disabled={isSaving}
                        style={{ ...btnPrimary, opacity: isSaving ? 0.5 : 1, alignSelf: "flex-start" }}
                        data-testid="button-classify-save"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                            {t("benchmark.classifySaving")}
                          </>
                        ) : (
                          <>
                            <Save style={{ width: 16, height: 16 }} />
                            {t("benchmark.saveSelected")}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {isLibraryTab && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ position: "relative", width: 256 }}>
                <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: v.muted }} />
                <input
                  placeholder={t("benchmark.searchSaved")}
                  value={searchDb}
                  onChange={(e) => setSearchDb(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 36, height: 32, fontSize: 13 }}
                  data-testid="input-search-saved"
                />
              </div>
            </div>

            {loadingSaved ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <Loader2 style={{ width: 24, height: 24, animation: "spin 1s linear infinite", margin: "0 auto", color: v.muted }} />
              </div>
            ) : filteredSaved.length === 0 ? (
              <p style={{ fontSize: 13, color: v.muted, textAlign: "center", padding: "32px 0" }}>{t("benchmark.noSavedEntries")}</p>
            ) : (
              <div style={{ border: `1px solid ${v.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: v.elevated, borderBottom: `1px solid ${v.border}` }}>
                        <th style={{ textAlign: "left", padding: 8, fontWeight: 500, color: v.muted }}>{t("benchmark.field.whiskyName")}</th>
                        <th style={{ textAlign: "left", padding: 8, fontWeight: 500, color: v.muted }}>{t("benchmark.field.distillery")}</th>
                        <th style={{ textAlign: "left", padding: 8, fontWeight: 500, color: v.muted }}>{t("benchmark.field.region")}</th>
                        <th style={{ textAlign: "left", padding: 8, fontWeight: 500, color: v.muted }}>{t("benchmark.field.score")}</th>
                        <th style={{ textAlign: "left", padding: 8, fontWeight: 500, color: v.muted }}>{t("benchmark.field.source")}</th>
                        <th style={{ textAlign: "left", padding: 8, fontWeight: 500, color: v.muted }}>{t("benchmark.uploadedBy")}</th>
                        <th style={{ textAlign: "left", padding: 8, fontWeight: 500, color: v.muted }}>{t("benchmark.uploadedAt")}</th>
                        <th style={{ padding: 8, width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSaved.map((entry: any) => (
                        <tr key={entry.id} style={{ borderBottom: `1px solid ${v.border}` }} data-testid={`saved-entry-${entry.id}`}>
                          <td style={{ padding: 8, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: v.accent }}>{entry.whiskyName}</td>
                          <td style={{ padding: 8, color: v.muted }}>{entry.distillery || "—"}</td>
                          <td style={{ padding: 8, color: v.muted }}>{entry.region || "—"}</td>
                          <td style={{ padding: 8 }}>{entry.score != null ? <span style={badgeAccentStyle}>{entry.score}</span> : "—"}</td>
                          <td style={{ padding: 8, color: v.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>{entry.sourceDocument || "—"}</td>
                          <td style={{ padding: 8, color: v.muted }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <User style={{ width: 12, height: 12 }} />
                              {entry.uploaderName || "—"}
                            </span>
                          </td>
                          <td style={{ padding: 8, color: v.muted }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <Clock style={{ width: 12, height: 12 }} />
                              {formatDate(entry.createdAt)}
                            </span>
                          </td>
                          <td style={{ padding: 8 }}>
                            {deleteConfirmId === entry.id ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <button
                                  style={{ ...btnDanger, width: 24, height: 24 }}
                                  onClick={() => handleDeleteConfirm(entry.id)}
                                  disabled={deleteMutation.isPending}
                                  data-testid={`button-confirm-delete-${entry.id}`}
                                >
                                  {deleteMutation.isPending ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 12, height: 12 }} />}
                                </button>
                                <button
                                  style={{ ...btnGhost, width: 24, height: 24 }}
                                  onClick={() => setDeleteConfirmId(null)}
                                  data-testid={`button-cancel-delete-${entry.id}`}
                                >
                                  <X style={{ width: 12, height: 12 }} />
                                </button>
                              </div>
                            ) : (
                              <button
                                style={{ ...btnGhost, width: 24, height: 24 }}
                                onClick={() => setDeleteConfirmId(entry.id)}
                                title={t("benchmark.deleteEntry")}
                                data-testid={`button-delete-${entry.id}`}
                              >
                                <Trash2 style={{ width: 12, height: 12, color: v.danger }} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: 8, background: v.elevated, fontSize: 12, color: v.muted, textAlign: "center" }}>
                  {filteredSaved.length} {t("benchmark.entries")}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function EditField({ label, value, onChange, inputStyle }: { label: string; value: string; onChange: (v: string) => void; inputStyle: React.CSSProperties }) {
  return (
    <div>
      <label style={{ fontSize: 10, color: v.muted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, height: 28, fontSize: 12, marginTop: 2, padding: "4px 8px", borderRadius: 6 }}
      />
    </div>
  );
}

function EditArea({ label, value, onChange, inputStyle }: { label: string; value: string; onChange: (v: string) => void; inputStyle: React.CSSProperties }) {
  return (
    <div>
      <label style={{ fontSize: 10, color: v.muted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        style={{ ...inputStyle, fontSize: 12, marginTop: 2, padding: "6px 8px", borderRadius: 6, resize: "none" }}
      />
    </div>
  );
}
