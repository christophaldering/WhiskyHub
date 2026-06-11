// @vitest-environment node
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import exifr from "exifr";
import {
  maybeCompressImage,
  sniffImageType,
} from "../../server/image-sanitize";

const fixturesDir = path.resolve(__dirname, "../fixtures");

function readFixture(name: string): Buffer {
  return fs.readFileSync(path.join(fixturesDir, name));
}

// Reads ALL embedded metadata (EXIF, GPS, IFD0, ...) and returns the parsed
// object, or undefined when the buffer carries no metadata at all. exifr
// throws "Invalid input argument" when it cannot even locate a metadata block,
// which is itself proof that nothing leaked — normalize that to undefined.
async function parseAllMetadata(buffer: Buffer): Promise<unknown> {
  try {
    return await exifr.parse(buffer, true);
  } catch {
    return undefined;
  }
}

async function parseGps(
  buffer: Buffer,
): Promise<{ latitude?: number; longitude?: number } | undefined> {
  try {
    return await exifr.gps(buffer);
  } catch {
    return undefined;
  }
}

describe("image upload sanitizer — location-data leak prevention", () => {
  it("strips EXIF/GPS metadata from a GPS-tagged JPEG and outputs webp", async () => {
    const input = readFixture("gps-tagged.jpg");

    // Sanity: the fixture genuinely carries GPS coordinates before sanitizing.
    const gpsBefore = await parseGps(input);
    expect(gpsBefore?.latitude).toBeTypeOf("number");
    expect(gpsBefore?.longitude).toBeTypeOf("number");

    const { buffer, contentType } = await maybeCompressImage(input, "image/jpeg");

    expect(contentType).toBe("image/webp");
    const meta = await sharp(buffer).metadata();
    expect(meta.format).toBe("webp");

    // No GPS and no other EXIF metadata may survive the re-encode.
    const gpsAfter = await parseGps(buffer);
    expect(gpsAfter).toBeUndefined();
    const allAfter = await parseAllMetadata(buffer);
    expect(allAfter).toBeUndefined();
  });

  it("sanitizes a real image even when declared as application/octet-stream (magic-byte sniffing)", async () => {
    const input = readFixture("gps-tagged.jpg");
    expect(sniffImageType(input)).toBe("image/jpeg");

    const { buffer, contentType } = await maybeCompressImage(
      input,
      "application/octet-stream",
    );

    expect(contentType).toBe("image/webp");
    const meta = await sharp(buffer).metadata();
    expect(meta.format).toBe("webp");
    const gpsAfter = await parseGps(buffer);
    expect(gpsAfter).toBeUndefined();
  });

  it("rejects (fail-closed) corrupt bytes that are declared as an image", async () => {
    const corrupt = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0xde, 0xad, 0xbe, 0xef, 0xde, 0xad, 0xbe, 0xef,
    ]);
    // Declared as a JPEG, so it must be treated as an image and rejected when
    // it cannot be decoded/re-encoded — never passed through untouched.
    await expect(maybeCompressImage(corrupt, "image/jpeg")).rejects.toThrow(
      /could not be sanitized/i,
    );
  });

  it("passes a non-image (PDF) through unchanged", async () => {
    const pdf = Buffer.from("%PDF-1.4\n%fake pdf body\n%%EOF\n", "binary");
    const { buffer, contentType } = await maybeCompressImage(
      pdf,
      "application/pdf",
    );

    expect(contentType).toBe("application/pdf");
    expect(buffer.equals(pdf)).toBe(true);
  });

  it("preserves animation frames for an animated GIF and strips metadata", async () => {
    const input = readFixture("animated.gif");
    expect(sniffImageType(input)).toBe("image/gif");

    const before = await sharp(input, { animated: true }).metadata();
    expect(before.pages).toBeGreaterThan(1);

    const { buffer, contentType } = await maybeCompressImage(input, "image/gif");

    expect(contentType).toBe("image/webp");
    const after = await sharp(buffer, { animated: true }).metadata();
    expect(after.format).toBe("webp");
    expect(after.pages).toBeGreaterThan(1);

    const allAfter = await parseAllMetadata(buffer);
    expect(allAfter).toBeUndefined();
  });
});
