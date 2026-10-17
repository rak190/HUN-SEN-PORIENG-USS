-- Migration 079: Fix batch_register_students_atomic RPC
-- Description:
-- 1. Drop old 2-argument signature to eliminate PostgREST ambiguity (PGRST203)
-- 2. Define canonical 3-argument signature with safe date parsing (handles empty strings without 22007 error)
-- 3. Eliminate ON CONFLICT (student_id_number) crash (42P10) by using SELECT LIMIT 1 + INSERT/UPDATE
-- 4. Sync both dob and date_of_birth columns on public.students
-- 5. Properly upsert desk_number and room_number on public.student_enrollments
-- 6. Enforce strict admin and principal caller authorization via p_caller_id / auth.uid()

BEGIN;

-- 1. Drop legacy overloaded function signatures to prevent PostgREST ambiguity
DROP FUNCTION IF EXISTS public.batch_register_students_atomic(JSONB, UUID);

-- 2. Create canonical batch_register_students_atomic function
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
  v_class_year_id UUID;
  v_year_status TEXT;
  
  v_student_id_number TEXT;
  v_full_name TEXT;
  v_gender TEXT;
  v_raw_dob TEXT;
  v_dob DATE;
  v_room_number TEXT;
  v_desk_number TEXT;
BEGIN
  -- 1. Resolve effective user ID (supports authenticated session or verified service role call)
  IF auth.role() = 'service_role' THEN
      v_effective_user_id := COALESCE(p_caller_id, auth.uid());
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

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'principal') THEN
      RAISE EXCEPTION 'Forbidden: Insufficient privileges (caller role: %)', COALESCE(v_caller_role, 'none') USING ERRCODE = '42501';
  END IF;

  -- 3. Verify Academic Year status
  SELECT status INTO v_year_status 
  FROM public.academic_years 
  WHERE id = p_academic_year_id;

  IF v_year_status IS NULL THEN
      RAISE EXCEPTION 'Academic year not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_year_status IN ('closed', 'archived') THEN
      RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សានេះត្រូវបានបិទបញ្ចប់ និងចាក់សោរួចហើយ (Academic year is locked)'
      USING ERRCODE = '55000';
  END IF;

  -- 4. Process student records
  FOR v_student IN SELECT * FROM jsonb_array_elements(p_students)
  LOOP
    v_student_id_number := v_student->>'student_id_number';
    v_full_name := v_student->>'full_name';
    v_gender := v_student->>'gender';
    v_room_number := v_student->>'room_number';
    v_desk_number := v_student->>'desk_number';

    -- Core validation
    IF v_student_id_number IS NULL OR trim(v_student_id_number) = '' THEN
         RAISE EXCEPTION 'Data Integrity Error: student_id_number is required.' USING ERRCODE = '23502';
    END IF;

    IF v_full_name IS NULL OR trim(v_full_name) = '' THEN
         RAISE EXCEPTION 'Data Integrity Error: full_name is required.' USING ERRCODE = '23502';
    END IF;

    -- Normalize gender
    IF v_gender ILIKE 'F%' OR v_gender = 'ស្រី' THEN
        v_gender := 'F';
    ELSE
        v_gender := 'M';
    END IF;

    -- Safe date of birth parsing (supports both 'dob' and 'date_of_birth' keys; gracefully handles empty strings)
    v_raw_dob := COALESCE(v_student->>'dob', v_student->>'date_of_birth');
    IF v_raw_dob IS NOT NULL AND trim(v_raw_dob) != '' THEN
        BEGIN
            v_dob := trim(v_raw_dob)::DATE;
        EXCEPTION WHEN OTHERS THEN
            v_dob := NULL;
        END;
    ELSE
        v_dob := NULL;
    END IF;

    -- Class & boundary check if class_id provided
    IF (v_student->>'class_id') IS NOT NULL AND (v_student->>'class_id') != '' THEN
        v_class_id := (v_student->>'class_id')::UUID;
        
        SELECT school_id, academic_year_id INTO v_class_school_id, v_class_year_id
        FROM public.classes 
        WHERE id = v_class_id;

        IF v_class_year_id IS NULL THEN
            RAISE EXCEPTION 'Data Integrity Error: Class % not found.', v_class_id USING ERRCODE = '23503';
        END IF;

        IF v_class_year_id != p_academic_year_id THEN
            RAISE EXCEPTION 'Data Integrity Error: Class academic year does not match target year.' USING ERRCODE = '23503';
        END IF;

        IF v_caller_role = 'principal' AND (v_caller_school_id IS NULL OR v_class_school_id IS DISTINCT FROM v_caller_school_id) THEN
            RAISE EXCEPTION 'Forbidden: Principal does not have access to class %', v_class_id USING ERRCODE = '42501';
        END IF;
    ELSE
        v_class_id := NULL;
    END IF;

    -- Match or Insert Student Master Record in public.students without crashing on missing unique constraint
    v_student_id := NULL;
    SELECT id INTO v_student_id 
    FROM public.students 
    WHERE student_id_number = trim(v_student_id_number)
    LIMIT 1;

    IF v_student_id IS NULL THEN
        INSERT INTO public.students (
            student_id_number,
            full_name,
            gender,
            dob,
            date_of_birth,
            is_active,
            updated_at
        ) VALUES (
            trim(v_student_id_number),
            trim(v_full_name),
            v_gender,
            v_dob,
            v_dob,
            true,
            NOW()
        ) RETURNING id INTO v_student_id;
    ELSE
        UPDATE public.students SET
            full_name = trim(v_full_name),
            gender = v_gender,
            dob = COALESCE(v_dob, students.dob),
            date_of_birth = COALESCE(v_dob, students.date_of_birth),
            is_active = true,
            updated_at = NOW()
        WHERE id = v_student_id;
    END IF;

    -- Upsert Student Enrollment Record if class_id is assigned
    IF v_class_id IS NOT NULL THEN
        INSERT INTO public.student_enrollments (
            student_id,
            class_id,
            academic_year_id,
            room_number,
            desk_number,
            enrollment_status,
            year_result,
            updated_at
        ) VALUES (
            v_student_id,
            v_class_id,
            p_academic_year_id,
            v_room_number,
            v_desk_number,
            'active',
            'enrolled',
            NOW()
        )
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET
            class_id = EXCLUDED.class_id,
            room_number = COALESCE(EXCLUDED.room_number, student_enrollments.room_number),
            desk_number = COALESCE(EXCLUDED.desk_number, student_enrollments.desk_number),
            enrollment_status = 'active',
            year_result = 'enrolled',
            updated_at = NOW();
    END IF;

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  IF v_inserted_count > 0 AND v_effective_user_id IS NOT NULL THEN
      INSERT INTO public.audit_logs (user_id, action) 
      VALUES (v_effective_user_id, 'បានចុះឈ្មោះសិស្សជាក្រុមចំនួន ' || v_inserted_count || ' នាក់តាមរយៈ Google Sheet Grid');
  END IF;

  RETURN jsonb_build_object(
      'success', true, 
      'count', v_inserted_count, 
      'message', format('បានបញ្ចូលសិស្សចំនួន %s នាក់ដោយជោគជ័យ', v_inserted_count)
  );
END;
$$;

-- Permissions
REVOKE EXECUTE ON FUNCTION public.batch_register_students_atomic(JSONB, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.batch_register_students_atomic(JSONB, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_register_students_atomic(JSONB, UUID, UUID) TO service_role;

COMMIT;
