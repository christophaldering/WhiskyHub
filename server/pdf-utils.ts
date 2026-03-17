import { PDFParse } from "pdf-parse";

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
