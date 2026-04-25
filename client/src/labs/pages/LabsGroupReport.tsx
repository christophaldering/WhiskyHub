import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLabsBack } from "@/labs/LabsLayout";
import {
  ChevronLeft, Sparkles, Users, Trophy, TrendingUp, TrendingDown,
  Heart, Target, Download, Loader2, Lock, Unlock,
  CheckCircle, RefreshCw, User, Zap, Activity,
} from "lucide-react";
import React, { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { tastingApi, whiskyApi, ratingApi, getParticipantId, pidHeaders } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { formatScore } from "@/lib/utils";
import jsPDF from "jspdf";
import { saveJsPdf } from "@/lib/pdf";

interface LabsGroupReportProps {
  params: { id: string };
}

type RGB = [number, number, number];
const ACCENT: RGB = [212, 162, 86];
const BG: RGB = [26, 23, 20];
const SURFACE: RGB = [36, 32, 28];
const MUTED: RGB = [138, 126, 109];
const TEXT: RGB = [245, 240, 232];

async function exportGroupReportPdf(tasting: any, report: any, whiskies: any[], participants: any[], t: (k: string, fb?: string) => string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const mx = 18;
  const cw = pageW - mx * 2;

  const drawBg = () => { doc.setFillColor(...BG); doc.rect(0, 0, pageW, pageH, "F"); };
  const drawHeader = () => { doc.setFillColor(...ACCENT); doc.rect(0, 0, pageW, 3, "F"); };
  const drawFooter = () => {
    const fy = pageH - 12;
    doc.setDrawColor(...ACCENT); doc.setLineWidth(0.3); doc.line(mx, fy - 4, pageW - mx, fy - 4);
    doc.setFontSize(7); doc.setTextColor(...MUTED);
    doc.text("CaskSense Labs · KI-Tasting-Report", mx, fy);
    doc.text(new Date().toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" }), pageW - mx, fy, { align: "right" });
  };
  const newPage = () => { drawFooter(); doc.addPage(); drawBg(); drawHeader(); return 20; };
  const checkY = (y: number, needed: number) => y + needed > pageH - 20 ? newPage() : y;

  drawBg(); drawHeader();
  let y = 22;

  doc.setFontSize(9); doc.setTextColor(...ACCENT); doc.setFont("helvetica", "bold");
  doc.text("KI-TASTING-REPORT", pageW / 2, y, { align: "center" }); y += 8;
  doc.setFontSize(20); doc.setTextColor(...TEXT); doc.text(tasting.title || "Tasting", pageW / 2, y, { align: "center" }); y += 8;
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
  doc.text(`${tasting.date}${tasting.location ? " · " + tasting.location : ""} · ${participants.length} Taster`, pageW / 2, y, { align: "center" }); y += 10;
  doc.setDrawColor(...ACCENT); doc.setLineWidth(0.4); doc.line(mx, y, pageW - mx, y); y += 10;

  if (report.groupNarrative) {
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(...ACCENT);
    doc.text("Gruppen-Narrativ", mx, y); y += 7;
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...TEXT);
    const lines = doc.splitTextToSize(report.groupNarrative, cw);
    for (const line of lines) {
      y = checkY(y, 6);
      doc.text(line, mx, y); y += 5.5;
    }
    y += 6;
  }

  const ranked = whiskies.filter(w => report.whiskyCharacteristics?.[w.id]);
  if (ranked.length > 0) {
    y = checkY(y, 16);
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(...ACCENT);
    doc.text("Whisky-Ranking", mx, y); y += 8;
    for (const [i, w] of ranked.entries()) {
      y = checkY(y, 18);
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...TEXT);
      doc.text(`#${i + 1}  ${w.name || "?"}`, mx, y);
      if (w.avgOverall != null) { doc.setFontSize(12); doc.setTextColor(...ACCENT); doc.text(String(formatScore(w.avgOverall)), pageW - mx, y, { align: "right" }); }
      y += 6;
      const char = report.whiskyCharacteristics?.[w.id];
      if (char) { doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(...MUTED); const cl = doc.splitTextToSize(char, cw - 8); cl.forEach((l: string) => { doc.text(l, mx + 4, y); y += 4.5; }); }
      y += 3;
    }
    y += 4;
  }

  if (report.correlationData?.pairings?.length > 0) {
    y = checkY(y, 16);
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(...ACCENT);
    doc.text("Beste Übereinstimmungen", mx, y); y += 8;
    for (const p of report.correlationData.pairings.slice(0, 5)) {
      y = checkY(y, 8);
      const pct = Math.round(((p.score + 1) / 2) * 100);
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...TEXT);
      doc.text(`${p.aName}  &  ${p.bName}`, mx, y);
      doc.setTextColor(...ACCENT); doc.setFont("helvetica", "bold");
      doc.text(`${pct}%`, pageW - mx, y, { align: "right" });
      y += 6;
    }
    y += 6;
  }

  if (report.outlierMoments?.length > 0) {
    y = checkY(y, 16);
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(...ACCENT);
    doc.text("Ausreißer-Momente", mx, y); y += 8;
    for (const o of report.outlierMoments.slice(0, 4)) {
      y = checkY(y, 8);
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...TEXT);
      const dir = o.direction === "above" ? "+" : "-";
      doc.text(`${o.participantName} · ${o.whiskyName}  (${dir}${o.deviation.toFixed(1)})`, mx, y);
      y += 6;
    }
    y += 6;
  }

  if (report.medianTasterName) {
    y = checkY(y, 16);
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(...ACCENT);
    doc.text("Median-Taster", mx, y); y += 7;
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(...TEXT);
    doc.text(`${report.medianTasterName} lag am nächsten am Gruppengeschmack.`, mx, y); y += 12;
  }

  if (report.consistencyScores && (report.consistencyScores as any[]).length > 0) {
    y = checkY(y, 16);
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(...ACCENT);
    doc.text("Bewertungskonsistenz", mx, y); y += 7;
    doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(...MUTED);
    doc.text("Niedrige Ø-Abweichung = konsequenter Stil.", mx, y); y += 7;
    const maxDev = Math.max(...(report.consistencyScores as any[]).map((x: any) => x.avgDeviation));
    for (const cs of (report.consistencyScores as any[]).slice(0, 8)) {
      y = checkY(y, 7);
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...TEXT);
      doc.text(cs.participantName || "?", mx, y);
      doc.setTextColor(...MUTED);
      doc.text(`Ø ±${(cs.avgDeviation as number).toFixed(1)}`, pageW - mx, y, { align: "right" });
      const barW = cw * 0.35;
      const barX = pageW - mx - barW - 30;
      const pct = maxDev > 0 ? 1 - cs.avgDeviation / maxDev : 1;
      doc.setFillColor(...MUTED); doc.roundedRect(barX, y - 3.5, barW, 3, 1, 1, "F");
      doc.setFillColor(...ACCENT); doc.roundedRect(barX, y - 3.5, barW * pct, 3, 1, 1, "F");
      y += 7;
    }
    y += 4;
  }

  const indReports = report.individualReports || {};
  if (Object.keys(indReports).length > 0) {
    doc.addPage(); drawBg(); drawHeader(); y = 22;
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(...ACCENT);
    doc.text("Individuelle Kommentare", mx, y); y += 10;
    for (const pid of Object.keys(indReports)) {
      const pr = indReports[pid];
      const pName = participants.find((p: any) => p.id === pid)?.name || pid;
      y = checkY(y, 20);
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...ACCENT);
      doc.text(pName, mx, y); y += 6;
      if (pr.narrative) {
        doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...TEXT);
        const lines = doc.splitTextToSize(pr.narrative, cw);
        for (const l of lines) { y = checkY(y, 6); doc.text(l, mx, y); y += 4.5; }
      }
      y += 8;
    }
  }

  drawFooter();
  const safe = (tasting.title || "report").replace(/[^a-zA-Z0-9]/g, "_");
  await saveJsPdf(doc, `${safe}_ki-report.pdf`);
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "var(--labs-accent)", fontSize: 15 }}>
      {formatScore(score)}
    </span>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ color: "var(--labs-accent)" }}>{icon}</span>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text)", margin: 0 }}>{children}</h2>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "var(--labs-surface)", borderRadius: 14, padding: "20px", border: "1px solid var(--labs-border)", ...style }}>
      {children}
    </div>
  );
}

