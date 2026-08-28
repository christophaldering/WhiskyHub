/**
 * Gedaechtnis fuer die Whiskybase-Suche.
 *
 * Die Websuche ist der teuerste und langsamste Teil des Imports — und sie
 * wiederholt sich staendig: dieselben Standardabfuellungen tauchen in jedem
 * zweiten Tasting auf. Einmal gefunden, sollte eine Flasche nie wieder gesucht
 * werden muessen.
 *
 * Nichttreffer werden ebenfalls vermerkt, aber nur kurz. Eine Flasche, die
 * heute niemand erfasst hat, kann naechsten Monat auf Whiskybase stehen — ein
 * dauerhaftes "gibt es nicht" waere falsch.
 */

import { db } from "./db";
import { whiskybaseLookupCache } from "@shared/schema";
import { inArray, sql } from "drizzle-orm";
import type { WbLookupItem, WbLookupOutcome } from "./whiskybase-unified";

/** Treffer bleiben ein Vierteljahr gueltig, Nichttreffer eine Woche. */
const HIT_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Suchschluessel. Bewusst grob normalisiert, damit "Ardbeg 10 Years" und
 * "ardbeg 10 years old" denselben Eintrag treffen — aber mit Alkoholstaerke,
 * weil sie bei Einzelfaessern oft das einzige unterscheidende Merkmal ist.
 */
export function cacheKeyFor(item: WbLookupItem): string {
  const parts = [item.name, item.distillery, item.abv]
    .filter(Boolean)
    .map((v) =>
      String(v)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim(),
    )
    .filter((v) => v.length > 0);
  return parts.join("|");
}

function isFresh(updatedAt: Date | string | null, notFound: boolean): boolean {
  if (!updatedAt) return false;
  const ts = updatedAt instanceof Date ? updatedAt.getTime() : new Date(updatedAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < (notFound ? MISS_TTL_MS : HIT_TTL_MS);
}

/** Liefert fuer die uebergebenen Flaschen alles, was noch frisch im Speicher liegt. */
export async function readFromCache(
  items: WbLookupItem[],
): Promise<Map<number, WbLookupOutcome>> {
  const out = new Map<number, WbLookupOutcome>();
  if (items.length === 0) return out;

  const keys = items.map(cacheKeyFor);
  const unique = Array.from(new Set(keys.filter((k) => k.length > 0)));
  if (unique.length === 0) return out;

  let rows: any[] = [];
  try {
    rows = await db.select().from(whiskybaseLookupCache).where(inArray(whiskybaseLookupCache.queryKey, unique));
  } catch {
    return out;
  }

  const byKey = new Map<string, any>();
  for (const r of rows) byKey.set(r.queryKey, r);

  keys.forEach((k, i) => {
    const r = byKey.get(k);
    if (!r || !isFresh(r.updatedAt, r.notFound)) return;
    // Ein gespeicherter Nichttreffer wird als "nicht gefunden" durchgereicht,
    // NICHT als Fehlschlag — sonst wuerde das UI zum Wiederholen auffordern.
    out.set(i, {
      whiskybaseId: r.whiskybaseId,
      whiskybaseUrl: r.whiskybaseUrl,
      wbScore: r.wbScore,
      distilledYear: r.distilledYear,
      bottledYear: r.bottledYear,
      caskType: r.caskType,
      abv: r.abv,
      age: r.age,
      failed: false,
    } as WbLookupOutcome);
  });
  return out;
}

/**
 * Schreibt Ergebnisse fort. Echte Fehlschlaege (Zeitueberschreitung) werden
 * bewusst NICHT gespeichert — sonst wuerde ein einmaliger Aussetzer eine
 * Flasche eine Woche lang blockieren.
 *
 * Aus demselben Grund werden auch "ambiguous" und "rejected" nicht
 * gespeichert: beides sind offene Faelle. Sobald jemand die Fassnummer oder
 * den Alkoholgehalt nachtraegt, soll die naechste Suche eine echte Chance
 * bekommen — und nicht eine Woche lang ein stummes "nicht gefunden" erben.
 */
export async function writeToCache(
  items: WbLookupItem[],
  outcomes: WbLookupOutcome[],
): Promise<void> {
  const rows = items
    .map((item, i) => ({ item, o: outcomes[i], key: cacheKeyFor(item) }))
    .filter(({ o, key }) =>
      o && !o.failed && key.length > 0
      && o.status !== "ambiguous" && o.status !== "rejected")
    .map(({ o, key }) => ({
      queryKey: key,
      whiskybaseId: o.whiskybaseId ?? null,
      whiskybaseUrl: o.whiskybaseUrl ?? null,
      wbScore: o.wbScore ?? null,
      distilledYear: o.distilledYear ?? null,
      bottledYear: o.bottledYear ?? null,
      caskType: o.caskType ?? null,
      abv: o.abv ?? null,
      age: o.age ?? null,
      notFound: !o.whiskybaseId,
      updatedAt: new Date(),
    }));
  if (rows.length === 0) return;

  try {
    await db
      .insert(whiskybaseLookupCache)
      .values(rows)
      .onConflictDoUpdate({
        target: whiskybaseLookupCache.queryKey,
        set: {
          whiskybaseId: sql`excluded.whiskybase_id`,
          whiskybaseUrl: sql`excluded.whiskybase_url`,
          wbScore: sql`excluded.wb_score`,
          distilledYear: sql`excluded.distilled_year`,
          bottledYear: sql`excluded.bottled_year`,
          caskType: sql`excluded.cask_type`,
          abv: sql`excluded.abv`,
          age: sql`excluded.age`,
          notFound: sql`excluded.not_found`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  } catch {
    // Der Speicher ist Beschleunigung, kein Zweck. Faellt er aus, laeuft der
    // Import unveraendert weiter — nur eben ohne Gedaechtnis.
  }
}
