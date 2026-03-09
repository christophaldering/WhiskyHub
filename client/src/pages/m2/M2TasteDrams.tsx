import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { v, alpha } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { M2Loading, M2Error } from "@/components/m2/M2Feedback";
import { getSession, useSession } from "@/lib/session";
import { journalApi, tastingHistoryApi } from "@/lib/api";
import { useLocation } from "wouter";
import type { JournalEntry } from "@shared/schema";
import {
  BookOpen, Star, Plus, ArrowLeft, Pencil, Trash2, Check,
  Wine, Calendar, MapPin, X, Search, ScrollText, Trophy, Award,
  Mic, Play as PlayIcon, Pause, ChevronDown, RotateCcw, Camera, Upload,
} from "lucide-react";

const serif = "'Playfair Display', Georgia, serif";

type FilterValue = "all" | "solo" | "tasting" | "drafts";
type ViewState = "list" | "detail" | "edit";
type DatePeriod = "all" | "7d" | "30d" | "3m" | "1y";
type ScoreRange = "all" | "90+" | "80-89" | "70-79" | "<70";

const FILTERS: { key: FilterValue; labelKey: string }[] = [
  { key: "all", labelKey: "All" },
  { key: "solo", labelKey: "Solo" },
  { key: "tasting", labelKey: "Tasting" },
  { key: "drafts", labelKey: "Drafts" },
];

const DATE_PERIODS: { key: DatePeriod; labelKey: string; fallback: string; days: number }[] = [
  { key: "all", labelKey: "m2.taste.periodAll", fallback: "All time", days: 0 },
  { key: "7d", labelKey: "m2.taste.period7d", fallback: "7 days", days: 7 },
  { key: "30d", labelKey: "m2.taste.period30d", fallback: "30 days", days: 30 },
  { key: "3m", labelKey: "m2.taste.period3m", fallback: "3 months", days: 90 },
  { key: "1y", labelKey: "m2.taste.period1y", fallback: "1 year", days: 365 },
];

