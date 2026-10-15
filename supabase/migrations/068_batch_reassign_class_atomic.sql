-- Migration 068: Create Atomic Batch Class Reassignment RPC
-- Description:
-- 1. Creates batch_reassign_class_atomic to transactionally reassign student cohorts to a target class
--    within an academic year, ensuring all-or-nothing atomicity.
-- 2. Enforces strict role checks (admin or principal) and institutional scoping (principal's school).
-- 3. Enforces academic year lifecycle lock status checks.
-- 4. Records authoritative audit logs.

BEGIN;

CREATE OR REPLACE FUNCTION public.batch_reassign_class_atomic(
    p_student_ids UUID[],
    p_target_class_id UUID,
    p_academic_year_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_school_id TEXT;
    v_target_school_id TEXT;
    v_target_year_id UUID;
    v_year_status TEXT;
    v_count INT;
    v_foreign_count INT;
BEGIN
    -- 1. Authentication Check
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT role, school_id INTO v_caller_role, v_caller_school_id
    FROM public.profiles
    WHERE id = auth.uid();

    -- 2. Role Authorization Guard (Admin or Principal only)
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'principal') THEN
        RAISE EXCEPTION 'Forbidden: Only Admin or Principal can reassign student classes' USING ERRCODE = '42501';
    END IF;

    -- 3. Validate Inputs
    IF p_student_ids IS NULL OR array_length(p_student_ids, 1) IS NULL OR array_length(p_student_ids, 1) = 0 THEN
        RAISE EXCEPTION 'Validation Error: student_ids array cannot be empty' USING ERRCODE = '22023';
    END IF;

    IF p_target_class_id IS NULL THEN
        RAISE EXCEPTION 'Validation Error: target_class_id is required' USING ERRCODE = '22023';
    END IF;

    IF p_academic_year_id IS NULL THEN
        RAISE EXCEPTION 'Validation Error: academic_year_id is required' USING ERRCODE = '22023';
    END IF;

    -- 4. Verify Target Class Exists & Check School
    SELECT school_id, academic_year_id INTO v_target_school_id, v_target_year_id
    FROM public.classes
    WHERE id = p_target_class_id;

    IF v_target_school_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.classes WHERE id = p_target_class_id) THEN
        RAISE EXCEPTION 'Target class not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_caller_role = 'principal' AND (v_caller_school_id IS NULL OR v_target_school_id IS DISTINCT FROM v_caller_school_id) THEN
        RAISE EXCEPTION 'Forbidden: Cannot transfer students to a class outside your school institution' USING ERRCODE = '42501';
    END IF;

    -- 5. Verify Academic Year Lifecycle Status
    SELECT status INTO v_year_status
    FROM public.academic_years
    WHERE id = p_academic_year_id;

    IF v_year_status IS NULL THEN
        RAISE EXCEPTION 'Academic year not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_year_status IN ('closed', 'archived') THEN
        RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សានេះត្រូវបានបិទបញ្ចប់ និងចាក់សោរួចហើយ (Academic year is locked)'
        USING ERRCODE = '55000';
    END IF;

    -- 6. Verify Principal Does Not Reassign Students from Other Schools
    IF v_caller_role = 'principal' AND v_caller_school_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_foreign_count
        FROM public.student_enrollments se
        JOIN public.classes c ON c.id = se.class_id
        WHERE se.student_id = ANY(p_student_ids)
          AND se.academic_year_id = p_academic_year_id
          AND c.school_id IS DISTINCT FROM v_caller_school_id;

        IF v_foreign_count > 0 THEN
            RAISE EXCEPTION 'Forbidden: Cannot transfer students belonging to another school institution' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- 7. Transactional Upsert into student_enrollments
    INSERT INTO public.student_enrollments (
        student_id,
        class_id,
        academic_year_id,
        enrollment_status,
        updated_at
    )
    SELECT 
        s_id,
        p_target_class_id,
        p_academic_year_id,
        'active',
        NOW()
    FROM unnest(p_student_ids) AS s_id
    ON CONFLICT (student_id, academic_year_id)
    DO UPDATE SET
        class_id = EXCLUDED.class_id,
        enrollment_status = 'active',
        updated_at = NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- 8. Authoritative Audit Log
    INSERT INTO public.audit_logs (
        user_id,
        action,
        target_table,
        record_id,
        details
    ) VALUES (
        auth.uid(),
        'batch_reassign_class',
        'student_enrollments',
        p_target_class_id,
        jsonb_build_object(
            'student_count', array_length(p_student_ids, 1),
            'academic_year_id', p_academic_year_id,
            'target_class_id', p_target_class_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'reassigned_count', array_length(p_student_ids, 1)
    );
END;
$$;

-- Grant Execution Permissions
REVOKE ALL ON FUNCTION public.batch_reassign_class_atomic(UUID[], UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.batch_reassign_class_atomic(UUID[], UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_reassign_class_atomic(UUID[], UUID, UUID) TO service_role;

COMMIT;
