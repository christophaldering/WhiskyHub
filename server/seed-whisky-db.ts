import OpenAI from "openai";
import { db, pool } from "./db";
import { journalEntries } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const SYSTEM_PARTICIPANT_ID = "casksense-database-system";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface WhiskyEntry {
  name: string;
  distillery: string;
  region: string;
  country: string;
  category: string;
  age: string;
  abv: string;
  cask_type: string;
  peat_level: string;
  vintage: string;
  bottler: string;
}

const BATCH_CONFIGS: { category: string; region: string; country: string; count: number }[] = [
  { category: "Single Malt", region: "Speyside", country: "Scotland", count: 250 },
  { category: "Single Malt", region: "Highland", country: "Scotland", count: 200 },
  { category: "Single Malt", region: "Islay", country: "Scotland", count: 120 },
  { category: "Single Malt", region: "Lowland", country: "Scotland", count: 50 },
  { category: "Single Malt", region: "Campbeltown", country: "Scotland", count: 30 },
  { category: "Single Malt", region: "Islands", country: "Scotland", count: 80 },
  { category: "Blended Scotch", region: "Scotland", country: "Scotland", count: 100 },
  { category: "Blended Malt", region: "Scotland", country: "Scotland", count: 40 },
  { category: "Single Grain", region: "Scotland", country: "Scotland", count: 30 },
  { category: "Single Malt", region: "Ireland", country: "Ireland", count: 80 },
  { category: "Blended Irish", region: "Ireland", country: "Ireland", count: 40 },
  { category: "Single Pot Still", region: "Ireland", country: "Ireland", count: 30 },
  { category: "Bourbon", region: "Kentucky", country: "USA", count: 150 },
  { category: "Tennessee Whiskey", region: "Tennessee", country: "USA", count: 30 },
  { category: "Rye Whiskey", region: "USA", country: "USA", count: 80 },
  { category: "American Single Malt", region: "USA", country: "USA", count: 30 },
  { category: "Single Malt", region: "Japan", country: "Japan", count: 100 },
  { category: "Blended Japanese", region: "Japan", country: "Japan", count: 40 },
  { category: "Canadian Whisky", region: "Canada", country: "Canada", count: 40 },
  { category: "Single Malt", region: "India", country: "India", count: 25 },
  { category: "Single Malt", region: "Taiwan", country: "Taiwan", count: 20 },
  { category: "Single Malt", region: "Australia", country: "Australia", count: 20 },
  { category: "Single Malt", region: "Sweden", country: "Sweden", count: 15 },
  { category: "Single Malt", region: "Germany", country: "Germany", count: 15 },
  { category: "Single Malt", region: "France", country: "France", count: 15 },
  { category: "Single Malt", region: "England", country: "England", count: 10 },
  { category: "World Whisky", region: "Rest of World", country: "Various", count: 50 },
];

const ITEMS_PER_REQUEST = 50;

