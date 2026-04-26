import jsPDF from "jspdf";
import { saveJsPdf } from "@/lib/pdf";
import { downloadBlob } from "@/lib/download";
import { formatScore } from "@/lib/utils";
import { pidHeaders } from "@/lib/api";
import { exportStoryPdf } from "@/lib/pdf-story";

const STORY_ELIGIBLE_STATUSES = new Set(["reveal", "completed", "closed", "archived"]);

export function getStoryPdfAvailable(
  tasting: { status?: string | null; storyEnabled?: boolean | null } | null | undefined,
  isHost: boolean,
): boolean {
  if (!tasting) return false;
  if (!STORY_ELIGIBLE_STATUSES.has(tasting.status ?? "")) return false;
  return isHost || !!tasting.storyEnabled;
}

export async function labsExportFromServer(
  tastingId: string,
  format: "csv" | "xlsx",
  t?: (key: string, opts?: any) => string,
): Promise<boolean> {
  const res = await fetch(`/api/tastings/${tastingId}/results/export?format=${format}`);
  if (!res.ok) {
    const msg = t
      ? t("downloads.exportErrorServer", { status: res.status, defaultValue: `Export failed (${res.status})` })
      : `Export failed (${res.status})`;
    throw new Error(msg);
  }
  const blob = await res.blob();
  const disp = res.headers.get("Content-Disposition");
  const filenameMatch = disp?.match(/filename="?([^"]+)"?/);
  const filename = filenameMatch?.[1] || `results.${format}`;
  downloadBlob(blob, filename);
  return true;
}

export async function labsExportPdf(tasting: any, whiskyResults: any[], t: (key: string) => string): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const marginX = 18;
  const contentW = pageW - marginX * 2;
  const accent: [number, number, number] = [212, 162, 86];
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
  await saveJsPdf(doc, `${safeName}_results.pdf`);
}

export async function labsExportStoryPdfForTasting(
  tastingId: string,
  t?: (key: string, opts?: any) => string,
): Promise<void> {
  const [storyRes, photosRes] = await Promise.all([
    fetch(`/api/tastings/${tastingId}/story`, { headers: pidHeaders() }),
    fetch(`/api/tastings/${tastingId}/event-photos`, { headers: pidHeaders() }),
  ]);
  if (!storyRes.ok) {
    throw new Error(t ? t("downloads.exportErrorStoryData", { defaultValue: "Story data could not be loaded." }) : "Story data could not be loaded.");
  }
  const storyData = await storyRes.json();
  if (!storyData?.tasting) {
    throw new Error(t ? t("downloads.exportErrorNoTasting", { defaultValue: "No tasting data available." }) : "No tasting data available.");
  }
  const eventPhotos = photosRes.ok ? await photosRes.json() : [];
  await exportStoryPdf({ ...storyData, eventPhotos });
}

export async function labsExportPdfForTasting(
  tastingId: string,
  t: (key: string, opts?: any) => string,
): Promise<void> {
  const [tastingRes, whiskiesRes, ratingsRes, participantsRes] = await Promise.all([
    fetch(`/api/tastings/${tastingId}`, { headers: pidHeaders() }),
    fetch(`/api/tastings/${tastingId}/whiskies`, { headers: pidHeaders() }),
    fetch(`/api/tastings/${tastingId}/ratings`, { headers: pidHeaders() }),
    fetch(`/api/tastings/${tastingId}/participants`, { headers: pidHeaders() }),
  ]);
  if (!tastingRes.ok || !whiskiesRes.ok || !ratingsRes.ok) {
    throw new Error(t("downloads.exportErrorTastingData", { defaultValue: "Tasting data could not be loaded." }));
  }
  const tasting = await tastingRes.json();
  const whiskies: any[] = await whiskiesRes.json();
  const allRatings: any[] = await ratingsRes.json();
  const participants: any[] = participantsRes.ok ? await participantsRes.json() : [];

  const sMax = (tasting?.ratingScale as number) || 100;
  const excludedPids = new Set(
    participants.filter((p: any) => p.excludedFromResults).map((p: any) => p.participantId || p.id),
  );
  const includedRatings = excludedPids.size > 0
    ? allRatings.filter((r: any) => !excludedPids.has(r.participantId))
    : allRatings;
  const toUserScale = (v: number | null | undefined) => {
    if (v == null) return null;
    if (sMax !== 100 && v > sMax) return Math.round((v / 100) * sMax * 10) / 10;
    return v;
  };
  const roundForScale = (v: number) => sMax === 100 ? Math.round(v) : Math.round(v * 10) / 10;
  const whiskyResults = whiskies.map((w: any) => {
    const ratings = includedRatings
      .filter((r: any) => r.whiskyId === w.id)
      .map((r: any) => ({
        ...r,
        nose: toUserScale(r.nose),
        taste: toUserScale(r.taste),
        finish: toUserScale(r.finish),
        overall: toUserScale(r.overall),
      }));
    const avg = (dim: string) => {
      const vals = ratings.map((r: any) => r[dim]).filter((v: any) => v != null && v > 0);
      if (vals.length === 0) return null;
      return roundForScale(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
    };
    return {
      ...w,
      ratingCount: ratings.length,
      avgOverall: avg("overall"),
      avgNose: avg("nose"),
      avgTaste: avg("taste"),
      avgFinish: avg("finish"),
    };
  });

  await labsExportPdf(tasting, whiskyResults, t);
}
