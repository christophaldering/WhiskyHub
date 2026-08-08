import { eq, sql, and, gte, count } from "drizzle-orm";
import { db } from "./db";
import { systemSettings, adminAuditLog, aiUsageLog, participants, profiles, whiskies } from "@shared/schema";

export const AI_FEATURES = [
  { id: "ai_enrich", label: "Whisky AI Enrich (Fakten)", route: "/api/whiskies/:id/ai-enrich" },
  { id: "ai_insights", label: "Tasting-Notizen generieren", route: "/api/whiskies/ai-insights" },
  { id: "ai_highlights", label: "Tasting AI Highlights", route: "/api/tastings/:id/ai-highlights" },
  { id: "journal_identify", label: "Journal Flaschen-Erkennung", route: "/api/journal/identify-bottle" },
  { id: "wishlist_identify", label: "Wunschliste Flaschen-Erkennung", route: "/api/wishlist/identify" },
  { id: "wishlist_summary", label: "Wunschliste AI Beschreibung", route: "/api/wishlist/generate-summary" },
  { id: "whisky_search", label: "Whisky AI Suche", route: "/api/extract-whisky-text" },
  { id: "newsletter_generate", label: "Newsletter AI Generierung", route: "/api/admin/newsletters/generate" },
  { id: "benchmark_analyze", label: "Benchmark Dokument-Analyse", route: "/api/benchmark/analyze" },
  { id: "photo_tasting_identify", label: "Foto-Tasting Erkennung", route: "/api/photo-tasting/identify" },
  { id: "ai_import", label: "Tasting AI Import", route: "/api/tastings/ai-import" },
  { id: "connoisseur_report", label: "Connoisseur Report", route: "/api/participants/:id/connoisseur-report" },
  { id: "ai_recommendations", label: "KI-Whisky-Empfehlungen", route: "/api/recommendations/ai" },
  { id: "auto_handout", label: "Auto-Handout-Generator", route: "/api/tastings/:id/auto-handout/generate" },
] as const;

export type AIFeatureId = typeof AI_FEATURES[number]["id"];

export interface AISettings {
  ai_master_disabled: boolean;
  ai_features_disabled: string[];
}

const DEFAULT_SETTINGS: AISettings = {
  ai_master_disabled: false,
  ai_features_disabled: [],
};

let cachedSettings: AISettings | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;

export async function getAISettings(): Promise<AISettings> {
  const now = Date.now();
  if (cachedSettings && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSettings;
  }

  try {
    const row = await db.select().from(systemSettings).where(eq(systemSettings.key, "ai_settings")).limit(1);
    if (row.length > 0 && row[0].value) {
      cachedSettings = row[0].value as AISettings;
    } else {
      cachedSettings = { ...DEFAULT_SETTINGS };
    }
  } catch {
    cachedSettings = { ...DEFAULT_SETTINGS };
  }

  cacheTimestamp = now;
  return cachedSettings;
}

export function invalidateAISettingsCache(): void {
  cachedSettings = null;
  cacheTimestamp = 0;
}

export async function isAIDisabled(featureId: string): Promise<boolean> {
  const settings = await getAISettings();
  if (settings.ai_master_disabled) return true;
  return settings.ai_features_disabled.includes(featureId);
}

export async function updateAISettings(newSettings: AISettings, actorId: string, actorName: string): Promise<AISettings> {
  const oldSettings = await getAISettings();

  const validFeatureIds: string[] = AI_FEATURES.map(f => f.id);
  newSettings.ai_features_disabled = newSettings.ai_features_disabled.filter(id => validFeatureIds.includes(id));

  await db.insert(systemSettings)
    .values({
      key: "ai_settings",
      value: newSettings,
      updatedAt: new Date(),
      updatedBy: actorId,
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: {
        value: newSettings,
        updatedAt: new Date(),
        updatedBy: actorId,
      },
    });

  await db.insert(adminAuditLog).values({
    action: "ai_settings_update",
    actor: `${actorName} (${actorId})`,
    before: oldSettings as any,
    after: newSettings as any,
  });

  invalidateAISettingsCache();
  return newSettings;
}

// Generischer Admin-Audit-Eintrag (z. B. manuelle E-Mail-Verifizierung).
export async function logAdminAudit(
  action: string,
  actor: string,
  before?: any,
  after?: any,
): Promise<void> {
  await db.insert(adminAuditLog).values({ action, actor, before, after });
}

export async function getAuditLog(limit = 50): Promise<any[]> {
  const rows = await db.select().from(adminAuditLog)
    .where(eq(adminAuditLog.action, "ai_settings_update"))
    .orderBy(adminAuditLog.createdAt)
    .limit(limit);
  return rows.reverse();
}

const DEFAULT_AI_FREE_QUOTA = 20;
const AI_QUOTA_SETTINGS_KEY = "ai_free_quota";

