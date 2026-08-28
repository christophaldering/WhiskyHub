// Konsolidierter Whiskybase-Lookup: findet ID, Score und verfuegbare Felder
// in EINEM Websuche-Aufruf pro Flasche. Ersetzt whiskybase-lookup.ts und
// whiskybase-score.ts. Die alten Dateien bleiben als Rollback-Sicherheit
// erhalten, werden aber nicht mehr aufgerufen.

import { z } from "zod";
import { logAIUsage } from "./ai-settings";

export const WHISKYBASE_URL_PREFIX =
  "https://www.whiskybase.com/whiskies/whisky/";

export interface WbLookupItem {
  name: string;
  distillery?: string | null;
  /** Zusaetzliche Merkmale aus der Bildanalyse. Sie schaerfen die Suche
   *  erheblich: "Ledaig 24" findet vieles, "Ledaig 24, 53.5%, Cask 207"
   *  genau eine Flasche.
   *  Zugleich sind sie die Pruefsteine: was der Treffer davon abweichend
   *  meldet, fuehrt zur Ablehnung (siehe checkMatch). */
  age?: string | null;
  abv?: string | null;
  caskType?: string | null;
  bottledYear?: string | null;
  distilledYear?: string | null;
  bottler?: string | null;
  /** Gebindegroesse in Millilitern. Fehlt sie, wird 700 angenommen —
   *  damit faellt eine 200-ml-Miniatur als Treffer heraus. */
  sizeMl?: number | null;
}

/**
 * Ergebnis der Aufloesung. Bewusst mit einem dritten Zustand:
 *  confirmed  — Treffer gefunden und gegen die Ausgangsmerkmale geprueft
 *  ambiguous  — mehrere Kandidaten, kein trennendes Merkmal
 *  rejected   — ein Treffer kam zurueck, widerspricht aber den Ausgangsdaten
 *  not_found  — nichts gefunden
 *  failed     — technischer Fehlschlag (Zeitueberschreitung)
 *
 * "ambiguous" und "rejected" sind der Kern der Korrektur: ein leeres Feld
 * mit zwei Kandidaten ist fuer die Qualitaetssicherung wertvoller als ein
 * plausibler Fehltreffer — der wird naemlich nicht geprueft, weil er
 * plausibel aussieht.
 */
export type WbResolutionStatus =
  | "confirmed" | "ambiguous" | "rejected" | "not_found" | "failed";

export interface WbLookupOutcome {
  whiskybaseId: string | null;
  whiskybaseUrl: string | null;
  wbScore: number | null;
  // Felder, die WB zurueckliefert und das Etikett ergaenzen koennen.
  // Sie sind nur dann gesetzt, wenn der Treffer die Pruefung bestanden hat —
  // ein abgelehnter Treffer darf die Ausgangsdaten nicht ueberschreiben.
  distilledYear: string | null;
  bottledYear: string | null;
  caskType: string | null;
  abv: string | null;
  age: string | null;
  /** true = technischer Fehlschlag (Timeout), nicht "nicht gefunden" */
  failed: boolean;
  // --- ab hier optional, damit bestehende Aufrufer unveraendert bleiben ---
  status?: WbResolutionStatus;
  bottler?: string | null;
  sizeMl?: number | null;
  /** Grund der Ablehnung, im Klartext fuer Log und Admin-Oberflaeche. */
  rejectedReason?: string | null;
  /** IDs, zwischen denen nicht entschieden werden konnte. */
  candidateIds?: string[];
}

// Lookup fuer eine bekannte ID (manueller Lookup im Bearbeiten-Dialog).
export interface WbIdLookupOutcome {
  found: boolean;
  name?: string;
  distillery?: string;
  age?: string;
  abv?: string;
  caskType?: string;
  region?: string;
  country?: string;
  peatLevel?: string;
  distilledYear?: string;
  bottledYear?: string;
  bottler?: string;
  wbScore?: number | null;
}

const CHUNK_SIZE = 4;
const TIMEOUT_MS = 60000;

const chunkSchema = z.object({
  results: z.array(
    z.object({
      index: z.number().int().min(1),
      whiskybaseId: z.string().nullable().optional(),
      /** Modell meldet selbst Uneindeutigkeit. */
      ambiguous: z.boolean().nullable().optional(),
      candidateIds: z.array(z.string()).nullable().optional(),
      wbScore: z.number().min(0).max(100).nullable().optional(),
      distilledYear: z.string().nullable().optional(),
      bottledYear: z.string().nullable().optional(),
      caskType: z.string().nullable().optional(),
      abv: z.string().nullable().optional(),
      age: z.string().nullable().optional(),
      bottler: z.string().nullable().optional(),
      sizeMl: z.number().nullable().optional(),
    }),
  ),
});

