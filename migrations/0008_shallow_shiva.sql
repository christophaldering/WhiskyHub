CREATE TABLE "distilleries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"region" text NOT NULL,
	"country" text NOT NULL,
	"founded" integer,
	"description" text,
	"feature" text,
	"status" text DEFAULT 'active' NOT NULL,
	"lat" real,
	"lng" real
);
