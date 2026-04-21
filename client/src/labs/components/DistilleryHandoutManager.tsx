import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Image as ImageIcon, Trash2, Upload, ExternalLink, Pencil, X, ArrowUp, ArrowDown, Building2, Library, Check } from "lucide-react";
import { distilleryHandoutApi, handoutLibraryApi } from "@/lib/api";
import type { DistilleryHandout, WhiskyHandoutLibraryEntry } from "@shared/schema";

interface Props {
  distilleryId: string;
  distilleryName: string;
  hostId: string;
}

const HANDOUT_ACCEPT = "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif";

type Vis = "always" | "after_reveal";

export default function DistilleryHandoutManager({ distilleryId, distilleryName, hostId }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Vis>("always");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVisibility, setEditVisibility] = useState<Vis>("always");

  const listQuery = useQuery<DistilleryHandout[]>({
    queryKey: ["distillery-handouts", distilleryId, hostId],
    queryFn: () => distilleryHandoutApi.list(distilleryId, hostId),
    enabled: !!distilleryId && !!hostId,
    staleTime: 10_000,
  });
  const handouts = listQuery.data || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["distillery-handouts", distilleryId] });
  };

  const uploadMut = useMutation({
    mutationFn: (file: File) =>
      distilleryHandoutApi.upload(distilleryId, file, { hostId, title, author, description, visibility }),
    onSuccess: () => { setError(null); setTitle(""); setAuthor(""); setDescription(""); invalidate(); },
    onError: (e: any) => setError(e?.message || "Upload fehlgeschlagen"),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; data: { title?: string | null; author?: string | null; description?: string | null; visibility?: Vis } }) =>
      distilleryHandoutApi.update(distilleryId, vars.id, { hostId, ...vars.data }),
    onSuccess: () => { setError(null); setEditingId(null); invalidate(); },
    onError: (e: any) => setError(e?.message || "Speichern fehlgeschlagen"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => distilleryHandoutApi.delete(distilleryId, id, hostId),
    onSuccess: () => { setError(null); invalidate(); },
    onError: (e: any) => setError(e?.message || "Löschen fehlgeschlagen"),
  });

  const reorderMut = useMutation({
    mutationFn: (orderedIds: string[]) => distilleryHandoutApi.reorder(distilleryId, hostId, orderedIds),
    onSuccess: () => { setError(null); invalidate(); },
    onError: (e: any) => setError(e?.message || "Sortierung fehlgeschlagen"),
  });

  const libraryQuery = useQuery<WhiskyHandoutLibraryEntry[]>({
    queryKey: ["handout-library", hostId, "for-distillery", distilleryName],
    queryFn: () => handoutLibraryApi.list(hostId, distilleryName),
    enabled: !!hostId,
    staleTime: 30_000,
  });
  const usedFileUrls = new Set(handouts.map((h) => h.fileUrl));
  const libraryAvailable = (libraryQuery.data || []).filter((e) => !usedFileUrls.has(e.fileUrl));

  const appendFromLibraryMut = useMutation({
    mutationFn: (libraryId: string) =>
      handoutLibraryApi.appendToDistillery(libraryId, hostId, distilleryId, visibility),
    onSuccess: () => { setError(null); invalidate(); },
    onError: (e: any) => setError(e?.message || "Aus Bibliothek übernehmen fehlgeschlagen"),
  });

  function move(id: string, dir: -1 | 1) {
    const ids = handouts.map((h) => h.id);
    const idx = ids.indexOf(id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    reorderMut.mutate(ids);
  }

  function startEdit(h: DistilleryHandout) {
    setEditingId(h.id);
    setEditTitle(h.title || "");
    setEditAuthor(h.author || "");
    setEditDescription(h.description || "");
    setEditVisibility((h.visibility as Vis) || "always");
  }

  return (
    <div
      style={{
        marginTop: 12,
        border: "1px solid var(--labs-border)",
        borderRadius: 12,
        padding: 12,
        background: "var(--labs-surface)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
      data-testid={`distillery-handout-manager-${distilleryId}`}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Building2 style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text-secondary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Brennerei-Handouts
        </span>
        {handouts.length > 0 && (
          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--labs-accent-muted, var(--labs-surface-2, var(--labs-surface)))", color: "var(--labs-text-secondary)", fontWeight: 600 }}>
            {handouts.length}
          </span>
        )}
      </div>

      <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: 0 }}>
        Hier hochgeladene Handouts werden automatisch jedem Whisky von „{distilleryName}" in deinen Tastings angehängt — sichtbar für deine Gäste.
      </p>

      {handouts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }} data-testid={`distillery-handout-list-${distilleryId}`}>
          {handouts.map((h, i) => {
            const isPdf = h.contentType === "application/pdf";
            const isEditing = editingId === h.id;
            return (
              <div
                key={h.id}
                style={{ border: "1px solid var(--labs-border)", borderRadius: 10, padding: 8, background: "var(--labs-surface)", display: "flex", flexDirection: "column", gap: 6 }}
                data-testid={`distillery-handout-row-${h.id}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isPdf ? <FileText style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} /> : <ImageIcon style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {h.title || (isPdf ? "PDF" : "Bild")}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>
                      {[h.author && `von ${h.author}`, h.visibility === "after_reveal" ? "nach Reveal" : "immer sichtbar"].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <button type="button" className="labs-btn-ghost text-xs" onClick={() => move(h.id, -1)} disabled={i === 0 || reorderMut.isPending} title="Nach oben" style={{ padding: "4px 6px" }} data-testid={`distillery-handout-up-${h.id}`}>
                    <ArrowUp style={{ width: 12, height: 12 }} />
                  </button>
                  <button type="button" className="labs-btn-ghost text-xs" onClick={() => move(h.id, 1)} disabled={i === handouts.length - 1 || reorderMut.isPending} title="Nach unten" style={{ padding: "4px 6px" }} data-testid={`distillery-handout-down-${h.id}`}>
                    <ArrowDown style={{ width: 12, height: 12 }} />
                  </button>
                  <a href={h.fileUrl} target="_blank" rel="noopener noreferrer" className="labs-btn-ghost text-xs" style={{ padding: "4px 6px" }} title="Öffnen" data-testid={`distillery-handout-open-${h.id}`}>
                    <ExternalLink style={{ width: 12, height: 12 }} />
                  </a>
                  <button type="button" className="labs-btn-ghost text-xs" onClick={() => startEdit(h)} style={{ padding: "4px 6px" }} title="Bearbeiten" data-testid={`distillery-handout-edit-${h.id}`}>
                    <Pencil style={{ width: 12, height: 12 }} />
                  </button>
                  <button type="button" className="labs-btn-ghost text-xs" onClick={() => { if (confirm("Handout wirklich löschen?")) deleteMut.mutate(h.id); }} disabled={deleteMut.isPending} style={{ padding: "4px 6px", color: "var(--labs-danger, #ef4444)" }} title="Löschen" data-testid={`distillery-handout-delete-${h.id}`}>
                    <Trash2 style={{ width: 12, height: 12 }} />
                  </button>
                </div>
                {isEditing && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, paddingTop: 6, borderTop: "1px dashed var(--labs-border)" }}>
                    <input className="labs-input" placeholder="Titel" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} data-testid={`distillery-handout-edit-title-${h.id}`} />
                    <input className="labs-input" placeholder="Autor / Quelle" value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} data-testid={`distillery-handout-edit-author-${h.id}`} />
                    <textarea className="labs-input" rows={2} placeholder="Beschreibung" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} style={{ gridColumn: "1 / -1", resize: "vertical" }} data-testid={`distillery-handout-edit-description-${h.id}`} />
                    <select className="labs-input" value={editVisibility} onChange={(e) => setEditVisibility(e.target.value as Vis)} style={{ gridColumn: "1 / -1" }} data-testid={`distillery-handout-edit-visibility-${h.id}`}>
                      <option value="always">Immer sichtbar für Gäste</option>
                      <option value="after_reveal">Erst nach Reveal des jeweiligen Whiskys</option>
                    </select>
                    <div style={{ gridColumn: "1 / -1", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button type="button" className="labs-btn-ghost text-xs" onClick={() => setEditingId(null)} data-testid={`distillery-handout-edit-cancel-${h.id}`}>
                        <X style={{ width: 12, height: 12 }} /> Abbrechen
                      </button>
                      <button
                        type="button"
                        className="labs-btn-primary text-xs"
                        onClick={() => updateMut.mutate({ id: h.id, data: { title: editTitle || null, author: editAuthor || null, description: editDescription || null, visibility: editVisibility } })}
                        disabled={updateMut.isPending}
                        data-testid={`distillery-handout-edit-save-${h.id}`}
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
        data-testid={`distillery-handout-file-input-${distilleryId}`}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input className="labs-input" placeholder="Titel (für neuen Upload)" value={title} onChange={(e) => setTitle(e.target.value)} data-testid={`distillery-handout-title-${distilleryId}`} />
        <input className="labs-input" placeholder="Autor / Quelle" value={author} onChange={(e) => setAuthor(e.target.value)} data-testid={`distillery-handout-author-${distilleryId}`} />
        <textarea className="labs-input" placeholder="Beschreibung (optional)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} style={{ gridColumn: "1 / -1", resize: "vertical" }} data-testid={`distillery-handout-description-${distilleryId}`} />
        <select className="labs-input" value={visibility} onChange={(e) => setVisibility(e.target.value as Vis)} style={{ gridColumn: "1 / -1" }} data-testid={`distillery-handout-visibility-${distilleryId}`}>
          <option value="always">Immer sichtbar für Gäste</option>
          <option value="after_reveal">Erst nach Reveal des jeweiligen Whiskys</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button
          className="labs-btn-primary text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMut.isPending}
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          data-testid={`distillery-handout-upload-btn-${distilleryId}`}
        >
          <Upload style={{ width: 12, height: 12 }} />
          {uploadMut.isPending ? "Lade hoch…" : "Brennerei-Handout hinzufügen"}
        </button>
      </div>

      {libraryAvailable.length > 0 && (
        <div
          style={{
            border: "1px dashed var(--labs-border)",
            borderRadius: 10,
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
          data-testid={`distillery-handout-library-picker-${distilleryId}`}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Library style={{ width: 12, height: 12, color: "var(--labs-text-muted)" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--labs-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Aus deiner Bibliothek hinzufügen (gefiltert auf „{distilleryName}")
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
            {libraryAvailable.slice(0, 30).map((s) => (
              <div
                key={s.id}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", border: "1px solid var(--labs-border)", borderRadius: 8, background: "var(--labs-surface)" }}
                data-testid={`distillery-handout-library-row-${s.id}`}
              >
                <FileText style={{ width: 12, height: 12, color: "var(--labs-text-muted)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.title || s.whiskyName || "Bibliothekseintrag"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--labs-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {[s.distillery, s.author].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <button
                  type="button"
                  className="labs-btn-ghost text-xs"
                  onClick={() => appendFromLibraryMut.mutate(s.id)}
                  disabled={appendFromLibraryMut.isPending}
                  style={{ padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}
                  data-testid={`distillery-handout-library-append-${s.id}`}
                >
                  <Check style={{ width: 11, height: 11 }} /> Hinzufügen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{ fontSize: 11, color: "var(--labs-danger, #ef4444)" }} data-testid={`distillery-handout-error-${distilleryId}`}>
          {error}
        </div>
      )}
    </div>
  );
}
