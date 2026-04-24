import { db } from "./db";
import {
  tastings, whiskies, ratings, tastingParticipants, participants,
  historicalTastings, historicalTastingEntries,
  type Tasting, type Whisky, type Rating,
  type InsertHistoricalTasting, type InsertHistoricalTastingEntry,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { normalizeKey, normalizeText, parseAge, parseAbv, parseSmoky } from "./historical-import";
import { clampNormalized } from "@shared/score-utils";

export interface ArchiveSnapshotResult {
  historicalTastingId: string;
  entriesCreated: number;
  alreadyExists: boolean;
}

export async function createArchiveSnapshot(
  tasting: Tasting,
  tastingWhiskies: Whisky[],
  tastingRatings: Rating[],
): Promise<ArchiveSnapshotResult> {
  const sourceKey = `live-tasting-${tasting.id}`;

  const [existing] = await db
    .select()
    .from(historicalTastings)
    .where(eq(historicalTastings.sourceKey, sourceKey))
    .limit(1);

  if (existing) {
    return {
      historicalTastingId: existing.id,
      entriesCreated: 0,
      alreadyExists: true,
    };
  }

  const tps = await db
    .select({ participantId: tastingParticipants.participantId })
    .from(tastingParticipants)
    .where(eq(tastingParticipants.tastingId, tasting.id));

  let communityId: string | null = null;
  if (tps.length > 0) {
    const host = await db
      .select()
      .from(participants)
      .where(eq(participants.id, tasting.hostId))
      .limit(1);
    if (host.length > 0) {
      const { communities: commTable, communityMemberships } = await import("@shared/schema");
      const hostCommunities = await db
        .select({ communityId: communityMemberships.communityId })
        .from(communityMemberships)
        .where(eq(communityMemberships.participantId, tasting.hostId))
        .limit(1);
      if (hostCommunities.length > 0) {
        communityId = hostCommunities[0].communityId;
      }
    }
  }

  const maxTastingNumber = await db
    .select({ maxNum: db.$count(historicalTastings) })
    .from(historicalTastings);
  const nextNumber = (maxTastingNumber[0]?.maxNum ?? 0) + 10000;

  const tastingData: InsertHistoricalTasting = {
    sourceKey,
    tastingNumber: nextNumber,
    titleDe: tasting.title,
    titleEn: tasting.title,
    tastingDate: tasting.date || null,
    sourceFileName: "live-archive",
    importBatchId: null,
    whiskyCount: tastingWhiskies.length,
    communityId,
    visibilityLevel: "community_only",
    originType: "live",
    originTastingId: tasting.id,
  };

  const [created] = await db
    .insert(historicalTastings)
    .values(tastingData)
    .returning();

  let entriesCreated = 0;
  const ratingScale = tasting.ratingScale ?? 100;
  const normFactor = 100 / ratingScale;

  for (const whisky of tastingWhiskies) {
    const whiskyRatings = tastingRatings.filter(r => r.whiskyId === whisky.id);

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    const noseScores = whiskyRatings.map(r => (r.normalizedNose ?? (r.nose != null ? r.nose * normFactor : null))).filter((v): v is number => v != null).map(clampNormalized);
    const tasteScores = whiskyRatings.map(r => (r.normalizedTaste ?? (r.taste != null ? r.taste * normFactor : null))).filter((v): v is number => v != null).map(clampNormalized);
    const finishScores = whiskyRatings.map(r => (r.normalizedFinish ?? (r.finish != null ? r.finish * normFactor : null))).filter((v): v is number => v != null).map(clampNormalized);
    const overallScores = whiskyRatings.map(r => (r.normalizedScore ?? (r.overall != null ? r.overall * normFactor : null))).filter((v): v is number => v != null).map(clampNormalized);

    const avgNose = avg(noseScores);
    const avgTaste = avg(tasteScores);
    const avgFinish = avg(finishScores);
    const avgTotal = avg(overallScores);

    const ranks = computeRanks(tastingWhiskies, tastingRatings, normFactor);
    const whiskyRank = ranks.get(whisky.id);

    const distKey = normalizeKey(whisky.distillery);
    const whiskyKey = normalizeKey(whisky.name);
    const sourceWhiskyKey = `live-${tasting.id}-${distKey}-${whiskyKey}-${whisky.id.slice(-6)}`;

    const peatLevelRaw = whisky.peatLevel || null;
    const isSmoky = peatLevelRaw
      ? ["medium", "heavy"].includes(peatLevelRaw.toLowerCase()) ? true : peatLevelRaw.toLowerCase() === "none" ? false : null
      : null;

    const entryData: InsertHistoricalTastingEntry = {
      historicalTastingId: created.id,
      sourceWhiskyKey,
      distilleryRaw: whisky.distillery || null,
      whiskyNameRaw: whisky.name || null,
      ageRaw: whisky.age || null,
      alcoholRaw: whisky.abv != null ? String(whisky.abv) : null,
      priceRaw: whisky.price != null ? String(whisky.price) : null,
      countryRaw: whisky.country || null,
      regionRaw: whisky.region || null,
      typeRaw: whisky.category || whisky.type || null,
      smokyRaw: isSmoky != null ? (isSmoky ? "Ja" : "Nein") : null,
      ppmRaw: whisky.ppm != null ? String(whisky.ppm) : null,
      caskRaw: whisky.caskType || null,
      noseScore: avgNose != null ? parseFloat(avgNose.toFixed(1)) : null,
      noseRank: whiskyRank?.noseRank ?? null,
      tasteScore: avgTaste != null ? parseFloat(avgTaste.toFixed(1)) : null,
      tasteRank: whiskyRank?.tasteRank ?? null,
      finishScore: avgFinish != null ? parseFloat(avgFinish.toFixed(1)) : null,
      finishRank: whiskyRank?.finishRank ?? null,
      totalScore: avgTotal != null ? parseFloat(avgTotal.toFixed(1)) : null,
      totalRank: whiskyRank?.totalRank ?? null,
      normalizedNose: avgNose != null ? parseFloat(avgNose.toFixed(1)) : null,
      normalizedTaste: avgTaste != null ? parseFloat(avgTaste.toFixed(1)) : null,
      normalizedFinish: avgFinish != null ? parseFloat(avgFinish.toFixed(1)) : null,
      normalizedTotal: avgTotal != null ? parseFloat(avgTotal.toFixed(1)) : null,
      normalizedAge: parseAge(whisky.age),
      normalizedAbv: whisky.abv ?? null,
      normalizedPrice: whisky.price ?? null,
      normalizedCountry: normalizeText(whisky.country),
      normalizedRegion: normalizeText(whisky.region),
      normalizedType: normalizeText(whisky.category || whisky.type),
      normalizedIsSmoky: isSmoky,
      normalizedPpm: whisky.ppm ?? null,
      normalizedCask: normalizeText(whisky.caskType),
    };

    await db.insert(historicalTastingEntries).values(entryData).returning();
    entriesCreated++;
  }

  console.log(`[ARCHIVE] Created snapshot for tasting="${tasting.title}" id=${tasting.id} → historical=${created.id} entries=${entriesCreated}`);

  return {
    historicalTastingId: created.id,
    entriesCreated,
    alreadyExists: false,
  };
}

function computeRanks(
  allWhiskies: Whisky[],
  allRatings: Rating[],
  normFactor: number,
): Map<string, { noseRank: number; tasteRank: number; finishRank: number; totalRank: number }> {
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const whiskyAvgs = allWhiskies.map(w => {
    const wRatings = allRatings.filter(r => r.whiskyId === w.id);
    const noseScores = wRatings.map(r => r.normalizedNose ?? (r.nose != null ? r.nose * normFactor : null)).filter((v): v is number => v != null).map(clampNormalized);
    const tasteScores = wRatings.map(r => r.normalizedTaste ?? (r.taste != null ? r.taste * normFactor : null)).filter((v): v is number => v != null).map(clampNormalized);
    const finishScores = wRatings.map(r => r.normalizedFinish ?? (r.finish != null ? r.finish * normFactor : null)).filter((v): v is number => v != null).map(clampNormalized);
    const overallScores = wRatings.map(r => r.normalizedScore ?? (r.overall != null ? r.overall * normFactor : null)).filter((v): v is number => v != null).map(clampNormalized);
    return {
      id: w.id,
      avgNose: avg(noseScores),
      avgTaste: avg(tasteScores),
      avgFinish: avg(finishScores),
      avgTotal: avg(overallScores),
    };
  });

  const rankBy = (field: 'avgNose' | 'avgTaste' | 'avgFinish' | 'avgTotal') => {
    const sorted = [...whiskyAvgs].sort((a, b) => b[field] - a[field]);
    const ranks = new Map<string, number>();
    sorted.forEach((w, i) => ranks.set(w.id, i + 1));
    return ranks;
  };

  const noseRanks = rankBy('avgNose');
  const tasteRanks = rankBy('avgTaste');
  const finishRanks = rankBy('avgFinish');
  const totalRanks = rankBy('avgTotal');

  const result = new Map<string, { noseRank: number; tasteRank: number; finishRank: number; totalRank: number }>();
  for (const w of allWhiskies) {
    result.set(w.id, {
      noseRank: noseRanks.get(w.id) ?? 0,
      tasteRank: tasteRanks.get(w.id) ?? 0,
      finishRank: finishRanks.get(w.id) ?? 0,
      totalRank: totalRanks.get(w.id) ?? 0,
    });
  }
  return result;
}

export function determineAccessLevel(
  tasting: { hostId?: string; visibilityLevel: string; originType: string; originTastingId?: string | null; communityId?: string | null },
  requesterId: string | null,
  isHost: boolean,
  isParticipant: boolean,
  isCommunityMember: boolean,
  isAdmin: boolean,
): "full" | "aggregated" | "lineup_only" | "none" {
  if (isAdmin || isHost) return "full";
  if (isParticipant) return "full";

  const vis = tasting.visibilityLevel;

  if (vis === "public_full") return "full";
  if (vis === "public_aggregated") return "aggregated";

  if (vis === "community_only") {
    if (isCommunityMember) return "aggregated";
    return "none";
  }

  return "none";
}
