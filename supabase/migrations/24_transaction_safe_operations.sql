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
