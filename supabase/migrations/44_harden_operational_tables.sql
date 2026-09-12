-- Migration: 44_harden_operational_tables.sql
-- Description: Add academic_year_id to operational tables to isolate data by year.

BEGIN;

-- 1. Add academic_year_id to grades
ALTER TABLE grades ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE;

UPDATE grades g
SET academic_year_id = c.academic_year_id
FROM classes c
WHERE g.class_id = c.id AND g.academic_year_id IS NULL;

-- Note: We assume all grades have valid classes with academic_year_id.
-- If any exist without, we delete them or leave null if possible, but we want to enforce NOT NULL.
DELETE FROM grades WHERE academic_year_id IS NULL;
ALTER TABLE grades ALTER COLUMN academic_year_id SET NOT NULL;

-- Drop the dangerous student/period constraint and add the year dimension
DROP INDEX IF EXISTS idx_grades_student_period;
ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_student_id_period_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_grades_student_period_year ON grades(student_id, period, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_grades_academic_year ON grades(academic_year_id);

-- 2. Add academic_year_id to attendance_records
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE;

UPDATE attendance_records ar
SET academic_year_id = c.academic_year_id
FROM classes c
WHERE ar.class_id = c.id AND ar.academic_year_id IS NULL;

DELETE FROM attendance_records WHERE academic_year_id IS NULL;
ALTER TABLE attendance_records ALTER COLUMN academic_year_id SET NOT NULL;

-- Replace UNIQUE constraint on attendance records to include academic_year_id
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_class_id_student_id_date_key;
ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_student_date_year_key UNIQUE (student_id, date, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_attendance_academic_year ON attendance_records(academic_year_id);

-- 3. Add academic_year_id to student_health_records
ALTER TABLE student_health_records ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE;

UPDATE student_health_records shr
SET academic_year_id = c.academic_year_id
FROM classes c
WHERE shr.class_id = c.id AND shr.academic_year_id IS NULL;

DELETE FROM student_health_records WHERE academic_year_id IS NULL;
ALTER TABLE student_health_records ALTER COLUMN academic_year_id SET NOT NULL;

ALTER TABLE student_health_records DROP CONSTRAINT IF EXISTS unique_student_health_date;
ALTER TABLE student_health_records ADD CONSTRAINT student_health_records_student_date_year_key UNIQUE (student_id, recorded_date, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_health_academic_year ON student_health_records(academic_year_id);

COMMIT;
