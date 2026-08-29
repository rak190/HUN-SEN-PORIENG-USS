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
