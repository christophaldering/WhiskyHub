import OpenAI from "openai";
import type { AggregatedTastingStoryData } from "./tastingStoryAggregate";

export type RegeneratableBlockType =
  | "winner-hero"
  | "finale-card"
  | "taster-grid"
  | "ranking-list"
  | "blind-results"
  | "whisky-card-grid"
  | "hero-cover"
  | "text-section"
  | "quote"
  | "feature-cards"
  | "stats-grid"
  | "two-column"
  | "cta-button"
  | "full-width-image"
  | "image-gallery";

export const REGENERATABLE_BLOCK_TYPES: RegeneratableBlockType[] = [
  "winner-hero",
  "finale-card",
  "taster-grid",
  "ranking-list",
  "blind-results",
  "whisky-card-grid",
  "hero-cover",
  "text-section",
  "quote",
  "feature-cards",
  "stats-grid",
  "two-column",
  "cta-button",
  "full-width-image",
  "image-gallery",
];

export type RegenTone = "festive" | "casual" | "analytical" | "poetic";
export type LengthLevel = "compact" | "default" | "expanded" | "epic";

export type RegenOptions = {
  tone?: RegenTone | null;
  highlightContext?: string | null;
  spotlightParticipantIds?: string[];
  customInstructions?: string | null;
  stylePresets?: string[];
  photoCategorySummary?: string | null;
  lengthLevel?: LengthLevel | null;
};

const STYLE_PRESET_INSTRUCTIONS: Record<string, string> = {
  factual: "Sachlich, praezise, sensorisch genau, nuechtern.",
  narrative: "Erzaehlerisch, atmosphaerisch, mit narrativen Bildern.",
  humorous: "Locker, mit Augenzwinkern, charmant humorvoll.",
  expert: "Fachlich-experten, mit Whisky-Vokabular, tiefgehend.",
  short: "Sehr kurz und knapp halten.",
  warm: "Warm, persoenlich, einladend.",
};

const LENGTH_PROMPTS: Record<LengthLevel, string> = {
  compact: "Laenge: sehr kurz und praegnant, idealerweise ein einziger Satz oder eine pointierte Zeile.",
  default: "Laenge: praegnant, ein bis zwei kurze Saetze pro Feld.",
  expanded: "Laenge: ausfuehrlich, mehrere Saetze, gerne zwei bis drei Absaetze, mit Bildern und Atmosphaere.",
  epic: "Laenge: erzaehlerisch ausgreifend, mehrere Absaetze, sinnlich, atmosphaerisch, mit Wendungen und Bildern.",
};

const LENGTH_CAPS: Record<LengthLevel, number> = {
  compact: 200,
  default: 400,
  expanded: 1500,
  epic: 4000,
};

const LENGTH_TOKEN_BUDGET: Record<LengthLevel, number> = {
  compact: 300,
  default: 600,
  expanded: 1800,
  epic: 3500,
};

const LENGTH_LEVELS: LengthLevel[] = ["compact", "default", "expanded", "epic"];

const LENGTH_KEYWORDS: Array<{ level: LengthLevel; patterns: RegExp[] }> = [
  {
    level: "epic",
    patterns: [
      /\bepic\b/i,
      /\bepisch\b/i,
      /\bsehr lang\b/i,
      /\bdoppelt so lang\b/i,
      /\bextrem ausf(ü|ue)hrlich\b/i,
      /200\s*%/,
      /\bsaga\b/i,
      /\bmehrere abs(ä|ae)tze\b/i,
      /\bseveral paragraphs\b/i,
      /\bmuch longer\b/i,
    ],
  },
  {
    level: "expanded",
    patterns: [
      /\bausf(ü|ue)hrlich\b/i,
      /\bausfuehrlich\b/i,
      /\bmehr text\b/i,
      /\bl(ä|ae)nger\b/i,
      /\bmehr details\b/i,
      /150\s*%/,
      /\bdetaillierter?\b/i,
      /\bmore detail\b/i,
      /\blonger\b/i,
      /\bin (drei|3|vier|4) abs(ä|ae)tzen?/i,
      /\bmore text\b/i,
      /\bin paragraphs\b/i,
      /\bgr(ö|oe)ssere ausf(ü|ue)hrung\b/i,
    ],
  },
  {
    level: "compact",
    patterns: [
      /\bk(ü|ue)rzer\b/i,
      /\bsehr kurz\b/i,
      /\bkurz und knapp\b/i,
      /\bin einem satz\b/i,
      /\bone sentence\b/i,
      /\bvery short\b/i,
      /\bshorter\b/i,
      /\bconcise\b/i,
      /\bbrief\b/i,
      /\bextrem knapp\b/i,
    ],
  },
];

export function resolveLengthLevel(opts: {
  explicit?: LengthLevel | null;
  customInstructions?: string | null;
}): LengthLevel {
  if (opts.explicit && LENGTH_LEVELS.includes(opts.explicit)) {
    return opts.explicit;
  }
  const ci = (opts.customInstructions ?? "").trim();
  if (!ci) return "default";
  for (const { level, patterns } of LENGTH_KEYWORDS) {
    for (const p of patterns) {
      if (p.test(ci)) return level;
    }
  }
  return "default";
}

function lengthCapFor(options: RegenOptions | undefined): number {
  return LENGTH_CAPS[resolveLengthLevel({
    explicit: options?.lengthLevel ?? null,
    customInstructions: options?.customInstructions ?? null,
  })];
}

function tokenBudgetFor(options: RegenOptions | undefined): number {
  return LENGTH_TOKEN_BUDGET[resolveLengthLevel({
    explicit: options?.lengthLevel ?? null,
    customInstructions: options?.customInstructions ?? null,
  })];
}

