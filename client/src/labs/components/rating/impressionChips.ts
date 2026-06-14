import { flavorSiblingsForTerm } from "@/labs/data/flavor-data";

export interface EvaluationLevel {
  label: string;
  score: number;
}

export const EVALUATION_LEVELS: EvaluationLevel[] = [
  { label: "schwach", score: 68 },
  { label: "solide", score: 79 },
  { label: "gut", score: 85 },
  { label: "richtig gut", score: 89 },
  { label: "herausragend", score: 93 },
];

const DIMENSION_CHIPS: Record<string, string[]> = {
  nose: ["fruchtig", "blumig", "würzig", "rauchig", "malzig", "vanillig"],
  taste: ["süß", "würzig", "fruchtig", "rauchig", "cremig", "trocken"],
  finish: ["kurz", "mittel", "lang", "süß", "trocken", "wärmend"],
};

export interface ChipSet {
  options: string[];
  evaluation: EvaluationLevel[] | null;
}

export function chipsForFollowUp(kind: string, term: string): ChipSet {
  if (kind === "evaluation") {
    return { options: [], evaluation: EVALUATION_LEVELS };
  }
  if (kind === "dimension") {
    return { options: DIMENSION_CHIPS[term] || [], evaluation: null };
  }
  if (kind === "aroma") {
    return { options: flavorSiblingsForTerm(term, "de"), evaluation: null };
  }
  return { options: [], evaluation: null };
}
