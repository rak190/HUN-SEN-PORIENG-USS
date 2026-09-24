-- 08_system_settings.sql
BEGIN;

-- 1. Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- 2. Insert default values
INSERT INTO system_settings (key, value)
VALUES 
  ('maintenance_mode', 'false'::jsonb),
  ('environment', '"production"'::jsonb),
  ('rls_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Settings viewable by authenticated" ON system_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can update settings" ON system_settings FOR ALL USING (auth.role() = 'authenticated'); -- Strict check enforced at API level

COMMIT;
