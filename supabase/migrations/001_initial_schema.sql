-- sources: scraped race listing sites + manually suggested sources
CREATE TABLE sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  discipline text NOT NULL CHECK (discipline IN ('obstacle', 'bike', 'mixed')),
  scrape_frequency text NOT NULL DEFAULT 'weekly' CHECK (scrape_frequency IN ('daily', 'weekly')),
  last_scraped_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive', 'failed')),
  ai_model text,
  submitted_by text,
  sample_races jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- races: individual race events
CREATE TABLE races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES sources(id) ON DELETE SET NULL,
  title text NOT NULL,
  date_start date NOT NULL,
  date_end date,
  location_name text NOT NULL,
  country char(2) NOT NULL DEFAULT 'CZ',
  lat decimal,
  lng decimal,
  discipline text NOT NULL CHECK (discipline IN ('obstacle', 'bike_road', 'bike_mtb', 'bike_gravel')),
  is_kids_friendly boolean NOT NULL DEFAULT false,
  min_age int,
  max_age int,
  distances jsonb,
  registration_url text,
  source_url text,
  organizer text,
  description text,
  image_url text,
  approval_status text NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending_review', 'approved', 'rejected')),
  is_official boolean NOT NULL DEFAULT true,
  submitted_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- scrape_logs: audit log per scraper run
CREATE TABLE scrape_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES sources(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  races_found int NOT NULL DEFAULT 0,
  races_new int NOT NULL DEFAULT 0,
  races_updated int NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- config: runtime-changeable key-value settings
CREATE TABLE config (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX races_date_start_idx ON races(date_start);
CREATE INDEX races_country_idx ON races(country);
CREATE INDEX races_discipline_idx ON races(discipline);
CREATE INDEX races_kids_idx ON races(is_kids_friendly);
CREATE INDEX races_approval_idx ON races(approval_status);
CREATE INDEX races_geo_idx ON races(lat, lng);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER races_updated_at
  BEFORE UPDATE ON races
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER config_updated_at
  BEFORE UPDATE ON config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- public: read approved races only
CREATE POLICY "races_public_read" ON races
  FOR SELECT USING (approval_status = 'approved');

-- public: insert races (manual submission) — approval_status must be pending_review
CREATE POLICY "races_public_submit" ON races
  FOR INSERT WITH CHECK (approval_status = 'pending_review');

-- public: read active sources
CREATE POLICY "sources_public_read" ON sources
  FOR SELECT USING (status = 'active');

-- public: insert source suggestions
CREATE POLICY "sources_public_suggest" ON sources
  FOR INSERT WITH CHECK (status = 'pending');

-- public: read config
CREATE POLICY "config_public_read" ON config
  FOR SELECT USING (true);

-- seed config defaults
INSERT INTO config (key, value, description) VALUES
  ('ai_model', 'claude-sonnet-4-6', 'Default Claude model ID for HTML extraction'),
  ('ai_extraction_enabled', 'true', 'Global toggle for AI-based race extraction');

-- seed initial sources
INSERT INTO sources (name, url, discipline, status) VALUES
  ('Spartan Race CZ/SK', 'https://www.spartanrace.com/en/race/find?country=CZ', 'obstacle', 'active'),
  ('Predator Race', 'https://predatorrace.cz/zavody/', 'obstacle', 'active'),
  ('Kolo pro život', 'https://www.koloprozivot.cz/zavody/', 'bike', 'active');
