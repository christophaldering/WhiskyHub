import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { useAIStatus } from "@/hooks/use-ai-status";
import { benchmarkApi, tastingApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export default function BenchmarkAnalyzer() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
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
    queryKey: ["/api/tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const isHost = allTastings?.some((t: any) => t.hostId === currentParticipant?.id);
  const isAdmin = currentParticipant?.role === "admin";
  const hasAccess = isHost || isAdmin;

  const isLibraryTab = activeTab !== "import";
  const categoryFilter = isLibraryTab ? activeTab : undefined;

  const { data: savedEntries, isLoading: loadingSaved } = useQuery({
    queryKey: ["/api/benchmark", categoryFilter],
    queryFn: () => {
      let url = `/api/benchmark?participantId=${currentParticipant!.id}`;
      if (categoryFilter) url += `&category=${categoryFilter}`;
      return fetch(url).then(r => r.json());
    },
    enabled: !!currentParticipant && hasAccess && isLibraryTab,
  });

  const saveMutation = useMutation({
    mutationFn: (data: { entries: ExtractedEntry[]; libraryCategory: string }) =>
      benchmarkApi.saveEntries(
        data.entries.map(e => ({ ...e, sourceDocument: fileName, libraryCategory: data.libraryCategory })),
        currentParticipant!.id,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/benchmark"] });
      setClassifySuccess(t("benchmark.classifySaved"));
      setTimeout(() => setClassifySuccess(""), 3000);
    },
  });

  const wishlistMutation = useMutation({
    mutationFn: (entries: ExtractedEntry[]) =>
      benchmarkApi.toWishlist(entries, currentParticipant!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      setClassifySuccess(t("benchmark.classifyAddedToWishlist"));
      setTimeout(() => setClassifySuccess(""), 3000);
    },
  });

  const journalMutation = useMutation({
    mutationFn: (entries: ExtractedEntry[]) =>
      benchmarkApi.toJournal(entries, currentParticipant!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      setClassifySuccess(t("benchmark.classifyAddedToTasted"));
      setTimeout(() => setClassifySuccess(""), 3000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => benchmarkApi.deleteEntry(id, currentParticipant!.id),
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
      const result = await benchmarkApi.analyze(file, currentParticipant!.id);
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
  }, [t, currentParticipant]);

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

  if (!currentParticipant) {
    return (
      <div className="text-center py-20 text-muted-foreground" data-testid="text-login-required">
        {t("benchmark.loginRequired")}
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="text-center py-20 text-muted-foreground" data-testid="text-access-denied">
        {t("benchmark.accessDenied")}
      </div>
    );
  }

  const isSaving = saveMutation.isPending || wishlistMutation.isPending || journalMutation.isPending;

  return (
    <div className="max-w-5xl mx-auto space-y-6 min-w-0 overflow-x-hidden" data-testid="benchmark-analyzer-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-xl sm:text-3xl font-serif font-black text-primary tracking-tight" data-testid="text-benchmark-title">
          {t("benchmark.title")}
        </h1>
        <p className="text-muted-foreground font-serif italic mt-1 text-sm">{t("benchmark.subtitle")}</p>
        {aiDisabled && (
          <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {t("admin.aiDisabledHint")}
          </div>
        )}
        <div className="w-12 h-1 bg-primary/50 mt-3" />
      </motion.div>

      <div className="flex gap-1 overflow-x-auto border-b border-border/30 pb-0" data-testid="library-tabs">
        {LIBRARY_CATEGORIES.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-[1px] ${
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
            data-testid={`tab-${key}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {t(TAB_LABELS[key])}
          </button>
        ))}
      </div>

      {activeTab === "import" && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="bg-card border border-border/50 rounded-xl p-6"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-lg font-serif font-bold text-primary">{t("benchmark.uploadTitle")}</h2>
                <p className="text-sm text-muted-foreground max-w-md">{t("benchmark.uploadDesc")}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {["PDF", "Excel", "CSV", "TXT", "JPG/PNG"].map(fmt => (
                  <Badge key={fmt} variant="outline" className="text-[10px]">{fmt}</Badge>
                ))}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,.txt,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleFileUpload}
                data-testid="input-file-upload"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing || aiDisabled}
                size="lg"
                className="gap-2"
                data-testid="button-upload"
                title={aiDisabled ? t("admin.aiDisabledHint") : undefined}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("benchmark.analyzing")}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {t("benchmark.selectFile")}
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {classifySuccess && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">{classifySuccess}</span>
            </div>
          )}

          <AnimatePresence>
            {extractedEntries.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-serif font-bold text-primary">{t("benchmark.results")}</h2>
                    <Badge variant="secondary">{extractedEntries.length} {t("benchmark.entries")}</Badge>
                    {fileName && <Badge variant="outline" className="text-xs"><FileText className="w-3 h-3 mr-1" />{fileName}</Badge>}
                  </div>
                </div>

                {currentParticipant && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {t("benchmark.uploadedBy")}: <span className="font-medium text-foreground">{currentParticipant.name}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {t("benchmark.uploadedAt")}: <span className="font-medium text-foreground">{new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      {fileName}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  {extractedEntries.map((entry, idx) => (
                    <div
                      key={idx}
                      className="border rounded-lg transition-colors border-border/30 bg-card"
                      data-testid={`benchmark-entry-${idx}`}
                    >
                      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-serif font-semibold text-sm text-primary">{entry.whiskyName}</span>
                            {entry.distillery && <span className="text-xs text-muted-foreground">by {entry.distillery}</span>}
                            {entry.score != null && (
                              <Badge variant="secondary" className="text-xs">
                                {entry.score}{entry.scoreScale ? ` (${entry.scoreScale})` : "/100"}
                              </Badge>
                            )}
                            {entry.region && <Badge variant="outline" className="text-[10px]">{entry.region}</Badge>}
                          </div>
                          {entry.noseNotes && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-lg">
                              {t("benchmark.nose")}: {entry.noseNotes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); removeEntry(idx); }}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                          {expandedIdx === idx ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {showClassify && (
                        <div className="px-3 pb-2 flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => toggleClassifyAction(idx, "library")}
                            className={`text-[10px] px-2 py-1 rounded-full border flex items-center gap-1 transition-colors ${
                              classifySelections[idx]?.includes("library") ? "bg-primary/10 border-primary/40 text-primary" : "border-border/40 text-muted-foreground hover:border-primary/20"
                            }`}
                            data-testid={`classify-library-${idx}`}
                          >
                            <Database className="w-2.5 h-2.5" />
                            {t("benchmark.classifySaveToLibrary")}
                          </button>
                          <button
                            onClick={() => toggleClassifyAction(idx, "wishlist")}
                            className={`text-[10px] px-2 py-1 rounded-full border flex items-center gap-1 transition-colors ${
                              classifySelections[idx]?.includes("wishlist") ? "bg-amber-500/10 border-amber-500/40 text-amber-600" : "border-border/40 text-muted-foreground hover:border-amber-500/20"
                            }`}
                            data-testid={`classify-wishlist-${idx}`}
                          >
                            <Heart className="w-2.5 h-2.5" />
                            {t("benchmark.classifyAddToWishlist")}
                          </button>
                          <button
                            onClick={() => toggleClassifyAction(idx, "tasted")}
                            className={`text-[10px] px-2 py-1 rounded-full border flex items-center gap-1 transition-colors ${
                              classifySelections[idx]?.includes("tasted") ? "bg-green-500/10 border-green-500/40 text-green-600" : "border-border/40 text-muted-foreground hover:border-green-500/20"
                            }`}
                            data-testid={`classify-tasted-${idx}`}
                          >
                            <GlassWater className="w-2.5 h-2.5" />
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
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 pt-1 border-t border-border/20">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <EditField label={t("benchmark.field.whiskyName")} value={entry.whiskyName} onChange={(v) => updateEntry(idx, "whiskyName", v)} />
                                <EditField label={t("benchmark.field.distillery")} value={entry.distillery || ""} onChange={(v) => updateEntry(idx, "distillery", v)} />
                                <EditField label={t("benchmark.field.region")} value={entry.region || ""} onChange={(v) => updateEntry(idx, "region", v)} />
                                <EditField label={t("benchmark.field.country")} value={entry.country || ""} onChange={(v) => updateEntry(idx, "country", v)} />
                                <EditField label={t("benchmark.field.age")} value={entry.age || ""} onChange={(v) => updateEntry(idx, "age", v)} />
                                <EditField label={t("benchmark.field.abv")} value={entry.abv || ""} onChange={(v) => updateEntry(idx, "abv", v)} />
                                <EditField label={t("benchmark.field.caskType")} value={entry.caskType || ""} onChange={(v) => updateEntry(idx, "caskType", v)} />
                                <EditField label={t("benchmark.field.category")} value={entry.category || ""} onChange={(v) => updateEntry(idx, "category", v)} />
                                <EditField label={t("benchmark.field.score")} value={entry.score?.toString() || ""} onChange={(v) => updateEntry(idx, "score", v ? parseFloat(v) : null)} />
                                <EditField label={t("benchmark.field.scoreScale")} value={entry.scoreScale || ""} onChange={(v) => updateEntry(idx, "scoreScale", v)} />
                                <EditField label={t("benchmark.field.sourceAuthor")} value={entry.sourceAuthor || ""} onChange={(v) => updateEntry(idx, "sourceAuthor", v)} />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                <EditArea label={t("benchmark.field.noseNotes")} value={entry.noseNotes || ""} onChange={(v) => updateEntry(idx, "noseNotes", v)} />
                                <EditArea label={t("benchmark.field.tasteNotes")} value={entry.tasteNotes || ""} onChange={(v) => updateEntry(idx, "tasteNotes", v)} />
                                <EditArea label={t("benchmark.field.finishNotes")} value={entry.finishNotes || ""} onChange={(v) => updateEntry(idx, "finishNotes", v)} />
                                <EditArea label={t("benchmark.field.overallNotes")} value={entry.overallNotes || ""} onChange={(v) => updateEntry(idx, "overallNotes", v)} />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>

                {showClassify && (
                  <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-serif font-bold text-primary">{t("benchmark.classifyTitle")}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">{t("benchmark.classifyChooseCategory")}:</span>
                      {(["tasting_notes", "analysis", "article", "other"] as const).map(cat => (
                        <button
                          key={cat}
                          onClick={() => setClassifyCategory(cat)}
                          className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                            classifyCategory === cat
                              ? "bg-primary/10 border-primary/40 text-primary font-medium"
                              : "border-border/40 text-muted-foreground hover:border-primary/20"
                          }`}
                          data-testid={`category-${cat}`}
                        >
                          {t(TAB_LABELS[cat])}
                        </button>
                      ))}
                    </div>
                    <Button
                      onClick={handleClassifySave}
                      disabled={isSaving}
                      className="gap-2"
                      data-testid="button-classify-save"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t("benchmark.classifySaving")}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {t("benchmark.saveSelected")}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {isLibraryTab && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("benchmark.searchSaved")}
                value={searchDb}
                onChange={(e) => setSearchDb(e.target.value)}
                className="pl-10 h-8 text-sm"
                data-testid="input-search-saved"
              />
            </div>
          </div>

          {loadingSaved ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filteredSaved.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("benchmark.noSavedEntries")}</p>
          ) : (
            <div className="border border-border/30 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border/30">
                      <th className="text-left p-2 font-medium">{t("benchmark.field.whiskyName")}</th>
                      <th className="text-left p-2 font-medium">{t("benchmark.field.distillery")}</th>
                      <th className="text-left p-2 font-medium">{t("benchmark.field.region")}</th>
                      <th className="text-left p-2 font-medium">{t("benchmark.field.score")}</th>
                      <th className="text-left p-2 font-medium">{t("benchmark.field.source")}</th>
                      <th className="text-left p-2 font-medium">{t("benchmark.uploadedBy")}</th>
                      <th className="text-left p-2 font-medium">{t("benchmark.uploadedAt")}</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSaved.map((entry: any) => (
                      <tr key={entry.id} className="border-b border-border/10 hover:bg-primary/5" data-testid={`saved-entry-${entry.id}`}>
                        <td className="p-2 font-serif font-semibold text-primary">{entry.whiskyName}</td>
                        <td className="p-2 text-muted-foreground">{entry.distillery || "—"}</td>
                        <td className="p-2 text-muted-foreground">{entry.region || "—"}</td>
                        <td className="p-2">{entry.score != null ? <Badge variant="secondary" className="text-[10px]">{entry.score}</Badge> : "—"}</td>
                        <td className="p-2 text-muted-foreground truncate max-w-[150px]">{entry.sourceDocument || "—"}</td>
                        <td className="p-2 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {entry.uploaderName || "—"}
                          </span>
                        </td>
                        <td className="p-2 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(entry.createdAt)}
                          </span>
                        </td>
                        <td className="p-2">
                          {deleteConfirmId === entry.id ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleDeleteConfirm(entry.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-confirm-delete-${entry.id}`}
                              >
                                {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setDeleteConfirmId(null)}
                                data-testid={`button-cancel-delete-${entry.id}`}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setDeleteConfirmId(entry.id)}
                              title={t("benchmark.deleteEntry")}
                              data-testid={`button-delete-${entry.id}`}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-2 bg-muted/30 text-xs text-muted-foreground text-center">
                {filteredSaved.length} {t("benchmark.entries")}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-7 text-xs mt-0.5" />
    </div>
  );
}

function EditArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full text-xs mt-0.5 rounded-md border border-input bg-background px-3 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}
