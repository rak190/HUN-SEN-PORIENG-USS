-- Migration 070: Align Students DOB, Audit Logs Schema, Activity Logs Table, and Service Role RPCs
BEGIN;

-- ============================================================================
-- 1. ALIGN STUDENTS DOB & DATE_OF_BIRTH (BIDIRECTIONAL SYNC)
-- ============================================================================

-- Add date_of_birth column if it does not already exist
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Initial backfill in both directions
UPDATE public.students 
SET date_of_birth = dob 
WHERE date_of_birth IS NULL AND dob IS NOT NULL;

UPDATE public.students 
SET dob = date_of_birth 
WHERE dob IS NULL AND date_of_birth IS NOT NULL;

-- Create sync trigger function to guarantee zero drift regardless of which column is targeted
CREATE OR REPLACE FUNCTION public.sync_student_dob_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.dob IS NOT NULL AND NEW.date_of_birth IS NULL THEN
        NEW.date_of_birth := NEW.dob;
    ELSIF NEW.date_of_birth IS NOT NULL AND NEW.dob IS NULL THEN
        NEW.dob := NEW.date_of_birth;
    ELSIF TG_OP = 'UPDATE' AND NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth AND NEW.date_of_birth IS NOT NULL THEN
        NEW.dob := NEW.date_of_birth;
    ELSIF TG_OP = 'UPDATE' AND NEW.dob IS DISTINCT FROM OLD.dob AND NEW.dob IS NOT NULL THEN
        NEW.date_of_birth := NEW.dob;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_student_dob_columns ON public.students;
CREATE TRIGGER trg_sync_student_dob_columns
BEFORE INSERT OR UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.sync_student_dob_columns();

-- Ensure active_class_rosters view exposes both columns cleanly
DROP VIEW IF EXISTS public.active_class_rosters CASCADE;
CREATE OR REPLACE VIEW public.active_class_rosters WITH (security_invoker = true) AS
SELECT 
    e.class_id AS enrollment_class_id, 
    c.name AS class_name, 
    c.academic_year_id,
    c.teacher_id,
    e.enrollment_status AS current_enrollment_status,
    e.desk_number,
    e.room_number,
    s.*
FROM public.student_enrollments e
JOIN public.classes c ON c.id = e.class_id
JOIN public.students s ON s.id = e.student_id
WHERE s.is_active = true 
  AND (e.enrollment_status = 'active' OR e.enrollment_status = 'enrolled' OR e.enrollment_status IS NULL);

-- ============================================================================
-- 2. EXTEND AUDIT_LOGS SCHEMA & ADD POSTGREST PROFILE RELATIONSHIP
-- ============================================================================

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_table TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS record_id UUID;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';

-- Foreign key constraint to public.profiles for PostgREST joins
DO $$
BEGIN
    UPDATE public.audit_logs 
    SET user_id = NULL 
    WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.profiles);

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_audit_logs_profiles'
    ) THEN
        ALTER TABLE public.audit_logs 
        ADD CONSTRAINT fk_audit_logs_profiles 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- 3. CREATE ACTIVITY_LOGS TABLE WITH FULL RLS POLICIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    activity_type TEXT NOT NULL DEFAULT 'other',
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    school_id TEXT REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Activity logs viewable by class teachers and admins" ON public.activity_logs;
CREATE POLICY "Activity logs viewable by class teachers and admins" ON public.activity_logs
FOR SELECT USING (
    is_admin() 
    OR (is_principal() AND (school_id = user_school_id() OR class_id IN (SELECT id FROM public.classes WHERE school_id = user_school_id())))
    OR (created_by = auth.uid())
    OR (class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid()))
);

DROP POLICY IF EXISTS "Activity logs insertable by teachers and admins" ON public.activity_logs;
CREATE POLICY "Activity logs insertable by teachers and admins" ON public.activity_logs
FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND (
        is_admin_or_principal() 
        OR created_by = auth.uid()
        OR (class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid()))
    )
);

DROP POLICY IF EXISTS "Activity logs deletable by creator or admin" ON public.activity_logs;
CREATE POLICY "Activity logs deletable by creator or admin" ON public.activity_logs
FOR DELETE USING (
    is_admin() OR created_by = auth.uid()
);

-- ============================================================================
-- 4. HARDEN PROMOTE_STUDENTS & MIGRATE_ACADEMIC_YEAR (SERVICE ROLE SUPPORT)
-- ============================================================================

-- Drop previous overloaded signatures
DROP FUNCTION IF EXISTS public.promote_students(UUID, UUID, UUID[]);
DROP FUNCTION IF EXISTS public.promote_students(UUID, UUID, UUID[], UUID);

