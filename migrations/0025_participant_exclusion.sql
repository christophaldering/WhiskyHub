ALTER TABLE "tasting_participants" ADD COLUMN IF NOT EXISTS "excluded_from_results" boolean DEFAULT false NOT NULL;
