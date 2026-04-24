-- Migrate tastings.target_community_ids from JSON string (text) to native PostgreSQL text[]
-- Step 0: Defensive null-out of any malformed/non-array values to prevent cast failures
UPDATE "tastings"
SET "target_community_ids" = NULL
WHERE "target_community_ids" IS NOT NULL
  AND "target_community_ids" != ''
  AND (
    jsonb_typeof("target_community_ids"::jsonb) IS DISTINCT FROM 'array'
    OR "target_community_ids"::jsonb = 'null'::jsonb
  );

-- Step 1: Add temporary array column
ALTER TABLE "tastings" ADD COLUMN "target_community_ids_arr" text[];

-- Step 2: Backfill from JSON string using a subquery (allowed in UPDATE but not in USING)
UPDATE "tastings"
SET "target_community_ids_arr" = (
  SELECT array_agg(v)
  FROM jsonb_array_elements_text("target_community_ids"::jsonb) AS v
)
WHERE "target_community_ids" IS NOT NULL AND "target_community_ids" != '';

-- Step 3: Swap columns
ALTER TABLE "tastings" DROP COLUMN "target_community_ids";
ALTER TABLE "tastings" RENAME COLUMN "target_community_ids_arr" TO "target_community_ids";

-- Step 4: Add GIN index for efficient array membership queries
CREATE INDEX IF NOT EXISTS "tastings_target_community_ids_gin"
  ON "tastings" USING GIN ("target_community_ids")
  WHERE "target_community_ids" IS NOT NULL;
