import { eq } from "drizzle-orm";
import type OpenAI from "openai";
import { db } from "../db";
import {
  distilleryProfiles, whiskyProfiles, tastingAutoHandouts, whiskies,
  type AutoHandoutChapter, type AutoHandoutSource, type AutoHandoutImage,
  type DistilleryProfile, type WhiskyProfile, type TastingAutoHandout,
} from "@shared/schema";
import { researchDistillery, researchWhisky } from "./research.js";
import { generateChaptersForDistillery, generateChaptersForWhisky } from "./condense.js";

export function distilleryNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function whiskyKey(name: string, distillery: string | null, whiskybaseId: string | null): string {
  if (whiskybaseId) return `wb:${whiskybaseId}`;
  return `${(distillery || "").toLowerCase().trim()}|${name.toLowerCase().trim()}`;
}

export async function getDistilleryProfile(name: string): Promise<DistilleryProfile | null> {
  const key = distilleryNameKey(name);
  const rows = await db.select().from(distilleryProfiles).where(eq(distilleryProfiles.nameKey, key)).limit(1);
  return rows[0] || null;
}

export async function getWhiskyProfile(name: string, distillery: string | null, whiskybaseId: string | null): Promise<WhiskyProfile | null> {
  const key = whiskyKey(name, distillery, whiskybaseId);
  const rows = await db.select().from(whiskyProfiles).where(eq(whiskyProfiles.whiskyKey, key)).limit(1);
  return rows[0] || null;
}

export async function ensureDistilleryProfile(
  client: OpenAI,
  name: string,
  opts: { language: string; tone: string; lengthPref: string; forceRefresh?: boolean },
): Promise<DistilleryProfile> {
  const existing = await getDistilleryProfile(name);
  // Cache hit only when stored profile already matches the requested style.
  // Tone/language/lengthPref affect the AI prompts, so a cache reuse with a
  // different style would silently ignore the host's settings. Falling
  // through to regeneration keeps tone/language/length authoritative while
  // the underlying research sources are still reused (no extra web fetch).
  const styleMatches = existing
    && existing.language === opts.language
    && existing.tone === opts.tone
    && existing.lengthPref === opts.lengthPref;
  if (existing && styleMatches && !opts.forceRefresh) return existing;

  // Reuse cached research corpus when available and we are only re-styling.
  // researchDistillery is the costly path (multiple HTTP fetches), so when an
  // existing profile already has sources/images and this is not an explicit
  // force-refresh, skip the network roundtrip entirely.
  const reuseSources = existing && (existing.sources || []).length > 0 && !opts.forceRefresh;
  const research = reuseSources
    ? { sources: (existing!.sources || []).map((s) => ({ ...s, text: s.snippet || "" })), images: existing!.images || [] }
    : await researchDistillery(name);
  const { chapters, sources } = await generateChaptersForDistillery(client, {
    distillery: name,
    sources: research.sources,
    language: opts.language,
    tone: opts.tone,
    lengthPref: opts.lengthPref,
  });
  const key = distilleryNameKey(name);
  const now = new Date();
  // Preserve existing displayName when the input is just a normalized key
  // (lowercased, no caps). Refresh-distillery uses nameKey as input, so we
  // must not overwrite a properly-cased displayName with its lowercase form.
  const preferredDisplayName = existing && name === existing.nameKey ? existing.displayName : name;
  if (existing) {
    const [updated] = await db.update(distilleryProfiles)
      .set({
        displayName: preferredDisplayName,
        language: opts.language,
        tone: opts.tone,
        lengthPref: opts.lengthPref,
        chapters,
        sources,
        images: research.images,
        refreshedAt: now,
      })
      .where(eq(distilleryProfiles.nameKey, key))
      .returning();
    return updated;
  }
  const [created] = await db.insert(distilleryProfiles).values({
    nameKey: key,
    displayName: preferredDisplayName,
    language: opts.language,
    tone: opts.tone,
    lengthPref: opts.lengthPref,
    chapters,
    sources,
    images: research.images,
  }).returning();
  return created;
}

