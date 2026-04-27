import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useLabsBack } from "@/labs/LabsLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { recapApi, collectionApi, getParticipantId, pidHeaders } from "@/lib/api";
import { stripGuestSuffix } from "@/lib/utils";
import {
  Trophy, Copy, Printer, AlertTriangle, Users, Wine, Star, FileDown,
  Loader2, ChevronLeft, AlertCircle, Archive, Check, BookOpen, Camera, X, Sparkles
} from "lucide-react";
import WhiskyImage from "@/labs/components/WhiskyImage";
import AutoStorySheet from "@/labs/components/AutoStorySheet";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import jsPDF from "jspdf";
import { saveJsPdf } from "@/lib/pdf";
import { Link } from "wouter";
import { useUpload } from "@/hooks/use-upload";

interface RecapData {
  tasting: { id: string; title: string; date: string; location: string; status: string; hostId: string; ratingScale?: number };
  hostName: string;
  participantCount: number;
  whiskyCount: number;
  topRated: { name: string; distillery: string; avgScore: number; imageUrl: string | null }[];
  mostDivisive: { name: string; stddev: number } | null;
  overallAverages: { nose: number; taste: number; finish: number; overall: number };
  participantHighlights: { name: string; ratingsCount: number; avgScore: number }[];
}

interface EventPhoto {
  id: string;
  photoUrl: string;
  caption?: string | null;
}

