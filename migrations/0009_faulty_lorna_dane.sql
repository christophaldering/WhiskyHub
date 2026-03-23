CREATE TABLE "bottle_split_claims" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"split_id" varchar NOT NULL,
	"participant_id" varchar NOT NULL,
	"bottle_index" integer DEFAULT 0 NOT NULL,
	"size_ml" integer NOT NULL,
	"price_eur" real NOT NULL,
	"status" text DEFAULT 'claimed' NOT NULL,
	"claimed_at" timestamp DEFAULT now(),
	"confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "bottle_splits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"target_community_ids" text,
	"tasting_id" varchar,
	"deadline" timestamp,
	"min_claims" integer,
	"bottles" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"confirmed_at" timestamp,
	"distributed_at" timestamp,
	"cancelled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "bottlers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"region" text NOT NULL,
	"founded" integer,
	"description" text,
	"specialty" text,
	"website" text,
	"notable_releases" text[],
	"status" text DEFAULT 'active' NOT NULL,
	"lat" double precision,
	"lng" double precision
);
--> statement-breakpoint
CREATE TABLE "community_invites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" varchar NOT NULL,
	"invited_email" text,
	"invited_participant_id" varchar,
	"invited_by_participant_id" varchar NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"personal_note" text,
	"created_at" timestamp DEFAULT now(),
	"accepted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sharing_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tasting_id" varchar NOT NULL,
	"participant_id" varchar NOT NULL,
	"status" text DEFAULT 'interested' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "whisky_group_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" varchar NOT NULL,
	"friend_id" varchar NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whisky_groups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner_id" varchar NOT NULL,
	"temporary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "historical_tastings" ADD COLUMN "origin_type" text DEFAULT 'imported' NOT NULL;--> statement-breakpoint
ALTER TABLE "historical_tastings" ADD COLUMN "origin_tasting_id" varchar;--> statement-breakpoint
ALTER TABLE "tastings" ADD COLUMN "tasting_type" text DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "tastings" ADD COLUMN "visibility" text DEFAULT 'private';--> statement-breakpoint
ALTER TABLE "tastings" ADD COLUMN "sharing_message" text;--> statement-breakpoint
ALTER TABLE "tastings" ADD COLUMN "target_community_ids" text;--> statement-breakpoint
CREATE INDEX "idx_community_invites_community" ON "community_invites" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX "idx_community_invites_email" ON "community_invites" USING btree ("invited_email");--> statement-breakpoint
CREATE INDEX "idx_community_invites_participant" ON "community_invites" USING btree ("invited_participant_id");--> statement-breakpoint
CREATE INDEX "idx_historical_tastings_origin_tasting" ON "historical_tastings" USING btree ("origin_tasting_id");