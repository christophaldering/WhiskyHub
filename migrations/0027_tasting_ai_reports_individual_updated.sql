-- Migration: Add individual_reports_updated_at to tasting_ai_reports.
-- Used by the participant "Surprise" panel on Meine Welt and the "Neu" badge on
-- the tasting list to detect when a host has newly published or refreshed
-- individual KI analyses.

ALTER TABLE "tasting_ai_reports"
  ADD COLUMN IF NOT EXISTS "individual_reports_updated_at" timestamp;
