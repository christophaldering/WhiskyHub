CREATE TABLE "collection_sync_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" varchar NOT NULL,
	"synced_at" timestamp DEFAULT now(),
	"summary" jsonb NOT NULL,
	"details" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flavour_categories" (
	"id" varchar PRIMARY KEY NOT NULL,
	"en" text NOT NULL,
	"de" text NOT NULL,
	"color" text DEFAULT '#888888' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flavour_descriptors" (
	"id" varchar PRIMARY KEY NOT NULL,
	"category_id" varchar NOT NULL,
	"en" text NOT NULL,
	"de" text NOT NULL,
	"keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whiskybase_collection" ADD COLUMN "source" text DEFAULT 'whiskybase';--> statement-breakpoint
ALTER TABLE "whiskybase_collection" ADD COLUMN "locally_modified" jsonb;