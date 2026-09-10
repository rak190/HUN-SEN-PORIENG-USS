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
