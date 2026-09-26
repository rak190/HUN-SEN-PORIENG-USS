-- 1. Add status column with check constraint
ALTER TABLE public.academic_years 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'planned' 
CHECK (status IN ('planned', 'active', 'closed', 'archived'));

-- 2. Backfill existing records
UPDATE public.academic_years 
SET status = CASE 
    WHEN is_active = true THEN 'active' 
    ELSE 'closed' 
END
WHERE status IS NULL OR status = 'planned';

-- 3. Maintain backward compatibility for is_active
CREATE OR REPLACE FUNCTION public.sync_academic_year_is_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.is_active := (NEW.status = 'active');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_academic_year_is_active ON public.academic_years;
CREATE TRIGGER trg_sync_academic_year_is_active
BEFORE INSERT OR UPDATE ON public.academic_years
FOR EACH ROW EXECUTE FUNCTION public.sync_academic_year_is_active();

-- 4. Unique Partial Index: Exactly one active academic year allowed
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_academic_year 
ON public.academic_years (status) 
WHERE status = 'active';

-- 5. Lock function for Data integrity
CREATE OR REPLACE FUNCTION public.check_academic_year_lock()
RETURNS TRIGGER AS $$
DECLARE
    v_year_id UUID;
    v_year_status TEXT;
BEGIN
    -- Identify target academic_year_id based on table
    v_year_id := COALESCE(NEW.academic_year_id, OLD.academic_year_id);

    IF v_year_id IS NOT NULL THEN
        SELECT status INTO v_year_status 
        FROM public.academic_years 
        WHERE id = v_year_id;

        IF v_year_status IN ('closed', 'archived') THEN
            RAISE EXCEPTION 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សានេះត្រូវបានបិទបញ្ចប់ និងចាក់សោទិន្នន័យរួចហើយ (Academic year is locked)'
            USING ERRCODE = '55000';
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply lock triggers to grades, attendance_records, and student_enrollments
DROP TRIGGER IF EXISTS trg_lock_grades ON public.grades;
CREATE TRIGGER trg_lock_grades
BEFORE INSERT OR UPDATE OR DELETE ON public.grades
FOR EACH ROW EXECUTE FUNCTION public.check_academic_year_lock();

DROP TRIGGER IF EXISTS trg_lock_attendance_records ON public.attendance_records;
CREATE TRIGGER trg_lock_attendance_records
BEFORE INSERT OR UPDATE OR DELETE ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.check_academic_year_lock();

DROP TRIGGER IF EXISTS trg_lock_student_enrollments ON public.student_enrollments;
CREATE TRIGGER trg_lock_student_enrollments
BEFORE INSERT OR UPDATE OR DELETE ON public.student_enrollments
FOR EACH ROW EXECUTE FUNCTION public.check_academic_year_lock();
