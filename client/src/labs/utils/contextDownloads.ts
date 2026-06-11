import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import { saveJsPdf } from "@/lib/pdf";
import { downloadBlob } from "@/lib/download";

export type ServerExportKind =
  | "journal"
  | "wishlist"
  | "collection"
  | "profile"
  | "friends"
  | "tastings";

export type ServerExportFormat = "csv" | "xlsx";

const FILENAME_PREFIX: Record<ServerExportKind, string> = {
  journal: "casksense_journal",
  wishlist: "casksense_wishlist",
  collection: "casksense_collection",
  profile: "casksense_profile",
  friends: "casksense_friends",
  tastings: "casksense_tastings",
};

export async function downloadServerExport(
  kind: ServerExportKind,
  format: ServerExportFormat,
  participantId: string,
  t?: (key: string, opts?: Record<string, unknown>) => string,
): Promise<void> {
  const url = `/api/export/${kind}?participantId=${encodeURIComponent(participantId)}&format=${format}`;
  const res = await fetch(url);
  if (!res.ok) {
    const fallback = `Export failed (${res.status})`;
    const message = t ? t("downloads.exportErrorServer", { status: res.status, defaultValue: fallback }) : fallback;
    throw new Error(message);
  }
  const blob = await res.blob();
  const today = new Date().toISOString().split("T")[0];
  const filename = `${FILENAME_PREFIX[kind]}_${today}.${format}`;
  await downloadBlob(blob, filename);
}

export interface XlsxSheet {
  name: string;
  rows: Record<string, unknown>[];
}

export async function downloadXlsxFromSheets(filename: string, sheets: XlsxSheet[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  for (const s of sheets) {
    const safeName = s.name.replace(/[\\/?*[\]]/g, "_").slice(0, 31) || "Sheet";
    const ws = wb.addWorksheet(safeName);
    const headerSet = new Set<string>();
    for (const row of s.rows) {
      for (const k of Object.keys(row)) headerSet.add(k);
    }
    const headers = Array.from(headerSet);
    if (headers.length > 0) {
      ws.columns = headers.map((h) => ({ header: h, key: h }));
      for (const row of s.rows) {
        ws.addRow(headers.map((h) => row[h] ?? ""));
      }
    }
  }
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  await downloadBlob(blob, filename);
}

export async function downloadCsvFromRows(filename: string, rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) {
    const blob = new Blob([""], { type: "text/csv;charset=utf-8" });
    await downloadBlob(blob, filename);
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(","));
  }
  const csv = lines.join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  await downloadBlob(blob, filename);
}

export interface PdfSection {
  heading: string;
  rows: { label: string; value: string }[];
}

const PDF_ACCENT: [number, number, number] = [201, 169, 97];
const PDF_TEXT: [number, number, number] = [40, 35, 28];
const PDF_MUTED: [number, number, number] = [120, 110, 95];

export async function downloadAnalyticsPdf(
  filename: string,
  title: string,
  subtitle: string | null,
  sections: PdfSection[],
  options?: { generatedLabel?: string; brandLabel?: string },
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const marginX = 18;
  let y = 22;

  const brandLabel = options?.brandLabel ?? "CaskSense Labs";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_ACCENT);
  doc.text(brandLabel, pageW / 2, y, { align: "center" });
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...PDF_TEXT);
  doc.text(title, pageW / 2, y, { align: "center" });
  y += 8;

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...PDF_MUTED);
    doc.text(subtitle, pageW / 2, y, { align: "center" });
    y += 6;
  }

  doc.setDrawColor(...PDF_ACCENT);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, pageW - marginX, y);
  y += 8;

  for (const section of sections) {
    if (y > pageH - 30) {
      doc.addPage();
      y = 22;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...PDF_ACCENT);
    doc.text(section.heading, marginX, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    for (const row of section.rows) {
      if (y > pageH - 18) {
        doc.addPage();
        y = 22;
      }
      const label = row.label.length > 60 ? row.label.slice(0, 58) + "…" : row.label;
      const value = row.value.length > 60 ? row.value.slice(0, 58) + "…" : row.value;
      doc.setTextColor(...PDF_MUTED);
      doc.text(label, marginX, y);
      doc.setTextColor(...PDF_TEXT);
      doc.text(value, pageW - marginX, y, { align: "right" });
      y += 5;
    }
    y += 3;
  }

  const generatedAt = new Date().toLocaleString();
  const generatedLabel = options?.generatedLabel ?? "Erzeugt";
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_MUTED);
  doc.text(`${generatedLabel}: ${generatedAt}`, pageW / 2, pageH - 10, { align: "center" });

  await saveJsPdf(doc, filename);
}

export function safeFileSegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60) || "export";
}
