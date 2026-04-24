ALTER TABLE "tastings" ADD COLUMN IF NOT EXISTS "story_enabled" boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS "tasting_event_photos" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tasting_id" varchar NOT NULL REFERENCES "tastings"("id") ON DELETE CASCADE,
  "photo_url" text NOT NULL,
  "caption" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tasting_event_photos_tasting_id_idx" ON "tasting_event_photos" ("tasting_id");
