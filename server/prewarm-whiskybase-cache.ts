import { ObjectStorageService, objectStorageClient } from "./replit_integrations/object_storage";
import { db } from "./db";
import { whiskybaseCollection } from "@shared/schema";
import { isNotNull } from "drizzle-orm";
import crypto from "crypto";
import sharp from "sharp";

const ALLOWED_HOST = "static.whiskybase.com";
const MIN_DELAY_MS = 1100;
const MAX_EDGE = 1600;
const WEBP_QUALITY = 82;

function parseStoragePath(fullPath: string): { bucketName: string; objectName: string } {
  const parts = fullPath.split("/").filter((p) => p.length > 0);
  if (parts.length < 2) throw new Error(`Invalid storage path: ${fullPath}`);
  return { bucketName: parts[0], objectName: parts.slice(1).join("/") };
}

function getCacheFile(objectStorage: ObjectStorageService, hash: string) {
  const dir = objectStorage.getPrivateObjectDir();
  const trimmed = dir.endsWith("/") ? dir.slice(0, -1) : dir;
  const fullPath = `${trimmed}/remote-cache/${hash}.webp`;
  const { bucketName, objectName } = parseStoragePath(fullPath);
  return objectStorageClient.bucket(bucketName).file(objectName);
}

async function compress(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer, { failOn: "none" })
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();
}

async function fetchAndCompress(url: string): Promise<{ buffer: Buffer; bytesOriginal: number }> {
  const resp = await fetch(url, {
    headers: { "User-Agent": "CaskSenseImageCache/1.0" },
    redirect: "error",
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const ct = (resp.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!ct.startsWith("image/")) throw new Error(`Not an image: ${ct}`);
  const raw = Buffer.from(await resp.arrayBuffer());
  if (raw.length === 0) throw new Error("Empty response");
  if (raw.length > 25 * 1024 * 1024) throw new Error("Too large");
  const compressed = await compress(raw);
  return { buffer: compressed, bytesOriginal: raw.length };
}

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === ALLOWED_HOST &&
      parsed.username === "" &&
      parsed.password === "" &&
      (parsed.port === "" || parsed.port === "443")
    );
  } catch {
    return false;
  }
}

async function main() {
  const objectStorage = new ObjectStorageService();
  const rows = await db
    .select({ url: whiskybaseCollection.imageUrl })
    .from(whiskybaseCollection)
    .where(isNotNull(whiskybaseCollection.imageUrl));

  const urls = Array.from(
    new Set(
      rows
        .map((r) => (r.url || "").trim())
        .filter((u) => u.length > 0 && isAllowedUrl(u))
    )
  );

  console.log(`Pre-warming ${urls.length} unique Whiskybase image URLs (delay ${MIN_DELAY_MS} ms between fetches)`);

  let cached = 0;
  let alreadyPresent = 0;
  let failed = 0;
  let totalOriginal = 0;
  let totalCompressed = 0;
  const start = Date.now();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const hash = crypto.createHash("sha256").update(url).digest("hex");
    const file = getCacheFile(objectStorage, hash);

    try {
      const [exists] = await file.exists();
      if (exists) {
        const [meta] = await file.getMetadata();
        const sizeStr = typeof meta.size === "string" ? meta.size : String(meta.size ?? 0);
        console.log(`[${i + 1}/${urls.length}] skip (already cached) hash=${hash} bytes=${sizeStr} url=${url}`);
        alreadyPresent++;
        continue;
      }
    } catch (err) {
      console.warn(`[${i + 1}/${urls.length}] exists() check failed, will try fetch:`, err instanceof Error ? err.message : err);
    }

    const tFetchStart = Date.now();
    try {
      const { buffer, bytesOriginal } = await fetchAndCompress(url);
      await file.save(buffer, {
        contentType: "image/webp",
        resumable: false,
        metadata: { cacheControl: "public, max-age=31536000, immutable" },
      });
      cached++;
      totalOriginal += bytesOriginal;
      totalCompressed += buffer.length;
      console.log(`[${i + 1}/${urls.length}] persisted hash=${hash} bytes=${buffer.length} (was ${bytesOriginal}) url=${url}`);
    } catch (err) {
      failed++;
      console.warn(`[${i + 1}/${urls.length}] FAILED url=${url}:`, err instanceof Error ? err.message : err);
    }

    const elapsed = Date.now() - tFetchStart;
    const wait = Math.max(0, MIN_DELAY_MS - elapsed);
    if (i < urls.length - 1 && wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }

  const seconds = Math.round((Date.now() - start) / 1000);
  console.log("");
  console.log(`Done in ${seconds}s. cached=${cached} already=${alreadyPresent} failed=${failed}`);
  if (cached > 0) {
    const savedKb = ((totalOriginal - totalCompressed) / 1024).toFixed(1);
    console.log(`Bytes: original=${totalOriginal} compressed=${totalCompressed} saved=${savedKb} KB`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
