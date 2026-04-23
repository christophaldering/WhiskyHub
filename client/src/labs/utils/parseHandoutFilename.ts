export interface ParsedHandoutFilename {
  date: string | null;
  whiskyName: string;
  tastingTitle: string;
  author: string;
  recognized: boolean;
  autoFilled: {
    date: boolean;
    whiskyName: boolean;
    tastingTitle: boolean;
    author: boolean;
  };
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, januar: 1, january: 1, jänner: 1, jaenner: 1,
  feb: 2, februar: 2, february: 2,
  mar: 3, mär: 3, märz: 3, maerz: 3, march: 3,
  apr: 4, april: 4,
  mai: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oct: 10, oktober: 10, october: 10,
  nov: 11, november: 11,
  dez: 12, dec: 12, dezember: 12, december: 12,
};

function isValidYMD(y: number, m: number, d: number): boolean {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function fmtISO(y: number, m: number, d: number): string {
  return `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
}

function parseMonthWord(token: string): number | null {
  const key = token.toLowerCase().replace(/\.$/, "");
  return MONTH_NAMES[key] ?? null;
}

interface DateMatch {
  iso: string;
  consumed: number;
}

/** Try to extract a date from the start of the token list. */
function extractDate(tokens: string[]): DateMatch | null {
  if (tokens.length === 0) return null;

  // Single-token compact forms: 2025-03-14, 2025.03.14, 14.03.2025, 14-03-2025, 20250314
  const single = tokens[0];
  const ymdSingle = single.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (ymdSingle) {
    const y = +ymdSingle[1], m = +ymdSingle[2], d = +ymdSingle[3];
    if (isValidYMD(y, m, d)) return { iso: fmtISO(y, m, d), consumed: 1 };
  }
  const dmySingle = single.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/);
  if (dmySingle) {
    const d = +dmySingle[1], m = +dmySingle[2], y = +dmySingle[3];
    if (isValidYMD(y, m, d)) return { iso: fmtISO(y, m, d), consumed: 1 };
  }
  const compact = single.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    const y = +compact[1], m = +compact[2], d = +compact[3];
    if (isValidYMD(y, m, d)) return { iso: fmtISO(y, m, d), consumed: 1 };
  }

  // Three-token numeric: YYYY MM DD
  if (tokens.length >= 3 && /^\d{4}$/.test(tokens[0]) && /^\d{1,2}$/.test(tokens[1]) && /^\d{1,2}$/.test(tokens[2])) {
    const y = +tokens[0], m = +tokens[1], d = +tokens[2];
    if (isValidYMD(y, m, d)) return { iso: fmtISO(y, m, d), consumed: 3 };
  }
  // Three-token numeric: DD MM YYYY
  if (tokens.length >= 3 && /^\d{1,2}$/.test(tokens[0]) && /^\d{1,2}$/.test(tokens[1]) && /^\d{4}$/.test(tokens[2])) {
    const d = +tokens[0], m = +tokens[1], y = +tokens[2];
    if (isValidYMD(y, m, d)) return { iso: fmtISO(y, m, d), consumed: 3 };
  }
  // D MonthWord YYYY
  if (tokens.length >= 3 && /^\d{1,2}$/.test(tokens[0]) && /^\d{4}$/.test(tokens[2])) {
    const m = parseMonthWord(tokens[1]);
    if (m !== null) {
      const d = +tokens[0], y = +tokens[2];
      if (isValidYMD(y, m, d)) return { iso: fmtISO(y, m, d), consumed: 3 };
    }
  }
  // YYYY MonthWord D
  if (tokens.length >= 3 && /^\d{4}$/.test(tokens[0]) && /^\d{1,2}$/.test(tokens[2])) {
    const m = parseMonthWord(tokens[1]);
    if (m !== null) {
      const y = +tokens[0], d = +tokens[2];
      if (isValidYMD(y, m, d)) return { iso: fmtISO(y, m, d), consumed: 3 };
    }
  }
  // MonthWord D YYYY
  if (tokens.length >= 3 && /^\d{1,2}$/.test(tokens[1]) && /^\d{4}$/.test(tokens[2])) {
    const m = parseMonthWord(tokens[0]);
    if (m !== null) {
      const d = +tokens[1], y = +tokens[2];
      if (isValidYMD(y, m, d)) return { iso: fmtISO(y, m, d), consumed: 3 };
    }
  }
  return null;
}

function decodeWith(token: string, sep: string): string {
  // Inside a token, replace the *other* common separators with spaces so the field
  // reads naturally (e.g. with sep="_", token "Lagavulin-16" -> "Lagavulin 16").
  const others = ["-", "_", "."].filter((c) => c !== sep);
  let out = token;
  for (const c of others) out = out.split(c).join(" ");
  return out.replace(/\s+/g, " ").trim();
}

interface ParseAttempt {
  result: ParsedHandoutFilename;
  score: number;
}

function attempt(stem: string, sep: string): ParseAttempt {
  let splitRegex: RegExp;
  let decode: (tok: string) => string;
  if (sep === "*") {
    // Combined: split on any of the common separators.
    splitRegex = /[_\-.\s]+/;
    decode = (tok) => tok.replace(/\s+/g, " ").trim();
  } else if (sep === " ") {
    splitRegex = /\s+/;
    decode = (tok) => decodeWith(tok, sep);
  } else {
    splitRegex = new RegExp(`${sep.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}+`);
    decode = (tok) => decodeWith(tok, sep);
  }
  const tokens = stem.split(splitRegex).map((t) => t.trim()).filter(Boolean);

  const empty: ParsedHandoutFilename = {
    date: null,
    whiskyName: "",
    tastingTitle: "",
    author: "",
    recognized: false,
    autoFilled: { date: false, whiskyName: false, tastingTitle: false, author: false },
  };
  if (tokens.length === 0) return { result: empty, score: -1 };

  const dateMatch = extractDate(tokens);
  const date = dateMatch?.iso ?? null;
  const rest = tokens.slice(dateMatch?.consumed ?? 0);

  // Build candidate field assignments. We try both "with author" and
  // "without author" interpretations so the optional-author convention works
  // (e.g. YEAR_MONTH_DAY_Lagavulin_16_Islay-Night.pdf where the author is
  // intentionally omitted and "Islay-Night" is the tasting title).
  interface Fields { whiskyName: string; tastingTitle: string; author: string }
  const candidates: Fields[] = [];
  if (rest.length >= 3) {
    candidates.push({
      author: decode(rest[rest.length - 1]),
      tastingTitle: decode(rest[rest.length - 2]),
      whiskyName: rest.slice(0, rest.length - 2).map(decode).join(" ").trim(),
    });
  }
  if (rest.length >= 2) {
    candidates.push({
      author: "",
      tastingTitle: decode(rest[rest.length - 1]),
      whiskyName: rest.slice(0, rest.length - 1).map(decode).join(" ").trim(),
    });
  }
  if (rest.length === 1) {
    candidates.push({ author: "", tastingTitle: "", whiskyName: decode(rest[0]) });
  }
  if (candidates.length === 0) {
    candidates.push({ author: "", tastingTitle: "", whiskyName: "" });
  }

  const scoreCandidate = (c: Fields): number => {
    let s = 0;
    if (c.whiskyName) s += 2;
    if (c.tastingTitle) s += 1;
    if (c.author) s += 1;
    // A purely-numeric tasting title (e.g. "16") is almost certainly an age
    // statement that belongs to the whisky name, not the title.
    if (c.tastingTitle && /^\d+$/.test(c.tastingTitle.trim())) s -= 3;
    // Authors with digits look wrong (people don't usually have numbers in
    // their names); the token is more likely part of the whisky/title.
    if (c.author && /\d/.test(c.author)) s -= 2;
    // Single-character author tokens are noise.
    if (c.author && c.author.replace(/\s+/g, "").length < 2) s -= 1;
    return s;
  };

  let bestFields = candidates[0];
  let bestFieldScore = scoreCandidate(bestFields);
  for (let i = 1; i < candidates.length; i++) {
    const sc = scoreCandidate(candidates[i]);
    if (sc > bestFieldScore) {
      bestFields = candidates[i];
      bestFieldScore = sc;
    }
  }

  const { whiskyName, tastingTitle, author } = bestFields;

  const result: ParsedHandoutFilename = {
    date,
    whiskyName,
    tastingTitle,
    author,
    recognized: !!date && !!whiskyName,
    autoFilled: {
      date: !!date,
      whiskyName: !!whiskyName,
      tastingTitle: !!tastingTitle,
      author: !!author,
    },
  };
  let score = bestFieldScore;
  if (date) score += 4;
  // Light bias toward attempts that consumed more of the input as tokens.
  score += Math.min(tokens.length, 6) * 0.1;
  return { result, score };
}

export function parseHandoutFilename(filename: string): ParsedHandoutFilename {
  const empty: ParsedHandoutFilename = {
    date: null,
    whiskyName: "",
    tastingTitle: "",
    author: "",
    recognized: false,
    autoFilled: { date: false, whiskyName: false, tastingTitle: false, author: false },
  };
  if (!filename) return empty;
  const stem = filename.replace(/\.[^.]+$/, "").trim();
  if (!stem) return empty;

  const candidateSeps: string[] = [];
  if (stem.includes("_")) candidateSeps.push("_");
  if (stem.includes("-")) candidateSeps.push("-");
  if (stem.includes(".")) candidateSeps.push(".");
  if (/\s/.test(stem)) candidateSeps.push(" ");
  if (candidateSeps.length === 0) candidateSeps.push("_");

  let best: ParseAttempt | null = null;
  for (const sep of candidateSeps) {
    const a = attempt(stem, sep);
    if (!best || a.score > best.score) best = a;
  }
  // If no single-separator pass found a date, fall back to a combined pass
  // that splits on any common separator. This is a last resort because it
  // loses the visual distinction between field-level and intra-field
  // separators (e.g. it would split "Islay-Night" into two tokens).
  if ((!best || !best.result.date) && candidateSeps.length > 1) {
    const a = attempt(stem, "*");
    if (a.result.date && (!best || a.score > best.score)) best = a;
  }
  if (!best) return empty;
  // Even when no date was recognised, return whatever whisky-name guess we
  // have — the upload form requires a whisky name to submit, and a filename
  // like "Tobermory Murray McDavid 2010.pdf" is a perfectly reasonable seed
  // for that field. Other fields (tastingTitle/author) are only kept when
  // the date anchored the structure, otherwise they are too speculative.
  if (!best.result.recognized) {
    if (!best.result.whiskyName) return empty;
    return {
      date: null,
      whiskyName: best.result.whiskyName,
      tastingTitle: "",
      author: "",
      recognized: false,
      autoFilled: { date: false, whiskyName: true, tastingTitle: false, author: false },
    };
  }
  return best.result;
}
