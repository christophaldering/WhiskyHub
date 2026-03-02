import { db } from "./db";
import { ratings, whiskies } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

export interface Insight {
  type: string;
  message: string;
  confidence: number;
}

export async function generateParticipantInsights(participantId: string): Promise<Insight[]> {
  const allRatings = await db
    .select({
      normalizedScore: ratings.normalizedScore,
      whiskyId: ratings.whiskyId,
    })
    .from(ratings)
    .where(eq(ratings.participantId, participantId));

  const scored = allRatings.filter(r => r.normalizedScore != null) as { normalizedScore: number; whiskyId: string }[];
  if (scored.length < 3) return [];

  const whiskyIds = [...new Set(scored.map(r => r.whiskyId))];
  if (whiskyIds.length === 0) return [];

  const whiskyRows = await db
    .select({
      id: whiskies.id,
      abv: whiskies.abv,
      region: whiskies.region,
      peatLevel: whiskies.peatLevel,
    })
    .from(whiskies)
    .where(inArray(whiskies.id, whiskyIds));

  const whiskyMap = new Map(whiskyRows.map(w => [w.id, w]));

  const allScores = scored.map(r => r.normalizedScore);
  const globalAvg = avg(allScores);
  const globalStdDev = stddev(allScores);

  const insights: Insight[] = [];

  const smokyScores: number[] = [];
  const nonSmokyScores: number[] = [];
  for (const r of scored) {
    const w = whiskyMap.get(r.whiskyId);
    if (!w || !w.peatLevel) continue;
    const level = w.peatLevel.toLowerCase();
    if (level === "medium" || level === "heavy") {
      smokyScores.push(r.normalizedScore);
    } else if (level === "none" || level === "light") {
      nonSmokyScores.push(r.normalizedScore);
    }
  }

  if (smokyScores.length >= 2 && nonSmokyScores.length >= 2) {
    const smokyAvg = avg(smokyScores);
    const delta = globalAvg - smokyAvg;
    if (delta > 10) {
      const confidence = Math.min(0.95, 0.5 + (delta - 10) / 40 + smokyScores.length / 20);
      insights.push({
        type: "smoke_bias",
        message: "You consistently rate smoky whiskies lower than your average.",
        confidence: round2(confidence),
      });
    } else if (delta < -10) {
      const confidence = Math.min(0.95, 0.5 + (Math.abs(delta) - 10) / 40 + smokyScores.length / 20);
      insights.push({
        type: "smoke_affinity",
        message: "You tend to rate smoky whiskies higher than average.",
        confidence: round2(confidence),
      });
    }
  }

  const highAbvScores: number[] = [];
  const normalAbvScores: number[] = [];
  for (const r of scored) {
    const w = whiskyMap.get(r.whiskyId);
    if (!w || w.abv == null) continue;
    if (w.abv > 50) {
      highAbvScores.push(r.normalizedScore);
    } else {
      normalAbvScores.push(r.normalizedScore);
    }
  }

  if (highAbvScores.length >= 2 && normalAbvScores.length >= 2) {
    const highAvg = avg(highAbvScores);
    const normalAvg = avg(normalAbvScores);
    const delta = highAvg - normalAvg;
    if (delta > 8) {
      const confidence = Math.min(0.95, 0.5 + (delta - 8) / 30 + highAbvScores.length / 20);
      insights.push({
        type: "high_abv_preference",
        message: "You seem to prefer high-strength whiskies.",
        confidence: round2(confidence),
      });
    }
  }

  if (allScores.length >= 5) {
    if (globalStdDev < 5) {
      const confidence = Math.min(0.95, 0.6 + (5 - globalStdDev) / 10);
      insights.push({
        type: "rating_stability_high",
        message: "Your ratings are very consistent.",
        confidence: round2(confidence),
      });
    } else if (globalStdDev > 20) {
      const confidence = Math.min(0.95, 0.5 + (globalStdDev - 20) / 40);
      insights.push({
        type: "rating_stability_low",
        message: "You rate very dynamically.",
        confidence: round2(confidence),
      });
    }
  }

  return insights;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
