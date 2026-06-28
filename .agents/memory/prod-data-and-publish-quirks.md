---
name: Prod data scales & Publish schema-sync backup trap
description: Two durable gotchas hit while migrating historical_tasting_entries normalized scores on production.
---

# Publish schema-sync pre-creates EMPTY copies of new dev tables on prod
When you create a new table on DEV (e.g. a one-off backup table) and the user
Publishes, Replit's schema sync copies the table STRUCTURE to the prod DB as an
EMPTY table. A backup guard like `if to_regclass(BAK) is null then CREATE TABLE
BAK AS SELECT ...` is therefore DEFEATED on prod: the empty table already exists,
the guard skips, and **no real backup is taken** before a destructive UPDATE.

**Why:** cost me a real backup on a prod data migration — the original values
were only recoverable because the source columns were untouched.

**How to apply:** for any ad-hoc backup table, do `DROP TABLE IF EXISTS bak;
CREATE TABLE bak AS SELECT ...` (always materialize data), never gate on
existence. Better: timestamped backup table names, ideally backup+update in one
transaction.

# historical_tasting_entries on PROD is MIXED-scale (dev is clean)
Prod `*_score` columns mix scales row-by-row: most rows are 0–10, but a chunk are
already on the 0–100 scale (e.g. nose 81.5 / total 93.5), plus a few legacy rows
with an odd 10–12 total while components are 0–10. DEV did not have these rows, so
a blanket "0–10 → curve" transform validated fine on dev but corrupted the
already-0–100 prod rows (clamped them all to 95).

**Why:** any normalization of these scores must be SCALE-AWARE: scores >12 are
already normalized → pass through; 0–10 → apply curve; derive odd totals from the
corrected component sub-scores.

**How to apply:** never trust dev data shape as representative of prod for this
table. Inspect prod distribution (read-only) before any bulk write. Note prod
writes can only go through a deployed admin HTTP endpoint — `executeSql`
production is a read-only replica.
