// client/src/lib/cooperMemoryPdf.ts
// Gebrandete "Sensorisches Gedächtnis"-PDF im Stil des Connoisseur-Reports:
// Creme-Hero mit Cooper-Fass als Wappen, Serifen-Body, Goldlinien, Fußzeile.
import jsPDF from "jspdf";
import { saveJsPdf } from "@/lib/pdf";

type RGB = [number, number, number];
const ACCENT: RGB = [180, 130, 30];
const PRIMARY: RGB = [30, 30, 32];
const SECONDARY: RGB = [100, 100, 110];
const BG: RGB = [252, 251, 248];

async function barrelPng(size = 220): Promise<string | null> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 72 72" fill="none" stroke="rgb(180,130,30)" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="2.4"><path d="M23 12C14 24 14 50 23 62"/><path d="M49 12C58 24 58 50 49 62"/></g><path d="M23 62C29 65 43 65 49 62" stroke-width="2.4"/><g stroke-width="2"><path d="M36 12.5V61.5"/><path d="M29 13C26 26 26 48 29 61"/><path d="M43 13C46 26 46 48 43 61"/></g><ellipse cx="36" cy="12" rx="13" ry="4" stroke-width="2.2"/><g stroke-width="2.4"><path d="M18.5 24.5C28 27 44 27 53.5 24.5"/><path d="M18.5 49.5C28 52 44 52 53.5 49.5"/></g></svg>`;
  try {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const img = new Image();
    await new Promise((res, rej) => { img.onload = () => res(null); img.onerror = rej; img.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) { URL.revokeObjectURL(url); return null; }
    ctx.drawImage(img, 0, 0, size, size);
    URL.revokeObjectURL(url);
    return canvas.toDataURL("image/png");
  } catch { return null; }
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return ""; }
}

async function buildDoc(memoryText: string, updatedAt: string | null, participantName?: string): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210, pageH = 297, mx = 22, contentW = pageW - mx * 2, cx = pageW / 2;
  const bg = () => { doc.setFillColor(...BG); doc.rect(0, 0, pageW, pageH, "F"); };
  bg();

  let y = 20;
  const barrel = await barrelPng(220);
  if (barrel) { try { doc.addImage(barrel, "PNG", cx - 9, y, 18, 18); } catch {} }
  y += 25;

  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...SECONDARY);
  doc.text("C A S K S E N S E", cx, y, { align: "center" });
  y += 11;

  doc.setFont("times", "bold"); doc.setFontSize(24); doc.setTextColor(...PRIMARY);
  doc.text("Sensorisches Gedächtnis", cx, y, { align: "center" });
  y += 9;

  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...SECONDARY);
  const sub = `${participantName ? participantName + "  ·  " : ""}${fmtDate(updatedAt)}`.trim();
  if (sub) { doc.text(sub, cx, y, { align: "center" }); y += 8; }

  doc.setDrawColor(...ACCENT); doc.setLineWidth(0.5); doc.line(mx, y, pageW - mx, y);
  y += 12;

  doc.setFont("times", "normal"); doc.setFontSize(12.5); doc.setTextColor(...PRIMARY);
  const lineH = 6.2;
  const lines: string[] = doc.splitTextToSize(memoryText || "", contentW);
  for (const ln of lines) {
    if (y > pageH - 26) { doc.addPage(); bg(); y = 26; }
    doc.text(ln, mx, y); y += lineH;
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...ACCENT); doc.setLineWidth(0.3); doc.line(mx, pageH - 18, pageW - mx, pageH - 18);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...SECONDARY);
    doc.text("Erzeugt von CaskSense — nur in deinem Bereich gespeichert.", mx, pageH - 12);
    doc.text(`${p}`, pageW - mx, pageH - 12, { align: "right" });
  }

  return doc;
}

export async function downloadCooperMemoryPdf(memoryText: string, updatedAt: string | null, participantName?: string): Promise<void> {
  const doc = await buildDoc(memoryText, updatedAt, participantName);
  await saveJsPdf(doc, "casksense-sensorisches-gedaechtnis.pdf");
}

export async function buildCooperMemoryPdfBlobUrl(memoryText: string, updatedAt: string | null, participantName?: string): Promise<string> {
  const doc = await buildDoc(memoryText, updatedAt, participantName);
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
}
