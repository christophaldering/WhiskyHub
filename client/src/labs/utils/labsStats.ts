export type RGB = [number, number, number];

export interface HistogramBucket {
  binStart: number;
  binEnd: number;
  count: number;
}

export function mean(vals: ReadonlyArray<number>): number | null {
  if (!vals || vals.length === 0) return null;
  let sum = 0;
  for (const v of vals) sum += v;
  return sum / vals.length;
}

export function median(vals: ReadonlyArray<number>): number | null {
  if (!vals || vals.length === 0) return null;
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function stdDev(vals: ReadonlyArray<number>): number | null {
  if (!vals || vals.length < 2) return null;
  const m = mean(vals);
  if (m == null) return null;
  let acc = 0;
  for (const v of vals) {
    const d = v - m;
    acc += d * d;
  }
  return Math.sqrt(acc / (vals.length - 1));
}

export function minMax(vals: ReadonlyArray<number>): { min: number; max: number } | null {
  if (!vals || vals.length === 0) return null;
  let mn = vals[0];
  let mx = vals[0];
  for (const v of vals) {
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  return { min: mn, max: mx };
}

export function pearson(x: ReadonlyArray<number>, y: ReadonlyArray<number>): number | null {
  if (!x || !y || x.length !== y.length || x.length < 2) return null;
  const mx = mean(x);
  const my = mean(y);
  if (mx == null || my == null) return null;
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const den = Math.sqrt(dx2 * dy2);
  if (den === 0) return null;
  return num / den;
}

function rankWithTies(vals: ReadonlyArray<number>): number[] {
  const indexed = vals.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(vals.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = avgRank;
    i = j + 1;
  }
  return ranks;
}

export function spearman(x: ReadonlyArray<number>, y: ReadonlyArray<number>): number | null {
  if (!x || !y || x.length !== y.length || x.length < 2) return null;
  return pearson(rankWithTies(x), rankWithTies(y));
}

export function histogramBuckets(
  vals: ReadonlyArray<number>,
  minV: number,
  maxV: number,
  nBins: number,
): HistogramBucket[] {
  const out: HistogramBucket[] = [];
  if (nBins <= 0 || maxV <= minV) return out;
  const span = (maxV - minV) / nBins;
  for (let i = 0; i < nBins; i++) {
    const start = minV + i * span;
    const end = i === nBins - 1 ? maxV : start + span;
    out.push({ binStart: start, binEnd: end, count: 0 });
  }
  for (const v of vals) {
    if (v == null || isNaN(v)) continue;
    let idx = Math.floor((v - minV) / span);
    if (idx < 0) idx = 0;
    if (idx >= nBins) idx = nBins - 1;
    out[idx].count++;
  }
  return out;
}

export function lerpColor(bg: RGB, fg: RGB, t: number): RGB {
  const tt = Math.max(0, Math.min(1, t));
  return [
    Math.round(bg[0] + (fg[0] - bg[0]) * tt),
    Math.round(bg[1] + (fg[1] - bg[1]) * tt),
    Math.round(bg[2] + (fg[2] - bg[2]) * tt),
  ];
}

export function heatmapColor(
  value: number | null | undefined,
  minV: number,
  maxV: number,
  bg: RGB,
  fg: RGB,
  intensity: number = 0.85,
): RGB {
  if (value == null) return bg;
  if (maxV <= minV) return fg;
  const t = (value - minV) / (maxV - minV);
  return lerpColor(bg, fg, t * intensity);
}

export function topItemsByCount(items: ReadonlyArray<string>, limit: number): string[] {
  if (!items || items.length === 0) return [];
  const counts = new Map<string, number>();
  for (const raw of items) {
    if (typeof raw !== "string") continue;
    const tag = raw.trim();
    if (!tag) continue;
    counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([k]) => k);
}
