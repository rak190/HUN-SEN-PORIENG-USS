-- Add desk_number to students table for exam seating plans
ALTER TABLE students ADD COLUMN IF NOT EXISTS desk_number TEXT;
