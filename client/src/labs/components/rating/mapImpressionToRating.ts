import type { ImpressionResult } from "./impressionApi";
import type { RatingData } from "./types";

export interface MapImpressionOpts {
  /** Bestehende Werte, die erhalten bleiben sollen, wenn Cooper nichts liefert. */
  prev?: RatingData | null;
  /** Neutraler Fallback-Score auf der ZIEL-Skala (Solo/100 → 75). */
  fallback?: number;
  /** Wandelt einen 0–100-Score von Cooper in die Zielskala. Identität bei 100er-Skala. */
  convertScore?: (v: number) => number;
}

/**
 * Wandelt ein Cooper-Ergebnis in vorbefüllte RatingData.
 * Verhalten bei Default-Opts identisch zum bisherigen Solo-Mapping (fallback 75, Identität).
 */
export function mapImpressionToRating(result: ImpressionResult, opts: MapImpressionOpts = {}): RatingData {
  const { prev, fallback = 75, convertScore } = opts;
  const conv = convertScore ?? ((v: number) => v);
  const sc = result.scoreSuggestion;
  return {
    scores: {
      nose: sc?.nose != null ? conv(sc.nose) : prev?.scores?.nose ?? fallback,
      palate: sc?.taste != null ? conv(sc.taste) : prev?.scores?.palate ?? fallback,
      finish: sc?.finish != null ? conv(sc.finish) : prev?.scores?.finish ?? fallback,
      overall: sc?.overall != null ? conv(sc.overall) : prev?.scores?.overall ?? fallback,
    },
    tags: {
      nose: prev?.tags?.nose ?? [],
      palate: prev?.tags?.palate ?? [],
      finish: prev?.tags?.finish ?? [],
      overall: result.flavorTags ?? [],
    },
    notes: {
      nose: result.nose || prev?.notes?.nose || "",
      palate: result.taste || prev?.notes?.palate || "",
      finish: result.finish || prev?.notes?.finish || "",
      overall: prev?.notes?.overall || "",
    },
  };
}
