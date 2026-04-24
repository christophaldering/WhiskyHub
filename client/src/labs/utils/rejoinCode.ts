export function formatRejoinCode(c: string | null | undefined): string {
  const s = (c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.length === 6 ? `${s.slice(0, 3)}-${s.slice(3)}` : s;
}

const REJOIN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function extractRejoinCodeFromText(text: string): string | null {
  const cleaned = (text || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  for (let i = 0; i + 6 <= cleaned.length; i++) {
    const candidate = cleaned.slice(i, i + 6);
    if (candidate.split("").every((c) => REJOIN_ALPHABET.includes(c))) return candidate;
  }
  return null;
}
