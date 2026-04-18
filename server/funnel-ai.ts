import { getAIClient } from "./ai-client";
import { getCountersInRange, getDimensionsInRange, sumCounters, type CounterRow } from "./funnel-store";

interface CacheEntry { ts: number; value: any }
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function cacheGet(key: string): any | null {
  const e = CACHE.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL_MS) { CACHE.delete(key); return null; }
  return e.value;
}
function cacheSet(key: string, value: any): void {
  CACHE.set(key, { ts: Date.now(), value });
}

export interface FunnelSnapshot {
  rangeHours: number;
  totals: Record<string, number>;
  topSources: Array<{ source: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
  topDevices: Array<{ device: string; count: number }>;
  topPages: Array<{ page: string; count: number }>;
  histograms: Record<string, Array<{ label: string; count: number }>>;
  signupFunnel: { view: number; firstFocus: number; submitAttempt: number; submitSuccess: number; dropoffPct: number };
  storyFunnel: { view: number; engaged: number; finished: number; ctaClick: number };
  hourly: Array<{ hour: string; storyView: number; landingView: number; signupSuccess: number }>;
}

function topN<T extends { count: number }>(arr: T[], n: number): T[] {
  return arr.slice().sort((a, b) => b.count - a.count).slice(0, n);
}

function aggregate(rows: CounterRow[]): Pick<FunnelSnapshot, "topSources" | "topCountries" | "topDevices" | "topPages"> {
  const sources = new Map<string, number>();
  const countries = new Map<string, number>();
  const devices = new Map<string, number>();
  const pages = new Map<string, number>();
  for (const r of rows) {
    if (r.eventName !== "story_view" && r.eventName !== "landing_view" && r.eventName !== "page_view") continue;
    const src = r.utmSource || "(direct)";
    sources.set(src, (sources.get(src) || 0) + r.count);
    if (r.country) countries.set(r.country, (countries.get(r.country) || 0) + r.count);
    if (r.deviceType) devices.set(r.deviceType, (devices.get(r.deviceType) || 0) + r.count);
    const p = r.pagePath || "(unknown)";
    pages.set(p, (pages.get(p) || 0) + r.count);
  }
  return {
    topSources: topN(Array.from(sources, ([source, count]) => ({ source, count })), 8),
    topCountries: topN(Array.from(countries, ([country, count]) => ({ country, count })), 8),
    topDevices: topN(Array.from(devices, ([device, count]) => ({ device, count })), 5),
    topPages: topN(Array.from(pages, ([page, count]) => ({ page, count })), 10),
  };
}

function hourlyBreakdown(rows: CounterRow[]): FunnelSnapshot["hourly"] {
  const map = new Map<string, { storyView: number; landingView: number; signupSuccess: number }>();
  for (const r of rows) {
    const h = r.bucketHour;
    let cur = map.get(h);
    if (!cur) { cur = { storyView: 0, landingView: 0, signupSuccess: 0 }; map.set(h, cur); }
    if (r.eventName === "story_view") cur.storyView += r.count;
    else if (r.eventName === "landing_view") cur.landingView += r.count;
    else if (r.eventName === "signup_submit_success") cur.signupSuccess += r.count;
  }
  return Array.from(map, ([hour, v]) => ({ hour, ...v })).sort((a, b) => a.hour.localeCompare(b.hour));
}

export async function buildSnapshot(rangeHours: number, filter?: { utmSource?: string }): Promise<FunnelSnapshot> {
  const rowsAll = await getCountersInRange(rangeHours);
  const dims = await getDimensionsInRange(rangeHours);
  const rows = filter?.utmSource
    ? rowsAll.filter(r => r.utmSource === filter.utmSource)
    : rowsAll;

  const eventTotals: Record<string, number> = {};
  for (const r of rows) eventTotals[r.eventName] = (eventTotals[r.eventName] || 0) + r.count;

  const histograms: Record<string, Array<{ label: string; count: number }>> = {};
  for (const d of dims) {
    if (!histograms[d.dimension]) histograms[d.dimension] = [];
    const existing = histograms[d.dimension].find(b => b.label === d.bucketLabel);
    if (existing) existing.count += d.count;
    else histograms[d.dimension].push({ label: d.bucketLabel, count: d.count });
  }

  const view = sumCounters(rows, "signup_view");
  const firstFocus = sumCounters(rows, "signup_field_first_focus");
  const submitAttempt = sumCounters(rows, "signup_submit_attempt");
  const submitSuccess = sumCounters(rows, "signup_submit_success");
  const dropoffPct = view > 0 ? Math.round(((view - submitSuccess) / view) * 100) : 0;

  return {
    rangeHours,
    totals: eventTotals,
    ...aggregate(rows),
    histograms,
    signupFunnel: { view, firstFocus, submitAttempt, submitSuccess, dropoffPct },
    storyFunnel: {
      view: sumCounters(rows, "story_view"),
      engaged: sumCounters(rows, "story_engaged"),
      finished: sumCounters(rows, "story_finished"),
      ctaClick: sumCounters(rows, "story_cta_click"),
    },
    hourly: hourlyBreakdown(rows),
  };
}

export interface AIAnalysis {
  cached: boolean;
  available: boolean;
  reason?: string;
  text?: string;
  generatedAt: number;
}

export async function analyzePeriod(rangeHours: number, filter?: { utmSource?: string }, requesterId?: string): Promise<AIAnalysis> {
  const cacheKey = `analyze:${rangeHours}:${filter?.utmSource || ""}`;
  const cached = cacheGet(cacheKey);
  if (cached) return { ...cached, cached: true };

  const snapshot = await buildSnapshot(rangeHours, filter);
  const ai = await getAIClient(requesterId, "funnel_analysis");
  if (!ai.client) {
    return { cached: false, available: false, reason: ai.reason || "AI not available", generatedAt: Date.now() };
  }

  const prompt = `Du bist ein freundlicher Produkt-Coach für eine Whisky-Tasting-App (CaskSense Labs).
Erkläre die folgenden anonymen, aggregierten Funnel-Zahlen in einfacher Sprache (3-5 Absätze, deutsch).
Strukturiere als: 1) Was war los?  2) Was hat funktioniert?  3) Wo verlieren wir Leute?  4) Was würde ich als Nächstes ausprobieren?
Sei konkret, nenne Zahlen, formuliere Hypothesen. Keine Floskeln, keine Aufzählungen ohne Inhalt.

Zeitraum: letzte ${rangeHours}h${filter?.utmSource ? ` · Filter UTM-Quelle="${filter.utmSource}"` : ""}

Daten (anonym, aggregiert):
${JSON.stringify(snapshot, null, 2)}`;

  try {
    const completion = await ai.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Du bist ein freundlicher, präziser Produkt-Coach. Du analysierst nur aggregierte, anonyme Daten." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 900,
    });
    const text = completion.choices[0]?.message?.content?.trim() || "(leere Antwort)";
    const result = { cached: false, available: true, text, generatedAt: Date.now() };
    cacheSet(cacheKey, result);
    return result;
  } catch (e) {
    return { cached: false, available: false, reason: (e as Error).message, generatedAt: Date.now() };
  }
}

