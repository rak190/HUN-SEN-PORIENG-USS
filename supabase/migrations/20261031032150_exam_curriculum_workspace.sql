-- Additive curriculum workspace. No seeded policy values, grades or historical migrations are changed.
BEGIN;
-- NOT VALID preserves legacy rows while enforcing supported values on new/updated rows.
ALTER TABLE public.exam_subject_standards ADD CONSTRAINT curriculum_subject_values CHECK (
  length(trim(subject_name)) BETWEEN 1 AND 200 AND subject_name !~ '[[:cntrl:]]'
  AND grade_level BETWEEN 7 AND 12 AND stream_type IS NOT NULL AND stream_type IN ('general','science','social')
  AND (grade_level>=10 OR stream_type='general') AND coefficient BETWEEN 0 AND 99.9 AND max_score BETWEEN 0 AND 9999.9
) NOT VALID;
ALTER TABLE public.exam_grading_scales ADD CONSTRAINT curriculum_scale_values CHECK (
  grade_letter ~ '^[A-Za-z0-9+\-]{1,5}$' AND min_percentage BETWEEN 0 AND 100 AND max_percentage BETWEEN 0 AND 100
  AND min_percentage<=max_percentage AND gpa_point BETWEEN 0 AND 9.99
) NOT VALID;
CREATE OR REPLACE FUNCTION public.exam_curriculum_state(p_year UUID) RETURNS JSONB
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  WITH state AS (SELECT jsonb_build_object(
    'subjects',COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) FROM public.exam_subject_standards s WHERE academic_year_id=p_year),'[]'),
    'gradingScales',COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) FROM public.exam_grading_scales s WHERE academic_year_id=p_year),'[]')) value)
  SELECT value||jsonb_build_object('revision',md5(value::TEXT)) FROM state
$$;

CREATE OR REPLACE FUNCTION public.exam_curriculum_access(p_year UUID,p_write BOOLEAN) RETURNS public.academic_years
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public.profiles%ROWTYPE; y public.academic_years%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id=auth.uid() FOR SHARE;
  IF auth.uid() IS NULL OR actor.is_active IS DISTINCT FROM true OR actor.role IS NULL OR actor.role NOT IN ('admin','principal') OR actor.school_id IS NULL THEN RAISE EXCEPTION 'Curriculum administrator required' USING ERRCODE='42501'; END IF;
  IF p_write THEN SELECT * INTO y FROM public.academic_years WHERE id=p_year FOR UPDATE;
  ELSE SELECT * INTO y FROM public.academic_years WHERE id=p_year FOR SHARE; END IF;
  IF y.id IS NULL OR y.school_id IS DISTINCT FROM actor.school_id THEN RAISE EXCEPTION 'Curriculum year denied' USING ERRCODE='42501'; END IF;
  IF p_write AND (y.status IS NULL OR y.status IN ('closed','archived')) THEN RAISE EXCEPTION 'Curriculum year locked' USING ERRCODE='55000'; END IF;
  RETURN y;
END $$;

