import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useSession } from "@/lib/session";
import { journalApi, tastingHistoryApi } from "@/lib/api";
import { useLocation, Link } from "wouter";
import type { JournalEntry } from "@shared/schema";
import {
  BookOpen, Star, Plus, ChevronLeft, Pencil, Trash2, Check,
  Wine, Calendar, MapPin, X, Search, ScrollText, Trophy,
  Mic, Play as PlayIcon, Pause, ChevronDown, RotateCcw, Camera,
} from "lucide-react";
import WhiskyImage from "@/labs/components/WhiskyImage";

type FilterValue = "all" | "solo" | "tasting" | "drafts";
type ViewState = "list" | "detail" | "edit";
type DatePeriod = "all" | "7d" | "30d" | "3m" | "1y";
type ScoreRange = "all" | "90+" | "80-89" | "70-79" | "<70";
type SortBy = "date" | "score" | "name";

const FILTERS: { key: FilterValue; label: string }[] = [
  { key: "all", label: "All" },
  { key: "solo", label: "Solo" },
  { key: "tasting", label: "Tasting" },
  { key: "drafts", label: "Drafts" },
];

const DATE_PERIODS: { key: DatePeriod; label: string; days: number }[] = [
  { key: "all", label: "All time", days: 0 },
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "3m", label: "3 months", days: 90 },
  { key: "1y", label: "1 year", days: 365 },
];

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
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [datePeriod, setDatePeriod] = useState<DatePeriod>("all");
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [viewState, setViewState] = useState<ViewState>("list");
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);
  const [search, setSearch] = useState("");
  const [filterDistillery, setFilterDistillery] = useState("all");
  const [filterRegion, setFilterRegion] = useState("all");
  const [filterCaskType, setFilterCaskType] = useState("all");
  const [scoreRange, setScoreRange] = useState<ScoreRange>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date");
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
    queryFn: () => journalApi.getAll(session.pid!),
    enabled: !!session.pid,
  });

  const { data: tastingHistory } = useQuery({
    queryKey: ["tasting-history", session.pid],
    queryFn: () => tastingHistoryApi.get(session.pid!),
    enabled: !!session.pid,
  });

  const tastingWhiskies = useMemo(() => {
    if (!tastingHistory?.tastings) return [];
    return tastingHistory.tastings.flatMap((tasting: any) =>
      (tasting.whiskies || []).map((w: any) => ({
        id: `tw-${tasting.id}-${w.id}`,
        title: w.name || w.whiskyName || "—",
        whiskyName: w.name || w.whiskyName || null,
        distillery: w.distillery || null,
        region: w.region || null,
        age: w.age ? String(w.age) : null,
        abv: w.abv ? String(w.abv) : null,
        caskType: w.caskType || null,
        personalScore: w.overall ?? w.personalScore ?? null,
        createdAt: tasting.date || tasting.createdAt,
        source: "tasting" as const,
        tastingTitle: tasting.title,
        body: null, noseNotes: null, tasteNotes: null, finishNotes: null,
        imageUrl: w.imageUrl || null,
      }))
    );
  }, [tastingHistory]);

  const allItems = useMemo(() => [
    ...journal.map((e: any) => ({ ...e, source: e.source || "solo" })),
    ...tastingWhiskies,
  ], [journal, tastingWhiskies]);

  const uniqueDistilleries = useMemo(() => Array.from(new Set(allItems.map((e: any) => e.distillery).filter(Boolean))).sort(), [allItems]);
  const uniqueRegions = useMemo(() => Array.from(new Set(allItems.map((e: any) => e.region).filter(Boolean))).sort(), [allItems]);
  const uniqueCaskTypes = useMemo(() => Array.from(new Set(allItems.map((e: any) => e.caskType).filter(Boolean))).sort(), [allItems]);

  const hasAdvancedFilters = filterDistillery !== "all" || filterRegion !== "all" || filterCaskType !== "all" || scoreRange !== "all";
  const hasAnyFilter = activeFilter !== "all" || datePeriod !== "all" || search.trim() !== "" || hasAdvancedFilters || sortBy !== "date";

  const resetAllFilters = () => {
    setActiveFilter("all"); setDatePeriod("all"); setSearch("");
    setFilterDistillery("all"); setFilterRegion("all"); setFilterCaskType("all"); setScoreRange("all"); setSortBy("date");
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
      items = items.filter((e: any) => (e.whiskyName || e.title || "").toLowerCase().includes(q) || (e.distillery || "").toLowerCase().includes(q));
    }
    if (datePeriod !== "all") {
      const days = DATE_PERIODS.find(p => p.key === datePeriod)?.days || 0;
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
    items.sort((a: any, b: any) => {
      const da = a.status === "draft" ? 0 : 1;
      const db = b.status === "draft" ? 0 : 1;
      if (da !== db) return da - db;
      if (sortBy === "score") {
        const sa = a.personalScore ?? -1;
        const sb = b.personalScore ?? -1;
        return sb - sa;
      }
      if (sortBy === "name") {
        const na = (a.whiskyName || a.title || "").toLowerCase();
        const nb = (b.whiskyName || b.title || "").toLowerCase();
        return na.localeCompare(nb);
      }
      return (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    });
    return items;
  }, [journal, tastingWhiskies, activeFilter, search, datePeriod, filterDistillery, filterRegion, filterCaskType, scoreRange, sortBy]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => journalApi.update(session.pid!, id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["journal"] }); setViewState("list"); setSelectedEntry(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => journalApi.delete(session.pid!, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["journal"] }); setDeleteTarget(null); if (selectedEntry?.id === deleteTarget?.id) { setSelectedEntry(null); setViewState("list"); } },
  });

  const handleView = (entry: any) => { setSelectedEntry(entry); setViewState("detail"); };

  const handleEdit = (entry: any) => {
    setSelectedEntry(entry);
    setEditImageUrl(entry.imageUrl || null);
    const raw = entry.noseNotes || "";
    const hasStructured = /\[(SCORES|NOSE|TASTE|FINISH|BALANCE)\]/i.test(raw);
    if (hasStructured) {
      const parsed = parseNoseNotes(raw);
      setEditStructured({
        hasStructured: true, generalNotes: parsed.cleanText,
        scores: { nose: parsed.scores.nose != null ? String(parsed.scores.nose) : "", taste: parsed.scores.taste != null ? String(parsed.scores.taste) : "", finish: parsed.scores.finish != null ? String(parsed.scores.finish) : "" },
        dims: { nose: { chips: parsed.dims.nose?.chips.join(", ") || "", text: parsed.dims.nose?.text || "" }, taste: { chips: parsed.dims.taste?.chips.join(", ") || "", text: parsed.dims.taste?.text || "" }, finish: { chips: parsed.dims.finish?.chips.join(", ") || "", text: parsed.dims.finish?.text || "" } },
      });
    } else { setEditStructured(null); }
    setEditForm({ title: entry.title || entry.whiskyName || "", whiskyName: entry.whiskyName || "", distillery: entry.distillery || "", region: entry.region || "", age: entry.age || "", abv: entry.abv || "", caskType: entry.caskType || "", personalScore: entry.personalScore ?? "", noseNotes: raw, tasteNotes: entry.tasteNotes || "", finishNotes: entry.finishNotes || "", body: entry.body || "" });
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
    if (editStructured) data.noseNotes = reassembleStructuredNotes();
    if (data.personalScore === "") data.personalScore = null;
    else data.personalScore = parseFloat(data.personalScore);
    updateMutation.mutate({ id: selectedEntry.id, data });
  };

  const handleBack = () => { setViewState("list"); setSelectedEntry(null); };
  const isSoloEntry = (entry: any) => !entry.source || entry.source === "solo" || entry.source === "casksense";

  if (viewState === "detail" && selectedEntry) {
    return (
      <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-dram-detail">
        <div className="flex items-center justify-between mb-5">
          <button onClick={handleBack} className="labs-btn-ghost flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }} data-testid="button-labs-back-drams">
            <ChevronLeft className="w-4 h-4" /> Drams
          </button>
          {isSoloEntry(selectedEntry) && (
            <div className="flex gap-2">
              <button onClick={() => handleEdit(selectedEntry)} className="labs-btn-secondary flex items-center gap-1.5" style={{ padding: "6px 12px", fontSize: 13 }} data-testid="button-labs-edit-dram">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={() => setDeleteTarget(selectedEntry)} className="flex items-center gap-1.5" style={{ padding: "6px 12px", fontSize: 13, color: "var(--labs-danger)", background: "transparent", border: "1px solid var(--labs-danger)", borderRadius: 8, cursor: "pointer", opacity: 0.8 }} data-testid="button-labs-delete-dram">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>

        {selectedEntry.status === "draft" && isSoloEntry(selectedEntry) && (
          <button onClick={() => updateMutation.mutate({ id: selectedEntry.id, data: { status: "final" } })} className="labs-btn-primary w-full flex items-center justify-center gap-2 mb-4" data-testid="button-labs-finalize-dram">
            <Check className="w-4 h-4" /> Finish tasting
          </button>
        )}

        <div className="labs-card p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <WhiskyImage imageUrl={selectedEntry.imageUrl} name={selectedEntry.whiskyName || selectedEntry.title || ""} size={64} height={88} className="flex-shrink-0" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="labs-h3" style={{ color: "var(--labs-accent)", margin: 0 }}>
                {selectedEntry.whiskyName || selectedEntry.title || "—"}
              </h2>
              {selectedEntry.distillery && <div className="text-sm mt-1" style={{ color: "var(--labs-text-secondary)" }}>{selectedEntry.distillery}</div>}
              <div className="flex items-center gap-2 mt-1">
                {selectedEntry.status === "draft" && <span className="labs-badge" style={{ background: "color-mix(in srgb, var(--labs-accent) 15%, transparent)", color: "var(--labs-accent)", fontSize: 11 }}>Setting up</span>}
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
                <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>Score</div>
              </div>
            )}
          </div>

          {(selectedEntry.region || selectedEntry.age || selectedEntry.abv || selectedEntry.caskType) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedEntry.region && <MetaBadge label="Region" value={selectedEntry.region} />}
              {selectedEntry.age && <MetaBadge label="Age" value={selectedEntry.age} />}
              {selectedEntry.abv && <MetaBadge label="ABV" value={selectedEntry.abv} />}
              {selectedEntry.caskType && <MetaBadge label="Cask" value={selectedEntry.caskType} />}
            </div>
          )}

          {selectedEntry.noseNotes && (
            /\[(SCORES|NOSE|TASTE|FINISH|BALANCE)\]/i.test(selectedEntry.noseNotes)
              ? <ParsedNotesSection raw={selectedEntry.noseNotes} />
              : <NoteSection label="Nose" value={selectedEntry.noseNotes} />
          )}
          {selectedEntry.tasteNotes && <NoteSection label="Taste" value={selectedEntry.tasteNotes} />}
          {selectedEntry.finishNotes && <NoteSection label="Finish" value={selectedEntry.finishNotes} />}
          {selectedEntry.body && <NoteSection label="Notes" value={selectedEntry.body} />}

          <VoiceMemoSection url={(selectedEntry as any).voiceMemoUrl} transcript={(selectedEntry as any).voiceMemoTranscript} duration={(selectedEntry as any).voiceMemoDuration} />

          {(selectedEntry as any).tastingTitle && (
            <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text-secondary)" }}>
              <Wine className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} /> From tasting: {(selectedEntry as any).tastingTitle}
            </div>
          )}

          <HistoricalAppearances distillery={selectedEntry.distillery || ""} whiskyName={selectedEntry.whiskyName || selectedEntry.title || ""} />
        </div>

        {deleteTarget && <DeleteDialog onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} isPending={deleteMutation.isPending} />}
      </div>
    );
  }

  if (viewState === "edit" && selectedEntry) {
    return (
      <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-dram-edit">
        <div className="flex items-center justify-between mb-5">
          <button onClick={handleBack} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer" }} data-testid="button-labs-cancel-edit">
            <ChevronLeft className="w-4 h-4" /> Cancel
          </button>
          <button onClick={handleSaveEdit} disabled={updateMutation.isPending} className="labs-btn-primary" style={{ padding: "8px 20px", fontSize: 14, opacity: updateMutation.isPending ? 0.6 : 1 }} data-testid="button-labs-save-dram">
            {updateMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-3.5">
            {editImageUrl ? (
              <div style={{ position: "relative", width: 72, height: 96, borderRadius: 10, overflow: "hidden", border: "1px solid var(--labs-border)", flexShrink: 0 }}>
                <img src={editImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button onClick={() => imageInputRef.current?.click()} style={{ position: "absolute", bottom: 4, right: 4, width: 28, height: 28, borderRadius: "50%", background: "var(--labs-accent)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} data-testid="button-labs-change-image">
                  <Camera className="w-3.5 h-3.5" style={{ color: "var(--labs-bg)" }} />
                </button>
              </div>
            ) : (
              <button onClick={() => imageInputRef.current?.click()} disabled={imageUploading} style={{ width: 72, height: 96, borderRadius: 10, border: "2px dashed var(--labs-border)", background: "var(--labs-accent-muted)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0 }} data-testid="button-labs-add-image">
                <Camera className="w-5 h-5" style={{ color: "var(--labs-accent)", opacity: 0.75 }} />
                <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>Add Photo</span>
              </button>
            )}
            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} data-testid="input-labs-image-upload" />
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-[11px]" style={{ color: "var(--labs-text-muted)", opacity: 0.75 }} data-testid="text-photo-rights-hint">{t("labs.settings.photoRightsHint", "Please only upload your own photos or license-free images.")}</span>
              <EditField label="Whisky Name" value={editForm.whiskyName} onChange={(v) => setEditForm({ ...editForm, whiskyName: v, title: v })} testId="input-labs-edit-whiskyName" />
              <EditField label="Distillery" value={editForm.distillery} onChange={(v) => setEditForm({ ...editForm, distillery: v })} testId="input-labs-edit-distillery" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <EditField label="Region" value={editForm.region} onChange={(v) => setEditForm({ ...editForm, region: v })} testId="input-labs-edit-region" />
            <EditField label="Age" value={editForm.age} onChange={(v) => setEditForm({ ...editForm, age: v })} testId="input-labs-edit-age" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <EditField label="ABV" value={editForm.abv} onChange={(v) => setEditForm({ ...editForm, abv: v })} testId="input-labs-edit-abv" />
            <EditField label="Cask Type" value={editForm.caskType} onChange={(v) => setEditForm({ ...editForm, caskType: v })} testId="input-labs-edit-caskType" />
          </div>
          <EditField label="Score" value={editForm.personalScore} onChange={(v) => setEditForm({ ...editForm, personalScore: v })} testId="input-labs-edit-score" type="number" />

          {editStructured ? (
            <div className="flex flex-col gap-3">
              <EditTextarea label="Notes" value={editStructured.generalNotes} onChange={(v) => setEditStructured({ ...editStructured, generalNotes: v })} testId="input-labs-edit-general-notes" />
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--labs-text-muted)" }}>Sub-Scores</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["nose", "taste", "finish"] as const).map((dim) => (
                    <div key={dim}>
                      <label className="text-[11px] font-medium uppercase tracking-wider block mb-0.5" style={{ color: "var(--labs-text-muted)" }}>{dim}</label>
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
                    <label className="text-xs font-semibold block mb-1" style={{ color: "var(--labs-text-muted)" }}>{dim.charAt(0).toUpperCase() + dim.slice(1)}</label>
                    <EditField label="Descriptors" value={d.chips} onChange={(v) => setEditStructured({ ...editStructured, dims: { ...editStructured.dims, [dim]: { ...d, chips: v } } })} testId={`input-labs-edit-chips-${dim}`} />
                    <div className="mt-1"><EditTextarea label="Description" value={d.text} onChange={(v) => setEditStructured({ ...editStructured, dims: { ...editStructured.dims, [dim]: { ...d, text: v } } })} testId={`input-labs-edit-text-${dim}`} /></div>
                  </div>
                );
              })}
              <EditTextarea label="Taste" value={editForm.tasteNotes} onChange={(v) => setEditForm({ ...editForm, tasteNotes: v })} testId="input-labs-edit-taste" />
              <EditTextarea label="Finish" value={editForm.finishNotes} onChange={(v) => setEditForm({ ...editForm, finishNotes: v })} testId="input-labs-edit-finish" />
              <EditTextarea label="Notes" value={editForm.body} onChange={(v) => setEditForm({ ...editForm, body: v })} testId="input-labs-edit-body" />
            </div>
          ) : (
            <>
              <EditTextarea label="Nose" value={editForm.noseNotes} onChange={(v) => setEditForm({ ...editForm, noseNotes: v })} testId="input-labs-edit-nose" />
              <EditTextarea label="Taste" value={editForm.tasteNotes} onChange={(v) => setEditForm({ ...editForm, tasteNotes: v })} testId="input-labs-edit-taste" />
              <EditTextarea label="Finish" value={editForm.finishNotes} onChange={(v) => setEditForm({ ...editForm, finishNotes: v })} testId="input-labs-edit-finish" />
              <EditTextarea label="Notes" value={editForm.body} onChange={(v) => setEditForm({ ...editForm, body: v })} testId="input-labs-edit-body" />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-taste-drams">
      <button onClick={() => navigate("/labs/taste")} className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4" style={{ color: "var(--labs-text-muted)" }} data-testid="button-labs-back-taste">
        <ChevronLeft className="w-4 h-4" /> Taste
      </button>
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="labs-serif" style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)", margin: 0 }} data-testid="labs-drams-title">My Drams</h1>
          <p style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: "2px 0 0" }}>Your logged drams</p>
        </div>
        <button onClick={() => navigate("/labs/solo")} className="labs-btn-primary flex items-center gap-1.5" style={{ padding: "8px 16px", fontSize: 13, borderRadius: 10 }} data-testid="button-labs-add-dram">
          <Plus className="w-4 h-4" strokeWidth={2.5} /> Add Dram
        </button>
      </div>

      {!session.signedIn ? (
        <div className="labs-empty" style={{ minHeight: 200 }}>
          <Wine className="w-10 h-10 mb-3" style={{ color: "var(--labs-accent)" }} />
          <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Sign in to access your drams</p>
        </div>
      ) : (
        <>
          <div className="labs-card p-4 mb-4" data-testid="labs-drams-overview">
            <h3 className="labs-serif text-sm font-semibold mb-3" style={{ color: "var(--labs-text)" }}>Overview</h3>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: journal.length + tastingWhiskies.length, label: "Total" },
                { value: journal.filter((e: any) => e.status !== "draft").length, label: "Solo" },
                { value: tastingWhiskies.length, label: "Tastings" },
                { value: journal.filter((e: any) => e.status === "draft").length, label: "Drafts" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="labs-h2" style={{ color: "var(--labs-accent)" }}>{s.value}</div>
                  <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="labs-segmented" style={{ marginBottom: 12 }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setActiveFilter(f.key)}
                className={`labs-segmented-btn ${activeFilter === f.key ? "labs-segmented-btn-active" : ""}`}
                data-testid={`labs-filter-${f.key}`}>{f.label}</button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1" style={{ marginBottom: 10 }}>
            {DATE_PERIODS.map(p => (
              <button key={p.key} onClick={() => setDatePeriod(p.key)}
                className={`labs-chip ${datePeriod === p.key ? "labs-chip-active" : ""}`}
                style={{ fontSize: 12, padding: "5px 12px" }}
                data-testid={`labs-period-${p.key}`}>{p.label}</button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1" style={{ marginBottom: 10, WebkitOverflowScrolling: "touch" }}>
            {(["all", "90+", "80-89", "70-79", "<70"] as ScoreRange[]).map(sr => (
              <button key={sr} onClick={() => setScoreRange(sr)}
                className={`labs-chip ${scoreRange === sr ? "labs-chip-active" : ""}`}
                style={{ fontSize: 12, padding: "5px 12px" }}
                data-testid={`labs-score-${sr}`}>{sr === "all" ? "Score" : sr}</button>
            ))}
            {(["date", "score", "name"] as SortBy[]).map(sk => (
              <button key={sk} onClick={() => setSortBy(sk)}
                className={`labs-chip ${sortBy === sk ? "labs-chip-active" : ""}`}
                style={{ fontSize: 12, padding: "5px 12px" }}
                data-testid={`labs-sort-${sk}`}>{sk === "date" ? "Date" : sk === "score" ? "Score" : "Name"}</button>
            ))}
          </div>

          <div className="flex gap-2 mb-3 flex-wrap">
            {uniqueDistilleries.length > 0 && <FilterDropdown value={filterDistillery} onChange={setFilterDistillery} options={uniqueDistilleries} placeholder="Distillery" testId="labs-filter-distillery" />}
            {uniqueRegions.length > 0 && <FilterDropdown value={filterRegion} onChange={setFilterRegion} options={uniqueRegions} placeholder="Region" testId="labs-filter-region" />}
            {uniqueCaskTypes.length > 0 && <FilterDropdown value={filterCaskType} onChange={setFilterCaskType} options={uniqueCaskTypes} placeholder="Cask Type" testId="labs-filter-cask-type" />}
          </div>

          {hasAnyFilter && (
            <button onClick={resetAllFilters} className="labs-chip labs-chip-active flex items-center gap-1.5" style={{ marginBottom: 10, fontSize: 12, padding: "5px 12px" }} data-testid="button-labs-reset-filters">
              <RotateCcw className="w-3 h-3" /> Reset filters
            </button>
          )}

          <div className="relative" style={{ marginBottom: 16 }}>
            <Search className="absolute" style={{ left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--labs-text-muted)" }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drams..."
              className="labs-input" style={{ paddingLeft: 40, fontSize: 15, height: 44 }}
              data-testid="input-labs-search-drams" />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", padding: 2 }} data-testid="button-labs-clear-search">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isError ? (
            <div className="labs-card p-6 text-center">
              <p className="text-sm mb-3" style={{ color: "var(--labs-danger)" }}>Failed to load</p>
              <button onClick={() => refetch()} className="labs-btn-secondary" data-testid="button-labs-retry">Retry</button>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map(i => <div key={i} className="labs-card" style={{ height: 72 }} />)}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="labs-empty" style={{ minHeight: 200 }}>
              <BookOpen className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)" }} />
              <h3 className="text-base font-semibold mb-1" style={{ color: "var(--labs-text)" }}>No drams yet</h3>
              <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Start logging solo drams or join a tasting</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-xs mb-1" style={{ color: "var(--labs-text-muted)" }}>
                {hasAnyFilter ? `${filteredEntries.length} of ${allItems.length} entries` : `${filteredEntries.length} entries`}
              </div>
              {filteredEntries.map((entry: any) => (
                <div key={entry.id} onClick={() => handleView(entry)} className="labs-card labs-card-interactive" style={{ padding: "14px 16px", cursor: "pointer" }} data-testid={`labs-dram-${entry.id}`}>
                  <div className="flex justify-between items-start gap-3">
                    <WhiskyImage imageUrl={entry.imageUrl} name={entry.whiskyName || entry.title || ""} size={40} height={52} className="flex-shrink-0" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-1.5">
                        <div className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>{entry.whiskyName || entry.title || "—"}</div>
                        {entry.status === "draft" && <span className="labs-badge" style={{ background: "color-mix(in srgb, var(--labs-accent) 15%, transparent)", color: "var(--labs-accent)", fontSize: 11, padding: "2px 6px" }} data-testid={`labs-badge-draft-${entry.id}`}>Setting up</span>}
                        {entry.source === "tasting" && <span className="labs-badge labs-badge-accent" style={{ fontSize: 11, padding: "2px 6px" }}>Tasting</span>}
                      </div>
                      {entry.distillery && <div className="text-xs mt-0.5" style={{ color: "var(--labs-text-secondary)" }}>{entry.distillery}</div>}
                      <div className="flex items-center gap-2 mt-1 text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                        {entry.createdAt && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(entry.createdAt).toLocaleDateString()}</span>}
                        {entry.region && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{entry.region}</span>}
                      </div>
                    </div>
                    {entry.personalScore != null && (
                      <div className="flex items-center gap-1 labs-serif font-bold" style={{ fontSize: 16, color: "var(--labs-accent)", flexShrink: 0 }}>
                        <Star className="w-3.5 h-3.5" />{Number(entry.personalScore).toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {deleteTarget && <DeleteDialog onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} isPending={deleteMutation.isPending} />}
    </div>
  );
}

function FilterDropdown({ value, onChange, options, placeholder, testId }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string; testId: string }) {
  const isActive = value !== "all";
  return (
    <div style={{ position: "relative", flex: "1 1 0", minWidth: 100 }}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "7px 28px 7px 10px", fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? "var(--labs-accent)" : "var(--labs-text-muted)", background: isActive ? "var(--labs-accent-muted)" : "var(--labs-surface)", border: `1px solid ${isActive ? "var(--labs-accent)" : "var(--labs-border)"}`, borderRadius: 10, cursor: "pointer", appearance: "none", WebkitAppearance: "none", outline: "none" }}
        data-testid={testId}>
        <option value="all">{placeholder}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <ChevronDown style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: isActive ? "var(--labs-accent)" : "var(--labs-text-muted)", pointerEvents: "none" }} />
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
  const { cleanText, scores, dims } = parseNoseNotes(raw);
  const hasScores = Object.keys(scores).length > 0;
  const hasDims = Object.keys(dims).length > 0;
  const dimLabels: Record<string, string> = { nose: "Nose", taste: "Taste", finish: "Finish" };
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--labs-border)" }}>
      {cleanText && (
        <div style={{ marginBottom: hasDims || hasScores ? 12 : 0 }}>
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--labs-text-muted)" }}>Notes</div>
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
        <Mic className="w-3 h-3" /> Voice Memo {fmtDuration && <span style={{ fontWeight: 400, fontSize: 11 }}>({fmtDuration})</span>}
      </div>
      {url && (
        <button type="button" onClick={togglePlay} className="inline-flex items-center gap-1.5 mb-2" style={{ padding: "6px 14px", borderRadius: 8, background: playing ? "color-mix(in srgb, var(--labs-danger) 15%, transparent)" : "var(--labs-accent-muted)", border: `1px solid ${playing ? "color-mix(in srgb, var(--labs-danger) 30%, transparent)" : "color-mix(in srgb, var(--labs-accent) 20%, transparent)"}`, color: playing ? "var(--labs-danger)" : "var(--labs-accent)", fontSize: 12, fontWeight: 600, cursor: "pointer" }} data-testid="button-labs-play-voice-memo">
          {playing ? <Pause className="w-3 h-3" /> : <PlayIcon className="w-3 h-3" />} {playing ? "Pause" : "Play"}
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
        <span className="labs-serif text-sm font-bold" style={{ color: "var(--labs-text)" }}>Historical Appearances</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="labs-card p-2.5 text-center">
          <div className="labs-h3" style={{ color: "var(--labs-accent)" }}>{data.count}</div>
          <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>Appearances</div>
        </div>
        {(data.avgScoreNormalized ?? data.avgScore) != null && (
          <div className="labs-card p-2.5 text-center">
            <div className="labs-h3" style={{ color: "var(--labs-accent)" }}>
              {Math.round(data.avgScoreNormalized ?? (data.avgScore ?? 0) * 10)}<span className="text-xs font-normal" style={{ color: "var(--labs-text-muted)" }}>/100</span>
            </div>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>Avg Score</div>
          </div>
        )}
        {data.bestPlacement && (
          <div className="labs-card p-2.5 text-center">
            <div className="flex items-center justify-center gap-1">
              <Trophy className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />
              <span className="labs-h3" style={{ color: "var(--labs-accent)" }}>#{data.bestPlacement.rank}</span>
            </div>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>Best Rank</div>
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
              {a.totalRank != null && <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>Rank {a.totalRank}</div>}
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
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: "var(--z-overlay)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--overlay-backdrop)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)" }} data-testid="dialog-labs-delete-dram">
      <div className="labs-card" style={{ maxWidth: 380, width: "90%", padding: 24 }}>
        <h3 className="labs-h3 mb-2" style={{ color: "var(--labs-text)" }}>Delete Dram</h3>
        <p className="text-sm mb-5" style={{ color: "var(--labs-text-secondary)" }}>Are you sure you want to delete this entry? This cannot be undone.</p>
        <div className="flex justify-end gap-2.5">
          <button onClick={onCancel} className="labs-btn-secondary" style={{ padding: "8px 16px", fontSize: 14 }} data-testid="button-labs-cancel-delete">Cancel</button>
          <button onClick={onConfirm} disabled={isPending} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, color: "var(--labs-bg)", background: "var(--labs-danger)", border: "none", borderRadius: 8, cursor: "pointer", opacity: isPending ? 0.6 : 1 }} data-testid="button-labs-confirm-delete">
            {isPending ? "..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
