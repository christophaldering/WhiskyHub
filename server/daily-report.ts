import { db } from "./db";
import { sql } from "drizzle-orm";
import { sendEmail } from "./email";
import { log } from "./index";
import { getCountersInRange, sumCounters } from "./funnel-store";
import { analyzePeriod, detectAnomalies } from "./funnel-ai";

const ADMIN_REPORT_EMAIL =
  process.env.ADMIN_REPORT_EMAIL || "christoph.aldering@googlemail.com";

interface CountRow {
  count: number;
}

interface TopPathRow {
  normalized_path: string;
  views: number;
}

interface DailyMetrics {
  windowStart: Date;
  windowEnd: Date;
  newParticipants24h: number;
  newTastings24h: number;
  newRatings24h: number;
  newJournalEntries24h: number;
  pageViews24h: number;
  uniqueVisitors24h: number;
  sessions24h: number;
  avgSessionMinutes24h: number;
  topPaths24h: TopPathRow[];
  pageViewsPrev24h: number;
  uniqueVisitorsPrev24h: number;
  pageViews7dAvg: number;
  uniqueVisitors7dAvg: number;
  totalParticipants: number;
  totalTastings: number;
  totalRatings: number;
  totalJournalEntries: number;
  newsletterOptIns: number;
  activeTastings: number;
  funnel: {
    storyView: number;
    storyEngaged: number;
    storyFinished: number;
    storyCtaClick: number;
    landingView: number;
    pdfDownload: number;
    signupView: number;
    signupSubmitAttempt: number;
    signupSubmitSuccess: number;
    topSources: Array<{ source: string; count: number }>;
    topCountries: Array<{ country: string; count: number }>;
    aiSummary: string;
    aiAvailable: boolean;
    anomalies: string[];
  };
}

async function scalar(query: any): Promise<number> {
  const res = await db.execute(query);
  const rows = (res as any).rows ?? (res as any);
  if (!rows || rows.length === 0) return 0;
  const first = rows[0];
  const value = first.count ?? first.value ?? Object.values(first)[0];
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(num) ? num : 0;
}

export async function gatherDailyMetrics(now: Date = new Date()): Promise<DailyMetrics> {
  const windowEnd = now;
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const prevStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const sevenDayStart = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  const sevenDayEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    newParticipants24h,
    newTastings24h,
    newRatings24h,
    newJournalEntries24h,
    pageViews24h,
    uniqueVisitors24h,
    sessions24h,
    avgSessionMinutes24h,
    pageViewsPrev24h,
    uniqueVisitorsPrev24h,
    pageViews7d,
    uniqueVisitors7d,
    totalParticipants,
    totalTastings,
    totalRatings,
    totalJournalEntries,
    newsletterOptIns,
    activeTastings,
  ] = await Promise.all([
    scalar(sql`SELECT COUNT(*)::int AS count FROM participants WHERE created_at >= ${windowStart}`),
    scalar(sql`SELECT COUNT(*)::int AS count FROM tastings WHERE created_at >= ${windowStart}`),
    scalar(sql`SELECT COUNT(*)::int AS count FROM ratings WHERE created_at >= ${windowStart}`),
    scalar(sql`SELECT COUNT(*)::int AS count FROM journal_entries WHERE created_at >= ${windowStart}`),
    scalar(sql`SELECT COUNT(*)::int AS count FROM page_views WHERE timestamp >= ${windowStart}`),
    scalar(sql`SELECT COUNT(DISTINCT participant_id)::int AS count FROM page_views WHERE timestamp >= ${windowStart}`),
    scalar(sql`SELECT COUNT(*)::int AS count FROM user_activity_sessions WHERE started_at >= ${windowStart}`),
    scalar(sql`SELECT COALESCE(AVG(duration_minutes), 0)::float AS count FROM user_activity_sessions WHERE started_at >= ${windowStart} AND duration_minutes > 0`),
    scalar(sql`SELECT COUNT(*)::int AS count FROM page_views WHERE timestamp >= ${prevStart} AND timestamp < ${windowStart}`),
    scalar(sql`SELECT COUNT(DISTINCT participant_id)::int AS count FROM page_views WHERE timestamp >= ${prevStart} AND timestamp < ${windowStart}`),
    scalar(sql`SELECT COUNT(*)::int AS count FROM page_views WHERE timestamp >= ${sevenDayStart} AND timestamp < ${sevenDayEnd}`),
    scalar(sql`SELECT COUNT(DISTINCT participant_id)::int AS count FROM page_views WHERE timestamp >= ${sevenDayStart} AND timestamp < ${sevenDayEnd}`),
    scalar(sql`SELECT COUNT(*)::int AS count FROM participants`),
    scalar(sql`SELECT COUNT(*)::int AS count FROM tastings`),
    scalar(sql`SELECT COUNT(*)::int AS count FROM ratings`),
    scalar(sql`SELECT COUNT(*)::int AS count FROM journal_entries`),
    scalar(sql`SELECT COUNT(*)::int AS count FROM participants WHERE newsletter_opt_in = true`),
    scalar(sql`SELECT COUNT(*)::int AS count FROM tastings WHERE status IN ('open', 'reveal')`),
  ]);

  const topPathsRes = await db.execute(sql`
    SELECT normalized_path, COUNT(*)::int AS views
    FROM page_views
    WHERE timestamp >= ${windowStart}
    GROUP BY normalized_path
    ORDER BY views DESC
    LIMIT 8
  `);
  const topPathRows = ((topPathsRes as any).rows ?? topPathsRes) as any[];
  const topPaths24h: TopPathRow[] = topPathRows.map((r) => ({
    normalized_path: String(r.normalized_path ?? ""),
    views: Number(r.views ?? 0),
  }));

  return {
    windowStart,
    windowEnd,
    newParticipants24h,
    newTastings24h,
    newRatings24h,
    newJournalEntries24h,
    pageViews24h,
    uniqueVisitors24h,
    sessions24h,
    avgSessionMinutes24h: Math.round(avgSessionMinutes24h * 10) / 10,
    topPaths24h,
    pageViewsPrev24h,
    uniqueVisitorsPrev24h,
    pageViews7dAvg: Math.round(pageViews7d / 7),
    uniqueVisitors7dAvg: Math.round(uniqueVisitors7d / 7),
    totalParticipants,
    totalTastings,
    totalRatings,
    totalJournalEntries,
    newsletterOptIns,
    activeTastings,
    funnel: await gatherFunnelMetrics(),
  };
}

