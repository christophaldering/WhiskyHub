CREATE TABLE "ai_usage_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" varchar NOT NULL,
	"feature_id" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "idx_ai_usage_participant" ON "ai_usage_log" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_created" ON "ai_usage_log" USING btree ("created_at");