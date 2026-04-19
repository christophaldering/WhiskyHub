import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ChevronLeft, FileText, Image as ImageIcon, Library, Search, Trash2,
  Pencil, Save, X, ExternalLink, Download, Globe, Lock, Plus, Upload, Loader2, RefreshCw, Scissors,
} from "lucide-react";
import { getParticipantId, handoutLibraryApi } from "@/lib/api";
import { downloadFromEndpoint } from "@/lib/download";
import type { WhiskyHandoutLibraryEntry } from "@shared/schema";
import HandoutLibraryPdfSplitterDialog from "../components/HandoutLibraryPdfSplitterDialog";

interface EditState {
  id: string;
  whiskyName: string;
  distillery: string;
  whiskybaseId: string;
  title: string;
  author: string;
  description: string;
}

type TabKey = "mine" | "community";

interface UploadFormState {
  file: File | null;
  whiskyName: string;
  distillery: string;
  whiskybaseId: string;
  title: string;
  author: string;
  description: string;
  splitProgramme: boolean;
}

const emptyUploadForm: UploadFormState = {
  file: null,
  whiskyName: "",
  distillery: "",
  whiskybaseId: "",
  title: "",
  author: "",
  description: "",
  splitProgramme: false,
};

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("de-DE", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function LabsHandoutLibrary() {
  const hostId = getParticipantId() || "";
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("mine");
  const [search, setSearch] = useState("");
  const [communitySearch, setCommunitySearch] = useState("");
  const [editing, setEditing] = useState<EditState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadFormState>(emptyUploadForm);
  const [distilleryFilter, setDistilleryFilter] = useState<string>("");
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [splitTarget, setSplitTarget] = useState<WhiskyHandoutLibraryEntry | null>(null);

  const listQuery = useQuery<WhiskyHandoutLibraryEntry[]>({
    queryKey: ["handout-library", hostId, search],
    queryFn: () => handoutLibraryApi.list(hostId, search.trim() || undefined),
    enabled: !!hostId,
  });

  const communityQuery = useQuery<WhiskyHandoutLibraryEntry[]>({
    queryKey: ["handout-library-community", hostId, communitySearch],
    queryFn: () => handoutLibraryApi.listCommunity(hostId, communitySearch.trim() || undefined),
    enabled: !!hostId && tab === "community",
  });

  const allEntries = useMemo(() => listQuery.data || [], [listQuery.data]);
  const distilleryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of allEntries) {
      const d = (e.distillery || "").trim();
      if (d) set.add(d);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "de"));
  }, [allEntries]);
  const filtered = useMemo(() => {
    if (!distilleryFilter) return allEntries;
    const f = distilleryFilter.trim().toLowerCase();
    return allEntries.filter((e) => (e.distillery || "").trim().toLowerCase() === f);
  }, [allEntries, distilleryFilter]);
  const community = useMemo(() => communityQuery.data || [], [communityQuery.data]);

  const updateMut = useMutation({
    mutationFn: (e: EditState) => handoutLibraryApi.update(e.id, hostId, {
      whiskyName: e.whiskyName.trim() || undefined,
      distillery: e.distillery.trim() || null,
      whiskybaseId: e.whiskybaseId.trim() || null,
      title: e.title.trim() || null,
      author: e.author.trim() || null,
      description: e.description.trim() || null,
    }),
    onSuccess: () => {
      setEditing(null);
      setError(null);
      qc.invalidateQueries({ queryKey: ["handout-library", hostId] });
    },
    onError: (e: any) => setError(e?.message || "Speichern fehlgeschlagen"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => handoutLibraryApi.delete(id, hostId),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["handout-library", hostId] });
    },
    onError: (e: any) => setError(e?.message || "Löschen fehlgeschlagen"),
  });

  const shareMut = useMutation({
    mutationFn: ({ id, isShared }: { id: string; isShared: boolean }) =>
      handoutLibraryApi.setShared(id, hostId, isShared),
    onSuccess: (_d, vars) => {
      setError(null);
      setInfo(vars.isShared ? "Eintrag ist jetzt für andere Hosts sichtbar." : "Eintrag ist wieder privat.");
      qc.invalidateQueries({ queryKey: ["handout-library", hostId] });
      qc.invalidateQueries({ queryKey: ["handout-library-community", hostId] });
    },
    onError: (e: any) => setError(e?.message || "Status konnte nicht geändert werden"),
  });

  const cloneMut = useMutation({
    mutationFn: (id: string) => handoutLibraryApi.cloneFromCommunity(id, hostId),
    onSuccess: () => {
      setError(null);
      setInfo("Eintrag in deine Bibliothek übernommen.");
      qc.invalidateQueries({ queryKey: ["handout-library", hostId] });
    },
    onError: (e: any) => setError(e?.message || "Übernahme fehlgeschlagen"),
  });

  const uploadMut = useMutation<any, Error, void, { wantsSplit: boolean; isPdf: boolean }>({
    onMutate: () => ({
      wantsSplit: !!uploadForm.splitProgramme,
      isPdf: (uploadForm.file?.type || "").toLowerCase() === "application/pdf",
    }),
    mutationFn: async () => {
      if (!uploadForm.file) throw new Error("Bitte eine Datei auswählen");
      if (!uploadForm.whiskyName.trim()) throw new Error("Whisky-Name ist erforderlich");
      return handoutLibraryApi.upload(hostId, uploadForm.file, {
        whiskyName: uploadForm.whiskyName.trim(),
        distillery: uploadForm.distillery.trim(),
        whiskybaseId: uploadForm.whiskybaseId.trim(),
        title: uploadForm.title.trim(),
        author: uploadForm.author.trim(),
        description: uploadForm.description.trim(),
      });
    },
    onSuccess: (created: WhiskyHandoutLibraryEntry, _vars, ctx) => {
      setError(null);
      setInfo("Handout in deine Bibliothek hochgeladen.");
      setUploadForm(emptyUploadForm);
      setUploadOpen(false);
      qc.invalidateQueries({ queryKey: ["handout-library", hostId] });
      if (ctx?.wantsSplit && ctx.isPdf && created?.id) {
        setSplitTarget(created);
      }
    },
    onError: (e: any) => setError(e?.message || "Upload fehlgeschlagen"),
  });

  const replaceFileMut = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => handoutLibraryApi.replaceFile(id, hostId, file),
    onSuccess: () => {
      setError(null);
      setInfo("Datei wurde ersetzt.");
      setReplaceTargetId(null);
      qc.invalidateQueries({ queryKey: ["handout-library", hostId] });
    },
    onError: (e: any) => {
      setReplaceTargetId(null);
      setError(e?.message || "Datei ersetzen fehlgeschlagen");
    },
  });

  const bulkDeleteMut = useMutation({
    mutationFn: (ids: string[]) => handoutLibraryApi.bulkDelete(ids, hostId),
    onSuccess: (data: any) => {
      setError(null);
      setInfo(`${data?.deleted ?? 0} Einträge gelöscht.`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["handout-library", hostId] });
      qc.invalidateQueries({ queryKey: ["handout-library-community", hostId] });
    },
    onError: (e: any) => setError(e?.message || "Löschen fehlgeschlagen"),
  });

  const bulkShareMut = useMutation({
    mutationFn: ({ ids, isShared }: { ids: string[]; isShared: boolean }) =>
      handoutLibraryApi.bulkShare(ids, hostId, isShared),
    onSuccess: (data: any, vars) => {
      setError(null);
      setInfo(vars.isShared
        ? `${data?.updated ?? 0} Einträge mit der Community geteilt.`
        : `${data?.updated ?? 0} Einträge wieder privat gesetzt.`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["handout-library", hostId] });
      qc.invalidateQueries({ queryKey: ["handout-library-community", hostId] });
    },
    onError: (e: any) => setError(e?.message || "Aktualisierung fehlgeschlagen"),
  });

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.id));
  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((e) => e.id)));
  };

  if (!hostId) {
    return (
      <div className="labs-shell" style={{ padding: 24 }}>
        <p>Bitte melde dich an, um deine Handout-Bibliothek zu sehen.</p>
        <Link href="/labs/host" data-testid="link-back-host">Zurück</Link>
      </div>
    );
  }

  return (
    <div className="labs-shell" style={{ padding: "24px 16px 64px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Link
          href="/labs/host"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--labs-text-muted)", textDecoration: "none", fontSize: 13 }}
          data-testid="link-back-host"
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
          Zurück
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Library style={{ width: 20, height: 20, color: "var(--labs-accent, var(--labs-text))" }} />
        <h1 style={{ fontSize: 22, margin: 0, fontWeight: 600 }} data-testid="text-handout-library-title">
          Handout-Bibliothek
        </h1>
      </div>
      <p style={{ color: "var(--labs-text-muted)", fontSize: 13, margin: "0 0 16px" }}>
        Alle Handouts, die du je zu einem Whisky hochgeladen hast. Beim Anlegen neuer Whiskys werden passende Einträge automatisch vorgeschlagen.
      </p>

      <div role="tablist" style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: "1px solid var(--labs-border)" }}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "mine"}
          onClick={() => { setTab("mine"); setError(null); setInfo(null); }}
          className="labs-btn-ghost text-xs"
          style={{
            padding: "8px 12px",
            borderRadius: 0,
            borderBottom: tab === "mine" ? "2px solid var(--labs-accent)" : "2px solid transparent",
            color: tab === "mine" ? "var(--labs-text)" : "var(--labs-text-muted)",
            fontWeight: tab === "mine" ? 600 : 400,
          }}
          data-testid="tab-handout-library-mine"
        >
          Meine Bibliothek
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "community"}
          onClick={() => { setTab("community"); setError(null); setInfo(null); }}
          className="labs-btn-ghost text-xs"
          style={{
            padding: "8px 12px",
            borderRadius: 0,
            borderBottom: tab === "community" ? "2px solid var(--labs-accent)" : "2px solid transparent",
            color: tab === "community" ? "var(--labs-text)" : "var(--labs-text-muted)",
            fontWeight: tab === "community" ? 600 : 400,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
          data-testid="tab-handout-library-community"
        >
          <Globe style={{ width: 13, height: 13 }} />
          Community
        </button>
      </div>

      {error && (
        <div
          style={{ background: "var(--labs-error-bg, #3a1a1a)", color: "var(--labs-error, #ff6b6b)", padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}
          data-testid="text-handout-library-error"
        >
          {error}
        </div>
      )}
      {info && (
        <div
          style={{ background: "var(--labs-success-bg, #143a23)", color: "var(--labs-success, #6bd3a0)", padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}
          data-testid="text-handout-library-info"
        >
          {info}
        </div>
      )}

      {tab === "mine" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Search style={{ width: 14, height: 14, color: "var(--labs-text-muted)", position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suche nach Whisky, Brennerei, Titel oder Whiskybase-ID …"
                className="labs-input"
                style={{ width: "100%", paddingLeft: 32 }}
                data-testid="input-handout-library-search"
              />
            </div>
            <select
              className="labs-input"
              value={distilleryFilter}
              onChange={(e) => setDistilleryFilter(e.target.value)}
              style={{ maxWidth: 220, fontSize: 12 }}
              data-testid="select-handout-library-distillery"
              aria-label="Filter nach Brennerei"
            >
              <option value="">Alle Brennereien</option>
              {distilleryOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <button
              type="button"
              className="labs-btn-primary text-xs"
              onClick={() => { setUploadOpen(true); setError(null); setInfo(null); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", whiteSpace: "nowrap" }}
              data-testid="button-handout-library-upload"
            >
              <Upload style={{ width: 13, height: 13 }} /> Hochladen
            </button>
          </div>

          <input
            ref={replaceFileInputRef}
            type="file"
            accept="application/pdf,image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              const target = replaceTargetId;
              if (replaceFileInputRef.current) replaceFileInputRef.current.value = "";
              if (file && target) replaceFileMut.mutate({ id: target, file });
            }}
            data-testid="input-handout-library-replace-file"
          />

          {uploadOpen && (
            <div
              style={{ border: "1px solid var(--labs-accent, var(--labs-border))", borderRadius: 12, padding: 14, background: "var(--labs-surface)", display: "grid", gap: 10, marginBottom: 14 }}
              data-testid="handout-library-upload-form"
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <strong style={{ fontSize: 13 }}>Neuen Bibliothekseintrag hochladen</strong>
                <button
                  type="button"
                  className="labs-btn-ghost text-xs"
                  onClick={() => { setUploadOpen(false); setUploadForm(emptyUploadForm); }}
                  data-testid="button-upload-form-close"
                  style={{ padding: 4 }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                data-testid="input-upload-file"
                style={{ fontSize: 12 }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                  Whisky-Name *
                  <input
                    className="labs-input"
                    value={uploadForm.whiskyName}
                    onChange={(e) => setUploadForm({ ...uploadForm, whiskyName: e.target.value })}
                    data-testid="input-upload-whiskyname"
                  />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                  Brennerei
                  <input
                    className="labs-input"
                    value={uploadForm.distillery}
                    onChange={(e) => setUploadForm({ ...uploadForm, distillery: e.target.value })}
                    data-testid="input-upload-distillery"
                  />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                  Whiskybase-ID
                  <input
                    className="labs-input"
                    value={uploadForm.whiskybaseId}
                    onChange={(e) => setUploadForm({ ...uploadForm, whiskybaseId: e.target.value })}
                    data-testid="input-upload-wbid"
                  />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                  Titel
                  <input
                    className="labs-input"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    data-testid="input-upload-title"
                  />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                  Autor
                  <input
                    className="labs-input"
                    value={uploadForm.author}
                    onChange={(e) => setUploadForm({ ...uploadForm, author: e.target.value })}
                    data-testid="input-upload-author"
                  />
                </label>
              </div>
              <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                Beschreibung
                <textarea
                  className="labs-input"
                  rows={2}
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  data-testid="input-upload-description"
                />
              </label>
              {(uploadForm.file?.type || "").toLowerCase() === "application/pdf" && (
                <label
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: 10, borderRadius: 8,
                    border: "1px solid var(--labs-border)",
                    background: "var(--labs-surface)",
                    fontSize: 12, color: "var(--labs-text)",
                  }}
                  data-testid="label-upload-split-programme"
                >
                  <input
                    type="checkbox"
                    checked={uploadForm.splitProgramme}
                    onChange={(e) => setUploadForm({ ...uploadForm, splitProgramme: e.target.checked })}
                    data-testid="checkbox-upload-split-programme"
                    style={{ marginTop: 2 }}
                  />
                  <span style={{ display: "grid", gap: 2 }}>
                    <span>Nach dem Upload Seiten Whiskys zuordnen (Programmheft splitten)</span>
                    <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
                      Verfügbar bei mehrseitigen PDFs.
                    </span>
                  </span>
                </label>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  className="labs-btn-secondary text-xs"
                  onClick={() => { setUploadOpen(false); setUploadForm(emptyUploadForm); }}
                  data-testid="button-upload-cancel"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  className="labs-btn-primary text-xs"
                  onClick={() => uploadMut.mutate()}
                  disabled={uploadMut.isPending || !uploadForm.file || !uploadForm.whiskyName.trim()}
                  data-testid="button-upload-submit"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {uploadMut.isPending ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : <Upload style={{ width: 12, height: 12 }} />}
                  Hochladen
                </button>
              </div>
            </div>
          )}

          {selected.size > 0 && (
            <div
              style={{ position: "sticky", top: 8, zIndex: 5, border: "1px solid var(--labs-accent, var(--labs-border))", borderRadius: 10, padding: "8px 12px", background: "var(--labs-surface)", display: "flex", alignItems: "center", gap: 10, marginBottom: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}
              data-testid="handout-library-bulk-bar"
            >
              <span style={{ fontSize: 12, color: "var(--labs-text)" }} data-testid="text-bulk-selected-count">
                {selected.size} ausgewählt
              </span>
              <button
                type="button"
                className="labs-btn-secondary text-xs"
                onClick={() => bulkShareMut.mutate({ ids: Array.from(selected), isShared: true })}
                disabled={bulkShareMut.isPending}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px" }}
                data-testid="button-bulk-share"
              >
                <Globe style={{ width: 12, height: 12 }} /> Teilen
              </button>
              <button
                type="button"
                className="labs-btn-secondary text-xs"
                onClick={() => bulkShareMut.mutate({ ids: Array.from(selected), isShared: false })}
                disabled={bulkShareMut.isPending}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px" }}
                data-testid="button-bulk-unshare"
              >
                <Lock style={{ width: 12, height: 12 }} /> Privat
              </button>
              <button
                type="button"
                className="labs-btn-secondary text-xs"
                onClick={() => {
                  if (window.confirm(`${selected.size} Einträge aus deiner Bibliothek entfernen?`)) {
                    bulkDeleteMut.mutate(Array.from(selected));
                  }
                }}
                disabled={bulkDeleteMut.isPending}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", color: "var(--labs-error, #ff6b6b)" }}
                data-testid="button-bulk-delete"
              >
                <Trash2 style={{ width: 12, height: 12 }} /> Löschen
              </button>
              <span style={{ flex: 1 }} />
              <button
                type="button"
                className="labs-btn-ghost text-xs"
                onClick={() => setSelected(new Set())}
                style={{ padding: "4px 8px" }}
                data-testid="button-bulk-clear"
              >
                <X style={{ width: 12, height: 12 }} />
              </button>
            </div>
          )}

          {filtered.length > 0 && (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--labs-text-muted)", marginBottom: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                data-testid="checkbox-handout-select-all"
              />
              Alle auswählen
            </label>
          )}

          {listQuery.isLoading && (
            <p style={{ color: "var(--labs-text-muted)", fontSize: 13 }} data-testid="text-handout-library-loading">Lade …</p>
          )}

          {!listQuery.isLoading && filtered.length === 0 && (
            <div
              style={{ border: "1px dashed var(--labs-border)", borderRadius: 12, padding: 32, textAlign: "center", color: "var(--labs-text-muted)" }}
              data-testid="text-handout-library-empty"
            >
              <Library style={{ width: 28, height: 28, opacity: 0.4, marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 14 }}>
                {search ? "Keine Treffer für deine Suche." : "Noch keine Handouts in deiner Bibliothek. Lade in einem Tasting ein Handout zu einem Whisky hoch — es erscheint dann automatisch hier."}
              </p>
            </div>
          )}

          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map((entry) => {
              const isEditing = editing?.id === entry.id;
              const isPdf = entry.contentType === "application/pdf";
              if (isEditing) {
                return (
                  <div
                    key={entry.id}
                    style={{ border: "1px solid var(--labs-accent, var(--labs-border))", borderRadius: 12, padding: 14, background: "var(--labs-surface)", display: "grid", gap: 8 }}
                    data-testid={`handout-library-edit-${entry.id}`}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                        Whisky-Name
                        <input className="labs-input" value={editing!.whiskyName} onChange={(e) => setEditing({ ...editing!, whiskyName: e.target.value })} data-testid={`input-edit-name-${entry.id}`} />
                      </label>
                      <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                        Brennerei
                        <input className="labs-input" value={editing!.distillery} onChange={(e) => setEditing({ ...editing!, distillery: e.target.value })} data-testid={`input-edit-distillery-${entry.id}`} />
                      </label>
                      <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                        Whiskybase-ID
                        <input className="labs-input" value={editing!.whiskybaseId} onChange={(e) => setEditing({ ...editing!, whiskybaseId: e.target.value })} data-testid={`input-edit-wbid-${entry.id}`} />
                      </label>
                      <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                        Titel
                        <input className="labs-input" value={editing!.title} onChange={(e) => setEditing({ ...editing!, title: e.target.value })} data-testid={`input-edit-title-${entry.id}`} />
                      </label>
                      <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                        Autor
                        <input className="labs-input" value={editing!.author} onChange={(e) => setEditing({ ...editing!, author: e.target.value })} data-testid={`input-edit-author-${entry.id}`} />
                      </label>
                    </div>
                    <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
                      Beschreibung
                      <textarea className="labs-input" rows={2} value={editing!.description} onChange={(e) => setEditing({ ...editing!, description: e.target.value })} data-testid={`input-edit-desc-${entry.id}`} />
                    </label>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button type="button" className="labs-btn-secondary text-xs" onClick={() => setEditing(null)} data-testid={`button-edit-cancel-${entry.id}`}>
                        <X style={{ width: 12, height: 12, marginRight: 4 }} /> Abbrechen
                      </button>
                      <button type="button" className="labs-btn-primary text-xs" onClick={() => updateMut.mutate(editing!)} disabled={updateMut.isPending} data-testid={`button-edit-save-${entry.id}`}>
                        <Save style={{ width: 12, height: 12, marginRight: 4 }} /> Speichern
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={entry.id}
                  style={{ border: selected.has(entry.id) ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)", borderRadius: 12, padding: 12, background: "var(--labs-surface)", display: "flex", alignItems: "center", gap: 12 }}
                  data-testid={`handout-library-row-${entry.id}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(entry.id)}
                    onChange={() => toggleSelected(entry.id)}
                    style={{ flexShrink: 0 }}
                    data-testid={`checkbox-handout-${entry.id}`}
                  />
                  {isPdf ? (
                    <FileText style={{ width: 22, height: 22, color: "var(--labs-text-muted)", flexShrink: 0 }} />
                  ) : (
                    <ImageIcon style={{ width: 22, height: 22, color: "var(--labs-text-muted)", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {entry.title || entry.whiskyName}
                      {entry.isProgramme && (
                        <span
                          style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "var(--labs-warning-bg, #3a2f15)", color: "var(--labs-warning, #f5b25c)" }}
                          data-testid={`badge-programme-${entry.id}`}
                          title="Mehrseitiges Programmheft"
                        >
                          <Library style={{ width: 10, height: 10 }} /> Programmheft
                        </span>
                      )}
                      {entry.isShared && (
                        <span
                          style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "var(--labs-accent-bg, #1d2c4d)", color: "var(--labs-accent, #7ba8ff)" }}
                          data-testid={`badge-shared-${entry.id}`}
                          title="Wird in der Community angezeigt"
                        >
                          <Globe style={{ width: 10, height: 10 }} /> geteilt
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {[
                        entry.whiskyName,
                        entry.distillery,
                        entry.whiskybaseId && `WB ${entry.whiskybaseId}`,
                        entry.author && `von ${entry.author}`,
                        fmtDate(entry.createdAt),
                      ].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <a
                      href={entry.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="labs-btn-secondary text-xs"
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px" }}
                      data-testid={`button-handout-open-${entry.id}`}
                      title="Öffnen"
                    >
                      <ExternalLink style={{ width: 12, height: 12 }} />
                    </a>
                    <button
                      type="button"
                      className="labs-btn-secondary text-xs"
                      onClick={() => downloadFromEndpoint(entry.fileUrl, entry.title || entry.whiskyName)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px" }}
                      data-testid={`button-handout-download-${entry.id}`}
                      title="Download"
                    >
                      <Download style={{ width: 12, height: 12 }} />
                    </button>
                    <button
                      type="button"
                      className="labs-btn-secondary text-xs"
                      onClick={() => shareMut.mutate({ id: entry.id, isShared: !entry.isShared })}
                      disabled={shareMut.isPending}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", color: entry.isShared ? "var(--labs-accent, #7ba8ff)" : undefined }}
                      data-testid={`button-handout-share-${entry.id}`}
                      title={entry.isShared ? "Aus der Community zurückziehen" : "Mit anderen Hosts teilen"}
                    >
                      {entry.isShared ? <Lock style={{ width: 12, height: 12 }} /> : <Globe style={{ width: 12, height: 12 }} />}
                    </button>
                    <button
                      type="button"
                      className="labs-btn-secondary text-xs"
                      onClick={() => {
                        setReplaceTargetId(entry.id);
                        replaceFileInputRef.current?.click();
                      }}
                      disabled={replaceFileMut.isPending}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px" }}
                      data-testid={`button-handout-replace-${entry.id}`}
                      title="Datei ersetzen"
                    >
                      {replaceFileMut.isPending && replaceTargetId === entry.id
                        ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                        : <RefreshCw style={{ width: 12, height: 12 }} />}
                    </button>
                    {isPdf && (
                      <button
                        type="button"
                        className="labs-btn-secondary text-xs"
                        onClick={() => { setSplitTarget(entry); setError(null); setInfo(null); }}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px" }}
                        data-testid={`button-handout-split-${entry.id}`}
                        title="Programmheft seitenweise aufteilen"
                      >
                        <Scissors style={{ width: 12, height: 12 }} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="labs-btn-secondary text-xs"
                      onClick={() => setEditing({
                        id: entry.id,
                        whiskyName: entry.whiskyName || "",
                        distillery: entry.distillery || "",
                        whiskybaseId: entry.whiskybaseId || "",
                        title: entry.title || "",
                        author: entry.author || "",
                        description: entry.description || "",
                      })}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px" }}
                      data-testid={`button-handout-edit-${entry.id}`}
                      title="Bearbeiten"
                    >
                      <Pencil style={{ width: 12, height: 12 }} />
                    </button>
                    <button
                      type="button"
                      className="labs-btn-secondary text-xs"
                      onClick={() => {
                        if (window.confirm("Eintrag aus deiner Bibliothek entfernen? Bestehende Tastings, die dieses Handout schon nutzen, behalten es.")) {
                          deleteMut.mutate(entry.id);
                        }
                      }}
                      disabled={deleteMut.isPending}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", color: "var(--labs-error, #ff6b6b)" }}
                      data-testid={`button-handout-delete-${entry.id}`}
                      title="Aus Bibliothek entfernen"
                    >
                      <Trash2 style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <HandoutLibraryPdfSplitterDialog
        open={!!splitTarget}
        onClose={() => setSplitTarget(null)}
        entry={splitTarget}
        hostId={hostId}
      />

      {tab === "community" && (
        <>
          <p style={{ color: "var(--labs-text-muted)", fontSize: 12, margin: "0 0 12px" }}>
            Hier siehst du Handouts, die andere Hosts mit der Community geteilt haben. Übernimm einen Eintrag mit einem Klick in deine eigene Bibliothek.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, position: "relative" }}>
            <Search style={{ width: 14, height: 14, color: "var(--labs-text-muted)", position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              value={communitySearch}
              onChange={(e) => setCommunitySearch(e.target.value)}
              placeholder="Community durchsuchen — Whisky, Brennerei, Autor, Host …"
              className="labs-input"
              style={{ width: "100%", paddingLeft: 32 }}
              data-testid="input-handout-community-search"
            />
          </div>

          {communityQuery.isLoading && (
            <p style={{ color: "var(--labs-text-muted)", fontSize: 13 }} data-testid="text-handout-community-loading">Lade …</p>
          )}

          {!communityQuery.isLoading && community.length === 0 && (
            <div
              style={{ border: "1px dashed var(--labs-border)", borderRadius: 12, padding: 32, textAlign: "center", color: "var(--labs-text-muted)" }}
              data-testid="text-handout-community-empty"
            >
              <Globe style={{ width: 28, height: 28, opacity: 0.4, marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 14 }}>
                {communitySearch ? "Keine Community-Handouts passen zu deiner Suche." : "Aktuell hat noch niemand ein Handout mit der Community geteilt."}
              </p>
            </div>
          )}

          <div style={{ display: "grid", gap: 10 }}>
            {community.map((entry) => {
              const isPdf = entry.contentType === "application/pdf";
              return (
                <div
                  key={entry.id}
                  style={{ border: "1px solid var(--labs-border)", borderRadius: 12, padding: 12, background: "var(--labs-surface)", display: "flex", alignItems: "center", gap: 12 }}
                  data-testid={`handout-community-row-${entry.id}`}
                >
                  {isPdf ? (
                    <FileText style={{ width: 22, height: 22, color: "var(--labs-text-muted)", flexShrink: 0 }} />
                  ) : (
                    <ImageIcon style={{ width: 22, height: 22, color: "var(--labs-text-muted)", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.title || entry.whiskyName}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {[
                        entry.whiskyName,
                        entry.distillery,
                        entry.whiskybaseId && `WB ${entry.whiskybaseId}`,
                        entry.sharedByName ? `geteilt von ${entry.sharedByName}` : null,
                        fmtDate(entry.sharedAt ?? entry.createdAt),
                      ].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <a
                      href={entry.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="labs-btn-secondary text-xs"
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px" }}
                      data-testid={`button-community-open-${entry.id}`}
                      title="Vorschau"
                    >
                      <ExternalLink style={{ width: 12, height: 12 }} />
                    </a>
                    <button
                      type="button"
                      className="labs-btn-primary text-xs"
                      onClick={() => cloneMut.mutate(entry.id)}
                      disabled={cloneMut.isPending}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px" }}
                      data-testid={`button-community-clone-${entry.id}`}
                      title="In deine Bibliothek übernehmen"
                    >
                      <Plus style={{ width: 12, height: 12 }} /> Übernehmen
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
