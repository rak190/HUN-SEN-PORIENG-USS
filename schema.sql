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
-- Create Grades Table
DROP TABLE IF EXISTS grades CASCADE;

CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    period TEXT NOT NULL, -- e.g., 'sem-1', 'oct'
    scores JSONB NOT NULL DEFAULT '{}'::jsonb, -- dynamic subject scores
    total_score NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Index for fast lookups by student and period
CREATE UNIQUE INDEX idx_grades_student_period ON grades(student_id, period);
CREATE INDEX idx_grades_class_period ON grades(class_id, period);

-- Setup RLS
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users"
    ON grades FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert/update for admins and principals"
    ON grades FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'principal')
        )
    );

CREATE POLICY "Enable insert/update for teachers"
    ON grades FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = grades.class_id
            AND classes.teacher_id = auth.uid()
        )
    );
-- Add desk_number to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS desk_number TEXT;

-- Create home_visits table
CREATE TABLE IF NOT EXISTS home_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'pending', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE home_visits ENABLE ROW LEVEL SECURITY;

-- Create RLS Policy
CREATE POLICY "Allow read/write access to home_visits for authenticated users" 
ON home_visits FOR ALL USING (auth.role() = 'authenticated');
-- Migration: 03_create_health_records.sql
-- Description: Table for tracking student health screenings (GEIP 3.3.1.3 Eye & Ear Tests, BMI, etc.)

CREATE TABLE IF NOT EXISTS student_health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(5,2),
  height_cm NUMERIC(5,2),
  bmi NUMERIC(4,2),
  vision_left TEXT, -- e.g. '6/6', '6/12', 'មានបញ្ហា', 'ធម្មតា'
  vision_right TEXT,
  hearing TEXT, -- e.g. 'ធម្មតា', 'ពិបាកស្តាប់', 'ថ្លង់ម្ខាង'
  dental TEXT, -- e.g. 'ល្អ', 'ពុកធ្មេញ', 'ត្រូវការជួសជុល'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_student_health_date UNIQUE (student_id, recorded_date)
);

-- Indexing for fast queries by class and date
CREATE INDEX IF NOT EXISTS idx_health_records_class_date ON student_health_records(class_id, recorded_date);
CREATE INDEX IF NOT EXISTS idx_health_records_student ON student_health_records(student_id);

-- Enable RLS
ALTER TABLE student_health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read health records" ON student_health_records
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert/update health records" ON student_health_records
  FOR ALL USING (auth.role() = 'authenticated');
-- Migration: Expand Students Table for UI Compatibility
-- Adds missing demographic, academic, health, and family fields

ALTER TABLE students
  -- Demographics
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS english_name TEXT,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS emergency_phone TEXT,
  
  -- Academic
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('new', 'repeater', 'transfer')),
  ADD COLUMN IF NOT EXISTS scholarship TEXT CHECK (scholarship IN ('yes', 'no')),
  ADD COLUMN IF NOT EXISTS id_poor TEXT CHECK (id_poor IN ('none', 'level_1', 'level_2')),
  ADD COLUMN IF NOT EXISTS learning_difficulty TEXT,
  
  -- Family / Socio-Economic
  ADD COLUMN IF NOT EXISTS family_condition TEXT,
  ADD COLUMN IF NOT EXISTS income NUMERIC,
  ADD COLUMN IF NOT EXISTS housing TEXT,
  ADD COLUMN IF NOT EXISTS orphan TEXT CHECK (orphan IN ('yes', 'no')),
  ADD COLUMN IF NOT EXISTS siblings_count INTEGER,
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC,
  
  -- Health
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS height_m NUMERIC,
  ADD COLUMN IF NOT EXISTS bmi NUMERIC,
  ADD COLUMN IF NOT EXISTS nutrition_status TEXT,
  ADD COLUMN IF NOT EXISTS disability TEXT CHECK (disability IN ('none', 'mild', 'severe')),
  ADD COLUMN IF NOT EXISTS health_note TEXT,
  
  -- Risk & Tracking
  ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS score_average NUMERIC,
  ADD COLUMN IF NOT EXISTS score_rank INTEGER,
  ADD COLUMN IF NOT EXISTS behavior_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS teacher_notes JSONB DEFAULT '[]'::jsonb;
-- Create documents table for storing file metadata uploaded to Cloudflare R2

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('excel', 'word', 'pdf', 'archive', 'image', 'other')),
  file_url TEXT NOT NULL, -- This will store the R2 object_key
  size TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'upload' CHECK (category IN ('upload', 'export', 'template')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policies
-- Teachers can view documents for their classes
CREATE POLICY "Users can view documents for their school/class" 
ON documents FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
  )
);

-- Teachers can insert documents
CREATE POLICY "Users can insert documents" 
ON documents FOR INSERT 
TO authenticated 
WITH CHECK (
  uploader_id = auth.uid()
);

-- Teachers can delete their own documents
CREATE POLICY "Users can delete their own documents" 
ON documents FOR DELETE 
TO authenticated 
USING (
  uploader_id = auth.uid()
);
-- 05_expand_giep_fields.sql
-- Description: Expand schemas to support GIEP Google Sheet data format

-- 1. Extend Profiles (Teachers/Staff) table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subject_specialty text,
ADD COLUMN IF NOT EXISTS qualification_level text,
ADD COLUMN IF NOT EXISTS ministry_id text,
ADD COLUMN IF NOT EXISTS is_giep_trained boolean DEFAULT false;

-- 2. Extend Students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS scholarship_status text,
ADD COLUMN IF NOT EXISTS special_needs_status text,
ADD COLUMN IF NOT EXISTS transfer_history jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS giep_device_received boolean DEFAULT false;

-- 3. Create School Infrastructure table
CREATE TABLE IF NOT EXISTS school_infrastructure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  name_kh text NOT NULL,
  name_en text,
  province_code text,
  district_code text,
  commune_code text,
  village_code text,
  total_classrooms integer DEFAULT 0,
  total_computers integer DEFAULT 0,
  has_internet boolean DEFAULT false,
  academic_year text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for the new table
ALTER TABLE school_infrastructure ENABLE ROW LEVEL SECURITY;

-- Policies for school_infrastructure
DROP POLICY IF EXISTS "Admins have full access to school infrastructure" ON school_infrastructure;
CREATE POLICY "Admins have full access to school infrastructure"
ON school_infrastructure FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'principal')
  )
);

DROP POLICY IF EXISTS "All authenticated users can view school infrastructure" ON school_infrastructure;
CREATE POLICY "All authenticated users can view school infrastructure"
ON school_infrastructure FOR SELECT
USING (auth.role() = 'authenticated');
-- 06_secure_rls_policies.sql
BEGIN;

-- Helper function to check if user is admin or principal (Bypasses RLS on profiles to avoid recursion)
CREATE OR REPLACE FUNCTION is_admin_or_principal()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'principal')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Drop the overly permissive policies if they exist
DROP POLICY IF EXISTS "Allow read/write access to profiles for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow read/write access to schools for authenticated users" ON schools;
DROP POLICY IF EXISTS "Allow read/write access to classes for authenticated users" ON classes;
DROP POLICY IF EXISTS "Allow read/write access to students for authenticated users" ON students;
DROP POLICY IF EXISTS "Allow read/write access to attendance_records for authenticated users" ON attendance_records;
DROP POLICY IF EXISTS "Allow read/write access to grades for authenticated users" ON grades;
DROP POLICY IF EXISTS "Allow read/write access to ai_generations for authenticated users" ON ai_generations;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Schools viewable by all" ON schools;
DROP POLICY IF EXISTS "Classes viewable by all" ON classes;
DROP POLICY IF EXISTS "Teachers can update own classes" ON classes;
DROP POLICY IF EXISTS "Students viewable by all" ON students;
DROP POLICY IF EXISTS "Teachers can modify students in their class" ON students;
DROP POLICY IF EXISTS "Attendance viewable by all" ON attendance_records;
DROP POLICY IF EXISTS "Teachers can modify attendance in their class" ON attendance_records;
DROP POLICY IF EXISTS "Grades viewable by all" ON grades;
DROP POLICY IF EXISTS "Teachers can modify grades in their class" ON grades;
DROP POLICY IF EXISTS "Users can manage own AI generations" ON ai_generations;

-- 2. Profiles: Users can read all, update their own. Admins can update all.
CREATE POLICY "Profiles viewable by everyone" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin_or_principal());
CREATE POLICY "Admins insert profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id OR is_admin_or_principal());
CREATE POLICY "Admins delete profile" ON profiles FOR DELETE USING (is_admin_or_principal());

-- 3. Schools: Viewable by all. Admins can insert/update/delete.
CREATE POLICY "Schools viewable by all" ON schools FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage schools" ON schools FOR ALL USING (is_admin_or_principal());

-- 4. Classes: Viewable by all. Teachers can update own classes. Admins/Principals full access.
CREATE POLICY "Classes viewable by all" ON classes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers can update own classes" ON classes FOR UPDATE USING (teacher_id = auth.uid() OR is_admin_or_principal());
CREATE POLICY "Admins can manage classes" ON classes FOR ALL USING (is_admin_or_principal());

-- 5. Students: Viewable by all. Teachers can insert/update in their classes.
CREATE POLICY "Students viewable by all" ON students FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers modify students in class" ON students FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM classes WHERE classes.id = students.class_id AND classes.teacher_id = auth.uid()
  )
);

-- 6. Attendance & Grades: Viewable by all. Teachers can only modify their own classes.
CREATE POLICY "Attendance viewable by all" ON attendance_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers modify attendance in class" ON attendance_records FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM classes WHERE classes.id = attendance_records.class_id AND classes.teacher_id = auth.uid()
  )
);

CREATE POLICY "Grades viewable by all" ON grades FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers modify grades in class" ON grades FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM classes WHERE classes.id = grades.class_id AND classes.teacher_id = auth.uid()
  )
);

-- 7. AI Generations: Users can read/write their own.
CREATE POLICY "Manage AI generations" ON ai_generations FOR ALL USING (teacher_id = auth.uid() OR is_admin_or_principal());

COMMIT;
-- 07_academic_years.sql
BEGIN;

-- 1. Create academic_years table
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL DEFAULT 'main-school' REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name)
);

-- 2. Add academic_year_id to classes table
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE;

-- 3. Insert default academic year and map existing classes
DO $$
DECLARE
    default_year_id UUID;
BEGIN
    -- Check if we already have the default year
    SELECT id INTO default_year_id FROM academic_years WHERE name = '2026-2027' AND school_id = 'main-school' LIMIT 1;
    
    -- If not, insert it
    IF default_year_id IS NULL THEN
        INSERT INTO academic_years (school_id, name, start_date, is_active, is_archived)
        VALUES ('main-school', '2026-2027', '2026-11-01', TRUE, FALSE)
        RETURNING id INTO default_year_id;
    END IF;

    -- Update existing classes that do not have an academic_year_id
    UPDATE classes SET academic_year_id = default_year_id WHERE academic_year_id IS NULL;
END $$;

-- 4. Enable RLS on academic_years
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;

-- 5. Policies for academic_years
CREATE POLICY "Academic years viewable by all" ON academic_years FOR SELECT USING (auth.role() = 'authenticated');
-- Only admins can modify academic years. Since we don't have a strict DB-level admin check in policies, 
-- we will enforce it at the API layer, but we can also use a subquery if we want.
-- For now, we will allow authenticated to insert/update, but strictly control it via API (Edge Middleware + API route check).
CREATE POLICY "Admins can manage academic years" ON academic_years FOR ALL USING (auth.role() = 'authenticated');

COMMIT;
-- 08_system_settings.sql
BEGIN;

