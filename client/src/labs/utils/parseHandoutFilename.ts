export interface ParsedHandoutFilename {
  date: string | null;
  whiskyName: string;
  tastingTitle: string;
  author: string;
  recognized: boolean;
}

function decodeToken(token: string): string {
  return token.replace(/-+/g, " ").replace(/\s+/g, " ").trim();
}

export function parseHandoutFilename(filename: string): ParsedHandoutFilename {
  const empty: ParsedHandoutFilename = {
    date: null,
    whiskyName: "",
    tastingTitle: "",
    author: "",
    recognized: false,
  };
  if (!filename) return empty;
  const stem = filename.replace(/\.[^.]+$/, "").trim();
  if (!stem) return empty;

  let separator: RegExp = /_+/;
  let usingHyphenSep = false;
  if (!stem.includes("_")) {
    if (stem.includes("-")) {
      separator = /-+/;
      usingHyphenSep = true;
    } else if (/\s/.test(stem)) {
      separator = /\s+/;
    }
  }
  const tokens = stem.split(separator).map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return empty;
  const decode = usingHyphenSep
    ? (token: string): string => token.replace(/\s+/g, " ").trim()
    : decodeToken;

  let date: string | null = null;
  let consumed = 0;

  if (tokens.length >= 3 && /^\d{4}$/.test(tokens[0]) && /^\d{1,2}$/.test(tokens[1]) && /^\d{1,2}$/.test(tokens[2])) {
    const y = parseInt(tokens[0], 10);
    const m = parseInt(tokens[1], 10);
    const d = parseInt(tokens[2], 10);
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const dt = new Date(Date.UTC(y, m - 1, d));
      if (dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d) {
        date = `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
        consumed = 3;
      }
    }
  }

  const rest = tokens.slice(consumed);
  let whiskyName = "";
  let tastingTitle = "";
  let author = "";

  if (rest.length >= 3) {
    author = decode(rest[rest.length - 1]);
    tastingTitle = decode(rest[rest.length - 2]);
    whiskyName = rest.slice(0, rest.length - 2).map(decode).join(" ").trim();
  } else if (rest.length === 2) {
    whiskyName = decode(rest[0]);
    tastingTitle = decode(rest[1]);
  } else if (rest.length === 1) {
    whiskyName = decode(rest[0]);
  }

  const recognized = !!date && !!whiskyName && !!tastingTitle && !!author;
  return { date, whiskyName, tastingTitle, author, recognized };
}
