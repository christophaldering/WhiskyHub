/**
 * Woechentlicher Datenbank-Backup-Scheduler (Phase 2).
 *
 * Muster wie der Daily-Report-Scheduler (server/daily-report.ts): ein Tick claimt
 * pro ISO-Woche (Europe/Berlin) genau einen Slot in der Tabelle `backup_log`
 * (INSERT ... ON CONFLICT DO NOTHING). Gewinnt der Tick den Slot, wird ein
 * pg_dump erzeugt und dauerhaft in den Replit Object Storage hochgeladen
 * (ueberlebt Redeploys). Lokale Temp-Datei wird danach geloescht.
 *
 * Robustheit: Faellt etwas aus (z. B. pg_dump im Server-Prozess nicht verfuegbar),
 * wird der Fehler geloggt und der Slot freigegeben — KEIN Crash, der Server
 * laeuft normal weiter und versucht es beim naechsten Tick erneut.
 */
import { readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { log } from "./index";
import { ObjectStorageService, objectStorageClient } from "./replit_integrations/object_storage";
import { runBackup } from "./db-backup-runner";

const RETAIN_WEEKLY = 8; // ~2 Monate woechentliche Dumps im Object Storage
const TICK_MS = 6 * 60 * 60 * 1000; // alle 6 h

function parseStoragePath(fullPath: string): { bucketName: string; objectName: string } {
  const parts = (fullPath.startsWith("/") ? fullPath.slice(1) : fullPath).split("/");
  if (parts.length < 2) throw new Error(`Invalid storage path: ${fullPath}`);
  return { bucketName: parts[0], objectName: parts.slice(1).join("/") };
}

function backupPrefix(objectStorage: ObjectStorageService): { bucketName: string; prefix: string } {
  const dir = objectStorage.getPrivateObjectDir();
  const trimmed = dir.endsWith("/") ? dir.slice(0, -1) : dir;
  const { bucketName, objectName } = parseStoragePath(`${trimmed}/backups/`);
  return { bucketName, prefix: objectName };
}

// ISO-Wochen-Schluessel in Europe/Berlin, z. B. "2026-W24" (lexikografisch = chronologisch).
function berlinIsoWeekKey(date: Date): string {
  const berlin = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const d = new Date(Date.UTC(berlin.getFullYear(), berlin.getMonth(), berlin.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mo=0 .. So=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // Donnerstag dieser ISO-Woche
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function tryClaimBackupSlot(weekKey: string): Promise<boolean> {
  const res = await db.execute(sql`
    INSERT INTO backup_log (week_key)
    VALUES (${weekKey})
    ON CONFLICT (week_key) DO NOTHING
    RETURNING week_key
  `);
  const rows = ((res as any).rows ?? res) as any[];
  return rows.length > 0;
}

async function releaseBackupSlot(weekKey: string): Promise<void> {
  await db.execute(sql`DELETE FROM backup_log WHERE week_key = ${weekKey}`);
}

async function applyObjectRetention(objectStorage: ObjectStorageService, keep: number): Promise<void> {
  const { bucketName, prefix } = backupPrefix(objectStorage);
  const [files] = await objectStorageClient.bucket(bucketName).getFiles({ prefix });
  const dumps = files
    .filter((f: any) => typeof f.name === "string" && f.name.endsWith(".dump"))
    .sort((a: any, b: any) => (a.name < b.name ? 1 : -1)); // neueste (hoechster Wochen-Key) zuerst
  for (const f of dumps.slice(keep)) {
    await f.delete({ ignoreNotFound: true }).catch(() => undefined);
  }
}

export function startBackupScheduler(): void {
  const tick = async () => {
    const weekKey = berlinIsoWeekKey(new Date());
    let claimed = false;
    try {
      claimed = await tryClaimBackupSlot(weekKey);
      if (!claimed) return;

      const tmpDir = join(tmpdir(), "casksense-backups");
      const fileName = `casksense-${weekKey}.dump`;
      const result = await runBackup(tmpDir, fileName);
      if (!result.ok || !result.filePath) {
        log(`Backup scheduler: pg_dump failed (${result.error}) — slot released`, "db-backup");
        await releaseBackupSlot(weekKey).catch(() => undefined);
        return;
      }

      const objectStorage = new ObjectStorageService();
      const { bucketName, prefix } = backupPrefix(objectStorage);
      const buffer = readFileSync(result.filePath);
      await objectStorageClient
        .bucket(bucketName)
        .file(`${prefix}${fileName}`)
        .save(buffer, { contentType: "application/octet-stream" });
      log(`Weekly backup uploaded to Object Storage: backups/${fileName} (${result.sizeMb} MB)`, "db-backup");

      try { unlinkSync(result.filePath); } catch { /* Temp-Cleanup ist best-effort */ }

      // Retention: Fehler hier ist unkritisch (Backup ist gesichert) -> nur loggen, Slot NICHT freigeben.
      try {
        await applyObjectRetention(objectStorage, RETAIN_WEEKLY);
      } catch (re) {
        log(`Backup retention warning: ${(re as Error).message}`, "db-backup");
      }
    } catch (e) {
      log(`Backup scheduler error: ${(e as Error).message}`, "db-backup");
      if (claimed) await releaseBackupSlot(weekKey).catch(() => undefined);
    }
  };

  setInterval(tick, TICK_MS);
  setTimeout(tick, 60 * 1000);
  log("Weekly DB backup scheduler armed (Object Storage, ISO week, Europe/Berlin)", "db-backup");
}
