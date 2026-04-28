import { sql } from "drizzle-orm";
import { db } from "./db";
import { lexicon } from "@shared/schema";
import { lexiconData } from "../client/src/labs/data/lexiconData";
import { isEmbeddingAvailable } from "./lib/embeddings";
import { backfillTable } from "./lib/embed-backfill";

const SEARCH_TABLES = [
  {
    table: "whiskies",
    triggerName: "trg_whiskies_search_vector",
    funcName: "whiskies_search_vector_update",
    searchExpr: `setweight(to_tsvector('simple', unaccent(coalesce(NEW.name,''))), 'A')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.distillery,''))), 'A')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.region,''))), 'B')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.country,''))), 'B')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.category,''))), 'B')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.type,''))), 'B')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.cask_type,''))), 'B')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.peat_level,''))), 'B')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.bottler,''))), 'B')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.flavor_profile,''))), 'B')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.notes,''))), 'C')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.host_notes,''))), 'C')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.host_summary,''))), 'C')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.age,''))), 'D')`,
  },
  {
    table: "tastings",
    triggerName: "trg_tastings_search_vector",
    funcName: "tastings_search_vector_update",
    searchExpr: `setweight(to_tsvector('simple', unaccent(coalesce(NEW.title,''))), 'A')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.location,''))), 'B')
      || setweight(to_tsvector('simple', unaccent(coalesce((SELECT string_agg(coalesce(w.name,'') || ' ' || coalesce(w.distillery,'') || ' ' || coalesce(w.region,''), ' ') FROM whiskies w WHERE w.tasting_id = NEW.id),''))), 'B')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.host_reflection,''))), 'C')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.ai_narrative,''))), 'D')`,
  },
  {
    table: "distilleries",
    triggerName: "trg_distilleries_search_vector",
    funcName: "distilleries_search_vector_update",
    searchExpr: `setweight(to_tsvector('simple', unaccent(coalesce(NEW.name,''))), 'A')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.region,''))), 'B')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.country,''))), 'B')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.description,''))), 'C')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.feature,''))), 'D')`,
  },
  {
    table: "lexicon",
    triggerName: "trg_lexicon_search_vector",
    funcName: "lexicon_search_vector_update",
    searchExpr: `setweight(to_tsvector('simple', unaccent(coalesce(NEW.term,''))), 'A')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.category,''))), 'B')
      || setweight(to_tsvector('simple', unaccent(coalesce(NEW.definition,''))), 'C')`,
  },
];

const TRGM_INDEXES: { table: string; indexName: string; columns: string[] }[] = [
  { table: "whiskies", indexName: "idx_whiskies_name_trgm", columns: ["name"] },
  { table: "whiskies", indexName: "idx_whiskies_distillery_trgm", columns: ["distillery"] },
  { table: "tastings", indexName: "idx_tastings_title_trgm", columns: ["title"] },
  { table: "distilleries", indexName: "idx_distilleries_name_trgm", columns: ["name"] },
  { table: "lexicon", indexName: "idx_lexicon_term_trgm", columns: ["term"] },
];

async function ensureExtensions(): Promise<void> {
  await db.execute(sql.raw(`CREATE EXTENSION IF NOT EXISTS pg_trgm`));
  await db.execute(sql.raw(`CREATE EXTENSION IF NOT EXISTS unaccent`));
  try {
    await db.execute(sql.raw(`CREATE EXTENSION IF NOT EXISTS vector`));
  } catch (e) {
    console.warn("[search-init] pgvector extension unavailable:", e instanceof Error ? e.message : e);
  }
}

