export interface ParticipantLike {
  id: string;
  name?: string | null;
  displayName?: string | null;
}

const DIACRITIC_MAP: Record<string, string> = {
  ä: "ae", Ä: "ae",
  ö: "oe", Ö: "oe",
  ü: "ue", Ü: "ue",
  ß: "ss",
  á: "a", à: "a", â: "a", ã: "a", å: "a",
  é: "e", è: "e", ê: "e", ë: "e",
  í: "i", ì: "i", î: "i", ï: "i",
  ó: "o", ò: "o", ô: "o", õ: "o",
  ú: "u", ù: "u", û: "u",
  ñ: "n", ç: "c", ý: "y", ÿ: "y",
};

function normalizeToken(input: string): string {
  let out = "";
  for (const ch of input) {
    const lower = ch.toLowerCase();
    out += DIACRITIC_MAP[ch] ?? DIACRITIC_MAP[lower] ?? lower;
  }
  return out
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function stripExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx <= 0) return filename;
  return filename.slice(0, idx);
}

function stripGuestSuffix(name: string): string {
  return name.replace(/\s*#[a-z0-9]{4}\b/gi, "");
}

function tokenize(input: string): string[] {
  const cleaned = stripGuestSuffix(input);
  return cleaned
    .split(/[\s_\-.,()[\]{}+]+/)
    .map((t) => normalizeToken(t))
    .filter((t) => t.length >= 2);
}

function getFirstName(participant: ParticipantLike): string | null {
  const raw = participant.displayName || participant.name || "";
  const stripped = stripGuestSuffix(raw).trim();
  if (!stripped) return null;
  const parts = stripped.split(/\s+/);
  if (parts.length === 0) return null;
  const first = normalizeToken(parts[0]);
  if (first.length < 2) return null;
  return first;
}

export interface FilenameMatchResult {
  participantId: string;
  matchedToken: string;
  firstName: string;
}

export function matchParticipantFromFilename(
  filename: string,
  participants: ParticipantLike[],
): FilenameMatchResult | null {
  if (!filename || participants.length === 0) return null;

  const stem = stripExtension(filename);
  const tokens = tokenize(stem);
  if (tokens.length === 0) return null;

  const tokenSet = new Set(tokens);

  const candidates: FilenameMatchResult[] = [];
  const seenIds = new Set<string>();
  const seenFirstNames = new Map<string, number>();

  for (const p of participants) {
    const first = getFirstName(p);
    if (!first) continue;
    seenFirstNames.set(first, (seenFirstNames.get(first) ?? 0) + 1);
  }

  for (const p of participants) {
    const first = getFirstName(p);
    if (!first) continue;
    if (!tokenSet.has(first)) continue;
    if ((seenFirstNames.get(first) ?? 0) > 1) continue;
    if (seenIds.has(p.id)) continue;
    seenIds.add(p.id);
    candidates.push({ participantId: p.id, matchedToken: first, firstName: first });
  }

  if (candidates.length !== 1) return null;
  return candidates[0];
}
