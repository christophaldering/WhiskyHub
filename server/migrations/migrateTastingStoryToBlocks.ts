import { storage } from "../storage";
import { buildInitialTastingStoryBlocks } from "../tastingStoryAutoFill";
import type { Tasting } from "@shared/schema";

type StoryBlock = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  hidden?: boolean;
  locked?: boolean;
  editedByHost?: boolean;
};

type SlideCacheManualImages = {
  whiskies?: Record<string, string>;
  tasters?: Record<string, string>;
  photos?: Record<string, string>;
};

type SlideCacheShape = {
  manualImages?: SlideCacheManualImages | null;
  photoSlideTexts?: Record<string, string> | null;
  manualStructure?: string[] | null;
  manualHiddenActs?: string[] | null;
  storyStructure?: string[] | null;
};

const VERSION_MIGRATION_MARKER = "[migr-tv]";

function blockId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}

function parseSlideCache(raw: string | null | undefined): SlideCacheShape | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as SlideCacheShape;
  } catch {
    return null;
  }
  return null;
}

function applyManualImagesToBlocks(blocks: StoryBlock[], cache: SlideCacheShape): StoryBlock[] {
  const manualImages = cache.manualImages ?? {};
  const whiskyImages = manualImages.whiskies ?? {};
  const tasterImages = manualImages.tasters ?? {};

  return blocks.map((block) => {
    if (block.type === "whisky-card-grid" && Object.keys(whiskyImages).length > 0) {
      const overridesRaw = block.payload.overrides;
      const overrides = (overridesRaw && typeof overridesRaw === "object" && !Array.isArray(overridesRaw))
        ? { ...(overridesRaw as Record<string, unknown>) }
        : {};
      for (const [whiskyId, url] of Object.entries(whiskyImages)) {
        if (typeof url !== "string" || url.length === 0) continue;
        const existingRaw = overrides[whiskyId];
        const existing = (existingRaw && typeof existingRaw === "object" && !Array.isArray(existingRaw))
          ? { ...(existingRaw as Record<string, unknown>) }
          : {};
        if (typeof existing.imageUrl !== "string" || existing.imageUrl.length === 0) {
          existing.imageUrl = url;
        }
        overrides[whiskyId] = existing;
      }
      return { ...block, payload: { ...block.payload, overrides } };
    }
    if (block.type === "taster-grid" && Object.keys(tasterImages).length > 0) {
      const overridesRaw = block.payload.overrides;
      const overrides = (overridesRaw && typeof overridesRaw === "object" && !Array.isArray(overridesRaw))
        ? { ...(overridesRaw as Record<string, unknown>) }
        : {};
      for (const [tasterId, url] of Object.entries(tasterImages)) {
        if (typeof url !== "string" || url.length === 0) continue;
        const existingRaw = overrides[tasterId];
        const existing = (existingRaw && typeof existingRaw === "object" && !Array.isArray(existingRaw))
          ? { ...(existingRaw as Record<string, unknown>) }
          : {};
        if (typeof existing.imageUrl !== "string" || existing.imageUrl.length === 0) {
          existing.imageUrl = url;
        }
        overrides[tasterId] = existing;
      }
      return { ...block, payload: { ...block.payload, overrides } };
    }
    return block;
  });
}

