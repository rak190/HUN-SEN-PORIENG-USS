-- Migration 062: Grade Snapshots Schema Fixes and RPC Integrity Updates

-- 1. Add missing columns to grade_snapshots
ALTER TABLE public.grade_snapshots 
ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Backfill existing snapshots if possible, using the class_id to derive academic_year_id and school_id
UPDATE public.grade_snapshots gs
SET 
  academic_year_id = c.academic_year_id,
  school_id = c.school_id
FROM public.classes c
WHERE gs.class_id = c.id
  AND (gs.academic_year_id IS NULL OR gs.school_id IS NULL);

-- 2. Harden bulk_quick_register_students to verify class.academic_year_id matches target_year_id
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
    v_class_year_id UUID;
    v_existing_enrollment_class_id UUID;
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
        
        -- BOUNDARY & INTEGRITY CHECK
        SELECT school_id, teacher_id, academic_year_id INTO v_class_school_id, v_class_teacher_id, v_class_year_id
        FROM public.classes
        WHERE id = v_class_id;

        IF v_class_year_id IS NULL THEN
             RAISE EXCEPTION 'Data Integrity Error: Class % not found.', v_class_id USING ERRCODE = '23503';
        END IF;

        IF v_class_year_id != target_year_id THEN
             RAISE EXCEPTION 'Data Integrity Error: Class academic year does not match target year.' USING ERRCODE = '23503';
        END IF;

        IF v_caller_role != 'admin' THEN
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
            -- Prevent teacher from hijacking a student already enrolled in ANOTHER class for the same year
            IF v_caller_role = 'teacher' THEN
                SELECT class_id INTO v_existing_enrollment_class_id
                FROM public.student_enrollments
                WHERE student_id = v_student_id AND academic_year_id = target_year_id AND enrollment_status = 'active';

                IF v_existing_enrollment_class_id IS NOT NULL AND v_existing_enrollment_class_id != v_class_id THEN
                    RAISE EXCEPTION 'Data Integrity Error: Student % is already actively enrolled in another class for this year.', v_student_id_number
                    USING ERRCODE = '23503';
                END IF;
            END IF;

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

        -- Upsert the student enrollment for the target academic year
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
