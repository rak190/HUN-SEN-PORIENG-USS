-- 11_add_grades_status_and_constraints.sql

-- 1. Add the missing status column to the grades table
ALTER TABLE grades
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published'));

-- 2. Supabase UPSERT relies on an explicit UNIQUE constraint.
-- Currently, we only have a unique index `idx_grades_student_period`.
-- We will drop the index (if it exists) and recreate it as a formal constraint to allow .upsert() to work correctly.

DROP INDEX IF EXISTS idx_grades_student_period;

ALTER TABLE grades
ADD CONSTRAINT grades_student_period_key UNIQUE (student_id, period);
