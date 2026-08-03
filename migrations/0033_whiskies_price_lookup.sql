-- Smart-Import Preis-Nachladen: UVP + aktueller Marktpreis (Websuche) am Whisky.
ALTER TABLE "whiskies" ADD COLUMN IF NOT EXISTS "price_rrp" real;
ALTER TABLE "whiskies" ADD COLUMN IF NOT EXISTS "price_market" real;
ALTER TABLE "whiskies" ADD COLUMN IF NOT EXISTS "price_currency" text;