-- 1. Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- 2. Insert default values
INSERT INTO system_settings (key, value)
VALUES 
  ('maintenance_mode', 'false'::jsonb),
  ('environment', '"production"'::jsonb),
  ('rls_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Settings viewable by authenticated" ON system_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can update settings" ON system_settings FOR ALL USING (auth.role() = 'authenticated'); -- Strict check enforced at API level

COMMIT;
-- 09_audit_logs.sql
BEGIN;

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Only authenticated users (admins usually) can view logs
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (auth.role() = 'authenticated');
-- Only service role or authenticated admins can insert
CREATE POLICY "Admins can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

COMMIT;
-- 09_class_details.sql
-- Enhance classes table with Cambodian MoEYS school administration fields
BEGIN;

-- 1. Add shift (វេនសិក្សា: ព្រឹក, រសៀល, ពេញមួយថ្ងៃ)
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS shift TEXT DEFAULT 'ព្រឹក' CHECK (shift IN ('ព្រឹក', 'រសៀល', 'ពេញមួយថ្ងៃ'));

-- 2. Add room_number (លេខបន្ទប់រៀន)
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS room_number TEXT;

-- 3. Add track (ផ្នែក: ទូទៅ, វិទ្យាសាស្ត្រពិត, វិទ្យាសាស្ត្រសង្គម)
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS track TEXT DEFAULT 'ទូទៅ' CHECK (track IN ('ទូទៅ', 'វិទ្យាសាស្ត្រពិត', 'វិទ្យាសាស្ត្រសង្គម'));

-- 4. Create index for fast filtering by shift and academic year
CREATE INDEX IF NOT EXISTS idx_classes_shift_year ON classes(academic_year_id, shift);

-- 5. Set sensible default shifts for existing classes if needed based on name or grade
UPDATE classes SET shift = 'រសៀល' WHERE grade IN ('7', '8', '9') AND (shift IS NULL OR shift = '');
UPDATE classes SET shift = 'ព្រឹក' WHERE grade IN ('10', '11', '12') AND (shift IS NULL OR shift = '');

COMMIT;
-- Add desk_number to students table for exam seating plans
ALTER TABLE students ADD COLUMN IF NOT EXISTS desk_number TEXT;
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
-- 12_add_class_is_archived.sql
BEGIN;

ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

COMMIT;
-- Add phone and subject to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT;
-- Migration: Add enrollment_status to students for GEIP exact tracking
-- Statuses: active, transferred_in, transferred_out, dropout, deceased

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS enrollment_status TEXT DEFAULT 'active' 
CHECK (enrollment_status IN ('active', 'transferred_in', 'transferred_out', 'dropout', 'deceased'));

-- Update existing students to 'active' if they are marked active
UPDATE students 
SET enrollment_status = 'active' 
WHERE is_active = true;

-- Update existing students to 'dropout' if they are inactive (as a fallback)
UPDATE students 
SET enrollment_status = 'dropout' 
WHERE is_active = false;
-- 15_support_and_parent_contacts.sql
-- Description: Create support cases, interventions, parent contacts, announcements, and update document constraints

-- 1. Support Cases Table
CREATE TABLE IF NOT EXISTS support_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  risk_type text NOT NULL, -- 'attendance', 'academic', 'behavior', 'health', 'financial'
  risk_level text NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status text NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Support Interventions Table
CREATE TABLE IF NOT EXISTS support_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES support_cases(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  intervention_type text NOT NULL, -- 'counseling', 'tutoring', 'home_visit', 'parent_meeting', 'financial_aid'
  description text,
  action_date date DEFAULT CURRENT_DATE,
  outcome text,
  conducted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Parent Contacts Table
CREATE TABLE IF NOT EXISTS parent_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  parent_name text NOT NULL,
  relationship text DEFAULT 'Guardian', -- 'Father', 'Mother', 'Guardian'
  phone_number text NOT NULL,
  notes text,
  last_contact_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Home Visits Table
CREATE TABLE IF NOT EXISTS home_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  observations text,
  status text DEFAULT 'completed',
  conducted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  target_role text DEFAULT 'all', -- 'all', 'teacher', 'student', 'principal'
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'published', -- 'draft', 'published', 'archived'
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 6. Update Documents Category Constraint to allow 'geip' & 'giep'
DO $$
BEGIN
  ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_check;
  ALTER TABLE documents ADD CONSTRAINT documents_category_check 
    CHECK (category IN ('upload', 'export', 'template', 'geip', 'giep'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 7. Enable RLS on all newly created tables
ALTER TABLE support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 8. Policies for Support & Parent Contacts
DROP POLICY IF EXISTS "Authenticated users full access to support cases" ON support_cases;
CREATE POLICY "Authenticated users full access to support cases"
ON support_cases FOR ALL
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users full access to support interventions" ON support_interventions;
CREATE POLICY "Authenticated users full access to support interventions"
ON support_interventions FOR ALL
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users full access to parent contacts" ON parent_contacts;
CREATE POLICY "Authenticated users full access to parent contacts"
ON parent_contacts FOR ALL
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users full access to home visits" ON home_visits;
CREATE POLICY "Authenticated users full access to home visits"
ON home_visits FOR ALL
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone authenticated can view announcements" ON announcements;
CREATE POLICY "Anyone authenticated can view announcements"
ON announcements FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins and principals can manage announcements" ON announcements;
CREATE POLICY "Admins and principals can manage announcements"
ON announcements FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'principal')
  )
);

-- 9. Monitor RLS on Attendance Records
DROP POLICY IF EXISTS "Monitors can insert attendance records" ON attendance_records;
CREATE POLICY "Monitors can insert attendance records"
ON attendance_records FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
-- Migration 19: Align Schema and Constraints for Full Application Compatibility
-- Fixes constraint mismatches in documents, support_cases, support_interventions, and parent_contacts

-- 1. Extend documents type and category constraints
ALTER TABLE documents 
  DROP CONSTRAINT IF EXISTS documents_type_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_type_check 
  CHECK (type IN ('excel', 'word', 'pdf', 'archive', 'image', 'activity_log', 'other'));

ALTER TABLE documents 
  DROP CONSTRAINT IF EXISTS documents_category_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_category_check 
  CHECK (category IN ('upload', 'export', 'template', 'geip', 'giep'));

-- 2. Align support_cases table columns to match application usage
ALTER TABLE support_cases
  ADD COLUMN IF NOT EXISTS school_id text,
  ADD COLUMN IF NOT EXISTS opened_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'attendance',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- Set default values for any legacy records
UPDATE support_cases 
SET category = COALESCE(category, risk_type, 'attendance'),
    priority = COALESCE(priority, risk_level, 'medium'),
    summary = COALESCE(summary, notes, '')
WHERE summary IS NULL;

-- 3. Align support_interventions table columns to match application usage
ALTER TABLE support_interventions
  ADD COLUMN IF NOT EXISTS action_type text DEFAULT 'note',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz;

UPDATE support_interventions
SET action_type = COALESCE(action_type, intervention_type, 'note'),
    notes = COALESCE(notes, description, '')
WHERE notes IS NULL;

-- 4. Align parent_contacts table columns to support interaction logging
ALTER TABLE parent_contacts
  ADD COLUMN IF NOT EXISTS contact_type text DEFAULT 'call',
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS agreement text,
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Make parent_name nullable if logging directly via student_id
ALTER TABLE parent_contacts 
  ALTER COLUMN parent_name DROP NOT NULL,
  ALTER COLUMN phone_number DROP NOT NULL;

-- 5. Add index on parent_contacts and support_cases for fast class/student lookups
CREATE INDEX IF NOT EXISTS idx_parent_contacts_student_id ON parent_contacts(student_id);
CREATE INDEX IF NOT EXISTS idx_support_cases_class_id ON support_cases(class_id);
CREATE INDEX IF NOT EXISTS idx_support_cases_student_id ON support_cases(student_id);
CREATE INDEX IF NOT EXISTS idx_support_interventions_case_id ON support_interventions(case_id);
-- ====================================================================
-- Migration 20: Create Grade Snapshots for Master Scores Rollback & Safety
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.grade_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  snapshot_label TEXT NOT NULL,
  records_count INTEGER NOT NULL DEFAULT 0,
  grades_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying by period and timestamp
CREATE INDEX IF NOT EXISTS idx_grade_snapshots_period ON public.grade_snapshots(period);
CREATE INDEX IF NOT EXISTS idx_grade_snapshots_created_at ON public.grade_snapshots(created_at DESC);

-- Enable RLS
ALTER TABLE public.grade_snapshots ENABLE ROW LEVEL SECURITY;

-- Admins and Principals have full access to grade snapshots
CREATE POLICY "Admins and principals have full access to grade snapshots"
ON public.grade_snapshots
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'principal')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'principal')
  )
);
-- Migration: 21_add_student_room_number.sql
-- Description: Add room_number column to students table for Exam Room assignment

ALTER TABLE IF EXISTS public.students 
ADD COLUMN IF NOT EXISTS room_number VARCHAR(50);

-- Create index for faster querying by room number
CREATE INDEX IF NOT EXISTS idx_students_room_number ON public.students(room_number);

-- Update RLS if applicable
COMMENT ON COLUMN public.students.room_number IS 'លេខបន្ទប់ប្រឡងប្រចាំខែ ឬបន្ទប់រៀនរបស់សិស្ស';
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
-- 23_rls_hardening.sql
BEGIN;

-- Helper function to check if user is admin or principal securely
CREATE OR REPLACE FUNCTION is_admin_or_principal()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'principal')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Enable RLS on ALL tables explicitly to be absolutely sure
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_infrastructure ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_records ENABLE ROW LEVEL SECURITY;

-- 1. DROP ALL EXISTING POLICIES FROM ALL TABLES TO AVOID CONFLICTS
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END
$$;

-- 2. APPLY STRICT RLS POLICIES

-- Profiles
CREATE POLICY "Profiles viewable by everyone" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin_or_principal());
CREATE POLICY "Admins insert profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id OR is_admin_or_principal());
CREATE POLICY "Admins delete profile" ON profiles FOR DELETE USING (is_admin_or_principal());

-- Schools
CREATE POLICY "Schools viewable by all" ON schools FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage schools" ON schools FOR ALL USING (is_admin_or_principal());

-- Classes
CREATE POLICY "Classes viewable by all" ON classes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers can update own classes" ON classes FOR UPDATE USING (teacher_id = auth.uid() OR is_admin_or_principal());
CREATE POLICY "Admins can manage classes" ON classes FOR ALL USING (is_admin_or_principal());

-- Students
CREATE POLICY "Students viewable by all" ON students FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers modify students in class" ON students FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = students.class_id AND classes.teacher_id = auth.uid())
);

-- Attendance & Grades
CREATE POLICY "Attendance viewable by all" ON attendance_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers modify attendance in class" ON attendance_records FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = attendance_records.class_id AND classes.teacher_id = auth.uid())
);

CREATE POLICY "Grades viewable by all" ON grades FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers modify grades in class" ON grades FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grades.class_id AND classes.teacher_id = auth.uid())
);

CREATE POLICY "Grade records viewable by all" ON grade_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers modify grade records in class" ON grade_records FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grade_records.class_id AND classes.teacher_id = auth.uid())
);

-- Documents
CREATE POLICY "Documents viewable by all" ON documents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers manage own documents" ON documents FOR ALL USING (uploader_id = auth.uid() OR is_admin_or_principal());

-- Health Records, Home Visits, Support Cases, Interventions, Parent Contacts
CREATE POLICY "Health viewable by all" ON student_health_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers modify health in class" ON student_health_records FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_health_records.class_id AND classes.teacher_id = auth.uid())
);

CREATE POLICY "Visits viewable by all" ON home_visits FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers modify visits in class" ON home_visits FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = home_visits.student_id AND classes.teacher_id = auth.uid())
);

CREATE POLICY "Support cases viewable by all" ON support_cases FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers modify support cases in class" ON support_cases FOR ALL USING (
  is_admin_or_principal() OR teacher_id = auth.uid()
);

CREATE POLICY "Interventions viewable by all" ON support_interventions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers modify interventions in class" ON support_interventions FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM support_cases WHERE support_cases.id = support_interventions.case_id AND support_cases.teacher_id = auth.uid())
);

CREATE POLICY "Parent contacts viewable by all" ON parent_contacts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers modify parent contacts in class" ON parent_contacts FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = parent_contacts.student_id AND classes.teacher_id = auth.uid())
);

-- System Settings & Audits
CREATE POLICY "Settings viewable by all" ON system_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage settings" ON system_settings FOR ALL USING (is_admin_or_principal());

CREATE POLICY "Audits viewable by all" ON audit_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage audits" ON audit_logs FOR ALL USING (is_admin_or_principal());

-- Academic Years & Enrollments
CREATE POLICY "Academic years viewable by all" ON academic_years FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage academic years" ON academic_years FOR ALL USING (is_admin_or_principal());

CREATE POLICY "Enrollments viewable by all" ON student_enrollments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers modify enrollments in class" ON student_enrollments FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_enrollments.class_id AND classes.teacher_id = auth.uid())
);

-- School Infrastructure
CREATE POLICY "Infrastructure viewable by all" ON school_infrastructure FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage infrastructure" ON school_infrastructure FOR ALL USING (is_admin_or_principal());

-- Grade Snapshots
CREATE POLICY "Snapshots viewable by all" ON grade_snapshots FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage snapshots" ON grade_snapshots FOR ALL USING (is_admin_or_principal());

-- AI Generations
CREATE POLICY "Manage AI generations" ON ai_generations FOR ALL USING (teacher_id = auth.uid() OR is_admin_or_principal());

-- Announcements
CREATE POLICY "Announcements viewable by all" ON announcements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage announcements" ON announcements FOR ALL USING (is_admin_or_principal());

COMMIT;
-- 24_strict_rls_policies.sql
BEGIN;

-- 1. DROP ALL EXISTING POLICIES FROM ALL TABLES TO REPLACE 23_rls_hardening.sql
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END
$$;

-- 2. APPLY STRICT RLS POLICIES (No more blanket SELECTs)

-- Profiles
CREATE POLICY "Profiles viewable by self or admin" ON profiles FOR SELECT USING (
  auth.uid() = id OR is_admin_or_principal()
);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin_or_principal());
CREATE POLICY "Admins insert profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id OR is_admin_or_principal());
CREATE POLICY "Admins delete profile" ON profiles FOR DELETE USING (is_admin_or_principal());

-- Schools
CREATE POLICY "Schools viewable by all" ON schools FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage schools" ON schools FOR ALL USING (is_admin_or_principal());

-- Classes
CREATE POLICY "Classes viewable by all" ON classes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers can update own classes" ON classes FOR UPDATE USING (teacher_id = auth.uid() OR is_admin_or_principal()) WITH CHECK (teacher_id = auth.uid() OR is_admin_or_principal());
CREATE POLICY "Admins can manage classes" ON classes FOR ALL USING (is_admin_or_principal());

-- Students
CREATE POLICY "Students viewable by assigned teacher or admin" ON students FOR SELECT USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = students.class_id AND classes.teacher_id = auth.uid())
);
CREATE POLICY "Teachers modify students in class" ON students FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = students.class_id AND classes.teacher_id = auth.uid())
) WITH CHECK (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = students.class_id AND classes.teacher_id = auth.uid())
);

-- Attendance & Grades
CREATE POLICY "Attendance viewable by assigned teacher or admin" ON attendance_records FOR SELECT USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = attendance_records.class_id AND classes.teacher_id = auth.uid())
);
CREATE POLICY "Teachers modify attendance in class" ON attendance_records FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = attendance_records.class_id AND classes.teacher_id = auth.uid())
) WITH CHECK (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = attendance_records.class_id AND classes.teacher_id = auth.uid())
);

CREATE POLICY "Grades viewable by assigned teacher or admin" ON grades FOR SELECT USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grades.class_id AND classes.teacher_id = auth.uid())
);
CREATE POLICY "Teachers modify grades in class" ON grades FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grades.class_id AND classes.teacher_id = auth.uid())
) WITH CHECK (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grades.class_id AND classes.teacher_id = auth.uid())
);

CREATE POLICY "Grade records viewable by assigned teacher or admin" ON grade_records FOR SELECT USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grade_records.class_id AND classes.teacher_id = auth.uid())
);
CREATE POLICY "Teachers modify grade records in class" ON grade_records FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grade_records.class_id AND classes.teacher_id = auth.uid())
) WITH CHECK (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grade_records.class_id AND classes.teacher_id = auth.uid())
);

-- Documents
CREATE POLICY "Documents viewable by uploader or admin" ON documents FOR SELECT USING (
  uploader_id = auth.uid() OR is_admin_or_principal()
);
CREATE POLICY "Teachers manage own documents" ON documents FOR ALL USING (uploader_id = auth.uid() OR is_admin_or_principal()) WITH CHECK (uploader_id = auth.uid() OR is_admin_or_principal());

-- Health Records, Home Visits, Support Cases, Interventions, Parent Contacts
CREATE POLICY "Health viewable by assigned teacher or admin" ON student_health_records FOR SELECT USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_health_records.class_id AND classes.teacher_id = auth.uid())
);
CREATE POLICY "Teachers modify health in class" ON student_health_records FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_health_records.class_id AND classes.teacher_id = auth.uid())
) WITH CHECK (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_health_records.class_id AND classes.teacher_id = auth.uid())
);

CREATE POLICY "Visits viewable by assigned teacher or admin" ON home_visits FOR SELECT USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = home_visits.student_id AND classes.teacher_id = auth.uid())
);
CREATE POLICY "Teachers modify visits in class" ON home_visits FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = home_visits.student_id AND classes.teacher_id = auth.uid())
) WITH CHECK (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = home_visits.student_id AND classes.teacher_id = auth.uid())
);

CREATE POLICY "Support cases viewable by assigned teacher or admin" ON support_cases FOR SELECT USING (
  is_admin_or_principal() OR teacher_id = auth.uid()
);
CREATE POLICY "Teachers modify support cases in class" ON support_cases FOR ALL USING (
  is_admin_or_principal() OR teacher_id = auth.uid()
) WITH CHECK (
  is_admin_or_principal() OR teacher_id = auth.uid()
);

CREATE POLICY "Interventions viewable by assigned teacher or admin" ON support_interventions FOR SELECT USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM support_cases WHERE support_cases.id = support_interventions.case_id AND support_cases.teacher_id = auth.uid())
);
CREATE POLICY "Teachers modify interventions in class" ON support_interventions FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM support_cases WHERE support_cases.id = support_interventions.case_id AND support_cases.teacher_id = auth.uid())
) WITH CHECK (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM support_cases WHERE support_cases.id = support_interventions.case_id AND support_cases.teacher_id = auth.uid())
);

CREATE POLICY "Parent contacts viewable by assigned teacher or admin" ON parent_contacts FOR SELECT USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = parent_contacts.student_id AND classes.teacher_id = auth.uid())
);
CREATE POLICY "Teachers modify parent contacts in class" ON parent_contacts FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = parent_contacts.student_id AND classes.teacher_id = auth.uid())
) WITH CHECK (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = parent_contacts.student_id AND classes.teacher_id = auth.uid())
);

-- System Settings & Audits (CRITICAL FIX)
CREATE POLICY "Settings viewable by admins only" ON system_settings FOR SELECT USING (is_admin_or_principal());
CREATE POLICY "Admins manage settings" ON system_settings FOR ALL USING (is_admin_or_principal());

CREATE POLICY "Audits viewable by admins only" ON audit_logs FOR SELECT USING (is_admin_or_principal());
CREATE POLICY "Admins manage audits" ON audit_logs FOR ALL USING (is_admin_or_principal());

-- Academic Years & Enrollments
CREATE POLICY "Academic years viewable by all" ON academic_years FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage academic years" ON academic_years FOR ALL USING (is_admin_or_principal());