async function generateBatch(
  category: string,
  region: string,
  country: string,
  batchNum: number,
  totalBatches: number,
  existingNames: Set<string>
): Promise<WhiskyEntry[]> {
  const recentNames = Array.from(existingNames).slice(-300);
  const existingHint = recentNames.length > 0
    ? `\nDo NOT include any of these already-generated whiskies: ${recentNames.join(", ")}`
    : "";

  const prompt = `Generate exactly ${ITEMS_PER_REQUEST} real, well-known ${category} whiskies from ${region}, ${country}.
This is batch ${batchNum}/${totalBatches} — generate DIFFERENT whiskies than previous batches.
Prioritize the most famous, award-winning, and widely available expressions first, then move to lesser-known but real bottlings.
${existingHint}

Return a JSON object with a "whiskies" key containing an array of objects. Each object must have these fields:
- name: The full expression name (e.g. "Glenfiddich 18 Year Old", "Maker's Mark", "Yamazaki 12")
- distillery: The distillery or producer name
- region: "${region}"
- country: "${country}"
- category: "${category}"
- age: Age statement as string (e.g. "12", "18", "NAS" for no age statement)
- abv: Alcohol percentage as string (e.g. "43", "46", "54.2")
- cask_type: Maturation cask type (e.g. "Ex-Bourbon", "Ex-Sherry Oloroso", "Virgin Oak", "" if unknown)
- peat_level: One of "None", "Light", "Medium", "Heavy", or "" if not applicable
- vintage: Vintage year as string if applicable, otherwise ""
- bottler: "Official" for official bottlings, or the independent bottler name

Rules:
- Only include REAL whiskies that actually exist or existed
- Include a mix of current production and notable discontinued expressions
- Include both core range and special/limited editions
- Be accurate with ABV values (typical range 40-65%)
- Every entry must have a unique name+distillery combination`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.9,
    max_tokens: 16000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    console.error(`  ✗ Failed to parse JSON for ${category}/${region} batch ${batchNum}`);
    return [];
  }

  const obj = parsed as Record<string, unknown>;
  const rawItems: unknown[] = Array.isArray(parsed)
    ? (parsed as unknown[])
    : (Array.isArray(obj.whiskies) ? obj.whiskies as unknown[]
       : Array.isArray(obj.data) ? obj.data as unknown[]
       : Array.isArray(obj.items) ? obj.items as unknown[]
       : Array.isArray(obj.bottles) ? obj.bottles as unknown[]
       : []);

  return rawItems.filter((w): w is WhiskyEntry => {
    if (typeof w !== "object" || w === null) return false;
    const entry = w as Record<string, unknown>;
    if (!entry.name || typeof entry.name !== "string") return false;
    if (!entry.distillery || typeof entry.distillery !== "string") return false;
    if (typeof entry.abv === "string") {
      const abvNum = parseFloat(entry.abv);
      if (!isNaN(abvNum) && (abvNum < 20 || abvNum > 80)) return false;
    }
    return true;
  }) as WhiskyEntry[];
}

function makeKey(name: string, distillery: string): string {
  return `${(name || "").toLowerCase().trim()}::${(distillery || "").toLowerCase().trim()}`;
}

async function getExistingKeys(): Promise<Set<string>> {
  const existing = await db.select({
    name: journalEntries.whiskyName,
    distillery: journalEntries.distillery,
  })
  .from(journalEntries)
  .where(eq(journalEntries.source, "casksense-database"));

  const keys = new Set<string>();
  for (const e of existing) {
    if (e.name) keys.add(makeKey(e.name, e.distillery || ""));
  }
  return keys;
}

function categoryKey(region: string, country: string): string {
  return `${region}::${country}`;
}

async function getExistingCountsByCategory(): Promise<Map<string, number>> {
  const rows = await db.select({
    region: journalEntries.region,
    country: journalEntries.country,
    count: sql<number>`count(*)`,
  })
  .from(journalEntries)
  .where(eq(journalEntries.source, "casksense-database"))
  .groupBy(journalEntries.region, journalEntries.country);

  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.region) counts.set(categoryKey(r.region, r.country || ""), Number(r.count));
  }
  return counts;
}

async function insertWhiskiesBatch(whiskies: WhiskyEntry[]): Promise<number> {
  if (whiskies.length === 0) return 0;

  const values = whiskies.map(w => ({
    participantId: SYSTEM_PARTICIPANT_ID,
    title: w.name,
    whiskyName: w.name,
    distillery: w.distillery || null,
    region: w.region || null,
    country: w.country || null,
    age: w.age || null,
    abv: w.abv || null,
    caskType: w.cask_type || null,
    peatLevel: w.peat_level || null,
    vintage: w.vintage || null,
    bottler: w.bottler || null,
    source: "casksense-database",
    status: "final" as const,
  }));

  try {
    const result = await db.insert(journalEntries).values(values).returning({ id: journalEntries.id });
    return result.length;
  } catch (err: unknown) {
    let inserted = 0;
    for (const v of values) {
      try {
        await db.insert(journalEntries).values(v);
        inserted++;
      } catch (innerErr: unknown) {
        const msg = innerErr instanceof Error ? innerErr.message : String(innerErr);
        console.error(`  ✗ Insert failed for ${v.whiskyName}: ${msg}`);
      }
    }
    return inserted;
  }
}

