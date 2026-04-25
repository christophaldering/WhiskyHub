-- Migration: add story_prompt column to tastings
-- This stores the optional host-written context that guides AI story generation

ALTER TABLE tastings ADD COLUMN IF NOT EXISTS story_prompt TEXT;
