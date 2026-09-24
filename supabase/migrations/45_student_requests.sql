-- 45_student_requests.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.student_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    gender TEXT,
    date_of_birth DATE,
    class_id UUID REFERENCES public.classes(id),
    requested_by UUID REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.student_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can create student requests" 
    ON public.student_requests FOR INSERT 
    WITH CHECK (
        auth.uid() = requested_by AND 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'teacher' OR role = 'admin' OR role = 'principal'))
    );

CREATE POLICY "Teachers can view their own requests" 
    ON public.student_requests FOR SELECT 
    USING (
        auth.uid() = requested_by OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'principal'))
    );

CREATE POLICY "Admins can update requests" 
    ON public.student_requests FOR UPDATE 
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'principal'))
    );

-- Function to approve student request
CREATE OR REPLACE FUNCTION approve_student_request(
    p_request_id UUID,
    p_student_id_number TEXT,
    p_class_id UUID,
    p_admin_notes TEXT,
    p_academic_year_id UUID,
    p_admin_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_request RECORD;
    v_student_id UUID;
BEGIN
    -- Validate admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_user_id AND (role = 'admin' OR role = 'principal')) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins or principals can approve requests.';
    END IF;

    -- Fetch request
    SELECT * INTO v_request FROM student_requests WHERE id = p_request_id AND status = 'pending';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or already processed.';
    END IF;

    -- Upsert student using bulk_quick_register_students logic or directly
    -- Try to find existing student by student_id_number
    SELECT id INTO v_student_id FROM students WHERE student_id_number = p_student_id_number LIMIT 1;
    
    IF v_student_id IS NULL THEN
        -- Insert new student Master Identity
        INSERT INTO students (
            student_id_number, full_name, gender, status, is_active, dob
        ) VALUES (
            p_student_id_number, v_request.student_name, v_request.gender, 'new', true, v_request.date_of_birth
        ) RETURNING id INTO v_student_id;
    ELSE
        -- Update core fields
        UPDATE students 
        SET 
            full_name = COALESCE(v_request.student_name, full_name),
            gender = COALESCE(v_request.gender, gender),
            is_active = true,
            dob = COALESCE(v_request.date_of_birth, dob),
            updated_at = NOW()
        WHERE id = v_student_id;
    END IF;

    -- Upsert the student enrollment for the target academic year
    INSERT INTO student_enrollments (
        student_id, class_id, academic_year_id, enrollment_status, year_result
    ) VALUES (
        v_student_id, p_class_id, p_academic_year_id, 'active', 'enrolled'
    )
    ON CONFLICT (student_id, academic_year_id) DO UPDATE SET
        class_id = EXCLUDED.class_id,
        enrollment_status = 'active',
        updated_at = NOW();

    -- Update request status
    UPDATE student_requests
    SET status = 'approved',
        admin_notes = p_admin_notes,
        reviewed_at = NOW(),
        class_id = p_class_id
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true, 'student_id', v_student_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
