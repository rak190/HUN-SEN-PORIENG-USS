-- Migration 063: Harden SQL Authorization, Fix NULL-safe Role Conditions, and Ensure Snapshot Rollback Schema Compatibility
-- Description:
-- 1. Defensively ensure grade_snapshots.school_id is TEXT referencing public.schools(id) ON DELETE CASCADE.
-- 2. Harden bulk_quick_register_students, batch_upload_scores_atomic, rollback_grade_snapshot_atomic, and batch_register_students_atomic
--    against NULL role bypasses by using explicit NULL checks and exhaustive IF/ELSIF/ELSE branches.
-- 3. Align rollback_grade_snapshot_atomic to restore into the actual deployed schema of public.grades (scores JSONB, total_score, status)
--    instead of non-existent legacy columns (subject_id, score_month_1, etc.).
-- 4. Enforce strict SECURITY DEFINER search_path and grant EXECUTE only to authenticated and service_role.

-- 1. Ensure grade_snapshots column types are strictly compatible
DO $$
BEGIN
    -- If school_id is UUID, alter or replace to TEXT referencing schools(id)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'grade_snapshots' 
          AND column_name = 'school_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.grade_snapshots DROP COLUMN school_id CASCADE;
        ALTER TABLE public.grade_snapshots ADD COLUMN school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'grade_snapshots' 
          AND column_name = 'school_id'
    ) THEN
        ALTER TABLE public.grade_snapshots ADD COLUMN school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'grade_snapshots' 
          AND column_name = 'academic_year_id'
    ) THEN
        ALTER TABLE public.grade_snapshots ADD COLUMN academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Harden bulk_quick_register_students
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
    
    v_caller_role TEXT;
    v_caller_school_id TEXT;
    v_class_school_id TEXT;
    v_class_teacher_id UUID;
    v_class_year_id UUID;
    v_existing_enrollment_class_id UUID;
BEGIN
    -- 1. Explicit unauthenticated check
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required' USING ERRCODE = '42501';
    END IF;

    -- 2. Resolve caller profile
    SELECT role, school_id INTO v_caller_role, v_caller_school_id
    FROM public.profiles 
    WHERE id = auth.uid();

    -- 3. Null-safe authorization condition
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'principal', 'teacher') THEN
        RAISE EXCEPTION 'Forbidden: Valid authorized user role required (caller role: %)', COALESCE(v_caller_role, 'none') USING ERRCODE = '42501';
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
            IF v_class_teacher_id IS NULL OR v_class_teacher_id != auth.uid() THEN
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
        
        v_parent_phone := COALESCE(v_father_phone, v_mother_phone);

        SELECT id INTO v_student_id FROM public.students WHERE student_id_number = v_student_id_number LIMIT 1;
        
        IF v_student_id IS NULL THEN
            -- Insert new student Master Identity
            INSERT INTO public.students (
                student_id_number, full_name, gender, status, is_active,
                dob, current_address, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, parent_phone
            ) VALUES (
                v_student_id_number, v_full_name, v_gender, v_status, true,
                v_dob, v_address, v_father_name, v_father_job, v_father_phone, v_mother_name, v_mother_job, v_mother_phone, v_parent_phone
            ) RETURNING id INTO v_student_id;
        ELSE
            -- Prevent teacher from hijacking a student already enrolled in ANOTHER class for the same year
            IF v_caller_role = 'teacher' THEN
                SELECT class_id INTO v_existing_enrollment_class_id
                FROM public.student_enrollments
                WHERE student_id = v_student_id AND academic_year_id = target_year_id AND enrollment_status = 'active';

                IF v_existing_enrollment_class_id IS NOT NULL AND v_existing_enrollment_class_id != v_class_id THEN
                    RAISE EXCEPTION 'Data Integrity Error: Student % is already actively enrolled in another class for this year.', v_student_id_number
                    USING ERRCODE = '23503';
                END IF;
            END IF;

            -- Update core fields
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

        -- Upsert the student enrollment for the target academic year
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

    IF affected_count > 0 AND admin_user_id IS NOT NULL THEN
        INSERT INTO public.audit_logs (user_id, action) 
        VALUES (admin_user_id, 'បានចុះឈ្មោះសិស្សរហ័សចំនួន ' || affected_count || ' នាក់តាមរយៈការនាំចូល (Import/Grid)');
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'count', affected_count, 
        'message', 'បានចុះឈ្មោះសិស្សរហ័សចំនួន ' || affected_count || ' នាក់ដោយជោគជ័យ'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. Harden batch_upload_scores_atomic
