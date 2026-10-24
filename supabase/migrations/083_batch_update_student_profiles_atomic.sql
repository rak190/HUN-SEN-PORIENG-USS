-- Migration 083: Atomic Batch Update for Student Profiles, Enrollments, and Health Records
-- Description:
-- 1. Creates public.batch_update_student_profiles_atomic RPC function
-- 2. Enforces caller authorization: Admin, Principal, or assigned Homeroom Teacher
-- 3. Validates academic year lock status (rejects closed/archived academic years)
-- 4. Strictly validates class enrollment boundary (fails closed if any student does not belong to p_class_id)
-- 5. Executes all updates across students, student_enrollments, and student_health_records within a single atomic PostgreSQL transaction

BEGIN;

CREATE OR REPLACE FUNCTION public.batch_update_student_profiles_atomic(
  p_class_id UUID,
  p_updates JSONB,
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
  v_class_teacher_id UUID;
  v_class_academic_year_id UUID;
  v_year_status TEXT;
  v_item JSONB;
  v_student_id UUID;
  v_updated_count INT := 0;
  v_is_enrolled BOOLEAN;
  v_today DATE := CURRENT_DATE;

  -- Normalized local variables
  v_dob DATE;
  v_raw_dob TEXT;
  v_height_m NUMERIC;
  v_height_cm INT;
  v_weight_kg NUMERIC;
  v_bmi NUMERIC;
  v_nutrition_status TEXT;
BEGIN
  -- 1. Resolve effective caller identity
  IF auth.role() = 'service_role' THEN
    v_effective_user_id := COALESCE(p_caller_id, auth.uid());
  ELSE
    v_effective_user_id := auth.uid();
  END IF;

  IF v_effective_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required' USING ERRCODE = '42501';
  END IF;

  -- 2. Resolve caller role and profile
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = v_effective_user_id;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User profile not found' USING ERRCODE = '42501';
  END IF;

  -- 3. Resolve class information
  SELECT teacher_id, academic_year_id INTO v_class_teacher_id, v_class_academic_year_id
  FROM public.classes
  WHERE id = p_class_id;

  IF v_class_academic_year_id IS NULL THEN
    RAISE EXCEPTION 'Target class % not found', p_class_id USING ERRCODE = 'P0002';
  END IF;

  -- 4. Enforce teacher class ownership (Admins and Principals bypass class ownership)
  IF v_caller_role NOT IN ('admin', 'principal') THEN
    IF v_class_teacher_id IS NULL OR v_class_teacher_id <> v_effective_user_id THEN
      RAISE EXCEPTION 'Forbidden: You do not have permission to modify students in this class' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 5. Verify Academic Year status (fail closed if locked)
  SELECT status INTO v_year_status
  FROM public.academic_years
  WHERE id = v_class_academic_year_id;

  IF v_year_status IN ('closed', 'archived') THEN
    RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សានេះត្រូវបានបិទបញ្ចប់ និងចាក់សោរួចហើយ (Academic year is locked)'
    USING ERRCODE = '55000';
  END IF;

  -- 6. Pre-validate that all target students belong to this class
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    v_student_id := (v_item->>'id')::UUID;
    IF v_student_id IS NULL THEN
      RAISE EXCEPTION 'Data Integrity Error: Student ID is required in updates' USING ERRCODE = '23502';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.student_enrollments
      WHERE student_id = v_student_id
        AND class_id = p_class_id
    ) INTO v_is_enrolled;

    IF NOT v_is_enrolled THEN
      RAISE EXCEPTION 'Security Boundary Violation: Student % is not enrolled in class %', v_student_id, p_class_id
      USING ERRCODE = '42501';
    END IF;
  END LOOP;

  -- 7. Execute atomic updates
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    v_student_id := (v_item->>'id')::UUID;

    -- Safe date parsing
    v_raw_dob := COALESCE(v_item->>'date_of_birth', v_item->>'dob');
    IF v_raw_dob IS NOT NULL AND trim(v_raw_dob) <> '' AND trim(v_raw_dob) <> '-' THEN
      BEGIN
        v_dob := v_raw_dob::DATE;
      EXCEPTION WHEN OTHERS THEN
        v_dob := NULL;
      END;
    ELSE
      v_dob := NULL;
    END IF;

    -- Health metrics & BMI calculation
    v_height_m := (v_item->>'height_m')::NUMERIC;
    v_weight_kg := (v_item->>'weight_kg')::NUMERIC;
    v_bmi := (v_item->>'bmi')::NUMERIC;
    v_nutrition_status := v_item->>'nutrition_status';

    IF v_height_m IS NOT NULL AND v_height_m > 0 THEN
      v_height_cm := round(v_height_m * 100);
      IF v_weight_kg IS NOT NULL AND v_weight_kg > 0 AND v_bmi IS NULL THEN
        v_bmi := round(v_weight_kg / (v_height_m * v_height_m), 1);
        IF v_bmi < 18.5 THEN
          v_nutrition_status := 'ស្គម';
        ELSIF v_bmi >= 25 AND v_bmi < 30 THEN
          v_nutrition_status := 'លើសទម្ងន់';
        ELSIF v_bmi >= 30 THEN
          v_nutrition_status := 'ធាត់';
        ELSE
          v_nutrition_status := 'ធម្មតា';
        END IF;
      END IF;
    ELSE
      v_height_cm := NULL;
    END IF;

    -- A. Update public.students
    UPDATE public.students
    SET
      full_name = COALESCE(v_item->>'full_name', full_name),
      english_name = CASE WHEN v_item ? 'english_name' THEN NULLIF(trim(v_item->>'english_name'), '') ELSE english_name END,
      gender = CASE
        WHEN v_item ? 'gender' THEN
          CASE WHEN (v_item->>'gender') ILIKE 'F%' OR (v_item->>'gender') = 'ស្រី' THEN 'F' ELSE 'M' END
        ELSE gender
      END,
      dob = CASE WHEN v_raw_dob IS NOT NULL THEN v_dob ELSE dob END,
      date_of_birth = CASE WHEN v_raw_dob IS NOT NULL THEN v_dob ELSE date_of_birth END,
      birth_cert_no = CASE WHEN v_item ? 'birth_cert_no' THEN NULLIF(trim(v_item->>'birth_cert_no'), '') ELSE birth_cert_no END,
      parent_phone = CASE
        WHEN v_item ? 'parent_phone' THEN NULLIF(trim(v_item->>'parent_phone'), '')
        WHEN v_item ? 'father_phone' AND NULLIF(trim(v_item->>'father_phone'), '') IS NOT NULL THEN trim(v_item->>'father_phone')
        WHEN v_item ? 'mother_phone' AND NULLIF(trim(v_item->>'mother_phone'), '') IS NOT NULL THEN trim(v_item->>'mother_phone')
        WHEN v_item ? 'student_phone' AND NULLIF(trim(v_item->>'student_phone'), '') IS NOT NULL THEN trim(v_item->>'student_phone')
        WHEN v_item ? 'guardian_phone' AND NULLIF(trim(v_item->>'guardian_phone'), '') IS NOT NULL THEN trim(v_item->>'guardian_phone')
        ELSE parent_phone
      END,
      status = CASE WHEN v_item ? 'status' THEN NULLIF(trim(v_item->>'status'), '') ELSE status END,
      scholarship = CASE
        WHEN v_item ? 'scholarship' THEN
          CASE WHEN (v_item->>'scholarship') IN ('yes', 'true', '1') THEN 'yes' ELSE 'no' END
        ELSE scholarship
      END,
      id_poor = CASE WHEN v_item ? 'id_poor' THEN NULLIF(trim(v_item->>'id_poor'), '') ELSE id_poor END,
      orphan = CASE
        WHEN v_item ? 'orphan' THEN
          CASE WHEN (v_item->>'orphan') IN ('yes', 'true', '1') THEN 'yes' ELSE 'no' END
        ELSE orphan
      END,
      distance_km = CASE WHEN v_item ? 'distance_km' THEN COALESCE((v_item->>'distance_km')::NUMERIC, 0) ELSE distance_km END,
      disability = CASE WHEN v_item ? 'disability' THEN NULLIF(trim(v_item->>'disability'), '') ELSE disability END,
      health_note = CASE
        WHEN v_item ? 'health_note' THEN NULLIF(trim(v_item->>'health_note'), '')
        WHEN v_item ? 'health_issues' THEN NULLIF(trim(v_item->>'health_issues'), '')
        ELSE health_note
      END,
      weight_kg = CASE WHEN v_item ? 'weight_kg' THEN v_weight_kg ELSE weight_kg END,
      height_m = CASE WHEN v_item ? 'height_m' THEN v_height_m ELSE height_m END,
      bmi = CASE WHEN v_bmi IS NOT NULL THEN v_bmi ELSE bmi END,
      nutrition_status = CASE WHEN v_nutrition_status IS NOT NULL THEN v_nutrition_status ELSE nutrition_status END,
      father_name = CASE WHEN v_item ? 'father_name' THEN NULLIF(trim(v_item->>'father_name'), '') ELSE father_name END,
      father_job = CASE WHEN v_item ? 'father_job' THEN NULLIF(trim(v_item->>'father_job'), '') ELSE father_job END,
      father_phone = CASE WHEN v_item ? 'father_phone' THEN NULLIF(trim(v_item->>'father_phone'), '') ELSE father_phone END,
      mother_name = CASE WHEN v_item ? 'mother_name' THEN NULLIF(trim(v_item->>'mother_name'), '') ELSE mother_name END,
      mother_job = CASE WHEN v_item ? 'mother_job' THEN NULLIF(trim(v_item->>'mother_job'), '') ELSE mother_job END,
      mother_phone = CASE WHEN v_item ? 'mother_phone' THEN NULLIF(trim(v_item->>'mother_phone'), '') ELSE mother_phone END,
      guardian_name = CASE WHEN v_item ? 'guardian_name' THEN NULLIF(trim(v_item->>'guardian_name'), '') ELSE guardian_name END,
      guardian_job = CASE WHEN v_item ? 'guardian_job' THEN NULLIF(trim(v_item->>'guardian_job'), '') ELSE guardian_job END,
      guardian_phone = CASE WHEN v_item ? 'guardian_phone' THEN NULLIF(trim(v_item->>'guardian_phone'), '') ELSE guardian_phone END,
      siblings_count = CASE WHEN v_item ? 'siblings_count' THEN COALESCE((v_item->>'siblings_count')::INT, 0) ELSE siblings_count END,
      income = CASE WHEN v_item ? 'income' THEN COALESCE((v_item->>'income')::NUMERIC, 0) ELSE income END,
      current_address = CASE
        WHEN v_item ? 'current_address' THEN NULLIF(trim(v_item->>'current_address'), '')
        WHEN v_item ? 'address' THEN NULLIF(trim(v_item->>'address'), '')
        ELSE current_address
      END,
      migrant_status = CASE WHEN v_item ? 'migrant_status' THEN NULLIF(trim(v_item->>'migrant_status'), '') ELSE migrant_status END,
      updated_at = NOW()
    WHERE id = v_student_id;

    -- B. Update public.student_enrollments for desk_number and room_number
    IF (v_item ? 'desk_number') OR (v_item ? 'room_number') THEN
      UPDATE public.student_enrollments
      SET
        desk_number = CASE WHEN v_item ? 'desk_number' THEN NULLIF(trim(v_item->>'desk_number'), '') ELSE desk_number END,
        room_number = CASE WHEN v_item ? 'room_number' THEN NULLIF(trim(v_item->>'room_number'), '') ELSE room_number END,
        updated_at = NOW()
      WHERE student_id = v_student_id
        AND class_id = p_class_id;
    END IF;

    -- C. Upsert health record if metrics or notes are provided
    IF (v_weight_kg IS NOT NULL OR v_height_m IS NOT NULL OR (v_item ? 'health_note') OR (v_item ? 'health_issues') OR (v_item ? 'disability')) THEN
      INSERT INTO public.student_health_records (
        student_id,
        academic_year_id,
        recorded_date,
        weight_kg,
        height_cm,
        bmi,
        vision_left,
        vision_right,
        hearing,
        dental,
        notes
      )
      VALUES (
        v_student_id,
        v_class_academic_year_id,
        v_today,
        v_weight_kg,
        v_height_cm,
        v_bmi,
        '6/6',
        '6/6',
        'ធម្មតា',
        'ធម្មតា',
        COALESCE(v_item->>'health_note', v_item->>'health_issues', '')
      )
      ON CONFLICT (student_id, recorded_date)
      DO UPDATE SET
        weight_kg = COALESCE(EXCLUDED.weight_kg, public.student_health_records.weight_kg),
        height_cm = COALESCE(EXCLUDED.height_cm, public.student_health_records.height_cm),
        bmi = COALESCE(EXCLUDED.bmi, public.student_health_records.bmi),
        notes = CASE WHEN EXCLUDED.notes <> '' THEN EXCLUDED.notes ELSE public.student_health_records.notes END,
        updated_at = NOW();
    END IF;

    v_updated_count := v_updated_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count
  );
END;
$$;

-- Grant execution to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.batch_update_student_profiles_atomic(UUID, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_update_student_profiles_atomic(UUID, JSONB, UUID) TO service_role;

COMMIT;