async function gatherFunnelMetrics(): Promise<DailyMetrics["funnel"]> {
  const empty: DailyMetrics["funnel"] = {
    storyView: 0, storyEngaged: 0, storyFinished: 0, storyCtaClick: 0,
    landingView: 0, pdfDownload: 0,
    signupView: 0, signupSubmitAttempt: 0, signupSubmitSuccess: 0,
    topSources: [], topCountries: [],
    aiSummary: "", aiAvailable: false, anomalies: [],
  };
  try {
    const rows = await getCountersInRange(24);
    const sourceMap = new Map<string, number>();
    const countryMap = new Map<string, number>();
    for (const r of rows) {
      if (r.utm_source) sourceMap.set(r.utm_source, (sourceMap.get(r.utm_source) ?? 0) + r.count);
      if (r.country) countryMap.set(r.country, (countryMap.get(r.country) ?? 0) + r.count);
    }
    const topSources = [...sourceMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([source, count]) => ({ source, count }));
    const topCountries = [...countryMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([country, count]) => ({ country, count }));

    let aiSummary = ""; let aiAvailable = false;
    try {
      const ai = await analyzePeriod(24);
      aiAvailable = ai.available;
      aiSummary = ai.text || ai.reason || "";
    } catch {}

    let anomalies: string[] = [];
    try {
      const anos = await detectAnomalies();
      anomalies = anos.map(a => a.message);
    } catch {}

    return {
      storyView: sumCounters(rows, "story_view"),
      storyEngaged: sumCounters(rows, "story_engaged"),
      storyFinished: sumCounters(rows, "story_finished"),
      storyCtaClick: sumCounters(rows, "story_cta_click"),
      landingView: sumCounters(rows, "landing_view"),
      pdfDownload: sumCounters(rows, "pdf_download"),
      signupView: sumCounters(rows, "signup_view"),
      signupSubmitAttempt: sumCounters(rows, "signup_submit_attempt"),
      signupSubmitSuccess: sumCounters(rows, "signup_submit_success"),
      topSources, topCountries,
      aiSummary, aiAvailable, anomalies,
    };
  } catch (err) {
    log(`gatherFunnelMetrics failed: ${(err as Error).message}`);
    return empty;
  }
}

function trendArrow(current: number, baseline: number): string {
  if (baseline === 0) {
    return current > 0 ? `<span style="color:#7fb069;">+${current}</span>` : "&mdash;";
  }
  const diff = current - baseline;
  const pct = Math.round((diff / baseline) * 100);
  if (diff === 0) return `<span style="color:#a0aec0;">±0%</span>`;
  if (diff > 0) return `<span style="color:#7fb069;">+${pct}%</span>`;
  return `<span style="color:#c97064;">${pct}%</span>`;
}

