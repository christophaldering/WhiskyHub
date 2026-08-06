// Tiefensuche: hartnaeckiger Preis-Agent fuer EINE Flasche.
// Anders als price-lookup.ts (ein Aufruf, drei Flaschen, Zeitdruck)
// arbeitet dieser Agent eine Stationsfolge in einer Schleife ab:
// Whiskybase -> Shop-Varianten -> Auktionsarchive. Er darf pro Lauf
// hoechstens MAX_STEPS Suchschritte bzw. MAX_MS Millisekunden brauchen
// und meldet nach jedem Schritt seinen Zustand ueber onProgress.
// Bewusst teuer (gpt-5 + Websuche) — wird nur auf ausdruecklichen
// Wunsch fuer einzelne Flaschen gestartet.
import { z } from "zod";

export interface PriceAgentInput {
  name: string;
  whiskybaseUrl?: string | null;
  distillery?: string | null;
  age?: string | null;
  abv?: number | null;
  caskType?: string | null;
}

export interface PriceAgentProgress {
  step: number;
  maxSteps: number;
  station: "whiskybase" | "shops" | "auctions" | "done";
  note: string;
}

export interface PriceAgentResult {
  priceRrp: number | null;
  priceRrpSource: string | null;
  priceMarket: number | null;
  priceMarketSource: string | null;
  priceCurrency: string | null;
  log: string;
  costEur: number;
  steps: number;
  durationMs: number;
}

const MAX_STEPS = 12;
const MAX_MS = 4 * 60 * 1000;

// EUR je 1M Tokens, Stand 08/2026 — bei OpenAI-Preisaenderung pflegen.
const PRICE_PER_1M = { input: 1.15, output: 9.2 };
const EUR_ROUND = (n: number) => Math.round(n * 100) / 100;

const stepSchema = z.object({
  action: z.enum(["continue", "finish"]),
  station: z.enum(["whiskybase", "shops", "auctions"]).optional(),
  note: z.string().max(200).optional(),
  rrp: z.number().min(0).max(1000000).nullable().optional(),
  market: z.number().min(0).max(1000000).nullable().optional(),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/).nullable().optional(),
  rrpSource: z.string().max(200).nullable().optional(),
  marketSource: z.string().max(200).nullable().optional(),
  summary: z.string().max(600).optional(),
});

function buildSystem(): string {
  return [
    "Du recherchierst hartnaeckig UVP (Originalpreis bei Erscheinen) und aktuellen Marktpreis EINER Whiskyflasche (0,7l) per Websuche.",
    "Du arbeitest in EINZELSCHRITTEN: pro Antwort genau EINE Suchaktion (Suche ausfuehren, die vielversprechendste Seite OEFFNEN, Preis aus der SEITE lesen — nie aus dem Snippet).",
    "Stationsfolge: (1) falls Whiskybase-URL gegeben, diese Seite zuerst. (2) Shops mit mehreren Query-Varianten: exakter Name, Name + kaufen, Name + Fassnummer, Destillerie + Alter + Fasstyp. (3) Auktions-/Archivseiten fuer den Marktwert ausverkaufter Abfuellungen (z.B. whiskyauction, scotchwhiskyauctions).",
    "Ein Preis auf einer AUSVERKAUFTEN Shopseite ist KEIN aktueller Marktpreis — als historischen Hinweis in note vermerken, weitersuchen.",
    "Melde NIE einen Preis, den du nicht auf einer geoeffneten Seite gelesen hast. Lieber null als geraten.",
    "Antworte nach JEDEM Schritt NUR mit JSON:",
    '{"action":"continue"|"finish","station":"whiskybase"|"shops"|"auctions","note":"<was du gerade getan/gefunden hast, 1 Satz>","rrp":<number|null>,"market":<number|null>,"currency":<ISO|null>,"rrpSource":<string|null>,"marketSource":<string|null>,"summary":"<nur bei finish: 2-4 Saetze Rechercheprotokoll: wo gefunden, wo nicht, warum>"}',
    'action "finish" sobald BEIDE Preise belegt sind ODER du alle Stationen ausgeschoepft hast.',
  ].join("\n");
}

