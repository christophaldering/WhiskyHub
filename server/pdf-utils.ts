import { PDFParse } from "pdf-parse";

export async function extractPagesText(buffer: Buffer): Promise<string[]> {
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: false,
    isEvalSupported: false,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      const text = (tc.items as any[])
        .map((it) => (typeof it.str === "string" ? it.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pages.push(text);
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }
  return pages;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text || "";
  } finally {
    await parser.destroy();
  }
}

export async function extractPdfInfo(buffer: Buffer): Promise<{
  text: string;
  numPages: number;
  info: Record<string, any>;
}> {
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    const infoResult = await parser.getInfo();
    return {
      text: textResult.text || "",
      numPages: infoResult.total || 0,
      info: infoResult.info || {},
    };
  } finally {
    await parser.destroy();
  }
}
