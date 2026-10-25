-- Migration 091: Atomic Study Plans Batch Persistence, Fail-Closed Security & Audit
-- Description:
-- 1. Creates public.save_student_study_plans_atomic RPC function
-- 2. Enforces caller authorization: Admin, Principal, or assigned Homeroom Teacher
-- 3. Validates academic year lock status (rejects closed/archived academic years)
-- 4. Pre-validates active class enrollment (fails closed if any student does not belong to p_class_id & p_academic_year_id)
-- 5. Executes atomic upserts into public.student_study_plans
-- 6. Generates structured audit log entry in public.audit_logs
-- 7. Ensures idempotent application with IF NOT EXISTS / CREATE OR REPLACE

BEGIN;

CREATE OR REPLACE FUNCTION public.save_student_study_plans_atomic(
  p_class_id UUID,
  p_academic_year_id UUID,
  p_plans JSONB -- Array of { student_id: UUID, subject_targets: JSONB }
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_class public.classes%ROWTYPE;
  v_year public.academic_years%ROWTYPE;
  v_item JSONB;
  v_student_id UUID;
  v_targets JSONB;
  v_is_enrolled BOOLEAN;
  v_invalid_students UUID[] := ARRAY[]::UUID[];
  v_count INT := 0;
BEGIN
  -- 1. Fail closed on unauthenticated session
  IF v_actor IS NULL OR auth.role() IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'Unauthorized: authenticated session required' USING ERRCODE = '42501';
  END IF;

  -- 2. Verify caller profile and active status
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_actor FOR SHARE;
  IF NOT FOUND OR v_profile.is_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Forbidden: inactive or invalid user profile' USING ERRCODE = '42501';
  END IF;

  -- 3. Verify class existence and active status
  SELECT * INTO v_class FROM public.classes WHERE id = p_class_id FOR SHARE;
  IF NOT FOUND OR v_class.is_archived IS DISTINCT FROM false OR v_class.academic_year_id IS DISTINCT FROM p_academic_year_id THEN
    RAISE EXCEPTION 'Invalid class or academic year mismatch' USING ERRCODE = '42501';
  END IF;

  -- 4. Enforce role-based class ownership
  IF v_profile.role = 'teacher' AND (v_class.teacher_id IS DISTINCT FROM v_actor OR v_profile.school_id IS DISTINCT FROM v_class.school_id) THEN
    RAISE EXCEPTION 'Forbidden: teacher does not own this class' USING ERRCODE = '42501';
  ELSIF v_profile.role = 'principal' AND v_profile.school_id IS DISTINCT FROM v_class.school_id THEN
    RAISE EXCEPTION 'Forbidden: school boundary mismatch' USING ERRCODE = '42501';
  ELSIF v_profile.role NOT IN ('teacher', 'principal', 'admin') THEN
    RAISE EXCEPTION 'Forbidden: insufficient role privileges' USING ERRCODE = '42501';
  END IF;

  -- 5. Verify academic year is active and unlocked
  SELECT * INTO v_year FROM public.academic_years WHERE id = p_academic_year_id FOR SHARE;
  IF NOT FOUND OR (v_year.status IS DISTINCT FROM 'active' AND v_year.is_active IS DISTINCT FROM true) THEN
    RAISE EXCEPTION 'Academic year is locked or inactive' USING ERRCODE = '55000';
  END IF;

  -- 6. Pre-validate that all submitted students are actively enrolled in this class and year
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_plans) LOOP
    v_student_id := (v_item->>'student_id')::UUID;
    
    SELECT EXISTS (
      SELECT 1 FROM public.student_enrollments
      WHERE student_id = v_student_id
        AND class_id = p_class_id
        AND academic_year_id = p_academic_year_id
        AND (enrollment_status IN ('active', 'enrolled') OR enrollment_status IS NULL)
    ) INTO v_is_enrolled;

    IF NOT v_is_enrolled THEN
      v_invalid_students := array_append(v_invalid_students, v_student_id);
    END IF;
  END LOOP;

  -- Fail closed if any invalid student detected
  IF array_length(v_invalid_students, 1) > 0 THEN
    RAISE EXCEPTION 'Validation Failed: students % are not enrolled in class %', v_invalid_students, p_class_id
      USING ERRCODE = '23503';
  END IF;

  -- 7. Execute atomic upserts
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_plans) LOOP
    v_student_id := (v_item->>'student_id')::UUID;
    v_targets := v_item->'subject_targets';

    INSERT INTO public.student_study_plans (
      student_id,
      class_id,
      academic_year_id,
      subject_targets,
      updated_at
    ) VALUES (
      v_student_id,
      p_class_id,
      p_academic_year_id,
      COALESCE(v_targets, '{}'::jsonb),
      NOW()
    )
    ON CONFLICT (student_id, academic_year_id) DO UPDATE SET
      class_id = EXCLUDED.class_id,
      subject_targets = EXCLUDED.subject_targets,
      updated_at = NOW();

    v_count := v_count + 1;
  END LOOP;

  -- 8. Audit log entry
  INSERT INTO public.audit_logs (user_id, school_id, action, type, target_table, details)
  VALUES (
    v_actor,
    v_class.school_id,
    'STUDY_PLANS_BATCH_SAVE',
    'info',
    'student_study_plans',
    jsonb_build_object(
      'class_id', p_class_id,
      'academic_year_id', p_academic_year_id,
      'updated_count', v_count
    )
  );

  RETURN jsonb_build_object('success', true, 'updated_count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.save_student_study_plans_atomic(UUID, UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_student_study_plans_atomic(UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_student_study_plans_atomic(UUID, UUID, JSONB) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