export async function getAIFreeQuota(): Promise<number> {
  try {
    const row = await db.select().from(systemSettings).where(eq(systemSettings.key, AI_QUOTA_SETTINGS_KEY)).limit(1);
    if (row.length > 0 && row[0].value !== null && row[0].value !== undefined) {
      const val = typeof row[0].value === "number" ? row[0].value : Number(row[0].value);
      return isNaN(val) ? DEFAULT_AI_FREE_QUOTA : val;
    }
    return DEFAULT_AI_FREE_QUOTA;
  } catch {
    return DEFAULT_AI_FREE_QUOTA;
  }
}

export async function setAIFreeQuota(quota: number, actorId: string): Promise<number> {
  const safeQuota = Math.max(0, Math.floor(quota));
  await db.insert(systemSettings)
    .values({ key: AI_QUOTA_SETTINGS_KEY, value: safeQuota, updatedAt: new Date(), updatedBy: actorId })
    .onConflictDoUpdate({ target: systemSettings.key, set: { value: safeQuota, updatedAt: new Date(), updatedBy: actorId } });
  return safeQuota;
}

export interface AIUsageMeta {
  model?: string | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
  durationMs?: number | null;
}

export async function recordAIUsage(participantId: string, featureId: string, meta?: AIUsageMeta): Promise<void> {
  await db.insert(aiUsageLog).values({
    participantId,
    featureId,
    model: meta?.model ?? null,
    tokensIn: meta?.tokensIn ?? null,
    tokensOut: meta?.tokensOut ?? null,
    durationMs: meta?.durationMs ?? null,
  });
}

// Fire-and-forget usage logger: never throws, never blocks the user path.
// EUR je 1M Tokens, Stand 08/2026 — bei OpenAI-Preisaenderung pflegen.
// Unbekannte Modelle rechnen konservativ mit dem gpt-5-Satz.
const MODEL_EUR_PER_1M: Record<string, { in: number; out: number }> = {
  "gpt-5": { in: 1.15, out: 9.2 },
  "gpt-5-mini": { in: 0.23, out: 1.84 },
};
export function costEurFor(model: string | null, tokensIn: number, tokensOut: number): number {
  const p = MODEL_EUR_PER_1M[model || ""] || MODEL_EUR_PER_1M["gpt-5"];
  return (tokensIn / 1e6) * p.in + (tokensOut / 1e6) * p.out;
}

export function logAIUsage(participantId: string, featureId: string, meta?: AIUsageMeta): void {
  recordAIUsage(participantId, featureId, meta).catch(() => {});
}

export async function getAIUsageCount(participantId: string): Promise<number> {
  const result = await db.select({ count: count() }).from(aiUsageLog).where(eq(aiUsageLog.participantId, participantId));
  return result[0]?.count ?? 0;
}

export async function checkAIQuota(participantId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const [used, limit] = await Promise.all([getAIUsageCount(participantId), getAIFreeQuota()]);
  if (limit === 0) return { allowed: true, used, limit: 0 };
  return { allowed: used < limit, used, limit };
}

export interface AIUsageBreakdown {
  totals: { calls: number; users: number; firstAt: string | null; lastAt: string | null };
  perFeature: Array<{ featureId: string; all: number; d30: number; d90: number; costEur: number; costEur30: number }>;
  perMonth: Array<{ month: string; calls: number; users: number; costEur: number }>;
  totalCostEur: number;
  legacyDeepSearchEur: number;
  note: string;
}

