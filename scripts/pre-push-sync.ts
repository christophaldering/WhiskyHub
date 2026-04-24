/**
 * Manual pre-push migration helper.
 *
 * All migration logic lives in script/build.ts → preBuildMigrations().
 * This script is a thin wrapper so developers can run migrations manually
 * against the local (or any) database without triggering a full build.
 *
 * Usage:
 *   DATABASE_URL=<url> npx tsx scripts/pre-push-sync.ts
 */
import { preBuildMigrations } from "../script/build.ts";

preBuildMigrations()
  .then(() => {
    console.log("pre-push-sync: done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("pre-push-sync failed:", err.message);
    process.exit(1);
  });