CREATE OR REPLACE FUNCTION public.batch_upload_scores_atomic(
    p_scores JSONB,
    p_period TEXT,
    p_academic_year_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_school_id TEXT;
    v_score JSONB;
    v_inserted_count INT := 0;
    v_year_id UUID := p_academic_year_id;
    v_target_class_id UUID;
    v_year_status TEXT;
    v_class_school_id TEXT;
    v_class_teacher_id UUID;
BEGIN
    -- 1. Explicit unauthenticated check
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT role, school_id INTO v_caller_role, v_caller_school_id
    FROM public.profiles 
    WHERE id = auth.uid();

    -- 2. Null-safe caller authorization guard
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'principal', 'teacher') THEN
        RAISE EXCEPTION 'Forbidden: Valid authorized user role required (caller role: %)', COALESCE(v_caller_role, 'none') USING ERRCODE = '42501';
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
            IF v_class_teacher_id IS NULL OR v_class_teacher_id != auth.uid() THEN
                RAISE EXCEPTION 'Forbidden: Teacher does not own class %', v_target_class_id USING ERRCODE = '42501';
            END IF;
        ELSE
            RAISE EXCEPTION 'Forbidden: Unauthorized role' USING ERRCODE = '42501';
        END IF;

        -- INTEGRITY CHECK: Ensure student is actually enrolled in this exact class and year
        IF NOT EXISTS (
            SELECT 1 FROM public.student_enrollments
            WHERE student_id = (v_score->>'student_id')::UUID
              AND class_id = v_target_class_id
              AND academic_year_id = v_year_id
              AND enrollment_status = 'active'
        ) THEN
            RAISE EXCEPTION 'Data Integrity Error: Student % is not actively enrolled in class % for academic year %', (v_score->>'student_id'), v_target_class_id, v_year_id
            USING ERRCODE = '23503';
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
            (v_score->'scores')::JSONB,
            (v_score->>'total_score')::NUMERIC,
            COALESCE(v_score->>'status', 'draft'),
            NOW()
        )
        ON CONFLICT (student_id, period, academic_year_id) 
        DO UPDATE SET
            class_id = EXCLUDED.class_id,
            scores = EXCLUDED.scores,
            total_score = EXCLUDED.total_score,
            status = EXCLUDED.status,
            updated_at = NOW();

        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'count', v_inserted_count,
        'academic_year_id', v_year_id,
        'period', p_period,
        'message', 'បានបញ្ចូលពិន្ទុ ' || v_inserted_count || ' ដោយជោគជ័យ'
    );
END;
$$;

