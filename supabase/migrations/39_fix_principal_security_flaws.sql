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
  SELECT school_id::text FROM profiles WHERE id::text = auth.uid()::text;
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
  (is_principal() AND school_id::text = user_school_id())
);


-- 3. EXTEND SCHOOLS TABLE FOR ISOLATED SETTINGS
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS principal_name TEXT,
ADD COLUMN IF NOT EXISTS principal_phone TEXT,
ADD COLUMN IF NOT EXISTS ict_lead_name TEXT,
ADD COLUMN IF NOT EXISTS ict_lead_phone TEXT,
ADD COLUMN IF NOT EXISTS academic_year TEXT,
ADD COLUMN IF NOT EXISTS semester TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT;

COMMIT;