// ---------------------------------------------------------------------------
// Validierungs-Gate
//
// Die Merkmale der gesuchten Flasche werden dem Modell mitgegeben, wurden
// bisher aber nie gegen die Antwort geprueft. Die einzige Pruefung war
// /^\d+$/ — also "besteht aus Ziffern", nicht "gehoert zu dieser Flasche".
// Ein Treffer mit 43,0 % auf eine Suche mit 57,1 % kam dadurch anstandslos
// durch. Die folgenden Funktionen schliessen genau diese Luecke; sie sind
// rein und ohne I/O, damit sie direkt testbar sind.
// ---------------------------------------------------------------------------

/** Abweichung, die noch als "derselbe Wert" gilt. WB fuehrt eine Nachkommastelle. */
export const ABV_TOLERANCE = 0.1;

/** Angenommene Gebindegroesse, wenn nichts anderes bekannt ist. */
export const DEFAULT_SIZE_ML = 700;

/**
 * Bekannte Namensdrift bei Abfuellern. Ohne diese Tabelle wuerde das Gate
 * legitime Treffer wegwerfen, weil dieselbe Firma auf zwei Etiketten
 * unterschiedlich heisst.
 */
const BOTTLER_ALIASES: Record<string, string[]> = {
  "van wees": ["the ultimate whisky company", "the ultimate", "vw"],
  "the cask hound": ["the caskhound", "tcah", "exquisite casks"],
  "anam na h-alba": ["anha"],
  "duncan taylor": ["battlehill", "battlehill scotch whisky co"],
  "whisky & life": ["unbound", "whisky for life"],
};

function normalizeName(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9&]+/g, " ").trim();
}

/** Fuehrt einen Abfuellernamen auf seine kanonische Form zurueck. */
export function canonicalBottler(s: string | null | undefined): string {
  const n = normalizeName(String(s ?? ""));
  if (!n) return "";
  for (const [canonical, aliases] of Object.entries(BOTTLER_ALIASES)) {
    if (n === normalizeName(canonical)) return normalizeName(canonical);
    if (aliases.some((a) => normalizeName(a) === n)) return normalizeName(canonical);
  }
  return n;
}

export function sameBottler(a: string | null | undefined, b: string | null | undefined): boolean {
  const ca = canonicalBottler(a);
  const cb = canonicalBottler(b);
  if (!ca || !cb) return true; // unbekannt heisst nicht widersprochen
  return ca === cb;
}

/** "57,1 %" / "57.1" / "abv 57.1%" -> 57.1 */
export function parseAbv(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  const m = String(v).replace(",", ".").match(/\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return isFinite(n) ? n : null;
}

/** "14" / "14 Jahre" / "NAS" -> 14 | "NAS" | null */
export function parseAge(v: string | number | null | undefined): number | "NAS" | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^n\.?a\.?s\.?$/i.test(s) || /no age statement/i.test(s)) return "NAS";
  const m = s.match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return isFinite(n) ? n : null;
}

