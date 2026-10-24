-- Migration 084: Add Missing Student Profiling Columns and Update active_class_rosters
-- Description:
-- 1. Adds student_phone, prev_school, indigenous, birth_cert_no, and assistive_device columns to public.students
-- 2. Refreshes public.active_class_rosters view to expose all newly added canonical columns

BEGIN;

-- 1. Add missing student profiling columns
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_phone TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS prev_school TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS indigenous TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS birth_cert_no TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS assistive_device TEXT;

-- 2. Recreate active_class_rosters view so s.* includes the new columns cleanly
DROP VIEW IF EXISTS public.active_class_rosters CASCADE;

CREATE OR REPLACE VIEW public.active_class_rosters WITH (security_invoker = true) AS
SELECT 
    e.class_id AS enrollment_class_id, 
    c.name AS class_name, 
    c.academic_year_id,
    c.teacher_id,
    e.enrollment_status AS current_enrollment_status,
    e.desk_number,
    e.room_number,
    s.*
FROM public.student_enrollments e
JOIN public.classes c ON c.id = e.class_id
JOIN public.students s ON s.id = e.student_id
WHERE s.is_active = true 
  AND c.is_archived = false
  AND (e.enrollment_status = 'active' OR e.enrollment_status = 'enrolled' OR e.enrollment_status IS NULL);

COMMIT;
