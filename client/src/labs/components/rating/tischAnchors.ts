// Tisch-Modus: Anker-Definitionen und Skalenkonvertierung.
//
// Die sechs Anker nutzen die bestehende Band-Sprache der App (v2.band0 .. v2.band90),
// damit Tisch-Modus, ScoreInput-Bänder und Reports dieselben Worte sprechen.
// Werte auf der 100er-Referenzskala, kalibriert auf das real genutzte
// Whiskybase-Spektrum (Durchschnitt 76-82, >90 als Reserve).

export type TischBandKey = "band90" | "band85" | "band80" | "band75" | "band70" | "band0";

export interface TischAnchor {
  bandKey: TischBandKey;
  value100: number;
}

// Reihenfolge: beste Stufe oben (wie die Band-Anzeige im ScoreInput).
export const TISCH_ANCHORS: TischAnchor[] = [
  { bandKey: "band90", value100: 92 },
  { bandKey: "band85", value100: 87 },
  { bandKey: "band80", value100: 82 },
  { bandKey: "band75", value100: 77 },
  { bandKey: "band70", value100: 72 },
  { bandKey: "band0", value100: 65 },
];

/** Konvertiert einen 100er-Ankerwert in die Nutzerskala des Tastings (5/10/20/100). */
export function anchorToScale(value100: number, scaleMax: number, scaleStep: number): number {
  if (scaleMax === 100) return value100;
  const raw = (value100 / 100) * scaleMax;
  const stepped = Math.round(raw / scaleStep) * scaleStep;
  const clamped = Math.min(scaleMax, Math.max(scaleStep, stepped));
  // Gleitkomma-Säuberung (z.B. 0.1-Schritte)
  return Math.round(clamped * 1000) / 1000;
}

/** Findet den Anker-Index, der einem vorhandenen Score (in Nutzerskala) am nächsten liegt. */
export function nearestAnchorIndex(score: number, scaleMax: number, scaleStep: number): number {
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  TISCH_ANCHORS.forEach((a, i) => {
    const v = anchorToScale(a.value100, scaleMax, scaleStep);
    const d = Math.abs(v - score);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}
