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
