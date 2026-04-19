ALTER TABLE "whisky_handout_library"
  ADD COLUMN IF NOT EXISTS "is_programme" boolean DEFAULT false NOT NULL;

ALTER TABLE "whisky_handout_library"
  ADD COLUMN IF NOT EXISTS "programme_source_id" varchar;

CREATE INDEX IF NOT EXISTS "idx_whisky_handout_library_programme_source"
  ON "whisky_handout_library" ("programme_source_id");
