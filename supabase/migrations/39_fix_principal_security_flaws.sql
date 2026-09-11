-- 39_fix_principal_security_flaws.sql
BEGIN;

-- 1. ENSURE HELPER FUNCTIONS EXIST
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id::text = auth.uid()::text
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_principal()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id::text = auth.uid()::text
    AND role = 'principal'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_school_id()
RETURNS TEXT AS $$
  SELECT school_id FROM profiles WHERE id::text = auth.uid()::text;
$$ LANGUAGE sql SECURITY DEFINER;


-- 2. SECURE PROFILES RLS (Prevent Global PII Leak)
-- We are dropping the overly permissive rule from Migration 24
DROP POLICY IF EXISTS "Profiles viewable by self or admin" ON profiles;
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON profiles;

-- Create strict read access: 
-- 1. Users can see their own profile
-- 2. Admins can see all profiles
-- 3. Principals can only see profiles within their own school
CREATE POLICY "Profiles select scope" ON profiles FOR SELECT USING (
  auth.uid()::text = id::text OR 
  is_admin() OR 
  (is_principal() AND school_id = user_school_id())
);


-- 3. EXTEND SCHOOLS TABLE FOR ISOLATED SETTINGS (Prevent Global Config Overwrite)
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS principal_name TEXT,
ADD COLUMN IF NOT EXISTS principal_phone TEXT,
ADD COLUMN IF NOT EXISTS ict_lead_name TEXT,
ADD COLUMN IF NOT EXISTS ict_lead_phone TEXT,
ADD COLUMN IF NOT EXISTS ict_lead_email TEXT,
ADD COLUMN IF NOT EXISTS smc_head_name TEXT,
ADD COLUMN IF NOT EXISTS smc_head_phone TEXT,
ADD COLUMN IF NOT EXISTS water_supply TEXT,
ADD COLUMN IF NOT EXISTS electricity TEXT,
ADD COLUMN IF NOT EXISTS internet TEXT;

-- 4. MIGRATE EXISTING SETTINGS FROM SYSTEM_SETTINGS
-- Copy from the global system_settings JSON blob into the primary school
DO $$
DECLARE
  v_school_info JSONB;
BEGIN
  SELECT value INTO v_school_info 
  FROM system_settings 
  WHERE key = 'school_info' 
  LIMIT 1;

  IF v_school_info IS NOT NULL THEN
    UPDATE schools SET
      name = COALESCE(v_school_info->>'schoolName', name),
      code = COALESCE(v_school_info->>'schoolCode', code),
      address = COALESCE(v_school_info->>'village', '') || ' ' || COALESCE(v_school_info->>'commune', '') || ' ' || COALESCE(v_school_info->>'district', '') || ' ' || COALESCE(v_school_info->>'province', ''),
      principal_name = v_school_info->>'principalName',
      principal_phone = v_school_info->>'principalPhone',
      ict_lead_name = v_school_info->>'ictLeadName',
      ict_lead_phone = v_school_info->>'ictLeadPhone',
      ict_lead_email = v_school_info->>'ictLeadEmail',
      smc_head_name = v_school_info->>'smcHeadName',
      smc_head_phone = v_school_info->>'smcHeadPhone',
      water_supply = v_school_info->>'waterSupply',
      electricity = v_school_info->>'electricity',
      internet = v_school_info->>'internet'
    WHERE id = 'main-school';
  END IF;
END $$;

COMMIT;
