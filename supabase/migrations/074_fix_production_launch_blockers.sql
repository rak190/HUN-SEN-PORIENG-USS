-- Migration 074: Fix Production Launch Blockers
-- Description:
-- 1. Updates bulk_quick_register_students to support service_role execution with verified caller identity.
-- 2. Updates batch_upload_scores_atomic to support service_role execution with verified caller identity.
-- 3. Creates public.monthly_attendance_summaries table with unique constraint and RLS policies.

BEGIN;

-- ============================================================================
-- 1. HARDEN bulk_quick_register_students (SUPPORT SERVICE ROLE EXECUTION)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.bulk_quick_register_students(
    student_records JSONB,
    target_year_id UUID,
    admin_user_id UUID DEFAULT NULL
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
    v_desk_number TEXT;
    v_room_number TEXT;
    
    v_dob DATE;
    v_address TEXT;
    v_father_name TEXT;
    v_father_job TEXT;
    v_father_phone TEXT;
    v_mother_name TEXT;
    v_mother_job TEXT;
    v_mother_phone TEXT;
    v_parent_phone TEXT;
    
    affected_count INT := 0;
    
    v_effective_user_id UUID;
    v_caller_role TEXT;
    v_caller_school_id TEXT;
    v_class_school_id TEXT;
    v_class_teacher_id UUID;
    v_class_year_id UUID;
    v_year_status TEXT;
BEGIN
    -- 1. Resolve Effective User ID (supports authenticated session or verified service role call)
    IF auth.role() = 'service_role' THEN
        v_effective_user_id := COALESCE(admin_user_id, auth.uid());
    ELSE
        v_effective_user_id := auth.uid();
    END IF;

    IF v_effective_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required' USING ERRCODE = '42501';
    END IF;

    -- 2. Resolve caller profile
    SELECT role, school_id INTO v_caller_role, v_caller_school_id
    FROM public.profiles 
    WHERE id = v_effective_user_id;

    -- 3. Null-safe authorization condition
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'principal', 'teacher') THEN
        RAISE EXCEPTION 'Forbidden: Valid authorized user role required (caller role: %)', COALESCE(v_caller_role, 'none') USING ERRCODE = '42501';
    END IF;

    -- 4. Verify Academic Year Status
    SELECT status INTO v_year_status
    FROM public.academic_years
    WHERE id = target_year_id;

    IF v_year_status IS NULL THEN
        RAISE EXCEPTION 'Academic year not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_year_status IN ('closed', 'archived') THEN
        RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សានេះត្រូវបានបិទបញ្ចប់រួចហើយ (Academic year is locked)' USING ERRCODE = '55000';
    END IF;

    FOR record IN SELECT * FROM jsonb_array_elements(student_records)
    LOOP
        v_class_id := (record->>'class_id')::UUID;
        
        -- BOUNDARY & INTEGRITY CHECK
        SELECT school_id, teacher_id, academic_year_id INTO v_class_school_id, v_class_teacher_id, v_class_year_id
        FROM public.classes
        WHERE id = v_class_id;

        IF v_class_year_id IS NULL THEN
             RAISE EXCEPTION 'Data Integrity Error: Class % not found.', v_class_id USING ERRCODE = '23503';
        END IF;

        IF v_class_year_id != target_year_id THEN
             RAISE EXCEPTION 'Data Integrity Error: Class academic year does not match target year.' USING ERRCODE = '23503';
        END IF;

        -- Exhaustive role ownership verification
        IF v_caller_role = 'admin' THEN
            -- Admin has full cross-school / cross-class access
        ELSIF v_caller_role = 'principal' THEN
            IF v_caller_school_id IS NULL OR v_class_school_id IS DISTINCT FROM v_caller_school_id THEN
                RAISE EXCEPTION 'Forbidden: Principal does not have access to class %', v_class_id USING ERRCODE = '42501';
            END IF;
        ELSIF v_caller_role = 'teacher' THEN
            IF v_class_teacher_id IS NULL OR v_class_teacher_id != v_effective_user_id THEN
                RAISE EXCEPTION 'Forbidden: Teacher does not own class %', v_class_id USING ERRCODE = '42501';
            END IF;
        ELSE
            RAISE EXCEPTION 'Forbidden: Unauthorized role' USING ERRCODE = '42501';
        END IF;

        v_student_id_number := record->>'student_id_number';
        v_full_name := record->>'full_name';
        v_gender := record->>'gender';
        v_status := COALESCE(record->>'status', 'new');
        v_desk_number := record->>'desk_number';
        v_room_number := record->>'room_number';
        
        BEGIN
            v_dob := (record->>'dob')::DATE;
        EXCEPTION WHEN OTHERS THEN
            v_dob := NULL;
        END;

        v_address := record->>'address';
        v_father_name := record->>'father_name';
        v_father_job := record->>'father_job';
        v_father_phone := record->>'father_phone';
        v_mother_name := record->>'mother_name';
        v_mother_job := record->>'mother_job';
        v_mother_phone := record->>'mother_phone';
        v_parent_phone := record->>'parent_phone';

        -- Match student by student_id_number within school
        v_student_id := NULL;
        IF v_student_id_number IS NOT NULL AND TRIM(v_student_id_number) != '' THEN
            SELECT id INTO v_student_id 
            FROM public.students 
            WHERE student_id_number = TRIM(v_student_id_number) 
              AND (school_id = v_class_school_id OR school_id IS NULL)
            LIMIT 1;
        END IF;

        -- Create student if not exists
        IF v_student_id IS NULL THEN
            INSERT INTO public.students (
                student_id_number, full_name, gender, is_active, dob,
                current_address, father_name, father_job, father_phone,
                mother_name, mother_job, mother_phone, parent_phone, school_id
            ) VALUES (
                NULLIF(TRIM(v_student_id_number), ''), v_full_name, v_gender, true, v_dob,
                v_address, v_father_name, v_father_job, v_father_phone,
                v_mother_name, v_mother_job, v_mother_phone, v_parent_phone, v_class_school_id
            ) RETURNING id INTO v_student_id;
        ELSE
            UPDATE public.students 
            SET 
                full_name = COALESCE(v_full_name, full_name),
                gender = COALESCE(v_gender, gender),
                is_active = true,
                dob = COALESCE(v_dob, dob),
                current_address = COALESCE(v_address, current_address),
                father_name = COALESCE(v_father_name, father_name),
                father_job = COALESCE(v_father_job, father_job),
                father_phone = COALESCE(v_father_phone, father_phone),
                mother_name = COALESCE(v_mother_name, mother_name),
                mother_job = COALESCE(v_mother_job, mother_job),
                mother_phone = COALESCE(v_mother_phone, mother_phone),
                parent_phone = COALESCE(v_parent_phone, parent_phone),
                updated_at = NOW()
            WHERE id = v_student_id;
        END IF;

        -- Upsert student enrollment for the target academic year
        INSERT INTO public.student_enrollments (
            student_id, class_id, academic_year_id, enrollment_status, year_result, desk_number, room_number
        ) VALUES (
            v_student_id, v_class_id, target_year_id, 'active', 'enrolled', v_desk_number, v_room_number
        )
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET
            class_id = COALESCE(EXCLUDED.class_id, student_enrollments.class_id),
            desk_number = COALESCE(EXCLUDED.desk_number, student_enrollments.desk_number),
            room_number = COALESCE(EXCLUDED.room_number, student_enrollments.room_number),
            enrollment_status = 'active',
            updated_at = NOW();

        affected_count := affected_count + 1;
    END LOOP;

    IF affected_count > 0 AND v_effective_user_id IS NOT NULL THEN
        INSERT INTO public.audit_logs (user_id, action) 
        VALUES (v_effective_user_id, 'បានចុះឈ្មោះសិស្សរហ័សចំនួន ' || affected_count || ' នាក់តាមរយៈការនាំចូល (Import/Grid)');
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'count', affected_count, 
        'message', 'បានចុះឈ្មោះសិស្សរហ័សចំនួន ' || affected_count || ' នាក់ដោយជោគជ័យ'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.bulk_quick_register_students(JSONB, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bulk_quick_register_students(JSONB, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_quick_register_students(JSONB, UUID, UUID) TO service_role;

-- ============================================================================
-- 2. HARDEN batch_upload_scores_atomic (SUPPORT SERVICE ROLE EXECUTION)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.batch_upload_scores_atomic(
    p_scores JSONB,
    p_period TEXT,
    p_academic_year_id UUID DEFAULT NULL,
    p_caller_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_effective_user_id UUID;
    v_caller_role TEXT;
    v_caller_school_id TEXT;
    v_score JSONB;
    v_inserted_count INT := 0;
    v_year_id UUID := p_academic_year_id;
    v_target_class_id UUID;
    v_year_status TEXT;
    v_class_school_id TEXT;
    v_class_teacher_id UUID;
    v_total_score NUMERIC;
BEGIN
    -- 1. Caller Authentication
    IF auth.role() = 'service_role' THEN
        v_effective_user_id := COALESCE(p_caller_id, auth.uid());
    ELSE
        v_effective_user_id := auth.uid();
    END IF;

    IF v_effective_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT role, school_id INTO v_caller_role, v_caller_school_id
    FROM public.profiles 
    WHERE id = v_effective_user_id;

    -- 2. Caller authorization guard
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'principal', 'teacher') THEN
        RAISE EXCEPTION 'Forbidden: Valid authorized user role required (caller role: %)', COALESCE(v_caller_role, 'none') USING ERRCODE = '42501';
    END IF;

    -- Validate input is a JSON array
    IF p_scores IS NULL OR jsonb_typeof(p_scores) != 'array' THEN
        RAISE EXCEPTION 'Validation Error: p_scores must be a valid JSON array' USING ERRCODE = '22023';
    END IF;

    -- 3. Resolve Academic Year ID defensively if not explicitly passed
    IF v_year_id IS NULL AND jsonb_array_length(p_scores) > 0 THEN
        v_target_class_id := (p_scores->0->>'class_id')::UUID;
        SELECT academic_year_id INTO v_year_id 
        FROM public.classes 
        WHERE id = v_target_class_id;
    END IF;

    IF v_year_id IS NULL THEN
        RAISE EXCEPTION 'Missing academic_year_id: Cannot upload scores without an associated academic year'
        USING ERRCODE = '23502';
    END IF;

    -- 4. Check Institutional Year-End Lock
    SELECT status INTO v_year_status 
    FROM public.academic_years 
    WHERE id = v_year_id;

    IF v_year_status IN ('closed', 'archived') THEN
        RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សានេះត្រូវបានបិទបញ្ចប់ និងចាក់សោរួចហើយ (Academic year is locked)'
        USING ERRCODE = '55000';
    END IF;

    -- 5. Atomic Score Ingestion Loop
    FOR v_score IN SELECT * FROM jsonb_array_elements(p_scores)
    LOOP
        v_target_class_id := (v_score->>'class_id')::UUID;

        -- Exhaustive boundary check
        IF v_caller_role = 'admin' THEN
            -- Admin has full cross-school / cross-class access
        ELSIF v_caller_role = 'principal' THEN
            SELECT school_id INTO v_class_school_id FROM public.classes WHERE id = v_target_class_id;
            IF v_caller_school_id IS NULL OR v_class_school_id IS DISTINCT FROM v_caller_school_id THEN
                RAISE EXCEPTION 'Forbidden: Principal does not have access to class %', v_target_class_id USING ERRCODE = '42501';
            END IF;
        ELSIF v_caller_role = 'teacher' THEN
            SELECT teacher_id INTO v_class_teacher_id FROM public.classes WHERE id = v_target_class_id;
            IF v_class_teacher_id IS NULL OR v_class_teacher_id != v_effective_user_id THEN
                RAISE EXCEPTION 'Forbidden: Teacher does not own class %', v_target_class_id USING ERRCODE = '42501';
            END IF;
        ELSE
            RAISE EXCEPTION 'Forbidden: Unauthorized role' USING ERRCODE = '42501';
        END IF;

        -- Score bounds check
        v_total_score := (v_score->>'total_score')::NUMERIC;
        IF v_total_score IS NOT NULL AND v_total_score < 0 THEN
            RAISE EXCEPTION 'Validation Error: Total score cannot be negative (score: %)', v_total_score USING ERRCODE = '22003';
        END IF;
        IF v_total_score IS NOT NULL AND v_total_score > 1000 THEN
            RAISE EXCEPTION 'Validation Error: Total score exceeds maximum allowed ceiling of 1000 (score: %)', v_total_score USING ERRCODE = '22003';
        END IF;

        INSERT INTO public.grades (
            student_id,
            class_id,
            academic_year_id,
            period,
            scores,
            total_score,
            status,
            updated_at
        ) VALUES (
            (v_score->>'student_id')::UUID,
            v_target_class_id,
            v_year_id,
            p_period,
            v_score->'scores',
            v_total_score,
            'draft',
            NOW()
        )
        ON CONFLICT (student_id, period, academic_year_id) DO UPDATE SET
            scores = EXCLUDED.scores,
            total_score = EXCLUDED.total_score,
            class_id = EXCLUDED.class_id,
            status = 'draft',
            updated_at = NOW();

        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    -- 6. Audit Logging
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (
        v_effective_user_id,
        'batch_upload_scores',
        jsonb_build_object(
            'period', p_period,
            'academic_year_id', v_year_id,
            'uploaded_count', v_inserted_count
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'uploaded_count', v_inserted_count,
        'period', p_period,
        'academic_year_id', v_year_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.batch_upload_scores_atomic(JSONB, TEXT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.batch_upload_scores_atomic(JSONB, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_upload_scores_atomic(JSONB, TEXT, UUID, UUID) TO service_role;

-- ============================================================================
-- 3. CREATE public.monthly_attendance_summaries TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.monthly_attendance_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- Format: YYYY-MM e.g. '2026-11'
    absent_count INT NOT NULL DEFAULT 0,
    permission_count INT NOT NULL DEFAULT 0,
    late_count INT NOT NULL DEFAULT 0,
    root_cause TEXT,
    needs_home_visit BOOLEAN DEFAULT false,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_monthly_att_class_student_month UNIQUE (class_id, student_id, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_att_class_month ON public.monthly_attendance_summaries (class_id, month);
CREATE INDEX IF NOT EXISTS idx_monthly_att_student ON public.monthly_attendance_summaries (student_id);

ALTER TABLE public.monthly_attendance_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monthly_att_read_policy" ON public.monthly_attendance_summaries;
CREATE POLICY "monthly_att_read_policy" ON public.monthly_attendance_summaries
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'principal')
        )
        OR EXISTS (
            SELECT 1 FROM public.classes c 
            WHERE c.id = monthly_attendance_summaries.class_id AND c.teacher_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "monthly_att_write_policy" ON public.monthly_attendance_summaries;
CREATE POLICY "monthly_att_write_policy" ON public.monthly_attendance_summaries
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'principal')
        )
        OR EXISTS (
            SELECT 1 FROM public.classes c 
            WHERE c.id = monthly_attendance_summaries.class_id AND c.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'principal')
        )
        OR EXISTS (
            SELECT 1 FROM public.classes c 
            WHERE c.id = monthly_attendance_summaries.class_id AND c.teacher_id = auth.uid()
        )
    );

COMMIT;
