import { db } from "../server/db";
import { sql } from "drizzle-orm";
import {
  embedTexts, vectorLiteral, isEmbeddingAvailable,
  buildWhiskyText, buildTastingText, buildDistilleryText, buildLexiconText,
  EMBEDDING_DIM,
} from "../server/lib/embeddings";

const BATCH_SIZE = 32;

type BackfillRow = Record<string, unknown>;

interface BackfillTarget {
  table: string;
  build: (row: BackfillRow) => string;
  label: string;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

const TARGETS: BackfillTarget[] = [
  {
    table: "whiskies",
    label: "whiskies",
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
  {
    table: "tastings",
    label: "tastings",
    build: (r) => buildTastingText({
      title: asString(r.title),
      location: asString(r.location),
      hostReflection: asString(r.host_reflection),
      aiNarrative: asString(r.ai_narrative),
    }),
  },
  {
    table: "distilleries",
    label: "distilleries",
    build: (r) => buildDistilleryText({
      name: asString(r.name),
      region: asString(r.region),
      country: asString(r.country),
      description: asString(r.description),
      feature: asString(r.feature),
    }),
  },
  {
    table: "lexicon",
    label: "lexicon",
    build: (r) => buildLexiconText({
      term: asString(r.term),
      definition: asString(r.definition),
      category: asString(r.category),
    }),
  },
];

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

async function backfillTable(target: BackfillTarget): Promise<{ done: number; skipped: number }> {
  const rowsResult = await db.execute(sql.raw(`SELECT * FROM "${target.table}" WHERE embedding IS NULL`));
  const rows = extractRows(rowsResult);
  if (rows.length === 0) return { done: 0, skipped: 0 };
  console.log(`[backfill] ${target.label}: ${rows.length} rows pending`);

  let done = 0;
  let skipped = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const texts = batch.map((r) => target.build(r) || " ");
    const vectors = await embedTexts(texts);
    if (!vectors) {
      console.warn(`[backfill] ${target.label}: batch failed, skipping ${batch.length} rows`);
      skipped += batch.length;
      continue;
    }
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
      done += 1;
    }
    process.stdout.write(`  ${target.label}: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}\r`);
  }
  process.stdout.write("\n");
  return { done, skipped };
}

async function main() {
  if (!isEmbeddingAvailable()) {
    console.error("[backfill] No OpenAI key available (AI_INTEGRATIONS_OPENAI_API_KEY or OPENAI_API_KEY).");
    process.exit(1);
  }
  let totalDone = 0;
  let totalSkipped = 0;
  for (const target of TARGETS) {
    try {
      const { done, skipped } = await backfillTable(target);
      totalDone += done;
      totalSkipped += skipped;
      console.log(`[backfill] ${target.label}: embedded ${done}, skipped ${skipped}`);
    } catch (e) {
      console.error(`[backfill] ${target.label} failed:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`[backfill] complete – total embedded ${totalDone}, skipped ${totalSkipped}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[backfill] fatal:", e);
  process.exit(1);
});
