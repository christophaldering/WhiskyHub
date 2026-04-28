import OpenAI from "openai";
import { db } from "../db";
import { sql } from "drizzle-orm";

const EMBED_MODEL = "text-embedding-3-small";
const EMBED_DIM = 1536;

let cachedClient: OpenAI | null | undefined;
let quotaExhausted = false;

function getEmbeddingClient(): OpenAI | null {
  if (quotaExhausted) return null;
  if (cachedClient !== undefined) return cachedClient;
  const directKey = process.env.OPENAI_API_KEY;
  if (directKey) {
    cachedClient = new OpenAI({ apiKey: directKey });
    return cachedClient;
  }
  cachedClient = null;
  return null;
}

export function isEmbeddingAvailable(): boolean {
  return getEmbeddingClient() !== null;
}

export function resetEmbeddingClient(): void {
  cachedClient = undefined;
  quotaExhausted = false;
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

interface OpenAIErrorLike {
  status?: number;
  code?: string;
  message?: string;
}

function isRateLimitError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as OpenAIErrorLike;
  if (err.status === 429) return true;
  if (typeof err.code === "string" && err.code.toLowerCase().includes("rate_limit")) return true;
  if (typeof err.message === "string" && /rate.?limit|429/i.test(err.message)) return true;
  return false;
}

function isQuotaExhaustedError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as OpenAIErrorLike;
  if (typeof err.code === "string" && err.code === "insufficient_quota") return true;
  if (typeof err.message === "string" && /insufficient_quota|exceeded your current quota/i.test(err.message)) return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const client = getEmbeddingClient();
  if (!client) return null;
  const cleaned = texts.map((t) => (t || "").slice(0, 8000) || " ");
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await client.embeddings.create({
        model: EMBED_MODEL,
        input: cleaned,
      });
      return response.data.map((d) => d.embedding as number[]);
    } catch (e) {
      if (isQuotaExhaustedError(e)) {
        if (!quotaExhausted) {
          console.warn("[embeddings] OpenAI quota exhausted — disabling embedding generation until restart");
          quotaExhausted = true;
        }
        return null;
      }
      if (isRateLimitError(e) && attempt < maxAttempts) {
        const backoff = 1000 * Math.pow(2, attempt - 1);
        console.warn(`[embeddings] rate-limited, retrying in ${backoff}ms (attempt ${attempt}/${maxAttempts - 1})`);
        await sleep(backoff);
        continue;
      }
      console.warn("[embeddings] embedTexts failed:", e instanceof Error ? e.message : e);
      return null;
    }
  }
  return null;
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

type EmbeddableRow = Record<string, unknown>;

interface TableConfig {
  table: string;
  build: (row: EmbeddableRow) => string;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

const TABLE_CONFIGS: Record<string, TableConfig> = {
  whiskies: {
    table: "whiskies",
    build: (r) => buildWhiskyText({
      name: asString(r.name),
      distillery: asString(r.distillery),
      region: asString(r.region),
      country: asString(r.country),
      category: asString(r.category),
      type: asString(r.type),
      age: asString(r.age),
      ageBand: asString(r.age_band),
      caskType: asString(r.cask_type),
      peatLevel: asString(r.peat_level),
      bottler: asString(r.bottler),
      notes: asString(r.notes),
      hostNotes: asString(r.host_notes),
      hostSummary: asString(r.host_summary),
      flavorProfile: asString(r.flavor_profile),
    }),
  },
  tastings: {
    table: "tastings",
    build: (r) => buildTastingText({
      title: asString(r.title),
      location: asString(r.location),
      hostReflection: asString(r.host_reflection),
      aiNarrative: asString(r.ai_narrative),
    }),
  },
  distilleries: {
    table: "distilleries",
    build: (r) => buildDistilleryText({
      name: asString(r.name),
      region: asString(r.region),
      country: asString(r.country),
      description: asString(r.description),
      feature: asString(r.feature),
    }),
  },
  lexicon: {
    table: "lexicon",
    build: (r) => buildLexiconText({
      term: asString(r.term),
      definition: asString(r.definition),
      category: asString(r.category),
    }),
  },
};

interface ExecResult {
  rows?: EmbeddableRow[];
}

function extractRows(result: unknown): EmbeddableRow[] {
  if (Array.isArray(result)) return result as EmbeddableRow[];
  if (result && typeof result === "object" && Array.isArray((result as ExecResult).rows)) {
    return (result as ExecResult).rows as EmbeddableRow[];
  }
  return [];
}

export async function embedRowAsync(tableKey: keyof typeof TABLE_CONFIGS, id: string): Promise<void> {
  const config = TABLE_CONFIGS[tableKey];
  if (!config) return;
  const client = getEmbeddingClient();
  if (!client) return;
  try {
    const result = await db.execute(sql`SELECT * FROM ${sql.raw(`"${config.table}"`)} WHERE id = ${id} LIMIT 1`);
    const rows = extractRows(result);
    const row = rows[0];
    if (!row) return;
    const text = config.build(row);
    if (!text) return;
    const vec = await embedSingle(text);
    if (!vec || vec.length !== EMBED_DIM) return;
    const literal = vectorLiteral(vec);
    await db.execute(sql`UPDATE ${sql.raw(`"${config.table}"`)} SET embedding = ${literal}::vector WHERE id = ${id}`);
  } catch (e) {
    console.warn(`[embeddings] embedRowAsync(${tableKey}, ${id}) failed:`, e instanceof Error ? e.message : e);
  }
}

export function fireAndForgetEmbed(tableKey: keyof typeof TABLE_CONFIGS, id: string): void {
  embedRowAsync(tableKey, id).catch(() => {});
}

export const EMBEDDING_DIM = EMBED_DIM;
export const EMBEDDING_MODEL = EMBED_MODEL;
