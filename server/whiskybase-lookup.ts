// Verifizierter Whiskybase-ID-Lookup per echter Websuche (OpenAI Responses API
// mit web_search-Tool). Kein Modell-Raten: nur numerische IDs aus der Suche
// werden übernommen; ohne sicheren Treffer bleibt es bei null.
import { z } from "zod";

export interface WhiskybaseLookupItem {
  name: string;
  distillery?: string | null;
}

export const WHISKYBASE_URL_PREFIX = "https://www.whiskybase.com/whiskies/whisky/";

// Kleine Pakete: die Websuche braucht pro Whisky mehrere Sekunden; große
// Pakete liefen in Produktion in den Timeout (alle Links fehlten dann).
const LOOKUP_CHUNK_SIZE = 4;

const lookupSchema = z.object({
  results: z.array(z.object({
    index: z.number().int().min(1),
    whiskybaseId: z.string().trim().regex(/^\d+$/).max(20).nullable().optional(),
  })),
});

async function lookupChunk(
  client: any,
  items: WhiskybaseLookupItem[],
  timeoutMs: number,
): Promise<(string | null)[]> {
  const out: (string | null)[] = items.map(() => null);
  if (!client?.responses?.create) return out;

  const lookupSys = "You look up Whiskybase.com IDs for whiskies using the web. A Whiskybase ID is the numeric segment in URLs like https://www.whiskybase.com/whiskies/whisky/<ID>/<slug>. Use the web search tool. Reply ONLY with strict JSON.";
  const lookupUser = `For each item below, find the most likely matching Whiskybase.com whisky page and return its numeric ID. If you cannot find a confident match, return null for that item.

Items:
${items.map((m, i) => `${i + 1}. name="${m.name}"${m.distillery ? `, distillery="${m.distillery}"` : ""}`).join("\n")}

Respond with JSON exactly in this shape (one entry per item, in the same order):
{"results":[{"index":<int>,"whiskybaseId":<string|null>}]}`;

  const call = client.responses.create({
    model: process.env.AI_INTEGRATIONS_OPENAI_MODEL || "gpt-5-mini",
    tools: [{ type: "web_search" }],
    input: [
      { role: "system", content: lookupSys },
      { role: "user", content: lookupUser },
    ],
  }) as Promise<{ output_text?: string }>;

  const timeout = new Promise<never>((_, reject) => {
    const t = setTimeout(() => reject(new Error("whiskybase_lookup_timeout")), timeoutMs);
    (t as any).unref?.();
  });

  const res = await Promise.race([call, timeout]);
  const text = res.output_text || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return out;
  const parsed = lookupSchema.safeParse(JSON.parse(jsonMatch[0]));
  if (!parsed.success) return out;
  for (const r of parsed.data.results) {
    if (r.index >= 1 && r.index <= items.length) {
      const id = (r.whiskybaseId || "").trim();
      if (id) out[r.index - 1] = id;
    }
  }
  return out;
}

/**
 * Liefert pro Item die Whiskybase-ID (string) oder null.
 * Fehler/Timeouts sind non-fatal: betroffene Items bleiben null.
 */
export async function lookupWhiskybaseIds(
  client: any,
  items: WhiskybaseLookupItem[],
  opts: { timeoutMs?: number; maxItems?: number } = {},
): Promise<(string | null)[]> {
  const timeoutMs = opts.timeoutMs ?? 25000;
  const maxItems = opts.maxItems ?? 60;
  const results: (string | null)[] = items.map(() => null);
  const capped = items.slice(0, maxItems);

  const chunks: { start: number; items: WhiskybaseLookupItem[] }[] = [];
  for (let i = 0; i < capped.length; i += LOOKUP_CHUNK_SIZE) {
    chunks.push({ start: i, items: capped.slice(i, i + LOOKUP_CHUNK_SIZE) });
  }

  const settled = await Promise.allSettled(
    chunks.map((c) => lookupChunk(client, c.items, timeoutMs)),
  );
  const failed: { start: number; items: WhiskybaseLookupItem[] }[] = [];
  settled.forEach((s, ci) => {
    if (s.status === "fulfilled") {
      s.value.forEach((id, i) => { results[chunks[ci].start + i] = id; });
    } else {
      console.warn("[whiskybase-lookup] chunk failed (non-fatal):", (s.reason as any)?.message);
      failed.push(chunks[ci]);
    }
  });

  // Fehlgeschlagene Pakete einmal in Zweier-Häppchen wiederholen: seltene
  // Abfüllungen brauchen mehr Such-Zeit; kleinere Pakete bleiben unterm Timeout.
  if (failed.length > 0) {
    const retryChunks: { start: number; items: WhiskybaseLookupItem[] }[] = [];
    for (const f of failed) {
      for (let i = 0; i < f.items.length; i += 2) {
        retryChunks.push({ start: f.start + i, items: f.items.slice(i, i + 2) });
      }
    }
    const retried = await Promise.allSettled(
      retryChunks.map((c) => lookupChunk(client, c.items, timeoutMs)),
    );
    retried.forEach((s, ci) => {
      if (s.status === "fulfilled") {
        s.value.forEach((id, i) => { results[retryChunks[ci].start + i] = id; });
      } else {
        console.warn("[whiskybase-lookup] retry chunk failed (non-fatal):", (s.reason as any)?.message);
      }
    });
  }
  return results;
}
