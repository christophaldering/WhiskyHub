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
  tookMs: number;
};

export async function parseImpression(text: string, whiskyName?: string): Promise<ImpressionResult> {
  const res = await fetch("/api/impression/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify({ text, whiskyName }),
  });
  if (!res.ok) {
    throw new Error(`impression parse failed: ${res.status}`);
  }
  return res.json();
}
