-- Migration 080: Harden active_class_rosters view to exclude archived classes
-- Description:
-- 1. Updates public.active_class_rosters view to require c.is_archived = false
-- 2. Ensures archived classes and their historical students never leak into active roster views
-- 3. Retains c.academic_year_id column for page-level academic year filtering

BEGIN;

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
