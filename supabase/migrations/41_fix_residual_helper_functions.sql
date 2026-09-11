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