CREATE POLICY "Enrollments viewable by assigned teacher or admin" ON student_enrollments FOR SELECT USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_enrollments.class_id AND classes.teacher_id = auth.uid())
);
CREATE POLICY "Teachers modify enrollments in class" ON student_enrollments FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_enrollments.class_id AND classes.teacher_id = auth.uid())
) WITH CHECK (
  is_admin_or_principal() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_enrollments.class_id AND classes.teacher_id = auth.uid())
);

-- School Infrastructure
CREATE POLICY "Infrastructure viewable by all" ON school_infrastructure FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage infrastructure" ON school_infrastructure FOR ALL USING (is_admin_or_principal());

-- Grade Snapshots
CREATE POLICY "Snapshots viewable by all" ON grade_snapshots FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage snapshots" ON grade_snapshots FOR ALL USING (is_admin_or_principal());

-- AI Generations
CREATE POLICY "Manage AI generations" ON ai_generations FOR ALL USING (teacher_id = auth.uid() OR is_admin_or_principal()) WITH CHECK (teacher_id = auth.uid() OR is_admin_or_principal());

-- Announcements
CREATE POLICY "Announcements viewable by all" ON announcements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage announcements" ON announcements FOR ALL USING (is_admin_or_principal());

COMMIT;
-- 24_transaction_safe_operations.sql
BEGIN;

-- 1. Stored Procedure for Migrating Academic Year
CREATE OR REPLACE FUNCTION migrate_academic_year(source_year_id UUID, target_year_id UUID)
RETURNS JSONB AS $$
DECLARE
    inserted_count INT := 0;
BEGIN
    IF source_year_id = target_year_id THEN
        RAISE EXCEPTION 'Source and Target Academic Years cannot be identical.';
    END IF;

    -- Insert classes from source year that do not exist in target year by name
    WITH inserted AS (
        INSERT INTO classes (school_id, teacher_id, name, grade, shift, room_number, track, academic_year_id)
        SELECT 
            c.school_id, 
            NULL, -- Reset teacher_id so old assignments do not leak into the new year
            c.name, 
            c.grade, 
            COALESCE(c.shift, CASE WHEN c.grade IN ('10', '11', '12') THEN 'ព្រឹក' ELSE 'រសៀល' END), 
            c.room_number, 
            COALESCE(c.track, 'ទូទៅ'), 
            target_year_id
        FROM classes c
        WHERE c.academic_year_id = source_year_id
        AND NOT EXISTS (
            SELECT 1 FROM classes t 
            WHERE t.academic_year_id = target_year_id 
            AND LOWER(TRIM(t.name)) = LOWER(TRIM(c.name))
        )
        RETURNING id
    )
    SELECT count(*) INTO inserted_count FROM inserted;

    RETURN jsonb_build_object(
        'success', true, 
        'count', inserted_count, 
        'message', CASE 
            WHEN inserted_count = 0 THEN 'ថ្នាក់រៀនទាំងអស់មានរួចហើយនៅក្នុងឆ្នាំសិក្សាគោលដៅ។'
            ELSE 'បានចម្លងរចនាសម្ព័ន្ធថ្នាក់រៀនចំនួន ' || inserted_count || ' ថ្នាក់ទៅឆ្នាំថ្មីជោគជ័យ!'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Stored Procedure for Promoting Students
CREATE OR REPLACE FUNCTION promote_students(source_class_id UUID, target_class_id UUID, admin_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    affected_count INT := 0;
    source_year_id UUID;
    target_year_id UUID;
    source_name TEXT;
    target_name TEXT;
BEGIN
    IF source_class_id = target_class_id THEN
        RAISE EXCEPTION 'Source and Target Classes cannot be the same.';
    END IF;

    SELECT academic_year_id, name INTO source_year_id, source_name FROM classes WHERE id = source_class_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'រកមិនឃើញថ្នាក់ប្រភពទេ (Source class not found).';
    END IF;

    SELECT academic_year_id, name INTO target_year_id, target_name FROM classes WHERE id = target_class_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'រកមិនឃើញថ្នាក់គោលដៅទេ (Target class not found).';
    END IF;

    -- Count active students
    SELECT count(*) INTO affected_count FROM students WHERE class_id = source_class_id AND is_active = true;

    IF affected_count = 0 THEN
        RAISE EXCEPTION 'មិនមានសិស្សនៅក្នុងថ្នាក់ប្រភពនេះទេ (No students to promote).';
    END IF;

    -- Upsert source enrollments (update year_result to 'promoted')
    IF source_year_id IS NOT NULL THEN
        INSERT INTO student_enrollments (student_id, class_id, academic_year_id, desk_number, room_number, enrollment_status, year_result, updated_at)
        SELECT id, source_class_id, source_year_id, desk_number, room_number, COALESCE(status, 'active'), 'promoted', NOW()
        FROM students WHERE class_id = source_class_id AND is_active = true
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET 
            year_result = 'promoted',
            updated_at = NOW();
    END IF;

    -- Upsert target enrollments
    IF target_year_id IS NOT NULL THEN
        INSERT INTO student_enrollments (student_id, class_id, academic_year_id, enrollment_status, year_result, updated_at)
        SELECT id, target_class_id, target_year_id, 'active', 'enrolled', NOW()
        FROM students WHERE class_id = source_class_id AND is_active = true
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET 
            class_id = EXCLUDED.class_id,
            year_result = 'enrolled',
            updated_at = NOW();
    END IF;

    -- Update active class_id on students table
    UPDATE students SET class_id = target_class_id, updated_at = NOW()
    WHERE class_id = source_class_id AND is_active = true;

    -- Insert audit log
    INSERT INTO audit_logs (user_id, action) 
    VALUES (admin_user_id, 'បានផ្ទេរ/ឡើងថ្នាក់សិស្សចំនួន ' || affected_count || ' នាក់ពី ' || source_name || ' ទៅ ' || target_name);

    RETURN jsonb_build_object(
        'success', true, 
        'count', affected_count, 
        'message', 'បានផ្ទេរ ឬឡើងថ្នាក់សិស្សចំនួន ' || affected_count || ' នាក់ពី ' || source_name || ' ទៅ ' || target_name || ' ដោយរក្សាទុកប្រវត្តិកំណត់ត្រាជោគជ័យ!'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
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
-- 27_current_head_hardening.sql
BEGIN;

-- 1. PROFILE RLS HARDENING (Phase 1, 5, 6)
-- A normal user must not update their own privileged fields
DROP POLICY IF EXISTS "Users update own profile" ON profiles;

-- We split the update policy into two parts via a TRIGGER or by simply forbidding
-- updates to privileged columns using a trigger because standard RLS policies
-- do not prevent specific columns from being updated unless we use WITH CHECK comparing OLD and NEW,
-- which isn't natively supported in all Postgres versions the same way without triggers.
-- The most robust way is a BEFORE UPDATE trigger for profiles.

CREATE OR REPLACE FUNCTION check_profile_update_privileges()
RETURNS TRIGGER AS $$
BEGIN
    -- If the user is an admin or principal, allow any change.
    -- We can use the existing `is_admin_or_principal()` function.
    IF is_admin_or_principal() THEN
        RETURN NEW;
    END IF;

    -- If the user is updating their own profile, ensure they aren't changing privileged fields.
    IF auth.uid() = OLD.id THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Forbidden: You cannot change your own role.';
        END IF;
        IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
            RAISE EXCEPTION 'Forbidden: You cannot change your assigned school.';
        END IF;
        IF NEW.school_code IS DISTINCT FROM OLD.school_code THEN
            RAISE EXCEPTION 'Forbidden: You cannot change your school code.';
        END IF;
        IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
            RAISE EXCEPTION 'Forbidden: You cannot change your active status.';
        END IF;
        IF NEW.username IS DISTINCT FROM OLD.username THEN
            RAISE EXCEPTION 'Forbidden: You cannot change your username.';
        END IF;
        RETURN NEW;
    END IF;

    -- If neither, they shouldn't be updating this row at all.
    RAISE EXCEPTION 'Forbidden: You do not have permission to update this profile.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_profile_privileges ON profiles;
CREATE TRIGGER enforce_profile_privileges
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION check_profile_update_privileges();

-- We can keep a simple policy to allow the UPDATE operation itself, the trigger handles column restrictions.
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin_or_principal());


-- 2. WITH CHECK CLAUSES FOR SENSITIVE TABLES (Phase 6)
-- We must drop the existing FOR ALL policies and replace them with strict USING and WITH CHECK policies
-- Examples: Grades, Attendance, Documents
DROP POLICY IF EXISTS "Teachers modify grades in class" ON grades;
CREATE POLICY "Teachers modify grades in class" ON grades FOR ALL 
USING (
  is_admin_or_principal() OR EXISTS (SELECT 1 FROM classes WHERE classes.id = grades.class_id AND classes.teacher_id = auth.uid())
)
WITH CHECK (
  is_admin_or_principal() OR EXISTS (SELECT 1 FROM classes WHERE classes.id = grades.class_id AND classes.teacher_id = auth.uid())
);

DROP POLICY IF EXISTS "Teachers modify attendance in class" ON attendance_records;
CREATE POLICY "Teachers modify attendance in class" ON attendance_records FOR ALL 
USING (
  is_admin_or_principal() OR EXISTS (SELECT 1 FROM classes WHERE classes.id = attendance_records.class_id AND classes.teacher_id = auth.uid())
)
WITH CHECK (
  is_admin_or_principal() OR EXISTS (SELECT 1 FROM classes WHERE classes.id = attendance_records.class_id AND classes.teacher_id = auth.uid())
);

DROP POLICY IF EXISTS "Teachers manage own documents" ON documents;
CREATE POLICY "Teachers manage own documents" ON documents FOR ALL 
USING (uploader_id = auth.uid() OR is_admin_or_principal())
WITH CHECK (uploader_id = auth.uid() OR is_admin_or_principal());


-- 3. VIEW SECURITY INVOKER (Phase 12)
-- Recreate views with security_invoker = true
DROP VIEW IF EXISTS active_students;
CREATE VIEW active_students WITH (security_invoker = true) AS
SELECT * FROM students WHERE is_active = true;

DROP VIEW IF EXISTS active_class_rosters;
CREATE VIEW active_class_rosters WITH (security_invoker = true) AS
SELECT c.id as class_id, c.name as class_name, c.academic_year_id, s.*
FROM classes c
JOIN students s ON c.id = s.class_id
WHERE s.is_active = true;


-- 4. RPC INTERNAL AUTHENTICATION (Phase 3, 8)
-- Overwrite promote_students and migrate_academic_year to verify auth.uid() inside the function.

CREATE OR REPLACE FUNCTION promote_students(
    source_class_id UUID,
    target_class_id UUID,
    student_ids UUID[],
    academic_year_id UUID,
    admin_user_id UUID, -- Legacy param, we will ignore it for security and use auth.uid()
    school_id TEXT
) RETURNS JSONB AS $$
DECLARE
    promoted_count INT := 0;
    actual_admin_id UUID;
    is_authorized BOOLEAN;
BEGIN
    -- PHASE 3 HARDENING: Verify auth.uid() internally. Do not trust admin_user_id parameter.
    actual_admin_id := auth.uid();
    
    IF actual_admin_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: You must be logged in to promote students.';
    END IF;

    SELECT is_admin_or_principal() INTO is_authorized;
    IF NOT is_authorized THEN
        RAISE EXCEPTION 'Forbidden: Only administrators or principals can perform promotions.';
    END IF;

    IF source_class_id = target_class_id THEN
        RAISE EXCEPTION 'Source and target classes cannot be the same.';
    END IF;

    -- Transaction logic remains the same
    UPDATE students
    SET class_id = target_class_id, updated_at = NOW()
    WHERE id = ANY(student_ids) AND class_id = source_class_id;

    GET DIAGNOSTICS promoted_count = ROW_COUNT;

    INSERT INTO audit_logs (action, type, user_id, school_id)
    VALUES ('Promoted ' || promoted_count || ' students from class ' || source_class_id || ' to ' || target_class_id, 'info', actual_admin_id, school_id);

    RETURN jsonb_build_object(
        'success', true, 
        'count', promoted_count, 
        'message', 'បានបញ្ចប់ការឡើងថ្នាក់ដោយជោគជ័យ'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION migrate_academic_year(
    source_year_id UUID,
    target_year_id UUID,
    admin_user_id UUID -- Legacy param, ignored for security
) RETURNS JSONB AS $$
DECLARE
    inserted_count INT := 0;
    actual_admin_id UUID;
    is_authorized BOOLEAN;
BEGIN
    -- PHASE 3 HARDENING: Verify internal caller
    actual_admin_id := auth.uid();
    
    IF actual_admin_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: You must be logged in to migrate academic years.';
    END IF;

    SELECT is_admin_or_principal() INTO is_authorized;
    IF NOT is_authorized THEN
        RAISE EXCEPTION 'Forbidden: Only administrators or principals can migrate academic years.';
    END IF;

    IF source_year_id = target_year_id THEN
        RAISE EXCEPTION 'Source and Target Academic Years cannot be identical.';
    END IF;

    WITH inserted AS (
        INSERT INTO classes (school_id, teacher_id, name, grade, shift, room_number, track, academic_year_id)
        SELECT 
            c.school_id, 
            NULL,
            c.name, 
            c.grade, 
            COALESCE(c.shift, CASE WHEN c.grade IN ('10', '11', '12') THEN 'ព្រឹក' ELSE 'រសៀល' END), 
            c.room_number, 
            COALESCE(c.track, 'ទូទៅ'), 
            target_year_id
        FROM classes c
        WHERE c.academic_year_id = source_year_id
        AND NOT EXISTS (
            SELECT 1 FROM classes t 
            WHERE t.academic_year_id = target_year_id 
            AND LOWER(TRIM(t.name)) = LOWER(TRIM(c.name))
        )
        RETURNING id
    )
    SELECT count(*) INTO inserted_count FROM inserted;

    RETURN jsonb_build_object(
        'success', true, 
        'count', inserted_count, 
        'message', CASE 
            WHEN inserted_count = 0 THEN 'ថ្នាក់រៀនទាំងអស់មានរួចហើយនៅក្នុងឆ្នាំសិក្សាគោលដៅ។'
            ELSE 'បានចម្លងរចនាសម្ព័ន្ធថ្នាក់រៀនចំនួន ' || inserted_count || ' ថ្នាក់ទៅឆ្នាំថ្មីជោគជ័យ!'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


COMMIT;
-- 28_final_hardening.sql
BEGIN;

-- ============================================================================
-- 1. DATABASE ROLE DISTINCTIONS (P0)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_principal()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'principal'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Re-define check_profile_update_privileges to prevent principals from modifying admins
CREATE OR REPLACE FUNCTION check_profile_update_privileges()
RETURNS TRIGGER AS $$
DECLARE
    is_admin_user BOOLEAN;
    is_principal_user BOOLEAN;
BEGIN
    is_admin_user := is_admin();
    is_principal_user := is_principal();

    IF is_admin_user THEN
        RETURN NEW;
    END IF;

    -- Principals can update teacher/monitor profiles but CANNOT elevate to admin or principal,
    -- and CANNOT update existing admin/principal profiles.
    IF is_principal_user THEN
        IF OLD.role IN ('admin', 'principal') AND OLD.id != auth.uid() THEN
            RAISE EXCEPTION 'Forbidden: Principals cannot modify other administrators.';
        END IF;
        IF NEW.role IN ('admin', 'principal') AND NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Forbidden: Principals cannot elevate privileges to admin/principal.';
        END IF;
        -- Principals can only affect their own school
        IF OLD.school_id IS DISTINCT FROM NEW.school_id THEN
            RAISE EXCEPTION 'Forbidden: Cannot transfer users between schools.';
        END IF;
        RETURN NEW;
    END IF;

    -- If the user is updating their own profile, ensure they aren't changing privileged fields.
    IF auth.uid() = OLD.id THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Forbidden: You cannot change your own role.';
        END IF;
        IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
            RAISE EXCEPTION 'Forbidden: You cannot change your assigned school.';
        END IF;
        IF NEW.school_code IS DISTINCT FROM OLD.school_code THEN
            RAISE EXCEPTION 'Forbidden: You cannot change your school code.';
        END IF;
        IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
            RAISE EXCEPTION 'Forbidden: You cannot change your active status.';
        END IF;
        IF NEW.username IS DISTINCT FROM OLD.username THEN
            RAISE EXCEPTION 'Forbidden: You cannot change your username.';
        END IF;
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Forbidden: You do not have permission to update this profile.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop previous policies and replace with stricter profiles RLS
DROP POLICY IF EXISTS "Admins insert profile" ON profiles;
CREATE POLICY "Admins insert profile" ON profiles FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin() OR is_principal());

-- ============================================================================
-- 2. RPC CONTRACT REGRESSIONS (P0)
-- ============================================================================

-- Drop the old over-parameterized versions
DROP FUNCTION IF EXISTS promote_students(UUID, UUID, UUID[], UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS promote_students(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS migrate_academic_year(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION promote_students(
    p_source_class_id UUID,
    p_target_class_id UUID
) RETURNS JSONB AS $$
DECLARE
    promoted_count INT := 0;
    actual_uid UUID;
    caller_school_id TEXT;
    is_authorized BOOLEAN;
    source_school_id TEXT;
    target_school_id TEXT;
BEGIN
    actual_uid := auth.uid();
    
    IF actual_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: You must be logged in to promote students.';
    END IF;

    -- Validate caller role and school
    SELECT role IN ('admin', 'principal'), school_id 
    INTO is_authorized, caller_school_id
    FROM profiles WHERE id = actual_uid;

    IF NOT is_authorized THEN
        RAISE EXCEPTION 'Forbidden: Only administrators or principals can perform promotions.';
    END IF;

    IF p_source_class_id = p_target_class_id THEN
        RAISE EXCEPTION 'Source and target classes cannot be the same.';
    END IF;

    -- Validate cross-school promotion
    SELECT school_id INTO source_school_id FROM classes WHERE id = p_source_class_id;
    SELECT school_id INTO target_school_id FROM classes WHERE id = p_target_class_id;

    IF source_school_id != target_school_id THEN
        RAISE EXCEPTION 'Forbidden: Cannot promote students across different schools.';
    END IF;

    -- If principal, ensure classes belong to their school
    IF NOT is_admin() AND caller_school_id != source_school_id THEN
        RAISE EXCEPTION 'Forbidden: You cannot promote students outside your school.';
    END IF;

    -- P1 Correctness: Preserve historical enrollment
    DECLARE
        source_year_id UUID;
        target_year_id UUID;
    BEGIN
        SELECT academic_year_id INTO source_year_id FROM classes WHERE id = p_source_class_id;
        SELECT academic_year_id INTO target_year_id FROM classes WHERE id = p_target_class_id;

        -- Upsert source enrollments (update year_result to 'promoted')
        IF source_year_id IS NOT NULL THEN
            INSERT INTO student_enrollments (student_id, class_id, academic_year_id, desk_number, room_number, enrollment_status, year_result, updated_at)
            SELECT id, p_source_class_id, source_year_id, desk_number, room_number, COALESCE(status, 'active'), 'promoted', NOW()
            FROM students WHERE class_id = p_source_class_id AND is_active = true
            ON CONFLICT (student_id, academic_year_id) DO UPDATE SET 
                year_result = 'promoted',
                updated_at = NOW();
        END IF;

        -- Upsert target enrollments
        IF target_year_id IS NOT NULL THEN
            INSERT INTO student_enrollments (student_id, class_id, academic_year_id, enrollment_status, year_result, updated_at)
            SELECT id, p_target_class_id, target_year_id, 'active', 'enrolled', NOW()
            FROM students WHERE class_id = p_source_class_id AND is_active = true
            ON CONFLICT (student_id, academic_year_id) DO UPDATE SET 
                class_id = EXCLUDED.class_id,
                year_result = 'enrolled',
                updated_at = NOW();
        END IF;
    END;

    -- Update active class pointer (P1 correctness: students.class_id = active pointer)
    UPDATE students
    SET class_id = p_target_class_id, updated_at = NOW()
    WHERE class_id = p_source_class_id AND is_active = true;

    GET DIAGNOSTICS promoted_count = ROW_COUNT;

    INSERT INTO audit_logs (action, type, user_id, school_id)
    VALUES ('Promoted ' || promoted_count || ' students from class ' || p_source_class_id || ' to ' || p_target_class_id, 'info', actual_uid, caller_school_id);

    RETURN jsonb_build_object(
        'success', true, 
        'count', promoted_count, 
        'message', 'បានបញ្ចប់ការឡើងថ្នាក់ដោយជោគជ័យ'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION migrate_academic_year(
    p_source_year_id UUID,
    p_target_year_id UUID
) RETURNS JSONB AS $$
DECLARE
    inserted_count INT := 0;
    actual_uid UUID;
    caller_school_id TEXT;
    is_authorized BOOLEAN;
BEGIN
    actual_uid := auth.uid();
    
    IF actual_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: You must be logged in to migrate academic years.';
    END IF;

    SELECT role IN ('admin', 'principal'), school_id 
    INTO is_authorized, caller_school_id
    FROM profiles WHERE id = actual_uid;

    IF NOT is_authorized THEN
        RAISE EXCEPTION 'Forbidden: Only administrators or principals can migrate academic years.';
    END IF;

    IF p_source_year_id = p_target_year_id THEN
        RAISE EXCEPTION 'Source and Target Academic Years cannot be identical.';
    END IF;

    WITH inserted AS (
        INSERT INTO classes (school_id, teacher_id, name, grade, shift, room_number, track, academic_year_id)
        SELECT 
            c.school_id, 
            NULL, -- Reset teachers
            c.name, 
            c.grade, 
            COALESCE(c.shift, CASE WHEN c.grade IN ('10', '11', '12') THEN 'ព្រឹក' ELSE 'រសៀល' END), 
            c.room_number, 
            COALESCE(c.track, 'ទូទៅ'), 
            p_target_year_id
        FROM classes c
        WHERE c.academic_year_id = p_source_year_id
        -- Ensure principal only affects their own school
        AND (is_admin() OR c.school_id = caller_school_id)
        AND NOT EXISTS (
            SELECT 1 FROM classes t 
            WHERE t.academic_year_id = p_target_year_id 
            AND LOWER(TRIM(t.name)) = LOWER(TRIM(c.name))
        )
        RETURNING id
    )
    SELECT count(*) INTO inserted_count FROM inserted;

    INSERT INTO audit_logs (action, type, user_id, school_id)
    VALUES ('Migrated ' || inserted_count || ' classes from year ' || p_source_year_id || ' to ' || p_target_year_id, 'info', actual_uid, caller_school_id);

    RETURN jsonb_build_object(
        'success', true, 
        'count', inserted_count, 
        'message', CASE 
            WHEN inserted_count = 0 THEN 'ថ្នាក់រៀនទាំងអស់មានរួចហើយនៅក្នុងឆ្នាំសិក្សាគោលដៅ។'
            ELSE 'បានចម្លងរចនាសម្ព័ន្ធថ្នាក់រៀនចំនួន ' || inserted_count || ' ថ្នាក់ទៅឆ្នាំថ្មីជោគជ័យ!'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 3. SENSITIVE SELECT & WITH CHECK HARDENING (P0)
-- ============================================================================

-- Function to check school scope
CREATE OR REPLACE FUNCTION user_school_id()
RETURNS TEXT AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Classes
DROP POLICY IF EXISTS "Classes viewable by all" ON classes;
DROP POLICY IF EXISTS "Teachers can update own classes" ON classes;
DROP POLICY IF EXISTS "Admins can manage classes" ON classes;

CREATE POLICY "Classes select scope" ON classes FOR SELECT USING (
  is_admin() OR school_id = user_school_id()
);
CREATE POLICY "Classes manage scope" ON classes FOR ALL USING (
  is_admin() OR (is_principal() AND school_id = user_school_id()) OR teacher_id = auth.uid()
) WITH CHECK (
  is_admin() OR (is_principal() AND school_id = user_school_id()) OR teacher_id = auth.uid()
);

-- Students
DROP POLICY IF EXISTS "Students viewable by all" ON students;
DROP POLICY IF EXISTS "Teachers modify students in class" ON students;

CREATE POLICY "Students select scope" ON students FOR SELECT USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = students.class_id AND (classes.school_id = user_school_id()))
);
CREATE POLICY "Students manage scope" ON students FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = students.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = students.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
);

-- Grades
DROP POLICY IF EXISTS "Grades viewable by all" ON grades;
DROP POLICY IF EXISTS "Teachers modify grades in class" ON grades;

CREATE POLICY "Grades select scope" ON grades FOR SELECT USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grades.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
);
CREATE POLICY "Grades manage scope" ON grades FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grades.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grades.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
);

-- Attendance
DROP POLICY IF EXISTS "Attendance viewable by all" ON attendance_records;
DROP POLICY IF EXISTS "Teachers modify attendance in class" ON attendance_records;

CREATE POLICY "Attendance select scope" ON attendance_records FOR SELECT USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = attendance_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
);
CREATE POLICY "Attendance manage scope" ON attendance_records FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = attendance_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = attendance_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
);

-- Grade Records
DROP POLICY IF EXISTS "Grade records viewable by all" ON grade_records;
DROP POLICY IF EXISTS "Teachers modify grade records in class" ON grade_records;

CREATE POLICY "Grade records select scope" ON grade_records FOR SELECT USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grade_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
);
CREATE POLICY "Grade records manage scope" ON grade_records FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grade_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grade_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
);

