-- 1. Ensure exam_subject_standards has academic_year_id
ALTER TABLE public.exam_subject_standards 
ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE RESTRICT;

-- 2. Backfill existing standards to active or latest academic year
UPDATE public.exam_subject_standards
SET academic_year_id = (
  SELECT id FROM public.academic_years 
  ORDER BY is_active DESC, start_date DESC 
  LIMIT 1
)
WHERE academic_year_id IS NULL;

-- If for some reason there are no academic years, create a default one to satisfy NOT NULL constraint
DO $$
DECLARE
    v_year_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.academic_years) THEN
        INSERT INTO public.academic_years (name, start_date, end_date, is_active, status)
        VALUES ('Default Year', '2024-10-01', '2025-07-31', true, 'active')
        RETURNING id INTO v_year_id;

        UPDATE public.exam_subject_standards SET academic_year_id = v_year_id WHERE academic_year_id IS NULL;
    END IF;
END $$;

ALTER TABLE public.exam_subject_standards 
ALTER COLUMN academic_year_id SET NOT NULL;

-- 3. Composite unique constraint: One standard per subject, grade, stream, and academic year
ALTER TABLE public.exam_subject_standards 
DROP CONSTRAINT IF EXISTS exam_subject_standards_subject_name_grade_level_stream_type_key;

ALTER TABLE public.exam_subject_standards 
ADD CONSTRAINT uq_subject_grade_stream_year 
UNIQUE (academic_year_id, grade_level, subject_name, stream_type);

-- 4. Scope grading scales (A-F grade boundaries) to academic_year_id
CREATE TABLE IF NOT EXISTS public.exam_grading_scales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    grade_letter VARCHAR(5) NOT NULL, -- 'A', 'B', 'C', 'D', 'E', 'F'
    min_percentage NUMERIC(5,2) NOT NULL, -- e.g. 90.00
    max_percentage NUMERIC(5,2) NOT NULL, -- e.g. 100.00
    gpa_point NUMERIC(3,2) NOT NULL,     -- e.g. 4.00
    description_khmer VARCHAR(50),       -- 'ល្អប្រសើរ', 'ល្អ', etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (academic_year_id, grade_letter)
);

ALTER TABLE public.exam_grading_scales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users on exam_grading_scales"
    ON public.exam_grading_scales FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable ALL access for admins on exam_grading_scales"
    ON public.exam_grading_scales FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'principal')
        )
    );

-- Seed defaults for the active year
DO $$
DECLARE
    v_year_id UUID;
BEGIN
    SELECT id INTO v_year_id FROM public.academic_years ORDER BY is_active DESC, start_date DESC LIMIT 1;
    
    IF v_year_id IS NOT NULL THEN
        INSERT INTO public.exam_grading_scales (academic_year_id, grade_letter, min_percentage, max_percentage, gpa_point, description_khmer) VALUES
        (v_year_id, 'A', 90.00, 100.00, 4.00, 'ល្អប្រសើរ (Excellent)'),
        (v_year_id, 'B', 80.00, 89.99, 3.00, 'ល្អណាស់ (Very Good)'),
        (v_year_id, 'C', 70.00, 79.99, 2.00, 'ល្អ (Good)'),
        (v_year_id, 'D', 60.00, 69.99, 1.00, 'ល្អបង្គួរ (Fairly Good)'),
        (v_year_id, 'E', 50.00, 59.99, 0.00, 'មធ្យម (Pass)'),
        (v_year_id, 'F', 0.00, 49.99, 0.00, 'ធ្លាក់ (Fail)')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;


-- 5. Year-End Lock Trigger for Standards
CREATE OR REPLACE FUNCTION public.check_standards_year_lock()
RETURNS TRIGGER AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT status INTO v_status 
    FROM public.academic_years 
    WHERE id = COALESCE(NEW.academic_year_id, OLD.academic_year_id);

    IF v_status IN ('closed', 'archived') THEN
        RAISE EXCEPTION 'មិនអាចកែប្រែស្តង់ដារពិន្ទុនៃឆ្នាំសិក្សាដែលបានបិទបញ្ចប់រួចហើយ (Standards for closed year are locked)'
        USING ERRCODE = '55000';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_exam_standards ON public.exam_subject_standards;
CREATE TRIGGER trg_lock_exam_standards
BEFORE INSERT OR UPDATE OR DELETE ON public.exam_subject_standards
FOR EACH ROW EXECUTE FUNCTION public.check_standards_year_lock();

DROP TRIGGER IF EXISTS trg_lock_exam_grading_scales ON public.exam_grading_scales;
CREATE TRIGGER trg_lock_exam_grading_scales
BEFORE INSERT OR UPDATE OR DELETE ON public.exam_grading_scales
FOR EACH ROW EXECUTE FUNCTION public.check_standards_year_lock();


-- 6. Copy Standards Utility RPC (clone_exam_standards_to_year)
CREATE OR REPLACE FUNCTION public.clone_exam_standards_to_year(
    p_source_year_id UUID,
    p_target_year_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_count_subjects INT;
    v_count_scales INT;
BEGIN
    -- Authorization: Admin only
    IF auth.uid() IS NULL OR (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('admin', 'principal') THEN
        RAISE EXCEPTION 'Unauthorized: Only admin can clone standards';
    END IF;

    -- Clone subject standards
    INSERT INTO public.exam_subject_standards (
        academic_year_id, grade_level, subject_name, coefficient, max_score, stream_type, is_core
    )
    SELECT 
        p_target_year_id, grade_level, subject_name, coefficient, max_score, stream_type, is_core
    FROM public.exam_subject_standards
    WHERE academic_year_id = p_source_year_id
    ON CONFLICT (academic_year_id, grade_level, subject_name, stream_type) DO NOTHING;

    GET DIAGNOSTICS v_count_subjects = ROW_COUNT;

    -- Clone grading scales
    INSERT INTO public.exam_grading_scales (
        academic_year_id, grade_letter, min_percentage, max_percentage, gpa_point, description_khmer
    )
    SELECT 
        p_target_year_id, grade_letter, min_percentage, max_percentage, gpa_point, description_khmer
    FROM public.exam_grading_scales
    WHERE academic_year_id = p_source_year_id
    ON CONFLICT (academic_year_id, grade_letter) DO NOTHING;
    
    GET DIAGNOSTICS v_count_scales = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'cloned_subjects', v_count_subjects, 'cloned_scales', v_count_scales);
END;
$$;
