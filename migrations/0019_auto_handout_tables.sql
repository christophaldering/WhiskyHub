-- Auto-Handout Generator (Task #701)
-- Adds three tables that back the per-tasting auto-handout feature:
--  * distillery_profiles : encyclopedia cache shared across all tastings, keyed by lowercased name
--  * whisky_profiles     : per-bottling cache (key = wb:<id> or "<distillery>|<name>")
--  * tasting_auto_handouts : per-tasting binding (host customizations, status, selection)
-- All three tables hold JSON payloads typed via shared/schema.ts.
-- Note: this matches what `drizzle-kit push --force` produced; the project's
-- canonical workflow is push-based, this file is provided for environments
-- that replay migrations.

CREATE TABLE IF NOT EXISTS "distillery_profiles" (
  "id"             varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name_key"       text NOT NULL UNIQUE,
  "display_name"   text NOT NULL,
  "language"       text NOT NULL DEFAULT 'de',
  "tone"           text NOT NULL DEFAULT 'erzaehlerisch',
  "length_pref"    text NOT NULL DEFAULT 'medium',
  "chapters"       jsonb NOT NULL DEFAULT '[]'::jsonb,
  "sources"        jsonb NOT NULL DEFAULT '[]'::jsonb,
  "images"         jsonb NOT NULL DEFAULT '[]'::jsonb,
  "generated_at"   timestamp DEFAULT now(),
  "refreshed_at"   timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "whisky_profiles" (
  "id"             varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "whisky_key"     text NOT NULL UNIQUE,
  "name"           text NOT NULL,
  "distillery"     text,
  "whiskybase_id"  text,
  "language"       text NOT NULL DEFAULT 'de',
  "tone"           text NOT NULL DEFAULT 'erzaehlerisch',
  "length_pref"    text NOT NULL DEFAULT 'medium',
  "chapters"       jsonb NOT NULL DEFAULT '[]'::jsonb,
  "sources"        jsonb NOT NULL DEFAULT '[]'::jsonb,
  "generated_at"   timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "tasting_auto_handouts" (
  "id"                   varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "tasting_id"           varchar NOT NULL UNIQUE,
  "language"             text NOT NULL DEFAULT 'de',
  "tone"                 text NOT NULL DEFAULT 'erzaehlerisch',
  "length_pref"          text NOT NULL DEFAULT 'medium',
  "visibility"           text NOT NULL DEFAULT 'always',
  "selection"            jsonb NOT NULL DEFAULT '{}'::jsonb,
  "selected_images"      jsonb NOT NULL DEFAULT '[]'::jsonb,
  "chapter_order"        jsonb NOT NULL DEFAULT '[]'::jsonb,
  "status"               text NOT NULL DEFAULT 'idle',
  "progress"             integer NOT NULL DEFAULT 0,
  "progress_total"       integer NOT NULL DEFAULT 0,
  "error_message"        text,
  "generated_at"         timestamp,
  "acknowledged_notice"  boolean NOT NULL DEFAULT false
);
