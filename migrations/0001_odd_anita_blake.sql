ALTER TABLE "journal_entries" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "peat_level" text;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "vintage" text;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "bottler" text;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "price" text;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "privacy_consent_at" timestamp;--> statement-breakpoint
ALTER TABLE "tastings" ADD COLUMN "reveal_order" text;--> statement-breakpoint
ALTER TABLE "tastings" ADD COLUMN "presentation_slide" integer;--> statement-breakpoint
ALTER TABLE "whiskies" ADD COLUMN "flavor_profile" text;