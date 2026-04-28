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

function normalizeTokenStripped(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
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

function tokenize(input: string): { german: string[]; stripped: string[] } {
  const cleaned = stripGuestSuffix(input);
  const parts = cleaned.split(/[\s_\-.,()[\]{}+]+/);
  const german: string[] = [];
  const stripped: string[] = [];
  for (const p of parts) {
    const g = normalizeToken(p);
    const s = normalizeTokenStripped(p);
    if (g.length >= 2) german.push(g);
    if (s.length >= 2) stripped.push(s);
  }
  return { german, stripped };
}

function getFirstNameForms(participant: ParticipantLike): { german: string; stripped: string } | null {
  const raw = participant.displayName || participant.name || "";
  const cleaned = stripGuestSuffix(raw).trim();
  if (!cleaned) return null;
  const parts = cleaned.split(/\s+/);
  if (parts.length === 0) return null;
  const first = parts[0];
  const german = normalizeToken(first);
  const stripped = normalizeTokenStripped(first);
  if (german.length < 2 && stripped.length < 2) return null;
  return { german, stripped };
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
  if (tokens.german.length === 0 && tokens.stripped.length === 0) return null;

  const germanSet = new Set(tokens.german);
  const strippedSet = new Set(tokens.stripped);

  const firstNameCounts = new Map<string, number>();
  for (const p of participants) {
    const forms = getFirstNameForms(p);
    if (!forms) continue;
    const key = `${forms.german}|${forms.stripped}`;
    firstNameCounts.set(key, (firstNameCounts.get(key) ?? 0) + 1);
  }

  const candidates: FilenameMatchResult[] = [];
  const seenIds = new Set<string>();

  for (const p of participants) {
    const forms = getFirstNameForms(p);
    if (!forms) continue;
    const key = `${forms.german}|${forms.stripped}`;
    if ((firstNameCounts.get(key) ?? 0) > 1) continue;
    let matched: string | null = null;
    if (forms.german.length >= 2 && germanSet.has(forms.german)) {
      matched = forms.german;
    } else if (forms.stripped.length >= 2 && strippedSet.has(forms.stripped)) {
      matched = forms.stripped;
    }
    if (!matched) continue;
    if (seenIds.has(p.id)) continue;
    seenIds.add(p.id);
    candidates.push({ participantId: p.id, matchedToken: matched, firstName: forms.german || forms.stripped });
  }

  if (candidates.length !== 1) return null;
  return candidates[0];
}
