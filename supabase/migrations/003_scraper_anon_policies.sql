-- Allow anon key (n8n scraper) to read active sources
CREATE POLICY "sources_anon_read_active" ON sources
  FOR SELECT TO anon
  USING (status = 'active');

-- Allow anon key (n8n source onboarding webhook) to insert pending sources
CREATE POLICY "sources_anon_insert_pending" ON sources
  FOR INSERT TO anon
  WITH CHECK (status = 'pending');

-- Allow anon key (n8n scraper) to upsert official scraped races
CREATE POLICY "races_scraper_insert" ON races
  FOR INSERT TO anon
  WITH CHECK (source_id IS NOT NULL AND is_official = true AND approval_status = 'approved');

CREATE POLICY "races_scraper_update" ON races
  FOR UPDATE TO anon
  USING (source_id IS NOT NULL AND is_official = true)
  WITH CHECK (source_id IS NOT NULL AND is_official = true AND approval_status = 'approved');

-- Allow anon key (n8n scraper) to write scrape logs
CREATE POLICY "scrape_logs_anon_insert" ON scrape_logs
  FOR INSERT TO anon
  WITH CHECK (true);
