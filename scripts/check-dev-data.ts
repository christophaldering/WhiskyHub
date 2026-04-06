import { db } from "../server/db";
import { participants, tastings, whiskies } from "../shared/schema";
import { count, eq } from "drizzle-orm";

const [user] = await db
  .select({
    id: participants.id,
    name: participants.name,
    email: participants.email,
    role: participants.role,
    canAccessWhiskyDb: participants.canAccessWhiskyDb,
    createdAt: participants.createdAt,
  })
  .from(participants)
  .where(eq(participants.email, "christoph.aldering@googlemail.com"))
  .limit(1);

const [{ participantsCount }] = await db
  .select({ participantsCount: count() })
  .from(participants);

const [{ tastingsCount }] = await db
  .select({ tastingsCount: count() })
  .from(tastings);

const [{ whiskiesCount }] = await db
  .select({ whiskiesCount: count() })
  .from(whiskies);

console.log({
  user,
  participantsCount,
  tastingsCount,
  whiskiesCount,
});
process.exit(0);