/** "2007" / "15.03.2007" / "2007-03-15" -> 2007 */
export function parseYear(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const m = String(v).match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

/** Die Felder eines Whiskybase-Treffers, soweit sie geprueft werden. */
export interface WbCandidateFields {
  abv?: string | number | null;
  age?: string | number | null;
  bottledYear?: string | number | null;
  distilledYear?: string | number | null;
  bottler?: string | null;
  sizeMl?: number | null;
}

/**
 * Prueft einen Treffer gegen die Merkmale der gesuchten Flasche.
 *
 * Rueckgabe: null = bestanden, sonst der Grund der Ablehnung im Klartext.
 *
 * Grundsatz: geprueft wird nur, wo BEIDE Seiten einen Wert haben. Ein
 * fehlendes Merkmal ist kein Widerspruch — sonst wuerde die Pruefung genau
 * die duenn beschrifteten Einzelfassabfuellungen aussortieren, um die es geht.
 */
export function checkMatch(src: WbLookupItem, found: WbCandidateFields): string | null {
  const sAbv = parseAbv(src.abv);
  const fAbv = parseAbv(found.abv);
  if (sAbv != null && fAbv != null && Math.abs(sAbv - fAbv) > ABV_TOLERANCE) {
    return `ABV ${sAbv} statt ${fAbv}`;
  }

  const sAge = parseAge(src.age);
  const fAge = parseAge(found.age);
  if (sAge != null && fAge != null && sAge !== fAge) {
    return `Alter ${sAge} statt ${fAge}`;
  }

  const sBottled = parseYear(src.bottledYear);
  const fBottled = parseYear(found.bottledYear);
  if (sBottled != null && fBottled != null && sBottled !== fBottled) {
    return `Abfuelljahr ${sBottled} statt ${fBottled}`;
  }

  const sDistilled = parseYear(src.distilledYear);
  const fDistilled = parseYear(found.distilledYear);
  if (sDistilled != null && fDistilled != null && sDistilled !== fDistilled) {
    return `Destillationsjahr ${sDistilled} statt ${fDistilled}`;
  }

  if (src.bottler && found.bottler && !sameBottler(src.bottler, found.bottler)) {
    return `Abfueller "${src.bottler}" statt "${found.bottler}"`;
  }

  const expectedSize = src.sizeMl ?? DEFAULT_SIZE_ML;
  if (found.sizeMl != null && found.sizeMl !== expectedSize) {
    return `Gebinde ${found.sizeMl} ml statt ${expectedSize} ml`;
  }

  return null;
}

const idLookupSchema = z.object({
  found: z.boolean(),
  name: z.string().optional(),
  distillery: z.string().optional(),
  age: z.string().optional(),
  abv: z.string().optional(),
  caskType: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  peatLevel: z.string().optional(),
  distilledYear: z.string().optional(),
  bottledYear: z.string().optional(),
  bottler: z.string().optional(),
  wbScore: z.number().nullable().optional(),
});

function emptyOutcome(): WbLookupOutcome {
  return {
    whiskybaseId: null, whiskybaseUrl: null, wbScore: null,
    distilledYear: null, bottledYear: null, caskType: null,
    abv: null, age: null, failed: false,
  };
}

function parseText(text: string): z.infer<typeof chunkSchema> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) {
    console.warn("[wb-lookup] keine JSON-Antwort. Anfang:", text.slice(0, 300));
    return null;
  }
  try {
    return chunkSchema.parse(JSON.parse(m[0]));
  } catch (e: any) {
    console.warn("[wb-lookup] Antwort nicht auswertbar:", String(e?.message || e).slice(0, 200), "| Anfang:", m[0].slice(0, 300));
    return null;
  }
}

