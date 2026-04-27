import { pidHeaders } from "@/lib/api";
import { TastingStoryApiError } from "@/lib/tastingStoryApi";

export type TastingStoryDataMeta = {
  id: string;
  title: string;
  hostId: string | null;
  hostName: string | null;
  date: string | null;
  location: string | null;
  coverImageUrl: string | null;
  blindMode: boolean;
};

export type TastingStoryWhisky = {
  id: string;
  name: string;
  distillery: string | null;
  region: string | null;
  country: string | null;
  age: number | null;
  abv: number | null;
  caskType: string | null;
  imageUrl: string | null;
  handoutExcerpt: string | null;
  hostSummary: string | null;
  notes: string | null;
  avgScore: number | null;
  avgNose: number | null;
  avgTaste: number | null;
  avgFinish: number | null;
  voters: number;
  position: number;
};

export type TastingStoryParticipant = {
  id: string;
  name: string;
  initials: string;
  isHost: boolean;
  ratingCount: number;
  avgGiven: number | null;
  topPickWhiskyId: string | null;
};

export type TastingStoryRankingEntry = {
  position: number;
  whiskyId: string;
  name: string;
  distillery: string | null;
  imageUrl: string | null;
  avgScore: number | null;
  voters: number;
};

export type TastingStoryBlindEntry = {
  whiskyId: string;
  whiskyName: string;
  actualAbv: number | null;
  closestParticipantId: string | null;
  closestDeltaAbv: number | null;
  guesses: Array<{
    participantId: string;
    participantName: string;
    guessAbv: number | null;
    deltaAbv: number | null;
  }>;
};

export type TastingStoryDataResponse = {
  meta: TastingStoryDataMeta;
  whiskies: TastingStoryWhisky[];
  participants: TastingStoryParticipant[];
  ranking: TastingStoryRankingEntry[];
  winner: TastingStoryRankingEntry | null;
  blindResults: TastingStoryBlindEntry[] | null;
  eventPhotos: Array<{ id: string; url: string; caption: string | null }>;
};

async function readJson<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    let msg = fallback;
    try {
      const data = await res.json();
      if (data && typeof data.message === "string") msg = data.message;
    } catch {
      void 0;
    }
    throw new TastingStoryApiError(res.status, msg);
  }
  return (await res.json()) as T;
}

export async function getTastingStoryData(tastingId: string): Promise<TastingStoryDataResponse> {
  const res = await fetch(`/api/tasting-stories/${encodeURIComponent(tastingId)}/data`, {
    credentials: "include",
    headers: pidHeaders(),
  });
  return readJson<TastingStoryDataResponse>(res, "Tasting-Daten konnten nicht geladen werden");
}

export async function getPublicTastingStoryData(tastingId: string): Promise<TastingStoryDataResponse> {
  const res = await fetch(`/api/public/tasting-stories/${encodeURIComponent(tastingId)}/data`, {
    credentials: "include",
    headers: pidHeaders(),
  });
  return readJson<TastingStoryDataResponse>(res, "Tasting-Daten konnten nicht geladen werden");
}

export type RegenerateScope = "all" | "single";

export type RegenerateBlocksResponse = {
  blocks: Array<{ id: string; type: string; payload: Record<string, unknown>; hidden?: boolean; locked?: boolean; editedByHost?: boolean }>;
  regenerated: string[];
  skipped: string[];
};

export type RegenLengthLevel = "compact" | "default" | "expanded" | "epic";

export type RegenerateExtras = {
  customInstructions?: string;
  stylePresets?: string[];
  lengthLevel?: RegenLengthLevel;
};

export async function regenerateTastingStoryBlocks(
  tastingId: string,
  blocks: Array<{ id: string; type: string; payload: Record<string, unknown>; hidden?: boolean; locked?: boolean; editedByHost?: boolean }>,
  scope: RegenerateScope,
  blockId?: string,
  extras?: RegenerateExtras,
): Promise<RegenerateBlocksResponse> {
  const body: Record<string, unknown> = { blocks, scope, blockId };
  const ci = extras?.customInstructions?.trim();
  if (ci) body.customInstructions = ci;
  if (extras?.stylePresets && extras.stylePresets.length > 0) body.stylePresets = extras.stylePresets;
  if (extras?.lengthLevel) body.lengthLevel = extras.lengthLevel;
  const res = await fetch(`/api/tasting-stories/${encodeURIComponent(tastingId)}/regenerate-blocks`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify(body),
  });
  return readJson<RegenerateBlocksResponse>(res, "KI-Regenerierung fehlgeschlagen");
}

export type TastingStoryImageItem = {
  id: string;
  tastingId: string;
  url: string;
  name: string | null;
  caption: string | null;
  altText: string | null;
  moodDescription: string | null;
  categories: string[];
  participantIds: string[];
  whiskyIds: string[];
  uploadedByParticipantId: string | null;
  createdAt: string;
};