export async function getAIUsageBreakdown(): Promise<AIUsageBreakdown> {
  const [totalsRow] = await db
    .select({
      calls: count(),
      users: sql<number>`count(distinct ${aiUsageLog.participantId})`,
      firstAt: sql<string | null>`to_char(min(${aiUsageLog.createdAt}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
      lastAt: sql<string | null>`to_char(max(${aiUsageLog.createdAt}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
    })
    .from(aiUsageLog);

  const perFeatureRows = await db
    .select({
      featureId: aiUsageLog.featureId,
      all: count(),
      d30: sql<number>`count(*) filter (where ${aiUsageLog.createdAt} >= now() - interval '30 days')`,
      d90: sql<number>`count(*) filter (where ${aiUsageLog.createdAt} >= now() - interval '90 days')`,
    })
    .from(aiUsageLog)
    .groupBy(aiUsageLog.featureId)
    .orderBy(sql`count(*) desc`);

  const perMonthRows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${aiUsageLog.createdAt}), 'YYYY-MM')`,
      calls: count(),
      users: sql<number>`count(distinct ${aiUsageLog.participantId})`,
    })
    .from(aiUsageLog)
    .groupBy(sql`date_trunc('month', ${aiUsageLog.createdAt})`)
    .orderBy(sql`date_trunc('month', ${aiUsageLog.createdAt}) desc`);

  // Tokens je Funktion/Modell und je Monat/Modell — daraus Euro.
  const featTok = await db
    .select({
      featureId: aiUsageLog.featureId,
      model: aiUsageLog.model,
      tin: sql<number>`coalesce(sum(${aiUsageLog.tokensIn}),0)`,
      tout: sql<number>`coalesce(sum(${aiUsageLog.tokensOut}),0)`,
      tin30: sql<number>`coalesce(sum(${aiUsageLog.tokensIn}) filter (where ${aiUsageLog.createdAt} >= now() - interval '30 days'),0)`,
      tout30: sql<number>`coalesce(sum(${aiUsageLog.tokensOut}) filter (where ${aiUsageLog.createdAt} >= now() - interval '30 days'),0)`,
    })
    .from(aiUsageLog)
    .groupBy(aiUsageLog.featureId, aiUsageLog.model);
  const featCost = new Map<string, { all: number; d30: number }>();
  for (const r of featTok) {
    const cur = featCost.get(r.featureId) || { all: 0, d30: 0 };
    cur.all += costEurFor(r.model, Number(r.tin), Number(r.tout));
    cur.d30 += costEurFor(r.model, Number(r.tin30), Number(r.tout30));
    featCost.set(r.featureId, cur);
  }
  const monTok = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${aiUsageLog.createdAt}), 'YYYY-MM')`,
      model: aiUsageLog.model,
      tin: sql<number>`coalesce(sum(${aiUsageLog.tokensIn}),0)`,
      tout: sql<number>`coalesce(sum(${aiUsageLog.tokensOut}),0)`,
    })
    .from(aiUsageLog)
    .groupBy(sql`date_trunc('month', ${aiUsageLog.createdAt})`, aiUsageLog.model);
  const monCost = new Map<string, number>();
  for (const r of monTok) {
    monCost.set(r.month, (monCost.get(r.month) || 0) + costEurFor(r.model, Number(r.tin), Number(r.tout)));
  }
  const [legacyRow] = await db
    .select({ s: sql<number>`coalesce(sum(${whiskies.priceAgentCost}),0)` })
    .from(whiskies);

  return {
    totals: {
      calls: Number(totalsRow?.calls ?? 0),
      users: Number(totalsRow?.users ?? 0),
      firstAt: totalsRow?.firstAt ?? null,
      lastAt: totalsRow?.lastAt ?? null,
    },
    perFeature: perFeatureRows.map((r) => ({ featureId: r.featureId, all: Number(r.all), d30: Number(r.d30), d90: Number(r.d90), costEur: Math.round((featCost.get(r.featureId)?.all || 0) * 100) / 100, costEur30: Math.round((featCost.get(r.featureId)?.d30 || 0) * 100) / 100 })),
    perMonth: perMonthRows.map((r) => ({ month: r.month, calls: Number(r.calls), users: Number(r.users), costEur: Math.round((monCost.get(r.month) || 0) * 100) / 100 })),
    totalCostEur: Math.round(Array.from(monCost.values()).reduce((a, b) => a + b, 0) * 100) / 100,
    legacyDeepSearchEur: Math.round(Number(legacyRow?.s || 0) * 100) / 100,
    note: "Erfasst werden Plattform-Key-Aufrufe (getAIClient) sowie Voice-, Bild- und Report-Endpoints mit rohen OpenAI-Clients. Bei getAIClient-Aufrufen bleiben model/tokens leer (der Log erfolgt vor dem Call); die Voice-Session-Dauer wird noch nicht erfasst. Aufrufe mit eigenem User-Key werden nicht geloggt.",
  };
}

export async function getAIUsageOverview(): Promise<Array<{ participantId: string; name: string; email: string | null; requestCount: number; hasOwnKey: boolean }>> {
  const usageCounts = await db
    .select({ participantId: aiUsageLog.participantId, requestCount: count() })
    .from(aiUsageLog)
    .groupBy(aiUsageLog.participantId);

  if (usageCounts.length === 0) return [];

  const pIds = usageCounts.map(u => u.participantId);
  const allParticipants = await db.select({ id: participants.id, name: participants.name, email: participants.email }).from(participants);
  const allProfiles = await db.select({ participantId: profiles.participantId, openaiApiKey: profiles.openaiApiKey }).from(profiles);

  const pMap = new Map(allParticipants.map(p => [p.id, p]));
  const profileMap = new Map(allProfiles.map(p => [p.participantId, p]));

  return usageCounts.map(u => {
    const p = pMap.get(u.participantId);
    const prof = profileMap.get(u.participantId);
    return {
      participantId: u.participantId,
      name: p?.name ?? "Unknown",
      email: p?.email ?? null,
      requestCount: u.requestCount,
      hasOwnKey: !!(prof?.openaiApiKey),
    };
  }).sort((a, b) => b.requestCount - a.requestCount);
}
