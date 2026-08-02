import { z } from "zod";

// Lineup-Feinschliff: übersetzt eine Freitext-Anweisung des Hosts in eine
// neue Reihenfolge der erkannten Flaschen (inkl. optionaler Entfernungen),
// mit kurzer Begründung pro Änderung.

export interface RefineWhiskyInput {
  index: number;
  name: string;
  distillery?: string;
  age?: string;
  abv?: number | string | null;
  caskType?: string;
  region?: string;
  country?: string;
  category?: string;
  peatLevel?: string;
  wbScore?: number | string | null;
  price?: number | string | null;
}

export interface RefineResult {
  order: number[];
  removed: number[];
  reasons: Record<number, string>;
  summary: string;
}

const responseSchema = z.object({
  order: z.array(z.number().int().nonnegative()),
  removed: z.array(z.number().int().nonnegative()).default([]),
  changes: z
    .array(z.object({ index: z.number().int().nonnegative(), reason: z.string() }))
    .default([]),
  summary: z.string().default(""),
});

export function buildRefinePrompt(whiskies: RefineWhiskyInput[], instruction: string, language: string): { system: string; user: string } {
  const lang = language?.startsWith("de") ? "German" : "English";
  const system = `You are a whisky tasting dramaturgy expert. The host gives you the current lineup order of recognized bottles and an instruction in natural language (German or English). Re-order the lineup according to the instruction. You may also remove bottles when the instruction clearly asks for it (e.g. "remove everything under 46%", "limit to 12 bottles"). Never invent new bottles.

Consider classic tasting dramaturgy when the instruction is vague: lighter/lower ABV first, intensity rising, heavily peated bottles late so they don't overpower delicate ones, sherry bombs grouped or near the end, a memorable finale.

If the instruction is a review request (e.g. "check my order"), keep or minimally adjust the order and explain issues via change reasons.

Return ONLY JSON:
{
  "order": [<indices of the KEPT bottles in the NEW order, using the given "index" values>],
  "removed": [<indices of removed bottles, empty if none>],
  "changes": [{"index": <bottle index>, "reason": "<short reason why this bottle moved/was removed/stays, max ~90 chars>"}],
  "summary": "<1-2 sentence overall explanation>"
}
Rules:
- "order" plus "removed" must together contain EXACTLY the given indices, each exactly once.
- Provide a "changes" reason for every bottle whose position changed and every removed bottle.
- Write all reasons and the summary in ${lang}.`;
  const lines = whiskies.map(w =>
    `index=${w.index} | ${w.name}${w.distillery ? ` | ${w.distillery}` : ""}${w.age ? ` | ${w.age}y` : ""}${w.abv ? ` | ${w.abv}%` : ""}${w.caskType ? ` | cask: ${w.caskType}` : ""}${w.peatLevel ? ` | peat: ${w.peatLevel}` : ""}${w.region ? ` | ${w.region}` : ""}${w.country ? ` | ${w.country}` : ""}${w.wbScore ? ` | WB ${w.wbScore}` : ""}${w.price ? ` | ${w.price} EUR` : ""}`,
  );
  const user = `Current lineup order (top = first dram):\n${lines.join("\n")}\n\nHost instruction: ${instruction}`;
  return { system, user };
}

// Validiert die Modell-Antwort strikt gegen die Eingabe-Indizes.
// Wirft bei Inkonsistenz — der Aufrufer behandelt das als "kein Vorschlag".
export function parseRefineResponse(raw: string, inputIndices: number[]): RefineResult {
  let jsonText = raw.trim();
  const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) jsonText = fence[1].trim();
  const parsed = responseSchema.parse(JSON.parse(jsonText));

  const inputSet = new Set(inputIndices);
  const seen = new Set<number>();
  for (const idx of [...parsed.order, ...parsed.removed]) {
    if (!inputSet.has(idx) || seen.has(idx)) {
      throw new Error(`Refine response invalid: index ${idx} duplicated or unknown`);
    }
    seen.add(idx);
  }
  // Vergessene Indizes hinten anhängen statt Flaschen stillschweigend zu verlieren.
  const missing = inputIndices.filter(i => !seen.has(i));
  const order = [...parsed.order, ...missing];

  const reasons: Record<number, string> = {};
  for (const c of parsed.changes) {
    if (inputSet.has(c.index) && c.reason?.trim()) reasons[c.index] = c.reason.trim().slice(0, 200);
  }
  return { order, removed: parsed.removed, reasons, summary: parsed.summary.slice(0, 500) };
}