-- Documents
DROP POLICY IF EXISTS "Documents viewable by all" ON documents;
DROP POLICY IF EXISTS "Teachers manage own documents" ON documents;

CREATE POLICY "Documents select scope" ON documents FOR SELECT USING (
  is_admin() OR uploader_id = auth.uid() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = documents.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
);
CREATE POLICY "Documents manage scope" ON documents FOR ALL USING (
  is_admin() OR (uploader_id = auth.uid() AND (
    class_id IS NULL OR EXISTS (SELECT 1 FROM classes WHERE classes.id = documents.class_id AND classes.teacher_id = auth.uid())
  ))
) WITH CHECK (
  is_admin() OR (uploader_id = auth.uid() AND (
    class_id IS NULL OR EXISTS (SELECT 1 FROM classes WHERE classes.id = documents.class_id AND classes.teacher_id = auth.uid())
  ))
);

-- Health Records
DROP POLICY IF EXISTS "Health viewable by all" ON student_health_records;
DROP POLICY IF EXISTS "Teachers modify health in class" ON student_health_records;

CREATE POLICY "Health select scope" ON student_health_records FOR SELECT USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_health_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
);
CREATE POLICY "Health manage scope" ON student_health_records FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_health_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_health_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
);

-- Home Visits
DROP POLICY IF EXISTS "Visits viewable by all" ON home_visits;
DROP POLICY IF EXISTS "Teachers modify visits in class" ON home_visits;

CREATE POLICY "Visits select scope" ON home_visits FOR SELECT USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = home_visits.student_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
);
CREATE POLICY "Visits manage scope" ON home_visits FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = home_visits.student_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = home_visits.student_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
);

-- Parent Contacts
DROP POLICY IF EXISTS "Parent contacts viewable by all" ON parent_contacts;
DROP POLICY IF EXISTS "Teachers modify parent contacts in class" ON parent_contacts;

CREATE POLICY "Parent contacts select scope" ON parent_contacts FOR SELECT USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = parent_contacts.student_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
);
CREATE POLICY "Parent contacts manage scope" ON parent_contacts FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = parent_contacts.student_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = parent_contacts.student_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
);

-- Support Cases
DROP POLICY IF EXISTS "Support cases viewable by all" ON support_cases;
DROP POLICY IF EXISTS "Teachers modify support cases in class" ON support_cases;

CREATE POLICY "Support cases select scope" ON support_cases FOR SELECT USING (
  is_admin() OR teacher_id = auth.uid() OR
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = support_cases.student_id AND (
    (is_principal() AND classes.school_id = user_school_id())
  ))
);
CREATE POLICY "Support cases manage scope" ON support_cases FOR ALL USING (
  is_admin() OR teacher_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = support_cases.student_id AND (
    (is_principal() AND classes.school_id = user_school_id())
  ))
) WITH CHECK (
  is_admin() OR teacher_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = support_cases.student_id AND (
    (is_principal() AND classes.school_id = user_school_id())
  ))
);

-- Support Interventions
DROP POLICY IF EXISTS "Interventions viewable by all" ON support_interventions;
DROP POLICY IF EXISTS "Teachers modify interventions in class" ON support_interventions;

CREATE POLICY "Interventions select scope" ON support_interventions FOR SELECT USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM support_cases WHERE support_cases.id = support_interventions.case_id AND (
    support_cases.teacher_id = auth.uid() OR
    EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = support_cases.student_id AND is_principal() AND classes.school_id = user_school_id())
  ))
);
CREATE POLICY "Interventions manage scope" ON support_interventions FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM support_cases WHERE support_cases.id = support_interventions.case_id AND (
    support_cases.teacher_id = auth.uid() OR
    EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = support_cases.student_id AND is_principal() AND classes.school_id = user_school_id())
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM support_cases WHERE support_cases.id = support_interventions.case_id AND (
    support_cases.teacher_id = auth.uid() OR
    EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = support_cases.student_id AND is_principal() AND classes.school_id = user_school_id())
  ))
);

-- Student Enrollments
DROP POLICY IF EXISTS "Enrollments viewable by all" ON student_enrollments;
DROP POLICY IF EXISTS "Teachers modify enrollments in class" ON student_enrollments;

CREATE POLICY "Enrollments select scope" ON student_enrollments FOR SELECT USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_enrollments.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
);
CREATE POLICY "Enrollments manage scope" ON student_enrollments FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_enrollments.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_enrollments.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR classes.teacher_id = auth.uid()
  ))
);

-- Admin/Principal Only Tables
-- Announcements
DROP POLICY IF EXISTS "Announcements viewable by all" ON announcements;
DROP POLICY IF EXISTS "Admins manage announcements" ON announcements;

CREATE POLICY "Announcements select scope" ON announcements FOR SELECT USING (
  is_admin() OR school_id = user_school_id()
);
CREATE POLICY "Announcements manage scope" ON announcements FOR ALL USING (
  is_admin() OR (is_principal() AND school_id = user_school_id())
) WITH CHECK (
  is_admin() OR (is_principal() AND school_id = user_school_id())
);

-- School Infrastructure
DROP POLICY IF EXISTS "Infrastructure viewable by all" ON school_infrastructure;
DROP POLICY IF EXISTS "Admins manage infrastructure" ON school_infrastructure;

CREATE POLICY "Infrastructure select scope" ON school_infrastructure FOR SELECT USING (
  is_admin() OR school_id = user_school_id()
);
CREATE POLICY "Infrastructure manage scope" ON school_infrastructure FOR ALL USING (
  is_admin() OR (is_principal() AND school_id = user_school_id())
) WITH CHECK (
  is_admin() OR (is_principal() AND school_id = user_school_id())
);

-- Admin Only Tables
-- System Settings
DROP POLICY IF EXISTS "Settings viewable by all" ON system_settings;
DROP POLICY IF EXISTS "Admins manage settings" ON system_settings;

CREATE POLICY "Settings viewable by admin" ON system_settings FOR SELECT USING (is_admin());
CREATE POLICY "Settings manage by admin" ON system_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Audit Logs
DROP POLICY IF EXISTS "Audits viewable by all" ON audit_logs;
DROP POLICY IF EXISTS "Admins manage audits" ON audit_logs;

