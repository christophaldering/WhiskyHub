import libre from "libreoffice-convert";
import { promisify } from "util";
import path from "path";

const convertAsync = promisify(libre.convert) as (
  buffer: Buffer,
  format: string,
  filter: string | undefined,
) => Promise<Buffer>;

const WORD_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const WORD_EXTENSIONS = new Set([".doc", ".docx"]);

export function isWordFile(input: { mimetype?: string; originalname?: string; filename?: string }): boolean {
  const mime = (input.mimetype ?? "").toLowerCase();
  if (WORD_MIME_TYPES.has(mime)) return true;
  const name = (input.originalname ?? input.filename ?? "").toLowerCase();
  if (!name) return false;
  const ext = path.extname(name);
  return WORD_EXTENSIONS.has(ext);
}

export interface WordConversionResult {
  buffer: Buffer;
  filename: string;
  mimetype: "application/pdf";
}

export interface MutableUploadedFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size?: number;
}

export async function maybeConvertWordFileToPdf<T extends MutableUploadedFile>(
  file: T | undefined | null,
): Promise<T | undefined | null> {
  if (!file) return file;
  if (!isWordFile(file)) return file;
  const result = await convertWordBufferToPdf(file.buffer, file.originalname);
  file.buffer = result.buffer;
  file.mimetype = result.mimetype;
  file.originalname = result.filename;
  file.size = result.buffer.length;
  return file;
}

export async function convertWordBufferToPdf(
  buffer: Buffer,
  originalFilename: string,
): Promise<WordConversionResult> {
  if (!buffer || buffer.length === 0) {
    throw new Error("Word document is empty.");
  }
  let pdf: Buffer;
  try {
    pdf = await convertAsync(buffer, ".pdf", undefined);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Word-Datei konnte nicht in PDF konvertiert werden: ${message}`);
  }
  const baseName = originalFilename
    ? originalFilename.replace(/\.(docx?|DOCX?)$/i, "")
    : "document";
  return {
    buffer: pdf,
    filename: `${baseName}.pdf`,
    mimetype: "application/pdf",
  };
}
