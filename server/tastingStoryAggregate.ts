import { storage } from "./storage";
import type { Rating, Tasting, Whisky, Participant, TastingEventPhoto } from "@shared/schema";

export type AggregatedWhisky = {
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

export type AggregatedParticipant = {
  id: string;
  name: string;
  initials: string;
  isHost: boolean;
  ratingCount: number;
  avgGiven: number | null;
  topPickWhiskyId: string | null;
};

export type AggregatedRankingEntry = {
  position: number;
  whiskyId: string;
  name: string;
  distillery: string | null;
  imageUrl: string | null;
  avgScore: number | null;
  voters: number;
};

export type AggregatedBlindEntry = {
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

export type AggregatedTastingMeta = {
  id: string;
  title: string;
  hostId: string | null;
  hostName: string | null;
  date: string | null;
  location: string | null;
  coverImageUrl: string | null;
  blindMode: boolean;
};

export type AggregatedTastingStoryData = {
  meta: AggregatedTastingMeta;
  whiskies: AggregatedWhisky[];
  participants: AggregatedParticipant[];
  ranking: AggregatedRankingEntry[];
  winner: AggregatedRankingEntry | null;
  blindResults: AggregatedBlindEntry[] | null;
  eventPhotos: Array<{ id: string; url: string; caption: string | null }>;
};

function average(values: number[]): number | null {
  const filtered = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (filtered.length === 0) return null;
  const sum = filtered.reduce((acc, v) => acc + v, 0);
  return sum / filtered.length;
}

function makeInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "GA";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const single = parts[0];
    return (single.slice(0, 2) || "GA").toUpperCase();
  }
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  const letters = `${first}${last}`.trim();
  return (letters || "GA").toUpperCase();
}

function whiskyExcerpt(w: Whisky): string | null {
  const candidates = [w.handoutDescription, w.hostSummary, w.aiInsightsCache, w.notes];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const cleaned = candidate.replace(/\s+/g, " ").trim();
      if (cleaned.length > 0) {
        if (cleaned.length <= 220) return cleaned;
        return `${cleaned.slice(0, 217).trimEnd()}…`;
      }
    }
  }
  return null;
}

function participantDisplay(p: Pick<Participant, "id" | "name"> & { displayName?: string | null }): string {
  const display = (p.displayName ?? "").trim();
  if (display.length > 0) return display;
  const name = (p.name ?? "").trim();
  return name.length > 0 ? name : "Gast";
}

