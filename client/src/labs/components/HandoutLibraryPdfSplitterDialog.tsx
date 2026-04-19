import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Scissors, Trash2, X } from "lucide-react";
import { handoutLibraryApi } from "@/lib/api";
import type { WhiskyHandoutLibraryEntry } from "@shared/schema";

interface RangeRow {
  from: string;
  to: string;
  whiskyName: string;
  distillery: string;
  whiskybaseId: string;
  title: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  entry: WhiskyHandoutLibraryEntry | null;
  hostId: string;
}

const emptyRow = (from = 1, to = 1): RangeRow => ({
  from: String(from),
  to: String(to),
  whiskyName: "",
  distillery: "",
  whiskybaseId: "",
  title: "",
});

export default function HandoutLibraryPdfSplitterDialog({ open, onClose, entry, hostId }: Props) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<RangeRow[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);

  const pageCountQuery = useQuery<{ pageCount: number }>({
    queryKey: ["handout-library-page-count", entry?.id],
    queryFn: () => handoutLibraryApi.getPageCount(entry!.id, hostId),
    enabled: !!entry && open,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (open) {
      setRows([emptyRow()]);
      setError(null);
    }
  }, [open, entry?.id]);

  const splitMut = useMutation({
    mutationFn: () => {
      if (!entry) throw new Error("Kein Eintrag");
      const ranges = rows.map((r) => {
        const from = Number(r.from);
        const to = Number(r.to);
        if (!Number.isInteger(from) || from < 1) throw new Error(`Ungültige Startseite: ${r.from}`);
        if (!Number.isInteger(to) || to < from) throw new Error(`Ungültige Endseite: ${r.to}`);
        if (!r.whiskyName.trim()) throw new Error("Whisky-Name ist für jeden Bereich erforderlich");
        return {
          from,
          to,
          whiskyName: r.whiskyName.trim(),
          distillery: r.distillery.trim() || undefined,
          whiskybaseId: r.whiskybaseId.trim() || undefined,
          title: r.title.trim() || undefined,
        };
      });
      return handoutLibraryApi.split(entry.id, hostId, ranges);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handout-library", hostId] });
      onClose();
    },
    onError: (e: any) => setError(e?.message || "Aufteilen fehlgeschlagen"),
  });

  if (!open || !entry) return null;

  const pageCount = pageCountQuery.data?.pageCount ?? null;

  const updateRow = (i: number, patch: Partial<RangeRow>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const addRow = () => {
    const last = rows[rows.length - 1];
    const nextFrom = last ? Math.min((Number(last.to) || 1) + 1, pageCount ?? Number.MAX_SAFE_INTEGER) : 1;
    setRows((prev) => [...prev, emptyRow(nextFrom, nextFrom)]);
  };
  const removeRow = (i: number) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  };

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
      onClick={() => !splitMut.isPending && onClose()}
      data-testid="handout-library-split-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--labs-surface)",
          border: "1px solid var(--labs-border)",
          borderRadius: 14,
          width: "100%", maxWidth: 760,
          maxHeight: "90vh",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
        data-testid="handout-library-split-dialog"
      >
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 18px",
          borderBottom: "1px solid var(--labs-border)",
        }}>
          <Scissors style={{ width: 16, height: 16, color: "var(--labs-accent)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--labs-text)" }}>
              Programmheft seitenweise aufteilen
            </div>
            <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2 }}>
              {entry.title || entry.whiskyName}
              {pageCount !== null && ` · ${pageCount} Seiten`}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="labs-btn-ghost"
            style={{ padding: 6 }}
            disabled={splitMut.isPending}
            data-testid="handout-library-split-close"
            aria-label="Schließen"
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ padding: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            fontSize: 12, color: "var(--labs-text-muted)",
            background: "var(--labs-surface-2, var(--labs-surface))",
            border: "1px solid var(--labs-border)",
            borderRadius: 8, padding: 10,
          }}>
            Markiere Seitenbereiche und ordne jedem Bereich einen Whisky zu. Aus jedem Bereich entsteht ein eigenes
            Bibliotheks-Handout. Das Original-PDF bleibt als Programmheft erhalten.
          </div>

          {pageCountQuery.isLoading && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--labs-text-muted)" }} data-testid="handout-library-split-loading">
              <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> Lade Seitenanzahl…
            </div>
          )}
          {pageCountQuery.error && (
            <div style={{ fontSize: 12, color: "var(--labs-error, #ff6b6b)" }} data-testid="handout-library-split-pagecount-error">
              {(pageCountQuery.error as any)?.message || "Seitenanzahl konnte nicht ermittelt werden"}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((r, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid var(--labs-border)",
                  borderRadius: 10,
                  padding: 10,
                  background: "var(--labs-surface)",
                  display: "grid",
                  gap: 8,
                }}
                data-testid={`handout-library-split-row-${i}`}
              >
                <div style={{ display: "grid", gridTemplateColumns: "80px 80px 1fr 1fr auto", gap: 8, alignItems: "end" }}>
                  <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--labs-text-muted)" }}>
                    Von
                    <input
                      className="labs-input"
                      type="number"
                      min={1}
                      max={pageCount ?? undefined}
                      value={r.from}
                      onChange={(e) => updateRow(i, { from: e.target.value })}
                      data-testid={`handout-library-split-from-${i}`}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--labs-text-muted)" }}>
                    Bis
                    <input
                      className="labs-input"
                      type="number"
                      min={1}
                      max={pageCount ?? undefined}
                      value={r.to}
                      onChange={(e) => updateRow(i, { to: e.target.value })}
                      data-testid={`handout-library-split-to-${i}`}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--labs-text-muted)" }}>
                    Whisky-Name *
                    <input
                      className="labs-input"
                      value={r.whiskyName}
                      onChange={(e) => updateRow(i, { whiskyName: e.target.value })}
                      data-testid={`handout-library-split-whiskyname-${i}`}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--labs-text-muted)" }}>
                    Brennerei
                    <input
                      className="labs-input"
                      value={r.distillery}
                      onChange={(e) => updateRow(i, { distillery: e.target.value })}
                      data-testid={`handout-library-split-distillery-${i}`}
                    />
                  </label>
                  <button
                    type="button"
                    className="labs-btn-ghost"
                    onClick={() => removeRow(i)}
                    disabled={rows.length <= 1 || splitMut.isPending}
                    style={{ padding: 6, color: "var(--labs-error, #ff6b6b)" }}
                    data-testid={`handout-library-split-remove-${i}`}
                    aria-label="Bereich entfernen"
                    title="Bereich entfernen"
                  >
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--labs-text-muted)" }}>
                    Whiskybase-ID
                    <input
                      className="labs-input"
                      value={r.whiskybaseId}
                      onChange={(e) => updateRow(i, { whiskybaseId: e.target.value })}
                      data-testid={`handout-library-split-wbid-${i}`}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--labs-text-muted)" }}>
                    Titel
                    <input
                      className="labs-input"
                      value={r.title}
                      onChange={(e) => updateRow(i, { title: e.target.value })}
                      data-testid={`handout-library-split-title-${i}`}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="labs-btn-secondary text-xs"
            onClick={addRow}
            disabled={splitMut.isPending}
            style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px" }}
            data-testid="handout-library-split-add-range"
          >
            <Plus style={{ width: 12, height: 12 }} /> Weiterer Bereich
          </button>

          {error && (
            <div style={{ fontSize: 12, color: "var(--labs-error, #ff6b6b)" }} data-testid="handout-library-split-error">
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
            onClick={onClose}
            disabled={splitMut.isPending}
            data-testid="handout-library-split-cancel"
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="labs-btn-primary text-sm"
            onClick={() => { setError(null); splitMut.mutate(); }}
            disabled={splitMut.isPending || pageCountQuery.isLoading || !!pageCountQuery.error}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            data-testid="handout-library-split-submit"
          >
            {splitMut.isPending ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Scissors style={{ width: 14, height: 14 }} />}
            Aufteilen ({rows.length})
          </button>
        </div>
      </div>
    </div>
  );
}
