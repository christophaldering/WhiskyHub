/**
 * Einfacher Lookup-Cache fuer Whiskybase-Suchergebnisse.
 *
 * Treffer werden 30 Tage gehalten, Nichttreffer nur 7 — eine Flasche, die
 * heute nicht auf Whiskybase steht, kann naechsten Monat dort stehen.
 * Technische Fehlschlaege (failed=true) werden nicht gecacht, damit ein
 * vorueber-gehender Serverfehler nicht dauerhaft eine Flasche blockiert.
 */

import { db } from "./db";
import { whiskybaseLookupCache } from "@shared/schema";
import { inArray } from "drizzle-orm";
import type { WbLookupItem, WbLookupOutcome } from "./whiskybase-unified";

const TTL_FOUND_MS = 30 * 24 * 60 * 60 * 1000;   // 30 Tage
const TTL_NOT_FOUND_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage

function makeKey(item: WbLookupItem): string {
  const name = String(item.name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const dist = String(item.distillery || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return dist ? `${name}||${dist}` : name;
}

/**
 * Liest gecachte Ergebnisse fuer eine Liste von Suchitems.
 * Gibt eine Map<Position, WbLookupOutcome> zurueck — nur Positionen mit
 * gueltigen, noch nicht abgelaufenen Cache-Eintraegen sind enthalten.
 */
export async function readFromCache(
  items: WbLookupItem[],
): Promise<Map<number, WbLookupOutcome>> {
  const result = new Map<number, WbLookupOutcome>();
  if (items.length === 0) return result;

  const keys = items.map(makeKey);
  let rows: any[] = [];
  try {
    rows = await db
      .select()
      .from(whiskybaseLookupCache)
      .where(inArray(whiskybaseLookupCache.queryKey, keys));
  } catch {
    return result;
  }

  const byKey = new Map(rows.map((r) => [r.queryKey, r]));
  const now = Date.now();

  items.forEach((item, pos) => {
    const row = byKey.get(keys[pos]);
    if (!row) return;
    const ttl = row.notFound ? TTL_NOT_FOUND_MS : TTL_FOUND_MS;
    if (now - new Date(row.updatedAt).getTime() > ttl) return; // abgelaufen
    result.set(pos, {
      whiskybaseId: row.whiskybaseId ?? null,
      whiskybaseUrl: row.whiskybaseUrl ?? null,
      wbScore: row.wbScore ?? null,
      distilledYear: row.distilledYear ?? null,
      bottledYear: row.bottledYear ?? null,
      caskType: row.caskType ?? null,
      abv: row.abv ?? null,
      age: row.age ?? null,
      failed: false,
    });
  });

  return result;
}

/**
 * Schreibt frische Suchergebnisse in den Cache.
 * Technische Fehlschlaege (outcome.failed === true) werden uebersprungen.
 * Wird fire-and-forget aufgerufen (void).
 */
export async function writeToCache(
  items: WbLookupItem[],
  outcomes: WbLookupOutcome[],
): Promise<void> {
  const toWrite = items
    .map((item, pos) => ({ item, outcome: outcomes[pos] }))
    .filter(({ outcome }) => outcome && !outcome.failed);

  if (toWrite.length === 0) return;

  try {
    for (const { item, outcome } of toWrite) {
      const key = makeKey(item);
      await db
        .insert(whiskybaseLookupCache)
        .values({
          queryKey: key,
          whiskybaseId: outcome.whiskybaseId,
          whiskybaseUrl: outcome.whiskybaseUrl,
          wbScore: outcome.wbScore,
          distilledYear: outcome.distilledYear,
          bottledYear: outcome.bottledYear,
          caskType: outcome.caskType,
          abv: outcome.abv,
          age: outcome.age,
          notFound: !outcome.whiskybaseId,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: whiskybaseLookupCache.queryKey,
          set: {
            whiskybaseId: outcome.whiskybaseId,
            whiskybaseUrl: outcome.whiskybaseUrl,
            wbScore: outcome.wbScore,
            distilledYear: outcome.distilledYear,
            bottledYear: outcome.bottledYear,
            caskType: outcome.caskType,
            abv: outcome.abv,
            age: outcome.age,
            notFound: !outcome.whiskybaseId,
            updatedAt: new Date(),
          },
        });
    }
  } catch (err) {
    // Cache-Fehler sind nicht fatal — die Suche hat ihre Ergebnisse bereits
    // zurueckgegeben; ein fehlgeschlagener Schreibvorgang ist kein Problem.
    console.warn("[wb-cache] writeToCache failed:", err);
  }
}
