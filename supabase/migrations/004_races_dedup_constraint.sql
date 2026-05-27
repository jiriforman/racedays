-- Remove fake hallucinated test data from pre-RLS test runs
DELETE FROM races WHERE source_id IS NULL AND is_official = true AND submitted_by IS NULL;

-- Add unique constraint for proper scraper deduplication.
-- NULL != NULL in PostgreSQL unique constraints, so manually-submitted races
-- (source_id IS NULL) can still coexist even with the same title/date.
ALTER TABLE races
  ADD CONSTRAINT races_source_dedup UNIQUE (source_id, title, date_start);

-- Fix bad seed: szmb.sk is a Bratislava choir website, not Slovak MTB racing.
-- Remove the source so it doesn't waste AI extraction budget on the wrong site.
DELETE FROM sources WHERE name = 'Slovak Orienteering MTB' AND url = 'https://www.szmb.sk/';
