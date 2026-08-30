-- Migration 29: User Lifecycle Consistency

-- 1. Add is_archived column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- 2. Diagnostic View: Mismatched Enrollments
CREATE OR REPLACE VIEW public.diagnostic_enrollment_mismatch AS
SELECT 
    s.id AS student_id,
    s.name_kh,
    s.class_id AS students_table_class_id,
    c1.name AS students_table_class_name,
    se.class_id AS enrollments_table_class_id,
    c2.name AS enrollments_table_class_name,
    se.academic_year_id
FROM public.students s
LEFT JOIN public.student_enrollments se 
  ON s.id = se.student_id AND se.status = 'active'
LEFT JOIN public.classes c1 ON s.class_id = c1.id
LEFT JOIN public.classes c2 ON se.class_id = c2.id
WHERE s.class_id IS DISTINCT FROM se.class_id;

-- 3. Diagnostic View: Orphaned Profiles
CREATE OR REPLACE VIEW public.diagnostic_orphaned_profiles AS
SELECT p.id, p.username, p.full_name
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;
