-- 1. Secure Atomic Student Bulk Import RPC
CREATE OR REPLACE FUNCTION batch_register_students_atomic(
  p_students JSONB,
  p_academic_year_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_role TEXT;
  v_student JSONB;
  v_inserted_count INT := 0;
  v_student_id UUID;
  v_class_id UUID;
BEGIN
  -- Defense-in-depth authorization check
  IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Fetch caller role from profiles
  SELECT role INTO v_caller_role 
  FROM public.profiles 
  WHERE id = auth.uid();

  -- Enforce role permissions (strict to 'admin', 'principal')
  IF v_caller_role NOT IN ('admin', 'principal') THEN
      RAISE EXCEPTION 'Forbidden: Insufficient privileges (caller role: %)', v_caller_role USING ERRCODE = '42501';
  END IF;

  FOR v_student IN SELECT * FROM jsonb_array_elements(p_students)
  LOOP
    INSERT INTO students (
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

    v_class_id := (v_student->>'class_id')::UUID;
    IF v_class_id IS NOT NULL THEN
      INSERT INTO student_enrollments (
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
        room_number = COALESCE(EXCLUDED.room_number, student_enrollments.room_number),
        desk_number = COALESCE(EXCLUDED.desk_number, student_enrollments.desk_number),
        enrollment_status = 'active';
    END IF;

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'count', v_inserted_count);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Atomic registration failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;


-- 2. Secure Atomic Master Score Bulk Upload RPC
CREATE OR REPLACE FUNCTION batch_upload_scores_atomic(
  p_scores JSONB,
  p_period TEXT
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
BEGIN
  -- Defense-in-depth authorization check
  IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Fetch caller role from profiles
  SELECT role INTO v_caller_role 
  FROM public.profiles 
  WHERE id = auth.uid();

  -- Enforce role permissions (allow 'admin', 'principal', 'teacher')
  IF v_caller_role NOT IN ('admin', 'principal', 'teacher') THEN
      RAISE EXCEPTION 'Forbidden: Insufficient privileges (caller role: %)', v_caller_role USING ERRCODE = '42501';
  END IF;

  FOR v_score IN SELECT * FROM jsonb_array_elements(p_scores)
  LOOP
    INSERT INTO grades (
      student_id, class_id, period, scores, total_score, average, status, updated_at
    ) VALUES (
      (v_score->>'student_id')::UUID,
      (v_score->>'class_id')::UUID,
      p_period,
      v_score->'scores',
      (v_score->>'total_score')::NUMERIC,
      (v_score->>'average')::NUMERIC,
      v_score->>'status',
      now()
    )
    ON CONFLICT (student_id, class_id, period) DO UPDATE SET
      scores = EXCLUDED.scores,
      total_score = EXCLUDED.total_score,
      average = EXCLUDED.average,
      status = EXCLUDED.status,
      updated_at = now();

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'count', v_inserted_count);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Atomic score upload failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;
