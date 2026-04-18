import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createHash, randomBytes } from "crypto";
import { storage } from "./storage";
import { recordEvents, getCountersInRange, getDimensionsInRange, extractRequestMeta, type FunnelEvent } from "./funnel-store";
import { recordHeartbeat, getSnapshot, getSessionTimeline } from "./funnel-live";
import { buildSnapshot, analyzePeriod, detectAnomalies } from "./funnel-ai";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 60;
const rateBuckets = new Map<string, { count: number; reset: number }>();

let rateLimitSalt = randomBytes(16).toString("hex");
let rateLimitSaltRotatedAt = Date.now();
const SALT_ROTATE_MS = 60 * 60 * 1000;

function clientKey(req: Request): string {
  if (Date.now() - rateLimitSaltRotatedAt > SALT_ROTATE_MS) {
    rateLimitSalt = randomBytes(16).toString("hex");
    rateLimitSaltRotatedAt = Date.now();
  }
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
  return createHash("sha256").update(rateLimitSalt + ip).digest("hex").slice(0, 16);
}

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = clientKey(req);
  const now = Date.now();
  let b = rateBuckets.get(key);
  if (!b || b.reset < now) { b = { count: 0, reset: now + RATE_LIMIT_WINDOW_MS }; rateBuckets.set(key, b); }
  b.count++;
  if (b.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ message: "rate limit" });
  }
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateBuckets) if (v.reset < now) rateBuckets.delete(k);
}, 5 * 60 * 1000);

async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  const id = req.headers["x-participant-id"] as string | undefined;
  if (!id) { res.status(401).json({ message: "auth required" }); return false; }
  const p = await storage.getParticipant(id);
  if (!p || p.role !== "admin") { res.status(403).json({ message: "admin only" }); return false; }
  return true;
}

function readEvents(req: Request): FunnelEvent[] {
  const body = req.body;
  if (Array.isArray(body)) return body as FunnelEvent[];
  if (Array.isArray(body?.events)) return body.events as FunnelEvent[];
  if (body?.event) return [body as FunnelEvent];
  return [];
}

export function registerFunnelRoutes(app: Express): void {
  app.post("/api/funnel/track", rateLimit, async (req, res) => {
    try {
      const events = readEvents(req);
      const result = await recordEvents(events, req);
      res.json({ ok: true, accepted: result.accepted });
    } catch (e) {
      res.status(500).json({ message: (e as Error).message });
    }
  });

  // Beacon endpoint (sendBeacon often uses text/plain)
  const beaconText = express.text({ type: "*/*", limit: "32kb" });
  app.post("/api/funnel/beacon", beaconText, rateLimit, async (req, res) => {
    try {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      const events: FunnelEvent[] = Array.isArray(body) ? body : (Array.isArray(body?.events) ? body.events : (body?.event ? [body] : []));
      await recordEvents(events, req);
      res.status(204).end();
    } catch {
      res.status(204).end();
    }
  });

  app.post("/api/funnel/live-heartbeat", rateLimit, (req, res) => {
    try {
      const meta = extractRequestMeta(req);
      const body = req.body || {};
      const items: any[] = Array.isArray(body) ? body : (body.events ? body.events : [body]);
      for (const item of items.slice(0, 20)) {
        if (!item || !item.token) continue;
        recordHeartbeat({
          token: String(item.token),
          page: String(item.page || ""),
          type: item.type ? String(item.type) : "heartbeat",
          detail: item.detail ? String(item.detail) : undefined,
          source: item.source ? String(item.source) : "",
          device: meta.deviceType,
          country: meta.country,
          language: meta.language,
        });
      }
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: (e as Error).message });
    }
  });

  // PDF download counter middleware (mounted before static)
  app.use((req, _res, next) => {
    if (req.method === "GET" && /\.pdf($|\?)/i.test(req.path)) {
      recordEvents([{
        event: "pdf_download",
        page: req.path,
        utmSource: String(req.query.utm_source || ""),
        utmMedium: String(req.query.utm_medium || ""),
        utmCampaign: String(req.query.utm_campaign || ""),
      }], req).catch(() => undefined);
    }
    next();
  });

  app.get("/api/admin/funnel/live", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    res.json(getSnapshot());
  });

  app.get("/api/admin/funnel/live/:shortCode", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    res.json(getSessionTimeline(req.params.shortCode));
  });

  app.get("/api/admin/funnel/summary", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    const range = Math.min(Math.max(parseInt(String(req.query.hours || "24"), 10) || 24, 1), 24 * 30);
    const filter = req.query.utmSource ? { utmSource: String(req.query.utmSource) } : undefined;
    const snapshot = await buildSnapshot(range, filter);
    res.json(snapshot);
  });

  app.get("/api/admin/funnel/raw", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    const hours = Math.min(Math.max(parseInt(String(req.query.hours || "24"), 10) || 24, 1), 24 * 30);
    const counters = await getCountersInRange(hours);
    const dims = await getDimensionsInRange(hours);
    res.json({ counters, dims });
  });

  app.post("/api/admin/funnel/ai-analyze", rateLimit, express.json({ limit: "4kb" }), async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    const rangeHours = Math.min(Math.max(parseInt(String(req.body?.hours || "24"), 10) || 24, 1), 24 * 30);
    const filter = req.body?.utmSource ? { utmSource: String(req.body.utmSource) } : undefined;
    const requesterId = req.headers["x-participant-id"] as string | undefined;
    const result = await analyzePeriod(rangeHours, filter, requesterId);
    res.json(result);
  });

  app.get("/api/admin/funnel/anomalies", async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    const anomalies = await detectAnomalies();
    res.json({ anomalies });
  });
}
