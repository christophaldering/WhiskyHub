import type jsPDF from "jspdf";
import { downloadBlob } from "./download";

export function saveJsPdf(doc: jsPDF, filename: string) {
  const blob = doc.output("blob");
  downloadBlob(blob, filename);
}

export function openJsPdfForPrint(doc: jsPDF) {
  doc.autoPrint();
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) {
    URL.revokeObjectURL(url);
    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      const printUrl = URL.createObjectURL(blob);
      iframe.src = printUrl;
      iframe.onload = () => {
        try {
          iframe.contentWindow?.print();
        } catch {
          downloadBlob(blob, "print.pdf");
        }
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(printUrl);
        }, 1000);
      };
      document.body.appendChild(iframe);
    } catch {
      downloadBlob(blob, "print.pdf");
    }
  } else {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

export function saveOrPrintJsPdf(doc: jsPDF, filename: string, mode: "download" | "print") {
  if (mode === "print") {
    openJsPdfForPrint(doc);
  } else {
    saveJsPdf(doc, filename);
  }
}
