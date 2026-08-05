// Konsolidierter Whiskybase-Lookup: findet ID, Score und verfuegbare Felder
// in EINEM Websuche-Aufruf pro Flasche. Ersetzt whiskybase-lookup.ts und
// whiskybase-score.ts. Die alten Dateien bleiben als Rollback-Sicherheit
// erhalten, werden aber nicht mehr aufgerufen.

import { z } from "zod";

export const WHISKYBASE_URL_PREFIX =
  "https://www.whiskybase.com/whiskies/whisky/";

export interface WbLookupItem {
  name: string;
  distillery?: string | null;
  /** Zusaetzliche Merkmale aus der Bildanalyse. Sie schaerfen die Suche
   *  erheblich: "Ledaig 24" findet vieles, "Ledaig 24, 53.5%, Cask 207"
   *  genau eine Flasche. */
  age?: string | null;
  abv?: string | null;
  caskType?: string | null;
  bottledYear?: string | null;
}

export interface WbLookupOutcome {
  whiskybaseId: string | null;
  whiskybaseUrl: string | null;
  wbScore: number | null;
  // Felder, die WB zurueckliefert und das Etikett ergaenzen koennen:
  distilledYear: string | null;
  bottledYear: string | null;
  caskType: string | null;
  abv: string | null;
  age: string | null;
  /** true = technischer Fehlschlag (Timeout), nicht "nicht gefunden" */
  failed: boolean;
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
      wbScore: z.number().min(0).max(100).nullable().optional(),
      distilledYear: z.string().nullable().optional(),
      bottledYear: z.string().nullable().optional(),
      caskType: z.string().nullable().optional(),
      abv: z.string().nullable().optional(),
      age: z.string().nullable().optional(),
    }),
  ),
});

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
  if (!m) return null;
  try { return chunkSchema.parse(JSON.parse(m[0])); } catch { return null; }
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

SEARCH STRATEGY:
- Start with a site-restricted search: site:whiskybase.com followed by distillery, age and any cask number.
- Independent bottlings are often listed under the DISTILLERY name, not the bottler's series name. If "Cask Hound Bowmore 2000" finds nothing, try "Bowmore 2000" plus the ABV.
- A cask number in the name (e.g. "Cask #207") is the strongest identifier — always include it.
- If the first search fails, try a second one with fewer terms before giving up.

CRITICAL RULES:
- ONLY report values you actually found on a Whiskybase page — NEVER guess
- If multiple bottlings match, pick the one with the highest score or most ratings
- If no confident match found, return whiskybaseId: null
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
{"results":[{"index":<int>,"whiskybaseId":"<string|null>","wbScore":<number|null>,"distilledYear":"<string|null>","bottledYear":"<string|null>","caskType":"<string|null>","abv":"<string|null>","age":"<string|null>"}]}`;

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

  const res = await Promise.race([call, timeout]);
  const parsed = parseText(res.output_text || "");
  if (!parsed) return out;

  for (const r of parsed.results) {
    if (r.index < 1 || r.index > items.length) continue;
    const idx = r.index - 1;
    const id = (r.whiskybaseId ?? "").toString().trim();
    const validId = /^\d+$/.test(id) ? id : null;
    out[idx] = {
      whiskybaseId: validId,
      whiskybaseUrl: validId
        ? `${WHISKYBASE_URL_PREFIX}${validId}`
        : null,
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
        results[at] = { ...emptyOutcome(), failed: true };
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
