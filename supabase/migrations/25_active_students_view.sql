-- 25_active_students_view.sql
BEGIN;

CREATE OR REPLACE VIEW active_students AS
SELECT * FROM students WHERE is_active = true;

-- We also want to give a view for class rosters
CREATE OR REPLACE VIEW active_class_rosters AS
SELECT c.id as class_id, c.name as class_name, c.academic_year_id, s.*
FROM classes c
JOIN students s ON c.id = s.class_id
WHERE s.is_active = true;

COMMIT;
