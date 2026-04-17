import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import BackLink from "@/labs/components/BackLink";
import { useSession } from "@/lib/session";
import { useAIStatus } from "@/hooks/use-ai-status";
import { benchmarkApi, tastingApi } from "@/lib/api";
import { wishlistKey, useWishlistKeys } from "@/lib/wishlistKey";
import WishlistBadge from "@/labs/components/WishlistBadge";
import {
  ChevronLeft, Upload, FileText, Loader2, Check, X, Trash2, Save, Brain,
  AlertCircle, ChevronDown, ChevronUp, Search, Database, User, Clock,
  BookOpen, Heart, GlassWater, BarChart3, Newspaper, MoreHorizontal,
} from "lucide-react";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { useTranslation } from "react-i18next";

interface ExtractedEntry {
  name: string;
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

interface SavedEntry {
  id: string;
  name: string;
  distillery: string | null;
  region: string | null;
  score: number | null;
  sourceDocument: string | null;
  uploaderName: string | null;
  createdAt: string | null;
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

const TAB_LABEL_KEYS: Record<LibraryTab, string> = {
  import: "benchmark.tabImport",
  tasting_notes: "benchmark.tabTastingNotes",
  analysis: "benchmark.tabAnalysis",
  article: "benchmark.tabArticles",
  other: "benchmark.tabOther",
};

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: "var(--labs-text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", background: "var(--labs-bg)", border: "1px solid var(--labs-border)", borderRadius: 6,
          padding: "4px 8px", color: "var(--labs-text)", fontSize: 12, outline: "none", marginTop: 2, height: 28, fontFamily: "inherit",
        }}
      />
    </div>
  );
}

function EditArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: "var(--labs-text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={2}
        style={{
          width: "100%", background: "var(--labs-bg)", border: "1px solid var(--labs-border)", borderRadius: 6,
          padding: "6px 8px", color: "var(--labs-text)", fontSize: 12, outline: "none", marginTop: 2, resize: "none", fontFamily: "inherit",
        }}
      />
    </div>
  );
}

