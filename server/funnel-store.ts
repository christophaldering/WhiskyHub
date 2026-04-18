import { db } from "./db";
import { sql } from "drizzle-orm";
import type { Request } from "express";

export interface FunnelEvent {
  event: string;
  page?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  country?: string;
  language?: string;
  deviceType?: string;
  histogram?: { dimension: string; bucket: string };
  count?: number;
}

const ALLOWED_EVENTS = new Set([
  "story_view", "story_section_view", "story_cta_click",
  "story_blindtest_answer", "story_finished", "story_engaged",
  "landing_view", "landing_section_view", "landing_cta_click",
  "pdf_download",
  "signup_view", "signup_field_first_focus", "signup_field_blur_empty",
  "signup_validation_error", "signup_submit_attempt", "signup_submit_success",
  "tasting_step_view", "tasting_step_complete",
  "page_view",
]);

// Histogram-only events: write to dimension buckets but skip core counter to avoid inflation.
const HISTOGRAM_ONLY_EVENTS = new Set([
  "page_view_histogram", "story_dwell_histogram",
]);

const ALLOWED_DIMENSIONS = new Set([
  "scroll_depth", "read_time", "story_section_dwell",
]);

function bucketHourFor(d: Date = new Date()): Date {
  const h = new Date(d);
  h.setUTCMinutes(0, 0, 0);
  return h;
}

function clip(v: unknown, max = 64): string {
  if (typeof v !== "string") return "";
  return v.slice(0, max).replace(/[\u0000-\u001f]/g, "");
}

function deviceFromUA(ua: string | undefined): string {
  if (!ua) return "unknown";
  if (/mobile|iphone|android.*mobile/i.test(ua)) return "mobile";
  if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) return "tablet";
  return "desktop";
}

function langFromHeader(req: Request): string {
  const al = req.headers["accept-language"];
  if (typeof al !== "string") return "";
  const first = al.split(",")[0]?.trim().slice(0, 2).toLowerCase() || "";
  return /^[a-z]{2}$/.test(first) ? first : "";
}

function countryFromHeader(req: Request): string {
  const candidates = [
    req.headers["cf-ipcountry"],
    req.headers["x-vercel-ip-country"],
    req.headers["x-country"],
  ];
  for (const c of candidates) {
    if (typeof c === "string" && /^[A-Z]{2}$/.test(c)) return c;
  }
  return "";
}

export interface RequestMeta {
  country: string;
  language: string;
  deviceType: string;
  userAgent: string;
}

export function extractRequestMeta(req: Request): RequestMeta {
  const ua = (req.headers["user-agent"] as string | undefined) || "";
  return {
    country: countryFromHeader(req),
    language: langFromHeader(req),
    deviceType: deviceFromUA(ua),
    userAgent: ua,
  };
}

export async function recordEvents(
  events: FunnelEvent[],
  req: Request,
): Promise<{ accepted: number }> {
  if (!Array.isArray(events) || events.length === 0) return { accepted: 0 };
  const meta = extractRequestMeta(req);
  const bucket = bucketHourFor();
  let accepted = 0;
  for (const ev of events.slice(0, 50)) {
    if (!ev || typeof ev.event !== "string") continue;
    const isHistogramOnly = HISTOGRAM_ONLY_EVENTS.has(ev.event);
    if (!isHistogramOnly && !ALLOWED_EVENTS.has(ev.event)) continue;
    const count = Math.min(Math.max(Math.floor(ev.count || 1), 1), 50);
    const page = clip(ev.page, 128);
    const utmSource = clip(ev.utmSource, 64);
    const utmMedium = clip(ev.utmMedium, 64);
    const utmCampaign = clip(ev.utmCampaign, 96);
    const country = ev.country || meta.country;
    const language = clip(ev.language, 8) || meta.language;
    const deviceType = clip(ev.deviceType, 16) || meta.deviceType;
    try {
      if (!isHistogramOnly) {
        await db.execute(sql`
          INSERT INTO funnel_counters
            (bucket_hour, event_name, page_path, utm_source, utm_medium, utm_campaign, country, language, device_type, count)
          VALUES (${bucket}, ${ev.event}, ${page}, ${utmSource}, ${utmMedium}, ${utmCampaign}, ${country}, ${language}, ${deviceType}, ${count})
          ON CONFLICT (bucket_hour, event_name, page_path, utm_source, utm_medium, utm_campaign, country, language, device_type)
          DO UPDATE SET count = funnel_counters.count + EXCLUDED.count
        `);
      }
      accepted++;
      if (ev.histogram && ALLOWED_DIMENSIONS.has(ev.histogram.dimension)) {
        const label = clip(ev.histogram.bucket, 32);
        if (label) {
          await db.execute(sql`
            INSERT INTO funnel_dimension_buckets
              (bucket_hour, page_path, dimension, bucket_label, count)
            VALUES (${bucket}, ${page}, ${ev.histogram.dimension}, ${label}, ${count})
            ON CONFLICT (bucket_hour, page_path, dimension, bucket_label)
            DO UPDATE SET count = funnel_dimension_buckets.count + EXCLUDED.count
          `);
        }
      }
    } catch {
      // swallow — tracking must never break the request
    }
  }
  return { accepted };
}

