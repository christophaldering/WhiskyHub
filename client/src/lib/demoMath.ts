export const DIMS = ["Nose", "Palate", "Finish", "Overall"] as const;
export type Dim = (typeof DIMS)[number];

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function similarityPercent(a: number[], b: number[]): number {
  return Math.round(cosineSimilarity(a, b) * 100);
}

const NOSE_WORDS: Record<string, [string, string][]> = {
  low: [["subtle malt", "light grass"], ["faint cereal", "green apple"], ["gentle hay", "soft biscuit"]],
  mid: [["warm honey", "ripe pear"], ["toffee", "dried apricot"], ["caramel", "fresh oak"]],
  high: [["rich vanilla", "dark chocolate"], ["deep sherry", "christmas cake"], ["intense dried fruit", "beeswax"]],
};
const PALATE_WORDS: Record<string, [string, string][]> = {
  low: [["thin body", "light citrus"], ["watery", "mild grain"], ["delicate", "soft wheat"]],
  mid: [["creamy texture", "orange peel"], ["medium body", "butterscotch"], ["rounded", "nutmeg"]],
  high: [["full body", "dark toffee"], ["oily mouth-feel", "espresso"], ["rich spice", "molasses"]],
};
const FINISH_WORDS: Record<string, [string, string][]> = {
  low: [["short", "clean"], ["brief", "crisp"], ["fleeting", "dry"]],
  mid: [["medium length", "warming"], ["lingering spice", "sweet fade"], ["pleasant warmth", "gentle oak"]],
  high: [["endless", "deep smoke"], ["very long", "intense pepper"], ["extraordinary length", "dark chocolate"]],
};

function tier(v: number): "low" | "mid" | "high" {
  if (v <= 33) return "low";
  if (v <= 66) return "mid";
  return "high";
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

export function generateNote(values: number[]): string {
  const [nose, palate, finish] = values;
  const nT = tier(nose);
  const pT = tier(palate);
  const fT = tier(finish);
  const nW = pick(NOSE_WORDS[nT], Math.floor(nose / 5));
  const pW = pick(PALATE_WORDS[pT], Math.floor(palate / 5));
  const fW = pick(FINISH_WORDS[fT], Math.floor(finish / 5));
  return `Nose: ${nW[0]}, ${nW[1]}. Palate: ${pW[0]}, ${pW[1]}. Finish: ${fW[0]}, ${fW[1]}.`;
}

export const DEMO_TASTERS = [
  { name: "Lucia", values: [78, 65, 82, 70, 75] },
  { name: "Markus", values: [55, 80, 60, 72, 68] },
  { name: "Anika", values: [70, 58, 75, 85, 72] },
];