export default function M2TasteDrams() {
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
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);
  const [filterDistillery, setFilterDistillery] = useState("all");
  const [filterRegion, setFilterRegion] = useState("all");
  const [filterCaskType, setFilterCaskType] = useState("all");
  const [scoreRange, setScoreRange] = useState<ScoreRange>("all");
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [editStructured, setEditStructured] = useState<{
    hasStructured: boolean;
    generalNotes: string;
    scores: { nose: string; taste: string; finish: string; balance: string };
    dims: Record<string, { chips: string; text: string }>;
  } | null>(null);

  const { data: journal = [], isLoading, isError, refetch } = useQuery<JournalEntry[]>({
    queryKey: ["journal", session.pid],
    queryFn: () => journalApi.getAll(session.pid!),
    enabled: !!session.pid,
  });

  useEffect(() => {
    if (deepLinkHandled || isLoading || journal.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (editId) {
      const entry = journal.find((e: JournalEntry) => e.id === editId);
      if (entry) {
        handleEdit(entry);
        setDeepLinkHandled(true);
      }
    }
  }, [journal, isLoading, deepLinkHandled]);

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
        body: null,
        noseNotes: null,
        tasteNotes: null,
        finishNotes: null,
        imageUrl: w.imageUrl || null,
      }))
    );
  }, [tastingHistory]);

  const allItems = useMemo(() => {
    const items: any[] = [
      ...journal.map((e: any) => ({ ...e, source: e.source || "solo" })),
      ...tastingWhiskies,
    ];
    return items;
  }, [journal, tastingWhiskies]);

  const uniqueDistilleries = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((e: any) => { if (e.distillery) set.add(e.distillery); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  const uniqueRegions = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((e: any) => { if (e.region) set.add(e.region); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  const uniqueCaskTypes = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((e: any) => { if (e.caskType) set.add(e.caskType); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  const hasAdvancedFilters = filterDistillery !== "all" || filterRegion !== "all" || filterCaskType !== "all" || scoreRange !== "all";
  const hasAnyFilter = activeFilter !== "all" || datePeriod !== "all" || search.trim() !== "" || hasAdvancedFilters;

  const resetAllFilters = () => {
    setActiveFilter("all");
    setDatePeriod("all");
    setSearch("");
    setFilterDistillery("all");
    setFilterRegion("all");
    setFilterCaskType("all");
    setScoreRange("all");
  };

  const filteredEntries = useMemo(() => {
    let items: any[] = [];
    if (activeFilter === "drafts") {
      items = journal.filter((e: any) => e.status === "draft").map((e: any) => ({ ...e, source: e.source || "solo" }));
    } else {
      if (activeFilter === "all" || activeFilter === "solo") {
        items = [...items, ...journal.map((e: any) => ({ ...e, source: e.source || "solo" }))];
      }
      if (activeFilter === "all" || activeFilter === "tasting") {
        items = [...items, ...tastingWhiskies];
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((e: any) =>
        (e.whiskyName || e.title || "").toLowerCase().includes(q) ||
        (e.distillery || "").toLowerCase().includes(q)
      );
    }
    if (datePeriod !== "all") {
      const periodDays = DATE_PERIODS.find(p => p.key === datePeriod)?.days || 0;
      if (periodDays > 0) {
        const cutoff = Date.now() - periodDays * 86400000;
        items = items.filter((e: any) => {
          if (!e.createdAt) return false;
          return new Date(e.createdAt).getTime() >= cutoff;
        });
      }
    }
    if (filterDistillery !== "all") {
      items = items.filter((e: any) => e.distillery === filterDistillery);
    }
    if (filterRegion !== "all") {
      items = items.filter((e: any) => e.region === filterRegion);
    }
    if (filterCaskType !== "all") {
      items = items.filter((e: any) => e.caskType === filterCaskType);
    }
    if (scoreRange !== "all") {
      items = items.filter((e: any) => {
        const s = e.personalScore;
        if (s == null) return false;
        if (scoreRange === "90+") return s >= 90;
        if (scoreRange === "80-89") return s >= 80 && s < 90;
        if (scoreRange === "70-79") return s >= 70 && s < 80;
        if (scoreRange === "<70") return s < 70;
        return true;
      });
    }
    items.sort((a: any, b: any) => {
      const isDraftA = a.status === "draft" ? 0 : 1;
      const isDraftB = b.status === "draft" ? 0 : 1;
      if (isDraftA !== isDraftB) return isDraftA - isDraftB;
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
    return items;
  }, [journal, tastingWhiskies, activeFilter, search, datePeriod, filterDistillery, filterRegion, filterCaskType, scoreRange]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      journalApi.update(session.pid!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      setViewState("list");
      setSelectedEntry(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => journalApi.delete(session.pid!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      setDeleteTarget(null);
      if (selectedEntry?.id === deleteTarget?.id) {
        setSelectedEntry(null);
        setViewState("list");
      }
    },
  });

  const handleView = (entry: any) => {
    setSelectedEntry(entry);
    setViewState("detail");
  };

  const handleEdit = (entry: any) => {
    setSelectedEntry(entry);
    setEditImageUrl(entry.imageUrl || null);
    const raw = entry.noseNotes || "";
    const hasStructured = /\[(SCORES|NOSE|TASTE|FINISH|BALANCE)\]/i.test(raw);
    if (hasStructured) {
      const parsed = parseNoseNotes(raw);
      setEditStructured({
        hasStructured: true,
        generalNotes: parsed.cleanText,
        scores: {
          nose: parsed.scores.nose != null ? String(parsed.scores.nose) : "",
          taste: parsed.scores.taste != null ? String(parsed.scores.taste) : "",
          finish: parsed.scores.finish != null ? String(parsed.scores.finish) : "",
          balance: parsed.scores.balance != null ? String(parsed.scores.balance) : "",
        },
        dims: {
          nose: { chips: parsed.dims.nose?.chips.join(", ") || "", text: parsed.dims.nose?.text || "" },
          taste: { chips: parsed.dims.taste?.chips.join(", ") || "", text: parsed.dims.taste?.text || "" },
          finish: { chips: parsed.dims.finish?.chips.join(", ") || "", text: parsed.dims.finish?.text || "" },
          balance: { chips: parsed.dims.balance?.chips.join(", ") || "", text: parsed.dims.balance?.text || "" },
        },
      });
    } else {
      setEditStructured(null);
    }
    setEditForm({
      title: entry.title || entry.whiskyName || "",
      whiskyName: entry.whiskyName || "",
      distillery: entry.distillery || "",
      region: entry.region || "",
      age: entry.age || "",
      abv: entry.abv || "",
      caskType: entry.caskType || "",
      personalScore: entry.personalScore ?? "",
      noseNotes: raw,
      tasteNotes: entry.tasteNotes || "",
      finishNotes: entry.finishNotes || "",
      body: entry.body || "",
    });
    setViewState("edit");
  };

  const reassembleStructuredNotes = useCallback(() => {
    if (!editStructured) return editForm.noseNotes;
    let result = editStructured.generalNotes.trim();
    const s = editStructured.scores;
    if (s.nose || s.taste || s.finish || s.balance) {
      result += `\n\n[SCORES] Nose:${s.nose || "0"} Taste:${s.taste || "0"} Finish:${s.finish || "0"} Balance:${s.balance || "0"} [/SCORES]`;
    }
    for (const dim of ["nose", "taste", "finish", "balance"] as const) {
      const d = editStructured.dims[dim];
      if (d && (d.chips.trim() || d.text.trim())) {
        const tag = dim.toUpperCase();
        const content = d.chips.trim() && d.text.trim()
          ? `${d.chips.trim()} — ${d.text.trim()}`
          : d.chips.trim() || d.text.trim();
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
      const res = await fetch(`/api/journal/${session.pid}/${selectedEntry.id}/image`, {
        method: "POST",
        body: formData,
      });
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
    }
    if (data.personalScore === "") data.personalScore = null;
    else data.personalScore = parseFloat(data.personalScore);
    updateMutation.mutate({ id: selectedEntry.id, data });
  };

  const handleBack = () => {
    setViewState("list");
    setSelectedEntry(null);
  };

  const isSoloEntry = (entry: any) => !entry.source || entry.source === "solo" || entry.source === "casksense";

  if (viewState === "detail" && selectedEntry) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-dram-detail">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <button
            onClick={handleBack}
            style={{ display: "flex", alignItems: "center", gap: 6, color: v.muted, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}
            data-testid="button-back-to-drams"
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            {t("m2.common.back", "Back")}
          </button>
          {isSoloEntry(selectedEntry) && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => handleEdit(selectedEntry)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: 13, color: v.text, background: v.elevated, border: `1px solid ${v.border}`, borderRadius: 8, cursor: "pointer" }}
                data-testid="button-edit-dram"
              >
                <Pencil style={{ width: 14, height: 14 }} />
                {t("m2.taste.edit", "Edit")}
              </button>
              <button
                onClick={() => setDeleteTarget(selectedEntry)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: 13, color: v.danger, background: v.elevated, border: `1px solid ${v.border}`, borderRadius: 8, cursor: "pointer" }}
                data-testid="button-delete-dram"
              >
                <Trash2 style={{ width: 14, height: 14 }} />
                {t("m2.taste.delete", "Delete")}
              </button>
            </div>
          )}
        </div>

        {selectedEntry.status === "draft" && isSoloEntry(selectedEntry) && (
          <button
            onClick={() => {
              updateMutation.mutate({ id: selectedEntry.id, data: { status: "final" } });
            }}
            style={{
              width: "100%",
              padding: 12,
              fontSize: 15,
              fontWeight: 600,
              background: "#d4a256",
              color: "#1a1612",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 16,
            }}
            data-testid="button-finalize-dram"
          >
            <Check style={{ width: 18, height: 18 }} />
            {t("m2.taste.finalizeDram", "Finish tasting")}
          </button>
        )}

        <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 14, padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
            {selectedEntry.imageUrl ? (
              <div style={{ width: 64, height: 88, borderRadius: 8, overflow: "hidden", border: `1px solid ${v.border}`, flexShrink: 0 }}>
                <img src={selectedEntry.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ) : (
              <div style={{ width: 64, height: 88, borderRadius: 8, background: alpha(v.accent, "08"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${v.border}` }}>
                <Wine style={{ width: 28, height: 28, color: v.accent, opacity: 0.5 }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: v.accent, margin: 0 }}>
                {selectedEntry.whiskyName || selectedEntry.title || "—"}
              </h2>
              {selectedEntry.distillery && (
                <div style={{ fontSize: 14, color: v.textSecondary, marginTop: 4 }}>{selectedEntry.distillery}</div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                {selectedEntry.status === "draft" && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#d4a25620", color: "#d4a256" }}>
                    {t("m2.taste.draft", "Draft")}
                  </span>
                )}
                {selectedEntry.createdAt && (
                  <span style={{ fontSize: 12, color: v.muted, display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar style={{ width: 12, height: 12 }} />
                    {new Date(selectedEntry.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            {selectedEntry.personalScore != null && (
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: v.accent, fontFamily: serif }}>{Number(selectedEntry.personalScore).toFixed(1)}</div>
                <div style={{ fontSize: 10, color: v.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{t("m2.taste.score", "Score")}</div>
              </div>
            )}
          </div>

          {(selectedEntry.region || selectedEntry.age || selectedEntry.abv || selectedEntry.caskType) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {selectedEntry.region && <MetaBadge label={t("m2.taste.region", "Region")} value={selectedEntry.region} />}
              {selectedEntry.age && <MetaBadge label={t("m2.taste.age", "Age")} value={selectedEntry.age} />}
              {selectedEntry.abv && <MetaBadge label={t("m2.taste.abv", "ABV")} value={selectedEntry.abv} />}
              {selectedEntry.caskType && <MetaBadge label={t("m2.taste.caskType", "Cask")} value={selectedEntry.caskType} />}
            </div>
          )}

          {selectedEntry.noseNotes && (
            /\[(SCORES|NOSE|TASTE|FINISH|BALANCE)\]/i.test(selectedEntry.noseNotes)
              ? <ParsedNotesSection raw={selectedEntry.noseNotes} />
              : <NoteSection label={t("m2.taste.noseNotes", "Nose")} value={selectedEntry.noseNotes} />
          )}
          {selectedEntry.tasteNotes && (
            <NoteSection label={t("m2.taste.tasteNotes", "Taste")} value={selectedEntry.tasteNotes} />
          )}
          {selectedEntry.finishNotes && (
            <NoteSection label={t("m2.taste.finishNotes", "Finish")} value={selectedEntry.finishNotes} />
          )}
          {selectedEntry.body && (
            <NoteSection label={t("m2.taste.notes", "Notes")} value={selectedEntry.body} />
          )}

          <VoiceMemoSection
            url={(selectedEntry as any).voiceMemoUrl}
            transcript={(selectedEntry as any).voiceMemoTranscript}
            duration={(selectedEntry as any).voiceMemoDuration}
          />

          {(selectedEntry as any).tastingTitle && (
            <div style={{ marginTop: 16, padding: "10px 12px", background: v.elevated, borderRadius: 8, fontSize: 12, color: v.textSecondary }}>
              <Wine style={{ width: 12, height: 12, display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              {t("m2.taste.fromTasting", "From tasting:")} {(selectedEntry as any).tastingTitle}
            </div>
          )}

          <HistoricalAppearances
            distillery={selectedEntry.distillery || ""}
            whiskyName={selectedEntry.whiskyName || selectedEntry.title || ""}
            t={t}
          />
        </div>

        {deleteTarget && (
          <DeleteDialog
            t={t}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            isPending={deleteMutation.isPending}
          />
        )}
      </div>
    );
  }

  if (viewState === "edit" && selectedEntry) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-dram-edit">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <button
            onClick={handleBack}
            style={{ display: "flex", alignItems: "center", gap: 6, color: v.muted, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}
            data-testid="button-cancel-edit"
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            {t("m2.common.cancel", "Cancel")}
          </button>
          <button
            onClick={handleSaveEdit}
            disabled={updateMutation.isPending}
            style={{ padding: "8px 20px", fontSize: 14, fontWeight: 600, color: v.bg, background: v.accent, border: "none", borderRadius: 10, cursor: "pointer", opacity: updateMutation.isPending ? 0.6 : 1 }}
            data-testid="button-save-dram"
          >
            {updateMutation.isPending ? t("m2.common.saving", "Saving...") : t("m2.common.save", "Save")}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {editImageUrl ? (
              <div style={{ position: "relative", width: 72, height: 96, borderRadius: 10, overflow: "hidden", border: `1px solid ${v.border}`, flexShrink: 0 }}>
                <img src={editImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button
                  onClick={() => imageInputRef.current?.click()}
                  style={{ position: "absolute", bottom: 4, right: 4, width: 28, height: 28, borderRadius: "50%", background: v.accent, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  data-testid="button-change-image"
                >
                  <Camera style={{ width: 14, height: 14, color: v.bg }} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={imageUploading}
                style={{
                  width: 72, height: 96, borderRadius: 10, border: `2px dashed ${v.border}`,
                  background: alpha(v.accent, "06"), cursor: "pointer", display: "flex",
                  flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0,
                }}
                data-testid="button-add-image"
              >
                {imageUploading ? (
                  <div style={{ fontSize: 10, color: v.muted }}>...</div>
                ) : (
                  <>
                    <Camera style={{ width: 22, height: 22, color: v.accent, opacity: 0.6 }} />
                    <span style={{ fontSize: 9, color: v.muted, fontWeight: 500 }}>{t("m2.taste.addPhoto", "Add Photo")}</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
                e.target.value = "";
              }}
              data-testid="input-image-upload"
            />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <EditField label={t("m2.taste.whiskyName", "Whisky Name")} value={editForm.whiskyName} onChange={(val) => setEditForm({ ...editForm, whiskyName: val, title: val })} testId="input-edit-whiskyName" />
              <EditField label={t("m2.taste.distillery", "Distillery")} value={editForm.distillery} onChange={(val) => setEditForm({ ...editForm, distillery: val })} testId="input-edit-distillery" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <EditField label={t("m2.taste.region", "Region")} value={editForm.region} onChange={(val) => setEditForm({ ...editForm, region: val })} testId="input-edit-region" />
            <EditField label={t("m2.taste.age", "Age")} value={editForm.age} onChange={(val) => setEditForm({ ...editForm, age: val })} testId="input-edit-age" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <EditField label={t("m2.taste.abv", "ABV")} value={editForm.abv} onChange={(val) => setEditForm({ ...editForm, abv: val })} testId="input-edit-abv" />
            <EditField label={t("m2.taste.caskType", "Cask Type")} value={editForm.caskType} onChange={(val) => setEditForm({ ...editForm, caskType: val })} testId="input-edit-caskType" />
          </div>
          <EditField label={t("m2.taste.score", "Score")} value={editForm.personalScore} onChange={(val) => setEditForm({ ...editForm, personalScore: val })} testId="input-edit-score" type="number" />

          {editStructured ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <EditTextarea label={t("m2.taste.notes", "Notes")} value={editStructured.generalNotes} onChange={(val) => setEditStructured({ ...editStructured, generalNotes: val })} testId="input-edit-general-notes" />

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 6 }}>{t("m2.taste.subScores", "Sub-Scores")}</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                  {(["nose", "taste", "finish", "balance"] as const).map((dim) => (
                    <div key={dim}>
                      <label style={{ fontSize: 10, fontWeight: 500, color: v.muted, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 2 }}>
                        {dim === "nose" ? "Nose" : dim === "taste" ? "Taste" : dim === "finish" ? "Finish" : "Balance"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editStructured.scores[dim]}
                        onChange={(e) => setEditStructured({ ...editStructured, scores: { ...editStructured.scores, [dim]: e.target.value } })}
                        style={{
                          width: "100%", padding: "8px 6px", textAlign: "center",
                          background: v.inputBg, border: `1px solid ${v.inputBorder}`,
                          borderRadius: 8, fontSize: 16, fontWeight: 700, color: v.accent,
                          fontFamily: serif, outline: "none", boxSizing: "border-box",
                        }}
                        data-testid={`input-edit-score-${dim}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {(["nose", "taste", "finish", "balance"] as const).map((dim) => {
                const d = editStructured.dims[dim];
                if (!d) return null;
                const dimLabel = dim === "nose" ? "Nose" : dim === "taste" ? "Taste" : dim === "finish" ? "Finish" : "Balance";
                return (
                  <div key={dim}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 4 }}>{dimLabel}</label>
                    <EditField
                      label={t("m2.taste.descriptors", "Descriptors")}
                      value={d.chips}
                      onChange={(val) => setEditStructured({ ...editStructured, dims: { ...editStructured.dims, [dim]: { ...d, chips: val } } })}
                      testId={`input-edit-chips-${dim}`}
                    />
                    <div style={{ marginTop: 4 }}>
                      <EditTextarea
                        label={t("m2.taste.description", "Description")}
                        value={d.text}
                        onChange={(val) => setEditStructured({ ...editStructured, dims: { ...editStructured.dims, [dim]: { ...d, text: val } } })}
                        testId={`input-edit-text-${dim}`}
                      />
                    </div>
                  </div>
                );
              })}
              <EditTextarea label={t("m2.taste.tasteNotes", "Taste")} value={editForm.tasteNotes} onChange={(val) => setEditForm({ ...editForm, tasteNotes: val })} testId="input-edit-taste" />
              <EditTextarea label={t("m2.taste.finishNotes", "Finish")} value={editForm.finishNotes} onChange={(val) => setEditForm({ ...editForm, finishNotes: val })} testId="input-edit-finish" />
              <EditTextarea label={t("m2.taste.notes", "Notes")} value={editForm.body} onChange={(val) => setEditForm({ ...editForm, body: val })} testId="input-edit-body" />
            </div>
          ) : (
            <>
              <EditTextarea label={t("m2.taste.noseNotes", "Nose")} value={editForm.noseNotes} onChange={(val) => setEditForm({ ...editForm, noseNotes: val })} testId="input-edit-nose" />
              <EditTextarea label={t("m2.taste.tasteNotes", "Taste")} value={editForm.tasteNotes} onChange={(val) => setEditForm({ ...editForm, tasteNotes: val })} testId="input-edit-taste" />
              <EditTextarea label={t("m2.taste.finishNotes", "Finish")} value={editForm.finishNotes} onChange={(val) => setEditForm({ ...editForm, finishNotes: val })} testId="input-edit-finish" />
              <EditTextarea label={t("m2.taste.notes", "Notes")} value={editForm.body} onChange={(val) => setEditForm({ ...editForm, body: val })} testId="input-edit-body" />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px" }} data-testid="m2-taste-drams">
      <M2BackButton />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0 12px" }}>
        <h1 style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: v.text, margin: 0 }}>
          {t("m2.taste.journal", "Drams")}
        </h1>
        <button
          onClick={() => navigate("/m2/tastings/solo")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", background: v.accent, color: v.bg,
            borderRadius: 10, fontSize: 14, fontWeight: 600,
            border: "none", cursor: "pointer",
          }}
          data-testid="button-add-dram"
        >
          <Plus style={{ width: 16, height: 16 }} strokeWidth={2.5} />
          {t("m2.taste.addDram", "Add Dram")}
        </button>
      </div>

      {!session.signedIn ? (
        <div style={{ background: v.elevated, borderRadius: 12, padding: "24px 16px", textAlign: "center", color: v.textSecondary, fontSize: 14 }}>
          {t("m2.taste.signInPrompt", "Sign in to access your taste profile")}
        </div>
      ) : (
        <>
          <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 14, padding: "16px 20px", marginBottom: 16 }} data-testid="drams-overview-card">
            <h3 style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: v.text, margin: "0 0 12px" }}>
              {t("m2.taste.overview", "Overview")}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[
                { value: journal.length + tastingWhiskies.length, label: t("m2.taste.totalDrams", "Total") },
                { value: journal.filter((e: any) => e.status !== "draft").length, label: "Solo" },
                { value: tastingWhiskies.length, label: t("m2.taste.fromTastings", "Tastings") },
                { value: journal.filter((e: any) => e.status === "draft").length, label: t("m2.taste.draftsCount", "Drafts") },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: serif, color: v.accent }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: v.muted }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto" }}>
            {FILTERS.map((f) => {
              const isActive = activeFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  style={{
                    padding: "5px 12px", fontSize: 11,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? v.accent : v.muted,
                    background: isActive ? `color-mix(in srgb, ${v.accent} 10%, transparent)` : "transparent",
                    border: `1px solid ${isActive ? `color-mix(in srgb, ${v.accent} 40%, transparent)` : v.border}`,
                    borderRadius: 16, cursor: "pointer",
                    transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0,
                    fontFamily: "system-ui, sans-serif",
                  }}
                  data-testid={`filter-${f.key}`}
                >
                  {t(`m2.taste.filter${f.labelKey}`, f.labelKey)}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto" }}>
            {DATE_PERIODS.map((p) => {
              const isActive = datePeriod === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setDatePeriod(p.key)}
                  style={{
                    padding: "5px 12px", fontSize: 12,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? v.accent : v.muted,
                    background: isActive ? v.pillBg : "transparent",
                    border: `1px solid ${isActive ? v.accent : v.border}`,
                    borderRadius: 16, cursor: "pointer",
                    transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0,
                  }}
                  data-testid={`period-${p.key}`}
                >
                  {t(p.labelKey, p.fallback)}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto" }}>
            {(["all", "90+", "80-89", "70-79", "<70"] as ScoreRange[]).map((sr) => {
              const isActive = scoreRange === sr;
              const label = sr === "all" ? t("m2.taste.scoreAll", "Score") : sr;
              return (
                <button
                  key={sr}
                  onClick={() => setScoreRange(sr)}
                  style={{
                    padding: "5px 12px", fontSize: 11,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? v.accent : v.muted,
                    background: isActive ? `color-mix(in srgb, ${v.accent} 10%, transparent)` : "transparent",
                    border: `1px solid ${isActive ? `color-mix(in srgb, ${v.accent} 40%, transparent)` : v.border}`,
                    borderRadius: 16, cursor: "pointer",
                    transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0,
                    fontFamily: "system-ui, sans-serif",
                  }}
                  data-testid={`score-${sr}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {uniqueDistilleries.length > 0 && (
              <FilterDropdown
                value={filterDistillery}
                onChange={setFilterDistillery}
                options={uniqueDistilleries}
                placeholder={t("m2.taste.distillery", "Distillery")}
                testId="filter-distillery"
              />
            )}
            {uniqueRegions.length > 0 && (
              <FilterDropdown
                value={filterRegion}
                onChange={setFilterRegion}
                options={uniqueRegions}
                placeholder={t("m2.taste.region", "Region")}
                testId="filter-region"
              />
            )}
            {uniqueCaskTypes.length > 0 && (
              <FilterDropdown
                value={filterCaskType}
                onChange={setFilterCaskType}
                options={uniqueCaskTypes}
                placeholder={t("m2.taste.caskType", "Cask Type")}
                testId="filter-cask-type"
              />
            )}
          </div>

          {hasAnyFilter && (
            <button
              onClick={resetAllFilters}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 12px", fontSize: 11, fontWeight: 500,
                color: v.accent, background: "transparent",
                border: `1px solid ${v.accent}`, borderRadius: 16,
                cursor: "pointer", marginBottom: 12, fontFamily: "system-ui, sans-serif",
              }}
              data-testid="button-reset-filters"
            >
              <RotateCcw style={{ width: 12, height: 12 }} />
              {t("m2.taste.resetFilters", "Reset filters")}
            </button>
          )}

          <div style={{ position: "relative", marginBottom: 16 }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: v.muted }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("m2.taste.searchDrams", "Search drams...")}
              style={{
                width: "100%", padding: "10px 12px 10px 36px",
                background: v.inputBg, border: `1px solid ${v.inputBorder}`,
                borderRadius: 10, fontSize: 14, color: v.inputText,
                outline: "none", boxSizing: "border-box",
              }}
              data-testid="input-search-drams"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: v.muted, padding: 2 }}
                data-testid="button-clear-search"
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>

          {isError ? (
            <M2Error onRetry={refetch} />
          ) : isLoading ? (
            <M2Loading />
          ) : filteredEntries.length === 0 ? (
            <div style={{ background: v.elevated, borderRadius: 14, padding: "32px 20px", textAlign: "center" }}>
              <BookOpen style={{ width: 40, height: 40, color: v.muted, marginBottom: 12 }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: v.text, margin: "0 0 6px" }}>
                {t("m2.taste.noDrams", "No drams yet")}
              </h3>
              <p style={{ fontSize: 13, color: v.textSecondary, margin: 0 }}>
                {t("m2.taste.noDramsDesc", "Start logging solo drams or join a tasting to build your collection.")}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, color: v.muted, marginBottom: 4 }}>
                {hasAnyFilter
                  ? `${filteredEntries.length} ${t("m2.taste.of", "of")} ${allItems.length} ${t("m2.taste.entries", "entries")}`
                  : `${filteredEntries.length} ${t("m2.taste.entries", "entries")}`}
              </div>
              {filteredEntries.map((entry: any) => (
                <div
                  key={entry.id}
                  onClick={() => handleView(entry)}
                  style={{
                    background: v.card, border: `1px solid ${v.border}`,
                    borderRadius: 12, padding: "14px 16px", cursor: "pointer",
                    transition: "border-color 0.2s",
                  }}
                  data-testid={`m2-dram-${entry.id}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    {entry.imageUrl ? (
                      <div style={{ width: 40, height: 52, borderRadius: 6, overflow: "hidden", border: `1px solid ${v.border}`, flexShrink: 0 }}>
                        <img src={entry.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ) : (
                      <div style={{ width: 40, height: 52, borderRadius: 6, background: alpha(v.accent, "08"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${v.border}` }}>
                        <Wine style={{ width: 18, height: 18, color: v.accent, opacity: 0.5 }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: v.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.whiskyName || entry.title || "—"}
                        </div>
                        {entry.status === "draft" && (
                          <span style={{
                            fontSize: 10, fontWeight: 600,
                            padding: "2px 6px", borderRadius: 4,
                            background: "#d4a25620", color: "#d4a256",
                          }} data-testid={`badge-draft-${entry.id}`}>
                            {t("m2.taste.draft", "Draft")}
                          </span>
                        )}
                        {entry.source === "tasting" && (
                          <span style={{
                            fontSize: 10, fontWeight: 600,
                            padding: "2px 6px", borderRadius: 4,
                            background: v.pillBg, color: v.pillText,
                          }}>
                            {t("m2.taste.tastingBadge", "Tasting")}
                          </span>
                        )}
                      </div>
                      {entry.distillery && (
                        <div style={{ fontSize: 12, color: v.textSecondary, marginTop: 2 }}>{entry.distillery}</div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, fontSize: 11, color: v.muted }}>
                        {entry.createdAt && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <Calendar style={{ width: 11, height: 11 }} />
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </span>
                        )}
                        {entry.region && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <MapPin style={{ width: 11, height: 11 }} />
                            {entry.region}
                          </span>
                        )}
                      </div>
                    </div>
                    {entry.personalScore != null && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 16, fontWeight: 700, color: v.accent, fontFamily: serif, flexShrink: 0 }}>
                        <Star style={{ width: 14, height: 14 }} />
                        {Number(entry.personalScore).toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {deleteTarget && (
        <DeleteDialog
          t={t}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

function FilterDropdown({ value, onChange, options, placeholder, testId }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string; testId: string;
}) {
  const isActive = value !== "all";
  return (
    <div style={{ position: "relative", flex: "1 1 0", minWidth: 100 }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "7px 28px 7px 10px",
          fontSize: 12,
          fontWeight: isActive ? 600 : 400,
          color: isActive ? v.accent : v.muted,
          background: isActive ? `color-mix(in srgb, ${v.accent} 8%, ${v.card})` : v.card,
          border: `1px solid ${isActive ? `color-mix(in srgb, ${v.accent} 40%, transparent)` : v.border}`,
          borderRadius: 10,
          cursor: "pointer",
          appearance: "none",
          WebkitAppearance: "none",
          fontFamily: "system-ui, sans-serif",
          outline: "none",
        }}
        data-testid={testId}
      >
        <option value="all">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <ChevronDown
        style={{
          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          width: 14, height: 14, color: isActive ? v.accent : v.muted, pointerEvents: "none",
        }}
      />
    </div>
  );
}

function MetaBadge({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: v.elevated, borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
      <span style={{ color: v.muted }}>{label}: </span>
      <span style={{ color: v.text, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function parseNoseNotes(raw: string) {
  let cleanText = raw;
  let scores: { nose?: number; taste?: number; finish?: number; balance?: number } = {};
  const dims: Record<string, { chips: string[]; text: string }> = {};

  const scoresRx = /\[SCORES]\s*Nose:(\d+)\s*Taste:(\d+)\s*Finish:(\d+)\s*Balance:(\d+)\s*\[\/SCORES]/gi;
  const scoresMatch = raw.match(/\[SCORES]\s*Nose:(\d+)\s*Taste:(\d+)\s*Finish:(\d+)\s*Balance:(\d+)\s*\[\/SCORES]/i);
  if (scoresMatch) {
    scores = { nose: +scoresMatch[1], taste: +scoresMatch[2], finish: +scoresMatch[3], balance: +scoresMatch[4] };
    cleanText = cleanText.replace(scoresRx, "");
  }

  for (const d of ["NOSE", "TASTE", "FINISH", "BALANCE"]) {
    const rxFirst = new RegExp(`\\[${d}]\\s*(.+?)\\s*\\[\\/${d}]`, "si");
    const rxAll = new RegExp(`\\[${d}]\\s*(.+?)\\s*\\[\\/${d}]`, "gsi");
    const m = cleanText.match(rxFirst);
    if (m) {
      const content = m[1].trim();
      const parts = content.split(" — ");
      const chipStr = parts[0] || "";
      const textStr = parts.length > 1 ? parts.slice(1).join(" — ") : "";
      dims[d.toLowerCase()] = {
        chips: chipStr ? chipStr.split(",").map((c: string) => c.trim()).filter(Boolean) : [],
        text: textStr.trim(),
      };
      cleanText = cleanText.replace(rxAll, "");
    }
  }

  cleanText = cleanText.trim();
  return { cleanText, scores, dims };
}

function ParsedNotesSection({ raw }: { raw: string }) {
  const { cleanText, scores, dims } = parseNoseNotes(raw);
  const hasScores = Object.keys(scores).length > 0;
  const hasDims = Object.keys(dims).length > 0;
  const dimLabels: Record<string, string> = { nose: "Nose", taste: "Taste", finish: "Finish", balance: "Balance" };

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${v.border}` }}>
      {cleanText && (
        <div style={{ marginBottom: hasDims || hasScores ? 12 : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: v.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Notes</div>
          <div style={{ fontSize: 14, color: v.textSecondary, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{cleanText}</div>
        </div>
      )}

      {hasScores && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: hasDims ? 12 : 0 }}>
          {(["nose", "taste", "finish", "balance"] as const).map((k) =>
            scores[k] != null ? (
              <div key={k} style={{ background: v.elevated, borderRadius: 8, padding: "6px 12px", textAlign: "center", minWidth: 56 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: v.accent, fontFamily: serif }}>{scores[k]}</div>
                <div style={{ fontSize: 10, color: v.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{dimLabels[k]}</div>
              </div>
            ) : null
          )}
        </div>
      )}

      {hasDims && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(["nose", "taste", "finish", "balance"] as const).map((k) => {
            const dim = dims[k];
            if (!dim) return null;
            return (
              <div key={k}>
                <div style={{ fontSize: 11, fontWeight: 600, color: v.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{dimLabels[k]}</div>
                {dim.chips.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: dim.text ? 4 : 0 }}>
                    {dim.chips.map((chip) => (
                      <span key={chip} style={{
                        fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 999,
                        background: "rgba(212,162,86,0.12)", color: "#d4a256", border: "1px solid rgba(212,162,86,0.2)",
                      }}>{chip}</span>
                    ))}
                  </div>
                )}
                {dim.text && (
                  <div style={{ fontSize: 13, color: v.textSecondary, lineHeight: 1.5 }}>{dim.text}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NoteSection({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${v.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: v.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: v.textSecondary, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{value}</div>
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
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  };

  const fmtDuration = duration && duration > 0 ? `${Math.floor(duration / 60)}:${String(Math.round(duration % 60)).padStart(2, "0")}` : null;

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${v.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: v.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <Mic style={{ width: 12, height: 12 }} />
        Voice Memo
        {fmtDuration && <span style={{ fontWeight: 400, fontSize: 10 }}>({fmtDuration})</span>}
      </div>
      {url && (
        <button
          type="button"
          onClick={togglePlay}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 8,
            background: playing ? "rgba(229,115,115,0.15)" : "rgba(212,162,86,0.12)",
            border: `1px solid ${playing ? "rgba(229,115,115,0.3)" : "rgba(212,162,86,0.2)"}`,
            color: playing ? "#e57373" : "#d4a256",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            marginBottom: transcript ? 8 : 0,
          }}
          data-testid="button-play-voice-memo"
        >
          {playing ? <Pause style={{ width: 13, height: 13 }} /> : <PlayIcon style={{ width: 13, height: 13 }} />}
          {playing ? "Pause" : "Play"}
        </button>
      )}
      {transcript && (
        <div style={{
          fontSize: 13, color: v.textSecondary, lineHeight: 1.6,
          fontStyle: "italic", padding: "8px 12px", borderRadius: 8,
          background: v.elevated,
        }}>
          "{transcript}"
        </div>
      )}
    </div>
  );
}

function EditField({ label, value, onChange, testId, type = "text" }: { label: string; value: string; onChange: (v: string) => void; testId: string; type?: string }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", padding: "10px 12px",
          background: v.inputBg, border: `1px solid ${v.inputBorder}`,
          borderRadius: 8, fontSize: 14, color: v.inputText,
          outline: "none", boxSizing: "border-box",
        }}
        data-testid={testId}
      />
    </div>
  );
}

function EditTextarea({ label, value, onChange, testId }: { label: string; value: string; onChange: (v: string) => void; testId: string }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 4 }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{
          width: "100%", padding: "10px 12px",
          background: v.inputBg, border: `1px solid ${v.inputBorder}`,
          borderRadius: 8, fontSize: 14, color: v.inputText,
          outline: "none", boxSizing: "border-box", resize: "vertical",
          lineHeight: 1.5,
        }}
        data-testid={testId}
      />
    </div>
  );
}

function HistoricalAppearances({ distillery, whiskyName, t }: { distillery: string; whiskyName: string; t: any }) {
  const [, navigate] = useLocation();
  const session = useSession();
  const pid = session?.pid || "";
  const query = new URLSearchParams();
  if (distillery) query.set("distillery", distillery);
  if (whiskyName) query.set("name", whiskyName);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["historical-appearances", distillery, whiskyName],
    queryFn: () => {
      const headers: Record<string, string> = {};
      if (pid) headers["x-participant-id"] = pid;
      return fetch(`/api/historical/whisky-appearances?${query.toString()}`, { headers }).then(r => r.json());
    },
    enabled: !!(distillery || whiskyName),
  });

  if (isLoading || !data || data.count === 0) return null;

  return (
    <div style={{ marginTop: 20 }} data-testid="historical-appearances">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <ScrollText style={{ width: 16, height: 16, color: v.accent }} />
        <span style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: v.text }}>
          {t("m2.taste.historicalAppearances", "Historical Appearances")}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
        <div style={{ background: v.elevated, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: v.accent, fontFamily: serif }}>{data.count}</div>
          <div style={{ fontSize: 10, color: v.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {t("m2.taste.appearances", "Appearances")}
          </div>
        </div>
        {(data.avgScoreNormalized ?? data.avgScore) != null && (
          <div style={{ background: v.elevated, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: v.accent, fontFamily: serif }}>
              {Math.round(data.avgScoreNormalized ?? (data.avgScore ?? 0) * 10)}
              <span style={{ fontSize: 12, fontWeight: 400, color: v.muted }}>/100</span>
            </div>
            <div style={{ fontSize: 10, color: v.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t("m2.taste.avgHistScore", "Ø Score")}
            </div>
          </div>
        )}
        {data.bestPlacement && (
          <div style={{ background: v.elevated, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <Trophy style={{ width: 14, height: 14, color: "#d4a256" }} />
              <span style={{ fontSize: 20, fontWeight: 700, color: v.accent, fontFamily: serif }}>#{data.bestPlacement.rank}</span>
            </div>
            <div style={{ fontSize: 10, color: v.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t("m2.taste.bestRank", "Best Rank")}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.appearances.slice(0, 5).map((a: any, i: number) => (
          <button
            key={i}
            onClick={() => navigate(`/m2/taste/historical/${a.tastingId}`)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              background: v.elevated, border: `1px solid ${v.border}`,
              borderRadius: 10, padding: "10px 12px",
              cursor: "pointer", textAlign: "left", width: "100%",
              transition: "all 0.15s",
            }}
            data-testid={`historical-appearance-${i}`}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `color-mix(in srgb, ${v.accent} 15%, transparent)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: v.accent, flexShrink: 0,
            }}>
              #{a.tastingNumber}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: v.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.whiskyName || a.distillery}
              </div>
              <div style={{ fontSize: 11, color: v.muted }}>
                {a.tastingTitle}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              {(a.normalizedTotal ?? a.totalScore) != null && (
                <div style={{ fontSize: 14, fontWeight: 700, color: v.accent }}>
                  {Math.round(a.normalizedTotal ?? (a.totalScore ?? 0) * 10)}
                  <span style={{ fontSize: 10, color: v.muted, fontWeight: 400 }}>/100</span>
                </div>
              )}
              {a.totalRank != null && (
                <div style={{ fontSize: 10, color: v.muted }}>
                  {t("m2.taste.rank", "Rank")} {a.totalRank}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DeleteDialog({ t, onCancel, onConfirm, isPending }: { t: (k: string, d?: string) => string; onCancel: () => void; onConfirm: () => void; isPending: boolean }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}
      data-testid="dialog-delete-dram"
    >
      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 14, maxWidth: 380, width: "90%", padding: 24 }}>
        <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, color: v.text, margin: "0 0 8px" }}>
          {t("m2.taste.deleteDram", "Delete Dram")}
        </h3>
        <p style={{ fontSize: 14, color: v.textSecondary, margin: "0 0 20px" }}>
          {t("m2.taste.deleteConfirm", "Are you sure you want to delete this entry? This cannot be undone.")}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{ padding: "8px 16px", fontSize: 14, color: v.text, background: v.elevated, border: `1px solid ${v.border}`, borderRadius: 8, cursor: "pointer" }}
            data-testid="button-cancel-delete"
          >
            {t("m2.common.cancel", "Cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, color: "#fff", background: v.danger, border: "none", borderRadius: 8, cursor: "pointer", opacity: isPending ? 0.6 : 1 }}
            data-testid="button-confirm-delete"
          >
            {isPending ? "..." : t("m2.taste.deleteDram", "Delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