export function buildDailyReportEmail(metrics: DailyMetrics): { subject: string; html: string } {
  const dateStr = metrics.windowEnd.toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const subject = `CaskSense Daily Report — ${dateStr}`;

  const topPathsRows =
    metrics.topPaths24h.length === 0
      ? `<tr><td colspan="2" style="padding:8px 0;color:#a0aec0;font-style:italic;">Keine Aufrufe</td></tr>`
      : metrics.topPaths24h
          .map(
            (p) => `
        <tr>
          <td style="padding:6px 0;color:#4a5568;font-family:monospace;font-size:13px;">${escapeHtml(p.normalized_path || "/")}</td>
          <td style="padding:6px 0;text-align:right;color:#2d3748;font-weight:600;">${p.views}</td>
        </tr>`,
          )
          .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Georgia',serif;background:#f9f9f7;color:#333;">
  <div style="max-width:640px;margin:32px auto;background:#fff;border:1px solid #e5e5e0;border-radius:4px;overflow:hidden;">
    <div style="padding:24px 32px 16px;border-bottom:1px solid #e5e5e0;background:#1a1d23;color:#f4e9d8;">
      <h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.5px;">CaskSense Daily Report</h1>
      <p style="margin:6px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#c4a875;">${dateStr} &middot; letzte 24 h</p>
    </div>

    <div style="padding:24px 32px;">
      <h2 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1.5px;color:#7a6f5e;font-weight:600;">Aktivität</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${row("Neue Teilnehmer", metrics.newParticipants24h)}
        ${row("Neue Tastings", metrics.newTastings24h)}
        ${row("Neue Bewertungen", metrics.newRatings24h)}
        ${row("Neue Journal-Einträge", metrics.newJournalEntries24h)}
      </table>

      <h2 style="margin:24px 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1.5px;color:#7a6f5e;font-weight:600;">Besucher &amp; Nutzung</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${rowWithTrend("Page Views", metrics.pageViews24h, metrics.pageViewsPrev24h, metrics.pageViews7dAvg)}
        ${rowWithTrend("Eindeutige Besucher", metrics.uniqueVisitors24h, metrics.uniqueVisitorsPrev24h, metrics.uniqueVisitors7dAvg)}
        ${row("Sessions", metrics.sessions24h)}
        ${row("Ø Session-Dauer", `${metrics.avgSessionMinutes24h} min`)}
      </table>

      <h2 style="margin:24px 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1.5px;color:#7a6f5e;font-weight:600;">Top Seiten</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        ${topPathsRows}
      </table>

      <h2 style="margin:24px 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1.5px;color:#7a6f5e;font-weight:600;">Story-Funnel (cookie-frei)</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${row("Story Aufrufe", metrics.funnel.storyView)}
        ${row("Engaged (≥30s)", metrics.funnel.storyEngaged)}
        ${row("Ende erreicht", metrics.funnel.storyFinished)}
        ${row("CTA geklickt", metrics.funnel.storyCtaClick)}
        ${row("Landing Aufrufe", metrics.funnel.landingView)}
        ${row("PDF-Downloads", metrics.funnel.pdfDownload)}
      </table>

      <h2 style="margin:24px 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1.5px;color:#7a6f5e;font-weight:600;">Anmelde-Funnel</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${row("Anmelde-Screen gesehen", metrics.funnel.signupView)}
        ${row("Submit versucht", metrics.funnel.signupSubmitAttempt)}
        ${row("Submit erfolgreich", metrics.funnel.signupSubmitSuccess)}
      </table>

      ${metrics.funnel.topSources.length > 0 ? `
      <h2 style="margin:24px 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1.5px;color:#7a6f5e;font-weight:600;">Top Quellen (UTM)</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        ${metrics.funnel.topSources.map(s => `<tr><td style="padding:6px 0;color:#4a5568;font-family:monospace;">${escapeHtml(s.source)}</td><td style="padding:6px 0;text-align:right;color:#2d3748;font-weight:600;">${s.count}</td></tr>`).join("")}
      </table>` : ""}

      ${metrics.funnel.anomalies.length > 0 ? `
      <h2 style="margin:24px 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1.5px;color:#c97064;font-weight:600;">Auffälligkeiten</h2>
      <ul style="margin:0;padding-left:18px;font-size:13px;color:#4a5568;line-height:1.6;">
        ${metrics.funnel.anomalies.map(a => `<li>${escapeHtml(a)}</li>`).join("")}
      </ul>` : ""}

      ${metrics.funnel.aiAvailable && metrics.funnel.aiSummary ? `
      <h2 style="margin:24px 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1.5px;color:#7a6f5e;font-weight:600;">KI-Sicht "Erkläre mir das"</h2>
      <div style="font-size:13px;color:#4a5568;line-height:1.7;white-space:pre-wrap;background:#faf8f3;padding:14px 16px;border-radius:4px;border:1px solid #e5e5e0;">${escapeHtml(metrics.funnel.aiSummary)}</div>` : ""}

      <h2 style="margin:24px 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1.5px;color:#7a6f5e;font-weight:600;">Gesamtbestand</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${row("Teilnehmer gesamt", metrics.totalParticipants)}
        ${row("Newsletter-Opt-Ins", metrics.newsletterOptIns)}
        ${row("Tastings gesamt", metrics.totalTastings)}
        ${row("Aktive Tastings", metrics.activeTastings)}
        ${row("Bewertungen gesamt", metrics.totalRatings)}
        ${row("Journal-Einträge gesamt", metrics.totalJournalEntries)}
      </table>

      <p style="margin:32px 0 0;font-size:11px;color:#a0aec0;line-height:1.6;">
        Trends: <span style="color:#7fb069;">grün</span> = Wachstum vs. Vortag,
        <span style="color:#c97064;">rot</span> = Rückgang.<br>
        Zeitraum: ${metrics.windowStart.toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" })}
        &ndash; ${metrics.windowEnd.toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" })}
      </p>
    </div>
    <div style="padding:14px 32px;background:#faf8f3;border-top:1px solid #e5e5e0;font-size:11px;color:#a0aec0;text-align:center;">
      CaskSense Labs &middot; automatisierter Tagesbericht
    </div>
  </div>
</body>
</html>`;

  return { subject, html };

  function row(label: string, value: number | string): string {
    return `<tr>
      <td style="padding:6px 0;color:#4a5568;">${label}</td>
      <td style="padding:6px 0;text-align:right;color:#1a1d23;font-weight:600;font-size:16px;">${value}</td>
    </tr>`;
  }

  function rowWithTrend(label: string, current: number, prev: number, sevenDayAvg: number): string {
    return `<tr>
      <td style="padding:6px 0;color:#4a5568;">${label}<br><span style="font-size:11px;color:#a0aec0;">7-Tage-Ø: ${sevenDayAvg}</span></td>
      <td style="padding:6px 0;text-align:right;color:#1a1d23;font-weight:600;font-size:16px;">
        ${current}
        <div style="font-size:11px;font-weight:400;margin-top:2px;">${trendArrow(current, prev)} vs. Vortag</div>
      </td>
    </tr>`;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendDailyReport(): Promise<{ sent: boolean; reason?: string; metrics?: DailyMetrics }> {
  try {
    const metrics = await gatherDailyMetrics(new Date());
    const { subject, html } = buildDailyReportEmail(metrics);
    const sent = await sendEmail({ to: ADMIN_REPORT_EMAIL, subject, html });
    if (!sent) {
      return { sent: false, reason: "sendEmail returned false (Gmail not connected?)", metrics };
    }
    log(`Daily report sent to ${ADMIN_REPORT_EMAIL}`, "daily-report");
    return { sent: true, metrics };
  } catch (e) {
    const msg = (e as Error).message;
    log(`Daily report failed: ${msg}`, "daily-report");
    return { sent: false, reason: msg };
  }
}

const SEND_HOUR_BERLIN = 8;

function berlinDateKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
}

function berlinHour(d: Date): number {
  const hStr = d.toLocaleString("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", hour12: false });
  return parseInt(hStr, 10);
}

async function tryClaimReportSlot(reportDate: string): Promise<boolean> {
  const res = await db.execute(sql`
    INSERT INTO daily_report_log (report_date)
    VALUES (${reportDate})
    ON CONFLICT (report_date) DO NOTHING
    RETURNING report_date
  `);
  const rows = ((res as any).rows ?? res) as any[];
  return rows.length > 0;
}

async function releaseReportSlot(reportDate: string): Promise<void> {
  await db.execute(sql`DELETE FROM daily_report_log WHERE report_date = ${reportDate}`);
}

export function startDailyReportScheduler(): void {
  const tick = async () => {
    try {
      const now = new Date();
      const todayKey = berlinDateKey(now);
      const hour = berlinHour(now);
      if (hour < SEND_HOUR_BERLIN) return;
      const claimed = await tryClaimReportSlot(todayKey);
      if (!claimed) return;
      const result = await sendDailyReport();
      if (!result.sent) {
        log(`Daily report scheduler: not sent (${result.reason}) — slot released`, "daily-report");
        await releaseReportSlot(todayKey).catch(() => undefined);
      }
    } catch (e) {
      log(`Daily report scheduler error: ${(e as Error).message}`, "daily-report");
    }
  };
  setInterval(tick, 5 * 60 * 1000);
  setTimeout(tick, 30 * 1000);
  log(`Daily report scheduler armed (${SEND_HOUR_BERLIN}:00 Europe/Berlin → ${ADMIN_REPORT_EMAIL})`, "daily-report");
}