function parseStep(text: string): z.infer<typeof stepSchema> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const parsed = stepSchema.safeParse(JSON.parse(m[0]));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function runPriceAgent(
  client: any,
  item: PriceAgentInput,
  onProgress: (p: PriceAgentProgress) => void,
  shouldStop: () => boolean,
): Promise<PriceAgentResult> {
  const t0 = Date.now();
  const model = process.env.AI_PRICE_AGENT_MODEL || "gpt-5";
  let inTok = 0, outTok = 0;
  const logLines: string[] = [];
  let rrp: number | null = null, market: number | null = null;
  let rrpSource: string | null = null, marketSource: string | null = null;
  let currency: string | null = null;
  let summary = "";
  let steps = 0;

  const desc = `name="${item.name}"` +
    (item.whiskybaseUrl ? ` whiskybase="${item.whiskybaseUrl}"` : "") +
    (item.distillery ? ` distillery="${item.distillery}"` : "") +
    (item.age ? ` age="${item.age}"` : "") +
    (item.abv ? ` abv=${item.abv}` : "") +
    (item.caskType ? ` cask="${item.caskType}"` : "");

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: buildSystem() },
    { role: "user", content: `Flasche: ${desc}\nBeginne mit Schritt 1.` },
  ];

  while (steps < MAX_STEPS && Date.now() - t0 < MAX_MS && !shouldStop()) {
    steps += 1;
    let res: any;
    try {
      res = await client.responses.create({
        model,
        tools: [{ type: "web_search" }],
        input: messages,
      });
    } catch (e: any) {
      logLines.push(`Schritt ${steps}: API-Fehler (${String(e?.message || e).slice(0, 120)})`);
      break;
    }
    inTok += res?.usage?.input_tokens ?? 0;
    outTok += res?.usage?.output_tokens ?? 0;
    const parsed = parseStep(res?.output_text || "");
    if (!parsed) {
      logLines.push(`Schritt ${steps}: Antwort nicht auswertbar`);
      messages.push({ role: "user", content: "Deine letzte Antwort war kein gueltiges JSON. Antworte NUR mit dem vereinbarten JSON und fuehre den naechsten Schritt aus." });
      continue;
    }
    // Neue Funde uebernehmen, aber nie einen belegten Wert durch null ueberschreiben.
    if (parsed.rrp != null && parsed.rrp > 0) { rrp = EUR_ROUND(parsed.rrp); rrpSource = parsed.rrpSource?.slice(0, 120) ?? rrpSource; }
    if (parsed.market != null && parsed.market > 0) { market = EUR_ROUND(parsed.market); marketSource = parsed.marketSource?.slice(0, 120) ?? marketSource; }
    if (parsed.currency && (rrp != null || market != null)) currency = parsed.currency.toUpperCase();
    if (parsed.note) logLines.push(`Schritt ${steps} [${parsed.station || "?"}]: ${parsed.note}`);
    onProgress({ step: steps, maxSteps: MAX_STEPS, station: parsed.station || "shops", note: parsed.note || "" });
    if (parsed.action === "finish") {
      summary = parsed.summary || "";
      break;
    }
    messages.push({ role: "assistant", content: JSON.stringify(parsed) });
    messages.push({ role: "user", content: `Gefundener Stand: rrp=${rrp ?? "null"}, market=${market ?? "null"}. Naechster Schritt (${steps + 1}/${MAX_STEPS}).` });
  }

  const costEur = EUR_ROUND((inTok / 1e6) * PRICE_PER_1M.input + (outTok / 1e6) * PRICE_PER_1M.output);
  const durationMs = Date.now() - t0;
  const header = `Tiefensuche ${new Date().toISOString().slice(0, 10)}: ${steps} Schritte, ${Math.round(durationMs / 1000)}s, ${costEur.toFixed(2)} EUR`;
  const log = [header, summary, ...logLines].filter(Boolean).join("\n");
  onProgress({ step: steps, maxSteps: MAX_STEPS, station: "done", note: "" });
  return { priceRrp: rrp, priceRrpSource: rrpSource, priceMarket: market, priceMarketSource: marketSource, priceCurrency: currency, log, costEur, steps, durationMs };
}
