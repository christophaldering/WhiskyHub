import type { DownloadKind } from "./downloadMatrix";

export type TastingPhase = "pre" | "live" | "reveal" | "completed";

export function getTastingPhase(status: string | null | undefined): TastingPhase {
  const s = String(status ?? "").toLowerCase();
  if (s === "archived" || s === "closed" || s === "completed") return "completed";
  if (s === "reveal") return "reveal";
  if (s === "open" || s === "live" || s === "active") return "live";
  return "pre";
}

export function isResultDownloadsPhase(phase: TastingPhase): boolean {
  return phase === "reveal" || phase === "completed";
}

export function isPrintMaterialsPhase(phase: TastingPhase): boolean {
  return phase === "pre" || phase === "live";
}

export const RESULT_DOWNLOAD_KINDS: DownloadKind[] = [
  "tasting-results-pdf",
  "tasting-results-xlsx",
  "tasting-results-csv",
  "tasting-story-pdf",
  "tasting-presentation-pdf",
  "tasting-notes-docx",
];

export function getPrimaryDownloadKindsForPhase(phase: TastingPhase): DownloadKind[] {
  if (isResultDownloadsPhase(phase)) return RESULT_DOWNLOAD_KINDS;
  return [];
}
