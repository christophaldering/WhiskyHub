import { db, pool } from "./db";
import { tastings, whiskies, tastingParticipants, participants } from "@shared/schema";
import { eq } from "drizzle-orm";

async function cleanup() {
  const tasting = await db.query.tastings.findFirst({
    where: eq(tastings.title, "M2 Test Tasting"),
  });
  if (tasting) {
    await db.delete(whiskies).where(eq(whiskies.tastingId, tasting.id));
    await db.delete(tastingParticipants).where(eq(tastingParticipants.tastingId, tasting.id));
    await db.delete(tastings).where(eq(tastings.id, tasting.id));
    console.log("Deleted test tasting + whiskies + participants");
  }
  await db.delete(participants).where(eq(participants.email, "test.m2@casksense.local"));
  console.log("Deleted test user");
  await pool.end();
}

cleanup().catch((e) => { console.error(e); process.exit(1); });
