-- Migration: 03_create_health_records.sql
-- Description: Table for tracking student health screenings (GEIP 3.3.1.3 Eye & Ear Tests, BMI, etc.)

CREATE TABLE IF NOT EXISTS student_health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(5,2),
  height_cm NUMERIC(5,2),
  bmi NUMERIC(4,2),
  vision_left TEXT, -- e.g. '6/6', '6/12', 'មានបញ្ហា', 'ធម្មតា'
  vision_right TEXT,
  hearing TEXT, -- e.g. 'ធម្មតា', 'ពិបាកស្តាប់', 'ថ្លង់ម្ខាង'
  dental TEXT, -- e.g. 'ល្អ', 'ពុកធ្មេញ', 'ត្រូវការជួសជុល'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_student_health_date UNIQUE (student_id, recorded_date)
);

-- Indexing for fast queries by class and date
CREATE INDEX IF NOT EXISTS idx_health_records_class_date ON student_health_records(class_id, recorded_date);
CREATE INDEX IF NOT EXISTS idx_health_records_student ON student_health_records(student_id);

-- Enable RLS
ALTER TABLE student_health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read health records" ON student_health_records
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert/update health records" ON student_health_records
  FOR ALL USING (auth.role() = 'authenticated');
