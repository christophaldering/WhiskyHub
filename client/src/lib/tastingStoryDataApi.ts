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

export async function regenerateTastingStoryBlocks(
  tastingId: string,
  blocks: Array<{ id: string; type: string; payload: Record<string, unknown>; hidden?: boolean; locked?: boolean; editedByHost?: boolean }>,
  scope: RegenerateScope,
  blockId?: string,
): Promise<RegenerateBlocksResponse> {
  const res = await fetch(`/api/tasting-stories/${encodeURIComponent(tastingId)}/regenerate-blocks`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify({ blocks, scope, blockId }),
  });
  return readJson<RegenerateBlocksResponse>(res, "KI-Regenerierung fehlgeschlagen");
}