function IndividualReportBody({ report, participantName, t }: { report: any; participantName?: string; t: (k: string, fb?: string) => string }) {
  return (
    <div>
      {participantName && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <User style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--labs-text)" }}>{participantName}</span>
        </div>
      )}
      {report.preferenceProfile && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {report.preferenceProfile.topRegion && (
            <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "rgba(212,162,86,0.1)", color: "var(--labs-accent)", border: "1px solid rgba(212,162,86,0.2)" }}>
              📍 {report.preferenceProfile.topRegion}
            </span>
          )}
          {report.preferenceProfile.topCask && (
            <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "rgba(212,162,86,0.1)", color: "var(--labs-accent)", border: "1px solid rgba(212,162,86,0.2)" }}>
              🪵 {report.preferenceProfile.topCask}
            </span>
          )}
          {report.preferenceProfile.peatLevel && (
            <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "rgba(212,162,86,0.1)", color: "var(--labs-accent)", border: "1px solid rgba(212,162,86,0.2)" }}>
              🔥 {report.preferenceProfile.peatLevel}
            </span>
          )}
          {report.closestMatchName && (
            <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "rgba(74,222,128,0.08)", color: "var(--labs-success, #4ade80)", border: "1px solid rgba(74,222,128,0.15)" }}>
              💫 {t("aiReport.closestMatch", "Nah an")} {report.closestMatchName}
            </span>
          )}
        </div>
      )}
      {report.narrative && (
        <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--labs-text)", whiteSpace: "pre-line" }}>
          {report.narrative}
        </p>
      )}
    </div>
  );
}

