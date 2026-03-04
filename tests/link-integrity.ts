import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const RESULTS_DIR = "test-results";
const RESULTS_FILE = path.join(RESULTS_DIR, "link-integrity.json");

const CRITICAL_ROUTES = [
  "/",
  "/tasting",
  "/enter",
  "/host",
  "/my-taste",
  "/analyze",
  "/log-simple",
  "/host-dashboard",
  "/sessions",
  "/admin",
  "/support",
  "/vocabulary",
  "/ai-curation",
  "/guide",
  "/method",
  "/discover/lexicon",
  "/discover/distilleries",
  "/discover/bottlers",
  "/discover/community",
  "/discover/templates",
  "/discover/about",
  "/discover/donate",
  "/discover/activity",
  "/discover/guide",
  "/my-taste/journal",
  "/my-taste/collection",
  "/my-taste/wishlist",
  "/my-taste/profile",
  "/my-taste/wheel",
  "/my-taste/analytics",
  "/my-taste/compare",
  "/my-taste/benchmark",
  "/my-taste/recommendations",
  "/my-taste/pairings",
  "/my-taste/settings",
  "/data-export",
  "/impressum",
  "/privacy",
  "/landing",
  "/tour",
  "/feature-tour",
  "/intro",
  "/background",
];

const LEGACY_PREFIXES = ["/legacy", "/app/"];

interface RouteResult {
  route: string;
  status: number | "ERROR";
  ok: boolean;
  notes: string;
}

interface LinkHygieneResult {
  file: string;
  line: number;
  href: string;
  issue: string;
}

async function testRoute(route: string): Promise<RouteResult> {
  try {
    const url = `${BASE_URL}${route}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    const status = res.status;
    const ok = status === 200;
    const notes = ok ? "" : `HTTP ${status}`;
    return { route, status, ok, notes };
  } catch (err: any) {
    return {
      route,
      status: "ERROR",
      ok: false,
      notes: err.message?.slice(0, 80) || "Unknown error",
    };
  }
}

function scanSourceForLinks(): LinkHygieneResult[] {
  const issues: LinkHygieneResult[] = [];
  const srcDir = path.join(process.cwd(), "client/src");

  const EXCLUDE_FILES = [
    "App.tsx",
    "nav-redirects.tsx",
    "simple-legacy-shell.tsx",
    "view-switcher.tsx",
    "i18n.ts",
  ];
  const EXCLUDE_DIRS = ["v2/", "lab-dark/"];

  function walk(dir: string): string[] {
    const files: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walk(full));
      } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        files.push(full);
      }
    }
    return files;
  }

  const files = walk(srcDir);

  for (const file of files) {
    const relPath = path.relative(process.cwd(), file);
    const basename = path.basename(file);

    if (EXCLUDE_FILES.includes(basename)) continue;
    if (EXCLUDE_DIRS.some((d) => relPath.includes(d))) continue;

    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const hrefMatches = line.matchAll(/href="(\/[^"]+)"/g);
      for (const match of hrefMatches) {
        const href = match[1];
        for (const prefix of LEGACY_PREFIXES) {
          if (href.startsWith(prefix)) {
            issues.push({
              file: relPath,
              line: i + 1,
              href,
              issue: `Links to ${prefix}* (should use current routes)`,
            });
          }
        }
      }

      const navigateMatches = line.matchAll(
        /navigate\("(\/(?:legacy|app)\/[^"]+)"\)/g
      );
      for (const match of navigateMatches) {
        issues.push({
          file: relPath,
          line: i + 1,
          href: match[1],
          issue: "navigate() to legacy/app route",
        });
      }

      const urlMatches = line.matchAll(/url:\s*"(\/(?:legacy|app)\/[^"]+)"/g);
      for (const match of urlMatches) {
        issues.push({
          file: relPath,
          line: i + 1,
          href: match[1],
          issue: "URL constant pointing to legacy/app route",
        });
      }
    }
  }

  return issues;
}

async function run() {
  console.log("\n=== CaskSense Link-Integrity Test ===\n");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Testing ${CRITICAL_ROUTES.length} critical routes...\n`);

  const results: RouteResult[] = [];
  for (const route of CRITICAL_ROUTES) {
    const result = await testRoute(route);
    const icon = result.ok ? "✓" : "✗";
    const statusStr =
      typeof result.status === "number"
        ? result.status.toString()
        : result.status;
    console.log(
      `  ${icon} ${route.padEnd(40)} ${statusStr.padEnd(6)} ${result.notes}`
    );
    results.push(result);
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  console.log(`\n--- Route Results: ${passed} passed, ${failed} failed ---\n`);

  console.log("=== Link Hygiene Scan ===\n");
  const hygieneIssues = scanSourceForLinks();

  if (hygieneIssues.length === 0) {
    console.log("  ✓ No legacy/app links found in active source files\n");
  } else {
    console.log(
      `  ✗ Found ${hygieneIssues.length} problematic link(s):\n`
    );
    for (const issue of hygieneIssues) {
      console.log(`    ${issue.file}:${issue.line} — ${issue.href}`);
      console.log(`      → ${issue.issue}`);
    }
    console.log();
  }

  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      totalRoutes: CRITICAL_ROUTES.length,
      passed,
      failed,
      hygieneIssues: hygieneIssues.length,
    },
    routes: results,
    hygieneIssues,
  };

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(report, null, 2));
  console.log(`Report written to ${RESULTS_FILE}`);

  console.log("\n=== SUMMARY ===");
  console.log(`Routes:  ${passed}/${CRITICAL_ROUTES.length} OK`);
  console.log(`Hygiene: ${hygieneIssues.length} issue(s)`);
  console.log(
    `Result:  ${failed === 0 && hygieneIssues.length === 0 ? "PASS ✓" : "FAIL ✗"}\n`
  );

  if (failed > 0 || hygieneIssues.length > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
