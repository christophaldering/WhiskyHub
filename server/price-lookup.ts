// Verifizierter Preis-Lookup per echter Websuche (OpenAI Responses API mit
// web_search-Tool). Kein Modell-Raten: nur Preise mit klarer Quelle aus der
// Suche werden übernommen; ohne sicheren Treffer bleibt das Feld null.
// Muster (Chunking/Timeout/Retry) analog zu ./whiskybase-lookup.ts.
import { z } from "zod";

export interface PriceLookupItem {
  name: string;
  distillery?: string | null;
  age?: string | null;
  abv?: number | null;
}

export interface PriceLookupResult {
  priceRrp: number | null;
  priceRrpSource?: string | null;
  priceMarketSource?: string | null;
  priceMarket: number | null;
  priceCurrency: string | null;
}

// Kleine Pakete: die Websuche braucht pro Whisky mehrere Sekunden; große
// Pakete laufen in den Timeout (dann fehlen alle Preise des Pakets).
const LOOKUP_CHUNK_SIZE = 3;

const priceSchema = z.object({
  results: z.array(z.object({
    index: z.number().int().min(1),
    rrp: z.number().min(0).max(1000000).nullable().optional(),
    market: z.number().min(0).max(1000000).nullable().optional(),
    currency: z.string().trim().regex(/^[A-Za-z]{3}$/).nullable().optional(),
    rrpSource: z.string().trim().max(200).nullable().optional(),
    marketSource: z.string().trim().max(200).nullable().optional(),
  })),
});

function emptyResult(): PriceLookupResult {
  return { priceRrp: null, priceMarket: null, priceCurrency: null, priceRrpSource: null, priceMarketSource: null };
}

async function lookupChunk(
  client: any,
  items: PriceLookupItem[],
  timeoutMs: number,
): Promise<PriceLookupResult[]> {
  const out: PriceLookupResult[] = items.map(() => emptyResult());
  if (!client?.responses?.create) return out;

  const sys = "You research whisky bottle prices (0.7l standard bottle) using the web search tool. For each bottle find (a) the original recommended retail price (RRP/UVP) at release and (b) the current typical market price at reputable retailers or auction/secondary market. Only report a price when you actually found it in search results — NEVER guess or estimate. If unsure, return null. Reply ONLY with strict JSON.";
  const user = `For each whisky below, find the original RRP and the current market price. Prefer EUR; otherwise use the currency you found (3-letter ISO code). Round to whole numbers where sensible. Return null for anything you could not verify via web search.

Items:
${items.map((m, i) => `${i + 1}. name="${m.name}"${m.distillery ? `, distillery="${m.distillery}"` : ""}${m.age ? `, age="${m.age}"` : ""}${m.abv ? `, abv=${m.abv}` : ""}`).join("\n")}

Respond with JSON exactly in this shape (one entry per item, in the same order):
{"results":[{"index":<int>,"rrp":<number|null>,"market":<number|null>,"currency":<string|null>,"rrpSource":<string|null>,"marketSource":<string|null>}]}\n\nrrpSource/marketSource: the shop or site name where you found each price (e.g. "whiskybase.com", "The Whisky Exchange"). null if not found.`;

  const call = client.responses.create({
    model: process.env.AI_INTEGRATIONS_OPENAI_MODEL || "gpt-5-mini",
    tools: [{ type: "web_search" }],
    input: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
  }) as Promise<{ output_text?: string }>;

  const timeout = new Promise<never>((_, reject) => {
    const t = setTimeout(() => reject(new Error("price_lookup_timeout")), timeoutMs);
    (t as any).unref?.();
  });

  const res = await Promise.race([call, timeout]);
  const text = res.output_text || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return out;
  let parsedJson: unknown;
  try { parsedJson = JSON.parse(jsonMatch[0]); } catch { return out; }
  const parsed = priceSchema.safeParse(parsedJson);
  if (!parsed.success) return out;
  for (const r of parsed.data.results) {
    if (r.index >= 1 && r.index <= items.length) {
      const rrp = typeof r.rrp === "number" && isFinite(r.rrp) && r.rrp > 0 ? Math.round(r.rrp * 100) / 100 : null;
      const market = typeof r.market === "number" && isFinite(r.market) && r.market > 0 ? Math.round(r.market * 100) / 100 : null;
      const currency = (rrp !== null || market !== null) && r.currency ? r.currency.toUpperCase() : null;
      out[r.index - 1] = {
        priceRrp: rrp,
        priceMarket: market,
        priceCurrency: currency,
        priceRrpSource: typeof r.rrpSource === "string" ? r.rrpSource.slice(0, 120) : null,
        priceMarketSource: typeof r.marketSource === "string" ? r.marketSource.slice(0, 120) : null,
      };
    }
  }
  return out;
}

/**
 * Liefert pro Item UVP/Marktpreis/Währung oder null-Felder.
 * Fehler/Timeouts sind non-fatal: betroffene Items bleiben leer.
 */
export async function lookupPrices(
  client: any,
  items: PriceLookupItem[],
  opts: { timeoutMs?: number; maxItems?: number } = {},
): Promise<PriceLookupResult[]> {
  const timeoutMs = opts.timeoutMs ?? 60000;
  const maxItems = opts.maxItems ?? 60;
  const results: PriceLookupResult[] = items.map(() => emptyResult());
  const capped = items.slice(0, maxItems);

  const chunks: { start: number; items: PriceLookupItem[] }[] = [];
  for (let i = 0; i < capped.length; i += LOOKUP_CHUNK_SIZE) {
    chunks.push({ start: i, items: capped.slice(i, i + LOOKUP_CHUNK_SIZE) });
  }

  const settled = await Promise.allSettled(
    chunks.map((c) => lookupChunk(client, c.items, timeoutMs)),
  );
  const failed: { start: number; items: PriceLookupItem[] }[] = [];
  settled.forEach((s, ci) => {
    if (s.status === "fulfilled") {
      s.value.forEach((r, i) => { results[chunks[ci].start + i] = r; });
    } else {
      console.warn("[price-lookup] chunk failed (non-fatal):", (s.reason as any)?.message);
      failed.push(chunks[ci]);
    }
  });

  // Fehlgeschlagene Pakete einmal in Einzel-Häppchen wiederholen: seltene
  // Abfüllungen brauchen mehr Such-Zeit; kleinere Pakete bleiben unterm Timeout.
  if (failed.length > 0) {
    const retryChunks: { start: number; items: PriceLookupItem[] }[] = [];
    for (const f of failed) {
      for (let i = 0; i < f.items.length; i += 1) {
        retryChunks.push({ start: f.start + i, items: f.items.slice(i, i + 1) });
      }
    }
    const retried = await Promise.allSettled(
      retryChunks.map((c) => lookupChunk(client, c.items, timeoutMs)),
    );
    retried.forEach((s, ci) => {
      if (s.status === "fulfilled") {
        s.value.forEach((r, i) => { results[retryChunks[ci].start + i] = r; });
      } else {
        console.warn("[price-lookup] retry chunk failed (non-fatal):", (s.reason as any)?.message);
      }
    });
  }
  return results;
}
