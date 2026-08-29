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
