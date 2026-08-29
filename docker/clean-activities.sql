-- ==========================================================
-- CLEAN & REFRESH ACTIVITIES, AUDIT LOGS, AND SCHOOL DETAILS
-- ==========================================================

DELETE FROM public.audit_logs;
INSERT INTO public.audit_logs (user_id, action, type, details, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000012', 'បានកត់ត្រាវត្តមានសិស្សថ្នាក់ ១២A', 'attendance', '{"present": 24, "absent": 2}'::jsonb, NOW() - INTERVAL '5 minute'),
  ('00000000-0000-0000-0000-000000000012', 'បានបញ្ចូលពិន្ទុប្រចាំឆមាសទី១ សម្រាប់ថ្នាក់ ១២A', 'grade', '{"period": "sem1-summary"}'::jsonb, NOW() - INTERVAL '15 minute'),
  ('00000000-0000-0000-0000-000000000001', 'បានបង្កើតគណនីគ្រូបន្ទុកថ្នាក់ថ្មី (ICT Admin)', 'user_management', '{"role": "teacher"}'::jsonb, NOW() - INTERVAL '30 minute'),
  ('00000000-0000-0000-0000-000000000012', 'បានចុះសួរសុខទុក្ខ និងធ្វើកិច្ចសន្យាសិស្សនៅផ្ទះ', 'support', '{"student": "ទិត្យ សារឿន"}'::jsonb, NOW() - INTERVAL '1 hour'),
  ('00000000-0000-0000-0000-000000000002', 'បានអនុម័តរបាយការណ៍សកម្មភាព GEIP ៣.៣.១.៣', 'report', '{"status": "approved"}'::jsonb, NOW() - INTERVAL '2 hour');

UPDATE public.schools 
SET name = 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង' 
WHERE id = 'main-school';
