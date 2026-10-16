-- Migration 073: Create GIEP Notes Table, Migrate Legacy Notes, and Add Monitor Assignment to Classes
-- Description: Establishes public.giep_notes with strict RLS, migrates legacy records from documents,
-- and adds monitor_id to public.classes to support explicit class monitor authorization.

-- ====================================================================
-- 1. ADD MONITOR ASSIGNMENT TO CLASSES
-- ====================================================================

ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS monitor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_classes_monitor_id ON public.classes(monitor_id);

-- ====================================================================
-- 2. CREATE GIEP NOTES TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.giep_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    school_id TEXT NOT NULL DEFAULT 'main-school',
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    activity_name TEXT NOT NULL,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    participants TEXT,
    outcome TEXT,
    status TEXT NOT NULL DEFAULT 'approved',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_giep_notes_class_id ON public.giep_notes(class_id);
CREATE INDEX IF NOT EXISTS idx_giep_notes_school_id ON public.giep_notes(school_id);
CREATE INDEX IF NOT EXISTS idx_giep_notes_created_at ON public.giep_notes(created_at);

-- ====================================================================
-- 3. DATA MIGRATION: BACKFILL FROM DOCUMENTS
-- ====================================================================

INSERT INTO public.giep_notes (
    id,
    class_id,
    school_id,
    created_by,
    activity_name,
    activity_date,
    participants,
    outcome,
    status,
    created_at
)
SELECT
    d.id,
    d.class_id,
    COALESCE(c.school_id, 'main-school'),
    d.uploader_id,
    d.title,
    COALESCE(d.created_at::DATE, CURRENT_DATE),
    d.size,
    d.file_url,
    COALESCE(d.status, 'approved'),
    COALESCE(d.created_at, NOW())
FROM public.documents d
LEFT JOIN public.classes c ON c.id = d.class_id
WHERE (d.category IN ('geip', 'giep') OR d.type = 'activity_log')
  AND d.class_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 4. ROW LEVEL SECURITY (RLS) FOR GIEP NOTES
-- ====================================================================

ALTER TABLE public.giep_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "giep_notes_select_policy" ON public.giep_notes;
CREATE POLICY "giep_notes_select_policy" ON public.giep_notes
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR
  EXISTS (
    SELECT 1 FROM public.classes c 
    WHERE c.id = giep_notes.class_id 
    AND (
      c.teacher_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'principal' 
        AND p.school_id = c.school_id
      )
    )
  )
);

DROP POLICY IF EXISTS "giep_notes_insert_policy" ON public.giep_notes;
CREATE POLICY "giep_notes_insert_policy" ON public.giep_notes
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR
  EXISTS (
    SELECT 1 FROM public.classes c 
    WHERE c.id = giep_notes.class_id 
    AND (
      c.teacher_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'principal' 
        AND p.school_id = c.school_id
      )
    )
  )
);

DROP POLICY IF EXISTS "giep_notes_update_policy" ON public.giep_notes;
CREATE POLICY "giep_notes_update_policy" ON public.giep_notes
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.classes c 
    WHERE c.id = giep_notes.class_id 
    AND (
      c.teacher_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'principal' 
        AND p.school_id = c.school_id
      )
    )
  )
);

DROP POLICY IF EXISTS "giep_notes_delete_policy" ON public.giep_notes;
CREATE POLICY "giep_notes_delete_policy" ON public.giep_notes
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR created_by = auth.uid()
);