export interface Anomaly {
  hour: string;
  metric: string;
  current: number;
  median7d: number;
  deltaPct: number;
  message: string;
}

export async function detectAnomalies(): Promise<Anomaly[]> {
  const rows = await getCountersInRange(24 * 8);
  const today = new Date(); today.setUTCMinutes(0, 0, 0);
  const todayHour = today.getUTCHours();
  const out: Anomaly[] = [];

  const tracked = ["story_view", "landing_view", "signup_submit_success"];
  for (const metric of tracked) {
    const byHour: Record<number, number[]> = {};
    let todayCount = 0;
    for (const r of rows) {
      if (r.eventName !== metric) continue;
      const d = new Date(r.bucketHour);
      const h = d.getUTCHours();
      const isToday = d.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);
      if (isToday && h === todayHour) todayCount += r.count;
      else if (!isToday) {
        if (!byHour[h]) byHour[h] = [];
        byHour[h].push(r.count);
      }
    }
    const samples = byHour[todayHour] || [];
    if (samples.length < 3) continue;
    const median = samples.slice().sort((a, b) => a - b)[Math.floor(samples.length / 2)];
    if (median < 3) continue;
    const deltaPct = Math.round(((todayCount - median) / median) * 100);
    if (Math.abs(deltaPct) >= 60) {
      out.push({
        hour: today.toISOString(),
        metric,
        current: todayCount,
        median7d: median,
        deltaPct,
        message: deltaPct < 0
          ? `Achtung: ${metric} aktuell ${todayCount}, üblicher 7-Tage-Median für diese Stunde ${median} (${deltaPct}%).`
          : `Hinweis: ${metric} aktuell ${todayCount}, üblicher 7-Tage-Median ${median} (+${deltaPct}%).`,
      });
    }
  }
  return out;
}