CREATE OR REPLACE FUNCTION public.promote_students(
    p_source_class_id UUID,
    p_target_class_id UUID,
    p_eligible_student_ids UUID[],
    p_caller_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    promoted_count INT := 0;
    actual_uid UUID;
    caller_school_id TEXT;
    caller_role TEXT;
    is_authorized BOOLEAN := false;
    source_school_id TEXT;
    target_school_id TEXT;
    source_year_id UUID;
    target_year_id UUID;
    v_target_year_status TEXT;
BEGIN
    -- Context resolution: service role vs user session
    IF auth.role() = 'service_role' THEN
        actual_uid := COALESCE(p_caller_id, auth.uid());
        IF actual_uid IS NOT NULL THEN
            SELECT role, school_id INTO caller_role, caller_school_id 
            FROM public.profiles WHERE id = actual_uid;
        ELSE
            caller_role := 'admin';
            caller_school_id := NULL;
        END IF;
        is_authorized := true;
    ELSE
        actual_uid := auth.uid();
        IF actual_uid IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: You must be logged in to promote students.' USING ERRCODE = '42501';
        END IF;

        SELECT role, school_id INTO caller_role, caller_school_id 
        FROM public.profiles WHERE id = actual_uid;

        IF caller_role IS NULL OR caller_role NOT IN ('admin', 'principal') THEN
            RAISE EXCEPTION 'Forbidden: Only administrators or principals can perform promotions.' USING ERRCODE = '42501';
        END IF;
        is_authorized := true;
    END IF;

    IF p_source_class_id = p_target_class_id THEN
        RAISE EXCEPTION 'Source and target classes cannot be the same.' USING ERRCODE = '22023';
    END IF;

    IF p_eligible_student_ids IS NULL OR array_length(p_eligible_student_ids, 1) IS NULL OR array_length(p_eligible_student_ids, 1) = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'No eligible students selected for promotion',
            'promoted_count', 0
        );
    END IF;

    -- Validate class institutions
    SELECT school_id, academic_year_id INTO source_school_id, source_year_id FROM public.classes WHERE id = p_source_class_id;
    SELECT school_id, academic_year_id INTO target_school_id, target_year_id FROM public.classes WHERE id = p_target_class_id;

    IF source_school_id IS DISTINCT FROM target_school_id THEN
        RAISE EXCEPTION 'Forbidden: Cannot promote students across different schools.' USING ERRCODE = '42501';
    END IF;

    -- If caller is principal, verify school scoping
    IF caller_role = 'principal' AND caller_school_id IS NOT NULL AND source_school_id IS DISTINCT FROM caller_school_id THEN
        RAISE EXCEPTION 'Forbidden: You cannot promote students outside your school institution.' USING ERRCODE = '42501';
    END IF;

    -- Ensure target academic year is not locked/archived
    IF target_year_id IS NOT NULL THEN
        SELECT status INTO v_target_year_status FROM public.academic_years WHERE id = target_year_id;
        IF v_target_year_status IN ('closed', 'archived') THEN
            RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សាគោលដៅត្រូវបានបិទបញ្ចប់រួចហើយ (Target academic year is locked)' USING ERRCODE = '55000';
        END IF;
    END IF;

    -- Update source enrollments
    IF source_year_id IS NOT NULL THEN
        UPDATE public.student_enrollments
        SET year_result = 'promoted', updated_at = NOW()
        WHERE class_id = p_source_class_id 
          AND academic_year_id = source_year_id 
          AND student_id = ANY(p_eligible_student_ids);
    END IF;

    -- Insert or update target enrollments
    IF target_year_id IS NOT NULL THEN
        INSERT INTO public.student_enrollments (student_id, class_id, academic_year_id, enrollment_status, year_result, updated_at)
        SELECT e.student_id, p_target_class_id, target_year_id, 'active', 'enrolled', NOW()
        FROM public.student_enrollments e 
        WHERE e.class_id = p_source_class_id 
          AND e.student_id = ANY(p_eligible_student_ids)
          AND e.academic_year_id = source_year_id
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET 
            class_id = EXCLUDED.class_id,
            enrollment_status = 'active',
            year_result = 'enrolled',
            updated_at = NOW();
    END IF;

    -- Ensure students remain active
    UPDATE public.students SET is_active = true WHERE id = ANY(p_eligible_student_ids);

    SELECT array_length(p_eligible_student_ids, 1) INTO promoted_count;

    -- Audit log
    INSERT INTO public.audit_logs (user_id, action, target_table, record_id, details, school_id)
    VALUES (
        actual_uid,
        'promote_students',
        'student_enrollments',
        p_target_class_id,
        jsonb_build_object(
            'source_class_id', p_source_class_id,
            'target_class_id', p_target_class_id,
            'promoted_count', COALESCE(promoted_count, 0)
        ),
        target_school_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Students promoted successfully',
        'promoted_count', COALESCE(promoted_count, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Drop previous signatures of migrate_academic_year
DROP FUNCTION IF EXISTS public.migrate_academic_year(UUID, UUID);
DROP FUNCTION IF EXISTS public.migrate_academic_year(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION public.migrate_academic_year(
    p_source_year_id UUID,
    p_target_year_id UUID,
    p_caller_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    inserted_count INT := 0;
    actual_uid UUID;
    caller_school_id TEXT;
    caller_role TEXT;
    is_authorized BOOLEAN := false;
    v_source_status TEXT;
    v_target_status TEXT;
BEGIN
    -- Context resolution: service role vs user session
    IF auth.role() = 'service_role' THEN
        actual_uid := COALESCE(p_caller_id, auth.uid());
        IF actual_uid IS NOT NULL THEN
            SELECT role, school_id INTO caller_role, caller_school_id 
            FROM public.profiles WHERE id = actual_uid;
        ELSE
            caller_role := 'admin';
            caller_school_id := NULL;
        END IF;
        is_authorized := true;
    ELSE
        actual_uid := auth.uid();
        IF actual_uid IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: You must be logged in to migrate academic years.' USING ERRCODE = '42501';
        END IF;

        SELECT role, school_id INTO caller_role, caller_school_id 
        FROM public.profiles WHERE id = actual_uid;

        IF caller_role IS NULL OR caller_role NOT IN ('admin', 'principal') THEN
            RAISE EXCEPTION 'Forbidden: Only administrators or principals can migrate academic years.' USING ERRCODE = '42501';
        END IF;
        is_authorized := true;
    END IF;

    IF p_source_year_id = p_target_year_id THEN
        RAISE EXCEPTION 'Source and Target Academic Years cannot be identical.' USING ERRCODE = '22023';
    END IF;

    -- Validate target year is open/active
    SELECT status INTO v_target_status FROM public.academic_years WHERE id = p_target_year_id;
    IF v_target_status IN ('closed', 'archived') THEN
        RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សាគោលដៅត្រូវបានបិទបញ្ចប់រួចហើយ' USING ERRCODE = '55000';
    END IF;

    WITH inserted AS (
        INSERT INTO public.classes (school_id, teacher_id, name, grade, shift, room_number, track, academic_year_id)
        SELECT 
            c.school_id, 
            NULL, -- Reset assigned teachers for the new academic cycle
            c.name, 
            c.grade, 
            COALESCE(c.shift, CASE WHEN c.grade IN ('10', '11', '12') THEN 'ព្រឹក' ELSE 'រសៀល' END), 
            c.room_number, 
            COALESCE(c.track, 'ទូទៅ'), 
            p_target_year_id
        FROM public.classes c
        WHERE c.academic_year_id = p_source_year_id
        AND (caller_role = 'admin' OR c.school_id = caller_school_id)
        AND NOT EXISTS (
            SELECT 1 FROM public.classes t 
            WHERE t.academic_year_id = p_target_year_id 
            AND LOWER(TRIM(t.name)) = LOWER(TRIM(c.name))
            AND t.school_id = c.school_id
        )
        RETURNING id
    )
    SELECT count(*) INTO inserted_count FROM inserted;

    -- Audit log
    INSERT INTO public.audit_logs (user_id, action, target_table, record_id, details, school_id)
    VALUES (
        actual_uid,
        'migrate_academic_year',
        'classes',
        p_target_year_id,
        jsonb_build_object(
            'source_year_id', p_source_year_id,
            'target_year_id', p_target_year_id,
            'classes_migrated', inserted_count
        ),
        caller_school_id
    );

    RETURN jsonb_build_object(
        'success', true, 
        'count', inserted_count, 
        'message', CASE 
            WHEN inserted_count = 0 THEN 'ថ្នាក់រៀនទាំងអស់មានរួចហើយនៅក្នុងឆ្នាំសិក្សាគោលដៅ។'
            ELSE 'បានចម្លងរចនាសម្ព័ន្ធថ្នាក់រៀនចំនួន ' || inserted_count || ' ថ្នាក់ទៅឆ្នាំថ្មីជោគជ័យ!'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
