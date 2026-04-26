import OpenAI from "openai";
import type { AggregatedTastingStoryData } from "./tastingStoryAggregate";

export type RegeneratableBlockType =
  | "winner-hero"
  | "finale-card"
  | "taster-grid"
  | "ranking-list"
  | "blind-results"
  | "whisky-card-grid";

export const REGENERATABLE_BLOCK_TYPES: RegeneratableBlockType[] = [
  "winner-hero",
  "finale-card",
  "taster-grid",
  "ranking-list",
  "blind-results",
  "whisky-card-grid",
];

export function isRegeneratable(type: string): type is RegeneratableBlockType {
  return (REGENERATABLE_BLOCK_TYPES as string[]).includes(type);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function trimSentence(value: string, max = 280): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

async function callOpenAi(openai: OpenAI, system: string, user: string, jsonMode: boolean): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.7,
    max_tokens: 800,
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

async function regenerateWinnerHero(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI): Promise<Record<string, unknown> | null> {
  const winner = data.winner;
  if (!winner || winner.avgScore === null) return null;
  const system = "Du bist ein deutschsprachiger Whisky-Redakteur im Stil des Magazins der Brennerei. Schreibe einen einzigen, kraftvollen, atmosphaerischen Schlusssatz fuer den Sieger des Abends. Maximal 28 Woerter, keine Anfuehrungszeichen, kein Code, nur den Satz.";
  const userParts = [
    `Sieger: ${winner.name}`,
    winner.distillery ? `Destillerie: ${winner.distillery}` : null,
    `Punkte: ${winner.avgScore.toFixed(1)} aus ${winner.voters} Bewertungen`,
    `Tasting-Titel: ${data.meta.title}`,
  ].filter(Boolean).join("\n");
  const raw = await callOpenAi(openai, system, userParts, false);
  if (!raw) return null;
  return { ...payload, closingLine: trimSentence(raw, 240) };
}

async function regenerateFinaleCard(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI): Promise<Record<string, unknown> | null> {
  const system = "Du bist ein deutschsprachiger Whisky-Redakteur. Schreibe einen einzigen waermenden Verabschiedungssatz fuer den Abschluss eines Tasting-Abends. Maximal 26 Woerter, keine Anfuehrungszeichen, nur den Satz.";
  const top = data.ranking.slice(0, 3).map((r) => `${r.position}. ${r.name}`).join(", ");
  const userParts = [
    `Tasting: ${data.meta.title}`,
    data.meta.location ? `Ort: ${data.meta.location}` : null,
    `Whiskys: ${data.whiskies.length}, Verkoster: ${data.participants.length}`,
    top ? `Top: ${top}` : null,
  ].filter(Boolean).join("\n");
  const raw = await callOpenAi(openai, system, userParts, false);
  if (!raw) return null;
  return { ...payload, closingLine: trimSentence(raw, 240) };
}

async function regenerateTasterGrid(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI): Promise<Record<string, unknown> | null> {
  if (data.participants.length === 0) return null;
  const system = "Du bist ein deutschsprachiger Whisky-Redakteur. Erzeuge fuer jeden uebergebenen Verkoster einen warmherzigen, praezisen Fun-Fakt (max 18 Woerter, keine Anfuehrungszeichen). Antworte ausschliesslich mit einem JSON-Objekt der Form {\"funFacts\": {\"<id>\": \"<text>\"}}.";
  const profileLines = data.participants.map((p) => {
    const top = p.topPickWhiskyId ? data.whiskies.find((w) => w.id === p.topPickWhiskyId) : null;
    const avg = p.avgGiven !== null ? `${p.avgGiven.toFixed(1)} im Schnitt` : "noch keine Wertung";
    return `${p.id}|${p.name}|${p.isHost ? "Host" : "Gast"}|${p.ratingCount} Bewertungen|${avg}|Top-Pick: ${top?.name ?? "n/a"}`;
  }).join("\n");
  const user = `Tasting: ${data.meta.title}\nVerkoster (id|name|rolle|count|avg|topPick):\n${profileLines}`;
  const raw = await callOpenAi(openai, system, user, true);
  const parsed = parseJsonObject(raw);
  const funFacts = parsed && isPlainRecord(parsed.funFacts) ? parsed.funFacts : null;
  if (!funFacts) return null;
  const overridesPrev = isPlainRecord(payload.overrides) ? payload.overrides : {};
  const nextOverrides: Record<string, { funFact: string }> = {};
  for (const p of data.participants) {
    const cur = isPlainRecord(overridesPrev[p.id]) ? (overridesPrev[p.id] as { funFact?: unknown }) : {};
    const fresh = safeString(funFacts[p.id]);
    nextOverrides[p.id] = { funFact: fresh.length > 0 ? trimSentence(fresh, 160) : safeString(cur.funFact) };
  }
  return { ...payload, overrides: nextOverrides };
}

async function regenerateRankingList(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI): Promise<Record<string, unknown> | null> {
  if (data.ranking.length === 0) return null;
  const system = "Du bist ein deutschsprachiger Whisky-Redakteur. Schreibe fuer jeden Whisky im Ranking eine sinnliche Kurzkritik (max 22 Woerter). Antworte ausschliesslich mit einem JSON-Objekt der Form {\"commentary\": {\"<whiskyId>\": \"<text>\"}}.";
  const lines = data.ranking.map((r) => {
    const w = data.whiskies.find((x) => x.id === r.whiskyId);
    const desc = w ? [w.distillery, w.region, w.age ? `${w.age}J` : null, w.caskType].filter(Boolean).join(" / ") : "";
    return `${r.whiskyId}|#${r.position}|${r.name}|${r.avgScore !== null ? r.avgScore.toFixed(1) : "—"} Pkt|${desc}`;
  }).join("\n");
  const user = `Tasting: ${data.meta.title}\nRanking (whiskyId|platz|name|punkte|profil):\n${lines}`;
  const raw = await callOpenAi(openai, system, user, true);
  const parsed = parseJsonObject(raw);
  const commentary = parsed && isPlainRecord(parsed.commentary) ? parsed.commentary : null;
  if (!commentary) return null;
  const overridesPrev = isPlainRecord(payload.overrides) ? payload.overrides : {};
  const nextOverrides: Record<string, { commentary: string }> = {};
  for (const r of data.ranking) {
    const cur = isPlainRecord(overridesPrev[r.whiskyId]) ? (overridesPrev[r.whiskyId] as { commentary?: unknown }) : {};
    const fresh = safeString(commentary[r.whiskyId]);
    nextOverrides[r.whiskyId] = { commentary: fresh.length > 0 ? trimSentence(fresh, 200) : safeString(cur.commentary) };
  }
  return { ...payload, overrides: nextOverrides };
}

async function regenerateWhiskyCardGrid(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI): Promise<Record<string, unknown> | null> {
  if (data.whiskies.length === 0) return null;
  const system = "Du bist ein deutschsprachiger Whisky-Redakteur. Schreibe pro Whisky einen kurzen, sinnlichen Steckbrief-Satz fuer das Tasting-Programm (max 22 Woerter, keine Anfuehrungszeichen, kein Werbe-Tonfall). Antworte ausschliesslich mit einem JSON-Objekt der Form {\"handout\": {\"<whiskyId>\": \"<text>\"}}.";
  const lines = data.whiskies.map((w) => {
    const desc = [w.distillery, w.region, w.age ? `${w.age}J` : null, w.caskType, w.abv ? `${w.abv}%` : null]
      .filter(Boolean)
      .join(" / ");
    const note = w.handoutExcerpt ?? w.hostSummary ?? w.notes ?? "";
    return `${w.id}|${w.name}|${desc}|${note.slice(0, 200)}`;
  }).join("\n");
  const user = `Tasting: ${data.meta.title}\nWhiskys (id|name|profil|notiz):\n${lines}`;
  const raw = await callOpenAi(openai, system, user, true);
  const parsed = parseJsonObject(raw);
  const handout = parsed && isPlainRecord(parsed.handout) ? parsed.handout : null;
  if (!handout) return null;
  const overridesPrev = isPlainRecord(payload.overrides) ? payload.overrides : {};
  const nextOverrides: Record<string, { handoutText: string; scoreLabel: string }> = {};
  for (const w of data.whiskies) {
    const cur = isPlainRecord(overridesPrev[w.id]) ? (overridesPrev[w.id] as { handoutText?: unknown; scoreLabel?: unknown }) : {};
    const fresh = safeString(handout[w.id]);
    nextOverrides[w.id] = {
      handoutText: fresh.length > 0 ? trimSentence(fresh, 200) : safeString(cur.handoutText),
      scoreLabel: safeString(cur.scoreLabel),
    };
  }
  return { ...payload, overrides: nextOverrides };
}

async function regenerateBlindResults(payload: Record<string, unknown>, data: AggregatedTastingStoryData, openai: OpenAI): Promise<Record<string, unknown> | null> {
  const blind = data.blindResults;
  if (!blind || blind.length === 0) return null;
  const system = "Du bist ein deutschsprachiger Whisky-Redakteur. Schreibe pro Whisky eine kurze Erzaehlung zur Blindverkostung (max 24 Woerter): wer war nah, wer war weit, was sagt das aus. Antworte ausschliesslich mit einem JSON-Objekt der Form {\"narration\": {\"<whiskyId>\": \"<text>\"}}.";
  const lines = blind.map((b) => {
    const guesses = b.guesses.map((g) => `${g.participantName}:${g.guessAbv ?? "?"}`).join(", ");
    return `${b.whiskyId}|${b.whiskyName}|tatsaechlich ${b.actualAbv ?? "?"}%|${guesses}`;
  }).join("\n");
  const user = `Tasting: ${data.meta.title}\nBlind-Tipps (id|name|tatsaechlich|tipps):\n${lines}`;
  const raw = await callOpenAi(openai, system, user, true);
  const parsed = parseJsonObject(raw);
  const narration = parsed && isPlainRecord(parsed.narration) ? parsed.narration : null;
  if (!narration) return null;
  const overridesPrev = isPlainRecord(payload.overrides) ? payload.overrides : {};
  const nextOverrides: Record<string, { narration: string }> = {};
  for (const b of blind) {
    const cur = isPlainRecord(overridesPrev[b.whiskyId]) ? (overridesPrev[b.whiskyId] as { narration?: unknown }) : {};
    const fresh = safeString(narration[b.whiskyId]);
    nextOverrides[b.whiskyId] = { narration: fresh.length > 0 ? trimSentence(fresh, 220) : safeString(cur.narration) };
  }
  return { ...payload, overrides: nextOverrides };
}

export async function regenerateBlockWithAi(
  blockType: RegeneratableBlockType,
  currentPayload: Record<string, unknown>,
  data: AggregatedTastingStoryData,
  openai: OpenAI,
): Promise<Record<string, unknown> | null> {
  switch (blockType) {
    case "winner-hero": return regenerateWinnerHero(currentPayload, data, openai);
    case "finale-card": return regenerateFinaleCard(currentPayload, data, openai);
    case "taster-grid": return regenerateTasterGrid(currentPayload, data, openai);
    case "ranking-list": return regenerateRankingList(currentPayload, data, openai);
    case "blind-results": return regenerateBlindResults(currentPayload, data, openai);
    case "whisky-card-grid": return regenerateWhiskyCardGrid(currentPayload, data, openai);
    default: return null;
  }
}
