import { db } from "../server/db";
import { sql } from "drizzle-orm";
import {
  embedTexts, vectorLiteral, isEmbeddingAvailable,
  buildWhiskyText, buildTastingText, buildDistilleryText, buildLexiconText,
  EMBEDDING_DIM,
} from "../server/lib/embeddings";

const BATCH_SIZE = 32;

interface BackfillTarget {
  table: string;
  build: (row: any) => string;
  label: string;
}

const TARGETS: BackfillTarget[] = [
  { table: "whiskies", build: buildWhiskyText, label: "whiskies" },
  { table: "tastings", build: buildTastingText, label: "tastings" },
  { table: "distilleries", build: buildDistilleryText, label: "distilleries" },
  { table: "lexicon", build: buildLexiconText, label: "lexicon" },
];

async function backfillTable(target: BackfillTarget): Promise<{ done: number; skipped: number }> {
  const rowsResult = await db.execute(sql.raw(`SELECT * FROM "${target.table}" WHERE embedding IS NULL`));
  const rows = ((rowsResult as any).rows ?? rowsResult) as any[];
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
      const id = String(batch[j].id).replace(/'/g, "''");
      await db.execute(sql.raw(`UPDATE "${target.table}" SET embedding = '${literal}'::vector WHERE id = '${id}'`));
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
