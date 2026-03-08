import jsPDF from "jspdf";
import { saveOrPrintJsPdf } from "@/lib/pdf";
import type { Whisky, Tasting } from "@shared/schema";

type RGB = [number, number, number];

interface TastingTheme {
  theme: string;
  tagline: string;
  taglineDe: string;
  colors: { primary: RGB; secondary: RGB; accent: RGB; bg: RGB };
  moodText: string;
  moodTextDe: string;
}

const THEME_PRESETS: Record<string, TastingTheme> = {
  islay: {
    theme: "islay",
    tagline: "Smoke, Sea & Spirit",
    taglineDe: "Rauch, Meer & Geist",
    colors: {
      primary: [45, 45, 48],
      secondary: [90, 90, 95],
      accent: [120, 130, 140],
      bg: [248, 250, 252],
    },
    moodText: "A journey through peat and maritime influence",
    moodTextDe: "Eine Reise durch Torf und maritime Einflüsse",
  },
  speyside: {
    theme: "speyside",
    tagline: "The Heart of Scotland",
    taglineDe: "Das Herz Schottlands",
    colors: {
      primary: [153, 102, 0],
      secondary: [184, 138, 61],
      accent: [200, 160, 80],
      bg: [255, 252, 245],
    },
    moodText: "Elegant expressions from the golden valley",
    moodTextDe: "Elegante Abfüllungen aus dem goldenen Tal",
  },
  highland: {
    theme: "highland",
    tagline: "Wild & Untamed",
    taglineDe: "Wild & Ungezähmt",
    colors: {
      primary: [40, 80, 55],
      secondary: [80, 110, 85],
      accent: [100, 130, 100],
      bg: [248, 252, 248],
    },
    moodText: "Bold spirits from Scotland's rugged north",
    moodTextDe: "Kraftvolle Destillate aus Schottlands rauem Norden",
  },
  sherry: {
    theme: "sherry",
    tagline: "Dark Fruit & Oak",
    taglineDe: "Dunkle Früchte & Eiche",
    colors: {
      primary: [120, 30, 40],
      secondary: [150, 60, 70],
      accent: [170, 80, 50],
      bg: [255, 250, 248],
    },
    moodText: "Rich, sherried expressions of depth and complexity",
    moodTextDe: "Reichhaltige, sherry-gereifte Tiefe und Komplexität",
  },
  bourbon: {
    theme: "bourbon",
    tagline: "American Oak Influence",
    taglineDe: "Amerikanische Eiche",
    colors: {
      primary: [180, 130, 30],
      secondary: [200, 160, 60],
      accent: [210, 170, 80],
      bg: [255, 253, 245],
    },
    moodText: "Vanilla, honey and butterscotch from bourbon barrels",
    moodTextDe: "Vanille, Honig und Butterscotch aus Bourbon-Fässern",
  },
  mixed: {
    theme: "mixed",
    tagline: "A Curated Selection",
    taglineDe: "Eine kuratierte Auswahl",
    colors: {
      primary: [71, 85, 105],
      secondary: [148, 163, 184],
      accent: [100, 116, 139],
      bg: [248, 250, 252],
    },
    moodText: "A diverse flight exploring whisky's many facets",
    moodTextDe: "Ein vielfältiger Flight durch die Facetten des Whiskys",
  },
};

export function detectTastingTheme(whiskies: Whisky[]): TastingTheme {
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
    if (w.caskInfluence) {
      const cask = w.caskInfluence.toLowerCase();
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
    if (!w.caskInfluence) return false;
    const c = w.caskInfluence.toLowerCase();
    return c.includes("bourbon") || c.includes("american oak");
  }).length;
  if (bourbonCaskCount > threshold) return THEME_PRESETS.bourbon;

  return THEME_PRESETS.mixed;
}

interface ParticipantInfo {
  name: string;
}

export interface TastingMenuOptions {
  tasting: Tasting;
  whiskies: Whisky[];
  participants: ParticipantInfo[];
  hostName: string;
  coverImageBase64: string | null;
  orientation: "portrait" | "landscape";
  blindMode: boolean;
  language: string;
}