export type ImagePoolMetadataPatch = {
  name?: string | null;
  caption?: string | null;
  altText?: string | null;
  moodDescription?: string | null;
  categories?: string[];
  participantIds?: string[];
  whiskyIds?: string[];
};

export async function listTastingStoryImagePool(tastingId: string): Promise<TastingStoryImageItem[]> {
  const res = await fetch(`/api/tasting-stories/${encodeURIComponent(tastingId)}/image-pool`, {
    credentials: "include",
    headers: pidHeaders(),
  });
  const data = await readJson<{ items: TastingStoryImageItem[] }>(res, "Bild-Pool konnte nicht geladen werden");
  return data.items;
}

export async function createTastingStoryImagePoolEntry(
  tastingId: string,
  payload: { url: string } & ImagePoolMetadataPatch,
): Promise<TastingStoryImageItem> {
  const res = await fetch(`/api/tasting-stories/${encodeURIComponent(tastingId)}/image-pool`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await readJson<{ item: TastingStoryImageItem }>(res, "Bild konnte nicht angelegt werden");
  return data.item;
}

export async function updateTastingStoryImagePoolEntry(
  tastingId: string,
  imageId: string,
  patch: ImagePoolMetadataPatch,
): Promise<TastingStoryImageItem> {
  const res = await fetch(`/api/tasting-stories/${encodeURIComponent(tastingId)}/image-pool/${encodeURIComponent(imageId)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify(patch),
  });
  const data = await readJson<{ item: TastingStoryImageItem }>(res, "Bild konnte nicht aktualisiert werden");
  return data.item;
}

export async function deleteTastingStoryImagePoolEntry(tastingId: string, imageId: string): Promise<void> {
  const res = await fetch(`/api/tasting-stories/${encodeURIComponent(tastingId)}/image-pool/${encodeURIComponent(imageId)}`, {
    method: "DELETE",
    credentials: "include",
    headers: pidHeaders(),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Bild konnte nicht gelöscht werden");
  }
}

export type ImagePoolDescribeFields = "name" | "caption" | "altText" | "moodDescription";

export type ImagePoolAiDescribeResult = {
  item: TastingStoryImageItem;
  applied: Partial<Record<ImagePoolDescribeFields, string>>;
  suggestedParticipantIds: string[];
  suggestedWhiskyIds: string[];
  dryRun?: boolean;
};

export async function aiDescribeTastingStoryImage(
  tastingId: string,
  imageId: string,
  options?: { fields?: ImagePoolDescribeFields[]; language?: "de" | "en"; dryRun?: boolean },
): Promise<ImagePoolAiDescribeResult> {
  const res = await fetch(
    `/api/tasting-stories/${encodeURIComponent(tastingId)}/image-pool/${encodeURIComponent(imageId)}/ai-describe`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...pidHeaders() },
      body: JSON.stringify(options ?? {}),
    },
  );
  return readJson<ImagePoolAiDescribeResult>(res, "KI-Beschreibung fehlgeschlagen");
}

export type ImagePoolBatchPreview = {
  id: string;
  current: {
    name: string | null;
    caption: string | null;
    altText: string | null;
    moodDescription: string | null;
    url: string;
    participantIds: string[];
    whiskyIds: string[];
  };
  suggested: Partial<Record<ImagePoolDescribeFields, string>>;
  suggestedParticipantIds: string[];
  suggestedWhiskyIds: string[];
};

export async function aiDescribeTastingStoryImagesBatch(
  tastingId: string,
  imageIds: string[],
  options?: { fields?: ImagePoolDescribeFields[]; language?: "de" | "en"; onlyMissing?: boolean; dryRun?: boolean },
): Promise<{
  items: TastingStoryImageItem[];
  failedIds: string[];
  skippedIds: string[];
  previews?: ImagePoolBatchPreview[];
  dryRun?: boolean;
}> {
  const res = await fetch(`/api/tasting-stories/${encodeURIComponent(tastingId)}/image-pool/ai-describe-batch`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify({ imageIds, ...(options ?? {}) }),
  });
  const data = await readJson<{
    items?: TastingStoryImageItem[];
    failedIds: string[];
    skippedIds: string[];
    previews?: ImagePoolBatchPreview[];
    dryRun?: boolean;
  }>(res, "Batch-Beschreibung fehlgeschlagen");
  return { items: data.items ?? [], failedIds: data.failedIds, skippedIds: data.skippedIds, previews: data.previews, dryRun: data.dryRun };
}

export type ImagePoolBackfillItem = {
  url: string;
  name?: string | null;
  caption?: string | null;
  altText?: string | null;
  categories?: string[];
};

export async function backfillTastingStoryImagePool(
  tastingId: string,
  items: ImagePoolBackfillItem[],
): Promise<{ created: TastingStoryImageItem[]; createdCount: number }> {
  const res = await fetch(`/api/tasting-stories/${encodeURIComponent(tastingId)}/image-pool/backfill`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify({ items }),
  });
  return readJson<{ created: TastingStoryImageItem[]; createdCount: number }>(res, "Backfill fehlgeschlagen");
}
