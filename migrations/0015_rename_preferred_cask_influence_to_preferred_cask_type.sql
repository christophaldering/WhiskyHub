DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_cask_influence'
  ) THEN
    ALTER TABLE profiles RENAME COLUMN preferred_cask_influence TO preferred_cask_type;
  END IF;
END $$;
