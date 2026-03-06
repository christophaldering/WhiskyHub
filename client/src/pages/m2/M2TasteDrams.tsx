import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { M2Loading, M2Error } from "@/components/m2/M2Feedback";
import { getSession } from "@/lib/session";
import { journalApi, tastingHistoryApi } from "@/lib/api";
import { useLocation } from "wouter";
import type { JournalEntry } from "@shared/schema";
import {
  BookOpen, Star, Plus, ArrowLeft, Pencil, Trash2,
  Wine, Calendar, MapPin, X, Search, ScrollText, Trophy, Award,
} from "lucide-react";

const serif = "'Playfair Display', Georgia, serif";

type FilterValue = "all" | "solo" | "tasting";
type ViewState = "list" | "detail" | "edit";

const FILTERS: { key: FilterValue; labelKey: string }[] = [
  { key: "all", labelKey: "All" },
  { key: "solo", labelKey: "Solo" },
  { key: "tasting", labelKey: "Tasting" },
];

export default function M2TasteDrams() {
  const { t } = useTranslation();
  const session = getSession();
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [viewState, setViewState] = useState<ViewState>("list");
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);
  const [search, setSearch] = useState("");

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
        body: null,
        noseNotes: null,
        tasteNotes: null,
        finishNotes: null,
        imageUrl: w.imageUrl || null,
      }))
    );
  }, [tastingHistory]);

  const filteredEntries = useMemo(() => {
    let items: any[] = [];
    if (activeFilter === "all" || activeFilter === "solo") {
      items = [...items, ...journal.map((e: any) => ({ ...e, source: e.source || "solo" }))];
    }
    if (activeFilter === "all" || activeFilter === "tasting") {
      items = [...items, ...tastingWhiskies];
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((e: any) =>
        (e.whiskyName || e.title || "").toLowerCase().includes(q) ||
        (e.distillery || "").toLowerCase().includes(q)
      );
    }
    items.sort((a: any, b: any) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
    return items;
  }, [journal, tastingWhiskies, activeFilter, search]);

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
    setEditForm({
      title: entry.title || entry.whiskyName || "",
      whiskyName: entry.whiskyName || "",
      distillery: entry.distillery || "",
      region: entry.region || "",
      age: entry.age || "",
      abv: entry.abv || "",
      caskType: entry.caskType || "",
      personalScore: entry.personalScore ?? "",
      noseNotes: entry.noseNotes || "",
      tasteNotes: entry.tasteNotes || "",
      finishNotes: entry.finishNotes || "",
      body: entry.body || "",
    });
    setViewState("edit");
  };

  const handleSaveEdit = () => {
    if (!selectedEntry) return;
    const data: any = { ...editForm };
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

        <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 14, padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
            {selectedEntry.imageUrl && (
              <div style={{ width: 64, height: 88, borderRadius: 8, overflow: "hidden", border: `1px solid ${v.border}`, flexShrink: 0 }}>
                <img src={selectedEntry.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: v.accent, margin: 0 }}>
                {selectedEntry.whiskyName || selectedEntry.title || "—"}
              </h2>
              {selectedEntry.distillery && (
                <div style={{ fontSize: 14, color: v.textSecondary, marginTop: 4 }}>{selectedEntry.distillery}</div>
              )}
              {selectedEntry.createdAt && (
                <div style={{ fontSize: 12, color: v.muted, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <Calendar style={{ width: 12, height: 12 }} />
                  {new Date(selectedEntry.createdAt).toLocaleDateString()}
                </div>
              )}
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
            <NoteSection label={t("m2.taste.noseNotes", "Nose")} value={selectedEntry.noseNotes} />
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
          <EditField label={t("m2.taste.whiskyName", "Whisky Name")} value={editForm.whiskyName} onChange={(val) => setEditForm({ ...editForm, whiskyName: val, title: val })} testId="input-edit-whiskyName" />
          <EditField label={t("m2.taste.distillery", "Distillery")} value={editForm.distillery} onChange={(val) => setEditForm({ ...editForm, distillery: val })} testId="input-edit-distillery" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <EditField label={t("m2.taste.region", "Region")} value={editForm.region} onChange={(val) => setEditForm({ ...editForm, region: val })} testId="input-edit-region" />
            <EditField label={t("m2.taste.age", "Age")} value={editForm.age} onChange={(val) => setEditForm({ ...editForm, age: val })} testId="input-edit-age" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <EditField label={t("m2.taste.abv", "ABV")} value={editForm.abv} onChange={(val) => setEditForm({ ...editForm, abv: val })} testId="input-edit-abv" />
            <EditField label={t("m2.taste.caskType", "Cask Type")} value={editForm.caskType} onChange={(val) => setEditForm({ ...editForm, caskType: val })} testId="input-edit-caskType" />
          </div>
          <EditField label={t("m2.taste.score", "Score")} value={editForm.personalScore} onChange={(val) => setEditForm({ ...editForm, personalScore: val })} testId="input-edit-score" type="number" />
          <EditTextarea label={t("m2.taste.noseNotes", "Nose")} value={editForm.noseNotes} onChange={(val) => setEditForm({ ...editForm, noseNotes: val })} testId="input-edit-nose" />
          <EditTextarea label={t("m2.taste.tasteNotes", "Taste")} value={editForm.tasteNotes} onChange={(val) => setEditForm({ ...editForm, tasteNotes: val })} testId="input-edit-taste" />
          <EditTextarea label={t("m2.taste.finishNotes", "Finish")} value={editForm.finishNotes} onChange={(val) => setEditForm({ ...editForm, finishNotes: val })} testId="input-edit-finish" />
          <EditTextarea label={t("m2.taste.notes", "Notes")} value={editForm.body} onChange={(val) => setEditForm({ ...editForm, body: val })} testId="input-edit-body" />
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
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {FILTERS.map((f) => {
              const isActive = activeFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  style={{
                    padding: "7px 16px", fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? v.bg : v.text,
                    background: isActive ? v.accent : v.card,
                    border: `1px solid ${isActive ? v.accent : v.border}`,
                    borderRadius: 20, cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  data-testid={`filter-${f.key}`}
                >
                  {t(`m2.taste.filter${f.labelKey}`, f.labelKey)}
                </button>
              );
            })}
          </div>

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
                {filteredEntries.length} {t("m2.taste.entries", "entries")}
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: v.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.whiskyName || entry.title || "—"}
                        </div>
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

function MetaBadge({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: v.elevated, borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
      <span style={{ color: v.muted }}>{label}: </span>
      <span style={{ color: v.text, fontWeight: 500 }}>{value}</span>
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
  const session = getSession();
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
        {data.avgScore != null && (
          <div style={{ background: v.elevated, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: v.accent, fontFamily: serif }}>{data.avgScore.toFixed(1)}</div>
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
              {a.totalScore != null && (
                <div style={{ fontSize: 14, fontWeight: 700, color: v.accent }}>{a.totalScore.toFixed(1)}</div>
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
