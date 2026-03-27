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
  abvBand: number;
  ageBand: number;
  threshold: number;
  enablePerDimension: boolean;
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
  overall?: number | null;
}

export type BaselineType = "overall" | "comparable";
export type Dimension = "nose" | "taste" | "finish" | "overall";

export interface BaselineStats {
  median: number;
  p25: number;
  p75: number;
  count: number;
  state: "placeholder" | "provisional" | "stable";
  isFallback: boolean;
}

export interface BaselineResult {
  type: BaselineType;
  dimensions: Partial<Record<Dimension, BaselineStats>>;
  fallbackReason?: string;
}

export const DEFAULT_WEIGHTS: ComparableWeights = {
  region: 0.40,
  peat: 0.30,
  cask: 0.20,
  abv: 0.10,
  age: 0.00,
};

export const DEFAULT_SETTINGS: ComparableSettings = {
  weights: DEFAULT_WEIGHTS,
  minSamples: 7,
  fallbackBehavior: "overall",
  abvBand: 3,
  ageBand: 3,
  threshold: 0.5,
  enablePerDimension: false,
};

export function parseComparableSettings(
  raw: Record<string, string>
): ComparableSettings {
  return {
    weights: {
      region: parseFloat(raw.comparable_weight_region) || DEFAULT_WEIGHTS.region,
      peat: parseFloat(raw.comparable_weight_peat) || DEFAULT_WEIGHTS.peat,
      cask: parseFloat(raw.comparable_weight_cask) || DEFAULT_WEIGHTS.cask,
      abv: parseFloat(raw.comparable_weight_abv) || DEFAULT_WEIGHTS.abv,
      age: parseFloat(raw.comparable_weight_age) || DEFAULT_WEIGHTS.age,
    },
    minSamples: parseInt(raw.comparable_min_samples) || DEFAULT_SETTINGS.minSamples,
    fallbackBehavior:
      raw.comparable_fallback_behavior === "none" ? "none" : "overall",
    abvBand: parseFloat(raw.comparable_abv_band) || DEFAULT_SETTINGS.abvBand,
    ageBand: parseFloat(raw.comparable_age_band) || DEFAULT_SETTINGS.ageBand,
    threshold: parseFloat(raw.comparable_threshold) || DEFAULT_SETTINGS.threshold,
    enablePerDimension: raw.comparable_enable_per_dimension === "true",
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

function parseAbv(abv?: number | null): number {
  if (abv == null || abv <= 0) return -1;
  return abv;
}

function parseAge(age?: string | null): number {
  if (!age) return -1;
  const num = parseInt(age);
  return isNaN(num) ? -1 : num;
}

export function computeSimilarity(
  target: WhiskyMetadata,
  candidate: WhiskyMetadata,
  weights: ComparableWeights,
  abvBand: number,
  ageBand: number
): number {
  let score = 0;
  let totalWeight = 0;

  const tRegion = normalizeRegion(target.region);
  const cRegion = normalizeRegion(candidate.region);
  if (tRegion && cRegion) {
    score += tRegion === cRegion ? weights.region : 0;
    totalWeight += weights.region;
  }

  const tPeat = normalizePeat(target.peatLevel);
  const cPeat = normalizePeat(candidate.peatLevel);
  if (tPeat >= 0 && cPeat >= 0) {
    const diff = Math.abs(tPeat - cPeat);
    score += diff === 0 ? weights.peat : diff === 1 ? weights.peat * 0.5 : 0;
    totalWeight += weights.peat;
  }

  const tCask = normalizeCask(target.caskInfluence);
  const cCask = normalizeCask(candidate.caskInfluence);
  if (tCask && cCask) {
    score += tCask === cCask ? weights.cask : 0;
    totalWeight += weights.cask;
  }

  const tAbv = parseAbv(target.abv);
  const cAbv = parseAbv(candidate.abv);
  if (tAbv > 0 && cAbv > 0) {
    score += Math.abs(tAbv - cAbv) <= abvBand ? weights.abv : 0;
    totalWeight += weights.abv;
  }

  if (weights.age > 0) {
    const tAge = parseAge(target.age);
    const cAge = parseAge(candidate.age);
    if (tAge >= 0 && cAge >= 0) {
      score += Math.abs(tAge - cAge) <= ageBand ? weights.age : 0;
      totalWeight += weights.age;
    }
  }

  return totalWeight > 0 ? score / totalWeight : 0;
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

function deriveState(count: number): "placeholder" | "provisional" | "stable" {
  if (count <= 2) return "placeholder";
  if (count < 10) return "provisional";
  return "stable";
}

function computeStats(values: number[]): Omit<BaselineStats, "isFallback"> {
  if (values.length === 0) {
    return { median: 0, p25: 0, p75: 0, count: 0, state: "placeholder" };
  }
  const sorted = [...values].sort((a, b) => a - b);
  return {
    median: percentile(sorted, 50),
    p25: percentile(sorted, 25),
    p75: percentile(sorted, 75),
    count: values.length,
    state: deriveState(values.length),
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
  const scored = history.map((h) => ({
    rating: h,
    similarity: computeSimilarity(target, h.whisky, settings.weights, settings.abvBand, settings.ageBand),
  }));

  const comparable = scored
    .filter((s) => s.similarity >= settings.threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .map((s) => s.rating);

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

function metaSignature(m: WhiskyMetadata): string {
  return `${normalizeRegion(m.region)}|${normalizePeat(m.peatLevel)}|${normalizeCask(m.caskInfluence)}|${parseAbv(m.abv)}|${parseAge(m.age)}`;
}

function cacheKey(
  type: BaselineType,
  participantId: string,
  whiskyMeta: WhiskyMetadata
): string {
  if (type === "overall") return `overall:${participantId}`;
  return `comparable:${participantId}:${metaSignature(whiskyMeta)}`;
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
