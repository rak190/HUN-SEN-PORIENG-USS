-- ====================================================================
-- COMBINED REMEDIATION MIGRATIONS 070 TO 073 FOR SUPABASE
-- ====================================================================

-- >>> FILE: 070_align_students_and_audit_schema.sql
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


-- >>> FILE: 071_harden_security_and_caller_contracts.sql
-- Migration 071: Harden Security & Caller Contracts for Service Role RPCs and Score Publishing
BEGIN;

-- ============================================================================
-- 1. HARDEN PROMOTE_STUDENTS (DELIBERATE CALLER CONTRACT)
-- ============================================================================

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
    source_school_id TEXT;
    target_school_id TEXT;
    source_year_id UUID;
    target_year_id UUID;
    v_target_year_status TEXT;
BEGIN
    -- 1. Resolve & Authenticate Caller Identity
    IF auth.role() = 'service_role' THEN
        IF p_caller_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: Caller identity required for service role execution.' USING ERRCODE = '42501';
        END IF;
        actual_uid := p_caller_id;
    ELSE
        actual_uid := auth.uid();
        IF actual_uid IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: You must be logged in to promote students.' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- 2. Independent Role & Profile Verification (Never trust caller ID alone)
    SELECT role, school_id INTO caller_role, caller_school_id 
    FROM public.profiles WHERE id = actual_uid;

    IF caller_role IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller profile not found in system.' USING ERRCODE = '42501';
    END IF;

    IF caller_role NOT IN ('admin', 'principal') THEN
        RAISE EXCEPTION 'Forbidden: Only administrators or principals can perform promotions.' USING ERRCODE = '42501';
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

    -- 3. Institutional School Boundary Verification
    SELECT school_id, academic_year_id INTO source_school_id, source_year_id FROM public.classes WHERE id = p_source_class_id;
    SELECT school_id, academic_year_id INTO target_school_id, target_year_id FROM public.classes WHERE id = p_target_class_id;

    IF source_school_id IS DISTINCT FROM target_school_id THEN
        RAISE EXCEPTION 'Forbidden: Cannot promote students across different schools.' USING ERRCODE = '42501';
    END IF;

    IF caller_role = 'principal' AND (caller_school_id IS NULL OR source_school_id IS DISTINCT FROM caller_school_id) THEN
        RAISE EXCEPTION 'Forbidden: You cannot promote students outside your school institution.' USING ERRCODE = '42501';
    END IF;

    -- 4. Target Academic Year Lifecycle Check
    IF target_year_id IS NOT NULL THEN
        SELECT status INTO v_target_year_status FROM public.academic_years WHERE id = target_year_id;
        IF v_target_year_status IN ('closed', 'archived') THEN
            RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សាគោលដៅត្រូវបានបិទបញ្ចប់រួចហើយ (Target academic year is locked)' USING ERRCODE = '55000';
        END IF;
    END IF;

    -- 5. Atomic Execution
    IF source_year_id IS NOT NULL THEN
        UPDATE public.student_enrollments
        SET year_result = 'promoted', updated_at = NOW()
        WHERE class_id = p_source_class_id 
          AND academic_year_id = source_year_id 
          AND student_id = ANY(p_eligible_student_ids);
    END IF;

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

    UPDATE public.students SET is_active = true WHERE id = ANY(p_eligible_student_ids);
    SELECT array_length(p_eligible_student_ids, 1) INTO promoted_count;

    -- 6. Audit Logging
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


-- ============================================================================
-- 2. HARDEN MIGRATE_ACADEMIC_YEAR (DELIBERATE CALLER CONTRACT)
-- ============================================================================

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
    v_source_status TEXT;
    v_target_status TEXT;
