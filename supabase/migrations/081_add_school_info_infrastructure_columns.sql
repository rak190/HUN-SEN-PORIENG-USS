-- Migration 081: Add School Info Infrastructure and Key Personnel Columns
-- Description:
-- 1. Adds missing infrastructure, geographic, and personnel columns to public.schools
-- 2. Prevents PostgREST schema cache errors (PGRST204) when saving school details in /admin/school-info
-- 3. Adds metadata JSONB column for extensible school configuration
-- 4. Ensures idempotent application with IF NOT EXISTS

BEGIN;

ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS name_en TEXT,
ADD COLUMN IF NOT EXISTS school_type TEXT,
ADD COLUMN IF NOT EXISTS abbreviation TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS village TEXT,
ADD COLUMN IF NOT EXISTS commune TEXT,
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS principal_title TEXT,
ADD COLUMN IF NOT EXISTS ict_lead_email TEXT,
ADD COLUMN IF NOT EXISTS smc_head_name TEXT,
ADD COLUMN IF NOT EXISTS smc_head_phone TEXT,
ADD COLUMN IF NOT EXISTS water_supply TEXT,
ADD COLUMN IF NOT EXISTS electricity TEXT,
ADD COLUMN IF NOT EXISTS internet TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Comment on columns for clear documentation
COMMENT ON COLUMN public.schools.electricity IS 'Electricity infrastructure source (e.g., State Grid, Solar, Generator)';
COMMENT ON COLUMN public.schools.water_supply IS 'Clean water infrastructure source (e.g., Well, Tap water, Rainwater)';
COMMENT ON COLUMN public.schools.internet IS 'Internet connectivity type (e.g., Wi-Fi, Fiber, 4G/5G Router)';
COMMENT ON COLUMN public.schools.metadata IS 'Extensible JSONB metadata for extra school settings and MoEYS GEIP properties';

-- Ensure PostgREST schema cache reloads
NOTIFY pgrst, 'reload schema';

COMMIT;
