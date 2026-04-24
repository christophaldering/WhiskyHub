import jsPDF from "jspdf";
import { saveJsPdf } from "@/lib/pdf";
import type { AutoHandoutSource } from "@shared/schema";

export interface AutoHandoutPdfChapter {
  kind: "distillery" | "whisky";
  subjectName: string;
  subjectKey: string;
  chapter: { id: string; title: string; content: string; sources: number[]; confidence: string };
  sources: AutoHandoutSource[];
  customContent?: string;
  enabled: boolean;
}

export interface AutoHandoutPdfOptions {
  tastingTitle: string;
  hostName?: string | null;
  language: string;
  chapters: AutoHandoutPdfChapter[];
  generatedAt?: string | null;
  // subjectKey -> selected image URL (host pick). Embedded as a hero image
  // before the first chapter of the matching distillery group.
  selectedImages?: Record<string, string>;
}

const MARGIN = 18;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const ACCENT: [number, number, number] = [180, 130, 30];
const TEXT: [number, number, number] = [30, 30, 32];
const MUTED: [number, number, number] = [110, 110, 120];

async function urlToDataUrl(url: string): Promise<{ dataUrl: string; format: string } | null> {
  try {
    const r = await fetch(url, { mode: "cors" });
    if (!r.ok) return null;
    const blob = await r.blob();
    const fmt = blob.type.includes("png") ? "PNG" : blob.type.includes("webp") ? "WEBP" : "JPEG";
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
    return { dataUrl, format: fmt };
  } catch {
    return null;
  }
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function drawWrappedText(doc: jsPDF, text: string, x: number, y: number, w: number, lh: number): number {
  const lines = doc.splitTextToSize(text, w);
  for (const ln of lines) {
    y = ensureSpace(doc, y, lh);
    doc.text(ln, x, y);
    y += lh;
  }
  return y;
}

export async function generateAutoHandoutPdf(opts: AutoHandoutPdfOptions): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = MARGIN;

  // Cover
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...ACCENT);
  y = drawWrappedText(doc, opts.tastingTitle, MARGIN, y + 4, CONTENT_W, 9);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  y = drawWrappedText(
    doc,
    opts.language === "en"
      ? "Auto-generated handout — extra info from CaskSense"
      : "Automatisch generiertes Handout — Zusatzinfos aus CaskSense",
    MARGIN, y, CONTENT_W, 6,
  );
  doc.setFontSize(9);
  if (opts.hostName) {
    y += 1;
    doc.text(`${opts.language === "en" ? "Host" : "Host"}: ${opts.hostName}`, MARGIN, y);
    y += 5;
  }
  if (opts.generatedAt) {
    y += 1;
    doc.text(`${opts.language === "en" ? "Generated" : "Erstellt"}: ${new Date(opts.generatedAt).toLocaleDateString(opts.language === "en" ? "en-GB" : "de-DE")}`, MARGIN, y);
    y += 6;
  }
  y += 4;
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  // Group chapters by subject
  const groups = new Map<string, { name: string; kind: string; chapters: AutoHandoutPdfChapter[] }>();
  for (const c of opts.chapters) {
    if (!c.enabled) continue;
    const key = `${c.kind}:${c.subjectKey}`;
    if (!groups.has(key)) groups.set(key, { name: c.subjectName, kind: c.kind, chapters: [] });
    groups.get(key)!.chapters.push(c);
  }

  for (const [, group] of groups) {
    y = ensureSpace(doc, y, 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...ACCENT);
    y = drawWrappedText(doc, group.name, MARGIN, y, CONTENT_W, 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(group.kind === "distillery" ? (opts.language === "en" ? "Distillery" : "Destille") : (opts.language === "en" ? "Whisky" : "Abfüllung"), MARGIN, y);
    y += 5;

    const subjectKey = group.chapters[0]?.subjectKey;
    const heroUrl = subjectKey ? opts.selectedImages?.[subjectKey] : undefined;
    if (heroUrl) {
      const img = await urlToDataUrl(heroUrl);
      if (img) {
        const imgH = 50;
        const imgW = CONTENT_W * 0.6;
        y = ensureSpace(doc, y, imgH + 4);
        try {
          doc.addImage(img.dataUrl, img.format, MARGIN, y, imgW, imgH, undefined, "FAST");
          y += imgH + 4;
        } catch { /* skip on decode failure */ }
      }
    }

    for (const ref of group.chapters) {
      y = ensureSpace(doc, y, 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...TEXT);
      const confTag = ref.chapter.confidence === "high" ? "" : ref.chapter.confidence === "medium" ? "  ~" : "  (?)";
      y = drawWrappedText(doc, ref.chapter.title + confTag, MARGIN, y, CONTENT_W, 6);
      y += 1;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...TEXT);
      const content = (ref.customContent && ref.customContent.trim()) || ref.chapter.content;
      y = drawWrappedText(doc, content, MARGIN, y, CONTENT_W, 5);
      y += 4;
    }

    // Sources for this group
    const allSrcIdx = new Set<number>();
    for (const c of group.chapters) for (const i of c.chapter.sources) allSrcIdx.add(i);
    if (allSrcIdx.size > 0) {
      y = ensureSpace(doc, y, 8);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      y = drawWrappedText(doc, opts.language === "en" ? "Sources:" : "Quellen:", MARGIN, y, CONTENT_W, 4);
      const srcs = group.chapters[0].sources;
      for (const idx of Array.from(allSrcIdx).sort((a, b) => a - b)) {
        const s = srcs[idx];
        if (!s) continue;
        const line = `[${idx + 1}] ${s.title} — ${s.url}`;
        y = drawWrappedText(doc, line, MARGIN + 2, y, CONTENT_W - 2, 4);
      }
      y += 4;
    }
    y += 4;
  }

  // Footer notice
  doc.addPage();
  y = MARGIN;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...ACCENT);
  doc.text(opts.language === "en" ? "About this handout" : "Über dieses Handout", MARGIN, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  const notice = opts.language === "en"
    ? "This handout was auto-generated by CaskSense from publicly available sources (Wikipedia, distillery websites, news, blogs, Whiskybase). The host has reviewed and may have edited the content. Please cross-check claims marked with (?) or ~ before quoting them."
    : "Dieses Handout wurde von CaskSense aus öffentlich zugänglichen Quellen (Wikipedia, Brennerei-Websites, News, Blogs, Whiskybase) automatisch erstellt. Der Host hat die Inhalte geprüft und ggf. bearbeitet. Aussagen mit (?) oder ~ bitte vor einer Weitergabe gegenprüfen.";
  drawWrappedText(doc, notice, MARGIN, y, CONTENT_W, 5);

  await saveJsPdf(doc, `auto-handout-${opts.tastingTitle.replace(/[^a-z0-9]+/gi, "_").slice(0, 60)}.pdf`);
}
