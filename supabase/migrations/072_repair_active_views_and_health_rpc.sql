-- Migration 072: Repair Active Students View and Health Records RPC
-- Description:
-- 1. Recreates public.active_students view with security_invoker = true to ensure
--    compatibility after foreign key and view cascade modifications.
-- 2. Updates public.upsert_health_records_atomic to remove obsolete references to
--    students.class_id, strictly enforcing student enrollment validation through
--    public.student_enrollments for the specified academic year.

BEGIN;

-- ============================================================================
-- 1. RECREATE ACTIVE_STUDENTS VIEW WITH SECURITY INVOKER
-- ============================================================================

DROP VIEW IF EXISTS public.active_students CASCADE;

CREATE VIEW public.active_students WITH (security_invoker = true) AS
SELECT * 
FROM public.students 
WHERE is_active = true;

-- ============================================================================
-- 2. REPAIR UPSERT_HEALTH_RECORDS_ATOMIC RPC (REMOVE STUDENTS.CLASS_ID FALLBACK)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_health_records_atomic(
    p_records JSONB,
    p_academic_year_id UUID,
    p_caller_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id TEXT;
    v_year_status TEXT;
    
    rec JSONB;
    v_student_id UUID;
    v_class_id UUID;
    v_recorded_date DATE;
    
    v_class_school_id TEXT;
    v_class_teacher_id UUID;
    v_class_year_id UUID;
    
    v_weight NUMERIC;
    v_height_cm NUMERIC;
    v_height_m NUMERIC;
    v_bmi NUMERIC;
    v_nutrition TEXT;
    v_count INT := 0;
BEGIN
    -- 1. Authentication Check (fail closed)
    IF auth.uid() IS NOT NULL THEN
        v_caller_id := auth.uid();
    ELSIF auth.role() = 'service_role' AND p_caller_id IS NOT NULL THEN
        v_caller_id := p_caller_id;
    ELSE
        RAISE EXCEPTION 'Unauthorized: Authentication required.' USING ERRCODE = '42501';
    END IF;

    -- 2. Resolve Authoritative Profile & Role
    SELECT role, school_id INTO v_caller_role, v_caller_school_id
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'principal', 'teacher') THEN
        RAISE EXCEPTION 'Forbidden: Insufficient role privileges.' USING ERRCODE = '42501';
    END IF;

    -- 3. Validate Inputs
    IF p_academic_year_id IS NULL THEN
        RAISE EXCEPTION 'Validation error: academic_year_id is required.' USING ERRCODE = '22023';
    END IF;

    -- 4. Check Academic Year Lifecycle Status
    SELECT status INTO v_year_status
    FROM public.academic_years
    WHERE id = p_academic_year_id;

    IF v_year_status IS NULL THEN
        RAISE EXCEPTION 'Academic year not found.' USING ERRCODE = 'P0002';
    END IF;

    IF v_year_status IN ('closed', 'archived') THEN
        RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សានេះត្រូវបានបិទបញ្ចប់ និងចាក់សោរួចហើយ (Academic year is locked)'
        USING ERRCODE = '55000';
    END IF;

    IF p_records IS NULL OR jsonb_typeof(p_records) <> 'array' OR jsonb_array_length(p_records) = 0 THEN
        RETURN jsonb_build_object('success', true, 'count', 0);
    END IF;

    -- 5. Process each health record
    FOR rec IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        -- Parse required fields
        IF rec->>'student_id' IS NULL OR rec->>'class_id' IS NULL OR rec->>'recorded_date' IS NULL THEN
            RAISE EXCEPTION 'Validation error: student_id, class_id, and recorded_date are required for each record.' USING ERRCODE = '22023';
        END IF;

        v_student_id := (rec->>'student_id')::UUID;
        v_class_id := (rec->>'class_id')::UUID;
        v_recorded_date := (rec->>'recorded_date')::DATE;

        -- Verify Class Exists & Belongs to Academic Year
        SELECT school_id, teacher_id, academic_year_id
        INTO v_class_school_id, v_class_teacher_id, v_class_year_id
        FROM public.classes
        WHERE id = v_class_id;

        IF v_class_school_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.classes WHERE id = v_class_id) THEN
            RAISE EXCEPTION 'Class not found: %', v_class_id USING ERRCODE = 'P0002';
        END IF;

        IF v_class_year_id IS NOT NULL AND v_class_year_id <> p_academic_year_id THEN
            RAISE EXCEPTION 'Class % does not belong to academic year %.', v_class_id, p_academic_year_id USING ERRCODE = '44000';
        END IF;

        -- Role-based class authorization guard
        IF v_caller_role = 'principal' THEN
            IF v_caller_school_id IS DISTINCT FROM v_class_school_id THEN
                RAISE EXCEPTION 'Forbidden: You cannot modify records outside your school institution.' USING ERRCODE = '42501';
            END IF;
        ELSIF v_caller_role = 'teacher' THEN
            IF v_class_teacher_id IS DISTINCT FROM v_caller_id THEN
                RAISE EXCEPTION 'Forbidden: You are not authorized to modify records for class %.', v_class_id USING ERRCODE = '42501';
            END IF;
        END IF;

        -- Student existence & enrollment verification (via student_enrollments)
        IF NOT EXISTS (
            SELECT 1 FROM public.student_enrollments se
            WHERE se.student_id = v_student_id
              AND se.class_id = v_class_id
              AND se.academic_year_id = p_academic_year_id
        ) THEN
            RAISE EXCEPTION 'Forbidden: Student % is not enrolled in class % for academic year %.', v_student_id, v_class_id, p_academic_year_id USING ERRCODE = '42501';
        END IF;

        -- Biometrics and Nutrition Calculations
        v_weight := NULLIF(rec->>'weight_kg', '')::NUMERIC;
        v_height_cm := NULLIF(rec->>'height_cm', '')::NUMERIC;
        
        IF v_weight IS NOT NULL AND v_height_cm IS NOT NULL AND v_height_cm > 0 THEN
            v_height_m := ROUND((v_height_cm / 100.0)::NUMERIC, 2);
            v_bmi := ROUND((v_weight / ((v_height_cm / 100.0) ^ 2))::NUMERIC, 2);
            IF v_bmi < 18.5 THEN
                v_nutrition := 'ស្គម';
            ELSIF v_bmi >= 25.0 AND v_bmi < 30.0 THEN
                v_nutrition := 'លើសទម្ងន់';
            ELSIF v_bmi >= 30.0 THEN
                v_nutrition := 'ធាត់';
            ELSE
                v_nutrition := 'ធម្មតា';
            END IF;
        ELSE
            v_height_m := CASE WHEN v_height_cm IS NOT NULL AND v_height_cm > 0 THEN ROUND((v_height_cm / 100.0)::NUMERIC, 2) ELSE NULL END;
            v_bmi := NULLIF(rec->>'bmi', '')::NUMERIC;
            v_nutrition := 'ធម្មតា';
        END IF;

        -- Atomic Upsert into student_health_records
        INSERT INTO public.student_health_records (
            student_id,
            class_id,
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
        ) VALUES (
            v_student_id,
            v_class_id,
            p_academic_year_id,
            v_recorded_date,
            v_weight,
            v_height_cm,
            v_bmi,
            COALESCE(NULLIF(TRIM(rec->>'vision_left'), ''), 'ធម្មតា'),
            COALESCE(NULLIF(TRIM(rec->>'vision_right'), ''), 'ធម្មតា'),
            COALESCE(NULLIF(TRIM(rec->>'hearing'), ''), 'ធម្មតា'),
            COALESCE(NULLIF(TRIM(rec->>'dental'), ''), 'ធម្មតា'),
            COALESCE(rec->>'notes', '')
        )
        ON CONFLICT (student_id, recorded_date, academic_year_id)
        DO UPDATE SET
            class_id = EXCLUDED.class_id,
            weight_kg = COALESCE(EXCLUDED.weight_kg, student_health_records.weight_kg),
            height_cm = COALESCE(EXCLUDED.height_cm, student_health_records.height_cm),
            bmi = COALESCE(EXCLUDED.bmi, student_health_records.bmi),
            vision_left = COALESCE(EXCLUDED.vision_left, student_health_records.vision_left),
            vision_right = COALESCE(EXCLUDED.vision_right, student_health_records.vision_right),
            hearing = COALESCE(EXCLUDED.hearing, student_health_records.hearing),
            dental = COALESCE(EXCLUDED.dental, student_health_records.dental),
            notes = COALESCE(EXCLUDED.notes, student_health_records.notes);

        -- Synchronize biometric updates to students table
        IF v_weight IS NOT NULL OR v_height_cm IS NOT NULL OR v_bmi IS NOT NULL OR rec->>'notes' IS NOT NULL THEN
            UPDATE public.students
            SET
                weight_kg = COALESCE(v_weight, weight_kg),
                height_m = COALESCE(v_height_m, height_m),
                bmi = COALESCE(v_bmi, bmi),
                nutrition_status = COALESCE(v_nutrition, nutrition_status),
                health_info = COALESCE(NULLIF(rec->>'notes', ''), health_info)
            WHERE id = v_student_id;
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'count', v_count
    );
END;
$$;

COMMIT;