function stylePresetInstruction(presets: string[] | undefined): string {
  if (!presets || presets.length === 0) return "";
  const parts = presets
    .map((p) => STYLE_PRESET_INSTRUCTIONS[p])
    .filter((s): s is string => typeof s === "string" && s.length > 0);
  if (parts.length === 0) return "";
  return `Stil-Vorgabe (zwingend einhalten): ${parts.join(" ")}`;
}

export function isRegeneratable(type: string): type is RegeneratableBlockType {
  return (REGENERATABLE_BLOCK_TYPES as string[]).includes(type);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function trimSentence(value: string, max: number): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function trimText(value: string, max: number): string {
  const cleaned = value.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function toneInstruction(tone: RegenTone | null | undefined): string {
  switch (tone) {
    case "festive":
      return "Tonalitaet: festlich, feierlich, warm und einladend, leicht poetisch.";
    case "casual":
      return "Tonalitaet: locker, freundschaftlich, warm und nahbar, ohne Pathos.";
    case "analytical":
      return "Tonalitaet: praezise, sachlich, sensorisch genau, nuechtern aber respektvoll.";
    case "poetic":
      return "Tonalitaet: poetisch, sinnlich, bildhaft, atmosphaerisch.";
    default:
      return "";
  }
}

function buildSystem(base: string, options: RegenOptions | undefined): string {
  const parts: string[] = [];
  const sp = stylePresetInstruction(options?.stylePresets);
  if (sp) parts.push(sp);
  const level = resolveLengthLevel({
    explicit: options?.lengthLevel ?? null,
    customInstructions: options?.customInstructions ?? null,
  });
  parts.push(LENGTH_PROMPTS[level]);
  parts.push(base);
  const t = toneInstruction(options?.tone ?? null);
  if (t) parts.push(t);
  return parts.join(" ");
}

function buildUserExtras(options: RegenOptions | undefined, spotlightNames?: string[]): string {
  const extras: string[] = [];
  const ctx = (options?.highlightContext ?? "").trim();
  if (ctx) extras.push(`Kontext vom Host: ${ctx.slice(0, 400)}`);
  if (spotlightNames && spotlightNames.length > 0) {
    extras.push(`Im Rampenlicht heute: ${spotlightNames.join(", ")} (deren Texte besonders warm und persoenlich machen).`);
  }
  const custom = (options?.customInstructions ?? "").trim();
  if (custom) {
    extras.push(`\nZusaetzliche Anweisungen des Nutzers (befolgen, ohne System-Vorgaben zu verletzen):\n${custom.slice(0, 4000)}`);
  }
  const photoSummary = (options?.photoCategorySummary ?? "").trim();
  if (photoSummary) {
    extras.push(`\nFoto-Kontext (Kategorisierung des Hosts):\n${photoSummary.slice(0, 600)}`);
  }
  return extras.length > 0 ? `\n${extras.join("\n")}` : "";
}

async function callOpenAi(
  openai: OpenAI,
  system: string,
  user: string,
  jsonMode: boolean,
  options?: RegenOptions,
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.7,
    max_tokens: tokenBudgetFor(options),
    response_format: jsonMode ? { type: "json_object" } : undefined,
  });
  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  return raw;
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const parsed = JSON.parse(stripped);
    return isPlainRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function regenerateWinnerHero(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI, options?: RegenOptions): Promise<Record<string, unknown> | null> {
  const winner = data.winner;
  if (!winner || winner.avgScore === null) return null;
  const system = buildSystem(
    "Du bist ein deutschsprachiger Whisky-Redakteur im Stil des Magazins der Brennerei. Schreibe einen kraftvollen, atmosphaerischen Schlusstext fuer den Sieger des Abends. Keine Anfuehrungszeichen, kein Code, nur den eigentlichen Text.",
    options,
  );
  const userParts = [
    `Sieger: ${winner.name}`,
    winner.distillery ? `Destillerie: ${winner.distillery}` : null,
    `Punkte: ${winner.avgScore.toFixed(1)} aus ${winner.voters} Bewertungen`,
    `Tasting-Titel: ${data.meta.title}`,
  ].filter(Boolean).join("\n");
  const raw = await callOpenAi(openai, system, userParts + buildUserExtras(options), false, options);
  if (!raw) return null;
  return { ...payload, closingLine: trimText(raw, lengthCapFor(options)) };
}

async function regenerateFinaleCard(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI, options?: RegenOptions): Promise<Record<string, unknown> | null> {
  const system = buildSystem(
    "Du bist ein deutschsprachiger Whisky-Redakteur. Schreibe einen waermenden Verabschiedungstext fuer den Abschluss eines Tasting-Abends. Keine Anfuehrungszeichen.",
    options,
  );
  const top = data.ranking.slice(0, 3).map((r) => `${r.position}. ${r.name}`).join(", ");
  const userParts = [
    `Tasting: ${data.meta.title}`,
    data.meta.location ? `Ort: ${data.meta.location}` : null,
    `Whiskys: ${data.whiskies.length}, Verkoster: ${data.participants.length}`,
    top ? `Top: ${top}` : null,
  ].filter(Boolean).join("\n");
  const raw = await callOpenAi(openai, system, userParts + buildUserExtras(options), false, options);
  if (!raw) return null;
  return { ...payload, closingLine: trimText(raw, lengthCapFor(options)) };
}

async function regenerateTasterGrid(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI, options?: RegenOptions): Promise<Record<string, unknown> | null> {
  if (data.participants.length === 0) return null;
  const system = buildSystem(
    "Du bist ein deutschsprachiger Whisky-Redakteur. Erzeuge fuer jeden uebergebenen Verkoster einen warmherzigen, praezisen Fun-Fakt (keine Anfuehrungszeichen). Antworte ausschliesslich mit einem JSON-Objekt der Form {\"funFacts\": {\"<id>\": \"<text>\"}}.",
    options,
  );
  const profileLines = data.participants.map((p) => {
    const top = p.topPickWhiskyId ? data.whiskies.find((w) => w.id === p.topPickWhiskyId) : null;
    const avg = p.avgGiven !== null ? `${p.avgGiven.toFixed(1)} im Schnitt` : "noch keine Wertung";
    return `${p.id}|${p.name}|${p.isHost ? "Host" : "Gast"}|${p.ratingCount} Bewertungen|${avg}|Top-Pick: ${top?.name ?? "n/a"}`;
  }).join("\n");
  const spotlightIds = options?.spotlightParticipantIds ?? [];
  const spotlightNames = spotlightIds
    .map((id) => data.participants.find((p) => p.id === id)?.name)
    .filter((n): n is string => typeof n === "string" && n.length > 0);
  const user = `Tasting: ${data.meta.title}\nVerkoster (id|name|rolle|count|avg|topPick):\n${profileLines}` + buildUserExtras(options, spotlightNames);
  const raw = await callOpenAi(openai, system, user, true, options);
  const parsed = parseJsonObject(raw);
  const funFacts = parsed && isPlainRecord(parsed.funFacts) ? parsed.funFacts : null;
  if (!funFacts) return null;
  const overridesPrev = isPlainRecord(payload.overrides) ? payload.overrides : {};
  const cap = lengthCapFor(options);
  const nextOverrides: Record<string, { funFact: string }> = {};
  for (const p of data.participants) {
    const cur = isPlainRecord(overridesPrev[p.id]) ? (overridesPrev[p.id] as { funFact?: unknown }) : {};
    const fresh = safeString(funFacts[p.id]);
    nextOverrides[p.id] = { funFact: fresh.length > 0 ? trimText(fresh, cap) : safeString(cur.funFact) };
  }
  return { ...payload, overrides: nextOverrides };
}

async function regenerateRankingList(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI, options?: RegenOptions): Promise<Record<string, unknown> | null> {
  if (data.ranking.length === 0) return null;
  const system = buildSystem(
    "Du bist ein deutschsprachiger Whisky-Redakteur. Schreibe fuer jeden Whisky im Ranking eine sinnliche Kurzkritik. Antworte ausschliesslich mit einem JSON-Objekt der Form {\"commentary\": {\"<whiskyId>\": \"<text>\"}}.",
    options,
  );
  const lines = data.ranking.map((r) => {
    const w = data.whiskies.find((x) => x.id === r.whiskyId);
    const desc = w ? [w.distillery, w.region, w.age ? `${w.age}J` : null, w.caskType].filter(Boolean).join(" / ") : "";
    return `${r.whiskyId}|#${r.position}|${r.name}|${r.avgScore !== null ? r.avgScore.toFixed(1) : "—"} Pkt|${desc}`;
  }).join("\n");
  const user = `Tasting: ${data.meta.title}\nRanking (whiskyId|platz|name|punkte|profil):\n${lines}` + buildUserExtras(options);
  const raw = await callOpenAi(openai, system, user, true, options);
  const parsed = parseJsonObject(raw);
  const commentary = parsed && isPlainRecord(parsed.commentary) ? parsed.commentary : null;
  if (!commentary) return null;
  const overridesPrev = isPlainRecord(payload.overrides) ? payload.overrides : {};
  const cap = lengthCapFor(options);
  const nextOverrides: Record<string, { commentary: string }> = {};
  for (const r of data.ranking) {
    const cur = isPlainRecord(overridesPrev[r.whiskyId]) ? (overridesPrev[r.whiskyId] as { commentary?: unknown }) : {};
    const fresh = safeString(commentary[r.whiskyId]);
    nextOverrides[r.whiskyId] = { commentary: fresh.length > 0 ? trimText(fresh, cap) : safeString(cur.commentary) };
  }
  return { ...payload, overrides: nextOverrides };
}

async function regenerateWhiskyCardGrid(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI, options?: RegenOptions): Promise<Record<string, unknown> | null> {
  if (data.whiskies.length === 0) return null;
  const system = buildSystem(
    "Du bist ein deutschsprachiger Whisky-Redakteur. Schreibe pro Whisky einen sinnlichen Steckbrief-Text fuer das Tasting-Programm (keine Anfuehrungszeichen, kein Werbe-Tonfall). Antworte ausschliesslich mit einem JSON-Objekt der Form {\"handout\": {\"<whiskyId>\": \"<text>\"}}.",
    options,
  );
  const lines = data.whiskies.map((w) => {
    const desc = [w.distillery, w.region, w.age ? `${w.age}J` : null, w.caskType, w.abv ? `${w.abv}%` : null]
      .filter(Boolean)
      .join(" / ");
    const note = w.handoutExcerpt ?? w.hostSummary ?? w.notes ?? "";
    return `${w.id}|${w.name}|${desc}|${note.slice(0, 200)}`;
  }).join("\n");
  const user = `Tasting: ${data.meta.title}\nWhiskys (id|name|profil|notiz):\n${lines}` + buildUserExtras(options);
  const raw = await callOpenAi(openai, system, user, true, options);
  const parsed = parseJsonObject(raw);
  const handout = parsed && isPlainRecord(parsed.handout) ? parsed.handout : null;
  if (!handout) return null;
  const overridesPrev = isPlainRecord(payload.overrides) ? payload.overrides : {};
  const cap = lengthCapFor(options);
  const nextOverrides: Record<string, { handoutText: string; scoreLabel: string }> = {};
  for (const w of data.whiskies) {
    const cur = isPlainRecord(overridesPrev[w.id]) ? (overridesPrev[w.id] as { handoutText?: unknown; scoreLabel?: unknown }) : {};
    const fresh = safeString(handout[w.id]);
    nextOverrides[w.id] = {
      handoutText: fresh.length > 0 ? trimText(fresh, cap) : safeString(cur.handoutText),
      scoreLabel: safeString(cur.scoreLabel),
    };
  }
  return { ...payload, overrides: nextOverrides };
}

async function regenerateBlindResults(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI, options?: RegenOptions): Promise<Record<string, unknown> | null> {
  const blind = data.blindResults;
  if (!blind || blind.length === 0) return null;
  const system = buildSystem(
    "Du bist ein deutschsprachiger Whisky-Redakteur. Schreibe pro Whisky eine Erzaehlung zur Blindverkostung: wer war nah, wer war weit, was sagt das aus. Antworte ausschliesslich mit einem JSON-Objekt der Form {\"narration\": {\"<whiskyId>\": \"<text>\"}}.",
    options,
  );
  const lines = blind.map((b) => {
    const guesses = b.guesses.map((g) => `${g.participantName}:${g.guessAbv ?? "?"}`).join(", ");
    return `${b.whiskyId}|${b.whiskyName}|tatsaechlich ${b.actualAbv ?? "?"}%|${guesses}`;
  }).join("\n");
  const user = `Tasting: ${data.meta.title}\nBlind-Tipps (id|name|tatsaechlich|tipps):\n${lines}` + buildUserExtras(options);
  const raw = await callOpenAi(openai, system, user, true, options);
  const parsed = parseJsonObject(raw);
  const narration = parsed && isPlainRecord(parsed.narration) ? parsed.narration : null;
  if (!narration) return null;
  const overridesPrev = isPlainRecord(payload.overrides) ? payload.overrides : {};
  const cap = lengthCapFor(options);
  const nextOverrides: Record<string, { narration: string }> = {};
  for (const b of blind) {
    const cur = isPlainRecord(overridesPrev[b.whiskyId]) ? (overridesPrev[b.whiskyId] as { narration?: unknown }) : {};
    const fresh = safeString(narration[b.whiskyId]);
    nextOverrides[b.whiskyId] = { narration: fresh.length > 0 ? trimText(fresh, cap) : safeString(cur.narration) };
  }
  return { ...payload, overrides: nextOverrides };
}

function tastingContextLines(data: AggregatedTastingStoryData): string {
  const top = data.ranking.slice(0, 3).map((r) => `${r.position}. ${r.name}${r.avgScore !== null ? ` (${r.avgScore.toFixed(1)})` : ""}`).join(", ");
  const lines = [
    `Tasting: ${data.meta.title}`,
    data.meta.location ? `Ort: ${data.meta.location}` : null,
    data.meta.date ? `Datum: ${data.meta.date}` : null,
    `Whiskys: ${data.whiskies.length}, Verkoster: ${data.participants.length}`,
    top ? `Top: ${top}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

async function regenerateHeroCover(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI, options?: RegenOptions): Promise<Record<string, unknown> | null> {
  const system = buildSystem(
    "Du bist ein deutschsprachiger Whisky-Redakteur und gestaltest den Cover-Text einer Tasting-Story. Schreibe einen Titel, einen Untertitel und eine Meta-Zeile (z. B. Datum/Ort/Anlass). Bilder, Buttons und Eyebrow bleiben unveraendert. Antworte ausschliesslich mit einem JSON-Objekt der Form {\"title\": \"<text>\", \"subtitle\": \"<text>\", \"meta\": \"<text>\"}.",
    options,
  );
  const current = [
    `Aktueller Titel: ${safeString(payload.title)}`,
    `Aktueller Untertitel: ${safeString(payload.subtitle)}`,
    `Aktuelle Meta: ${safeString(payload.meta)}`,
    `Aktueller Eyebrow (NICHT veraendern): ${safeString(payload.eyebrow)}`,
  ].join("\n");
  const user = `${tastingContextLines(data)}\n\n${current}` + buildUserExtras(options);
  const raw = await callOpenAi(openai, system, user, true, options);
  const parsed = parseJsonObject(raw);
  if (!parsed) return null;
  const cap = lengthCapFor(options);
  const titleCap = Math.min(cap, 220);
  const subtitleCap = cap;
  const metaCap = Math.min(cap, 200);
  const newTitle = safeString(parsed.title).trim();
  const newSubtitle = safeString(parsed.subtitle).trim();
  const newMeta = safeString(parsed.meta).trim();
  if (newTitle.length === 0 && newSubtitle.length === 0 && newMeta.length === 0) return null;
  return {
    ...payload,
    title: newTitle.length > 0 ? trimSentence(newTitle, titleCap) : safeString(payload.title),
    subtitle: newSubtitle.length > 0 ? trimText(newSubtitle, subtitleCap) : safeString(payload.subtitle),
    meta: newMeta.length > 0 ? trimSentence(newMeta, metaCap) : safeString(payload.meta),
  };
}

async function regenerateTextSection(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI, options?: RegenOptions): Promise<Record<string, unknown> | null> {
  const system = buildSystem(
    "Du bist ein deutschsprachiger Whisky-Redakteur und schreibst einen erzaehlerischen Text-Block fuer eine Tasting-Story. Liefere eine Ueberschrift und einen Fliesstext. Verwende reinen Text mit Absaetzen (zwei Newlines zwischen Absaetzen), kein HTML, keine Listen, keine Anfuehrungszeichen. Eyebrow und Layout bleiben unveraendert. Antworte ausschliesslich mit einem JSON-Objekt der Form {\"heading\": \"<text>\", \"body\": \"<text>\"}.",
    options,
  );
  const current = [
    `Aktuelle Ueberschrift: ${safeString(payload.heading)}`,
    `Aktueller Eyebrow (NICHT veraendern): ${safeString(payload.eyebrow)}`,
    `Aktueller Body (Auszug): ${safeString(payload.body).slice(0, 600)}`,
  ].join("\n");
  const user = `${tastingContextLines(data)}\n\n${current}` + buildUserExtras(options);
  const raw = await callOpenAi(openai, system, user, true, options);
  const parsed = parseJsonObject(raw);
  if (!parsed) return null;
  const newHeading = safeString(parsed.heading).trim();
  const newBody = safeString(parsed.body).trim();
  if (newHeading.length === 0 && newBody.length === 0) return null;
  const cap = lengthCapFor(options);
  return {
    ...payload,
    heading: newHeading.length > 0 ? trimSentence(newHeading, Math.min(cap, 240)) : safeString(payload.heading),
    body: newBody.length > 0 ? trimText(newBody, cap) : safeString(payload.body),
  };
}

async function regenerateQuote(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI, options?: RegenOptions): Promise<Record<string, unknown> | null> {
  const system = buildSystem(
    "Du bist ein deutschsprachiger Whisky-Redakteur und formulierst ein Zitat fuer eine Tasting-Story. Liefere ein neues Zitat (Text) und optional eine Attribution (Person/Rolle). Reiner Text, keine Anfuehrungszeichen im Zitat selbst. Antworte ausschliesslich mit einem JSON-Objekt der Form {\"text\": \"<zitat>\", \"attribution\": \"<name oder leer>\"}.",
    options,
  );
  const current = [
    `Aktuelles Zitat (Auszug): ${safeString(payload.text).slice(0, 400)}`,
    `Aktuelle Attribution: ${safeString(payload.attribution)}`,
    `Aktuelle Rolle (NICHT veraendern, falls leer): ${safeString(payload.role)}`,
  ].join("\n");
  const user = `${tastingContextLines(data)}\n\n${current}` + buildUserExtras(options);
  const raw = await callOpenAi(openai, system, user, true, options);
  const parsed = parseJsonObject(raw);
  if (!parsed) return null;
  const newText = safeString(parsed.text).trim();
  const newAttr = safeString(parsed.attribution).trim();
  if (newText.length === 0 && newAttr.length === 0) return null;
  const cap = lengthCapFor(options);
  return {
    ...payload,
    text: newText.length > 0 ? trimText(newText, cap) : safeString(payload.text),
    attribution: newAttr.length > 0 ? trimSentence(newAttr, Math.min(cap, 160)) : safeString(payload.attribution),
  };
}

async function regenerateFeatureCards(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI, options?: RegenOptions): Promise<Record<string, unknown> | null> {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) return null;
  const system = buildSystem(
    "Du bist ein deutschsprachiger Whisky-Redakteur und gestaltest die Texte einer Feature-Karten-Sektion. Liefere fuer jede Karte einen neuen Titel und eine neue Beschreibung. Icons und Buttons bleiben unveraendert. Antworte ausschliesslich mit einem JSON-Objekt der Form {\"items\": [{\"title\": \"<text>\", \"description\": \"<text>\"}, ...]}. Die Reihenfolge entspricht der Eingabe.",
    options,
  );
  const itemLines = items.map((it, idx) => {
    const rec = isPlainRecord(it) ? it : {};
    return `${idx + 1}|${safeString(rec.title)}|${safeString(rec.description).slice(0, 200)}`;
  }).join("\n");
  const headerCtx = [
    `Eyebrow (NICHT veraendern): ${safeString(payload.eyebrow)}`,
    `Heading (NICHT veraendern): ${safeString(payload.heading)}`,
  ].join("\n");
  const user = `${tastingContextLines(data)}\n\n${headerCtx}\n\nKarten (idx|titel|beschreibung):\n${itemLines}` + buildUserExtras(options);
  const raw = await callOpenAi(openai, system, user, true, options);
  const parsed = parseJsonObject(raw);
  const newItemsRaw = parsed && Array.isArray(parsed.items) ? parsed.items : null;
  if (!newItemsRaw) return null;
  const cap = lengthCapFor(options);
  const titleCap = Math.min(cap, 160);
  const nextItems = items.map((it, idx) => {
    const cur = isPlainRecord(it) ? it : {};
    const incoming = newItemsRaw[idx];
    const incomingRec = isPlainRecord(incoming) ? incoming : {};
    const newTitle = safeString(incomingRec.title).trim();
    const newDesc = safeString(incomingRec.description).trim();
    return {
      ...cur,
      title: newTitle.length > 0 ? trimSentence(newTitle, titleCap) : safeString(cur.title),
      description: newDesc.length > 0 ? trimText(newDesc, cap) : safeString(cur.description),
    };
  });
  return { ...payload, items: nextItems };
}

type StatCandidate = { value: string; topic: string };

function buildStatsCandidates(data: AggregatedTastingStoryData): StatCandidate[] {
  const cands: StatCandidate[] = [];
  if (data.whiskies.length > 0) {
    cands.push({ value: String(data.whiskies.length), topic: "Anzahl Whiskys im Tasting" });
  }
  if (data.participants.length > 0) {
    cands.push({ value: String(data.participants.length), topic: "Anzahl Verkoster" });
  }
  const ratedRanks = data.ranking.filter((r) => r.avgScore !== null);
  if (ratedRanks.length > 0) {
    const sum = ratedRanks.reduce((s, r) => s + (r.avgScore ?? 0), 0);
    const avg = sum / ratedRanks.length;
    cands.push({ value: avg.toFixed(1), topic: "Durchschnittliche Punktzahl ueber alle Whiskys" });
    const top = ratedRanks.reduce((best, r) => ((r.avgScore ?? 0) > (best.avgScore ?? 0) ? r : best), ratedRanks[0]);
    if (top.avgScore !== null) {
      cands.push({ value: top.avgScore.toFixed(1), topic: `Hoechste Punktzahl im Tasting (${top.name})` });
    }
  }
  const abvs = data.whiskies.map((w) => w.abv).filter((a): a is number => typeof a === "number" && Number.isFinite(a));
  if (abvs.length > 0) {
    const maxAbv = Math.max(...abvs);
    cands.push({ value: `${maxAbv.toFixed(1)}%`, topic: "Hoechste Trinkstaerke (ABV)" });
    const avgAbv = abvs.reduce((s, a) => s + a, 0) / abvs.length;
    cands.push({ value: `${avgAbv.toFixed(1)}%`, topic: "Durchschnittliche Trinkstaerke (ABV)" });
  }
  const ages = data.whiskies.map((w) => w.age).filter((a): a is number => typeof a === "number" && Number.isFinite(a));
  if (ages.length > 0) {
    cands.push({ value: `${Math.max(...ages)}J`, topic: "Aeltester Whisky im Tasting" });
  }
  const regions = new Set(
    data.whiskies
      .map((w) => (typeof w.region === "string" ? w.region.trim() : ""))
      .filter((r) => r.length > 0),
  );
  if (regions.size > 0) {
    cands.push({ value: String(regions.size), topic: "Anzahl unterschiedlicher Regionen" });
  }
  const totalRatings = data.participants.reduce((s, p) => s + (typeof p.ratingCount === "number" ? p.ratingCount : 0), 0);
  if (totalRatings > 0) {
    cands.push({ value: String(totalRatings), topic: "Anzahl abgegebener Bewertungen insgesamt" });
  }
  return cands;
}

async function regenerateStatsGrid(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI, options?: RegenOptions): Promise<Record<string, unknown> | null> {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) return null;
  const candidates = buildStatsCandidates(data);
  if (candidates.length === 0) return null;
  const slotCount = Math.min(items.length, candidates.length);
  const slots = candidates.slice(0, slotCount);
  const system = buildSystem(
    "Du bist ein deutschsprachiger Whisky-Redakteur und beschriftest die Kennzahlen einer Stats-Grid-Sektion. Du bekommst pro Slot einen exakten Wert (value) und einen Themen-Hinweis. Liefere zu jedem Slot ein praegnantes Label und einen kurzen Hinweis-Satz. Die numerischen Werte werden serverseitig gesetzt und sind nicht zu wiederholen. Antworte ausschliesslich mit einem JSON-Objekt der Form {\"items\": [{\"label\": \"<text>\", \"hint\": \"<text>\"}, ...]}. Reihenfolge entspricht der Eingabe.",
    options,
  );
  const slotLines = slots.map((s, idx) => `${idx + 1}|value=${s.value}|thema=${s.topic}`).join("\n");
  const user = `${tastingContextLines(data)}\n\nSlots (idx|value|thema):\n${slotLines}` + buildUserExtras(options);
  const raw = await callOpenAi(openai, system, user, true, options);
  const parsed = parseJsonObject(raw);
  const newItemsRaw = parsed && Array.isArray(parsed.items) ? parsed.items : [];
  const cap = lengthCapFor(options);
  const labelCap = Math.min(cap, 120);
  let updated = 0;
  const nextItems = items.map((it, idx) => {
    const cur = isPlainRecord(it) ? it : {};
    if (idx >= slotCount) return cur;
    const slot = slots[idx];
    const incoming = newItemsRaw[idx];
    const incomingRec = isPlainRecord(incoming) ? incoming : {};
    const newLabel = safeString(incomingRec.label).trim();
    const newHint = safeString(incomingRec.hint).trim();
    updated += 1;
    return {
      ...cur,
      value: slot.value,
      label: newLabel.length > 0 ? trimSentence(newLabel, labelCap) : trimSentence(slot.topic, labelCap),
      hint: newHint.length > 0 ? trimSentence(newHint, Math.min(cap, 240)) : safeString(cur.hint),
    };
  });
  if (updated === 0) return null;
  return { ...payload, items: nextItems };
}

async function regenerateTwoColumn(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI, options?: RegenOptions): Promise<Record<string, unknown> | null> {
  const system = buildSystem(
    "Du bist ein deutschsprachiger Whisky-Redakteur und schreibst einen zweispaltigen Text-Block fuer eine Tasting-Story. Liefere fuer beide Spalten je eine Ueberschrift und einen Fliesstext (reiner Text mit Absaetzen, kein HTML, keine Anfuehrungszeichen). Antworte ausschliesslich mit einem JSON-Objekt der Form {\"leftHeading\": \"<text>\", \"leftBody\": \"<text>\", \"rightHeading\": \"<text>\", \"rightBody\": \"<text>\"}.",
    options,
  );
  const current = [
    `Linke Ueberschrift: ${safeString(payload.leftHeading)}`,
    `Linker Body (Auszug): ${safeString(payload.leftBody).slice(0, 400)}`,
    `Rechte Ueberschrift: ${safeString(payload.rightHeading)}`,
    `Rechter Body (Auszug): ${safeString(payload.rightBody).slice(0, 400)}`,
  ].join("\n");
  const user = `${tastingContextLines(data)}\n\n${current}` + buildUserExtras(options);
  const raw = await callOpenAi(openai, system, user, true, options);
  const parsed = parseJsonObject(raw);
  if (!parsed) return null;
  const lh = safeString(parsed.leftHeading).trim();
  const lb = safeString(parsed.leftBody).trim();
  const rh = safeString(parsed.rightHeading).trim();
  const rb = safeString(parsed.rightBody).trim();
  if (lh.length === 0 && lb.length === 0 && rh.length === 0 && rb.length === 0) return null;
  const cap = lengthCapFor(options);
  const headCap = Math.min(cap, 220);
  return {
    ...payload,
    leftHeading: lh.length > 0 ? trimSentence(lh, headCap) : safeString(payload.leftHeading),
    leftBody: lb.length > 0 ? trimText(lb, cap) : safeString(payload.leftBody),
    rightHeading: rh.length > 0 ? trimSentence(rh, headCap) : safeString(payload.rightHeading),
    rightBody: rb.length > 0 ? trimText(rb, cap) : safeString(payload.rightBody),
  };
}

async function regenerateCtaButton(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI, options?: RegenOptions): Promise<Record<string, unknown> | null> {
  const system = buildSystem(
    "Du bist ein deutschsprachiger Whisky-Redakteur und formulierst die Texte eines Call-to-Action-Buttons fuer eine Tasting-Story. Liefere einen prazisen Button-Text und einen kurzen Helfer-Satz (kein Link). Antworte ausschliesslich mit einem JSON-Objekt der Form {\"text\": \"<button-text>\", \"helper\": \"<kurzer hinweis>\"}.",
    options,
  );
  const current = [
    `Aktueller Button-Text: ${safeString(payload.text)}`,
    `Aktueller Helper-Text: ${safeString(payload.helper)}`,
    `Ziel-URL (NICHT veraendern): ${safeString(payload.href)}`,
  ].join("\n");
  const user = `${tastingContextLines(data)}\n\n${current}` + buildUserExtras(options);
  const raw = await callOpenAi(openai, system, user, true, options);
  const parsed = parseJsonObject(raw);
  if (!parsed) return null;
  const newText = safeString(parsed.text).trim();
  const newHelper = safeString(parsed.helper).trim();
  if (newText.length === 0 && newHelper.length === 0) return null;
  const cap = lengthCapFor(options);
  return {
    ...payload,
    text: newText.length > 0 ? trimSentence(newText, Math.min(cap, 80)) : safeString(payload.text),
    helper: newHelper.length > 0 ? trimSentence(newHelper, Math.min(cap, 240)) : safeString(payload.helper),
  };
}

async function regenerateFullWidthImage(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI, options?: RegenOptions): Promise<Record<string, unknown> | null> {
  const url = safeString(payload.imageUrl);
  if (!url) return null;
  const system = buildSystem(
    "Du bist ein deutschsprachiger Whisky-Redakteur und beschriftest ein Hero-Bild fuer eine Tasting-Story. Liefere einen knappen Alt-Text (Bildbeschreibung fuer Screenreader) und eine optionale, atmosphaerische Caption. Bildquelle bleibt unveraendert. Antworte ausschliesslich mit einem JSON-Objekt der Form {\"alt\": \"<text>\", \"caption\": \"<text>\"}.",
    options,
  );
  const current = [
    `Bild-URL (NICHT veraendern): ${url}`,
    `Aktueller Alt-Text: ${safeString(payload.alt)}`,
    `Aktuelle Caption: ${safeString(payload.caption)}`,
  ].join("\n");
  const user = `${tastingContextLines(data)}\n\n${current}` + buildUserExtras(options);
  const raw = await callOpenAi(openai, system, user, true, options);
  const parsed = parseJsonObject(raw);
  if (!parsed) return null;
  const newAlt = safeString(parsed.alt).trim();
  const newCaption = safeString(parsed.caption).trim();
  if (newAlt.length === 0 && newCaption.length === 0) return null;
  const cap = lengthCapFor(options);
  return {
    ...payload,
    alt: newAlt.length > 0 ? trimSentence(newAlt, Math.min(cap, 200)) : safeString(payload.alt),
    caption: newCaption.length > 0 ? trimText(newCaption, Math.min(cap, 600)) : safeString(payload.caption),
  };
}

async function regenerateImageGallery(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI, options?: RegenOptions): Promise<Record<string, unknown> | null> {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const visibleItems = items.filter((it) => isPlainRecord(it) && safeString(it.url).length > 0);
  if (visibleItems.length === 0) return null;
  const system = buildSystem(
    "Du bist ein deutschsprachiger Whisky-Redakteur und beschriftest eine Bilder-Galerie einer Tasting-Story. Liefere fuer jedes Bild einen Alt-Text und eine kurze Caption. Bildquellen bleiben unveraendert. Antworte ausschliesslich mit einem JSON-Objekt der Form {\"items\": [{\"alt\": \"<text>\", \"caption\": \"<text>\"}, ...]}. Reihenfolge entspricht der Eingabe.",
    options,
  );
  const itemLines = items.map((it, idx) => {
    const rec = isPlainRecord(it) ? it : {};
    const url = safeString(rec.url);
    return `${idx + 1}|url=${url ? "vorhanden" : "leer"}|alt=${safeString(rec.alt).slice(0, 120)}|caption=${safeString(rec.caption).slice(0, 160)}`;
  }).join("\n");
  const user = `${tastingContextLines(data)}\n\nBilder (idx|url|alt|caption):\n${itemLines}` + buildUserExtras(options);
  const raw = await callOpenAi(openai, system, user, true, options);
  const parsed = parseJsonObject(raw);
  const newItemsRaw = parsed && Array.isArray(parsed.items) ? parsed.items : null;
  if (!newItemsRaw) return null;
  const cap = lengthCapFor(options);
  const altCap = Math.min(cap, 200);
  const captionCap = Math.min(cap, 400);
  let updated = 0;
  const nextItems = items.map((it, idx) => {
    const cur = isPlainRecord(it) ? it : {};
    if (!safeString(cur.url)) return cur;
    const incoming = newItemsRaw[idx];
    const incomingRec = isPlainRecord(incoming) ? incoming : {};
    const newAlt = safeString(incomingRec.alt).trim();
    const newCaption = safeString(incomingRec.caption).trim();
    const merged = {
      ...cur,
      alt: newAlt.length > 0 ? trimSentence(newAlt, altCap) : safeString(cur.alt),
      caption: newCaption.length > 0 ? trimText(newCaption, captionCap) : safeString(cur.caption),
    };
    if (newAlt.length > 0 || newCaption.length > 0) updated += 1;
    return merged;
  });
  if (updated === 0) return null;
  return { ...payload, items: nextItems };
}

export async function regenerateBlockWithAi(
  blockType: RegeneratableBlockType,
  currentPayload: Record<string, unknown>,
  data: AggregatedTastingStoryData,
  openai: OpenAI,
  options?: RegenOptions,
): Promise<Record<string, unknown> | null> {
  switch (blockType) {
    case "winner-hero": return regenerateWinnerHero(currentPayload, data, openai, options);
    case "finale-card": return regenerateFinaleCard(currentPayload, data, openai, options);
    case "taster-grid": return regenerateTasterGrid(currentPayload, data, openai, options);
    case "ranking-list": return regenerateRankingList(currentPayload, data, openai, options);
    case "blind-results": return regenerateBlindResults(currentPayload, data, openai, options);
    case "whisky-card-grid": return regenerateWhiskyCardGrid(currentPayload, data, openai, options);
    case "hero-cover": return regenerateHeroCover(currentPayload, data, openai, options);
    case "text-section": return regenerateTextSection(currentPayload, data, openai, options);
    case "quote": return regenerateQuote(currentPayload, data, openai, options);
    case "feature-cards": return regenerateFeatureCards(currentPayload, data, openai, options);
    case "stats-grid": return regenerateStatsGrid(currentPayload, data, openai, options);
    case "two-column": return regenerateTwoColumn(currentPayload, data, openai, options);
    case "cta-button": return regenerateCtaButton(currentPayload, data, openai, options);
    case "full-width-image": return regenerateFullWidthImage(currentPayload, data, openai, options);
    case "image-gallery": return regenerateImageGallery(currentPayload, data, openai, options);
    default: return null;
  }
}

export async function generateSingleWhiskyHandoutText(
  whiskyId: string,
  data: AggregatedTastingStoryData,
  openai: OpenAI,
  options?: RegenOptions,
): Promise<string | null> {
  const w = data.whiskies.find((x) => x.id === whiskyId);
  if (!w) return null;
  const system = buildSystem(
    "Du bist ein deutschsprachiger Whisky-Redakteur. Schreibe einen sinnlichen, kompakten Steckbrief-Text fuer das Tasting-Programm zu genau einem Whisky. Drei bis fuenf Saetze, reiner Text, kein Werbe-Tonfall, keine Anfuehrungszeichen, keine Listen. Antworte ausschliesslich mit dem Steckbrief-Text.",
    options,
  );
  const desc = [
    w.distillery,
    w.region,
    w.age ? `${w.age}J` : null,
    w.caskType,
    w.abv ? `${w.abv}%` : null,
  ].filter(Boolean).join(" / ");
  const note = w.handoutExcerpt ?? w.hostSummary ?? w.notes ?? "";
  const userParts = [
    `Tasting: ${data.meta.title}`,
    `Whisky: ${w.name}`,
    desc ? `Profil: ${desc}` : null,
    note ? `Notiz: ${note.slice(0, 600)}` : null,
  ].filter(Boolean).join("\n");
  const raw = await callOpenAi(openai, system, userParts + buildUserExtras(options), false, options);
  if (!raw) return null;
  const cleaned = raw.replace(/^["“”']+|["“”']+$/g, "").trim();
  if (cleaned.length === 0) return null;
  return trimText(cleaned, lengthCapFor(options));
}

export async function summarizeWhiskyHandoutText(
  whiskyName: string,
  rawSourceText: string,
  openai: OpenAI,
  options?: RegenOptions,
): Promise<string | null> {
  const trimmed = rawSourceText.replace(/\s+/g, " ").trim();
  if (trimmed.length === 0) return null;
  const system = buildSystem(
    "Du bist ein deutschsprachiger Whisky-Redakteur. Verdichte den uebergebenen Handout-Rohtext zu einem sinnlichen, kompakten Steckbrief von drei bis fuenf Saetzen. Reiner Text, keine Listen, keine Anfuehrungszeichen. Halte dich strikt an Informationen, die im Rohtext stehen, und erfinde nichts dazu. Antworte ausschliesslich mit dem Steckbrief-Text.",
    options,
  );
  const truncated = trimmed.length > 8000 ? `${trimmed.slice(0, 8000)}…` : trimmed;
  const user = `Whisky: ${whiskyName}\n\nHandout-Rohtext:\n${truncated}` + buildUserExtras(options);
  const raw = await callOpenAi(openai, system, user, false, options);
  if (!raw) return null;
  const cleaned = raw.replace(/^["“”']+|["“”']+$/g, "").trim();
  if (cleaned.length === 0) return null;
  return trimText(cleaned, lengthCapFor(options));
}
