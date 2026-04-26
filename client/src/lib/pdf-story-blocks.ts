import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { saveJsPdf } from "@/lib/pdf";
import { StoryRenderer } from "@/storybuilder/renderer/StoryRenderer";
import { getPublicTastingStory, type TastingStoryDocument, type TastingStoryMeta } from "@/lib/tastingStoryApi";

export type BlockPdfProgressCallback = (current: number, total: number, label: string) => void;

export type ExportTastingStoryBlocksPdfOptions = {
  document: TastingStoryDocument;
  meta: { title: string; date?: string | null };
  fileName?: string;
  returnBase64?: boolean;
  onProgress?: BlockPdfProgressCallback;
};

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN_MM = 12;
const FOOTER_MM = 10;
const CONTENT_W_MM = PAGE_W_MM - MARGIN_MM * 2;
const CONTENT_H_MM = PAGE_H_MM - MARGIN_MM * 2 - FOOTER_MM;
const RENDER_WIDTH_PX = 794;

export function hasBlockStory(
  tasting: { storyBlocks?: unknown } | null | undefined,
): boolean {
  if (!tasting) return false;
  const blocks = (tasting as { storyBlocks?: unknown }).storyBlocks;
  return Array.isArray(blocks) && blocks.length > 0;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function waitForImages(root: HTMLElement, timeoutMs: number): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  const pending = images.filter((img) => !img.complete || img.naturalWidth === 0);
  if (pending.length === 0) return;
  await Promise.race([
    Promise.all(
      pending.map(
        (img) =>
          new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          }),
      ),
    ).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

function createOffscreenHost(): { host: HTMLDivElement; root: Root } {
  const host = document.createElement("div");
  host.setAttribute("data-pdf-offscreen", "true");
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.left = "0";
  host.style.width = `${RENDER_WIDTH_PX}px`;
  host.style.maxWidth = `${RENDER_WIDTH_PX}px`;
  host.style.zIndex = "-1";
  host.style.opacity = "0";
  host.style.pointerEvents = "none";
  host.style.background = "#ffffff";
  host.style.transform = "translateY(0)";
  document.body.appendChild(host);
  const root = createRoot(host);
  return { host, root };
}

function disposeHost(host: HTMLDivElement, root: Root): void {
  try {
    root.unmount();
  } catch {
    void 0;
  }
  if (host.parentNode) host.parentNode.removeChild(host);
}

function buildSafeFileName(title: string): string {
  const safe = (title || "tasting-story").replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 64);
  return `${safe}_story.pdf`;
}

function drawFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  meta: { title: string; date?: string | null },
): void {
  const fy = PAGE_H_MM - 6;
  doc.setDrawColor(201, 169, 97);
  doc.setLineWidth(0.25);
  doc.line(MARGIN_MM, fy - 3, PAGE_W_MM - MARGIN_MM, fy - 3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  const dateLabel = meta.date ? ` · ${meta.date}` : "";
  doc.text(`CaskSense Story · ${meta.title}${dateLabel}`, MARGIN_MM, fy);
  doc.text(`${pageNumber} / ${totalPages}`, PAGE_W_MM - MARGIN_MM, fy, { align: "right" });
}

export async function exportTastingStoryBlocksPdf(
  opts: ExportTastingStoryBlocksPdfOptions,
): Promise<string | void> {
  const { document: storyDoc, meta, fileName, returnBase64, onProgress } = opts;
  if (!storyDoc || !Array.isArray(storyDoc.blocks) || storyDoc.blocks.length === 0) {
    throw new Error("Story-Dokument enthaelt keine Bloecke");
  }

  const visibleBlocks = storyDoc.blocks.filter((b) => !b.hidden);
  if (visibleBlocks.length === 0) {
    throw new Error("Story-Dokument enthaelt keine sichtbaren Bloecke");
  }

  const { host, root } = createOffscreenHost();
  try {
    root.render(
      createElement(StoryRenderer, {
        document: storyDoc,
        mode: "print",
      }),
    );
    await nextFrame();
    await nextFrame();
    await waitForImages(host, 8000);
    await nextFrame();

    const blockNodes = Array.from(
      host.querySelectorAll<HTMLElement>(".storybuilder-block"),
    ).filter((node, idx) => {
      if (idx >= visibleBlocks.length) return false;
      return !!node.offsetParent || node.getBoundingClientRect().height > 0;
    });

    if (blockNodes.length === 0) {
      throw new Error("Keine renderbaren Bloecke gefunden");
    }

    const total = blockNodes.length;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    let successfulPages = 0;

    for (let i = 0; i < blockNodes.length; i += 1) {
      const node = blockNodes[i];
      const blockType = node.getAttribute("data-block-type") ?? "block";
      const label = `Block ${i + 1} / ${total} · ${blockType}`;
      onProgress?.(i + 1, total, label);
      if (onProgress) await new Promise<void>((r) => setTimeout(r, 0));

      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(node, {
          backgroundColor: "#ffffff",
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          imageTimeout: 8000,
          windowWidth: RENDER_WIDTH_PX,
        });
      } catch (err) {
        console.warn("[pdf-story-blocks] html2canvas failed for block", i, err);
        continue;
      }

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const pxPerMm = canvas.width / CONTENT_W_MM;
      let drawW = CONTENT_W_MM;
      let drawH = canvas.height / pxPerMm;
      if (drawH > CONTENT_H_MM) {
        const scale = CONTENT_H_MM / drawH;
        drawH = CONTENT_H_MM;
        drawW = drawW * scale;
      }
      const offsetX = MARGIN_MM + (CONTENT_W_MM - drawW) / 2;
      const offsetY = MARGIN_MM;

      if (successfulPages > 0) doc.addPage();
      try {
        doc.addImage(dataUrl, "JPEG", offsetX, offsetY, drawW, drawH, undefined, "FAST");
        successfulPages += 1;
      } catch (err) {
        console.warn("[pdf-story-blocks] addImage failed for block", i, err);
        if (successfulPages > 0) {
          try { doc.deletePage(doc.getNumberOfPages()); } catch { void 0; }
        }
        continue;
      }
    }

    if (successfulPages === 0) {
      throw new Error("Story-PDF konnte nicht erzeugt werden: keine Bloecke gerendert");
    }

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p += 1) {
      doc.setPage(p);
      drawFooter(doc, p, totalPages, meta);
    }

    if (returnBase64) {
      return doc.output("datauristring");
    }
    const safeName = fileName && fileName.length > 0 ? fileName : buildSafeFileName(meta.title);
    await saveJsPdf(doc, safeName);
    return undefined;
  } finally {
    disposeHost(host, root);
  }
}

export async function exportTastingStoryBlocksPdfFor(
  tastingId: string,
  tastingTitle?: string,
  onProgress?: BlockPdfProgressCallback,
): Promise<void> {
  const story = await getPublicTastingStory(tastingId);
  const meta: TastingStoryMeta = story.tasting;
  const title = tastingTitle ?? meta.title ?? "Tasting Story";
  const date = (() => {
    const raw = meta.scheduledAt;
    if (!raw) return null;
    try {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
    } catch {
      return null;
    }
  })();
  await exportTastingStoryBlocksPdf({
    document: story.document,
    meta: { title, date },
    onProgress,
  });
}
