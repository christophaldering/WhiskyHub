import type { RatingData } from "@/labs/components/rating/types";
import type { CapturedWhisky } from "@/labs/pages/solo/SoloCaptureScreen";

const SOLO_DRAFT_KEY = "casksense_solo_draft";
const GROUP_DRAFT_PREFIX = "casksense_group_draft_";
const DRAFT_VERSION = 1;
const DEBOUNCE_MS = 800;

export interface SoloDraft {
  version: number;
  timestamp: number;
  step: "capture" | "form" | "rating" | "done";
  whisky: CapturedWhisky | null;
  ratingMode: "guided" | "compact" | "quick" | null;
  ratingPhaseIndex: number;
  ratingData: Partial<RatingData>;
  fromCollection: boolean;
}

export interface GroupDraft {
  version: number;
  timestamp: number;
  tastingId: string;
  whiskyId: string;
  ratingMode: "guided" | "compact" | "quick" | null;
  ratingPhaseIndex: number;
  ratingData: Partial<RatingData>;
}

const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const pendingData: Record<string, unknown> = {};

function debouncedWrite(key: string, data: unknown): void {
  pendingData[key] = data;
  if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
  debounceTimers[key] = setTimeout(() => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {}
    delete pendingData[key];
    delete debounceTimers[key];
  }, DEBOUNCE_MS);
}

function flushWrite(key: string, data: unknown): void {
  if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
  delete debounceTimers[key];
  delete pendingData[key];
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

function flushAllPending(): void {
  for (const key of Object.keys(pendingData)) {
    if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
    delete debounceTimers[key];
    try {
      localStorage.setItem(key, JSON.stringify(pendingData[key]));
    } catch {}
    delete pendingData[key];
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", flushAllPending);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAllPending();
  });
}

export function saveSoloDraft(draft: Omit<SoloDraft, "version" | "timestamp">): void {
  const full: SoloDraft = { ...draft, version: DRAFT_VERSION, timestamp: Date.now() };
  debouncedWrite(SOLO_DRAFT_KEY, full);
}

export function saveSoloDraftImmediate(draft: Omit<SoloDraft, "version" | "timestamp">): void {
  const full: SoloDraft = { ...draft, version: DRAFT_VERSION, timestamp: Date.now() };
  flushWrite(SOLO_DRAFT_KEY, full);
}

export function loadSoloDraft(): SoloDraft | null {
  try {
    const raw = localStorage.getItem(SOLO_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SoloDraft;
    if (parsed.version !== DRAFT_VERSION) return null;
    if (parsed.step === "done" || parsed.step === "capture") return null;
    const age = Date.now() - parsed.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      clearSoloDraft();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSoloDraft(): void {
  if (debounceTimers[SOLO_DRAFT_KEY]) clearTimeout(debounceTimers[SOLO_DRAFT_KEY]);
  delete debounceTimers[SOLO_DRAFT_KEY];
  delete pendingData[SOLO_DRAFT_KEY];
  try {
    localStorage.removeItem(SOLO_DRAFT_KEY);
  } catch {}
}

function groupKey(tastingId: string, whiskyId: string): string {
  return `${GROUP_DRAFT_PREFIX}${tastingId}_${whiskyId}`;
}

export function saveGroupDraft(draft: Omit<GroupDraft, "version" | "timestamp">): void {
  const full: GroupDraft = { ...draft, version: DRAFT_VERSION, timestamp: Date.now() };
  debouncedWrite(groupKey(draft.tastingId, draft.whiskyId), full);
}

export function loadGroupDraft(tastingId: string, whiskyId: string): GroupDraft | null {
  try {
    const raw = localStorage.getItem(groupKey(tastingId, whiskyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GroupDraft;
    if (parsed.version !== DRAFT_VERSION) return null;
    const age = Date.now() - parsed.timestamp;
    if (age > 12 * 60 * 60 * 1000) {
      clearGroupDraft(tastingId, whiskyId);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearGroupDraft(tastingId: string, whiskyId: string): void {
  const key = groupKey(tastingId, whiskyId);
  if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
  delete debounceTimers[key];
  delete pendingData[key];
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function clearAllGroupDrafts(tastingId: string): void {
  try {
    const prefix = `${GROUP_DRAFT_PREFIX}${tastingId}_`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) keysToRemove.push(key);
    }
    for (const key of keysToRemove) {
      if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
      delete debounceTimers[key];
      delete pendingData[key];
      localStorage.removeItem(key);
    }
  } catch {}
}

export function hasDraftData(ratingData: Partial<RatingData>): boolean {
  if (!ratingData) return false;
  const { scores, tags, notes } = ratingData;
  const hasScores = scores && (scores.nose !== 75 || scores.palate !== 75 || scores.finish !== 75 || scores.overall !== 75);
  const hasTags = tags && Object.values(tags).some(arr => arr.length > 0);
  const hasNotes = notes && Object.values(notes).some(n => n.trim().length > 0);
  return !!(hasScores || hasTags || hasNotes);
}