async function addEventPhotoRecap(tastingId: string, photoUrl: string) {
  const res = await fetch(`/api/tastings/${tastingId}/event-photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify({ photoUrl }),
  });
  if (!res.ok) throw new Error((await res.json()).message ?? "Upload failed");
  return res.json();
}

async function deleteEventPhotoRecap(tastingId: string, photoId: string) {
  const res = await fetch(`/api/tastings/${tastingId}/event-photos/${photoId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Löschen fehlgeschlagen");
}

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const BAR_COLORS = ["#D9A15B", "#C97845", "#9C6A5E", "#7F8C5A", "#d4a256"];

export default function LabsTastingRecap() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const tastingId = params.id;
  const goBack = useLabsBack(`/labs/tastings/${tastingId}`);

  const { data: recap, isLoading, isError, refetch } = useQuery<RecapData>({
    queryKey: ["recap", tastingId],
    queryFn: () => recapApi.get(tastingId!),
    enabled: !!tastingId,
  });

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [autoStoryOpen, setAutoStoryOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const pid = getParticipantId();
  const { uploadFile } = useUpload();

  const { data: collectionCheck } = useQuery({
    queryKey: ["collection-check", pid],
    queryFn: () => collectionApi.check(pid!),
    enabled: !!pid,
    staleTime: 30_000,
  });

  const isHost = !!pid && !!recap && recap.tasting.hostId === pid;

  const { data: eventPhotos = [], refetch: refetchPhotos } = useQuery<EventPhoto[]>({
    queryKey: ["recap-event-photos", tastingId],
    queryFn: async () => {
      const res = await fetch(`/api/tastings/${tastingId}/event-photos`, { headers: pidHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isHost && !!tastingId,
  });

  const handlePhotoFiles = async (files: FileList) => {
    if (!files.length) return;
    const remaining = 10 - eventPhotos.length;
    if (remaining <= 0) { setPhotoError("Maximal 10 Fotos erlaubt."); return; }
    setPhotoUploading(true);
    setPhotoError(null);
    try {
      for (let i = 0; i < Math.min(files.length, remaining); i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;
        const result = await uploadFile(file);
        if (result?.objectPath) {
          const publicUrl = result.objectPath.startsWith("http")
            ? result.objectPath
            : `/api/uploads/serve/${result.objectPath}`;
          await addEventPhotoRecap(tastingId!, publicUrl);
        }
      }
    } catch (e: unknown) {
      setPhotoError(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
    } finally {
      setPhotoUploading(false);
      refetchPhotos();
      qc.invalidateQueries({ queryKey: ["recap-event-photos", tastingId] });
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const addToCollectionMut = useMutation({
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

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(i18n.language === "de" ? "de-DE" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const buildShareText = () => {
    if (!recap) return "";
    const lines: string[] = [];
    lines.push(`${recap.tasting.title}`);
    lines.push(`${formatDate(recap.tasting.date)}`);
    if (recap.tasting.location) lines.push(recap.tasting.location);
    lines.push(`${t("recap.host")}: ${stripGuestSuffix(recap.hostName)}`);
    lines.push(`${recap.participantCount} ${t("recap.participants")}`);
    lines.push("");
    lines.push(`${t("recap.topRated")}:`);
    recap.topRated.slice(0, 5).forEach((w, i) => {
      const medal = i === 0 ? "#1" : i === 1 ? "#2" : i === 2 ? "#3" : `#${i + 1}`;
      lines.push(`  ${medal} ${w.name}${w.distillery ? ` (${w.distillery})` : ""} - ${w.avgScore.toFixed(1)}`);
    });
    if (recap.mostDivisive) {
      lines.push("");
      lines.push(`${t("recap.mostDivisive")}: ${recap.mostDivisive.name} (${recap.mostDivisive.stddev.toFixed(2)})`);
    }
    lines.push("");
    const avg = recap.overallAverages;
    lines.push(`${t("evaluation.nose")}: ${avg.nose.toFixed(1)} | ${t("evaluation.taste")}: ${avg.taste.toFixed(1)} | ${t("evaluation.finish")}: ${avg.finish.toFixed(1)} | ${t("evaluation.overall")}: ${avg.overall.toFixed(1)}`);
    lines.push("");
    lines.push(t("m2.pdf.signature", "- CaskSense"));
    return lines.join("\n");
  };

  const handleCopy = async () => {
    const text = buildShareText();
    await navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handlePrint = () => window.print();

  const handlePdfDownload = async () => {
    if (!recap) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 18;
    const cw = pw - margin * 2;
    let y = 18;
    const accent: [number, number, number] = [212, 162, 86];
    const dark: [number, number, number] = [30, 30, 32];
    const muted: [number, number, number] = [120, 120, 125];
    const bg: [number, number, number] = [250, 248, 245];

    const drawPageBg = () => {
      doc.setFillColor(...bg);
      doc.rect(0, 0, pw, ph, "F");
      doc.setFillColor(...accent);
      doc.rect(0, 0, pw, 3, "F");
    };

    const drawFooter = () => {
      const fy = ph - 12;
      doc.setDrawColor(...accent);
      doc.setLineWidth(0.3);
      doc.line(margin, fy - 4, pw - margin, fy - 4);
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text(t("m2.pdf.generatedBy", "Generated by CaskSense"), margin, fy);
      doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), pw - margin, fy, { align: "right" });
    };

    const addPage = () => { drawFooter(); doc.addPage(); drawPageBg(); y = 18; };
    const checkSpace = (need: number) => { if (y + need > ph - 20) addPage(); };

    drawPageBg();

    doc.setFontSize(10);
    doc.setTextColor(...accent);
    doc.setFont("helvetica", "bold");
    doc.text("CaskSense", pw / 2, y, { align: "center" });
    y += 4;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...muted);
    doc.text(t("m2.pdf.tastingRecap", "Tasting Recap"), pw / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(recap.tasting.title, pw / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...muted);
    const meta: string[] = [];
    if (recap.tasting.date) meta.push(formatDate(recap.tasting.date));
    if (recap.tasting.location) meta.push(recap.tasting.location);
    meta.push(`${t("recap.host")}: ${stripGuestSuffix(recap.hostName)}`);
    meta.push(`${recap.participantCount} ${t("recap.participants")}`);
    meta.push(`${recap.whiskyCount} ${t("recap.whiskies")}`);
    doc.text(meta.join("  ·  "), pw / 2, y, { align: "center" });
    y += 8;

    doc.setDrawColor(...accent);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pw - margin, y);
    y += 12;

    if (recap.topRated.length > 0) {
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...dark);
      doc.text(t("recap.topRated"), margin, y);
      y += 10;

      recap.topRated.slice(0, 5).forEach((w, i) => {
        checkSpace(14);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(...(i < 3 ? accent : dark));
        doc.text(`${i + 1}.  ${w.name}`, margin + 4, y);
        doc.setFontSize(14);
        doc.setTextColor(...accent);
        doc.text(w.avgScore.toFixed(1), pw - margin, y, { align: "right" });
        if (w.distillery) {
          y += 5;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...muted);
          doc.text(w.distillery, margin + 12, y);
        }
        y += 8;
      });
      y += 4;
    }

    if (recap.mostDivisive) {
      checkSpace(18);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...dark);
      doc.text(t("recap.mostDivisive"), margin, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...muted);
      doc.text(`${recap.mostDivisive.name}  (${recap.mostDivisive.stddev.toFixed(2)})`, margin + 4, y);
      y += 12;
    }

    checkSpace(55);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(t("recap.overallAverages"), margin, y);
    y += 10;

    const dims = [
      { label: t("evaluation.nose"), value: recap.overallAverages.nose },
      { label: t("evaluation.taste"), value: recap.overallAverages.taste },
      { label: t("evaluation.finish"), value: recap.overallAverages.finish },
      { label: t("evaluation.overall"), value: recap.overallAverages.overall },
    ];
    const barMaxW = cw - 46;
    dims.forEach((d) => {
      checkSpace(10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...muted);
      doc.text(d.label, margin + 4, y);
      doc.setFillColor(230, 225, 218);
      doc.roundedRect(margin + 36, y - 3.5, barMaxW, 5, 1.5, 1.5, "F");
      const bw = (d.value / (recap.tasting.ratingScale || 100)) * barMaxW;
      doc.setFillColor(...accent);
      doc.roundedRect(margin + 36, y - 3.5, bw, 5, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...dark);
      doc.text(d.value.toFixed(1), margin + 38 + barMaxW, y, { align: "left" });
      y += 8;
    });
    y += 6;

    if (recap.participantHighlights.length > 0) {
      checkSpace(22);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...dark);
      doc.text(t("recap.participantHighlights"), margin, y);
      y += 10;

      recap.participantHighlights.forEach((p) => {
        checkSpace(8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...dark);
        doc.text(stripGuestSuffix(p.name), margin + 4, y);
        doc.setTextColor(...muted);
        doc.text(`${p.ratingsCount} ${t("recap.ratings")}  ·  Avg ${p.avgScore.toFixed(1)}`, pw - margin, y, { align: "right" });
        y += 7;
      });
    }

    drawFooter();
    const slug = recap.tasting.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    await saveJsPdf(doc, `casksense-${slug}-recap.pdf`);
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--labs-text-muted)",
      }}>
        <Loader2 style={{ width: 24, height: 24, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (isError || !recap) {
    return (
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 16,
      }}>
        <AlertCircle style={{ width: 40, height: 40, color: "var(--labs-danger)" }} />
        <p style={{ fontSize: 14, color: "var(--labs-text-secondary)" }}>
          {t("common.error", "An error occurred")}
        </p>
        <button className="labs-btn-secondary" onClick={() => refetch()} data-testid="button-recap-retry">
          {t("common.retry", "Retry")}
        </button>
      </div>
    );
  }

  const avgData = [
    { dimension: t("evaluation.nose"), value: recap.overallAverages.nose },
    { dimension: t("evaluation.taste"), value: recap.overallAverages.taste },
    { dimension: t("evaluation.finish"), value: recap.overallAverages.finish },
    { dimension: t("evaluation.overall"), value: recap.overallAverages.overall },
  ];

  const mostRatings = recap.participantHighlights.length > 0
    ? [...recap.participantHighlights].sort((a, b) => b.ratingsCount - a.ratingsCount)[0]
    : null;
  const highestAvg = recap.participantHighlights.length > 0
    ? [...recap.participantHighlights].sort((a, b) => b.avgScore - a.avgScore)[0]
    : null;

  return (
    <div className="labs-fade-in" style={{ padding: 16, maxWidth: 800, margin: "0 auto" }} data-testid="labs-recap-page">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          [data-testid="labs-recap-page"], [data-testid="labs-recap-page"] * { visibility: visible; }
          [data-testid="labs-recap-page"] { position: absolute; left: 0; top: 0; width: 100%; }
          .labs-recap-actions { display: none !important; }
        }
      `}</style>

      <button
        onClick={goBack}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="button-recap-back"
      >
        <ChevronLeft className="w-4 h-4" />
        Tasting
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Trophy style={{ width: 24, height: 24, color: "var(--labs-accent)" }} />
          <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }} data-testid="text-labs-recap-title">
            {t("recap.title")}
          </h1>
        </div>
        <div className="labs-recap-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(recap.tasting.status === "archived" || recap.tasting.status === "completed" || recap.tasting.status === "reveal" || recap.tasting.status === "closed") && (
            <button
              className="labs-btn-secondary"
              onClick={() => navigate(`/labs/results/${recap.tasting.id}/story`)}
              data-testid="button-recap-story"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <BookOpen style={{ width: 16, height: 16 }} /> Story
            </button>
          )}
          <button className="labs-btn-ghost" onClick={handlePdfDownload} data-testid="button-labs-pdf-recap" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <FileDown style={{ width: 16, height: 16 }} /> {t("recap.pdfExport")}
          </button>
          <button className="labs-btn-ghost" onClick={handleCopy} data-testid="button-labs-copy-recap" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Copy style={{ width: 16, height: 16 }} /> {copyFeedback ? t("common.copied", "Copied!") : t("recap.copyRecap")}
          </button>
          <button className="labs-btn-ghost" onClick={handlePrint} data-testid="button-labs-print-recap" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Printer style={{ width: 16, height: 16 }} /> {t("recap.printRecap")}
          </button>
        </div>
      </div>

      <div className="labs-card" style={{ padding: 20, marginBottom: 16 }} data-testid="card-labs-recap-header">
        <h2 className="labs-serif" style={{ fontSize: 20, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 6px" }} data-testid="text-labs-recap-tasting-title">
          {String(recap.tasting.title ?? "")}
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 13, color: "var(--labs-text-muted)" }}>
          {recap.tasting.date && <span data-testid="text-labs-recap-date">{formatDate(String(recap.tasting.date))}</span>}
          {recap.tasting.location && <span data-testid="text-labs-recap-location">{String(recap.tasting.location ?? "")}</span>}
          <span data-testid="text-labs-recap-host">{stripGuestSuffix(recap.hostName)}</span>
          <span data-testid="text-labs-recap-participants" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Users style={{ width: 14, height: 14 }} />
            {recap.participantCount} {t("recap.participants")}
          </span>
          <span data-testid="text-labs-recap-whisky-count" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Wine style={{ width: 14, height: 14 }} />
            {recap.whiskyCount} {t("recap.whiskies")}
          </span>
        </div>
      </div>

      {isHost && (
        <div className="labs-card" style={{ padding: 20, marginBottom: 16 }} data-testid="card-recap-story">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: eventPhotos.length > 0 ? 14 : 10 }}>
            <h2 className="labs-serif" style={{ fontSize: 17, fontWeight: 600, color: "var(--labs-text)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <BookOpen style={{ width: 18, height: 18, color: "var(--labs-accent)" }} />
              Story
            </h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="labs-btn-primary"
                onClick={() => setAutoStoryOpen(true)}
                data-testid="button-recap-story-auto-create"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Sparkles style={{ width: 14, height: 14 }} />
                Story automatisch erstellen
              </button>
              <button
                className="labs-btn-secondary"
                onClick={() => navigate(`/labs/results/${recap.tasting.id}/story`)}
                data-testid="button-recap-story-open"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <BookOpen style={{ width: 14, height: 14 }} />
                Story anzeigen
              </button>
            </div>
          </div>

          {eventPhotos.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {eventPhotos.map((p: EventPhoto) => (
                <div key={p.id} style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }} data-testid={`card-recap-event-photo-${p.id}`}>
                  <img
                    src={p.photoUrl}
                    alt={p.caption || "Foto"}
                    style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid var(--labs-border)", display: "block" }}
                  />
                  <button
                    onClick={async () => {
                      try {
                        await deleteEventPhotoRecap(tastingId!, p.id);
                      } catch (e: unknown) {
                        setPhotoError(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
                      }
                      refetchPhotos();
                      qc.invalidateQueries({ queryKey: ["recap-event-photos", tastingId] });
                    }}
                    style={{
                      position: "absolute", top: -6, right: -6, width: 18, height: 18,
                      borderRadius: 9, background: "var(--labs-danger)", border: "none",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", padding: 0, lineHeight: 1,
                    }}
                    data-testid={`button-recap-delete-photo-${p.id}`}
                  >
                    <X style={{ width: 10, height: 10 }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={e => e.target.files && handlePhotoFiles(e.target.files)}
              data-testid="input-recap-photo-upload"
            />
            <button
              className="labs-btn-ghost"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading || eventPhotos.length >= 10}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}
              data-testid="button-recap-upload-photo"
            >
              {photoUploading
                ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                : <Camera style={{ width: 14, height: 14 }} />
              }
              {photoUploading
                ? "Hochladen…"
                : eventPhotos.length > 0
                  ? `${eventPhotos.length}/10 Fotos · weitere hinzufügen`
                  : "Event-Fotos hinzufügen"
              }
            </button>
            {photoError && (
              <p style={{ color: "var(--labs-danger)", fontSize: 12, margin: 0 }} data-testid="text-recap-photo-error">
                {photoError}
              </p>
            )}
          </div>

          <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: "10px 0 0", lineHeight: 1.5 }}>
            Fotos werden als Hintergrund in der Story-Präsentation eingeblendet (Eröffnung & Finale).
          </p>
        </div>
      )}

      {recap.topRated.length > 0 && (
        <div className="labs-card" style={{ padding: 20, marginBottom: 16 }} data-testid="card-labs-top-rated">
          <h2 className="labs-serif" style={{ fontSize: 17, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }} data-testid="text-labs-recap-top-rated-heading">
            <Trophy style={{ width: 18, height: 18, color: "var(--labs-accent)" }} />
            {t("recap.topRated")}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recap.topRated.slice(0, 5).map((w, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 0",
                  borderBottom: i < Math.min(recap.topRated.length, 5) - 1 ? "1px solid var(--labs-border)" : "none",
                }}
                data-testid={`card-labs-top-rated-${i}`}
              >
                <div style={{ width: 32, textAlign: "center" }}>
                  {i < 3 ? (
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      fontSize: 12,
                      fontWeight: 700,
                      backgroundColor: MEDAL_COLORS[i],
                      color: i === 0 ? "#78350f" : i === 1 ? "#1f2937" : "#451a03",
                    }}>
                      {i + 1}
                    </span>
                  ) : (
                    <span className="labs-serif" style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text-muted)" }}>{i + 1}</span>
                  )}
                </div>
                <WhiskyImage imageUrl={w.imageUrl} name={w.name || ""} size={40} whiskyId={w.id} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} data-testid={`text-labs-top-rated-name-${i}`}>
                    {String(w.name ?? "")}
                  </p>
                  {w.distillery && (
                    <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {String(w.distillery ?? "")}
                    </p>
                  )}
                </div>
                <span className="labs-serif" style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-accent)" }} data-testid={`text-labs-top-rated-score-${i}`}>
                  {Number(w.avgScore).toFixed(1)}
                </span>
                {pid && (
                  <div style={{ marginLeft: 6 }}>
                    {isInCollection(w.name, w.distillery) ? (
                      <span
                        style={{ display: "inline-flex", alignItems: "center", width: 22, height: 22, borderRadius: 11, background: "rgba(76, 175, 80, 0.15)", justifyContent: "center" }}
                        data-testid={`badge-recap-collection-${i}`}
                      >
                        <Check style={{ width: 12, height: 12, color: "#4CAF50" }} />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCollectionMut.mutate({ name: w.name, distillery: w.distillery })}
                        disabled={addToCollectionMut.isPending}
                        style={{ display: "inline-flex", alignItems: "center", width: 22, height: 22, borderRadius: 11, background: "var(--labs-accent-muted)", justifyContent: "center", border: "none", cursor: "pointer", padding: 0 }}
                        data-testid={`button-recap-add-collection-${i}`}
                      >
                        <Archive style={{ width: 12, height: 12, color: "var(--labs-accent)" }} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {recap.mostDivisive && (
        <div className="labs-card" style={{ padding: 20, marginBottom: 16 }} data-testid="card-labs-most-divisive">
          <h2 className="labs-serif" style={{ fontSize: 17, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8 }} data-testid="text-labs-recap-most-divisive-heading">
            <AlertTriangle style={{ width: 18, height: 18, color: "var(--labs-accent)" }} />
            {t("recap.mostDivisive")}
          </h2>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 4px" }} data-testid="text-labs-most-divisive-name">
            {String(recap.mostDivisive.name ?? "")}
          </p>
          <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: 0 }}>
            {t("recap.stddev")}: {Number(recap.mostDivisive.stddev).toFixed(2)}
          </p>
        </div>
      )}

      <div className="labs-card" style={{ padding: 20, marginBottom: 16 }} data-testid="card-labs-averages">
        <h2 className="labs-serif" style={{ fontSize: 17, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 14px" }} data-testid="text-labs-recap-averages-heading">
          {t("recap.overallAverages")}
        </h2>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={avgData} layout="vertical" margin={{ left: 70 }}>
              <XAxis
                type="number"
                domain={[0, recap.tasting.ratingScale || 100]}
                tick={{ fill: "var(--labs-text-muted)", fontSize: 11 }}
                axisLine={{ stroke: "var(--labs-border)" }}
                tickLine={{ stroke: "var(--labs-border)" }}
              />
              <YAxis
                type="category"
                dataKey="dimension"
                tick={{ fill: "var(--labs-text-secondary)", fontSize: 12 }}
                width={65}
                axisLine={{ stroke: "var(--labs-border)" }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--labs-surface-elevated)",
                  border: "1px solid var(--labs-border)",
                  borderRadius: 8,
                  color: "var(--labs-text)",
                }}
                labelStyle={{ color: "var(--labs-text)" }}
                formatter={(value: number) => [value.toFixed(1), ""]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {avgData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {recap.participantHighlights.length > 0 && (
        <div className="labs-card" style={{ padding: 20, marginBottom: 16 }} data-testid="card-labs-highlights">
          <h2 className="labs-serif" style={{ fontSize: 17, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }} data-testid="text-labs-recap-highlights-heading">
            <Star style={{ width: 18, height: 18, color: "var(--labs-accent)" }} />
            {t("recap.participantHighlights")}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            {mostRatings && (
              <div style={{
                padding: 14,
                borderRadius: "var(--labs-radius-sm)",
                background: "var(--labs-surface-elevated)",
                border: "1px solid var(--labs-border)",
              }} data-testid="card-labs-most-ratings">
                <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: "0 0 4px" }}>{t("recap.mostRatings")}</p>
                <p className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 2px" }}>{stripGuestSuffix(mostRatings.name)}</p>
                <p style={{ fontSize: 13, color: "var(--labs-accent)", margin: 0 }}>{String(mostRatings.ratingsCount ?? 0)} {t("recap.ratings")}</p>
              </div>
            )}
            {highestAvg && (
              <div style={{
                padding: 14,
                borderRadius: "var(--labs-radius-sm)",
                background: "var(--labs-surface-elevated)",
                border: "1px solid var(--labs-border)",
              }} data-testid="card-labs-highest-avg">
                <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: "0 0 4px" }}>{t("recap.highestAvg")}</p>
                <p className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", margin: "0 0 2px" }}>{stripGuestSuffix(highestAvg.name)}</p>
                <p style={{ fontSize: 13, color: "var(--labs-accent)", margin: 0 }}>{Number(highestAvg.avgScore).toFixed(1)}</p>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {recap.participantHighlights.map((p, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: i < recap.participantHighlights.length - 1 ? "1px solid var(--labs-border)" : "none",
                }}
                data-testid={`row-labs-participant-highlight-${i}`}
              >
                <span style={{ fontSize: 13, color: "var(--labs-text)" }}>{stripGuestSuffix(p.name)}</span>
                <span style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>
                  {String(p.ratingsCount ?? 0)} {t("recap.ratings")} · Avg {Number(p.avgScore).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isHost && tastingId && (
        <AutoStorySheet
          open={autoStoryOpen}
          tastingId={tastingId}
          eventPhotos={eventPhotos}
          onClose={() => setAutoStoryOpen(false)}
        />
      )}
    </div>
  );
}