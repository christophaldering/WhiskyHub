import type jsPDF from "jspdf";
import { downloadBlob, downloadBlobAndroid, isAndroid } from "./download";

export async function saveJsPdf(doc: jsPDF, filename: string): Promise<void> {
  const blob = doc.output("blob");
  await downloadBlob(blob, filename);
}

export async function openJsPdfForPrint(doc: jsPDF): Promise<void> {
  if (isAndroid()) {
    const blob = doc.output("blob");
    await downloadBlobAndroid(blob, "print.pdf");
    return;
  }

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

export async function saveOrPrintJsPdf(doc: jsPDF, filename: string, mode: "download" | "print"): Promise<void> {
  if (mode === "print") {
    await openJsPdfForPrint(doc);
  } else {
    await saveJsPdf(doc, filename);
  }
}