CREATE POLICY "Audits viewable by admin" ON audit_logs FOR SELECT USING (is_admin() OR (is_principal() AND school_id = user_school_id()));
CREATE POLICY "Audits manage by admin" ON audit_logs FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Schools
DROP POLICY IF EXISTS "Schools viewable by all" ON schools;
DROP POLICY IF EXISTS "Admins manage schools" ON schools;

CREATE POLICY "Schools viewable by all" ON schools FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Schools manage by admin" ON schools FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Academic Years
DROP POLICY IF EXISTS "Academic years viewable by all" ON academic_years;
DROP POLICY IF EXISTS "Admins manage academic years" ON academic_years;

CREATE POLICY "Academic years select scope" ON academic_years FOR SELECT USING (
  is_admin() OR school_id = user_school_id()
);
CREATE POLICY "Academic years manage scope" ON academic_years FOR ALL USING (
  is_admin() OR (is_principal() AND school_id = user_school_id())
) WITH CHECK (
  is_admin() OR (is_principal() AND school_id = user_school_id())
);

-- Grade Snapshots
DROP POLICY IF EXISTS "Snapshots viewable by all" ON grade_snapshots;
DROP POLICY IF EXISTS "Admins manage snapshots" ON grade_snapshots;

CREATE POLICY "Snapshots select scope" ON grade_snapshots FOR SELECT USING (
  is_admin() OR EXISTS (SELECT 1 FROM classes WHERE classes.id = grade_snapshots.class_id AND (classes.school_id = user_school_id()))
);
CREATE POLICY "Snapshots manage scope" ON grade_snapshots FOR ALL USING (
  is_admin() OR EXISTS (SELECT 1 FROM classes WHERE classes.id = grade_snapshots.class_id AND (is_principal() AND classes.school_id = user_school_id()))
) WITH CHECK (
  is_admin() OR EXISTS (SELECT 1 FROM classes WHERE classes.id = grade_snapshots.class_id AND (is_principal() AND classes.school_id = user_school_id()))
);

-- AI Generations
DROP POLICY IF EXISTS "Manage AI generations" ON ai_generations;

CREATE POLICY "AI generations manage scope" ON ai_generations FOR ALL USING (
  is_admin() OR teacher_id = auth.uid() OR (is_principal() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = ai_generations.teacher_id AND profiles.school_id = user_school_id()))
) WITH CHECK (
  is_admin() OR teacher_id = auth.uid() OR (is_principal() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = ai_generations.teacher_id AND profiles.school_id = user_school_id()))
);

COMMIT;
-- Migration 29: User Lifecycle Consistency

-- 1. Add is_archived column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- 2. Diagnostic View: Mismatched Enrollments
CREATE OR REPLACE VIEW public.diagnostic_enrollment_mismatch AS
SELECT 
    s.id AS student_id,
    s.name_kh,
    s.class_id AS students_table_class_id,
    c1.name AS students_table_class_name,
    se.class_id AS enrollments_table_class_id,
    c2.name AS enrollments_table_class_name,
    se.academic_year_id
FROM public.students s
LEFT JOIN public.student_enrollments se 
  ON s.id = se.student_id AND se.status = 'active'
LEFT JOIN public.classes c1 ON s.class_id = c1.id
LEFT JOIN public.classes c2 ON se.class_id = c2.id
WHERE s.class_id IS DISTINCT FROM se.class_id;

-- 3. Diagnostic View: Orphaned Profiles
CREATE OR REPLACE VIEW public.diagnostic_orphaned_profiles AS
SELECT p.id, p.username, p.full_name
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;
-- 30_final_remediation.sql

-- PHASE 5 & 11: CLASS UNIQUENESS
-- Ensure a class is identified uniquely by school, academic year, grade, name, shift, and track
ALTER TABLE public.classes 
ADD CONSTRAINT classes_uniqueness_idx 
UNIQUE NULLS NOT DISTINCT (school_id, academic_year_id, grade, name, shift, track);

-- PHASE 8 & 9: ENROLLMENT DIAGNOSTIC & LIFECYCLE INVARIANTS
-- Fix diagnostic view to use current academic year only
CREATE OR REPLACE VIEW public.diagnostic_enrollment_mismatch AS
SELECT 
    s.id AS student_id,
    s.name_kh,
    s.class_id AS students_table_class_id,
    c1.name AS students_table_class_name,
    se.class_id AS enrollments_table_class_id,
    c2.name AS enrollments_table_class_name,
    se.academic_year_id
FROM public.students s
LEFT JOIN public.student_enrollments se 
  ON s.id = se.student_id AND se.status = 'active'
LEFT JOIN public.academic_years ay 
  ON se.academic_year_id = ay.id AND ay.is_current = true
LEFT JOIN public.classes c1 ON s.class_id = c1.id
LEFT JOIN public.classes c2 ON se.class_id = c2.id
WHERE s.class_id IS DISTINCT FROM se.class_id
  AND ay.id IS NOT NULL; -- Only check against current active year

-- PHASE 10: PROMOTION BUSINESS SEMANTICS
-- Modify promote_students to accept an array of eligible student IDs
-- instead of blindly promoting everyone in the source class.
DROP FUNCTION IF EXISTS promote_students(UUID, UUID);

CREATE OR REPLACE FUNCTION promote_students(
    p_source_class_id UUID,
    p_target_class_id UUID,
    p_eligible_student_ids UUID[]
) RETURNS JSONB AS $$
DECLARE
    promoted_count INT := 0;
    actual_uid UUID;
    caller_school_id TEXT;
    is_authorized BOOLEAN;
    source_school_id TEXT;
    target_school_id TEXT;
    source_year_id UUID;
    target_year_id UUID;
BEGIN
    actual_uid := auth.uid();
    
    IF actual_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: You must be logged in to promote students.';
    END IF;

    -- Validate caller role and school
    SELECT role IN ('admin', 'principal'), school_id 
    INTO is_authorized, caller_school_id
    FROM profiles WHERE id = actual_uid;

    IF NOT is_authorized THEN
        RAISE EXCEPTION 'Forbidden: Only administrators or principals can perform promotions.';
    END IF;

    IF p_source_class_id = p_target_class_id THEN
        RAISE EXCEPTION 'Source and target classes cannot be the same.';
    END IF;

    -- Validate cross-school promotion
    SELECT school_id, academic_year_id INTO source_school_id, source_year_id FROM classes WHERE id = p_source_class_id;
    SELECT school_id, academic_year_id INTO target_school_id, target_year_id FROM classes WHERE id = p_target_class_id;

    IF source_school_id != target_school_id THEN
        RAISE EXCEPTION 'Forbidden: Cannot promote students across different schools.';
    END IF;

    -- If principal, ensure classes belong to their school
    IF NOT is_admin() AND caller_school_id != source_school_id THEN
        RAISE EXCEPTION 'Forbidden: You cannot promote students outside your school.';
    END IF;

    -- Upsert source enrollments (update year_result to 'promoted')
    IF source_year_id IS NOT NULL THEN
        INSERT INTO student_enrollments (student_id, class_id, academic_year_id, desk_number, room_number, enrollment_status, year_result, updated_at)
        SELECT id, p_source_class_id, source_year_id, desk_number, room_number, COALESCE(status, 'active'), 'promoted', NOW()
        FROM students WHERE class_id = p_source_class_id AND id = ANY(p_eligible_student_ids) AND is_active = true
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET 
            year_result = 'promoted',
            updated_at = NOW();
    END IF;

    -- Upsert target enrollments
    IF target_year_id IS NOT NULL THEN
        INSERT INTO student_enrollments (student_id, class_id, academic_year_id, enrollment_status, year_result, updated_at)
        SELECT id, p_target_class_id, target_year_id, 'active', 'enrolled', NOW()
        FROM students WHERE class_id = p_source_class_id AND id = ANY(p_eligible_student_ids) AND is_active = true
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET 
            class_id = EXCLUDED.class_id,
            year_result = 'enrolled',
            updated_at = NOW();
    END IF;

    -- Update active class pointer (P1 correctness: students.class_id = active pointer)
    UPDATE students
    SET class_id = p_target_class_id, updated_at = NOW()
    WHERE class_id = p_source_class_id AND id = ANY(p_eligible_student_ids) AND is_active = true;

    GET DIAGNOSTICS promoted_count = ROW_COUNT;

    INSERT INTO audit_logs (action, type, user_id, school_id)
    VALUES ('Promoted ' || promoted_count || ' students from class ' || p_source_class_id || ' to ' || p_target_class_id, 'info', actual_uid, caller_school_id);

    RETURN jsonb_build_object(
        'success', true, 
        'count', promoted_count, 
        'message', 'បានបញ្ចប់ការឡើងថ្នាក់ដោយជោគជ័យ'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 31_document_scopes.sql

-- PHASE 15: DOCUMENT ACCESS MODEL
-- Add scope to documents to explicitly define authorization scopes

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'class' 
CHECK (scope IN ('personal', 'class', 'student', 'support_case', 'school', 'system_template'));

-- Drop simplistic existing policies
DROP POLICY IF EXISTS "Users can view documents for their school/class" ON documents;
DROP POLICY IF EXISTS "Users can insert documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;

-- CREATE NEW HARDENED RLS POLICIES FOR DOCUMENTS
-- Note: 'school_id' does not exist on documents, we must join through classes or uploader

-- 1. View policy
CREATE POLICY "Strict Document View Policy" ON documents
FOR SELECT TO authenticated
USING (
    -- Admin can view all
    is_admin() OR
    -- Personal: Uploader can view
    (scope = 'personal' AND uploader_id = auth.uid()) OR
    -- Class: Teacher of the class, or Principal of the school can view
    (scope = 'class' AND class_id IS NOT NULL AND (
        EXISTS (SELECT 1 FROM classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM classes c JOIN profiles p ON p.school_id = c.school_id WHERE c.id = class_id AND p.id = auth.uid() AND p.role = 'principal')
    )) OR
    -- School: Anyone in the school can view
    (scope = 'school' AND EXISTS (
        SELECT 1 FROM profiles p1 JOIN profiles p2 ON p1.school_id = p2.school_id 
        WHERE p1.id = auth.uid() AND p2.id = uploader_id
    )) OR
    -- System Template: Anyone can view
    (scope = 'system_template')
);

-- 2. Insert Policy
CREATE POLICY "Strict Document Insert Policy" ON documents
FOR INSERT TO authenticated
WITH CHECK (
    uploader_id = auth.uid() AND (
        is_admin() OR 
        is_principal() OR 
        (scope = 'class' AND class_id IS NOT NULL AND EXISTS (SELECT 1 FROM classes c WHERE c.id = class_id AND c.teacher_id = auth.uid())) OR
        (scope = 'personal')
    )
);

-- 3. Delete Policy
CREATE POLICY "Strict Document Delete Policy" ON documents
FOR DELETE TO authenticated
USING (
    is_admin() OR uploader_id = auth.uid()
);
-- Migration: Add detailed family contacts to students table based on real school spreadsheet
-- Preserving existing data, extending the schema

BEGIN;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS father_name TEXT,
  ADD COLUMN IF NOT EXISTS father_job TEXT,
  ADD COLUMN IF NOT EXISTS father_phone TEXT,
  
  ADD COLUMN IF NOT EXISTS mother_name TEXT,
  ADD COLUMN IF NOT EXISTS mother_job TEXT,
  ADD COLUMN IF NOT EXISTS mother_phone TEXT,
  
  ADD COLUMN IF NOT EXISTS guardian_name TEXT,
  ADD COLUMN IF NOT EXISTS guardian_job TEXT,
  ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
  
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  
  ADD COLUMN IF NOT EXISTS current_address TEXT;

-- We don't drop parent_phone or address because they might be used by existing views or components.
-- We will migrate existing parent_phone data into guardian_phone if guardian_phone is null.
UPDATE students 
SET guardian_phone = parent_phone 
WHERE parent_phone IS NOT NULL AND guardian_phone IS NULL;

COMMIT;
-- 33_progressive_student_registration.sql
BEGIN;

-- 1. Redefine active_class_rosters to join via student_enrollments instead of relying purely on students.class_id
-- We want to expose the current active enrollment as the source of truth for class rosters.
DROP VIEW IF EXISTS active_class_rosters CASCADE;
CREATE OR REPLACE VIEW active_class_rosters AS
SELECT 
    e.class_id as enrollment_class_id, 
    c.name as class_name, 
    c.academic_year_id,
    e.enrollment_status as current_enrollment_status,
    s.*
FROM student_enrollments e
JOIN classes c ON c.id = e.class_id
JOIN students s ON s.id = e.student_id
WHERE s.is_active = true 
  AND (e.enrollment_status = 'active' OR e.enrollment_status = 'enrolled' OR e.enrollment_status IS NULL);

-- 2. Stored Procedure for Bulk Quick Registration and UPSERT
-- Takes an array of JSON objects: { student_id_number, full_name, gender, class_id, status }
-- And the active academic_year_id.
CREATE OR REPLACE FUNCTION bulk_quick_register_students(
    student_records JSONB,
    target_year_id UUID,
    admin_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    record JSONB;
    v_student_id UUID;
    v_class_id UUID;
    v_student_id_number TEXT;
    v_full_name TEXT;
    v_gender TEXT;
    v_status TEXT;
    affected_count INT := 0;
BEGIN
    FOR record IN SELECT * FROM jsonb_array_elements(student_records)
    LOOP
        v_class_id := (record->>'class_id')::UUID;
        v_student_id_number := record->>'student_id_number';
        v_full_name := record->>'full_name';
        v_gender := record->>'gender';
        v_status := COALESCE(record->>'status', 'new');
        
        -- Try to find existing student by student_id_number
        SELECT id INTO v_student_id FROM students WHERE student_id_number = v_student_id_number LIMIT 1;
        
        IF v_student_id IS NULL THEN
            -- Insert new student (core fields only)
            INSERT INTO students (
                student_id_number, full_name, gender, status, is_active, class_id
            ) VALUES (
                v_student_id_number, v_full_name, v_gender, v_status, true, v_class_id
            ) RETURNING id INTO v_student_id;
        ELSE
            -- Update core fields if needed (we shouldn't overwrite name unless specified, but for quick register we just ensure class_id pointer is also updated for legacy compatibility)
            UPDATE students 
            SET 
                class_id = v_class_id,
                full_name = COALESCE(v_full_name, full_name),
                gender = COALESCE(v_gender, gender),
                is_active = true,
                updated_at = NOW()
            WHERE id = v_student_id;
        END IF;

        -- Upsert the student enrollment for the target academic year
        INSERT INTO student_enrollments (
            student_id, class_id, academic_year_id, enrollment_status, year_result
        ) VALUES (
            v_student_id, v_class_id, target_year_id, 'active', 'enrolled'
        )
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET
            class_id = EXCLUDED.class_id,
            enrollment_status = 'active',
            updated_at = NOW();

        affected_count := affected_count + 1;
    END LOOP;

    -- Insert audit log
    IF affected_count > 0 AND admin_user_id IS NOT NULL THEN
        INSERT INTO audit_logs (user_id, action) 
        VALUES (admin_user_id, 'បានចុះឈ្មោះសិស្សរហ័សចំនួន ' || affected_count || ' នាក់');
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'count', affected_count, 
        'message', 'បានចុះឈ្មោះសិស្សរហ័សចំនួន ' || affected_count || ' នាក់ដោយជោគជ័យ'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
-- 34_align_bulk_register.sql
BEGIN;

-- Update the Stored Procedure for Bulk Quick Registration to accept the expanded 12 fields
CREATE OR REPLACE FUNCTION bulk_quick_register_students(
    student_records JSONB,
    target_year_id UUID,
    admin_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    record JSONB;
    v_student_id UUID;
    v_class_id UUID;
    v_student_id_number TEXT;
    v_full_name TEXT;
    v_gender TEXT;
    v_status TEXT;
    
    -- New extended fields
    v_dob DATE;
    v_address TEXT;
    v_father_name TEXT;
    v_father_job TEXT;
    v_father_phone TEXT;
    v_mother_name TEXT;
    v_mother_job TEXT;
    v_mother_phone TEXT;
    v_parent_phone TEXT;
    
    affected_count INT := 0;
BEGIN
    FOR record IN SELECT * FROM jsonb_array_elements(student_records)
    LOOP
        v_class_id := (record->>'class_id')::UUID;
        v_student_id_number := record->>'student_id_number';
        v_full_name := record->>'full_name';
        v_gender := record->>'gender';
        v_status := COALESCE(record->>'status', 'new');
        
        -- Parse extended fields
        -- We try to cast to DATE. If it fails, we fall back to NULL in the calling code or handle gracefully.
        -- Assuming the frontend passes a valid 'YYYY-MM-DD' or null.
        BEGIN
            v_dob := (record->>'dob')::DATE;
        EXCEPTION WHEN OTHERS THEN
            v_dob := NULL;
        END;

        v_address := record->>'address';
        v_father_name := record->>'father_name';
        v_father_job := record->>'father_job';
        v_father_phone := record->>'father_phone';
        v_mother_name := record->>'mother_name';
        v_mother_job := record->>'mother_job';
        v_mother_phone := record->>'mother_phone';
        
        -- Determine parent phone fallback
        v_parent_phone := COALESCE(v_father_phone, v_mother_phone);

        -- Try to find existing student by student_id_number
        SELECT id INTO v_student_id FROM students WHERE student_id_number = v_student_id_number LIMIT 1;
        
        IF v_student_id IS NULL THEN
            -- Insert new student (with extended fields)
            INSERT INTO students (
                student_id_number, full_name, gender, status, is_active, class_id,
                dob, current_address, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, parent_phone
            ) VALUES (
                v_student_id_number, v_full_name, v_gender, v_status, true, v_class_id,
                v_dob, v_address, v_father_name, v_father_job, v_father_phone, v_mother_name, v_mother_job, v_mother_phone, v_parent_phone
            ) RETURNING id INTO v_student_id;
        ELSE
            -- Update core fields if needed (progressive update - do not erase existing data)
            UPDATE students 
            SET 
                class_id = v_class_id,
                full_name = COALESCE(v_full_name, full_name),
                gender = COALESCE(v_gender, gender),
                is_active = true,
                dob = COALESCE(v_dob, dob),
                current_address = COALESCE(v_address, current_address),
                father_name = COALESCE(v_father_name, father_name),
                father_job = COALESCE(v_father_job, father_job),
                father_phone = COALESCE(v_father_phone, father_phone),
                mother_name = COALESCE(v_mother_name, mother_name),
                mother_job = COALESCE(v_mother_job, mother_job),
                mother_phone = COALESCE(v_mother_phone, mother_phone),
                parent_phone = COALESCE(v_parent_phone, parent_phone),
                updated_at = NOW()
            WHERE id = v_student_id;
        END IF;

        -- Upsert the student enrollment for the target academic year
        INSERT INTO student_enrollments (
            student_id, class_id, academic_year_id, enrollment_status, year_result
        ) VALUES (
            v_student_id, v_class_id, target_year_id, 'active', 'enrolled'
        )
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET
            class_id = EXCLUDED.class_id,
            enrollment_status = 'active',
            updated_at = NOW();

        affected_count := affected_count + 1;
    END LOOP;

    -- Insert audit log
    IF affected_count > 0 AND admin_user_id IS NOT NULL THEN
        INSERT INTO audit_logs (user_id, action) 
        VALUES (admin_user_id, 'បានចុះឈ្មោះសិស្សរហ័សចំនួន ' || affected_count || ' នាក់តាមរយៈតារាងទិន្នន័យ (Grid)');
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'count', affected_count, 
        'message', 'បានចុះឈ្មោះសិស្សរហ័សចំនួន ' || affected_count || ' នាក់ដោយជោគជ័យ'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
-- 35_academic_year_isolation.sql
BEGIN;

-- Drop existing teacher modify policies that lack academic year isolation
DROP POLICY IF EXISTS "Teachers modify students in class" ON students;
DROP POLICY IF EXISTS "Teachers modify attendance in class" ON attendance_records;
DROP POLICY IF EXISTS "Teachers modify grades in class" ON grades;
DROP POLICY IF EXISTS "Teachers modify grade records in class" ON grade_records;
DROP POLICY IF EXISTS "Teachers modify health in class" ON student_health_records;
DROP POLICY IF EXISTS "Teachers modify visits in class" ON home_visits;
DROP POLICY IF EXISTS "Teachers modify interventions in class" ON support_interventions;
DROP POLICY IF EXISTS "Teachers modify parent contacts in class" ON parent_contacts;
DROP POLICY IF EXISTS "Teachers modify enrollments in class" ON student_enrollments;

-- Recreate policies with strict academic_year.is_active = TRUE requirement

-- Students
CREATE POLICY "Teachers modify students in class" ON students FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM classes 
    JOIN academic_years ON academic_years.id = classes.academic_year_id
    WHERE classes.id = students.class_id 
      AND classes.teacher_id = auth.uid()
      AND academic_years.is_active = TRUE
  )
);

-- Attendance & Grades
CREATE POLICY "Teachers modify attendance in class" ON attendance_records FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM classes 
    JOIN academic_years ON academic_years.id = classes.academic_year_id
    WHERE classes.id = attendance_records.class_id 
      AND classes.teacher_id = auth.uid()
      AND academic_years.is_active = TRUE
  )
);

