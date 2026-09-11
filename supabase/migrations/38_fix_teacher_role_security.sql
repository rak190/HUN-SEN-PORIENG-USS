-- 38_fix_teacher_role_security.sql
BEGIN;

-- 1. DROP EXISTING FLAWED POLICY
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
