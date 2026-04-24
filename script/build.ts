import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, copyFile } from "fs/promises";
import { execSync } from "child_process";

function getGitSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function preBuildMigrations() {
  if (!process.env.DATABASE_URL) {
    console.log("no DATABASE_URL, skipping pre-build migration");
    return;
  }
  const pgMod = await import("pg");
  const pool = new pgMod.default.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  try {
    const criticalTables = ["participants", "journal_entries", "ratings", "tastings", "historical_tastings", "wishlist_entries", "profiles"];
    const counts: Record<string, number> = {};
    for (const table of criticalTables) {
      try {
        const { rows } = await pool.query(`SELECT count(*)::int as cnt FROM ${table}`);
        counts[table] = rows[0]?.cnt ?? 0;
      } catch { counts[table] = -1; }
    }
    console.log("pre-build: row counts before migration:", JSON.stringify(counts));

    await pool.query(`
      CREATE TABLE IF NOT EXISTS _data_guard_snapshots (
        id serial PRIMARY KEY,
        snapshot_time timestamptz NOT NULL DEFAULT now(),
        table_counts jsonb NOT NULL,
        build_sha text
      )
    `);
    const gitSha = (() => { try { const { execSync: ex } = require("child_process"); return ex("git rev-parse --short HEAD", { encoding: "utf-8" }).trim(); } catch { return "unknown"; } })();
    await pool.query(
      `INSERT INTO _data_guard_snapshots (table_counts, build_sha) VALUES ($1, $2)`,
      [JSON.stringify(counts), gitSha]
    );
    console.log("pre-build: data guard snapshot saved");
    const renames: Array<{ table: string; from: string; to: string }> = [
      { table: "journal_entries", from: "whisky_name", to: "name" },
      { table: "benchmark_entries", from: "whisky_name", to: "name" },
      { table: "wishlist_entries", from: "whisky_name", to: "name" },
      { table: "profiles", from: "preferred_cask_influence", to: "preferred_cask_type" },
      { table: "whiskybase_collection", from: "vintage", to: "distilled_year" },
    ];
    for (const { table, from, to } of renames) {
      const { rows } = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [table, from]
      );
      if (rows.length > 0) {
        const { rows: hasNew } = await pool.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
          [table, to]
        );
        if (hasNew.length === 0) {
          await pool.query(`ALTER TABLE ${table} RENAME COLUMN ${from} TO ${to}`);
          console.log(`pre-build: ${table}.${from} → ${to}`);
        }
      }
    }

    const textToReal: Array<{ table: string; column: string }> = [
      { table: "journal_entries", column: "abv" },
      { table: "journal_entries", column: "price" },
      { table: "benchmark_entries", column: "abv" },
      { table: "whiskybase_collection", column: "abv" },
      { table: "wishlist_entries", column: "abv" },
    ];
    for (const { table, column } of textToReal) {
      const { rows } = await pool.query(
        `SELECT data_type FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [table, column]
      );
      if (rows[0]?.data_type === "text") {
        await pool.query(`UPDATE ${table} SET ${column} = REPLACE(${column}, '%', '') WHERE ${column} LIKE '%\\%%'`);
        await pool.query(`UPDATE ${table} SET ${column} = NULL WHERE ${column} IS NOT NULL AND ${column} !~ '^-?[0-9]+([.,][0-9]+)?$'`);
        await pool.query(`ALTER TABLE ${table} ALTER COLUMN ${column} TYPE real USING NULLIF(REPLACE(${column}, ',', '.'), '')::real`);
        console.log(`pre-build: ${table}.${column} text → real`);
      }
    }

    const addCols: Array<{ table: string; column: string; type: string }> = [
      { table: "journal_entries", column: "country", type: "text" },
      { table: "journal_entries", column: "category", type: "text" },
      { table: "journal_entries", column: "bottler", type: "text" },
      { table: "journal_entries", column: "whiskybase_id", type: "text" },
      { table: "journal_entries", column: "wb_score", type: "real" },
      { table: "journal_entries", column: "mood", type: "text" },
      { table: "journal_entries", column: "occasion", type: "text" },
      { table: "journal_entries", column: "source", type: "text" },
      { table: "journal_entries", column: "voice_memo_url", type: "text" },
      { table: "journal_entries", column: "voice_memo_transcript", type: "text" },
      { table: "journal_entries", column: "voice_memo_duration", type: "integer" },
      { table: "journal_entries", column: "status", type: "text" },
      { table: "journal_entries", column: "deleted_at", type: "timestamp" },
      { table: "journal_entries", column: "nose_score", type: "real" },
      { table: "journal_entries", column: "taste_score", type: "real" },
      { table: "journal_entries", column: "finish_score", type: "real" },
      { table: "profiles", column: "openai_api_key", type: "text" },
      { table: "profiles", column: "friend_notifications_enabled", type: "boolean" },
      { table: "profiles", column: "online_toast_level", type: "text" },
      { table: "profiles", column: "cheers_enabled", type: "boolean" },
      { table: "profiles", column: "tasting_invite_enabled", type: "boolean" },
      { table: "whiskybase_collection", column: "country", type: "text" },
      { table: "whiskybase_collection", column: "region", type: "text" },
      { table: "whiskybase_collection", column: "distilled_year", type: "integer" },
      { table: "whiskies", column: "country", type: "text" },
      { table: "wishlist_entries", column: "country", type: "text" },
    ];
    for (const { table, column, type } of addCols) {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`);
    }
    console.log("pre-build: ensured all columns exist");

    try {
      const dedupeRes = await pool.query(`
        DELETE FROM tasting_participants tp
        USING tasting_participants tp2
        WHERE tp.tasting_id = tp2.tasting_id
          AND tp.participant_id = tp2.participant_id
          AND tp.joined_at > tp2.joined_at
      `);
      if ((dedupeRes.rowCount ?? 0) > 0) {
        console.log(`pre-build: removed ${dedupeRes.rowCount} duplicate tasting_participants rows`);
      }
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_tasting_participant ON tasting_participants (tasting_id, participant_id)`);
      console.log("pre-build: ensured uq_tasting_participant index exists");
    } catch (e: any) {
      console.log(`pre-build: tasting_participants unique index note: ${e.message}`);
    }

    try {
      await pool.query(`ALTER TABLE tasting_participants ADD COLUMN IF NOT EXISTS rejoin_code varchar`);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_tasting_rejoin_code ON tasting_participants (tasting_id, rejoin_code)`);
      console.log("pre-build: ensured rejoin_code column + unique index exist");
    } catch (e: any) {
      console.log(`pre-build: rejoin_code migration note: ${e.message}`);
    }
  } catch (e: any) {
    console.log(`pre-build migration note: ${e.message}`);
  } finally {
    await pool.end();
  }
}

async function buildAll() {
  await preBuildMigrations();
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  const gitSha = getGitSha();
  const buildTime = new Date().toISOString();

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
      "process.env.GIT_SHA": JSON.stringify(gitSha),
      "process.env.BUILD_TIME": JSON.stringify(buildTime),
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("copying preload script...");
  await copyFile("server/preload.cjs", "dist/preload.cjs");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