export default function LabsGroupReport({ params }: LabsGroupReportProps) {
  const tastingId = params.id;
  const { currentParticipant } = useAppStore();
  const goBack = useLabsBack(`/labs/results/${tastingId}`);
  const { t } = useTranslation();
  const qc = useQueryClient();
  const pid = getParticipantId();

  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generatingMissing, setGeneratingMissing] = useState(false);
  const [generatingPid, setGeneratingPid] = useState<string | null>(null);
  const [missingError, setMissingError] = useState("");
  // Progress for batched per-participant generation: { done, total, currentName }
  const [genProgress, setGenProgress] = useState<{ done: number; total: number; currentName: string | null } | null>(null);

  const { data: tasting } = useQuery({
    queryKey: ["tasting", tastingId],
    queryFn: () => tastingApi.get(tastingId),
    enabled: !!tastingId,
  });

  const { data: whiskies } = useQuery({
    queryKey: ["whiskies", tastingId],
    queryFn: () => whiskyApi.getForTasting(tastingId),
    enabled: !!tastingId,
  });

  const { data: allRatings } = useQuery({
    queryKey: ["tastingRatings", tastingId],
    queryFn: () => ratingApi.getForTasting(tastingId),
    enabled: !!tastingId,
  });

  const { data: participantsData } = useQuery({
    queryKey: ["tastingParticipants", tastingId],
    queryFn: () => tastingApi.getParticipants(tastingId),
    enabled: !!tastingId,
  });

  const { data: reportData, refetch: refetchReport, isLoading: reportLoading } = useQuery({
    queryKey: ["tasting-ai-report", tastingId],
    queryFn: async () => {
      const res = await fetch(`/api/tastings/${tastingId}/ai-report`, { headers: pidHeaders(pid || "") });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!tastingId && !!pid,
    staleTime: 60_000,
  });

  const enableMut = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch(`/api/tastings/${tastingId}/ai-report/enable`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...pidHeaders(pid || "") },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasting-ai-report", tastingId] });
      qc.invalidateQueries({ queryKey: ["tastings"] });
    },
  });

  async function generateIndividualReports(participantIds: string[] | null) {
    setMissingError("");
    // Resolve the actual list of IDs we'll process (so progress is accurate even when
    // the caller passes `null` meaning "all missing").
    const resolvedIds: string[] = participantIds && participantIds.length > 0
      ? participantIds
      : activeParticipants.filter((p: any) => !indReports[p.id]).map((p: any) => p.id);

    if (resolvedIds.length === 0) return;

    const isSingle = resolvedIds.length === 1;
    if (isSingle) setGeneratingPid(resolvedIds[0]);
    else setGeneratingMissing(true);
    setGenProgress({ done: 0, total: resolvedIds.length, currentName: null });

    let firstError: string | null = null;
    const failedNames: string[] = [];
    let processed = 0;

    // Issue one request per participant so the user sees true X/Y progress instead of
    // a single opaque spinner for the whole batch.
    for (const targetId of resolvedIds) {
      const targetName = activeParticipants.find((p: any) => p.id === targetId)?.name ?? null;
      setGenProgress({ done: processed, total: resolvedIds.length, currentName: targetName });
      if (!isSingle) setGeneratingPid(targetId);
      try {
        const res = await fetch(`/api/tastings/${tastingId}/ai-report/individual-reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...pidHeaders(pid || "") },
          body: JSON.stringify({ participantIds: [targetId] }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (!firstError) firstError = err.message || t("aiReport.missingError", "Konnte nicht generieren.");
          if (targetName) failedNames.push(targetName);
        } else {
          // 200 OK but the per-participant AI call may still have failed silently;
          // server returns failedParticipantIds. Surface those names too.
          const body = await res.json().catch(() => ({} as { generated?: number; failedParticipantIds?: string[] }));
          if (Array.isArray(body.failedParticipantIds) && body.failedParticipantIds.includes(targetId) && targetName) {
            failedNames.push(targetName);
          }
        }
      } catch {
        if (!firstError) firstError = t("aiReport.networkError", "Netzwerkfehler");
        if (targetName) failedNames.push(targetName);
      }
      processed += 1;
      setGenProgress({ done: processed, total: resolvedIds.length, currentName: targetName });
    }

    setGeneratingMissing(false);
    setGeneratingPid(null);
    setGenProgress(null);
    if (failedNames.length > 0) {
      setMissingError(
        firstError
          ? `${firstError} (${failedNames.join(", ")})`
          : t("aiReport.partialFailure", "Konnte nicht für alle generieren: {{names}}", { names: failedNames.join(", ") }),
      );
    } else if (firstError) {
      setMissingError(firstError);
    }
    await refetchReport();
    qc.invalidateQueries({ queryKey: ["tastings"] });
  }

  const isHostLocal = currentParticipant?.id === tasting?.hostId;
  const isHostServer = reportData?.isHost === true;
  const isHost = isHostLocal || isHostServer;
  const report = reportData?.report;
  const isLocked = reportData?.locked;

  const whiskyResults = useMemo(() => {
    if (!whiskies || !allRatings || !Array.isArray(allRatings)) return [];
    const scale = (tasting?.ratingScale as number) ?? 100;
    return whiskies.map((w: any) => {
      const wRatings = (allRatings as any[]).filter((r: any) => r.whiskyId === w.id && !r.participantExcluded);
      const avgOverall = wRatings.length > 0 ? wRatings.reduce((s: number, r: any) => s + (r.overall ?? 0), 0) / wRatings.length : null;
      return { ...w, avgOverall, ratingCount: wRatings.length };
    }).filter((w: any) => w.ratingCount > 0).sort((a: any, b: any) => (b.avgOverall ?? 0) - (a.avgOverall ?? 0));
  }, [whiskies, allRatings, tasting]);

  const activeParticipants = useMemo(() => {
    if (!participantsData) return [];
    return (participantsData as any[]).filter((p: any) => !p.excludedFromResults);
  }, [participantsData]);

  async function handleGenerate(force = false) {
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await fetch(`/api/tastings/${tastingId}/ai-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...pidHeaders(pid || "") },
        body: JSON.stringify({ force }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setGenerateError(err.message || "Fehler beim Generieren");
        return;
      }
      await refetchReport();
    } catch {
      setGenerateError("Netzwerkfehler");
    } finally {
      setGenerating(false);
    }
  }

  const indReports = report?.individualReports || {};
  const selectedReport = selectedParticipant ? indReports[selectedParticipant] : null;
  const selectedParticipantData = activeParticipants.find((p: any) => p.id === selectedParticipant);

  const generatedCount = activeParticipants.filter((p: any) => indReports[p.id]).length;
  const totalActive = activeParticipants.length;
  const missingCount = totalActive - generatedCount;
  const missingParticipantIds = activeParticipants.filter((p: any) => !indReports[p.id]).map((p: any) => p.id);

  const pairingsSorted = useMemo(() => {
    const pairs = (report?.correlationData?.pairings || []) as Array<{ aId: string; aName: string; bId: string; bName: string; score: number }>;
    return pairs.slice(0, 8);
  }, [report]);

  if (reportLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--labs-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: 32, height: 32, color: "var(--labs-accent)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--labs-bg)", paddingBottom: 40 }}>
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--labs-bg)", borderBottom: "1px solid var(--labs-border)", padding: "0 16px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={() => goBack()}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", fontSize: 14, fontWeight: 500, padding: "6px 0" }}
            data-testid="button-back-from-report"
          >
            <ChevronLeft style={{ width: 18, height: 18 }} />
            {t("ui.back", "Zurück")}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles style={{ width: 15, height: 15, color: "var(--labs-accent)" }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--labs-text)" }}>KI-Report</span>
          </div>
          {report && (
            <button
              onClick={() => void exportGroupReportPdf(tasting, report, whiskyResults, activeParticipants, t)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--labs-border)", borderRadius: 8, cursor: "pointer", color: "var(--labs-text-muted)", fontSize: 12, fontWeight: 600, padding: "5px 10px" }}
              data-testid="button-download-report-pdf"
            >
              <Download style={{ width: 13, height: 13 }} />
              PDF
            </button>
          )}
          {!report && <div style={{ width: 60 }} />}
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h1 className="labs-serif" style={{ fontSize: 24, fontWeight: 700, color: "var(--labs-text)", marginBottom: 4 }}>
              {tasting?.title || "Tasting"}
            </h1>
            {isHost && report && activeParticipants.length > 0 && (
              <span
                data-testid="badge-individual-count-header"
                title={t("aiReport.individualCountHeaderTooltip", "Persönliche KI-Analysen: {{generated}} von {{total}} erstellt", { generated: generatedCount, total: activeParticipants.length })}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", borderRadius: 999,
                  border: "1px solid var(--labs-border)",
                  background: "var(--labs-surface)",
                  color: "var(--labs-text-muted)",
                  fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
                }}
              >
                <Sparkles style={{ width: 10, height: 10, color: "var(--labs-accent)" }} />
                {t("aiReport.individualCountHeader", "{{generated}}/{{total}} persönlich", { generated: generatedCount, total: activeParticipants.length })}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>
            {tasting?.date}{tasting?.location ? ` · ${tasting.location}` : ""} · {activeParticipants.length} {t("ui.tasters", "Taster")}
          </p>
        </div>

        {isHost && report && (
          <Card style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", marginBottom: 2 }}>
                  {t("aiReport.unlockForParticipants", "Persönliche Analyse für Teilnehmer freischalten")}
                </div>
                <div style={{ fontSize: 12, color: "var(--labs-text-muted)", lineHeight: 1.5 }}>
                  {report.aiReportEnabled
                    ? t("aiReport.unlockEnabledV3", "Teilnehmer sehen den Gruppen-Report und – sofern vorhanden – ihre eigene persönliche KI-Analyse. Du allein siehst alle persönlichen Analysen.")
                    : t("aiReport.unlockDisabledV3", "Aktuell siehst nur du den Report. Schalte ihn frei, damit Teilnehmer den Gruppen-Report und – sofern vorhanden – ihre eigene persönliche KI-Analyse abrufen können. Persönliche Analysen anderer Teilnehmer bleiben dir vorbehalten.")}
                </div>
                {missingCount > 0 && (
                  <div
                    data-testid="text-unlock-missing-hint"
                    style={{ marginTop: 8, fontSize: 11, color: "var(--labs-accent)", lineHeight: 1.5, display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Sparkles style={{ width: 11, height: 11, flexShrink: 0 }} />
                    <span>
                      {t("aiReport.unlockMissingHint", "Noch nicht alle Teilnehmer haben eine persönliche Analyse ({{generated}}/{{total}}). Du kannst sie unten gezielt nachgenerieren.", { generated: generatedCount, total: activeParticipants.length })}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => enableMut.mutate(!report.aiReportEnabled)}
                disabled={enableMut.isPending}
                data-testid="button-toggle-report-unlock"
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "none",
                  background: report.aiReportEnabled ? "var(--labs-success-muted, rgba(74,222,128,0.1))" : "var(--labs-accent)",
                  color: report.aiReportEnabled ? "var(--labs-success, #4ade80)" : "var(--labs-bg)",
                  fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0,
                }}
              >
                {report.aiReportEnabled ? <Unlock style={{ width: 13, height: 13 }} /> : <Lock style={{ width: 13, height: 13 }} />}
                {report.aiReportEnabled ? t("aiReport.locked", "Sperren") : t("aiReport.unlock", "Freischalten")}
              </button>
            </div>
          </Card>
        )}

        {isHost && !report && !isLocked && (
          <Card style={{ marginBottom: 24, textAlign: "center", padding: "36px 24px" }}>
            <Sparkles style={{ width: 36, height: 36, color: "var(--labs-accent)", margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-text)", marginBottom: 8 }}>
              {t("aiReport.generateTitle", "KI-Analyse generieren")}
            </h2>
            <p style={{ fontSize: 13, color: "var(--labs-text-muted)", marginBottom: 20, maxWidth: 380, margin: "0 auto 20px" }}>
              {t("aiReport.generateDesc", "Analysiere Bewertungsmuster, Übereinstimmungen, Ausreißer und erhalte ein individuelles KI-Narrativ für jeden Teilnehmer.")}
            </p>
            {generateError && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#ef4444", marginBottom: 16 }}>
                {generateError}
              </div>
            )}
            <button
              onClick={() => handleGenerate(false)}
              disabled={generating}
              data-testid="button-generate-report"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px",
                borderRadius: 12, border: "none", background: "var(--labs-accent)",
                color: "var(--labs-bg)", fontWeight: 700, fontSize: 14, cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.7 : 1,
              }}
            >
              {generating ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Sparkles style={{ width: 16, height: 16 }} />}
              {generating ? t("aiReport.generating", "Wird generiert…") : t("aiReport.generateBtn", "Report generieren")}
            </button>
            {generating && (
              <p style={{ marginTop: 12, fontSize: 12, color: "var(--labs-text-muted)" }}>
                {t("aiReport.generatingHint", "Das dauert 15–30 Sekunden…")}
              </p>
            )}
          </Card>
        )}

        {!isHost && isLocked && (
          <Card style={{ textAlign: "center", padding: "36px 24px" }}>
            <Lock style={{ width: 32, height: 32, color: "var(--labs-text-muted)", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, color: "var(--labs-text-muted)" }}>
              {t("aiReport.notUnlocked", "Der Host hat den Report noch nicht für Teilnehmer freigegeben.")}
            </p>
          </Card>
        )}

        {report && (
          <>
            {report.generatedAt && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
                  {t("aiReport.generatedAt", "Generiert")} {new Date(report.generatedAt).toLocaleString("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                {isHost && (
                  <button
                    onClick={() => handleGenerate(true)}
                    disabled={generating}
                    data-testid="button-regenerate-report"
                    style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "1px solid var(--labs-border)", borderRadius: 8, cursor: "pointer", color: "var(--labs-text-muted)", fontSize: 11, fontWeight: 600, padding: "4px 10px" }}
                  >
                    {generating ? <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} /> : <RefreshCw style={{ width: 11, height: 11 }} />}
                    {t("aiReport.regenerate", "Neu generieren")}
                  </button>
                )}
              </div>
            )}

            {report.groupNarrative && (
              <Card style={{ marginBottom: 20 }}>
                <SectionTitle icon={<Sparkles style={{ width: 15, height: 15 }} />}>
                  {t("aiReport.groupNarrative", "Gruppen-Narrativ")}
                </SectionTitle>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--labs-text)", whiteSpace: "pre-line" }}>
                  {report.groupNarrative}
                </p>
              </Card>
            )}

            {whiskyResults.length > 0 && (
              <Card style={{ marginBottom: 20 }}>
                <SectionTitle icon={<Trophy style={{ width: 15, height: 15 }} />}>
                  {t("aiReport.rankingTitle", "Whisky-Ranking")}
                </SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {whiskyResults.map((w: any, i: number) => {
                    const char = report.whiskyCharacteristics?.[w.id];
                    return (
                      <div key={w.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }} data-testid={`report-whisky-${w.id}`}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: i < 3 ? "var(--labs-accent)" : "var(--labs-text-muted)", width: 22, flexShrink: 0, paddingTop: 2 }}>
                          #{i + 1}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {w.name || t("ui.unknown", "Unbekannt")}
                            </div>
                            {w.avgOverall != null && <ScoreBadge score={w.avgOverall} />}
                          </div>
                          {char && (
                            <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 2, fontStyle: "italic" }}>
                              {char}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {pairingsSorted.length > 0 && (
              <Card style={{ marginBottom: 20 }}>
                <SectionTitle icon={<Heart style={{ width: 15, height: 15 }} />}>
                  {t("aiReport.pairingsTitle", "Übereinstimmungen")}
                </SectionTitle>
                <p style={{ fontSize: 12, color: "var(--labs-text-muted)", marginBottom: 14 }}>
                  {t("aiReport.pairingsDesc", "Wer bewertet ähnlich? Basierend auf Pearson-Korrelation der Gesamtpunkte.")}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {pairingsSorted.map((p, i) => {
                    const pct = Math.round(((p.score + 1) / 2) * 100);
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }} data-testid={`report-pairing-${i}`}>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.aName}</span>
                          <span style={{ fontSize: 10, color: "var(--labs-text-muted)", flexShrink: 0 }}>&</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.bName}</span>
                        </div>
                        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 60, height: 5, borderRadius: 3, background: "var(--labs-surface-elevated, rgba(255,255,255,0.06))", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: pct > 70 ? "var(--labs-accent)" : "var(--labs-text-muted)", borderRadius: 3, transition: "width 0.4s" }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: pct > 70 ? "var(--labs-accent)" : "var(--labs-text-muted)", width: 32, textAlign: "right" }}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {report.outlierMoments?.length > 0 && (
              <Card style={{ marginBottom: 20 }}>
                <SectionTitle icon={<Zap style={{ width: 15, height: 15 }} />}>
                  {t("aiReport.outliersTitle", "Ausreißer-Momente")}
                </SectionTitle>
                <p style={{ fontSize: 12, color: "var(--labs-text-muted)", marginBottom: 14 }}>
                  {t("aiReport.outliersDesc", "Die stärksten Abweichungen vom Gruppengeschmack.")}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {report.outlierMoments.map((o: any, i: number) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }} data-testid={`report-outlier-${i}`}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: o.direction === "above" ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {o.direction === "above"
                          ? <TrendingUp style={{ width: 13, height: 13, color: "#4ade80" }} />
                          : <TrendingDown style={{ width: 13, height: 13, color: "#ef4444" }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)" }}>{o.participantName}</div>
                        <div style={{ fontSize: 11, color: "var(--labs-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {o.whiskyName} · {o.direction === "above" ? "+" : "-"}{o.deviation.toFixed(1)} {t("ui.points", "Pkt.")} vom Schnitt
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {report.medianTasterName && (
              <Card style={{ marginBottom: 20 }}>
                <SectionTitle icon={<Target style={{ width: 15, height: 15 }} />}>
                  {t("aiReport.medianTasterTitle", "Median-Taster")}
                </SectionTitle>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--labs-accent-muted, rgba(212,162,86,0.12))", border: "1px solid rgba(212,162,86,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <CheckCircle style={{ width: 20, height: 20, color: "var(--labs-accent)" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-accent)", marginBottom: 2 }}>{report.medianTasterName}</div>
                    <div style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>
                      {t("aiReport.medianTasterDesc", "Dieser Taster lag insgesamt am nächsten am Gruppengeschmack.")}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {isHost && report.consistencyScores && (report.consistencyScores as any[]).length > 0 && (
              <Card style={{ marginBottom: 20 }}>
                <SectionTitle icon={<Activity style={{ width: 15, height: 15 }} />}>
                  {t("aiReport.consistencyTitle", "Bewertungskonsistenz")}
                </SectionTitle>
                <p style={{ fontSize: 12, color: "var(--labs-text-muted)", marginBottom: 14 }}>
                  {t("aiReport.consistencyDesc", "Wer bewertet konsistent? Niedrige Abweichung = konsequenter Stil.")}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(report.consistencyScores as any[]).slice(0, 8).map((cs: any, i: number) => {
                    const maxDev = Math.max(...(report.consistencyScores as any[]).map((x: any) => x.avgDeviation));
                    const barPct = maxDev > 0 ? Math.round((1 - cs.avgDeviation / maxDev) * 100) : 100;
                    return (
                      <div key={cs.participantId || i} style={{ display: "flex", alignItems: "center", gap: 10 }} data-testid={`report-consistency-${i}`}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)", width: 120, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cs.participantName}</span>
                        <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--labs-surface-elevated, rgba(255,255,255,0.06))", overflow: "hidden" }}>
                          <div style={{ width: `${barPct}%`, height: "100%", background: barPct > 70 ? "var(--labs-accent)" : "var(--labs-text-muted)", borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, color: "var(--labs-text-muted)", width: 50, textAlign: "right", flexShrink: 0 }}>Ø ±{cs.avgDeviation.toFixed(1)}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {isHost && activeParticipants.length > 0 && (
              <Card style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                  <SectionTitle icon={<Users style={{ width: 15, height: 15 }} />}>
                    {t("aiReport.individualTitle", "Individuelle Analysen")}
                  </SectionTitle>
                  <span
                    data-testid="text-individual-counter"
                    style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text-muted)", padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid var(--labs-border)" }}
                  >
                    {generatedCount} / {totalActive} {t("aiReport.individualGenerated", "generiert")}
                  </span>
                </div>

                <p style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: -4, marginBottom: 14, lineHeight: 1.5 }}>
                  {missingCount > 0
                    ? t("aiReport.individualMissingDesc", "Einige Teilnehmer haben noch keine persönliche KI-Analyse. Du kannst sie nachträglich generieren – auch nach dem Verteilen.")
                    : t("aiReport.individualCompleteDesc", "Alle aktiven Teilnehmer haben eine persönliche KI-Analyse.")}
                </p>

                {missingError && (
                  <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#ef4444", marginBottom: 12 }} data-testid="text-individual-error">
                    {missingError}
                  </div>
                )}

                {(missingCount > 0 || genProgress) && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                    {genProgress ? (
                      <div style={{ flex: 1, minWidth: 0 }} data-testid="text-generate-progress">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "var(--labs-text-muted)", marginBottom: 4 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {genProgress.currentName && genProgress.done < genProgress.total
                              ? t("aiReport.progressCurrent", "{{done}}/{{total}} erstellt · {{name}} läuft …", { done: genProgress.done, total: genProgress.total, name: genProgress.currentName })
                              : t("aiReport.progressDone", "{{done}}/{{total}} erstellt", { done: genProgress.done, total: genProgress.total })}
                          </span>
                        </div>
                        <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <div style={{
                            width: `${Math.round((genProgress.done / Math.max(1, genProgress.total)) * 100)}%`,
                            height: "100%",
                            background: "var(--labs-accent)",
                            borderRadius: 999,
                            transition: "width 0.2s ease",
                          }} />
                        </div>
                      </div>
                    ) : <div />}
                    {missingCount > 0 && (
                      <button
                        onClick={() => generateIndividualReports(missingParticipantIds)}
                        disabled={generatingMissing || generatingPid !== null}
                        data-testid="button-generate-missing-individual"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px",
                          borderRadius: 10, border: "none", background: "var(--labs-accent)",
                          color: "var(--labs-bg)", fontWeight: 700, fontSize: 12,
                          cursor: generatingMissing ? "not-allowed" : "pointer", opacity: generatingMissing ? 0.7 : 1,
                          flexShrink: 0,
                        }}
                      >
                        {generatingMissing
                          ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                          : <Sparkles style={{ width: 12, height: 12 }} />}
                        {generatingMissing && genProgress
                          ? t("aiReport.generatingProgress", "{{done}} / {{total}} …", { done: genProgress.done, total: genProgress.total })
                          : generatingMissing
                            ? t("aiReport.generatingMissing", "Generiere …")
                            : t("aiReport.generateMissing", "{{n}} fehlende generieren", { n: missingCount })}
                      </button>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {activeParticipants.map((p: any) => {
                    const has = !!indReports[p.id];
                    const isPidGenerating = generatingPid === p.id;
                    const isSelected = selectedParticipant === p.id;
                    return (
                      <div key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <button
                          onClick={() => has ? setSelectedParticipant(isSelected ? null : p.id) : generateIndividualReports([p.id])}
                          disabled={isPidGenerating || generatingMissing || (!has && (generatingMissing || generatingPid !== null))}
                          data-testid={`button-select-participant-${p.id}`}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "6px 12px", borderRadius: 20, border: "1px solid",
                            borderColor: isSelected ? "var(--labs-accent)" : has ? "var(--labs-border)" : "rgba(212,162,86,0.4)",
                            background: isSelected
                              ? "var(--labs-accent-muted, rgba(212,162,86,0.1))"
                              : has ? "transparent" : "rgba(212,162,86,0.06)",
                            color: isSelected ? "var(--labs-accent)" : has ? "var(--labs-text-muted)" : "var(--labs-accent)",
                            fontSize: 12, fontWeight: 600,
                            cursor: isPidGenerating ? "not-allowed" : "pointer",
                            opacity: isPidGenerating ? 0.6 : 1,
                          }}
                        >
                          {isPidGenerating
                            ? <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} />
                            : has
                              ? <CheckCircle style={{ width: 11, height: 11, color: "var(--labs-success, #4ade80)" }} />
                              : <Sparkles style={{ width: 11, height: 11 }} />}
                          {p.name}
                          {!has && !isPidGenerating && (
                            <span style={{ fontSize: 10, fontWeight: 500, color: "var(--labs-accent)" }} data-testid={`status-participant-missing-${p.id}`}>
                              · {t("aiReport.individualMissing", "fehlt")}
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {selectedParticipant && selectedReport && (
                  <div style={{ borderTop: "1px solid var(--labs-border)", paddingTop: 16 }}>
                    <IndividualReportBody report={selectedReport} participantName={selectedParticipantData?.name} t={t} />
                  </div>
                )}
              </Card>
            )}

            {!isHost && pid && indReports[pid] && (
              <Card style={{ marginBottom: 20 }}>
                <SectionTitle icon={<User style={{ width: 15, height: 15 }} />}>
                  {t("aiReport.myReportTitle", "Mein Tasting-Report")}
                </SectionTitle>
                <IndividualReportBody report={indReports[pid]} participantName={currentParticipant?.name} t={t} />
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
