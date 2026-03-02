import { db } from "../db.js";
import { whiskies } from "../../shared/schema.js";

export interface IndexedWhisky {
  whiskyId: string;
  name: string;
  distillery: string;
  normalizedName: string;
  normalizedDistillery: string;
  tokens: Set<string>;
  trigrams: Set<string>;
}

const NOISE = new Set([
  "SINGLE", "MALT", "SCOTCH", "WHISKY", "WHISKEY", "THE", "DISTILLERY",
  "LIMITED", "EDITION", "YEARS", "YEAR", "YO", "OLD", "DISTILLED",
  "BOTTLED", "CASK", "STRENGTH", "NATURAL", "COLOUR", "COLOR",
  "NON", "CHILL", "FILTERED", "PRODUCT", "OF", "SCOTLAND", "AND",
]);

export function normalize(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

export function tokenize(s: string): string[] {
  return normalize(s).split(" ").filter((t) => t.length > 1 && !NOISE.has(t));
}

export function trigrams(s: string): Set<string> {
  const n = normalize(s).replace(/\s/g, "");
  const set = new Set<string>();
  for (let i = 0; i <= n.length - 3; i++) {
    set.add(n.substring(i, i + 3));
  }
  return set;
}

let _index: IndexedWhisky[] | null = null;
let _lastBuild = 0;
const REBUILD_INTERVAL = 5 * 60 * 1000;

export async function getWhiskyIndex(): Promise<IndexedWhisky[]> {
  if (_index && Date.now() - _lastBuild < REBUILD_INTERVAL) return _index;

  console.log("[SIMPLE_MODE][INDEX] building whisky index...");
  try {
    const rows = await db.selectDistinctOn([whiskies.name, whiskies.distillery], {
      whiskyId: whiskies.id,
      name: whiskies.name,
      distillery: whiskies.distillery,
    }).from(whiskies);

    const seen = new Set<string>();
    _index = [];
    for (const row of rows) {
      const key = `${(row.name || "").toLowerCase()}|${(row.distillery || "").toLowerCase()}`;
      if (seen.has(key) || !row.name) continue;
      seen.add(key);
      const nameTokens = tokenize(row.name);
      const distTokens = tokenize(row.distillery || "");
      const allTokens = new Set([...nameTokens, ...distTokens]);
      _index.push({
        whiskyId: row.whiskyId,
        name: row.name,
        distillery: row.distillery || "",
        normalizedName: normalize(row.name),
        normalizedDistillery: normalize(row.distillery || ""),
        tokens: allTokens,
        trigrams: trigrams(`${row.name} ${row.distillery || ""}`),
      });
    }
    _lastBuild = Date.now();
    console.log(`[SIMPLE_MODE][INDEX] indexed ${_index.length} unique whiskies`);
  } catch (err: any) {
    console.error("[SIMPLE_MODE][INDEX] build error:", err.message);
    if (!_index) _index = [];
  }
  return _index;
}
