import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { profileApi, tastingApi, inviteApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Printer, FileDown, ClipboardList, EyeOff, Download, Users, Loader2, Monitor, Smartphone, Sparkles, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import type { Whisky, Tasting } from "@shared/schema";
import jsPDF from "jspdf";
import { saveOrPrintJsPdf, saveJsPdf } from "@/lib/pdf";
import i18n from "@/lib/i18n";
import QRCodeLib from "qrcode";

type RGB = [number, number, number];

const NAVY: RGB = [30, 41, 59];
const SLATE: RGB = [71, 85, 105];
const MUTED: RGB = [148, 163, 184];
const LIGHT_BG: RGB = [248, 250, 252];
const AMBER: RGB = [180, 130, 30];
const LINE_GRAY: RGB = [200, 210, 220];

const PRINT_COLORS = {
  gold:        '#8b6914',
  goldLight:   'rgba(139,105,20,0.2)',
  goldMid:     'rgba(139,105,20,0.4)',
  goldBorder:  'rgba(139,105,20,0.6)',
  black:       '#1a1208',
  textDark:    '#2d2010',
  textMuted:   '#888070',
  white:       '#ffffff',
};

const GOLD_RGB: RGB = [139, 105, 20];
const PRINT_BLACK_RGB: RGB = [26, 18, 8];
const PRINT_TEXTDARK_RGB: RGB = [45, 32, 16];
const PRINT_TEXTMUTED_RGB: RGB = [136, 128, 112];

interface ParticipantInfo {
  name: string;
  photoUrl?: string | null;
  id?: string;
}

export interface PdfStyleTheme {
  tagline: string;
  colorScheme: {
    primary: RGB;
    accent: RGB;
    background: RGB;
    textDark: RGB;
    textLight: RGB;
  };
  mood: string;
}

async function generateQRDataUrl(url: string): Promise<string> {
  return QRCodeLib.toDataURL(url, {
    width: 200,
    margin: 1,
    color: { dark: "#1e293b", light: "#ffffff" },
  });
}

async function generateParticipantQR(
  tastingId: string,
  participantId: string,
  participantName: string,
  doc: jsPDF,
  x: number,
  y: number,
  size: number = 20
): Promise<void> {
  const url = `${window.location.origin}/labs/tastings/${tastingId}/scan?participant=${participantId}`;
  try {
    const dataUrl = await QRCodeLib.toDataURL(url, {
      width: 200,
      margin: 1,
      color: { dark: '#1a1208', light: '#ffffff' },
    });
    doc.addImage(dataUrl, 'PNG', x, y, size, size);
    doc.setFontSize(6);
    doc.setTextColor(...PRINT_TEXTMUTED_RGB);
    const qrLabel = doc.splitTextToSize(participantName, size + 4);
    doc.text(qrLabel[0] ?? '', x + size / 2, y + size + 3, { align: 'center' });
  } catch (e) {
    console.warn('[Print] QR generation failed:', e);
  }
}

function getFlavorTags(whisky: Whisky): string[] {
  if (!whisky.flavorProfile) return [];
  const profileMap: Record<string, string[]> = {
    'sherried-rich':      ['Sherry', 'Trockenfrüchte', 'Würze'],
    'bourbon-classic':    ['Vanille', 'Karamell', 'Eiche'],
    'peated-maritime':    ['Rauch', 'Salz', 'Torf'],
    'highland-elegant':   ['Honig', 'Blumen', 'Frucht'],
    'speyside-fruity':    ['Apfel', 'Birne', 'Malz'],
    'island-coastal':     ['Meeresluft', 'Heide', 'Gewürz'],
  };
  return profileMap[whisky.flavorProfile] ?? [];
}

function drawScoreCircles(
  doc: jsPDF,
  x: number,
  y: number,
  circleSize: number = 5
): void {
  for (let i = 1; i <= 10; i++) {
    const cx = x + (i - 1) * (circleSize + 1);
    doc.setDrawColor(...GOLD_RGB);
    doc.setLineWidth(0.3);
    doc.circle(cx + circleSize / 2, y + circleSize / 2, circleSize / 2, 'S');
    doc.setFontSize(6);
    doc.setTextColor(...GOLD_RGB);
    doc.text(String(i), cx + circleSize / 2, y + circleSize / 2 + 1.5, { align: 'center' });
  }
}

function drawGoldLine(doc: jsPDF, x: number, y: number, width: number, opacity: number = 0.3): void {
  const r = Math.round(139 * opacity + 255 * (1 - opacity));
  const g = Math.round(105 * opacity + 255 * (1 - opacity));
  const b = Math.round(20 * opacity + 255 * (1 - opacity));
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.3);
  doc.line(x, y, x + width, y);
}

function formatDate(dateStr: string, lang: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", {
      day: "numeric", month: "long", year: "numeric"
    });
  } catch { return dateStr; }
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function drawCoverImageAspectCrop(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  boxW: number,
  boxH: number,
): Promise<boolean> {
  try {
    const dims = await getImageDimensions(dataUrl);
    const imgRatio = dims.width / dims.height;
    const boxRatio = boxW / boxH;

    const dpr = 2;
    const targetPxW = Math.max(1, Math.round(boxW * 4 * dpr));
    const targetPxH = Math.max(1, Math.round(boxH * 4 * dpr));

    const canvas = document.createElement("canvas");
    canvas.width = targetPxW;
    canvas.height = targetPxH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    const img = new Image();
    img.src = dataUrl;
    await new Promise<void>((resolve, reject) => {
      if (img.complete) return resolve();
      img.onload = () => resolve();
      img.onerror = reject;
    });

    let sx = 0, sy = 0, sw = dims.width, sh = dims.height;
    if (imgRatio > boxRatio) {
      sw = dims.height * boxRatio;
      sx = (dims.width - sw) / 2;
    } else {
      sh = dims.width / boxRatio;
      sy = (dims.height - sh) / 2;
    }

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    const cropped = canvas.toDataURL("image/jpeg", 0.92);
    doc.addImage(cropped, "JPEG", x, y, boxW, boxH, undefined, "FAST");
    return true;
  } catch {
    return false;
  }
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = objectUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.9);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch { return null; }
}

