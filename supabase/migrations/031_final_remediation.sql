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
