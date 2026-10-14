-- Migration 064: Clean Lingering Permissive RLS Policies and Implement Atomic Student Operations
-- Description:
-- 1. DROP lingering broad permissive policies from migrations 003, 004, 018 that allowed public/unauthorized
--    access to student_health_records, home_visits, parent_contacts, support_cases, and support_interventions.
-- 2. Establish strict, least-privilege, school- and class-scoped RLS policies on all sensitive tables.
-- 3. Implement secure, transactional RPC public.save_student_atomic for zero-orphan student mutations.
-- 4. Set strict search_path = public, pg_temp and grant EXECUTE only to authenticated and service_role.

-- Defensive column alignment for optional legacy tables
ALTER TABLE public.home_visits ADD COLUMN IF NOT EXISTS conducted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.support_cases ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.support_interventions ADD COLUMN IF NOT EXISTS conducted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ====================================================================
-- 1. PURGE LINGERING BROAD PERMISSIVE RLS POLICIES
-- ====================================================================

-- 1.1 student_health_records
DROP POLICY IF EXISTS "Allow public read health records" ON public.student_health_records;
DROP POLICY IF EXISTS "Allow authenticated insert/update health records" ON public.student_health_records;
DROP POLICY IF EXISTS "Health viewable by all" ON public.student_health_records;
DROP POLICY IF EXISTS "Health viewable by assigned teacher or admin" ON public.student_health_records;
DROP POLICY IF EXISTS "Teachers modify health in class" ON public.student_health_records;
DROP POLICY IF EXISTS "Health select scope" ON public.student_health_records;
DROP POLICY IF EXISTS "Health manage scope" ON public.student_health_records;
DROP POLICY IF EXISTS "health_records_select_strict" ON public.student_health_records;
DROP POLICY IF EXISTS "health_records_manage_strict" ON public.student_health_records;

ALTER TABLE public.student_health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_records_select_strict" ON public.student_health_records
FOR SELECT
USING (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = student_health_records.class_id
        AND p.role = 'principal'
        AND c.school_id = p.school_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = student_health_records.class_id
        AND c.teacher_id = auth.uid()
    )
  )
);

CREATE POLICY "health_records_manage_strict" ON public.student_health_records
FOR ALL
USING (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = student_health_records.class_id
        AND p.role = 'principal'
        AND c.school_id = p.school_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = student_health_records.class_id
        AND c.teacher_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = student_health_records.class_id
        AND p.role = 'principal'
        AND c.school_id = p.school_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = student_health_records.class_id
        AND c.teacher_id = auth.uid()
    )
  )
);

-- 1.2 home_visits
DROP POLICY IF EXISTS "Allow read/write access to home_visits for authenticated users" ON public.home_visits;
DROP POLICY IF EXISTS "Authenticated users full access to home visits" ON public.home_visits;
DROP POLICY IF EXISTS "home_visits_scoped_access" ON public.home_visits;

ALTER TABLE public.home_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "home_visits_scoped_access" ON public.home_visits
FOR ALL
USING (
  auth.role() = 'authenticated' AND (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.classes c ON c.id = se.class_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE se.student_id = home_visits.student_id
        AND p.role = 'principal'
        AND c.school_id = p.school_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.classes c ON c.id = se.class_id
      WHERE se.student_id = home_visits.student_id
        AND c.teacher_id = auth.uid()
    )
    OR
    (home_visits.conducted_by IS NOT NULL AND home_visits.conducted_by = auth.uid())
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.classes c ON c.id = se.class_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE se.student_id = home_visits.student_id
        AND p.role = 'principal'
        AND c.school_id = p.school_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.classes c ON c.id = se.class_id
      WHERE se.student_id = home_visits.student_id
        AND c.teacher_id = auth.uid()
    )
    OR
    (home_visits.conducted_by IS NOT NULL AND home_visits.conducted_by = auth.uid())
  )
);

-- 1.3 parent_contacts
DROP POLICY IF EXISTS "Authenticated users full access to parent contacts" ON public.parent_contacts;
DROP POLICY IF EXISTS "parent_contacts_scoped_access" ON public.parent_contacts;

