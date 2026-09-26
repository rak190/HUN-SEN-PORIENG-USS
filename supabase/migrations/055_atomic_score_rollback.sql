-- Rollback Score Snapshot Atomic RPC
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
    v_deleted_count INT := 0;
    v_restored_count INT := 0;
    v_period TEXT;
    v_payload JSONB;
BEGIN
    -- 1. Authorization check
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role NOT IN ('admin', 'principal') THEN
        RAISE EXCEPTION 'Forbidden: Only Admin or Principal can rollback scores' USING ERRCODE = '42501';
    END IF;

    -- 2. Verify snapshot exists
    SELECT period, grades_payload INTO v_period, v_payload
    FROM public.grade_snapshots
    WHERE id = p_snapshot_id;

    IF v_period IS NULL THEN
        RAISE EXCEPTION 'Snapshot not found';
    END IF;

    -- 3. Atomic execution: Delete current scores for the target period
    IF jsonb_array_length(v_payload) > 0 THEN
        DELETE FROM public.grades
        WHERE period = v_period 
          AND academic_year_id = p_academic_year_id
          AND class_id IN (
              SELECT DISTINCT (value->>'class_id')::UUID 
              FROM jsonb_array_elements(v_payload)
          );
    ELSE
        DELETE FROM public.grades
        WHERE period = v_period 
          AND academic_year_id = p_academic_year_id;
    END IF;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- 4. Restore records from snapshot
    IF jsonb_array_length(v_payload) > 0 THEN
        INSERT INTO public.grades (
            student_id,
            subject_id,
            class_id,
            period,
            academic_year_id,
            score_knowledge,
            score_skill,
            score_attitude,
            scores,
            total_score,
            average,
            status,
            updated_at
        )
        SELECT 
            (item->>'student_id')::UUID,
            (item->>'subject_id')::UUID,
            (item->>'class_id')::UUID,
            item->>'period',
            (item->>'academic_year_id')::UUID,
            (item->>'score_knowledge')::NUMERIC,
            (item->>'score_skill')::NUMERIC,
            (item->>'score_attitude')::NUMERIC,
            item->'scores',
            (item->>'total_score')::NUMERIC,
            (item->>'average')::NUMERIC,
            item->>'status',
            NOW()
        FROM jsonb_array_elements(v_payload) AS item;
        
        GET DIAGNOSTICS v_restored_count = ROW_COUNT;
    ELSE
        v_restored_count := 0;
    END IF;

    -- 5. Record Audit Log
    INSERT INTO public.audit_logs (
        user_id,
        action,
        details,
        created_at
    ) VALUES (
        auth.uid(),
        'rollback_grades',
        jsonb_build_object(
            'period', v_period,
            'academic_year_id', p_academic_year_id,
            'snapshot_id', p_snapshot_id,
            'deleted_count', v_deleted_count,
            'restored_count', v_restored_count
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'deleted_count', v_deleted_count,
        'restored_count', v_restored_count,
        'period', v_period
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rollback_grade_snapshot_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollback_grade_snapshot_atomic(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_grade_snapshot_atomic(UUID, UUID) TO service_role;