export async function ensureWhiskyProfile(
  client: OpenAI,
  whisky: { name: string; distillery: string | null; whiskybaseId: string | null },
  opts: { language: string; tone: string; lengthPref: string; forceRefresh?: boolean },
): Promise<WhiskyProfile> {
  const existing = await getWhiskyProfile(whisky.name, whisky.distillery, whisky.whiskybaseId);
  const styleMatches = existing
    && existing.language === opts.language
    && existing.tone === opts.tone
    && existing.lengthPref === opts.lengthPref;
  if (existing && styleMatches && !opts.forceRefresh) return existing;

  const reuseSources = existing && (existing.sources || []).length > 0 && !opts.forceRefresh;
  const research = reuseSources
    ? { sources: (existing!.sources || []).map((s) => ({ ...s, text: s.snippet || "" })) }
    : await researchWhisky(whisky.name, whisky.distillery, whisky.whiskybaseId);
  const { chapters, sources } = await generateChaptersForWhisky(client, {
    whisky: whisky.name,
    distillery: whisky.distillery,
    sources: research.sources,
    language: opts.language,
    tone: opts.tone,
    lengthPref: opts.lengthPref,
  });
  const key = whiskyKey(whisky.name, whisky.distillery, whisky.whiskybaseId);
  if (existing) {
    const [updated] = await db.update(whiskyProfiles)
      .set({
        name: whisky.name,
        distillery: whisky.distillery,
        whiskybaseId: whisky.whiskybaseId,
        language: opts.language,
        tone: opts.tone,
        lengthPref: opts.lengthPref,
        chapters,
        sources,
        generatedAt: new Date(),
      })
      .where(eq(whiskyProfiles.whiskyKey, key))
      .returning();
    return updated;
  }
  const [created] = await db.insert(whiskyProfiles).values({
    whiskyKey: key,
    name: whisky.name,
    distillery: whisky.distillery,
    whiskybaseId: whisky.whiskybaseId,
    language: opts.language,
    tone: opts.tone,
    lengthPref: opts.lengthPref,
    chapters,
    sources,
  }).returning();
  return created;
}

export async function regenerateDistilleryChapter(
  client: OpenAI,
  distillery: string,
  chapterId: string,
  opts: { language: string; tone: string; lengthPref: string },
): Promise<DistilleryProfile> {
  const profile = await getDistilleryProfile(distillery);
  if (!profile) {
    return ensureDistilleryProfile(client, distillery, opts);
  }
  // Re-fetch sources only if missing
  let sourcesPersisted: AutoHandoutSource[] = profile.sources || [];
  let images: AutoHandoutImage[] = profile.images || [];
  let sourcesForAi: Array<AutoHandoutSource & { text: string }>;
  if (sourcesPersisted.length === 0) {
    const research = await researchDistillery(distillery);
    sourcesPersisted = research.sources.map((s) => ({ url: s.url, title: s.title, snippet: s.snippet, source: s.source }));
    images = research.images;
    sourcesForAi = research.sources;
  } else {
    sourcesForAi = sourcesPersisted.map((s) => ({ ...s, text: s.snippet || "" }));
  }
  const { chapters: newChapters } = await generateChaptersForDistillery(client, {
    distillery,
    sources: sourcesForAi,
    language: opts.language,
    tone: opts.tone,
    lengthPref: opts.lengthPref,
    chapterIds: [chapterId],
  });
  const newCh = newChapters[0];
  if (!newCh) return profile;
  const merged: AutoHandoutChapter[] = (profile.chapters || []).filter((c) => c.id !== chapterId);
  merged.push(newCh);
  const [updated] = await db.update(distilleryProfiles)
    .set({ chapters: merged, sources: sourcesPersisted, images, refreshedAt: new Date() })
    .where(eq(distilleryProfiles.id, profile.id))
    .returning();
  return updated;
}

export async function regenerateWhiskyChapter(
  client: OpenAI,
  whisky: { name: string; distillery: string | null; whiskybaseId: string | null },
  chapterId: string,
  opts: { language: string; tone: string; lengthPref: string },
): Promise<WhiskyProfile> {
  const profile = await getWhiskyProfile(whisky.name, whisky.distillery, whisky.whiskybaseId);
  if (!profile) {
    return ensureWhiskyProfile(client, whisky, opts);
  }
  let sourcesPersisted: AutoHandoutSource[] = profile.sources || [];
  let sourcesForAi: Array<AutoHandoutSource & { text: string }>;
  if (sourcesPersisted.length === 0) {
    const research = await researchWhisky(whisky.name, whisky.distillery, whisky.whiskybaseId);
    sourcesPersisted = research.sources.map((s) => ({ url: s.url, title: s.title, snippet: s.snippet, source: s.source }));
    sourcesForAi = research.sources;
  } else {
    sourcesForAi = sourcesPersisted.map((s) => ({ ...s, text: s.snippet || "" }));
  }
  const { chapters: newChapters } = await generateChaptersForWhisky(client, {
    whisky: whisky.name,
    distillery: whisky.distillery,
    sources: sourcesForAi,
    language: opts.language,
    tone: opts.tone,
    lengthPref: opts.lengthPref,
    chapterIds: [chapterId],
  });
  const newCh = newChapters[0];
  if (!newCh) return profile;
  const merged: AutoHandoutChapter[] = (profile.chapters || []).filter((c) => c.id !== chapterId);
  merged.push(newCh);
  const [updated] = await db.update(whiskyProfiles)
    .set({ chapters: merged, sources: sourcesPersisted, generatedAt: new Date() })
    .where(eq(whiskyProfiles.id, profile.id))
    .returning();
  return updated;
}

