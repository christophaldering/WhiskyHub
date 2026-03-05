import type jsPDF from "jspdf";
import { downloadBlob } from "./download";

export function saveJsPdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}

export function openJsPdfForPrint(doc: jsPDF) {
  doc.autoPrint();
  window.open(doc.output("bloburl") as unknown as string, "_blank");
}

export function saveOrPrintJsPdf(doc: jsPDF, filename: string, mode: "download" | "print") {
  if (mode === "print") {
    openJsPdfForPrint(doc);
  } else {
    saveJsPdf(doc, filename);
  }
}
