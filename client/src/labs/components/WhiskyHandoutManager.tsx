import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, Image as ImageIcon, Trash2, Upload, ExternalLink, Download, Library, Check } from "lucide-react";
import { handoutLibraryApi, whiskyApi } from "@/lib/api";
import { downloadFromEndpoint } from "@/lib/download";
import type { Whisky, WhiskyHandoutLibraryEntry } from "@shared/schema";

async function safeDownload(url: string, filename: string) {
  const ok = await downloadFromEndpoint(url, filename).catch(() => false);
  if (!ok) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

interface Props {
  whisky: Whisky;
  hostId: string;
  tastingId: string;
}

const HANDOUT_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif";

export default function WhiskyHandoutManager({ whisky, hostId, tastingId }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(whisky.handoutTitle || "");
  const [author, setAuthor] = useState(whisky.handoutAuthor || "");
  const [description, setDescription] = useState(whisky.handoutDescription || "");
  const [visibility, setVisibility] = useState<"always" | "after_reveal">(
    (whisky.handoutVisibility as "always" | "after_reveal") || "always"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(whisky.handoutTitle || "");
    setAuthor(whisky.handoutAuthor || "");
    setDescription(whisky.handoutDescription || "");
    setVisibility((whisky.handoutVisibility as "always" | "after_reveal") || "always");
  }, [whisky.id, whisky.handoutTitle, whisky.handoutAuthor, whisky.handoutDescription, whisky.handoutVisibility]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["whiskies", tastingId] });
    qc.invalidateQueries({ queryKey: ["whisky", whisky.id] });
  };

  const uploadMut = useMutation({
    mutationFn: (file: File) =>
      whiskyApi.uploadHandout(whisky.id, file, { hostId, title, author, description, visibility }),
    onSuccess: () => { setError(null); invalidate(); },
    onError: (e: any) => setError(e?.message || "Upload fehlgeschlagen"),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      whiskyApi.updateHandout(whisky.id, { hostId, title, author, description, visibility }),
    onSuccess: () => { setError(null); invalidate(); },
    onError: (e: any) => setError(e?.message || "Speichern fehlgeschlagen"),
  });

  const deleteMut = useMutation({
    mutationFn: () => whiskyApi.deleteHandout(whisky.id, hostId),
    onSuccess: () => {
      setError(null);
      setTitle(""); setAuthor(""); setDescription(""); setVisibility("always");
      invalidate();
    },
    onError: (e: any) => setError(e?.message || "Löschen fehlgeschlagen"),
  });

  const hasHandout = !!whisky.handoutUrl;
  const isPdf = whisky.handoutContentType === "application/pdf";

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
    enabled: !hasHandout && !!hostId,
    staleTime: 60_000,
  });
  const suggestions = (suggestionsQuery.data || []).filter(
    (s) => s.fileUrl !== whisky.handoutUrl,
  );

  const applyMut = useMutation({
    mutationFn: (libraryId: string) =>
      handoutLibraryApi.applyToWhisky(libraryId, hostId, whisky.id, visibility),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
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
          Handout
        </span>
        {hasHandout && (
          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--labs-success-muted)", color: "var(--labs-success)", fontWeight: 600 }}>
            {isPdf ? "PDF" : "Bild"}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <Link
          href="/labs/host/handout-library"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--labs-text-muted)", textDecoration: "none" }}
          data-testid={`link-handout-library-${whisky.id}`}
          title="Alle deine gespeicherten Handouts verwalten"
        >
          <Library style={{ width: 11, height: 11 }} />
          Zur Bibliothek
        </Link>
      </div>

      {hasHandout && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <a
            href={whisky.handoutUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="labs-btn-ghost text-xs"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px" }}
            data-testid={`handout-open-${whisky.id}`}
          >
            <ExternalLink style={{ width: 12, height: 12 }} /> Öffnen
          </a>
          <a
            href={whisky.handoutUrl!}
            download={(title || "handout") + (isPdf ? ".pdf" : "")}
            className="labs-btn-ghost text-xs"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px" }}
            data-testid={`handout-download-${whisky.id}`}
          >
            <Download style={{ width: 12, height: 12 }} /> Download
          </a>
          {!isPdf && (
            <img
              src={whisky.handoutUrl!}
              alt="Handout preview"
              style={{ maxHeight: 60, maxWidth: 80, borderRadius: 6, border: "1px solid var(--labs-border)" }}
            />
          )}
        </div>
      )}

      {!hasHandout && suggestions.length > 0 && (
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
              Aus deiner Bibliothek
            </span>
          </div>
          <p style={{ fontSize: 10, color: "var(--labs-text-muted)", margin: 0 }}>
            Du hast schon Handouts für diesen Whisky/diese Brennerei. Mit einem Klick zuweisen:
          </p>
          {suggestions.map((s) => {
            const sIsPdf = s.contentType === "application/pdf";
            const matchHints: string[] = [];
            if (s.whiskybaseId && whisky.whiskybaseId && s.whiskybaseId === whisky.whiskybaseId) matchHints.push("Whiskybase-ID");
            else if (s.whiskyName && whisky.name && s.whiskyName.toLowerCase() === whisky.name.toLowerCase()) matchHints.push("Whisky-Name");
            else if (s.distillery && whisky.distillery && s.distillery.toLowerCase() === whisky.distillery.toLowerCase()) matchHints.push("Brennerei");
            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 8,
                  border: "1px solid var(--labs-border)",
                  borderRadius: 8,
                  background: "var(--labs-surface)",
                }}
                data-testid={`handout-suggestion-${whisky.id}-${s.id}`}
              >
                {sIsPdf ? (
                  <FileText style={{ width: 16, height: 16, color: "var(--labs-text-muted)", flexShrink: 0 }} />
                ) : (
                  <ImageIcon style={{ width: 16, height: 16, color: "var(--labs-text-muted)", flexShrink: 0 }} />
                )}
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
                  onClick={() => applyMut.mutate(s.id)}
                  disabled={applyMut.isPending}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", flexShrink: 0 }}
                  data-testid={`handout-suggestion-apply-${whisky.id}-${s.id}`}
                >
                  <Check style={{ width: 12, height: 12 }} />
                  Übernehmen
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
        <input
          className="labs-input"
          placeholder="Titel (z.B. Tasting-Notes)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid={`handout-title-${whisky.id}`}
        />
        <input
          className="labs-input"
          placeholder="Autor / Quelle"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          data-testid={`handout-author-${whisky.id}`}
        />
        <textarea
          className="labs-input"
          placeholder="Beschreibung (optional)"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ gridColumn: "1 / -1", resize: "vertical" }}
          data-testid={`handout-description-${whisky.id}`}
        />
        <select
          className="labs-input"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as "always" | "after_reveal")}
          style={{ gridColumn: "1 / -1" }}
          data-testid={`handout-visibility-${whisky.id}`}
        >
          <option value="always">Immer sichtbar für Gäste</option>
          <option value="after_reveal">Erst nach Reveal dieses Whiskys</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button
          className="labs-btn-ghost text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMut.isPending}
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          data-testid={`handout-upload-btn-${whisky.id}`}
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
              data-testid={`handout-save-meta-${whisky.id}`}
            >
              {updateMut.isPending ? "Speichere…" : "Speichern"}
            </button>
            <button
              className="labs-btn-ghost text-xs"
              onClick={() => { if (confirm("Handout wirklich löschen?")) deleteMut.mutate(); }}
              disabled={deleteMut.isPending}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--labs-danger, #ef4444)" }}
              data-testid={`handout-delete-${whisky.id}`}
            >
              <Trash2 style={{ width: 12, height: 12 }} /> Löschen
            </button>
          </>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 11, color: "var(--labs-danger, #ef4444)" }} data-testid={`handout-error-${whisky.id}`}>
          {error}
        </div>
      )}

      {!hasHandout && (
        <>
          <p style={{ fontSize: 10, color: "var(--labs-text-muted)", margin: 0 }}>
            PDF oder Bild bis 20 MB. Wird Gästen im Cockpit zu diesem Dram angezeigt.
          </p>
          <p style={{ fontSize: 10, color: "var(--labs-text-muted)", margin: 0 }}>
            Tipp: Für Mehrfach-Upload mit automatischem Erkennen aus dem Dateinamen
            (JAHR_MONAT_TAG_NAME_TASTING_NAME_AUTOR) nutze die Handout-Bibliothek.
          </p>
        </>
      )}
    </div>
  );
}