export async function getOrCreateTastingHandout(tastingId: string): Promise<TastingAutoHandout> {
  const rows = await db.select().from(tastingAutoHandouts).where(eq(tastingAutoHandouts.tastingId, tastingId)).limit(1);
  if (rows[0]) return rows[0];
  const [created] = await db.insert(tastingAutoHandouts).values({ tastingId }).returning();
  return created;
}

export async function updateTastingHandout(
  tastingId: string,
  patch: Partial<Omit<TastingAutoHandout, "id" | "tastingId">>,
): Promise<TastingAutoHandout> {
  await getOrCreateTastingHandout(tastingId);
  const [updated] = await db.update(tastingAutoHandouts)
    .set(patch)
    .where(eq(tastingAutoHandouts.tastingId, tastingId))
    .returning();
  return updated;
}

export interface AssembledChapterRef {
  kind: "distillery" | "whisky";
  subjectKey: string;
  subjectName: string;
  chapter: AutoHandoutChapter;
  sources: AutoHandoutSource[];
  customContent?: string;
  enabled: boolean;
}

export async function assembleHandout(tastingId: string): Promise<{
  binding: TastingAutoHandout;
  distilleries: Array<{ profile: DistilleryProfile; selectedImage: string | null }>;
  whiskyProfilesArr: WhiskyProfile[];
  chapterRefs: AssembledChapterRef[];
}> {
  const binding = await getOrCreateTastingHandout(tastingId);
  const tastingWhiskies = await db.select().from(whiskies).where(eq(whiskies.tastingId, tastingId));
  const distilleryNames = Array.from(new Set(tastingWhiskies.map((w) => w.distillery).filter(Boolean) as string[]));

  const distProfiles: DistilleryProfile[] = [];
  for (const d of distilleryNames) {
    const p = await getDistilleryProfile(d);
    if (p) distProfiles.push(p);
  }
  const wProfiles: WhiskyProfile[] = [];
  for (const w of tastingWhiskies) {
    const p = await getWhiskyProfile(w.name, w.distillery, w.whiskybaseId);
    if (p) wProfiles.push(p);
  }

  const sel = binding.selection || {};
  const distSel = sel.distilleries || {};
  const whiskySel = sel.whiskies || {};

  const refs: AssembledChapterRef[] = [];
  for (const p of distProfiles) {
    for (const ch of (p.chapters || [])) {
      const s = distSel[p.nameKey]?.[ch.id] || { enabled: true };
      const enabled = s.enabled !== false;
      refs.push({
        kind: "distillery",
        subjectKey: p.nameKey,
        subjectName: p.displayName,
        chapter: ch,
        sources: p.sources || [],
        customContent: s.customContent,
        enabled,
      });
    }
  }
  for (const p of wProfiles) {
    for (const ch of (p.chapters || [])) {
      const s = whiskySel[p.whiskyKey]?.[ch.id] || { enabled: true };
      const enabled = s.enabled !== false;
      refs.push({
        kind: "whisky",
        subjectKey: p.whiskyKey,
        subjectName: p.distillery ? `${p.distillery} — ${p.name}` : p.name,
        chapter: ch,
        sources: p.sources || [],
        customContent: s.customContent,
        enabled,
      });
    }
  }

  // Apply chapter order if set
  if (Array.isArray(binding.chapterOrder) && binding.chapterOrder.length > 0) {
    const order = binding.chapterOrder;
    refs.sort((a, b) => {
      const ka = `${a.kind}:${a.subjectKey}:${a.chapter.id}`;
      const kb = `${b.kind}:${b.subjectKey}:${b.chapter.id}`;
      const ia = order.indexOf(ka);
      const ib = order.indexOf(kb);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }

  const selectedImagesByKey = new Map<string, string>();
  for (const img of (binding.selectedImages || [])) {
    selectedImagesByKey.set(img.subjectKey, img.url);
  }
  const distilleries = distProfiles.map((p) => ({
    profile: p,
    selectedImage: selectedImagesByKey.get(p.nameKey) || null,
  }));

  return { binding, distilleries, whiskyProfilesArr: wProfiles, chapterRefs: refs };
}
