import { useParams } from "wouter";
import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Module2Shell from "@/components/m2/Module2Shell";
import M2BackButton from "@/components/m2/M2BackButton";
import { M2Loading, M2Error } from "@/components/m2/M2Feedback";
import { v, alpha } from "@/lib/themeVars";
import { Trophy, ChevronDown, Download, FileSpreadsheet, FileText, ClipboardList, Loader2 } from "lucide-react";
import { downloadBlob } from "@/lib/download";
import jsPDF from "jspdf";

const CONFETTI_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32", "#d4a256"];

function useConfetti(enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!enabled || fired.current || !containerRef.current) return;
    fired.current = true;
    const container = containerRef.current;
    const count = 35;
    const particles: HTMLSpanElement[] = [];

    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const size = Math.random() * 6 + 4;
      const x = Math.random() * 100;
      const drift = (Math.random() - 0.5) * 60;
      const delay = Math.random() * 0.4;
      const duration = 1.6 + Math.random() * 0.8;
      const rotation = Math.random() * 720 - 360;

      Object.assign(el.style, {
        position: "absolute",
        top: "-10px",
        left: `${x}%`,
        width: `${size}px`,
        height: `${size * (Math.random() > 0.5 ? 1 : 0.6)}px`,
        background: color,
        borderRadius: Math.random() > 0.5 ? "50%" : "1px",
        opacity: "1",
        pointerEvents: "none",
        zIndex: "100",
        animation: `confettiFall ${duration}s ease-out ${delay}s forwards`,
        transform: `translateX(0) rotate(0deg)`,
      });
      el.style.setProperty("--drift", `${drift}px`);
      el.style.setProperty("--rotation", `${rotation}deg`);

      container.appendChild(el);
      particles.push(el);
    }

    const timer = setTimeout(() => {
      particles.forEach((p) => p.remove());
    }, 3000);

    return () => {
      clearTimeout(timer);
      particles.forEach((p) => p.remove());
    };
  }, [enabled]);

  return containerRef;
}

interface WhiskyResult {
  whiskyId: string;
  name: string;
  distillery: string | null;
  age: string | null;
  abv: number | null;
  region: string | null;
  imageUrl: string | null;
  ratingCount: number;
  avgOverall: number | null;
  avgNose: number | null;
  avgTaste: number | null;
  avgFinish: number | null;
  avgBalance: number | null;
  ratings: Array<{
    participantId: string;
    overall: number | null;
    nose: number | null;
    taste: number | null;
    finish: number | null;
    balance: number | null;
    notes: string | null;
  }>;
}

