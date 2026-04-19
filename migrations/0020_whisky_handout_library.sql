-- Whisky Handout Library (Task #702)
-- Per-host reusable handout library so hosts can re-apply previously
-- uploaded handouts to whiskies in new tastings without re-uploading.
-- Note: matches what `drizzle-kit push --force` produced from
-- shared/schema.ts; provided here for environments that replay migrations.

CREATE TABLE IF NOT EXISTS "whisky_handout_library" (
  "id"             varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "host_id"        varchar NOT NULL,
  "whisky_name"    text NOT NULL,
  "distillery"     text,
  "whiskybase_id"  text,
  "file_url"       text NOT NULL,
  "content_type"   text NOT NULL,
  "title"          text,
  "author"         text,
  "description"    text,
  "created_at"     timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_whisky_handout_library_host"
  ON "whisky_handout_library" ("host_id");
CREATE INDEX IF NOT EXISTS "idx_whisky_handout_library_host_wb"
  ON "whisky_handout_library" ("host_id", "whiskybase_id");
CREATE INDEX IF NOT EXISTS "idx_whisky_handout_library_file_url"
  ON "whisky_handout_library" ("file_url");