async function main() {
  console.log("🥃 CaskSense Whisky Database Seeder");
  console.log("====================================\n");

  const totalTarget = BATCH_CONFIGS.reduce((sum, b) => sum + b.count, 0);
  console.log(`Target: ~${totalTarget} whiskies across ${BATCH_CONFIGS.length} categories\n`);

  const existingKeys = await getExistingKeys();
  const existingCounts = await getExistingCountsByCategory();
  console.log(`Existing entries in DB: ${existingKeys.size}`);
  console.log(`Categories with data: ${existingCounts.size}\n`);

  let totalInserted = 0;
  let totalGenerated = 0;
  let totalDuplicates = 0;
  let skippedCategories = 0;

  for (const config of BATCH_CONFIGS) {
    const currentCount = existingCounts.get(categoryKey(config.region, config.country)) || 0;
    const remaining = Math.max(0, config.count - currentCount);

    if (remaining <= 5) {
      console.log(`  ⏭ ${config.category}/${config.region}: ${currentCount}/${config.count} — skipping (target met)`);
      skippedCategories++;
      continue;
    }

    const batchesNeeded = Math.ceil(remaining / ITEMS_PER_REQUEST);
    const batchesThisRun = Math.min(batchesNeeded, 2);
    console.log(`\n📦 ${config.category} — ${config.region}, ${config.country} (${currentCount}/${config.count}, ${batchesThisRun} batches this run)`);

    let categoryInserted = 0;
    const categoryKeys = new Set<string>();

    for (let batch = 1; batch <= batchesThisRun; batch++) {
      const retryLimit = 1;
      let whiskies: WhiskyEntry[] = [];

      for (let attempt = 0; attempt <= retryLimit; attempt++) {
        try {
          whiskies = await generateBatch(
            config.category,
            config.region,
            config.country,
            batch,
            batchesThisRun,
            new Set([...existingKeys, ...categoryKeys])
          );
          break;
        } catch (err: unknown) {
          if (attempt < retryLimit) {
            console.log(`  ⚠ Batch ${batch} attempt ${attempt + 1} failed, retrying in 3s...`);
            await new Promise(r => setTimeout(r, 3000));
          } else {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`  ✗ Batch ${batch} failed: ${msg}`);
          }
        }
      }

      const uniqueWhiskies: WhiskyEntry[] = [];
      const pendingKeys: string[] = [];
      for (const w of whiskies) {
        const key = makeKey(w.name, w.distillery);
        if (!existingKeys.has(key) && !categoryKeys.has(key)) {
          uniqueWhiskies.push(w);
          pendingKeys.push(key);
          categoryKeys.add(key);
        } else {
          totalDuplicates++;
        }
      }

      const inserted = await insertWhiskiesBatch(uniqueWhiskies);
      for (const key of pendingKeys) {
        existingKeys.add(key);
      }
      categoryInserted += inserted;
      totalGenerated += whiskies.length;
      totalInserted += inserted;

      console.log(`  Batch ${batch}/${batchesThisRun}: generated ${whiskies.length}, unique ${uniqueWhiskies.length}, inserted ${inserted}`);

      if (batch < batchesThisRun) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    console.log(`  ✓ ${config.category}/${config.region}: +${categoryInserted} (total now: ${currentCount + categoryInserted})`);
  }

  console.log("\n====================================");
  console.log(`✅ Seeding run complete!`);
  console.log(`   Categories skipped (target met): ${skippedCategories}`);
  console.log(`   Generated: ${totalGenerated}`);
  console.log(`   Duplicates skipped: ${totalDuplicates}`);
  console.log(`   Inserted: ${totalInserted}`);

  const finalCount = await db.select({ count: sql<number>`count(*)` })
    .from(journalEntries)
    .where(eq(journalEntries.source, "casksense-database"));
  console.log(`   Total DB entries (source=casksense-database): ${finalCount[0]?.count || 0}`);

  await pool.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("Fatal error:", err);
  await pool.end();
  process.exit(1);
});