async function lookupChunk(
  client: any,
  items: WbLookupItem[],
  timeoutMs: number,
): Promise<WbLookupOutcome[]> {
  const out: WbLookupOutcome[] = items.map(() => emptyOutcome());
  if (!client?.responses?.create) return out;

  const sys = `You search Whiskybase.com using the web_search tool to find whisky bottlings.
For each whisky, find its Whiskybase page and extract:
- whiskybaseId: the numeric ID from the URL (/whisky/<ID>/)
- wbScore: the Overall rating shown on the page (0-100), or null if not yet rated
- distilledYear: year of distillation only (e.g. "2007"), null if unknown
- bottledYear: year of bottling only (e.g. "2021"), null if unknown
- caskType: cask type as shown on WB (e.g. "Tawny Port Wine Barrique"), null if unknown
- abv: alcohol percentage as shown (e.g. "57.1"), null if unknown
- age: age statement in years (e.g. "14"), or "NAS", null if unknown
- bottler: the bottler as shown on the page, null if unknown
- sizeMl: bottle size in millilitres as shown (e.g. 700, 200), null if not stated

SEARCH STRATEGY:
- Start with a site-restricted search: site:whiskybase.com followed by distillery, age and any cask number.
- Independent bottlings are often listed under the DISTILLERY name, not the bottler's series name. If "Cask Hound Bowmore 2000" finds nothing, try "Bowmore 2000" plus the ABV.
- A cask number in the name (e.g. "Cask #207") is the strongest identifier — always include it.
- If the first search fails, try a second one with fewer terms before giving up.

CRITICAL RULES:
- ONLY report values you actually found on a Whiskybase page — NEVER guess
- If several bottlings match and you CANNOT tell them apart by cask number, ABV,
  bottling date or distillation date, then return whiskybaseId: null,
  ambiguous: true, and list the candidate IDs in candidateIds.
  NEVER decide by rating score or number of votes: the better known batch is not
  the same thing as the right bottle, and a wrong ID that looks plausible is worse
  than an empty field, because nobody checks it.
- If no confident match found, return whiskybaseId: null
- Report every field exactly as the page shows it. Never adjust a value to make it
  agree with the request — a disagreement is useful information, not an error.
- Reply ONLY with strict JSON, no markdown`;

  const user = `Find each whisky on Whiskybase.com and extract the data fields.

Items:
${items.map((m, i) => {
  const extra = [
    m.distillery ? `distillery="${m.distillery}"` : "",
    m.age ? `age="${m.age}"` : "",
    m.abv ? `abv="${m.abv}"` : "",
    m.caskType ? `cask="${m.caskType}"` : "",
    m.bottledYear ? `bottled="${m.bottledYear}"` : "",
  ].filter(Boolean).join(", ");
  return `${i + 1}. name="${m.name}"${extra ? `, ${extra}` : ""}`;
}).join("\n")}

Return JSON exactly:
{"results":[{"index":<int>,"whiskybaseId":"<string|null>","ambiguous":<bool>,"candidateIds":[<string>],"wbScore":<number|null>,"distilledYear":"<string|null>","bottledYear":"<string|null>","caskType":"<string|null>","abv":"<string|null>","age":"<string|null>","bottler":"<string|null>","sizeMl":<number|null>}]}`;

  const call = client.responses.create({
    model: process.env.AI_INTEGRATIONS_OPENAI_MODEL || "gpt-5-mini",
    tools: [{ type: "web_search" }],
    input: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
  }) as Promise<{ output_text?: string }>;

  const timeout = new Promise<never>((_, reject) => {
    const t = setTimeout(
      () => reject(new Error("wb_unified_timeout")),
      timeoutMs,
    );
    (t as any).unref?.();
  });

  let res: { output_text?: string };
  try {
    res = await Promise.race([call, timeout]);
  } catch (e: any) {
    console.warn("[wb-lookup] API-Fehler:", String(e?.message || e).slice(0, 200));
    throw e;
  }
  logAIUsage("anonymous", "wb_lookup", {
    model: process.env.AI_INTEGRATIONS_OPENAI_MODEL || "gpt-5-mini",
    tokensIn: (res as any)?.usage?.input_tokens ?? null,
    tokensOut: (res as any)?.usage?.output_tokens ?? null,
  });
  const parsed = parseText(res.output_text || "");
  if (!parsed) return out;
  console.log(`[wb-lookup] Paket ausgewertet: ${parsed.results.length} Antworten fuer ${items.length} Flaschen, davon mit ID: ${parsed.results.filter(r => r.whiskybaseId).length}`);

  for (const r of parsed.results) {
    if (r.index < 1 || r.index > items.length) continue;
    const idx = r.index - 1;
      const src = items[idx];
    const id = (r.whiskybaseId ?? "").toString().trim();
    const validId = /^\d+$/.test(id) ? id : null;
      const candidateIds = (r.candidateIds ?? []).filter((c) => /^\d+$/.test(String(c).trim()));

      // Fall 1: das Modell meldet selbst Uneindeutigkeit. Dann bleibt das Feld
      // leer und die Kandidaten werden weitergereicht — die Entscheidung
      // gehoert an einen Menschen, nicht an den Zufall.
      if (!validId || r.ambiguous === true) {
        out[idx] = {
          ...emptyOutcome(),
          status: r.ambiguous === true || candidateIds.length > 1 ? "ambiguous" : "not_found",
          candidateIds,
        };
        if (out[idx].status === "ambiguous") {
          console.log(`[wb-lookup] uneindeutig: "${src.name}" — Kandidaten ${candidateIds.join(", ") || "unbenannt"}`);
        }
        continue;
      }

      // Fall 2: ein Treffer kam zurueck. Bevor er uebernommen wird, muss er
      // zu den Merkmalen passen, mit denen gesucht wurde.
      const reason = checkMatch(src, {
        abv: r.abv, age: r.age,
        bottledYear: r.bottledYear, distilledYear: r.distilledYear,
        bottler: r.bottler, sizeMl: r.sizeMl,
      });
      if (reason) {
        console.log(`[wb-lookup] verworfen: "${src.name}" -> WB ${validId} (${reason})`);
        out[idx] = {
          ...emptyOutcome(),
          status: "rejected",
          rejectedReason: reason,
          candidateIds: [validId],
        };
        continue;
      }

      // Fall 3: bestanden. Erst jetzt duerfen die WB-Werte die Ausgangsdaten
      // ergaenzen — sie widersprechen ihnen nachweislich nicht mehr.
    out[idx] = {
      whiskybaseId: validId,
        whiskybaseUrl: `${WHISKYBASE_URL_PREFIX}${validId}`,
      wbScore:
        typeof r.wbScore === "number" && isFinite(r.wbScore) && r.wbScore > 0
          ? Math.round(r.wbScore * 100) / 100
          : null,
      distilledYear: r.distilledYear ?? null,
      bottledYear: r.bottledYear ?? null,
      caskType: r.caskType ?? null,
      abv: r.abv ?? null,
      age: r.age ?? null,
      failed: false,
        status: "confirmed",
        bottler: r.bottler ?? null,
        sizeMl: r.sizeMl ?? null,
        rejectedReason: null,
        candidateIds: [],
    };
  }
  return out;
}

