-- 048_add_seating_indexes.sql
BEGIN;

-- Add index to speed up querying seating ordered by room_number and desk_number
CREATE INDEX IF NOT EXISTS idx_enrollment_seating ON student_enrollments(class_id, room_number, desk_number);

COMMIT;
