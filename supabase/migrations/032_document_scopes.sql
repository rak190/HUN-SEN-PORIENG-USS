-- 31_document_scopes.sql

-- PHASE 15: DOCUMENT ACCESS MODEL
-- Add scope to documents to explicitly define authorization scopes

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'class' 
CHECK (scope IN ('personal', 'class', 'student', 'support_case', 'school', 'system_template'));

-- Drop simplistic existing policies
DROP POLICY IF EXISTS "Users can view documents for their school/class" ON documents;
DROP POLICY IF EXISTS "Users can insert documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;

-- CREATE NEW HARDENED RLS POLICIES FOR DOCUMENTS
-- Note: 'school_id' does not exist on documents, we must join through classes or uploader

-- 1. View policy
CREATE POLICY "Strict Document View Policy" ON documents
FOR SELECT TO authenticated
USING (
    -- Admin can view all
    is_admin() OR
    -- Personal: Uploader can view
    (scope = 'personal' AND uploader_id = auth.uid()) OR
    -- Class: Teacher of the class, or Principal of the school can view
    (scope = 'class' AND class_id IS NOT NULL AND (
        EXISTS (SELECT 1 FROM classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM classes c JOIN profiles p ON p.school_id = c.school_id WHERE c.id = class_id AND p.id = auth.uid() AND p.role = 'principal')
    )) OR
    -- School: Anyone in the school can view
    (scope = 'school' AND EXISTS (
        SELECT 1 FROM profiles p1 JOIN profiles p2 ON p1.school_id = p2.school_id 
        WHERE p1.id = auth.uid() AND p2.id = uploader_id
    )) OR
    -- System Template: Anyone can view
    (scope = 'system_template')
);

-- 2. Insert Policy
CREATE POLICY "Strict Document Insert Policy" ON documents
FOR INSERT TO authenticated
WITH CHECK (
    uploader_id = auth.uid() AND (
        is_admin() OR 
        is_principal() OR 
        (scope = 'class' AND class_id IS NOT NULL AND EXISTS (SELECT 1 FROM classes c WHERE c.id = class_id AND c.teacher_id = auth.uid())) OR
        (scope = 'personal')
    )
);

-- 3. Delete Policy
CREATE POLICY "Strict Document Delete Policy" ON documents
FOR DELETE TO authenticated
USING (
    is_admin() OR uploader_id = auth.uid()
);
