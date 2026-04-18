import { db } from "./db";
import { ratings, whiskies, journalEntries } from "@shared/schema";
import { eq, and, isNull, ne, inArray } from "drizzle-orm";

export interface Insight {
  type: string;
  message: string;
  confidence: number;
}

export type InsightLanguage = "en" | "de";

const INSIGHT_MESSAGES: Record<string, Record<InsightLanguage, string>> = {
  smoke_bias: {
    en: "You consistently rate smoky whiskies lower than your average.",
    de: "Du bewertest rauchige Whiskys konstant niedriger als deinen Durchschnitt.",
  },
  smoke_affinity: {
    en: "You tend to rate smoky whiskies higher than average.",
    de: "Du bewertest rauchige Whiskys tendenziell höher als deinen Durchschnitt.",
  },
  high_abv_preference: {
    en: "You seem to prefer high-strength whiskies.",
    de: "Du scheinst Whiskys mit hoher Trinkstärke zu bevorzugen.",
  },
  rating_stability_high: {
    en: "Your sensory signature is well-defined — your scores cluster closely together.",
    de: "Deine sensorische Signatur ist ausgeprägt — deine Scores liegen nah beieinander.",
  },
  rating_stability_low: {
    en: "You rate very dynamically.",
    de: "Du bewertest sehr dynamisch.",
  },
};

function msg(type: keyof typeof INSIGHT_MESSAGES, language: InsightLanguage): string {
  const entry = INSIGHT_MESSAGES[type];
  return entry[language] ?? entry.en;
}

interface ScoredDataPoint {
  normalizedScore: number;
  peatLevel: string | null;
  abv: number | null;
}

export async function generateParticipantInsights(participantId: string, language: InsightLanguage = "en"): Promise<Insight[]> {
  const lang: InsightLanguage = language === "de" ? "de" : "en";
  const allRatings = await db
    .select({
      normalizedScore: ratings.normalizedScore,
      whiskyId: ratings.whiskyId,
    })
    .from(ratings)
    .where(eq(ratings.participantId, participantId));

  const scoredRatings = allRatings.filter(r => r.normalizedScore != null) as { normalizedScore: number; whiskyId: string }[];

  const whiskyIds = [...new Set(scoredRatings.map(r => r.whiskyId))];
  const whiskyRows = whiskyIds.length > 0
    ? await db
        .select({
          id: whiskies.id,
          abv: whiskies.abv,
          peatLevel: whiskies.peatLevel,
        })
        .from(whiskies)
        .where(inArray(whiskies.id, whiskyIds))
    : [];
  const whiskyMap = new Map(whiskyRows.map(w => [w.id, w]));

  const ratingDataPoints: ScoredDataPoint[] = scoredRatings.map(r => {
    const w = whiskyMap.get(r.whiskyId);
    return {
      normalizedScore: r.normalizedScore,
      peatLevel: w?.peatLevel ?? null,
      abv: w?.abv ?? null,
    };
  });

  const journal = await db
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

  const journalDataPoints: ScoredDataPoint[] = journal
    .filter(j => j.personalScore != null && j.personalScore > 0)
    .map(j => {
      const parsedAbv = j.abv != null ? (typeof j.abv === "number" ? j.abv : parseFloat(String(j.abv).replace(/[%\s]/g, ""))) : null;
      return {
        normalizedScore: j.personalScore!,
        peatLevel: j.peatLevel ?? null,
        abv: parsedAbv != null && !isNaN(parsedAbv) ? parsedAbv : null,
      };
    });

  const scored = [...ratingDataPoints, ...journalDataPoints];
  if (scored.length < 3) return [];

  const allScores = scored.map(r => r.normalizedScore);
  const globalAvg = avg(allScores);
  const globalStdDev = stddev(allScores);

  const insights: Insight[] = [];

  const smokyScores: number[] = [];
  const nonSmokyScores: number[] = [];
  for (const r of scored) {
    if (!r.peatLevel) continue;
    const level = r.peatLevel.toLowerCase();
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
        message: msg("smoke_bias", lang),
        confidence: round2(confidence),
      });
    } else if (delta < -10) {
      const confidence = Math.min(0.95, 0.5 + (Math.abs(delta) - 10) / 40 + smokyScores.length / 20);
      insights.push({
        type: "smoke_affinity",
        message: msg("smoke_affinity", lang),
        confidence: round2(confidence),
      });
    }
  }

  const highAbvScores: number[] = [];
  const normalAbvScores: number[] = [];
  for (const r of scored) {
    if (r.abv == null) continue;
    if (r.abv > 50) {
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
        message: msg("high_abv_preference", lang),
        confidence: round2(confidence),
      });
    }
  }

  if (allScores.length >= 5) {
    if (globalStdDev < 5) {
      const confidence = Math.min(0.95, 0.6 + (5 - globalStdDev) / 10);
      insights.push({
        type: "rating_stability_high",
        message: msg("rating_stability_high", lang),
        confidence: round2(confidence),
      });
    } else if (globalStdDev > 20) {
      const confidence = Math.min(0.95, 0.5 + (globalStdDev - 20) / 40);
      insights.push({
        type: "rating_stability_low",
        message: msg("rating_stability_low", lang),
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
