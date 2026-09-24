-- 07_academic_years.sql
BEGIN;

-- 1. Create academic_years table
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL DEFAULT 'main-school' REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name)
);

-- 2. Add academic_year_id to classes table
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE;

-- 3. Insert default academic year and map existing classes
DO $$
DECLARE
    default_year_id UUID;
BEGIN
    -- Check if we already have the default year
    SELECT id INTO default_year_id FROM academic_years WHERE name = '2026-2027' AND school_id = 'main-school' LIMIT 1;
    
    -- If not, insert it
    IF default_year_id IS NULL THEN
        INSERT INTO academic_years (school_id, name, start_date, is_active, is_archived)
        VALUES ('main-school', '2026-2027', '2026-11-01', TRUE, FALSE)
        RETURNING id INTO default_year_id;
    END IF;

    -- Update existing classes that do not have an academic_year_id
    UPDATE classes SET academic_year_id = default_year_id WHERE academic_year_id IS NULL;
END $$;

-- 4. Enable RLS on academic_years
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;

-- 5. Policies for academic_years
CREATE POLICY "Academic years viewable by all" ON academic_years FOR SELECT USING (auth.role() = 'authenticated');
-- Only admins can modify academic years. Since we don't have a strict DB-level admin check in policies, 
-- we will enforce it at the API layer, but we can also use a subquery if we want.
-- For now, we will allow authenticated to insert/update, but strictly control it via API (Edge Middleware + API route check).
CREATE POLICY "Admins can manage academic years" ON academic_years FOR ALL USING (auth.role() = 'authenticated');

COMMIT;
