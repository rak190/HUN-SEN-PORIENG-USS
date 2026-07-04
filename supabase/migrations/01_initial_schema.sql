-- Create normalized PostgreSQL tables for KruAI Classroom Website

-- 1. Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'principal', 'admin')),
  school_id TEXT NOT NULL DEFAULT 'main-school',
  school_code TEXT NOT NULL DEFAULT 'porieng-2026',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Schools Table
CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  principal_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default School
INSERT INTO schools (id, name, code)
VALUES ('main-school', 'វិទ្យាល័យហ៊ុនសែនពោធិ៍រៀង', 'Porieng-2026')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 3. Classes Table
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL DEFAULT 'main-school',
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  subjects JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Students Table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id_number TEXT,
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('M', 'F', 'ប្រុស', 'ស្រី')),
  dob DATE,
  parent_phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Attendance Records Table (Realtime sync enabled)
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'permission', 'P', 'A', 'L', 'E')),
  note TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id, date)
);

-- 6. Grades Table
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  period_id TEXT NOT NULL,
  score_knowledge NUMERIC DEFAULT 0,
  score_skill NUMERIC DEFAULT 0,
  score_attitude NUMERIC DEFAULT 0,
  total_score NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id, subject_id, period_id)
);

-- 7. AI Generations Table (Lesson Plans, Quizzes, Worksheets)
CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('lesson_plan', 'quiz', 'worksheet')),
  title TEXT NOT NULL,
  content_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row-Level Security (RLS) on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

-- Create Open Policies for Authenticated Classroom Users
CREATE POLICY "Allow read/write access to profiles for authenticated users" ON profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read/write access to schools for authenticated users" ON schools FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read/write access to classes for authenticated users" ON classes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read/write access to students for authenticated users" ON students FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read/write access to attendance_records for authenticated users" ON attendance_records FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read/write access to grades for authenticated users" ON grades FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read/write access to ai_generations for authenticated users" ON ai_generations FOR ALL USING (auth.role() = 'authenticated');

-- Enable Supabase Realtime publication on attendance_records
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;
