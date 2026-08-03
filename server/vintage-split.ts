// Trennt zusammengeschriebene Jahrgangsangaben in Destillations- und
// Abfuelljahr. Die KI liefert trotz getrennter Feldabfrage weiterhin
// gelegentlich Bereiche ("2007 - 2021", "20.11.2020 - 20.06.2024") in einem
// Feld; dieser Normalisierer faengt das deterministisch ab.
//
// Wichtig fuer die Regex:
// - Das Datumsmuster steht VORNE in der Alternation, sonst zerfaellt
//   "20.11.2020" in mehrere Einzeltreffer.
// - \b Wortgrenzen verhindern, dass aus Fassnummern wie "Cask 900123"
//   ein Jahr "9001" extrahiert wird.

const MIN_YEAR = 1700;
const TOKEN_RE = /\b\d{1,2}\.\d{1,2}\.\d{4}\b|\b\d{4}\b/g;

function yearOf(token: string): number {
  const m = token.match(/(\d{4})$/);
  return m ? parseInt(m[1], 10) : NaN;
}

export interface VintageParts {
  distilledYear: string | null;
  bottledYear: string | null;
}

/**
 * "2007 - 2021"              -> { distilledYear: "2007",       bottledYear: "2021" }
 * "20.11.2020 - 20.06.2024"  -> { distilledYear: "20.11.2020", bottledYear: "20.06.2024" }
 * "2015"                     -> { distilledYear: "2015",       bottledYear: null }
 * "NAS" / "Cask 900123" / "" -> { distilledYear: null,         bottledYear: null }
 */
export function splitVintage(raw: unknown): VintageParts {
  const empty: VintageParts = { distilledYear: null, bottledYear: null };
  if (raw == null) return empty;
  const s = String(raw).trim();
  if (!s) return empty;
  const maxYear = new Date().getFullYear() + 2;
  const tokens = (s.match(TOKEN_RE) || []).filter((t) => {
    const y = yearOf(t);
    return y >= MIN_YEAR && y <= maxYear;
  });
  if (tokens.length === 0) return empty;
  if (tokens.length === 1) return { distilledYear: tokens[0], bottledYear: null };
  return { distilledYear: tokens[0], bottledYear: tokens[tokens.length - 1] };
}

/**
 * Normalisiert ein Whisky-Objekt aus dem Smart-Import in place.
 * Greift NUR, wenn bottledYear leer ist und distilledYear mehr als eine
 * Jahresangabe enthaelt. Bereits sauber getrennte Werte bleiben unberuehrt.
 */
export function normalizeWhiskyVintage(w: any): void {
  if (!w) return;
  const hasBottled = w.bottledYear != null && String(w.bottledYear).trim() !== "";
  if (hasBottled) return;
  const parts = splitVintage(w.distilledYear);
  if (parts.bottledYear) {
    w.distilledYear = parts.distilledYear;
    w.bottledYear = parts.bottledYear;
  }
}
