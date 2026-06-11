---
name: Autoscale health probe vs domain redirect
description: Why a replit.app→custom-domain redirect on GET / breaks Cloud Run autoscale publishing, and the safe fix.
---

# Autoscale startup probe must get 200 on `GET /`

Replit autoscale (Cloud Run) deployments go build → promote → serve. In the **promote**
phase Cloud Run sends a startup probe to `GET /` and requires an HTTP **200**. The probe
hits the service on its internal `*.replit.app` host (e.g. `whisky-rating-hub.replit.app`).

**Failure symptom:** build logs end successfully (image pushed) but the build is marked
`failed`; the run command shows `command finished with error [node dist/index.cjs]: signal: terminated`.
That SIGTERM is the promote-phase probe killing the container because it never got a 200.

**The trap:** a production redirect that canonicalizes `*.replit.app` → the custom domain
(`casksense.com`) returns a **301 on `/`**. A 3xx on the probe path counts as unhealthy, so
publishing fails. Plain `GET /` from the probe (no `Accept: text/html`) was being 301'd.

**Why:** the probe is indistinguishable from a user request unless you key on a header.

**How to apply:** only issue the canonical-domain redirect for real browser navigations —
gate it on `req.headers.accept` containing `text/html`. Health probes send `Accept: */*`
(no html), so they fall through and get a 200; browsers still get the 301. Keep the dedicated
`/__health` 200 route too. Verify locally: `NODE_ENV=production node dist/index.cjs`, then curl
`GET /` with `Host: <name>.replit.app` and `Accept: */*` (expect 200) vs `Accept: text/html`
(expect 301). The build succeeding locally does NOT catch this — it is promote-phase only.
