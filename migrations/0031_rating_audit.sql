-- Migration: add rating_audit table
-- Records who created/updated a rating, when, and what the prior values were.
-- Currently written by the host backfill endpoint (POST /api/tastings/:id/host-ratings).

CREATE TABLE IF NOT EXISTS rating_audit (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id varchar,
  tasting_id varchar NOT NULL,
  participant_id varchar NOT NULL,
  whisky_id varchar NOT NULL,
  actor_participant_id varchar NOT NULL,
  action text NOT NULL,
  source text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rating_audit_tasting
  ON rating_audit (tasting_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rating_audit_rating
  ON rating_audit (rating_id);
CREATE INDEX IF NOT EXISTS idx_rating_audit_participant
  ON rating_audit (tasting_id, participant_id);
