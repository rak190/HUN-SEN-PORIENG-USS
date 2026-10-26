-- Admin existing-record workspace. No registration, grade, health or study-plan rules are changed.
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public.students_official_id_normalized_unique') AND indisunique AND indisvalid) THEN
    RAISE EXCEPTION 'Apply migration 093 and resolve official-ID conflicts before migration 094';
  END IF;
END $$;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS registration_school_id TEXT REFERENCES public.schools(id);
CREATE INDEX IF NOT EXISTS students_registration_school_active ON public.students(registration_school_id,id) WHERE is_active=true;

-- Never infer a never-enrolled student's school from a browser value or an unrelated class.
CREATE OR REPLACE FUNCTION public.guard_student_registration_school()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    NEW.registration_school_id := NULL;
    IF auth.role()='authenticated' THEN
      SELECT school_id INTO NEW.registration_school_id FROM public.profiles
      WHERE id=auth.uid() AND role='admin' AND is_active=true;
    END IF;
  ELSIF auth.role() IN ('authenticated','service_role') AND NEW.registration_school_id IS DISTINCT FROM OLD.registration_school_id THEN
    RAISE EXCEPTION 'Registration school is protected provenance' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_student_registration_school ON public.students;
CREATE TRIGGER trg_student_registration_school BEFORE INSERT OR UPDATE OF registration_school_id ON public.students
FOR EACH ROW EXECUTE FUNCTION public.guard_student_registration_school();