ALTER TABLE public.parent_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parent_contacts_scoped_access" ON public.parent_contacts
FOR ALL
USING (
  auth.role() = 'authenticated' AND (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.classes c ON c.id = se.class_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE se.student_id = parent_contacts.student_id
        AND p.role = 'principal'
        AND c.school_id = p.school_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.classes c ON c.id = se.class_id
      WHERE se.student_id = parent_contacts.student_id
        AND c.teacher_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.classes c ON c.id = se.class_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE se.student_id = parent_contacts.student_id
        AND p.role = 'principal'
        AND c.school_id = p.school_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.classes c ON c.id = se.class_id
      WHERE se.student_id = parent_contacts.student_id
        AND c.teacher_id = auth.uid()
    )
  )
);

-- 1.4 support_cases
DROP POLICY IF EXISTS "Authenticated users full access to support cases" ON public.support_cases;
DROP POLICY IF EXISTS "support_cases_scoped_access" ON public.support_cases;

ALTER TABLE public.support_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_cases_scoped_access" ON public.support_cases
FOR ALL
USING (
  auth.role() = 'authenticated' AND (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = support_cases.class_id
        AND p.role = 'principal'
        AND c.school_id = p.school_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = support_cases.class_id
        AND c.teacher_id = auth.uid()
    )
    OR
    (support_cases.teacher_id IS NOT NULL AND support_cases.teacher_id = auth.uid())
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = support_cases.class_id
        AND p.role = 'principal'
        AND c.school_id = p.school_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = support_cases.class_id
        AND c.teacher_id = auth.uid()
    )
    OR
    (support_cases.teacher_id IS NOT NULL AND support_cases.teacher_id = auth.uid())
  )
);

-- 1.5 support_interventions
DROP POLICY IF EXISTS "Authenticated users full access to support interventions" ON public.support_interventions;
DROP POLICY IF EXISTS "support_interventions_scoped_access" ON public.support_interventions;

ALTER TABLE public.support_interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_interventions_scoped_access" ON public.support_interventions
FOR ALL
USING (
  auth.role() = 'authenticated' AND (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.support_cases sc
      JOIN public.classes c ON c.id = sc.class_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE sc.id = support_interventions.case_id
        AND p.role = 'principal'
        AND c.school_id = p.school_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.support_cases sc
      JOIN public.classes c ON c.id = sc.class_id
      WHERE sc.id = support_interventions.case_id
        AND c.teacher_id = auth.uid()
    )
    OR
    (support_interventions.conducted_by IS NOT NULL AND support_interventions.conducted_by = auth.uid())
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM public.support_cases sc
      JOIN public.classes c ON c.id = sc.class_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE sc.id = support_interventions.case_id
        AND p.role = 'principal'
        AND c.school_id = p.school_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.support_cases sc
      JOIN public.classes c ON c.id = sc.class_id
      WHERE sc.id = support_interventions.case_id
        AND c.teacher_id = auth.uid()
    )
    OR
    (support_interventions.conducted_by IS NOT NULL AND support_interventions.conducted_by = auth.uid())
  )
);

-- 1.6 attendance_records: Drop broad monitor insertion policy from migration 018
DROP POLICY IF EXISTS "Monitors can insert attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_insert_scoped" ON public.attendance_records;

-- ====================================================================
-- 2. ATOMIC TRANSACTIONAL STUDENT MUTATION RPC
-- ====================================================================

