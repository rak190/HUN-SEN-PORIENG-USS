-- Migration: Add detailed family contacts to students table based on real school spreadsheet
-- Preserving existing data, extending the schema

BEGIN;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS father_name TEXT,
  ADD COLUMN IF NOT EXISTS father_job TEXT,
  ADD COLUMN IF NOT EXISTS father_phone TEXT,
  
  ADD COLUMN IF NOT EXISTS mother_name TEXT,
  ADD COLUMN IF NOT EXISTS mother_job TEXT,
  ADD COLUMN IF NOT EXISTS mother_phone TEXT,
  
  ADD COLUMN IF NOT EXISTS guardian_name TEXT,
  ADD COLUMN IF NOT EXISTS guardian_job TEXT,
  ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
  
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  
  ADD COLUMN IF NOT EXISTS current_address TEXT;

-- We don't drop parent_phone or address because they might be used by existing views or components.
-- We will migrate existing parent_phone data into guardian_phone if guardian_phone is null.
UPDATE students 
SET guardian_phone = parent_phone 
WHERE parent_phone IS NOT NULL AND guardian_phone IS NULL;

COMMIT;
