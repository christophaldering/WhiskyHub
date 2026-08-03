// Whiskybase-Score-Lookup per echter Websuche (OpenAI Responses API mit
// web_search-Tool). Läuft NACH dem ID-Lookup und arbeitet auf bekannten IDs:
// eine ID hat genau eine Seite, die Suche ist dadurch deutlich einfacher als
// die Identifikation der Flasche. Kein Modell-Raten: nur Bewertungen, die in
// der Suche tatsächlich auf der Seite gefunden wurden, werden übernommen.
import { z } from "zod";

export interface WhiskybaseScoreItem {
  whiskybaseId: string;
  name?: string | null;
}

export interface WhiskybaseScoreOutcome {
  /** Community-Score 0-100 oder null. */
  wbScore: number | null;
  /** true = technischer Fehlschlag (Timeout), NICHT "keine Bewertung vorhanden". */
  failed: boolean;
}

const SCORE_CHUNK_SIZE = 4;

const scoreSchema = z.object({
  results: z.array(z.object({
    index: z.number().int().min(1),
    wbScore: z.number().min(0).max(100).nullable().optional(),
  })),
});

function emptyResult(): WhiskybaseScoreOutcome {
  return { wbScore: null, failed: false };
}

async function scoreChunk(
  client: any,
  items: WhiskybaseScoreItem[],
  timeoutMs: number,
): Promise<WhiskybaseScoreOutcome[]> {
  const out: WhiskybaseScoreOutcome[] = items.map(() => emptyResult());
  if (!client?.responses?.create) return out;

  const sys = "You look up the community rating of whiskies on Whiskybase.com using the web search tool. Each whisky page at https://www.whiskybase.com/whiskies/whisky/<ID> shows an overall rating out of 100. Report ONLY a rating you actually found on that page — NEVER guess, estimate or derive it from other sources. If the page shows no rating, or you cannot verify it, return null. Reply ONLY with strict JSON.";
  const user = `For each Whiskybase ID below, find the overall community rating (0-100) shown on its Whiskybase page. Return null when there is no rating or you could not verify it.

Items:
${items.map((m, i) => `${i + 1}. whiskybaseId="${m.whiskybaseId}"${m.name ? `, name="${m.name}"` : ""}`).join("\n")}

Respond with JSON exactly in this shape (one entry per item, in the same order):
{"results":[{"index":<int>,"wbScore":<number|null>}]}`;

  const call = client.responses.create({
    model: process.env.AI_INTEGRATIONS_OPENAI_MODEL || "gpt-5-mini",
    tools: [{ type: "web_search" }],
    input: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
  }) as Promise<{ output_text?: string }>;

  const timeout = new Promise<never>((_, reject) => {
    const t = setTimeout(() => reject(new Error("whiskybase_score_timeout")), timeoutMs);
    (t as any).unref?.();
  });

  const res = await Promise.race([call, timeout]);
  const text = res.output_text || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return out;
  let parsedJson: unknown;
  try { parsedJson = JSON.parse(jsonMatch[0]); } catch { return out; }
  const parsed = scoreSchema.safeParse(parsedJson);
  if (!parsed.success) return out;
  for (const r of parsed.data.results) {
    if (r.index >= 1 && r.index <= items.length) {
      const score = typeof r.wbScore === "number" && isFinite(r.wbScore) && r.wbScore > 0
        ? Math.round(r.wbScore * 100) / 100
        : null;
      out[r.index - 1] = { wbScore: score, failed: false };
    }
  }
  return out;
}

/**
 * Liefert pro Item den Whiskybase-Score oder null, plus ein Flag für
 * technische Fehlschläge. Fehler/Timeouts sind non-fatal.
 */
export async function lookupWhiskybaseScores(
  client: any,
  items: WhiskybaseScoreItem[],
  opts: { timeoutMs?: number; maxItems?: number } = {},
): Promise<WhiskybaseScoreOutcome[]> {
  const timeoutMs = opts.timeoutMs ?? 60000;
  const maxItems = opts.maxItems ?? 60;
  const results: WhiskybaseScoreOutcome[] = items.map(() => emptyResult());
  const capped = items.slice(0, maxItems);

  const chunks: { start: number; items: WhiskybaseScoreItem[] }[] = [];
  for (let i = 0; i < capped.length; i += SCORE_CHUNK_SIZE) {
    chunks.push({ start: i, items: capped.slice(i, i + SCORE_CHUNK_SIZE) });
  }

  const settled = await Promise.allSettled(
    chunks.map((c) => scoreChunk(client, c.items, timeoutMs)),
  );
  const failed: { start: number; items: WhiskybaseScoreItem[] }[] = [];
  settled.forEach((s, ci) => {
    if (s.status === "fulfilled") {
      s.value.forEach((r, i) => { results[chunks[ci].start + i] = r; });
    } else {
      console.warn("[whiskybase-score] chunk failed (non-fatal):", (s.reason as any)?.message);
      failed.push(chunks[ci]);
    }
  });

  // Fehlgeschlagene Pakete einzeln wiederholen — wie im ID-Lookup: ein zähes
  // Item reißt seine Nachbarn nicht mit.
  if (failed.length > 0) {
    const retryChunks: { start: number; items: WhiskybaseScoreItem[] }[] = [];
    for (const f of failed) {
      for (let i = 0; i < f.items.length; i += 1) {
        retryChunks.push({ start: f.start + i, items: f.items.slice(i, i + 1) });
      }
    }
    const retried = await Promise.allSettled(
      retryChunks.map((c) => scoreChunk(client, c.items, timeoutMs)),
    );
    retried.forEach((s, ci) => {
      const at = retryChunks[ci].start;
      if (s.status === "fulfilled") {
        s.value.forEach((r, i) => { results[at + i] = r; });
      } else {
        console.warn("[whiskybase-score] retry chunk failed (non-fatal):", (s.reason as any)?.message);
        results[at] = { wbScore: null, failed: true };
      }
    });
  }
  return results;
}
