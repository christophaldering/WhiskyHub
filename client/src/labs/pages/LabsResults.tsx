import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useLabsBack } from "@/labs/LabsLayout";
import { ChevronLeft, Wine, Trophy, Users, Star, BarChart3, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Target, MessageCircle, Sparkles, Download, FileText, FileSpreadsheet, Clock, Monitor, Archive, Check, Info, Lock, Loader2 } from "lucide-react";
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { tastingApi, whiskyApi, ratingApi, collectionApi, getParticipantId, pidHeaders } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { getStatusConfig } from "@/labs/utils/statusConfig";
import LabsScoreRing from "@/labs/components/LabsScoreRing";
import WhiskyImage from "@/labs/components/WhiskyImage";
import CoverImage16x9 from "@/labs/components/CoverImage16x9";
import { downloadBlob } from "@/lib/download";
import { saveJsPdf } from "@/lib/pdf";
import { stripGuestSuffix, formatScore } from "@/lib/utils";
import jsPDF from "jspdf";

async function labsExportFromServer(tastingId: string, format: "csv" | "xlsx"): Promise<boolean> {
  const res = await fetch(`/api/tastings/${tastingId}/results/export?format=${format}`);
  if (!res.ok) return false;
  const blob = await res.blob();
  const disp = res.headers.get("Content-Disposition");
  const filenameMatch = disp?.match(/filename="?([^"]+)"?/);
  const filename = filenameMatch?.[1] || `results.${format}`;
  downloadBlob(blob, filename);
  return true;
}

function labsExportPdf(tasting: any, whiskyResults: any[], t: (key: string) => string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const marginX = 18;
  const contentW = pageW - marginX * 2;
  const accent: [number, number, number] = [212, 162, 86];
  const dark: [number, number, number] = [30, 28, 24];
  const muted: [number, number, number] = [138, 126, 109];
  const bg: [number, number, number] = [26, 23, 20];
  const textColor: [number, number, number] = [245, 240, 232];

  const drawPageBg = () => {
    doc.setFillColor(...bg);
    doc.rect(0, 0, pageW, pageH, "F");
  };

  const drawHeader = () => {
    doc.setFillColor(...accent);
    doc.rect(0, 0, pageW, 3, "F");
  };

  const drawFooter = () => {
    const footerY = pageH - 12;
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.3);
    doc.line(marginX, footerY - 4, pageW - marginX, footerY - 4);
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(t("resultsUi.generatedBy"), marginX, footerY);
    doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), pageW - marginX, footerY, { align: "right" });
  };

  drawPageBg();
  drawHeader();

  let y = 18;

  doc.setFontSize(10);
  doc.setTextColor(...accent);
  doc.setFont("helvetica", "bold");
  doc.text(t("resultsUi.generatedBy"), pageW / 2, y, { align: "center" });
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...textColor);
  doc.text(tasting.title || t("resultsUi.tastingResults"), pageW / 2, y, { align: "center" });
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  const totalRatings = whiskyResults.reduce((s, w) => s + w.ratingCount, 0);
  doc.text(
    `${whiskyResults.length} ${whiskyResults.length === 1 ? t("resultsUi.whisky") : t("resultsUi.whiskies")} \u00B7 ${totalRatings} ${totalRatings === 1 ? t("resultsUi.rating") : t("resultsUi.ratings")}`,
    pageW / 2, y, { align: "center" }
  );
  y += 8;

  doc.setDrawColor(...accent);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, pageW - marginX, y);
  y += 10;

  const sorted = [...whiskyResults].sort((a, b) => (b.avgOverall || 0) - (a.avgOverall || 0));

  sorted.forEach((r, i) => {
    const blockH = 28;
    if (y + blockH > pageH - 20) {
      drawFooter();
      doc.addPage();
      drawPageBg();
      drawHeader();
      y = 18;
    }

    if (i < 3) {
      doc.setFillColor(
        Math.round(bg[0] + (accent[0] - bg[0]) * 0.12),
        Math.round(bg[1] + (accent[1] - bg[1]) * 0.12),
        Math.round(bg[2] + (accent[2] - bg[2]) * 0.12),
      );
      doc.roundedRect(marginX, y - 4, contentW, blockH - 2, 2, 2, "F");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...(i < 3 ? accent : textColor));
    doc.text(`#${i + 1}`, marginX + 2, y + 2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...textColor);
    const nameText = (r.name || t("resultsUi.unknown")).length > 35 ? (r.name || t("resultsUi.unknown")).slice(0, 33) + "\u2026" : (r.name || t("resultsUi.unknown"));
    doc.text(nameText, marginX + 16, y + 2);

    if (r.distillery) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text(r.distillery, marginX + 16, y + 7);
    }

    const resultsScaleMax = (tasting?.ratingScale as number) ?? 100;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...accent);
    doc.text(formatScore(r.avgOverall ?? 0), pageW - marginX, y + 3, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(`${r.ratingCount} ${r.ratingCount === 1 ? t("resultsUi.rating") : t("resultsUi.ratings")}`, pageW - marginX, y + 8, { align: "right" });

    const barY = y + 12;
    const barLabels = [t("resultsUi.nose"), t("resultsUi.taste"), t("resultsUi.finish")];
    const barVals = [r.avgNose, r.avgTaste, r.avgFinish];
    const barMaxW = contentW - 50;

    barLabels.forEach((lbl, bi) => {
      const bx = marginX + 16;
      const by = barY + bi * 5;
      doc.setFontSize(6);
      doc.setTextColor(...muted);
      doc.text(lbl, bx, by + 1);
      doc.setFillColor(60, 55, 45);
      doc.roundedRect(bx + 24, by - 1.5, barMaxW * 0.25, 3, 1, 1, "F");
      if (barVals[bi] != null) {
        const userVal = barVals[bi]!;
        const pct = resultsScaleMax > 0 ? Math.min(userVal, resultsScaleMax) / resultsScaleMax : 0;
        doc.setFillColor(...accent);
        doc.roundedRect(bx + 24, by - 1.5, barMaxW * 0.25 * pct, 3, 1, 1, "F");
        doc.setFontSize(6);
        doc.setTextColor(...textColor);
        doc.text(formatScore(userVal), bx + 26 + barMaxW * 0.25, by + 1);
      }
    });

    y += blockH + 4;
  });

  drawFooter();
  const safeName = (tasting.title || "results").replace(/[^a-zA-Z0-9]/g, "_");
  saveJsPdf(doc, `${safeName}_results.pdf`);
}

function LabsExportDropdown({ tastingId, tasting, whiskyResults }: { tastingId: string; tasting: any; whiskyResults: any[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
      const close = () => setOpen(false);
      window.addEventListener("scroll", close, true);
      window.addEventListener("resize", close);
      return () => {
        window.removeEventListener("scroll", close, true);
        window.removeEventListener("resize", close);
      };
    }
  }, [open]);

  const handleServerExport = async (format: "csv" | "xlsx") => {
    setLoading(format);
    try {
      await labsExportFromServer(tastingId, format);
    } finally {
      setLoading(null);
      setOpen(false);
    }
  };

  return (
    <div style={{ display: "inline-block" }}>
      <button
        ref={btnRef}
        className="labs-btn-secondary flex items-center gap-2"
        onClick={() => setOpen(!open)}
        data-testid="button-labs-export-menu"
      >
        <Download className="w-4 h-4" />
        {t("resultsUi.export")}
      </button>
      {open && pos && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: pos.top,
            right: pos.right,
            background: "var(--labs-surface-elevated)",
            border: "1px solid var(--labs-border)",
            borderRadius: 10,
            padding: 6,
            minWidth: 160,
            zIndex: 9999,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
          data-testid="dropdown-labs-export-menu"
        >
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "8px 12px",
              background: "transparent",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              color: "var(--labs-text)",
              fontSize: 13,
              fontFamily: "inherit",
              opacity: loading === "csv" ? 0.6 : 1,
            }}
            onClick={() => handleServerExport("csv")}
            disabled={loading === "csv"}
            data-testid="button-labs-export-csv"
          >
            {loading === "csv" ? <span className="labs-pulse-dot" style={{ width: 8, height: 8 }} /> : <FileText style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} />}
            {t("resultsUi.csv")}
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "8px 12px",
              background: "transparent",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              color: "var(--labs-text)",
              fontSize: 13,
              fontFamily: "inherit",
              opacity: loading === "xlsx" ? 0.6 : 1,
            }}
            onClick={() => handleServerExport("xlsx")}
            disabled={loading === "xlsx"}
            data-testid="button-labs-export-excel"
          >
            {loading === "xlsx" ? <span className="labs-pulse-dot" style={{ width: 8, height: 8 }} /> : <FileSpreadsheet style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} />}
            {t("resultsUi.excel")}
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "8px 12px",
              background: "transparent",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              color: "var(--labs-text)",
              fontSize: 13,
              fontFamily: "inherit",
            }}
            onClick={() => { labsExportPdf(tasting, whiskyResults, t); setOpen(false); }}
            data-testid="button-labs-export-pdf"
          >
            <Download style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} />
            {t("resultsUi.pdf")}
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const MEDAL_LABELS_KEYS = ["resultsUi.gold", "resultsUi.silver", "resultsUi.bronze"];

