import { backfillAll, BACKFILL_TABLE_KEYS, backfillTable, isValidBackfillTable } from "../server/lib/embed-backfill";
import { isEmbeddingAvailable } from "../server/lib/embeddings";

async function main(): Promise<void> {
  if (!isEmbeddingAvailable()) {
    console.error("[backfill] No OpenAI key available (OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY).");
    process.exit(1);
  }

  const batchSize = Number.parseInt(process.env.BACKFILL_BATCH_SIZE ?? "32", 10);
  const pauseMs = Number.parseInt(process.env.BACKFILL_PAUSE_MS ?? "500", 10);
  const tableArg = process.argv[2];

  const options = {
    batchSize: Number.isFinite(batchSize) ? batchSize : 32,
    pauseMs: Number.isFinite(pauseMs) ? pauseMs : 500,
  };

  if (tableArg && tableArg !== "all") {
    if (!isValidBackfillTable(tableArg)) {
      console.error(`[backfill] invalid table "${tableArg}". Valid: ${BACKFILL_TABLE_KEYS.join(", ")}, all`);
      process.exit(1);
    }
    const result = await backfillTable(tableArg, options);
    console.log(`[backfill] complete – embedded=${result.embedded}, skipped=${result.skipped}, durationMs=${result.durationMs}`);
    process.exit(0);
  }

  const results = await backfillAll(options);
  const totalEmbedded = results.reduce((sum, r) => sum + r.embedded, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
  console.log(`[backfill] complete – total embedded=${totalEmbedded}, skipped=${totalSkipped}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[backfill] fatal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
