CREATE TABLE "page_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" varchar NOT NULL,
	"session_id" varchar,
	"page_path" text NOT NULL,
	"normalized_path" text NOT NULL,
	"referrer_path" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"duration_seconds" integer
);
--> statement-breakpoint
CREATE TABLE "search_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" varchar NOT NULL,
	"query" text NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"context" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "utm_visits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" varchar,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"referrer" text,
	"landing_page" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "user_activity_sessions" ADD COLUMN "duration_seconds" integer;--> statement-breakpoint
ALTER TABLE "user_activity_sessions" ADD COLUMN "entry_page" text;--> statement-breakpoint
ALTER TABLE "user_activity_sessions" ADD COLUMN "exit_page" text;--> statement-breakpoint
ALTER TABLE "user_activity_sessions" ADD COLUMN "page_count" integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX "idx_page_views_participant" ON "page_views" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "idx_page_views_session" ON "page_views" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_page_views_timestamp" ON "page_views" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_page_views_normalized_path" ON "page_views" USING btree ("normalized_path");--> statement-breakpoint
CREATE INDEX "idx_search_logs_participant" ON "search_logs" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "idx_search_logs_created" ON "search_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_utm_visits_created" ON "utm_visits" USING btree ("created_at");