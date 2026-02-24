import { useMemo } from "react";

export interface ComparableWeights {
  region: number;
  peat: number;
  cask: number;
  abv: number;
  age: number;
}

export interface ComparableSettings {
  weights: ComparableWeights;
  minSamples: number;
  fallbackBehavior: "overall" | "none";
}

export interface WhiskyMetadata {
  region?: string | null;
  peatLevel?: string | null;
  caskInfluence?: string | null;
  abv?: number | null;
  age?: string | null;
  abvBand?: string | null;
  ageBand?: string | null;
}

export interface HistoricalRating {
  whisky: WhiskyMetadata;
  nose?: number | null;
  taste?: number | null;
  finish?: number | null;
  balance?: number | null;
  overall?: number | null;
}

export type BaselineType = "overall" | "comparable";
export type Dimension = "nose" | "taste" | "finish" | "balance" | "overall";

export interface BaselineStats {
  median: number;
  p25: number;
  p75: number;
  count: number;
  isProvisional: boolean;
  isFallback: boolean;
}

export interface BaselineResult {
  type: BaselineType;
  dimensions: Partial<Record<Dimension, BaselineStats>>;
  fallbackReason?: string;
}

export const DEFAULT_WEIGHTS: ComparableWeights = {
  region: 3,
  peat: 3,
  cask: 2,
  abv: 1,
  age: 1,
};

export const DEFAULT_SETTINGS: ComparableSettings = {
  weights: DEFAULT_WEIGHTS,
  minSamples: 7,
  fallbackBehavior: "overall",
};

export function parseComparableSettings(
  raw: Record<string, string>
): ComparableSettings {
  return {
    weights: {
      region: parseFloat(raw.comparable_weights_region) || DEFAULT_WEIGHTS.region,
      peat: parseFloat(raw.comparable_weights_peat) || DEFAULT_WEIGHTS.peat,
      cask: parseFloat(raw.comparable_weights_cask) || DEFAULT_WEIGHTS.cask,
      abv: parseFloat(raw.comparable_weights_abv) || DEFAULT_WEIGHTS.abv,
      age: parseFloat(raw.comparable_weights_age) || DEFAULT_WEIGHTS.age,
    },
    minSamples: parseInt(raw.comparable_min_samples) || DEFAULT_SETTINGS.minSamples,
    fallbackBehavior:
      raw.comparable_fallback_behavior === "none" ? "none" : "overall",
  };
}

function normalizeRegion(r?: string | null): string {
  if (!r) return "";
  return r.toLowerCase().trim();
}

function normalizePeat(p?: string | null): number {
  if (!p) return -1;
  const map: Record<string, number> = {
    none: 0,
    light: 1,
    medium: 2,
    heavy: 3,
  };
  return map[p.toLowerCase().trim()] ?? -1;
}

function normalizeCask(c?: string | null): string {
  if (!c) return "";
  return c.toLowerCase().trim();
}

function abvBucket(abv?: number | null): number {
  if (abv == null || abv <= 0) return -1;
  if (abv < 40) return 0;
  if (abv <= 46) return 1;
  if (abv <= 55) return 2;
  return 3;
}

function ageBucket(age?: string | null, ageBand?: string | null): number {
  if (ageBand) {
    const map: Record<string, number> = {
      nas: 0,
      young: 1,
      classic: 2,
      mature: 3,
      old: 4,
    };
    return map[ageBand.toLowerCase().trim()] ?? -1;
  }
  if (!age) return -1;
  const num = parseInt(age);
  if (isNaN(num)) return 0;
  if (num < 10) return 1;
  if (num < 18) return 2;
  if (num < 25) return 3;
  return 4;
}