export async function aggregateTastingStoryData(tastingId: string): Promise<AggregatedTastingStoryData | null> {
  const tasting: Tasting | undefined = await storage.getTasting(tastingId);
  if (!tasting) return null;

  const [whiskies, participantsRaw, ratings, eventPhotos] = await Promise.all([
    storage.getWhiskiesForTasting(tastingId),
    storage.getTastingParticipants(tastingId),
    storage.getRatingsForTasting(tastingId),
    storage.getTastingEventPhotos(tastingId),
  ]);

  const ratingsByWhisky = new Map<string, Rating[]>();
  for (const r of ratings) {
    if (!r.whiskyId) continue;
    const list = ratingsByWhisky.get(r.whiskyId) ?? [];
    list.push(r);
    ratingsByWhisky.set(r.whiskyId, list);
  }

  const ratingsByParticipant = new Map<string, Rating[]>();
  for (const r of ratings) {
    if (!r.participantId) continue;
    const list = ratingsByParticipant.get(r.participantId) ?? [];
    list.push(r);
    ratingsByParticipant.set(r.participantId, list);
  }

  const aggWhiskies: AggregatedWhisky[] = whiskies.map((w, idx) => {
    const wr = ratingsByWhisky.get(w.id) ?? [];
    const overallScores = wr
      .map((r) => (typeof r.overall === "number" ? r.overall : null))
      .filter((v): v is number => v !== null);
    return {
      id: w.id,
      name: w.name && w.name.trim().length > 0 ? w.name : `Whisky ${idx + 1}`,
      distillery: w.distillery ?? null,
      region: w.region ?? null,
      country: w.country ?? null,
      age: typeof w.age === "number" ? w.age : null,
      abv: typeof w.abv === "number" ? w.abv : null,
      caskType: w.caskType ?? null,
      imageUrl: w.imageUrl ?? null,
      handoutExcerpt: whiskyExcerpt(w),
      hostSummary: w.hostSummary ?? null,
      notes: w.notes ?? null,
      avgScore: average(overallScores),
      avgNose: average(wr.map((r) => (typeof r.nose === "number" ? r.nose : null)).filter((v): v is number => v !== null)),
      avgTaste: average(wr.map((r) => (typeof r.taste === "number" ? r.taste : null)).filter((v): v is number => v !== null)),
      avgFinish: average(wr.map((r) => (typeof r.finish === "number" ? r.finish : null)).filter((v): v is number => v !== null)),
      voters: wr.length,
      position: idx + 1,
    };
  });

  const ranking: AggregatedRankingEntry[] = aggWhiskies
    .map((w) => ({
      position: 0,
      whiskyId: w.id,
      name: w.name,
      distillery: w.distillery,
      imageUrl: w.imageUrl,
      avgScore: w.avgScore,
      voters: w.voters,
    }))
    .sort((a, b) => {
      const av = a.avgScore ?? -1;
      const bv = b.avgScore ?? -1;
      if (bv !== av) return bv - av;
      return 0;
    })
    .map((entry, idx) => ({ ...entry, position: idx + 1 }));

  const winner: AggregatedRankingEntry | null =
    ranking.length > 0 && ranking[0].avgScore !== null ? ranking[0] : null;

  const aggParticipants: AggregatedParticipant[] = participantsRaw.map((row) => {
    const p = row.participant;
    const safe = p ?? ({ id: row.participantId, name: "Gast" } as Pick<Participant, "id" | "name"> & { displayName?: string | null });
    const display = participantDisplay(safe);
    const personalRatings = ratingsByParticipant.get(safe.id) ?? [];
    const givenScores = personalRatings
      .map((r) => (typeof r.overall === "number" ? r.overall : null))
      .filter((v): v is number => v !== null);
    let topPickWhiskyId: string | null = null;
    if (personalRatings.length > 0) {
      const sorted = [...personalRatings].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
      topPickWhiskyId = sorted[0]?.whiskyId ?? null;
    }
    return {
      id: safe.id,
      name: display,
      initials: makeInitials(display),
      isHost: tasting.hostId === safe.id,
      ratingCount: row.ratingCount ?? personalRatings.length,
      avgGiven: average(givenScores),
      topPickWhiskyId,
    };
  });

  let blindResults: AggregatedBlindEntry[] | null = null;
  if (tasting.blindMode) {
    blindResults = aggWhiskies.map((w) => {
      const wr = ratingsByWhisky.get(w.id) ?? [];
      const guesses = wr.map((r) => {
        const guess = typeof r.guessAbv === "number" ? r.guessAbv : null;
        const delta =
          guess !== null && typeof w.abv === "number" ? Math.abs(guess - w.abv) : null;
        const participantInfo = aggParticipants.find((p) => p.id === r.participantId);
        return {
          participantId: r.participantId,
          participantName: participantInfo?.name ?? "Gast",
          guessAbv: guess,
          deltaAbv: delta,
        };
      });
      const validGuesses = guesses.filter(
        (g): g is { participantId: string; participantName: string; guessAbv: number; deltaAbv: number } =>
          g.guessAbv !== null && g.deltaAbv !== null,
      );
      const closest = validGuesses.length > 0
        ? validGuesses.reduce((best, cur) => (cur.deltaAbv < best.deltaAbv ? cur : best), validGuesses[0])
        : null;
      return {
        whiskyId: w.id,
        whiskyName: w.name,
        actualAbv: w.abv,
        closestParticipantId: closest?.participantId ?? null,
        closestDeltaAbv: closest?.deltaAbv ?? null,
        guesses,
      };
    });
  }

  const meta: AggregatedTastingMeta = {
    id: tasting.id,
    title: tasting.title,
    hostId: tasting.hostId ?? null,
    hostName: (tasting as { hostName?: string | null }).hostName ?? null,
    date: tasting.date ?? null,
    location: tasting.location ?? null,
    coverImageUrl: tasting.coverImageUrl ?? null,
    blindMode: !!tasting.blindMode,
  };

  const photos = (eventPhotos as TastingEventPhoto[]).map((p) => ({
    id: p.id,
    url: p.photoUrl ?? "",
    caption: p.caption ?? null,
  })).filter((p) => p.url.length > 0);

  return {
    meta,
    whiskies: aggWhiskies,
    participants: aggParticipants,
    ranking,
    winner,
    blindResults,
    eventPhotos: photos,
  };
}
