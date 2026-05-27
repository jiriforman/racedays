-- Broaden sources.discipline constraint to include sub-disciplines used by onboarding workflow
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_discipline_check;
ALTER TABLE sources ADD CONSTRAINT sources_discipline_check
  CHECK (discipline IN ('obstacle', 'bike', 'bike_road', 'bike_mtb', 'bike_gravel', 'running', 'triathlon', 'mixed'));

-- Admin policies: authenticated role = admin (only admin can sign in; no public sign-up)
-- RLS policies are OR'd: anon gets restricted access, authenticated gets full access

CREATE POLICY "races_admin_all" ON races
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "sources_admin_all" ON sources
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "scrape_logs_admin_read" ON scrape_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "config_admin_write" ON config
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