export function computeSimilarity(
  target: WhiskyMetadata,
  candidate: WhiskyMetadata,
  weights: ComparableWeights
): number {
  let score = 0;
  let maxScore = 0;

  const tRegion = normalizeRegion(target.region);
  const cRegion = normalizeRegion(candidate.region);
  if (tRegion && cRegion) {
    score += tRegion === cRegion ? weights.region : 0;
    maxScore += weights.region;
  }

  const tPeat = normalizePeat(target.peatLevel);
  const cPeat = normalizePeat(candidate.peatLevel);
  if (tPeat >= 0 && cPeat >= 0) {
    const diff = Math.abs(tPeat - cPeat);
    score += diff === 0 ? weights.peat : diff === 1 ? weights.peat * 0.5 : 0;
    maxScore += weights.peat;
  }

  const tCask = normalizeCask(target.caskInfluence);
  const cCask = normalizeCask(candidate.caskInfluence);
  if (tCask && cCask) {
    score += tCask === cCask ? weights.cask : 0;
    maxScore += weights.cask;
  }

  const tAbv = abvBucket(target.abv);
  const cAbv = abvBucket(candidate.abv);
  if (tAbv >= 0 && cAbv >= 0) {
    score += tAbv === cAbv ? weights.abv : 0;
    maxScore += weights.abv;
  }

  const tAge = ageBucket(target.age, target.ageBand);
  const cAge = ageBucket(candidate.age, candidate.ageBand);
  if (tAge >= 0 && cAge >= 0) {
    score += tAge === cAge ? weights.age : 0;
    maxScore += weights.age;
  }

  return maxScore > 0 ? score / maxScore : 0;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function computeStats(values: number[]): Omit<BaselineStats, "isFallback"> {
  if (values.length === 0) {
    return { median: 0, p25: 0, p75: 0, count: 0, isProvisional: true };
  }
  const sorted = [...values].sort((a, b) => a - b);
  return {
    median: percentile(sorted, 50),
    p25: percentile(sorted, 25),
    p75: percentile(sorted, 75),
    count: values.length,
    isProvisional: values.length < 10,
  };
}

export function computeOverallBaseline(
  history: HistoricalRating[],
  dimensions: Dimension[]
): Partial<Record<Dimension, BaselineStats>> {
  const result: Partial<Record<Dimension, BaselineStats>> = {};
  for (const dim of dimensions) {
    const values = history
      .map((h) => h[dim])
      .filter((v): v is number => v != null && v > 0);
    const stats = computeStats(values);
    result[dim] = { ...stats, isFallback: false };
  }
  return result;
}

export function computeComparableBaseline(
  target: WhiskyMetadata,
  history: HistoricalRating[],
  dimensions: Dimension[],
  settings: ComparableSettings
): BaselineResult {
  const SIMILARITY_THRESHOLD = 0.5;

  const comparable = history.filter(
    (h) =>
      computeSimilarity(target, h.whisky, settings.weights) >=
      SIMILARITY_THRESHOLD
  );

  if (comparable.length < settings.minSamples) {
    if (settings.fallbackBehavior === "overall") {
      const overallDims = computeOverallBaseline(history, dimensions);
      for (const dim of dimensions) {
        if (overallDims[dim]) {
          overallDims[dim]!.isFallback = true;
        }
      }
      return {
        type: "comparable",
        dimensions: overallDims,
        fallbackReason:
          comparable.length === 0
            ? "no_comparable_data"
            : "insufficient_comparable_data",
      };
    }
    return {
      type: "comparable",
      dimensions: {},
      fallbackReason:
        comparable.length === 0
          ? "no_comparable_data"
          : "insufficient_comparable_data",
    };
  }

  const result: Partial<Record<Dimension, BaselineStats>> = {};
  for (const dim of dimensions) {
    const values = comparable
      .map((h) => h[dim])
      .filter((v): v is number => v != null && v > 0);
    const stats = computeStats(values);
    result[dim] = { ...stats, isFallback: false };
  }

  return { type: "comparable", dimensions: result };
}

const baselineCacheMap = new Map<string, BaselineResult>();

function cacheKey(
  type: BaselineType,
  participantId: string,
  whiskyMeta: WhiskyMetadata
): string {
  if (type === "overall") return `overall:${participantId}`;
  return `comparable:${participantId}:${normalizeRegion(whiskyMeta.region)}:${normalizePeat(whiskyMeta.peatLevel)}:${normalizeCask(whiskyMeta.caskInfluence)}:${abvBucket(whiskyMeta.abv)}:${ageBucket(whiskyMeta.age, whiskyMeta.ageBand)}`;
}

export function getBaseline(
  type: BaselineType,
  target: WhiskyMetadata,
  history: HistoricalRating[],
  dimensions: Dimension[],
  settings: ComparableSettings,
  participantId: string
): BaselineResult {
  const key = cacheKey(type, participantId, target);
  const cached = baselineCacheMap.get(key);
  if (cached) return cached;

  let result: BaselineResult;
  if (type === "overall") {
    result = {
      type: "overall",
      dimensions: computeOverallBaseline(history, dimensions),
    };
  } else {
    result = computeComparableBaseline(target, history, dimensions, settings);
  }

  baselineCacheMap.set(key, result);
  return result;
}

export function clearBaselineCache() {
  baselineCacheMap.clear();
}

export function useBaselineComputation(
  type: BaselineType,
  target: WhiskyMetadata | null,
  history: HistoricalRating[],
  dimensions: Dimension[],
  settings: ComparableSettings,
  participantId: string
): BaselineResult | null {
  return useMemo(() => {
    if (!target || history.length === 0) return null;
    return getBaseline(type, target, history, dimensions, settings, participantId);
  }, [type, target, history, dimensions, settings, participantId]);
}
