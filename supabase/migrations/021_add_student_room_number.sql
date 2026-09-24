-- Migration: 21_add_student_room_number.sql
-- Description: Add room_number column to students table for Exam Room assignment

ALTER TABLE IF EXISTS public.students 
ADD COLUMN IF NOT EXISTS room_number VARCHAR(50);

-- Create index for faster querying by room number
CREATE INDEX IF NOT EXISTS idx_students_room_number ON public.students(room_number);

-- Update RLS if applicable
COMMENT ON COLUMN public.students.room_number IS 'លេខបន្ទប់ប្រឡងប្រចាំខែ ឬបន្ទប់រៀនរបស់សិស្ស';
