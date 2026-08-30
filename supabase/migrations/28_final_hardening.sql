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
