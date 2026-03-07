import { eq } from "drizzle-orm";
import { db } from "./db";
import { systemSettings, adminAuditLog } from "@shared/schema";

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

export async function getAuditLog(limit = 50): Promise<any[]> {
  const rows = await db.select().from(adminAuditLog)
    .where(eq(adminAuditLog.action, "ai_settings_update"))
    .orderBy(adminAuditLog.createdAt)
    .limit(limit);
  return rows.reverse();
}
