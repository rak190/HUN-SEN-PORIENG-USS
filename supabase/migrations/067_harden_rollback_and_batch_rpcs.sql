-- Migration 067: Harden Rollback to Empty Snapshot, Grade Score Validation, and Batch Registration Schema
-- Description:
-- 1. Updates rollback_grade_snapshot_atomic to support rolling back to legitimately empty snapshots (deleting post-snapshot uploaded grades).
-- 2. Hardens batch_upload_scores_atomic with score bound checks (rejecting negative or out-of-range scores).
-- 3. Hardens batch_register_students_atomic with TEXT school_id types, academic year status checks, and optional service-role caller id.

BEGIN;

-- 1. Harden rollback_grade_snapshot_atomic
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
    v_class_id UUID;
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

    -- 3. Verify snapshot exists and fetch context (including class_id)
    SELECT class_id, period, grades_payload, academic_year_id, school_id 
    INTO v_class_id, v_period, v_payload, v_snapshot_year_id, v_snapshot_school_id
    FROM public.grade_snapshots
    WHERE id = p_snapshot_id;

    IF v_period IS NULL THEN
        RAISE EXCEPTION 'Snapshot not found';
    END IF;

    -- Validate snapshot payload is a valid JSON array
    IF v_payload IS NULL OR jsonb_typeof(v_payload) != 'array' THEN
        RAISE EXCEPTION 'Malformed snapshot: grades_payload must be a valid JSON array' USING ERRCODE = '22023';
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

    -- 6. Atomic execution
    IF jsonb_array_length(v_payload) > 0 THEN
        -- Case A: Non-empty snapshot. Delete current scores for the classes present in snapshot and re-insert.
        DELETE FROM public.grades
        WHERE period = v_period 
          AND academic_year_id = p_academic_year_id
          AND class_id IN (
              SELECT DISTINCT (rec->>'class_id')::UUID 
              FROM jsonb_array_elements(v_payload) AS rec
              WHERE rec->>'class_id' IS NOT NULL
          );
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

        -- Re-insert previous grades payload matching real public.grades schema (scores JSONB, total_score, status)
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
    ELSE
        -- Case B: Legitimately empty snapshot.
        -- Delete any scores that were uploaded after the empty snapshot for the snapshot target class/period.
        IF v_class_id IS NOT NULL THEN
            DELETE FROM public.grades
            WHERE period = v_period 
              AND academic_year_id = p_academic_year_id
              AND class_id = v_class_id;
            GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        ELSIF v_snapshot_school_id IS NOT NULL THEN
            DELETE FROM public.grades
            WHERE period = v_period 
              AND academic_year_id = p_academic_year_id
              AND class_id IN (SELECT id FROM public.classes WHERE school_id = v_snapshot_school_id);
            GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        END IF;
        v_restored_count := 0;
    END IF;

    -- 7. Audit log the rollback
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
            'restored_count', v_restored_count,
            'is_empty_snapshot', (jsonb_array_length(v_payload) = 0),
            'timestamp', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'deleted_count', v_deleted_count,
        'restored_count', v_restored_count,
        'period', v_period,
        'academic_year_id', p_academic_year_id,
        'message', 'បានស្ដារទិន្នន័យពិន្ទុពី Snapshot ដោយជោគជ័យ'
    );
END;
$$;

-- 2. Harden batch_upload_scores_atomic with score bound validations
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
    v_total_score NUMERIC;
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
            IF v_class_teacher_id IS NULL OR v_class_teacher_id != auth.uid() THEN
                RAISE EXCEPTION 'Forbidden: Teacher does not own class %', v_target_class_id USING ERRCODE = '42501';
            END IF;
        ELSE
            RAISE EXCEPTION 'Forbidden: Unauthorized role' USING ERRCODE = '42501';
        END IF;

        -- SCORE BOUNDS VALIDATION
        v_total_score := (v_score->>'total_score')::NUMERIC;
        IF v_total_score IS NOT NULL AND v_total_score < 0 THEN
            RAISE EXCEPTION 'Validation Error: Total score cannot be negative (score: %)', v_total_score USING ERRCODE = '22003';
        END IF;

        IF v_total_score IS NOT NULL AND v_total_score > 1000 THEN
            RAISE EXCEPTION 'Validation Error: Total score exceeds maximum allowed ceiling of 1000 (score: %)', v_total_score USING ERRCODE = '22003';
        END IF;

        -- Check individual scores inside scores JSONB if present
        IF (v_score->'scores') IS NOT NULL AND jsonb_typeof(v_score->'scores') = 'object' THEN
            IF EXISTS (
                SELECT 1 FROM jsonb_each_text(v_score->'scores')
                WHERE value ~ '^-?[0-9]+(\.[0-9]+)?$' AND value::NUMERIC < 0
            ) THEN
                RAISE EXCEPTION 'Validation Error: Individual subject scores cannot be negative' USING ERRCODE = '22003';
            END IF;
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
            v_total_score,
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

