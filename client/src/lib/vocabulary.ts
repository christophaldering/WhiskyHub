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

export type VocabAdoptionRow = {
  id: string; term: string; locale: string;
  status: "offered" | "adopted" | "self";
  source: string; useCount: number;
  firstAt: string | null; lastAt: string | null; descriptorId: string | null;
};
export async function getVocabularyAdoption(participantId: string): Promise<VocabAdoptionRow[]> {
  if (!participantId) return [];
  const res = await fetch(`/api/vocabulary/${participantId}/adoption`, { headers: { ...pidHeaders() } });
  if (!res.ok) throw new Error(`vocab read failed: ${res.status}`);
  return res.json();
}

export type CommunityVocabRow = { term: string; userCount: number };
export async function getCommunityVocabulary(): Promise<CommunityVocabRow[]> {
  const res = await fetch(`/api/vocabulary/community`, { headers: { ...pidHeaders() } });
  if (!res.ok) throw new Error(`community vocab failed: ${res.status}`);
  return res.json();
}
