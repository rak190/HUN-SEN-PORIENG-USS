-- Add desk_number to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS desk_number TEXT;

-- Create home_visits table
CREATE TABLE IF NOT EXISTS home_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'pending', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE home_visits ENABLE ROW LEVEL SECURITY;

-- Create RLS Policy
CREATE POLICY "Allow read/write access to home_visits for authenticated users" 
ON home_visits FOR ALL USING (auth.role() = 'authenticated');