CREATE OR REPLACE FUNCTION public._admin_student_school(p_year UUID,p_class UUID DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_school TEXT;
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' OR auth.uid() IS NULL THEN RAISE EXCEPTION 'Authenticated Admin required' USING ERRCODE='42501'; END IF;
  SELECT school_id INTO v_school FROM public.profiles WHERE id=auth.uid() AND role='admin' AND is_active=true FOR SHARE;
  IF NOT FOUND OR v_school IS NULL THEN RAISE EXCEPTION 'Active school-scoped Admin required' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.academic_years WHERE id=p_year AND school_id=v_school AND status='active' AND is_active=true FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Academic year is missing, locked or outside your school' USING ERRCODE='55000'; END IF;
  IF p_class IS NOT NULL THEN
    PERFORM 1 FROM public.classes WHERE id=p_class AND school_id=v_school AND academic_year_id=p_year AND is_archived=false FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid class/year/school context' USING ERRCODE='42501'; END IF;
  END IF;
  RETURN v_school;
END $$;
REVOKE ALL ON FUNCTION public._admin_student_school(UUID,UUID) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.admin_student_directory(
  p_year UUID,p_class UUID DEFAULT NULL,p_search TEXT DEFAULT '',p_unassigned BOOLEAN DEFAULT false,
  p_gender TEXT DEFAULT 'all',p_desk TEXT DEFAULT 'all',p_teacher TEXT DEFAULT 'all',
  p_page INT DEFAULT 1,p_page_size INT DEFAULT 50,p_editor BOOLEAN DEFAULT false
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_school TEXT; v_result JSONB; v_search TEXT;
BEGIN
  v_school := public._admin_student_school(p_year,p_class);
  IF p_page<1 OR p_page_size NOT BETWEEN 1 AND 500 OR p_page IS NULL OR p_page_size IS NULL OR length(p_search)>200 THEN RAISE EXCEPTION 'Invalid directory bounds' USING ERRCODE='22023'; END IF;
  IF p_editor AND (p_class IS NULL OR p_unassigned) THEN RAISE EXCEPTION 'Select a class for editing' USING ERRCODE='22023'; END IF;
  v_search := '%' || replace(replace(replace(COALESCE(p_search,''),'\','\\'),'%','\%'),'_','\_') || '%';
  WITH enrolled AS (
    SELECT s.id,s.student_id_number,s.full_name,s.english_name,s.gender,s.dob,s.student_phone,s.parent_phone,
      s.father_name,s.mother_name,s.guardian_phone,s.current_address,s.status,s.photo_url,s.is_active,
      e.id AS enrollment_id,e.class_id,e.desk_number,e.room_number,e.enrollment_status,
      c.name AS class_name,COALESCE(t.full_name,'មិនមាន') AS homeroom_teacher,c.teacher_id,
      'current_enrollment'::TEXT AS source
    FROM public.student_enrollments e JOIN public.classes c ON c.id=e.class_id JOIN public.students s ON s.id=e.student_id
    LEFT JOIN public.profiles t ON t.id=c.teacher_id
    WHERE e.academic_year_id=p_year AND c.academic_year_id=p_year AND c.school_id=v_school AND c.is_archived=false
      AND e.enrollment_status IN ('active','enrolled') AND s.is_active=true
  ), candidates AS (
    SELECT * FROM enrolled WHERE NOT p_unassigned
    UNION ALL
    SELECT s.id,s.student_id_number,s.full_name,s.english_name,s.gender,s.dob,s.student_phone,s.parent_phone,
      s.father_name,s.mother_name,s.guardian_phone,s.current_address,s.status,s.photo_url,s.is_active,
      NULL::UUID,NULL::UUID,NULL::TEXT,NULL::TEXT,NULL::TEXT,'គ្មានថ្នាក់ (ទិន្នន័យបឋម)'::TEXT,'មិនមាន'::TEXT,NULL::UUID,'unassigned_registration'::TEXT
    FROM public.students s WHERE p_unassigned AND s.is_active=true AND s.registration_school_id=v_school
      AND NOT EXISTS(SELECT 1 FROM public.student_enrollments e WHERE e.student_id=s.id)
  ), filtered AS (
    SELECT * FROM candidates r WHERE (p_class IS NULL OR r.class_id=p_class)
      AND (COALESCE(p_search,'')='' OR r.full_name ILIKE v_search OR r.english_name ILIKE v_search
        OR r.student_id_number ILIKE v_search OR r.class_name ILIKE v_search OR r.desk_number ILIKE v_search OR r.room_number ILIKE v_search)
      AND (p_gender='all' OR r.gender= p_gender OR (p_gender='M' AND r.gender='ប្រុស') OR (p_gender='F' AND r.gender='ស្រី'))
      AND (p_desk='all' OR (p_desk='assigned' AND NULLIF(r.desk_number,'') IS NOT NULL) OR (p_desk='unassigned' AND NULLIF(r.desk_number,'') IS NULL))
      AND (p_teacher='all' OR r.homeroom_teacher=p_teacher)
  ), paged AS (
    SELECT * FROM filtered ORDER BY full_name,id LIMIT p_page_size OFFSET ((p_page::BIGINT-1)*p_page_size)
  ) SELECT jsonb_build_object(
    'rows',COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY full_name,id) FROM paged r),'[]'::JSONB),
    'filtered_total',(SELECT count(*) FROM filtered),'total',(SELECT count(*) FROM enrolled),
    'female',(SELECT count(*) FROM enrolled WHERE gender IN ('F','ស្រី')),
    'male',(SELECT count(*) FROM enrolled WHERE gender IN ('M','ប្រុស')),
    'missing_ids',(SELECT count(*) FROM enrolled WHERE NULLIF(btrim(student_id_number),'') IS NULL)
  ) INTO v_result;
  RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION public.admin_patch_students(p_class UUID,p_year UUID,p_updates JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_school TEXT; v_item JSONB; v_student public.students%ROWTYPE; v_enrollment public.student_enrollments%ROWTYPE;
  v_changes JSONB; v_original JSONB; v_patch JSONB; v_seats JSONB; v_key TEXT; v_value JSONB; v_current JSONB;
  v_id UUID; v_set TEXT; v_conflicts JSONB:='[]'; v_count INT:=0;
  v_allowed TEXT[]:=ARRAY['student_id_number','full_name','english_name','gender','dob','desk_number','room_number',
    'student_phone','parent_phone','father_name','mother_name','guardian_phone','current_address','status'];
BEGIN
  v_school := public._admin_student_school(p_year,p_class);
  IF p_class IS NULL OR jsonb_typeof(p_updates) IS DISTINCT FROM 'array' OR jsonb_array_length(p_updates) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Expected class and 1 to 500 student patches' USING ERRCODE='22023'; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_updates))<>(SELECT count(DISTINCT value->>'studentId') FROM jsonb_array_elements(p_updates)) THEN RAISE EXCEPTION 'Duplicate or missing student UUID' USING ERRCODE='22023'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_updates) ORDER BY value->>'studentId' LOOP
    v_id := (v_item->>'studentId')::UUID;
    SELECT * INTO v_student FROM public.students WHERE id=v_id AND is_active=true FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Student is missing or inactive' USING ERRCODE='42501'; END IF;
    SELECT * INTO v_enrollment FROM public.student_enrollments WHERE student_id=v_id AND class_id=p_class
      AND academic_year_id=p_year AND enrollment_status IN ('active','enrolled') FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Student is not actively enrolled in selected class/year' USING ERRCODE='42501'; END IF;
    v_changes:=v_item->'changes';v_original:=v_item->'original';
    IF jsonb_typeof(v_changes) IS DISTINCT FROM 'object' OR v_changes='{}'::JSONB OR jsonb_typeof(v_original) IS DISTINCT FROM 'object'
      OR EXISTS(SELECT 1 FROM jsonb_object_keys(v_original) k WHERE NOT(v_changes ? k)) THEN RAISE EXCEPTION 'Invalid patch baseline' USING ERRCODE='22023'; END IF;
    FOR v_key,v_value IN SELECT * FROM jsonb_each(v_changes) LOOP
      IF NOT(v_key=ANY(v_allowed)) OR NOT(v_original ? v_key) THEN RAISE EXCEPTION 'Protected field or missing original: %',v_key USING ERRCODE='42501'; END IF;
      IF jsonb_typeof(v_value)='string' THEN v_value:=to_jsonb(btrim(v_value#>>'{}')); END IF;
      IF jsonb_typeof(v_value) NOT IN ('string','null') OR length(v_value#>>'{}')>4000 THEN RAISE EXCEPTION 'Invalid field value: %',v_key USING ERRCODE='22023'; END IF;
      IF v_key IN ('full_name','gender','status') AND (v_value='null'::JSONB OR NULLIF(btrim(v_value#>>'{}'),'') IS NULL) THEN RAISE EXCEPTION 'Required field: %',v_key USING ERRCODE='22023'; END IF;
      IF v_key='gender' AND (v_value#>>'{}') NOT IN ('M','F') THEN RAISE EXCEPTION 'Invalid gender' USING ERRCODE='22023'; END IF;
      IF v_key='status' AND (v_value#>>'{}') NOT IN ('new','repeater','transfer') THEN RAISE EXCEPTION 'Invalid registration type' USING ERRCODE='22023'; END IF;
      IF v_key IN ('full_name','english_name','father_name','mother_name') AND length(v_value#>>'{}')>100 THEN RAISE EXCEPTION 'Name too long' USING ERRCODE='22023'; END IF;
      IF v_key='student_id_number' AND (length(v_value#>>'{}')>50 OR (NULLIF(btrim(v_student.student_id_number),'') IS NOT NULL AND NULLIF(btrim(v_value#>>'{}'),'') IS NULL)) THEN RAISE EXCEPTION 'An assigned official ID cannot be cleared' USING ERRCODE='22023'; END IF;
      IF v_key IN ('desk_number','room_number') AND length(v_value#>>'{}')>20 THEN RAISE EXCEPTION 'Seating value too long' USING ERRCODE='22023'; END IF;
      IF v_key LIKE '%phone' AND length(v_value#>>'{}')>30 THEN RAISE EXCEPTION 'Phone value too long' USING ERRCODE='22023'; END IF;
      IF v_key='dob' AND v_value<>'null'::JSONB THEN
        IF (v_value#>>'{}') !~ '^\d{4}-\d{2}-\d{2}$' OR (v_value#>>'{}')::DATE>(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Phnom_Penh')::DATE THEN RAISE EXCEPTION 'Invalid date of birth' USING ERRCODE='22023'; END IF;
      END IF;
      v_current:=CASE WHEN v_key IN ('desk_number','room_number') THEN to_jsonb(v_enrollment)->v_key ELSE to_jsonb(v_student)->v_key END;
      IF COALESCE(NULLIF(v_current,'""'::JSONB),'null'::JSONB) IS DISTINCT FROM COALESCE(NULLIF(v_original->v_key,'""'::JSONB),'null'::JSONB)
        AND COALESCE(NULLIF(v_current,'""'::JSONB),'null'::JSONB) IS DISTINCT FROM COALESCE(NULLIF(v_value,'""'::JSONB),'null'::JSONB) THEN
        v_conflicts:=v_conflicts||jsonb_build_array(jsonb_build_object('studentId',v_id,'field',v_key));
      END IF;
    END LOOP;
  END LOOP;
  IF jsonb_array_length(v_conflicts)>0 THEN RAISE EXCEPTION 'ទិន្នន័យបានកែប្រែដោយអ្នកផ្សេង។ សូមផ្ទុកថ្មី និងពិនិត្យការកែប្រែរបស់អ្នក។' USING ERRCODE='40001',DETAIL=v_conflicts::TEXT; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_updates) ORDER BY value->>'studentId' LOOP
    v_id:=(v_item->>'studentId')::UUID;v_changes:=v_item->'changes';v_patch:='{}';v_seats:='{}';
    FOR v_key,v_value IN SELECT * FROM jsonb_each(v_changes) LOOP
      IF jsonb_typeof(v_value)='string' THEN v_value:=to_jsonb(btrim(v_value#>>'{}')); END IF;
      IF v_key IN ('desk_number','room_number') THEN v_seats:=v_seats||jsonb_build_object(v_key,NULLIF(v_value,'""'::JSONB));
      ELSE v_patch:=v_patch||jsonb_build_object(v_key,NULLIF(v_value,'""'::JSONB)); END IF;
    END LOOP;
    IF v_patch<>'{}'::JSONB THEN
      IF v_patch ? 'dob' THEN v_patch:=v_patch||jsonb_build_object('date_of_birth',v_patch->'dob'); END IF;
      SELECT string_agg(format('%I = patch.%I',key,key),',') INTO v_set FROM jsonb_object_keys(v_patch) k(key);
      EXECUTE 'UPDATE public.students s SET '||v_set||', updated_at=now() FROM jsonb_populate_record(NULL::public.students,$1) patch WHERE s.id=$2' USING v_patch,v_id;
      IF v_patch ? 'dob' THEN UPDATE public.students SET age=CASE WHEN dob IS NULL THEN NULL ELSE EXTRACT(YEAR FROM age((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Phnom_Penh')::DATE,dob))::INT END WHERE id=v_id; END IF;
    END IF;
    IF v_seats<>'{}'::JSONB THEN
      UPDATE public.student_enrollments SET desk_number=CASE WHEN v_seats ? 'desk_number' THEN v_seats->>'desk_number' ELSE desk_number END,
        room_number=CASE WHEN v_seats ? 'room_number' THEN v_seats->>'room_number' ELSE room_number END,updated_at=now()
      WHERE student_id=v_id AND class_id=p_class AND academic_year_id=p_year;
    END IF;
    v_count:=v_count+1;
  END LOOP;
  INSERT INTO public.audit_logs(user_id,school_id,action,type,target_table,details)
  VALUES(auth.uid(),v_school,'ADMIN_STUDENT_GRID_SAVE','info','students',jsonb_build_object('class_id',p_class,'academic_year_id',p_year,'count',v_count,'fields',(SELECT jsonb_agg(jsonb_build_object('studentId',value->>'studentId','fields',(SELECT jsonb_agg(key) FROM jsonb_object_keys(value->'changes') k(key)))) FROM jsonb_array_elements(p_updates))));
  RETURN jsonb_build_object('success',true,'updated_count',v_count);
END $$;

-- Reuse the existing class-operation RPC and signature; preserve current-year enrollment UUIDs.
CREATE OR REPLACE FUNCTION public.batch_reassign_class_atomic(p_student_ids UUID[],p_target_class_id UUID,p_academic_year_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_profile public.profiles%ROWTYPE;v_target public.classes%ROWTYPE;v_year public.academic_years%ROWTYPE;
  v_student public.students%ROWTYPE;v_enrollment public.student_enrollments%ROWTYPE;v_id UUID;v_count INT:=0;v_moves JSONB:='[]';
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' OR auth.uid() IS NULL THEN RAISE EXCEPTION 'Authenticated session required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id=auth.uid() FOR SHARE;
  IF NOT FOUND OR v_profile.is_active IS DISTINCT FROM true OR v_profile.role IS NULL OR v_profile.role NOT IN ('admin','principal') OR v_profile.school_id IS NULL THEN RAISE EXCEPTION 'Active authorized profile required' USING ERRCODE='42501'; END IF;
  IF p_student_ids IS NULL OR cardinality(p_student_ids) NOT BETWEEN 1 AND 500 OR cardinality(p_student_ids)<>(SELECT count(DISTINCT id) FROM unnest(p_student_ids) id) THEN RAISE EXCEPTION 'Expected distinct student UUIDs' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_target FROM public.classes WHERE id=p_target_class_id FOR SHARE;
  IF NOT FOUND OR v_target.is_archived IS DISTINCT FROM false OR v_target.academic_year_id IS DISTINCT FROM p_academic_year_id OR v_target.school_id IS DISTINCT FROM v_profile.school_id THEN RAISE EXCEPTION 'Invalid destination class/year/school' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_year FROM public.academic_years WHERE id=p_academic_year_id FOR SHARE;
  IF NOT FOUND OR v_year.status IS DISTINCT FROM 'active' OR v_year.is_active IS DISTINCT FROM true OR v_year.school_id IS DISTINCT FROM v_profile.school_id THEN RAISE EXCEPTION 'Academic year is locked or invalid' USING ERRCODE='55000'; END IF;
  FOR v_id IN SELECT id FROM unnest(p_student_ids) id ORDER BY id LOOP
    SELECT * INTO v_student FROM public.students WHERE id=v_id AND is_active=true FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Student missing or inactive' USING ERRCODE='42501'; END IF;
    SELECT * INTO v_enrollment FROM public.student_enrollments WHERE student_id=v_id AND academic_year_id=p_academic_year_id FOR UPDATE;
    IF FOUND THEN
      IF v_enrollment.enrollment_status NOT IN ('active','enrolled') OR v_enrollment.enrollment_status IS NULL
        OR NOT EXISTS(SELECT 1 FROM public.classes WHERE id=v_enrollment.class_id AND school_id=v_profile.school_id AND academic_year_id=p_academic_year_id AND is_archived=false) THEN RAISE EXCEPTION 'Invalid source enrollment' USING ERRCODE='42501'; END IF;
      v_moves:=v_moves||jsonb_build_array(jsonb_build_object('student_id',v_id,'from_class',v_enrollment.class_id,'to_class',p_target_class_id));
      IF v_enrollment.class_id IS DISTINCT FROM p_target_class_id THEN
        UPDATE public.student_enrollments SET class_id=p_target_class_id,updated_at=now() WHERE id=v_enrollment.id;
        v_count:=v_count+1;
      END IF;
    ELSE
      IF v_profile.role<>'admin' OR v_student.registration_school_id IS DISTINCT FROM v_profile.school_id
        OR EXISTS(SELECT 1 FROM public.student_enrollments WHERE student_id=v_id) THEN RAISE EXCEPTION 'Unassigned student requires verified registration provenance; historical students use enrollment/promotion workflows' USING ERRCODE='42501'; END IF;
      INSERT INTO public.student_enrollments(student_id,class_id,academic_year_id,enrollment_status,year_result,updated_at)
      VALUES(v_id,p_target_class_id,p_academic_year_id,'active','enrolled',now());
      v_moves:=v_moves||jsonb_build_array(jsonb_build_object('student_id',v_id,'from_class',NULL,'to_class',p_target_class_id));v_count:=v_count+1;
    END IF;
  END LOOP;
  INSERT INTO public.audit_logs(user_id,school_id,action,type,target_table,details)
  VALUES(auth.uid(),v_profile.school_id,'batch_reassign_class','info','student_enrollments',jsonb_build_object('academic_year_id',p_academic_year_id,'moves',v_moves,'count',v_count));
  RETURN jsonb_build_object('success',true,'reassigned_count',v_count,'source_class_ids',(SELECT COALESCE(jsonb_agg(DISTINCT value->'from_class') FILTER(WHERE value->'from_class'<>'null'::JSONB),'[]'::JSONB) FROM jsonb_array_elements(v_moves)));
END $$;

REVOKE ALL ON FUNCTION public.admin_student_directory(UUID,UUID,TEXT,BOOLEAN,TEXT,TEXT,TEXT,INT,INT,BOOLEAN),public.admin_patch_students(UUID,UUID,JSONB) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.admin_student_directory(UUID,UUID,TEXT,BOOLEAN,TEXT,TEXT,TEXT,INT,INT,BOOLEAN),public.admin_patch_students(UUID,UUID,JSONB) TO authenticated;
REVOKE ALL ON FUNCTION public.batch_reassign_class_atomic(UUID[],UUID,UUID) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.batch_reassign_class_atomic(UUID[],UUID,UUID) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
