-- source_url no longer needs to be unique: sites like Predator Race list all
-- events on one page, giving every race the same source_url. Deduplication
-- is now handled by races_source_dedup (source_id, title, date_start).
DROP INDEX IF EXISTS races_source_url_key;
