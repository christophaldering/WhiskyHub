import { db } from "./db";
import { tastings, whiskies, tastingParticipants, participants } from "@shared/schema";
import { eq } from "drizzle-orm";

const DEMO_CODE = "DEMO";
const DEMO_TITLE = "Islay Discovery — 8 Legends";

const DEMO_WHISKIES = [
  { name: "Uigeadail", distillery: "Ardbeg", age: "NAS", abv: 54.2, region: "Islay", peatLevel: "Heavy", sortOrder: 0 },
  { name: "Lagavulin 16", distillery: "Lagavulin", age: "16", abv: 43.0, region: "Islay", peatLevel: "Heavy", sortOrder: 1 },
  { name: "Cask Strength Batch 17", distillery: "Laphroaig", age: "10", abv: 58.3, region: "Islay", peatLevel: "Heavy", sortOrder: 2 },
  { name: "Deep & Complex", distillery: "Bowmore", age: "18", abv: 43.0, region: "Islay", peatLevel: "Medium", sortOrder: 3 },
  { name: "Port Charlotte 10", distillery: "Bruichladdich", age: "10", abv: 50.0, region: "Islay", peatLevel: "Heavy", sortOrder: 4 },
  { name: "Toiteach A Dhà", distillery: "Bunnahabhain", age: "NAS", abv: 46.3, region: "Islay", peatLevel: "Medium", sortOrder: 5 },
  { name: "Distillers Edition 2009/2021", distillery: "Caol Ila", age: "12", abv: 43.0, region: "Islay", peatLevel: "Medium", sortOrder: 6 },
  { name: "Loch Gorm", distillery: "Kilchoman", age: "10", abv: 46.0, region: "Islay", peatLevel: "Heavy", sortOrder: 7 },
];

export async function seedDemoTasting() {
  const existing = await db.query.tastings.findFirst({
    where: eq(tastings.code, DEMO_CODE),
  });

  if (existing) {
    if (existing.status !== "open") {
      await db.update(tastings).set({ status: "open" }).where(eq(tastings.id, existing.id));
      console.log(`  ✓ Demo tasting reset to "open" status`);
    } else {
      console.log(`  ✓ Demo tasting already exists: ${existing.title} (${existing.id})`);
    }
    return existing.id;
  }

  const [admin] = await db
    .select()
    .from(participants)
    .where(eq(participants.role, "admin"))
    .limit(1);

  if (!admin) {
    console.log("  ⚠ Demo seed: no admin participant found, skipping");
    return null;
  }

  const [tasting] = await db
    .insert(tastings)
    .values({
      title: DEMO_TITLE,
      date: "2099-12-31",
      location: "CaskSense Demo Room",
      hostId: admin.id,
      code: DEMO_CODE,
      status: "open",
      isTestData: true,
      blindMode: false,
      guestMode: "standard",
    })
    .returning();

  console.log(`  ✓ Created demo tasting: ${tasting.title} (${tasting.id})`);

  for (const w of DEMO_WHISKIES) {
    await db.insert(whiskies).values({ ...w, tastingId: tasting.id });
  }
  console.log(`  ✓ Added ${DEMO_WHISKIES.length} Islay whiskies to demo tasting`);

  const existingJoin = await db.query.tastingParticipants.findFirst({
    where: eq(tastingParticipants.tastingId, tasting.id),
  });
  if (!existingJoin) {
    await db.insert(tastingParticipants).values({
      tastingId: tasting.id,
      participantId: admin.id,
    });
    console.log(`  ✓ Added admin as demo tasting host participant`);
  }

  return tasting.id;
}
