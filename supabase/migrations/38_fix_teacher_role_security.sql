-- 38_fix_teacher_role_security.sql
BEGIN;

-- 1. ENSURE HELPER FUNCTIONS EXIST
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_principal()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'principal'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. DROP EXISTING FLAWED POLICY
DROP POLICY IF EXISTS "Classes manage scope" ON classes;

-- 2. RECREATE POLICY WITH TENANT ISOLATION FOR TEACHERS
CREATE POLICY "Classes manage scope" ON classes FOR ALL USING (
  is_admin() OR 
  (is_principal() AND school_id = user_school_id()) OR 
  (teacher_id = auth.uid() AND school_id = user_school_id())
) WITH CHECK (
  is_admin() OR 
  (is_principal() AND school_id = user_school_id()) OR 
  (teacher_id = auth.uid() AND school_id = user_school_id())
);

COMMIT;
