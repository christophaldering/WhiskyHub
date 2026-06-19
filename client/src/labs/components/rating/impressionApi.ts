import { pidHeaders } from "@/lib/api";

export type ImpressionScore = {
  overall: number | null;
  nose: number | null;
  taste: number | null;
  finish: number | null;
};

export type ImpressionResult = {
  rawImpression: string;
  flavorTags: string[];
  nose: string;
  taste: string;
  finish: string;
  scoreSuggestion: ImpressionScore | null;
  confidence: "high" | "medium" | "low";
  confidenceWeight: number;
  followUpQuestion: string;
  followUpKind: "aroma" | "dimension" | "evaluation" | "";
  followUpTerm: string;
  narrative?: string;
  tookMs: number;
};

export async function parseImpression(text: string, whiskyName?: string, askedQuestions?: string[]): Promise<ImpressionResult> {
  const res = await fetch("/api/impression/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify({ text, whiskyName, askedQuestions }),
  });
  if (!res.ok) {
    throw new Error(`impression parse failed: ${res.status}`);
  }
  return res.json();
}

export type LedgerSlot = "untouched" | "touched" | "sharpened";
export type Ledger = { nose: LedgerSlot; palate: LedgerSlot; finish: LedgerSlot; body: LedgerSlot; intensity: LedgerSlot; affect: LedgerSlot; vagueResolved: boolean };
export type Intensity = "schnell" | "neugierig" | "rabbithole";
export type ConverseTurn = { role: "taster" | "mentor"; text: string };
export type ConverseResult = { mentorTurn: string; ledger: Ledger; chips: string[]; proposeClose: boolean; tookMs: number };
export const EMPTY_LEDGER: Ledger = { nose: "untouched", palate: "untouched", finish: "untouched", body: "untouched", intensity: "untouched", affect: "untouched", vagueResolved: false };

export async function converseImpression(args: { whiskyName?: string; intensity: Intensity; transcript: ConverseTurn[]; ledger: Ledger }): Promise<ConverseResult> {
  const res = await fetch("/api/impression/converse", { method: "POST", headers: { "Content-Type": "application/json", ...pidHeaders() }, body: JSON.stringify(args) });
  if (!res.ok) throw new Error(`converse failed: ${res.status}`);
  return res.json();
}
export async function finalizeImpression(args: { whiskyName?: string; intensity: Intensity; transcript: ConverseTurn[] }): Promise<ImpressionResult> {
  const res = await fetch("/api/impression/converse", { method: "POST", headers: { "Content-Type": "application/json", ...pidHeaders() }, body: JSON.stringify({ ...args, finalize: true }) });
  if (!res.ok) throw new Error(`finalize failed: ${res.status}`);
  return res.json();
}
export async function proseImpression(args: { whiskyName?: string; intensity: Intensity; transcript: ConverseTurn[] }): Promise<{ narrative: string }> {
  const res = await fetch("/api/impression/converse", { method: "POST", headers: { "Content-Type": "application/json", ...pidHeaders() }, body: JSON.stringify({ ...args, prose: true }) });
  if (!res.ok) throw new Error(`prose failed: ${res.status}`);
  return res.json();
}

export async function fetchCooperVoice(text: string): Promise<ArrayBuffer> {
  const res = await fetch("/api/impression/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`voice failed: ${res.status}`);
  return res.arrayBuffer();
}
