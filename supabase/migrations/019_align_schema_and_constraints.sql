-- Migration 19: Align Schema and Constraints for Full Application Compatibility
-- Fixes constraint mismatches in documents, support_cases, support_interventions, and parent_contacts

-- 1. Extend documents type and category constraints
ALTER TABLE documents 
  DROP CONSTRAINT IF EXISTS documents_type_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_type_check 
  CHECK (type IN ('excel', 'word', 'pdf', 'archive', 'image', 'activity_log', 'other'));

ALTER TABLE documents 
  DROP CONSTRAINT IF EXISTS documents_category_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_category_check 
  CHECK (category IN ('upload', 'export', 'template', 'geip', 'giep'));

-- 2. Align support_cases table columns to match application usage
ALTER TABLE support_cases
  ADD COLUMN IF NOT EXISTS school_id text,
  ADD COLUMN IF NOT EXISTS opened_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'attendance',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- Set default values for any legacy records
UPDATE support_cases 
SET category = COALESCE(category, risk_type, 'attendance'),
    priority = COALESCE(priority, risk_level, 'medium'),
    summary = COALESCE(summary, notes, '')
WHERE summary IS NULL;

-- 3. Align support_interventions table columns to match application usage
ALTER TABLE support_interventions
  ADD COLUMN IF NOT EXISTS action_type text DEFAULT 'note',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz;

UPDATE support_interventions
SET action_type = COALESCE(action_type, intervention_type, 'note'),
    notes = COALESCE(notes, description, '')
WHERE notes IS NULL;

-- 4. Align parent_contacts table columns to support interaction logging
ALTER TABLE parent_contacts
  ADD COLUMN IF NOT EXISTS contact_type text DEFAULT 'call',
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS agreement text,
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Make parent_name nullable if logging directly via student_id
ALTER TABLE parent_contacts 
  ALTER COLUMN parent_name DROP NOT NULL,
  ALTER COLUMN phone_number DROP NOT NULL;

-- 5. Add index on parent_contacts and support_cases for fast class/student lookups
CREATE INDEX IF NOT EXISTS idx_parent_contacts_student_id ON parent_contacts(student_id);
CREATE INDEX IF NOT EXISTS idx_support_cases_class_id ON support_cases(class_id);
CREATE INDEX IF NOT EXISTS idx_support_cases_student_id ON support_cases(student_id);
CREATE INDEX IF NOT EXISTS idx_support_interventions_case_id ON support_interventions(case_id);
