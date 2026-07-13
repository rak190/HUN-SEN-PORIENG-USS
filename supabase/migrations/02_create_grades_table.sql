-- Create Grades Table
DROP TABLE IF EXISTS grades CASCADE;

CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    period TEXT NOT NULL, -- e.g., 'sem-1', 'oct'
    scores JSONB NOT NULL DEFAULT '{}'::jsonb, -- dynamic subject scores
    total_score NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Index for fast lookups by student and period
CREATE UNIQUE INDEX idx_grades_student_period ON grades(student_id, period);
CREATE INDEX idx_grades_class_period ON grades(class_id, period);

-- Setup RLS
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users"
    ON grades FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert/update for admins and principals"
    ON grades FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'principal')
        )
    );

CREATE POLICY "Enable insert/update for teachers"
    ON grades FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = grades.class_id
            AND classes.teacher_id = auth.uid()
        )
    );
