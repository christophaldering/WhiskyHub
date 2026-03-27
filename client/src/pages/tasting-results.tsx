import { useParams } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import SimpleShell from "@/components/simple/simple-shell";
import { Trophy, ChevronDown, Download, FileSpreadsheet, FileText, ClipboardList, Loader2, Check, Archive } from "lucide-react";
import BackButton from "@/components/back-button";
import { c, cardStyle } from "@/lib/theme";
import { downloadBlob } from "@/lib/download";
import { getParticipantId, collectionApi } from "@/lib/api";
import jsPDF from "jspdf";
import { saveJsPdf } from "@/lib/pdf";

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
  ratings: Array<{
    participantId: string;
    overall: number | null;
    nose: number | null;
    taste: number | null;
    finish: number | null;
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

const medals = [c.gold, c.silver, c.bronze];

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  const pct = Math.min(value, 10) * 10;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: c.muted, width: 52, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: c.bg, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: c.accent, borderRadius: 3, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 12, color: c.text, fontFamily: "monospace", width: 28, textAlign: "right", flexShrink: 0 }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function WhiskyResultCard({ result, rank, inCollection, onAddToCollection, addPending }: { result: WhiskyResult; rank: number; inCollection?: boolean; onAddToCollection?: () => void; addPending?: boolean }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const hasDetails = result.avgNose != null || result.avgTaste != null || result.avgFinish != null;
  const medalColor = rank < 3 ? medals[rank] : c.muted;

  return (
    <div style={cardStyle} data-testid={`card-result-${result.whiskyId}`}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: rank < 3 ? 14 : 13,
          fontWeight: 700,
          background: rank < 3 ? `${medalColor}20` : c.bg,
          color: medalColor,
          border: `1.5px solid ${rank < 3 ? medalColor + "60" : c.border}`,
          flexShrink: 0,
        }} data-testid={`badge-rank-${rank + 1}`}>
          {rank + 1}
        </div>

        {result.imageUrl && (
          <img
            src={result.imageUrl}
            alt=""
            style={{ width: 36, height: 48, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: c.bg }}
            data-testid={`img-result-${result.whiskyId}`}
          />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 700,
            color: c.text,
            margin: "0 0 2px",
            fontFamily: "'Playfair Display', serif",
          }} data-testid={`text-result-name-${result.whiskyId}`}>
            {result.name}
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, fontSize: 12, color: c.muted }}>
            {result.distillery && <span>{result.distillery}</span>}
            {result.distillery && (result.age || result.abv || result.region) && <span>·</span>}
            {result.age && <span>{result.age}y</span>}
            {result.abv && <span>{result.abv}%</span>}
            {result.region && <span>{result.region}</span>}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            color: rank === 0 ? c.gold : c.accent,
            fontFamily: "'Playfair Display', serif",
            lineHeight: 1,
          }} data-testid={`text-avg-score-${result.whiskyId}`}>
            {result.avgOverall?.toFixed(1) ?? "—"}
          </div>
          <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>
            {result.ratingCount} {result.ratingCount === 1 ? t("tastingResults.rating") : t("tastingResults.rating_plural")}
          </div>
        </div>
      </div>

      {onAddToCollection && (
        <div style={{ marginTop: 8 }}>
          {inCollection ? (
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 8, background: "rgba(76, 175, 80, 0.12)", color: "#4CAF50" }}
              data-testid={`badge-in-collection-${result.whiskyId}`}
            >
              <Check style={{ width: 12, height: 12 }} />
              {t("myTastePage.addedToCollection")}
            </span>
          ) : (
            <button
              type="button"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 8, background: `${c.accent}15`, color: c.accent, border: "none", cursor: "pointer", fontFamily: "inherit" }}
              onClick={(e) => { e.stopPropagation(); onAddToCollection(); }}
              disabled={addPending}
              data-testid={`button-add-collection-${result.whiskyId}`}
            >
              <Archive style={{ width: 12, height: 12 }} />
              {addPending ? "..." : t("myTastePage.addToCollection")}
            </button>
          )}
        </div>
      )}

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
              color: c.muted,
              fontSize: 12,
              fontWeight: 500,
              padding: 0,
              fontFamily: "system-ui, sans-serif",
            }}
            data-testid={`button-expand-${result.whiskyId}`}
          >
            <ChevronDown style={{
              width: 14,
              height: 14,
              transition: "transform 0.2s",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            }} />
            {expanded ? t("tastingResults.hideBreakdown") : t("tastingResults.showBreakdown")}
          </button>

          {expanded && (
            <div style={{ marginTop: 10, padding: "12px 0 0", borderTop: `1px solid ${c.border}` }}>
              <ScoreBar label={t("tastingResults.nose")} value={result.avgNose} />
              <ScoreBar label={t("tastingResults.taste")} value={result.avgTaste} />
              <ScoreBar label={t("tastingResults.finish")} value={result.avgFinish} />
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

function exportPdf(data: ResultsData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const marginX = 18;
  const contentW = pageW - marginX * 2;

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 297, "F");

  let y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(data.title, pageW / 2, y, { align: "center" });
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${data.whiskyCount} ${data.whiskyCount === 1 ? "whisky" : "whiskies"} · ${data.totalRatings} ${data.totalRatings === 1 ? "rating" : "ratings"}`,
    pageW / 2,
    y,
    { align: "center" }
  );
  y += 12;

  const colWidths = [12, 50, 35, 22, 22, 22, 22, 15];
  const colHeaders = ["#", "Whisky", "Distillery", "Overall", "Nose", "Taste", "Finish", "N"];
  const tableX = marginX;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.setFillColor(241, 245, 249);
  doc.rect(tableX, y - 4, contentW, 7, "F");

  let cx = tableX + 2;
  colHeaders.forEach((h, i) => {
    doc.text(h, cx, y);
    cx += colWidths[i];
  });
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  data.results.forEach((r, i) => {
    if (y > 275) {
      doc.addPage();
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 297, "F");
      y = 20;
    }

    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableX, y - 4, contentW, 6, "F");
    }

    doc.setTextColor(30, 41, 59);
    cx = tableX + 2;
    const vals = [
      String(i + 1),
      r.name.length > 28 ? r.name.slice(0, 26) + "…" : r.name,
      (r.distillery ?? "").length > 20 ? (r.distillery ?? "").slice(0, 18) + "…" : (r.distillery ?? ""),
      r.avgOverall?.toFixed(1) ?? "—",
      r.avgNose?.toFixed(1) ?? "—",
      r.avgTaste?.toFixed(1) ?? "—",
      r.avgFinish?.toFixed(1) ?? "—",
      String(r.ratingCount),
    ];

    vals.forEach((v, vi) => {
      doc.text(v, cx, y);
      cx += colWidths[vi];
    });
    y += 6;
  });

  y += 8;
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text("Generated by CaskSense", pageW / 2, y, { align: "center" });

  saveJsPdf(doc, `${data.title.replace(/[^a-zA-Z0-9]/g, "_")}_results.pdf`);
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
    color: c.text,
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
          background: `${c.accent}15`,
          color: c.accent,
          border: `1px solid ${c.accent}40`,
          borderRadius: 10,
          cursor: "pointer",
          fontFamily: "system-ui, sans-serif",
        }}
        data-testid="button-export-menu"
      >
        <Download style={{ width: 14, height: 14 }} />
        {t("tastingResults.export")}
        <ChevronDown style={{ width: 12, height: 12, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: c.card,
            border: `1px solid ${c.border}`,
            borderRadius: 10,
            padding: 4,
            zIndex: 50,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
          data-testid="dropdown-export-menu"
        >
          <button
            style={{ ...menuItemStyle, opacity: loading === "csv" ? 0.6 : 1 }}
            onMouseEnter={e => (e.currentTarget.style.background = `${c.accent}15`)}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
            onClick={() => handleServerExport("csv")}
            disabled={!!loading}
            data-testid="button-export-csv"
          >
            {loading === "csv" ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Download style={{ width: 14, height: 14, color: c.muted }} />}
            {t("tastingResults.exportCsv")}
          </button>
          <button
            style={{ ...menuItemStyle, opacity: loading === "xlsx" ? 0.6 : 1 }}
            onMouseEnter={e => (e.currentTarget.style.background = `${c.accent}15`)}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
            onClick={() => handleServerExport("xlsx")}
            disabled={!!loading}
            data-testid="button-export-excel"
          >
            {loading === "xlsx" ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <FileSpreadsheet style={{ width: 14, height: 14, color: c.muted }} />}
            {t("tastingResults.exportExcel")}
          </button>
          <button
            style={menuItemStyle}
            onMouseEnter={e => (e.currentTarget.style.background = `${c.accent}15`)}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
            onClick={() => { exportPdf(data); setOpen(false); }}
            data-testid="button-export-pdf"
          >
            <FileText style={{ width: 14, height: 14, color: c.muted }} />
            {t("tastingResults.exportPdf")}
          </button>
        </div>
      )}
    </div>
  );
}

function useCollectionState() {
  const pid = getParticipantId();
  const qc = useQueryClient();
  const { data: collectionCheck } = useQuery({
    queryKey: ["collection-check", pid],
    queryFn: () => collectionApi.check(pid!),
    enabled: !!pid,
    staleTime: 30_000,
  });
  const addMut = useMutation({
    mutationFn: (data: { name: string; distillery?: string }) =>
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
  return { pid, isInCollection, addMut };
}

export default function TastingResultsPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const tastingId = params.id;
  const { pid, isInCollection, addMut } = useCollectionState();

  const { data, isLoading, error } = useQuery<ResultsData>({
    queryKey: ["tasting-results", tastingId],
    queryFn: () => fetch(`/api/tastings/${tastingId}/results`).then((r) => {
      if (!r.ok) throw new Error("Failed to load results");
      return r.json();
    }),
    enabled: !!tastingId,
  });

  if (isLoading) {
    return (
      <SimpleShell>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <p style={{ color: c.muted }}>{t("tastingResults.loadingResults")}</p>
        </div>
      </SimpleShell>
    );
  }

  if (error || !data) {
    return (
      <SimpleShell>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <p style={{ color: c.muted }}>{t("tastingResults.errorLoading")}</p>
          <Link href="/host" style={{ color: c.accent, fontSize: 13, marginTop: 12, display: "inline-block" }}>
            {t("tastingResults.backToHost")}
          </Link>
        </div>
      </SimpleShell>
    );
  }

  return (
    <SimpleShell maxWidth={600}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="tasting-results-page">
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <Trophy style={{ width: 28, height: 28, color: c.gold, marginBottom: 8 }} />
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22,
            fontWeight: 700,
            color: c.text,
            margin: "0 0 4px",
          }} data-testid="text-results-title">
            {data.title}
          </h1>
          <p style={{ fontSize: 13, color: c.muted, margin: 0 }}>
            {data.whiskyCount} {data.whiskyCount === 1 ? t("tastingResults.whisky") : t("tastingResults.whisky_plural")} · {data.totalRatings} {data.totalRatings === 1 ? t("tastingResults.rating") : t("tastingResults.rating_plural")}
          </p>
        </div>

        {data.results.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center" }} data-testid="text-no-results">
            <p style={{ color: c.muted, fontSize: 14, margin: 0 }}>{t("tastingResults.noRatings")}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.results.map((result, i) => (
              <WhiskyResultCard
                key={result.whiskyId}
                result={result}
                rank={i}
                inCollection={pid ? isInCollection(result.name, result.distillery ?? undefined) : undefined}
                onAddToCollection={pid ? () => addMut.mutate({ name: result.name, distillery: result.distillery ?? undefined }) : undefined}
                addPending={addMut.isPending}
              />
            ))}
          </div>
        )}

        <Link href={`/recap/${tastingId}`} style={{ textDecoration: "none" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px",
            fontSize: 13,
            fontWeight: 600,
            color: c.accent,
            background: c.card,
            border: `1px solid ${c.border}`,
            borderRadius: 10,
            cursor: "pointer",
          }} data-testid="button-view-recap">
            <ClipboardList style={{ width: 14, height: 14 }} />
            View Recap
          </div>
        </Link>

        <div style={{ display: "flex", gap: 8 }}>
          {data.results.length > 0 && (
            <ExportDropdown data={data} />
          )}
          <div style={{ flex: 1 }}>
            <BackButton fallback="/tasting" />
          </div>
        </div>
      </div>
    </SimpleShell>
  );
}