function ViewerDimBar({ label, value, maxScore }: { label: string; value: number | null; maxScore: number }) {
  const pct = value != null ? Math.min((value / maxScore) * 100, 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <span style={{ width: 60, fontSize: 13, fontWeight: 600, color: "var(--labs-text-muted)", textAlign: "right" }}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--labs-accent)", borderRadius: 4, transition: "width 800ms cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </div>
      <span style={{ width: 36, fontSize: 13, fontWeight: 700, color: "var(--labs-text)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {value != null ? formatScore(value) : "\u2014"}
      </span>
    </div>
  );
}

function PresentationViewerOverlay({ tasting, slideIndex, sorted, participantCount, totalRatings, maxScore, participants, whiskies }: {
  tasting: { title?: string; date?: string; location?: string; coverImageUrl?: string; blindMode?: boolean };
  slideIndex: number;
  sorted: { id: string; name?: string; distillery?: string; imageUrl?: string; ratingCount: number; avgOverall: number | null; avgNose: number | null; avgTaste: number | null; avgFinish: number | null; overallStdDev: number | null }[];
  participantCount: number;
  totalRatings: number;
  maxScore: number;
  participants?: any[];
  whiskies?: any[];
}) {
  const { t } = useTranslation();
  const slides: { type: string; data?: Record<string, unknown> }[] = useMemo(() => {
    const s: { type: string; data?: Record<string, unknown> }[] = [];
    s.push({ type: "title" });
    if (sorted.length > 1) s.push({ type: "lineup" });
    if (participants && participants.length > 0) s.push({ type: "tasters" });
    if (sorted.length > 0) s.push({ type: "funstats" });
    if (sorted.length > 3) s.push({ type: "transition", data: { title: t("resultsUi.theTasting"), subtitle: t("resultsUi.theTastingDesc") } });
    const reversed = [...sorted].reverse();
    reversed.forEach((w, i) => {
      const rank = sorted.length - i;
      s.push({ type: "whisky", data: { whisky: w, rank } });
    });
    if (sorted.length >= 3) {
      s.push({ type: "transition", data: { title: t("resultsUi.andTheWinnerIs"), subtitle: t("resultsUi.andTheWinnerIsDesc") } });
      s.push({ type: "winner", data: { whisky: sorted[0] } });
      s.push({ type: "podium", data: { top3: sorted.slice(0, 3) } });
    }
    s.push({ type: "outro" });
    return s;
  }, [sorted, participants]);

  const clamped = Math.max(0, Math.min(slideIndex, slides.length - 1));
  const slide = slides[clamped];
  const totalSlides = slides.length;
  const hasCover = !!tasting.coverImageUrl;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: "var(--z-overlay)" as any, background: "var(--labs-bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}
      data-testid="viewer-overlay"
    >
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes viewer-shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes viewer-glow { 0%, 100% { box-shadow: 0 0 40px rgba(255,215,0,0.15); } 50% { box-shadow: 0 0 80px rgba(255,215,0,0.3); } }
        .viewer-winner-title { background: linear-gradient(90deg, var(--labs-accent), #e8c878, var(--labs-accent)); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: viewer-shimmer 3s linear infinite; }
      `}</style>
      <div style={{ position: "absolute", top: 12, left: 16, right: 16, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", pointerEvents: "none" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--labs-accent)", padding: "5px 12px", borderRadius: 8, background: "rgba(212,162,86,0.1)", border: "1px solid rgba(212,162,86,0.2)", backdropFilter: "blur(8px)", letterSpacing: "0.04em", pointerEvents: "auto" }} data-testid="viewer-live-badge">
          <span style={{ width: 7, height: 7, borderRadius: 4, background: "var(--labs-accent)", animation: "pulse 2s infinite" }} />
          {t("resultsUi.live")}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text-muted)", padding: "4px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(8px)", fontVariantNumeric: "tabular-nums" }} data-testid="viewer-slide-indicator">
          {clamped + 1} / {totalSlides}
        </span>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={clamped}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3 }}
            style={{ width: "100%", height: "100%" }}
          >
            {slide.type === "title" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "40px 24px", position: "relative", overflow: "hidden" }}>
                {hasCover && <CoverImage16x9 src={tasting.coverImageUrl} asBackdrop backdropOpacity={0.18} testId="viewer-title-cover-bg" />}
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 18, margin: "0 auto 24px", background: "linear-gradient(135deg, rgba(212,162,86,0.15), rgba(212,162,86,0.05))", border: "1px solid rgba(212,162,86,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Wine style={{ width: 28, height: 28, color: "var(--labs-accent)" }} />
                  </div>
                  <h1 className="labs-serif" style={{ fontSize: "clamp(28px, 5vw, 56px)", fontWeight: 700, color: "var(--labs-text)", marginBottom: 12, lineHeight: 1.05 }}>
                    {tasting.title || t("resultsUi.tastingResults")}
                  </h1>
                  <p style={{ fontSize: "clamp(14px, 2vw, 18px)", color: "var(--labs-text-muted)", marginBottom: 32 }}>
                    {[tasting.date, tasting.location].filter(Boolean).join(" · ")}
                  </p>
                  <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
                    {[
                      { icon: <Wine style={{ width: 18, height: 18 }} />, value: sorted.length, label: t("resultsUi.whiskies") },
                      { icon: <Users style={{ width: 18, height: 18 }} />, value: participantCount, label: t("resultsUi.tasters") },
                      { icon: <Star style={{ width: 18, height: 18 }} />, value: totalRatings, label: t("resultsUi.ratings") },
                    ].map((s, i) => (
                      <div key={i} style={{ padding: "14px 24px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                        <div style={{ color: "var(--labs-accent)", marginBottom: 6, display: "flex", justifyContent: "center" }}>{s.icon}</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {slide.type === "lineup" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "40px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <Wine style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--labs-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{t("resultsUi.tonightsLineup")}</span>
                </div>
                <h2 className="labs-serif" style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 700, color: "var(--labs-text)", margin: "4px 0 32px", textAlign: "center" }}>
                  {(whiskies || sorted).length} {t("resultsUi.whiskiesTasted")}
                </h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", maxWidth: 800 }}>
                  {(whiskies || sorted).map((w: any, i: number) => (
                    <div key={w.id} style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center", width: "clamp(90px, 14vw, 130px)" }}>
                      <div style={{ marginBottom: 6, display: "flex", justifyContent: "center" }}>
                        <WhiskyImage imageUrl={w.imageUrl} name={w.name || "?"} size={50} height={60} whiskyId={w.id} />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tasting.blindMode ? `Dram ${String.fromCharCode(65 + i)}` : (w.name || `#${i + 1}`)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {slide.type === "tasters" && (() => {
              const names = (participants || []).filter((p: any) => !p.excludedFromResults).map((p: any) => stripGuestSuffix(p.participant?.name || p.participant?.email || p.name || p.email || "Anonymous"));
              return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "40px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <Users style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--labs-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{t("resultsUi.theTasters")}</span>
                  </div>
                  <h2 className="labs-serif" style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 700, color: "var(--labs-text)", margin: "4px 0 28px", textAlign: "center" }}>
                    {names.length} {t("resultsUi.palatesOneMission")}
                  </h2>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 650, marginBottom: 28 }}>
                    {names.map((name, i) => (
                      <div key={i} style={{ padding: "7px 16px", borderRadius: 16, background: "rgba(212,162,86,0.06)", border: "1px solid rgba(212,162,86,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, var(--labs-accent), #e8c878)", color: "var(--labs-bg)", fontSize: 10, fontWeight: 700 }}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)" }}>{name}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>{totalRatings}</div>
                      <div style={{ fontSize: 10, color: "var(--labs-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("resultsUi.ratings")}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>{sorted.length}</div>
                      <div style={{ fontSize: 10, color: "var(--labs-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("resultsUi.whiskies")}</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {slide.type === "funstats" && (() => {
              const groupAvg = sorted.length > 0 ? sorted.reduce((s, w) => s + (w.avgOverall || 0), 0) / sorted.length : 0;
              const withStdDev = sorted.filter(w => w.overallStdDev != null && w.ratingCount >= 2);
              const mostAgreed = [...withStdDev].sort((a, b) => (a.overallStdDev || 999) - (b.overallStdDev || 999))[0];
              const mostDebated = [...withStdDev].sort((a, b) => (b.overallStdDev || 0) - (a.overallStdDev || 0))[0];
              return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "40px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <Sparkles style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--labs-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Highlights</span>
                  </div>
                  <h2 className="labs-serif" style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 700, color: "var(--labs-text)", margin: "4px 0 32px", textAlign: "center" }}>
                    By the Numbers
                  </h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, maxWidth: 600, width: "100%" }}>
                    <div style={{ padding: "16px 20px", borderRadius: 16, background: "rgba(212,162,86,0.06)", border: "1px solid rgba(212,162,86,0.2)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <BarChart3 style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--labs-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Group Average</span>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-text)" }}>{formatScore(groupAvg)}</div>
                    </div>
                    {mostAgreed && (
                      <div style={{ padding: "16px 20px", borderRadius: 16, background: "rgba(212,162,86,0.06)", border: "1px solid rgba(212,162,86,0.2)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <Target style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--labs-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Most Agreed</span>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text)" }}>{mostAgreed.name || t("resultsUi.unknown")}</div>
                      </div>
                    )}
                    {mostDebated && mostDebated.id !== mostAgreed?.id && (
                      <div style={{ padding: "16px 20px", borderRadius: 16, background: "rgba(212,162,86,0.06)", border: "1px solid rgba(212,162,86,0.2)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <MessageCircle style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--labs-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Most Debated</span>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text)" }}>{mostDebated.name || t("resultsUi.unknown")}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {slide.type === "transition" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "40px 24px" }}>
                <Trophy style={{ width: 40, height: 40, color: "var(--labs-accent)", marginBottom: 20 }} />
                <h2 className="labs-serif" style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 700, color: "var(--labs-text)", lineHeight: 1.05, maxWidth: 600 }}>
                  {(slide.data?.title as string) || ""}
                </h2>
                {slide.data?.subtitle && (
                  <p style={{ fontSize: "clamp(14px, 2vw, 18px)", color: "var(--labs-text-muted)", marginTop: 12, maxWidth: 450 }}>
                    {slide.data.subtitle as string}
                  </p>
                )}
              </div>
            )}

            {slide.type === "whisky" && (() => {
              const w = slide.data!.whisky as typeof sorted[number];
              const rank = slide.data!.rank as number;
              const isTop3 = rank <= 3;
              return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "32px 24px", maxWidth: 600, margin: "0 auto", width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    {isTop3 && <span style={{ width: 32, height: 32, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, background: MEDAL_COLORS[rank - 1], color: rank === 1 ? "#78350f" : rank === 2 ? "#1f2937" : "#451a03", boxShadow: `0 4px 12px ${MEDAL_COLORS[rank - 1]}66` }}>{rank}</span>}
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--labs-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>#{rank} {t("ui.of")} {sorted.length}</span>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <WhiskyImage imageUrl={w.imageUrl} name={w.name || "?"} size={120} height={140} whiskyId={w.id} />
                  </div>
                  <h2 className="labs-serif" style={{ fontSize: "clamp(22px, 4vw, 38px)", fontWeight: 700, color: "var(--labs-text)", textAlign: "center", marginBottom: 4, lineHeight: 1.1 }}>{w.name || t("resultsUi.unknown")}</h2>
                  {w.distillery && <p style={{ fontSize: 15, color: "var(--labs-text-muted)", marginBottom: 4, textAlign: "center" }}>{w.distillery}</p>}
                  <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap", justifyContent: "center" }}>
                    {w.ratingCount > 0 && <span style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "flex", alignItems: "center", gap: 4 }}><Users style={{ width: 11, height: 11 }} /> {w.ratingCount} {w.ratingCount === 1 ? t("resultsUi.rating") : t("resultsUi.ratings")}</span>}
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <LabsScoreRing score={w.avgOverall ?? 0} maxScore={maxScore} size={100} strokeWidth={6} showValue />
                  </div>
                  <div style={{ width: "100%", maxWidth: 380 }}>
                    <ViewerDimBar label={t("resultsUi.nose")} value={w.avgNose} maxScore={maxScore} />
                    <ViewerDimBar label={t("resultsUi.taste")} value={w.avgTaste} maxScore={maxScore} />
                    <ViewerDimBar label={t("resultsUi.finish")} value={w.avgFinish} maxScore={maxScore} />
                  </div>
                </div>
              );
            })()}

            {slide.type === "winner" && (() => {
              const w = slide.data!.whisky as typeof sorted[number];
              return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "32px 24px", textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", background: MEDAL_COLORS[0], color: "#78350f", marginBottom: 8, boxShadow: `0 0 30px ${MEDAL_COLORS[0]}66` }}>
                    <Trophy style={{ width: 22, height: 22 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--labs-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>Tonight's Winner</span>
                  <div style={{ marginBottom: 14 }}>
                    <WhiskyImage imageUrl={w.imageUrl} name={w.name || "?"} size={140} height={170} whiskyId={w.id} />
                  </div>
                  <h2 className="labs-serif viewer-winner-title" style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 700, marginBottom: 6, lineHeight: 1.1 }}>
                    {w.name || t("resultsUi.unknown")}
                  </h2>
                  {w.distillery && <p style={{ fontSize: 15, color: "var(--labs-text-muted)", marginBottom: 16 }}>{w.distillery}</p>}
                  <div style={{ borderRadius: "50%", animation: "viewer-glow 3s ease-in-out infinite" }}>
                    <LabsScoreRing score={w.avgOverall ?? 0} maxScore={maxScore} size={120} strokeWidth={7} showValue />
                  </div>
                </div>
              );
            })()}

            {slide.type === "podium" && (() => {
              const top3 = slide.data!.top3 as typeof sorted;
              const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
              const podiumHeights = [160, 200, 130];
              const displayOrder = top3.length >= 3 ? [1, 0, 2] : top3.map((_, i) => i);
              return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "32px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
                    <Trophy style={{ width: 28, height: 28, color: "var(--labs-accent)" }} />
                    <h2 className="labs-serif" style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 700, color: "var(--labs-text)", margin: 0 }}>The Podium</h2>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "clamp(12px, 3vw, 32px)", maxWidth: 700, width: "100%" }}>
                    {podiumOrder.map((w, i) => {
                      const actualRank = displayOrder[i];
                      const h = podiumHeights[i] || 130;
                      return (
                        <div key={w.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, maxWidth: 200 }}>
                          <WhiskyImage imageUrl={w.imageUrl} name={w.name || "?"} size={actualRank === 0 ? 85 : 65} height={actualRank === 0 ? 90 : 70} whiskyId={w.id} />
                          <p className="labs-serif" style={{ fontSize: actualRank === 0 ? 16 : 13, fontWeight: 700, color: "var(--labs-text)", textAlign: "center", marginTop: 8, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{w.name || t("resultsUi.unknown")}</p>
                          <span style={{ fontSize: 20, fontWeight: 700, color: "var(--labs-accent)", marginBottom: 8, fontVariantNumeric: "tabular-nums" }}>{formatScore(w.avgOverall)}</span>
                          <div style={{ width: "100%", height: h, borderRadius: "14px 14px 0 0", background: `linear-gradient(180deg, ${MEDAL_COLORS[actualRank]}22 0%, ${MEDAL_COLORS[actualRank]}08 100%)`, border: `1px solid ${MEDAL_COLORS[actualRank]}33`, borderBottom: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 18 }}>
                            <span style={{ width: 42, height: 42, borderRadius: 21, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, background: MEDAL_COLORS[actualRank], color: actualRank === 0 ? "#78350f" : actualRank === 1 ? "#1f2937" : "#451a03", boxShadow: `0 4px 16px ${MEDAL_COLORS[actualRank]}55` }}>{actualRank + 1}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--labs-text-muted)", marginTop: 7, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t(MEDAL_LABELS_KEYS[actualRank])}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {slide.type === "outro" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "40px 24px" }}>
                <div style={{ width: 72, height: 72, borderRadius: 20, margin: "0 auto 24px", background: "linear-gradient(135deg, rgba(212,162,86,0.12), rgba(212,162,86,0.04))", border: "1px solid rgba(212,162,86,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Wine style={{ width: 32, height: 32, color: "var(--labs-accent)" }} />
                </div>
                <h2 className="labs-serif" style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 700, color: "var(--labs-text)", marginBottom: 12 }}>Slàinte Mhath!</h2>
                <p style={{ fontSize: "clamp(14px, 2vw, 18px)", color: "var(--labs-text-muted)", maxWidth: 400, lineHeight: 1.6 }}>Thank you for sharing this tasting journey with us.</p>
                <p style={{ fontSize: 13, color: "var(--labs-text-muted)", marginTop: 28, opacity: 0.6 }}>{tasting.title} · CaskSense Labs</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 16px 20px", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(transparent, var(--labs-bg))", zIndex: 10 }}>
        <div style={{ display: "flex", gap: 3, alignItems: "center", maxWidth: 300, overflow: "hidden" }}>
          {slides.map((_, i) => {
            const distance = Math.abs(i - clamped);
            const isActive = i === clamped;
            const isNear = distance <= 3;
            const isFar = distance > 5;
            if (totalSlides > 15 && isFar) return null;
            return (
              <div
                key={i}
                style={{
                  width: isActive ? 18 : (totalSlides > 15 && !isNear ? 4 : 6),
                  height: isActive ? 6 : (totalSlides > 15 && !isNear ? 4 : 6),
                  borderRadius: 3,
                  background: isActive ? "var(--labs-accent)" : `rgba(255,255,255,${isNear ? 0.15 : 0.08})`,
                  transition: "all 0.25s ease",
                  opacity: totalSlides > 15 && distance > 4 ? 0.5 : 1,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface LabsResultsProps {
  params: { id: string };
}

export default function LabsResults({ params }: LabsResultsProps) {
  const tastingId = params.id;
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const goBack = useLabsBack("/labs/tastings");
  const [expandedWhisky, setExpandedWhisky] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState<Record<string, boolean>>({});
  const [previousRatingsMap, setPreviousRatingsMap] = useState<Record<string, { date: string; tastingTitle: string; nose: number; taste: number; finish: number; overall: number }[]>>({});
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: tasting, isLoading: loadingTasting, isError: tastingError } = useQuery({
    queryKey: ["tasting", tastingId],
    queryFn: () => tastingApi.get(tastingId),
    enabled: !!tastingId,
    refetchInterval: 5000,
  });

  const archiveMut = useMutation({
    mutationFn: () => tastingApi.updateStatus(tastingId, "archived", undefined, currentParticipant?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
      setShowArchiveDialog(false);
    },
  });

  const { data: whiskies, isLoading: loadingWhiskies } = useQuery({
    queryKey: ["whiskies", tastingId],
    queryFn: () => whiskyApi.getForTasting(tastingId),
    enabled: !!tastingId,
  });

  const { data: allRatings, isLoading: loadingRatings } = useQuery({
    queryKey: ["tastingRatings", tastingId],
    queryFn: () => ratingApi.getForTasting(tastingId),
    enabled: !!tastingId,
  });

  const { data: participants, isLoading: loadingParticipants } = useQuery({
    queryKey: ["tastingParticipants", tastingId],
    queryFn: () => tastingApi.getParticipants(tastingId),
    enabled: !!tastingId,
  });

  const isLoading = loadingTasting || loadingWhiskies || loadingRatings || loadingParticipants;
  const { t } = useTranslation();
  const qc = useQueryClient();
  const pid = getParticipantId();

  const { data: collectionCheck } = useQuery({
    queryKey: ["collection-check", pid],
    queryFn: () => collectionApi.check(pid!),
    enabled: !!pid,
    staleTime: 30_000,
  });

  const addToCollectionMut = useMutation({
    mutationFn: (data: { name: string; distillery?: string; whiskybaseId?: string }) =>
      collectionApi.add(pid!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collection-check", pid] }),
  });

  const isInCollection = (name: string, distillery?: string, whiskybaseId?: string) => {
    if (!collectionCheck?.items) return false;
    if (whiskybaseId && collectionCheck.items[`wb:${whiskybaseId}`]) return true;
    const namePart = (name || "").trim().toLowerCase();
    const distPart = (distillery || "").trim().toLowerCase();
    const compositeKey = distPart ? `${namePart}|||${distPart}` : namePart;
    return !!(collectionCheck.items[compositeKey] || collectionCheck.items[namePart]);
  };

  const isRevealed = tasting?.status === "reveal" || tasting?.status === "archived" || tasting?.status === "completed";

  const { data: tastingHistoryData } = useQuery({
    queryKey: ["tasting-history", currentParticipant?.id],
    queryFn: async () => {
      const pid = currentParticipant!.id;
      const res = await fetch(`/api/participants/${pid}/tasting-history`, { headers: { "x-participant-id": pid } });
      if (!res.ok) return { tastings: [] };
      const resp = await res.json();
      return Array.isArray(resp) ? { tastings: resp } : resp;
    },
    enabled: !!currentParticipant?.id && !!isRevealed && !!whiskies?.length,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!tastingHistoryData?.tastings?.length || !whiskies?.length || !tastingId) return;

    const fingerprint = (w: any) => {
      if (w.whiskybaseId) return `wb:${w.whiskybaseId}`;
      return `fp:${(w.name || "").toLowerCase().trim()}|${(w.distillery || "").toLowerCase().trim()}`;
    };

    const currentFpToId: Record<string, string> = {};
    for (const w of whiskies as any[]) {
      const fp = fingerprint(w);
      if (fp !== "fp:|") currentFpToId[fp] = w.id;
    }

    const map: Record<string, { date: string; tastingTitle: string; nose: number; taste: number; finish: number; overall: number }[]> = {};
    for (const t of tastingHistoryData.tastings) {
      if (t.id === tastingId) continue;
      for (const w of t.whiskies || []) {
        if (!w.myRating) continue;
        const fp = fingerprint(w);
        const currentId = currentFpToId[fp];
        if (!currentId) continue;
        if (!map[currentId]) map[currentId] = [];
        map[currentId].push({
          date: t.date || "",
          tastingTitle: t.title || "",
          nose: w.myRating.nose,
          taste: w.myRating.taste,
          finish: w.myRating.finish,
          overall: w.myRating.overall,
        });
      }
    }
    for (const wid of Object.keys(map)) {
      map[wid].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    setPreviousRatingsMap(map);
  }, [tastingHistoryData, whiskies, tastingId]);

  const whiskyResults = useMemo(() => {
    const sMax = (tasting?.ratingScale as number) || 100;
    const excludedPids = new Set(
      (participants || []).filter((p: any) => p.excludedFromResults).map((p: any) => p.participantId || p.id)
    );
    const includedRatings = excludedPids.size > 0
      ? (allRatings || []).filter((r: any) => !excludedPids.has(r.participantId))
      : (allRatings || []);
    const toUserScale = (v: number | null | undefined) => {
      if (v == null) return null;
      if (sMax !== 100 && v > sMax) {
        return Math.round((v / 100) * sMax * 10) / 10;
      }
      return v;
    };
    const roundForScale = (v: number) => sMax === 100 ? Math.round(v) : Math.round(v * 10) / 10;
    return (whiskies || []).map((w: any) => {
      const ratings = includedRatings.filter((r: any) => r.whiskyId === w.id).map((r: any) => ({
        ...r,
        nose: toUserScale(r.nose),
        taste: toUserScale(r.taste),
        finish: toUserScale(r.finish),
        overall: toUserScale(r.overall),
      }));
      const count = ratings.length;

      const avg = (dim: string) => {
        const vals = ratings.map((r: any) => r[dim]).filter((v: any) => v != null && v > 0);
        if (vals.length === 0) return null;
        return roundForScale(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
      };

      const minMax = (dim: string) => {
        const vals = ratings.map((r: any) => r[dim]).filter((v: any) => v != null && v > 0);
        if (vals.length === 0) return { min: null, max: null, spread: null };
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        return { min, max, spread: max - min };
      };

      const stdDev = (dim: string) => {
        const vals = ratings.map((r: any) => r[dim]).filter((v: any) => v != null && v > 0);
        if (vals.length < 2) return null;
        const mean = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
        const variance = vals.reduce((sum: number, v: number) => sum + (v - mean) ** 2, 0) / vals.length;
        return Math.sqrt(variance);
      };

      const avgOverall = avg("overall");
      const avgNose = avg("nose");
      const avgTaste = avg("taste");
      const avgFinish = avg("finish");
      const overallRange = minMax("overall");
      const overallStdDev = stdDev("overall");

      const myRating = currentParticipant
        ? ratings.find((r: any) => r.participantId === currentParticipant.id)
        : null;

      const myDelta = myRating?.overall != null && avgOverall != null
        ? myRating.overall - avgOverall
        : null;

      return {
        ...w,
        ratings,
        ratingCount: count,
        avgOverall,
        avgNose,
        avgTaste,
        avgFinish,
        myRating,
        myDelta,
        overallRange,
        overallStdDev,
      };
    });
  }, [whiskies, allRatings, participants, currentParticipant, tasting?.ratingScale]);

  const sorted = useMemo(() => [...whiskyResults].sort((a, b) => (b.avgOverall || 0) - (a.avgOverall || 0)), [whiskyResults]);

  const summaryData = useMemo(() => {
    const rated = sorted.filter(w => w.avgOverall != null);
    const groupAvg = rated.length > 0
      ? Math.round(rated.reduce((s, w) => s + (w.avgOverall || 0), 0) / rated.length)
      : null;

    const myRated = sorted.filter(w => w.myRating?.overall != null);
    const userAvg = myRated.length > 0
      ? Math.round(myRated.reduce((s, w) => s + (w.myRating?.overall || 0), 0) / myRated.length)
      : null;

    const withStdDev = sorted.filter(w => w.overallStdDev != null && w.ratingCount >= 2);
    const mostAgreed = withStdDev.length > 0
      ? withStdDev.reduce((best, w) => (w.overallStdDev! < best.overallStdDev!) ? w : best)
      : null;
    const mostDebated = withStdDev.length > 0
      ? withStdDev.reduce((best, w) => (w.overallStdDev! > best.overallStdDev!) ? w : best)
      : null;

    const consensusWhiskies = withStdDev.filter(w => w.overallStdDev! <= 5);
    const debatedWhiskies = withStdDev.filter(w => w.overallStdDev! > 10);

    const myHighlights = myRated
      .filter(w => w.myDelta != null && w.myDelta > 5)
      .sort((a, b) => (b.myDelta || 0) - (a.myDelta || 0));

    const myLowlights = myRated
      .filter(w => w.myDelta != null && w.myDelta < -5)
      .sort((a, b) => (a.myDelta || 0) - (b.myDelta || 0));

    return { groupAvg, userAvg, mostAgreed, mostDebated, consensusWhiskies, debatedWhiskies, myHighlights, myLowlights };
  }, [sorted]);

  if (tastingError) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <svg className="labs-empty-icon" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="0.5" opacity="0.15"/>
          <line x1="14" y1="14" x2="26" y2="26" stroke="currentColor" strokeWidth="0.8" opacity="0.2"/>
          <line x1="26" y1="14" x2="14" y2="26" stroke="currentColor" strokeWidth="0.8" opacity="0.2"/>
        </svg>
        <h2 className="labs-empty-title">Results not available</h2>
        <p className="labs-empty-sub">This tasting may have been removed or the link is incorrect.</p>
        <button
          className="labs-empty-action"
          onClick={goBack}
          data-testid="results-error-back"
        >
          Back to Tastings
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="labs-page labs-fade-in" style={{ minHeight: "60vh", display: "flex", flexDirection: "column", gap: 16, padding: "2rem 1.5rem" }}>
        <div className="labs-skeleton" style={{ height: 22, width: "45%", marginBottom: 4 }} />
        <div className="labs-skeleton" style={{ height: 14, width: "65%" }} />
        <div style={{ height: 12 }} />
        <div className="labs-skeleton" style={{ height: 56, width: "100%", borderRadius: "var(--labs-radius)" }} />
        <div className="labs-skeleton" style={{ height: 56, width: "100%", borderRadius: "var(--labs-radius)" }} />
        <div className="labs-skeleton" style={{ height: 56, width: "100%", borderRadius: "var(--labs-radius)" }} />
      </div>
    );
  }

  if (!tasting) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <svg className="labs-empty-icon" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="0.5" opacity="0.15"/>
          <line x1="14" y1="14" x2="26" y2="26" stroke="currentColor" strokeWidth="0.8" opacity="0.2"/>
          <line x1="26" y1="14" x2="14" y2="26" stroke="currentColor" strokeWidth="0.8" opacity="0.2"/>
        </svg>
        <h2 className="labs-empty-title">Results not available</h2>
        <p className="labs-empty-sub">This tasting could not be loaded.</p>
        <button
          className="labs-empty-action"
          onClick={goBack}
          data-testid="results-back-tastings"
        >
          Back to Tastings
        </button>
      </div>
    );
  }

  const topWhisky = sorted[0];
  const excludedPidsForCount = new Set(
    (participants || []).filter((p: any) => p.excludedFromResults).map((p: any) => p.participantId || p.id)
  );
  const includedParticipantsCount = (participants || []).filter((p: any) => !p.excludedFromResults).length;
  const includedAllRatings = excludedPidsForCount.size > 0
    ? (allRatings || []).filter((r: any) => !excludedPidsForCount.has(r.participantId))
    : (allRatings || []);
  const uniqueRaters = new Set(includedAllRatings.map((r: any) => r.participantId)).size;
  const totalRatings = includedAllRatings.length;
  const participantCount = Math.max(includedParticipantsCount, uniqueRaters, totalRatings > 0 ? 1 : 0);
  const maxScore = tasting?.ratingScale || 100;
  const isHost = currentParticipant?.id === tasting.hostId;
  const presentationActive = tasting.presentationSlide != null && !isHost;

  const getWhiskyDisplayName = (
    whisky: any,
    index: number
  ) => {
    if (!tasting.blindMode) return whisky.name;
    const isRevealed = (tasting.guidedRevealStep ?? 0) >= 1 ||
                        tasting.status === 'archived';
    return isRevealed
      ? whisky.name
      : `Sample ${index + 1}`;
  };

  if (presentationActive) {
    return (
      <PresentationViewerOverlay
        tasting={tasting}
        slideIndex={tasting.presentationSlide!}
        sorted={sorted}
        participantCount={participantCount}
        totalRatings={totalRatings}
        maxScore={maxScore}
        participants={participants}
        whiskies={whiskies}
      />
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedWhisky(expandedWhisky === id ? null : id);
  };

  const fmt = (v: number | null | undefined) => v == null ? null : formatScore(v);

  const DeltaIndicator = ({ delta }: { delta: number | null }) => {
    if (delta == null) return null;
    const rounded = Math.round(delta * 10) / 10;
    const absDelta = Math.abs(rounded);
    if (absDelta < 1) return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium" style={{ color: "var(--labs-text-muted)" }}>
        <Minus className="w-3 h-3" /> ±0
      </span>
    );
    if (rounded > 0) return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium" style={{ color: "var(--labs-success)" }}>
        <TrendingUp className="w-3 h-3" /> +{formatScore(rounded)}
      </span>
    );
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium" style={{ color: "var(--labs-danger)" }}>
        <TrendingDown className="w-3 h-3" /> {formatScore(rounded)}
      </span>
    );
  };

  const AgreementBadge = ({ stdDev, count }: { stdDev: number | null; count: number }) => {
    if (stdDev == null || count < 2) return null;
    if (stdDev <= 5) return (
      <span className="labs-badge labs-badge-success" data-testid="badge-consensus">
        <Target className="w-3 h-3" /> Consensus
      </span>
    );
    if (stdDev > 10) return (
      <span className="labs-badge labs-badge-danger" data-testid="badge-debated">
        <MessageCircle className="w-3 h-3" /> Debated
      </span>
    );
    return null;
  };

  return (
    <div className="labs-page labs-fade-in">
      <button
        onClick={goBack}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="results-back-btn"
      >
        <ChevronLeft className="w-4 h-4" />
        Tastings
      </button>

      <div className="mb-6 labs-stagger-1 labs-fade-in">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: "1 1 0", minWidth: 200 }}>
            <h1
              className="labs-h2 mb-1"
              style={{ color: "var(--labs-text)" }}
              data-testid="results-title"
            >
              {tasting.title}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
                {tasting.date}{(tasting as any).time ? ` · ${(tasting as any).time}` : ""} · {tasting.location}
              </p>
          {tasting.guidedMode && (
            <span
              className="labs-badge"
              style={{ background: "var(--labs-info-muted)", color: "var(--labs-info)" }}
              data-testid="results-guided-badge"
            >
              Guided Tasting
            </span>
          )}
          {tasting.status === "archived" && (
            <span
              className={getStatusConfig("archived").cssClass}
              data-testid="results-archived-badge"
            >
              <Lock className="w-3 h-3" />
              {t(getStatusConfig("archived").labelKey, getStatusConfig("archived").fallbackLabel)}
            </span>
          )}
            </div>
          </div>
          {sorted.length > 0 && (
            <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
              {currentParticipant?.id === tasting.hostId && (tasting.status === "archived" || tasting.status === "completed" || tasting.status === "closed" || tasting.status === "reveal") && (
                <button
                  className="labs-btn-primary flex items-center gap-2"
                  onClick={() => navigate(`/labs/results/${tastingId}/present`)}
                  data-testid="button-labs-present-results"
                >
                  <Monitor className="w-4 h-4" />
                  Present
                </button>
              )}
              {currentParticipant?.id === tasting.hostId && tasting.status === "reveal" && (
                <button
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                  style={{ background: "var(--labs-surface)", border: "1px solid var(--labs-border)", color: "var(--labs-text)", cursor: "pointer", fontFamily: "inherit" }}
                  onClick={() => setShowArchiveDialog(true)}
                  data-testid="button-archive-tasting"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </button>
              )}
              <LabsExportDropdown tastingId={tastingId} tasting={tasting} whiskyResults={whiskyResults} />
            </div>
          )}
        </div>
      </div>

      <div
        className="labs-card-elevated p-5 mb-6 labs-stagger-2 labs-fade-in"
        data-testid="results-summary-card"
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          <span className="labs-section-label" style={{ marginBottom: 0 }}>Session Summary</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <Wine className="w-4 h-4 mx-auto mb-1" style={{ color: "var(--labs-accent)" }} />
            <p className="text-lg font-bold" style={{ color: "var(--labs-text)" }}>{whiskies?.length || 0}</p>
            <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>Whiskies</p>
          </div>
          <div className="text-center">
            <Users className="w-4 h-4 mx-auto mb-1" style={{ color: "var(--labs-accent)" }} />
            <p className="text-lg font-bold" style={{ color: "var(--labs-text)" }}>{participantCount}</p>
            <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>Tasters</p>
          </div>
          <div className="text-center">
            <BarChart3 className="w-4 h-4 mx-auto mb-1" style={{ color: "var(--labs-accent)" }} />
            <p className="text-lg font-bold" style={{ color: "var(--labs-text)" }}>{summaryData.groupAvg ?? "—"}</p>
            <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>Group Avg</p>
          </div>
          <div className="text-center">
            <Star className="w-4 h-4 mx-auto mb-1" style={{ color: "var(--labs-accent)" }} />
            <p className="text-lg font-bold" style={{ color: "var(--labs-text)" }}>{summaryData.userAvg ?? "—"}</p>
            <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>Your Avg</p>
          </div>
        </div>

        {(summaryData.mostAgreed || summaryData.mostDebated) && (
          <div
            className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3"
            style={{ borderTop: "1px solid var(--labs-border-subtle)" }}
          >
            {summaryData.mostAgreed && (
              <div className="flex items-start gap-2" data-testid="results-most-agreed">
                <Target className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--labs-success)" }} />
                <div>
                  <p className="text-[11px] font-medium" style={{ color: "var(--labs-success)" }}>Most Agreed</p>
                  <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                    {summaryData.mostAgreed.name || t("resultsUi.unknown")}
                  </p>
                </div>
              </div>
            )}
            {summaryData.mostDebated && (
              <div className="flex items-start gap-2" data-testid="results-most-debated">
                <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--labs-danger)" }} />
                <div>
                  <p className="text-[11px] font-medium" style={{ color: "var(--labs-danger)" }}>Most Debated</p>
                  <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                    {summaryData.mostDebated.name || t("resultsUi.unknown")}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {maxScore !== 100 && (
        <p className="text-xs flex items-center gap-1 mb-4 labs-fade-in" style={{ color: "var(--labs-text-muted)", opacity: 0.7 }} data-testid="results-normalized-hint">
          <Info className="w-3 h-3 flex-shrink-0" />
          {t("labs.scoresNormalizedHint", "Scores normalized to 100-point scale")}
        </p>
      )}

      {topWhisky && topWhisky.avgOverall != null && (
        <div
          className="labs-card-elevated p-5 mb-6 labs-stagger-3 labs-fade-in"
          data-testid="results-top-whisky"
        >
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
            <span className="labs-section-label" style={{ marginBottom: 0 }}>
              Top Rated
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="labs-h3" style={{ color: "var(--labs-text)" }}>
                {topWhisky.name || t("resultsUi.unknown")}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--labs-text-muted)" }}>
                {[topWhisky.distillery, topWhisky.age ? `${topWhisky.age}y` : null, topWhisky.abv ? `${topWhisky.abv}%` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <LabsScoreRing
              score={topWhisky.avgOverall}
              maxScore={maxScore}
              size={64}
              strokeWidth={4}
              color="var(--labs-accent)"
              label="avg"
            />
          </div>
        </div>
      )}

      {summaryData.myHighlights.length > 0 && (
        <div className="mb-6 labs-fade-in">
          <div className="labs-section-label flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" style={{ color: "var(--labs-success)" }} />
            Your Highlights
          </div>
          <div className="space-y-2">
            {summaryData.myHighlights.slice(0, 3).map(w => (
              <div key={w.id} className="labs-card p-3 flex items-center justify-between" data-testid={`results-highlight-${w.id}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>{w.name || t("resultsUi.unknown")}</p>
                  <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                    You: {fmt(w.myRating?.overall)} · Group: {fmt(w.avgOverall)}
                  </p>
                </div>
                <DeltaIndicator delta={w.myDelta} />
              </div>
            ))}
          </div>
        </div>
      )}

      {summaryData.consensusWhiskies.length > 0 && (
        <div className="mb-6 labs-fade-in">
          <div className="labs-section-label flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" style={{ color: "var(--labs-success)" }} />
            Group Consensus
          </div>
          <div className="space-y-2">
            {summaryData.consensusWhiskies.slice(0, 3).map(w => (
              <div key={w.id} className="labs-card p-3 flex items-center justify-between" data-testid={`results-consensus-${w.id}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>{w.name || t("resultsUi.unknown")}</p>
                  <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                    Avg: {fmt(w.avgOverall)} · Range: {fmt(w.overallRange.min)}–{fmt(w.overallRange.max)}
                  </p>
                </div>
                <AgreementBadge stdDev={w.overallStdDev} count={w.ratingCount} />
              </div>
            ))}
          </div>
        </div>
      )}

      {summaryData.debatedWhiskies.length > 0 && (
        <div className="mb-6 labs-fade-in">
          <div className="labs-section-label flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" style={{ color: "var(--labs-danger)" }} />
            Most Debated
          </div>
          <div className="space-y-2">
            {summaryData.debatedWhiskies.slice(0, 3).map(w => (
              <div key={w.id} className="labs-card p-3 flex items-center justify-between" data-testid={`results-debated-${w.id}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>{w.name || t("resultsUi.unknown")}</p>
                  <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                    Avg: {fmt(w.avgOverall)} · Range: {fmt(w.overallRange.min)}–{fmt(w.overallRange.max)}
                  </p>
                </div>
                <AgreementBadge stdDev={w.overallStdDev} count={w.ratingCount} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="labs-section-label labs-fade-in">Rankings</div>

      <div className="space-y-2 mb-8 labs-fade-in">
        {sorted.map((w, idx) => {
          const isExpanded = expandedWhisky === w.id;
          const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;

          return (
            <div key={w.id} className="labs-card overflow-hidden" data-testid={`results-whisky-${w.id}`}>
              <div
                className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => toggleExpand(w.id)}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{
                    background: idx < 3 ? "var(--labs-accent-muted)" : "var(--labs-surface-elevated)",
                    color: idx < 3 ? "var(--labs-accent)" : "var(--labs-text-muted)",
                  }}
                >
                  {medal || idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>
                      {w.name || t("resultsUi.unknown")}
                    </p>
                    <AgreementBadge stdDev={w.overallStdDev} count={w.ratingCount} />
                    {previousRatingsMap[w.id]?.length > 0 && isRevealed && (
                      <span className="inline-flex items-center gap-0.5 text-[11px]" style={{ color: "var(--labs-accent)", opacity: 0.8 }} data-testid={`badge-prev-${w.id}`}>
                        <Clock className="w-3 h-3" />
                        {(() => {
                          const mostRecent = previousRatingsMap[w.id][0];
                          const d = w.myRating?.overall != null ? w.myRating.overall - mostRecent.overall : null;
                          if (d == null) return null;
                          const rd = fmt(d)!;
                          return <span className="font-semibold" style={{ color: d > 0 ? "var(--labs-success)" : d < 0 ? "var(--labs-danger)" : "var(--labs-text-muted)" }}>{rd > 0 ? `+${rd}` : rd === 0 ? "=" : rd}</span>;
                        })()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs truncate" style={{ color: "var(--labs-text-muted)" }}>
                      {[w.distillery, w.region].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {w.myDelta != null && (
                      <DeltaIndicator delta={w.myDelta} />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {w.avgOverall != null ? (
                    <LabsScoreRing
                      score={w.avgOverall}
                      maxScore={maxScore}
                      size={40}
                      strokeWidth={3}
                    />
                  ) : (
                    <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>—</span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
                  ) : (
                    <ChevronDown className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div
                  className="px-4 pb-4 pt-1"
                  style={{ borderTop: "1px solid var(--labs-border-subtle)" }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    {[
                      { label: t("resultsUi.overall", "Overall"), value: w.avgOverall, isOverall: true },
                      { label: t("resultsUi.nose"), value: w.avgNose },
                      { label: t("resultsUi.taste"), value: w.avgTaste },
                      { label: t("resultsUi.finish"), value: w.avgFinish },
                    ].map((dim) => (
                      <div
                        key={dim.label}
                        className="flex items-center justify-between"
                        data-testid={dim.isOverall ? `text-overall-results-${w.id}` : undefined}
                      >
                        <span
                          className="text-xs"
                          style={{ color: "var(--labs-text-muted)", fontWeight: dim.isOverall ? 600 : undefined }}
                        >
                          {dim.label}
                        </span>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: dim.isOverall ? "var(--labs-accent)" : "var(--labs-text-secondary)" }}
                        >
                          {dim.value != null ? fmt(dim.value) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs mb-2" style={{ color: "var(--labs-text-muted)" }}>
                    <span>{w.ratingCount} rating{w.ratingCount !== 1 ? "s" : ""}</span>
                    {w.abv && <span>{w.abv}% ABV</span>}
                    {w.age && <span>{w.age} years</span>}
                  </div>

                  {w.overallRange.min != null && w.overallRange.max != null && w.ratingCount >= 2 && (
                    <div
                      className="p-3 rounded-lg mb-3"
                      style={{ background: "var(--labs-surface-elevated)" }}
                      data-testid={`results-variance-${w.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium" style={{ color: "var(--labs-text-muted)" }}>Score Range</span>
                        <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                          Spread: {fmt(w.overallRange.spread)}
                        </span>
                      </div>
                      <div className="relative h-2 rounded-full" style={{ background: "var(--labs-border)" }}>
                        <div
                          className="absolute h-full rounded-full"
                          style={{
                            background: "var(--labs-accent)",
                            opacity: 0.75,
                            left: `${w.overallRange.min}%`,
                            width: `${Math.max(w.overallRange.max - w.overallRange.min, 2)}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[11px] font-semibold" style={{ color: "var(--labs-text-secondary)" }}>
                          {fmt(w.overallRange.min)}
                        </span>
                        <span className="text-[11px] font-semibold" style={{ color: "var(--labs-text-secondary)" }}>
                          {fmt(w.overallRange.max)}
                        </span>
                      </div>
                    </div>
                  )}

                  {w.caskType && (
                    <span className="labs-badge labs-badge-accent">{w.caskType}</span>
                  )}

                  {pid && (
                    <div className="mt-2">
                      {isInCollection(w.name, w.distillery) ? (
                        <span
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg"
                          style={{ background: "rgba(76, 175, 80, 0.12)", color: "#4CAF50" }}
                          data-testid={`badge-in-collection-${w.id}`}
                        >
                          <Check className="w-3 h-3" />
                          {t("myTastePage.addedToCollection")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors"
                          style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                          onClick={(e) => { e.stopPropagation(); addToCollectionMut.mutate({ name: w.name, distillery: w.distillery, whiskybaseId: w.whiskybaseId }); }}
                          disabled={addToCollectionMut.isPending}
                          data-testid={`button-add-collection-${w.id}`}
                        >
                          <Archive className="w-3 h-3" />
                          {addToCollectionMut.isPending ? "..." : t("myTastePage.addToCollection")}
                        </button>
                      )}
                    </div>
                  )}

                  {w.myRating && (
                    <div
                      className="mt-3 p-3 rounded-lg"
                      style={{ background: "var(--labs-accent-glow)", border: "1px solid var(--labs-border-subtle)" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />
                          <span className="text-xs font-medium" style={{ color: "var(--labs-accent)" }}>
                            Your Rating
                          </span>
                        </div>
                        {w.myDelta != null && (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>vs Group:</span>
                            <DeltaIndicator delta={w.myDelta} />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { label: "N", value: w.myRating.nose },
                          { label: "T", value: w.myRating.taste },
                          { label: "F", value: w.myRating.finish },
                          { label: "Ø", value: w.myRating.overall },
                        ].map((d) => (
                          <div key={d.label}>
                            <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{d.label}</p>
                            <p className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>
                              {d.value != null ? fmt(d.value) : "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                      {w.myRating.notes && (
                        <p className="text-xs mt-2 italic" style={{ color: "var(--labs-text-secondary)" }}>
                          "{w.myRating.notes}"
                        </p>
                      )}
                    </div>
                  )}

                  {(() => {
                    const prevList = previousRatingsMap[w.id];
                    if (!prevList || prevList.length === 0) return null;
                    if (!isRevealed) return null;
                    const isHistExpanded = historyExpanded[w.id] || false;
                    const mostRecent = prevList[0];
                    const histDelta = w.myRating?.overall != null ? w.myRating.overall - mostRecent.overall : null;
                    return (
                      <div className="mt-3" data-testid={`results-history-${w.id}`}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setHistoryExpanded(prev => ({ ...prev, [w.id]: !isHistExpanded })); }}
                          style={{ background: "color-mix(in srgb, var(--labs-accent) 6%, transparent)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 12px", borderRadius: 8, fontFamily: "inherit" }}
                          data-testid={`button-toggle-history-${w.id}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />
                            <span className="text-xs font-medium" style={{ color: "var(--labs-text)" }}>
                              Previously rated ({prevList.length})
                            </span>
                            {histDelta != null && (
                              <span className="text-[11px] font-semibold" style={{ color: histDelta > 0 ? "var(--labs-success)" : histDelta < 0 ? "var(--labs-danger)" : "var(--labs-text-muted)" }}>
                                {histDelta > 0 ? `↑+${fmt(histDelta)}` : histDelta < 0 ? `↓${fmt(Math.abs(histDelta))}` : "="}
                              </span>
                            )}
                          </div>
                          <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)", transform: isHistExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                        </button>
                        {isHistExpanded && (
                          <div className="mt-2 space-y-2">
                            {prevList.map((pr, idx) => (
                              <div key={idx} className="p-3 rounded-lg" style={{ background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border-subtle)" }} data-testid={`prev-result-${w.id}-${idx}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                                    {pr.tastingTitle || new Date(pr.date).toLocaleDateString()}
                                  </span>
                                  <span className="text-sm font-bold" style={{ color: "var(--labs-accent)" }}>{fmt(pr.overall)}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  {[
                                    { label: "N", value: pr.nose },
                                    { label: "T", value: pr.taste },
                                    { label: "F", value: pr.finish },
                                  ].map(d => (
                                    <div key={d.label}>
                                      <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{d.label}</p>
                                      <p className="text-xs font-semibold" style={{ color: "var(--labs-text-secondary)" }}>{d.value != null ? fmt(d.value) : "—"}</p>
                                    </div>
                                  ))}
                                </div>
                                {pr.date && <p className="text-[11px] mt-1" style={{ color: "var(--labs-text-muted)" }}>{new Date(pr.date).toLocaleDateString()}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(!allRatings || allRatings.length === 0) && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center',
          gap: '1rem'
        }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
            fontSize: '18px', color: 'var(--labs-text-muted)'
          }}>
            {t('results.noRatingsYet')}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--labs-text-muted)', opacity: 0.6 }}>
            {t('results.waitingForTasters')}
          </div>
        </div>
      )}

      {pid && sorted.length > 0 && (
        <button
          className="labs-card labs-fade-in"
          style={{
            width: "100%", padding: "20px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14,
            background: "linear-gradient(135deg, color-mix(in srgb, var(--labs-accent) 6%, var(--labs-surface)), color-mix(in srgb, var(--labs-gold, var(--labs-accent)) 4%, var(--labs-surface)))",
            border: "1px solid color-mix(in srgb, var(--labs-accent) 15%, transparent)",
            cursor: "pointer", fontFamily: "inherit", textAlign: "left",
          }}
          onClick={async () => {
            const lang = navigator.language?.startsWith("de") ? "de" : "en";
            fetch(`/api/participants/${pid}/connoisseur-report`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...pidHeaders() },
              body: JSON.stringify({ language: lang, tastingId }),
            }).catch(() => {});
            navigate(`/labs/taste/connoisseur?tastingId=${tastingId}&generating=1`);
          }}
          data-testid="cta-connoisseur-report"
        >
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: "linear-gradient(135deg, var(--labs-accent), var(--labs-gold, var(--labs-accent)))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles className="w-5 h-5" style={{ color: "#fff" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", margin: 0 }}>
              {t("labs.connoisseur.navLabel", "Connoisseur Report")}
            </p>
            <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: "2px 0 0" }}>
              {t("labs.connoisseur.navDesc", "AI analysis of your whisky personality")}
            </p>
          </div>
          <ChevronDown className="w-4 h-4" style={{ color: "var(--labs-accent)", transform: "rotate(-90deg)" }} />
        </button>
      )}

      <div className="flex justify-center gap-3 pb-8">
        <button
          className="labs-btn-secondary"
          onClick={goBack}
          data-testid="results-all-tastings"
        >
          All Tastings
        </button>
        <button
          className="labs-btn-ghost"
          onClick={() => navigate(`/labs/tastings/${tastingId}`)}
          data-testid="results-tasting-detail"
        >
          Tasting Details
        </button>
      </div>

      {showArchiveDialog && createPortal(
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", padding: 20,
          }}
          onClick={() => setShowArchiveDialog(false)}
          data-testid="archive-dialog-overlay"
        >
          <div
            className="labs-card"
            style={{
              maxWidth: 400, width: "100%", padding: 24,
              background: "var(--labs-surface)", borderRadius: 16,
            }}
            onClick={e => e.stopPropagation()}
            data-testid="archive-dialog"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "var(--labs-accent-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Archive style={{ width: 20, height: 20, color: "var(--labs-accent)" }} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--labs-text)", margin: 0 }}>
                Archive Tasting
              </h3>
            </div>
            <p style={{ fontSize: 14, color: "var(--labs-text-muted)", lineHeight: 1.5, marginBottom: 8 }}>
              {t("resultsUi.finalizeDesc")}
            </p>
            <ul style={{ fontSize: 13, color: "var(--labs-text-muted)", lineHeight: 1.7, paddingLeft: 20, marginBottom: 20 }}>
              <li>{t("resultsUi.ratingsNoEdit")}</li>
              <li>{t("resultsUi.tastingArchived")}</li>
              <li>{t("resultsUi.adminReopen")}</li>
            </ul>
            {archiveMut.isError && (
              <p style={{ fontSize: 13, color: "var(--labs-danger)", marginBottom: 12 }}>
                {t("resultsUi.failedToArchive")}
              </p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="labs-btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setShowArchiveDialog(false)}
                data-testid="archive-dialog-cancel"
              >
                Cancel
              </button>
              <button
                className="labs-btn-primary flex items-center justify-center gap-2"
                style={{ flex: 1 }}
                onClick={() => archiveMut.mutate()}
                disabled={archiveMut.isPending}
                data-testid="archive-dialog-confirm"
              >
                {archiveMut.isPending ? (
                  <Loader2 className="w-4 h-4" style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {archiveMut.isPending ? "Archiving..." : "Archive Now"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}