-- Migration 078: Add students.updated_at & Align bulk_quick_register_students
-- 1. Ensure public.students has updated_at column
-- 2. Fully align bulk_quick_register_students with valid columns
-- 3. Persist seating (desk_number, room_number) to student_enrollments

BEGIN;

-- Add updated_at column to students table if not exists
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.bulk_quick_register_students(
    student_records JSONB,
    target_year_id UUID,
    admin_user_id UUID DEFAULT NULL
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
    
    v_effective_user_id UUID;
    v_caller_role TEXT;
    v_caller_school_id TEXT;
    v_class_school_id TEXT;
    v_class_year_id UUID;
    v_year_status TEXT;
BEGIN
    -- 1. Resolve Effective User ID (supports authenticated session or verified service role call)
    IF auth.role() = 'service_role' THEN
        v_effective_user_id := COALESCE(admin_user_id, auth.uid());
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

    -- 3. Strict Authorization: ONLY admin or principal can register new students
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'principal') THEN
        RAISE EXCEPTION 'Forbidden: Only admin or principal can register new students (caller role: %)', COALESCE(v_caller_role, 'none') USING ERRCODE = '42501';
    END IF;

    -- 4. Verify Academic Year Status
    SELECT status INTO v_year_status
    FROM public.academic_years
    WHERE id = target_year_id;

    IF v_year_status IS NULL THEN
        RAISE EXCEPTION 'Academic year not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_year_status IN ('closed', 'archived') THEN
        RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សានេះត្រូវបានបិទបញ្ចប់រួចហើយ (Academic year is locked)' USING ERRCODE = '55000';
    END IF;

    FOR record IN SELECT * FROM jsonb_array_elements(student_records)
    LOOP
        v_class_id := (record->>'class_id')::UUID;
        
        -- Boundary & Integrity Check
        SELECT school_id, academic_year_id INTO v_class_school_id, v_class_year_id
        FROM public.classes
        WHERE id = v_class_id;

        IF v_class_year_id IS NULL THEN
             RAISE EXCEPTION 'Data Integrity Error: Class % not found.', v_class_id USING ERRCODE = '23503';
        END IF;

        IF v_class_year_id != target_year_id THEN
             RAISE EXCEPTION 'Data Integrity Error: Class academic year does not match target year.' USING ERRCODE = '23503';
        END IF;

        -- Principal school isolation check
        IF v_caller_role = 'principal' THEN
            IF v_caller_school_id IS NULL OR v_class_school_id IS DISTINCT FROM v_caller_school_id THEN
                RAISE EXCEPTION 'Forbidden: Principal does not have access to class %', v_class_id USING ERRCODE = '42501';
            END IF;
        END IF;

        v_student_id_number := record->>'student_id_number';
        v_full_name := record->>'full_name';
        v_gender := record->>'gender';
        v_status := COALESCE(record->>'status', 'new');
        v_desk_number := record->>'desk_number';
        v_room_number := record->>'room_number';
        
        -- Safely extract and parse optional fields
        IF (record->>'dob') IS NOT NULL AND (record->>'dob') != '' THEN
            BEGIN
                v_dob := (record->>'dob')::DATE;
            EXCEPTION WHEN OTHERS THEN
                v_dob := NULL;
            END;
        ELSE
            v_dob := NULL;
        END IF;

        v_address := record->>'address';
        v_father_name := record->>'father_name';
        v_father_job := record->>'father_job';
        v_father_phone := record->>'father_phone';
        v_mother_name := record->>'mother_name';
        v_mother_job := record->>'mother_job';
        v_mother_phone := record->>'mother_phone';
        v_parent_phone := COALESCE(v_father_phone, v_mother_phone);

        -- Normalize gender
        IF v_gender ILIKE 'F%' OR v_gender = 'ស្រី' THEN
            v_gender := 'F';
        ELSE
            v_gender := 'M';
        END IF;

        -- Core validation
        IF v_student_id_number IS NULL OR trim(v_student_id_number) = '' THEN
             RAISE EXCEPTION 'Data Integrity Error: student_id_number is required.' USING ERRCODE = '23502';
        END IF;

        IF v_full_name IS NULL OR trim(v_full_name) = '' THEN
             RAISE EXCEPTION 'Data Integrity Error: full_name is required.' USING ERRCODE = '23502';
        END IF;

        -- 5. Match or Insert Student Master Record in public.students
        -- Columns: student_id_number, full_name, gender, dob, current_address, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, parent_phone, status, is_active, updated_at
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
                current_address,
                father_name,
                father_job,
                father_phone,
                mother_name,
                mother_job,
                mother_phone,
                parent_phone,
                status,
                is_active,
                updated_at
            ) VALUES (
                trim(v_student_id_number),
                v_full_name,
                v_gender,
                v_dob,
                v_address,
                v_father_name,
                v_father_job,
                v_father_phone,
                v_mother_name,
                v_mother_job,
                v_mother_phone,
                v_parent_phone,
                v_status,
                true,
                NOW()
            ) RETURNING id INTO v_student_id;
        ELSE
            UPDATE public.students SET
                full_name = v_full_name,
                gender = v_gender,
                dob = COALESCE(v_dob, students.dob),
                current_address = COALESCE(v_address, students.current_address),
                father_name = COALESCE(v_father_name, students.father_name),
                father_job = COALESCE(v_father_job, students.father_job),
                father_phone = COALESCE(v_father_phone, students.father_phone),
                mother_name = COALESCE(v_mother_name, students.mother_name),
                mother_job = COALESCE(v_mother_job, students.mother_job),
                mother_phone = COALESCE(v_mother_phone, students.mother_phone),
                parent_phone = COALESCE(v_parent_phone, students.parent_phone),
                status = v_status,
                is_active = true,
                updated_at = NOW()
            WHERE id = v_student_id;
        END IF;

        -- 6. Upsert Student Enrollment Record with Seating Details
        INSERT INTO public.student_enrollments (
            student_id,
            class_id,
            academic_year_id,
            enrollment_status,
            year_result,
            desk_number,
            room_number,
            updated_at
        ) VALUES (
            v_student_id,
            v_class_id,
            target_year_id,
            'active',
            'enrolled',
            v_desk_number,
            v_room_number,
            NOW()
        )
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET
            class_id = EXCLUDED.class_id,
            enrollment_status = 'active',
            year_result = 'enrolled',
            desk_number = COALESCE(EXCLUDED.desk_number, student_enrollments.desk_number),
            room_number = COALESCE(EXCLUDED.room_number, student_enrollments.room_number),
            updated_at = NOW();

        affected_count := affected_count + 1;
    END LOOP;

    IF affected_count > 0 AND v_effective_user_id IS NOT NULL THEN
        INSERT INTO public.audit_logs (user_id, action) 
        VALUES (v_effective_user_id, 'បានចុះឈ្មោះសិស្សរហ័សចំនួន ' || affected_count || ' នាក់តាមរយៈការនាំចូល (Import/Grid)');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'count', affected_count,
        'message', format('ចុះឈ្មោះសិស្សបានជោគជ័យចំនួន %s នាក់', affected_count)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.bulk_quick_register_students(JSONB, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bulk_quick_register_students(JSONB, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_quick_register_students(JSONB, UUID, UUID) TO service_role;

COMMIT;
