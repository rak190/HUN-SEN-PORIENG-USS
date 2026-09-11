-- 40_fix_student_enrollment_rls.sql
BEGIN;

-- 1. SECURE STUDENTS RLS (Support progressive registration via student_enrollments)
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
