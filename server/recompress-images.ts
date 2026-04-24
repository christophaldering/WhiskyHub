import { ObjectStorageService } from "./replit_integrations/object_storage";
import { db } from "./db";
import { whiskies, profiles, tastings, tastingPhotos, journalEntries, whiskyGallery } from "@shared/schema";
import { eq, and, isNotNull, like } from "drizzle-orm";
import sharp from "sharp";

const MAX_EDGE = 1600;
const WEBP_QUALITY = 82;

interface Target {
  table: string;
  column: string;
  rows: { id: string; url: string }[];
  update: (id: string, newUrl: string) => Promise<void>;
}

async function loadObject(objectStorage: ObjectStorageService, objectPath: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const file = await objectStorage.getObjectEntityFile(objectPath);
    const [metadata] = await file.getMetadata();
    const [buffer] = await file.download();
    return { buffer, contentType: metadata.contentType || "application/octet-stream" };
  } catch (err) {
    console.warn(`  could not load ${objectPath}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

async function recompress(buffer: Buffer): Promise<Buffer | null> {
  try {
    const out = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();
    return out.length > 0 ? out : null;
  } catch (err) {
    console.warn("  sharp failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function uploadCompressed(objectStorage: ObjectStorageService, buffer: Buffer): Promise<string> {
  const uploadURL = await objectStorage.getObjectEntityUploadURL();
  const resp = await fetch(uploadURL, {
    method: "PUT",
    body: buffer,
    headers: { "Content-Type": "image/webp" },
  });
  if (!resp.ok) {
    throw new Error(`upload failed (${resp.status})`);
  }
  return objectStorage.normalizeObjectEntityPath(uploadURL);
}

async function processTarget(objectStorage: ObjectStorageService, target: Target): Promise<{ done: number; skipped: number; failed: number; saved: number }> {
  let done = 0, skipped = 0, failed = 0, saved = 0;
  console.log(`\n[${target.table}.${target.column}] ${target.rows.length} rows`);
  for (const row of target.rows) {
    if (!row.url || !row.url.startsWith("/objects/")) {
      skipped++;
      continue;
    }
    const loaded = await loadObject(objectStorage, row.url);
    if (!loaded) { failed++; continue; }
    if ((loaded.contentType || "").toLowerCase() === "image/webp") {
      console.log(`  skip ${row.id}: already webp (${loaded.buffer.length} bytes)`);
      skipped++;
      continue;
    }
    const newBuf = await recompress(loaded.buffer);
    if (!newBuf) { failed++; continue; }
    if (newBuf.length >= loaded.buffer.length) {
      console.log(`  skip ${row.id}: webp not smaller (${loaded.buffer.length} → ${newBuf.length})`);
      skipped++;
      continue;
    }
    try {
      const newUrl = await uploadCompressed(objectStorage, newBuf);
      await target.update(row.id, newUrl);
      saved += loaded.buffer.length - newBuf.length;
      done++;
      console.log(`  ok ${row.id}: ${loaded.buffer.length} → ${newBuf.length} bytes (${row.url} → ${newUrl})`);
    } catch (err) {
      console.warn(`  failed ${row.id}:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }
  console.log(`[${target.table}.${target.column}] done=${done} skipped=${skipped} failed=${failed} saved=${(saved / 1024).toFixed(1)} KB`);
  return { done, skipped, failed, saved };
}

async function main() {
  const objectStorage = new ObjectStorageService();
  const targets: Target[] = [];

  const whiskyRows = await db.select({ id: whiskies.id, url: whiskies.imageUrl })
    .from(whiskies)
    .where(and(isNotNull(whiskies.imageUrl), like(whiskies.imageUrl, "/objects/%")));
  targets.push({
    table: "whiskies", column: "image_url",
    rows: whiskyRows.filter(r => r.url) as { id: string; url: string }[],
    update: async (id, newUrl) => { await db.update(whiskies).set({ imageUrl: newUrl }).where(eq(whiskies.id, id)); },
  });

  const profileRows = await db.select({ id: profiles.id, url: profiles.photoUrl })
    .from(profiles)
    .where(and(isNotNull(profiles.photoUrl), like(profiles.photoUrl, "/objects/%")));
  targets.push({
    table: "profiles", column: "photo_url",
    rows: profileRows.filter(r => r.url) as { id: string; url: string }[],
    update: async (id, newUrl) => { await db.update(profiles).set({ photoUrl: newUrl }).where(eq(profiles.id, id)); },
  });

  const tastingRows = await db.select({ id: tastings.id, url: tastings.coverImageUrl })
    .from(tastings)
    .where(and(isNotNull(tastings.coverImageUrl), like(tastings.coverImageUrl, "/objects/%")));
  targets.push({
    table: "tastings", column: "cover_image_url",
    rows: tastingRows.filter(r => r.url) as { id: string; url: string }[],
    update: async (id, newUrl) => { await db.update(tastings).set({ coverImageUrl: newUrl }).where(eq(tastings.id, id)); },
  });

  const tastingPhotoRows = await db.select({ id: tastingPhotos.id, url: tastingPhotos.photoUrl })
    .from(tastingPhotos)
    .where(like(tastingPhotos.photoUrl, "/objects/%"));
  targets.push({
    table: "tasting_photos", column: "photo_url",
    rows: tastingPhotoRows.filter(r => r.url) as { id: string; url: string }[],
    update: async (id, newUrl) => { await db.update(tastingPhotos).set({ photoUrl: newUrl }).where(eq(tastingPhotos.id, id)); },
  });

  const journalRows = await db.select({ id: journalEntries.id, url: journalEntries.imageUrl })
    .from(journalEntries)
    .where(and(isNotNull(journalEntries.imageUrl), like(journalEntries.imageUrl, "/objects/%")));
  targets.push({
    table: "journal_entries", column: "image_url",
    rows: journalRows.filter(r => r.url) as { id: string; url: string }[],
    update: async (id, newUrl) => { await db.update(journalEntries).set({ imageUrl: newUrl }).where(eq(journalEntries.id, id)); },
  });

  const galleryRows = await db.select({ id: whiskyGallery.id, url: whiskyGallery.photoUrl })
    .from(whiskyGallery)
    .where(like(whiskyGallery.photoUrl, "/objects/%"));
  targets.push({
    table: "whisky_gallery", column: "photo_url",
    rows: galleryRows.filter(r => r.url) as { id: string; url: string }[],
    update: async (id, newUrl) => { await db.update(whiskyGallery).set({ photoUrl: newUrl }).where(eq(whiskyGallery.id, id)); },
  });

  let total = { done: 0, skipped: 0, failed: 0, saved: 0 };
  for (const t of targets) {
    const r = await processTarget(objectStorage, t);
    total.done += r.done; total.skipped += r.skipped; total.failed += r.failed; total.saved += r.saved;
  }
  console.log(`\nTotal: done=${total.done} skipped=${total.skipped} failed=${total.failed} saved=${(total.saved / 1024).toFixed(1)} KB`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