CREATE POLICY "Teachers modify grades in class" ON grades FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM classes 
    JOIN academic_years ON academic_years.id = classes.academic_year_id
    WHERE classes.id = grades.class_id 
      AND classes.teacher_id = auth.uid()
      AND academic_years.is_active = TRUE
  )
);

CREATE POLICY "Teachers modify grade records in class" ON grade_records FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM classes 
    JOIN academic_years ON academic_years.id = classes.academic_year_id
    WHERE classes.id = grade_records.class_id 
      AND classes.teacher_id = auth.uid()
      AND academic_years.is_active = TRUE
  )
);

-- Health Records, Home Visits, Interventions, Parent Contacts
CREATE POLICY "Teachers modify health in class" ON student_health_records FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM classes 
    JOIN academic_years ON academic_years.id = classes.academic_year_id
    WHERE classes.id = student_health_records.class_id 
      AND classes.teacher_id = auth.uid()
      AND academic_years.is_active = TRUE
  )
);

CREATE POLICY "Teachers modify visits in class" ON home_visits FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM students 
    JOIN classes ON classes.id = students.class_id 
    JOIN academic_years ON academic_years.id = classes.academic_year_id
    WHERE students.id = home_visits.student_id 
      AND classes.teacher_id = auth.uid()
      AND academic_years.is_active = TRUE
  )
);

CREATE POLICY "Teachers modify interventions in class" ON support_interventions FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM support_cases 
    -- Assuming support_cases has a teacher_id. If support_cases doesn't have an academic year link easily accessible, 
    -- we allow it as long as the case belongs to the teacher. This is a reasonable fallback for support cases.
    WHERE support_cases.id = support_interventions.case_id 
      AND support_cases.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers modify parent contacts in class" ON parent_contacts FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM students 
    JOIN classes ON classes.id = students.class_id 
    JOIN academic_years ON academic_years.id = classes.academic_year_id
    WHERE students.id = parent_contacts.student_id 
      AND classes.teacher_id = auth.uid()
      AND academic_years.is_active = TRUE
  )
);

-- Enrollments
CREATE POLICY "Teachers modify enrollments in class" ON student_enrollments FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM classes 
    JOIN academic_years ON academic_years.id = classes.academic_year_id
    WHERE classes.id = student_enrollments.class_id 
      AND classes.teacher_id = auth.uid()
      AND academic_years.is_active = TRUE
  )
);

COMMIT;
-- Add Telegram authentication fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT UNIQUE,
ADD COLUMN IF NOT EXISTS telegram_link_code TEXT UNIQUE;

-- Add Telegram Support Group ID to schools table
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS admin_telegram_group_id BIGINT;

-- Create an index for fast lookups by link code
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_link_code ON profiles(telegram_link_code);

-- Update RLS policies to allow authenticated users to update their own telegram fields
CREATE POLICY "Users can update their own telegram fields" 
ON profiles FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Allow service role (bot) to read and update profiles based on chat_id or link_code
-- Service role bypasses RLS anyway, but it's good practice to ensure it works.
-- 37_fix_principal_role_security.sql
BEGIN;

-- 1. ENSURE HELPER FUNCTIONS EXIST
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_principal()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'principal'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. DROP THE VULNERABLE POLICIES FROM MIGRATION 35
DROP POLICY IF EXISTS "Teachers modify students in class" ON students;
DROP POLICY IF EXISTS "Teachers modify attendance in class" ON attendance_records;
DROP POLICY IF EXISTS "Teachers modify grades in class" ON grades;
DROP POLICY IF EXISTS "Teachers modify health in class" ON student_health_records;
DROP POLICY IF EXISTS "Teachers modify visits in class" ON home_visits;
DROP POLICY IF EXISTS "Teachers modify interventions in class" ON support_interventions;
DROP POLICY IF EXISTS "Teachers modify parent contacts in class" ON parent_contacts;
DROP POLICY IF EXISTS "Teachers modify enrollments in class" ON student_enrollments;

-- 2. OVERWRITE THE `manage scope` POLICIES FROM MIGRATION 28 
-- TO PROPERLY ENFORCE ACADEMIC YEAR ISOLATION FOR TEACHERS ONLY

-- Students
DROP POLICY IF EXISTS "Students manage scope" ON students;
CREATE POLICY "Students manage scope" ON students FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = students.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = students.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
);

-- Attendance Records
DROP POLICY IF EXISTS "Attendance manage scope" ON attendance_records;
CREATE POLICY "Attendance manage scope" ON attendance_records FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = attendance_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = attendance_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
);

-- Grades
DROP POLICY IF EXISTS "Grades manage scope" ON grades;
CREATE POLICY "Grades manage scope" ON grades FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grades.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grades.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
);

-- Grade Records
DROP POLICY IF EXISTS "Grade records manage scope" ON grade_records;
CREATE POLICY "Grade records manage scope" ON grade_records FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grade_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grade_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
);

-- Student Health Records
DROP POLICY IF EXISTS "Health manage scope" ON student_health_records;
CREATE POLICY "Health manage scope" ON student_health_records FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_health_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_health_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
);

-- Home Visits
DROP POLICY IF EXISTS "Visits manage scope" ON home_visits;
CREATE POLICY "Visits manage scope" ON home_visits FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = home_visits.student_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = home_visits.student_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
);

-- Support Interventions
DROP POLICY IF EXISTS "Interventions manage scope" ON support_interventions;
CREATE POLICY "Interventions manage scope" ON support_interventions FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM support_cases WHERE support_cases.id = support_interventions.case_id AND (
    (is_principal() AND EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = support_cases.student_id AND classes.school_id = user_school_id())) OR 
    support_cases.teacher_id = auth.uid()
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM support_cases WHERE support_cases.id = support_interventions.case_id AND (
    (is_principal() AND EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = support_cases.student_id AND classes.school_id = user_school_id())) OR 
    support_cases.teacher_id = auth.uid()
  ))
);

-- Parent Contacts
DROP POLICY IF EXISTS "Parent contacts manage scope" ON parent_contacts;
CREATE POLICY "Parent contacts manage scope" ON parent_contacts FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = parent_contacts.student_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = parent_contacts.student_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
);

-- Student Enrollments
DROP POLICY IF EXISTS "Enrollments manage scope" ON student_enrollments;
CREATE POLICY "Enrollments manage scope" ON student_enrollments FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_enrollments.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_enrollments.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
);


-- 3. PRINCIPAL DASHBOARD STATS RPC
-- Replaces massive memory usage in Next.js action
CREATE OR REPLACE FUNCTION get_principal_dashboard_stats(
    p_school_id TEXT,
    p_academic_year_id UUID
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Verify the caller is admin or principal of this school
    IF NOT is_admin() AND NOT (is_principal() AND user_school_id() = p_school_id) THEN
        RAISE EXCEPTION 'Forbidden: You do not have permission to view this school''s stats.';
    END IF;

    WITH active_classes AS (
        SELECT id, name, grade, track 
        FROM classes 
        WHERE school_id = p_school_id 
          AND academic_year_id = p_academic_year_id
          AND is_archived = false
    ),
    active_students_agg AS (
        SELECT 
            COUNT(s.id) AS total_students,
            COUNT(s.id) FILTER (WHERE s.gender IN ('F', 'ស្រី')) AS girls_count,
            COUNT(s.id) FILTER (WHERE s.dropout_risk = true OR s.is_slow_learner = true) AS at_risk_count,
            jsonb_agg(
                jsonb_build_object(
                    'id', s.id,
                    'name', s.full_name,
                    'reasons', CASE 
                        WHEN s.dropout_risk = true AND s.is_slow_learner = true THEN '["ហានិភ័យបោះបង់ការសិក្សា (អវត្តមានច្រើន / ពិន្ទុធ្លាក់ចុះ)", "សិស្សរៀនយឺត (ត្រូវការការជួយបំប៉ន)"]'::jsonb
                        WHEN s.dropout_risk = true THEN '["ហានិភ័យបោះបង់ការសិក្សា (អវត្តមានច្រើន / ពិន្ទុធ្លាក់ចុះ)"]'::jsonb
                        WHEN s.is_slow_learner = true THEN '["សិស្សរៀនយឺត (ត្រូវការការជួយបំប៉ន)"]'::jsonb
                        ELSE '["ស្ថិតក្នុងការតាមដានពិសេស"]'::jsonb
                    END,
                    'severity', CASE WHEN s.dropout_risk = true THEN 'high' ELSE 'medium' END
                )
            ) FILTER (WHERE s.dropout_risk = true OR s.is_slow_learner = true) AS at_risk_list
        FROM active_students s
        WHERE s.class_id IN (SELECT id FROM active_classes)
    ),
    attendance_stats AS (
        SELECT 
            TO_CHAR(date, 'YYYY-MM') AS month_key,
            COUNT(*) FILTER (WHERE status IN ('present', 'late', 'permission', 'P')) AS present_count,
            COUNT(*) AS total_count
        FROM attendance_records a
        WHERE a.class_id IN (SELECT id FROM active_classes)
        GROUP BY TO_CHAR(date, 'YYYY-MM')
    ),
    grade_stats AS (
        SELECT 
            period,
            AVG(
                CASE WHEN total_score > 0 THEN (total_score / (CASE WHEN CAST(c.grade AS INT) >= 10 THEN 500 ELSE 400 END)) * 100 ELSE NULL END
            ) AS avg_pct
        FROM grades g
        JOIN active_classes c ON c.id = g.class_id
        WHERE total_score > 0
        GROUP BY period
    ),
    grade_level_stats AS (
        SELECT 
            c.grade,
            COUNT(DISTINCT c.id) AS classes_count,
            COUNT(DISTINCT s.id) AS students_count,
            COUNT(a.id) FILTER (WHERE a.status IN ('present', 'late', 'permission', 'P')) AS att_present,
            COUNT(a.id) AS att_total,
            AVG(
                CASE WHEN g.total_score > 0 THEN (g.total_score / (CASE WHEN CAST(c.grade AS INT) >= 10 THEN 500 ELSE 400 END)) * 100 ELSE NULL END
            ) AS avg_score_pct
        FROM active_classes c
        LEFT JOIN active_students s ON s.class_id = c.id
        LEFT JOIN attendance_records a ON a.class_id = c.id
        LEFT JOIN grades g ON g.class_id = c.id
        GROUP BY c.grade
    )
    SELECT jsonb_build_object(
        'total_students', COALESCE((SELECT total_students FROM active_students_agg), 0),
        'girls_count', COALESCE((SELECT girls_count FROM active_students_agg), 0),
        'boys_count', COALESCE((SELECT total_students FROM active_students_agg), 0) - COALESCE((SELECT girls_count FROM active_students_agg), 0),
        'at_risk_count', COALESCE((SELECT at_risk_count FROM active_students_agg), 0),
        'at_risk_list', COALESCE((SELECT at_risk_list FROM active_students_agg), '[]'::jsonb),
        'attendance_by_month', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM attendance_stats t), '[]'::jsonb),
        'grade_by_period', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM grade_stats t), '[]'::jsonb),
        'grade_level_stats', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM grade_level_stats t), '[]'::jsonb)
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
-- 38_fix_teacher_role_security.sql
BEGIN;

