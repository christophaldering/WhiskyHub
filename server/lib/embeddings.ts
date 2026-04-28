import OpenAI from "openai";
import { db } from "../db";
import { sql } from "drizzle-orm";

const EMBED_MODEL = "text-embedding-3-small";
const EMBED_DIM = 1536;

let cachedClient: OpenAI | null | undefined;

function getEmbeddingClient(): OpenAI | null {
  if (cachedClient !== undefined) return cachedClient;
  const platformKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const platformBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (!platformKey) {
    cachedClient = null;
    return null;
  }
  cachedClient = new OpenAI({ apiKey: platformKey, baseURL: platformBaseUrl });
  return cachedClient;
}

export function isEmbeddingAvailable(): boolean {
  return getEmbeddingClient() !== null;
}

function clean(value: string | null | undefined): string {
  if (!value) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

export function buildWhiskyText(w: {
  name?: string | null; distillery?: string | null; region?: string | null; country?: string | null;
  category?: string | null; type?: string | null; age?: string | null; ageBand?: string | null;
  caskType?: string | null; peatLevel?: string | null; bottler?: string | null;
  notes?: string | null; hostNotes?: string | null; hostSummary?: string | null;
  flavorProfile?: string | null;
}): string {
  const parts = [
    clean(w.name), clean(w.distillery), clean(w.region), clean(w.country),
    clean(w.category), clean(w.type), clean(w.age), clean(w.ageBand),
    clean(w.caskType), clean(w.peatLevel), clean(w.bottler),
    clean(w.notes), clean(w.hostNotes), clean(w.hostSummary), clean(w.flavorProfile),
  ].filter(Boolean);
  return parts.join(" \u2022 ");
}

export function buildTastingText(t: {
  title?: string | null; location?: string | null; hostReflection?: string | null;
  aiNarrative?: string | null;
}): string {
  return [clean(t.title), clean(t.location), clean(t.hostReflection), clean(t.aiNarrative)].filter(Boolean).join(" \u2022 ");
}

export function buildDistilleryText(d: {
  name?: string | null; region?: string | null; country?: string | null;
  description?: string | null; feature?: string | null;
}): string {
  return [clean(d.name), clean(d.region), clean(d.country), clean(d.description), clean(d.feature)].filter(Boolean).join(" \u2022 ");
}

export function buildLexiconText(l: { term?: string | null; definition?: string | null; category?: string | null }): string {
  return [clean(l.term), clean(l.category), clean(l.definition)].filter(Boolean).join(" \u2022 ");
}

export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const client = getEmbeddingClient();
  if (!client) return null;
  const cleaned = texts.map((t) => (t || "").slice(0, 8000) || " ");
  try {
    const response = await client.embeddings.create({
      model: EMBED_MODEL,
      input: cleaned,
    });
    return response.data.map((d) => d.embedding as number[]);
  } catch (e) {
    console.warn("[embeddings] embedTexts failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function embedSingle(text: string): Promise<number[] | null> {
  const result = await embedTexts([text]);
  return result ? result[0] : null;
}

const queryEmbeddingCache = new Map<string, { ts: number; vec: number[] | null }>();
const QUERY_CACHE_TTL_MS = 5 * 60 * 1000;
const QUERY_CACHE_MAX = 200;

export async function getQueryEmbedding(query: string): Promise<number[] | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  const now = Date.now();
  const cached = queryEmbeddingCache.get(key);
  if (cached && now - cached.ts < QUERY_CACHE_TTL_MS) return cached.vec;
  const vec = await embedSingle(key);
  if (queryEmbeddingCache.size >= QUERY_CACHE_MAX) {
    const oldestKey = queryEmbeddingCache.keys().next().value;
    if (oldestKey !== undefined) queryEmbeddingCache.delete(oldestKey);
  }
  queryEmbeddingCache.set(key, { ts: now, vec });
  return vec;
}

export function vectorLiteral(vec: number[]): string {
  return `[${vec.map((v) => Number.isFinite(v) ? v.toFixed(6) : "0").join(",")}]`;
}

interface TableConfig {
  table: string;
  build: (row: any) => string;
  selectExtra?: string;
}

const TABLE_CONFIGS: Record<string, TableConfig> = {
  whiskies: {
    table: "whiskies",
    build: (r) => buildWhiskyText(r),
  },
  tastings: {
    table: "tastings",
    build: (r) => buildTastingText(r),
  },
  distilleries: {
    table: "distilleries",
    build: (r) => buildDistilleryText(r),
  },
  lexicon: {
    table: "lexicon",
    build: (r) => buildLexiconText(r),
  },
};

export async function embedRowAsync(tableKey: keyof typeof TABLE_CONFIGS, id: string): Promise<void> {
  const config = TABLE_CONFIGS[tableKey];
  if (!config) return;
  const client = getEmbeddingClient();
  if (!client) return;
  try {
    const rows = await db.execute(sql.raw(`SELECT * FROM "${config.table}" WHERE id = '${id.replace(/'/g, "''")}' LIMIT 1`));
    const row = (rows as any).rows?.[0] || (rows as any)[0];
    if (!row) return;
    const text = config.build(row);
    if (!text) return;
    const vec = await embedSingle(text);
    if (!vec || vec.length !== EMBED_DIM) return;
    const literal = vectorLiteral(vec);
    await db.execute(sql.raw(`UPDATE "${config.table}" SET embedding = '${literal}'::vector WHERE id = '${id.replace(/'/g, "''")}'`));
  } catch (e) {
    console.warn(`[embeddings] embedRowAsync(${tableKey}, ${id}) failed:`, e instanceof Error ? e.message : e);
  }
}

export function fireAndForgetEmbed(tableKey: keyof typeof TABLE_CONFIGS, id: string): void {
  embedRowAsync(tableKey, id).catch(() => {});
}

export const EMBEDDING_DIM = EMBED_DIM;
export const EMBEDDING_MODEL = EMBED_MODEL;
