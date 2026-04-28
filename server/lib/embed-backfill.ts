import { db } from "../db";
import { sql } from "drizzle-orm";
import {
  embedTexts, vectorLiteral, isEmbeddingAvailable,
  buildWhiskyText, buildTastingText, buildDistilleryText, buildLexiconText,
  EMBEDDING_DIM,
} from "./embeddings";

export type BackfillTableKey = "whiskies" | "tastings" | "distilleries" | "lexicon";

type BackfillRow = Record<string, unknown>;

interface BackfillTarget {
  key: BackfillTableKey;
  table: string;
  build: (row: BackfillRow) => string;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

const TARGETS: Record<BackfillTableKey, BackfillTarget> = {
  whiskies: {
    key: "whiskies",
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
    key: "tastings",
    table: "tastings",
    build: (r) => buildTastingText({
      title: asString(r.title),
      location: asString(r.location),
      hostReflection: asString(r.host_reflection),
      aiNarrative: asString(r.ai_narrative),
    }),
  },
  distilleries: {
    key: "distilleries",
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
    key: "lexicon",
    table: "lexicon",
    build: (r) => buildLexiconText({
      term: asString(r.term),
      definition: asString(r.definition),
      category: asString(r.category),
    }),
  },
};

export const BACKFILL_TABLE_KEYS: BackfillTableKey[] = ["whiskies", "tastings", "distilleries", "lexicon"];

interface ExecResult {
  rows?: BackfillRow[];
}

function extractRows(result: unknown): BackfillRow[] {
  if (Array.isArray(result)) return result as BackfillRow[];
  if (result && typeof result === "object" && Array.isArray((result as ExecResult).rows)) {
    return (result as ExecResult).rows as BackfillRow[];
  }
  return [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface BackfillOptions {
  batchSize?: number;
  pauseMs?: number;
  logger?: (msg: string) => void;
}

export interface BackfillResult {
  table: BackfillTableKey;
  pending: number;
  embedded: number;
  skipped: number;
  durationMs: number;
}

export interface EmbeddingStats {
  table: BackfillTableKey;
  total: number;
  withEmbedding: number;
  withoutEmbedding: number;
  coverage: number;
}

const DEFAULT_BATCH_SIZE = 32;
const DEFAULT_PAUSE_MS = 500;

export async function backfillTable(key: BackfillTableKey, options: BackfillOptions = {}): Promise<BackfillResult> {
  const target = TARGETS[key];
  const batchSize = Math.max(1, Math.min(100, options.batchSize ?? DEFAULT_BATCH_SIZE));
  const pauseMs = Math.max(0, options.pauseMs ?? DEFAULT_PAUSE_MS);
  const log = options.logger ?? ((msg: string) => console.log(msg));
  const startedAt = Date.now();

  const rowsResult = await db.execute(sql.raw(`SELECT * FROM "${target.table}" WHERE embedding IS NULL`));
  const rows = extractRows(rowsResult);
  const pending = rows.length;
  if (pending === 0) {
    log(`[backfill] ${target.key}: nothing to do`);
    return { table: target.key, pending: 0, embedded: 0, skipped: 0, durationMs: Date.now() - startedAt };
  }
  log(`[backfill] ${target.key}: ${pending} rows pending (batchSize=${batchSize}, pauseMs=${pauseMs})`);

  let embedded = 0;
  let skipped = 0;
  let lastLoggedAt = startedAt;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const texts = batch.map((r) => target.build(r) || " ");
    const vectors = await embedTexts(texts);
    if (!vectors) {
      log(`[backfill] ${target.key}: batch ${i}-${i + batch.length} failed, skipping`);
      skipped += batch.length;
    } else {
      for (let j = 0; j < batch.length; j++) {
        const vec = vectors[j];
        if (!vec || vec.length !== EMBEDDING_DIM) {
          skipped += 1;
          continue;
        }
        const literal = vectorLiteral(vec);
        const idVal = batch[j].id;
        const id = typeof idVal === "string" ? idVal : String(idVal);
        await db.execute(sql`UPDATE ${sql.raw(`"${target.table}"`)} SET embedding = ${literal}::vector WHERE id = ${id}`);
        embedded += 1;
      }
    }

    const processed = Math.min(i + batchSize, rows.length);
    const now = Date.now();
    if (processed === rows.length || processed - (i) >= 50 || now - lastLoggedAt >= 5000) {
      const elapsedMs = now - startedAt;
      const rate = processed / Math.max(1, elapsedMs / 1000);
      const remaining = rows.length - processed;
      const etaSec = rate > 0 ? Math.round(remaining / rate) : 0;
      log(`[backfill] ${target.key}: ${processed}/${rows.length} (embedded=${embedded}, skipped=${skipped}, eta=${etaSec}s)`);
      lastLoggedAt = now;
    }

    if (pauseMs > 0 && i + batchSize < rows.length) {
      await sleep(pauseMs);
    }
  }

  const durationMs = Date.now() - startedAt;
  log(`[backfill] ${target.key}: done in ${(durationMs / 1000).toFixed(1)}s (embedded=${embedded}, skipped=${skipped})`);
  return { table: target.key, pending, embedded, skipped, durationMs };
}

export async function backfillAll(options: BackfillOptions = {}): Promise<BackfillResult[]> {
  if (!isEmbeddingAvailable()) {
    throw new Error("No OpenAI key available (OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY).");
  }
  const results: BackfillResult[] = [];
  for (const key of BACKFILL_TABLE_KEYS) {
    try {
      const r = await backfillTable(key, options);
      results.push(r);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      (options.logger ?? console.log)(`[backfill] ${key} failed: ${msg}`);
      results.push({ table: key, pending: 0, embedded: 0, skipped: 0, durationMs: 0 });
    }
  }
  return results;
}

export async function getEmbeddingStats(): Promise<EmbeddingStats[]> {
  const stats: EmbeddingStats[] = [];
  for (const key of BACKFILL_TABLE_KEYS) {
    const target = TARGETS[key];
    const result = await db.execute(sql.raw(
      `SELECT count(*)::int AS total, count(embedding)::int AS with_emb FROM "${target.table}"`
    ));
    const rows = extractRows(result);
    const row = rows[0] as { total?: number; with_emb?: number } | undefined;
    const total = row?.total ?? 0;
    const withEmbedding = row?.with_emb ?? 0;
    const withoutEmbedding = Math.max(0, total - withEmbedding);
    const coverage = total === 0 ? 1 : withEmbedding / total;
    stats.push({ table: key, total, withEmbedding, withoutEmbedding, coverage });
  }
  return stats;
}

export function isValidBackfillTable(value: string): value is BackfillTableKey {
  return BACKFILL_TABLE_KEYS.includes(value as BackfillTableKey);
}
