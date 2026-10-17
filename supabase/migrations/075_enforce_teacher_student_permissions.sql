-- Migration 075: Enforce Teacher Student Creation Restrictions & Expand Student Requests
-- 1. Restrict bulk_quick_register_students to admin and principal only
-- 2. Expand student_requests with request_type (transfer_in, transfer_out, dropout), student_id, reason, effective_date, details
-- 3. Enhance approve_student_request RPC to atomically handle transfer_in, transfer_out, and dropout requests

BEGIN;

-- ============================================================================
-- 1. HARDEN bulk_quick_register_students: REMOVE TEACHER PRIVILEGE
-- ============================================================================

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
        
        -- BOUNDARY & INTEGRITY CHECK
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

        -- 5. Upsert Student Master Record
        INSERT INTO public.students (
            student_id_number,
            full_name,
            gender,
            dob,
            address,
            father_name,
            father_job,
            father_phone,
            mother_name,
            mother_job,
            mother_phone,
            parent_phone,
            status,
            desk_number,
            room_number,
            is_active,
            updated_at
        ) VALUES (
            v_student_id_number,
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
            v_desk_number,
            v_room_number,
            true,
            NOW()
        )
        ON CONFLICT (student_id_number) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            gender = EXCLUDED.gender,
            dob = COALESCE(EXCLUDED.dob, students.dob),
            address = COALESCE(EXCLUDED.address, students.address),
            father_name = COALESCE(EXCLUDED.father_name, students.father_name),
            father_job = COALESCE(EXCLUDED.father_job, students.father_job),
            father_phone = COALESCE(EXCLUDED.father_phone, students.father_phone),
            mother_name = COALESCE(EXCLUDED.mother_name, students.mother_name),
            mother_job = COALESCE(EXCLUDED.mother_job, students.mother_job),
            mother_phone = COALESCE(EXCLUDED.mother_phone, students.mother_phone),
            parent_phone = COALESCE(EXCLUDED.parent_phone, students.parent_phone),
            status = EXCLUDED.status,
            desk_number = COALESCE(EXCLUDED.desk_number, students.desk_number),
            room_number = COALESCE(EXCLUDED.room_number, students.room_number),
            is_active = true,
            updated_at = NOW()
        RETURNING id INTO v_student_id;

        -- 6. Upsert Student Enrollment Record
        INSERT INTO public.student_enrollments (
            student_id,
            class_id,
            academic_year_id,
            enrollment_status,
            year_result,
            updated_at
        ) VALUES (
            v_student_id,
            v_class_id,
            target_year_id,
            'active',
            'enrolled',
            NOW()
        )
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET
            class_id = EXCLUDED.class_id,
            enrollment_status = 'active',
            year_result = 'enrolled',
            updated_at = NOW();

        affected_count := affected_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'count', affected_count,
        'message', format('ចុះឈ្មោះសិស្សបានជោគជ័យចំនួន %s នាក់', affected_count)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. EXPAND student_requests SCHEMA
-- ============================================================================

ALTER TABLE public.student_requests
    ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'transfer_in' 
        CHECK (request_type IN ('transfer_in', 'transfer_out', 'dropout')),
    ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reason TEXT,
    ADD COLUMN IF NOT EXISTS effective_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

-- Ensure RLS on student_requests
ALTER TABLE public.student_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can create student requests" ON public.student_requests;
DROP POLICY IF EXISTS "Teachers can insert student requests" ON public.student_requests;
CREATE POLICY "Teachers can create student requests" 
    ON public.student_requests FOR INSERT 
    WITH CHECK (
        auth.uid() = requested_by AND 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'principal')
        )
    );

DROP POLICY IF EXISTS "Teachers can view their own requests" ON public.student_requests;
CREATE POLICY "Teachers can view their own requests" 
    ON public.student_requests FOR SELECT 
    USING (
        auth.uid() = requested_by OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'principal')
        )
    );

DROP POLICY IF EXISTS "Admins can update requests" ON public.student_requests;
DROP POLICY IF EXISTS "Admins have full access on student requests" ON public.student_requests;
CREATE POLICY "Admins can update requests" 
    ON public.student_requests FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'principal')
        )
    );