-- 1. ENSURE HELPER FUNCTIONS EXIST
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_principal()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'principal'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. DROP EXISTING FLAWED POLICY
DROP POLICY IF EXISTS "Classes manage scope" ON classes;

-- 2. RECREATE POLICY WITH TENANT ISOLATION FOR TEACHERS
CREATE POLICY "Classes manage scope" ON classes FOR ALL USING (
  is_admin() OR 
  (is_principal() AND school_id = user_school_id()) OR 
  (teacher_id = auth.uid() AND school_id = user_school_id())
) WITH CHECK (
  is_admin() OR 
  (is_principal() AND school_id = user_school_id()) OR 
  (teacher_id = auth.uid() AND school_id = user_school_id())
);

COMMIT;
-- 39_fix_principal_security_flaws.sql
BEGIN;

-- 1. ENSURE HELPER FUNCTIONS EXIST
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id::text = auth.uid()::text
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_principal()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id::text = auth.uid()::text
    AND role = 'principal'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_school_id()
RETURNS TEXT AS $$
  SELECT school_id::text FROM profiles WHERE id::text = auth.uid()::text;
$$ LANGUAGE sql SECURITY DEFINER;


-- 2. SECURE PROFILES RLS (Prevent Global PII Leak)
-- We are dropping the overly permissive rule from Migration 24
DROP POLICY IF EXISTS "Profiles viewable by self or admin" ON profiles;
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON profiles;

-- Create strict read access: 
-- 1. Users can see their own profile
-- 2. Admins can see all profiles
-- 3. Principals can only see profiles within their own school
CREATE POLICY "Profiles select scope" ON profiles FOR SELECT USING (
  auth.uid()::text = id::text OR 
  is_admin() OR 
  (is_principal() AND school_id::text = user_school_id())
);


-- 3. EXTEND SCHOOLS TABLE FOR ISOLATED SETTINGS
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS principal_name TEXT,
ADD COLUMN IF NOT EXISTS principal_phone TEXT,
ADD COLUMN IF NOT EXISTS ict_lead_name TEXT,
ADD COLUMN IF NOT EXISTS ict_lead_phone TEXT,
ADD COLUMN IF NOT EXISTS academic_year TEXT,
ADD COLUMN IF NOT EXISTS semester TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT;

COMMIT;
-- 40_fix_student_enrollment_rls.sql
BEGIN;

-- 1. ENSURE HELPER FUNCTIONS EXIST
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id::text = auth.uid()::text
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_principal()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id::text = auth.uid()::text
    AND role = 'principal'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_school_id()
RETURNS TEXT AS $$
  SELECT school_id::text FROM profiles WHERE id::text = auth.uid()::text;
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. SECURE STUDENTS RLS (Support progressive registration via student_enrollments)
DROP POLICY IF EXISTS "Students select scope" ON students;

CREATE POLICY "Students select scope" ON students FOR SELECT USING (
  is_admin() OR 
  (class_id IN (SELECT id FROM classes WHERE school_id::text = user_school_id())) OR
  EXISTS (
    SELECT 1 FROM student_enrollments e
    JOIN classes c ON c.id = e.class_id
    WHERE e.student_id = students.id AND c.school_id::text = user_school_id()
  )
);

DROP POLICY IF EXISTS "Students manage scope" ON students;

CREATE POLICY "Students manage scope" ON students FOR ALL USING (
  is_admin() OR 
  (class_id IN (SELECT id FROM classes WHERE school_id::text = user_school_id())) OR
  EXISTS (
    SELECT 1 FROM student_enrollments e
    JOIN classes c ON c.id = e.class_id
    WHERE e.student_id = students.id AND c.school_id::text = user_school_id()
  )
) WITH CHECK (
  is_admin() OR 
  (class_id IN (SELECT id FROM classes WHERE school_id::text = user_school_id())) OR
  EXISTS (
    SELECT 1 FROM student_enrollments e
    JOIN classes c ON c.id = e.class_id
    WHERE e.student_id = students.id AND c.school_id::text = user_school_id()
  )
);

COMMIT;
-- 41_fix_residual_helper_functions.sql
BEGIN;

-- 1. FIX is_admin_or_principal()
CREATE OR REPLACE FUNCTION is_admin_or_principal()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id::text = auth.uid()::text
    AND role IN ('admin', 'principal')
  );
$$ LANGUAGE sql SECURITY DEFINER;


-- 2. FIX check_profile_update_privileges()
CREATE OR REPLACE FUNCTION check_profile_update_privileges()
RETURNS TRIGGER AS $$
DECLARE
    is_admin_user BOOLEAN;
    is_principal_user BOOLEAN;
BEGIN
    is_admin_user := is_admin();
    is_principal_user := is_principal();

    IF is_admin_user THEN
        RETURN NEW;
    END IF;

    -- Principals can update teacher/monitor profiles but CANNOT elevate to admin or principal,
    -- and CANNOT update existing admin/principal profiles.
    IF is_principal_user THEN
        IF OLD.role IN ('admin', 'principal') AND OLD.id::text != auth.uid()::text THEN
            RAISE EXCEPTION 'Forbidden: Principals cannot modify other administrators.';
        END IF;
        IF NEW.role IN ('admin', 'principal') AND NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Forbidden: Principals cannot elevate privileges to admin/principal.';
        END IF;
        -- Principals can only affect their own school
        IF OLD.school_id IS DISTINCT FROM NEW.school_id THEN
            RAISE EXCEPTION 'Forbidden: Cannot transfer users between schools.';
        END IF;
        RETURN NEW;
    END IF;

    -- If the user is updating their own profile, ensure they aren't changing privileged fields.
    IF auth.uid()::text = OLD.id::text THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Forbidden: You cannot change your own role.';
        END IF;
        IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
            RAISE EXCEPTION 'Forbidden: You cannot change your own school_id.';
        END IF;
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Forbidden: You do not have permission to update this profile.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. FIX THE BROKEN POLICY FROM MIGRATION 35 ON students
-- Since Migration 40 completely replaced the Students manage scope, we should drop the residual 
-- policy from Migration 35 which is causing duplicate/conflicting evaluations during UPDATE operations.
DROP POLICY IF EXISTS "Teachers modify students in class" ON students;


-- 4. APPLY THE TEXT CASTING FIX TO ALL REMAINING 'TEACHERS MODIFY' POLICIES
-- To prevent uuid=text errors on other tables, we recreate their policies using ::text casts.
-- This ensures that attendance, grades, and health records don't crash when a teacher saves them.

-- Attendance
DROP POLICY IF EXISTS "Teachers modify attendance in class" ON attendance_records;
CREATE POLICY "Teachers modify attendance in class" ON attendance_records FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM classes 
    JOIN academic_years ON academic_years.id = classes.academic_year_id
    WHERE classes.id = attendance_records.class_id 
      AND classes.teacher_id::text = auth.uid()::text
      AND academic_years.is_active = TRUE
  )
);

-- Grades
DROP POLICY IF EXISTS "Teachers modify grades in class" ON grades;
CREATE POLICY "Teachers modify grades in class" ON grades FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM classes 
    JOIN academic_years ON academic_years.id = classes.academic_year_id
    WHERE classes.id = grades.class_id 
      AND classes.teacher_id::text = auth.uid()::text
      AND academic_years.is_active = TRUE
  )
);

-- Health
DROP POLICY IF EXISTS "Teachers modify health in class" ON student_health_records;
CREATE POLICY "Teachers modify health in class" ON student_health_records FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM classes 
    JOIN academic_years ON academic_years.id = classes.academic_year_id
    WHERE classes.id = student_health_records.class_id 
      AND classes.teacher_id::text = auth.uid()::text
      AND academic_years.is_active = TRUE
  )
);

-- Enrollments
DROP POLICY IF EXISTS "Teachers modify enrollments in class" ON student_enrollments;
CREATE POLICY "Teachers modify enrollments in class" ON student_enrollments FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM classes 
    JOIN academic_years ON academic_years.id = classes.academic_year_id
    WHERE classes.id = student_enrollments.class_id 
      AND classes.teacher_id::text = auth.uid()::text
      AND academic_years.is_active = TRUE
  )
);

COMMIT;
-- 42_admin_basic_import.sql
BEGIN;

-- Update the Stored Procedure for Bulk Quick Registration to accept desk and room numbers
CREATE OR REPLACE FUNCTION bulk_quick_register_students(
    student_records JSONB,
    target_year_id UUID,
    admin_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    record JSONB;
    v_student_id UUID;
    v_class_id UUID;
    v_student_id_number TEXT;
    v_full_name TEXT;
    v_gender TEXT;
    v_status TEXT;
    v_desk_number TEXT;
    v_room_number TEXT;
    
    -- New extended fields
    v_dob DATE;
    v_address TEXT;
    v_father_name TEXT;
    v_father_job TEXT;
    v_father_phone TEXT;
    v_mother_name TEXT;
    v_mother_job TEXT;
    v_mother_phone TEXT;
    v_parent_phone TEXT;
    
    affected_count INT := 0;
BEGIN
    FOR record IN SELECT * FROM jsonb_array_elements(student_records)
    LOOP
        v_class_id := (record->>'class_id')::UUID;
        v_student_id_number := record->>'student_id_number';
        v_full_name := record->>'full_name';
        v_gender := record->>'gender';
        v_status := COALESCE(record->>'status', 'new');
        v_desk_number := record->>'desk_number';
        v_room_number := record->>'room_number';
        
        -- Parse extended fields
        BEGIN
            v_dob := (record->>'dob')::DATE;
        EXCEPTION WHEN OTHERS THEN
            v_dob := NULL;
        END;

        v_address := record->>'address';
        v_father_name := record->>'father_name';
        v_father_job := record->>'father_job';
        v_father_phone := record->>'father_phone';
        v_mother_name := record->>'mother_name';
        v_mother_job := record->>'mother_job';
        v_mother_phone := record->>'mother_phone';
        
        -- Determine parent phone fallback
        v_parent_phone := COALESCE(v_father_phone, v_mother_phone);

        -- Try to find existing student by student_id_number
        SELECT id INTO v_student_id FROM students WHERE student_id_number = v_student_id_number LIMIT 1;
        
        IF v_student_id IS NULL THEN
            -- Insert new student (with extended fields)
            INSERT INTO students (
                student_id_number, full_name, gender, status, is_active, class_id,
                desk_number, room_number,
                dob, current_address, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, parent_phone
            ) VALUES (
                v_student_id_number, v_full_name, v_gender, v_status, true, v_class_id,
                v_desk_number, v_room_number,
                v_dob, v_address, v_father_name, v_father_job, v_father_phone, v_mother_name, v_mother_job, v_mother_phone, v_parent_phone
            ) RETURNING id INTO v_student_id;
        ELSE
            -- Update core fields if needed (progressive update - do not erase existing data)
            UPDATE students 
            SET 
                class_id = COALESCE(v_class_id, class_id),
                full_name = COALESCE(v_full_name, full_name),
                gender = COALESCE(v_gender, gender),
                is_active = true,
                desk_number = COALESCE(v_desk_number, desk_number),
                room_number = COALESCE(v_room_number, room_number),
                dob = COALESCE(v_dob, dob),
                current_address = COALESCE(v_address, current_address),
                father_name = COALESCE(v_father_name, father_name),
                father_job = COALESCE(v_father_job, father_job),
                father_phone = COALESCE(v_father_phone, father_phone),
                mother_name = COALESCE(v_mother_name, mother_name),
                mother_job = COALESCE(v_mother_job, mother_job),
                mother_phone = COALESCE(v_mother_phone, mother_phone),
                parent_phone = COALESCE(v_parent_phone, parent_phone),
                updated_at = NOW()
            WHERE id = v_student_id;
        END IF;

        -- Upsert the student enrollment for the target academic year
        INSERT INTO student_enrollments (
            student_id, class_id, academic_year_id, enrollment_status, year_result
        ) VALUES (
            v_student_id, v_class_id, target_year_id, 'active', 'enrolled'
        )
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET
            class_id = COALESCE(EXCLUDED.class_id, student_enrollments.class_id),
            enrollment_status = 'active',
            updated_at = NOW();

        affected_count := affected_count + 1;
    END LOOP;

    -- Insert audit log
    IF affected_count > 0 AND admin_user_id IS NOT NULL THEN
        INSERT INTO audit_logs (user_id, action) 
        VALUES (admin_user_id, 'បានចុះឈ្មោះសិស្សរហ័សចំនួន ' || affected_count || ' នាក់តាមរយៈការនាំចូល (Import/Grid)');
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'count', affected_count, 
        'message', 'បានចុះឈ្មោះសិស្សរហ័សចំនួន ' || affected_count || ' នាក់ដោយជោគជ័យ'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Create a table for correction requests from Homeroom to Admin
CREATE TABLE IF NOT EXISTS correction_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL, -- e.g., 'student_id_number', 'full_name', 'gender'
    old_value TEXT,
    new_value TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE correction_requests ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own requests and insert new ones
CREATE POLICY "Teachers can view their own correction requests" ON correction_requests
    FOR SELECT TO authenticated USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert correction requests" ON correction_requests
    FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid());

-- Admins and Principals can view and update all requests
CREATE POLICY "Admins can view all correction requests" ON correction_requests
    FOR SELECT TO authenticated USING (
        (SELECT is_admin() OR is_principal())
    );

CREATE POLICY "Admins can update correction requests" ON correction_requests
    FOR UPDATE TO authenticated USING (
        (SELECT is_admin() OR is_principal())
    );


COMMIT;
-- 43_remove_class_id_from_students.sql
BEGIN;

-- 1. DROP ALL EXISTING RLS POLICIES ON AFFECTED TABLES
DROP POLICY IF EXISTS "Students manage scope" ON students;
DROP POLICY IF EXISTS "Visits manage scope" ON home_visits;
DROP POLICY IF EXISTS "Interventions manage scope" ON support_interventions;
DROP POLICY IF EXISTS "Parent contacts manage scope" ON parent_contacts;

-- For these, we also drop any legacy policies from 28 or 35 that might still be lingering (just in case)
DROP POLICY IF EXISTS "Teachers modify students in class" ON students;
DROP POLICY IF EXISTS "Teachers modify visits in class" ON home_visits;
DROP POLICY IF EXISTS "Teachers modify parent contacts in class" ON parent_contacts;

-- 2. RECREATE POLICIES USING student_enrollments AS THE AUTHORIZATION BRIDGE
-- We enforce that a teacher can manage a student IF that student has an active enrollment in the teacher's active class.

-- Students
CREATE POLICY "Students manage scope" ON students FOR ALL USING (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM student_enrollments se
    JOIN classes ON classes.id = se.class_id 
    WHERE se.student_id = students.id AND (
      (is_principal() AND classes.school_id = user_school_id()) OR 
      (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = se.academic_year_id AND is_active = TRUE))
    )
  )
) WITH CHECK (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM student_enrollments se
    JOIN classes ON classes.id = se.class_id 
    WHERE se.student_id = students.id AND (
      (is_principal() AND classes.school_id = user_school_id()) OR 
      (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = se.academic_year_id AND is_active = TRUE))
    )
  )
);

