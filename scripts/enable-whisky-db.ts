import { db } from "../server/db";
import { participants } from "../shared/schema";
import { eq } from "drizzle-orm";

const rows = await db
  .update(participants)
  .set({ canAccessWhiskyDb: true })
  .where(eq(participants.email, "christoph.aldering@googlemail.com"))
  .returning({
    id: participants.id,
    name: participants.name,
    email: participants.email,
    canAccessWhiskyDb: participants.canAccessWhiskyDb,
  });

console.log(rows);
process.exit(0);
