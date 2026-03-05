import { db, pool } from "./db";
import { participants, tastings, tastingParticipants, whiskies } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

const TEST_EMAIL = "test.m2@casksense.local";
const TEST_PASSWORD = "Test1234!";
const TEST_NAME = "M2 Test User";

async function seed() {
  console.log("🌱 Seeding test data for Module 2...");

  let testUser = await db.query.participants.findFirst({
    where: eq(participants.email, TEST_EMAIL),
  });

  if (!testUser) {
    const hashedPin = await bcrypt.hash(TEST_PASSWORD, 10);
    const [created] = await db
      .insert(participants)
      .values({
        name: TEST_NAME,
        email: TEST_EMAIL,
        pin: hashedPin,
        role: "user",
        language: "en",
      })
      .returning();
    testUser = created;
    console.log(`  ✓ Created test user: ${TEST_EMAIL} (${testUser.id})`);
  } else {
    console.log(`  ✓ Test user already exists: ${TEST_EMAIL} (${testUser.id})`);
  }

  const existingTasting = await db.query.tastings.findFirst({
    where: eq(tastings.title, "M2 Test Tasting"),
  });

  if (!existingTasting) {
    const code = "M2TEST";
    const [tasting] = await db
      .insert(tastings)
      .values({
        title: "M2 Test Tasting",
        date: new Date().toISOString().split("T")[0],
        location: "Test Location",
        hostId: testUser.id,
        code,
        status: "open",
        isTestData: true,
      })
      .returning();
    console.log(`  ✓ Created test tasting: ${tasting.title} (${tasting.id})`);

    const whiskyData = [
      { name: "Ardbeg 10", distillery: "Ardbeg", age: "10", abv: 46.0, region: "Islay", peatLevel: "Heavy", sortOrder: 0 },
      { name: "Glenfiddich 15 Solera", distillery: "Glenfiddich", age: "15", abv: 40.0, region: "Speyside", peatLevel: "None", sortOrder: 1 },
      { name: "Talisker Storm", distillery: "Talisker", age: "NAS", abv: 45.8, region: "Islands", peatLevel: "Medium", sortOrder: 2 },
    ];

    for (const w of whiskyData) {
      await db.insert(whiskies).values({ ...w, tastingId: tasting.id });
    }
    console.log(`  ✓ Added ${whiskyData.length} whiskies to test tasting`);

    const existingJoin = await db.query.tastingParticipants.findFirst({
      where: and(
        eq(tastingParticipants.tastingId, tasting.id),
        eq(tastingParticipants.participantId, testUser.id),
      ),
    });
    if (!existingJoin) {
      await db.insert(tastingParticipants).values({
        tastingId: tasting.id,
        participantId: testUser.id,
      });
      console.log(`  ✓ Added test user as tasting participant`);
    }
  } else {
    console.log(`  ✓ Test tasting already exists: ${existingTasting.title} (${existingTasting.id})`);
  }

  console.log("✅ Seed complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
