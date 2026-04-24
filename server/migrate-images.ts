import { ObjectStorageService } from "./replit_integrations/object_storage";
import { db } from "./db";
import { whiskies, profiles } from "@shared/schema";
import { like, isNotNull } from "drizzle-orm";
import fs from "fs";
import path from "path";
import mime from "mime-types";

const uploadsDir = path.join(process.cwd(), "uploads");

async function uploadLocalFileToObjectStorage(
  objectStorage: ObjectStorageService,
  localPath: string
): Promise<string | null> {
  try {
    if (!fs.existsSync(localPath)) return null;
    const buffer = fs.readFileSync(localPath);
    const ext = path.extname(localPath).toLowerCase();
    const mimeType = mime.lookup(ext) || "application/octet-stream";
    const uploadURL = await objectStorage.getObjectEntityUploadURL();
    const resp = await fetch(uploadURL, {
      method: "PUT",
      body: buffer,
      headers: { "Content-Type": mimeType },
    });
    if (!resp.ok) {
      console.error(`Failed to upload ${localPath}: ${resp.status}`);
      return null;
    }
    return objectStorage.normalizeObjectEntityPath(uploadURL);
  } catch (e) {
    console.error(`Error uploading ${localPath}:`, e);
    return null;
  }
}

async function migrateImages() {
  const objectStorage = new ObjectStorageService();
  console.log("Starting image migration to Object Storage...");

  const whiskiesWithImages = await db
    .select()
    .from(whiskies)
    .where(like(whiskies.imageUrl, "/uploads/%"));

  console.log(`Found ${whiskiesWithImages.length} whiskies with local images`);

  let migrated = 0;
  let failed = 0;

  for (const w of whiskiesWithImages) {
    const localPath = path.join(process.cwd(), w.imageUrl!);
    const objectPath = await uploadLocalFileToObjectStorage(objectStorage, localPath);
    if (objectPath) {
      await db
        .update(whiskies)
        .set({ imageUrl: objectPath })
        .where(like(whiskies.id, w.id));
      migrated++;
      console.log(`  ✓ Whisky "${w.name}" (${w.id}): ${w.imageUrl} → ${objectPath}`);
    } else {
      failed++;
      console.log(`  ✗ Whisky "${w.name}" (${w.id}): failed to migrate ${w.imageUrl}`);
    }
  }

  const profilesWithPhotos = await db
    .select()
    .from(profiles)
    .where(like(profiles.photoUrl, "/uploads/%"));

  console.log(`Found ${profilesWithPhotos.length} profiles with local photos`);

  for (const p of profilesWithPhotos) {
    const localPath = path.join(uploadsDir, path.basename(p.photoUrl!));
    const objectPath = await uploadLocalFileToObjectStorage(objectStorage, localPath);
    if (objectPath) {
      await db
        .update(profiles)
        .set({ photoUrl: objectPath })
        .where(like(profiles.id, p.id));
      migrated++;
      console.log(`  ✓ Profile ${p.participantId}: ${p.photoUrl} → ${objectPath}`);
    } else {
      failed++;
      console.log(`  ✗ Profile ${p.participantId}: failed to migrate ${p.photoUrl}`);
    }
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${failed} failed`);
}

migrateImages()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  });
