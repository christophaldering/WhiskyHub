export type VoiceCommandKind =
  | "reveal_next"
  | "next_dram"
  | "who_is_missing"
  | "nudge"
  | "pause"
  | "resume"
  | "status"
  | "unknown"

export interface ParsedVoiceCommand {
  kind:    VoiceCommandKind
  raw:     string
  name?:   string
  minutes?: number
}

const STOPWORDS = new Set([
  "den", "der", "die", "das", "the", "an", "ein", "eine", "bitte", "please",
  "von", "fuer", "für", "uns", "us", "mal", "kurz", "now", "jetzt",
])

const REVEAL_LEMMAS = [
  "reveal", "enthülle", "enthuelle", "enthüllen", "enthuellen", "aufdecken", "aufdeck",
  "zeig", "zeige", "show", "lüfte", "luefte", "verrate",
]
const NEXT_DRAM_LEMMAS = [
  "nächster dram", "naechster dram", "nächste dram", "naechste dram",
  "next dram", "next whisky", "nächstes whisky", "naechstes whisky",
  "weiter zum nächsten", "weiter zum naechsten",
  "next pour", "nächster ausschank", "naechster ausschank",
]
const NEXT_FALLBACK = [
  "weiter", "next", "vorrücken", "vorruecken",
]
const MISSING_LEMMAS = [
  "wer fehlt", "wer hat noch nicht", "wer ist noch nicht",
  "who is missing", "who's missing", "who hasn't rated", "who hasnt rated",
  "missing raters",
]
const NUDGE_PREFIXES = [
  "stups", "stupse", "stupst", "anstupsen", "stupsen",
  "nudge", "nudg", "ping", "anpingen",
  "ruf", "rufe",
]
const PAUSE_LEMMAS = ["pause", "break"]
const RESUME_LEMMAS = [
  "fortsetzen", "weitermachen", "resume", "continue", "pause beenden",
  "end pause", "stop pause", "pause aus", "pause ende",
]
const STATUS_LEMMAS = [
  "aktueller stand", "stand", "status", "wo stehen wir", "where are we",
  "report", "lagebericht",
]

const NUMBER_WORDS_DE: Record<string, number> = {
  null: 0, eins: 1, eine: 1, einer: 1, einen: 1, zwei: 2, drei: 3, vier: 4,
  fünf: 5, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
  elf: 11, zwölf: 12, zwoelf: 12, dreizehn: 13, vierzehn: 14, fünfzehn: 15,
  fuenfzehn: 15, zwanzig: 20, dreißig: 30, dreissig: 30, fünfundvierzig: 45,
  fuenfundvierzig: 45,
}

const NUMBER_WORDS_EN: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15,
  twenty: 20, thirty: 30, fortyfive: 45, "forty-five": 45,
}

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[?!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function containsAny(text: string, lemmas: readonly string[]): string | null {
  for (const l of lemmas) {
    if (text.includes(l)) return l
  }
  return null
}

function extractNumber(text: string): number | null {
  const numMatch = text.match(/(\d+(?:[.,]\d+)?)/)
  if (numMatch) {
    const v = Number(numMatch[1].replace(",", "."))
    if (Number.isFinite(v)) return v
  }
  for (const [word, value] of Object.entries(NUMBER_WORDS_DE)) {
    const re = new RegExp(`\\b${word}\\b`)
    if (re.test(text)) return value
  }
  for (const [word, value] of Object.entries(NUMBER_WORDS_EN)) {
    const re = new RegExp(`\\b${word}\\b`)
    if (re.test(text)) return value
  }
  return null
}

function stripLeading(text: string, lemma: string): string {
  const idx = text.indexOf(lemma)
  if (idx < 0) return text
  return text.slice(idx + lemma.length).trim()
}

function cleanName(raw: string): string {
  const tokens = raw
    .split(/\s+/)
    .map((t) => t.replace(/[^a-zA-Z0-9äöüÄÖÜß'\-]/g, ""))
    .filter((t) => t.length > 0 && !STOPWORDS.has(t.toLowerCase()))
  if (tokens.length === 0) return ""
  const finalTokens: string[] = []
  for (const tok of tokens) {
    if (finalTokens.length >= 3) break
    finalTokens.push(tok.charAt(0).toUpperCase() + tok.slice(1))
  }
  return finalTokens.join(" ").trim()
}

export function parseVoiceCommand(input: string): ParsedVoiceCommand {
  const raw = input.trim()
  const text = normalize(raw)
  if (!text) return { kind: "unknown", raw }

  if (containsAny(text, RESUME_LEMMAS)) {
    return { kind: "resume", raw, minutes: 0 }
  }

  const pauseLemma = containsAny(text, PAUSE_LEMMAS)
  if (pauseLemma) {
    const minutes = extractNumber(text)
    if (minutes !== null && minutes >= 0) {
      return { kind: "pause", raw, minutes: Math.min(120, Math.max(0, Math.round(minutes))) }
    }
    return { kind: "pause", raw, minutes: 5 }
  }

  if (containsAny(text, MISSING_LEMMAS)) {
    return { kind: "who_is_missing", raw }
  }

  if (containsAny(text, STATUS_LEMMAS)) {
    return { kind: "status", raw }
  }

  for (const prefix of NUDGE_PREFIXES) {
    const re = new RegExp(`(?:^|\\s)${prefix}\\b`)
    const m = text.match(re)
    if (m) {
      const tail = stripLeading(text, prefix)
      const name = cleanName(tail.replace(/\b(an|mal)\b/g, ""))
      if (name) return { kind: "nudge", raw, name }
      return { kind: "unknown", raw }
    }
  }

  if (containsAny(text, NEXT_DRAM_LEMMAS)) {
    return { kind: "next_dram", raw }
  }

  if (containsAny(text, REVEAL_LEMMAS)) {
    return { kind: "reveal_next", raw }
  }

  if (containsAny(text, NEXT_FALLBACK)) {
    return { kind: "next_dram", raw }
  }

  return { kind: "unknown", raw }
}

export function commandHelpHint(language: "de" | "en"): string[] {
  if (language === "de") {
    return [
      "Reveal — nächste Info aufdecken",
      "Nächster Dram — zum nächsten Whisky",
      "Wer fehlt — fehlende Bewertungen ansagen",
      "Stups [Name] — Gast freundlich anstupsen",
      "Pause 5 Minuten — Countdown starten",
      "Aktueller Stand — kurze Lagebeschreibung",
    ]
  }
  return [
    "Reveal — show next info",
    "Next dram — advance to the next whisky",
    "Who is missing — name guests still rating",
    "Nudge [Name] — gently ping a guest",
    "Pause 5 minutes — start a countdown",
    "Status — short situation report",
  ]
}
