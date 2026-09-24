-- 26_dashboard_indexes.sql
BEGIN;

-- Indexes for 'classes'
CREATE INDEX IF NOT EXISTS idx_classes_academic_year_id ON classes(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_classes_is_archived ON classes(is_archived);

-- Indexes for 'students' demographics and risk factors
CREATE INDEX IF NOT EXISTS idx_students_dropout_risk ON students(dropout_risk) WHERE dropout_risk = true;
CREATE INDEX IF NOT EXISTS idx_students_is_slow_learner ON students(is_slow_learner) WHERE is_slow_learner = true;
CREATE INDEX IF NOT EXISTS idx_students_is_active ON students(is_active);

-- Indexes for 'grades'
CREATE INDEX IF NOT EXISTS idx_grades_class_id ON grades(class_id);
CREATE INDEX IF NOT EXISTS idx_grades_period ON grades(period);

-- Indexes for 'attendance_records'
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);

-- Composite index for fast dashboard lookups spanning class_id and date
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance_records(class_id, date);

COMMIT;
