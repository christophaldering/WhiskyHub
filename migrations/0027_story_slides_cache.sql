ALTER TABLE "tastings" ADD COLUMN IF NOT EXISTS "story_slides_cache" text;
ALTER TABLE "tastings" ADD COLUMN IF NOT EXISTS "story_slides_rating_count" integer;