CREATE OR REPLACE FUNCTION public.exam_curriculum_workspace(p_year UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM public.exam_curriculum_access(p_year,false);
  RETURN public.exam_curriculum_state(p_year);
END $$;

-- Even legacy direct writes share the year lock, so revision comparison sees their committed changes.
-- Keep privileged, previously authorized year-cleanup workflows working; never disable RLS.
CREATE OR REPLACE FUNCTION public.exam_curriculum_write_lock() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE y public.academic_years%ROWTYPE; year_id UUID;
BEGIN
  IF TG_OP='UPDATE' AND NEW.academic_year_id IS DISTINCT FROM OLD.academic_year_id THEN RAISE EXCEPTION 'Moving curriculum rows between years is forbidden' USING ERRCODE='42501'; END IF;
  IF TG_OP='DELETE' THEN year_id:=OLD.academic_year_id; ELSE year_id:=NEW.academic_year_id; END IF;
  SELECT * INTO y FROM public.academic_years WHERE id=year_id FOR UPDATE;
  IF y.id IS NULL OR y.status IS NULL OR y.status IN ('closed','archived') THEN RAISE EXCEPTION 'Curriculum year locked' USING ERRCODE='55000'; END IF;
  IF auth.uid() IS NOT NULL THEN PERFORM public.exam_curriculum_access(year_id,true); END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER exam_curriculum_write_lock BEFORE INSERT OR UPDATE OR DELETE ON public.exam_subject_standards FOR EACH ROW EXECUTE FUNCTION public.exam_curriculum_write_lock();
CREATE TRIGGER exam_curriculum_write_lock BEFORE INSERT OR UPDATE OR DELETE ON public.exam_grading_scales FOR EACH ROW EXECUTE FUNCTION public.exam_curriculum_write_lock();

CREATE OR REPLACE FUNCTION public.save_exam_curriculum(p_year UUID,p_revision TEXT,p_subjects JSONB,p_scales JSONB,p_delete_subjects UUID[] DEFAULT '{}',p_delete_scales UUID[] DEFAULT '{}',p_confirm_delete BOOLEAN DEFAULT false) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE y public.academic_years%ROWTYPE; previous JSONB; item JSONB; row_id UUID; n INT;
BEGIN
  y:=public.exam_curriculum_access(p_year,true); previous:=public.exam_curriculum_state(p_year);
  IF p_revision IS NULL OR p_revision IS DISTINCT FROM previous->>'revision' THEN RAISE EXCEPTION 'Curriculum changed; reload' USING ERRCODE='40001'; END IF;
  IF jsonb_typeof(p_subjects) IS DISTINCT FROM 'array' OR jsonb_typeof(p_scales) IS DISTINCT FROM 'array' OR jsonb_array_length(p_subjects)>1000 OR jsonb_array_length(p_scales)>30 OR p_delete_subjects IS NULL OR p_delete_scales IS NULL THEN RAISE EXCEPTION 'Invalid curriculum input' USING ERRCODE='22023'; END IF;
  IF (cardinality(p_delete_subjects)>0 OR cardinality(p_delete_scales)>0) AND p_confirm_delete IS DISTINCT FROM true THEN RAISE EXCEPTION 'Explicit removal confirmation required' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_subjects) s GROUP BY lower(trim(s->>'subject_name')),s->>'grade_level',s->>'stream_type' HAVING count(*)>1)
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_subjects) s WHERE s ? 'id' GROUP BY s->>'id' HAVING count(*)>1)
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_scales) s GROUP BY s->>'grade_letter' HAVING count(*)>1)
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_scales) s WHERE s ? 'id' GROUP BY s->>'id' HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate curriculum rows' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(p_delete_subjects) x WHERE NOT EXISTS(SELECT 1 FROM public.exam_subject_standards WHERE id=x AND academic_year_id=p_year))
    OR EXISTS(SELECT 1 FROM unnest(p_delete_scales) x WHERE NOT EXISTS(SELECT 1 FROM public.exam_grading_scales WHERE id=x AND academic_year_id=p_year)) THEN RAISE EXCEPTION 'Removal outside target year' USING ERRCODE='42501'; END IF;
  DELETE FROM public.exam_subject_standards WHERE academic_year_id=p_year AND id=ANY(p_delete_subjects);
  DELETE FROM public.exam_grading_scales WHERE academic_year_id=p_year AND id=ANY(p_delete_scales);
  FOR item IN SELECT value FROM jsonb_array_elements(p_subjects) LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR NOT(item ?& ARRAY['subject_name','grade_level','stream_type','coefficient','max_score','is_core'])
      OR EXISTS(SELECT 1 FROM jsonb_object_keys(item) k WHERE k NOT IN ('id','subject_name','grade_level','stream_type','coefficient','max_score','is_core'))
      OR jsonb_typeof(item->'subject_name') IS DISTINCT FROM 'string' OR length(trim(item->>'subject_name')) NOT BETWEEN 1 AND 200 OR (item->>'subject_name') ~ '[[:cntrl:]]'
      OR jsonb_typeof(item->'grade_level') IS DISTINCT FROM 'number' OR (item->>'grade_level')::NUMERIC NOT BETWEEN 7 AND 12 OR (item->>'grade_level')::NUMERIC<>trunc((item->>'grade_level')::NUMERIC)
      OR (item->>'stream_type') IS NULL OR item->>'stream_type' NOT IN ('general','science','social') OR ((item->>'grade_level')::INT<10 AND item->>'stream_type'<>'general')
      OR jsonb_typeof(item->'coefficient') IS DISTINCT FROM 'number' OR (item->>'coefficient')::NUMERIC NOT BETWEEN 0 AND 99.9 OR (item->>'coefficient')::NUMERIC<>round((item->>'coefficient')::NUMERIC,1)
      OR jsonb_typeof(item->'max_score') IS DISTINCT FROM 'number' OR (item->>'max_score')::NUMERIC NOT BETWEEN 0 AND 9999.9 OR (item->>'max_score')::NUMERIC<>round((item->>'max_score')::NUMERIC,1)
      OR jsonb_typeof(item->'is_core') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid subject fields' USING ERRCODE='22023'; END IF;
    row_id:=NULLIF(item->>'id','')::UUID;
    IF row_id=ANY(p_delete_subjects) THEN RAISE EXCEPTION 'Cannot save removed subject' USING ERRCODE='22023'; END IF;
    IF EXISTS(SELECT 1 FROM public.exam_subject_standards WHERE academic_year_id=p_year AND lower(trim(subject_name))=lower(trim(item->>'subject_name')) AND grade_level=(item->>'grade_level')::INT AND stream_type=item->>'stream_type' AND id IS DISTINCT FROM row_id) THEN RAISE EXCEPTION 'Duplicate subject/grade/stream' USING ERRCODE='23505'; END IF;
    IF row_id IS NULL THEN
      INSERT INTO public.exam_subject_standards(academic_year_id,subject_name,grade_level,stream_type,coefficient,max_score,is_core) VALUES(p_year,trim(item->>'subject_name'),(item->>'grade_level')::INT,item->>'stream_type',(item->>'coefficient')::NUMERIC,(item->>'max_score')::NUMERIC,(item->>'is_core')::BOOLEAN);
    ELSE
      UPDATE public.exam_subject_standards SET subject_name=trim(item->>'subject_name'),grade_level=(item->>'grade_level')::INT,stream_type=item->>'stream_type',coefficient=(item->>'coefficient')::NUMERIC,max_score=(item->>'max_score')::NUMERIC,is_core=(item->>'is_core')::BOOLEAN WHERE id=row_id AND academic_year_id=p_year;
      GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Subject identity/year denied' USING ERRCODE='42501'; END IF;
    END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(p_scales) LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR NOT(item ?& ARRAY['grade_letter','min_percentage','max_percentage','gpa_point','description_khmer'])
      OR EXISTS(SELECT 1 FROM jsonb_object_keys(item) k WHERE k NOT IN ('id','grade_letter','min_percentage','max_percentage','gpa_point','description_khmer'))
      OR COALESCE(item->>'grade_letter','') !~ '^[A-Za-z0-9+\-]{1,5}$' OR length(COALESCE(item->>'description_khmer',''))>50
      OR jsonb_typeof(item->'min_percentage') IS DISTINCT FROM 'number' OR jsonb_typeof(item->'max_percentage') IS DISTINCT FROM 'number' OR jsonb_typeof(item->'gpa_point') IS DISTINCT FROM 'number'
      OR (item->>'min_percentage')::NUMERIC NOT BETWEEN 0 AND 100 OR (item->>'max_percentage')::NUMERIC NOT BETWEEN 0 AND 100
      OR (item->>'min_percentage')::NUMERIC>(item->>'max_percentage')::NUMERIC OR (item->>'gpa_point')::NUMERIC NOT BETWEEN 0 AND 9.99
      OR (item->>'min_percentage')::NUMERIC<>round((item->>'min_percentage')::NUMERIC,2) OR (item->>'max_percentage')::NUMERIC<>round((item->>'max_percentage')::NUMERIC,2) OR (item->>'gpa_point')::NUMERIC<>round((item->>'gpa_point')::NUMERIC,2)
      THEN RAISE EXCEPTION 'Invalid grading scale' USING ERRCODE='22023'; END IF;
    row_id:=NULLIF(item->>'id','')::UUID;
    IF row_id=ANY(p_delete_scales) THEN RAISE EXCEPTION 'Cannot save removed scale' USING ERRCODE='22023'; END IF;
    IF row_id IS NULL THEN INSERT INTO public.exam_grading_scales(academic_year_id,grade_letter,min_percentage,max_percentage,gpa_point,description_khmer) VALUES(p_year,item->>'grade_letter',(item->>'min_percentage')::NUMERIC,(item->>'max_percentage')::NUMERIC,(item->>'gpa_point')::NUMERIC,item->>'description_khmer');
    ELSE
      UPDATE public.exam_grading_scales SET grade_letter=item->>'grade_letter',min_percentage=(item->>'min_percentage')::NUMERIC,max_percentage=(item->>'max_percentage')::NUMERIC,gpa_point=(item->>'gpa_point')::NUMERIC,description_khmer=item->>'description_khmer' WHERE id=row_id AND academic_year_id=p_year;
      GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Scale identity/year denied' USING ERRCODE='42501'; END IF;
    END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM public.exam_grading_scales a JOIN public.exam_grading_scales b ON a.academic_year_id=b.academic_year_id AND a.id<b.id AND a.min_percentage<=b.max_percentage AND b.min_percentage<=a.max_percentage WHERE a.academic_year_id=p_year) THEN RAISE EXCEPTION 'Overlapping grading scales' USING ERRCODE='22023'; END IF;
  INSERT INTO public.audit_logs(user_id,school_id,action,type,target_table,details) VALUES(auth.uid(),y.school_id,'CURRICULUM_SAVED','info','exam_subject_standards',jsonb_build_object('academic_year_id',p_year,'before',previous,'after',public.exam_curriculum_state(p_year)));
  RETURN public.exam_curriculum_state(p_year);