function drawHeader(doc: jsPDF, tasting: Tasting, lang: string, isBlind: boolean) {
  const pageW = 210;
  const marginX = 14;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 20, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(tasting.title, pageW - marginX * 2 - 50);
  doc.text(titleLines, marginX, 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(200, 210, 220);
  const dateStr = formatDate(tasting.date, lang);
  const locationStr = tasting.location && tasting.location !== "—" ? ` · ${tasting.location}` : "";
  doc.text(`${dateStr}${locationStr}`, marginX, titleLines.length > 1 ? 18 : 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(180, 190, 200);
  doc.text("CaskSense", pageW - marginX, 15, { align: "right" });

  if (isBlind) {
    doc.setFillColor(...AMBER);
    doc.roundedRect(pageW - marginX - 24, 4, 24, 7, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.text("BLIND", pageW - marginX - 12, 9, { align: "center" });
  }
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageW = 210;
  const pageH = 297;

  doc.setDrawColor(210, 218, 230);
  doc.setLineWidth(0.3);
  doc.line(14, pageH - 10, pageW - 14, pageH - 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("CaskSense", 14, pageH - 6);
  doc.text(`${pageNum} / ${totalPages}`, pageW - 14, pageH - 6, { align: "right" });
}

function tp(key: string, lang: string, opts?: Record<string, any>): string {
  return i18n.t(key, { lng: lang, ...opts }) as string;
}

async function drawParticipantInfo(doc: jsPDF, participant: ParticipantInfo, y: number, marginX: number, pageW: number, lang: string, tastingId?: string): Promise<number> {
  const nameLabel = tp("printableSheets.pdfParticipant", lang);

  let photoDataUrl: string | null = null;
  if (participant.photoUrl) {
    photoDataUrl = await loadImageAsBase64(participant.photoUrl);
  }

  let qrDataUrl: string | null = null;
  if (participant.id && tastingId) {
    try {
      const scanUrl = `${window.location.origin}/m2/tastings/${tastingId}/scan?participant=${participant.id}`;
      qrDataUrl = await generateQRDataUrl(scanUrl);
    } catch {}
  }

  const qrSize = 18;
  const hasQR = !!qrDataUrl;

  if (hasQR) {
    try {
      doc.addImage(qrDataUrl!, "PNG", pageW - marginX - qrSize, y - 5, qrSize, qrSize, undefined, "FAST");
    } catch {}
  }

  if (photoDataUrl) {
    try {
      doc.addImage(photoDataUrl, "JPEG", marginX, y - 5, 12, 12, undefined, "FAST");
    } catch {}
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(`${nameLabel}:`, marginX + 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(participant.name, marginX + 15 + doc.getTextWidth(`${nameLabel}: `), y);
    return y + (hasQR ? Math.max(10, qrSize - 2) : 10);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(`${nameLabel}:`, marginX, y);
    doc.setFont("helvetica", "normal");
    doc.text(participant.name, marginX + doc.getTextWidth(`${nameLabel}: `), y);
    return y + (hasQR ? Math.max(8, qrSize - 2) : 8);
  }
}

function getWhiskyMeta(w: Whisky): string {
  const parts: string[] = [];
  if (w.distillery) parts.push(w.distillery);
  if (w.country) parts.push(w.country);
  if (w.age && w.age !== "NAS") parts.push(`${w.age}y`);
  if (w.age === "NAS" || w.age === "n.a.s.") parts.push("NAS");
  if (w.abv != null) parts.push(`${w.abv}%`);
  if (w.region) parts.push(w.region);
  if (w.caskType) parts.push(w.caskType);
  return parts.join(" · ");
}

async function drawCoverPage(
  doc: jsPDF,
  tasting: Tasting,
  whiskies: Whisky[],
  lang: string,
  isBlind: boolean,
  participant?: ParticipantInfo,
  coverImageBase64?: string | null,
  hostName?: string,
  orientation: "portrait" | "landscape" = "portrait",
  styleTheme?: PdfStyleTheme | null,
) {
  const pageW = orientation === "landscape" ? 297 : 210;
  const pageH = orientation === "landscape" ? 210 : 297;
  const margin = 18;
  const usableWidth = pageW - margin * 2;

  let y = margin + 8;

  if (coverImageBase64) {
    const imgMaxW = usableWidth;
    const imgMaxH = 70;
    const src = coverImageBase64.startsWith("data:") ? coverImageBase64 : `data:image/jpeg;base64,${coverImageBase64}`;
    const ok = await drawCoverImageAspectCrop(doc, src, margin, y, imgMaxW, imgMaxH);
    if (ok) {
      y += imgMaxH + 8;
    } else {
      y += 4;
    }
  }

  drawGoldLine(doc, margin, y, usableWidth, 0.4);
  y += 5;

  doc.setFontSize(7);
  doc.setTextColor(...GOLD_RGB);
  doc.setFont('helvetica', 'normal');
  doc.text('C A S K S E N S E', pageW / 2, y + 3, { align: 'center' });
  y += 8;

  doc.setFontSize(20);
  doc.setTextColor(...PRINT_BLACK_RGB);
  doc.setFont('times', 'italic');
  const titleLines = doc.splitTextToSize(tasting.title, usableWidth);
  doc.text(titleLines, pageW / 2, y, { align: 'center' });
  y += titleLines.length * 8 + 3;

  if (isBlind) {
    doc.setFontSize(8);
    doc.setTextColor(...GOLD_RGB);
    doc.setFont('helvetica', 'normal');
    doc.text('BLIND TASTING', pageW / 2, y, { align: 'center' });
    y += 6;
  }

  const tagline = styleTheme?.tagline ?? null;
  if (tagline) {
    doc.setFontSize(10);
    doc.setTextColor(...GOLD_RGB);
    doc.setFont('times', 'italic');
    doc.text(`"${tagline}"`, pageW / 2, y, { align: 'center' });
    y += 8;
  }

  drawGoldLine(doc, margin, y, usableWidth, 0.4);
  y += 6;

  const metaItems = [
    { label: 'DATUM', value: tasting.date ? formatDate(tasting.date, lang) : '—' },
    { label: 'ORT',   value: tasting.location ?? '—' },
    { label: 'HOST',  value: hostName ?? '—' },
    { label: 'DRAMS', value: String(whiskies.length) },
  ];
  const colW = usableWidth / metaItems.length;
  metaItems.forEach((item, idx) => {
    const cx = margin + idx * colW + colW / 2;
    doc.setFontSize(6);
    doc.setTextColor(...GOLD_RGB);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, cx, y + 3, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(...PRINT_BLACK_RGB);
    doc.text(item.value, cx, y + 9, { align: 'center' });
  });
  y += 16;

  if (participant) {
    doc.setFontSize(7);
    doc.setTextColor(...PRINT_TEXTMUTED_RGB);
    doc.setFont('helvetica', 'normal');
    const nameLabel = tp("printableSheets.pdfParticipant", lang);
    const participantLine = `${nameLabel}: ${participant.name}`;
    const partLines = doc.splitTextToSize(participantLine, usableWidth);
    doc.text(partLines, margin, y);
    y += partLines.length * 3.5 + 2;
  }

  doc.setFontSize(6);
  doc.setTextColor(...PRINT_TEXTMUTED_RGB);
  doc.text("CaskSense", margin, pageH - 8);
  doc.text("casksense.com", pageW - margin, pageH - 8, { align: "right" });
}

async function drawLineupPage(
  doc: jsPDF,
  tasting: Tasting,
  whiskies: Whisky[],
  lang: string,
  isBlind: boolean,
  hostName?: string,
  orientation: "portrait" | "landscape" = "portrait",
) {
  const pageW = orientation === "portrait" ? 210 : 297;
  const pageH = orientation === "portrait" ? 297 : 210;
  const margin = 18;
  const usableWidth = pageW - margin * 2;

  doc.addPage([pageW, pageH]);

  const drawLineupHeader = (continuation: boolean): number => {
    let hy = margin;
    doc.setFontSize(7);
    doc.setTextColor(...GOLD_RGB);
    doc.setFont('helvetica', 'normal');
    const headerLabel = isBlind ? 'BLIND TASTING SAMPLES' : 'WHISKY LINEUP';
    doc.text(continuation ? `${headerLabel} (FORTSETZUNG)` : headerLabel, margin, hy + 3);

    doc.setFontSize(14);
    doc.setTextColor(...PRINT_BLACK_RGB);
    doc.setFont('times', 'italic');
    const titleLines = doc.splitTextToSize(tasting.title, usableWidth);
    doc.text(titleLines[0] ?? '', margin, hy + 10);

    doc.setFontSize(7);
    doc.setTextColor(...PRINT_TEXTMUTED_RGB);
    doc.setFont('helvetica', 'normal');
    const metaText = [
      tasting.date ? formatDate(tasting.date, lang) : '',
      hostName ?? '',
      `${whiskies.length} ${whiskies.length === 1 ? 'Dram' : 'Drams'}`,
    ].filter(Boolean).join(' · ');
    doc.text(metaText, margin, hy + 15);

    hy += 22;
    drawGoldLine(doc, margin, hy, usableWidth, 0.4);
    return hy + 6;
  };

  const drawLineupFooter = () => {
    doc.setFontSize(6);
    doc.setTextColor(...PRINT_TEXTMUTED_RGB);
    doc.text("CaskSense", margin, pageH - 8);
    doc.text("casksense.com", pageW - margin, pageH - 8, { align: "right" });
  };

  let y = drawLineupHeader(false);

  if (!isBlind) {
    const useTwoCols = whiskies.length > 6;
    const columns = useTwoCols ? 2 : 1;
    const colGap = 8;
    const colWidth = (usableWidth - colGap * (columns - 1)) / columns;

    const numFontSize = useTwoCols ? 12 : 14;
    const nameFontSize = useTwoCols ? 11 : 12;
    const metaFontSize = useTwoCols ? 6.5 : 7;
    const offsetX = useTwoCols ? 9 : 10;
    const metaLineH = useTwoCols ? 3 : 3.5;
    const nameLineH = nameFontSize * 0.4;

    const measureEntry = (whisky: Whisky, w: number): { consumed: number; nameLines: string[]; metaLines: string[] } => {
      doc.setFontSize(nameFontSize);
      doc.setFont('times', 'italic');
      const nameLines = doc.splitTextToSize(whisky.name ?? '', w - offsetX);
      const parts = [
        whisky.distillery,
        whisky.country,
        whisky.age ? `${whisky.age}y` : null,
        whisky.abv ? `${whisky.abv}%` : null,
        whisky.caskType,
        whisky.region,
      ].filter(Boolean);
      doc.setFontSize(metaFontSize);
      doc.setFont('helvetica', 'normal');
      const metaLines = doc.splitTextToSize(parts.join(' · '), w - offsetX) as string[];
      const consumed = 5 + nameLines.length * nameLineH + metaLines.length * metaLineH + 6;
      return { consumed, nameLines, metaLines };
    };

    const drawWhiskyEntry = (idx: number, x: number, yy: number, w: number, nameLines: string[], metaLines: string[]): number => {
      doc.setFontSize(numFontSize);
      doc.setTextColor(...GOLD_RGB);
      doc.setFont('helvetica', 'normal');
      doc.text(String(idx + 1), x, yy + 5);

      doc.setFontSize(nameFontSize);
      doc.setTextColor(...PRINT_BLACK_RGB);
      doc.setFont('times', 'italic');
      doc.text(nameLines, x + offsetX, yy + 5);

      doc.setFontSize(metaFontSize);
      doc.setTextColor(...PRINT_TEXTMUTED_RGB);
      doc.setFont('helvetica', 'normal');
      doc.text(metaLines, x + offsetX, yy + 5 + nameLines.length * nameLineH + 1);

      const consumed = 5 + nameLines.length * nameLineH + metaLines.length * metaLineH + 3;
      drawGoldLine(doc, x, yy + consumed, w, 0.15);
      return consumed + 3;
    };

    // Pre-measure all entries
    const measured = whiskies.map(w => measureEntry(w, colWidth));

    // Distribute entries across columns sequentially: fill left first, then right
    type Slot = { col: number; idx: number };
    const startY = y;
    const colXs: number[] = [];
    for (let c = 0; c < columns; c++) colXs.push(margin + c * (colWidth + colGap));

    const layoutPage = (startIdx: number, pageStartY: number): { lastIdx: number; pageOverflow: boolean } => {
      const planYs: number[] = colXs.map(() => pageStartY);
      const slots: Slot[] = [];
      const maxY = pageH - 14;
      let lastIdx = whiskies.length;
      let pageOverflow = false;

      for (let i = startIdx; i < whiskies.length; i++) {
        const entryH = measured[i].consumed;
        // Sequential: stay in the current (leftmost) column until it is full, then advance
        let bestCol = 0;
        while (bestCol < columns - 1 && planYs[bestCol] + entryH > maxY) {
          bestCol++;
        }
        if (planYs[bestCol] + entryH > maxY) {
          lastIdx = i;
          pageOverflow = true;
          break;
        }
        slots.push({ col: bestCol, idx: i });
        planYs[bestCol] += entryH;
      }

      const renderYs: number[] = colXs.map(() => pageStartY);
      slots.forEach(s => {
        const x = colXs[s.col];
        const yy = renderYs[s.col];
        const m = measured[s.idx];
        const c = drawWhiskyEntry(s.idx, x, yy, colWidth, m.nameLines, m.metaLines);
        renderYs[s.col] = yy + c;
      });
      return { lastIdx, pageOverflow };
    };

    let cursor = 0;
    let pageStartY = startY;
    let firstPage = true;
    while (cursor < whiskies.length) {
      if (!firstPage) {
        drawLineupFooter();
        doc.addPage([pageW, pageH]);
        pageStartY = drawLineupHeader(true);
      }
      const { lastIdx, pageOverflow } = layoutPage(cursor, pageStartY);
      cursor = lastIdx;
      firstPage = false;
      if (!pageOverflow) break;
    }
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...PRINT_TEXTMUTED_RGB);
    doc.text(tp("printableSheets.pdfBlindSamplesAwait", lang, { count: whiskies.length }), margin, y);
    y += 14;

    const cols = Math.min(whiskies.length, 5);
    const cellGap = 6;
    const cellW = (usableWidth - (cols - 1) * cellGap) / cols;
    const cellH = Math.min(32, cellW);

    for (let i = 0; i < whiskies.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = margin + col * (cellW + cellGap);
      const cy = y + row * (cellH + cellGap);

      doc.setDrawColor(...GOLD_RGB);
      doc.setLineWidth(0.5);
      doc.roundedRect(cx, cy, cellW, cellH, 2, 2, "S");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(16);
      doc.setTextColor(...GOLD_RGB);
      doc.text(`#${i + 1}`, cx + cellW / 2, cy + cellH / 2 + 2, { align: "center" });
    }
  }

  drawLineupFooter();
}

function drawRatingCircles(doc: jsPDF, x: number, y: number, _circleR: number, _circleGap: number, maxScore: number, availableW: number) {
  if (maxScore > 25) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("__ / " + maxScore, x + 2, y + 1);
    doc.setDrawColor(...LINE_GRAY);
    doc.setLineWidth(0.3);
    const fieldW = doc.getTextWidth("__ / " + maxScore) + 6;
    doc.line(x, y + 2, x + fieldW, y + 2);
    return;
  }

  const minGap = 0.8;
  const maxR = 2.5;
  const r = Math.min(maxR, (availableW - (maxScore - 1) * minGap) / (2 * maxScore));
  const gap = Math.max(minGap, (availableW - maxScore * r * 2) / Math.max(1, maxScore - 1));
  const finalR = Math.max(1.5, r);
  const finalGap = Math.max(0.5, gap);

  for (let s = 1; s <= maxScore; s++) {
    const cx = x + (s - 1) * (finalR * 2 + finalGap) + finalR;
    doc.setDrawColor(...SLATE);
    doc.setLineWidth(0.3);
    doc.circle(cx, y, finalR);
    doc.setFont("helvetica", "normal");
    const fontSize = finalR >= 2.5 ? 6 : finalR >= 2.0 ? 5.5 : finalR >= 1.6 ? 4.5 : 3.5;
    doc.setFontSize(fontSize);
    doc.setTextColor(...MUTED);
    doc.text(`${s}`, cx, y + (fontSize * 0.11), { align: "center" });
  }
}

async function drawScoringPage(
  doc: jsPDF,
  tasting: Tasting,
  whiskies: Whisky[],
  lang: string,
  isBlind: boolean,
  participant?: ParticipantInfo,
  orientation: "portrait" | "landscape" = "portrait",
  _whiskyImageCache?: Map<number, string>,
  hostName?: string,
) {
  const pageW = orientation === "portrait" ? 210 : 297;
  const pageH = orientation === "portrait" ? 297 : 210;
  const margin = 15;
  const usableWidth = pageW - 2 * margin;

  const DIMS = ['Nase', 'Gaumen', 'Abgang', 'Gesamt'] as const;
  const sheetMaxScore = tasting.ratingScale ?? 100;

  const LABEL_COL_W = 22;
  const circleAreaW = usableWidth - LABEL_COL_W;

  const DIM_ROW_H = 6.5;
  const HEADER_H = 8;
  const NOTE_H = 6;
  const BLIND_GUESS_H = 7;
  const ITEM_PADDING = 3;

  const itemHeight = HEADER_H + DIMS.length * DIM_ROW_H + NOTE_H + (isBlind ? BLIND_GUESS_H : 0) + ITEM_PADDING;

  const drawPageHeader = async () => {
    let hy = margin;
    doc.setFontSize(7);
    doc.setTextColor(...GOLD_RGB);
    doc.setFont('helvetica', 'normal');
    doc.text('BEWERTUNGSBOGEN', margin, hy + 3);

    doc.setFontSize(13);
    doc.setTextColor(...PRINT_BLACK_RGB);
    doc.setFont('times', 'italic');
    const titleLines = doc.splitTextToSize(tasting.title, usableWidth - 30).slice(0, 2);
    doc.text(titleLines, margin, hy + 10, { lineHeightFactor: 1.3 });

    const titleBlockH = titleLines.length * 13 * 0.353 * 1.3;
    const metaY = Math.max(hy + 15, hy + 9 + titleBlockH + 2);

    doc.setFontSize(7);
    doc.setTextColor(...PRINT_TEXTMUTED_RGB);
    doc.setFont('helvetica', 'normal');
    const headerMeta = [
      tasting.date ? formatDate(tasting.date, lang) : '',
      hostName ?? '',
    ].filter(Boolean).join(' · ');
    doc.text(headerMeta, margin, metaY);

    if (participant?.id && tasting.id) {
      const qrX = pageW - margin - 22;
      await generateParticipantQR(tasting.id, participant.id, participant.name, doc, qrX, hy, 20);
    }

    hy += 22;
    drawGoldLine(doc, margin, hy, usableWidth, 0.4);
    return hy + 5;
  };

  const drawPageFooter = () => {
    doc.setFontSize(6);
    doc.setTextColor(...PRINT_TEXTMUTED_RGB);
    doc.text('CaskSense', margin, pageH - 8);
    doc.text('casksense.com', pageW - margin, pageH - 8, { align: 'right' });
  };

  doc.addPage([pageW, pageH]);
  let y = await drawPageHeader();

  for (let i = 0; i < whiskies.length; i++) {
    const whisky = whiskies[i];

    if (i > 0 && y + itemHeight > pageH - 14) {
      drawPageFooter();
      doc.addPage([pageW, pageH]);
      y = await drawPageHeader();
    }

    doc.setFontSize(8);
    doc.setTextColor(...GOLD_RGB);
    doc.setFont('helvetica', 'bold');
    doc.text(String(i + 1), margin, y + 5);

    const whiskyName = isBlind
      ? `${tp("printableSheets.pdfSample", lang)} #${i + 1}`
      : (whisky.name ?? 'Unbekannt');

    doc.setFontSize(9);
    doc.setTextColor(...PRINT_BLACK_RGB);
    doc.setFont('times', 'italic');
    const nameX = margin + 6;
    const nameMaxW = usableWidth - 6;
    const nameLines = doc.splitTextToSize(whiskyName, nameMaxW);
    doc.text(nameLines[0] ?? '', nameX, y + 5);

    if (!isBlind) {
      const metaParts = [
        whisky.distillery,
        whisky.country,
        whisky.age ? `${whisky.age}y` : null,
        whisky.abv ? `${whisky.abv}%` : null,
        whisky.region,
        whisky.caskType,
      ].filter(Boolean);
      if (metaParts.length > 0) {
        doc.setFontSize(5.5);
        doc.setTextColor(...GOLD_RGB);
        doc.setFont('helvetica', 'normal');
        const metaStr = doc.splitTextToSize(metaParts.join(' · ').toUpperCase(), nameMaxW);
        doc.text(metaStr[0] ?? '', nameX, y + 7.5);
      }
    }

    const dimsStartY = y + HEADER_H;

    DIMS.forEach((dim, di) => {
      const ry = dimsStartY + di * DIM_ROW_H;
      const circleCenterY = ry + DIM_ROW_H / 2;

      doc.setFontSize(6);
      doc.setTextColor(...GOLD_RGB);
      doc.setFont('helvetica', 'normal');
      doc.text(dim.toUpperCase(), margin, circleCenterY + 0.5);

      const circleX = margin + LABEL_COL_W;
      drawRatingCircles(doc, circleX, circleCenterY, 2.5, 1.2, sheetMaxScore, circleAreaW);
    });

    const noteY = dimsStartY + DIMS.length * DIM_ROW_H + 1;
    doc.setFontSize(5.5);
    doc.setTextColor(...PRINT_TEXTMUTED_RGB);
    doc.setFont('helvetica', 'normal');
    doc.text('Notiz:', margin, noteY + 3.5);
    const noteLabelW = doc.getTextWidth('Notiz: ') + 1;
    drawGoldLine(doc, margin + noteLabelW, noteY + 3, usableWidth - noteLabelW, 0.2);

    if (isBlind) {
      const guessLabels = [
        tp("printableSheets.pdfGuessRegion", lang),
        tp("printableSheets.pdfGuessAge", lang),
        tp("printableSheets.pdfGuessAbv", lang),
      ];
      const guessY = noteY + NOTE_H - 1;
      doc.setFontSize(5);
      doc.setTextColor(...PRINT_TEXTMUTED_RGB);
      doc.setFont('helvetica', 'normal');
      const thirdW = usableWidth / 3;
      guessLabels.forEach((lbl, gi) => {
        const gx = margin + gi * thirdW;
        doc.text(lbl + ':', gx, guessY + 3);
        const lw = doc.getTextWidth(lbl + ': ');
        drawGoldLine(doc, gx + lw, guessY + 2.5, thirdW - lw - 3, 0.2);
      });
    }

    y += itemHeight;
    drawGoldLine(doc, margin, y - ITEM_PADDING + 1, usableWidth, 0.15);
  }

  drawPageFooter();
}

async function drawTastingMat(
  doc: jsPDF,
  tasting: Tasting,
  whiskies: Whisky[],
  lang: string,
  isBlind: boolean,
  participant?: ParticipantInfo,
  orientation: "portrait" | "landscape" = "portrait",
  hostName?: string,
) {
  const pageW = orientation === "portrait" ? 210 : 297;
  const pageH = orientation === "portrait" ? 297 : 210;
  const margin = 15;
  const usableWidth = pageW - 2 * margin;

  doc.addPage([pageW, pageH]);

  let y = margin;

  doc.setFontSize(7);
  doc.setTextColor(...GOLD_RGB);
  doc.text('TASTING-MATTE', margin, y + 3);

  doc.setFontSize(14);
  doc.setTextColor(...PRINT_BLACK_RGB);
  doc.setFont('times', 'italic');
  doc.text(tasting.title, margin, y + 10);

  const dramsLabel = `${whiskies.length} ${whiskies.length === 1 ? 'Dram' : 'Drams'}`;
  const dateStr = tasting.date ? formatDate(tasting.date, lang) : '';
  doc.setFontSize(7);
  doc.setTextColor(...PRINT_TEXTMUTED_RGB);
  doc.setFont('helvetica', 'normal');
  doc.text([dramsLabel, dateStr, hostName].filter(Boolean).join(' · '), margin, y + 15);

  if (participant?.id && tasting.id) {
    const qrX = pageW - margin - 22;
    await generateParticipantQR(tasting.id, participant.id, participant.name, doc, qrX, y, 20);
  }

  y += 22;
  drawGoldLine(doc, margin, y, usableWidth, 0.4);
  y += 6;

  const matMaxScore = tasting.ratingScale ?? 100;
  doc.setFontSize(6);
  doc.setTextColor(...GOLD_RGB);
  doc.text('#', margin, y);
  doc.text('STICHWORT', margin + 14, y);
  doc.text(`SCORE / ${matMaxScore}`, usableWidth * 0.55 + margin, y);
  doc.text('FAVORIT', usableWidth * 0.78 + margin, y);
  y += 4;
  drawGoldLine(doc, margin, y, usableWidth, 0.3);
  y += 4;

  for (let i = 0; i < whiskies.length; i++) {
    const whisky = whiskies[i];
    const rowY = y;

    doc.setFontSize(13);
    doc.setTextColor(...GOLD_RGB);
    doc.setFont('helvetica', 'normal');
    doc.text(String(i + 1), margin, rowY + 7);

    doc.setFontSize(8);
    doc.setTextColor(...PRINT_TEXTMUTED_RGB);
    doc.setFont('times', 'italic');
    const displayName = isBlind ? `${tp("printableSheets.pdfSample", lang)}` : (whisky.name ?? '');
    const matNameLines = doc.splitTextToSize(displayName, usableWidth * 0.38);
    const matNameDisplay = matNameLines.length > 1
      ? `${matNameLines[0].trimEnd()}…`
      : (matNameLines[0] ?? '');
    doc.text(matNameDisplay, margin + 14, rowY + 4);

    drawGoldLine(doc, margin + 14, rowY + 8, usableWidth * 0.38, 0.4);
    doc.setFontSize(6);
    doc.setTextColor(...PRINT_TEXTMUTED_RGB);
    doc.setFont('helvetica', 'normal');
    doc.text('Stichwort', margin + 14, rowY + 7);

    const scoreX = usableWidth * 0.55 + margin;
    drawGoldLine(doc, scoreX, rowY + 8, usableWidth * 0.18, 0.4);
    doc.setFontSize(6);
    doc.setTextColor(...GOLD_RGB);
    doc.text(`/ ${matMaxScore}`, scoreX + usableWidth * 0.19, rowY + 7.5);

    const cbX = usableWidth * 0.78 + margin;
    doc.setDrawColor(...GOLD_RGB);
    doc.setLineWidth(0.4);
    doc.rect(cbX, rowY + 3, 5, 5, 'S');
    doc.setFontSize(6);
    doc.setTextColor(...PRINT_TEXTMUTED_RGB);
    doc.text('Ja', cbX + 7, rowY + 7);

    y += 11;
    drawGoldLine(doc, margin, y, usableWidth, 0.15);
    y += 3;

    const isLast = i === whiskies.length - 1;
    const reachedPageCap = (i + 1) % 12 === 0;
    if (!isLast && (reachedPageCap || y > pageH - 25)) {
      doc.setFontSize(6);
      doc.setTextColor(...PRINT_TEXTMUTED_RGB);
      doc.text('CaskSense', margin, pageH - 8);
      doc.text('casksense.com', pageW - margin, pageH - 8, { align: 'right' });
      doc.addPage([pageW, pageH]);
      y = margin;
    }
  }

  doc.setFontSize(6);
  doc.setTextColor(...PRINT_TEXTMUTED_RGB);
  doc.text('CaskSense', margin, pageH - 8);
  doc.text('casksense.com', pageW - margin, pageH - 8, { align: 'right' });
}

async function preloadWhiskyImages(whiskies: Whisky[], isBlind: boolean): Promise<Map<number, string>> {
  const cache = new Map<number, string>();
  if (isBlind) return cache;
  for (let i = 0; i < whiskies.length; i++) {
    if (whiskies[i].imageUrl) {
      const data = await loadImageAsBase64(whiskies[i].imageUrl!);
      if (data) cache.set(i, data);
    }
  }
  return cache;
}

export async function generateTastingNotesSheet(tasting: Tasting, whiskies: Whisky[], lang: string, participant?: ParticipantInfo, mode: "download" | "print" = "download", hostName?: string, orientation: "portrait" | "landscape" = "portrait", styleTheme?: PdfStyleTheme | null) {
  if (whiskies.length === 0) return;
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

  let coverImageBase64: string | null = null;
  if (tasting.coverImageUrl) {
    coverImageBase64 = await loadImageAsBase64(tasting.coverImageUrl);
  }

  await drawCoverPage(doc, tasting, whiskies, lang, false, participant, coverImageBase64, hostName, orientation, styleTheme);

  await drawLineupPage(doc, tasting, whiskies, lang, false, hostName, orientation);

  await drawScoringPage(doc, tasting, whiskies, lang, false, participant, orientation, undefined, hostName);

  await drawTastingMat(doc, tasting, whiskies, lang, false, participant, orientation, hostName);

  await saveOrPrintJsPdf(doc, `${tasting.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_Notizblatt.pdf`, mode);
}

export async function generateBlindEvaluationSheet(tasting: Tasting, whiskies: Whisky[], lang: string, participant?: ParticipantInfo, mode: "download" | "print" = "download", hostName?: string, orientation: "portrait" | "landscape" = "portrait", styleTheme?: PdfStyleTheme | null) {
  if (whiskies.length === 0) return;
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

  let coverImageBase64: string | null = null;
  if (tasting.coverImageUrl) {
    coverImageBase64 = await loadImageAsBase64(tasting.coverImageUrl);
  }

  await drawCoverPage(doc, tasting, whiskies, lang, true, participant, coverImageBase64, hostName, orientation, styleTheme);

  await drawLineupPage(doc, tasting, whiskies, lang, true, hostName, orientation);

  await drawScoringPage(doc, tasting, whiskies, lang, true, participant, orientation, undefined, hostName);

  await drawTastingMat(doc, tasting, whiskies, lang, true, participant, orientation, hostName);

  await saveOrPrintJsPdf(doc, `${tasting.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_Bewertungsbogen.pdf`, mode);
}

function drawCompactRatingCell(
  doc: jsPDF,
  x: number,
  centerY: number,
  width: number,
  maxScore: number,
): void {
  if (maxScore <= 10) {
    const n = maxScore;
    const minGap = 0.3;
    const maxR = 1.3;
    const r = Math.min(maxR, (width - (n - 1) * minGap) / (2 * n));
    const gap = n > 1 ? (width - n * r * 2) / (n - 1) : 0;
    const totalW = n * r * 2 + (n - 1) * gap;
    const startX = x + (width - totalW) / 2 + r;
    doc.setDrawColor(...GOLD_RGB);
    doc.setLineWidth(0.22);
    for (let s = 0; s < n; s++) {
      const cx = startX + s * (r * 2 + gap);
      doc.circle(cx, centerY, r, 'S');
    }
  } else {
    const scaleText = `/ ${maxScore}`;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PRINT_TEXTMUTED_RGB);
    const textW = doc.getTextWidth(scaleText);
    const lineEndX = x + width - textW - 2;
    doc.setDrawColor(210, 220, 225);
    doc.setLineWidth(0.28);
    doc.line(x, centerY + 1.5, lineEndX, centerY + 1.5);
    doc.text(scaleText, x + width, centerY + 2, { align: 'right' });
  }
}

async function drawCompactSinglePage(
  doc: jsPDF,
  tasting: Tasting,
  whiskies: Whisky[],
  lang: string,
  isBlind: boolean,
  participant?: ParticipantInfo,
  hostName?: string,
  addNewPage = true,
) {
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const usableW = pageW - 2 * margin;

  const COL_NUM  = 8;
  const COL_NAME = 58;
  const COL_RATING = (usableW - COL_NUM - COL_NAME) / 4;

  const X_NUM    = margin;
  const X_NAME   = X_NUM + COL_NUM;
  const X_NASE   = X_NAME + COL_NAME;
  const X_GAUMEN = X_NASE   + COL_RATING;
  const X_ABGANG = X_GAUMEN + COL_RATING;
  const X_GESAMT = X_ABGANG + COL_RATING;
  const colXs = [X_NASE, X_GAUMEN, X_ABGANG, X_GESAMT];
  const colLabels = ['Nase', 'Gaumen', 'Abgang', 'Gesamt'];

  const sheetMaxScore = tasting.ratingScale ?? 100;
  const TOTAL_ROWS = 12;

  const HEADER_H = 26;
  const FOOTER_H = 14;
  const TABLE_TOP = margin + HEADER_H;
  const TABLE_H   = pageH - TABLE_TOP - FOOTER_H;
  const TH_H      = 8;
  const ROW_H     = (TABLE_H - TH_H) / TOTAL_ROWS;

  if (addNewPage) {
    doc.addPage([pageW, pageH]);
  }

  let y = margin;

  doc.setFontSize(6);
  doc.setTextColor(...GOLD_RGB);
  doc.setFont('helvetica', 'normal');
  doc.text('BEWERTUNGSBOGEN · KOMPAKT', margin, y + 3);

  doc.setFontSize(11);
  doc.setTextColor(...PRINT_BLACK_RGB);
  doc.setFont('times', 'italic');
  const titleLines = doc.splitTextToSize(tasting.title, usableW - 30).slice(0, 2);
  doc.text(titleLines, margin, y + 10, { lineHeightFactor: 1.3 });

  doc.setFontSize(6.5);
  doc.setTextColor(...PRINT_TEXTMUTED_RGB);
  doc.setFont('helvetica', 'normal');
  const metaParts = [tasting.date ? formatDate(tasting.date, lang) : '', hostName ?? ''].filter(Boolean);
  if (metaParts.length) doc.text(metaParts.join(' · '), margin, y + 21);

  if (participant?.id && tasting.id) {
    await generateParticipantQR(tasting.id, participant.id, participant.name, doc, pageW - margin - 17, margin, 15);
  }
  if (participant?.name) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRINT_BLACK_RGB);
    const nameX = participant?.id ? pageW - margin - 21 : pageW - margin;
    doc.text(participant.name, nameX, margin + 3, { align: 'right' });
  }

  drawGoldLine(doc, margin, TABLE_TOP, usableW, 0.5);

  const TH_Y = TABLE_TOP + TH_H;

  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRINT_TEXTMUTED_RGB);
  doc.text('#', X_NUM + COL_NUM / 2, TABLE_TOP + TH_H * 0.65, { align: 'center' });
  doc.text('Whisky', X_NAME + 2, TABLE_TOP + TH_H * 0.65);
  doc.setTextColor(...GOLD_RGB);
  colLabels.forEach((lbl, i) => {
    doc.text(lbl.toUpperCase(), colXs[i] + COL_RATING / 2, TABLE_TOP + TH_H * 0.65, { align: 'center' });
  });

  drawGoldLine(doc, margin, TH_Y, usableW, 0.4);

  for (let row = 0; row < TOTAL_ROWS; row++) {
    const rowTop = TH_Y + row * ROW_H;
    const rowMid = rowTop + ROW_H * 0.52;
    const rowBot = rowTop + ROW_H;

    const whisky = whiskies[row];

    doc.setFontSize(6.5);
    doc.setFont('helvetica', row < whiskies.length ? 'bold' : 'normal');
    doc.setTextColor(row < whiskies.length ? GOLD_RGB[0] : PRINT_TEXTMUTED_RGB[0],
                     row < whiskies.length ? GOLD_RGB[1] : PRINT_TEXTMUTED_RGB[1],
                     row < whiskies.length ? GOLD_RGB[2] : PRINT_TEXTMUTED_RGB[2]);
    doc.text(String(row + 1), X_NUM + COL_NUM / 2, rowMid, { align: 'center' });

    if (whisky) {
      const whiskyName = isBlind
        ? `${tp('printableSheets.pdfSample', lang)} #${row + 1}`
        : (whisky.name ?? 'Unbekannt');

      doc.setFontSize(7);
      doc.setFont('times', 'italic');
      doc.setTextColor(...PRINT_BLACK_RGB);
      const nameLines = doc.splitTextToSize(whiskyName, COL_NAME - 3);
      const hasTwo = nameLines.length > 1;
      doc.text(nameLines[0] ?? '', X_NAME + 2, rowMid - (hasTwo ? 1.8 : 0));
      if (hasTwo) doc.text(nameLines[1], X_NAME + 2, rowMid + 2.5);

      if (!isBlind) {
        const meta = [whisky.distillery, whisky.age ? `${whisky.age}y` : null, whisky.abv ? `${whisky.abv}%` : null]
          .filter(Boolean).join(' · ');
        if (meta) {
          doc.setFontSize(5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...PRINT_TEXTMUTED_RGB);
          doc.text(meta, X_NAME + 2, rowMid + (hasTwo ? 5.5 : 3.5));
        }
      }
    }

    const cellPad = 3;
    const cellW = COL_RATING - cellPad * 2;
    colXs.forEach(colX => {
      drawCompactRatingCell(doc, colX + cellPad, rowMid, cellW, sheetMaxScore);
    });

    drawGoldLine(doc, margin, rowBot, usableW, row < TOTAL_ROWS - 1 ? 0.12 : 0.3);
  }

  doc.setFontSize(5.5);
  doc.setTextColor(...PRINT_TEXTMUTED_RGB);
  doc.setFont('helvetica', 'normal');
  doc.text('CaskSense · casksense.com', pageW / 2, pageH - 5, { align: 'center' });
}