-- 3. Harden batch_register_students_atomic (TEXT school_id types, academic year status check)
CREATE OR REPLACE FUNCTION public.batch_register_students_atomic(
  p_students JSONB,
  p_academic_year_id UUID,
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
  v_student JSONB;
  v_inserted_count INT := 0;
  v_student_id UUID;
  v_class_id UUID;
  v_class_school_id TEXT;
  v_year_status TEXT;
BEGIN
  -- Resolve effective user ID
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

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'principal') THEN
      RAISE EXCEPTION 'Forbidden: Insufficient privileges (caller role: %)', COALESCE(v_caller_role, 'none') USING ERRCODE = '42501';
  END IF;

  -- Check Academic Year status
  SELECT status INTO v_year_status 
  FROM public.academic_years 
  WHERE id = p_academic_year_id;

  IF v_year_status IN ('closed', 'archived') THEN
      RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សានេះត្រូវបានបិទបញ្ចប់ និងចាក់សោរួចហើយ (Academic year is locked)'
      USING ERRCODE = '55000';
  END IF;

  FOR v_student IN SELECT * FROM jsonb_array_elements(p_students)
  LOOP
    v_class_id := (v_student->>'class_id')::UUID;
    
    IF v_class_id IS NOT NULL AND v_caller_role != 'admin' THEN
        SELECT school_id INTO v_class_school_id FROM public.classes WHERE id = v_class_id;
        IF v_caller_role = 'principal' AND (v_caller_school_id IS NULL OR v_class_school_id IS DISTINCT FROM v_caller_school_id) THEN
            RAISE EXCEPTION 'Forbidden: Principal does not have access to class %', v_class_id USING ERRCODE = '42501';
        END IF;
    END IF;

    INSERT INTO public.students (
      student_id_number, full_name, gender, date_of_birth, updated_at
    ) VALUES (
      v_student->>'student_id_number',
      v_student->>'full_name',
      v_student->>'gender',
      (v_student->>'date_of_birth')::DATE,
      now()
    )
    ON CONFLICT (student_id_number) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      gender = EXCLUDED.gender,
      date_of_birth = EXCLUDED.date_of_birth,
      updated_at = now()
    RETURNING id INTO v_student_id;

    IF v_class_id IS NOT NULL THEN
      INSERT INTO public.student_enrollments (
        class_id, student_id, academic_year_id, room_number, desk_number, enrollment_status
      ) VALUES (
        v_class_id,
        v_student_id,
        p_academic_year_id,
        v_student->>'room_number',
        v_student->>'desk_number',
        'active'
      )
      ON CONFLICT (student_id, academic_year_id) DO UPDATE SET
        class_id = EXCLUDED.class_id,
        room_number = EXCLUDED.room_number,
        desk_number = EXCLUDED.desk_number,
        enrollment_status = EXCLUDED.enrollment_status;
    END IF;

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
      'success', true, 
      'count', v_inserted_count, 
      'message', 'បានបញ្ចូលសិស្សចំនួន ' || v_inserted_count || ' ដោយជោគជ័យ'
  );
END;
$$;

-- Permissions
REVOKE EXECUTE ON FUNCTION public.rollback_grade_snapshot_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollback_grade_snapshot_atomic(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_grade_snapshot_atomic(UUID, UUID) TO service_role;

REVOKE EXECUTE ON FUNCTION public.batch_upload_scores_atomic(JSONB, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.batch_upload_scores_atomic(JSONB, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_upload_scores_atomic(JSONB, TEXT, UUID) TO service_role;

REVOKE EXECUTE ON FUNCTION public.batch_register_students_atomic(JSONB, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.batch_register_students_atomic(JSONB, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_register_students_atomic(JSONB, UUID, UUID) TO service_role;

COMMIT;
