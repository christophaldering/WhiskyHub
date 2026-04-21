import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { APP_NAME, getVersionInfo } from "@shared/version";
import { warmupGmailToken, sendEmail, buildReminderEmail } from "./email";
import { startDailyReportScheduler } from "./daily-report";
import { storage } from "./storage";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

let ready = false;
const port = parseInt(process.env.PORT || "5000", 10);

async function seedProductionData() {
  if (process.env.NODE_ENV !== "production") {
    log("Auto-seed: skipping (not production)", "seed");
    return;
  }

  try {
    const { db: dbInst } = await import("./db");
    const { historicalTastings, communities, communityMemberships, participants } = await import("@shared/schema");
    const { sql: sqlTag, eq, and, count } = await import("drizzle-orm");

    const [{ cnt }] = await dbInst.select({ cnt: count() }).from(communities);
    const hasCommunity = Number(cnt) > 0;

    const [{ htCnt }] = await dbInst.select({ htCnt: count() }).from(historicalTastings);
    const hasHistorical = Number(htCnt) > 0;

    if (hasCommunity && hasHistorical) {
      log("Auto-seed: data already present, skipping", "seed");
      return;
    }

    const [admin] = await dbInst
      .select()
      .from(participants)
      .where(eq(participants.role, "admin"))
      .limit(1);

    if (!admin) {
      log("Auto-seed: no admin participant found, skipping", "seed");
      return;
    }

    let communityId: string;
    if (!hasCommunity) {
      const [community] = await dbInst
        .insert(communities)
        .values({
          slug: "aldering-tasting-circle",
          name: "Aldering Tasting Circle",
          description: "The original tasting circle — 32+ blind tastings since the beginning.",
          archiveVisibility: "community_only",
          publicAggregatedEnabled: true,
        })
        .returning();
      communityId = community.id;
      log(`Auto-seed: created community "${community.name}" (${communityId})`, "seed");

      await dbInst.insert(communityMemberships).values({
        communityId,
        participantId: admin.id,
        role: "admin",
        status: "active",
      });
      log(`Auto-seed: added admin ${admin.name} (${admin.id}) as community member`, "seed");
    } else {
      const [existing] = await dbInst.select().from(communities).limit(1);
      communityId = existing.id;

      const [{ memCnt }] = await dbInst
        .select({ memCnt: count() })
        .from(communityMemberships)
        .where(and(
          eq(communityMemberships.participantId, admin.id),
          eq(communityMemberships.communityId, communityId),
        ));

      if (Number(memCnt) === 0) {
        await dbInst.insert(communityMemberships).values({
          communityId,
          participantId: admin.id,
          role: "admin",
          status: "active",
        });
        log(`Auto-seed: added admin ${admin.name} as community member`, "seed");
      }
    }

    if (!hasHistorical) {
      log("Auto-seed: importing historical tastings from Excel...", "seed");
      const { importHistoricalTastings } = await import("./historical-import");
      const result = await importHistoricalTastings({ dryRun: false });

      if (result.errors.length > 0) {
        log(`Auto-seed: import had ${result.errors.length} error(s): ${result.errors.slice(0, 3).join("; ")}`, "seed");
        return;
      }

      log(`Auto-seed: imported ${result.tastingsCreated} tastings, ${result.entriesCreated} entries`, "seed");

      await dbInst.execute(
        sqlTag`UPDATE historical_tastings SET community_id = ${communityId}, visibility_level = 'community_only' WHERE community_id IS NULL`
      );
      log("Auto-seed: linked historical tastings to community", "seed");
    }

    log("Auto-seed: complete", "seed");
  } catch (e) {
    log(`Auto-seed failed: ${(e as Error).message}`, "seed");
  }
}

