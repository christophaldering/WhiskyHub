CREATE TABLE IF NOT EXISTS "distillery_aliases" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "alias" text NOT NULL,
  "distillery_id" varchar NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "distillery_aliases_alias_unique"
  ON "distillery_aliases" ("alias");

CREATE INDEX IF NOT EXISTS "distillery_aliases_distillery_id_idx"
  ON "distillery_aliases" ("distillery_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'distillery_aliases_distillery_id_fk'
  ) THEN
    ALTER TABLE "distillery_aliases"
      ADD CONSTRAINT "distillery_aliases_distillery_id_fk"
      FOREIGN KEY ("distillery_id") REFERENCES "distilleries"("id") ON DELETE CASCADE;
  END IF;
END $$;