interface ResultsData {
  tastingId: string;
  title: string;
  status: string;
  blindMode: boolean;
  whiskyCount: number;
  totalRatings: number;
  results: WhiskyResult[];
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  const pct = Math.min(value, 10) * 10;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: v.muted, width: 52, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: v.bg, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: v.accent, borderRadius: 3, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 12, color: v.text, fontFamily: "monospace", width: 28, textAlign: "right", flexShrink: 0 }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function WhiskyResultCard({ result, rank }: { result: WhiskyResult; rank: number }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const hasDetails = result.avgNose != null || result.avgTaste != null || result.avgFinish != null || result.avgBalance != null;

  const medalColors: Record<number, string> = { 0: v.gold, 1: v.silver, 2: v.bronze };
  const medalColor = medalColors[rank] ?? v.muted;

  return (
    <div
      style={{
        background: v.card,
        border: `1px solid ${v.border}`,
        borderRadius: 12,
        padding: 16,
      }}
      data-testid={`card-result-${result.whiskyId}`}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: rank < 3 ? 14 : 13,
            fontWeight: 700,
            background: rank < 3 ? alpha(medalColor, "33") : v.bg,
            color: medalColor,
            border: `1.5px solid ${rank < 3 ? medalColor : v.border}`,
            flexShrink: 0,
          }}
          data-testid={`badge-rank-${rank + 1}`}
        >
          {rank < 3 ? ["🥇", "🥈", "🥉"][rank] : rank + 1}
        </div>

        {result.imageUrl && (
          <img
            src={result.imageUrl}
            alt=""
            style={{ width: 36, height: 48, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: v.bg }}
            data-testid={`img-result-${result.whiskyId}`}
          />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: v.text,
              margin: "0 0 2px",
              fontFamily: "'Playfair Display', serif",
            }}
            data-testid={`text-result-name-${result.whiskyId}`}
          >
            {result.name}
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, fontSize: 12, color: v.muted }}>
            {result.distillery && <span>{result.distillery}</span>}
            {result.distillery && (result.age || result.abv || result.region) && <span>·</span>}
            {result.age && <span>{result.age}y</span>}
            {result.abv && <span>{result.abv}%</span>}
            {result.region && <span>{result.region}</span>}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: rank === 0 ? v.gold : v.accent,
              fontFamily: "'Playfair Display', serif",
              lineHeight: 1,
            }}
            data-testid={`text-avg-score-${result.whiskyId}`}
          >
            {result.avgOverall?.toFixed(1) ?? "—"}
          </div>
          <div style={{ fontSize: 11, color: v.muted, marginTop: 2 }}>
            {result.ratingCount} {result.ratingCount === 1 ? t("tastingResults.rating", "rating") : t("tastingResults.rating_plural", "ratings")}
          </div>
        </div>
      </div>

      {hasDetails && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: v.muted,
              fontSize: 12,
              fontWeight: 500,
              padding: 0,
              fontFamily: "system-ui, sans-serif",
            }}
            data-testid={`button-expand-${result.whiskyId}`}
          >
            <ChevronDown
              style={{
                width: 14,
                height: 14,
                transition: "transform 0.2s",
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
            {expanded ? t("tastingResults.hideBreakdown", "Hide breakdown") : t("tastingResults.showBreakdown", "Show breakdown")}
          </button>

          {expanded && (
            <div style={{ marginTop: 10, padding: "12px 0 0", borderTop: `1px solid ${v.border}` }}>
              <ScoreBar label={t("tastingResults.nose", "Nose")} value={result.avgNose} />
              <ScoreBar label={t("tastingResults.taste", "Taste")} value={result.avgTaste} />
              <ScoreBar label={t("tastingResults.finish", "Finish")} value={result.avgFinish} />
              <ScoreBar label={t("tastingResults.balance", "Balance")} value={result.avgBalance} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

async function exportFromServer(tastingId: string, format: "csv" | "xlsx"): Promise<boolean> {
  const res = await fetch(`/api/tastings/${tastingId}/results/export?format=${format}`);
  if (!res.ok) return false;
  const blob = await res.blob();
  const disp = res.headers.get("Content-Disposition");
  const filenameMatch = disp?.match(/filename="?([^"]+)"?/);
  const filename = filenameMatch?.[1] || `results.${format}`;
  downloadBlob(blob, filename);
  return true;
}

function exportPdf(data: ResultsData, t: (key: string, fallback?: string, opts?: any) => string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const marginX = 18;
  const contentW = pageW - marginX * 2;
  const accent: [number, number, number] = [212, 162, 86];
  const dark: [number, number, number] = [30, 30, 32];
  const muted: [number, number, number] = [120, 120, 125];
  const bg: [number, number, number] = [250, 248, 245];

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
    doc.text(t("m2.pdf.generatedBy", "Generated by CaskSense"), marginX, footerY);
    doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), pageW - marginX, footerY, { align: "right" });
  };

  drawPageBg();
  drawHeader();

  let y = 18;

  doc.setFontSize(10);
  doc.setTextColor(...accent);
  doc.setFont("helvetica", "bold");
  doc.text("CaskSense", pageW / 2, y, { align: "center" });
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...dark);
  doc.text(data.title, pageW / 2, y, { align: "center" });
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  doc.text(
    `${data.whiskyCount} ${data.whiskyCount === 1 ? t("tastingResults.whisky", "whisky") : t("tastingResults.whisky_plural", "whiskies")} · ${data.totalRatings} ${data.totalRatings === 1 ? t("tastingResults.rating", "rating") : t("tastingResults.rating_plural", "ratings")}`,
    pageW / 2,
    y,
    { align: "center" }
  );
  y += 8;

  doc.setDrawColor(...accent);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, pageW - marginX, y);
  y += 10;

  data.results.forEach((r, i) => {
    const blockH = 28;
    if (y + blockH > pageH - 20) {
      drawFooter();
      doc.addPage();
      drawPageBg();
      drawHeader();
      y = 18;
    }

    if (i < 3) {
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
      doc.roundedRect(marginX, y - 4, contentW, blockH - 2, 2, 2, "F");
      doc.setGState(new (doc as any).GState({ opacity: 1 }));
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...(i < 3 ? accent : dark));
    doc.text(`#${i + 1}`, marginX + 2, y + 2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...dark);
    const nameText = r.name.length > 35 ? r.name.slice(0, 33) + "…" : r.name;
    doc.text(nameText, marginX + 16, y + 2);

    if (r.distillery) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text(r.distillery, marginX + 16, y + 7);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...accent);
    doc.text(r.avgOverall?.toFixed(1) ?? "—", pageW - marginX, y + 3, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(`${r.ratingCount} ${r.ratingCount === 1 ? t("tastingResults.rating", "rating") : t("tastingResults.rating_plural", "ratings")}`, pageW - marginX, y + 8, { align: "right" });

    const barY = y + 12;
    const barLabels = [t("m2.rating.nose", "Nose"), t("m2.rating.taste", "Taste"), t("m2.rating.finish", "Finish"), t("m2.rating.balance", "Balance")];
    const barVals = [r.avgNose, r.avgTaste, r.avgFinish, r.avgBalance];
    const barMaxW = contentW - 50;

    barLabels.forEach((lbl, bi) => {
      const bx = marginX + 16;
      const by = barY + bi * 5;
      doc.setFontSize(6);
      doc.setTextColor(...muted);
      doc.text(lbl, bx, by + 1);
      doc.setFillColor(230, 225, 218);
      doc.roundedRect(bx + 24, by - 1.5, barMaxW * 0.25, 3, 1, 1, "F");
      if (barVals[bi] != null) {
        const pct = Math.min(barVals[bi]!, 10) / 10;
        doc.setFillColor(...accent);
        doc.roundedRect(bx + 24, by - 1.5, barMaxW * 0.25 * pct, 3, 1, 1, "F");
        doc.setFontSize(6);
        doc.setTextColor(...dark);
        doc.text(barVals[bi]!.toFixed(1), bx + 26 + barMaxW * 0.25, by + 1);
      }
    });

    y += blockH + 4;
  });

  drawFooter();
  doc.save(`${data.title.replace(/[^a-zA-Z0-9]/g, "_")}_results.pdf`);
}