-- 4. Harden rollback_grade_snapshot_atomic with matching grades table schema
CREATE OR REPLACE FUNCTION public.rollback_grade_snapshot_atomic(
    p_snapshot_id UUID,
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
    v_deleted_count INT := 0;
    v_restored_count INT := 0;
    v_period TEXT;
    v_payload JSONB;
    v_snapshot_year_id UUID;
    v_snapshot_school_id TEXT;
    v_year_status TEXT;
BEGIN
    -- 1. Explicit unauthenticated check
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT role, school_id INTO v_caller_role, v_caller_school_id 
    FROM public.profiles WHERE id = auth.uid();
    
    -- 2. Null-safe authorization guard (Admin or Principal only)
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'principal') THEN
        RAISE EXCEPTION 'Forbidden: Only Admin or Principal can rollback scores' USING ERRCODE = '42501';
    END IF;

    -- 3. Verify snapshot exists and fetch context
    SELECT period, grades_payload, academic_year_id, school_id 
    INTO v_period, v_payload, v_snapshot_year_id, v_snapshot_school_id
    FROM public.grade_snapshots
    WHERE id = p_snapshot_id;

    IF v_period IS NULL THEN
        RAISE EXCEPTION 'Snapshot not found';
    END IF;

    -- 4. INTEGRITY CHECK: Prevent cross-school/year rollback
    IF v_caller_role = 'principal' AND (v_caller_school_id IS NULL OR v_snapshot_school_id IS DISTINCT FROM v_caller_school_id) THEN
        RAISE EXCEPTION 'Forbidden: Cannot rollback a snapshot from another school' USING ERRCODE = '42501';
    END IF;

    IF v_snapshot_year_id != p_academic_year_id THEN
        RAISE EXCEPTION 'Data Integrity Error: Snapshot academic year does not match requested year' USING ERRCODE = '23503';
    END IF;

    -- 5. Check Institutional Year-End Lock
    SELECT status INTO v_year_status 
    FROM public.academic_years 
    WHERE id = p_academic_year_id;

    IF v_year_status IN ('closed', 'archived') THEN
        RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សានេះត្រូវបានបិទបញ្ចប់ និងចាក់សោរួចហើយ (Academic year is locked)'
        USING ERRCODE = '55000';
    END IF;

    -- 6. Atomic execution: Delete current scores for the target period and academic year
    IF jsonb_array_length(v_payload) > 0 THEN
        DELETE FROM public.grades
        WHERE period = v_period 
          AND academic_year_id = p_academic_year_id
          AND class_id IN (
              SELECT DISTINCT (rec->>'class_id')::UUID 
              FROM jsonb_array_elements(v_payload) AS rec
              WHERE rec->>'class_id' IS NOT NULL
          );
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

        -- 7. Re-insert previous grades payload matching real public.grades schema (scores JSONB, total_score, status)
        INSERT INTO public.grades (
            student_id,
            class_id,
            academic_year_id,
            period,
            scores,
            total_score,
            status,
            created_at,
            updated_at
        )
        SELECT 
            (rec->>'student_id')::UUID,
            (rec->>'class_id')::UUID,
            (rec->>'academic_year_id')::UUID,
            rec->>'period',
            (rec->'scores')::JSONB,
            (rec->>'total_score')::NUMERIC,
            COALESCE(rec->>'status', 'draft'),
            COALESCE((rec->>'created_at')::TIMESTAMPTZ, NOW()),
            NOW()
        FROM jsonb_array_elements(v_payload) AS rec;
        GET DIAGNOSTICS v_restored_count = ROW_COUNT;
    END IF;

    -- 8. Audit log the rollback
    INSERT INTO public.audit_logs (user_id, action, target_table, record_id, details)
    VALUES (
        auth.uid(),
        'ROLLBACK_GRADE_SNAPSHOT',
        'grades',
        p_snapshot_id,
        jsonb_build_object(
            'period', v_period,
            'academic_year_id', p_academic_year_id,
            'deleted_count', v_deleted_count,
            'restored_count', v_restored_count
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'period', v_period,
        'deleted_count', v_deleted_count,
        'restored_count', v_restored_count,
        'message', 'Rollback completed successfully'
    );
END;
$$;

-- 5. Revoke PUBLIC execution and enforce least privilege
REVOKE EXECUTE ON FUNCTION public.bulk_quick_register_students(JSONB, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bulk_quick_register_students(JSONB, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_quick_register_students(JSONB, UUID, UUID) TO service_role;

REVOKE EXECUTE ON FUNCTION public.batch_upload_scores_atomic(JSONB, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.batch_upload_scores_atomic(JSONB, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_upload_scores_atomic(JSONB, TEXT, UUID) TO service_role;

REVOKE EXECUTE ON FUNCTION public.rollback_grade_snapshot_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollback_grade_snapshot_atomic(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_grade_snapshot_atomic(UUID, UUID) TO service_role;
