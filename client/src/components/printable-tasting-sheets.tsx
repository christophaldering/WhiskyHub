import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, ClipboardList, EyeOff } from "lucide-react";
import type { Whisky, Tasting } from "@shared/schema";
import jsPDF from "jspdf";

type RGB = [number, number, number];

const NAVY: RGB = [30, 41, 59];
const SLATE: RGB = [71, 85, 105];
const MUTED: RGB = [148, 163, 184];
const LIGHT_BG: RGB = [248, 250, 252];
const AMBER: RGB = [180, 130, 30];
const LINE_GRAY: RGB = [200, 210, 220];

function formatDate(dateStr: string, lang: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", {
      day: "numeric", month: "long", year: "numeric"
    });
  } catch { return dateStr; }
}

function drawHeader(doc: jsPDF, tasting: Tasting, lang: string, isBlind: boolean) {
  const pageW = 210;
  const marginX = 15;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 32, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  const titleText = tasting.title;
  const titleLines = doc.splitTextToSize(titleText, pageW - marginX * 2 - 60);
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

function generateTastingNotesSheet(tasting: Tasting, whiskies: Whisky[], lang: string) {
  if (whiskies.length === 0) return;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const marginX = 15;
  const contentW = pageW - marginX * 2;

  const isDE = lang === "de";
  const labels = {
    title: isDE ? "Verkostungsnotizen" : "Tasting Notes",
    nose: isDE ? "Nase" : "Nose",
    palate: isDE ? "Geschmack" : "Palate",
    finish: isDE ? "Abgang" : "Finish",
    rating: isDE ? "Bewertung" : "Rating",
    notes: isDE ? "Notizen" : "Notes",
    overall: isDE ? "Gesamt" : "Overall",
    name: isDE ? "Teilnehmer" : "Participant",
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
  doc.text(isDE
    ? `${whiskies.length} Whiskys · Platz für deine persönlichen Notizen und Bewertungen`
    : `${whiskies.length} whiskies · Space for your personal notes and ratings`, marginX, y);
  y += 4;

  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.2);
  doc.line(marginX, y, pageW - marginX, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text(`${labels.name}: `, marginX, y);
  const nameFieldX = marginX + doc.getTextWidth(`${labels.name}: `);
  doc.setDrawColor(...LINE_GRAY);
  doc.setLineWidth(0.3);
  doc.line(nameFieldX, y + 1, pageW - marginX, y + 1);
  y += 10;

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

  const fileName = `${tasting.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_Notizblatt.pdf`;
  doc.save(fileName);
}

function generateBlindEvaluationSheet(tasting: Tasting, whiskies: Whisky[], lang: string) {
  if (whiskies.length === 0) return;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const marginX = 15;
  const contentW = pageW - marginX * 2;

  const isDE = lang === "de";
  const labels = {
    title: isDE ? "Bewertungsbogen — Blind Tasting" : "Evaluation Sheet — Blind Tasting",
    sample: isDE ? "Probe" : "Sample",
    color: isDE ? "Farbe" : "Colour",
    nose: isDE ? "Nase" : "Nose",
    palate: isDE ? "Geschmack" : "Palate",
    finish: isDE ? "Abgang" : "Finish",
    notes: isDE ? "Notizen" : "Notes",
    rating: isDE ? "Bewertung" : "Rating",
    guessRegion: isDE ? "Region (Tipp)" : "Region (guess)",
    guessAge: isDE ? "Alter (Tipp)" : "Age (guess)",
    guessAbv: isDE ? "ABV (Tipp)" : "ABV (guess)",
    name: isDE ? "Teilnehmer" : "Participant",
    instructions: isDE
      ? "Bewerte jeden Whisky ohne Vorwissen. Notiere deine Eindrücke und rate die Details."
      : "Rate each whisky without prior knowledge. Note your impressions and guess the details.",
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
  const instrText = `${whiskies.length} ${isDE ? "Proben" : "samples"} · ${labels.instructions}`;
  const instrLines = doc.splitTextToSize(instrText, contentW);
  doc.text(instrLines, marginX, y);
  y += instrLines.length * 4;

  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.2);
  doc.line(marginX, y, pageW - marginX, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text(`${labels.name}: `, marginX, y);
  const nameFieldX2 = marginX + doc.getTextWidth(`${labels.name}: `);
  doc.setDrawColor(...LINE_GRAY);
  doc.setLineWidth(0.3);
  doc.line(nameFieldX2, y + 1, pageW - marginX, y + 1);
  y += 10;

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

  const fileName = `${tasting.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_Bewertungsbogen.pdf`;
  doc.save(fileName);
}

interface PrintableTastingSheetsProps {
  tasting: Tasting;
  whiskies: Whisky[];
}

export function PrintableTastingSheets({ tasting, whiskies }: PrintableTastingSheetsProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const lang = i18n.language;
  const isDE = lang === "de";
  const isBlind = tasting.blindMode;

  const handleMenuDownload = () => {
    generateTastingNotesSheet(tasting, whiskies, lang);
  };

  const handleBlindDownload = () => {
    generateBlindEvaluationSheet(tasting, whiskies, lang);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/30 text-primary font-serif" data-testid="button-printable-sheets">
          <Printer className="w-4 h-4 mr-1" />
          {isDE ? "Unterlagen drucken" : "Print Sheets"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-primary flex items-center gap-2">
            <Printer className="w-5 h-5" />
            {isDE ? "Druckbare Unterlagen" : "Printable Sheets"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isDE
              ? "PDF-Vorlagen zum Ausdrucken — für handschriftliche Notizen und Bewertungen."
              : "PDF templates for printing — for handwritten notes and ratings."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <button
            onClick={handleMenuDownload}
            disabled={whiskies.length === 0}
            className="w-full text-left p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-download-tasting-notes"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-serif font-semibold text-foreground">
                  {isDE ? "Verkostungsnotizen" : "Tasting Notes Sheet"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {isDE
                    ? `${whiskies.length} Whiskys mit Namen, Details und Feldern für Nase, Geschmack, Abgang und Bewertung`
                    : `${whiskies.length} whiskies with names, details, and fields for nose, palate, finish, and rating`}
                </div>
              </div>
              <FileDown className="w-4 h-4 text-muted-foreground ml-auto mt-1 group-hover:text-primary transition-colors" />
            </div>
          </button>

          <button
            onClick={handleBlindDownload}
            disabled={whiskies.length === 0}
            className="w-full text-left p-4 rounded-lg border border-border hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-download-blind-sheet"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                <EyeOff className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="font-serif font-semibold text-foreground">
                  {isDE ? "Blind-Bewertungsbogen" : "Blind Evaluation Sheet"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {isDE
                    ? `${whiskies.length} Proben ohne Namen — mit Farbe, Sensorik, Rate-Feldern und Bewertungsskala`
                    : `${whiskies.length} samples without names — with colour, sensory fields, guessing fields, and rating scale`}
                </div>
                {isBlind && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="text-[10px] bg-amber-500/10 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                      {isDE ? "Empfohlen für dieses Tasting" : "Recommended for this tasting"}
                    </span>
                  </div>
                )}
              </div>
              <FileDown className="w-4 h-4 text-muted-foreground ml-auto mt-1 group-hover:text-amber-600 transition-colors" />
            </div>
          </button>
        </div>

        <div className="mt-3 text-[11px] text-muted-foreground text-center">
          {isDE ? "A4-Format · Zum Ausdrucken optimiert" : "A4 format · Optimized for printing"}
        </div>
      </DialogContent>
    </Dialog>
  );
}
