ALTER TABLE "participants" ADD COLUMN "preferred_rating_scale" integer;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "tastings" ADD COLUMN "time" text;--> statement-breakpoint
ALTER TABLE "tastings" ADD COLUMN "locked_drams" text;--> statement-breakpoint
ALTER TABLE "whiskies" ADD COLUMN "distilled_year" text;--> statement-breakpoint
ALTER TABLE "whiskies" ADD COLUMN "bottled_year" text;