END $$;

CREATE OR REPLACE FUNCTION public.clone_exam_curriculum(p_source UUID,p_target UUID,p_source_revision TEXT,p_target_revision TEXT,p_replace BOOLEAN DEFAULT false) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public.profiles%ROWTYPE; source_year public.academic_years%ROWTYPE; target_year public.academic_years%ROWTYPE; source_state JSONB; target_state JSONB;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id=auth.uid() FOR SHARE;
  IF auth.uid() IS NULL OR actor.is_active IS DISTINCT FROM true OR actor.role IS NULL OR actor.role NOT IN ('admin','principal') THEN RAISE EXCEPTION 'Curriculum administrator required' USING ERRCODE='42501'; END IF;
  IF p_source IS NULL OR p_target IS NULL OR p_source=p_target THEN RAISE EXCEPTION 'Invalid clone years' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM public.academic_years WHERE id IN (p_source,p_target) ORDER BY id FOR UPDATE;
  source_year:=public.exam_curriculum_access(p_source,false); target_year:=public.exam_curriculum_access(p_target,true);
  IF source_year.start_date IS NULL OR target_year.start_date IS NULL OR source_year.start_date>=target_year.start_date THEN RAISE EXCEPTION 'An earlier source year is required' USING ERRCODE='22023'; END IF;
  source_state:=public.exam_curriculum_state(p_source); target_state:=public.exam_curriculum_state(p_target);
  IF p_source_revision IS DISTINCT FROM source_state->>'revision' OR p_target_revision IS DISTINCT FROM target_state->>'revision' THEN RAISE EXCEPTION 'Clone preview changed; reload' USING ERRCODE='40001'; END IF;
  IF jsonb_array_length(source_state->'subjects')=0 THEN RAISE EXCEPTION 'Source has no curriculum' USING ERRCODE='22023'; END IF;
  IF (jsonb_array_length(target_state->'subjects')>0 OR jsonb_array_length(target_state->'gradingScales')>0) AND p_replace IS DISTINCT FROM true THEN RAISE EXCEPTION 'Target already configured; confirm replacement' USING ERRCODE='40001'; END IF;
  DELETE FROM public.exam_subject_standards WHERE academic_year_id=p_target;
  DELETE FROM public.exam_grading_scales WHERE academic_year_id=p_target;
  -- Reuse save validation for legacy source data as well; replacement remains one transaction.
  PERFORM public.save_exam_curriculum(p_target,public.exam_curriculum_state(p_target)->>'revision',
    (SELECT COALESCE(jsonb_agg(value-'id'-'academic_year_id'-'created_at'),'[]') FROM jsonb_array_elements(source_state->'subjects')),
    (SELECT COALESCE(jsonb_agg(value-'id'-'academic_year_id'-'created_at'),'[]') FROM jsonb_array_elements(source_state->'gradingScales')));
  INSERT INTO public.audit_logs(user_id,school_id,action,type,target_table,details) VALUES(auth.uid(),target_year.school_id,'CURRICULUM_CLONED','info','exam_subject_standards',jsonb_build_object('source_year_id',p_source,'academic_year_id',p_target,'before',target_state,'after',public.exam_curriculum_state(p_target)));
  RETURN public.exam_curriculum_state(p_target);
