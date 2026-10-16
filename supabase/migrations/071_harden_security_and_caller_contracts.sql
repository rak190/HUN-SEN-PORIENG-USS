-- Migration 071: Harden Security & Caller Contracts for Service Role RPCs and Score Publishing
BEGIN;

-- ============================================================================
-- 1. HARDEN PROMOTE_STUDENTS (DELIBERATE CALLER CONTRACT)
-- ============================================================================

DROP FUNCTION IF EXISTS public.promote_students(UUID, UUID, UUID[]);
DROP FUNCTION IF EXISTS public.promote_students(UUID, UUID, UUID[], UUID);

CREATE OR REPLACE FUNCTION public.promote_students(
    p_source_class_id UUID,
    p_target_class_id UUID,
    p_eligible_student_ids UUID[],
    p_caller_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    promoted_count INT := 0;
    actual_uid UUID;
    caller_school_id TEXT;
    caller_role TEXT;
    source_school_id TEXT;
    target_school_id TEXT;
    source_year_id UUID;
    target_year_id UUID;
    v_target_year_status TEXT;
BEGIN
    -- 1. Resolve & Authenticate Caller Identity
    IF auth.role() = 'service_role' THEN
        IF p_caller_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: Caller identity required for service role execution.' USING ERRCODE = '42501';
        END IF;
        actual_uid := p_caller_id;
    ELSE
        actual_uid := auth.uid();
        IF actual_uid IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: You must be logged in to promote students.' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- 2. Independent Role & Profile Verification (Never trust caller ID alone)
    SELECT role, school_id INTO caller_role, caller_school_id 
    FROM public.profiles WHERE id = actual_uid;

    IF caller_role IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller profile not found in system.' USING ERRCODE = '42501';
    END IF;

    IF caller_role NOT IN ('admin', 'principal') THEN
        RAISE EXCEPTION 'Forbidden: Only administrators or principals can perform promotions.' USING ERRCODE = '42501';
    END IF;

    IF p_source_class_id = p_target_class_id THEN
        RAISE EXCEPTION 'Source and target classes cannot be the same.' USING ERRCODE = '22023';
    END IF;

    IF p_eligible_student_ids IS NULL OR array_length(p_eligible_student_ids, 1) IS NULL OR array_length(p_eligible_student_ids, 1) = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'No eligible students selected for promotion',
            'promoted_count', 0
        );
    END IF;

    -- 3. Institutional School Boundary Verification
    SELECT school_id, academic_year_id INTO source_school_id, source_year_id FROM public.classes WHERE id = p_source_class_id;
    SELECT school_id, academic_year_id INTO target_school_id, target_year_id FROM public.classes WHERE id = p_target_class_id;

    IF source_school_id IS DISTINCT FROM target_school_id THEN
        RAISE EXCEPTION 'Forbidden: Cannot promote students across different schools.' USING ERRCODE = '42501';
    END IF;

    IF caller_role = 'principal' AND (caller_school_id IS NULL OR source_school_id IS DISTINCT FROM caller_school_id) THEN
        RAISE EXCEPTION 'Forbidden: You cannot promote students outside your school institution.' USING ERRCODE = '42501';
    END IF;

    -- 4. Target Academic Year Lifecycle Check
    IF target_year_id IS NOT NULL THEN
        SELECT status INTO v_target_year_status FROM public.academic_years WHERE id = target_year_id;
        IF v_target_year_status IN ('closed', 'archived') THEN
            RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សាគោលដៅត្រូវបានបិទបញ្ចប់រួចហើយ (Target academic year is locked)' USING ERRCODE = '55000';
        END IF;
    END IF;

    -- 5. Atomic Execution
    IF source_year_id IS NOT NULL THEN
        UPDATE public.student_enrollments
        SET year_result = 'promoted', updated_at = NOW()
        WHERE class_id = p_source_class_id 
          AND academic_year_id = source_year_id 
          AND student_id = ANY(p_eligible_student_ids);
    END IF;

    IF target_year_id IS NOT NULL THEN
        INSERT INTO public.student_enrollments (student_id, class_id, academic_year_id, enrollment_status, year_result, updated_at)
        SELECT e.student_id, p_target_class_id, target_year_id, 'active', 'enrolled', NOW()
        FROM public.student_enrollments e 
        WHERE e.class_id = p_source_class_id 
          AND e.student_id = ANY(p_eligible_student_ids)
          AND e.academic_year_id = source_year_id
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET 
            class_id = EXCLUDED.class_id,
            enrollment_status = 'active',
            year_result = 'enrolled',
            updated_at = NOW();
    END IF;

    UPDATE public.students SET is_active = true WHERE id = ANY(p_eligible_student_ids);
    SELECT array_length(p_eligible_student_ids, 1) INTO promoted_count;

    -- 6. Audit Logging
    INSERT INTO public.audit_logs (user_id, action, target_table, record_id, details, school_id)
    VALUES (
        actual_uid,
        'promote_students',
        'student_enrollments',
        p_target_class_id,
        jsonb_build_object(
            'source_class_id', p_source_class_id,
            'target_class_id', p_target_class_id,
            'promoted_count', COALESCE(promoted_count, 0)
        ),
        target_school_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Students promoted successfully',
        'promoted_count', COALESCE(promoted_count, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 2. HARDEN MIGRATE_ACADEMIC_YEAR (DELIBERATE CALLER CONTRACT)
-- ============================================================================

DROP FUNCTION IF EXISTS public.migrate_academic_year(UUID, UUID);
DROP FUNCTION IF EXISTS public.migrate_academic_year(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION public.migrate_academic_year(
    p_source_year_id UUID,
    p_target_year_id UUID,
    p_caller_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    inserted_count INT := 0;
    actual_uid UUID;
    caller_school_id TEXT;
    caller_role TEXT;
    v_source_status TEXT;
    v_target_status TEXT;
BEGIN
    -- 1. Resolve & Authenticate Caller Identity
    IF auth.role() = 'service_role' THEN
        IF p_caller_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: Caller identity required for service role execution.' USING ERRCODE = '42501';
        END IF;
        actual_uid := p_caller_id;
    ELSE
        actual_uid := auth.uid();
        IF actual_uid IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: You must be logged in to migrate academic years.' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- 2. Independent Role Verification
    SELECT role, school_id INTO caller_role, caller_school_id 
    FROM public.profiles WHERE id = actual_uid;

    IF caller_role IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller profile not found in system.' USING ERRCODE = '42501';
    END IF;

    IF caller_role NOT IN ('admin', 'principal') THEN
        RAISE EXCEPTION 'Forbidden: Only administrators or principals can migrate academic years.' USING ERRCODE = '42501';
    END IF;

    IF p_source_year_id = p_target_year_id THEN
        RAISE EXCEPTION 'Source and Target Academic Years cannot be identical.' USING ERRCODE = '22023';
    END IF;

    -- 3. Academic Year Lifecycle Checks
    SELECT status INTO v_target_status FROM public.academic_years WHERE id = p_target_year_id;
    IF v_target_status IS NULL THEN
        RAISE EXCEPTION 'Target academic year not found.' USING ERRCODE = 'P0002';
    END IF;
    IF v_target_status IN ('closed', 'archived') THEN
        RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សាគោលដៅត្រូវបានបិទបញ្ចប់រួចហើយ' USING ERRCODE = '55000';
    END IF;

    -- 4. Atomic Class Migration
    WITH inserted AS (
        INSERT INTO public.classes (school_id, teacher_id, name, grade, shift, room_number, track, academic_year_id)
        SELECT 
            c.school_id, 
            NULL, -- Reset assigned teachers for the new academic cycle
            c.name, 
            c.grade, 
            COALESCE(c.shift, CASE WHEN c.grade IN ('10', '11', '12') THEN 'ព្រឹក' ELSE 'រសៀល' END), 
            c.room_number, 
            COALESCE(c.track, 'ទូទៅ'), 
            p_target_year_id
        FROM public.classes c
        WHERE c.academic_year_id = p_source_year_id
        AND (caller_role = 'admin' OR c.school_id = caller_school_id)
        AND NOT EXISTS (
            SELECT 1 FROM public.classes t 
            WHERE t.academic_year_id = p_target_year_id 
            AND LOWER(TRIM(t.name)) = LOWER(TRIM(c.name))
            AND t.school_id = c.school_id
        )
        RETURNING id
    )
    SELECT count(*) INTO inserted_count FROM inserted;

    -- 5. Audit Logging
    INSERT INTO public.audit_logs (user_id, action, target_table, record_id, details, school_id)
    VALUES (
        actual_uid,
        'migrate_academic_year',
        'classes',
        p_target_year_id,
        jsonb_build_object(
            'source_year_id', p_source_year_id,
            'target_year_id', p_target_year_id,
            'classes_migrated', inserted_count
        ),
        caller_school_id
    );

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
-- 3. ATOMIC SCORE PUBLISHING RPC (PUBLISH_SCORES_ATOMIC)
-- ============================================================================

DROP FUNCTION IF EXISTS public.publish_scores_atomic(TEXT, UUID);
DROP FUNCTION IF EXISTS public.publish_scores_atomic(TEXT, UUID, UUID);

CREATE OR REPLACE FUNCTION public.publish_scores_atomic(
    p_period TEXT,
    p_academic_year_id UUID,
    p_caller_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    actual_uid UUID;
    caller_role TEXT;
    caller_school_id TEXT;
    v_year_status TEXT;
    v_year_school_id TEXT;
    v_published_count INT := 0;
BEGIN
    -- 1. Caller Authentication
    IF auth.role() = 'service_role' THEN
        IF p_caller_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: Caller identity required for service role execution.' USING ERRCODE = '42501';
        END IF;
        actual_uid := p_caller_id;
    ELSE
        actual_uid := auth.uid();
        IF actual_uid IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: You must be logged in to publish scores.' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- 2. Independent Role Verification
    SELECT role, school_id INTO caller_role, caller_school_id 
    FROM public.profiles WHERE id = actual_uid;

    IF caller_role IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller profile not found.' USING ERRCODE = '42501';
    END IF;

    IF caller_role NOT IN ('admin', 'principal') THEN
        RAISE EXCEPTION 'Forbidden: Only administrators or principals can publish scores.' USING ERRCODE = '42501';
    END IF;

    -- 3. Academic Year Status & School Verification
    SELECT status, school_id INTO v_year_status, v_year_school_id 
    FROM public.academic_years WHERE id = p_academic_year_id;

    IF v_year_status IS NULL THEN
        RAISE EXCEPTION 'Academic year not found.' USING ERRCODE = 'P0002';
    END IF;

    IF v_year_status IN ('closed', 'archived') THEN
        RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សានេះត្រូវបានបិទបញ្ចប់រួចហើយ (Academic year is locked)' USING ERRCODE = '55000';
    END IF;

    IF caller_role = 'principal' AND (caller_school_id IS NULL OR v_year_school_id IS DISTINCT FROM caller_school_id) THEN
        RAISE EXCEPTION 'Forbidden: Cannot publish scores for another school institution.' USING ERRCODE = '42501';
    END IF;

    -- 4. Atomic State Transition (Draft -> Published)
    UPDATE public.grades
    SET status = 'published', updated_at = NOW()
    WHERE period = p_period 
      AND academic_year_id = p_academic_year_id 
      AND status = 'draft'
      AND (caller_role = 'admin' OR class_id IN (SELECT id FROM public.classes WHERE school_id = caller_school_id));

    GET DIAGNOSTICS v_published_count = ROW_COUNT;

    -- 5. Audit Logging
    INSERT INTO public.audit_logs (user_id, action, target_table, record_id, details, school_id)
    VALUES (
        actual_uid,
        'publish_scores',
        'grades',
        p_academic_year_id,
        jsonb_build_object(
            'period', p_period,
            'academic_year_id', p_academic_year_id,
            'published_count', v_published_count
        ),
        caller_school_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'published_count', v_published_count,
        'message', 'បានប្រកាសផ្សាយពិន្ទុជាផ្លូវការចំនួន ' || v_published_count || ' កំណត់ត្រា'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