BEGIN
    -- 1. Resolve & Authenticate Caller Identity
    IF auth.role() = 'service_role' THEN
        IF p_caller_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: Caller identity required for service role execution.' USING ERRCODE = '42501';
        END IF;
        actual_uid := p_caller_id;
    ELSE
        actual_uid := auth.uid();
        IF actual_uid IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: You must be logged in to migrate academic years.' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- 2. Independent Role Verification
    SELECT role, school_id INTO caller_role, caller_school_id 
    FROM public.profiles WHERE id = actual_uid;

    IF caller_role IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller profile not found in system.' USING ERRCODE = '42501';
    END IF;

    IF caller_role NOT IN ('admin', 'principal') THEN
        RAISE EXCEPTION 'Forbidden: Only administrators or principals can migrate academic years.' USING ERRCODE = '42501';
    END IF;

    IF p_source_year_id = p_target_year_id THEN
        RAISE EXCEPTION 'Source and Target Academic Years cannot be identical.' USING ERRCODE = '22023';
    END IF;

    -- 3. Academic Year Lifecycle Checks
    SELECT status INTO v_target_status FROM public.academic_years WHERE id = p_target_year_id;
    IF v_target_status IS NULL THEN
        RAISE EXCEPTION 'Target academic year not found.' USING ERRCODE = 'P0002';
    END IF;
    IF v_target_status IN ('closed', 'archived') THEN
        RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សាគោលដៅត្រូវបានបិទបញ្ចប់រួចហើយ' USING ERRCODE = '55000';
    END IF;

    -- 4. Atomic Class Migration
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

    -- 5. Audit Logging
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


-- ============================================================================
-- 3. ATOMIC SCORE PUBLISHING RPC (PUBLISH_SCORES_ATOMIC)
-- ============================================================================

DROP FUNCTION IF EXISTS public.publish_scores_atomic(TEXT, UUID);
DROP FUNCTION IF EXISTS public.publish_scores_atomic(TEXT, UUID, UUID);

