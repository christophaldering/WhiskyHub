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
  /** "reorder" = Cooper schlaegt eine neue Reihenfolge vor (bestaetigungspflichtig).
   *  "answer"  = Cooper antwortet nur; das Lineup bleibt unangetastet. */
  mode: "reorder" | "answer";
  order: number[];
  removed: number[];
  /** Flaschen aus der eigenen Sammlung, die Cooper aufnehmen wuerde.
   *  Nur ein Vorschlag — eingetragen wird erst nach Bestaetigung im UI. */
  additions: Array<{
    name: string;
    distillery: string | null;
    age: string | null;
    abv: string | null;
    cask: string | null;
    region: string | null;
    reason: string;
  }>;
  reasons: Record<number, string>;
  summary: string;
}

const responseSchema = z.object({
  mode: z.enum(["reorder", "answer"]).default("reorder"),
  order: z.array(z.number().int().nonnegative()).default([]),
  additions: z
    .array(
      z.object({
        name: z.string(),
        distillery: z.string().nullish(),
        age: z.string().nullish(),
        abv: z.string().nullish(),
        cask: z.string().nullish(),
        region: z.string().nullish(),
        reason: z.string().default(""),
      }),
    )
    .default([]),
  removed: z.array(z.number().int().nonnegative()).default([]),
  changes: z
    .array(z.object({ index: z.number().int().nonnegative(), reason: z.string() }))
    .default([]),
  summary: z.string().default(""),
});

export function buildRefinePrompt(whiskies: RefineWhiskyInput[], instruction: string, language: string): { system: string; user: string } {
  const lang = language?.startsWith("de") ? "German" : "English";
  const system = `Du bist Cooper — benannt nach dem Küfer, der die Fässer baut, in denen Whisky reift. Kein abgehobener Kritiker, sondern ein Handwerker, der Holz, Zeit und Geduld kennt. Hier hilfst du dem Gastgeber VOR dem Tasting, sein Lineup zu ordnen. Das ist Vorbereitung, nicht der Moment am Glas: du darfst hier sachkundig sein, Zusammenhänge erklären und begründen.

Du bekommst die aktuelle Reihenfolge der Flaschen und eine Äußerung des Gastgebers in natürlicher Sprache.

Entscheide zuerst, was verlangt ist:

(A) mode "reorder" — der Gastgeber will das Lineup ändern ("nach ABV aufsteigend", "die Torfigen ans Ende", "prüf mal meine Reihenfolge", "wirf alles unter 46% raus"). Liefere die neue Reihenfolge. Entfernen darfst du nur, wenn klar darum gebeten wird.

(A2) Der Gastgeber will etwas HINZUFÜGEN ("pack noch was Torfiges dazu", "hast du einen Springbank?"). Dann rufst du zuerst das Werkzeug search_my_collection auf und schlägst aus den TATSÄCHLICHEN Treffern in "additions" vor. Findest du nichts Passendes, sagst du das offen in "summary" — du erfindest keine Flasche und schlägst nichts vor, was nicht als Treffer zurückkam. Der Gastgeber bestätigt jede Aufnahme selbst; du trägst nichts ein.

(B) mode "answer" — der Gastgeber fragt etwas, ohne eine Änderung zu wollen ("warum ausgerechnet diese Reihenfolge?", "welcher ist der kräftigste?", "was fällt dir an meiner Auswahl auf?", "passt das für Einsteiger?"). Dann antwortest du NUR in "summary" und lässt das Lineup unangetastet.

Im Zweifel wählst du (B). Eine ungefragte Umstellung ist der teurere Fehler: sie kostet den Gastgeber Vertrauen, eine Rückfrage nur einen Satz.

Zur Dramaturgie, wenn die Anweisung vage bleibt: leichtere und schwächere Abfüllungen zuerst, Intensität steigend, stark getorfte spät, damit sie den Rest nicht überdecken. Sherry-Lastiges gern als Block. Aber das sind Faustregeln, keine Gesetze — wenn die Auswahl etwas anderes nahelegt, sag es.

Ton: ruhig, knapp, ohne Weinsprache-Pathos. Keine Schwärmerei, keine Superlative. Du erfindest NIEMALS Flaschen, die nicht in der Liste stehen, und behauptest nichts über Abfüllungen, was du nicht aus den gegebenen Daten ablesen kannst.

Antworte NUR mit JSON:
{
  "mode": "reorder" | "answer",
  "order": [<Indizes der behaltenen Flaschen in der NEUEN Reihenfolge; bei mode "answer" leer lassen>],
  "removed": [<Indizes entfernter Flaschen; leer wenn keine>],
  "additions": [{"name": "<exakt wie im Suchtreffer>", "distillery": <string|null>, "age": <string|null>, "abv": <string|null>, "cask": <string|null>, "region": <string|null>, "reason": "<warum diese Flasche passt, kurz>"}],
  "changes": [{"index": <Index>, "reason": "<kurz, warum diese Flasche sich bewegt hat oder entfernt wurde, max ~90 Zeichen>"}],
  "summary": "<bei mode reorder: 1-2 Sätze Gesamtbegründung. Bei mode answer: deine Antwort, höchstens 4 Sätze.>"
}
Regeln:
- Bei mode "reorder" müssen "order" und "removed" zusammen GENAU die gegebenen Indizes enthalten, jeden genau einmal.
- Begründe jede Flasche, deren Position sich ändert, und jede entfernte.
- "additions" nur füllen, wenn ausdrücklich um Ergänzung gebeten wurde UND das Werkzeug echte Treffer geliefert hat. Sonst leer lassen.
- Schreibe alle Begründungen und die summary auf ${lang === "German" ? "Deutsch" : "Englisch"}.`;
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

  // Reiner Antwortzug: Cooper hat nur geredet. Das Lineup bleibt exakt so, wie
  // es war — auch wenn das Modell versehentlich eine Reihenfolge mitgeliefert
  // hat. So kann eine Rueckfrage niemals unbemerkt das Lineup umstellen.
  if (parsed.mode === "answer") {
    return {
      mode: "answer",
      order: [...inputIndices],
      removed: [],
      additions: normaliseAdditions(parsed.additions),
      reasons: {},
      summary: parsed.summary.slice(0, 1200),
    };
  }

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
  return { mode: "reorder", order, removed: parsed.removed, additions: normaliseAdditions(parsed.additions), reasons, summary: parsed.summary.slice(0, 500) };
}

/** Kappt Laengen und Anzahl. Cooper soll ergaenzen, nicht das Lineup fluten. */
function normaliseAdditions(raw: unknown): RefineResult["additions"] {
  if (!Array.isArray(raw)) return [];
  const cut = (v: unknown, n: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);
  return raw
    .slice(0, 8)
    .map((a: any) => ({
      name: cut(a?.name, 160) ?? "",
      distillery: cut(a?.distillery, 80),
      age: cut(a?.age, 20),
      abv: cut(a?.abv, 20),
      cask: cut(a?.cask, 80),
      region: cut(a?.region, 60),
      reason: cut(a?.reason, 200) ?? "",
    }))
    .filter(a => a.name);
}
