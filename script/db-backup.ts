/**
 * On-demand database backup (CLI).
 *
 * Usage:
 *   npm run db:backup
 *
 * Produces a compressed, restore-capable pg_dump (custom format) into ./backups/
 * named casksense-<YYYY-MM-DD_HHMM>.dump (Europe/Berlin time). Keeps the 10 most
 * recent dumps and deletes older ones. The backups/ folder is git-ignored.
 *
 * The actual dump logic lives in server/db-backup-runner.ts (also used by the
 * weekly Object-Storage backup scheduler).
 *
 * Restore:
 *   pg_restore -d "$DATABASE_URL" --clean --if-exists backups/<file>.dump
 */
import { readdirSync, statSync, unlinkSync } from "fs";
import { join } from "path";
import { runBackup } from "../server/db-backup-runner";

const RETENTION = 10;
const BACKUP_DIR = "backups";

function applyRetention(): void {
  const dumps = readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".dump"))
    .map((f) => ({ name: f, mtime: statSync(join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  const stale = dumps.slice(RETENTION);
  for (const { name } of stale) {
    unlinkSync(join(BACKUP_DIR, name));
    console.log(`removed old backup: ${name}`);
  }
}

async function main(): Promise<void> {
  console.log(`creating backup in ./${BACKUP_DIR}/ ...`);
  const result = await runBackup(BACKUP_DIR);
  if (!result.ok || !result.filePath) {
    console.error(result.error || "backup failed");
    process.exit(1);
  }
  console.log(`backup complete: ${result.fileName} (${result.sizeMb} MB)`);
  applyRetention();
  console.log(`restore with: pg_restore -d "$DATABASE_URL" --clean --if-exists ${result.filePath}`);
}

main();
