import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { profileApi, tastingApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Printer, FileDown, ClipboardList, EyeOff, Download, Users, Loader2, Monitor, Smartphone, Sparkles, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import type { Whisky, Tasting } from "@shared/schema";
import jsPDF from "jspdf";
import { saveOrPrintJsPdf } from "@/lib/pdf";
import i18n from "@/lib/i18n";
import QRCodeLib from "qrcode";

type RGB = [number, number, number];

const NAVY: RGB = [30, 41, 59];
const SLATE: RGB = [71, 85, 105];
const MUTED: RGB = [148, 163, 184];
const LIGHT_BG: RGB = [248, 250, 252];
const AMBER: RGB = [180, 130, 30];
const LINE_GRAY: RGB = [200, 210, 220];

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

function formatDate(dateStr: string, lang: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", {
      day: "numeric", month: "long", year: "numeric"
    });
  } catch { return dateStr; }
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

function drawHeader(doc: jsPDF, tasting: Tasting, lang: string, isBlind: boolean) {
  const pageW = 210;
  const marginX = 15;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 32, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(tasting.title, pageW - marginX * 2 - 60);
  doc.text(titleLines, marginX, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(200, 210, 220);
  const dateStr = formatDate(tasting.date, lang);
  const locationStr = tasting.location && tasting.location !== "—" ? ` · ${tasting.location}` : "";
  doc.text(`${dateStr}${locationStr}`, marginX, titleLines.length > 1 ? 24 : 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(180, 190, 200);
  const codeLabel = lang === "de" ? "Code" : "Code";
  doc.text(`${codeLabel}: ${tasting.code}`, marginX, 28);

  doc.text("CaskSense", pageW - marginX, 28, { align: "right" });

  if (isBlind) {
    doc.setFillColor(...AMBER);
    doc.roundedRect(pageW - marginX - 30, 8, 30, 10, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text("BLIND", pageW - marginX - 15, 14.5, { align: "center" });
  }
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageW = 210;
  const pageH = 297;

  doc.setDrawColor(...LINE_GRAY);
  doc.setLineWidth(0.3);
  doc.line(15, pageH - 12, pageW - 15, pageH - 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("CaskSense", 15, pageH - 7);
  doc.text(`${pageNum} / ${totalPages}`, pageW - 15, pageH - 7, { align: "right" });
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
  if (w.age && w.age !== "NAS") parts.push(`${w.age}y`);
  if (w.age === "NAS" || w.age === "n.a.s.") parts.push("NAS");
  if (w.abv != null) parts.push(`${w.abv}%`);
  if (w.region) parts.push(w.region);
  if (w.caskInfluence) parts.push(w.caskInfluence);
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
  const marginX = orientation === "landscape" ? 22 : 18;
  const contentW = pageW - marginX * 2;

  const bgColor: RGB = styleTheme?.colorScheme?.background || [252, 251, 248];
  const primaryColor: RGB = styleTheme?.colorScheme?.primary || NAVY;
  const accentColor: RGB = styleTheme?.colorScheme?.accent || AMBER;
  const textDark: RGB = styleTheme?.colorScheme?.textDark || NAVY;
  const textLight: RGB = styleTheme?.colorScheme?.textLight || [255, 255, 255];

  doc.setFillColor(...bgColor);
  doc.rect(0, 0, pageW, pageH, "F");

  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageW, 6, "F");
  doc.setFillColor(...accentColor);
  doc.rect(0, 6, pageW, 1.5, "F");

  let y = 22;

  if (isBlind) {
    doc.setFillColor(...accentColor);
    doc.roundedRect(marginX, y - 5, 42, 10, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...textLight);
    doc.text(tp("printableSheets.pdfBlindTasting", lang), marginX + 21, y + 1, { align: "center" });
    y += 12;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...textDark);
  const titleLines = doc.splitTextToSize(tasting.title, contentW);
  doc.text(titleLines, marginX, y);
  y += titleLines.length * 10 + 4;

  if (styleTheme?.tagline) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(...accentColor);
    const taglineLines = doc.splitTextToSize(styleTheme.tagline, contentW);
    doc.text(taglineLines, marginX, y);
    y += taglineLines.length * 5 + 2;
  }

  doc.setDrawColor(...accentColor);
  doc.setLineWidth(1);
  doc.line(marginX, y, marginX + 40, y);
  y += 8;

  const metaFontSize = 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(metaFontSize);
  doc.setTextColor(...SLATE);

  if (hostName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(tp("printableSheets.pdfCoverHost", lang).toUpperCase(), marginX, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(metaFontSize);
    doc.setTextColor(...textDark);
    doc.text(hostName, marginX + 22, y);
    y += 6;
  }

  const dateStr = formatDate(tasting.date, lang);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(tp("printableSheets.pdfCoverDate", lang).toUpperCase(), marginX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(metaFontSize);
  doc.setTextColor(...textDark);
  doc.text(dateStr, marginX + 22, y);
  y += 6;

  if (tasting.location && tasting.location !== "—") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(tp("printableSheets.pdfCoverLocation", lang).toUpperCase(), marginX, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(metaFontSize);
    doc.setTextColor(...textDark);
    doc.text(tasting.location, marginX + 22, y);
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("CODE", marginX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(metaFontSize);
  doc.setTextColor(...textDark);
  doc.text(tasting.code, marginX + 22, y);
  y += 10;

  if (coverImageBase64) {
    const imgMaxW = contentW;
    const imgMaxH = 60;
    try {
      const src = coverImageBase64.startsWith("data:") ? coverImageBase64 : `data:image/jpeg;base64,${coverImageBase64}`;
      doc.addImage(src, "JPEG", marginX, y, imgMaxW, imgMaxH, undefined, "FAST");
      y += imgMaxH + 8;
    } catch {
      y += 4;
    }
  }

  if (participant) {
    y = await drawParticipantInfo(doc, participant, y, marginX, pageW, lang, tasting.id);
    y += 4;
  } else {
    const nameLabel = tp("printableSheets.pdfParticipant", lang);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(`${nameLabel}: `, marginX, y);
    const nameFieldX = marginX + doc.getTextWidth(`${nameLabel}: `);
    doc.setDrawColor(...LINE_GRAY);
    doc.setLineWidth(0.3);
    doc.line(nameFieldX, y + 1, pageW - marginX, y + 1);
    y += 10;
  }

  if (!isBlind) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...textDark);
    doc.text(tp("printableSheets.pdfCoverLineup", lang).toUpperCase(), marginX, y);
    y += 6;

    doc.setDrawColor(...LINE_GRAY);
    doc.setLineWidth(0.3);
    doc.line(marginX, y, marginX + contentW, y);
    y += 4;

    const lineupFontSize = whiskies.length > 8 ? 7 : 8;
    const lineupSpacing = whiskies.length > 8 ? 5 : 6;

    for (let i = 0; i < whiskies.length; i++) {
      const w = whiskies[i];
      if (y > pageH - 20) break;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(lineupFontSize);
      doc.setTextColor(...textDark);
      const numStr = `${i + 1}.`;
      doc.text(numStr, marginX + 2, y);

      doc.setFont("helvetica", "bold");
      doc.text(w.name, marginX + 10, y);

      const meta = getWhiskyMeta(w);
      if (meta) {
        const nameW = doc.getTextWidth(w.name + "  ");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(lineupFontSize - 1);
        doc.setTextColor(...MUTED);
        doc.text(meta, marginX + 10 + nameW, y);
      }

      y += lineupSpacing;
    }
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(...SLATE);
    doc.text(tp("printableSheets.pdfBlindSamplesAwait", lang, { count: whiskies.length }), marginX, y);
    y += 14;

    const cols = Math.min(whiskies.length, 4);
    const rows = Math.ceil(whiskies.length / cols);
    const cellW = Math.min(30, (contentW - (cols - 1) * 4) / cols);
    const cellH = 18;
    const gridW = cols * cellW + (cols - 1) * 4;
    const gridX = marginX + (contentW - gridW) / 2;

    for (let i = 0; i < whiskies.length; i++) {
      if (y + rows * (cellH + 4) > pageH - 20) break;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = gridX + col * (cellW + 4);
      const cy = y + row * (cellH + 4);

      doc.setDrawColor(...LINE_GRAY);
      doc.setLineWidth(0.5);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(cx, cy, cellW, cellH, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...textDark);
      doc.text(`#${i + 1}`, cx + cellW / 2, cy + cellH / 2 + 1, { align: "center" });
    }
  }

  doc.setDrawColor(...LINE_GRAY);
  doc.setLineWidth(0.3);
  doc.line(marginX, pageH - 14, pageW - marginX, pageH - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("CaskSense", marginX, pageH - 9);
  doc.text("casksense.com", pageW - marginX, pageH - 9, { align: "right" });
  const totalScoringPages = Math.max(1, Math.ceil(whiskies.length / 12));
  const totalPages = 1 + totalScoringPages;
  doc.text(`1 / ${totalPages}`, pageW / 2, pageH - 9, { align: "center" });
}

function drawRatingCircles(doc: jsPDF, x: number, y: number, circleR: number, circleGap: number, maxScore: number, availableW: number) {
  if (maxScore >= 100) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(circleR >= 2.5 ? 7 : 6);
    doc.setTextColor(...MUTED);
    doc.text("__ / " + maxScore, x + 2, y + (circleR >= 2.5 ? 1 : 0.5));
    doc.setDrawColor(...LINE_GRAY);
    doc.setLineWidth(0.2);
    const fieldW = doc.getTextWidth("__ / " + maxScore) + 6;
    doc.line(x, y + 2, x + fieldW, y + 2);
    return;
  }

  const effectiveR = Math.min(circleR, (availableW - (maxScore - 1) * circleGap) / (2 * maxScore));
  const effectiveGap = Math.min(circleGap, (availableW - maxScore * effectiveR * 2) / Math.max(1, maxScore - 1));
  const finalR = Math.max(1.2, effectiveR);
  const finalGap = Math.max(0.3, effectiveGap);

  for (let s = 1; s <= maxScore; s++) {
    const cx = x + (s - 1) * (finalR * 2 + finalGap) + finalR;
    doc.setDrawColor(...MUTED);
    doc.setLineWidth(0.25);
    doc.circle(cx, y, finalR);
    doc.setFont("helvetica", "normal");
    const fontSize = finalR >= 3 ? 6 : finalR >= 2.2 ? 5 : finalR >= 1.6 ? 4 : 3.5;
    doc.setFontSize(fontSize);
    doc.setTextColor(...MUTED);
    doc.text(`${s}`, cx, y + (fontSize * 0.12), { align: "center" });
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
) {
  const pageW = orientation === "portrait" ? 210 : 297;
  const pageH = orientation === "portrait" ? 297 : 210;
  const marginX = 12;
  const contentW = pageW - marginX * 2;
  const footerH = 12;
  const headerH = 28;
  const gutterW = 5;
  const colW = (contentW - gutterW) / 2;
  const maxPerColumn = 6;
  const maxPerPage = maxPerColumn * 2;

  const totalScoringPages = Math.max(1, Math.ceil(whiskies.length / maxPerPage));
  const totalPages = 1 + totalScoringPages;

  const labels = {
    nose: tp("printableSheets.pdfNose", lang),
    palate: tp("printableSheets.pdfPalate", lang),
    finish: tp("printableSheets.pdfFinish", lang),
    balance: tp("printableSheets.pdfBalance", lang),
    overall: tp("printableSheets.pdfOverallRating", lang),
    notes: tp("printableSheets.pdfNotes", lang),
    sample: tp("printableSheets.pdfSample", lang),
    guessRegion: tp("printableSheets.pdfGuessRegion", lang),
    guessAge: tp("printableSheets.pdfGuessAge", lang),
    guessAbv: tp("printableSheets.pdfGuessAbv", lang),
  };

  const criteriaLabels = [labels.nose, labels.palate, labels.finish, labels.balance, labels.overall];
  const ratingScale = tasting.ratingScale || 10;

  for (let pageIdx = 0; pageIdx < totalScoringPages; pageIdx++) {
    doc.addPage([pageW, pageH]);

    doc.setFillColor(252, 251, 248);
    doc.rect(0, 0, pageW, pageH, "F");

    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, headerH, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    const sheetTitle = isBlind
      ? tp("printableSheets.pdfBlindTitle", lang)
      : tp("printableSheets.pdfScoringSheet", lang);
    doc.text(sheetTitle, marginX, 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(200, 210, 220);
    doc.text(tasting.title, marginX, 19);

    if (isBlind) {
      doc.setFillColor(...AMBER);
      doc.roundedRect(pageW - marginX - 24, 6, 24, 8, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text("BLIND", pageW - marginX - 12, 11.5, { align: "center" });
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(200, 210, 220);
    doc.text("CaskSense", pageW - marginX, 19, { align: "right" });

    let participantY = headerH + 4;

    if (participant) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...SLATE);
      const nameLabel = tp("printableSheets.pdfParticipant", lang);
      doc.text(`${nameLabel}: `, marginX, participantY + 3);
      doc.setFont("helvetica", "normal");
      doc.text(participant.name, marginX + doc.getTextWidth(`${nameLabel}: `), participantY + 3);

      if (participant.id && tasting.id) {
        try {
          const scanUrl = `${window.location.origin}/m2/tastings/${tasting.id}/scan?participant=${participant.id}`;
          const qrDataUrl = await generateQRDataUrl(scanUrl);
          doc.addImage(qrDataUrl, "PNG", pageW - marginX - 12, participantY - 1, 12, 12, undefined, "FAST");
        } catch {}
      }
      participantY += 8;
    } else {
      const nameLabel = tp("printableSheets.pdfParticipant", lang);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...SLATE);
      doc.text(`${nameLabel}: `, marginX, participantY + 3);
      const nameFieldX = marginX + doc.getTextWidth(`${nameLabel}: `);
      doc.setDrawColor(...LINE_GRAY);
      doc.setLineWidth(0.3);
      doc.line(nameFieldX, participantY + 4, pageW - marginX, participantY + 4);
      participantY += 8;
    }

    const columnTopY = participantY;
    const availableH = pageH - columnTopY - footerH - 2;

    const startIdx = pageIdx * maxPerPage;
    const endIdx = Math.min(startIdx + maxPerPage, whiskies.length);
    const pageWhiskies = whiskies.slice(startIdx, endIdx);
    const numOnPage = pageWhiskies.length;
    const leftCount = Math.min(numOnPage, maxPerColumn);
    const rightCount = Math.max(0, numOnPage - maxPerColumn);

    const whiskiesPerCol = Math.max(leftCount, rightCount);
    const whiskySlotH = availableH / whiskiesPerCol;

    const coreRows = 5;
    const titleRowH = Math.max(4, Math.min(7, whiskySlotH * 0.15));
    const separatorH = 2;
    const baseContentH = whiskySlotH - titleRowH - separatorH;

    const hasNotes = baseContentH > coreRows * 4.5 + 5;
    const hasGuessFields = isBlind && baseContentH > coreRows * 4.5 + 9;
    const extraRows = (hasNotes ? 1 : 0) + (hasGuessFields ? 1 : 0);
    const totalRows = coreRows + extraRows;
    const criteriaSpacing = Math.max(3.2, Math.min(5.5, baseContentH / totalRows));
    const circleR = Math.max(1.5, Math.min(3.0, criteriaSpacing * 0.5));
    const circleGap = Math.max(0.6, Math.min(1.5, circleR * 0.5));
    const titleFontSize = Math.max(6, Math.min(9, whiskySlotH * 0.25));
    const criteriaFontSize = Math.max(4.5, Math.min(6.5, criteriaSpacing * 0.95));

    for (let wLocalIdx = 0; wLocalIdx < numOnPage; wLocalIdx++) {
      const w = pageWhiskies[wLocalIdx];
      const globalIdx = startIdx + wLocalIdx;
      const colIdx = wLocalIdx < maxPerColumn ? 0 : 1;
      const rowInCol = wLocalIdx < maxPerColumn ? wLocalIdx : wLocalIdx - maxPerColumn;

      const colX = marginX + colIdx * (colW + gutterW);
      let y = columnTopY + rowInCol * whiskySlotH;

      doc.setFillColor(240, 243, 248);
      doc.roundedRect(colX, y - 1, colW, titleFontSize * 0.6 + 2, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(titleFontSize);
      doc.setTextColor(...NAVY);

      if (isBlind) {
        doc.text(`${labels.sample} #${globalIdx + 1}`, colX + 2, y + titleFontSize * 0.35);
      } else {
        const numStr = `${globalIdx + 1}`;
        doc.text(numStr, colX + 2, y + titleFontSize * 0.35);
        const numW = doc.getTextWidth(numStr + " ");
        const maxNameW = colW * 0.45;
        const nameText = doc.splitTextToSize(w.name, maxNameW)[0];
        doc.text(nameText, colX + 2 + numW + 2, y + titleFontSize * 0.35);

        const meta = getWhiskyMeta(w);
        if (meta) {
          const afterName = colX + 2 + numW + 2 + doc.getTextWidth(nameText + "  ");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(criteriaFontSize);
          doc.setTextColor(...MUTED);
          const availW = colX + colW - afterName - 4;
          if (availW > 15) {
            const metaText = doc.splitTextToSize(meta, availW)[0];
            doc.text(metaText, afterName, y + titleFontSize * 0.35);
          }
        }
      }

      y += titleFontSize * 0.6 + 3;

      const labelColW2 = Math.max(12, Math.min(18, criteriaFontSize * 2.8));
      const circlesX = colX + 2 + labelColW2;
      const circlesAvailW = colW - labelColW2 - 6;

      for (let cIdx = 0; cIdx < criteriaLabels.length; cIdx++) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(criteriaFontSize);
        doc.setTextColor(...SLATE);
        doc.text(criteriaLabels[cIdx], colX + 2, y + circleR * 0.3);

        drawRatingCircles(doc, circlesX, y, circleR, circleGap, ratingScale, circlesAvailW);

        y += criteriaSpacing;
      }

      if (hasGuessFields) {
        const guessFontSize = criteriaFontSize - 0.5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(guessFontSize);
        doc.setTextColor(...SLATE);
        const thirdW = (colW - 4) / 3;
        const guesses = [
          { label: labels.guessRegion, x: colX + 2 },
          { label: labels.guessAge, x: colX + 2 + thirdW },
          { label: labels.guessAbv, x: colX + 2 + thirdW * 2 },
        ];
        for (const g of guesses) {
          doc.text(g.label + ":", g.x, y);
          const gLW = doc.getTextWidth(g.label + ": ");
          doc.setDrawColor(...LINE_GRAY);
          doc.setLineWidth(0.2);
          doc.line(g.x + gLW, y + 0.5, g.x + thirdW - 4, y + 0.5);
        }
        y += criteriaSpacing;
      }

      if (hasNotes) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(criteriaFontSize);
        doc.setTextColor(...SLATE);
        doc.text(labels.notes + ":", colX + 2, y);
        const notesLW = doc.getTextWidth(labels.notes + ": ");
        doc.setDrawColor(...LINE_GRAY);
        doc.setLineWidth(0.2);
        doc.line(colX + 2 + notesLW, y + 0.5, colX + colW - 2, y + 0.5);
        y += criteriaSpacing;
      }

      const isLastInCol = (colIdx === 0 && rowInCol === leftCount - 1) || (colIdx === 1 && rowInCol === rightCount - 1);
      if (!isLastInCol) {
        y += 1;
        doc.setDrawColor(...LINE_GRAY);
        doc.setLineWidth(0.15);
        doc.line(colX + 8, y - 1, colX + colW - 8, y - 1);
      }
    }

    if (leftCount > 0 && rightCount > 0) {
      doc.setDrawColor(...LINE_GRAY);
      doc.setLineWidth(0.2);
      const gutterX = marginX + colW + gutterW / 2;
      doc.line(gutterX, columnTopY, gutterX, pageH - footerH - 2);
    }

    const currentPageNum = 1 + pageIdx + 1;
    doc.setDrawColor(...LINE_GRAY);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageH - footerH, pageW - marginX, pageH - footerH);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("CaskSense", marginX, pageH - footerH + 5);
    doc.text(`${currentPageNum} / ${totalPages}`, pageW / 2, pageH - footerH + 5, { align: "center" });
    doc.text("casksense.com", pageW - marginX, pageH - footerH + 5, { align: "right" });
  }
}

async function generateTastingNotesSheet(tasting: Tasting, whiskies: Whisky[], lang: string, participant?: ParticipantInfo, mode: "download" | "print" = "download", hostName?: string, orientation: "portrait" | "landscape" = "portrait", styleTheme?: PdfStyleTheme | null) {
  if (whiskies.length === 0) return;
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

  let coverImageBase64: string | null = null;
  if (tasting.coverImageUrl) {
    coverImageBase64 = await loadImageAsBase64(tasting.coverImageUrl);
  }

  await drawCoverPage(doc, tasting, whiskies, lang, false, participant, coverImageBase64, hostName, orientation, styleTheme);

  await drawScoringPage(doc, tasting, whiskies, lang, false, participant, orientation);

  saveOrPrintJsPdf(doc, `${tasting.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_Notizblatt.pdf`, mode);
}

async function generateBlindEvaluationSheet(tasting: Tasting, whiskies: Whisky[], lang: string, participant?: ParticipantInfo, mode: "download" | "print" = "download", hostName?: string, orientation: "portrait" | "landscape" = "portrait", styleTheme?: PdfStyleTheme | null) {
  if (whiskies.length === 0) return;
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

  let coverImageBase64: string | null = null;
  if (tasting.coverImageUrl) {
    coverImageBase64 = await loadImageAsBase64(tasting.coverImageUrl);
  }

  await drawCoverPage(doc, tasting, whiskies, lang, true, participant, coverImageBase64, hostName, orientation, styleTheme);

  await drawScoringPage(doc, tasting, whiskies, lang, true, participant, orientation);

  saveOrPrintJsPdf(doc, `${tasting.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_Bewertungsbogen.pdf`, mode);
}

async function generateBatchPersonalizedPdf(
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

  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const isBlind = type === "blind";

  let coverImageBase64: string | null = null;
  if (tasting.coverImageUrl) {
    coverImageBase64 = await loadImageAsBase64(tasting.coverImageUrl);
  }

  for (let pIdx = 0; pIdx < participants.length; pIdx++) {
    const p = participants[pIdx];
    const participantInfo: ParticipantInfo = { name: p.name, id: p.id };

    if (pIdx > 0) {
      doc.addPage();
    }

    await drawCoverPage(doc, tasting, whiskies, lang, isBlind, participantInfo, coverImageBase64, hostName, orientation, styleTheme);

    await drawScoringPage(doc, tasting, whiskies, lang, isBlind, participantInfo, orientation);
  }

  const suffix = isBlind ? "Bewertungsbogen" : "Notizblatt";
  saveOrPrintJsPdf(doc, `${tasting.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_${suffix}_Alle.pdf`, mode);
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

  const participantInfo: ParticipantInfo | undefined = currentParticipant
    ? { name: currentParticipant.name, photoUrl: profile?.photoUrl }
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
    if (participants.length === 0) return;
    setBatchLoading(true);
    try {
      const pList = participants.map((p: any) => ({
        id: p.participantId || p.id,
        name: p.name || p.participant?.name || "Unknown",
      }));
      await generateBatchPersonalizedPdf(tasting, whiskies, pList, lang, type, mode, hostName, orientation, styleTheme);
    } finally {
      setBatchLoading(false);
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
          whiskies: whiskies.map(w => ({ name: w.name, region: w.region, caskInfluence: w.caskInfluence })),
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

          {participants.length > 0 && (
            <div className="p-4 rounded-lg border border-border space-y-3 bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-serif font-semibold text-foreground">
                    {t("printableSheets.batchTitle", "Print for All Participants")}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t("printableSheets.batchDesc", { count: participants.length })}
                  </div>
                  <span className="inline-block mt-1 text-[10px] bg-green-500/10 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                    {t("printableSheets.batchQrNote", "Each sheet includes a personal QR code")}
                  </span>
                </div>
              </div>
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

  doc.save(`${tp("printableSheets.pdfScoreSheet", lang).replace(/\s+/g, "_")}.pdf`);
}

export function generateBlankTastingMat(lang: string, slots = 6) {
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
    doc.setLineWidth(0.2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(`#${i + 1}`, cx + cellW / 2, cy + 8, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.text(`${tp("printableSheets.pdfName", lang)}: ___________________`, cx + 6, cy + cellH - 14);
    doc.text(`${tp("printableSheets.pdfRatingLabel", lang)}: __ / 10`, cx + 6, cy + cellH - 8);
  }

  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("CaskSense · casksense.com", pageW / 2, pageH - 5, { align: "center" });

  doc.save(`${tp("printableSheets.pdfTastingMat", lang).replace(/\s+/g, "_")}.pdf`);
}
