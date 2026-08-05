/**
 * Vorstufe zur Websuche: erst in der eigenen Whiskybase-Sammlung nachsehen.
 *
 * Wer seine Sammlung von Whiskybase importiert hat, hat die IDs und Kennzahlen
 * bereits im Haus. Es waere unsinnig, dafuer eine Websuche zu starten — die ist
 * langsamer, teurer und unzuverlaessiger als ein Abgleich gegen Daten, die
 * schon da sind. Und genau die Flaschen, die ein Gastgeber fotografiert, stehen
 * mit hoher Wahrscheinlichkeit in seiner eigenen Sammlung.
 *
 * Bewusst streng beim Abgleich: lieber eine Flasche zu wenig aus der Sammlung
 * bedienen (dann greift die Websuche) als eine falsche ID zuordnen. Eine falsch
 * verknuepfte Flasche ist schlimmer als eine nicht verknuepfte, weil sie
 * unbemerkt bleibt.
 */

import { db } from "./db";
import { whiskybaseCollection } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { WbLookupItem, WbLookupOutcome } from "./whiskybase-unified";

function norm(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenSet(s: string): Set<string> {
  return new Set(norm(s).split(" ").filter((t) => t.length > 2));
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let hits = 0;
  for (const t of a) if (b.has(t)) hits++;
  return hits / Math.min(a.size, b.size);
}

/** Zahl aus einem Feld ziehen, das "46.3", "46,3 %" oder 46.3 sein kann. */
function num(v: unknown): number | null {
  if (v == null) return null;
  const m = String(v).replace(",", ".").match(/[\d.]+/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

export interface CollectionMatch {
  index: number;
  outcome: WbLookupOutcome;
}

/**
 * Gleicht die gesuchten Flaschen gegen die Sammlung des Gastgebers ab.
 * Liefert nur Treffer, bei denen Name UND (Destillerie oder Alkoholstaerke)
 * zusammenpassen — ein blosser Namensanklang genuegt nicht.
 */
export async function matchAgainstCollection(
  participantId: string,
  items: WbLookupItem[],
): Promise<Map<number, WbLookupOutcome>> {
  const result = new Map<number, WbLookupOutcome>();
  if (!participantId || items.length === 0) return result;

  let rows: any[] = [];
  try {
    rows = await db
      .select()
      .from(whiskybaseCollection)
      .where(eq(whiskybaseCollection.participantId, participantId));
  } catch {
    return result;
  }
  const usable = rows.filter((r) => r?.whiskybaseId);
  if (usable.length === 0) return result;

  const prepared = usable.map((r) => ({
    row: r,
    tokens: tokenSet(`${r.name || ""} ${r.distillery || r.brand || ""}`),
    abv: num(r.abv),
  }));

  items.forEach((item, i) => {
    const itemTokens = tokenSet(`${item.name || ""} ${item.distillery || ""}`);
    const itemAbv = num(item.abv);

    let best: { score: number; row: any } | null = null;
    for (const cand of prepared) {
      const score = overlap(itemTokens, cand.tokens);
      if (score < 0.72) continue;
      // Zweites Merkmal verlangen: Alkoholstaerke auf 0.2 % genau ODER
      // uebereinstimmende Destillerie. Sonst bleibt es bei der Websuche.
      const abvFits = itemAbv != null && cand.abv != null && Math.abs(itemAbv - cand.abv) <= 0.2;
      const distFits =
        !!item.distillery &&
        overlap(tokenSet(item.distillery), tokenSet(cand.row.distillery || cand.row.brand || "")) >= 0.8;
      if (!abvFits && !distFits) continue;
      if (!best || score > best.score) best = { score, row: cand.row };
    }

    if (best) {
      const r = best.row;
      result.set(i, {
        whiskybaseId: String(r.whiskybaseId),
        whiskybaseUrl: `https://www.whiskybase.com/whiskies/whisky/${r.whiskybaseId}/`,
        wbScore: num(r.communityRating) ?? null,
        distilledYear: r.distilledYear != null ? String(r.distilledYear) : null,
        bottledYear: null,
        caskType: r.caskType || null,
        abv: r.abv != null ? String(r.abv) : null,
        age: r.statedAge != null ? String(r.statedAge) : null,
        failed: false,
      } as WbLookupOutcome);
    }
  });

  return result;
}
