-- Migration 060: Enforce strict institutional boundaries on SECURITY DEFINER RPCs

-- 1. Harden batch_upload_scores_atomic
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
    v_caller_school_id UUID;
    v_score JSONB;
    v_inserted_count INT := 0;
    v_year_id UUID := p_academic_year_id;
    v_target_class_id UUID;
    v_year_status TEXT;
    v_class_school_id UUID;
    v_class_teacher_id UUID;
BEGIN
    -- 1. Security & Caller Role Check (enforce Admin, Principal, or Teacher)
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT role, school_id INTO v_caller_role, v_caller_school_id
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
        v_target_class_id := (v_score->>'class_id')::UUID;

        -- BOUNDARY CHECK: Ensure caller has access to the class
        IF v_caller_role != 'admin' THEN
            SELECT school_id, teacher_id INTO v_class_school_id, v_class_teacher_id
            FROM public.classes
            WHERE id = v_target_class_id;

            IF v_caller_role = 'principal' AND (v_caller_school_id IS NULL OR v_class_school_id != v_caller_school_id) THEN
                RAISE EXCEPTION 'Forbidden: Principal does not have access to class %', v_target_class_id USING ERRCODE = '42501';
            END IF;

            IF v_caller_role = 'teacher' AND (v_class_teacher_id IS NULL OR v_class_teacher_id != auth.uid()) THEN
                RAISE EXCEPTION 'Forbidden: Teacher does not own class %', v_target_class_id USING ERRCODE = '42501';
            END IF;
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

    -- 5. Audit Log (Optional but recommended for traceability)
    INSERT INTO public.audit_logs (user_id, action) 
    VALUES (auth.uid(), 'បានអាប់ឡូតពិន្ទុសរុប ' || v_inserted_count || ' កំណត់ត្រាសម្រាប់ខែ/ឆមាស ' || p_period);

    RETURN jsonb_build_object(
        'success', true, 
        'count', v_inserted_count, 
        'message', 'បានបញ្ចូលពិន្ទុ ' || v_inserted_count || ' ដោយជោគជ័យ'
    );
END;
$$;

-- 2. Harden bulk_quick_register_students
CREATE OR REPLACE FUNCTION bulk_quick_register_students(
    student_records JSONB,
    target_year_id UUID,
    admin_user_id UUID
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
    v_caller_school_id UUID;
    v_class_school_id UUID;
    v_class_teacher_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT role, school_id INTO v_caller_role, v_caller_school_id
    FROM public.profiles 
    WHERE id = auth.uid();

    IF v_caller_role NOT IN ('admin', 'principal', 'teacher') THEN
        RAISE EXCEPTION 'Forbidden: Insufficient privileges (caller role: %)', v_caller_role USING ERRCODE = '42501';
    END IF;

    FOR record IN SELECT * FROM jsonb_array_elements(student_records)
    LOOP
        v_class_id := (record->>'class_id')::UUID;
        
        -- BOUNDARY CHECK
        IF v_caller_role != 'admin' THEN
            SELECT school_id, teacher_id INTO v_class_school_id, v_class_teacher_id
            FROM public.classes
            WHERE id = v_class_id;

            IF v_caller_role = 'principal' AND (v_caller_school_id IS NULL OR v_class_school_id != v_caller_school_id) THEN
                RAISE EXCEPTION 'Forbidden: Principal does not have access to class %', v_class_id USING ERRCODE = '42501';
            END IF;

            IF v_caller_role = 'teacher' AND (v_class_teacher_id IS NULL OR v_class_teacher_id != auth.uid()) THEN
                RAISE EXCEPTION 'Forbidden: Teacher does not own class %', v_class_id USING ERRCODE = '42501';
            END IF;
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

        SELECT id INTO v_student_id FROM students WHERE student_id_number = v_student_id_number LIMIT 1;
        
        IF v_student_id IS NULL THEN
            -- Insert new student Master Identity
            INSERT INTO students (
                student_id_number, full_name, gender, status, is_active,
                dob, current_address, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, parent_phone
            ) VALUES (
                v_student_id_number, v_full_name, v_gender, v_status, true,
                v_dob, v_address, v_father_name, v_father_job, v_father_phone, v_mother_name, v_mother_job, v_mother_phone, v_parent_phone
            ) RETURNING id INTO v_student_id;
        ELSE
            -- Update core fields
            UPDATE students 
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

        -- Upsert the student enrollment for the target academic year (Operational data goes here)
        INSERT INTO student_enrollments (
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
        INSERT INTO audit_logs (user_id, action) 
        VALUES (admin_user_id, 'បានចុះឈ្មោះសិស្សរហ័សចំនួន ' || affected_count || ' នាក់តាមរយៈការនាំចូល (Import/Grid)');
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'count', affected_count, 
        'message', 'បានចុះឈ្មោះសិស្សរហ័សចំនួន ' || affected_count || ' នាក់ដោយជោគជ័យ'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. Harden batch_register_students_atomic
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
  v_caller_school_id UUID;
  v_student JSONB;
  v_inserted_count INT := 0;
  v_student_id UUID;
  v_class_id UUID;
  v_class_school_id UUID;
BEGIN
  -- Defense-in-depth authorization check
  IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Fetch caller role from profiles
  SELECT role, school_id INTO v_caller_role, v_caller_school_id
  FROM public.profiles 
  WHERE id = auth.uid();

  -- Enforce role permissions (strict to 'admin', 'principal')
  IF v_caller_role NOT IN ('admin', 'principal') THEN
      RAISE EXCEPTION 'Forbidden: Insufficient privileges (caller role: %)', v_caller_role USING ERRCODE = '42501';
  END IF;

  FOR v_student IN SELECT * FROM jsonb_array_elements(p_students)
  LOOP
    v_class_id := (v_student->>'class_id')::UUID;
    
    IF v_class_id IS NOT NULL AND v_caller_role != 'admin' THEN
        SELECT school_id INTO v_class_school_id FROM public.classes WHERE id = v_class_id;
        IF v_caller_role = 'principal' AND (v_caller_school_id IS NULL OR v_class_school_id != v_caller_school_id) THEN
            RAISE EXCEPTION 'Forbidden: Principal does not have access to class %', v_class_id USING ERRCODE = '42501';
        END IF;
    END IF;

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
