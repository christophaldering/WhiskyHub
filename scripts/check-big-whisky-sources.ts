import { db } from "../server/db";
import {
  whiskybaseCollection,
  historicalTastings,
  historicalTastingEntries,
} from "../shared/schema";
import { count } from "drizzle-orm";

const [{ whiskybaseCollectionCount }] = await db
  .select({ whiskybaseCollectionCount: count() })
  .from(whiskybaseCollection);

const [{ historicalTastingsCount }] = await db
  .select({ historicalTastingsCount: count() })
  .from(historicalTastings);

const [{ historicalTastingEntriesCount }] = await db
  .select({ historicalTastingEntriesCount: count() })
  .from(historicalTastingEntries);

console.log({
  whiskybaseCollectionCount,
  historicalTastingsCount,
  historicalTastingEntriesCount,
});

process.exit(0);
