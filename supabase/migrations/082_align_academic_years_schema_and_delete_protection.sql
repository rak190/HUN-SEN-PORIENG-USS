-- Migration 082: Align Academic Years Schema and Delete Protection
-- Description:
-- 1. Adds is_current BOOLEAN column to public.academic_years for complete backward compatibility
-- 2. Updates sync_academic_year_is_active() to maintain both is_active and is_current
-- 3. Adds trigger preventing accidental deletion of the active academic year
-- 4. Ensures idempotent application with IF NOT EXISTS

BEGIN;

-- 1. Add is_current column
ALTER TABLE public.academic_years 
ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false;

-- 2. Backfill existing records
UPDATE public.academic_years 
SET is_current = (status = 'active' OR is_active = true);

-- 3. Update sync trigger to keep is_active and is_current synchronized with status
CREATE OR REPLACE FUNCTION public.sync_academic_year_is_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.is_active := (NEW.status = 'active');
    NEW.is_current := (NEW.status = 'active');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_academic_year_is_active ON public.academic_years;
CREATE TRIGGER trg_sync_academic_year_is_active
BEFORE INSERT OR UPDATE ON public.academic_years
FOR EACH ROW EXECUTE FUNCTION public.sync_academic_year_is_active();

-- 4. Database-level trigger preventing deletion of the active academic year
CREATE OR REPLACE FUNCTION public.prevent_active_academic_year_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'active' OR OLD.is_active = true OR OLD.is_current = true THEN
        RAISE EXCEPTION 'មិនអាចលុបឆ្នាំសិក្សាដែលកំពុងដំណើរការ (Active) បានទេ (Cannot delete active academic year)'
        USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_active_academic_year_deletion ON public.academic_years;
CREATE TRIGGER trg_prevent_active_academic_year_deletion
BEFORE DELETE ON public.academic_years
FOR EACH ROW EXECUTE FUNCTION public.prevent_active_academic_year_deletion();

-- 5. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
