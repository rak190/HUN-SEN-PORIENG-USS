-- Migration 092: Student Study Plans RLS Hardening and Deep Merge Support
-- Description:
-- 1. Drops broad authenticated SELECT and ALL policies from Migration 085.
-- 2. Restricts SELECT on public.student_study_plans to:
--    - Active admins
--    - Active principals in the same school as the class
--    - Active assigned homeroom teachers of the class
-- 3. Restricts direct table mutations (INSERT/UPDATE/DELETE) to authorized roles within scope,
--    while enforcing that atomic batch mutations go through save_student_study_plans_atomic.
-- 4. Creates public.jsonb_deep_merge helper function.
-- 5. Updates save_student_study_plans_atomic to use public.jsonb_deep_merge, preventing accidental erasure
--    of existing categories (e.g. editing expected goals will never overwrite actuals).

BEGIN;

-- Helper function: recursive JSONB deep merge
CREATE OR REPLACE FUNCTION public.jsonb_deep_merge(p_orig JSONB, p_patch JSONB)
RETURNS JSONB
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_orig IS NULL OR p_orig = 'null'::jsonb THEN p_patch
    WHEN p_patch IS NULL OR p_patch = 'null'::jsonb THEN p_orig
    WHEN jsonb_typeof(p_orig) = 'object' AND jsonb_typeof(p_patch) = 'object' THEN
      (
        SELECT COALESCE(jsonb_object_agg(
          key,
          CASE
            WHEN p_patch ? key AND p_orig ? key THEN public.jsonb_deep_merge(p_orig->key, p_patch->key)
            WHEN p_patch ? key THEN p_patch->key
            ELSE p_orig->key
          END
        ), '{}'::jsonb)
        FROM (
          SELECT jsonb_object_keys(p_orig) AS key
          UNION
          SELECT jsonb_object_keys(p_patch) AS key
        ) keys
      )
    ELSE p_patch
  END;
$$;

-- 1. Drop old broad RLS policies from migration 085
DROP POLICY IF EXISTS "Enable read access for authenticated users on student_study_plans" ON public.student_study_plans;
DROP POLICY IF EXISTS "Enable write access for authorized teachers and admins on student_study_plans" ON public.student_study_plans;
DROP POLICY IF EXISTS "student_study_plans_select_policy" ON public.student_study_plans;
DROP POLICY IF EXISTS "student_study_plans_insert_policy" ON public.student_study_plans;
DROP POLICY IF EXISTS "student_study_plans_update_policy" ON public.student_study_plans;
DROP POLICY IF EXISTS "student_study_plans_delete_policy" ON public.student_study_plans;

-- 2. Scoped SELECT Policy
CREATE POLICY "student_study_plans_select_policy"
  ON public.student_study_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND (
          p.role = 'admin'
          OR (
            p.role = 'principal'
            AND EXISTS (
              SELECT 1 FROM public.classes c
              WHERE c.id = student_study_plans.class_id
                AND c.school_id = p.school_id
            )
          )
          OR (
            p.role = 'teacher'
            AND EXISTS (
              SELECT 1 FROM public.classes c
              WHERE c.id = student_study_plans.class_id
                AND c.teacher_id = auth.uid()
                AND c.school_id = p.school_id
            )
          )
        )
    )
  );

-- 3. Scoped Mutation Policies (INSERT, UPDATE, DELETE)
CREATE POLICY "student_study_plans_insert_policy"
  ON public.student_study_plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.classes c ON c.id = student_study_plans.class_id
      JOIN public.academic_years ay ON ay.id = student_study_plans.academic_year_id
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND c.is_archived = false
        AND (ay.status = 'active' OR ay.is_active = true)
        AND (
          p.role = 'admin'
          OR (p.role = 'principal' AND c.school_id = p.school_id)
          OR (p.role = 'teacher' AND c.teacher_id = auth.uid() AND c.school_id = p.school_id)
        )
    )
  );

CREATE POLICY "student_study_plans_update_policy"
  ON public.student_study_plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.classes c ON c.id = student_study_plans.class_id
      JOIN public.academic_years ay ON ay.id = student_study_plans.academic_year_id
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND c.is_archived = false
        AND (ay.status = 'active' OR ay.is_active = true)
        AND (
          p.role = 'admin'
          OR (p.role = 'principal' AND c.school_id = p.school_id)
          OR (p.role = 'teacher' AND c.teacher_id = auth.uid() AND c.school_id = p.school_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.classes c ON c.id = student_study_plans.class_id
      JOIN public.academic_years ay ON ay.id = student_study_plans.academic_year_id
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND c.is_archived = false
        AND (ay.status = 'active' OR ay.is_active = true)
        AND (
          p.role = 'admin'
          OR (p.role = 'principal' AND c.school_id = p.school_id)
          OR (p.role = 'teacher' AND c.teacher_id = auth.uid() AND c.school_id = p.school_id)
        )
    )
  );

CREATE POLICY "student_study_plans_delete_policy"
  ON public.student_study_plans FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.classes c ON c.id = student_study_plans.class_id
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND c.is_archived = false
        AND (
          p.role = 'admin'
          OR (p.role = 'principal' AND c.school_id = p.school_id)
        )
    )
  );

-- 4. Update save_student_study_plans_atomic to use jsonb_deep_merge
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

  -- 7. Execute atomic upserts with deep merge to preserve existing categories
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
      subject_targets = public.jsonb_deep_merge(
        COALESCE(student_study_plans.subject_targets, '{}'::jsonb),
        EXCLUDED.subject_targets
      ),
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
