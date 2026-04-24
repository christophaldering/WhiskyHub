import pg from "pg";

async function prePushSync() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("DATABASE_URL not set, skipping pre-push sync");
    process.exit(0);
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  try {
    const textToReal = [
      { table: "journal_entries", column: "abv" },
      { table: "journal_entries", column: "price" },
      { table: "benchmark_entries", column: "abv" },
      { table: "whiskybase_collection", column: "abv" },
      { table: "wishlist_entries", column: "abv" },
    ];

    for (const { table, column } of textToReal) {
      const res = await client.query(
        `SELECT data_type FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [table, column]
      );
      const dtype = res.rows?.[0]?.data_type;
      if (dtype === "text") {
        await client.query(
          `UPDATE "${table}" SET "${column}" = REPLACE("${column}", '%', '') WHERE "${column}" LIKE '%\\%%'`
        );
        await client.query(
          `UPDATE "${table}" SET "${column}" = NULL WHERE "${column}" IS NOT NULL AND "${column}" !~ '^-?[0-9]+([.,][0-9]+)?$'`
        );
        await client.query(
          `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE real USING NULLIF(REPLACE("${column}", ',', '.'), '')::real`
        );
        console.log(`pre-push-sync: ${table}.${column} text → real`);
      }
    }

    // Migrate tastings.target_community_ids from JSON text to native text[]
    const tcRes = await client.query(
      `SELECT data_type FROM information_schema.columns WHERE table_name = 'tastings' AND column_name = 'target_community_ids'`
    );
    const tcDtype = tcRes.rows?.[0]?.data_type;
    if (tcDtype === "text") {
      // Defensive: NULL out any values that are not valid JSON arrays to prevent cast failures
      await client.query(`
        UPDATE "tastings"
        SET "target_community_ids" = NULL
        WHERE "target_community_ids" IS NOT NULL
          AND "target_community_ids" != ''
          AND (
            jsonb_typeof("target_community_ids"::jsonb) IS DISTINCT FROM 'array'
            OR "target_community_ids"::jsonb = 'null'::jsonb
          )
      `);
      await client.query(`ALTER TABLE "tastings" ADD COLUMN "target_community_ids_arr" text[]`);
      await client.query(`
        UPDATE "tastings"
        SET "target_community_ids_arr" = (
          SELECT array_agg(v)
          FROM jsonb_array_elements_text("target_community_ids"::jsonb) AS v
        )
        WHERE "target_community_ids" IS NOT NULL AND "target_community_ids" != ''
      `);
      await client.query(`ALTER TABLE "tastings" DROP COLUMN "target_community_ids"`);
      await client.query(`ALTER TABLE "tastings" RENAME COLUMN "target_community_ids_arr" TO "target_community_ids"`);
      console.log("pre-push-sync: tastings.target_community_ids text → text[]");
    }
    // Ensure GIN index exists for efficient array membership queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS "tastings_target_community_ids_gin"
      ON "tastings" USING GIN ("target_community_ids")
      WHERE "target_community_ids" IS NOT NULL
    `);
    console.log("pre-push-sync: tastings.target_community_ids GIN index ensured");

    // Migrate bottle_splits.target_community_ids from JSON text to native text[]
    const bsRes = await client.query(
      `SELECT data_type FROM information_schema.columns WHERE table_name = 'bottle_splits' AND column_name = 'target_community_ids'`
    );
    const bsDtype = bsRes.rows?.[0]?.data_type;
    if (bsDtype === "text") {
      // Step 1: NULL out values that cannot possibly be JSON arrays (no jsonb cast, regex only)
      // This prevents cast errors in step 2 for malformed legacy values.
      await client.query(`
        UPDATE "bottle_splits"
        SET "target_community_ids" = NULL
        WHERE "target_community_ids" IS NOT NULL
          AND "target_community_ids" != ''
          AND "target_community_ids" !~ '^\\s*\\[.*\\]\\s*$'
      `);
      // Step 2: NULL out values that look like JSON arrays but are not valid text[] arrays
      await client.query(`
        UPDATE "bottle_splits"
        SET "target_community_ids" = NULL
        WHERE "target_community_ids" IS NOT NULL
          AND "target_community_ids" != ''
          AND (
            jsonb_typeof("target_community_ids"::jsonb) IS DISTINCT FROM 'array'
            OR "target_community_ids"::jsonb = 'null'::jsonb
          )
      `);
      await client.query(`ALTER TABLE "bottle_splits" ADD COLUMN "target_community_ids_arr" text[]`);
      await client.query(`
        UPDATE "bottle_splits"
        SET "target_community_ids_arr" = (
          SELECT array_agg(v)
          FROM jsonb_array_elements_text("target_community_ids"::jsonb) AS v
        )
        WHERE "target_community_ids" IS NOT NULL AND "target_community_ids" != ''
      `);
      await client.query(`ALTER TABLE "bottle_splits" DROP COLUMN "target_community_ids"`);
      await client.query(`ALTER TABLE "bottle_splits" RENAME COLUMN "target_community_ids_arr" TO "target_community_ids"`);
      console.log("pre-push-sync: bottle_splits.target_community_ids text → text[]");
    }
    // Ensure GIN index for bottle_splits community membership queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS "bottle_splits_target_community_ids_gin"
      ON "bottle_splits" USING GIN ("target_community_ids")
      WHERE "target_community_ids" IS NOT NULL
    `);
    console.log("pre-push-sync: bottle_splits.target_community_ids GIN index ensured");

    const addColumns = [
      { table: "whiskies", column: "country", type: "text" },
      { table: "whiskybase_collection", column: "country", type: "text" },
      { table: "whiskybase_collection", column: "region", type: "text" },
      { table: "wishlist_entries", column: "country", type: "text" },
    ];

    for (const { table, column, type } of addColumns) {
      await client.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${type}`
      );
    }
    console.log("pre-push-sync: missing columns ensured");

  } finally {
    await client.end();
  }
}

prePushSync()
  .then(() => {
    console.log("pre-push-sync: done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("pre-push-sync failed:", err.message);
    process.exit(0);
  });
