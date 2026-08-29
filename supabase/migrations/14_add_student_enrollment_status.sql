-- Migration: Add enrollment_status to students for GEIP exact tracking
-- Statuses: active, transferred_in, transferred_out, dropout, deceased

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS enrollment_status TEXT DEFAULT 'active' 
CHECK (enrollment_status IN ('active', 'transferred_in', 'transferred_out', 'dropout', 'deceased'));

-- Update existing students to 'active' if they are marked active
UPDATE students 
SET enrollment_status = 'active' 
WHERE is_active = true;

-- Update existing students to 'dropout' if they are inactive (as a fallback)
UPDATE students 
SET enrollment_status = 'dropout' 
WHERE is_active = false;
