import { pidHeaders } from "@/lib/api";
export type VocabEvent = { term: string; status: "offered"|"adopted"|"self"; locale?: string; source?: string };
export function recordVocabularyEvents(participantId: string, events: VocabEvent[]): void {
  if (!participantId || !events?.length) return;
  // Fire-and-forget — darf onApply/UI NIE blockieren oder Fehler werfen.
  fetch("/api/vocabulary/events", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify({ participantId, events }),
  }).catch(() => {});
}
