import { normalize } from "./whiskyIndex.js";

export interface OnlineCandidate {
  source: "external";
  name: string;
  distillery?: string;
  abv?: number;
  age?: number;
  whiskybaseId?: string;
  priceHint?: string;
  externalUrl?: string;
  confidence: number;
  whiskyId?: string;
}

export interface OnlineSearchResult {
  candidates: OnlineCandidate[];
  debug?: {
    provider: string;
    tookMs: number;
    rawResults?: number;
  };
}

type Provider = "serpapi" | "google_cse" | "off";

function getProvider(): { type: Provider; configured: boolean } {
  const p = (process.env.ONLINE_SEARCH_PROVIDER || "off").toLowerCase() as Provider;

  if (p === "serpapi" && process.env.SERPAPI_API_KEY) {
    return { type: "serpapi", configured: true };
  }
  if (p === "google_cse" && process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX) {
    return { type: "google_cse", configured: true };
  }
  return { type: p === "off" ? "off" : p, configured: false };
}

export function getProviderStatus(): { provider: string; configured: boolean } {
  const { type, configured } = getProvider();
  return { provider: type, configured };
}

const WHISKY_NOISE = new Set([
  "WHISKY", "WHISKEY", "SINGLE", "MALT", "SCOTCH", "DISTILLERY",
  "BOTTLE", "REVIEW", "TASTING", "NOTES", "BUY", "SHOP", "PRICE",
  "THE", "OF", "AND", "A", "AN", "IN", "FOR", "TO", "WITH",
]);

function extractCandidatesFromResults(results: Array<{ title: string; snippet?: string; link?: string }>): OnlineCandidate[] {
  const candidates: OnlineCandidate[] = [];
  const seen = new Set<string>();

  for (const r of results) {
    const title = r.title || "";
    const cleaned = title
      .replace(/\s*[-|–—]\s*.+$/, "")
      .replace(/\s*\(.*?\)/g, "")
      .replace(/\bReview\b|\bTasting Notes?\b|\bBuy\b|\bShop\b|\bPrice\b/gi, "")
      .trim();

    if (!cleaned || cleaned.length < 3) continue;

    const normalized = normalize(cleaned);
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const tokens = normalized.split(" ").filter(t => t.length > 1 && !WHISKY_NOISE.has(t));
    if (tokens.length === 0) continue;

    let age: number | undefined;
    let abv: number | undefined;
    let distillery: string | undefined;

    const ageMatch = title.match(/(\d{1,2})\s*(?:Year|YO|Jahre)/i);
    if (ageMatch) age = parseInt(ageMatch[1]);

    const abvMatch = title.match(/(\d{2}\.?\d?)\s*%/);
    if (abvMatch) abv = parseFloat(abvMatch[1]);

    const parts = cleaned.split(/\s+/);
    if (parts.length >= 2) {
      distillery = parts[0];
      if (parts[0].length <= 2 && parts.length >= 3) {
        distillery = `${parts[0]} ${parts[1]}`;
      }
    }

    const confidence = Math.min(0.75, Math.max(0.4, 0.55 + (tokens.length > 3 ? 0.1 : 0) + (age ? 0.05 : 0) + (abv ? 0.05 : 0)));

    candidates.push({
      source: "external",
      name: cleaned,
      distillery,
      age,
      abv,
      externalUrl: r.link,
      confidence: Math.round(confidence * 100) / 100,
    });
  }

  return candidates.slice(0, 5);
}

async function searchSerpApi(query: string): Promise<Array<{ title: string; snippet?: string; link?: string }>> {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) return [];

  const params = new URLSearchParams({
    q: `${query} whisky`,
    api_key: key,
    engine: "google",
    num: "8",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.log(`[SIMPLE_MODE][ONLINE_SEARCH] SerpAPI error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const organic = data.organic_results || [];
    return organic.map((r: any) => ({
      title: r.title || "",
      snippet: r.snippet || "",
      link: r.link || "",
    }));
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === "AbortError") {
      console.log("[SIMPLE_MODE][ONLINE_SEARCH] SerpAPI timeout");
    } else {
      console.log(`[SIMPLE_MODE][ONLINE_SEARCH] SerpAPI error: ${e.message}`);
    }
    return [];
  }
}

async function searchGoogleCSE(query: string): Promise<Array<{ title: string; snippet?: string; link?: string }>> {
  const key = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!key || !cx) return [];

  const params = new URLSearchParams({
    q: `${query} whisky`,
    key,
    cx,
    num: "8",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.log(`[SIMPLE_MODE][ONLINE_SEARCH] Google CSE error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const items = data.items || [];
    return items.map((r: any) => ({
      title: r.title || "",
      snippet: r.snippet || "",
      link: r.link || "",
    }));
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === "AbortError") {
      console.log("[SIMPLE_MODE][ONLINE_SEARCH] Google CSE timeout");
    } else {
      console.log(`[SIMPLE_MODE][ONLINE_SEARCH] Google CSE error: ${e.message}`);
    }
    return [];
  }
}

export async function searchOnline(query: string): Promise<OnlineSearchResult> {
  const startMs = Date.now();
  const { type, configured } = getProvider();

  console.log(`[SIMPLE_MODE][ONLINE_SEARCH] provider=${type} configured=${configured} query="${query.substring(0, 80)}"`);

  if (type === "off" || !configured) {
    return {
      candidates: [],
      debug: { provider: type, tookMs: 0 },
    };
  }

  let rawResults: Array<{ title: string; snippet?: string; link?: string }> = [];

  if (type === "serpapi") {
    rawResults = await searchSerpApi(query);
  } else if (type === "google_cse") {
    rawResults = await searchGoogleCSE(query);
  }

  const candidates = extractCandidatesFromResults(rawResults);
  const tookMs = Date.now() - startMs;

  console.log(`[SIMPLE_MODE][ONLINE_SEARCH] ${rawResults.length} raw → ${candidates.length} candidates in ${tookMs}ms`);

  return {
    candidates,
    debug: { provider: type, tookMs, rawResults: rawResults.length },
  };
}
