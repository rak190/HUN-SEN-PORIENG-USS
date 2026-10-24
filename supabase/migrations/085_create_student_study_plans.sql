-- Migration 085: Create Student Study Plans Table
-- Description: Establishes public.student_study_plans to persist planned student goal levels (A-F)
-- across the 10 academic months and end-of-year target, fully isolated from published grades.

CREATE TABLE IF NOT EXISTS public.student_study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    subject_targets JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_student_study_plans_student_year UNIQUE (student_id, academic_year_id)
);

-- Indices for rapid query lookups by class and academic year
CREATE INDEX IF NOT EXISTS idx_student_study_plans_class_year 
    ON public.student_study_plans(class_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_student_study_plans_student 
    ON public.student_study_plans(student_id);

-- Setup Row Level Security
ALTER TABLE public.student_study_plans ENABLE ROW LEVEL SECURITY;

-- 1. Read Policy: Authenticated users can view study plans
DROP POLICY IF EXISTS "Enable read access for authenticated users on student_study_plans" ON public.student_study_plans;
CREATE POLICY "Enable read access for authenticated users on student_study_plans"
    ON public.student_study_plans FOR SELECT
    USING (auth.role() = 'authenticated');

-- 2. Write Policy: Authorized teachers and admins
DROP POLICY IF EXISTS "Enable write access for authorized teachers and admins on student_study_plans" ON public.student_study_plans;
CREATE POLICY "Enable write access for authorized teachers and admins on student_study_plans"
    ON public.student_study_plans FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = student_study_plans.class_id
            AND (
                c.teacher_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                    AND p.role IN ('admin', 'principal')
                )
            )
        )
    );