async function ensureLexiconTable(): Promise<void> {
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS "lexicon" (
      "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      "locale" text NOT NULL,
      "category" text NOT NULL,
      "term" text NOT NULL,
      "definition" text NOT NULL,
      "sort_order" integer NOT NULL DEFAULT 0,
      CONSTRAINT lexicon_locale_term_unique UNIQUE (locale, term)
    )
  `));
}

async function ensureColumns(): Promise<void> {
  for (const t of SEARCH_TABLES) {
    try {
      await db.execute(sql.raw(`ALTER TABLE "${t.table}" ADD COLUMN IF NOT EXISTS search_vector tsvector`));
    } catch (e) {
      console.warn(`[search-init] could not add search_vector column to ${t.table}:`, e instanceof Error ? e.message : e);
    }
    try {
      await db.execute(sql.raw(`ALTER TABLE "${t.table}" ADD COLUMN IF NOT EXISTS embedding vector(1536)`));
    } catch (e) {
      console.warn(`[search-init] could not add embedding column to ${t.table}:`, e instanceof Error ? e.message : e);
    }
  }
}

async function ensureWhiskyTriggerOnTasting(): Promise<void> {
  const fnSql = `CREATE OR REPLACE FUNCTION whiskies_refresh_parent_tasting() RETURNS trigger AS $$
DECLARE
  target_id varchar;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    target_id := OLD.tasting_id;
  ELSE
    target_id := NEW.tasting_id;
  END IF;
  IF target_id IS NOT NULL THEN
    UPDATE tastings SET title = title WHERE id = target_id;
  END IF;
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql`;
  try {
    await db.execute(sql.raw(fnSql));
    await db.execute(sql.raw(`DROP TRIGGER IF EXISTS trg_whiskies_refresh_parent_tasting ON "whiskies"`));
    await db.execute(sql.raw(`CREATE TRIGGER trg_whiskies_refresh_parent_tasting AFTER INSERT OR UPDATE OR DELETE ON "whiskies" FOR EACH ROW EXECUTE FUNCTION whiskies_refresh_parent_tasting()`));
  } catch (e) {
    console.warn("[search-init] whiskies->tasting refresh trigger failed:", e instanceof Error ? e.message : e);
  }
}

async function ensureTriggers(): Promise<void> {
  for (const t of SEARCH_TABLES) {
    const fnSql = `CREATE OR REPLACE FUNCTION ${t.funcName}() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := ${t.searchExpr};
  RETURN NEW;
END
$$ LANGUAGE plpgsql`;
    await db.execute(sql.raw(fnSql));
    await db.execute(sql.raw(`DROP TRIGGER IF EXISTS ${t.triggerName} ON "${t.table}"`));
    await db.execute(sql.raw(`CREATE TRIGGER ${t.triggerName} BEFORE INSERT OR UPDATE ON "${t.table}" FOR EACH ROW EXECUTE FUNCTION ${t.funcName}()`));
  }
}

async function ensureIndexes(): Promise<void> {
  for (const t of SEARCH_TABLES) {
    await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS idx_${t.table}_search_vector ON "${t.table}" USING GIN (search_vector)`));
  }
  for (const idx of TRGM_INDEXES) {
    const cols = idx.columns.map((c) => `"${c}" gin_trgm_ops`).join(", ");
    await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS ${idx.indexName} ON "${idx.table}" USING GIN (${cols})`));
  }
}

async function backfillSearchVectors(): Promise<void> {
  for (const t of SEARCH_TABLES) {
    try {
      const expr = t.searchExpr.replace(/NEW\./g, `"${t.table}".`);
      const whereClause = t.table === "tastings" ? "" : "WHERE search_vector IS NULL";
      await db.execute(sql.raw(`UPDATE "${t.table}" SET search_vector = ${expr} ${whereClause}`));
    } catch (e) {
      console.warn(`[search-init] backfillSearchVectors(${t.table}) failed:`, e instanceof Error ? e.message : e);
    }
  }
}

async function seedLexicon(): Promise<void> {
  const rows: { locale: string; category: string; term: string; definition: string; sortOrder: number }[] = [];
  for (const locale of Object.keys(lexiconData)) {
    const categories = lexiconData[locale];
    let order = 0;
    for (const cat of categories) {
      for (const entry of cat.entries) {
        rows.push({
          locale,
          category: cat.key,
          term: entry.term,
          definition: entry.definition,
          sortOrder: order++,
        });
      }
    }
  }
  if (rows.length === 0) return;

  const beforeCounts = await db.execute(sql.raw(`SELECT locale, count(*)::int AS n FROM lexicon GROUP BY locale`));
  const beforeMap = new Map<string, number>();
  for (const r of beforeCounts.rows as { locale: string; n: number }[]) {
    beforeMap.set(r.locale, r.n);
  }

  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const result = await db.insert(lexicon)
      .values(slice)
      .onConflictDoUpdate({
        target: [lexicon.locale, lexicon.term],
        set: {
          category: sql`EXCLUDED.category`,
          definition: sql`EXCLUDED.definition`,
          sortOrder: sql`EXCLUDED.sort_order`,
        },
      });
    inserted += slice.length;
    void result;
  }

  const afterCounts = await db.execute(sql.raw(`SELECT locale, count(*)::int AS n FROM lexicon GROUP BY locale`));
  const summary: string[] = [];
  for (const r of afterCounts.rows as { locale: string; n: number }[]) {
    const delta = r.n - (beforeMap.get(r.locale) ?? 0);
    summary.push(`${r.locale}=${r.n} (+${delta})`);
  }
  console.log(`[search-init] lexicon upserted ${inserted} rows | per-locale ${summary.join(", ")}`);

  if (isEmbeddingAvailable()) {
    const pending = await db.execute(sql.raw(`SELECT count(*)::int AS n FROM lexicon WHERE embedding IS NULL`));
    const count = (pending.rows[0] as { n: number } | undefined)?.n ?? 0;
    if (count > 0) {
      console.log(`[search-init] background lexicon embedding backfill scheduled (${count} pending rows)`);
      void backfillTable("lexicon", { batchSize: 32, pauseMs: 1000 }).catch((e) => {
        console.warn("[search-init] lexicon background backfill failed:", e instanceof Error ? e.message : e);
      });
    }
  }
}

let initialized = false;

export async function initSearchInfrastructure(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    await ensureExtensions();
    await ensureLexiconTable();
    await ensureColumns();
    await ensureTriggers();
    await ensureWhiskyTriggerOnTasting();
    await ensureIndexes();
    await backfillSearchVectors();
    await seedLexicon();
    console.log("[search-init] search infrastructure ready");
  } catch (e) {
    console.error("[search-init] initialization failed:", e instanceof Error ? e.message : e);
  }
}