function buildPhotoCarryOverBlocks(cache: SlideCacheShape, manualPhotoUrls: Record<string, string>): StoryBlock[] {
  const photoTexts = cache.photoSlideTexts ?? {};
  const photoUrls = manualPhotoUrls;
  const photoIndices = Array.from(new Set([
    ...Object.keys(photoTexts),
    ...Object.keys(photoUrls),
  ])).sort((a, b) => Number(a) - Number(b));
  if (photoIndices.length === 0) return [];

  const items: Array<{ index: string; caption: string; imageUrl: string }> = [];
  for (const idx of photoIndices) {
    const caption = (typeof photoTexts[idx] === "string" ? photoTexts[idx] : "").trim();
    const imageUrl = (typeof photoUrls[idx] === "string" ? photoUrls[idx] : "").trim();
    if (caption.length === 0 && imageUrl.length === 0) continue;
    items.push({ index: idx, caption, imageUrl });
  }
  if (items.length === 0) return [];

  const bodyHtml = items
    .map((it) => {
      const text = it.caption.length > 0 ? it.caption : "";
      const img = it.imageUrl.length > 0
        ? `<p><img src="${it.imageUrl.replace(/"/g, "&quot;")}" alt="" style="max-width:100%;border-radius:4px;"/></p>`
        : "";
      return `${img}${text.length > 0 ? `<p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>` : ""}`;
    })
    .join("");

  return [
    {
      id: blockId("blk"),
      type: "text-section",
      payload: {
        eyebrow: "Aus dem Album",
        heading: "Eindruecke vom Abend",
        body: bodyHtml,
        alignment: "left",
        variant: "default",
      },
    },
  ];
}

export type MigrateOneResult = {
  status: "skipped-already-migrated" | "migrated" | "skipped-no-source" | "no-tasting";
  blockCount: number;
  hadSlideCache: boolean;
};

export async function migrateOne(tastingId: string, opts?: { force?: boolean }): Promise<MigrateOneResult> {
  const force = !!opts?.force;
  const tasting = await storage.getTasting(tastingId);
  if (!tasting) return { status: "no-tasting", blockCount: 0, hadSlideCache: false };

  const existingBlocks = Array.isArray(tasting.storyBlocks) ? (tasting.storyBlocks as StoryBlock[]) : [];
  if (!force && existingBlocks.length > 0) {
    return { status: "skipped-already-migrated", blockCount: existingBlocks.length, hadSlideCache: !!tasting.storySlidesCache };
  }

  const slideCache = parseSlideCache(tasting.storySlidesCache);
  const [whiskies, participantsRaw, ratings] = await Promise.all([
    storage.getWhiskiesForTasting(tastingId),
    storage.getTastingParticipants(tastingId),
    storage.getRatingsForTasting(tastingId),
  ]);
  const participants = participantsRaw
    .map((row) => row.participant)
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({ id: p.id, displayName: (p as { displayName?: string | null }).displayName ?? null, name: p.name ?? null }));

  const initialBlocks = buildInitialTastingStoryBlocks({
    tasting: tasting as Tasting,
    whiskies,
    participantCount: participantsRaw.length,
    participants,
    ratings,
  });

  let blocks: StoryBlock[] = initialBlocks;
  if (slideCache) {
    blocks = applyManualImagesToBlocks(blocks, slideCache);
    const photoBlocks = buildPhotoCarryOverBlocks(slideCache, slideCache.manualImages?.photos ?? {});
    if (photoBlocks.length > 0) {
      const finaleIndex = blocks.findIndex((b) => b.type === "finale-card");
      if (finaleIndex >= 0) {
        blocks = [...blocks.slice(0, finaleIndex), ...photoBlocks, ...blocks.slice(finaleIndex)];
      } else {
        blocks = [...blocks, ...photoBlocks];
      }
    }
  }

  await storage.updateTasting(tastingId, { storyBlocks: blocks });
  return {
    status: "migrated",
    blockCount: blocks.length,
    hadSlideCache: !!tasting.storySlidesCache,
  };
}

export type UnmigrateResult = { status: "ok" | "no-tasting"; previousCount: number };

export async function unmigrateOne(tastingId: string): Promise<UnmigrateResult> {
  const tasting = await storage.getTasting(tastingId);
  if (!tasting) return { status: "no-tasting", previousCount: 0 };
  const existingBlocks = Array.isArray(tasting.storyBlocks) ? (tasting.storyBlocks as StoryBlock[]) : [];
  await storage.updateTasting(tastingId, { storyBlocks: null });
  return { status: "ok", previousCount: existingBlocks.length };
}

export type MigrateVersionsResult = {
  status: "ok" | "no-tasting";
  imported: number;
  skippedExisting: number;
  skippedInvalid: number;
};

