-- ==============================================================================
-- 🏫 HUN SEN PORIENG UPPER SECONDARY SCHOOL - MASTER DATABASE SETUP SCRIPT
-- ==============================================================================
-- Run this entire script in your Supabase Project -> SQL Editor -> Run
-- This creates all tables, indexes, RLS policies, triggers, and seed data.
-- It is 100% idempotent (safe to run multiple times without data loss).
-- ==============================================================================

BEGIN;

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Schools Table
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(100),
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Profiles Table (Users & Teachers)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  full_name_en VARCHAR(255),
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'principal', 'teacher', 'monitor')),
  school_code VARCHAR(50) DEFAULT 'Porieng-2026',
  avatar_url TEXT,
  phone VARCHAR(50),
  subject VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subject VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 4. Create Academic Years Table
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Classes Table
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  grade VARCHAR(10) NOT NULL,
  track VARCHAR(50) DEFAULT 'ទូទៅ',
  shift VARCHAR(50) DEFAULT 'ព្រឹក',
  room VARCHAR(50),
  room_number VARCHAR(50),
  subjects JSONB DEFAULT '[]'::jsonb,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE classes ADD COLUMN IF NOT EXISTS room_number VARCHAR(50);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS room VARCHAR(50);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS shift VARCHAR(50) DEFAULT 'ព្រឹក';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS track VARCHAR(50) DEFAULT 'ទូទៅ';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- 6. Create Students Master Table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  student_id_number VARCHAR(50),
  full_name VARCHAR(255) NOT NULL,
  full_name_latin VARCHAR(255),
  gender VARCHAR(10) NOT NULL,
  dob DATE,
  pob TEXT,
  current_address TEXT,
  father_name VARCHAR(255),
  father_job VARCHAR(255),
  mother_name VARCHAR(255),
  mother_job VARCHAR(255),
  parent_phone VARCHAR(50),
  poverty_status VARCHAR(50) DEFAULT 'none',
  is_slow_learner BOOLEAN DEFAULT FALSE,
  dropout_risk BOOLEAN DEFAULT FALSE,
  desk_number VARCHAR(50),
  room_number VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  is_active BOOLEAN DEFAULT TRUE,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE students ADD COLUMN IF NOT EXISTS desk_number VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS room_number VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS poverty_status VARCHAR(50) DEFAULT 'none';
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_slow_learner BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS dropout_risk BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- 7. Create Student Enrollments (Multi-Year Historical Preservation)
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

-- 8. Create Grades Table
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  period VARCHAR(50) NOT NULL,
  scores JSONB DEFAULT '{}'::jsonb,
  total_score NUMERIC(7, 2),
  average_score NUMERIC(7, 2),
  rank INTEGER,
  grade_letter VARCHAR(10),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, class_id, period)
);

ALTER TABLE grades ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- 9. Create Grade Snapshots (Rollback & Backup)
CREATE TABLE IF NOT EXISTS grade_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period VARCHAR(50) NOT NULL,
  academic_year VARCHAR(50) NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  snapshot_data JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Create Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'permission', 'late', 'P', 'A', 'E', 'L')),
  reason TEXT,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, class_id, date)
);

-- 10.5 Create Monthly Attendance Summaries Table
CREATE TABLE IF NOT EXISTS monthly_attendance_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  month VARCHAR(20) NOT NULL,
  absent_count INTEGER DEFAULT 0,
  permission_count INTEGER DEFAULT 0,
  late_count INTEGER DEFAULT 0,
  root_cause TEXT,
  needs_home_visit BOOLEAN DEFAULT FALSE,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id, month)
);

-- 11. Create Student Health Records Table
CREATE TABLE IF NOT EXISTS student_health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  height_cm NUMERIC(5, 2),
  weight_kg NUMERIC(5, 2),
  bmi NUMERIC(5, 2),
  vision_left VARCHAR(50) DEFAULT 'ធម្មតា',
  vision_right VARCHAR(50) DEFAULT 'ធម្មតា',
  hearing VARCHAR(50) DEFAULT 'ធម្មតា',
  dental_status VARCHAR(50) DEFAULT 'ធម្មតា',
  chronic_illness TEXT,
  disability_status TEXT,
  nutrition_status VARCHAR(50) DEFAULT 'normal',
  recorded_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Create Support Cases (GEIP Early Warning & Intervention)
CREATE TABLE IF NOT EXISTS support_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  opened_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'attendance',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'monitoring', 'resolved', 'dropped_out')),
  summary TEXT NOT NULL,
  next_follow_up_at DATE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Create Support Interventions & Remedial Tracking