export default function LabsBenchmark() {
  const { t } = useTranslation();
  const session = useSession();
  const pid = session.pid || "";
  const queryClient = useQueryClient();
  const savedKeys = useWishlistKeys(pid || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<LibraryTab>("tasting_notes");
  const [extractedEntries, setExtractedEntries] = useState<ExtractedEntry[]>([]);
  const [fileName, setFileName] = useState("");
  const { masterDisabled: aiDisabled } = useAIStatus();
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [searchDb, setSearchDb] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showClassify, setShowClassify] = useState(false);
  const [classifyCategory, setClassifyCategory] = useState<LibraryTab>("tasting_notes");
  const [classifySelections, setClassifySelections] = useState<Record<number, ClassifyAction[]>>({});
  const [classifySuccess, setClassifySuccess] = useState("");

  const { data: allTastings } = useQuery({
    queryKey: ["/api/tastings", pid],
    queryFn: () => tastingApi.getAll(pid),
    enabled: !!pid,
  });

  const isHost = allTastings?.some((t: Record<string, string>) => t.hostId === pid);
  const isAdmin = session.role === "admin";
  const canImport = isHost || isAdmin;
  const hasAccess = !!session.signedIn && !!pid;
  const isLibraryTab = activeTab !== "import";
  const categoryFilter = isLibraryTab ? activeTab : undefined;

  const { data: savedEntries, isLoading: loadingSaved } = useQuery<SavedEntry[]>({
    queryKey: ["/api/benchmark", categoryFilter],
    queryFn: async () => {
      let url = `/api/benchmark?participantId=${pid}`;
      if (categoryFilter) url += `&category=${categoryFilter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(t("benchmark.analysisFailed"));
      return res.json();
    },
    enabled: !!pid && hasAccess && isLibraryTab,
  });

  const saveMutation = useMutation({
    mutationFn: (data: { entries: ExtractedEntry[]; libraryCategory: string }) =>
      benchmarkApi.saveEntries(data.entries.map(e => ({ ...e, sourceDocument: fileName, libraryCategory: data.libraryCategory })), pid),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/benchmark"] }); setClassifySuccess("Saved to library"); setTimeout(() => setClassifySuccess(""), 3000); },
  });

  const wishlistMutation = useMutation({
    mutationFn: (entries: ExtractedEntry[]) => benchmarkApi.toWishlist(entries, pid),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["wishlist"] }); setClassifySuccess("Added to wishlist"); setTimeout(() => setClassifySuccess(""), 3000); },
  });

  const journalMutation = useMutation({
    mutationFn: (entries: ExtractedEntry[]) => benchmarkApi.toJournal(entries, pid),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["journal"] }); setClassifySuccess("Added to tasted"); setTimeout(() => setClassifySuccess(""), 3000); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => benchmarkApi.deleteEntry(id, pid),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/benchmark"] }); setDeleteConfirmId(null); },
  });

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setAnalyzing(true); setExtractedEntries([]); setFileName(file.name); setShowClassify(false); setClassifySuccess("");
    try {
      const result = await benchmarkApi.analyze(file, pid);
      const entries = (result.entries || []).map((entry: ExtractedEntry) => ({ ...entry, selected: true, addToDb: false }));
      setExtractedEntries(entries);
      if (entries.length === 0) { setError(t("benchmark.noDataFound")); } else {
        setShowClassify(true);
        const sels: Record<number, ClassifyAction[]> = {};
        entries.forEach((_: ExtractedEntry, i: number) => { sels[i] = ["library"]; });
        setClassifySelections(sels);
      }
    } catch (err: unknown) { setError((err as Error).message || t("benchmark.analysisFailed")); } finally {
      setAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [pid]);

  const toggleClassifyAction = (idx: number, action: ClassifyAction) => {
    setClassifySelections(prev => {
      const current = prev[idx] || [];
      return { ...prev, [idx]: current.includes(action) ? current.filter(a => a !== action) : [...current, action] };
    });
  };

  const handleClassifySave = async () => {
    const libraryEntries = extractedEntries.filter((_, i) => classifySelections[i]?.includes("library"));
    const wishlistEntries = extractedEntries.filter((_, i) => classifySelections[i]?.includes("wishlist"));
    const tastedEntries = extractedEntries.filter((_, i) => classifySelections[i]?.includes("tasted"));
    const promises = [];
    if (libraryEntries.length > 0) promises.push(saveMutation.mutateAsync({ entries: libraryEntries, libraryCategory: classifyCategory }));
    if (wishlistEntries.length > 0) promises.push(wishlistMutation.mutateAsync(wishlistEntries));
    if (tastedEntries.length > 0) promises.push(journalMutation.mutateAsync(tastedEntries));
    await Promise.all(promises);
    setExtractedEntries([]); setFileName(""); setShowClassify(false);
  };

  const updateEntry = (idx: number, field: string, value: string | number | null) => {
    setExtractedEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const removeEntry = (idx: number) => {
    setExtractedEntries(prev => prev.filter((_, i) => i !== idx));
    setClassifySelections(prev => { const next = { ...prev }; delete next[idx]; return next; });
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try { return new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; }
  };

  const filteredSaved = (savedEntries || []).filter(e => {
    if (!searchDb.trim()) return true;
    const q = searchDb.toLowerCase();
    return e.name?.toLowerCase().includes(q) || e.distillery?.toLowerCase().includes(q) || e.region?.toLowerCase().includes(q) || e.sourceDocument?.toLowerCase().includes(q) || e.uploaderName?.toLowerCase().includes(q);
  });

  if (!session.signedIn || !pid) {
    return (
      <AuthGateMessage
        icon={<Brain className="w-12 h-12" style={{ color: "var(--labs-accent)" }} />}
        title={t("authGate.benchmark.title")}
        bullets={[t("authGate.benchmark.bullet1"), t("authGate.benchmark.bullet2"), t("authGate.benchmark.bullet3")]}
      />
    );
  }

  const isSaving = saveMutation.isPending || wishlistMutation.isPending || journalMutation.isPending;

  const classifyChipStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 11, padding: "3px 8px", borderRadius: 9999, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "inherit",
    border: active ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)",
    background: active ? "color-mix(in srgb, var(--labs-accent) 12%, transparent)" : "transparent",
    color: active ? "var(--labs-accent)" : "var(--labs-text-muted)",
  });

  return (
    <div className="labs-page" data-testid="labs-benchmark">
      <BackLink href="/labs/bibliothek" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-benchmark">
          <ChevronLeft className="w-4 h-4" /> {t("bibliothek.title", "Library")}
        </button>
      </BackLink>

      <div className="mb-5 labs-fade-in">
        <div className="flex items-center gap-3 mb-1">
          <Brain className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
          <h1 className="labs-h2" style={{ color: "var(--labs-accent)" }} data-testid="text-benchmark-title">
            Benchmark
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>{t("m2.taste.benchmarkSubtitle")}</p>
        {aiDisabled && (
          <div className="labs-card mt-3" style={{ padding: 12, borderColor: "var(--labs-accent)", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--labs-accent)" }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> AI features are currently disabled by your admin.
          </div>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0 mb-5" style={{ borderBottom: "1px solid var(--labs-border)" }} data-testid="library-tabs">
        {LIBRARY_CATEGORIES.filter(({ key }) => key !== "import" || canImport).map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            data-testid={`tab-${key}`}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: activeTab === key ? 600 : 500,
              cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
              background: activeTab === key ? "var(--labs-accent)" : "transparent",
              color: activeTab === key ? "var(--labs-bg)" : "var(--labs-text-muted)",
              border: "none",
            }}
          >
            <Icon style={{ width: 14, height: 14 }} />
            {t(TAB_LABEL_KEYS[key])}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {activeTab === "import" && (
          <>
            <div className="labs-card p-5 labs-fade-in" style={{ textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "color-mix(in srgb, var(--labs-accent) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Brain className="w-8 h-8" style={{ color: "var(--labs-accent)" }} />
              </div>
              <h2 className="labs-h3 mb-1" style={{ color: "var(--labs-accent)" }}>{t("m2.taste.benchmarkUpload")}</h2>
              <p className="text-xs mb-4" style={{ color: "var(--labs-text-muted)", maxWidth: 400, margin: "0 auto" }}>
                {t("m2.taste.benchmarkUploadDesc", "Upload tasting notes, reviews, or articles. AI will extract whisky data automatically.")}
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                {["PDF", "Excel", "CSV", "TXT", "JPG/PNG"].map(fmt => (
                  <span key={fmt} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999, border: "1px solid var(--labs-border)", color: "var(--labs-text-muted)" }}>{fmt}</span>
                ))}
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls,.csv,.txt,.jpg,.jpeg,.png,.webp" style={{ display: "none" }} onChange={handleFileUpload} data-testid="input-file-upload" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing || aiDisabled}
                className="labs-btn-primary"
                style={{ padding: "10px 20px", opacity: (analyzing || aiDisabled) ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 8 }}
                data-testid="button-upload"
              >
                {analyzing ? (<><Loader2 className="w-4 h-4" style={{ animation: "spin 1s linear infinite" }} /> {t("m2.taste.benchmarkAnalyzing")}</>) : (<><Upload className="w-4 h-4" /> {t("m2.taste.benchmarkSelectFile")}</>)}
              </button>
            </div>

            {error && (
              <div className="labs-card p-4" style={{ borderColor: "var(--labs-danger)" }}>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--labs-danger)" }} />
                  <p className="text-sm" style={{ color: "var(--labs-danger)" }}>{error}</p>
                </div>
              </div>
            )}

            {classifySuccess && (
              <div className="labs-card p-3" style={{ borderColor: "var(--labs-success)", display: "flex", alignItems: "center", gap: 8 }}>
                <Check className="w-4 h-4" style={{ color: "var(--labs-success)" }} />
                <span className="text-sm" style={{ color: "var(--labs-success)" }}>{classifySuccess}</span>
              </div>
            )}

            {extractedEntries.length > 0 && (
              <div className="labs-fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <h2 className="labs-h3" style={{ color: "var(--labs-accent)" }}>{t("m2.taste.benchmarkResults")}</h2>
                    <span className="labs-badge labs-badge-accent">{extractedEntries.length} entries</span>
                    {fileName && <span className="text-xs flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}><FileText className="w-3 h-3" />{fileName}</span>}
                  </div>
                </div>

                {pid && (
                  <div className="labs-card p-3 text-xs flex items-center gap-4 flex-wrap" style={{ color: "var(--labs-text-muted)" }}>
                    <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {session.name || ""}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                    <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {fileName}</span>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {extractedEntries.map((entry, idx) => (
                    <div key={idx} className="labs-card" style={{ overflow: "hidden" }} data-testid={`benchmark-entry-${idx}`}>
                      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="labs-serif text-sm font-semibold" style={{ color: "var(--labs-accent)" }}>{entry.name}</span>
                            {entry.distillery && <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>by {entry.distillery}</span>}
                            {savedKeys.has(wishlistKey(entry.name, entry.distillery)) && (
                              <WishlistBadge size="xs" testId={`badge-wishlist-extracted-${idx}`} />
                            )}
                            {entry.score != null && <span className="labs-badge labs-badge-accent" style={{ fontSize: 11, padding: "1px 6px" }}>{entry.score}{entry.scoreScale ? ` (${entry.scoreScale})` : "/100"}</span>}
                            {entry.region && <span className="text-[11px]" style={{ padding: "1px 6px", borderRadius: 9999, border: "1px solid var(--labs-border)", color: "var(--labs-text-muted)" }}>{entry.region}</span>}
                          </div>
                          {entry.noseNotes && <p className="text-xs mt-1 truncate" style={{ color: "var(--labs-text-muted)", maxWidth: 500 }}>Nose: {entry.noseNotes}</p>}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button className="labs-btn-ghost" style={{ width: 28, height: 28, padding: 0 }} onClick={e => { e.stopPropagation(); removeEntry(idx); }} data-testid={`button-remove-entry-${idx}`}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                          {expandedIdx === idx ? <ChevronUp className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />}
                        </div>
                      </div>

                      {showClassify && (
                        <div style={{ padding: "0 12px 8px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <button onClick={() => toggleClassifyAction(idx, "library")} style={classifyChipStyle(!!classifySelections[idx]?.includes("library"))} data-testid={`classify-library-${idx}`}>
                            <Database style={{ width: 10, height: 10 }} /> Library
                          </button>
                          <button onClick={() => toggleClassifyAction(idx, "wishlist")} style={classifyChipStyle(!!classifySelections[idx]?.includes("wishlist"))} data-testid={`classify-wishlist-${idx}`}>
                            <Heart style={{ width: 10, height: 10 }} /> Wishlist
                          </button>
                          <button onClick={() => toggleClassifyAction(idx, "tasted")} style={classifyChipStyle(!!classifySelections[idx]?.includes("tasted"))} data-testid={`classify-tasted-${idx}`}>
                            <GlassWater style={{ width: 10, height: 10 }} /> Tasted
                          </button>
                        </div>
                      )}

                      {expandedIdx === idx && (
                        <div style={{ padding: "4px 12px 12px", borderTop: "1px solid var(--labs-border)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
                            <EditField label={t("benchmark.field.whiskyName")} value={entry.name} onChange={val => updateEntry(idx, "name", val)} />
                            <EditField label={t("benchmark.field.distillery")} value={entry.distillery || ""} onChange={val => updateEntry(idx, "distillery", val)} />
                            <EditField label={t("benchmark.field.region")} value={entry.region || ""} onChange={val => updateEntry(idx, "region", val)} />
                            <EditField label={t("benchmark.field.country")} value={entry.country || ""} onChange={val => updateEntry(idx, "country", val)} />
                            <EditField label={t("benchmark.field.age")} value={entry.age || ""} onChange={val => updateEntry(idx, "age", val)} />
                            <EditField label={t("benchmark.field.abv")} value={entry.abv || ""} onChange={val => updateEntry(idx, "abv", val)} />
                            <EditField label={t("benchmark.field.caskType")} value={entry.caskType || ""} onChange={val => updateEntry(idx, "caskType", val)} />
                            <EditField label={t("benchmark.field.category")} value={entry.category || ""} onChange={val => updateEntry(idx, "category", val)} />
                            <EditField label={t("benchmark.field.score")} value={entry.score?.toString() || ""} onChange={val => updateEntry(idx, "score", val ? parseFloat(val) : null)} />
                            <EditField label={t("benchmark.field.scoreScale")} value={entry.scoreScale || ""} onChange={val => updateEntry(idx, "scoreScale", val)} />
                            <EditField label={t("benchmark.field.sourceAuthor")} value={entry.sourceAuthor || ""} onChange={val => updateEntry(idx, "sourceAuthor", val)} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 8, marginTop: 8 }}>
                            <EditArea label={t("benchmark.field.noseNotes")} value={entry.noseNotes || ""} onChange={val => updateEntry(idx, "noseNotes", val)} />
                            <EditArea label={t("benchmark.field.tasteNotes")} value={entry.tasteNotes || ""} onChange={val => updateEntry(idx, "tasteNotes", val)} />
                            <EditArea label={t("benchmark.field.finishNotes")} value={entry.finishNotes || ""} onChange={val => updateEntry(idx, "finishNotes", val)} />
                            <EditArea label={t("benchmark.field.overallNotes")} value={entry.overallNotes || ""} onChange={val => updateEntry(idx, "overallNotes", val)} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {showClassify && (
                  <div className="labs-card p-4" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <h3 className="labs-serif text-sm font-bold" style={{ color: "var(--labs-accent)" }}>{t("m2.taste.benchmarkClassify")}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{t("m2.taste.benchmarkCategory")}:</span>
                      {(["tasting_notes", "analysis", "article", "other"] as const).map(cat => (
                        <button
                          key={cat} onClick={() => setClassifyCategory(cat)} data-testid={`category-${cat}`}
                          style={{
                            padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: classifyCategory === cat ? 600 : 500,
                            cursor: "pointer", fontFamily: "inherit", border: "none",
                            background: classifyCategory === cat ? "var(--labs-accent)" : "transparent",
                            color: classifyCategory === cat ? "var(--labs-bg)" : "var(--labs-text-muted)",
                          }}
                        >
                          {t(TAB_LABEL_KEYS[cat])}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleClassifySave} disabled={isSaving}
                      className="labs-btn-primary self-start"
                      style={{ padding: "10px 20px", opacity: isSaving ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 8 }}
                      data-testid="button-classify-save"
                    >
                      {isSaving ? (<><Loader2 className="w-4 h-4" style={{ animation: "spin 1s linear infinite" }} /> {t("m2.taste.benchmarkSaving")}</>) : (<><Save className="w-4 h-4" /> {t("m2.taste.benchmarkSaveSelected")}</>)}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {isLibraryTab && (
          <div className="labs-fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ position: "relative", width: 256 }}>
              <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--labs-text-muted)" }} />
              <input
                placeholder={t("benchmark.searchSaved")}
                value={searchDb}
                onChange={e => setSearchDb(e.target.value)}
                data-testid="input-search-saved"
                style={{
                  width: "100%", paddingLeft: 36, height: 32, fontSize: 13, background: "var(--labs-bg)",
                  border: "1px solid var(--labs-border)", borderRadius: 8, color: "var(--labs-text)", outline: "none", fontFamily: "inherit",
                }}
              />
            </div>

            {loadingSaved ? (
              <div className="text-center py-8"><Loader2 className="w-6 h-6 mx-auto" style={{ animation: "spin 1s linear infinite", color: "var(--labs-text-muted)" }} /></div>
            ) : filteredSaved.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "var(--labs-text-muted)" }}>{t("m2.taste.benchmarkNoSaved")}</p>
            ) : (
              <div style={{ border: "1px solid var(--labs-border)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--labs-surface-elevated)", borderBottom: "1px solid var(--labs-border)" }}>
                        {[t("benchmark.field.whiskyName"), t("benchmark.field.distillery"), t("benchmark.field.region"), t("benchmark.field.score"), t("benchmark.field.sourceAuthor"), t("benchmark.uploadedBy"), t("benchmark.uploadedAt"), ""].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: 8, fontWeight: 500, color: "var(--labs-text-muted)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSaved.map(entry => (
                        <tr key={entry.id} style={{ borderBottom: "1px solid var(--labs-border)" }} data-testid={`saved-entry-${entry.id}`}>
                          <td className="labs-serif" style={{ padding: 8, fontWeight: 600, color: "var(--labs-accent)" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              {entry.name}
                              {savedKeys.has(wishlistKey(entry.name, entry.distillery)) && (
                                <WishlistBadge size="xs" testId={`badge-wishlist-saved-${entry.id}`} />
                              )}
                            </span>
                          </td>
                          <td style={{ padding: 8, color: "var(--labs-text-muted)" }}>{entry.distillery || "—"}</td>
                          <td style={{ padding: 8, color: "var(--labs-text-muted)" }}>{entry.region || "—"}</td>
                          <td style={{ padding: 8 }}>{entry.score != null ? <span className="labs-badge labs-badge-accent" style={{ fontSize: 11, padding: "1px 6px" }}>{entry.score}</span> : "—"}</td>
                          <td style={{ padding: 8, color: "var(--labs-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>{entry.sourceDocument || "—"}</td>
                          <td style={{ padding: 8, color: "var(--labs-text-muted)" }}>
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{entry.uploaderName || "—"}</span>
                          </td>
                          <td style={{ padding: 8, color: "var(--labs-text-muted)" }}>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(entry.createdAt)}</span>
                          </td>
                          <td style={{ padding: 8 }}>
                            {deleteConfirmId === entry.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  style={{ width: 24, height: 24, background: "var(--labs-danger)", color: "var(--labs-bg)", border: "none", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                  onClick={() => deleteMutation.mutate(entry.id)}
                                  disabled={deleteMutation.isPending}
                                  data-testid={`button-confirm-delete-${entry.id}`}
                                >
                                  {deleteMutation.isPending ? <Loader2 className="w-3 h-3" style={{ animation: "spin 1s linear infinite" }} /> : <Check className="w-3 h-3" />}
                                </button>
                                <button className="labs-btn-ghost" style={{ width: 24, height: 24, padding: 0 }} onClick={() => setDeleteConfirmId(null)} data-testid={`button-cancel-delete-${entry.id}`}>
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button className="labs-btn-ghost" style={{ width: 24, height: 24, padding: 0 }} onClick={() => setDeleteConfirmId(entry.id)} data-testid={`button-delete-${entry.id}`}>
                                <Trash2 className="w-3 h-3" style={{ color: "var(--labs-danger)" }} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: 8, background: "var(--labs-surface-elevated)", fontSize: 12, color: "var(--labs-text-muted)", textAlign: "center" }}>
                  {filteredSaved.length} entries
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
