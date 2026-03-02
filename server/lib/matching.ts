import { IndexedWhisky, tokenize, trigrams, normalize } from "./whiskyIndex.js";

export interface MatchCandidate {
  source: "local";
  whiskyId: string;
  name: string;
  distillery: string;
  confidence: number;
}

export interface OcrHints {
  abv?: number;
  age?: number;
  caskTokens: string[];
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const v of a) {
    if (b.has(v)) intersection++;
  }
  return intersection / (a.size + b.size - intersection);
}

function trigramSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const v of a) {
    if (b.has(v)) intersection++;
  }
  return (2 * intersection) / (a.size + b.size);
}

function rawTokenize(s: string): string[] {
  return normalize(s).split(" ").filter((t) => t.length > 1);
}

export function scoreWhiskies(
  ocrText: string,
  hints: OcrHints,
  index: IndexedWhisky[]
): MatchCandidate[] {
  const ocrNorm = normalize(ocrText);
  const ocrTokensFiltered = new Set(tokenize(ocrText));
  const ocrTokensRaw = new Set(rawTokenize(ocrText));
  const ocrTri = trigrams(ocrText);

  const scored: { whisky: IndexedWhisky; score: number }[] = [];

  for (const w of index) {
    let score = 0;

    const nameRaw = rawTokenize(w.name);
    const distilleryRaw = rawTokenize(w.distillery || "");
    const allRawTokens = new Set([...nameRaw, ...distilleryRaw]);

    let rawHits = 0;
    for (const tok of allRawTokens) {
      if (ocrTokensRaw.has(tok) || ocrNorm.includes(tok)) rawHits++;
    }
    const rawCoverage = allRawTokens.size > 0 ? rawHits / allRawTokens.size : 0;
    score += rawCoverage * 0.40;

    const triSim = trigramSimilarity(ocrTri, w.trigrams);
    score += triSim * 0.25;

    if (w.normalizedDistillery && w.normalizedDistillery.length > 2) {
      if (ocrNorm.includes(w.normalizedDistillery)) {
        score += 0.20;
      } else {
        for (const dt of distilleryRaw) {
          if (dt.length > 3 && ocrNorm.includes(dt)) {
            score += 0.12;
            break;
          }
        }
      }
    }

    if (w.normalizedName && w.normalizedName.length > 2 && ocrNorm.includes(w.normalizedName)) {
      score += 0.15;
    }

    if (w.tokens.size > 0) {
      const filtered = jaccard(ocrTokensFiltered, w.tokens);
      score += filtered * 0.05;
    }

    if (hints.age) {
      const ageStr = String(hints.age);
      if (w.normalizedName.includes(ageStr)) score += 0.05;
    }

    score = Math.min(1, Math.max(0, score));

    if (score > 0.05) {
      console.log(`[SIMPLE_MODE][MATCH] ${w.name} (${w.distillery}): ${score.toFixed(3)} [raw=${rawCoverage.toFixed(2)} tri=${triSim.toFixed(2)}]`);
    }

    scored.push({ whisky: w, score });
  }

  scored.sort((a, b) => b.score - a.score);

  const MIN_SCORE = 0.08;
  const filtered = scored.filter((s) => s.score >= MIN_SCORE).slice(0, 3);

  return filtered.map((s) => ({
    source: "local" as const,
    whiskyId: s.whisky.whiskyId,
    name: s.whisky.name,
    distillery: s.whisky.distillery,
    confidence: Math.round(s.score * 100) / 100,
  }));
}

export function extractHints(text: string): OcrHints {
  const upper = text.toUpperCase();
  const hints: OcrHints = { caskTokens: [] };

  const abvMatch = upper.match(/(\d{2}\.?\d?)\s*%/);
  if (abvMatch) hints.abv = parseFloat(abvMatch[1]);

  const ageMatch = upper.match(/(\d{1,2})\s*(?:YO|YEARS?|YEAR|JAHRE)/);
  if (ageMatch) hints.age = parseInt(ageMatch[1], 10);

  const caskKeywords = ["SHERRY", "BOURBON", "PX", "OLOROSO", "PORT", "RUM", "WINE", "MADEIRA", "PEATED", "PEAT"];
  for (const kw of caskKeywords) {
    if (upper.includes(kw)) hints.caskTokens.push(kw);
  }

  return hints;
}