export async function generateCompactBatchPdf(
  tasting: Tasting,
  whiskies: Whisky[],
  participants: { id: string; name: string }[],
  lang: string,
  type: "tasting" | "blind",
  hostName?: string,
) {
  if (whiskies.length === 0 || participants.length === 0) return;
  const isBlind = type === "blind";
  const titleSlug = tasting.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_");

  for (const p of participants) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const participantInfo: ParticipantInfo = { name: p.name, id: p.id };
    await drawCompactSinglePage(doc, tasting, whiskies, lang, isBlind, participantInfo, hostName, false);
    const nameSlug = p.name.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_");
    await saveJsPdf(doc, `${titleSlug}_Kompakt_${nameSlug}.pdf`);
  }
}

export async function generateCompactMasterPdf(
  tasting: Tasting,
  whiskies: Whisky[],
  participants: { id: string; name: string }[],
  lang: string,
  type: "tasting" | "blind",
  hostName?: string,
) {
  if (whiskies.length === 0 || participants.length === 0) return;
  const isBlind = type === "blind";
  const titleSlug = tasting.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    const participantInfo: ParticipantInfo = { name: p.name, id: p.id };
    await drawCompactSinglePage(doc, tasting, whiskies, lang, isBlind, participantInfo, hostName, i > 0);
  }

  await saveJsPdf(doc, `${titleSlug}_Kompakt_Alle.pdf`);
}

