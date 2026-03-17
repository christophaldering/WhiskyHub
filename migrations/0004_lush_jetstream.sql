CREATE TABLE IF NOT EXISTS "user_activity_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" varchar NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp DEFAULT now() NOT NULL,
	"duration_minutes" integer DEFAULT 0 NOT NULL,
	"page_context" text
);
--> statement-breakpoint
ALTER TABLE "tastings" ADD COLUMN IF NOT EXISTS "shared_print_materials" text;
