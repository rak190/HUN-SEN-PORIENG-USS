-- Migration 059: Fix batch_upload_scores_atomic schema alignment and conflict target
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
    v_score JSONB;
    v_inserted_count INT := 0;
    v_year_id UUID := p_academic_year_id;
    v_target_class_id UUID;
    v_year_status TEXT;
BEGIN
    -- 1. Security & Caller Role Check (enforce Admin, Principal, or Teacher)
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT role INTO v_caller_role 
    FROM public.profiles 
    WHERE id = auth.uid();

    IF v_caller_role NOT IN ('admin', 'principal', 'teacher') THEN
        RAISE EXCEPTION 'Forbidden: Insufficient privileges (caller role: %)', v_caller_role USING ERRCODE = '42501';
    END IF;

    -- 2. Resolve Academic Year ID defensively if not explicitly passed
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

    -- 3. Check Institutional Year-End Lock
    SELECT status INTO v_year_status 
    FROM public.academic_years 
    WHERE id = v_year_id;

    IF v_year_status IN ('closed', 'archived') THEN
        RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សានេះត្រូវបានបិទបញ្ចប់ និងចាក់សោរួចហើយ (Academic year is locked)'
        USING ERRCODE = '55000';
    END IF;

    -- 4. Atomic Score Ingestion Loop
    FOR v_score IN SELECT * FROM jsonb_array_elements(p_scores)
    LOOP
        INSERT INTO public.grades (
            student_id,
            class_id,
            academic_year_id,
            period,
            scores,
            total_score,
            average,
            status,
            updated_at
        ) VALUES (
            (v_score->>'student_id')::UUID,
            (v_score->>'class_id')::UUID,
            v_year_id,
            p_period,
            v_score->'scores',
            (v_score->>'total_score')::NUMERIC,
            (v_score->>'average')::NUMERIC,
            COALESCE(v_score->>'status', 'draft'),
            now()
        )
        ON CONFLICT (student_id, period, academic_year_id) DO UPDATE SET
            class_id = EXCLUDED.class_id,
            scores = EXCLUDED.scores,
            total_score = EXCLUDED.total_score,
            average = EXCLUDED.average,
            status = EXCLUDED.status,
            updated_at = now();

        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    -- 5. Audit Trail Record
    INSERT INTO public.audit_logs (
        user_id,
        action,
        details,
        created_at
    ) VALUES (
        auth.uid(),
        'BATCH_UPLOAD_SCORES',
        jsonb_build_object(
            'period', p_period,
            'academic_year_id', v_year_id,
            'count', v_inserted_count
        ),
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'count', v_inserted_count,
        'academic_year_id', v_year_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.batch_upload_scores_atomic(JSONB, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.batch_upload_scores_atomic(JSONB, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_upload_scores_atomic(JSONB, TEXT, UUID) TO service_role;
