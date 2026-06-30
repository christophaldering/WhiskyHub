---
name: Client IP for rate limiting
description: How to derive the client IP for per-IP limits in this repo (no trust proxy set).
---

# Client IP for rate limiting

For any per-IP limit, derive the IP as:
`(req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown"`
then sha256-hash it. This matches every existing limiter (funnel-routes,
the anonymous voice limits in routes.ts, the public cooper-demo limit).

**Why:** Express `trust proxy` is NOT configured anywhere. So `req.ip` alone is
the immediate socket peer = the Replit/Cloud-Run proxy, identical for every
visitor. Using `req.ip` only would collapse the whole world into ONE bucket and
the limit would lock everyone out at once. The real client IP only lives in
`x-forwarded-for`.

**How to apply:** Keep XFF-first. Do not "fix" this to `req.ip`-only without
also configuring `trust proxy` with the correct hop count — getting the hop
count wrong silently breaks the limit. Known tradeoff: XFF is client-spoofable,
so per-IP caps on cost-bearing public endpoints are best-effort, not airtight;
pair them with short key TTLs / client hard-timers for real spend bounds.
