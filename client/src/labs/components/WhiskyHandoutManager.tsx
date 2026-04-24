import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, Image as ImageIcon, Trash2, Upload, ExternalLink, Download, Library, Check, ArrowUp, ArrowDown, Pencil, X, Building2 } from "lucide-react";
import { handoutLibraryApi, whiskyHandoutApi } from "@/lib/api";
import { downloadFromEndpoint } from "@/lib/download";
import type { Whisky, WhiskyHandoutLibraryEntry, WhiskyHandout, DistilleryHandout } from "@shared/schema";

async function safeDownload(url: string, filename: string) {
  const ok = await downloadFromEndpoint(url, filename).catch(() => false);
  if (!ok) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function isMobilePdfUnsupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

interface Props {
  whisky: Whisky;
  hostId: string;
  tastingId: string;
}

interface EffectiveHandout extends WhiskyHandout {
  source?: "whisky" | "distillery";
  distilleryName?: string | null;
}

const HANDOUT_ACCEPT = "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif";

export default function WhiskyHandoutManager({ whisky, hostId, tastingId }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"always" | "after_reveal">("always");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVisibility, setEditVisibility] = useState<"always" | "after_reveal">("always");

  const listQuery = useQuery<WhiskyHandout[]>({
    queryKey: ["whisky-handouts", whisky.id],
    queryFn: () => whiskyHandoutApi.list(whisky.id),
    enabled: !!whisky.id,
    staleTime: 10_000,
  });
  const handouts = listQuery.data || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["whisky-handouts", whisky.id] });
    qc.invalidateQueries({ queryKey: ["whisky-effective-handouts", whisky.id] });
    qc.invalidateQueries({ queryKey: ["whiskies", tastingId] });
  };

  const uploadMut = useMutation({
    mutationFn: (file: File) =>
      whiskyHandoutApi.upload(whisky.id, file, { hostId, title, author, description, visibility }),
    onSuccess: () => { setError(null); setTitle(""); setAuthor(""); setDescription(""); invalidate(); },
    onError: (e: any) => setError(e?.message || "Upload fehlgeschlagen"),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; data: { title?: string | null; author?: string | null; description?: string | null; visibility?: "always" | "after_reveal" } }) =>
      whiskyHandoutApi.update(whisky.id, vars.id, { hostId, ...vars.data }),
    onSuccess: () => { setError(null); setEditingId(null); invalidate(); },
    onError: (e: any) => setError(e?.message || "Speichern fehlgeschlagen"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => whiskyHandoutApi.delete(whisky.id, id, hostId),
    onSuccess: () => { setError(null); invalidate(); },
    onError: (e: any) => setError(e?.message || "Löschen fehlgeschlagen"),
  });

  const reorderMut = useMutation({
    mutationFn: (orderedIds: string[]) => whiskyHandoutApi.reorder(whisky.id, hostId, orderedIds),
    onSuccess: () => { setError(null); invalidate(); },
    onError: (e: any) => setError(e?.message || "Sortierung fehlgeschlagen"),
  });

  function move(id: string, dir: -1 | 1) {
    const ids = handouts.map((h) => h.id);
    const idx = ids.indexOf(id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    reorderMut.mutate(ids);
  }

  function startEdit(h: WhiskyHandout) {
    setEditingId(h.id);
    setEditTitle(h.title || "");
    setEditAuthor(h.author || "");
    setEditDescription(h.description || "");
    setEditVisibility((h.visibility as "always" | "after_reveal") || "always");
  }

  const suggestionsQuery = useQuery<WhiskyHandoutLibraryEntry[]>({
    queryKey: [
      "handout-library-suggest",
      hostId,
      whisky.whiskybaseId || "",
      whisky.name || "",
      whisky.distillery || "",
    ],
    queryFn: () =>
      handoutLibraryApi.suggest(hostId, {
        whiskybaseId: whisky.whiskybaseId ?? null,
        whiskyName: whisky.name ?? null,
        distillery: whisky.distillery ?? null,
      }),
    enabled: !!hostId,
    staleTime: 60_000,
  });
  const usedFileUrls = new Set(handouts.map((h) => h.fileUrl));
  const suggestions = (suggestionsQuery.data || []).filter((s) => !usedFileUrls.has(s.fileUrl));

  const appendMut = useMutation({
    mutationFn: (libraryId: string) =>
      handoutLibraryApi.appendToWhisky(libraryId, hostId, whisky.id, visibility),
    onSuccess: () => { setError(null); invalidate(); },
    onError: (e: any) => setError(e?.message || "Übernahme fehlgeschlagen"),
  });

  return (
    <div
      className="col-span-2"
      style={{
        border: "1px solid var(--labs-border)",
        borderRadius: 12,
        padding: 12,
        background: "var(--labs-surface)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
      data-testid={`handout-manager-${whisky.id}`}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <FileText style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text-secondary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Handouts
        </span>
        {handouts.length > 0 && (
          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--labs-accent-muted, var(--labs-surface-2, var(--labs-surface)))", color: "var(--labs-text-secondary)", fontWeight: 600 }}>
            {handouts.length}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <Link
          href="/labs/taste/my-handouts"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--labs-text-muted)", textDecoration: "none" }}
          data-testid={`link-handout-library-${whisky.id}`}
          title="Alle deine gespeicherten Handouts verwalten"
        >
          <Library style={{ width: 11, height: 11 }} />
          Zur Bibliothek
        </Link>
      </div>

      {handouts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }} data-testid={`handout-list-${whisky.id}`}>
          {handouts.map((h, i) => {
            const isPdf = h.contentType === "application/pdf";
            const isEditing = editingId === h.id;
            return (
              <div
                key={h.id}
                style={{
                  border: "1px solid var(--labs-border)",
                  borderRadius: 10,
                  padding: 8,
                  background: "var(--labs-surface)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
                data-testid={`handout-row-${h.id}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isPdf ? (
                    <FileText style={{ width: 14, height: 14, color: "var(--labs-text-muted)", flexShrink: 0 }} />
                  ) : (
                    <ImageIcon style={{ width: 14, height: 14, color: "var(--labs-text-muted)", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {h.title || (isPdf ? "PDF" : "Bild")}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>
                      {[h.author && `von ${h.author}`, h.visibility === "after_reveal" ? "nach Reveal" : "immer sichtbar"].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="labs-btn-ghost text-xs"
                    onClick={() => move(h.id, -1)}
                    disabled={i === 0 || reorderMut.isPending}
                    title="Nach oben"
                    style={{ padding: "4px 6px" }}
                    data-testid={`handout-up-${h.id}`}
                  >
                    <ArrowUp style={{ width: 12, height: 12 }} />
                  </button>
                  <button
                    type="button"
                    className="labs-btn-ghost text-xs"
                    onClick={() => move(h.id, 1)}
                    disabled={i === handouts.length - 1 || reorderMut.isPending}
                    title="Nach unten"
                    style={{ padding: "4px 6px" }}
                    data-testid={`handout-down-${h.id}`}
                  >
                    <ArrowDown style={{ width: 12, height: 12 }} />
                  </button>
                  <a
                    href={h.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="labs-btn-ghost text-xs"
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 6px" }}
                    data-testid={`handout-open-${h.id}`}
                    title="Öffnen"
                  >
                    <ExternalLink style={{ width: 12, height: 12 }} />
                  </a>
                  <button
                    type="button"
                    className="labs-btn-ghost text-xs"
                    onClick={() => startEdit(h)}
                    style={{ padding: "4px 6px" }}
                    data-testid={`handout-edit-${h.id}`}
                    title="Bearbeiten"
                  >
                    <Pencil style={{ width: 12, height: 12 }} />
                  </button>
                  <button
                    type="button"
                    className="labs-btn-ghost text-xs"
                    onClick={() => { if (confirm("Handout wirklich löschen?")) deleteMut.mutate(h.id); }}
                    disabled={deleteMut.isPending}
                    style={{ padding: "4px 6px", color: "var(--labs-danger, #ef4444)" }}
                    data-testid={`handout-delete-${h.id}`}
                    title="Löschen"
                  >
                    <Trash2 style={{ width: 12, height: 12 }} />
                  </button>
                </div>
                {isEditing && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, paddingTop: 6, borderTop: "1px dashed var(--labs-border)" }}>
                    <input className="labs-input" placeholder="Titel" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} data-testid={`handout-edit-title-${h.id}`} />
                    <input className="labs-input" placeholder="Autor / Quelle" value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} data-testid={`handout-edit-author-${h.id}`} />
                    <textarea className="labs-input" rows={2} placeholder="Beschreibung" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} style={{ gridColumn: "1 / -1", resize: "vertical" }} data-testid={`handout-edit-description-${h.id}`} />
                    <select className="labs-input" value={editVisibility} onChange={(e) => setEditVisibility(e.target.value as "always" | "after_reveal")} style={{ gridColumn: "1 / -1" }} data-testid={`handout-edit-visibility-${h.id}`}>
                      <option value="always">Immer sichtbar für Gäste</option>
                      <option value="after_reveal">Erst nach Reveal dieses Whiskys</option>
                    </select>
                    <div style={{ gridColumn: "1 / -1", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button type="button" className="labs-btn-ghost text-xs" onClick={() => setEditingId(null)} data-testid={`handout-edit-cancel-${h.id}`}>
                        <X style={{ width: 12, height: 12 }} /> Abbrechen
                      </button>
                      <button
                        type="button"
                        className="labs-btn-primary text-xs"
                        onClick={() => updateMut.mutate({ id: h.id, data: { title: editTitle || null, author: editAuthor || null, description: editDescription || null, visibility: editVisibility } })}
                        disabled={updateMut.isPending}
                        data-testid={`handout-edit-save-${h.id}`}
                      >
                        {updateMut.isPending ? "Speichere…" : "Speichern"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {suggestions.length > 0 && (
        <div
          style={{
            border: "1px dashed var(--labs-border)",
            borderRadius: 10,
            padding: 10,
            background: "var(--labs-surface-2, var(--labs-surface))",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
          data-testid={`handout-suggestions-${whisky.id}`}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Library style={{ width: 12, height: 12, color: "var(--labs-text-muted)" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--labs-text-secondary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Aus deiner Bibliothek hinzufügen
            </span>
          </div>
          {suggestions.map((s) => {
            const sIsPdf = s.contentType === "application/pdf";
            const matchHints: string[] = [];
            if (s.whiskybaseId && whisky.whiskybaseId && s.whiskybaseId === whisky.whiskybaseId) matchHints.push("Whiskybase-ID");
            else if (s.whiskyName && whisky.name && s.whiskyName.toLowerCase() === whisky.name.toLowerCase()) matchHints.push("Whisky-Name");
            else if (s.distillery && whisky.distillery && s.distillery.toLowerCase() === whisky.distillery.toLowerCase()) matchHints.push("Brennerei");
            return (
              <div
                key={s.id}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, border: "1px solid var(--labs-border)", borderRadius: 8, background: "var(--labs-surface)" }}
                data-testid={`handout-suggestion-${whisky.id}-${s.id}`}
              >
                {sIsPdf ? <FileText style={{ width: 16, height: 16, color: "var(--labs-text-muted)", flexShrink: 0 }} /> : <ImageIcon style={{ width: 16, height: 16, color: "var(--labs-text-muted)", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.title || s.whiskyName}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--labs-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {[s.distillery, s.author && `von ${s.author}`, matchHints[0] && `Match: ${matchHints[0]}`].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <button
                  type="button"
                  className="labs-btn-primary text-xs"
                  onClick={() => appendMut.mutate(s.id)}
                  disabled={appendMut.isPending}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", flexShrink: 0 }}
                  data-testid={`handout-suggestion-apply-${whisky.id}-${s.id}`}
                >
                  <Check style={{ width: 12, height: 12 }} />
                  Hinzufügen
                </button>
              </div>
            );
          })}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={HANDOUT_ACCEPT}
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadMut.mutate(f);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
        data-testid={`handout-file-input-${whisky.id}`}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input className="labs-input" placeholder="Titel (für neuen Upload)" value={title} onChange={(e) => setTitle(e.target.value)} data-testid={`handout-title-${whisky.id}`} />
        <input className="labs-input" placeholder="Autor / Quelle" value={author} onChange={(e) => setAuthor(e.target.value)} data-testid={`handout-author-${whisky.id}`} />
        <textarea className="labs-input" placeholder="Beschreibung (optional)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} style={{ gridColumn: "1 / -1", resize: "vertical" }} data-testid={`handout-description-${whisky.id}`} />
        <select className="labs-input" value={visibility} onChange={(e) => setVisibility(e.target.value as "always" | "after_reveal")} style={{ gridColumn: "1 / -1" }} data-testid={`handout-visibility-${whisky.id}`}>
          <option value="always">Immer sichtbar für Gäste</option>
          <option value="after_reveal">Erst nach Reveal dieses Whiskys</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button
          className="labs-btn-primary text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMut.isPending}
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          data-testid={`handout-upload-btn-${whisky.id}`}
        >
          <Upload style={{ width: 12, height: 12 }} />
          {uploadMut.isPending ? "Lade hoch…" : "Handout hinzufügen"}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 11, color: "var(--labs-danger, #ef4444)" }} data-testid={`handout-error-${whisky.id}`}>
          {error}
        </div>
      )}

      {handouts.length === 0 && (
        <p style={{ fontSize: 10, color: "var(--labs-text-muted)", margin: 0 }}>
          Noch keine Handouts. PDF oder Bild bis 20 MB. Für Mehrfach-Upload nutze die Bibliothek.
        </p>
      )}
    </div>
  );
}

export function WhiskyHandoutViewer({ whisky, isRevealed }: { whisky: Whisky; isRevealed?: boolean }) {
  const effectiveQuery = useQuery<EffectiveHandout[]>({
    queryKey: ["whisky-effective-handouts", whisky.id],
    queryFn: async () => {
      const r = await fetch(`/api/whiskies/${whisky.id}/effective-handouts`);
      if (!r.ok) return [];
      const data = await r.json().catch(() => []);
      return Array.isArray(data) ? (data as EffectiveHandout[]) : [];
    },
    enabled: !!whisky.id,
    staleTime: 10_000,
  });
  const all = effectiveQuery.data || [];
  const visible = all.filter((h) => h.visibility !== "after_reveal" || isRevealed);
  const [activeIdx, setActiveIdx] = useState(0);

  if (visible.length === 0) {
    // Fallback for legacy 1:1 data not yet migrated on first render
    if (!whisky.handoutUrl) return null;
    const isPdf = whisky.handoutContentType === "application/pdf";
    if (whisky.handoutVisibility === "after_reveal" && !isRevealed) return null;
    return <SingleHandoutView fileUrl={whisky.handoutUrl} contentType={whisky.handoutContentType || ""} title={whisky.handoutTitle} author={whisky.handoutAuthor} description={whisky.handoutDescription} testId={`handout-viewer-${whisky.id}`} isPdf={isPdf} />;
  }

  const idx = Math.min(activeIdx, visible.length - 1);
  const active = visible[idx];
  const activeIsPdf = active.contentType === "application/pdf";
  const isDistilleryHandout = active.source === "distillery";

  return (
    <div className="labs-card p-4" style={{ display: "flex", flexDirection: "column", gap: 10 }} data-testid={`handout-viewer-${whisky.id}`}>
      {visible.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} data-testid={`handout-tabs-${whisky.id}`}>
          {visible.map((h, i) => {
            const isActive = i === idx;
            const fromDist = h.source === "distillery";
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => setActiveIdx(i)}
                className={isActive ? "labs-btn-primary text-xs" : "labs-btn-ghost text-xs"}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 9999 }}
                data-testid={`handout-tab-${whisky.id}-${i}`}
              >
                {fromDist ? <Building2 style={{ width: 11, height: 11 }} /> : <FileText style={{ width: 11, height: 11 }} />}
                <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {h.title || (h.contentType === "application/pdf" ? `Handout ${i + 1}` : `Bild ${i + 1}`)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {isDistilleryHandout && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--labs-text-muted)" }} data-testid={`handout-distillery-badge-${active.id}`}>
          <Building2 style={{ width: 12, height: 12 }} />
          Brennerei-Handout{active.distilleryName ? `: ${active.distilleryName}` : ""}
        </div>
      )}

      <SingleHandoutView
        fileUrl={active.fileUrl}
        contentType={active.contentType}
        title={active.title}
        author={active.author}
        description={active.description}
        testId={`handout-viewer-item-${active.id}`}
        isPdf={activeIsPdf}
      />
    </div>
  );
}

function SingleHandoutView({ fileUrl, contentType, title, author, description, testId, isPdf }: { fileUrl: string; contentType: string; title?: string | null; author?: string | null; description?: string | null; testId: string; isPdf: boolean }) {
  const skipEmbed = isPdf && isMobilePdfUnsupported();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }} data-testid={testId}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isPdf ? <FileText style={{ width: 16, height: 16, color: "var(--labs-accent)" }} /> : <ImageIcon style={{ width: 16, height: 16, color: "var(--labs-accent)" }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>{title || "Handout"}</div>
          {author && <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>von {author}</div>}
        </div>
      </div>
      {description && <p style={{ fontSize: 12, color: "var(--labs-text-secondary)", margin: 0, lineHeight: 1.5 }}>{description}</p>}
      {!isPdf ? (
        <img src={fileUrl} alt={title || "Handout"} style={{ width: "100%", borderRadius: 8, border: "1px solid var(--labs-border)" }} />
      ) : skipEmbed ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "20px 16px", borderRadius: 8, border: "1px solid var(--labs-border)", background: "var(--labs-surface)" }} data-testid={`${testId}-mobile-card`}>
          <FileText style={{ width: 40, height: 40, color: "var(--labs-accent)", opacity: 0.7 }} />
          <p style={{ fontSize: 12, color: "var(--labs-text-muted)", textAlign: "center", margin: 0 }}>
            PDF-Vorschau auf Mobilgeräten nicht verfügbar. Tippe auf „PDF öffnen", um es zu lesen.
          </p>
        </div>
      ) : (
        <object data={fileUrl} type="application/pdf" style={{ width: "100%", height: 360, borderRadius: 8, border: "1px solid var(--labs-border)", background: "var(--labs-surface)" }} aria-label={title || "Handout PDF"}>
          <p style={{ fontSize: 12, color: "var(--labs-text-muted)", padding: 12 }}>PDF kann hier nicht inline angezeigt werden. Nutze „Öffnen" oder „Download".</p>
        </object>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="labs-btn-primary text-xs" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9999, textDecoration: "none" }} data-testid={`${testId}-open`}>
          <ExternalLink style={{ width: 12, height: 12 }} />
          {isPdf ? "PDF öffnen" : "Bild öffnen"}
        </a>
        <button type="button" onClick={() => safeDownload(fileUrl, (title || "handout") + (isPdf ? ".pdf" : ""))} className="labs-btn-ghost text-xs" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9999, cursor: "pointer", border: "1px solid var(--labs-border)", background: "transparent", fontFamily: "inherit", color: "inherit" }} data-testid={`${testId}-download`}>
          <Download style={{ width: 12, height: 12 }} />
          Download
        </button>
      </div>
    </div>
  );
}