CREATE OR REPLACE FUNCTION public.save_student_atomic(
    p_student JSONB,
    p_class_id UUID,
    p_academic_year_id UUID,
    p_health JSONB DEFAULT NULL,
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
    
    v_class_school_id TEXT;
    v_class_teacher_id UUID;
    v_class_year_id UUID;
    
    v_student_id UUID;
    v_student_id_number TEXT;
    v_enrollment_id UUID;
    v_existing_school_id TEXT;
    
    v_desk_number TEXT;
    v_room_number TEXT;
    v_enrollment_status TEXT;
BEGIN
    -- 1. Fail closed on unauthenticated caller
    IF auth.uid() IS NOT NULL THEN
        v_caller_id := auth.uid();
    ELSIF auth.role() = 'service_role' AND p_caller_id IS NOT NULL THEN
        v_caller_id := p_caller_id;
    ELSE
        RAISE EXCEPTION 'Unauthorized: Authentication required.' USING ERRCODE = '42501';
    END IF;

    -- 2. Resolve authoritative caller profile
    SELECT role, school_id INTO v_caller_role, v_caller_school_id
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'principal', 'teacher') THEN
        RAISE EXCEPTION 'Forbidden: Insufficient role privileges.' USING ERRCODE = '42501';
    END IF;

    -- 3. Resolve and validate target class
    SELECT school_id, teacher_id, academic_year_id
    INTO v_class_school_id, v_class_teacher_id, v_class_year_id
    FROM public.classes
    WHERE id = p_class_id;

    IF v_class_school_id IS NULL THEN
        RAISE EXCEPTION 'Class not found.' USING ERRCODE = '44000';
    END IF;

    -- Validate academic year matches if provided
    IF p_academic_year_id IS NOT NULL AND v_class_year_id IS NOT NULL AND p_academic_year_id <> v_class_year_id THEN
        RAISE EXCEPTION 'Academic year mismatch with assigned class.' USING ERRCODE = '44000';
    END IF;

    -- 4. Check caller class authorization
    IF v_caller_role = 'principal' THEN
        IF v_caller_school_id IS DISTINCT FROM v_class_school_id THEN
            RAISE EXCEPTION 'Forbidden: You cannot register or modify students outside your school institution.' USING ERRCODE = '42501';
        END IF;
    ELSIF v_caller_role = 'teacher' THEN
        IF v_class_teacher_id IS DISTINCT FROM v_caller_id THEN
            RAISE EXCEPTION 'Forbidden: You are not authorized to modify students for this class.' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- 5. Extract student identifiers
    v_student_id_number := NULLIF(TRIM(p_student->>'student_id_number'), '');
    IF p_student->>'id' IS NOT NULL AND LENGTH(p_student->>'id') >= 20 AND NOT (p_student->>'id' LIKE 'std-%') AND NOT (p_student->>'id' LIKE 'mock-%') THEN
        v_student_id := (p_student->>'id')::UUID;
    ELSE
        v_student_id := NULL;
    END IF;

    -- 6. Check student existence and ownership boundaries
    IF v_student_id IS NOT NULL THEN
        -- Verify existing student exists
        IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = v_student_id) THEN
            RAISE EXCEPTION 'Target student record not found.' USING ERRCODE = '44000';
        END IF;

        -- Verify caller has access to this target student
        IF v_caller_role = 'principal' THEN
            SELECT c.school_id INTO v_existing_school_id
            FROM public.student_enrollments se
            JOIN public.classes c ON c.id = se.class_id
            WHERE se.student_id = v_student_id
            LIMIT 1;

            IF v_existing_school_id IS NOT NULL AND v_existing_school_id IS DISTINCT FROM v_caller_school_id THEN
                RAISE EXCEPTION 'Forbidden: Target student belongs to another school institution.' USING ERRCODE = '42501';
            END IF;
        ELSIF v_caller_role = 'teacher' THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.student_enrollments se
                JOIN public.classes c ON c.id = se.class_id
                WHERE se.student_id = v_student_id
                  AND (c.teacher_id = v_caller_id OR c.id = p_class_id)
            ) THEN
                RAISE EXCEPTION 'Forbidden: You do not have permission to modify this student.' USING ERRCODE = '42501';
            END IF;
        END IF;

        -- Verify student_id_number uniqueness within school if changing student_id_number
        IF v_student_id_number IS NOT NULL THEN
            IF EXISTS (
                SELECT 1
                FROM public.students s
                JOIN public.student_enrollments se ON se.student_id = s.id
                JOIN public.classes c ON c.id = se.class_id
                WHERE s.student_id_number = v_student_id_number
                  AND s.id <> v_student_id
                  AND c.school_id = v_class_school_id
            ) THEN
                RAISE EXCEPTION 'Duplicate student ID number already exists within this school.' USING ERRCODE = '23505';
            END IF;
        END IF;

        -- Update existing student record
        UPDATE public.students
        SET
            full_name = COALESCE(p_student->>'full_name', full_name),
            student_id_number = COALESCE(v_student_id_number, student_id_number),
            gender = COALESCE(p_student->>'gender', gender),
            dob = CASE WHEN p_student ? 'dob' THEN NULLIF(p_student->>'dob', '')::DATE ELSE dob END,
            age = CASE WHEN p_student ? 'age' THEN (p_student->>'age')::INTEGER ELSE age END,
            status = COALESCE(p_student->>'status', status),
            enrollment_status = COALESCE(p_student->>'enrollment_status', enrollment_status),
            is_active = COALESCE((p_student->>'is_active')::BOOLEAN, is_active),
            scholarship = COALESCE(p_student->>'scholarship', scholarship),
            id_poor = COALESCE(p_student->>'id_poor', id_poor),
            orphan = COALESCE(p_student->>'orphan', orphan),
            distance_km = CASE WHEN p_student ? 'distance_km' THEN (p_student->>'distance_km')::NUMERIC ELSE distance_km END,
            weight_kg = CASE WHEN p_student ? 'weight_kg' THEN (p_student->>'weight_kg')::NUMERIC ELSE weight_kg END,
            height_m = CASE WHEN p_student ? 'height_m' THEN (p_student->>'height_m')::NUMERIC ELSE height_m END,
            bmi = CASE WHEN p_student ? 'bmi' THEN (p_student->>'bmi')::NUMERIC ELSE bmi END,
            nutrition_status = COALESCE(p_student->>'nutrition_status', nutrition_status),
            disability = COALESCE(p_student->>'disability', disability),
            assistive_device = CASE WHEN p_student ? 'assistive_device' THEN p_student->>'assistive_device' ELSE assistive_device END,
            health_note = CASE WHEN p_student ? 'health_note' THEN p_student->>'health_note' ELSE health_note END,
            father_name = CASE WHEN p_student ? 'father_name' THEN p_student->>'father_name' ELSE father_name END,
            father_job = CASE WHEN p_student ? 'father_job' THEN p_student->>'father_job' ELSE father_job END,
            father_phone = CASE WHEN p_student ? 'father_phone' THEN p_student->>'father_phone' ELSE father_phone END,
            mother_name = CASE WHEN p_student ? 'mother_name' THEN p_student->>'mother_name' ELSE mother_name END,
            mother_job = CASE WHEN p_student ? 'mother_job' THEN p_student->>'mother_job' ELSE mother_job END,
            mother_phone = CASE WHEN p_student ? 'mother_phone' THEN p_student->>'mother_phone' ELSE mother_phone END,
            parent_phone = CASE WHEN p_student ? 'parent_phone' THEN p_student->>'parent_phone' ELSE parent_phone END,
            guardian_name = CASE WHEN p_student ? 'guardian_name' THEN p_student->>'guardian_name' ELSE guardian_name END,
            guardian_job = CASE WHEN p_student ? 'guardian_job' THEN p_student->>'guardian_job' ELSE guardian_job END,
            guardian_phone = CASE WHEN p_student ? 'guardian_phone' THEN p_student->>'guardian_phone' ELSE guardian_phone END,
            birth_cert_no = CASE WHEN p_student ? 'birth_cert_no' THEN p_student->>'birth_cert_no' ELSE birth_cert_no END,
            current_address = CASE WHEN p_student ? 'current_address' THEN p_student->>'current_address' ELSE current_address END,
            siblings_count = CASE WHEN p_student ? 'siblings_count' THEN (p_student->>'siblings_count')::INTEGER ELSE siblings_count END,
            income = CASE WHEN p_student ? 'income' THEN (p_student->>'income')::NUMERIC ELSE income END,
            migrant_status = CASE WHEN p_student ? 'migrant_status' THEN p_student->>'migrant_status' ELSE migrant_status END,
            updated_at = NOW()
        WHERE id = v_student_id;
    ELSE
        -- Creating new student or matching by student_id_number
        IF v_student_id_number IS NOT NULL THEN
            -- Check if exists in another school
            SELECT c.school_id, s.id INTO v_existing_school_id, v_student_id
            FROM public.students s
            JOIN public.student_enrollments se ON se.student_id = s.id
            JOIN public.classes c ON c.id = se.class_id
            WHERE s.student_id_number = v_student_id_number
            LIMIT 1;

            IF v_existing_school_id IS NOT NULL AND v_existing_school_id IS DISTINCT FROM v_class_school_id THEN
                RAISE EXCEPTION 'Student ID number is already registered at another school institution.' USING ERRCODE = '23505';
            END IF;
        END IF;

        IF v_student_id IS NOT NULL THEN
            -- Student already exists in this school: check caller permission before update
            IF v_caller_role = 'teacher' THEN
                IF NOT EXISTS (
                    SELECT 1 FROM public.student_enrollments se
                    JOIN public.classes c ON c.id = se.class_id
                    WHERE se.student_id = v_student_id
                      AND (c.teacher_id = v_caller_id OR c.id = p_class_id)
                ) THEN
                    RAISE EXCEPTION 'Forbidden: You do not have permission to modify this existing student.' USING ERRCODE = '42501';
                END IF;
            END IF;

            -- Update existing student record
            UPDATE public.students
            SET
                full_name = COALESCE(p_student->>'full_name', full_name),
                gender = COALESCE(p_student->>'gender', gender),
                dob = CASE WHEN p_student ? 'dob' THEN NULLIF(p_student->>'dob', '')::DATE ELSE dob END,
                age = CASE WHEN p_student ? 'age' THEN (p_student->>'age')::INTEGER ELSE age END,
                status = COALESCE(p_student->>'status', status),
                enrollment_status = COALESCE(p_student->>'enrollment_status', enrollment_status),
                is_active = COALESCE((p_student->>'is_active')::BOOLEAN, is_active),
                scholarship = COALESCE(p_student->>'scholarship', scholarship),
                id_poor = COALESCE(p_student->>'id_poor', id_poor),
                orphan = COALESCE(p_student->>'orphan', orphan),
                father_name = CASE WHEN p_student ? 'father_name' THEN p_student->>'father_name' ELSE father_name END,
                mother_name = CASE WHEN p_student ? 'mother_name' THEN p_student->>'mother_name' ELSE mother_name END,
                parent_phone = CASE WHEN p_student ? 'parent_phone' THEN p_student->>'parent_phone' ELSE parent_phone END,
                current_address = CASE WHEN p_student ? 'current_address' THEN p_student->>'current_address' ELSE current_address END,
                updated_at = NOW()
            WHERE id = v_student_id;
        ELSE
            -- Insert brand new student record
            INSERT INTO public.students (
                id,
                full_name,
                student_id_number,
                gender,
                dob,
                age,
                status,
                enrollment_status,
                is_active,
                scholarship,
                id_poor,
                orphan,
                distance_km,
                weight_kg,
                height_m,
                bmi,
                nutrition_status,
                disability,
                assistive_device,
                health_note,
                father_name,
                father_job,
                father_phone,
                mother_name,
                mother_job,
                mother_phone,
                parent_phone,
                guardian_name,
                guardian_job,
                guardian_phone,
                birth_cert_no,
                current_address,
                siblings_count,
                income,
                migrant_status,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                COALESCE(p_student->>'full_name', 'មិនមានឈ្មោះ'),
                COALESCE(v_student_id_number, 'ID-' || LPAD((FLOOR(RANDOM() * 900000 + 100000))::TEXT, 6, '0')),
                COALESCE(p_student->>'gender', 'M'),
                NULLIF(p_student->>'dob', '')::DATE,
                (p_student->>'age')::INTEGER,
                COALESCE(p_student->>'status', 'new'),
                COALESCE(p_student->>'enrollment_status', 'active'),
                COALESCE((p_student->>'is_active')::BOOLEAN, TRUE),
                COALESCE(p_student->>'scholarship', 'no'),
                COALESCE(p_student->>'id_poor', 'none'),
                COALESCE(p_student->>'orphan', 'no'),
                (p_student->>'distance_km')::NUMERIC,
                (p_student->>'weight_kg')::NUMERIC,
                (p_student->>'height_m')::NUMERIC,
                (p_student->>'bmi')::NUMERIC,
                p_student->>'nutrition_status',
                COALESCE(p_student->>'disability', 'none'),
                p_student->>'assistive_device',
                p_student->>'health_note',
                p_student->>'father_name',
                p_student->>'father_job',
                p_student->>'father_phone',
                p_student->>'mother_name',
                p_student->>'mother_job',
                p_student->>'mother_phone',
                p_student->>'parent_phone',
                p_student->>'guardian_name',
                p_student->>'guardian_job',
                p_student->>'guardian_phone',
                p_student->>'birth_cert_no',
                p_student->>'current_address',
                COALESCE((p_student->>'siblings_count')::INTEGER, 0),
                (p_student->>'income')::NUMERIC,
                p_student->>'migrant_status',
                NOW(),
                NOW()
            )
            RETURNING id INTO v_student_id;
        END IF;
    END IF;

    -- 7. Upsert student enrollment atomically
    v_desk_number := NULLIF(TRIM(p_student->>'desk_number'), '');
    v_room_number := NULLIF(TRIM(p_student->>'room_number'), '');
    v_enrollment_status := COALESCE(p_student->>'enrollment_status', 'active');

    INSERT INTO public.student_enrollments (
        student_id,
        class_id,
        academic_year_id,
        desk_number,
        room_number,
        enrollment_status,
        created_at,
        updated_at
    ) VALUES (
        v_student_id,
        p_class_id,
        COALESCE(p_academic_year_id, v_class_year_id),
        v_desk_number,
        v_room_number,
        v_enrollment_status,
        NOW(),
        NOW()
    )
    ON CONFLICT (student_id, academic_year_id)
    DO UPDATE SET
        class_id = EXCLUDED.class_id,
        desk_number = COALESCE(EXCLUDED.desk_number, student_enrollments.desk_number),
        room_number = COALESCE(EXCLUDED.room_number, student_enrollments.room_number),
        enrollment_status = EXCLUDED.enrollment_status,
        updated_at = NOW()
    RETURNING id INTO v_enrollment_id;

    -- 8. Upsert health screening records atomically if provided
    IF p_health IS NOT NULL AND jsonb_typeof(p_health) = 'object' THEN
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
            notes,
            created_at
        ) VALUES (
            v_student_id,
            p_class_id,
            COALESCE(p_academic_year_id, v_class_year_id),
            COALESCE(NULLIF(p_health->>'recorded_date', '')::DATE, CURRENT_DATE),
            (p_health->>'weight_kg')::NUMERIC,
            (p_health->>'height_cm')::NUMERIC,
            (p_health->>'bmi')::NUMERIC,
            p_health->>'vision_left',
            p_health->>'vision_right',
            p_health->>'hearing',
            p_health->>'dental',
            p_health->>'notes',
            NOW()
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
    END IF;

    -- 9. Return structured success
    RETURN jsonb_build_object(
        'success', TRUE,
        'student_id', v_student_id,
        'enrollment_id', v_enrollment_id
    );
END;
$$;

-- Security Definer privileges
REVOKE ALL ON FUNCTION public.save_student_atomic(JSONB, UUID, UUID, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_student_atomic(JSONB, UUID, UUID, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_student_atomic(JSONB, UUID, UUID, JSONB, UUID) TO service_role;
