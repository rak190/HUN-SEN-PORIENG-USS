-- Full-class profile editing: session-only, allowlisted, conflict-aware and atomic.
BEGIN;

-- Earlier save RPCs referenced this field without a corresponding schema migration.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS migrant_status TEXT;
CREATE OR REPLACE VIEW public.active_class_rosters WITH (security_invoker = true) AS
SELECT e.class_id AS enrollment_class_id, c.name AS class_name, c.academic_year_id,
  c.teacher_id, e.enrollment_status AS current_enrollment_status, e.desk_number, e.room_number, s.*
FROM public.student_enrollments e
JOIN public.classes c ON c.id = e.class_id
JOIN public.students s ON s.id = e.student_id
WHERE s.is_active = true AND c.is_archived = false
  AND (e.enrollment_status IN ('active', 'enrolled') OR e.enrollment_status IS NULL);

CREATE OR REPLACE FUNCTION public.save_homeroom_student_grid(
  p_class_id UUID, p_academic_year_id UUID, p_updates JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_class public.classes%ROWTYPE;
  v_year public.academic_years%ROWTYPE;
  v_student public.students%ROWTYPE;
  v_item JSONB; v_changes JSONB; v_original JSONB; v_db_changes JSONB;
  v_key TEXT; v_db_key TEXT; v_value JSONB; v_current JSONB; v_set TEXT;
  v_id UUID; v_conflicts JSONB := '[]'::JSONB; v_count INT := 0;
  v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Phnom_Penh')::DATE;
  v_allowed TEXT[] := ARRAY['english_name','date_of_birth','birth_cert_no','student_phone',
    'prev_school','scholarship','id_poor','orphan','indigenous','distance_km','height_m',
    'weight_kg','disability','assistive_device','health_issues','father_name','father_job',
    'father_phone','mother_name','mother_job','mother_phone','guardian_name','guardian_job',
    'guardian_phone','parent_phone','siblings_count','income','address','migrant_status','housing'];
BEGIN
  IF v_actor IS NULL OR auth.role() IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'Unauthorized: verified user session required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_actor FOR SHARE;
  IF NOT FOUND OR v_profile.is_active IS DISTINCT FROM true OR v_profile.role IS NULL OR v_profile.role NOT IN ('teacher','principal','admin') THEN
    RAISE EXCEPTION 'Forbidden: inactive or unauthorized profile' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_class FROM public.classes WHERE id = p_class_id FOR SHARE;
  IF NOT FOUND OR v_class.school_id IS NULL OR v_class.is_archived IS DISTINCT FROM false OR v_class.academic_year_id IS DISTINCT FROM p_academic_year_id THEN
    RAISE EXCEPTION 'Invalid class or academic year' USING ERRCODE = '42501';
  END IF;
  IF (v_profile.role = 'teacher' AND (v_class.teacher_id IS DISTINCT FROM v_actor OR v_profile.school_id IS DISTINCT FROM v_class.school_id))
    OR (v_profile.role = 'principal' AND (v_profile.school_id IS NULL OR v_profile.school_id IS DISTINCT FROM v_class.school_id)) THEN
    RAISE EXCEPTION 'Forbidden: class ownership or school mismatch' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_year FROM public.academic_years WHERE id = p_academic_year_id FOR SHARE;
  IF NOT FOUND OR v_year.status IS DISTINCT FROM 'active' OR v_year.is_active IS DISTINCT FROM true
    OR v_year.school_id IS DISTINCT FROM v_class.school_id THEN
    RAISE EXCEPTION 'Academic year is missing, inactive or locked' USING ERRCODE = '55000';
  END IF;
  IF jsonb_typeof(p_updates) IS DISTINCT FROM 'array' OR jsonb_array_length(p_updates) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Expected 1 to 200 student updates' USING ERRCODE = '22023';
  END IF;
  IF (SELECT COUNT(*) FROM jsonb_array_elements(p_updates)) <> (SELECT COUNT(DISTINCT value->>'id') FROM jsonb_array_elements(p_updates)) THEN
    RAISE EXCEPTION 'Duplicate or missing student IDs' USING ERRCODE = '22023';
  END IF;

  -- Stable lock order protects concurrent bulk edits. Enrollment locks prevent transfer races.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_updates) ORDER BY value->>'id' LOOP
    v_id := (v_item->>'id')::UUID;
    PERFORM 1 FROM public.student_enrollments e WHERE e.student_id = v_id
      AND e.class_id = p_class_id AND e.academic_year_id = p_academic_year_id
      AND e.enrollment_status IN ('active','enrolled') FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Student is not actively enrolled in the selected class: %', v_id USING ERRCODE = '42501'; END IF;
    SELECT * INTO v_student FROM public.students WHERE id = v_id AND is_active = true FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Student is inactive or missing: %', v_id USING ERRCODE = '42501'; END IF;
    v_changes := v_item->'changes'; v_original := v_item->'original';
    IF jsonb_typeof(v_changes) IS DISTINCT FROM 'object' OR v_changes = '{}'::JSONB OR jsonb_typeof(v_original) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Changes and original values must be objects' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(v_original) AS k(key) WHERE NOT (v_changes ? key)) THEN
      RAISE EXCEPTION 'Unexpected original field' USING ERRCODE = '22023';
    END IF;
    FOR v_key, v_value IN SELECT * FROM jsonb_each(v_changes) LOOP
      IF NOT (v_key = ANY(v_allowed)) OR NOT (v_original ? v_key) THEN
        RAISE EXCEPTION 'Protected/unknown field or missing baseline: %', v_key USING ERRCODE = '42501';
      END IF;
      IF jsonb_typeof(v_value) NOT IN ('null','string','number') OR length(v_value #>> '{}') > 4000 THEN
        RAISE EXCEPTION 'Invalid field value: %', v_key USING ERRCODE = '22023';
      END IF;
      IF v_value <> 'null'::JSONB THEN
        IF v_key IN ('distance_km','height_m','weight_kg','siblings_count','income') THEN
          IF jsonb_typeof(v_value) <> 'number' OR (v_value #>> '{}')::NUMERIC < 0 THEN RAISE EXCEPTION 'Invalid number: %', v_key USING ERRCODE = '22023'; END IF;
          IF v_key = 'siblings_count' AND (v_value #>> '{}')::NUMERIC <> trunc((v_value #>> '{}')::NUMERIC) THEN RAISE EXCEPTION 'Sibling count must be an integer' USING ERRCODE = '22023'; END IF;
          IF v_key IN ('height_m','weight_kg') AND (v_value #>> '{}')::NUMERIC <= 0 THEN RAISE EXCEPTION 'Biometrics must be positive' USING ERRCODE = '22023'; END IF;
          IF v_key = 'height_m' AND (v_value #>> '{}')::NUMERIC > 3 THEN RAISE EXCEPTION 'Height must be in metres' USING ERRCODE = '22023'; END IF;
          IF v_key = 'weight_kg' AND (v_value #>> '{}')::NUMERIC > 999.99 THEN RAISE EXCEPTION 'Weight exceeds supported range' USING ERRCODE = '22023'; END IF;
        ELSIF jsonb_typeof(v_value) <> 'string' THEN RAISE EXCEPTION 'Text field must be a string: %', v_key USING ERRCODE = '22023'; END IF;
        IF v_key IN ('scholarship','orphan','indigenous') AND (v_value #>> '{}') NOT IN ('yes','no') THEN RAISE EXCEPTION 'Invalid yes/no value' USING ERRCODE = '22023'; END IF;
        IF v_key = 'id_poor' AND (v_value #>> '{}') NOT IN ('none','level_1','level_2') THEN RAISE EXCEPTION 'Invalid poverty status' USING ERRCODE = '22023'; END IF;
        IF v_key = 'disability' AND (v_value #>> '{}') NOT IN ('none','mild','severe') THEN RAISE EXCEPTION 'Invalid disability value' USING ERRCODE = '22023'; END IF;
        IF v_key = 'migrant_status' AND (v_value #>> '{}') NOT IN ('none','parents','student') THEN RAISE EXCEPTION 'Invalid migrant status' USING ERRCODE = '22023'; END IF;
        IF v_key LIKE '%phone' AND (v_value #>> '{}') !~ '^\+?[0-9 ()-]{6,25}$' THEN RAISE EXCEPTION 'Invalid phone number' USING ERRCODE = '22023'; END IF;
        IF v_key = 'date_of_birth' THEN
          IF (v_value #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$' OR (v_value #>> '{}')::DATE > v_today THEN RAISE EXCEPTION 'Invalid date of birth' USING ERRCODE = '22023'; END IF;
        END IF;
      END IF;
      v_db_key := CASE v_key WHEN 'date_of_birth' THEN 'dob' WHEN 'health_issues' THEN 'health_note' WHEN 'address' THEN 'current_address' ELSE v_key END;
      v_current := COALESCE(NULLIF(to_jsonb(v_student)->v_db_key, '""'::JSONB), 'null'::JSONB);
      IF v_current IS DISTINCT FROM COALESCE(NULLIF(v_original->v_key, '""'::JSONB), 'null'::JSONB)
        AND v_current IS DISTINCT FROM COALESCE(NULLIF(v_value, '""'::JSONB), 'null'::JSONB) THEN
        v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object('student_id', v_id, 'field', v_key));
      END IF;
    END LOOP;
  END LOOP;
  IF jsonb_array_length(v_conflicts) > 0 THEN
    RAISE EXCEPTION 'ទិន្នន័យត្រូវបានកែប្រែដោយអ្នកផ្សេង។ សូមពិនិត្យ និងផ្ទុកថ្មីមុនរក្សាទុក។'
      USING ERRCODE = '40001', DETAIL = v_conflicts::TEXT;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_updates) ORDER BY value->>'id' LOOP
    v_id := (v_item->>'id')::UUID; v_changes := v_item->'changes'; v_db_changes := '{}'::JSONB;
    FOR v_key, v_value IN SELECT * FROM jsonb_each(v_changes) LOOP
      v_db_key := CASE v_key WHEN 'date_of_birth' THEN 'dob' WHEN 'health_issues' THEN 'health_note' WHEN 'address' THEN 'current_address' ELSE v_key END;
      v_db_changes := v_db_changes || jsonb_build_object(v_db_key, NULLIF(v_value, '""'::JSONB));
      IF v_key = 'date_of_birth' THEN v_db_changes := v_db_changes || jsonb_build_object('date_of_birth', NULLIF(v_value, '""'::JSONB)); END IF;
    END LOOP;
    SELECT string_agg(format('%I = patch.%I', key, key), ', ') INTO v_set FROM jsonb_object_keys(v_db_changes) AS k(key);
    EXECUTE 'UPDATE public.students AS s SET ' || v_set || ', updated_at = now() FROM jsonb_populate_record(NULL::public.students, $1) AS patch WHERE s.id = $2'
      USING v_db_changes, v_id;

    IF v_changes ?| ARRAY['weight_kg','height_m','health_issues'] THEN
      SELECT * INTO v_student FROM public.students WHERE id = v_id;
      IF v_student.height_m > 0 AND v_student.weight_kg > 0 THEN
        v_student.bmi := round(v_student.weight_kg / (v_student.height_m * v_student.height_m), 1);
        v_student.nutrition_status := CASE WHEN v_student.bmi < 18.5 THEN 'ស្គម' WHEN v_student.bmi < 25 THEN 'ធម្មតា' WHEN v_student.bmi < 30 THEN 'លើសទម្ងន់' ELSE 'ធាត់' END;
      ELSE v_student.bmi := NULL; v_student.nutrition_status := NULL;
      END IF;
      UPDATE public.students SET bmi = v_student.bmi, nutrition_status = v_student.nutrition_status WHERE id = v_id;
      INSERT INTO public.student_health_records (student_id, class_id, academic_year_id, recorded_date, weight_kg, height_cm, bmi, notes)
      VALUES (v_id, p_class_id, p_academic_year_id, v_today, v_student.weight_kg, v_student.height_m * 100, v_student.bmi, v_student.health_note)
      ON CONFLICT (student_id, recorded_date, academic_year_id) DO UPDATE SET
        class_id = EXCLUDED.class_id, weight_kg = EXCLUDED.weight_kg, height_cm = EXCLUDED.height_cm, bmi = EXCLUDED.bmi, notes = EXCLUDED.notes;
    END IF;
    v_count := v_count + 1;
  END LOOP;
  INSERT INTO public.audit_logs (user_id, school_id, action, type, target_table, details)
  VALUES (v_actor, v_class.school_id, 'HOMEROOM_STUDENT_GRID_SAVE', 'info', 'students',
    jsonb_build_object('class_id', p_class_id, 'academic_year_id', p_academic_year_id, 'updated_count', v_count,
      'fields', (SELECT jsonb_agg(jsonb_build_object('student_id', value->>'id', 'fields', (SELECT jsonb_agg(key) FROM jsonb_object_keys(value->'changes') AS k(key)))) FROM jsonb_array_elements(p_updates))));
  RETURN jsonb_build_object('success', true, 'updated_count', v_count);
END;
$$;
REVOKE ALL ON FUNCTION public.save_homeroom_student_grid(UUID, UUID, JSONB) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.save_homeroom_student_grid(UUID, UUID, JSONB) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
