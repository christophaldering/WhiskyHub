import { db } from "./db";
import { tastings, whiskies, tastingParticipants, participants, ratings } from "@shared/schema";
import { eq, and, count } from "drizzle-orm";
import bcrypt from "bcryptjs";

const PILOT_CODE_A = "PILOT1";
const PILOT_CODE_B = "PILOT2";
const PILOT_PIN = "1234";

const PILOT_HOST = {
  name: "Pilot Host",
  email: "pilot.host@casksense.local",
};

const PILOT_PARTICIPANTS = [
  { name: "Liam McTavish", email: "liam@casksense.local" },
  { name: "Sophie Laurent", email: "sophie@casksense.local" },
  { name: "Erik Bergström", email: "erik@casksense.local" },
  { name: "Nadia Harper", email: "nadia@casksense.local" },
  { name: "James O'Brien", email: "james@casksense.local" },
  { name: "Yuki Tanaka", email: "yuki@casksense.local" },
];

const TASTING_A = {
  title: "Highland vs. Speyside — Guided Blind",
  date: "2026-03-15",
  location: "CaskSense Pilot Room",
  code: PILOT_CODE_A,
  status: "open" as const,
  blindMode: true,
  guidedMode: true,
  guidedWhiskyIndex: -1,
  guidedRevealStep: 0,
  isTestData: true,
  ratingScale: 100,
  guestMode: "standard",
};

const TASTING_B = {
  title: "World Whiskies — Open Exploration",
  date: "2026-03-22",
  location: "CaskSense Pilot Room",
  code: PILOT_CODE_B,
  status: "draft" as const,
  blindMode: false,
  guidedMode: false,
  isTestData: true,
  ratingScale: 100,
  guestMode: "standard",
};

const WHISKIES_A = [
  { name: "A'Bunadh Batch 72", distillery: "Aberlour", age: "NAS", abv: 60.8, region: "Speyside", peatLevel: "None", category: "Single Malt", caskInfluence: "Sherry", sortOrder: 0 },
  { name: "Old Pulteney 12", distillery: "Old Pulteney", age: "12", abv: 40.0, region: "Highland", peatLevel: "None", category: "Single Malt", caskInfluence: "Bourbon", sortOrder: 1 },
  { name: "GlenDronach 15 Revival", distillery: "GlenDronach", age: "15", abv: 46.0, region: "Highland", peatLevel: "None", category: "Single Malt", caskInfluence: "Sherry", sortOrder: 2 },
  { name: "Balvenie 14 Caribbean Cask", distillery: "Balvenie", age: "14", abv: 43.0, region: "Speyside", peatLevel: "None", category: "Single Malt", caskInfluence: "Bourbon", sortOrder: 3 },
  { name: "Clynelish 14", distillery: "Clynelish", age: "14", abv: 46.0, region: "Highland", peatLevel: "Light", category: "Single Malt", caskInfluence: "Bourbon", sortOrder: 4 },
];

const WHISKIES_B = [
  { name: "Redbreast 12", distillery: "Midleton", age: "12", abv: 40.0, region: "Ireland", peatLevel: "None", category: "Single Pot Still", caskInfluence: "Sherry", country: "Ireland", sortOrder: 0 },
  { name: "Nikka From The Barrel", distillery: "Nikka", age: "NAS", abv: 51.4, region: "Japan", peatLevel: "Light", category: "Blended", country: "Japan", sortOrder: 1 },
  { name: "Buffalo Trace", distillery: "Buffalo Trace", age: "NAS", abv: 45.0, region: "Kentucky", peatLevel: "None", category: "Bourbon", country: "USA", sortOrder: 2 },
  { name: "Amrut Fusion", distillery: "Amrut", age: "NAS", abv: 50.0, region: "Bangalore", peatLevel: "Medium", category: "Single Malt", country: "India", sortOrder: 3 },
];

