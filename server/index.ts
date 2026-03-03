import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { APP_NAME, getVersionInfo } from "@shared/version";
import { warmupGmailToken, sendEmail, buildReminderEmail } from "./email";
import { storage } from "./storage";

let ready = false;

const LOADING_HTML =
  "<!DOCTYPE html><html><head><meta charset='utf-8'><title>CaskSense</title>" +
  "<meta http-equiv='refresh' content='2'></head>" +
  "<body style='background:#1a1714;color:#f5f0e8;font-family:system-ui;" +
  "display:flex;align-items:center;justify-content:center;min-height:100vh;" +
  "margin:0'><p>Starting up\u2026</p></body></html>";

const app = express();

const httpServer = createServer((req, res) => {
  if (req.url === "/__health" || req.url === "/__health/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end('{"status":"ok"}');
    return;
  }

  if (!ready) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(LOADING_HTML);
    return;
  }

  app(req, res);
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

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

const port = parseInt(process.env.PORT || "5000", 10);

httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    log(`Port ${port} is already in use, retrying in 1s...`);
    setTimeout(() => {
      httpServer.listen({ port, host: "0.0.0.0" });
    }, 1000);
  } else {
    console.error("Server error:", err);
    process.exit(1);
  }
});

httpServer.listen(
  {
    port,
    host: "0.0.0.0",
  },
  () => {
    const v = getVersionInfo();
    log(`${APP_NAME} v${v.version} (build ${v.gitSha}) [${v.env}]`);
    log(`serving on port ${port}`);
    log(`Build time: ${v.buildTime}`);
  },
);

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

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
  warmupGmailToken();

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
})();
