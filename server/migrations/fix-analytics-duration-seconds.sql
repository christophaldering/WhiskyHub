-- Migration: Add duration_seconds column to user_activity_sessions and page_views
-- Issue: Analytics dashboard endpoint crashed with "column duration_seconds does not exist"
-- Date: 2026-03-26
-- Applied via: drizzle-kit push + manual backfill

-- Step 1: Add duration_seconds to user_activity_sessions (idempotent)
ALTER TABLE user_activity_sessions ADD COLUMN IF NOT EXISTS duration_seconds integer;

-- Step 2: Add duration_seconds to page_views (idempotent)
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS duration_seconds integer;

-- Step 3: Backfill duration_seconds from duration_minutes for existing rows
UPDATE user_activity_sessions
SET duration_seconds = duration_minutes * 60
WHERE duration_seconds IS NULL
  AND duration_minutes IS NOT NULL
  AND duration_minutes > 0;
