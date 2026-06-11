---
name: tsc baseline needs larger Node heap
description: Why `npx tsc --noEmit` reports a misleading "0 errors" and how to get the real count in this repo.
---

Running `npx tsc --noEmit 2>&1 | grep -c "error TS"` in this repo can print `0`
even though there are pre-existing type errors. The `0` is a lie: tsc crashes with
`FATAL ERROR: Ineffective mark-compacts near heap limit — JavaScript heap out of
memory` before emitting any diagnostics, so grep matches nothing.

**Fix:** give Node more heap, e.g.
`NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit 2>&1 | grep -c "error TS"`.
With enough heap the true baseline appears (~500 pre-existing `error TS` lines as of
2026-06-11).

**Why:** the codebase (large i18n.ts, many files) exceeds the default V8 old-space
limit during a full type-check.

**How to apply:** whenever you need a tsc error baseline/diff here, always set the
larger heap first, and treat a bare `0` from tsc as "it OOM'd," not "no errors."
