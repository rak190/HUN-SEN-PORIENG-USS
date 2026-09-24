-- ====================================================================
-- Migration 20: Create Grade Snapshots for Master Scores Rollback & Safety
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.grade_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  snapshot_label TEXT NOT NULL,
  records_count INTEGER NOT NULL DEFAULT 0,
  grades_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying by period and timestamp
CREATE INDEX IF NOT EXISTS idx_grade_snapshots_period ON public.grade_snapshots(period);
CREATE INDEX IF NOT EXISTS idx_grade_snapshots_created_at ON public.grade_snapshots(created_at DESC);

-- Enable RLS
ALTER TABLE public.grade_snapshots ENABLE ROW LEVEL SECURITY;

-- Admins and Principals have full access to grade snapshots
CREATE POLICY "Admins and principals have full access to grade snapshots"
ON public.grade_snapshots
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'principal')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'principal')
  )
);
