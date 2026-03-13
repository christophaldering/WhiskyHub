import pdfParse from "pdf-parse";

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text || "";
}

export async function extractPdfInfo(buffer: Buffer): Promise<{
  text: string;
  numPages: number;
  info: Record<string, any>;
}> {
  const data = await pdfParse(buffer);
  return {
    text: data.text || "",
    numPages: data.numpages || 0,
    info: data.info || {},
  };
}
