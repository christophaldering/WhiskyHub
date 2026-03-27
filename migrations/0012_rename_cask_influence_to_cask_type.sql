DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whiskies' AND column_name = 'cask_influence'
  ) THEN
    ALTER TABLE whiskies RENAME COLUMN cask_influence TO cask_type;
  END IF;
END $$;