export interface CounterRow {
  bucketHour: string;
  eventName: string;
  pagePath: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  country: string;
  language: string;
  deviceType: string;
  count: number;
}

type DbRow = Record<string, unknown>;
function extractRows(res: unknown): DbRow[] {
  if (res && typeof res === "object" && Array.isArray((res as { rows?: unknown }).rows)) {
    return (res as { rows: DbRow[] }).rows;
  }
  return Array.isArray(res) ? (res as DbRow[]) : [];
}

export async function getCountersInRange(hoursBack: number): Promise<CounterRow[]> {
  const start = new Date(Date.now() - hoursBack * 3600 * 1000);
  start.setUTCMinutes(0, 0, 0);
  const res = await db.execute(sql`
    SELECT bucket_hour, event_name, page_path, utm_source, utm_medium, utm_campaign,
           country, language, device_type, count
    FROM funnel_counters
    WHERE bucket_hour >= ${start}
    ORDER BY bucket_hour DESC
  `);
  const rows = extractRows(res);
  return rows.map(r => ({
    bucketHour: r.bucket_hour instanceof Date ? r.bucket_hour.toISOString() : String(r.bucket_hour),
    eventName: String(r.event_name),
    pagePath: String(r.page_path || ""),
    utmSource: String(r.utm_source || ""),
    utmMedium: String(r.utm_medium || ""),
    utmCampaign: String(r.utm_campaign || ""),
    country: String(r.country || ""),
    language: String(r.language || ""),
    deviceType: String(r.device_type || ""),
    count: Number(r.count) || 0,
  }));
}

export interface DimensionRow {
  bucketHour: string;
  pagePath: string;
  dimension: string;
  bucketLabel: string;
  count: number;
}

export async function getDimensionsInRange(hoursBack: number): Promise<DimensionRow[]> {
  const start = new Date(Date.now() - hoursBack * 3600 * 1000);
  start.setUTCMinutes(0, 0, 0);
  const res = await db.execute(sql`
    SELECT bucket_hour, page_path, dimension, bucket_label, count
    FROM funnel_dimension_buckets
    WHERE bucket_hour >= ${start}
    ORDER BY bucket_hour DESC
  `);
  const rows = extractRows(res);
  return rows.map(r => ({
    bucketHour: r.bucket_hour instanceof Date ? r.bucket_hour.toISOString() : String(r.bucket_hour),
    pagePath: String(r.page_path || ""),
    dimension: String(r.dimension),
    bucketLabel: String(r.bucket_label),
    count: Number(r.count) || 0,
  }));
}

export function sumCounters(rows: CounterRow[], event: string, predicate?: (r: CounterRow) => boolean): number {
  let total = 0;
  for (const r of rows) {
    if (r.eventName !== event) continue;
    if (predicate && !predicate(r)) continue;
    total += r.count;
  }
  return total;
}
