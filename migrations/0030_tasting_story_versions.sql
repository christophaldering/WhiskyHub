-- Migration: add tasting_story_versions table
-- Stores host-saved snapshots of the tasting story (slides cache + prompt)

CREATE TABLE IF NOT EXISTS tasting_story_versions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tasting_id varchar NOT NULL,
  name text,
  slides_cache text NOT NULL,
  prompt text,
  created_by_id varchar,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasting_story_versions_tasting
  ON tasting_story_versions (tasting_id, created_at);