/**
 * Batch-Lookup: findet pro Item ID, Score und verfuegbare Felder.
 * Einzelretry bei Timeout (analog whiskybase-lookup.ts).
 */
export async function lookupWhiskiesOnWb(
  client: any,
  items: WbLookupItem[],
  opts: { timeoutMs?: number; maxItems?: number } = {},
): Promise<WbLookupOutcome[]> {
  const timeoutMs = opts.timeoutMs ?? TIMEOUT_MS;
  const maxItems = opts.maxItems ?? 60;
  const results: WbLookupOutcome[] = items.map(() => emptyOutcome());
  const capped = items.slice(0, maxItems);

  const chunks: { start: number; items: WbLookupItem[] }[] = [];
  for (let i = 0; i < capped.length; i += CHUNK_SIZE) {
    chunks.push({ start: i, items: capped.slice(i, i + CHUNK_SIZE) });
  }

  const settled = await Promise.allSettled(
    chunks.map((c) => lookupChunk(client, c.items, timeoutMs)),
  );
  const failed: { start: number; items: WbLookupItem[] }[] = [];
  settled.forEach((s, ci) => {
    if (s.status === "fulfilled") {
      s.value.forEach((r, i) => { results[chunks[ci].start + i] = r; });
    } else {
      console.warn("[wb-unified] chunk failed:", (s.reason as any)?.message);
      failed.push(chunks[ci]);
    }
  });

  if (failed.length > 0) {
    const retryChunks: { start: number; items: WbLookupItem[] }[] = [];
    for (const f of failed) {
      for (let i = 0; i < f.items.length; i += 1) {
        retryChunks.push({ start: f.start + i, items: f.items.slice(i, i + 1) });
      }
    }
    const retried = await Promise.allSettled(
      retryChunks.map((c) => lookupChunk(client, c.items, timeoutMs)),
    );
    retried.forEach((s, ci) => {
      const at = retryChunks[ci].start;
      if (s.status === "fulfilled") {
        s.value.forEach((r, i) => { results[at + i] = r; });
      } else {
        console.warn("[wb-unified] retry failed:", (s.reason as any)?.message);
        results[at] = { ...emptyOutcome(), failed: true, status: "failed" };
      }
    });
  }
  return results;
}

/**
 * Einzellookup fuer bekannte ID (manueller Lookup im Bearbeiten-Dialog).
 * Benutzt Websuche statt Modellgedaechtnis.
 */
export async function lookupWbById(
  client: any,
  wbId: string,
  timeoutMs = TIMEOUT_MS,
): Promise<WbIdLookupOutcome> {
  if (!client?.responses?.create) return { found: false };

  const sys = `You search Whiskybase.com for a specific whisky page by its numeric ID.
The page URL is: https://www.whiskybase.com/whiskies/whisky/${wbId}
Search for this exact URL and extract all available data.
ONLY report values actually shown on that page. NEVER guess or invent data.
Reply ONLY with strict JSON.`;

  const user = `Find the Whiskybase page for ID ${wbId} and return all available fields.
Return JSON:
{"found":true,"name":"...","distillery":"...","age":"...","abv":"...","caskType":"...","region":"...","country":"...","peatLevel":"...","distilledYear":"...","bottledYear":"...","bottler":"...","wbScore":<number|null>}
If page not found or no data: {"found":false}`;

  try {
    const call = client.responses.create({
      model: process.env.AI_INTEGRATIONS_OPENAI_MODEL || "gpt-5-mini",
      tools: [{ type: "web_search" }],
      input: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    }) as Promise<{ output_text?: string }>;

    const timeout = new Promise<never>((_, reject) => {
      const t = setTimeout(
        () => reject(new Error("wb_id_lookup_timeout")),
        timeoutMs,
      );
      (t as any).unref?.();
    });

    const res = await Promise.race([call, timeout]);
    const text = res.output_text || "";
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return { found: false };
    const raw = JSON.parse(m[0]);
    const parsed = idLookupSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.found) return { found: false };
    return parsed.data as WbIdLookupOutcome;
  } catch {
    return { found: false };
  }
}
