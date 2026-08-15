-- 09_class_details.sql
-- Enhance classes table with Cambodian MoEYS school administration fields
BEGIN;

-- 1. Add shift (វេនសិក្សា: ព្រឹក, រសៀល, ពេញមួយថ្ងៃ)
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS shift TEXT DEFAULT 'ព្រឹក' CHECK (shift IN ('ព្រឹក', 'រសៀល', 'ពេញមួយថ្ងៃ'));

-- 2. Add room_number (លេខបន្ទប់រៀន)
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS room_number TEXT;

-- 3. Add track (ផ្នែក: ទូទៅ, វិទ្យាសាស្ត្រពិត, វិទ្យាសាស្ត្រសង្គម)
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS track TEXT DEFAULT 'ទូទៅ' CHECK (track IN ('ទូទៅ', 'វិទ្យាសាស្ត្រពិត', 'វិទ្យាសាស្ត្រសង្គម'));

-- 4. Create index for fast filtering by shift and academic year
CREATE INDEX IF NOT EXISTS idx_classes_shift_year ON classes(academic_year_id, shift);

-- 5. Set sensible default shifts for existing classes if needed based on name or grade
UPDATE classes SET shift = 'រសៀល' WHERE grade IN ('7', '8', '9') AND (shift IS NULL OR shift = '');
UPDATE classes SET shift = 'ព្រឹក' WHERE grade IN ('10', '11', '12') AND (shift IS NULL OR shift = '');

COMMIT;
