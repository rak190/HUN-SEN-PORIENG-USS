CREATE TABLE IF NOT EXISTS exam_subject_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_name TEXT NOT NULL,
  grade_level INTEGER NOT NULL,
  stream_type TEXT DEFAULT 'general',
  coefficient NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  max_score NUMERIC(5,1) NOT NULL DEFAULT 50.0,
  is_core BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subject_name, grade_level, stream_type)
);

ALTER TABLE exam_subject_standards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users on exam_subject_standards"
    ON exam_subject_standards FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable ALL access for admins on exam_subject_standards"
    ON exam_subject_standards FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'principal')
        )
    );

-- Seed basic defaults for Junior High School (Grade 7-9)
INSERT INTO exam_subject_standards (subject_name, grade_level, stream_type, coefficient, max_score, is_core) VALUES
('ភាសាខ្មែរ', 7, 'general', 2.0, 100.0, true),
('គណិតវិទ្យា', 7, 'general', 2.0, 100.0, true),
('ភាសាខ្មែរ', 8, 'general', 2.0, 100.0, true),
('គណិតវិទ្យា', 8, 'general', 2.0, 100.0, true),
('ភាសាខ្មែរ', 9, 'general', 2.0, 100.0, true),
('គណិតវិទ្យា', 9, 'general', 2.0, 100.0, true)
ON CONFLICT DO NOTHING;