-- ============================================================================
-- 3. ENHANCE approve_student_request RPC (TRANSFER-IN, TRANSFER-OUT, DROPOUT)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.approve_student_request(
    p_request_id UUID,
    p_student_id_number TEXT DEFAULT NULL,
    p_class_id UUID DEFAULT NULL,
    p_admin_notes TEXT DEFAULT NULL,
    p_academic_year_id UUID DEFAULT NULL,
    p_admin_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_request RECORD;
    v_student_id UUID;
    v_effective_admin_id UUID;
    v_effective_class_id UUID;
    v_effective_year_id UUID;
    v_admin_role TEXT;
BEGIN
    -- 1. Resolve Effective Admin User
    IF auth.role() = 'service_role' THEN
        v_effective_admin_id := COALESCE(p_admin_user_id, auth.uid());
    ELSE
        v_effective_admin_id := auth.uid();
    END IF;

    IF v_effective_admin_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.' USING ERRCODE = '42501';
    END IF;

    -- Validate admin or principal role
    SELECT role INTO v_admin_role FROM public.profiles WHERE id = v_effective_admin_id;
    IF v_admin_role IS NULL OR v_admin_role NOT IN ('admin', 'principal') THEN
        RAISE EXCEPTION 'Unauthorized: Only admins or principals can approve requests.' USING ERRCODE = '42501';
    END IF;

    -- 2. Fetch pending request
    SELECT * INTO v_request 
    FROM public.student_requests 
    WHERE id = p_request_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or already processed.' USING ERRCODE = 'P0002';
    END IF;

    v_effective_class_id := COALESCE(p_class_id, v_request.class_id);

    -- Resolve academic year if not provided
    IF p_academic_year_id IS NOT NULL THEN
        v_effective_year_id := p_academic_year_id;
    ELSE
        SELECT academic_year_id INTO v_effective_year_id FROM public.classes WHERE id = v_effective_class_id;
        IF v_effective_year_id IS NULL THEN
            SELECT id INTO v_effective_year_id FROM public.academic_years WHERE is_active = true LIMIT 1;
        END IF;
    END IF;

    -- 3. Branch according to request_type
    IF v_request.request_type = 'transfer_out' THEN
        -- Verify student_id exists
        IF v_request.student_id IS NULL THEN
            RAISE EXCEPTION 'Data Integrity Error: Transfer out request is missing target student ID.' USING ERRCODE = '23502';
        END IF;
        v_student_id := v_request.student_id;

        -- Update master student record
        UPDATE public.students
        SET 
            enrollment_status = 'transfer',
            is_active = false,
            updated_at = NOW()
        WHERE id = v_student_id;

        -- Update enrollment record
        UPDATE public.student_enrollments
        SET 
            enrollment_status = 'transferred_out',
            notes = COALESCE(p_admin_notes, v_request.reason, 'សិស្សផ្ទេរចេញ'),
            updated_at = NOW()
        WHERE student_id = v_student_id 
          AND enrollment_status = 'active';

    ELSIF v_request.request_type = 'dropout' THEN
        IF v_request.student_id IS NULL THEN
            RAISE EXCEPTION 'Data Integrity Error: Dropout request is missing target student ID.' USING ERRCODE = '23502';
        END IF;
        v_student_id := v_request.student_id;

        -- Update master student record
        UPDATE public.students
        SET 
            enrollment_status = 'dropout',
            is_active = false,
            updated_at = NOW()
        WHERE id = v_student_id;

        -- Update enrollment record
        UPDATE public.student_enrollments
        SET 
            enrollment_status = 'dropped_out',
            notes = COALESCE(p_admin_notes, v_request.reason, 'សិស្សបោះបង់ការសិក្សា'),
            updated_at = NOW()
        WHERE student_id = v_student_id 
          AND enrollment_status = 'active';

    ELSE
        -- Default: transfer_in
        IF p_student_id_number IS NULL OR trim(p_student_id_number) = '' THEN
            RAISE EXCEPTION 'Data Integrity Error: Student ID number is required for transfer-in approval.' USING ERRCODE = '23502';
        END IF;

        IF v_effective_class_id IS NULL THEN
            RAISE EXCEPTION 'Data Integrity Error: Target class ID is required.' USING ERRCODE = '23502';
        END IF;

        -- Check if student already exists by ID number
        SELECT id INTO v_student_id 
        FROM public.students 
        WHERE student_id_number = trim(p_student_id_number) 
        LIMIT 1;

        IF v_student_id IS NULL THEN
            INSERT INTO public.students (
                student_id_number,
                full_name,
                gender,
                dob,
                status,
                enrollment_status,
                is_active,
                updated_at
            ) VALUES (
                trim(p_student_id_number),
                v_request.student_name,
                COALESCE(v_request.gender, 'M'),
                v_request.date_of_birth,
                'transfer',
                'active',
                true,
                NOW()
            ) RETURNING id INTO v_student_id;
        ELSE
            UPDATE public.students
            SET 
                full_name = COALESCE(v_request.student_name, full_name),
                gender = COALESCE(v_request.gender, gender),
                dob = COALESCE(v_request.date_of_birth, dob),
                enrollment_status = 'active',
                is_active = true,
                updated_at = NOW()
            WHERE id = v_student_id;
        END IF;

        -- Upsert enrollment
        INSERT INTO public.student_enrollments (
            student_id,
            class_id,
            academic_year_id,
            enrollment_status,
            year_result,
            notes,
            updated_at
        ) VALUES (
            v_student_id,
            v_effective_class_id,
            v_effective_year_id,
            'active',
            'enrolled',
            COALESCE(p_admin_notes, v_request.reason, 'សិស្សផ្ទេរចូល'),
            NOW()
        )
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET
            class_id = EXCLUDED.class_id,
            enrollment_status = 'active',
            year_result = 'enrolled',
            notes = EXCLUDED.notes,
            updated_at = NOW();
    END IF;

    -- 4. Mark request as approved
    UPDATE public.student_requests
    SET 
        status = 'approved',
        admin_notes = p_admin_notes,
        reviewed_at = NOW(),
        class_id = v_effective_class_id
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true, 
        'student_id', v_student_id,
        'request_type', v_request.request_type
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