function formatDateLocalized(dateStr: string | null | undefined, lang: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function drawCoverImageFull(
  doc: jsPDF,
  dataUrl: string,
  pageW: number,
  pageH: number
): Promise<boolean> {
  try {
    const dims = await getImageDimensions(dataUrl);
    const imgRatio = dims.width / dims.height;
    const pageRatio = pageW / pageH;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const dpr = 2;
    canvas.width = pageW * dpr;
    canvas.height = pageH * dpr;

    const img = new Image();
    img.src = dataUrl;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      if (img.complete) resolve();
    });

    let sx = 0, sy = 0, sw = dims.width, sh = dims.height;
    if (imgRatio > pageRatio) {
      sw = dims.height * pageRatio;
      sx = (dims.width - sw) / 2;
    } else {
      sh = dims.width / pageRatio;
      sy = (dims.height - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    doc.addImage(croppedDataUrl, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
    return true;
  } catch {
    return false;
  }
}

function l(key: string, lang: string): string {
  const labels: Record<string, Record<string, string>> = {
    overview: { en: "Overview", de: "Überblick" },
    participants: { en: "Participants", de: "Teilnehmer" },
    host: { en: "Host", de: "Gastgeber" },
    whiskies: { en: "Whiskies", de: "Whiskys" },
    ratingScale: { en: "Rating Scale", de: "Bewertungsskala" },
    mode: { en: "Mode", de: "Modus" },
    blind: { en: "Blind Tasting", de: "Blind Tasting" },
    open: { en: "Open Tasting", de: "Offenes Tasting" },
    lineup: { en: "Whisky Lineup", de: "Whisky Lineup" },
    sample: { en: "Sample", de: "Probe" },
    distillery: { en: "Distillery", de: "Destillerie" },
    region: { en: "Region", de: "Region" },
    age: { en: "Age", de: "Alter" },
    abv: { en: "ABV", de: "ABV" },
    cask: { en: "Cask", de: "Fass" },
    notes: { en: "Notes", de: "Notizen" },
    nose: { en: "Nose", de: "Nase" },
    palate: { en: "Palate", de: "Gaumen" },
    finish: { en: "Finish", de: "Abgang" },
    rating: { en: "Rating", de: "Bewertung" },
    mystery: { en: "???", de: "???" },
    mysteryWhisky: { en: "Mystery Whisky", de: "Geheimer Whisky" },
    page: { en: "Page", de: "Seite" },
    expressions: { en: "Expressions", de: "Abfüllungen" },
    expression: { en: "Expression", de: "Abfüllung" },
    bottler: { en: "Bottler", de: "Abfüller" },
    vintage: { en: "Vintage", de: "Jahrgang" },
    yourNotes: { en: "Your tasting notes", de: "Deine Verkostungsnotizen" },
  };
  return labels[key]?.[lang] || labels[key]?.en || key;
}

export async function generateTastingMenu(
  options: TastingMenuOptions,
  mode: "download" | "print" = "download"
): Promise<void> {
  const { tasting, whiskies, participants, hostName, coverImageBase64, orientation, blindMode, language } = options;

  const isLandscape = orientation === "landscape";
  const pageW = isLandscape ? 297 : 210;
  const pageH = isLandscape ? 210 : 297;
  const marginX = 18;
  const contentW = pageW - marginX * 2;

  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

  const theme = detectTastingTheme(whiskies);
  const { primary, secondary, accent, bg } = theme.colors;

  const tagline = language === "de" ? theme.taglineDe : theme.tagline;
  const moodText = language === "de" ? theme.moodTextDe : theme.moodText;

  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...secondary);
    doc.text("CaskSense", marginX, pageH - 8);
    doc.text(`${l("page", language)} ${pageNum} / ${totalPages}`, pageW - marginX, pageH - 8, { align: "right" });
  };

  const whiskiesPerPage = 12;
  const totalContentPages = 1 + Math.ceil(whiskies.length / whiskiesPerPage);
  const totalPages = 1 + totalContentPages;

  doc.setFillColor(...bg);
  doc.rect(0, 0, pageW, pageH, "F");

  let hasCover = false;
  if (coverImageBase64) {
    const src = coverImageBase64.startsWith("data:") ? coverImageBase64 : `data:image/jpeg;base64,${coverImageBase64}`;
    hasCover = await drawCoverImageFull(doc, src, pageW, pageH);
  }

  if (hasCover) {
    doc.setFillColor(0, 0, 0);
    doc.setGState(new (doc as any).GState({ opacity: 0.55 }));
    doc.rect(0, 0, pageW, pageH, "F");
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
  } else {
    doc.setDrawColor(...primary);
    doc.setLineWidth(0.5);
    doc.rect(12, 12, pageW - 24, pageH - 24);
    doc.setLineWidth(0.2);
    doc.rect(14, 14, pageW - 28, pageH - 28);

    const ornY = isLandscape ? 30 : 40;
    const ornW = 50;
    doc.setDrawColor(...secondary);
    doc.setLineWidth(0.15);
    doc.line(pageW / 2 - ornW, ornY, pageW / 2 + ornW, ornY);
    doc.setFillColor(...secondary);
    doc.circle(pageW / 2, ornY, 1.5, "F");
    doc.circle(pageW / 2 - ornW, ornY, 0.6, "F");
    doc.circle(pageW / 2 + ornW, ornY, 0.6, "F");
  }

  const textColor: RGB = hasCover ? [255, 255, 255] : primary;
  const subTextColor: RGB = hasCover ? [220, 220, 220] : secondary;
  const accentTextColor: RGB = hasCover ? [200, 200, 200] : accent;

  let coverY = isLandscape ? (pageH * 0.2) : (pageH * 0.22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...accentTextColor);
  doc.text("C A S K S E N S E", pageW / 2, coverY, { align: "center" });
  coverY += 6;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(...subTextColor);
  doc.text("Where Tasting Becomes Reflection", pageW / 2, coverY, { align: "center" });
  coverY += isLandscape ? 16 : 24;

  doc.setDrawColor(...(hasCover ? ([255, 255, 255] as RGB) : secondary));
  doc.setLineWidth(0.2);
  doc.line(pageW / 2 - 40, coverY, pageW / 2 + 40, coverY);
  coverY += isLandscape ? 14 : 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(isLandscape ? 28 : 34);
  doc.setTextColor(...textColor);
  const titleLines = doc.splitTextToSize(tasting.title, contentW - 20);
  doc.text(titleLines, pageW / 2, coverY, { align: "center" });
  coverY += titleLines.length * (isLandscape ? 12 : 14) + 6;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(isLandscape ? 11 : 13);
  doc.setTextColor(...subTextColor);
  doc.text(tagline, pageW / 2, coverY, { align: "center" });
  coverY += 8;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...accentTextColor);
  doc.text(moodText, pageW / 2, coverY, { align: "center" });
  coverY += isLandscape ? 12 : 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...subTextColor);
  const displayDate = formatDateLocalized(tasting.date, language);
  doc.text(displayDate, pageW / 2, coverY, { align: "center" });
  coverY += 6;

  if (tasting.location && tasting.location !== "—") {
    doc.text(tasting.location, pageW / 2, coverY, { align: "center" });
    coverY += 6;
  }

  coverY += 4;
  doc.setFontSize(10);
  doc.setTextColor(...subTextColor);
  doc.text(hostName, pageW / 2, coverY, { align: "center" });
  coverY += isLandscape ? 10 : 14;

  doc.setDrawColor(...(hasCover ? ([255, 255, 255] as RGB) : secondary));
  doc.setLineWidth(0.2);
  doc.line(pageW / 2 - 40, coverY, pageW / 2 + 40, coverY);
  coverY += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...subTextColor);
  const count = whiskies.length;
  const exprLabel = count === 1 ? l("expression", language) : l("expressions", language);
  doc.text(`${count} ${exprLabel}`, pageW / 2, coverY, { align: "center" });

  doc.addPage();
  doc.setFillColor(...bg);
  doc.rect(0, 0, pageW, pageH, "F");

  let y = isLandscape ? 20 : 25;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...primary);
  doc.text(l("overview", language).toUpperCase(), pageW / 2, y, { align: "center" });
  y += 4;

  doc.setDrawColor(...secondary);
  doc.setLineWidth(0.3);
  doc.line(pageW / 2 - 30, y, pageW / 2 + 30, y);
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...primary);
  doc.text(l("host", language).toUpperCase(), marginX, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...secondary);
  doc.text(hostName, marginX, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...primary);
  doc.text(l("mode", language).toUpperCase(), marginX, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...secondary);
  doc.text(blindMode ? l("blind", language) : l("open", language), marginX, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...primary);
  doc.text(l("ratingScale", language).toUpperCase(), marginX, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...secondary);
  doc.text(`1 – ${tasting.ratingScale}`, marginX, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...primary);
  doc.text(l("whiskies", language).toUpperCase(), marginX, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...secondary);
  doc.text(`${whiskies.length}`, marginX, y);
  y += 14;

  doc.setDrawColor(...secondary);
  doc.setLineWidth(0.15);
  doc.line(marginX, y, pageW - marginX, y);
  y += 10;

  if (participants.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...primary);
    doc.text(l("participants", language).toUpperCase(), marginX, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...secondary);

    const colW = isLandscape ? contentW / 4 : contentW / 3;
    const colCount = isLandscape ? 4 : 3;

    participants.forEach((p, i) => {
      const col = i % colCount;
      const row = Math.floor(i / colCount);
      const px = marginX + col * colW;
      const py = y + row * 7;

      if (py > pageH - 20) return;

      doc.text(`• ${p.name}`, px, py);
    });

    const rows = Math.ceil(participants.length / colCount);
    y += rows * 7 + 8;
  }

  addFooter(2, totalPages);

  const whiskyPages = Math.ceil(whiskies.length / whiskiesPerPage);
  const colCount = 2;
  const perCol = Math.ceil(whiskiesPerPage / colCount);
  const colGap = 8;
  const colW = (contentW - colGap) / colCount;

  for (let page = 0; page < whiskyPages; page++) {
    doc.addPage();
    doc.setFillColor(...bg);
    doc.rect(0, 0, pageW, pageH, "F");

    let wy = isLandscape ? 18 : 22;

    if (page === 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...primary);
      doc.text(l("lineup", language).toUpperCase(), pageW / 2, wy, { align: "center" });
      wy += 4;
      doc.setDrawColor(...secondary);
      doc.setLineWidth(0.3);
      doc.line(pageW / 2 - 30, wy, pageW / 2 + 30, wy);
      wy += 10;
    }

    const pageItems = whiskies.slice(page * whiskiesPerPage, (page + 1) * whiskiesPerPage);
    const availableH = pageH - wy - 15;
    const rowH = availableH / perCol;

    pageItems.forEach((w, i) => {
      const idx = page * whiskiesPerPage + i;
      const col = i < perCol ? 0 : 1;
      const row = i < perCol ? i : i - perCol;
      const colX = marginX + col * (colW + colGap);
      const cardY = wy + row * rowH;

      doc.setFillColor(240, 243, 248);
      doc.roundedRect(colX, cardY, colW, 7, 1, 1, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...primary);

      const maxNameLen = isLandscape ? 28 : 22;

      if (blindMode) {
        doc.text(`#${idx + 1}`, colX + 2, cardY + 5);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(...secondary);
        doc.text(l("mysteryWhisky", language), colX + 12, cardY + 5);
      } else {
        doc.text(`${idx + 1}.`, colX + 2, cardY + 5);
        const numW = doc.getTextWidth(`${idx + 1}. `);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        const dispName = w.name.length > maxNameLen ? w.name.slice(0, maxNameLen - 2) + "\u2026" : w.name;
        doc.text(dispName, colX + 2 + numW, cardY + 5);
      }

      if (!blindMode) {
        let detailY = cardY + 11;
        const details: string[] = [];
        if (w.distillery && w.distillery !== w.name) details.push(w.distillery);
        if (w.age) {
          const ageDisplay = w.age === "NAS" || w.age === "n.a.s." ? "NAS" : `${w.age}y`;
          details.push(ageDisplay);
        }
        if (w.abv != null) details.push(`${w.abv}%`);
        if (w.caskInfluence) details.push(w.caskInfluence);
        if (w.region) details.push(w.region);

        if (details.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(...secondary);
          const detailStr = details.join(" · ");
          const maxW = colW - 4;
          const truncated = doc.getTextWidth(detailStr) > maxW
            ? detailStr.slice(0, Math.floor(detailStr.length * maxW / doc.getTextWidth(detailStr))) + "\u2026"
            : detailStr;
          doc.text(truncated, colX + 2, detailY);
        }
      }
    });

    addFooter(2 + page + 1, totalPages);
  }

  const filename = `${tasting.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_Menukarte.pdf`;
  saveOrPrintJsPdf(doc, filename, mode);
}
