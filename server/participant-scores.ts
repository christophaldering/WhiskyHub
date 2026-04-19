import { db } from "./db";
import { ratings, whiskies, journalEntries, tastings } from "@shared/schema";
import { eq, and, isNull, ne, inArray } from "drizzle-orm";

export interface ParticipantScorePoint {
  normalizedScore: number;
  whiskyId: string | null;
  peatLevel: string | null;
  abv: number | null;
  source: "rating" | "journal";
}

function clampScore0to100(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function normalizePersonalScore(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  const value = raw <= 10 ? raw * 10 : raw;
  return clampScore0to100(value);
}

export async function getParticipantOverallScores(participantId: string): Promise<ParticipantScorePoint[]> {
  const allRatings = await db
    .select({
      overall: ratings.overall,
      normalizedScore: ratings.normalizedScore,
      whiskyId: ratings.whiskyId,
      tastingId: ratings.tastingId,
    })
    .from(ratings)
    .where(eq(ratings.participantId, participantId));

  const tastingIds = Array.from(new Set(allRatings.map(r => r.tastingId)));
  const tastingRows = tastingIds.length > 0
    ? await db
        .select({ id: tastings.id, ratingScale: tastings.ratingScale })
        .from(tastings)
        .where(inArray(tastings.id, tastingIds))
    : [];
  const tastingScaleMap = new Map(tastingRows.map(t => [t.id, t.ratingScale ?? 100]));

  const whiskyIds = Array.from(new Set(allRatings.map(r => r.whiskyId)));
  const whiskyRows = whiskyIds.length > 0
    ? await db
        .select({ id: whiskies.id, abv: whiskies.abv, peatLevel: whiskies.peatLevel })
        .from(whiskies)
        .where(inArray(whiskies.id, whiskyIds))
    : [];
  const whiskyMap = new Map(whiskyRows.map(w => [w.id, w]));

  const ratingPoints: ParticipantScorePoint[] = allRatings.map(r => {
    const scale = tastingScaleMap.get(r.tastingId) ?? 100;
    const norm = scale > 0 ? 100 / scale : 1;
    const fromOverall = r.overall != null ? r.overall * norm : null;
    const score = r.normalizedScore ?? fromOverall;
    const w = whiskyMap.get(r.whiskyId);
    return {
      normalizedScore: score != null ? clampScore0to100(score) : Number.NaN,
      whiskyId: r.whiskyId,
      peatLevel: w?.peatLevel ?? null,
      abv: w?.abv ?? null,
      source: "rating" as const,
    };
  }).filter(p => Number.isFinite(p.normalizedScore));

  const journalRows = await db
    .select({
      personalScore: journalEntries.personalScore,
      peatLevel: journalEntries.peatLevel,
      abv: journalEntries.abv,
    })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.participantId, participantId),
        ne(journalEntries.status, "draft"),
        isNull(journalEntries.deletedAt)
      )
    );

  const journalPoints: ParticipantScorePoint[] = journalRows
    .filter(j => j.personalScore != null && j.personalScore > 0)
    .map(j => {
      const parsedAbv = j.abv != null
        ? (typeof j.abv === "number" ? j.abv : parseFloat(String(j.abv).replace(/[%\s]/g, "")))
        : null;
      return {
        normalizedScore: normalizePersonalScore(j.personalScore!),
        whiskyId: null,
        peatLevel: j.peatLevel ?? null,
        abv: parsedAbv != null && !isNaN(parsedAbv) ? parsedAbv : null,
        source: "journal" as const,
      };
    });

  return [...ratingPoints, ...journalPoints];
}

export const STABILITY_MAX_STDDEV = 30;

export function computeStabilityScore(scores: number[]): number | null {
  if (scores.length < 3) return null;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  const raw = 10 - (stdDev / STABILITY_MAX_STDDEV) * 10;
  return Math.round(Math.max(0, Math.min(10, raw)) * 10) / 10;
}
