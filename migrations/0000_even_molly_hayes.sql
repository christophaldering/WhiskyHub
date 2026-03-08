CREATE TABLE "admin_audit_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"actor" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "benchmark_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whisky_name" text NOT NULL,
	"distillery" text,
	"region" text,
	"country" text,
	"age" text,
	"abv" text,
	"cask_type" text,
	"category" text,
	"nose_notes" text,
	"taste_notes" text,
	"finish_notes" text,
	"overall_notes" text,
	"score" real,
	"score_scale" text,
	"source_document" text,
	"source_author" text,
	"uploaded_by" varchar NOT NULL,
	"library_category" text DEFAULT 'other',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "changelog_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text DEFAULT 'feature' NOT NULL,
	"date" text NOT NULL,
	"version" text,
	"visible" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "communities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"archive_visibility" text DEFAULT 'community_only' NOT NULL,
	"public_aggregated_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "communities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "community_memberships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" varchar NOT NULL,
	"participant_id" varchar NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "connoisseur_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" varchar NOT NULL,
	"generated_at" timestamp DEFAULT now(),
	"report_content" text NOT NULL,
	"summary" text NOT NULL,
	"data_snapshot" jsonb,
	"language" text DEFAULT 'en'
);
--> statement-breakpoint
CREATE TABLE "discussion_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tasting_id" varchar NOT NULL,
	"participant_id" varchar NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "encyclopedia_suggestions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"region" text NOT NULL,
	"founded" integer,
	"description" text,
	"feature" text,
	"website" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"submitted_by" varchar,
	"submitter_name" text,
	"admin_note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "historical_import_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_file_name" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"rows_read" integer DEFAULT 0,
	"rows_imported" integer DEFAULT 0,
	"rows_skipped" integer DEFAULT 0,
	"tastings_created" integer DEFAULT 0,
	"entries_created" integer DEFAULT 0,
	"warnings_count" integer DEFAULT 0,
	"errors_count" integer DEFAULT 0,
	"summary_json" text,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "historical_tasting_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"historical_tasting_id" varchar NOT NULL,
	"source_whisky_key" text NOT NULL,
	"distillery_raw" text,
	"whisky_name_raw" text,
	"age_raw" text,
	"alcohol_raw" text,
	"price_raw" text,
	"country_raw" text,
	"region_raw" text,
	"type_raw" text,
	"smoky_raw" text,
	"ppm_raw" text,
	"cask_raw" text,
	"nose_score" real,
	"nose_rank" integer,
	"taste_score" real,
	"taste_rank" integer,
	"finish_score" real,
	"finish_rank" integer,
	"total_score" real,
	"total_rank" integer,
	"normalized_nose" real,
	"normalized_taste" real,
	"normalized_finish" real,
	"normalized_total" real,
	"normalized_age" integer,
	"normalized_abv" real,
	"normalized_price" real,
	"normalized_country" text,
	"normalized_region" text,
	"normalized_type" text,
	"normalized_is_smoky" boolean,
	"normalized_ppm" real,
	"normalized_cask" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "historical_tasting_entries_source_whisky_key_unique" UNIQUE("source_whisky_key")
);
--> statement-breakpoint
CREATE TABLE "historical_tastings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"tasting_number" integer NOT NULL,
	"title_de" text,
	"title_en" text,
	"tasting_date" text,
	"source_file_name" text,
	"import_batch_id" varchar,
	"whisky_count" integer DEFAULT 0,
	"community_id" varchar,
	"visibility_level" text DEFAULT 'community_only' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "historical_tastings_source_key_unique" UNIQUE("source_key")
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" varchar NOT NULL,
	"title" text NOT NULL,
	"whisky_name" text,
	"distillery" text,
	"region" text,
	"age" text,
	"abv" text,
	"cask_type" text,
	"nose_notes" text,
	"taste_notes" text,
	"finish_notes" text,
	"personal_score" real,
	"whiskybase_id" text,
	"wb_score" real,
	"mood" text,
	"occasion" text,
	"image_url" text,
	"body" text,
	"source" text DEFAULT 'casksense',
	"voice_memo_url" text,
	"voice_memo_transcript" text,
	"voice_memo_duration" integer,
	"status" text DEFAULT 'final' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "newsletter_recipients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"newsletter_id" varchar NOT NULL,
	"participant_id" varchar NOT NULL,
	"email" text NOT NULL,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "newsletters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"content_html" text NOT NULL,
	"content_text" text,
	"recipient_count" integer DEFAULT 0,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" varchar,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link_url" text,
	"tasting_id" varchar,
	"is_global" boolean DEFAULT false,
	"read_by" text DEFAULT '[]',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"pin" text,
	"email" text,
	"role" text DEFAULT 'user',
	"language" text DEFAULT 'en',
	"email_verified" boolean DEFAULT false,
	"verification_code" text,
	"verification_expiry" timestamp,
	"can_access_whisky_db" boolean DEFAULT false,
	"newsletter_opt_in" boolean DEFAULT false,
	"community_contributor" boolean DEFAULT false,
	"experience_level" text DEFAULT 'connoisseur',
	"smoke_affinity_index" real,
	"sweetness_bias" real,
	"rating_stability_score" real,
	"exploration_index" real,
	"making_of_access" boolean DEFAULT false,
	"last_seen_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" varchar NOT NULL,
	"bio" text,
	"favorite_whisky" text,
	"go_to_dram" text,
	"preferred_regions" text,
	"preferred_peat_level" text,
	"preferred_cask_influence" text,
	"photo_url" text,
	"openai_api_key" text,
	"friend_notifications_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tasting_id" varchar NOT NULL,
	"whisky_id" varchar NOT NULL,
	"participant_id" varchar NOT NULL,
	"nose" real DEFAULT 50,
	"taste" real DEFAULT 50,
	"finish" real DEFAULT 50,
	"balance" real DEFAULT 50,
	"overall" real DEFAULT 50,
	"notes" text DEFAULT '',
	"guess_abv" real,
	"guess_age" text,
	"normalized_score" real,
	"calibration_delta" real,
	"blind_vs_open_delta" real,
	"confidence_weight" real,
	"source" text DEFAULT 'app',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reflection_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tasting_id" varchar NOT NULL,
	"participant_id" varchar NOT NULL,
	"prompt_text" text NOT NULL,
	"text" text NOT NULL,
	"is_anonymous" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reminder_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" varchar NOT NULL,
	"tasting_id" varchar NOT NULL,
	"offset_minutes" integer NOT NULL,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session_invites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tasting_id" varchar NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"personal_note" text,
	"status" text DEFAULT 'invited' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"accepted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "session_presence" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tasting_id" varchar NOT NULL,
	"participant_id" varchar NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "tasting_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tasting_id" varchar NOT NULL,
	"participant_id" varchar NOT NULL,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasting_photos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tasting_id" varchar NOT NULL,
	"participant_id" varchar NOT NULL,
	"participant_name" text,
	"whisky_id" varchar,
	"photo_url" text NOT NULL,
	"caption" text,
	"printable" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasting_reminders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" varchar NOT NULL,
	"tasting_id" varchar,
	"enabled" boolean DEFAULT true,
	"offset_minutes" integer DEFAULT 1440 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tastings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"location" text NOT NULL,
	"host_id" varchar NOT NULL,
	"code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"current_act" text DEFAULT 'act1',
	"host_reflection" text,
	"blind_mode" boolean DEFAULT false,
	"guided_mode" boolean DEFAULT false,
	"guided_whisky_index" integer DEFAULT -1,
	"guided_reveal_step" integer DEFAULT 0,
	"reveal_index" integer DEFAULT 0,
	"reveal_step" integer DEFAULT 0,
	"reflection_enabled" boolean DEFAULT false,
	"reflection_mode" text DEFAULT 'standard',
	"reflection_visibility" text DEFAULT 'named',
	"custom_prompts" text,
	"cover_image_url" text,
	"cover_image_revealed" boolean DEFAULT false,
	"video_link" text,
	"dram_started_at" timestamp,
	"dram_timers" text,
	"rating_prompt" text,
	"rating_scale" integer DEFAULT 100 NOT NULL,
	"active_whisky_id" varchar,
	"ai_highlights_cache" text,
	"ai_highlights_rating_count" integer,
	"ai_narrative" text,
	"guest_mode" text DEFAULT 'standard',
	"session_ui_mode" text,
	"show_ranking" boolean DEFAULT true,
	"show_group_avg" boolean DEFAULT true,
	"show_reveal" boolean DEFAULT true,
	"is_test_data" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"opened_at" timestamp,
	"closed_at" timestamp,
	"revealed_at" timestamp,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" varchar,
	"participant_name" text,
	"category" text DEFAULT 'feature' NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "voice_memos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tasting_id" varchar NOT NULL,
	"whisky_id" varchar NOT NULL,
	"participant_id" varchar NOT NULL,
	"audio_url" text,
	"transcript" text,
	"duration_seconds" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whiskies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tasting_id" varchar NOT NULL,
	"name" text NOT NULL,
	"distillery" text,
	"age" text,
	"abv" real,
	"type" text,
	"country" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"category" text,
	"region" text,
	"abv_band" text,
	"age_band" text,
	"cask_influence" text,
	"peat_level" text,
	"ppm" real,
	"whiskybase_id" text,
	"wb_score" real,
	"image_url" text,
	"photo_revealed" boolean DEFAULT false,
	"host_notes" text,
	"bottler" text,
	"vintage" text,
	"price" real,
	"host_summary" text,
	"distillery_url" text,
	"ai_facts_cache" text,
	"ai_insights_cache" text
);
--> statement-breakpoint
CREATE TABLE "whisky_friends" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" varchar NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'accepted' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whiskybase_collection" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" varchar NOT NULL,
	"whiskybase_id" text NOT NULL,
	"collection_id" text,
	"brand" text,
	"name" text NOT NULL,
	"bottling_series" text,
	"status" text,
	"stated_age" text,
	"size" text,
	"abv" text,
	"unit" text,
	"cask_type" text,
	"community_rating" real,
	"personal_rating" real,
	"price_paid" real,
	"currency" text,
	"avg_price" real,
	"avg_price_currency" text,
	"distillery" text,
	"vintage" text,
	"added_at" text,
	"image_url" text,
	"auction_price" real,
	"auction_currency" text,
	"notes" text,
	"purchase_location" text,
	"estimated_price" real,
	"estimated_price_currency" text,
	"estimated_price_date" timestamp,
	"estimated_price_source" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wishlist_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" varchar NOT NULL,
	"whisky_name" text NOT NULL,
	"distillery" text,
	"region" text,
	"age" text,
	"abv" text,
	"cask_type" text,
	"notes" text,
	"priority" text DEFAULT 'medium',
	"source" text,
	"ai_summary" text,
	"ai_summary_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "idx_community_memberships_community" ON "community_memberships" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX "idx_community_memberships_participant" ON "community_memberships" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "idx_historical_entries_tasting_id" ON "historical_tasting_entries" USING btree ("historical_tasting_id");--> statement-breakpoint
CREATE INDEX "idx_historical_tastings_tasting_number" ON "historical_tastings" USING btree ("tasting_number");--> statement-breakpoint
CREATE INDEX "idx_historical_tastings_community" ON "historical_tastings" USING btree ("community_id");