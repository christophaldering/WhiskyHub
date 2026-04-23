ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "login_link_token" text;
ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "login_link_expiry" timestamp;
