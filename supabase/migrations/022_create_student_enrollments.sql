-- 22_create_student_enrollments.sql
-- Description: Create student_enrollments table to preserve historical class rosters, desk/room numbers, and promotion records across academic years.

BEGIN;

-- 1. Create student_enrollments table
CREATE TABLE IF NOT EXISTS student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  desk_number VARCHAR(50),
  room_number VARCHAR(50),
  enrollment_status VARCHAR(50) DEFAULT 'active' CHECK (enrollment_status IN ('active', 'transferred_out', 'dropped_out', 'graduated', 'suspended')),
  year_result VARCHAR(50) DEFAULT 'enrolled' CHECK (year_result IN ('enrolled', 'promoted', 'retained', 'transferred', 'graduated', 'dropped')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, academic_year_id)
);

-- 2. Indexes for high-speed lookups
CREATE INDEX IF NOT EXISTS idx_enrollment_student_id ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_class_id ON student_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_academic_year_id ON student_enrollments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_status ON student_enrollments(enrollment_status);

-- 3. Enable RLS
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enrollments viewable by authenticated users" ON student_enrollments;
CREATE POLICY "Enrollments viewable by authenticated users"
ON student_enrollments FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins and teachers can manage enrollments" ON student_enrollments;
CREATE POLICY "Admins and teachers can manage enrollments"
ON student_enrollments FOR ALL
USING (auth.role() = 'authenticated');

-- 4. Initial Backfill: Map existing students into student_enrollments based on their active class
DO $$
DECLARE
    default_year_id UUID;
BEGIN
    SELECT id INTO default_year_id FROM academic_years WHERE is_active = TRUE LIMIT 1;
    IF default_year_id IS NULL THEN
        SELECT id INTO default_year_id FROM academic_years ORDER BY created_at DESC LIMIT 1;
    END IF;

    IF default_year_id IS NOT NULL THEN
        INSERT INTO student_enrollments (student_id, class_id, academic_year_id, desk_number, room_number, enrollment_status)
        SELECT 
            s.id,
            s.class_id,
            COALESCE(c.academic_year_id, default_year_id),
            s.desk_number,
            s.room_number,
            COALESCE(s.status, 'active')
        FROM students s
        LEFT JOIN classes c ON c.id = s.class_id
        WHERE s.class_id IS NOT NULL
        ON CONFLICT (student_id, academic_year_id) DO NOTHING;
    END IF;
END $$;

COMMIT;
