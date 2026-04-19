import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2, Scissors, Trash2, X } from "lucide-react";
import { handoutLibraryApi } from "@/lib/api";
import type { WhiskyHandoutLibraryEntry } from "@shared/schema";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface RangeMeta {
  from: number;
  to: number;
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

const THUMB_WIDTH = 110;

export default function HandoutLibraryPdfSplitterDialog({ open, onClose, entry, hostId }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [ranges, setRanges] = useState<RangeMeta[]>([]);
  const [pendingStart, setPendingStart] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const cancelLoadRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  // Page assignment map for highlighting & overlap prevention
  const pageToRangeIndex = useMemo(() => {
    const m = new Map<number, number>();
    ranges.forEach((r, idx) => {
      for (let p = r.from; p <= r.to; p++) m.set(p, idx);
    });
    return m;
  }, [ranges]);

  useEffect(() => {
    if (!open || !entry) return;
    setThumbs([]);
    setRanges([]);
    setPendingStart(null);
    setSubmitError(null);
    setPreviewError(null);
    setLoadingPages(true);
    cancelLoadRef.current = { cancelled: false };
    const localCancel = cancelLoadRef.current;
    (async () => {
      try {
        const loadingTask = getDocument({ url: entry.fileUrl });
        const pdf = await loadingTask.promise;
        const pageCount = pdf.numPages;
        const out: string[] = [];
        for (let i = 1; i <= pageCount; i++) {
          if (localCancel.cancelled) return;
          const page = await pdf.getPage(i);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = THUMB_WIDTH / baseViewport.width;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const canvasContext = canvas.getContext("2d");
          if (!canvasContext) throw new Error("canvas context");
          await page.render({ canvasContext, canvas, viewport }).promise;
          out.push(canvas.toDataURL("image/png"));
          if (!localCancel.cancelled) setThumbs([...out]);
        }
        if (!localCancel.cancelled) setLoadingPages(false);
      } catch (e: any) {
        if (!localCancel.cancelled) {
          setPreviewError(e?.message || t("labs.handoutSplitter.previewError"));
          setLoadingPages(false);
        }
      }
    })();
    return () => { localCancel.cancelled = true; };
  }, [open, entry?.id]);

  const splitMut = useMutation({
    mutationFn: () => {
      if (!entry) throw new Error("no entry");
      if (ranges.length === 0) throw new Error(t("labs.handoutSplitter.errorNoRanges"));
      const payload = ranges.map((r) => {
        if (!r.whiskyName.trim()) throw new Error(t("labs.handoutSplitter.errorMissingName"));
        return {
          from: r.from,
          to: r.to,
          whiskyName: r.whiskyName.trim(),
          distillery: r.distillery.trim() || undefined,
          whiskybaseId: r.whiskybaseId.trim() || undefined,
          title: r.title.trim() || undefined,
        };
      });
      return handoutLibraryApi.split(entry.id, hostId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handout-library", hostId] });
      onClose();
    },
    onError: (e: any) => setSubmitError(e?.message || "Split failed"),
  });

  if (!open || !entry) return null;
  const pageCount = thumbs.length;

  const onPageClick = (page: number) => {
    if (pageToRangeIndex.has(page)) return;
    if (pendingStart === null) {
      setPendingStart(page);
      return;
    }
    const from = Math.min(pendingStart, page);
    const to = Math.max(pendingStart, page);
    for (let p = from; p <= to; p++) {
      if (pageToRangeIndex.has(p)) {
        setSubmitError(t("labs.handoutSplitter.errorOverlap", { page: p }));
        setPendingStart(null);
        return;
      }
    }
    setRanges((prev) => [...prev, {
      from, to,
      whiskyName: "", distillery: "", whiskybaseId: "", title: "",
    }]);
    setPendingStart(null);
    setSubmitError(null);
  };

  const updateRange = (i: number, patch: Partial<RangeMeta>) => {
    setRanges((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const removeRange = (i: number) => setRanges((prev) => prev.filter((_, idx) => idx !== i));

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
          width: "100%", maxWidth: 920,
          maxHeight: "92vh",
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--labs-text)" }}>
              {t("labs.handoutSplitter.title")}
            </div>
            <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {entry.title || entry.whiskyName}
              {pageCount > 0 && ` · ${t("labs.handoutSplitter.subtitle", { pages: pageCount })}`}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="labs-btn-ghost"
            style={{ padding: 6 }}
            disabled={splitMut.isPending}
            data-testid="handout-library-split-close"
            aria-label={t("labs.handoutSplitter.cancel")}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ padding: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{
            fontSize: 12, color: "var(--labs-text-muted)",
            background: "var(--labs-surface-2, var(--labs-surface))",
            border: "1px solid var(--labs-border)",
            borderRadius: 8, padding: 10,
          }}>
            {t("labs.handoutSplitter.intro")}
            <div style={{ marginTop: 6, color: "var(--labs-text)" }}>
              {pendingStart === null
                ? t("labs.handoutSplitter.rangeStartHint")
                : t("labs.handoutSplitter.rangeFinishHint")}
            </div>
          </div>

          {loadingPages && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--labs-text-muted)" }} data-testid="handout-library-split-loading">
              <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
              {t("labs.handoutSplitter.loadingPages")}
            </div>
          )}
          {previewError && (
            <div style={{ fontSize: 12, color: "var(--labs-error, #ff6b6b)" }} data-testid="handout-library-split-preview-error">
              {previewError}
            </div>
          )}

          {thumbs.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(auto-fill, minmax(${THUMB_WIDTH}px, 1fr))`,
                gap: 8,
              }}
              data-testid="handout-library-split-thumb-grid"
            >
              {thumbs.map((src, idx) => {
                const page = idx + 1;
                const rangeIdx = pageToRangeIndex.get(page);
                const isStart = pendingStart === page;
                const assigned = rangeIdx !== undefined;
                const borderColor = assigned
                  ? "var(--labs-accent, #7ba8ff)"
                  : isStart
                  ? "var(--labs-warning, #f5b25c)"
                  : "var(--labs-border)";
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => onPageClick(page)}
                    disabled={assigned}
                    title={assigned ? `${t("labs.handoutSplitter.range")} ${rangeIdx! + 1}` : `${t("labs.handoutSplitter.range")} ${ranges.length + 1}`}
                    style={{
                      position: "relative",
                      padding: 0,
                      background: "var(--labs-surface)",
                      border: `2px solid ${borderColor}`,
                      borderRadius: 6,
                      cursor: assigned ? "default" : "pointer",
                      opacity: assigned ? 0.55 : 1,
                      overflow: "hidden",
                    }}
                    data-testid={`split-thumb-${page}`}
                  >
                    <img src={src} alt={`Page ${page}`} style={{ display: "block", width: "100%", height: "auto" }} />
                    <span style={{
                      position: "absolute", left: 4, top: 4,
                      fontSize: 10, padding: "1px 5px", borderRadius: 999,
                      background: "rgba(0,0,0,0.7)", color: "#fff",
                    }}>{page}</span>
                    {assigned && (
                      <span style={{
                        position: "absolute", right: 4, top: 4,
                        fontSize: 10, padding: "1px 5px", borderRadius: 999,
                        background: "var(--labs-accent, #7ba8ff)", color: "#001",
                        fontWeight: 700,
                      }}>{rangeIdx! + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)", marginBottom: 8 }}>
              {t("labs.handoutSplitter.rangesHeading")}
            </div>
            {ranges.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }} data-testid="handout-library-split-no-ranges">
                {t("labs.handoutSplitter.noRanges")}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ranges.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      border: "1px solid var(--labs-border)",
                      borderRadius: 10,
                      padding: 10,
                      background: "var(--labs-surface)",
                    }}
                    data-testid={`split-range-card-${i}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          padding: "2px 8px", borderRadius: 999,
                          background: "var(--labs-accent, #7ba8ff)", color: "#001",
                        }}>{i + 1}</span>
                        <span style={{ fontSize: 12, color: "var(--labs-text)" }}>
                          {t("labs.handoutSplitter.rangePages", { from: r.from, to: r.to })}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="labs-btn-ghost"
                        onClick={() => removeRange(i)}
                        disabled={splitMut.isPending}
                        style={{ padding: 6, color: "var(--labs-error, #ff6b6b)" }}
                        data-testid={`split-range-remove-${i}`}
                        aria-label={t("labs.handoutSplitter.removeRange")}
                        title={t("labs.handoutSplitter.removeRange")}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--labs-text-muted)" }}>
                        {t("labs.handoutSplitter.fieldWhiskyNameRequired")}
                        <input
                          className="labs-input"
                          value={r.whiskyName}
                          onChange={(e) => updateRange(i, { whiskyName: e.target.value })}
                          data-testid={`split-range-whiskyname-${i}`}
                        />
                      </label>
                      <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--labs-text-muted)" }}>
                        {t("labs.handoutSplitter.fieldDistillery")}
                        <input
                          className="labs-input"
                          value={r.distillery}
                          onChange={(e) => updateRange(i, { distillery: e.target.value })}
                          data-testid={`split-range-distillery-${i}`}
                        />
                      </label>
                      <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--labs-text-muted)" }}>
                        {t("labs.handoutSplitter.fieldWhiskybaseId")}
                        <input
                          className="labs-input"
                          value={r.whiskybaseId}
                          onChange={(e) => updateRange(i, { whiskybaseId: e.target.value })}
                          data-testid={`split-range-wbid-${i}`}
                        />
                      </label>
                      <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--labs-text-muted)" }}>
                        {t("labs.handoutSplitter.fieldTitle")}
                        <input
                          className="labs-input"
                          value={r.title}
                          onChange={(e) => updateRange(i, { title: e.target.value })}
                          data-testid={`split-range-title-${i}`}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {submitError && (
            <div style={{ fontSize: 12, color: "var(--labs-error, #ff6b6b)" }} data-testid="handout-library-split-error">
              {submitError}
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
            {t("labs.handoutSplitter.cancel")}
          </button>
          <button
            type="button"
            className="labs-btn-primary text-sm"
            onClick={() => { setSubmitError(null); splitMut.mutate(); }}
            disabled={splitMut.isPending || loadingPages || !!previewError || ranges.length === 0}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            data-testid="handout-library-split-submit"
          >
            {splitMut.isPending
              ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
              : <Scissors style={{ width: 14, height: 14 }} />}
            {splitMut.isPending
              ? t("labs.handoutSplitter.splitting")
              : t("labs.handoutSplitter.submit", { count: ranges.length })}
          </button>
        </div>
      </div>
    </div>
  );
}
