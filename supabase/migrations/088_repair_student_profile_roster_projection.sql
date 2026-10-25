-- Repair installations where newer student profile fields are absent or not exposed by the view.
-- Add columns without rewriting existing student/enrollment history or dropping view dependencies.
BEGIN;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS student_phone TEXT,
  ADD COLUMN IF NOT EXISTS prev_school TEXT,
  ADD COLUMN IF NOT EXISTS indigenous TEXT,
  ADD COLUMN IF NOT EXISTS birth_cert_no TEXT,
  ADD COLUMN IF NOT EXISTS assistive_device TEXT,
  ADD COLUMN IF NOT EXISTS migrant_status TEXT;

CREATE OR REPLACE VIEW public.active_class_rosters WITH (security_invoker = true) AS
SELECT e.class_id AS enrollment_class_id, c.name AS class_name, c.academic_year_id,
  c.teacher_id, e.enrollment_status AS current_enrollment_status, e.desk_number, e.room_number, s.*
FROM public.student_enrollments e
JOIN public.classes c ON c.id = e.class_id
JOIN public.students s ON s.id = e.student_id
WHERE s.is_active = true AND c.is_archived = false
  AND (e.enrollment_status IN ('active', 'enrolled') OR e.enrollment_status IS NULL);

NOTIFY pgrst, 'reload schema';
COMMIT;