function ExportDropdown({ data }: { data: ResultsData }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleServerExport = async (format: "csv" | "xlsx") => {
    setLoading(format);
    try {
      await exportFromServer(data.tastingId, format);
    } finally {
      setLoading(null);
      setOpen(false);
    }
  };

  const menuItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 500,
    color: v.text,
    background: "none",
    border: "none",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
    fontFamily: "system-ui, sans-serif",
    borderRadius: 6,
  };

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "10px",
          fontSize: 13,
          fontWeight: 600,
          background: alpha(v.accent, "26"),
          color: v.accent,
          border: `1px solid ${alpha(v.accent, "66")}`,
          borderRadius: 10,
          cursor: "pointer",
          fontFamily: "system-ui, sans-serif",
        }}
        data-testid="button-export-menu"
      >
        <Download style={{ width: 14, height: 14 }} />
        {t("tastingResults.export", "Export")}
        <ChevronDown style={{ width: 12, height: 12, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: v.card,
            border: `1px solid ${v.border}`,
            borderRadius: 10,
            padding: 4,
            zIndex: 50,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
          data-testid="dropdown-export-menu"
        >
          <button
            style={{ ...menuItemStyle, opacity: loading === "csv" ? 0.6 : 1 }}
            onClick={() => handleServerExport("csv")}
            disabled={!!loading}
            data-testid="button-export-csv"
          >
            {loading === "csv" ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Download style={{ width: 14, height: 14, color: v.muted }} />}
            {t("tastingResults.exportCsv", "CSV")}
          </button>
          <button
            style={{ ...menuItemStyle, opacity: loading === "xlsx" ? 0.6 : 1 }}
            onClick={() => handleServerExport("xlsx")}
            disabled={!!loading}
            data-testid="button-export-excel"
          >
            {loading === "xlsx" ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <FileSpreadsheet style={{ width: 14, height: 14, color: v.muted }} />}
            {t("tastingResults.exportExcel", "Excel")}
          </button>
          <button
            style={menuItemStyle}
            onClick={() => { exportPdf(data, t); setOpen(false); }}
            data-testid="button-export-pdf"
          >
            <FileText style={{ width: 14, height: 14, color: v.muted }} />
            {t("tastingResults.exportPdf", "PDF")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function M2TastingResults() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const tastingId = params.id;

  const { data, isLoading, isError, refetch } = useQuery<ResultsData>({
    queryKey: ["tasting-results", tastingId],
    queryFn: () =>
      fetch(`/api/tastings/${tastingId}/results`).then((r) => {
        if (!r.ok) throw new Error("Failed to load results");
        return r.json();
      }),
    enabled: !!tastingId,
  });

  const confettiRef = useConfetti(!!data && data.results.length > 0);

  if (isLoading) {
    return (
      <div style={{ padding: 16 }}>
        <M2Loading />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ padding: 16, textAlign: "center" }}>
        <M2Error onRetry={refetch} />
        <Link href="/m2/tastings" style={{ color: v.accent, fontSize: 13, marginTop: 12, display: "inline-block" }}>
          {t("tastingResults.backToHost", "Back to Tastings")}
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16, display: "flex", flexDirection: "column", gap: 16, position: "relative", overflow: "hidden" }} data-testid="m2-tasting-results-page" ref={confettiRef}>
      <M2BackButton />

      <style>{`@keyframes confettiFall { 0% { transform: translateX(0) rotate(0deg); opacity: 1; } 100% { transform: translateX(var(--drift)) rotate(var(--rotation)); opacity: 0; top: 100%; } }`}</style>

      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <Trophy style={{ width: 28, height: 28, color: v.gold, marginBottom: 8 }} />
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22,
            fontWeight: 700,
            color: v.text,
            margin: "0 0 4px",
          }}
          data-testid="text-results-title"
        >
          {data.title}
        </h1>
        <p style={{ fontSize: 13, color: v.muted, margin: 0 }}>
          {data.whiskyCount} {data.whiskyCount === 1 ? t("tastingResults.whisky", "whisky") : t("tastingResults.whisky_plural", "whiskies")} · {data.totalRatings} {data.totalRatings === 1 ? t("tastingResults.rating", "rating") : t("tastingResults.rating_plural", "ratings")}
        </p>
      </div>

      {data.results.length === 0 ? (
        <div
          style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 24, textAlign: "center" }}
          data-testid="text-no-results"
        >
          <p style={{ color: v.muted, fontSize: 14, margin: 0 }}>{t("tastingResults.noRatings", "No ratings yet.")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.results.map((result, i) => (
            <WhiskyResultCard key={result.whiskyId} result={result} rank={i} />
          ))}
        </div>
      )}

      <Link href={`/m2/tastings/session/${tastingId}/recap`} style={{ textDecoration: "none" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px",
            fontSize: 13,
            fontWeight: 600,
            color: v.accent,
            background: v.card,
            border: `1px solid ${v.border}`,
            borderRadius: 10,
            cursor: "pointer",
          }}
          data-testid="button-view-recap"
        >
          <ClipboardList style={{ width: 14, height: 14 }} />
          {t("tastingResults.viewRecap", "View Recap")}
        </div>
      </Link>

      <div style={{ display: "flex", gap: 8 }}>
        {data.results.length > 0 && <ExportDropdown data={data} />}
      </div>
    </div>
  );
}