async function backfillNormalizedScores() {
  try {
    const { db: dbInst } = await import("./db");
    const { sql: sqlTag } = await import("drizzle-orm");

    await dbInst.execute(
      sqlTag`UPDATE historical_tasting_entries SET normalized_nose = nose_score * 10 WHERE normalized_nose IS NULL AND nose_score IS NOT NULL`
    );
    await dbInst.execute(
      sqlTag`UPDATE historical_tasting_entries SET normalized_taste = taste_score * 10 WHERE normalized_taste IS NULL AND taste_score IS NOT NULL`
    );
    await dbInst.execute(
      sqlTag`UPDATE historical_tasting_entries SET normalized_finish = finish_score * 10 WHERE normalized_finish IS NULL AND finish_score IS NOT NULL`
    );
    const htResult = await dbInst.execute(
      sqlTag`UPDATE historical_tasting_entries SET normalized_total = total_score * 10 WHERE normalized_total IS NULL AND total_score IS NOT NULL`
    );
    const htCount = (htResult as any)?.rowCount ?? 0;

    const rResult = await dbInst.execute(
      sqlTag`UPDATE ratings r
             SET normalized_score = CASE
               WHEN t.rating_scale = 100 THEN LEAST(GREATEST(r.overall, 0), 100)
               ELSE ROUND((LEAST(GREATEST(r.overall, 0), t.rating_scale) / t.rating_scale * 100)::numeric, 1)
             END
             FROM tastings t
             WHERE r.tasting_id = t.id
               AND r.normalized_score IS NULL
               AND r.overall IS NOT NULL`
    );
    const rCount = (rResult as any)?.rowCount ?? 0;

    const rDimResult = await dbInst.execute(
      sqlTag`UPDATE ratings r
             SET
               normalized_nose = CASE
                 WHEN r.nose IS NULL THEN r.normalized_nose
                 WHEN t.rating_scale = 100 THEN LEAST(GREATEST(r.nose, 0), 100)
                 ELSE ROUND((LEAST(GREATEST(r.nose, 0), t.rating_scale) / t.rating_scale * 100)::numeric, 1)
               END,
               normalized_taste = CASE
                 WHEN r.taste IS NULL THEN r.normalized_taste
                 WHEN t.rating_scale = 100 THEN LEAST(GREATEST(r.taste, 0), 100)
                 ELSE ROUND((LEAST(GREATEST(r.taste, 0), t.rating_scale) / t.rating_scale * 100)::numeric, 1)
               END,
               normalized_finish = CASE
                 WHEN r.finish IS NULL THEN r.normalized_finish
                 WHEN t.rating_scale = 100 THEN LEAST(GREATEST(r.finish, 0), 100)
                 ELSE ROUND((LEAST(GREATEST(r.finish, 0), t.rating_scale) / t.rating_scale * 100)::numeric, 1)
               END
             FROM tastings t
             WHERE r.tasting_id = t.id
               AND (
                 (r.normalized_nose IS NULL AND r.nose IS NOT NULL)
                 OR (r.normalized_taste IS NULL AND r.taste IS NOT NULL)
                 OR (r.normalized_finish IS NULL AND r.finish IS NOT NULL)
               )`
    );
    const rDimCount = (rDimResult as any)?.rowCount ?? 0;

    if (htCount > 0 || rCount > 0 || rDimCount > 0) {
      log(`Backfill: normalized ${htCount} historical entries, ${rCount} rating overalls, ${rDimCount} rating dimensions to 0-100 scale`, "seed");
    }
  } catch (e) {
    log(`Backfill normalized scores failed: ${(e as Error).message}`, "seed");
  }
}

async function seedDistilleries() {
  try {
    const count = await storage.getDistilleryCount();
    if (count > 0) {
      log(`Distillery seed: ${count} distilleries already present, skipping`, "seed");
      return;
    }

    const { distilleries: staticData } = await import("../client/src/data/distilleries");
    const seedData = staticData.map((d: { name: string; region: string; country: string; founded: number; description: string; feature: string; status?: string; lat: number; lng: number }) => ({
      name: d.name,
      region: d.region,
      country: d.country,
      founded: d.founded ?? null,
      description: d.description ?? null,
      feature: d.feature ?? null,
      status: d.status ?? "active",
      lat: d.lat ?? null,
      lng: d.lng ?? null,
    }));

    await storage.createDistilleries(seedData);
    log(`Distillery seed: inserted ${seedData.length} distilleries`, "seed");
  } catch (e) {
    log(`Distillery seed failed: ${(e as Error).message}`, "seed");
  }
}

