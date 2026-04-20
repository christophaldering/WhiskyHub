import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Image as ImageIcon, Trash2, Upload, ExternalLink, Download } from "lucide-react";
import { tastingHandoutApi } from "@/lib/api";
import { downloadFromEndpoint } from "@/lib/download";
import type { Tasting } from "@shared/schema";

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
  const [title, setTitle] = useState(tasting.handoutTitle || "");
  const [author, setAuthor] = useState(tasting.handoutAuthor || "");
  const [description, setDescription] = useState(tasting.handoutDescription || "");
  const [visibility, setVisibility] = useState<Vis>((tasting.handoutVisibility as Vis) || "always");
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    setTitle(tasting.handoutTitle || "");
    setAuthor(tasting.handoutAuthor || "");
    setDescription(tasting.handoutDescription || "");
    setVisibility((tasting.handoutVisibility as Vis) || "always");
  }, [tasting.id, tasting.handoutTitle, tasting.handoutAuthor, tasting.handoutDescription, tasting.handoutVisibility]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tasting", tasting.id] });
    qc.invalidateQueries({ queryKey: ["/api/tastings", tasting.id] });
    qc.invalidateQueries({ queryKey: [`/api/tastings/${tasting.id}`] });
  };

  const uploadMut = useMutation({
    mutationFn: (file: File) =>
      tastingHandoutApi.upload(tasting.id, file, { hostId, title, author, description, visibility }),
    onSuccess: () => { setError(null); invalidate(); },
    onError: (e: any) => setError(e?.message || "Upload fehlgeschlagen"),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      tastingHandoutApi.update(tasting.id, { hostId, title, author, description, visibility }),
    onSuccess: () => { setError(null); invalidate(); },
    onError: (e: any) => setError(e?.message || "Speichern fehlgeschlagen"),
  });

  const deleteMut = useMutation({
    mutationFn: () => tastingHandoutApi.delete(tasting.id, hostId),
    onSuccess: () => {
      setError(null);
      setTitle(""); setAuthor(""); setDescription(""); setVisibility("always");
      invalidate();
    },
    onError: (e: any) => setError(e?.message || "Löschen fehlgeschlagen"),
  });

  const hasHandout = !!tasting.handoutUrl;
  const isPdf = tasting.handoutContentType === "application/pdf";

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
          Handout zur Verkostung
        </span>
        {hasHandout && (
          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--labs-success-muted)", color: "var(--labs-success)", fontWeight: 600 }}>
            {isPdf ? "PDF" : "Bild"}
          </span>
        )}
      </div>

      <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: 0 }}>
        Ein Handout für die ganze Verkostung (z.B. Programmheft, Begrüßungsbrief). Whisky-spezifische Handouts werden separat in jedem Whisky verwaltet.
      </p>

      {hasHandout && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <a
            href={tasting.handoutUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="labs-btn-ghost text-xs"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px" }}
            data-testid="tasting-handout-open"
          >
            <ExternalLink style={{ width: 12, height: 12 }} /> Öffnen
          </a>
          <button
            type="button"
            onClick={() => safeDownload(tasting.handoutUrl!, (title || "handout") + (isPdf ? ".pdf" : ""))}
            className="labs-btn-ghost text-xs"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", cursor: "pointer", border: "none", background: "transparent", fontFamily: "inherit", color: "inherit" }}
            data-testid="tasting-handout-download"
          >
            <Download style={{ width: 12, height: 12 }} /> Download
          </button>
          {!isPdf && (
            <img
              src={tasting.handoutUrl!}
              alt="Handout preview"
              style={{ maxHeight: 60, maxWidth: 80, borderRadius: 6, border: "1px solid var(--labs-border)" }}
            />
          )}
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
        {uploadMut.isPending
          ? "Lade hoch…"
          : hasHandout
            ? "Datei hier ablegen oder klicken, um zu ersetzen"
            : "PDF / Bild hierher ziehen oder klicken zum Hochladen"}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input
          className="labs-input"
          placeholder="Titel (z.B. Programmheft)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="tasting-handout-title"
        />
        <input
          className="labs-input"
          placeholder="Autor (z.B. von Rudi)"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          data-testid="tasting-handout-author"
        />
        <textarea
          className="labs-input"
          placeholder="Beschreibung (optional)"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ gridColumn: "1 / -1", resize: "vertical" }}
          data-testid="tasting-handout-description"
        />
        <select
          className="labs-input"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as Vis)}
          style={{ gridColumn: "1 / -1" }}
          data-testid="tasting-handout-visibility"
        >
          <option value="always">Immer sichtbar für Gäste</option>
          <option value="after_first_reveal">Erst nach erstem Reveal</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button
          className="labs-btn-ghost text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMut.isPending}
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          data-testid="tasting-handout-upload-btn"
        >
          <Upload style={{ width: 12, height: 12 }} />
          {uploadMut.isPending ? "Lade hoch…" : hasHandout ? "Datei ersetzen" : "PDF / Bild hochladen"}
        </button>
        {hasHandout && (
          <>
            <button
              className="labs-btn-primary text-xs"
              onClick={() => updateMut.mutate()}
              disabled={updateMut.isPending}
              data-testid="tasting-handout-save-meta"
            >
              {updateMut.isPending ? "Speichere…" : "Speichern"}
            </button>
            <button
              className="labs-btn-ghost text-xs"
              onClick={() => { if (confirm("Handout wirklich löschen?")) deleteMut.mutate(); }}
              disabled={deleteMut.isPending}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--labs-danger, #ef4444)" }}
              data-testid="tasting-handout-delete"
            >
              <Trash2 style={{ width: 12, height: 12 }} /> Löschen
            </button>
          </>
        )}
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
  if (!tasting.handoutUrl) return null;

  const visibility = (tasting.handoutVisibility as Vis) || "always";
  const firstRevealHappened =
    !!tasting.revealedAt ||
    (tasting.revealIndex ?? 0) > 0 ||
    ((tasting.revealStep ?? 0) > 0 && (tasting.revealIndex ?? -1) >= 0) ||
    ((tasting.guidedRevealStep ?? 0) > 0 && (tasting.guidedWhiskyIndex ?? -1) >= 0);
  if (visibility === "after_first_reveal" && !firstRevealHappened) return null;

  const isPdf = tasting.handoutContentType === "application/pdf";
  return (
    <div
      className="labs-card p-4"
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
      data-testid="tasting-handout-viewer"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isPdf ? (
          <FileText style={{ width: 18, height: 18, color: "var(--labs-accent)" }} />
        ) : (
          <ImageIcon style={{ width: 18, height: 18, color: "var(--labs-accent)" }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
            {tasting.handoutTitle || "Handout zur Verkostung"}
          </div>
          {tasting.handoutAuthor && (
            <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>
              von {tasting.handoutAuthor}
            </div>
          )}
        </div>
      </div>

      {tasting.handoutDescription && (
        <p style={{ fontSize: 12, color: "var(--labs-text-secondary)", margin: 0, lineHeight: 1.5 }}>
          {tasting.handoutDescription}
        </p>
      )}

      {!isPdf ? (
        <img
          src={tasting.handoutUrl}
          alt={tasting.handoutTitle || "Handout"}
          style={{ width: "100%", borderRadius: 8, border: "1px solid var(--labs-border)" }}
        />
      ) : (
        <object
          data={tasting.handoutUrl}
          type="application/pdf"
          style={{ width: "100%", height: 420, borderRadius: 8, border: "1px solid var(--labs-border)", background: "var(--labs-surface)" }}
          aria-label={tasting.handoutTitle || "Handout PDF"}
          data-testid="tasting-handout-viewer-pdf-embed"
        >
          <p style={{ fontSize: 12, color: "var(--labs-text-muted)", padding: 12 }}>
            PDF kann hier nicht inline angezeigt werden. Nutze „PDF öffnen" oder „Download".
          </p>
        </object>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a
          href={tasting.handoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="labs-btn-primary text-xs"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9999, textDecoration: "none" }}
          data-testid="tasting-handout-viewer-open"
        >
          <ExternalLink style={{ width: 12, height: 12 }} />
          {isPdf ? "PDF öffnen" : "Bild öffnen"}
        </a>
        <button
          type="button"
          onClick={() => safeDownload(tasting.handoutUrl!, (tasting.handoutTitle || "handout") + (isPdf ? ".pdf" : ""))}
          className="labs-btn-ghost text-xs"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9999, cursor: "pointer", border: "1px solid var(--labs-border)", background: "transparent", fontFamily: "inherit", color: "inherit" }}
          data-testid="tasting-handout-viewer-download"
        >
          <Download style={{ width: 12, height: 12 }} />
          Download
        </button>
      </div>
    </div>
  );
}
