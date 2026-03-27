-- Applied via drizzle-kit push to fix missing columns in whiskybase_collection
-- The collection page failed with "column country does not exist" (HTTP 500)
-- These ALTER TABLE statements were applied by db:push and are recorded here for documentation

ALTER TABLE "whiskybase_collection" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "whiskybase_collection" ADD COLUMN IF NOT EXISTS "region" text;
