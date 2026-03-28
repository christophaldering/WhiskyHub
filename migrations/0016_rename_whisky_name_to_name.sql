DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='journal_entries' AND column_name='whisky_name') THEN
    ALTER TABLE "journal_entries" RENAME COLUMN "whisky_name" TO "name";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='benchmark_entries' AND column_name='whisky_name') THEN
    ALTER TABLE "benchmark_entries" RENAME COLUMN "whisky_name" TO "name";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wishlist_entries' AND column_name='whisky_name') THEN
    ALTER TABLE "wishlist_entries" RENAME COLUMN "whisky_name" TO "name";
  END IF;
END $$;
