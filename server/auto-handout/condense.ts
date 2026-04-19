import type OpenAI from "openai";
import type { AutoHandoutChapter, AutoHandoutSource } from "@shared/schema";
import { AUTO_HANDOUT_CHAPTER_TYPES } from "@shared/schema";
import type { RawSource } from "./research.js";

const TONE_LABEL: Record<string, string> = {
  sachlich: "sachlich, neutral, faktenorientiert",
  erzaehlerisch: "erzählerisch, lebendig, mit Atmosphäre",
  locker: "locker, persönlich, mit Augenzwinkern",
};

const LENGTH_TARGET: Record<string, string> = {
  compact: "kompakt, 60–100 Wörter",
  medium: "mittel, 120–200 Wörter",
  long: "ausführlich, 250–400 Wörter",
};

const CHAPTER_PROMPTS_DISTILLERY: Record<string, string> = {
  steckbrief:
    "Schreibe einen kurzen, faktischen Steckbrief der Destille: Standort/Region, Gründungsjahr, Status (aktiv/geschlossen), Eigentümer, jährliche Produktion und Stilausrichtung — nur was die Quellen hergeben.",
  geschichte:
    "Erzähle die wichtigsten Stationen der Geschichte der Destille auf etwa 3 Minuten Lesezeit: Gründung, Krisen, Schließungen/Wiedereröffnungen, Eigentümerwechsel, prägende Personen.",
  stil:
    "Beschreibe den typischen Stil und Charakter der Brennerei: Brennblasen-Form, Fassmanagement, Aromatik, was diese Destille unverwechselbar macht.",
  weniger_bekannt:
    "Sammle 3–5 Fakten über diese Destille, die selbst regelmäßige Whisky-Trinker meist nicht wissen. Vermeide allgemein Bekanntes; zitiere die Quelle, wenn etwas anekdotisch ist.",
  geheimtipps:
    "Gib Geheimtipps und Insider-Wissen rund um die Destille: empfohlene besondere Abfüllungen, Visitor-Center-Tipps, regionale Eigenheiten, schwer zu findende Editionen.",
  stories:
    "Erzähle 2–3 kurze Stories oder Anekdoten aus der Geschichte der Destille — pointiert, mit Personen und Schauplätzen. Wenn nichts Substanzielles in den Quellen steht, sage das offen.",
  aktuelles:
    "Was passiert aktuell rund um die Destille? Neue Releases, Eigentümer-News, Investitionen, Awards der letzten Jahre. Wenn nichts Aktuelles in den Quellen, sage das offen.",
  kontroversen:
    "Welche Kontroversen, Mythen oder strittigen Punkte gibt es rund um die Destille? Markiere klar, was Mythos und was belegt ist.",
};

const CHAPTER_PROMPTS_WHISKY: Record<string, string> = {
  steckbrief:
    "Schreibe einen knappen Steckbrief dieser Abfüllung: Destille, Alter, ABV, Fassart, Bottler, Auflage falls bekannt — nur was die Quellen hergeben.",
  besonderes:
    "Was macht genau diese Abfüllung besonders? Hebe einzigartige Eigenschaften hervor (Fass, Vintage, limitierte Anzahl, Reife, Geschichte).",
  sensorik:
    "Sensorik-Erwartung: was kann der Verkoster typischerweise erwarten in Nase, Geschmack, Abgang? Bleibe neutral und beziehe dich auf die Quellen, kein erfundenes Tasting-Bingo.",
  sammler:
    "Sammler-Notiz: aktuelle Sammlerlage, Verfügbarkeit, Preisentwicklung soweit bekannt. Wenn keine Daten vorliegen, sage das offen.",
};

function buildPrompt(opts: {
  subject: string;
  subjectContext: string;
  chapterPrompt: string;
  chapterTitle: string;
  language: string;
  tone: string;
  lengthPref: string;
  sources: RawSource[];
}): { system: string; user: string } {
  const langName = opts.language === "en" ? "English" : "Deutsch";
  const toneStr = TONE_LABEL[opts.tone] || TONE_LABEL.erzaehlerisch;
  const lengthStr = LENGTH_TARGET[opts.lengthPref] || LENGTH_TARGET.medium;
  const sourceBlock = opts.sources
    .map((s, i) => `[${i + 1}] ${s.title}\n${s.url}\n${s.text}`)
    .join("\n\n---\n\n");
  const system = `Du bist ein Whisky-Redakteur, der Tasting-Handouts schreibt. Sprache: ${langName}. Stil: ${toneStr}. Länge: ${lengthStr}.
Wichtige Regeln:
- Erfinde keine Fakten. Wenn die Quellen einen Punkt nicht hergeben, sage es offen ("laut Foren-Quellen…", "nicht eindeutig belegt").
- Wenn du eine konkrete Aussage triffst, hänge die Quellennummer in eckigen Klammern an, z.B. "Gegründet 1825 [1]".
- Schreibe in klaren Absätzen, kein Listengewichtelung mit Sternchen, kein Markdown-Header, höchstens 1–2 kurze Aufzählungslisten.
- Antworte als JSON: {"content": "...", "confidence": "high|medium|low", "usedSources": [1,2,...]}.
- "confidence": high wenn mehrere harte Quellen (Wikipedia/Destille) übereinstimmen, medium wenn nur Web/Blog, low wenn überwiegend Foren oder Spekulation.`;
  const user = `Thema-Subjekt: ${opts.subject}
${opts.subjectContext ? `Kontext: ${opts.subjectContext}\n` : ""}
Kapitel: ${opts.chapterTitle}
Aufgabe: ${opts.chapterPrompt}

Quellenmaterial (du darfst sie zitieren mit [n]):

${sourceBlock || "(keine Quellen verfügbar — schreibe entsprechend kurz und mit confidence=low)"}`;
  return { system, user };
}

