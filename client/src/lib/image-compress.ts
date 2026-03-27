import imageCompression from "browser-image-compression";
import heic2any from "heic2any";

const MAX_WIDTH_PX = 1920;
const JPEG_QUALITY = 0.85;
const MAX_POST_COMPRESSION_BYTES = 15 * 1024 * 1024;
const SERVER_MAX_BYTES = 20 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

const HEIC_EXTENSIONS = [".heic", ".heif"];

export const IMAGE_ACCEPT_STRING =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif";

export function isAcceptedImageType(file: File): boolean {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type)) return true;
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  return HEIC_EXTENSIONS.includes(ext);
}

function isHeicFile(file: File): boolean {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    HEIC_EXTENSIONS.includes(ext)
  );
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: JPEG_QUALITY,
  });
  const blob = Array.isArray(result) ? result[0] : result;
  const outputName = file.name.replace(/\.[^.]+$/, ".jpg");
  return new File([blob], outputName, { type: "image/jpeg" });
}

export async function compressImage(file: File): Promise<File> {
  let inputFile = file;

  if (isHeicFile(file)) {
    try {
      inputFile = await convertHeicToJpeg(file);
    } catch {
      if (file.size <= SERVER_MAX_BYTES) {
        return file;
      }
      throw new Error("HEIC-Konvertierung fehlgeschlagen und Datei zu groß für direkten Upload.");
    }
  }

  try {
    const options: Parameters<typeof imageCompression>[1] = {
      maxWidthOrHeight: MAX_WIDTH_PX,
      initialQuality: JPEG_QUALITY,
      useWebWorker: true,
      fileType: "image/jpeg",
      maxSizeMB: MAX_POST_COMPRESSION_BYTES / (1024 * 1024),
    };

    const compressed = await imageCompression(inputFile, options);
    const outputName = inputFile.name.replace(/\.[^.]+$/, ".jpg");
    return new File([compressed], outputName, { type: "image/jpeg" });
  } catch {
    if (inputFile.size <= SERVER_MAX_BYTES) {
      return inputFile;
    }
    throw new Error("Bildkomprimierung fehlgeschlagen und Datei zu groß für direkten Upload.");
  }
}

export function fileTooLargeAfterCompression(file: File): boolean {
  return file.size > SERVER_MAX_BYTES;
}
