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
