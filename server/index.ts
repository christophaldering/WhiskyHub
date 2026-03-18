import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { APP_NAME, getVersionInfo } from "@shared/version";
import { warmupGmailToken, sendEmail, buildReminderEmail } from "./email";
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

    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    ready = true;
    log("Application fully initialized");

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

    warmupGmailToken();

    seedProductionData()
      .catch((e) => log(`Auto-seed error: ${(e as Error).message}`, "seed"))
      .then(() => import("./seed-demo").then(m => m.seedDemoTasting()))
      .catch((e) => log(`Demo seed error: ${(e as Error).message}`, "seed"))
      .then(() => import("./seed-labs-pilot").then(m => m.seedLabsPilotData()))
      .catch((e) => log(`Labs pilot seed error: ${(e as Error).message}`, "seed"))
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
  } catch (err) {
    console.error("Failed to initialize application:", err);
    process.exit(1);
  }
})();