async function seedBottlers() {
  try {
    const count = await storage.getBottlerCount();
    if (count > 0) {
      log(`Bottler seed: ${count} bottlers already present, skipping`, "seed");
      await backfillBottlerCoordinates();
      return;
    }

    const { bottlers: staticData } = await import("../client/src/data/bottlers");
    const seedData = staticData.map((b: { name: string; country: string; region: string; founded: number; description: string; specialty: string; website?: string; notableReleases?: string[]; lat?: number; lng?: number }) => ({
      name: b.name,
      country: b.country,
      region: b.region,
      founded: b.founded ?? null,
      description: b.description ?? null,
      specialty: b.specialty ?? null,
      website: b.website ?? null,
      notableReleases: b.notableReleases ?? null,
      status: "active",
      lat: b.lat ?? null,
      lng: b.lng ?? null,
    }));

    await storage.createBottlers(seedData);
    log(`Bottler seed: inserted ${seedData.length} bottlers`, "seed");
  } catch (e) {
    log(`Bottler seed failed: ${(e as Error).message}`, "seed");
  }
}

async function backfillBottlerCoordinates() {
  try {
    const { bottlers: staticData } = await import("../client/src/data/bottlers");
    const allBottlers = await storage.getAllBottlers();
    const coordMap = new Map(
      staticData
        .filter((b: { lat?: number; lng?: number }) => b.lat != null && b.lng != null)
        .map((b: { name: string; lat?: number; lng?: number }) => [b.name, { lat: b.lat!, lng: b.lng! }])
    );

    let updated = 0;
    for (const b of allBottlers) {
      if (b.lat == null || b.lng == null) {
        const coords = coordMap.get(b.name);
        if (coords) {
          await storage.updateBottler(b.id, { lat: coords.lat, lng: coords.lng });
          updated++;
        }
      }
    }

    if (updated > 0) {
      log(`Bottler backfill: updated ${updated} bottlers with coordinates`, "seed");
    }
  } catch (e) {
    log(`Bottler coordinate backfill failed: ${(e as Error).message}`, "seed");
  }
}

const LOADING_HTML =
  "<!DOCTYPE html><html><head><meta charset='utf-8'><title>CaskSense</title>" +
  "<meta http-equiv='refresh' content='2'></head>" +
  "<body style='background:#1a1714;color:#f5f0e8;font-family:system-ui;" +
  "display:flex;align-items:center;justify-content:center;min-height:100vh;" +
  "margin:0'><p>Starting up\u2026</p></body></html>";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

const app = express();

function isAllowedCapacitorOrigin(origin: string): boolean {
  if (origin === "capacitor://localhost" || origin === "ionic://localhost") return true;
  try {
    const parsed = new URL(origin);
    if (parsed.hostname === "localhost" && (parsed.protocol === "http:" || parsed.protocol === "https:")) return true;
  } catch {}
  return false;
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedCapacitorOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-participant-id");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "86400");
    res.setHeader("Vary", "Origin");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
  }
  next();
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = req.url || "/";

  if (url === "/__health" || url === "/__health/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end('{"status":"ok"}');
    return;
  }

  if (!ready) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(LOADING_HTML);
    return;
  }

  const host = req.headers.host || "";
  if (process.env.NODE_ENV === "production" && host.includes("replit.app")) {
    const target = "https://casksense.com" + url;
    res.writeHead(301, { Location: target, "Cache-Control": "public, max-age=86400" });
    res.end();
    return;
  }

  app(req, res);
}

const httpServer = createServer(handleRequest);

httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    log(`Port ${port} in use, retrying in 1s...`);
    setTimeout(() => httpServer.listen({ port, host: "0.0.0.0" }), 1000);
  } else {
    console.error("Server error:", err);
    process.exit(1);
  }
});

httpServer.listen({ port, host: "0.0.0.0" }, () => {
  const v = getVersionInfo();
  log(`${APP_NAME} v${v.version} (build ${v.gitSha}) [${v.env}]`);
  log(`listening on port ${port}`);
  log(`Build time: ${v.buildTime}`);
});