export interface CondenseResult {
  content: string;
  confidence: "high" | "medium" | "low";
  usedSources: number[];
}

async function callAi(client: OpenAI, system: string, user: string): Promise<CondenseResult> {
  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.6,
    max_tokens: 900,
    response_format: { type: "json_object" },
  });
  const raw = resp.choices?.[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(raw);
    const content = String(parsed.content || "").trim();
    const confidence: CondenseResult["confidence"] =
      parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low"
        ? parsed.confidence
        : "medium";
    const usedSources = Array.isArray(parsed.usedSources)
      ? parsed.usedSources.filter((n: any) => typeof n === "number" && n >= 1).map((n: number) => n - 1)
      : [];
    return { content, confidence, usedSources };
  } catch {
    return { content: raw.trim(), confidence: "low", usedSources: [] };
  }
}

export async function generateChaptersForDistillery(
  client: OpenAI,
  opts: {
    distillery: string;
    sources: RawSource[];
    language: string;
    tone: string;
    lengthPref: string;
    chapterIds?: string[];
  },
): Promise<{ chapters: AutoHandoutChapter[]; sources: AutoHandoutSource[] }> {
  const allChapters = AUTO_HANDOUT_CHAPTER_TYPES.distillery;
  const wanted = opts.chapterIds && opts.chapterIds.length > 0
    ? allChapters.filter((c) => opts.chapterIds!.includes(c.id))
    : allChapters;

  const out: AutoHandoutChapter[] = [];
  for (const ch of wanted) {
    const prompt = CHAPTER_PROMPTS_DISTILLERY[ch.id];
    if (!prompt) continue;
    try {
      const { system, user } = buildPrompt({
        subject: opts.distillery,
        subjectContext: `Whisky-Destille`,
        chapterPrompt: prompt,
        chapterTitle: ch.title,
        language: opts.language,
        tone: opts.tone,
        lengthPref: opts.lengthPref,
        sources: opts.sources,
      });
      const result = await callAi(client, system, user);
      out.push({
        id: ch.id,
        type: ch.id,
        title: ch.title,
        content: result.content,
        sources: result.usedSources,
        confidence: result.confidence,
        tone: opts.tone,
        length: opts.lengthPref,
      });
    } catch (e) {
      console.warn(`[auto-handout] failed chapter ${ch.id} for ${opts.distillery}:`, e);
    }
  }
  // strip "text" so we don't persist the raw fetched HTML in DB JSON
  const sourcesPersist: AutoHandoutSource[] = opts.sources.map((s) => ({
    url: s.url,
    title: s.title,
    snippet: s.snippet,
    source: s.source,
  }));
  return { chapters: out, sources: sourcesPersist };
}

export async function generateChaptersForWhisky(
  client: OpenAI,
  opts: {
    whisky: string;
    distillery: string | null;
    sources: RawSource[];
    language: string;
    tone: string;
    lengthPref: string;
    chapterIds?: string[];
  },
): Promise<{ chapters: AutoHandoutChapter[]; sources: AutoHandoutSource[] }> {
  const allChapters = AUTO_HANDOUT_CHAPTER_TYPES.whisky;
  const wanted = opts.chapterIds && opts.chapterIds.length > 0
    ? allChapters.filter((c) => opts.chapterIds!.includes(c.id))
    : allChapters;

  const out: AutoHandoutChapter[] = [];
  for (const ch of wanted) {
    const prompt = CHAPTER_PROMPTS_WHISKY[ch.id];
    if (!prompt) continue;
    try {
      const { system, user } = buildPrompt({
        subject: opts.whisky,
        subjectContext: opts.distillery ? `Abfüllung von ${opts.distillery}` : "",
        chapterPrompt: prompt,
        chapterTitle: ch.title,
        language: opts.language,
        tone: opts.tone,
        lengthPref: opts.lengthPref,
        sources: opts.sources,
      });
      const result = await callAi(client, system, user);
      out.push({
        id: ch.id,
        type: ch.id,
        title: ch.title,
        content: result.content,
        sources: result.usedSources,
        confidence: result.confidence,
        tone: opts.tone,
        length: opts.lengthPref,
      });
    } catch (e) {
      console.warn(`[auto-handout] failed chapter ${ch.id} for ${opts.whisky}:`, e);
    }
  }
  const sourcesPersist: AutoHandoutSource[] = opts.sources.map((s) => ({
    url: s.url,
    title: s.title,
    snippet: s.snippet,
    source: s.source,
  }));
  return { chapters: out, sources: sourcesPersist };
}
