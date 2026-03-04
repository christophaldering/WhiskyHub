import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, ClipboardList, EyeOff, Download } from "lucide-react";
import type { Whisky, Tasting } from "@shared/schema";
import jsPDF from "jspdf";
import i18n from "@/lib/i18n";

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

async function drawParticipantInfo(doc: jsPDF, participant: ParticipantInfo, y: number, marginX: number, pageW: number, lang: string): Promise<number> {
  const nameLabel = tp("printableSheets.pdfParticipant", lang);

  let photoDataUrl: string | null = null;
  if (participant.photoUrl) {
    photoDataUrl = await loadImageAsBase64(participant.photoUrl);
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
    return y + 10;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(`${nameLabel}:`, marginX, y);
    doc.setFont("helvetica", "normal");
    doc.text(participant.name, marginX + doc.getTextWidth(`${nameLabel}: `), y);
    return y + 8;
  }
}

async function generateTastingNotesSheet(tasting: Tasting, whiskies: Whisky[], lang: string, participant?: ParticipantInfo, mode: "download" | "print" = "download") {
  if (whiskies.length === 0) return;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const marginX = 15;
  const contentW = pageW - marginX * 2;

  const labels = {
    title: tp("printableSheets.pdfTastingNotes", lang),
    nose: tp("printableSheets.pdfNose", lang),
    palate: tp("printableSheets.pdfPalate", lang),
    finish: tp("printableSheets.pdfFinish", lang),
    rating: tp("printableSheets.pdfRating", lang),
    notes: tp("printableSheets.pdfNotes", lang),
    name: tp("printableSheets.pdfParticipant", lang),
  };

  const whiskiesPerPage = 3;
  const totalPages = Math.ceil(whiskies.length / whiskiesPerPage);
  let currentPage = 1;

  doc.setFillColor(...LIGHT_BG);
  doc.rect(0, 0, pageW, pageH, "F");
  drawHeader(doc, tasting, lang, false);

  let y = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(labels.title, marginX, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(tp("printableSheets.pdfWhiskiesSubtitle", lang, { count: whiskies.length }), marginX, y);
  y += 4;

  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.2);
  doc.line(marginX, y, pageW - marginX, y);
  y += 6;

  if (participant) {
    y = await drawParticipantInfo(doc, participant, y, marginX, pageW, lang);
    y += 2;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(`${labels.name}: `, marginX, y);
    const nameFieldX = marginX + doc.getTextWidth(`${labels.name}: `);
    doc.setDrawColor(...LINE_GRAY);
    doc.setLineWidth(0.3);
    doc.line(nameFieldX, y + 1, pageW - marginX, y + 1);
    y += 10;
  }

  for (let wIdx = 0; wIdx < whiskies.length; wIdx++) {
    const w = whiskies[wIdx];

    if (wIdx > 0 && wIdx % whiskiesPerPage === 0) {
      drawFooter(doc, currentPage, totalPages);
      currentPage++;
      doc.addPage();
      doc.setFillColor(...LIGHT_BG);
      doc.rect(0, 0, pageW, pageH, "F");
      drawHeader(doc, tasting, lang, false);
      y = 40;
    }

    doc.setFillColor(240, 243, 248);
    doc.roundedRect(marginX, y - 4, contentW, 6, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(`${wIdx + 1}`, marginX + 2, y);
    const numW = doc.getTextWidth(`${wIdx + 1} `);
    doc.text(w.name, marginX + numW + 4, y);

    y += 4;

    const metaParts: string[] = [];
    if (w.distillery) metaParts.push(w.distillery);
    if (w.age && w.age !== "NAS") metaParts.push(`${w.age}y`);
    if (w.age === "NAS" || w.age === "n.a.s.") metaParts.push("NAS");
    if (w.abv != null) metaParts.push(`${w.abv}%`);
    if (w.region) metaParts.push(w.region);
    if (w.caskInfluence) metaParts.push(w.caskInfluence);

    if (metaParts.length > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text(metaParts.join(" · "), marginX + 2, y);
      y += 4;
    }

    y += 2;
    const fieldStartX = marginX + 2;
    const fieldW = contentW - 4;
    const lineSpacing = 6;

    const fields = [labels.nose, labels.palate, labels.finish];
    for (const field of fields) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...SLATE);
      doc.text(field + ":", fieldStartX, y);
      const labelW = doc.getTextWidth(field + ": ");

      doc.setDrawColor(...LINE_GRAY);
      doc.setLineWidth(0.2);
      doc.line(fieldStartX + labelW, y + 0.5, fieldStartX + fieldW, y + 0.5);
      y += lineSpacing;

      doc.line(fieldStartX, y + 0.5, fieldStartX + fieldW, y + 0.5);
      y += lineSpacing;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...SLATE);
    doc.text(labels.notes + ":", fieldStartX, y);
    const notesLabelW = doc.getTextWidth(labels.notes + ": ");
    doc.setDrawColor(...LINE_GRAY);
    doc.setLineWidth(0.2);
    doc.line(fieldStartX + notesLabelW, y + 0.5, fieldStartX + fieldW, y + 0.5);
    y += lineSpacing;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...SLATE);
    doc.text(labels.rating + ":", fieldStartX, y);

    const ratingX = fieldStartX + doc.getTextWidth(labels.rating + ":  ");
    const circleR = 3.5;
    const circleGap = 2;
    for (let s = 1; s <= 10; s++) {
      const cx = ratingX + (s - 1) * (circleR * 2 + circleGap) + circleR;
      doc.setDrawColor(...MUTED);
      doc.setLineWidth(0.3);
      doc.circle(cx, y - 1, circleR);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.text(`${s}`, cx, y - 0.2, { align: "center" });
    }

    y += 10;

    if (wIdx < whiskies.length - 1) {
      doc.setDrawColor(...LINE_GRAY);
      doc.setLineWidth(0.15);
      doc.line(marginX + 20, y - 4, pageW - marginX - 20, y - 4);
    }
  }

  drawFooter(doc, currentPage, totalPages);

  if (mode === "print") {
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  } else {
    const fileName = `${tasting.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_Notizblatt.pdf`;
    doc.save(fileName);
  }
}

