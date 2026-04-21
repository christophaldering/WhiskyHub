import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Image as ImageIcon, Trash2, Upload, ExternalLink, Download, ArrowUp, ArrowDown, Pencil, X } from "lucide-react";
import { tastingHandoutApi } from "@/lib/api";
import { downloadFromEndpoint } from "@/lib/download";
import type { Tasting, TastingHandout } from "@shared/schema";

async function safeDownload(url: string, filename: string) {
  const ok = await downloadFromEndpoint(url, filename).catch(() => false);
  if (!ok) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

interface Props {
  tasting: Tasting;
  hostId: string;
}

const HANDOUT_ACCEPT = "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif";

type Vis = "always" | "after_first_reveal";

export default function TastingHandoutManager({ tasting, hostId }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Vis>("always");
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVisibility, setEditVisibility] = useState<Vis>("always");

  const listQuery = useQuery<TastingHandout[]>({
    queryKey: ["tasting-handouts", tasting.id],
    queryFn: () => tastingHandoutApi.list(tasting.id),
    enabled: !!tasting.id,
    staleTime: 10_000,
  });
  const handouts = listQuery.data || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tasting-handouts", tasting.id] });
    qc.invalidateQueries({ queryKey: ["tasting", tasting.id] });
  };

  const uploadMut = useMutation({
    mutationFn: (file: File) =>
      tastingHandoutApi.uploadItem(tasting.id, file, { hostId, title, author, description, visibility }),
    onSuccess: () => { setError(null); setTitle(""); setAuthor(""); setDescription(""); invalidate(); },
    onError: (e: any) => setError(e?.message || "Upload fehlgeschlagen"),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; data: { title?: string | null; author?: string | null; description?: string | null; visibility?: Vis } }) =>
      tastingHandoutApi.updateItem(tasting.id, vars.id, { hostId, ...vars.data }),
    onSuccess: () => { setError(null); setEditingId(null); invalidate(); },
    onError: (e: any) => setError(e?.message || "Speichern fehlgeschlagen"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => tastingHandoutApi.deleteItem(tasting.id, id, hostId),
    onSuccess: () => { setError(null); invalidate(); },
    onError: (e: any) => setError(e?.message || "Löschen fehlgeschlagen"),
  });

  const reorderMut = useMutation({
    mutationFn: (orderedIds: string[]) => tastingHandoutApi.reorder(tasting.id, hostId, orderedIds),
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

  function startEdit(h: TastingHandout) {
    setEditingId(h.id);
    setEditTitle(h.title || "");
    setEditAuthor(h.author || "");
    setEditDescription(h.description || "");
    setEditVisibility((h.visibility as Vis) || "always");
  }

  return (
    <div
      style={{
        border: "1px solid var(--labs-border)",
        borderRadius: 12,
        padding: 14,
        background: "var(--labs-surface)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
      data-testid="tasting-handout-manager"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <FileText style={{ width: 16, height: 16, color: "var(--labs-text-muted)" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Handouts zur Verkostung
        </span>
        {handouts.length > 0 && (
          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--labs-accent-muted, var(--labs-surface-2, var(--labs-surface)))", color: "var(--labs-text-secondary)", fontWeight: 600 }}>
            {handouts.length}
          </span>
        )}
      </div>

      <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: 0 }}>
        Handouts für die ganze Verkostung (z.B. Programmheft, Begrüßungsbrief). Whisky-spezifische Handouts werden separat in jedem Whisky verwaltet.
      </p>

      {handouts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }} data-testid="tasting-handout-list">
          {handouts.map((h, i) => {
            const isPdf = h.contentType === "application/pdf";
            const isEditing = editingId === h.id;
            return (
              <div
                key={h.id}
                style={{ border: "1px solid var(--labs-border)", borderRadius: 10, padding: 8, background: "var(--labs-surface)", display: "flex", flexDirection: "column", gap: 6 }}
                data-testid={`tasting-handout-row-${h.id}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isPdf ? <FileText style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} /> : <ImageIcon style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {h.title || (isPdf ? "PDF" : "Bild")}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>
                      {[h.author && `von ${h.author}`, h.visibility === "after_first_reveal" ? "nach erstem Reveal" : "immer sichtbar"].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <button type="button" className="labs-btn-ghost text-xs" onClick={() => move(h.id, -1)} disabled={i === 0 || reorderMut.isPending} title="Nach oben" style={{ padding: "4px 6px" }} data-testid={`tasting-handout-up-${h.id}`}>
                    <ArrowUp style={{ width: 12, height: 12 }} />
                  </button>
                  <button type="button" className="labs-btn-ghost text-xs" onClick={() => move(h.id, 1)} disabled={i === handouts.length - 1 || reorderMut.isPending} title="Nach unten" style={{ padding: "4px 6px" }} data-testid={`tasting-handout-down-${h.id}`}>
                    <ArrowDown style={{ width: 12, height: 12 }} />
                  </button>
                  <a href={h.fileUrl} target="_blank" rel="noopener noreferrer" className="labs-btn-ghost text-xs" style={{ padding: "4px 6px" }} title="Öffnen" data-testid={`tasting-handout-open-${h.id}`}>
                    <ExternalLink style={{ width: 12, height: 12 }} />
                  </a>
                  <button type="button" className="labs-btn-ghost text-xs" onClick={() => startEdit(h)} style={{ padding: "4px 6px" }} title="Bearbeiten" data-testid={`tasting-handout-edit-${h.id}`}>
                    <Pencil style={{ width: 12, height: 12 }} />
                  </button>
                  <button type="button" className="labs-btn-ghost text-xs" onClick={() => { if (confirm("Handout wirklich löschen?")) deleteMut.mutate(h.id); }} disabled={deleteMut.isPending} style={{ padding: "4px 6px", color: "var(--labs-danger, #ef4444)" }} title="Löschen" data-testid={`tasting-handout-delete-${h.id}`}>
                    <Trash2 style={{ width: 12, height: 12 }} />
                  </button>
                </div>
                {isEditing && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, paddingTop: 6, borderTop: "1px dashed var(--labs-border)" }}>
                    <input className="labs-input" placeholder="Titel" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} data-testid={`tasting-handout-edit-title-${h.id}`} />
                    <input className="labs-input" placeholder="Autor / Quelle" value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} data-testid={`tasting-handout-edit-author-${h.id}`} />
                    <textarea className="labs-input" rows={2} placeholder="Beschreibung" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} style={{ gridColumn: "1 / -1", resize: "vertical" }} data-testid={`tasting-handout-edit-description-${h.id}`} />
                    <select className="labs-input" value={editVisibility} onChange={(e) => setEditVisibility(e.target.value as Vis)} style={{ gridColumn: "1 / -1" }} data-testid={`tasting-handout-edit-visibility-${h.id}`}>
                      <option value="always">Immer sichtbar für Gäste</option>
                      <option value="after_first_reveal">Erst nach erstem Reveal</option>
                    </select>
                    <div style={{ gridColumn: "1 / -1", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button type="button" className="labs-btn-ghost text-xs" onClick={() => setEditingId(null)} data-testid={`tasting-handout-edit-cancel-${h.id}`}>
                        <X style={{ width: 12, height: 12 }} /> Abbrechen
                      </button>
                      <button
                        type="button"
                        className="labs-btn-primary text-xs"
                        onClick={() => updateMut.mutate({ id: h.id, data: { title: editTitle || null, author: editAuthor || null, description: editDescription || null, visibility: editVisibility } })}
                        disabled={updateMut.isPending}
                        data-testid={`tasting-handout-edit-save-${h.id}`}
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
        data-testid="tasting-handout-file-input"
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
        onDrop={(e) => {
          e.preventDefault(); e.stopPropagation(); setDragActive(false);
          const f = e.dataTransfer.files?.[0];
          if (f) uploadMut.mutate(f);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
        style={{
          border: `2px dashed ${dragActive ? "var(--labs-accent)" : "var(--labs-border)"}`,
          borderRadius: 10,
          padding: 14,
          textAlign: "center",
          cursor: "pointer",
          background: dragActive ? "var(--labs-accent-muted, transparent)" : "transparent",
          transition: "border-color 120ms, background 120ms",
          fontSize: 12,
          color: "var(--labs-text-muted)",
        }}
        data-testid="tasting-handout-dropzone"
      >
        <Upload style={{ width: 14, height: 14, display: "inline-block", verticalAlign: "middle", marginRight: 6 }} />
        {uploadMut.isPending ? "Lade hoch…" : "Weiteres Handout per Drag&Drop oder Klick hochladen"}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input className="labs-input" placeholder="Titel (für neuen Upload)" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="tasting-handout-title" />
        <input className="labs-input" placeholder="Autor / Quelle" value={author} onChange={(e) => setAuthor(e.target.value)} data-testid="tasting-handout-author" />
        <textarea className="labs-input" placeholder="Beschreibung (optional)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} style={{ gridColumn: "1 / -1", resize: "vertical" }} data-testid="tasting-handout-description" />
        <select className="labs-input" value={visibility} onChange={(e) => setVisibility(e.target.value as Vis)} style={{ gridColumn: "1 / -1" }} data-testid="tasting-handout-visibility">
          <option value="always">Immer sichtbar für Gäste</option>
          <option value="after_first_reveal">Erst nach erstem Reveal</option>
        </select>
      </div>

      {error && (
        <div style={{ fontSize: 11, color: "var(--labs-danger, #ef4444)" }} data-testid="tasting-handout-error">
          {error}
        </div>
      )}
    </div>
  );
}

export function TastingHandoutViewer({ tasting }: { tasting: Tasting }) {
  const listQuery = useQuery<TastingHandout[]>({
    queryKey: ["tasting-handouts", tasting.id],
    queryFn: () => tastingHandoutApi.list(tasting.id),
    enabled: !!tasting.id,
    staleTime: 10_000,
  });

  const firstRevealHappened =
    !!tasting.revealedAt ||
    (tasting.revealIndex ?? 0) > 0 ||
    ((tasting.revealStep ?? 0) > 0 && (tasting.revealIndex ?? -1) >= 0) ||
    ((tasting.guidedRevealStep ?? 0) > 0 && (tasting.guidedWhiskyIndex ?? -1) >= 0);

  const all = listQuery.data || [];
  const visible = all.filter((h) => h.visibility !== "after_first_reveal" || firstRevealHappened);
  const [activeIdx, setActiveIdx] = useState(0);

  if (visible.length === 0) {
    if (!tasting.handoutUrl) return null;
    const visibility = (tasting.handoutVisibility as Vis) || "always";
    if (visibility === "after_first_reveal" && !firstRevealHappened) return null;
    const isPdf = tasting.handoutContentType === "application/pdf";
    return <SingleHandoutCard fileUrl={tasting.handoutUrl} contentType={tasting.handoutContentType || ""} title={tasting.handoutTitle || "Handout zur Verkostung"} author={tasting.handoutAuthor} description={tasting.handoutDescription} testId="tasting-handout-viewer" isPdf={isPdf} />;
  }

  const idx = Math.min(activeIdx, visible.length - 1);
  const active = visible[idx];
  const activeIsPdf = active.contentType === "application/pdf";

  return (
    <div className="labs-card p-4" style={{ display: "flex", flexDirection: "column", gap: 10 }} data-testid="tasting-handout-viewer">
      {visible.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} data-testid="tasting-handout-tabs">
          {visible.map((h, i) => {
            const isActive = i === idx;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => setActiveIdx(i)}
                className={isActive ? "labs-btn-primary text-xs" : "labs-btn-ghost text-xs"}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 9999 }}
                data-testid={`tasting-handout-tab-${i}`}
              >
                <FileText style={{ width: 11, height: 11 }} />
                <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {h.title || (h.contentType === "application/pdf" ? `Handout ${i + 1}` : `Bild ${i + 1}`)}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <SingleHandoutCard fileUrl={active.fileUrl} contentType={active.contentType} title={active.title || "Handout"} author={active.author} description={active.description} testId={`tasting-handout-viewer-item-${active.id}`} isPdf={activeIsPdf} />
    </div>
  );
}

function SingleHandoutCard({ fileUrl, contentType, title, author, description, testId, isPdf }: { fileUrl: string; contentType: string; title?: string | null; author?: string | null; description?: string | null; testId: string; isPdf: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }} data-testid={testId}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isPdf ? <FileText style={{ width: 18, height: 18, color: "var(--labs-accent)" }} /> : <ImageIcon style={{ width: 18, height: 18, color: "var(--labs-accent)" }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>{title || "Handout"}</div>
          {author && <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>von {author}</div>}
        </div>
      </div>
      {description && <p style={{ fontSize: 12, color: "var(--labs-text-secondary)", margin: 0, lineHeight: 1.5 }}>{description}</p>}
      {!isPdf ? (
        <img src={fileUrl} alt={title || "Handout"} style={{ width: "100%", borderRadius: 8, border: "1px solid var(--labs-border)" }} />
      ) : (
        <object data={fileUrl} type="application/pdf" style={{ width: "100%", height: 420, borderRadius: 8, border: "1px solid var(--labs-border)", background: "var(--labs-surface)" }} aria-label={title || "Handout PDF"}>
          <p style={{ fontSize: 12, color: "var(--labs-text-muted)", padding: 12 }}>PDF kann hier nicht inline angezeigt werden. Nutze „Öffnen" oder „Download".</p>
        </object>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="labs-btn-primary text-xs" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9999, textDecoration: "none" }}>
          <ExternalLink style={{ width: 12, height: 12 }} />
          {isPdf ? "PDF öffnen" : "Bild öffnen"}
        </a>
        <button type="button" onClick={() => safeDownload(fileUrl, (title || "handout") + (isPdf ? ".pdf" : ""))} className="labs-btn-ghost text-xs" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9999, cursor: "pointer", border: "1px solid var(--labs-border)", background: "transparent", fontFamily: "inherit", color: "inherit" }}>
          <Download style={{ width: 12, height: 12 }} />
          Download
        </button>
      </div>
    </div>
  );
}
