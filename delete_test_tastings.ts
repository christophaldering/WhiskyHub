import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT id, title, status FROM tastings WHERE title ILIKE '%test%' ORDER BY title");
    console.log(`Found ${rows.length} test tastings to delete:\n`);
    for (const r of rows) console.log(`  - "${r.title}" (${r.status})`);
    console.log("");

    let totalRatings = 0, totalWhiskies = 0, totalParticipants = 0;
    for (const row of rows) {
      const id = row.id;
      await client.query("BEGIN");
      const r1 = await client.query("DELETE FROM ratings WHERE tasting_id = $1", [id]);
      await client.query("DELETE FROM discussion_entries WHERE tasting_id = $1", [id]);
      await client.query("DELETE FROM reflection_entries WHERE tasting_id = $1", [id]);
      await client.query("DELETE FROM session_invites WHERE tasting_id = $1", [id]);
      const r5 = await client.query("DELETE FROM whiskies WHERE tasting_id = $1", [id]);
      const r6 = await client.query("DELETE FROM tasting_participants WHERE tasting_id = $1", [id]);
      await client.query("DELETE FROM tastings WHERE id = $1", [id]);
      await client.query("COMMIT");
      totalRatings += r1.rowCount || 0;
      totalWhiskies += r5.rowCount || 0;
      totalParticipants += r6.rowCount || 0;
      console.log(`  ✓ "${row.title}": ${r1.rowCount} ratings, ${r5.rowCount} whiskies, ${r6.rowCount} participants`);
    }
    console.log(`\n=== Summary ===`);
    console.log(`${rows.length} tastings deleted`);
    console.log(`${totalRatings} ratings deleted`);
    console.log(`${totalWhiskies} whiskies deleted`);
    console.log(`${totalParticipants} participant entries deleted`);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Error:", e);
  } finally {
    client.release();
    await pool.end();
  }
}
main();
