-- Change-only study-plan writes. No grading, enrollment, master data or published results are modified.
BEGIN;
CREATE OR REPLACE FUNCTION public.patch_student_study_plans_atomic(p_class_id UUID,p_academic_year_id UUID,p_patches JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_actor UUID:=auth.uid(); v_profile public.profiles%ROWTYPE; v_class public.classes%ROWTYPE; v_year public.academic_years%ROWTYPE;
  v_student UUID; v_item JSONB; v_targets JSONB; v_path TEXT[]; v_subject TEXT; v_field TEXT; v_previous TEXT; v_current TEXT; v_new TEXT;
  v_result JSONB:='{}'; v_conflicts JSONB:='[]'; v_aliases TEXT[]; v_period TEXT;
BEGIN
  IF v_actor IS NULL OR auth.role() IS DISTINCT FROM 'authenticated' THEN RAISE EXCEPTION 'Authenticated session required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id=v_actor FOR SHARE;
  IF NOT FOUND OR v_profile.is_active IS DISTINCT FROM true OR v_profile.school_id IS NULL OR v_profile.role IS NULL OR v_profile.role NOT IN ('teacher','admin','principal') THEN RAISE EXCEPTION 'Active authorized profile required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_class FROM public.classes WHERE id=p_class_id FOR SHARE;
  IF NOT FOUND OR v_class.is_archived IS DISTINCT FROM false OR v_class.school_id IS DISTINCT FROM v_profile.school_id
    OR v_class.academic_year_id IS DISTINCT FROM p_academic_year_id OR (v_profile.role='teacher' AND v_class.teacher_id IS DISTINCT FROM v_actor) THEN RAISE EXCEPTION 'Class access denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_year FROM public.academic_years WHERE id=p_academic_year_id FOR SHARE;
  IF NOT FOUND OR v_year.school_id IS DISTINCT FROM v_class.school_id OR v_year.status IS DISTINCT FROM 'active' OR v_year.is_active IS DISTINCT FROM true THEN RAISE EXCEPTION 'Academic year is inactive or locked' USING ERRCODE='55000'; END IF;
  IF jsonb_typeof(p_patches) IS DISTINCT FROM 'array' OR jsonb_array_length(p_patches) NOT BETWEEN 1 AND 27600 THEN RAISE EXCEPTION 'Expected 1 to 27600 field patches' USING ERRCODE='22023'; END IF;
  IF (SELECT count(DISTINCT value->>'studentId') FROM jsonb_array_elements(p_patches))>120
    OR (SELECT count(*) FROM jsonb_array_elements(p_patches))<>(SELECT count(DISTINCT (value->>'studentId',value->>'subjectId',value->>'path')) FROM jsonb_array_elements(p_patches)) THEN RAISE EXCEPTION 'Duplicate paths or excessive class size' USING ERRCODE='22023'; END IF;
  FOR v_student IN SELECT DISTINCT (value->>'studentId')::UUID FROM jsonb_array_elements(p_patches) ORDER BY 1 LOOP
    -- A stable master lock serializes creation when no study-plan row exists yet.
    PERFORM 1 FROM public.students WHERE id=v_student AND is_active=true FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Student inactive or missing' USING ERRCODE='23503'; END IF;
    PERFORM 1 FROM public.student_enrollments WHERE student_id=v_student AND class_id=p_class_id AND academic_year_id=p_academic_year_id AND enrollment_status IN ('active','enrolled') FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Student not actively enrolled in selected class/year' USING ERRCODE='23503'; END IF;
    SELECT subject_targets INTO v_targets FROM public.student_study_plans WHERE student_id=v_student AND academic_year_id=p_academic_year_id FOR UPDATE;
    v_targets:=COALESCE(v_targets,'{}');
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_patches) WHERE (value->>'studentId')::UUID=v_student LOOP
      IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' OR NOT(v_item ?& ARRAY['studentId','subjectId','path','previousGrade','newGrade'])
        OR EXISTS(SELECT 1 FROM jsonb_object_keys(v_item) k WHERE NOT(k=ANY(ARRAY['studentId','subjectId','path','previousGrade','newGrade']))) THEN RAISE EXCEPTION 'Invalid patch object' USING ERRCODE='22023'; END IF;
      v_subject:=v_item->>'subjectId';v_field:=v_item->>'path';v_new:=v_item->>'newGrade';v_previous:=COALESCE(v_item->>'previousGrade','');
      IF v_subject IS NULL OR v_subject NOT IN ('khmer','math','foreign_lang','physics','chemistry','biology','earth_science','morals','history','geography')
        OR v_field IS NULL OR v_field !~ '^(initial|end_plan|end_actual|(plan|actual)\.(nov|dec|jan|feb|mar|apr|may|jun|jul|aug))$'
        OR jsonb_typeof(v_item->'newGrade') IS DISTINCT FROM 'string' OR v_new NOT IN ('','A','B','C','D','E','F')
        OR jsonb_typeof(v_item->'previousGrade') NOT IN ('string','null') OR v_previous NOT IN ('','A','B','C','D','E','F') THEN RAISE EXCEPTION 'Invalid subject/path/grade' USING ERRCODE='22023'; END IF;
      v_path:=ARRAY[v_subject]||string_to_array(v_field,'.');
      IF v_field='end_actual' OR v_field LIKE 'actual.%' THEN
        v_period:=CASE WHEN v_field='end_actual' THEN 'annual' ELSE split_part(v_field,'.',2) END;
        v_aliases:=CASE v_subject WHEN 'foreign_lang' THEN ARRAY['foreign_lang','english','eng'] WHEN 'earth_science' THEN ARRAY['earth_science','earth'] WHEN 'morals' THEN ARRAY['morals','civics'] ELSE ARRAY[v_subject] END;
        IF EXISTS(SELECT 1 FROM public.grades g WHERE g.student_id=v_student AND g.class_id=p_class_id AND g.academic_year_id=p_academic_year_id AND g.status='published' AND g.period=v_period
          AND EXISTS(SELECT 1 FROM unnest(v_aliases) alias WHERE g.scores ? alias AND g.scores->alias<>'null'::JSONB)) THEN RAISE EXCEPTION 'Published actual grade is locked' USING ERRCODE='42501'; END IF;
      END IF;
      v_current:=COALESCE(v_targets#>>v_path,'');
      IF v_current IS DISTINCT FROM v_previous AND v_current IS DISTINCT FROM v_new THEN
        v_conflicts:=v_conflicts||jsonb_build_array(jsonb_build_object('studentId',v_student,'subjectId',v_subject,'path',v_field,'currentGrade',v_current));
      END IF;
      -- Initialize only missing intermediate objects, preserving every unrelated JSON property.
      IF NOT(v_targets ? v_subject) THEN v_targets:=jsonb_set(v_targets,ARRAY[v_subject],'{}'); END IF;
      IF cardinality(v_path)=3 AND NOT(COALESCE(v_targets->v_subject,'{}') ? v_path[2]) THEN v_targets:=jsonb_set(v_targets,ARRAY[v_subject,v_path[2]],'{}'); END IF;
      v_targets:=jsonb_set(v_targets,v_path,to_jsonb(v_new),true);
    END LOOP;
    INSERT INTO public.student_study_plans(student_id,class_id,academic_year_id,subject_targets,updated_at)
    VALUES(v_student,p_class_id,p_academic_year_id,v_targets,now())
    ON CONFLICT(student_id,academic_year_id) DO UPDATE SET subject_targets=EXCLUDED.subject_targets,class_id=EXCLUDED.class_id,updated_at=now();
    v_result:=v_result||jsonb_build_object(v_student::TEXT,v_targets);
  END LOOP;
  IF jsonb_array_length(v_conflicts)>0 THEN RAISE EXCEPTION 'Study plan changed since loading; review current grades before retrying' USING ERRCODE='40001',DETAIL=v_conflicts::TEXT; END IF;
  INSERT INTO public.audit_logs(user_id,school_id,action,type,target_table,details)
  VALUES(v_actor,v_class.school_id,'STUDY_PLAN_FIELD_PATCH','info','student_study_plans',jsonb_build_object('class_id',p_class_id,'academic_year_id',p_academic_year_id,'cell_count',jsonb_array_length(p_patches),'student_count',(SELECT count(*) FROM jsonb_object_keys(v_result)),'paths',(SELECT jsonb_agg(DISTINCT value->>'path') FROM jsonb_array_elements(p_patches))));
  RETURN jsonb_build_object('success',true,'plans',v_result,'cell_count',jsonb_array_length(p_patches),'student_count',(SELECT count(*) FROM jsonb_object_keys(v_result)));
END $$;
REVOKE ALL ON FUNCTION public.patch_student_study_plans_atomic(UUID,UUID,JSONB) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.patch_student_study_plans_atomic(UUID,UUID,JSONB) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