function randomScore(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

async function ensureParticipant(email: string, name: string, hashedPin: string) {
  const existing = await db.query.participants.findFirst({
    where: eq(participants.email, email),
  });
  if (existing) return existing;
  const [created] = await db.insert(participants).values({
    name, email, pin: hashedPin, role: "user",
  }).returning();
  return created;
}

async function ensureTasting(code: string, data: any, hostId: string) {
  const existing = await db.query.tastings.findFirst({
    where: eq(tastings.code, code),
  });
  if (existing) return { tasting: existing, created: false };
  const [tasting] = await db.insert(tastings).values({ ...data, hostId }).returning();
  return { tasting, created: true };
}

async function ensureJoined(tastingId: string, participantId: string) {
  const [{ cnt }] = await db.select({ cnt: count() }).from(tastingParticipants)
    .where(and(eq(tastingParticipants.tastingId, tastingId), eq(tastingParticipants.participantId, participantId)));
  if (Number(cnt) > 0) return;
  await db.insert(tastingParticipants).values({ tastingId, participantId });
}

export async function seedLabsPilotData() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const existingA = await db.query.tastings.findFirst({ where: eq(tastings.code, PILOT_CODE_A) });
  const existingB = await db.query.tastings.findFirst({ where: eq(tastings.code, PILOT_CODE_B) });
  if (existingA && existingB) {
    console.log("  ✓ Labs pilot data already exists, skipping");
    return;
  }

  console.log("  → Seeding Labs pilot test data (LABS_TEST_DATA)...");

  const hashedPin = await bcrypt.hash(PILOT_PIN, 10);

  const host = await ensureParticipant(PILOT_HOST.email, PILOT_HOST.name, hashedPin);

  const participantRecords = [];
  for (const p of PILOT_PARTICIPANTS) {
    participantRecords.push(await ensureParticipant(p.email, p.name, hashedPin));
  }
  console.log(`  ✓ Ensured pilot host + ${participantRecords.length} participants`);

  const { tasting: tastingA, created: createdA } = await ensureTasting(PILOT_CODE_A, TASTING_A, host.id);
  if (createdA) {
    console.log(`  ✓ Created tasting A: "${tastingA.title}" (code: ${PILOT_CODE_A})`);
    for (const w of WHISKIES_A) {
      await db.insert(whiskies).values({ ...w, tastingId: tastingA.id });
    }
    console.log(`  ✓ Added ${WHISKIES_A.length} whiskies to tasting A`);
  }

  await ensureJoined(tastingA.id, host.id);
  for (const p of participantRecords) {
    await ensureJoined(tastingA.id, p.id);
  }
  console.log(`  ✓ All participants joined tasting A`);

  const tastingAWhiskies = await db.select().from(whiskies).where(eq(whiskies.tastingId, tastingA.id));
  let ratingsCreated = 0;
  for (const p of participantRecords) {
    for (const w of tastingAWhiskies) {
      const [{ cnt }] = await db.select({ cnt: count() }).from(ratings)
        .where(and(eq(ratings.tastingId, tastingA.id), eq(ratings.whiskyId, w.id), eq(ratings.participantId, p.id)));
      if (Number(cnt) > 0) continue;

      const nose = randomScore(50, 95);
      const taste = randomScore(50, 95);
      const finish = randomScore(45, 90);
      const overall = Math.round(((nose + taste + finish) / 3) * 10) / 10;
      await db.insert(ratings).values({
        tastingId: tastingA.id, whiskyId: w.id, participantId: p.id,
        nose, taste, finish, balance: 0, overall, normalizedScore: overall,
        normalizedNose: nose, normalizedTaste: taste, normalizedFinish: finish,
      });
      ratingsCreated++;
    }
  }
  if (ratingsCreated > 0) {
    console.log(`  ✓ Generated ${ratingsCreated} ratings across tasting A`);
  }

  const { tasting: tastingB, created: createdB } = await ensureTasting(PILOT_CODE_B, TASTING_B, host.id);
  if (createdB) {
    console.log(`  ✓ Created tasting B: "${tastingB.title}" (code: ${PILOT_CODE_B})`);
    for (const w of WHISKIES_B) {
      await db.insert(whiskies).values({ ...w, tastingId: tastingB.id });
    }
    console.log(`  ✓ Added ${WHISKIES_B.length} whiskies to tasting B`);
  }

  await ensureJoined(tastingB.id, host.id);
  console.log(`  ✓ Host joined tasting B`);

  console.log("  ✓ Labs pilot data seeded successfully (LABS_TEST_DATA)");
  console.log(`    Tasting codes: ${PILOT_CODE_A}, ${PILOT_CODE_B}`);
}
