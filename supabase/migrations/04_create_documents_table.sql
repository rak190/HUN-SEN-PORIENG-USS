-- Create documents table for storing file metadata uploaded to Cloudflare R2

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('excel', 'word', 'pdf', 'archive', 'image', 'other')),
  file_url TEXT NOT NULL, -- This will store the R2 object_key
  size TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'upload' CHECK (category IN ('upload', 'export', 'template')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policies
-- Teachers can view documents for their classes
CREATE POLICY "Users can view documents for their school/class" 
ON documents FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
  )
);

-- Teachers can insert documents
CREATE POLICY "Users can insert documents" 
ON documents FOR INSERT 
TO authenticated 
WITH CHECK (
  uploader_id = auth.uid()
);

-- Teachers can delete their own documents
CREATE POLICY "Users can delete their own documents" 
ON documents FOR DELETE 
TO authenticated 
USING (
  uploader_id = auth.uid()
);