export function WhiskyHandoutViewer({ whisky }: { whisky: Whisky }) {
  if (!whisky.handoutUrl) return null;
  const isPdf = whisky.handoutContentType === "application/pdf";
  return (
    <div
      className="labs-card p-4"
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
      data-testid={`handout-viewer-${whisky.id}`}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isPdf ? (
          <FileText style={{ width: 16, height: 16, color: "var(--labs-accent)" }} />
        ) : (
          <ImageIcon style={{ width: 16, height: 16, color: "var(--labs-accent)" }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>
            {whisky.handoutTitle || "Handout"}
          </div>
          {whisky.handoutAuthor && (
            <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
              von {whisky.handoutAuthor}
            </div>
          )}
        </div>
      </div>

      {whisky.handoutDescription && (
        <p style={{ fontSize: 12, color: "var(--labs-text-secondary)", margin: 0, lineHeight: 1.5 }}>
          {whisky.handoutDescription}
        </p>
      )}

      {!isPdf ? (
        <img
          src={whisky.handoutUrl}
          alt={whisky.handoutTitle || "Handout"}
          style={{ width: "100%", borderRadius: 8, border: "1px solid var(--labs-border)" }}
        />
      ) : (
        <object
          data={whisky.handoutUrl}
          type="application/pdf"
          style={{ width: "100%", height: 360, borderRadius: 8, border: "1px solid var(--labs-border)", background: "var(--labs-surface)" }}
          aria-label={whisky.handoutTitle || "Handout PDF"}
          data-testid={`handout-viewer-pdf-embed-${whisky.id}`}
        >
          <p style={{ fontSize: 12, color: "var(--labs-text-muted)", padding: 12 }}>
            PDF kann hier nicht inline angezeigt werden. Nutze „PDF öffnen" oder „Download".
          </p>
        </object>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a
          href={whisky.handoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="labs-btn-primary text-xs"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9999, textDecoration: "none" }}
          data-testid={`handout-viewer-open-${whisky.id}`}
        >
          <ExternalLink style={{ width: 12, height: 12 }} />
          {isPdf ? "PDF öffnen" : "Bild öffnen"}
        </a>
        <button
          type="button"
          onClick={() => safeDownload(whisky.handoutUrl!, (whisky.handoutTitle || "handout") + (isPdf ? ".pdf" : ""))}
          className="labs-btn-ghost text-xs"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9999, cursor: "pointer", border: "1px solid var(--labs-border)", background: "transparent", fontFamily: "inherit", color: "inherit" }}
          data-testid={`handout-viewer-download-${whisky.id}`}
        >
          <Download style={{ width: 12, height: 12 }} />
          Download
        </button>
      </div>
    </div>
  );
}