END $$;

-- Retain the old signature safely for legacy callers: authenticated, school-scoped, empty target only.
CREATE OR REPLACE FUNCTION public.clone_exam_standards_to_year(p_source_year_id UUID,p_target_year_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active=true AND role IN ('admin','principal')) THEN RAISE EXCEPTION 'Curriculum administrator required' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.academic_years WHERE id IN (p_source_year_id,p_target_year_id) ORDER BY id FOR UPDATE;
  RETURN public.clone_exam_curriculum(p_source_year_id,p_target_year_id,public.exam_curriculum_state(p_source_year_id)->>'revision',public.exam_curriculum_state(p_target_year_id)->>'revision',false);
END $$;

-- Add school isolation to existing permissive policies without broadening access.
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['exam_subject_standards','exam_grading_scales'] LOOP
    EXECUTE format('CREATE POLICY curriculum_school_scope ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM public.academic_years y JOIN public.profiles p ON p.school_id=y.school_id WHERE y.id=academic_year_id AND p.id=auth.uid() AND p.is_active=true AND p.role IN (''teacher'',''admin'',''principal''))) WITH CHECK (EXISTS(SELECT 1 FROM public.academic_years y JOIN public.profiles p ON p.school_id=y.school_id WHERE y.id=academic_year_id AND p.id=auth.uid() AND p.is_active=true AND p.role IN (''admin'',''principal'') AND y.status NOT IN (''closed'',''archived'')))',t);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.exam_curriculum_state(UUID),public.exam_curriculum_access(UUID,BOOLEAN),public.exam_curriculum_write_lock(),public.exam_curriculum_workspace(UUID),public.save_exam_curriculum(UUID,TEXT,JSONB,JSONB,UUID[],UUID[],BOOLEAN),public.clone_exam_curriculum(UUID,UUID,TEXT,TEXT,BOOLEAN),public.clone_exam_standards_to_year(UUID,UUID) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.exam_curriculum_workspace(UUID),public.save_exam_curriculum(UUID,TEXT,JSONB,JSONB,UUID[],UUID[],BOOLEAN),public.clone_exam_curriculum(UUID,UUID,TEXT,TEXT,BOOLEAN),public.clone_exam_standards_to_year(UUID,UUID) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
