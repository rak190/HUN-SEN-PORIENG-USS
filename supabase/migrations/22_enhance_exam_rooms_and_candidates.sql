-- Migration 22: Forensic Data Integrity, Atomic Operations, Candidate Pool, and Security Constraints for Exam Room Allocation

-- 1. Create persisted exam_event_candidates pool table
CREATE TABLE IF NOT EXISTS exam_event_candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_event_id UUID NOT NULL REFERENCES exam_events(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  candidate_status TEXT NOT NULL DEFAULT 'registered', -- registered, absent, transferred, withdrawn
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_exam_event_candidate UNIQUE (exam_event_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_event_candidates_event ON exam_event_candidates(exam_event_id);
CREATE INDEX IF NOT EXISTS idx_exam_event_candidates_class ON exam_event_candidates(exam_event_id, class_id);

-- Enable RLS on exam_event_candidates
ALTER TABLE exam_event_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read exam_event_candidates" ON exam_event_candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin manage exam_event_candidates" ON exam_event_candidates FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'principal'))
);

-- 2. Alter exam_events to support academic_year_id reference and structured session metadata
ALTER TABLE exam_events ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL;
ALTER TABLE exam_events ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE exam_events ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE exam_events ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE exam_events ADD COLUMN IF NOT EXISTS session TEXT; -- 'ព្រឹក', 'រសៀល'
ALTER TABLE exam_events ADD COLUMN IF NOT EXISTS selected_room_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE exam_events ADD COLUMN IF NOT EXISTS custom_capacities JSONB DEFAULT '{}'::jsonb;
ALTER TABLE exam_events ADD COLUMN IF NOT EXISTS manual_ranges JSONB DEFAULT '[]'::jsonb;

-- 3. Alter exam_seat_assignments to enforce RESTRICT on physical room deletion and real DB uniqueness
ALTER TABLE exam_seat_assignments DROP CONSTRAINT IF EXISTS exam_seat_assignments_exam_room_id_fkey;
ALTER TABLE exam_seat_assignments ADD CONSTRAINT exam_seat_assignments_exam_room_id_fkey 
  FOREIGN KEY (exam_room_id) REFERENCES exam_rooms(id) ON DELETE RESTRICT;

-- Add database uniqueness constraints
ALTER TABLE exam_seat_assignments DROP CONSTRAINT IF EXISTS uq_exam_event_room_seat;
ALTER TABLE exam_seat_assignments ADD CONSTRAINT uq_exam_event_room_seat 
  UNIQUE (exam_event_id, exam_room_id, seat_number);

ALTER TABLE exam_seat_assignments DROP CONSTRAINT IF EXISTS uq_exam_event_order_number;
ALTER TABLE exam_seat_assignments ADD CONSTRAINT uq_exam_event_order_number 
  UNIQUE (exam_event_id, exam_order_number);

-- 4. Create Atomic RPC Function for Replacing Seat Assignments
CREATE OR REPLACE FUNCTION replace_exam_seat_assignments(
  p_exam_event_id UUID,
  p_assignments JSONB,
  p_configuration JSONB,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status TEXT;
  v_title TEXT;
  v_count INTEGER;
  v_item JSONB;
BEGIN
  -- 1. Verify Event exists and is not locked
  SELECT status, title INTO v_status, v_title FROM exam_events WHERE id = p_exam_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exam event not found: %', p_exam_event_id;
  END IF;

  IF v_status = 'locked' THEN
    RAISE EXCEPTION 'Cannot mutate a locked examination event (Event: %)', v_title;
  END IF;

  -- 2. Clear old assignments atomically
  DELETE FROM exam_seat_assignments WHERE exam_event_id = p_exam_event_id;

  -- 3. Insert new assignments
  v_count := jsonb_array_length(p_assignments);
  
  IF v_count > 0 THEN
    INSERT INTO exam_seat_assignments (
      exam_event_id,
      student_id,
      exam_room_id,
      exam_order_number,
      seat_number,
      status,
      note
    )
    SELECT
      p_exam_event_id,
      (elem->>'student_id')::UUID,
      (elem->>'exam_room_id')::UUID,
      (elem->>'exam_order_number')::INTEGER,
      (elem->>'seat_number')::INTEGER,
      COALESCE(elem->>'status', 'registered'),
      elem->>'note'
    FROM jsonb_array_elements(p_assignments) AS elem;
  END IF;

  -- 4. Update Event configuration atomically
  UPDATE exam_events
  SET
    distribution_method = COALESCE(p_configuration->>'distribution_method', distribution_method),
    student_ordering = COALESCE(p_configuration->>'student_ordering', student_ordering),
    mixing_mode = COALESCE(p_configuration->>'mixing_mode', mixing_mode),
    target_students_per_room = COALESCE((p_configuration->>'target_students_per_room')::INTEGER, target_students_per_room),
    selected_room_ids = COALESCE(p_configuration->'selected_room_ids', selected_room_ids),
    custom_capacities = COALESCE(p_configuration->'custom_capacities', custom_capacities),
    manual_ranges = COALESCE(p_configuration->'manual_ranges', manual_ranges),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_exam_event_id;

  -- 5. Audit Log Entry if audit_logs table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    INSERT INTO audit_logs (user_id, action, target_type, target_id, details)
    VALUES (
      p_user_id,
      'save_exam_seat_assignments',
      'exam_events',
      p_exam_event_id::text,
      jsonb_build_object(
        'event_title', v_title,
        'assigned_count', v_count,
        'distribution_method', p_configuration->>'distribution_method'
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'assigned_count', v_count,
    'event_id', p_exam_event_id
  );
END;
$$;
