CREATE TABLE "whisky_gallery" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whisky_id" varchar NOT NULL,
	"photo_url" text NOT NULL,
	"source" text DEFAULT 'manual',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "whisky_gallery_whisky_id_idx" ON "whisky_gallery" USING btree ("whisky_id");
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "category" text;
