-- 40_fix_student_enrollment_rls.sql
BEGIN;

-- 1. ENSURE HELPER FUNCTIONS EXIST
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()::uuid
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_principal()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()::uuid
    AND role = 'principal'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_school_id()
RETURNS TEXT AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid()::uuid;
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. SECURE STUDENTS RLS (Support progressive registration via student_enrollments)
DROP POLICY IF EXISTS "Students select scope" ON students;

CREATE POLICY "Students select scope" ON students FOR SELECT USING (
  is_admin() OR 
  (class_id IN (SELECT id FROM classes WHERE school_id = user_school_id())) OR
  EXISTS (
    SELECT 1 FROM student_enrollments e
    JOIN classes c ON c.id = e.class_id
    WHERE e.student_id = students.id AND c.school_id = user_school_id()
  )
);

DROP POLICY IF EXISTS "Students manage scope" ON students;

CREATE POLICY "Students manage scope" ON students FOR ALL USING (
  is_admin() OR 
  (class_id IN (SELECT id FROM classes WHERE school_id = user_school_id())) OR
  EXISTS (
    SELECT 1 FROM student_enrollments e
    JOIN classes c ON c.id = e.class_id
    WHERE e.student_id = students.id AND c.school_id = user_school_id()
  )
) WITH CHECK (
  is_admin() OR 
  (class_id IN (SELECT id FROM classes WHERE school_id = user_school_id())) OR
  EXISTS (
    SELECT 1 FROM student_enrollments e
    JOIN classes c ON c.id = e.class_id
    WHERE e.student_id = students.id AND c.school_id = user_school_id()
  )
);

COMMIT;
