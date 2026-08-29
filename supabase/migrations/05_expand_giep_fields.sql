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
