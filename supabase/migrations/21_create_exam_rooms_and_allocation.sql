-- Migration 21: Create Exam Rooms, Exam Events, and Exam Seat Assignments
-- Designed specifically for Hun Sen Porieng Upper Secondary School real exam workflow

-- 1. Exam Rooms table (Physical room inventory)
CREATE TABLE IF NOT EXISTS exam_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_number TEXT NOT NULL UNIQUE,
  building TEXT DEFAULT 'អគារសិក្សា',
  floor TEXT DEFAULT 'ជាន់ផ្ទាល់ដី',
  capacity INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast room number lookup
CREATE INDEX IF NOT EXISTS idx_exam_rooms_number ON exam_rooms(room_number);

-- 2. Exam Events table (Examination sessions)
CREATE TABLE IF NOT EXISTS exam_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  academic_year TEXT NOT NULL DEFAULT '២០២៥-២០២៦',
  period TEXT NOT NULL DEFAULT 'mar',
  exam_date TEXT DEFAULT 'ថ្ងៃទី៣០ ខែមីនា ឆ្នាំ២០២៦',
  target_students_per_room INTEGER NOT NULL DEFAULT 25,
  distribution_method TEXT NOT NULL DEFAULT 'fixed_capacity', -- fixed_capacity, custom_capacity, manual_split, auto_balanced
  student_ordering TEXT NOT NULL DEFAULT 'name', -- name, desk_number, student_id, random
  mixing_mode TEXT NOT NULL DEFAULT 'keep_classes', -- keep_classes, mix_classes, balanced_classes
  status TEXT NOT NULL DEFAULT 'draft', -- draft, published, locked
  header_metadata JSONB DEFAULT '{
    "kingdom": "ព្រះរាជាណាចក្រកម្ពុជា",
    "motto": "ជាតិ សាសនា ព្រះមហាក្សត្រ",
    "ministry": "មន្ទីរអប់រំយុវជន និងកីឡាខេត្តព្រៃវែង",
    "school": "វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង",
    "title_prefix": "បញ្ជីឈ្មោះបេក្ខជនប្រឡងប្រចាំខែ",
    "exam_date_label": "សម័យប្រឡងៈ ថ្ងៃទី៣០ ខែមីនា ឆ្នាំ២០២៦"
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exam_events_period ON exam_events(period, academic_year);

-- 3. Exam Seat Assignments (Junction linking Event, Student, Room, and Global Desk Number)
CREATE TABLE IF NOT EXISTS exam_seat_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_event_id UUID NOT NULL REFERENCES exam_events(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_room_id UUID NOT NULL REFERENCES exam_rooms(id) ON DELETE CASCADE,
  exam_order_number INTEGER NOT NULL, -- Global continuous exam order (1 ... 1294)
  seat_number INTEGER NOT NULL,       -- Room-level seat order (1 ... 26)
  status TEXT NOT NULL DEFAULT 'registered', -- registered, absent, transferred, withdrawn
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_exam_event_student UNIQUE (exam_event_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_seat_assignments_event_room ON exam_seat_assignments(exam_event_id, exam_room_id, exam_order_number);
CREATE INDEX IF NOT EXISTS idx_exam_seat_assignments_student ON exam_seat_assignments(student_id);

-- 4. Enable RLS on all three tables
ALTER TABLE exam_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_seat_assignments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Allow authenticated users to read exam rooms, events, and assignments
CREATE POLICY "Allow authenticated read exam_rooms" ON exam_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin manage exam_rooms" ON exam_rooms FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'principal'))
);

CREATE POLICY "Allow authenticated read exam_events" ON exam_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin manage exam_events" ON exam_events FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'principal'))
);

CREATE POLICY "Allow authenticated read exam_seat_assignments" ON exam_seat_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin manage exam_seat_assignments" ON exam_seat_assignments FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'principal'))
);

-- 6. Pre-seed standard Rooms 1 to 53 for Hun Sen Porieng Upper Secondary School
INSERT INTO exam_rooms (room_number, building, floor, capacity, is_active)
SELECT 
  i::text AS room_number,
  CASE 
    WHEN i <= 14 THEN 'អគារ A'
    WHEN i <= 28 THEN 'អគារ B'
    WHEN i <= 42 THEN 'អគារ C'
    ELSE 'អគារ D'
  END AS building,
  CASE 
    WHEN (i % 3) = 1 THEN 'ជាន់ផ្ទាល់ដី'
    WHEN (i % 3) = 2 THEN 'ជាន់ទី១'
    ELSE 'ជាន់ទី២'
  END AS floor,
  30 AS capacity,
  true AS is_active
FROM generate_series(1, 53) i
ON CONFLICT (room_number) DO UPDATE 
SET capacity = EXCLUDED.capacity, is_active = EXCLUDED.is_active;
