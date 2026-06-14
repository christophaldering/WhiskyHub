/**
 * Server-sicherer Datenbank-Backup-Runner.
 *
 * Erzeugt einen restore-faehigen pg_dump (custom format) in <targetDir> und gibt
 * das Ergebnis als Objekt zurueck — KEIN process.exit (anders als das CLI-Skript),
 * damit dies gefahrlos aus dem laufenden Server-Prozess aufgerufen werden kann.
 *
 * Retention/Upload sind bewusst NICHT hier, sondern Sache des Aufrufers:
 *  - script/db-backup.ts (CLI): lokaler Ordner + lokale Retention
 *  - server/db-backup-scheduler.ts: Temp-Ordner + Upload in Object Storage
 */
import { spawn } from "child_process";
import { existsSync, mkdirSync, statSync } from "fs";
import { join } from "path";

export function berlinTimestamp(): string {
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

export interface BackupResult {
  ok: boolean;
  fileName?: string;
  filePath?: string;
  sizeMb?: string;
  error?: string;
}

/**
 * Erzeugt einen pg_dump in <targetDir>. Optionaler fester Dateiname (sonst
 * casksense-<Berlin-Timestamp>.dump). Loest IMMER auf (wirft nicht) und gibt
 * bei Fehlern { ok: false, error } zurueck.
 */
export async function runBackup(targetDir: string, fileName?: string): Promise<BackupResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, error: "DATABASE_URL is not set" };

  try {
    if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
  } catch (e) {
    return { ok: false, error: `cannot create target dir: ${(e as Error).message}` };
  }

  const name = fileName ?? `casksense-${berlinTimestamp()}.dump`;
  const filePath = join(targetDir, name);

  return await new Promise<BackupResult>((resolve) => {
    let settled = false;
    const done = (r: BackupResult) => { if (!settled) { settled = true; resolve(r); } };

    const child = spawn(
      "pg_dump",
      ["--format=custom", "--no-owner", "--no-privileges", "--file", filePath, databaseUrl],
      { stdio: ["ignore", "inherit", "inherit"] },
    );

    child.on("error", (err) => {
      done({ ok: false, error: `failed to start pg_dump: ${err.message}` });
    });

    child.on("close", (code) => {
      if (code !== 0) {
        done({ ok: false, error: `pg_dump exited with code ${code}` });
        return;
      }
      try {
        const sizeBytes = statSync(filePath).size;
        const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
        done({ ok: true, fileName: name, filePath, sizeMb });
      } catch (e) {
        done({ ok: false, error: `stat failed: ${(e as Error).message}` });
      }
    });
  });
}
