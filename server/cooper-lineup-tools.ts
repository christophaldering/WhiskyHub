/**
 * Werkzeuge, die Cooper beim Vorbereiten des Lineups benutzen darf.
 *
 * Bewusst eng gefasst: Cooper darf ausschliesslich in dem suchen, was der
 * Gastgeber selbst erfasst hat — Journal und Whiskybase-Sammlung. Er bekommt
 * KEINEN Zugriff auf freies Modellwissen ueber Abfuellungen, weil erfundene
 * Flaschen in einem Katalogprodukt schwerer wiegen als eine ausbleibende
 * Empfehlung. Und er schreibt nichts: die Werkzeuge sind rein lesend, jede
 * Aufnahme ins Lineup bestaetigt der Gastgeber im UI.
 */

import { storage } from "./storage";

export interface CollectionHit {
  name: string;
  distillery: string | null;
  region: string | null;
  country: string | null;
  age: string | null;
  abv: string | null;
  cask: string | null;
  source: "journal" | "collection";
}

export const cooperLineupTools = [
  {
    type: "function" as const,
    function: {
      name: "search_my_collection",
      description:
        "Durchsucht die eigene Sammlung des Gastgebers (Journal-Einträge und Whiskybase-Sammlung) nach Flaschen. Nutze dies, wenn der Gastgeber etwas hinzufügen möchte ('pack noch was Torfiges dazu', 'hast du einen Springbank?'). Gib nur zurück, was wirklich gefunden wurde — erfinde niemals Flaschen.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Suchbegriff, z. B. eine Destillerie ('Springbank'), eine Region ('Islay') oder ein Merkmal ('Sherry'). Leer lassen, um die ganze Sammlung zu sehen.",
          },
          limit: {
            type: "number",
            description: "Höchstzahl der Treffer, Standard 12, Maximum 30.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
];

function textOf(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

/**
 * Fuehrt ein Werkzeug aus. Unbekannte Namen liefern einen Fehlertext statt zu
 * werfen — ein halluzinierter Werkzeugname soll das Gespraech nicht abbrechen.
 */
export async function runCooperLineupTool(
  name: string,
  args: Record<string, unknown>,
  participantId: string,
): Promise<string> {
  if (name !== "search_my_collection") {
    return JSON.stringify({ error: `Unbekanntes Werkzeug: ${name}` });
  }
  if (!participantId) {
    return JSON.stringify({ hits: [], note: "Kein angemeldeter Gastgeber — Sammlung nicht verfügbar." });
  }

  const query = textOf(args.query).trim().toLowerCase();
  const rawLimit = typeof args.limit === "number" ? args.limit : 12;
  const limit = Math.max(1, Math.min(30, Math.round(rawLimit)));

  const [journal, collection] = await Promise.all([
    storage.getJournalEntries(participantId).catch(() => []),
    storage.getWhiskybaseCollection(participantId).catch(() => []),
  ]);

  const hits: CollectionHit[] = [];
  const seen = new Set<string>();

  const push = (h: CollectionHit) => {
    const key = `${h.name}|${h.distillery ?? ""}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    hits.push(h);
  };

  for (const e of journal as any[]) {
    push({
      name: textOf(e.whiskyName || e.name),
      distillery: e.distillery ?? null,
      region: e.region ?? null,
      country: e.country ?? null,
      age: e.age != null ? textOf(e.age) : null,
      abv: e.abv != null ? textOf(e.abv) : null,
      cask: e.caskType ?? null,
      source: "journal",
    });
  }
  for (const c of collection as any[]) {
    push({
      name: textOf(c.name),
      distillery: c.brand ?? null,
      region: c.region ?? null,
      country: c.country ?? null,
      age: c.statedAge != null ? textOf(c.statedAge) : null,
      abv: c.abv != null ? textOf(c.abv) : null,
      cask: c.caskType ?? null,
      source: "collection",
    });
  }

  const filtered = query
    ? hits.filter(h =>
        [h.name, h.distillery, h.region, h.country, h.cask]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : hits;

  return JSON.stringify({
    hits: filtered.filter(h => h.name).slice(0, limit),
    total: filtered.length,
  });
}
