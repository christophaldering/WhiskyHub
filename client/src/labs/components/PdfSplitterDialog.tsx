import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Upload, X, Scissors, ExternalLink } from "lucide-react";
import { pdfSplitterApi, type PdfSplitPage } from "@/lib/api";
import type { Whisky } from "@shared/schema";

interface Props {
  open: boolean;
  onClose: () => void;
  tastingId: string;
  hostId: string;
  whiskies: Whisky[];
}

const UNASSIGNED = "";

export default function PdfSplitterDialog({ open, onClose, tastingId, hostId, whiskies }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pages, setPages] = useState<PdfSplitPage[]>([]);
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setSessionId(null);
    setPages([]);
    setAssignments({});
    setError(null);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  // Auto-assign each page to the n-th whisky as a default mapping when the page
  // count matches or is close to the whisky count. Hosts can override per page.
  useEffect(() => {
    if (pages.length === 0) return;
    const next: Record<number, string> = {};
    pages.forEach((p, idx) => {
      const w = whiskies[idx];
      if (w) next[p.pageNumber] = w.id;
      else next[p.pageNumber] = UNASSIGNED;
    });
    setAssignments(next);
  }, [pages, whiskies]);

  const uploadMut = useMutation({
    mutationFn: (file: File) => pdfSplitterApi.split(tastingId, file, hostId),
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setPages(data.pages);
      setError(null);
    },
    onError: (e: any) => setError(e?.message || "Upload fehlgeschlagen"),
  });

  const commitMut = useMutation({
    mutationFn: () => {
      if (!sessionId) throw new Error("Keine aktive Session");
      const list = Object.entries(assignments)
        .filter(([, whiskyId]) => whiskyId && whiskyId !== UNASSIGNED)
        .map(([pageNumber, whiskyId]) => ({ pageNumber: Number(pageNumber), whiskyId }));
      return pdfSplitterApi.commit(sessionId, hostId, list);
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      qc.invalidateQueries({ queryKey: ["handout-library-suggest"] });
      reset();
      onClose();
      // Best-effort feedback via alert; UX could be replaced with toast later
      window.setTimeout(() => {
        alert(`PDF aufgeteilt: ${result.assigned} zugewiesen, ${result.discarded} verworfen.`);
      }, 50);
    },
    onError: (e: any) => setError(e?.message || "Speichern fehlgeschlagen"),
  });

  const handleCancel = async () => {
    if (sessionId && !commitMut.isPending) {
      try {
        await pdfSplitterApi.cancel(sessionId, hostId);
      } catch {
        // best effort
      }
    }
    reset();
    onClose();
  };

  if (!open) return null;

  const hasDuplicateAssignment = (() => {
    const seen = new Set<string>();
    for (const v of Object.values(assignments)) {
      if (!v || v === UNASSIGNED) continue;
      if (seen.has(v)) return true;
      seen.add(v);
    }
    return false;
  })();

  const assignedCount = Object.values(assignments).filter((v) => v && v !== UNASSIGNED).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={handleCancel}
      data-testid="pdf-splitter-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--labs-surface)",
          border: "1px solid var(--labs-border)",
          borderRadius: 14,
          width: "100%", maxWidth: 640,
          maxHeight: "90vh",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
        data-testid="pdf-splitter-dialog"
      >
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 18px",
          borderBottom: "1px solid var(--labs-border)",
        }}>
          <Scissors style={{ width: 16, height: 16, color: "var(--labs-accent)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--labs-text)" }}>
              PDF in Whisky-Handouts aufteilen
            </div>
            <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2 }}>
              Lade ein mehrseitiges Programm-PDF hoch und ordne jede Seite einem Whisky zu.
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="labs-btn-ghost"
            style={{ padding: 6 }}
            data-testid="pdf-splitter-close"
            aria-label="Schließen"
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ padding: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {pages.length === 0 ? (
            <>
              <div style={{
                border: "1px dashed var(--labs-border)",
                borderRadius: 12,
                padding: 24,
                textAlign: "center",
                background: "var(--labs-surface-2, var(--labs-surface))",
              }}>
                <FileText style={{ width: 32, height: 32, color: "var(--labs-text-muted)", marginBottom: 10 }} />
                <p style={{ fontSize: 13, color: "var(--labs-text-secondary)", margin: 0, marginBottom: 4 }}>
                  Mehrseitiges PDF auswählen (max. 100 Seiten, 20 MB)
                </p>
                <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: 0, marginBottom: 14 }}>
                  Jede Seite wird einzeln gespeichert und kann anschließend einem Whisky zugewiesen werden.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.doc,.docx"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadMut.mutate(f);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  data-testid="pdf-splitter-file-input"
                />
                <button
                  type="button"
                  className="labs-btn-primary text-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMut.isPending}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px" }}
                  data-testid="pdf-splitter-upload-btn"
                >
                  {uploadMut.isPending ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Upload style={{ width: 14, height: 14 }} />}
                  {uploadMut.isPending ? "Splitte PDF…" : "PDF hochladen"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{
                fontSize: 12, color: "var(--labs-text-muted)",
                background: "var(--labs-surface-2, var(--labs-surface))",
                border: "1px solid var(--labs-border)",
                borderRadius: 8, padding: 10,
              }}>
                <strong style={{ color: "var(--labs-text)" }}>{pages.length} Seiten</strong> erkannt.
                Wähle für jede Seite einen Whisky aus oder lasse sie leer (wird verworfen).
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pages.map((p) => {
                  const value = assignments[p.pageNumber] ?? UNASSIGNED;
                  return (
                    <div
                      key={p.pageNumber}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: 10,
                        border: "1px solid var(--labs-border)",
                        borderRadius: 8,
                        background: "var(--labs-surface)",
                      }}
                      data-testid={`pdf-splitter-page-row-${p.pageNumber}`}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 6,
                        background: "var(--labs-surface-elevated, var(--labs-surface-2))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, fontSize: 12, fontWeight: 700,
                        color: "var(--labs-accent)",
                      }}>
                        {p.pageNumber}
                      </div>
                      <a
                        href={p.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="labs-btn-ghost"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 11, flexShrink: 0 }}
                        data-testid={`pdf-splitter-page-preview-${p.pageNumber}`}
                      >
                        <ExternalLink style={{ width: 11, height: 11 }} /> Vorschau
                      </a>
                      <select
                        className="labs-input"
                        value={value}
                        onChange={(e) => setAssignments((prev) => ({ ...prev, [p.pageNumber]: e.target.value }))}
                        style={{ flex: 1, minWidth: 0, fontSize: 12 }}
                        data-testid={`pdf-splitter-page-select-${p.pageNumber}`}
                      >
                        <option value={UNASSIGNED}>— nicht zuweisen (verwerfen) —</option>
                        {whiskies.map((w, idx) => (
                          <option key={w.id} value={w.id}>
                            {idx + 1}. {w.name || "Whisky"}{w.distillery ? ` · ${w.distillery}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {hasDuplicateAssignment && (
                <div style={{ fontSize: 11, color: "var(--labs-warning, #f59e0b)" }} data-testid="pdf-splitter-warning-duplicate">
                  Achtung: Ein Whisky ist mehreren Seiten zugewiesen. Nur die letzte Seite überschreibt das vorhandene Handout.
                </div>
              )}
            </>
          )}

          {error && (
            <div style={{ fontSize: 12, color: "var(--labs-danger, #ef4444)" }} data-testid="pdf-splitter-error">
              {error}
            </div>
          )}
        </div>

        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 8,
          padding: "12px 18px",
          borderTop: "1px solid var(--labs-border)",
          background: "var(--labs-surface-2, var(--labs-surface))",
        }}>
          <button
            type="button"
            className="labs-btn-ghost text-sm"
            onClick={handleCancel}
            disabled={commitMut.isPending}
            data-testid="pdf-splitter-cancel"
          >
            Abbrechen
          </button>
          {pages.length > 0 && (
            <button
              type="button"
              className="labs-btn-primary text-sm"
              onClick={() => commitMut.mutate()}
              disabled={commitMut.isPending || assignedCount === 0}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              data-testid="pdf-splitter-commit"
            >
              {commitMut.isPending ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : null}
              Zuweisungen übernehmen ({assignedCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