async function generateBlindEvaluationSheet(tasting: Tasting, whiskies: Whisky[], lang: string, participant?: ParticipantInfo, mode: "download" | "print" = "download") {
  if (whiskies.length === 0) return;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const marginX = 15;
  const contentW = pageW - marginX * 2;

  const labels = {
    title: tp("printableSheets.pdfBlindTitle", lang),
    sample: tp("printableSheets.pdfSample", lang),
    color: tp("printableSheets.pdfColour", lang),
    nose: tp("printableSheets.pdfNose", lang),
    palate: tp("printableSheets.pdfPalate", lang),
    finish: tp("printableSheets.pdfFinish", lang),
    notes: tp("printableSheets.pdfNotes", lang),
    rating: tp("printableSheets.pdfRating", lang),
    guessRegion: tp("printableSheets.pdfGuessRegion", lang),
    guessAge: tp("printableSheets.pdfGuessAge", lang),
    guessAbv: tp("printableSheets.pdfGuessAbv", lang),
    name: tp("printableSheets.pdfParticipant", lang),
    instructions: tp("printableSheets.pdfBlindInstructions", lang),
  };

  const whiskiesPerPage = 3;
  const totalPages = Math.ceil(whiskies.length / whiskiesPerPage);
  let currentPage = 1;

  doc.setFillColor(...LIGHT_BG);
  doc.rect(0, 0, pageW, pageH, "F");
  drawHeader(doc, tasting, lang, true);

  let y = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(labels.title, marginX, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const instrText = `${whiskies.length} ${tp("printableSheets.pdfSamples", lang)} · ${labels.instructions}`;
  const instrLines = doc.splitTextToSize(instrText, contentW);
  doc.text(instrLines, marginX, y);
  y += instrLines.length * 4;

  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.2);
  doc.line(marginX, y, pageW - marginX, y);
  y += 6;

  if (participant) {
    y = await drawParticipantInfo(doc, participant, y, marginX, pageW, lang);
    y += 2;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(`${labels.name}: `, marginX, y);
    const nameFieldX2 = marginX + doc.getTextWidth(`${labels.name}: `);
    doc.setDrawColor(...LINE_GRAY);
    doc.setLineWidth(0.3);
    doc.line(nameFieldX2, y + 1, pageW - marginX, y + 1);
    y += 10;
  }

  for (let wIdx = 0; wIdx < whiskies.length; wIdx++) {
    if (wIdx > 0 && wIdx % whiskiesPerPage === 0) {
      drawFooter(doc, currentPage, totalPages);
      currentPage++;
      doc.addPage();
      doc.setFillColor(...LIGHT_BG);
      doc.rect(0, 0, pageW, pageH, "F");
      drawHeader(doc, tasting, lang, true);
      y = 40;
    }

    doc.setFillColor(240, 243, 248);
    doc.roundedRect(marginX, y - 4, contentW, 6, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(`${labels.sample} #${wIdx + 1}`, marginX + 2, y);
    y += 6;

    const fieldStartX = marginX + 2;
    const fieldW = contentW - 4;
    const lineSpacing = 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...SLATE);
    doc.text(labels.color + ":", fieldStartX, y);
    const colorLabelW = doc.getTextWidth(labels.color + ": ");
    doc.setDrawColor(...LINE_GRAY);
    doc.setLineWidth(0.2);
    doc.line(fieldStartX + colorLabelW, y + 0.5, fieldStartX + fieldW * 0.4, y + 0.5);
    y += lineSpacing;

    const sensoryFields = [labels.nose, labels.palate, labels.finish];
    for (const field of sensoryFields) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...SLATE);
      doc.text(field + ":", fieldStartX, y);
      const labelW = doc.getTextWidth(field + ": ");

      doc.setDrawColor(...LINE_GRAY);
      doc.setLineWidth(0.2);
      doc.line(fieldStartX + labelW, y + 0.5, fieldStartX + fieldW, y + 0.5);
      y += lineSpacing;

      doc.line(fieldStartX, y + 0.5, fieldStartX + fieldW, y + 0.5);
      y += lineSpacing;
    }

    const guessY = y;
    const thirdW = fieldW / 3;
    const guesses = [
      { label: labels.guessRegion, x: fieldStartX },
      { label: labels.guessAge, x: fieldStartX + thirdW },
      { label: labels.guessAbv, x: fieldStartX + thirdW * 2 },
    ];
    for (const g of guesses) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...SLATE);
      doc.text(g.label + ":", g.x, guessY);
      const gLabelW = doc.getTextWidth(g.label + ": ");
      doc.setDrawColor(...LINE_GRAY);
      doc.setLineWidth(0.2);
      doc.line(g.x + gLabelW, guessY + 0.5, g.x + thirdW - 4, guessY + 0.5);
    }
    y += lineSpacing;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...SLATE);
    doc.text(labels.notes + ":", fieldStartX, y);
    const notesLabelW = doc.getTextWidth(labels.notes + ": ");
    doc.setDrawColor(...LINE_GRAY);
    doc.setLineWidth(0.2);
    doc.line(fieldStartX + notesLabelW, y + 0.5, fieldStartX + fieldW, y + 0.5);
    y += lineSpacing;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...SLATE);
    doc.text(labels.rating + ":", fieldStartX, y);

    const ratingX = fieldStartX + doc.getTextWidth(labels.rating + ":  ");
    const circleR = 3.5;
    const circleGap = 2;
    for (let s = 1; s <= 10; s++) {
      const cx = ratingX + (s - 1) * (circleR * 2 + circleGap) + circleR;
      doc.setDrawColor(...MUTED);
      doc.setLineWidth(0.3);
      doc.circle(cx, y - 1, circleR);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.text(`${s}`, cx, y - 0.2, { align: "center" });
    }

    y += 10;

    if (wIdx < whiskies.length - 1) {
      doc.setDrawColor(...LINE_GRAY);
      doc.setLineWidth(0.15);
      doc.line(marginX + 20, y - 4, pageW - marginX - 20, y - 4);
    }
  }

  drawFooter(doc, currentPage, totalPages);

  if (mode === "print") {
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  } else {
    const fileName = `${tasting.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_Bewertungsbogen.pdf`;
    doc.save(fileName);
  }
}

interface PrintableTastingSheetsProps {
  tasting: Tasting;
  whiskies: Whisky[];
}

export function PrintableTastingSheets({ tasting, whiskies }: PrintableTastingSheetsProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const lang = i18n.language;
  const isBlind = tasting.blindMode;
  const { currentParticipant } = useAppStore();

  const { data: profile } = useQuery({
    queryKey: ["profile", currentParticipant?.id],
    queryFn: () => profileApi.get(currentParticipant!.id),
    enabled: !!currentParticipant && open,
  });

  const participantInfo: ParticipantInfo | undefined = currentParticipant
    ? { name: currentParticipant.name, photoUrl: profile?.photoUrl }
    : undefined;

  const handleAction = (type: "tasting" | "blind", mode: "download" | "print") => {
    if (type === "tasting") {
      generateTastingNotesSheet(tasting, whiskies, lang, participantInfo, mode);
    } else {
      generateBlindEvaluationSheet(tasting, whiskies, lang, participantInfo, mode);
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
      <DialogContent className="sm:max-w-md">
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
