import { useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { tastingApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, ImageIcon, Loader2 } from "lucide-react";
import type { Whisky, Tasting } from "@shared/schema";
import jsPDF from "jspdf";
import { saveJsPdf } from "@/lib/pdf";

type RGB = [number, number, number];

interface TastingTheme {
  theme: string;
  tagline: string;
  colors: { primary: RGB; secondary: RGB; accent: RGB };
  moodText: string;
}

const THEME_PRESETS: Record<string, TastingTheme> = {
  islay: {
    theme: "islay",
    tagline: "Smoke, Sea & Spirit",
    colors: {
      primary: [45, 45, 48],
      secondary: [90, 90, 95],
      accent: [120, 130, 140],
    },
    moodText: "A journey through peat and maritime influence",
  },
  speyside: {
    theme: "speyside",
    tagline: "The Heart of Scotland",
    colors: {
      primary: [153, 102, 0],
      secondary: [184, 138, 61],
      accent: [200, 160, 80],
    },
    moodText: "Elegant expressions from the golden valley",
  },
  highland: {
    theme: "highland",
    tagline: "Wild & Untamed",
    colors: {
      primary: [40, 80, 55],
      secondary: [80, 110, 85],
      accent: [100, 130, 100],
    },
    moodText: "Bold spirits from Scotland's rugged north",
  },
  sherry: {
    theme: "sherry",
    tagline: "Dark Fruit & Oak",
    colors: {
      primary: [120, 30, 40],
      secondary: [150, 60, 70],
      accent: [170, 80, 50],
    },
    moodText: "Rich, sherried expressions of depth and complexity",
  },
  bourbon: {
    theme: "bourbon",
    tagline: "American Oak Influence",
    colors: {
      primary: [180, 130, 30],
      secondary: [200, 160, 60],
      accent: [210, 170, 80],
    },
    moodText: "Vanilla, honey and butterscotch from bourbon barrels",
  },
  mixed: {
    theme: "mixed",
    tagline: "A Curated Selection",
    colors: {
      primary: [71, 85, 105],
      secondary: [148, 163, 184],
      accent: [100, 116, 139],
    },
    moodText: "A diverse flight exploring whisky's many facets",
  },
};

function detectTastingTheme(whiskies: Whisky[]): TastingTheme {
  if (whiskies.length === 0) return THEME_PRESETS.mixed;

  const total = whiskies.length;
  const threshold = total / 2;

  const regionCounts: Record<string, number> = {};
  let sherryCaskCount = 0;
  let peatedCount = 0;

  for (const w of whiskies) {
    if (w.region) {
      const r = w.region.toLowerCase();
      regionCounts[r] = (regionCounts[r] || 0) + 1;
    }
    if (w.caskType) {
      const cask = w.caskType.toLowerCase();
      if (cask.includes("sherry") || cask.includes("oloroso") || cask.includes("pedro") || cask.includes("px")) {
        sherryCaskCount++;
      }
    }
    if (w.peatLevel) {
      const peat = w.peatLevel.toLowerCase();
      if (peat.includes("peated") || peat.includes("heavily") || peat === "heavy" || peat === "high") {
        peatedCount++;
      }
    }
  }

  for (const [region, count] of Object.entries(regionCounts)) {
    if (count > threshold) {
      if (region === "islay") return THEME_PRESETS.islay;
      if (region === "speyside") return THEME_PRESETS.speyside;
      if (region === "highland" || region === "highlands") return THEME_PRESETS.highland;
    }
  }

  if (sherryCaskCount > threshold) return THEME_PRESETS.sherry;

  if (peatedCount > threshold) return THEME_PRESETS.islay;

  const bourbonCaskCount = whiskies.filter(w => {
    if (!w.caskType) return false;
    const c = w.caskType.toLowerCase();
    return c.includes("bourbon") || c.includes("american oak");
  }).length;
  if (bourbonCaskCount > threshold) return THEME_PRESETS.bourbon;

  return THEME_PRESETS.mixed;
}

const PRIMARY_COLOR: RGB = [71, 85, 105];
const MUTED_COLOR: RGB = [148, 163, 184];
const BG_COLOR: RGB = [248, 250, 252];
const DARK_COLOR: RGB = [30, 41, 59];

function buildMetaLine(w: Whisky): string {
  const parts: string[] = [];
  if (w.country) parts.push(w.country);
  if (w.region) parts.push(w.region);
  if (w.caskType) parts.push(w.caskType);
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

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function coverCrop(imgW: number, imgH: number, targetW: number, targetH: number) {
  const imgRatio = imgW / imgH;
  const targetRatio = targetW / targetH;

  let sx = 0, sy = 0, sw = imgW, sh = imgH;

  if (imgRatio > targetRatio) {
    sw = imgH * targetRatio;
    sx = (imgW - sw) / 2;
  } else {
    sh = imgW / targetRatio;
    sy = (imgH - sh) / 2;
  }

  return { sx, sy, sw, sh };
}

async function drawCoverImage(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  targetW: number,
  targetH: number
) {
  try {
    const dims = await getImageDimensions(dataUrl);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const dpr = 2;
    canvas.width = targetW * dpr;
    canvas.height = targetH * dpr;

    const img = new Image();
    img.src = dataUrl;
    await new Promise<void>((resolve) => { img.onload = () => resolve(); if (img.complete) resolve(); });

    const crop = coverCrop(dims.width, dims.height, targetW, targetH);
    ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);

    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    doc.addImage(croppedDataUrl, "JPEG", x, y, targetW, targetH, undefined, "FAST");
    return true;
  } catch {
    return false;
  }
}

type LayoutMode = "compact" | "spacious";

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
  const [themeOverride, setThemeOverride] = useState("auto");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("compact");
  const bgRef = useRef<HTMLInputElement>(null);

  const activeTheme = useMemo(() => {
    if (themeOverride !== "auto" && THEME_PRESETS[themeOverride]) {
      return THEME_PRESETS[themeOverride];
    }
    return detectTastingTheme(whiskies);
  }, [themeOverride, whiskies]);

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

      const isSpacious = layoutMode === "spacious";

      const addNewPage = () => {
        doc.addPage();
        doc.setFillColor(...BG_COLOR);
        doc.rect(0, 0, pageW, pageH, "F");
      };

      const addFooter = () => {
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...MUTED_COLOR);
        doc.text("CaskSense", pageW / 2, pageH - 8, { align: "center" });
      };

      doc.setFillColor(...BG_COLOR);
      doc.rect(0, 0, pageW, pageH, "F");

      let bgDataUrl: string | null = null;
      if (bgFile) {
        bgDataUrl = await fileToDataUrl(bgFile);
      }

      const imgAreaH = isSpacious ? pageH * 0.5 : pageH * 0.4;

      if (bgDataUrl) {
        try {
          await drawCoverImage(doc, bgDataUrl, 0, 0, pageW, imgAreaH);
          doc.setFillColor(248, 250, 252);
          doc.setGState(new (doc as any).GState({ opacity: 0.85 }));
          doc.rect(0, imgAreaH - imgAreaH * 0.08, pageW, imgAreaH * 0.08, "F");
          doc.setGState(new (doc as any).GState({ opacity: 1 }));
        } catch {
        }
      }

      const themeColors = activeTheme.colors;

      const ornW = 50;
      if (!bgDataUrl) {
        doc.setDrawColor(...themeColors.primary);
        doc.setLineWidth(0.5);
        doc.rect(12, 12, pageW - 24, pageH - 24);
        doc.setLineWidth(0.2);
        doc.rect(14, 14, pageW - 28, pageH - 28);

        doc.setDrawColor(...themeColors.secondary);
        doc.setLineWidth(0.15);
        const ornY = 40;
        doc.line(pageW / 2 - ornW, ornY, pageW / 2 + ornW, ornY);
        doc.line(pageW / 2 - ornW, ornY + 0.8, pageW / 2 + ornW, ornY + 0.8);
        doc.setFillColor(...themeColors.secondary);
        doc.circle(pageW / 2, ornY + 0.4, 1.5, "F");
        doc.circle(pageW / 2 - ornW, ornY + 0.4, 0.6, "F");
        doc.circle(pageW / 2 + ornW, ornY + 0.4, 0.6, "F");
      }

      let coverY = bgDataUrl ? (imgAreaH + 10) : 56;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...themeColors.accent);
      doc.text("C A S K S E N S E", pageW / 2, coverY, { align: "center" });
      coverY += 6;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.text("Where Tasting Becomes Reflection", pageW / 2, coverY, { align: "center" });
      coverY += bgDataUrl ? 12 : (isSpacious ? 28 : 24);

      doc.setDrawColor(...themeColors.secondary);
      doc.setLineWidth(0.2);
      doc.line(marginX + 50, coverY, pageW - marginX - 50, coverY);
      coverY += bgDataUrl ? 10 : (isSpacious ? 22 : 20);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(isSpacious ? 34 : 30);
      doc.setTextColor(...themeColors.primary);
      const titleLines = doc.splitTextToSize(title, contentW - 20);
      doc.text(titleLines, pageW / 2, coverY, { align: "center" });
      coverY += titleLines.length * (isSpacious ? 14 : 12) + 6;

      doc.setFont("helvetica", "italic");
      doc.setFontSize(isSpacious ? 13 : 11);
      doc.setTextColor(...themeColors.secondary);
      doc.text(activeTheme.tagline, pageW / 2, coverY, { align: "center" });
      coverY += isSpacious ? 10 : 8;

      doc.setFont("helvetica", "italic");
      doc.setFontSize(isSpacious ? 9 : 8);
      doc.setTextColor(...themeColors.accent);
      doc.text(activeTheme.moodText, pageW / 2, coverY, { align: "center" });
      coverY += isSpacious ? 14 : 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(isSpacious ? 14 : 12);
      doc.setTextColor(...themeColors.secondary);
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
      coverY += isSpacious ? 10 : 6;

      doc.setDrawColor(...themeColors.secondary);
      doc.setLineWidth(0.2);
      doc.line(marginX + 50, coverY, pageW - marginX - 50, coverY);
      coverY += isSpacious ? 16 : 12;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(isSpacious ? 12 : 10);
      doc.setTextColor(...themeColors.primary);
      const statsLine = `${whiskies.length} ${whiskies.length === 1 ? "Expression" : "Expressions"}`;
      doc.text(statsLine, pageW / 2, coverY, { align: "center" });
      coverY += isSpacious ? 10 : 8;

      const regionSet = new Set<string>();
      whiskies.forEach(w => { if (w.region) regionSet.add(w.region); });
      if (regionSet.size > 0) {
        doc.setFontSize(isSpacious ? 9 : 8);
        doc.setTextColor(...themeColors.secondary);
        doc.text(Array.from(regionSet).join("  \u2022  "), pageW / 2, coverY, { align: "center" });
        coverY += isSpacious ? 12 : 10;
      }

      if (quote) {
        coverY += 6;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(isSpacious ? 13 : 11);
        doc.setTextColor(...themeColors.secondary);
        const quoteLines = doc.splitTextToSize(`\u201c${quote}\u201d`, contentW - 30);
        doc.text(quoteLines, pageW / 2, coverY, { align: "center" });
        coverY += quoteLines.length * 6 + 10;
      }

      if (includeParticipants && participants.length > 0) {
        coverY += 4;
        doc.setDrawColor(...themeColors.secondary);
        doc.setLineWidth(0.2);
        doc.line(marginX + 50, coverY, pageW - marginX - 50, coverY);
        coverY += 10;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(isSpacious ? 9 : 8);
        doc.setTextColor(...themeColors.primary);
        doc.text(t("pdfExport.participants").toUpperCase(), pageW / 2, coverY, { align: "center" });
        coverY += 7;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(isSpacious ? 10 : 9);
        doc.setTextColor(...themeColors.secondary);
        const names = participants.map((p: any) => p.participant?.name || p.name || "").filter(Boolean);
        const namesStr = names.join("  \u2022  ");
        const nameLines = doc.splitTextToSize(namesStr, contentW - 20);
        doc.text(nameLines, pageW / 2, coverY, { align: "center" });
      }

      if (!bgDataUrl) {
        const bottomOrnY = pageH - 35;
        doc.setDrawColor(...themeColors.secondary);
        doc.setLineWidth(0.15);
        doc.line(pageW / 2 - ornW, bottomOrnY, pageW / 2 + ornW, bottomOrnY);
        doc.line(pageW / 2 - ornW, bottomOrnY + 0.8, pageW / 2 + ornW, bottomOrnY + 0.8);
        doc.setFillColor(...themeColors.secondary);
        doc.circle(pageW / 2, bottomOrnY + 0.4, 1.5, "F");
        doc.circle(pageW / 2 - ornW, bottomOrnY + 0.4, 0.6, "F");
        doc.circle(pageW / 2 + ornW, bottomOrnY + 0.4, 0.6, "F");
      }

      const imageCache: Record<string, string | null> = {};
      if (includePhotos) {
        const urls = whiskies.filter(w => w.imageUrl).map(w => w.imageUrl!);
        const results = await Promise.allSettled(urls.map(u => loadImageAsDataUrl(u)));
        urls.forEach((url, i) => {
          const result = results[i];
          imageCache[url] = result.status === "fulfilled" ? result.value : null;
        });
      }

      const hasAnyImages = whiskies.some(w => w.imageUrl);
      const effectiveIncludePhotos = includePhotos && hasAnyImages;

      if (isSpacious) {
        const itemsPerPage = 4;
        const totalPages = Math.ceil(whiskies.length / itemsPerPage);

        for (let page = 0; page < totalPages; page++) {
          addNewPage();

          if (page === 0) {
            let lineupY = 22;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.setTextColor(...PRIMARY_COLOR);
            doc.text(t("pdfExport.lineup").toUpperCase(), pageW / 2, lineupY, { align: "center" });
            lineupY += 4;
            doc.setDrawColor(...MUTED_COLOR);
            doc.setLineWidth(0.3);
            doc.line(marginX + 40, lineupY, pageW - marginX - 40, lineupY);
          }

          const pageItems = whiskies.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
          const startY = page === 0 ? 40 : 25;
          const itemH = (pageH - startY - 20) / itemsPerPage;

          pageItems.forEach((w, i) => {
            const idx = page * itemsPerPage + i;
            const y = startY + i * itemH;
            const thumbSize = effectiveIncludePhotos ? 22 : 0;
            const textX = marginX + (effectiveIncludePhotos ? thumbSize + 6 : 0);

            doc.setDrawColor(...MUTED_COLOR);
            doc.setLineWidth(0.1);
            if (i > 0) {
              doc.line(marginX + 5, y - 3, pageW - marginX - 5, y - 3);
            }

            if (effectiveIncludePhotos && w.imageUrl && imageCache[w.imageUrl]) {
              try {
                doc.addImage(imageCache[w.imageUrl]!, "JPEG", marginX, y, thumbSize, thumbSize, undefined, "FAST");
              } catch {
              }
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(...PRIMARY_COLOR);
            doc.text(`${idx + 1}.`, textX, y + 5);

            const numW = doc.getTextWidth(`${idx + 1}. `);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.setTextColor(...DARK_COLOR);
            const dispName = w.name.length > 40 ? w.name.slice(0, 38) + "\u2026" : w.name;
            doc.text(dispName, textX + numW, y + 5);

            let subY = y + 11;
            if (w.distillery) {
              doc.setFont("helvetica", "italic");
              doc.setFontSize(9);
              doc.setTextColor(...MUTED_COLOR);
              doc.text(w.distillery, textX + numW, subY);
              subY += 5;
            }

            const agePart = w.age ? (w.age === "NAS" || w.age === "n.a.s." ? "NAS" : `${w.age}y`) : "";
            const abvPart = w.abv != null ? `${w.abv}%` : "";
            const primaryMeta = [agePart, abvPart, w.type].filter(Boolean).join(" \u2022 ");
            if (primaryMeta) {
              doc.setFont("helvetica", "normal");
              doc.setFontSize(9);
              doc.setTextColor(...MUTED_COLOR);
              doc.text(primaryMeta, textX + numW, subY);
              subY += 5;
            }

            const meta2 = buildMetaLine(w);
            if (meta2) {
              doc.setFont("helvetica", "normal");
              doc.setFontSize(8);
              doc.setTextColor(170, 180, 195);
              const metaTrunc = meta2.length > 70 ? meta2.slice(0, 68) + "\u2026" : meta2;
              doc.text(metaTrunc, textX + numW, subY);
            }
          });

          addFooter();
        }
      } else {
        addNewPage();

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
        const thumbSize = effectiveIncludePhotos ? 10 : 0;
        const itemH = effectiveIncludePhotos ? 20 : 16;
        const maxItemsPerCol = Math.floor((pageH - startY - 15) / itemH);
        const itemsPerCol = Math.ceil(whiskies.length / 2);

        const renderColumn = (items: Whisky[], offsetX: number, startIdx: number) => {
          let y = startY;
          items.forEach((w, i) => {
            const idx = startIdx + i;
            const textX = offsetX + (effectiveIncludePhotos ? thumbSize + 4 : 0);

            if (effectiveIncludePhotos && w.imageUrl && imageCache[w.imageUrl]) {
              try {
                doc.addImage(imageCache[w.imageUrl]!, "JPEG", offsetX, y - 3, thumbSize, thumbSize, undefined, "FAST");
              } catch {
              }
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(...PRIMARY_COLOR);
            doc.text(`${idx + 1}.`, textX, y + 1);

            const numW = doc.getTextWidth(`${idx + 1}. `);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(...DARK_COLOR);
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

        if (whiskies.length <= maxItemsPerCol * 2) {
          const leftItems = whiskies.slice(0, itemsPerCol);
          const rightItems = whiskies.slice(itemsPerCol);
          renderColumn(leftItems, marginX, 0);
          renderColumn(rightItems, marginX + colW + 10, itemsPerCol);
        } else {
          let remaining = [...whiskies];
          let globalIdx = 0;
          let isFirstLineupPage = true;

          while (remaining.length > 0) {
            if (!isFirstLineupPage) {
              addNewPage();
              lineupY = 20;
            }
            isFirstLineupPage = false;

            const pageCapacity = maxItemsPerCol * 2;
            const pageItems = remaining.slice(0, pageCapacity);
            remaining = remaining.slice(pageCapacity);

            const pageCols = Math.ceil(pageItems.length / 2);
            const leftItems = pageItems.slice(0, pageCols);
            const rightItems = pageItems.slice(pageCols);

            renderColumn(leftItems, marginX, globalIdx);
            renderColumn(rightItems, marginX + colW + 10, globalIdx + pageCols);
            globalIdx += pageItems.length;
          }
        }

        addFooter();
      }

      saveJsPdf(doc, `${title.replace(/[^a-zA-Z0-9]/g, "_")}_menu.pdf`);
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{t("pdfExport.layoutMode")}</Label>
            <Select value={layoutMode} onValueChange={(v) => setLayoutMode(v as LayoutMode)} data-testid="select-layout-mode">
              <SelectTrigger data-testid="select-trigger-layout-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact" data-testid="select-layout-compact">{t("pdfExport.layoutCompact")}</SelectItem>
                <SelectItem value="spacious" data-testid="select-layout-spacious">{t("pdfExport.layoutSpacious")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {layoutMode === "compact" ? t("pdfExport.layoutCompactDesc") : t("pdfExport.layoutSpaciousDesc")}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{t("pdfExport.coverTheme")}</Label>
            <Select value={themeOverride} onValueChange={setThemeOverride} data-testid="select-cover-theme">
              <SelectTrigger data-testid="select-trigger-cover-theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto" data-testid="select-theme-auto">{t("pdfExport.autoTheme")}</SelectItem>
                <SelectItem value="islay" data-testid="select-theme-islay">{t("pdfExport.themeIslay")}</SelectItem>
                <SelectItem value="speyside" data-testid="select-theme-speyside">{t("pdfExport.themeSpeyside")}</SelectItem>
                <SelectItem value="highland" data-testid="select-theme-highland">{t("pdfExport.themeHighland")}</SelectItem>
                <SelectItem value="sherry" data-testid="select-theme-sherry">{t("pdfExport.themeSherry")}</SelectItem>
                <SelectItem value="bourbon" data-testid="select-theme-bourbon">{t("pdfExport.themeBourbon")}</SelectItem>
                <SelectItem value="mixed" data-testid="select-theme-mixed">{t("pdfExport.themeMixed")}</SelectItem>
              </SelectContent>
            </Select>
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