CREATE OR REPLACE FUNCTION public.publish_scores_atomic(
    p_period TEXT,
    p_academic_year_id UUID,
    p_caller_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    actual_uid UUID;
    caller_role TEXT;
    caller_school_id TEXT;
    v_year_status TEXT;
    v_year_school_id TEXT;
    v_published_count INT := 0;
BEGIN
    -- 1. Caller Authentication
    IF auth.role() = 'service_role' THEN
        IF p_caller_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: Caller identity required for service role execution.' USING ERRCODE = '42501';
        END IF;
        actual_uid := p_caller_id;
    ELSE
        actual_uid := auth.uid();
        IF actual_uid IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: You must be logged in to publish scores.' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- 2. Independent Role Verification
    SELECT role, school_id INTO caller_role, caller_school_id 
    FROM public.profiles WHERE id = actual_uid;

    IF caller_role IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller profile not found.' USING ERRCODE = '42501';
    END IF;

    IF caller_role NOT IN ('admin', 'principal') THEN
        RAISE EXCEPTION 'Forbidden: Only administrators or principals can publish scores.' USING ERRCODE = '42501';
    END IF;

    -- 3. Academic Year Status & School Verification
    SELECT status, school_id INTO v_year_status, v_year_school_id 
    FROM public.academic_years WHERE id = p_academic_year_id;

    IF v_year_status IS NULL THEN
        RAISE EXCEPTION 'Academic year not found.' USING ERRCODE = 'P0002';
    END IF;

    IF v_year_status IN ('closed', 'archived') THEN
        RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សានេះត្រូវបានបិទបញ្ចប់រួចហើយ (Academic year is locked)' USING ERRCODE = '55000';
    END IF;

    IF caller_role = 'principal' AND (caller_school_id IS NULL OR v_year_school_id IS DISTINCT FROM caller_school_id) THEN
        RAISE EXCEPTION 'Forbidden: Cannot publish scores for another school institution.' USING ERRCODE = '42501';
    END IF;

    -- 4. Atomic State Transition (Draft -> Published)
    UPDATE public.grades
    SET status = 'published', updated_at = NOW()
    WHERE period = p_period 
      AND academic_year_id = p_academic_year_id 
      AND status = 'draft'
      AND (caller_role = 'admin' OR class_id IN (SELECT id FROM public.classes WHERE school_id = caller_school_id));

    GET DIAGNOSTICS v_published_count = ROW_COUNT;

    -- 5. Audit Logging
    INSERT INTO public.audit_logs (user_id, action, target_table, record_id, details, school_id)
    VALUES (
        actual_uid,
        'publish_scores',
        'grades',
        p_academic_year_id,
        jsonb_build_object(
            'period', p_period,
            'academic_year_id', p_academic_year_id,
            'published_count', v_published_count
        ),
        caller_school_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'published_count', v_published_count,
        'message', 'បានប្រកាសផ្សាយពិន្ទុជាផ្លូវការចំនួន ' || v_published_count || ' កំណត់ត្រា'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;


-- >>> FILE: 072_repair_active_views_and_health_rpc.sql
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


-- >>> FILE: 073_create_giep_notes_and_monitor_assignment.sql
-- Migration 073: Create GIEP Notes Table, Migrate Legacy Notes, and Add Monitor Assignment to Classes
-- Description: Establishes public.giep_notes with strict RLS, migrates legacy records from documents,
-- and adds monitor_id to public.classes to support explicit class monitor authorization.

-- ====================================================================
-- 1. ADD MONITOR ASSIGNMENT TO CLASSES
-- ====================================================================

ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS monitor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_classes_monitor_id ON public.classes(monitor_id);

-- ====================================================================
-- 2. CREATE GIEP NOTES TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.giep_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    school_id TEXT NOT NULL DEFAULT 'main-school',
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    activity_name TEXT NOT NULL,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    participants TEXT,
    outcome TEXT,
    status TEXT NOT NULL DEFAULT 'approved',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_giep_notes_class_id ON public.giep_notes(class_id);
CREATE INDEX IF NOT EXISTS idx_giep_notes_school_id ON public.giep_notes(school_id);
CREATE INDEX IF NOT EXISTS idx_giep_notes_created_at ON public.giep_notes(created_at);

-- ====================================================================
-- 3. DATA MIGRATION: BACKFILL FROM DOCUMENTS
-- ====================================================================

INSERT INTO public.giep_notes (
    id,
    class_id,
    school_id,
    created_by,
    activity_name,
    activity_date,
    participants,
    outcome,
    status,
    created_at
)
SELECT
    d.id,
    d.class_id,
    COALESCE(c.school_id, 'main-school'),
    d.uploader_id,
    d.title,
    COALESCE(d.created_at::DATE, CURRENT_DATE),
    d.size,
    d.file_url,
    COALESCE(d.status, 'approved'),
    COALESCE(d.created_at, NOW())
FROM public.documents d
LEFT JOIN public.classes c ON c.id = d.class_id
WHERE (d.category IN ('geip', 'giep') OR d.type = 'activity_log')
  AND d.class_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 4. ROW LEVEL SECURITY (RLS) FOR GIEP NOTES
-- ====================================================================

ALTER TABLE public.giep_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "giep_notes_select_policy" ON public.giep_notes;
CREATE POLICY "giep_notes_select_policy" ON public.giep_notes
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR
  EXISTS (
    SELECT 1 FROM public.classes c 
    WHERE c.id = giep_notes.class_id 
    AND (
      c.teacher_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'principal' 
        AND p.school_id = c.school_id
      )
    )
  )
);

DROP POLICY IF EXISTS "giep_notes_insert_policy" ON public.giep_notes;
CREATE POLICY "giep_notes_insert_policy" ON public.giep_notes
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR
  EXISTS (
    SELECT 1 FROM public.classes c 
    WHERE c.id = giep_notes.class_id 
    AND (
      c.teacher_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'principal' 
        AND p.school_id = c.school_id
      )
    )
  )
);

DROP POLICY IF EXISTS "giep_notes_update_policy" ON public.giep_notes;
CREATE POLICY "giep_notes_update_policy" ON public.giep_notes
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.classes c 
    WHERE c.id = giep_notes.class_id 
    AND (
      c.teacher_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'principal' 
        AND p.school_id = c.school_id
      )
    )
  )
);

DROP POLICY IF EXISTS "giep_notes_delete_policy" ON public.giep_notes;
CREATE POLICY "giep_notes_delete_policy" ON public.giep_notes
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR created_by = auth.uid()
);


