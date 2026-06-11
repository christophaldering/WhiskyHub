// Image upload sanitizer chokepoint.
//
// Every uploaded image flows through maybeCompressImage(): the sharp re-encode
// to webp (rotate -> resize -> webp) is what strips EXIF/GPS metadata. The
// sanitizer must stay universal and fail-closed — a re-encode that silently
// falls back to the original on error would re-introduce a location-data leak.

export const COMPRESSIBLE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/tiff",
]);
const MAX_IMAGE_EDGE = 1600;
const WEBP_QUALITY = 82;

export function sniffImageType(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61
  ) {
    return "image/gif";
  }
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    const brand = buffer.toString("ascii", 8, 12).toLowerCase();
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"].includes(brand)) {
      return "image/heic";
    }
  }
  if (
    (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
    (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a)
  ) {
    return "image/tiff";
  }
  return null;
}

export async function sanitizeImageToWebp(buffer: Buffer, effectiveType: string): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const isGif = effectiveType === "image/gif";
  const isHeic = effectiveType === "image/heic" || effectiveType === "image/heif";
  const runSharp = (input: Buffer) => {
    const pipeline = sharp(input, { failOn: "none", animated: isGif });
    if (!isGif) pipeline.rotate();
    return pipeline
      .resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();
  };
  if (!isHeic) {
    const out = await runSharp(buffer);
    if (out.length === 0) throw new Error("sharp produced empty output");
    return out;
  }
  try {
    const out = await runSharp(buffer);
    if (out.length === 0) throw new Error("sharp produced empty output");
    return out;
  } catch {
    const heicConvert = (await import("heic-convert")).default;
    const jpeg = await heicConvert({ buffer, format: "JPEG", quality: 0.92 });
    const out = await runSharp(Buffer.from(jpeg));
    if (out.length === 0) throw new Error("sharp produced empty output after heic-convert");
    return out;
  }
}

export async function maybeCompressImage(
  buffer: Buffer,
  contentType: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const lower = (contentType || "").toLowerCase();
  const declaredImage = COMPRESSIBLE_IMAGE_TYPES.has(lower);
  const sniffed = sniffImageType(buffer);
  const effectiveType = declaredImage ? lower : sniffed;
  if (!effectiveType) return { buffer, contentType };
  try {
    const out = await sanitizeImageToWebp(buffer, effectiveType);
    console.log(`[image-sanitize] ok type=${effectiveType} in=${buffer.length} out=${out.length}`);
    return { buffer: out, contentType: "image/webp" };
  } catch (err) {
    console.error(`[image-sanitize] REJECTED type=${effectiveType} size=${buffer.length}:`, err);
    throw new Error("Image could not be sanitized and was rejected to prevent metadata leakage");
  }
}
