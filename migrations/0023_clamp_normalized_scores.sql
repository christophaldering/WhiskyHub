-- Clamp existing normalized rating scores to the valid [0, 100] range.
-- Historical rows may contain values >100 due to missing clamps in
-- normalization paths. This is a one-time data correction; idempotent.
UPDATE ratings SET normalized_score = 100 WHERE normalized_score > 100;
UPDATE ratings SET normalized_score = 0   WHERE normalized_score < 0;
UPDATE ratings SET normalized_nose  = 100 WHERE normalized_nose  > 100;
UPDATE ratings SET normalized_nose  = 0   WHERE normalized_nose  < 0;
UPDATE ratings SET normalized_taste = 100 WHERE normalized_taste > 100;
UPDATE ratings SET normalized_taste = 0   WHERE normalized_taste < 0;
UPDATE ratings SET normalized_finish = 100 WHERE normalized_finish > 100;
UPDATE ratings SET normalized_finish = 0   WHERE normalized_finish < 0;