export async function migrateVersions(tastingId: string): Promise<MigrateVersionsResult> {
  const tasting = await storage.getTasting(tastingId);
  if (!tasting) return { status: "no-tasting", imported: 0, skippedExisting: 0, skippedInvalid: 0 };

  const oldVersions = await storage.listTastingStoryVersions(tastingId);
  if (oldVersions.length === 0) return { status: "ok", imported: 0, skippedExisting: 0, skippedInvalid: 0 };

  const existing = await storage.listStoryVersions("tasting", tastingId);
  const existingMigratedSourceIds = new Set<string>();
  for (const ev of existing) {
    if (typeof ev.name === "string" && ev.name.startsWith(VERSION_MIGRATION_MARKER)) {
      const sourceMatch = ev.name.match(/\[src:([^\]]+)\]/);
      if (sourceMatch) existingMigratedSourceIds.add(sourceMatch[1]);
    }
  }

  const [whiskies, participantsRaw, ratings] = await Promise.all([
    storage.getWhiskiesForTasting(tastingId),
    storage.getTastingParticipants(tastingId),
    storage.getRatingsForTasting(tastingId),
  ]);
  const participants = participantsRaw
    .map((row) => row.participant)
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({ id: p.id, displayName: (p as { displayName?: string | null }).displayName ?? null, name: p.name ?? null }));

  let imported = 0;
  let skippedExisting = 0;
  let skippedInvalid = 0;
  for (const v of oldVersions) {
    const legacyId = (typeof v.id === "string" && v.id.length > 0) ? v.id : "";
    if (legacyId.length === 0) {
      skippedInvalid += 1;
      continue;
    }
    if (existingMigratedSourceIds.has(legacyId)) {
      skippedExisting += 1;
      continue;
    }
    const baseName = (typeof v.name === "string" && v.name.length > 0) ? v.name : legacyId;
    const migrName = `${VERSION_MIGRATION_MARKER} [src:${legacyId}] ${baseName}`.slice(0, 200);
    const slideCache = parseSlideCache(v.slidesCache);
    if (!slideCache) {
      skippedInvalid += 1;
      continue;
    }
    const initialBlocks = buildInitialTastingStoryBlocks({
      tasting: tasting as Tasting,
      whiskies,
      participantCount: participantsRaw.length,
      participants,
      ratings,
    });
    let blocks: StoryBlock[] = initialBlocks;
    blocks = applyManualImagesToBlocks(blocks, slideCache);
    const photoBlocks = buildPhotoCarryOverBlocks(slideCache, slideCache.manualImages?.photos ?? {});
    if (photoBlocks.length > 0) {
      const finaleIndex = blocks.findIndex((b) => b.type === "finale-card");
      if (finaleIndex >= 0) {
        blocks = [...blocks.slice(0, finaleIndex), ...photoBlocks, ...blocks.slice(finaleIndex)];
      } else {
        blocks = [...blocks, ...photoBlocks];
      }
    }
    try {
      await storage.saveStoryVersion({
        sourceType: "tasting",
        sourceId: tastingId,
        blocksJson: blocks,
        isAuto: false,
        name: migrName,
        createdById: v.createdById ?? null,
      });
      existingMigratedSourceIds.add(legacyId);
      imported += 1;
    } catch (err) {
      console.warn("[migrate-versions] save failed for", v.id, err instanceof Error ? err.message : err);
      skippedInvalid += 1;
    }
  }
  return { status: "ok", imported, skippedExisting, skippedInvalid };
}

export async function migrateAll(opts?: { force?: boolean }): Promise<{
  total: number;
  migrated: number;
  skippedAlreadyMigrated: number;
  versionsImported: number;
}> {
  const tastings = await storage.getAllTastings();
  let migrated = 0;
  let skipped = 0;
  let versionsImported = 0;
  for (const t of tastings) {
    const r = await migrateOne(t.id, { force: opts?.force });
    if (r.status === "migrated") migrated += 1;
    if (r.status === "skipped-already-migrated") skipped += 1;
    const vr = await migrateVersions(t.id);
    versionsImported += vr.imported;
  }
  return {
    total: tastings.length,
    migrated,
    skippedAlreadyMigrated: skipped,
    versionsImported,
  };
}