export async function generateBatchPersonalizedPdf(
  tasting: Tasting,
  whiskies: Whisky[],
  participants: { id: string; name: string }[],
  lang: string,
  type: "tasting" | "blind",
  mode: "download" | "print" = "download",
  hostName?: string,
  orientation: "portrait" | "landscape" = "portrait",
  styleTheme?: PdfStyleTheme | null,
) {
  if (whiskies.length === 0 || participants.length === 0) return;

  const isBlind = type === "blind";

  let coverImageBase64: string | null = null;
  if (tasting.coverImageUrl) {
    coverImageBase64 = await loadImageAsBase64(tasting.coverImageUrl);
  }

  const suffix = isBlind ? "Bewertungsbogen" : "Notizblatt";
  const titleSlug = tasting.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_");

  for (let pIdx = 0; pIdx < participants.length; pIdx++) {
    const p = participants[pIdx];
    const participantInfo: ParticipantInfo = { name: p.name, id: p.id };

    const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

    await drawCoverPage(doc, tasting, whiskies, lang, isBlind, undefined, coverImageBase64, hostName, orientation, styleTheme);

    await drawLineupPage(doc, tasting, whiskies, lang, isBlind, hostName, orientation);

    await drawScoringPage(doc, tasting, whiskies, lang, isBlind, participantInfo, orientation, undefined, hostName);

    await drawTastingMat(doc, tasting, whiskies, lang, isBlind, participantInfo, orientation, hostName);

    const nameSlug = p.name.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_");
    await saveJsPdf(doc, `${titleSlug}_${suffix}_${nameSlug}.pdf`);
  }
}

