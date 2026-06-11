/**
 * On-demand database backup.
 *
 * Usage:
 *   npm run db:backup
 *
 * Produces a compressed, restore-capable pg_dump (custom format) into ./backups/
 * named casksense-<YYYY-MM-DD_HHMM>.dump (Europe/Berlin time). Keeps the 10 most
 * recent dumps and deletes older ones. The backups/ folder is git-ignored.
 *
 * Restore:
 *   pg_restore -d "$DATABASE_URL" --clean --if-exists backups/<file>.dump
 */
import { spawn } from "child_process";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "fs";
import { join } from "path";

const RETENTION = 10;
const BACKUP_DIR = "backups";

function berlinTimestamp(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}_${get("hour")}${get("minute")}`;
}

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

function main(): void {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Aborting backup.");
    process.exit(1);
  }

  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const fileName = `casksense-${berlinTimestamp()}.dump`;
  const filePath = join(BACKUP_DIR, fileName);

  console.log(`creating backup: ${filePath}`);

  const child = spawn(
    "pg_dump",
    ["--format=custom", "--no-owner", "--no-privileges", "--file", filePath, databaseUrl],
    { stdio: ["ignore", "inherit", "inherit"] },
  );

  child.on("error", (err) => {
    console.error(`failed to start pg_dump: ${err.message}`);
    process.exit(1);
  });

  child.on("close", (code) => {
    if (code !== 0) {
      console.error(`pg_dump exited with code ${code}`);
      process.exit(code ?? 1);
    }

    const sizeBytes = statSync(filePath).size;
    const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
    console.log(`backup complete: ${fileName} (${sizeMb} MB)`);

    applyRetention();

    console.log(`restore with: pg_restore -d "$DATABASE_URL" --clean --if-exists ${filePath}`);
  });
}

main();