-- Home Visits
CREATE POLICY "Visits manage scope" ON home_visits FOR ALL USING (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM student_enrollments se
    JOIN classes ON classes.id = se.class_id 
    WHERE se.student_id = home_visits.student_id AND (
      (is_principal() AND classes.school_id = user_school_id()) OR 
      (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = se.academic_year_id AND is_active = TRUE))
    )
  )
) WITH CHECK (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM student_enrollments se
    JOIN classes ON classes.id = se.class_id 
    WHERE se.student_id = home_visits.student_id AND (
      (is_principal() AND classes.school_id = user_school_id()) OR 
      (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = se.academic_year_id AND is_active = TRUE))
    )
  )
);

-- Parent Contacts
CREATE POLICY "Parent contacts manage scope" ON parent_contacts FOR ALL USING (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM student_enrollments se
    JOIN classes ON classes.id = se.class_id 
    WHERE se.student_id = parent_contacts.student_id AND (
      (is_principal() AND classes.school_id = user_school_id()) OR 
      (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = se.academic_year_id AND is_active = TRUE))
    )
  )
) WITH CHECK (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM student_enrollments se
    JOIN classes ON classes.id = se.class_id 
    WHERE se.student_id = parent_contacts.student_id AND (
      (is_principal() AND classes.school_id = user_school_id()) OR 
      (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = se.academic_year_id AND is_active = TRUE))
    )
  )
);

-- Support Interventions (joins via support_cases which joins via student_enrollments)
CREATE POLICY "Interventions manage scope" ON support_interventions FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM support_cases WHERE support_cases.id = support_interventions.case_id AND (
    (is_principal() AND EXISTS (
        SELECT 1 FROM student_enrollments se
        JOIN classes ON classes.id = se.class_id 
        WHERE se.student_id = support_cases.student_id AND classes.school_id = user_school_id()
    )) OR 
    support_cases.teacher_id = auth.uid()
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM support_cases WHERE support_cases.id = support_interventions.case_id AND (
    (is_principal() AND EXISTS (
        SELECT 1 FROM student_enrollments se
        JOIN classes ON classes.id = se.class_id 
        WHERE se.student_id = support_cases.student_id AND classes.school_id = user_school_id()
    )) OR 
    support_cases.teacher_id = auth.uid()
  ))
);

-- 3. DROP COLUMNS FROM STUDENTS
-- This is the critical architectural shift. We drop the duplicate operational fields.
-- The view active_class_rosters will need to be re-created since it referenced these.
DROP VIEW IF EXISTS active_class_rosters CASCADE;

-- Drop the columns
ALTER TABLE students DROP COLUMN IF EXISTS class_id CASCADE;
ALTER TABLE students DROP COLUMN IF EXISTS desk_number CASCADE;
ALTER TABLE students DROP COLUMN IF EXISTS room_number CASCADE;

-- 4. RECREATE ACTIVE_CLASS_ROSTERS VIEW
CREATE OR REPLACE VIEW active_class_rosters AS
SELECT 
    e.class_id as enrollment_class_id, 
    c.name as class_name, 
    c.academic_year_id,
    c.teacher_id,
    e.enrollment_status as current_enrollment_status,
    e.desk_number,
    e.room_number,
    s.*
FROM student_enrollments e
JOIN classes c ON c.id = e.class_id
JOIN students s ON s.id = e.student_id
WHERE s.is_active = true 
  AND (e.enrollment_status = 'active' OR e.enrollment_status = 'enrolled' OR e.enrollment_status IS NULL);

-- 5. UPDATE FUNCTIONS
-- bulk_quick_register_students
CREATE OR REPLACE FUNCTION bulk_quick_register_students(
    student_records JSONB,
    target_year_id UUID,
    admin_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    record JSONB;
    v_student_id UUID;
    v_class_id UUID;
    v_student_id_number TEXT;
    v_full_name TEXT;
    v_gender TEXT;
    v_status TEXT;
    v_desk_number TEXT;
    v_room_number TEXT;
    
    v_dob DATE;
    v_address TEXT;
    v_father_name TEXT;
    v_father_job TEXT;
    v_father_phone TEXT;
    v_mother_name TEXT;
    v_mother_job TEXT;
    v_mother_phone TEXT;
    v_parent_phone TEXT;
    
    affected_count INT := 0;
BEGIN
    FOR record IN SELECT * FROM jsonb_array_elements(student_records)
    LOOP
        v_class_id := (record->>'class_id')::UUID;
        v_student_id_number := record->>'student_id_number';
        v_full_name := record->>'full_name';
        v_gender := record->>'gender';
        v_status := COALESCE(record->>'status', 'new');
        v_desk_number := record->>'desk_number';
        v_room_number := record->>'room_number';
        
        BEGIN
            v_dob := (record->>'dob')::DATE;
        EXCEPTION WHEN OTHERS THEN
            v_dob := NULL;
        END;

        v_address := record->>'address';
        v_father_name := record->>'father_name';
        v_father_job := record->>'father_job';
        v_father_phone := record->>'father_phone';
        v_mother_name := record->>'mother_name';
        v_mother_job := record->>'mother_job';
        v_mother_phone := record->>'mother_phone';
        
        v_parent_phone := COALESCE(v_father_phone, v_mother_phone);

        SELECT id INTO v_student_id FROM students WHERE student_id_number = v_student_id_number LIMIT 1;
        
        IF v_student_id IS NULL THEN
            -- Insert new student Master Identity
            INSERT INTO students (
                student_id_number, full_name, gender, status, is_active,
                dob, current_address, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, parent_phone
            ) VALUES (
                v_student_id_number, v_full_name, v_gender, v_status, true,
                v_dob, v_address, v_father_name, v_father_job, v_father_phone, v_mother_name, v_mother_job, v_mother_phone, v_parent_phone
            ) RETURNING id INTO v_student_id;
        ELSE
            -- Update core fields
            UPDATE students 
            SET 
                full_name = COALESCE(v_full_name, full_name),
                gender = COALESCE(v_gender, gender),
                is_active = true,
                dob = COALESCE(v_dob, dob),
                current_address = COALESCE(v_address, current_address),
                father_name = COALESCE(v_father_name, father_name),
                father_job = COALESCE(v_father_job, father_job),
                father_phone = COALESCE(v_father_phone, father_phone),
                mother_name = COALESCE(v_mother_name, mother_name),
                mother_job = COALESCE(v_mother_job, mother_job),
                mother_phone = COALESCE(v_mother_phone, mother_phone),
                parent_phone = COALESCE(v_parent_phone, parent_phone),
                updated_at = NOW()
            WHERE id = v_student_id;
        END IF;

        -- Upsert the student enrollment for the target academic year (Operational data goes here)
        INSERT INTO student_enrollments (
            student_id, class_id, academic_year_id, enrollment_status, year_result, desk_number, room_number
        ) VALUES (
            v_student_id, v_class_id, target_year_id, 'active', 'enrolled', v_desk_number, v_room_number
        )
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET
            class_id = COALESCE(EXCLUDED.class_id, student_enrollments.class_id),
            desk_number = COALESCE(EXCLUDED.desk_number, student_enrollments.desk_number),
            room_number = COALESCE(EXCLUDED.room_number, student_enrollments.room_number),
            enrollment_status = 'active',
            updated_at = NOW();

        affected_count := affected_count + 1;
    END LOOP;

    IF affected_count > 0 AND admin_user_id IS NOT NULL THEN
        INSERT INTO audit_logs (user_id, action) 
        VALUES (admin_user_id, 'បានចុះឈ្មោះសិស្សរហ័សចំនួន ' || affected_count || ' នាក់តាមរយៈការនាំចូល (Import/Grid)');
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'count', affected_count, 
        'message', 'បានចុះឈ្មោះសិស្សរហ័សចំនួន ' || affected_count || ' នាក់ដោយជោគជ័យ'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate get_principal_dashboard_stats to avoid using students.class_id
CREATE OR REPLACE FUNCTION get_principal_dashboard_stats(
    p_school_id TEXT,
    p_academic_year_id UUID
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    IF NOT is_admin() AND NOT (is_principal() AND user_school_id() = p_school_id) THEN
        RAISE EXCEPTION 'Forbidden: You do not have permission to view this school''s stats.';
    END IF;

    WITH active_classes AS (
        SELECT id, name, grade, track 
        FROM classes 
        WHERE school_id = p_school_id 
          AND academic_year_id = p_academic_year_id
          AND is_archived = false
    ),
    -- Replaced active_students direct usage to join via student_enrollments
    active_students_agg AS (
        SELECT 
            COUNT(s.id) AS total_students,
            COUNT(s.id) FILTER (WHERE s.gender IN ('F', 'ស្រី')) AS girls_count,
            COUNT(s.id) FILTER (WHERE s.dropout_risk = true OR s.is_slow_learner = true) AS at_risk_count,
            jsonb_agg(
                jsonb_build_object(
                    'id', s.id,
                    'name', s.full_name,
                    'reasons', CASE 
                        WHEN s.dropout_risk = true AND s.is_slow_learner = true THEN '["ហានិភ័យបោះបង់ការសិក្សា (អវត្តមានច្រើន / ពិន្ទុធ្លាក់ចុះ)", "សិស្សរៀនយឺត (ត្រូវការការជួយបំប៉ន)"]'::jsonb
                        WHEN s.dropout_risk = true THEN '["ហានិភ័យបោះបង់ការសិក្សា (អវត្តមានច្រើន / ពិន្ទុធ្លាក់ចុះ)"]'::jsonb
                        WHEN s.is_slow_learner = true THEN '["សិស្សរៀនយឺត (ត្រូវការការជួយបំប៉ន)"]'::jsonb
                        ELSE '["ស្ថិតក្នុងការតាមដានពិសេស"]'::jsonb
                    END,
                    'severity', CASE WHEN s.dropout_risk = true THEN 'high' ELSE 'medium' END
                )
            ) FILTER (WHERE s.dropout_risk = true OR s.is_slow_learner = true) AS at_risk_list
        FROM students s
        JOIN student_enrollments se ON se.student_id = s.id
        WHERE se.academic_year_id = p_academic_year_id
          AND se.class_id IN (SELECT id FROM active_classes)
          AND s.is_active = true
    ),
    attendance_stats AS (
        SELECT 
            TO_CHAR(date, 'YYYY-MM') AS month_key,
            COUNT(*) FILTER (WHERE status IN ('present', 'late', 'permission', 'P')) AS present_count,
            COUNT(*) AS total_count
        FROM attendance_records a
        WHERE a.class_id IN (SELECT id FROM active_classes)
        GROUP BY TO_CHAR(date, 'YYYY-MM')
    ),
    grade_stats AS (
        SELECT 
            period,
            AVG(
                CASE WHEN total_score > 0 THEN (total_score / (CASE WHEN CAST(c.grade AS INT) >= 10 THEN 500 ELSE 400 END)) * 100 ELSE NULL END
            ) AS avg_pct
        FROM grades g
        JOIN active_classes c ON c.id = g.class_id
        WHERE total_score > 0
        GROUP BY period
    ),
    grade_level_stats AS (
        SELECT 
            c.grade,
            COUNT(DISTINCT c.id) AS classes_count,
            COUNT(DISTINCT se.student_id) AS students_count,
            COUNT(a.id) FILTER (WHERE a.status IN ('present', 'late', 'permission', 'P')) AS att_present,
            COUNT(a.id) AS att_total,
            AVG(
                CASE WHEN g.total_score > 0 THEN (g.total_score / (CASE WHEN CAST(c.grade AS INT) >= 10 THEN 500 ELSE 400 END)) * 100 ELSE NULL END
            ) AS avg_score_pct
        FROM active_classes c
        LEFT JOIN student_enrollments se ON se.class_id = c.id AND se.academic_year_id = p_academic_year_id
        LEFT JOIN attendance_records a ON a.class_id = c.id
        LEFT JOIN grades g ON g.class_id = c.id
        GROUP BY c.grade
    )
    SELECT jsonb_build_object(
        'total_students', COALESCE((SELECT total_students FROM active_students_agg), 0),
        'girls_count', COALESCE((SELECT girls_count FROM active_students_agg), 0),
        'boys_count', COALESCE((SELECT total_students FROM active_students_agg), 0) - COALESCE((SELECT girls_count FROM active_students_agg), 0),
        'at_risk_count', COALESCE((SELECT at_risk_count FROM active_students_agg), 0),
        'at_risk_list', COALESCE((SELECT at_risk_list FROM active_students_agg), '[]'::jsonb),
        'attendance_by_month', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM attendance_stats t), '[]'::jsonb),
        'grade_by_period', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM grade_stats t), '[]'::jsonb),
        'grade_level_stats', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM grade_level_stats t), '[]'::jsonb)
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RECREATE PROMOTE_STUDENTS RPC
CREATE OR REPLACE FUNCTION promote_students(
    p_source_class_id UUID,
    p_target_class_id UUID,
    p_eligible_student_ids UUID[]
) RETURNS JSONB AS $$
DECLARE
    promoted_count INT := 0;
    actual_uid UUID;
    caller_school_id TEXT;
    is_authorized BOOLEAN;
    source_school_id TEXT;
    target_school_id TEXT;
    source_year_id UUID;
    target_year_id UUID;
BEGIN
    actual_uid := auth.uid();
    
    IF actual_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: You must be logged in to promote students.';
    END IF;

    -- Validate caller role and school
    SELECT role IN ('admin', 'principal'), school_id 
    INTO is_authorized, caller_school_id
    FROM profiles WHERE id = actual_uid;

    IF NOT is_authorized THEN
        RAISE EXCEPTION 'Forbidden: Only administrators or principals can perform promotions.';
    END IF;

    IF p_source_class_id = p_target_class_id THEN
        RAISE EXCEPTION 'Source and target classes cannot be the same.';
    END IF;

    -- Validate cross-school promotion
    SELECT school_id, academic_year_id INTO source_school_id, source_year_id FROM classes WHERE id = p_source_class_id;
    SELECT school_id, academic_year_id INTO target_school_id, target_year_id FROM classes WHERE id = p_target_class_id;

    IF source_school_id != target_school_id THEN
        RAISE EXCEPTION 'Forbidden: Cannot promote students across different schools.';
    END IF;

    -- If principal, ensure classes belong to their school
    IF NOT is_admin() AND caller_school_id != source_school_id THEN
        RAISE EXCEPTION 'Forbidden: You cannot promote students outside your school.';
    END IF;

    -- Upsert source enrollments (update year_result to 'promoted')
    IF source_year_id IS NOT NULL THEN
        UPDATE student_enrollments
        SET year_result = 'promoted', updated_at = NOW()
        WHERE class_id = p_source_class_id 
          AND academic_year_id = source_year_id 
          AND student_id = ANY(p_eligible_student_ids);
    END IF;

    -- Upsert target enrollments
    IF target_year_id IS NOT NULL THEN
        INSERT INTO student_enrollments (student_id, class_id, academic_year_id, enrollment_status, year_result, updated_at)
        SELECT e.student_id, p_target_class_id, target_year_id, 'active', 'enrolled', NOW()
        FROM student_enrollments e 
        WHERE e.class_id = p_source_class_id 
          AND e.student_id = ANY(p_eligible_student_ids)
          AND e.academic_year_id = source_year_id
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET 
            class_id = EXCLUDED.class_id,
            year_result = 'enrolled',
            updated_at = NOW();
    END IF;

    -- Ensure students are active
    UPDATE students SET is_active = true WHERE id = ANY(p_eligible_student_ids);

    SELECT array_length(p_eligible_student_ids, 1) INTO promoted_count;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Students promoted successfully',
        'promoted_count', COALESCE(promoted_count, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
