-- 42_admin_basic_import.sql
BEGIN;

-- Update the Stored Procedure for Bulk Quick Registration to accept desk and room numbers
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
    
    -- New extended fields
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
BEGIN
    FOR record IN SELECT * FROM jsonb_array_elements(student_records)
    LOOP
        v_class_id := (record->>'class_id')::UUID;
        v_student_id_number := record->>'student_id_number';
        v_full_name := record->>'full_name';
        v_gender := record->>'gender';
        v_status := COALESCE(record->>'status', 'new');
        v_desk_number := record->>'desk_number';
        v_room_number := record->>'room_number';
        
        -- Parse extended fields
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
        
        -- Determine parent phone fallback
        v_parent_phone := COALESCE(v_father_phone, v_mother_phone);

        -- Try to find existing student by student_id_number
        SELECT id INTO v_student_id FROM students WHERE student_id_number = v_student_id_number LIMIT 1;
        
        IF v_student_id IS NULL THEN
            -- Insert new student (with extended fields)
            INSERT INTO students (
                student_id_number, full_name, gender, status, is_active, class_id,
                desk_number, room_number,
                dob, current_address, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, parent_phone
            ) VALUES (
                v_student_id_number, v_full_name, v_gender, v_status, true, v_class_id,
                v_desk_number, v_room_number,
                v_dob, v_address, v_father_name, v_father_job, v_father_phone, v_mother_name, v_mother_job, v_mother_phone, v_parent_phone
            ) RETURNING id INTO v_student_id;
        ELSE
            -- Update core fields if needed (progressive update - do not erase existing data)
            UPDATE students 
            SET 
                class_id = COALESCE(v_class_id, class_id),
                full_name = COALESCE(v_full_name, full_name),
                gender = COALESCE(v_gender, gender),
                is_active = true,
                desk_number = COALESCE(v_desk_number, desk_number),
                room_number = COALESCE(v_room_number, room_number),
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
            student_id, class_id, academic_year_id, enrollment_status, year_result
        ) VALUES (
            v_student_id, v_class_id, target_year_id, 'active', 'enrolled'
        )
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET
            class_id = COALESCE(EXCLUDED.class_id, student_enrollments.class_id),
            enrollment_status = 'active',
            updated_at = NOW();

        affected_count := affected_count + 1;
    END LOOP;

    -- Insert audit log
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Create a table for correction requests from Homeroom to Admin
CREATE TABLE IF NOT EXISTS correction_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL, -- e.g., 'student_id_number', 'full_name', 'gender'
    old_value TEXT,
    new_value TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE correction_requests ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own requests and insert new ones
CREATE POLICY "Teachers can view their own correction requests" ON correction_requests
    FOR SELECT TO authenticated USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert correction requests" ON correction_requests
    FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid());

-- Admins and Principals can view and update all requests
CREATE POLICY "Admins can view all correction requests" ON correction_requests
    FOR SELECT TO authenticated USING (
        (SELECT is_admin() OR is_principal())
    );

CREATE POLICY "Admins can update correction requests" ON correction_requests
    FOR UPDATE TO authenticated USING (
        (SELECT is_admin() OR is_principal())
    );


COMMIT;