CREATE TABLE IF NOT EXISTS support_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES support_cases(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL DEFAULT 'note',
  action_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NOT NULL,
  outcome TEXT,
  follow_up_at DATE,
  evidence_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Create Home Visits Table
CREATE TABLE IF NOT EXISTS home_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  visit_date DATE NOT NULL,
  reason TEXT NOT NULL,
  family_situation TEXT,
  findings TEXT,
  agreements TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Create Parent Contacts Table
CREATE TABLE IF NOT EXISTS parent_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  contact_type VARCHAR(50) NOT NULL DEFAULT 'phone_call',
  contact_date DATE NOT NULL DEFAULT CURRENT_DATE,
  contacted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  parent_name VARCHAR(255),
  parent_phone VARCHAR(50),
  topic TEXT NOT NULL,
  notes TEXT,
  agreement TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Create Activity Logs Table (Homeroom Dashboard Activity)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  activity_type VARCHAR(50) NOT NULL DEFAULT 'notice',
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Create Documents & GEIP Evidence Table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(50),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Create System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. High Performance Indexes
CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON classes(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_active ON students(is_active);
CREATE INDEX IF NOT EXISTS idx_enrollment_student ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_class ON student_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_year ON student_enrollments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_class ON grades(student_id, class_id);
CREATE INDEX IF NOT EXISTS idx_grades_period ON grades(period);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance_records(class_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_monthly_att_class_month ON monthly_attendance_summaries(class_id, month);
CREATE INDEX IF NOT EXISTS idx_support_student ON support_cases(student_id);
CREATE INDEX IF NOT EXISTS idx_support_class ON support_cases(class_id);
CREATE INDEX IF NOT EXISTS idx_support_status ON support_cases(status);
CREATE INDEX IF NOT EXISTS idx_activity_class ON activity_logs(class_id);

-- 21. Enable Row Level Security (RLS)
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_attendance_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 22. Create Permissive Policies for Authenticated & Public Access
DROP POLICY IF EXISTS "Public schools read" ON schools;
CREATE POLICY "Public schools read" ON schools FOR ALL USING (true);

DROP POLICY IF EXISTS "Public profiles access" ON profiles;
CREATE POLICY "Public profiles access" ON profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Public academic_years access" ON academic_years;
CREATE POLICY "Public academic_years access" ON academic_years FOR ALL USING (true);

DROP POLICY IF EXISTS "Public classes access" ON classes;
CREATE POLICY "Public classes access" ON classes FOR ALL USING (true);

DROP POLICY IF EXISTS "Public students access" ON students;
CREATE POLICY "Public students access" ON students FOR ALL USING (true);

DROP POLICY IF EXISTS "Public enrollments access" ON student_enrollments;
CREATE POLICY "Public enrollments access" ON student_enrollments FOR ALL USING (true);

DROP POLICY IF EXISTS "Public grades access" ON grades;
CREATE POLICY "Public grades access" ON grades FOR ALL USING (true);

DROP POLICY IF EXISTS "Public snapshots access" ON grade_snapshots;
CREATE POLICY "Public snapshots access" ON grade_snapshots FOR ALL USING (true);

DROP POLICY IF EXISTS "Public attendance access" ON attendance_records;
CREATE POLICY "Public attendance access" ON attendance_records FOR ALL USING (true);

DROP POLICY IF EXISTS "Public monthly attendance access" ON monthly_attendance_summaries;
CREATE POLICY "Public monthly attendance access" ON monthly_attendance_summaries FOR ALL USING (true);

DROP POLICY IF EXISTS "Public health access" ON student_health_records;
CREATE POLICY "Public health access" ON student_health_records FOR ALL USING (true);

DROP POLICY IF EXISTS "Public support cases access" ON support_cases;
CREATE POLICY "Public support cases access" ON support_cases FOR ALL USING (true);

DROP POLICY IF EXISTS "Public interventions access" ON support_interventions;
CREATE POLICY "Public interventions access" ON support_interventions FOR ALL USING (true);

DROP POLICY IF EXISTS "Public home visits access" ON home_visits;
CREATE POLICY "Public home visits access" ON home_visits FOR ALL USING (true);

DROP POLICY IF EXISTS "Public parent contacts access" ON parent_contacts;
CREATE POLICY "Public parent contacts access" ON parent_contacts FOR ALL USING (true);

DROP POLICY IF EXISTS "Public activity logs access" ON activity_logs;
CREATE POLICY "Public activity logs access" ON activity_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Public documents access" ON documents;
CREATE POLICY "Public documents access" ON documents FOR ALL USING (true);

DROP POLICY IF EXISTS "Public system settings access" ON system_settings;
CREATE POLICY "Public system settings access" ON system_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Public audit logs access" ON audit_logs;
CREATE POLICY "Public audit logs access" ON audit_logs FOR ALL USING (true);

-- ==============================================================================
-- 23. SEED INITIAL DATA (School, Academic Year, Classes, Staff Profiles)
-- ==============================================================================

-- 23.1 School
INSERT INTO schools (id, code, name, name_en, address, phone)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Porieng-2026',
  'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង',
  'Hun Sen Porieng Upper Secondary School',
  'ឃុំពោធិ៍រៀង ស្រុកពោធិ៍រៀង ខេត្តព្រៃវែង',
  '012 345 678'
) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- 23.2 Academic Year
INSERT INTO academic_years (id, name, start_date, end_date, is_active)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '២០២៥-២០២៦',
  '2025-10-01',
  '2026-08-31',
  TRUE
) ON CONFLICT (name) DO UPDATE SET is_active = TRUE;

-- 23.3 Staff Profiles (Admin, Principal, Teachers, Monitor)
INSERT INTO profiles (id, school_id, username, full_name, role, school_code, subject)
VALUES
  ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'admin_porieng', 'លោកគ្រូ ICT ពោធិ៍រៀង (Admin)', 'admin', 'Porieng-2026', 'ICT'),
  ('00000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'principal_porieng', 'លោកនាយក វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង', 'principal', 'Porieng-2026', 'គ្រប់គ្រង'),
  ('00000000-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', 'teacher_12a', 'លោកគ្រូ/អ្នកគ្រូ បន្ទុកថ្នាក់ ១២ ក', 'teacher', 'Porieng-2026', 'គណិតវិទ្យា'),
  ('00000000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 'teacher_11a', 'លោកគ្រូ/អ្នកគ្រូ បន្ទុកថ្នាក់ ១១ ក', 'teacher', 'Porieng-2026', 'ភាសាខ្មែរ'),
  ('00000000-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'teacher_10a', 'លោកគ្រូ/អ្នកគ្រូ បន្ទុកថ្នាក់ ១០ ក', 'teacher', 'Porieng-2026', 'រូបវិទ្យា'),
  ('00000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'teacher_9a', 'លោកគ្រូ/អ្នកគ្រូ បន្ទុកថ្នាក់ ៩ ក', 'teacher', 'Porieng-2026', 'គីមីវិទ្យា'),
  ('00000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'teacher_8a', 'លោកគ្រូ/អ្នកគ្រូ បន្ទុកថ្នាក់ ៨ ក', 'teacher', 'Porieng-2026', 'ជីវវិទ្យា'),
  ('00000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'teacher_7a', 'លោកគ្រូ/អ្នកគ្រូ បន្ទុកថ្នាក់ ៧ ក', 'teacher', 'Porieng-2026', 'ប្រវត្តិវិទ្យា'),
  ('00000000-0000-0000-0000-000000000099', '11111111-1111-1111-1111-111111111111', 'monitor', 'ប្រធានថ្នាក់ (Class Monitor)', 'monitor', 'Porieng-2026', 'វត្តមាន')
ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- 23.4 Initial Classes
INSERT INTO classes (id, school_id, academic_year_id, teacher_id, name, grade, track, shift, room, room_number)
VALUES
  ('33333333-3333-3333-3333-333333333312', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000012', '12 ក', '12', 'វិទ្យាសាស្ត្រពិត', 'ព្រឹក', 'បន្ទប់ ១២', '12A'),
  ('33333333-3333-3333-3333-333333333311', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000011', '11 ក', '11', 'វិទ្យាសាស្ត្រពិត', 'ព្រឹក', 'បន្ទប់ ១១', '11A'),
  ('33333333-3333-3333-3333-333333333310', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000010', '10 ក', '10', 'ទូទៅ', 'ព្រឹក', 'បន្ទប់ ១០', '10A'),
  ('33333333-3333-3333-3333-333333333309', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000009', '9 ក', '9', 'ទូទៅ', 'រសៀល', 'បន្ទប់ ៩', '9A'),
  ('33333333-3333-3333-3333-333333333308', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000008', '8 ក', '8', 'ទូទៅ', 'រសៀល', 'បន្ទប់ ៨', '8A'),
  ('33333333-3333-3333-3333-333333333307', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000007', '7 ក', '7', 'ទូទៅ', 'រសៀល', 'បន្ទប់ ៧', '7A')
ON CONFLICT (id) DO NOTHING;

COMMIT;