interface PrintableTastingSheetsProps {
  tasting: Tasting;
  whiskies: Whisky[];
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(rgb: RGB): string {
  return "#" + rgb.map(c => c.toString(16).padStart(2, "0")).join("");
}

export function PrintableTastingSheets({ tasting, whiskies }: PrintableTastingSheetsProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [styleTheme, setStyleTheme] = useState<PdfStyleTheme | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStyleOpen, setAiStyleOpen] = useState(false);
  const lang = i18n.language;
  const isBlind = tasting.blindMode;
  const { currentParticipant } = useAppStore();

  const { data: profile } = useQuery({
    queryKey: ["profile", currentParticipant?.id],
    queryFn: () => profileApi.get(currentParticipant!.id),
    enabled: !!currentParticipant && open,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["tasting-participants", tasting.id],
    queryFn: () => tastingApi.getParticipants(tasting.id),
    enabled: open,
  });

  const { data: sessionInvites = [] } = useQuery({
    queryKey: ["tasting-invites", tasting.id],
    queryFn: () => inviteApi.getForTasting(tasting.id),
    enabled: open,
  });

  const joinedEmails = new Set(
    participants.map((p: { email?: string }) => (p.email ?? "").toLowerCase()).filter(Boolean)
  );
  const pendingInvitees: { id: string; name: string }[] = (sessionInvites as { id: string; email: string; status: string; token: string }[])
    .filter(inv => inv.status === "invited" && !joinedEmails.has((inv.email ?? "").toLowerCase()))
    .map(inv => ({
      id: "",
      name: inv.email,
    }));

