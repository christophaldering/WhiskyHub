import { db } from "../db";
import { sql } from "drizzle-orm";

async function verify() {
  const cols = await db.execute(sql`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('user_activity_sessions', 'page_views') 
      AND column_name = 'duration_seconds'
    ORDER BY table_name
  `);

  console.log("=== Verification: duration_seconds columns ===");
  for (const row of cols.rows) {
    console.log(`  ✓ ${row.table_name}.${row.column_name} (${row.data_type})`);
  }

  if (cols.rows.length !== 2) {
    console.error("FAIL: Expected 2 tables with duration_seconds, found", cols.rows.length);
    process.exit(1);
  }

  const backfillCheck = await db.execute(sql`
    SELECT COUNT(*) as count 
    FROM user_activity_sessions 
    WHERE duration_minutes > 0 AND duration_seconds IS NULL
  `);
  const unbackfilled = Number(backfillCheck.rows[0]?.count ?? 0);
  if (unbackfilled > 0) {
    console.error(`FAIL: ${unbackfilled} rows still need backfill`);
    process.exit(1);
  }
  console.log("  ✓ All rows with duration_minutes have been backfilled");
  console.log("=== All checks passed ===");
}

verify().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
