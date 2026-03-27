DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='journal_entries' AND column_name='abv' AND data_type='text') THEN
    UPDATE "journal_entries" SET "abv" = REPLACE("abv", '%', '') WHERE "abv" LIKE '%\%%';
    UPDATE "journal_entries" SET "abv" = NULL WHERE "abv" !~ '^-?[0-9]+([.,][0-9]+)?$';
    ALTER TABLE "journal_entries" ALTER COLUMN "abv" TYPE real USING NULLIF(REPLACE("abv", ',', '.'), '')::real;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='journal_entries' AND column_name='price' AND data_type='text') THEN
    UPDATE "journal_entries" SET "price" = REPLACE("price", '%', '') WHERE "price" LIKE '%\%%';
    UPDATE "journal_entries" SET "price" = NULL WHERE "price" !~ '^-?[0-9]+([.,][0-9]+)?$';
    ALTER TABLE "journal_entries" ALTER COLUMN "price" TYPE real USING NULLIF(REPLACE("price", ',', '.'), '')::real;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='benchmark_entries' AND column_name='abv' AND data_type='text') THEN
    UPDATE "benchmark_entries" SET "abv" = REPLACE("abv", '%', '') WHERE "abv" LIKE '%\%%';
    UPDATE "benchmark_entries" SET "abv" = NULL WHERE "abv" !~ '^-?[0-9]+([.,][0-9]+)?$';
    ALTER TABLE "benchmark_entries" ALTER COLUMN "abv" TYPE real USING NULLIF(REPLACE("abv", ',', '.'), '')::real;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whiskybase_collection' AND column_name='abv' AND data_type='text') THEN
    UPDATE "whiskybase_collection" SET "abv" = REPLACE("abv", '%', '') WHERE "abv" LIKE '%\%%';
    UPDATE "whiskybase_collection" SET "abv" = NULL WHERE "abv" !~ '^-?[0-9]+([.,][0-9]+)?$';
    ALTER TABLE "whiskybase_collection" ALTER COLUMN "abv" TYPE real USING NULLIF(REPLACE("abv", ',', '.'), '')::real;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wishlist_entries' AND column_name='abv' AND data_type='text') THEN
    UPDATE "wishlist_entries" SET "abv" = REPLACE("abv", '%', '') WHERE "abv" LIKE '%\%%';
    UPDATE "wishlist_entries" SET "abv" = NULL WHERE "abv" !~ '^-?[0-9]+([.,][0-9]+)?$';
    ALTER TABLE "wishlist_entries" ALTER COLUMN "abv" TYPE real USING NULLIF(REPLACE("abv", ',', '.'), '')::real;
  END IF;
END $$;

ALTER TABLE "wishlist_entries" ADD COLUMN IF NOT EXISTS "country" text;