  const allRecipients: { id: string; name: string }[] = [
    ...participants.map((p: { participantId?: string; id?: string; name?: string; participant?: { name?: string } }) => ({
      id: p.participantId || p.id || "",
      name: p.name || p.participant?.name || "Unknown",
    })),
    ...pendingInvitees,
  ];
  const totalRecipients = allRecipients.length;

  const participantInfo: ParticipantInfo | undefined = currentParticipant
    ? { name: currentParticipant.name, photoUrl: profile?.photoUrl, id: currentParticipant.id }
    : undefined;

  const hostName = participants.find((p: any) => (p.participantId || p.id) === tasting.hostId)?.name
    || participants.find((p: any) => (p.participantId || p.id) === tasting.hostId)?.participant?.name
    || undefined;

  const handleAction = (type: "tasting" | "blind", mode: "download" | "print") => {
    if (type === "tasting") {
      generateTastingNotesSheet(tasting, whiskies, lang, participantInfo, mode, hostName, orientation, styleTheme);
    } else {
      generateBlindEvaluationSheet(tasting, whiskies, lang, participantInfo, mode, hostName, orientation, styleTheme);
    }
  };

  const handleBatchAction = async (type: "tasting" | "blind", mode: "download" | "print") => {
    if (totalRecipients === 0) return;
    setBatchLoading(true);
    try {
      await generateBatchPersonalizedPdf(tasting, whiskies, allRecipients, lang, type, mode, hostName, orientation, styleTheme);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleCompactBatch = async () => {
    if (totalRecipients === 0) return;
    setBatchLoading(true);
    try {
      await generateCompactBatchPdf(tasting, whiskies, allRecipients, lang, isBlind ? "blind" : "tasting", hostName);
    } finally {
      setBatchLoading(false);
    }
  };

  const [masterLoading, setMasterLoading] = useState(false);

  const handleCompactMaster = async () => {
    if (totalRecipients === 0) return;
    setMasterLoading(true);
    try {
      await generateCompactMasterPdf(tasting, whiskies, allRecipients, lang, isBlind ? "blind" : "tasting", hostName);
    } finally {
      setMasterLoading(false);
    }
  };

  const handleGenerateStyle = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (currentParticipant?.id) headers["x-participant-id"] = currentParticipant.id;
      const res = await fetch(`/api/tastings/${tasting.id}/pdf-style`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          whiskies: whiskies.map(w => ({ name: w.name, region: w.region, caskType: w.caskType })),
          tastingTitle: tasting.title,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const cs = data.colorScheme;
      setStyleTheme({
        tagline: data.tagline,
        colorScheme: {
          primary: typeof cs.primary === "string" ? hexToRgb(cs.primary) : cs.primary,
          accent: typeof cs.accent === "string" ? hexToRgb(cs.accent) : cs.accent,
          background: typeof cs.background === "string" ? hexToRgb(cs.background) : cs.background,
          textDark: typeof cs.textDark === "string" ? hexToRgb(cs.textDark) : cs.textDark,
          textLight: typeof cs.textLight === "string" ? hexToRgb(cs.textLight) : cs.textLight,
        },
        mood: data.mood,
      });
    } catch {
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/30 text-primary font-serif" data-testid="button-printable-sheets">
          <Printer className="w-4 h-4 mr-1" />
          {t("printableSheets.printSheets")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-primary flex items-center gap-2">
            <Printer className="w-5 h-5" />
            {t("printableSheets.printableSheetsTitle")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("printableSheets.printableSheetsDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t("printableSheets.orientation")}</span>
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                onClick={() => setOrientation("portrait")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${orientation === "portrait" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                data-testid="button-orientation-portrait"
              >
                <Smartphone className="w-3.5 h-3.5" />
                {t("printableSheets.portrait")}
              </button>
              <button
                onClick={() => setOrientation("landscape")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${orientation === "landscape" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                data-testid="button-orientation-landscape"
              >
                <Monitor className="w-3.5 h-3.5" />
                {t("printableSheets.landscape")}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setAiStyleOpen(!aiStyleOpen)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
              data-testid="button-toggle-ai-style"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium">{t("printableSheets.aiStyle")}</span>
              </div>
              {aiStyleOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {aiStyleOpen && (
              <div className="p-3 pt-0 space-y-2 border-t border-border">
                <p className="text-[11px] text-muted-foreground">{t("printableSheets.aiStyleDesc")}</p>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={t("printableSheets.aiStylePromptPlaceholder")}
                  className="text-xs min-h-[60px] resize-none"
                  data-testid="input-ai-style-prompt"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!aiPrompt.trim() || aiLoading}
                    onClick={handleGenerateStyle}
                    className="flex-1 text-xs"
                    data-testid="button-generate-style"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                    )}
                    {aiLoading ? t("printableSheets.generatingStyle") : t("printableSheets.generateStyle")}
                  </Button>
                  {styleTheme && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setStyleTheme(null); setAiPrompt(""); }}
                      className="text-xs"
                      data-testid="button-reset-style"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      {t("printableSheets.resetStyle")}
                    </Button>
                  )}
                </div>
                {styleTheme && (
                  <div className="p-2 rounded-md bg-muted/50 space-y-1.5" data-testid="style-preview">
                    <p className="text-[11px] italic text-foreground">"{styleTheme.tagline}"</p>
                    <div className="flex items-center gap-1.5">
                      {Object.entries(styleTheme.colorScheme).map(([key, rgb]) => (
                        <div
                          key={key}
                          className="w-5 h-5 rounded-full border border-border"
                          style={{ backgroundColor: rgbToHex(rgb) }}
                          title={key}
                        />
                      ))}
                      <span className="text-[10px] text-muted-foreground ml-1">{styleTheme.mood}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg border border-border space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif font-semibold text-foreground">
                  {t("printableSheets.tastingNotesTitle")}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t("printableSheets.tastingNotesDesc", { count: whiskies.length })}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={whiskies.length === 0}
                onClick={() => handleAction("tasting", "download")}
                className="flex-1 text-xs"
                data-testid="button-download-tasting-notes"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                {t("printableSheets.downloadPdf")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={whiskies.length === 0}
                onClick={() => handleAction("tasting", "print")}
                className="flex-1 text-xs"
                data-testid="button-print-tasting-notes"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                {t("printableSheets.print")}
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <EyeOff className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif font-semibold text-foreground">
                  {t("printableSheets.blindSheetTitle")}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t("printableSheets.blindSheetDesc", { count: whiskies.length })}
                </div>
                {isBlind && (
                  <span className="inline-block mt-1 text-[10px] bg-amber-500/10 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                    {t("printableSheets.recommended")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={whiskies.length === 0}
                onClick={() => handleAction("blind", "download")}
                className="flex-1 text-xs"
                data-testid="button-download-blind-sheet"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                {t("printableSheets.downloadPdf")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={whiskies.length === 0}
                onClick={() => handleAction("blind", "print")}
                className="flex-1 text-xs"
                data-testid="button-print-blind-sheet"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                {t("printableSheets.print")}
              </Button>
            </div>
          </div>

          {totalRecipients > 0 && (
            <div className="p-4 rounded-lg border border-border space-y-3 bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-serif font-semibold text-foreground">
                    {t("printableSheets.batchTitle", "Für alle Teilnehmer")}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {participants.length} {t("printableSheets.batchJoined", "angemeldet")}
                    {pendingInvitees.length > 0 && ` · ${pendingInvitees.length} ${t("printableSheets.batchInvited", "eingeladen")}`}
                    {" · "}{totalRecipients} {t("printableSheets.batchTotal", "gesamt")}
                  </div>
                  <span className="inline-block mt-1 text-[10px] bg-green-500/10 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                    {t("printableSheets.batchQrNote", "Angemeldete erhalten einen persönlichen QR-Code")}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-medium text-muted-foreground">{t("printableSheets.batchFullSheets", "Vollständige Bögen (Cover + Lineup + Bewertung + Matte)")}</div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={whiskies.length === 0 || batchLoading}
                    onClick={() => handleBatchAction(isBlind ? "blind" : "tasting", "download")}
                    className="flex-1 text-xs"
                    data-testid="button-batch-download"
                  >
                    {batchLoading ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 mr-1" />
                    )}
                    {t("printableSheets.downloadPdf")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={whiskies.length === 0 || batchLoading}
                    onClick={() => handleBatchAction(isBlind ? "blind" : "tasting", "print")}
                    className="flex-1 text-xs"
                    data-testid="button-batch-print"
                  >
                    {batchLoading ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Printer className="w-3.5 h-3.5 mr-1" />
                    )}
                    {t("printableSheets.print")}
                  </Button>
                </div>

                <div className="text-[11px] font-medium text-muted-foreground pt-1">{t("printableSheets.batchCompact", "Kompakt: alle Whiskys auf einer Seite")}</div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={whiskies.length === 0 || batchLoading || masterLoading}
                    onClick={handleCompactBatch}
                    className="flex-1 text-xs"
                    data-testid="button-batch-compact"
                  >
                    {batchLoading ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 mr-1" />
                    )}
                    {t("printableSheets.compactIndividual", "Einzeln")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={whiskies.length === 0 || batchLoading || masterLoading}
                    onClick={handleCompactMaster}
                    className="flex-1 text-xs"
                    data-testid="button-compact-master"
                  >
                    {masterLoading ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Users className="w-3.5 h-3.5 mr-1" />
                    )}
                    {t("printableSheets.compactMaster", "Alle in einem PDF")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 text-[11px] text-muted-foreground text-center">
          {t("printableSheets.a4Notice")}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function generateBlankTastingSheet(lang: string, slots = 6) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const marginX = 15;
  const contentW = pageW - 2 * marginX;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text(tp("printableSheets.pdfScoreSheet", lang), pageW / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(...SLATE);
  doc.text(`${tp("printableSheets.pdfName", lang)}: ________________________   ${tp("printableSheets.pdfDate", lang)}: ________________`, pageW / 2, 30, { align: "center" });

  let y = 40;
  const slotH = (280 - y) / slots;

  for (let i = 0; i < slots; i++) {
    const sy = y + i * slotH;

    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(marginX, sy, contentW, slotH - 4, 2, 2, "F");
    doc.setDrawColor(...LINE_GRAY);
    doc.roundedRect(marginX, sy, contentW, slotH - 4, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(`#${i + 1}  ___________________________________`, marginX + 6, sy + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);

    const labels = [tp("printableSheets.labelNose", lang), tp("printableSheets.labelPalate", lang), tp("printableSheets.labelFinish", lang), tp("printableSheets.labelOverall", lang)];

    const lineY = sy + 14;
    const lineSpacing = (slotH - 22) / labels.length;
    labels.forEach((lbl, li) => {
      const ly = lineY + li * lineSpacing;
      doc.text(lbl, marginX + 6, ly);
      doc.setDrawColor(...LINE_GRAY);
      doc.line(marginX + 6 + (li === labels.length - 1 ? 30 : 20), ly + 1, marginX + contentW - 6, ly + 1);
    });
  }

  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("CaskSense · casksense.com", pageW / 2, 292, { align: "center" });

  saveJsPdf(doc, `${tp("printableSheets.pdfScoreSheet", lang).replace(/\s+/g, "_")}.pdf`);
}

export function generateBlankTastingMat(lang: string, slots = 6, ratingScale = 10) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = 297;
  const pageH = 210;
  const marginX = 12;
  const marginY = 15;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text(tp("printableSheets.pdfTastingMat", lang), pageW / 2, 14, { align: "center" });

  const cols = Math.min(slots, 3);
  const rows = Math.ceil(slots / cols);
  const cellW = (pageW - 2 * marginX - (cols - 1) * 6) / cols;
  const cellH = (pageH - marginY - 20 - (rows - 1) * 6) / rows;

  for (let i = 0; i < slots; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = marginX + col * (cellW + 6);
    const cy = marginY + 6 + row * (cellH + 6);

    doc.setDrawColor(...LINE_GRAY);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cx, cy, cellW, cellH, 3, 3, "FD");

    doc.setDrawColor(...AMBER);
    doc.setLineWidth(0.5);
    const circleR = Math.min(cellW, cellH) * 0.18;
    doc.circle(cx + cellW / 2, cy + cellH * 0.38, circleR);
    doc.setLineWidth(0.3);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(`#${i + 1}`, cx + cellW / 2, cy + 8, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.text(`${tp("printableSheets.pdfName", lang)}: ___________________`, cx + 6, cy + cellH - 14);
    doc.text(`${tp("printableSheets.pdfRatingLabel", lang)}: __ / ${ratingScale}`, cx + 6, cy + cellH - 8);
  }

  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("CaskSense · casksense.com", pageW / 2, pageH - 5, { align: "center" });

  saveJsPdf(doc, `${tp("printableSheets.pdfTastingMat", lang).replace(/\s+/g, "_")}.pdf`);
}
