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
