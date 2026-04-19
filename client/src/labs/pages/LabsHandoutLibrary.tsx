import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ChevronLeft, FileText, Image as ImageIcon, Library, Search, Trash2,
  Pencil, Save, X, ExternalLink, Download,
} from "lucide-react";
import { getParticipantId, handoutLibraryApi } from "@/lib/api";
import { downloadFromEndpoint } from "@/lib/download";
import type { WhiskyHandoutLibraryEntry } from "@shared/schema";

interface EditState {
  id: string;
  whiskyName: string;
  distillery: string;
  whiskybaseId: string;
  title: string;
  author: string;
  description: string;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("de-DE", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function LabsHandoutLibrary() {
  const hostId = getParticipantId() || "";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery<WhiskyHandoutLibraryEntry[]>({
    queryKey: ["handout-library", hostId, search],
    queryFn: () => handoutLibraryApi.list(hostId, search.trim() || undefined),
    enabled: !!hostId,
  });

  const filtered = useMemo(() => listQuery.data || [], [listQuery.data]);

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
      <p style={{ color: "var(--labs-text-muted)", fontSize: 13, margin: "0 0 20px" }}>
        Alle Handouts, die du je zu einem Whisky hochgeladen hast. Beim Anlegen neuer Whiskys werden passende Einträge automatisch vorgeschlagen.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, position: "relative" }}>
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

      {error && (
        <div
          style={{ background: "var(--labs-error-bg, #3a1a1a)", color: "var(--labs-error, #ff6b6b)", padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}
          data-testid="text-handout-library-error"
        >
          {error}
        </div>
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
              style={{ border: "1px solid var(--labs-border)", borderRadius: 12, padding: 12, background: "var(--labs-surface)", display: "flex", alignItems: "center", gap: 12 }}
              data-testid={`handout-library-row-${entry.id}`}
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
    </div>
  );
}