(async () => {
  try {
    await registerRoutes(httpServer, app);

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Internal Server Error:", err);
      if (res.headersSent) return next(err);
      return res.status(status).json({ message });
    });

    {
      const path = await import("path");
      const fs = await import("fs");
      const here =
        typeof __dirname !== "undefined"
          ? __dirname
          : (import.meta as { dirname?: string }).dirname ?? process.cwd();
      const storyDevPath = path.resolve(here, "..", "client", "public", "story", "index.html");
      const storyProdPath = path.resolve(here, "public", "story", "index.html");
      const sendStory = (_req: Request, res: Response) => {
        const candidate = fs.existsSync(storyProdPath) ? storyProdPath : storyDevPath;
        try {
          let html = fs.readFileSync(candidate, "utf-8");
          if (!/<base\s/i.test(html)) {
            html = html.replace(
              /<head([^>]*)>/i,
              `<head$1><base href="/story/">`,
            );
          }
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.send(html);
        } catch (e) {
          res.status(500).send("Story unavailable");
        }
      };
      app.get("/story", sendStory);
      app.get("/story/", sendStory);
    }

    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    try {
      const { db: dbMig } = await import("./db");
      const { sql: sqlMig } = await import("drizzle-orm");
      const colCheck = await dbMig.execute(sqlMig`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'whiskies' AND column_name IN ('cask_influence', 'cask_type')
      `);
      const columns = (colCheck as any).rows?.map((r: any) => r.column_name) ?? [];
      if (columns.includes("cask_influence") && !columns.includes("cask_type")) {
        await dbMig.execute(sqlMig`ALTER TABLE whiskies RENAME COLUMN cask_influence TO cask_type`);
        log("Renamed whiskies.cask_influence → cask_type", "startup");
      } else if (!columns.includes("cask_type")) {
        throw new Error("whiskies table missing both cask_influence and cask_type columns");
      }
    } catch (e: any) {
      log(`CRITICAL: cask_type migration failed: ${e.message} — app may not serve explore data correctly`, "startup");
    }

    try {
      const { db: dbSync } = await import("./db");
      const { sql: sqlSync } = await import("drizzle-orm");

      const textToReal: Array<{ table: string; column: string }> = [
        { table: "journal_entries", column: "abv" },
        { table: "journal_entries", column: "price" },
        { table: "benchmark_entries", column: "abv" },
        { table: "whiskybase_collection", column: "abv" },
        { table: "wishlist_entries", column: "abv" },
      ];
      for (const { table, column } of textToReal) {
        const check = await dbSync.execute(sqlSync`
          SELECT data_type FROM information_schema.columns
          WHERE table_name = ${table} AND column_name = ${column}
        `);
        const dtype = (check as any).rows?.[0]?.data_type;
        if (dtype === "text") {
          await dbSync.execute(sqlSync.raw(
            `UPDATE ${table} SET ${column} = REPLACE(${column}, '%', '') WHERE ${column} LIKE '%\\%%'`
          ));
          await dbSync.execute(sqlSync.raw(
            `UPDATE ${table} SET ${column} = NULL WHERE ${column} IS NOT NULL AND ${column} !~ '^-?[0-9]+([.,][0-9]+)?$'`
          ));
          await dbSync.execute(sqlSync.raw(
            `ALTER TABLE ${table} ALTER COLUMN ${column} TYPE real USING NULLIF(REPLACE(${column}, ',', '.'), '')::real`
          ));
          log(`Fixed ${table}.${column}: text → real`, "startup");
        }
      }

      await dbSync.execute(sqlSync`ALTER TABLE whiskies ADD COLUMN IF NOT EXISTS country text`);
      await dbSync.execute(sqlSync`ALTER TABLE whiskybase_collection ADD COLUMN IF NOT EXISTS country text`);
      await dbSync.execute(sqlSync`ALTER TABLE whiskybase_collection ADD COLUMN IF NOT EXISTS region text`);
      await dbSync.execute(sqlSync`ALTER TABLE whiskybase_collection ADD COLUMN IF NOT EXISTS distilled_year integer`);
      await dbSync.execute(sqlSync`ALTER TABLE wishlist_entries ADD COLUMN IF NOT EXISTS country text`);
      const verify = await dbSync.execute(sqlSync`
        SELECT table_name, column_name FROM information_schema.columns
        WHERE (table_name = 'whiskies' AND column_name = 'country')
           OR (table_name = 'whiskybase_collection' AND column_name IN ('country', 'region', 'distilled_year'))
           OR (table_name = 'wishlist_entries' AND column_name = 'country')
        ORDER BY table_name, column_name
      `);
      const cols = (verify as any).rows?.map((r: any) => `${r.table_name}.${r.column_name}`) ?? [];
      log(`Schema sync verified columns: ${cols.join(", ")}`, "startup");
    } catch (e: any) {
      log(`CRITICAL: schema column sync failed: ${e.message}`, "startup");
    }

    try {
      const { db: dbJournal } = await import("./db");
      const { sql: sqlJ } = await import("drizzle-orm");

      await dbJournal.execute(sqlJ`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS nose_score real`);
      await dbJournal.execute(sqlJ`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS taste_score real`);
      await dbJournal.execute(sqlJ`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS finish_score real`);
      await dbJournal.execute(sqlJ`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS name text`);
      await dbJournal.execute(sqlJ`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS country text`);
      await dbJournal.execute(sqlJ`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS category text`);
      await dbJournal.execute(sqlJ`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS bottler text`);
      await dbJournal.execute(sqlJ`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS whiskybase_id text`);
      await dbJournal.execute(sqlJ`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS wb_score real`);
      await dbJournal.execute(sqlJ`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS mood text`);
      await dbJournal.execute(sqlJ`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS occasion text`);
      await dbJournal.execute(sqlJ`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS source text DEFAULT 'casksense'`);
      await dbJournal.execute(sqlJ`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS voice_memo_url text`);
      await dbJournal.execute(sqlJ`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS voice_memo_transcript text`);
      await dbJournal.execute(sqlJ`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS voice_memo_duration integer`);
      await dbJournal.execute(sqlJ`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'final'`);
      await dbJournal.execute(sqlJ`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS deleted_at timestamp`);
      log("Ensured journal_entries has all schema columns", "startup");

      await dbJournal.execute(sqlJ`
        CREATE TABLE IF NOT EXISTS funnel_counters (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          bucket_hour timestamp NOT NULL,
          event_name text NOT NULL,
          page_path text NOT NULL DEFAULT '',
          utm_source text NOT NULL DEFAULT '',
          utm_medium text NOT NULL DEFAULT '',
          utm_campaign text NOT NULL DEFAULT '',
          country text NOT NULL DEFAULT '',
          language text NOT NULL DEFAULT '',
          device_type text NOT NULL DEFAULT '',
          count integer NOT NULL DEFAULT 0
        )
      `);
      await dbJournal.execute(sqlJ`CREATE INDEX IF NOT EXISTS idx_funnel_counters_bucket ON funnel_counters (bucket_hour)`);
      await dbJournal.execute(sqlJ`CREATE INDEX IF NOT EXISTS idx_funnel_counters_event ON funnel_counters (event_name)`);
      await dbJournal.execute(sqlJ`CREATE UNIQUE INDEX IF NOT EXISTS uq_funnel_counters_dim ON funnel_counters (bucket_hour, event_name, page_path, utm_source, utm_medium, utm_campaign, country, language, device_type)`);
      await dbJournal.execute(sqlJ`
        CREATE TABLE IF NOT EXISTS funnel_dimension_buckets (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          bucket_hour timestamp NOT NULL,
          page_path text NOT NULL DEFAULT '',
          dimension text NOT NULL,
          bucket_label text NOT NULL,
          count integer NOT NULL DEFAULT 0
        )
      `);
      await dbJournal.execute(sqlJ`CREATE INDEX IF NOT EXISTS idx_funnel_dim_bucket ON funnel_dimension_buckets (bucket_hour)`);
      await dbJournal.execute(sqlJ`CREATE UNIQUE INDEX IF NOT EXISTS uq_funnel_dim_key ON funnel_dimension_buckets (bucket_hour, page_path, dimension, bucket_label)`);
      log("Ensured funnel_counters and funnel_dimension_buckets exist", "startup");

      await dbJournal.execute(sqlJ`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_cask_type text`);
      await dbJournal.execute(sqlJ`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS openai_api_key text`);
      await dbJournal.execute(sqlJ`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS friend_notifications_enabled boolean DEFAULT true`);
      await dbJournal.execute(sqlJ`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS online_toast_level text DEFAULT 'all'`);
      await dbJournal.execute(sqlJ`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cheers_enabled boolean DEFAULT true`);
      await dbJournal.execute(sqlJ`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tasting_invite_enabled boolean DEFAULT true`);
      log("Ensured profiles has all schema columns", "startup");

      // One-time migration: copy legacy 1:1 handout columns into the new
      // n:m whisky_handouts / tasting_handouts tables, only when no row yet
      // exists for the source. Idempotent — safe to run on every boot.
      try {
        const whiskyMig = await dbJournal.execute(sqlJ`
          INSERT INTO whisky_handouts (whisky_id, position, visibility, file_url, content_type, title, author, description)
          SELECT w.id, 0,
                 COALESCE(w.handout_visibility, 'always'),
                 w.handout_url,
                 COALESCE(w.handout_content_type, 'application/octet-stream'),
                 w.handout_title, w.handout_author, w.handout_description
          FROM whiskies w
          WHERE w.handout_url IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM whisky_handouts wh WHERE wh.whisky_id = w.id)
        `);
        const tastingMig = await dbJournal.execute(sqlJ`
          INSERT INTO tasting_handouts (tasting_id, position, visibility, file_url, content_type, title, author, description)
          SELECT t.id, 0,
                 COALESCE(t.handout_visibility, 'always'),
                 t.handout_url,
                 COALESCE(t.handout_content_type, 'application/octet-stream'),
                 t.handout_title, t.handout_author, t.handout_description
          FROM tastings t
          WHERE t.handout_url IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM tasting_handouts th WHERE th.tasting_id = t.id)
        `);
        const wRows = (whiskyMig as any).rowCount ?? 0;
        const tRows = (tastingMig as any).rowCount ?? 0;
        if (wRows > 0 || tRows > 0) {
          log(`Migrated legacy handouts: ${wRows} whisky, ${tRows} tasting`, "startup");
        }
      } catch (migErr: any) {
        log(`Handout legacy migration skipped: ${migErr.message}`, "startup");
      }

      // One-time data correction: clamp historical normalized rating scores
      // into [0, 100]. Idempotent — values already in range are untouched.
      try {
        const clampRes = await dbJournal.execute(sqlJ`
          UPDATE ratings SET
            normalized_score  = CASE WHEN normalized_score  > 100 THEN 100 WHEN normalized_score  < 0 THEN 0 ELSE normalized_score  END,
            normalized_nose   = CASE WHEN normalized_nose   > 100 THEN 100 WHEN normalized_nose   < 0 THEN 0 ELSE normalized_nose   END,
            normalized_taste  = CASE WHEN normalized_taste  > 100 THEN 100 WHEN normalized_taste  < 0 THEN 0 ELSE normalized_taste  END,
            normalized_finish = CASE WHEN normalized_finish > 100 THEN 100 WHEN normalized_finish < 0 THEN 0 ELSE normalized_finish END
          WHERE normalized_score  > 100 OR normalized_score  < 0
             OR normalized_nose   > 100 OR normalized_nose   < 0
             OR normalized_taste  > 100 OR normalized_taste  < 0
             OR normalized_finish > 100 OR normalized_finish < 0
        `);
        const clampedRows = (clampRes as any).rowCount ?? 0;
        if (clampedRows > 0) {
          log(`Clamped ${clampedRows} ratings rows with out-of-range normalized scores`, "startup");
        }
      } catch (clampErr: any) {
        log(`Normalized-score clamp migration skipped: ${clampErr.message}`, "startup");
      }

      const rows = await dbJournal.execute(sqlJ`
        SELECT id, nose_notes FROM journal_entries
        WHERE nose_notes LIKE '%[SCORES]%'
          AND (nose_score IS NULL OR taste_score IS NULL OR finish_score IS NULL)
      `);
      const entries = (rows as any).rows || [];
      let migrated = 0;
      for (const row of entries) {
        const match = (row.nose_notes as string).match(/\[SCORES\]\s*Nose:\s*([0-9]+(?:\.[0-9]+)?)\s*Taste:\s*([0-9]+(?:\.[0-9]+)?)\s*Finish:\s*([0-9]+(?:\.[0-9]+)?)\s*\[\/SCORES\]/i);
        if (match) {
          const noseScore = parseFloat(match[1]);
          const tasteScore = parseFloat(match[2]);
          const finishScore = parseFloat(match[3]);
          await dbJournal.execute(sqlJ`
            UPDATE journal_entries
            SET nose_score = ${noseScore}, taste_score = ${tasteScore}, finish_score = ${finishScore}
            WHERE id = ${row.id}
          `);
          migrated++;
        }
      }
      if (migrated > 0) {
        log(`Migrated ${migrated} journal entries with [SCORES] data to new columns`, "startup");
      }
    } catch (e: any) {
      log(`Journal score columns migration: ${e.message}`, "startup");
    }

    ready = true;
    log("Application fully initialized");

    (async () => {
      try {
        const { db } = await import("./db");
        const { sql: rawSql } = await import("drizzle-orm");
        const criticalTables = ["participants", "journal_entries", "ratings", "tastings", "historical_tastings", "wishlist_entries", "profiles"];
        const currentCounts: Record<string, number> = {};
        for (const table of criticalTables) {
          try {
            const result = await db.execute(rawSql.raw(`SELECT count(*)::int as cnt FROM ${table}`));
            currentCounts[table] = (result as any).rows?.[0]?.cnt ?? (result as any)[0]?.cnt ?? -1;
          } catch { currentCounts[table] = -1; }
        }
        try {
          const snapshotResult = await db.execute(rawSql.raw(`SELECT table_counts FROM _data_guard_snapshots ORDER BY id DESC LIMIT 1`));
          const row = (snapshotResult as any).rows?.[0] ?? (snapshotResult as any)[0];
          if (row) {
            const prev = typeof row.table_counts === "string" ? JSON.parse(row.table_counts) : row.table_counts;
            const warnings: string[] = [];
            for (const table of criticalTables) {
              const prevCount = prev[table] ?? -1;
              const curCount = currentCounts[table] ?? -1;
              if (prevCount > 0 && curCount === 0) {
                warnings.push(`${table}: ${prevCount} → 0 (ALL DATA LOST!)`);
              } else if (prevCount > 10 && curCount >= 0 && curCount < prevCount * 0.5) {
                warnings.push(`${table}: ${prevCount} → ${curCount} (>50% drop!)`);
              }
            }
            if (warnings.length > 0) {
              log(`DATA GUARD WARNING — unexpected row count drops:\n  ${warnings.join("\n  ")}`, "startup");
              log("This may indicate data loss from a migration. Check _data_guard_snapshots for history.", "startup");
            } else {
              log("Data guard: all table counts stable", "startup");
            }
          }
        } catch (e: any) {
          log(`Data guard snapshot check skipped: ${e.message}`, "startup");
        }
      } catch (e: any) {
        log(`Data guard startup check failed: ${e.message}`, "startup");
      }
    })();

    (async () => {
      try {
        const { db } = await import("./db");
        const { participants } = await import("@shared/schema");
        const { sql, eq, and, lt } = await import("drizzle-orm");
        const cutoff = new Date("2026-03-19T00:00:00Z");
        await db.update(participants)
          .set({ emailVerified: true })
          .where(and(eq(participants.emailVerified, false), lt(participants.createdAt, cutoff)));
        log("Auto-verified all pre-existing accounts", "startup");
      } catch (e: any) {
        log(`Auto-verify migration skipped: ${e.message}`, "startup");
      }
    })();

    (async () => {
      if (process.env.NODE_ENV !== "production") return;
      try {
        const marker = await storage.getAppSetting("whisky_friends_purged_2026_03_22");
        if (marker) return;
        const { db } = await import("./db");
        const { whiskyFriends } = await import("@shared/schema");
        const { count } = await import("drizzle-orm");
        const [{ cnt }] = await db.select({ cnt: count() }).from(whiskyFriends);
        if (Number(cnt) > 0) {
          await db.delete(whiskyFriends);
          log(`Purged ${Number(cnt)} whisky_friends entries (one-time cleanup)`, "startup");
        }
        await storage.setAppSetting("whisky_friends_purged_2026_03_22", "true");
      } catch (e: any) {
        log(`whisky_friends cleanup skipped: ${e.message}`, "startup");
      }
    })();

    (async () => {
      try {
        const marker = await storage.getAppSetting("solo_dram_reassign_30badcb0");
        if (!marker) {
          const { db } = await import("./db");
          const { journalEntries } = await import("@shared/schema");
          const { eq } = await import("drizzle-orm");
          await db.update(journalEntries)
            .set({ participantId: "38f152c2-a4b7-49a1-bbf8-b0093cd3cd44" })
            .where(eq(journalEntries.id, "30badcb0-5cd0-4a86-bafa-27056b8072e2"));
          await storage.setAppSetting("solo_dram_reassign_30badcb0", "true");
          log("Reassigned orphaned solo dram 30badcb0 to correct user participant", "startup");
        }
      } catch (e: any) {
        log(`Solo dram reassignment skipped: ${e.message}`, "startup");
      }
    })();

    (async () => {
      try {
        const purged = await storage.purgeExpiredJournalEntries(30);
        if (purged > 0) log(`Purged ${purged} expired soft-deleted journal entries (>30 days)`, "startup");
      } catch (e: any) {
        log(`Journal purge error: ${e.message}`, "startup");
      }
    })();

    setInterval(async () => {
      try {
        const purged = await storage.purgeExpiredJournalEntries(30);
        if (purged > 0) log(`Purged ${purged} expired soft-deleted journal entries`, "scheduler");
      } catch (e: any) {
        log(`Journal purge error: ${e.message}`, "scheduler");
      }
    }, 6 * 60 * 60 * 1000);

    warmupGmailToken();

    seedProductionData()
      .catch((e) => log(`Auto-seed error: ${(e as Error).message}`, "seed"))
      .then(() => import("./seed-demo").then(m => m.seedDemoTasting()))
      .catch((e) => log(`Demo seed error: ${(e as Error).message}`, "seed"))
      .then(() => import("./seed-labs-pilot").then(m => m.seedLabsPilotData()))
      .catch((e) => log(`Labs pilot seed error: ${(e as Error).message}`, "seed"))
      .then(() => seedDistilleries())
      .catch((e) => log(`Distillery seed error: ${(e as Error).message}`, "seed"))
      .then(() => seedBottlers())
      .catch((e) => log(`Bottler seed error: ${(e as Error).message}`, "seed"))
      .finally(() =>
        backfillNormalizedScores().catch((e) =>
          log(`Backfill error: ${(e as Error).message}`, "seed"),
        ),
      );

    setInterval(async () => {
      try {
        const pending = await storage.getUpcomingRemindersToSend();
        for (const { reminder, tasting, participant } of pending) {
          const { subject, html } = buildReminderEmail({
            name: participant.name,
            tastingTitle: tasting.title,
            tastingDate: tasting.date,
            tastingLocation: tasting.location,
            offsetMinutes: reminder.offsetMinutes,
            language: participant.language || "en",
          });
          const sent = await sendEmail({ to: participant.email!, subject, html });
          if (sent) {
            await storage.logReminderSent(participant.id, tasting.id, reminder.offsetMinutes);
            log(`Reminder sent to ${participant.name} for "${tasting.title}" (${reminder.offsetMinutes}min)`, "scheduler");
          }
        }
        if (pending.length > 0) {
          log(`Processed ${pending.length} reminder(s)`, "scheduler");
        }
      } catch (e) {
        log(`Reminder scheduler error: ${(e as Error).message}`, "scheduler");
      }
    }, 5 * 60 * 1000);

    startDailyReportScheduler();
  } catch (err) {
    console.error("Failed to initialize application:", err);
    process.exit(1);
  }
})();
