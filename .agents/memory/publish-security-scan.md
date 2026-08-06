---
name: Publish security scan
description: How to clear critical/high dependency vulnerabilities that block Replit Publish.
---

# Unblocking the Publish security scan

Replit's supply-chain security scan aborts Publish when `runDependencyAudit()`
reports **critical or high** dependency vulnerabilities. Moderate/low do NOT
block publish.

## How to fix
- Run `runDependencyAudit()` (security_scan skill, via code_execution). Each
  vuln has `severity.level`, `package.{name,version}`, and `fix.{available,version,requiresMajorUpdate}`.
- For **direct deps with a fix**, bump the range in `package.json`.
- For **transitive deps**, add a `package.json` `"overrides"` block pinning the
  patched version. A bare version override forces ALL instances to that version.
- For packages with **no npm fix** (e.g. `xlsx`/SheetJS — Prototype Pollution +
  ReDoS), replace the library. CaskSense already had `exceljs`; xlsx was only
  client-side (export writer + Excel import parser). Removed xlsx and also
  removed it from the build allowlist in `script/build.ts`.

## Non-obvious gotchas
- **Forcing uuid to v11 (major) via overrides is safe here**: every transitive
  consumer (gaxios, teeny-request, googleapis-common, @google-cloud/storage,
  exceljs) imports uuid via named imports (`require("uuid").v4` / `import * as
  uuid`), and uuid v11 still exports those. The deep imports (`uuid/v4`) that
  v7+ removed are not used.
- Overrides only take effect after a fresh install. `npm install --no-audit`
  via bash works fine (the earlier "bash is blocked" note was stale); so does
  `installLanguagePackages`.
- **Re-audit after each override bump**: brace-expansion had two chained CVEs —
  5.0.6→5.0.8 fixed one, but 5.0.8 itself had a bypass (CVE-2026-69152) fixed
  in 5.0.9. Always run `runDependencyAudit()` again until count=0.
- `nodemailer` is a declared direct dep but is not imported anywhere in source
  (only appears in the build allowlist). It was bumped v8→v9 (major) without
  code changes — safe because no code uses it directly.
- `tsc --noEmit` on the full monorepo OOMs even at 6GB heap in this env; rely on
  `npm run build` (vite + esbuild) as the build verification instead.

**Why:** documenting so future security-update tasks don't re-derive the
override approach or re-test whether the uuid major bump breaks Google APIs.
