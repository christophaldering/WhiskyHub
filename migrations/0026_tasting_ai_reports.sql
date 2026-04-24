-- Migration: Add tasting_ai_reports table for KI-Tasting-Report feature
-- consistencyScores stores Array<{participantId, participantName, avgDeviation}> sorted asc by avgDeviation
-- individualReports stores per-participant AI narrative and preference profile (host-access only at full scope; redacted on read for participants)

CREATE TABLE IF NOT EXISTS "tasting_ai_reports" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "tasting_id" varchar NOT NULL UNIQUE,
  "generated_at" timestamp DEFAULT now(),
  "rating_count_at_generation" integer DEFAULT 0,
  "group_narrative" text,
  "group_narrative_en" text,
  "whisky_characteristics" jsonb,
  "correlation_data" jsonb,
  "outlier_moments" jsonb,
  "median_taster_id" varchar,
  "median_taster_name" text,
  "consistency_scores" jsonb,
  "individual_reports" jsonb,
  "ai_report_enabled" boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS "idx_tasting_ai_reports_tasting" ON "tasting_ai_reports" ("tasting_id");
