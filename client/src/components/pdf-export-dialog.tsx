import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { tastingApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FileDown, ImageIcon, Loader2 } from "lucide-react";
import type { Whisky, Tasting, Participant } from "@shared/schema";
import jsPDF from "jspdf";

const PRIMARY_COLOR: [number, number, number] = [71, 85, 105];
const MUTED_COLOR: [number, number, number] = [148, 163, 184];
const BG_COLOR: [number, number, number] = [248, 250, 252];
const DARK_COLOR: [number, number, number] = [30, 41, 59];

function buildMetaLine(w: Whisky): string {
  const parts: string[] = [];
  if (w.region) parts.push(w.region);
  if (w.caskInfluence) parts.push(w.caskInfluence);
  if (w.peatLevel && w.peatLevel !== "None") parts.push(w.peatLevel);
  if (w.ppm != null) parts.push(`${w.ppm} ppm`);
  if (w.whiskybaseId) parts.push(`WB ${w.whiskybaseId}`);
  return parts.join(" \u2022 ");
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
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
  } catch {
    return null;
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

interface PdfExportDialogProps {
  tasting: Tasting;
  whiskies: Whisky[];
}

export function PdfExportDialog({ tasting, whiskies }: PdfExportDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [title, setTitle] = useState(tasting.title);
  const [date, setDate] = useState(tasting.date);
  const [quote, setQuote] = useState("");
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [includeParticipants, setIncludeParticipants] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(true);
  const bgRef = useRef<HTMLInputElement>(null);

  const { data: participants = [] } = useQuery({
    queryKey: ["participants", tasting.id],
    queryFn: () => tastingApi.getParticipants(tasting.id),
    enabled: open,
  });

  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && /\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
      setBgFile(file);
    }
  };

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const pageH = 297;
      const marginX = 18;
      const contentW = pageW - marginX * 2;

      doc.setFillColor(...BG_COLOR);
      doc.rect(0, 0, pageW, pageH, "F");

      let bgDataUrl: string | null = null;
      if (bgFile) {
        bgDataUrl = await fileToDataUrl(bgFile);
      }
      if (bgDataUrl) {
        try {
          doc.addImage(bgDataUrl, "JPEG", 0, 0, pageW, pageH * 0.45, undefined, "FAST");
          doc.setFillColor(248, 250, 252);
          doc.setGState(new (doc as any).GState({ opacity: 0.85 }));
          doc.rect(0, pageH * 0.35, pageW, pageH * 0.1, "F");
          doc.setGState(new (doc as any).GState({ opacity: 1 }));
        } catch {
          // background image failed, continue without it
        }
      }

      const ornW = 50;
      if (!bgDataUrl) {
        doc.setDrawColor(71, 85, 105);
        doc.setLineWidth(0.5);
        doc.rect(12, 12, pageW - 24, pageH - 24);
        doc.setLineWidth(0.2);
        doc.rect(14, 14, pageW - 28, pageH - 28);

        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.15);
        const ornY = 40;
        doc.line(pageW / 2 - ornW, ornY, pageW / 2 + ornW, ornY);
        doc.line(pageW / 2 - ornW, ornY + 0.8, pageW / 2 + ornW, ornY + 0.8);
        doc.setFillColor(148, 163, 184);
        doc.circle(pageW / 2, ornY + 0.4, 1.5, "F");
        doc.circle(pageW / 2 - ornW, ornY + 0.4, 0.6, "F");
        doc.circle(pageW / 2 + ornW, ornY + 0.4, 0.6, "F");
      }

      let coverY = bgDataUrl ? pageH * 0.48 : 56;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED_COLOR);
      doc.text("C A S K S E N S E", pageW / 2, coverY, { align: "center" });
      coverY += 6;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.text("Where Tasting Becomes Reflection", pageW / 2, coverY, { align: "center" });
      coverY += bgDataUrl ? 16 : 24;

      doc.setDrawColor(...MUTED_COLOR);
      doc.setLineWidth(0.2);
      doc.line(marginX + 50, coverY, pageW - marginX - 50, coverY);
      coverY += bgDataUrl ? 14 : 20;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(30);
      doc.setTextColor(...DARK_COLOR);
      const titleLines = doc.splitTextToSize(title, contentW - 20);
      doc.text(titleLines, pageW / 2, coverY, { align: "center" });
      coverY += titleLines.length * 12 + 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(...MUTED_COLOR);
      const displayDate = (() => {
        try {
          return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
        } catch { return date; }
      })();
      doc.text(displayDate, pageW / 2, coverY, { align: "center" });
      coverY += 6;
      if (tasting.location && tasting.location !== "\u2014") {
        doc.text(tasting.location, pageW / 2, coverY, { align: "center" });
        coverY += 8;
      }
      coverY += 6;

      doc.setDrawColor(...MUTED_COLOR);
      doc.setLineWidth(0.2);
      doc.line(marginX + 50, coverY, pageW - marginX - 50, coverY);
      coverY += 12;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...PRIMARY_COLOR);
      const statsLine = `${whiskies.length} ${whiskies.length === 1 ? "Expression" : "Expressions"}`;
      doc.text(statsLine, pageW / 2, coverY, { align: "center" });
      coverY += 8;

      const regionSet = new Set<string>();
      whiskies.forEach(w => { if (w.region) regionSet.add(w.region); });
      if (regionSet.size > 0) {
        doc.setFontSize(8);
        doc.setTextColor(...MUTED_COLOR);
        doc.text(Array.from(regionSet).join("  \u2022  "), pageW / 2, coverY, { align: "center" });
        coverY += 10;
      }

      if (quote) {
        coverY += 6;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(11);
        doc.setTextColor(...MUTED_COLOR);
        const quoteLines = doc.splitTextToSize(`\u201c${quote}\u201d`, contentW - 30);
        doc.text(quoteLines, pageW / 2, coverY, { align: "center" });
        coverY += quoteLines.length * 6 + 10;
      }

      if (includeParticipants && participants.length > 0) {
        coverY += 4;
        doc.setDrawColor(...MUTED_COLOR);
        doc.setLineWidth(0.2);
        doc.line(marginX + 50, coverY, pageW - marginX - 50, coverY);
        coverY += 10;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...PRIMARY_COLOR);
        doc.text(t("pdfExport.participants").toUpperCase(), pageW / 2, coverY, { align: "center" });
        coverY += 7;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...MUTED_COLOR);
        const names = participants.map((p: any) => p.participant?.name || p.name || "").filter(Boolean);
        const namesStr = names.join("  \u2022  ");
        const nameLines = doc.splitTextToSize(namesStr, contentW - 20);
        doc.text(nameLines, pageW / 2, coverY, { align: "center" });
      }

      if (!bgDataUrl) {
        const bottomOrnY = pageH - 35;
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.15);
        doc.line(pageW / 2 - ornW, bottomOrnY, pageW / 2 + ornW, bottomOrnY);
        doc.line(pageW / 2 - ornW, bottomOrnY + 0.8, pageW / 2 + ornW, bottomOrnY + 0.8);
        doc.setFillColor(148, 163, 184);
        doc.circle(pageW / 2, bottomOrnY + 0.4, 1.5, "F");
        doc.circle(pageW / 2 - ornW, bottomOrnY + 0.4, 0.6, "F");
        doc.circle(pageW / 2 + ornW, bottomOrnY + 0.4, 0.6, "F");
      }

      doc.addPage();
      doc.setFillColor(...BG_COLOR);
      doc.rect(0, 0, pageW, pageH, "F");

      let lineupY = 20;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...PRIMARY_COLOR);
      doc.text(t("pdfExport.lineup").toUpperCase(), pageW / 2, lineupY, { align: "center" });
      lineupY += 3;
      doc.setDrawColor(...MUTED_COLOR);
      doc.setLineWidth(0.3);
      doc.line(marginX + 40, lineupY, pageW - marginX - 40, lineupY);
      lineupY += 10;

      const colW = (contentW - 10) / 2;
      const startY = lineupY;
      const itemH = includePhotos ? 20 : 16;
      const maxItems = Math.floor((pageH - startY - 15) / itemH);
      const itemsPerCol = Math.ceil(whiskies.length / 2);
      const effectivePerCol = Math.min(itemsPerCol, maxItems);

      const imageCache: Record<string, string | null> = {};
      if (includePhotos) {
        const urls = whiskies.filter(w => w.imageUrl).map(w => w.imageUrl!);
        const results = await Promise.allSettled(urls.map(u => loadImageAsDataUrl(u)));
        urls.forEach((url, i) => {
          const result = results[i];
          imageCache[url] = result.status === "fulfilled" ? result.value : null;
        });
      }

      const renderColumn = (items: Whisky[], offsetX: number, startIdx: number) => {
        let y = startY;
        items.forEach((w, i) => {
          const idx = startIdx + i;
          const thumbSize = includePhotos ? 10 : 0;
          const textX = offsetX + (includePhotos ? thumbSize + 4 : 0);

          if (includePhotos && w.imageUrl && imageCache[w.imageUrl]) {
            try {
              doc.addImage(imageCache[w.imageUrl]!, "JPEG", offsetX, y - 3, thumbSize, thumbSize, undefined, "FAST");
            } catch {
              doc.setFillColor(230, 230, 230);
              doc.roundedRect(offsetX, y - 3, thumbSize, thumbSize, 2, 2, "F");
            }
          } else if (includePhotos) {
            doc.setFillColor(230, 230, 230);
            doc.roundedRect(offsetX, y - 3, thumbSize, thumbSize, 2, 2, "F");
          }

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(...PRIMARY_COLOR);
          doc.text(`${idx + 1}.`, textX, y + 1);

          const numW = doc.getTextWidth(`${idx + 1}. `);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(...DARK_COLOR);
          const nameMaxW = colW - (includePhotos ? thumbSize + 4 : 0) - numW - 2;
          const dispName = w.name.length > 30 ? w.name.slice(0, 28) + "\u2026" : w.name;
          doc.text(dispName, textX + numW, y + 1);

          let subY = y + 5;
          if (w.distillery) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(7);
            doc.setTextColor(...MUTED_COLOR);
            doc.text(w.distillery, textX + numW, subY);
            subY += 3.5;
          }

          const agePart = w.age ? (w.age === "NAS" || w.age === "n.a.s." ? "NAS" : `${w.age}y`) : "";
          const abvPart = w.abv != null ? `${w.abv}%` : "";
          const primaryMeta = [agePart, abvPart, w.type].filter(Boolean).join(" \u2022 ");
          if (primaryMeta) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(...MUTED_COLOR);
            doc.text(primaryMeta, textX + numW, subY);
            subY += 3.5;
          }

          const meta2 = buildMetaLine(w);
          if (meta2) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6);
            doc.setTextColor(170, 180, 195);
            const metaTrunc = meta2.length > 50 ? meta2.slice(0, 48) + "\u2026" : meta2;
            doc.text(metaTrunc, textX + numW, subY);
          }

          y += itemH;
        });
      };

      const leftItems = whiskies.slice(0, itemsPerCol);
      const rightItems = whiskies.slice(itemsPerCol);

      renderColumn(leftItems, marginX, 0);
      renderColumn(rightItems, marginX + colW + 10, itemsPerCol);

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED_COLOR);
      doc.text("CaskSense", pageW / 2, pageH - 8, { align: "center" });

      doc.save(`${title.replace(/[^a-zA-Z0-9]/g, "_")}_menu.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/30 text-primary font-serif" data-testid="button-export-pdf">
          <FileDown className="w-4 h-4 mr-1" /> {t("pdfExport.title")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">{t("pdfExport.title")}</DialogTitle>
          <DialogDescription className="text-muted-foreground">{t("pdfExport.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{t("pdfExport.sessionTitle")}</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="font-serif"
              data-testid="input-pdf-title"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{t("pdfExport.sessionDate")}</Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              data-testid="input-pdf-date"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{t("pdfExport.quoteText")}</Label>
            <Input
              value={quote}
              onChange={e => setQuote(e.target.value)}
              placeholder={t("pdfExport.quotePlaceholder")}
              className="font-serif italic"
              data-testid="input-pdf-quote"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{t("pdfExport.backgroundImage")}</Label>
            <div
              onClick={() => bgRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-primary/50",
                bgFile ? "border-primary/30 bg-primary/5" : "border-border"
              )}
              data-testid="dropzone-pdf-bg"
            >
              <input
                ref={bgRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleBgChange}
                className="hidden"
                data-testid="input-pdf-bg"
              />
              <ImageIcon className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {bgFile ? t("pdfExport.imageSelected") : t("pdfExport.dropImage")}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">{t("pdfExport.includeParticipants")}</Label>
            <Switch checked={includeParticipants} onCheckedChange={setIncludeParticipants} data-testid="switch-include-participants" />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">{t("pdfExport.includePhotos")}</Label>
            <Switch checked={includePhotos} onCheckedChange={setIncludePhotos} data-testid="switch-include-photos" />
          </div>

          <Button
            onClick={generatePdf}
            disabled={generating || whiskies.length === 0}
            className="w-full bg-primary text-primary-foreground font-serif"
            data-testid="button-generate-pdf"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("pdfExport.generating")}</>
            ) : (
              <><FileDown className="w-4 h-4 mr-2" /> {t("pdfExport.generate")}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
