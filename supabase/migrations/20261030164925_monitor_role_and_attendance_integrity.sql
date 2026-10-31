-- Additive Monitor repair. Historical enrollments/attendance and grading rules are unchanged.
BEGIN;
-- Attendance entry already carries root-cause information, but the deployed table only had note.
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS root_cause TEXT;
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('teacher','principal','admin','monitor'));

CREATE UNIQUE INDEX classes_one_monitor_per_year ON public.classes(monitor_id,academic_year_id)
WHERE monitor_id IS NOT NULL AND is_archived=false;

CREATE OR REPLACE FUNCTION public.monitor_assignment_guard() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public.profiles%ROWTYPE; target public.profiles%ROWTYPE; y public.academic_years%ROWTYPE;
BEGIN
  IF TG_OP='UPDATE' AND NEW.monitor_id IS NULL AND OLD.monitor_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND NEW.monitor_id IS NOT DISTINCT FROM OLD.monitor_id AND NEW.school_id IS NOT DISTINCT FROM OLD.school_id AND NEW.academic_year_id IS NOT DISTINCT FROM OLD.academic_year_id THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' AND NEW.monitor_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO actor FROM public.profiles WHERE id=auth.uid();
  IF auth.uid() IS NULL OR actor.is_active IS DISTINCT FROM true OR actor.role IS NULL OR actor.role NOT IN ('admin','principal') OR actor.school_id IS DISTINCT FROM NEW.school_id THEN RAISE EXCEPTION 'Monitor assignment requires an active school administrator' USING ERRCODE='42501'; END IF;
  IF current_setting('app.monitor_assignment_rpc',true) IS DISTINCT FROM 'on' THEN RAISE EXCEPTION 'Use assign_class_monitor with the previous assignment' USING ERRCODE='42501'; END IF;
  SELECT * INTO y FROM public.academic_years WHERE id=NEW.academic_year_id;
  IF y.id IS NULL OR y.school_id IS DISTINCT FROM actor.school_id OR y.is_active IS DISTINCT FROM true OR y.status IS DISTINCT FROM 'active' THEN RAISE EXCEPTION 'Monitor assignment requires an active academic year' USING ERRCODE='55000'; END IF;
  IF NEW.monitor_id IS NOT NULL THEN
    SELECT * INTO target FROM public.profiles WHERE id=NEW.monitor_id FOR SHARE;
    IF target.id IS NULL OR target.role IS DISTINCT FROM 'monitor' OR target.is_active IS DISTINCT FROM true OR target.school_id IS DISTINCT FROM NEW.school_id THEN RAISE EXCEPTION 'Eligible active school monitor required' USING ERRCODE='42501'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER classes_monitor_assignment_guard BEFORE INSERT OR UPDATE OF monitor_id,school_id,academic_year_id ON public.classes FOR EACH ROW EXECUTE FUNCTION public.monitor_assignment_guard();

CREATE OR REPLACE FUNCTION public.assign_class_monitor(p_class_id UUID,p_year_id UUID,p_monitor_id UUID,p_previous_monitor_id UUID,p_previous_class_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public.profiles%ROWTYPE; c public.classes%ROWTYPE; other_class UUID; previous_flag TEXT:=current_setting('app.monitor_assignment_rpc',true);
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id=auth.uid() FOR SHARE;
  IF auth.uid() IS NULL OR auth.role() IS DISTINCT FROM 'authenticated' OR actor.is_active IS DISTINCT FROM true OR actor.role IS NULL OR actor.role NOT IN ('admin','principal') OR actor.school_id IS NULL THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501'; END IF;
  -- Serialize the very small assignment workload per year, including swaps and direct RPC retries.
  PERFORM pg_advisory_xact_lock(hashtextextended('monitor-assignment:'||p_year_id::TEXT,0));
  PERFORM 1 FROM public.classes WHERE id IN (p_class_id,p_previous_class_id) ORDER BY id FOR UPDATE;
  SELECT * INTO c FROM public.classes WHERE id=p_class_id;
  IF c.id IS NULL OR c.school_id IS DISTINCT FROM actor.school_id OR c.academic_year_id IS DISTINCT FROM p_year_id OR c.is_archived IS DISTINCT FROM false THEN RAISE EXCEPTION 'Class context denied' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.academic_years WHERE id=p_year_id AND school_id=actor.school_id AND is_active=true AND status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Academic year locked' USING ERRCODE='55000'; END IF;
  IF c.monitor_id IS DISTINCT FROM p_previous_monitor_id THEN RAISE EXCEPTION 'Monitor assignment changed; reload before replacing' USING ERRCODE='40001'; END IF;
  PERFORM set_config('app.monitor_assignment_rpc','on',true);
  IF p_monitor_id IS NOT NULL THEN
    PERFORM 1 FROM public.profiles WHERE id=p_monitor_id AND role='monitor' AND is_active=true AND school_id=actor.school_id FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Eligible active school monitor required' USING ERRCODE='42501'; END IF;
    SELECT id INTO other_class FROM public.classes WHERE monitor_id=p_monitor_id AND academic_year_id=p_year_id AND is_archived=false AND id<>p_class_id;
    IF other_class IS NOT NULL THEN
      IF other_class IS DISTINCT FROM p_previous_class_id THEN RAISE EXCEPTION 'Monitor already assigned; explicitly confirm the previous class' USING ERRCODE='23505'; END IF;
      UPDATE public.classes SET monitor_id=NULL WHERE id=other_class AND school_id=actor.school_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Previous class denied' USING ERRCODE='42501'; END IF;
    ELSIF p_previous_class_id IS NOT NULL THEN RAISE EXCEPTION 'Previous class changed; reload' USING ERRCODE='40001'; END IF;
  ELSIF p_previous_class_id IS NOT NULL THEN RAISE EXCEPTION 'Invalid previous class' USING ERRCODE='22023'; END IF;
  UPDATE public.classes SET monitor_id=p_monitor_id WHERE id=p_class_id;
  INSERT INTO public.audit_logs(user_id,school_id,action,type,target_table,details) VALUES(actor.id,actor.school_id,'MONITOR_CLASS_ASSIGNMENT','info','classes',jsonb_build_object('class_id',p_class_id,'academic_year_id',p_year_id,'previous_monitor_id',p_previous_monitor_id,'monitor_id',p_monitor_id,'previous_class_id',other_class));
  PERFORM set_config('app.monitor_assignment_rpc',COALESCE(previous_flag,''),true);
  RETURN jsonb_build_object('success',true,'class_id',p_class_id,'monitor_id',p_monitor_id);
END $$;

CREATE OR REPLACE FUNCTION public.provision_school_profile(p_auth_id UUID,p_input JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public.profiles%ROWTYPE; school_code TEXT; assigned_class public.classes%ROWTYPE; new_role TEXT:=p_input->>'role';
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id=auth.uid() FOR SHARE;
  IF auth.uid() IS NULL OR auth.role() IS DISTINCT FROM 'authenticated' OR actor.is_active IS DISTINCT FROM true OR actor.role IS NULL OR actor.role NOT IN ('admin','principal') OR actor.school_id IS NULL THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501'; END IF;
  IF new_role IS NULL OR new_role NOT IN ('teacher','principal','admin','monitor') OR (actor.role='principal' AND new_role IN ('admin','principal')) THEN RAISE EXCEPTION 'Role denied' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p_input) IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_input) k WHERE k NOT IN ('username','fullName','role','phone','subject','monitorClassId','previousMonitorId'))
    OR COALESCE(p_input->>'username','') !~ '^[a-z0-9._]{3,100}$' OR length(trim(COALESCE(p_input->>'fullName',''))) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Invalid profile fields' USING ERRCODE='22023'; END IF;
  -- Auth must already exist, and must be the account this request just provisioned.
  PERFORM 1 FROM auth.users WHERE id=p_auth_id AND lower(email)=lower(p_input->>'username')||'@kruai.app' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auth identity mismatch' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id=p_auth_id) THEN RAISE EXCEPTION 'Profile already exists' USING ERRCODE='23505'; END IF;
  SELECT code INTO school_code FROM public.schools WHERE id=actor.school_id;
  IF school_code IS NULL THEN RAISE EXCEPTION 'School missing' USING ERRCODE='23503'; END IF;
  INSERT INTO public.profiles(id,username,full_name,role,school_id,school_code,phone,subject,is_active,is_archived)
  VALUES(p_auth_id,p_input->>'username',trim(p_input->>'fullName'),new_role,actor.school_id,school_code,NULLIF(p_input->>'phone',''),NULLIF(p_input->>'subject',''),true,false);
  IF NULLIF(p_input->>'monitorClassId','') IS NOT NULL THEN
    IF new_role<>'monitor' THEN RAISE EXCEPTION 'Only monitors receive monitor assignments' USING ERRCODE='22023'; END IF;
    SELECT * INTO assigned_class FROM public.classes WHERE id=(p_input->>'monitorClassId')::UUID;
    PERFORM public.assign_class_monitor(assigned_class.id,assigned_class.academic_year_id,p_auth_id,NULLIF(p_input->>'previousMonitorId','')::UUID);
  END IF;
  INSERT INTO public.audit_logs(user_id,school_id,action,type,target_table,details) VALUES(actor.id,actor.school_id,'SCHOOL_ACCOUNT_CREATED','info','profiles',jsonb_build_object('profile_id',p_auth_id,'role',new_role));
  RETURN jsonb_build_object('success',true,'id',p_auth_id,'school',school_code);
END $$;

CREATE OR REPLACE FUNCTION public.attendance_class_access(p_class_id UUID,p_year_id UUID,p_write BOOLEAN)
RETURNS public.classes LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public.profiles%ROWTYPE; c public.classes%ROWTYPE; y public.academic_years%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id=auth.uid() FOR SHARE;
  IF auth.uid() IS NULL OR auth.role() IS DISTINCT FROM 'authenticated' OR actor.is_active IS DISTINCT FROM true OR actor.school_id IS NULL OR actor.role IS NULL OR actor.role NOT IN ('admin','principal','teacher','monitor') THEN RAISE EXCEPTION 'Active authenticated profile required' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM public.classes WHERE id=p_class_id FOR SHARE;
  IF c.id IS NULL OR c.is_archived IS DISTINCT FROM false OR c.school_id IS DISTINCT FROM actor.school_id OR c.academic_year_id IS DISTINCT FROM p_year_id
    OR (actor.role='monitor' AND c.monitor_id IS DISTINCT FROM actor.id) OR (actor.role='teacher' AND c.teacher_id IS DISTINCT FROM actor.id) THEN RAISE EXCEPTION 'Attendance class context denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO y FROM public.academic_years WHERE id=p_year_id FOR SHARE;
  IF y.id IS NULL OR y.school_id IS DISTINCT FROM c.school_id THEN RAISE EXCEPTION 'Year context denied' USING ERRCODE='42501'; END IF;
  IF (p_write OR actor.role='monitor') AND (y.status IS DISTINCT FROM 'active' OR y.is_active IS DISTINCT FROM true) THEN RAISE EXCEPTION 'Academic year locked' USING ERRCODE='55000'; END IF;
  RETURN c;
END $$;

-- Existing Monitor pages used Monday-Friday. Centralize that rule; no holiday calendar exists in this schema.
CREATE OR REPLACE FUNCTION public.attendance_school_day(p_date DATE,p_year_id UUID) RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.academic_years y WHERE y.id=p_year_id AND p_date BETWEEN y.start_date AND y.end_date AND extract(isodow FROM p_date) BETWEEN 1 AND 5)
$$;

CREATE OR REPLACE FUNCTION public.attendance_workspace(p_class_id UUID,p_year_id UUID,p_date DATE)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.classes%ROWTYPE; today DATE:=(now() AT TIME ZONE 'Asia/Phnom_Penh')::date; roster JSONB; missing JSONB;
BEGIN
  c:=public.attendance_class_access(p_class_id,p_year_id,false);
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',s.id,'name',s.full_name,'gender',s.gender) ORDER BY s.full_name,s.id),'[]') INTO roster
  FROM public.students s WHERE s.is_active=true AND EXISTS(SELECT 1 FROM public.student_enrollments e WHERE e.student_id=s.id AND e.class_id=c.id AND e.academic_year_id=p_year_id AND e.enrollment_status IN ('active','enrolled'));
  SELECT COALESCE(jsonb_agg(work_date::DATE ORDER BY work_date DESC),'[]') INTO missing FROM generate_series(today-7,today-1,interval '1 day') AS dates(work_date)
  WHERE public.attendance_school_day(work_date::DATE,p_year_id) AND jsonb_array_length(roster)>0 AND EXISTS(
    SELECT 1 FROM jsonb_array_elements(roster) s WHERE NOT EXISTS(SELECT 1 FROM public.attendance_records a WHERE a.class_id=c.id AND a.academic_year_id=p_year_id AND a.date=work_date::DATE AND a.student_id=(s->>'id')::UUID));
  RETURN jsonb_build_object('students',roster,'records',COALESCE((SELECT jsonb_agg(jsonb_build_object('student_id',a.student_id,'status',a.status,'updated_at',a.updated_at,'root_cause',a.root_cause)) FROM public.attendance_records a WHERE a.class_id=c.id AND a.academic_year_id=p_year_id AND a.date=p_date),'[]'),
    'missingDays',missing,'canRecord',p_date<=today AND EXISTS(SELECT 1 FROM public.academic_years y WHERE y.id=p_year_id AND p_date BETWEEN y.start_date AND y.end_date),'today',today);
END $$;

CREATE OR REPLACE FUNCTION public.attendance_school_dates(p_class_id UUID,p_year_id UUID,p_from DATE,p_to DATE)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM public.attendance_class_access(p_class_id,p_year_id,false);
  IF p_from IS NULL OR p_to IS NULL OR p_to<p_from OR p_to-p_from>366 THEN RAISE EXCEPTION 'Invalid attendance date range' USING ERRCODE='22023'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(work_date::DATE ORDER BY work_date) FROM generate_series(p_from,p_to,interval '1 day') AS dates(work_date)
    WHERE work_date::DATE<=(now() AT TIME ZONE 'Asia/Phnom_Penh')::DATE AND public.attendance_school_day(work_date::DATE,p_year_id)),'[]');
END $$;

CREATE OR REPLACE FUNCTION public.save_class_attendance(p_class_id UUID,p_year_id UUID,p_date DATE,p_records JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.classes%ROWTYPE; item JSONB; student UUID; grade_status TEXT; cause TEXT; original public.attendance_records%ROWTYPE; now_at TIMESTAMPTZ:=clock_timestamp(); changed INT:=0; changes JSONB:='[]';
BEGIN
  c:=public.attendance_class_access(p_class_id,p_year_id,true);
  IF p_date IS NULL OR p_date>(now() AT TIME ZONE 'Asia/Phnom_Penh')::date OR NOT EXISTS(SELECT 1 FROM public.academic_years y WHERE y.id=p_year_id AND p_date BETWEEN y.start_date AND y.end_date) THEN RAISE EXCEPTION 'Date outside academic year or in future' USING ERRCODE='22023'; END IF;
  IF jsonb_typeof(p_records) IS DISTINCT FROM 'array' OR jsonb_array_length(p_records) NOT BETWEEN 1 AND 120 OR (SELECT count(DISTINCT value->>'student_id') FROM jsonb_array_elements(p_records))<>jsonb_array_length(p_records) THEN RAISE EXCEPTION 'Expected 1-120 unique attendance rows' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('attendance:'||p_class_id::TEXT||':'||p_date::TEXT,0));
  FOR item IN SELECT value FROM jsonb_array_elements(p_records) ORDER BY value->>'student_id' LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR NOT(item ?& ARRAY['student_id','status']) OR EXISTS(SELECT 1 FROM jsonb_object_keys(item) k WHERE k NOT IN ('student_id','status','root_cause','previous_updated_at')) THEN RAISE EXCEPTION 'Invalid attendance fields' USING ERRCODE='22023'; END IF;
    student:=(item->>'student_id')::UUID; grade_status:=item->>'status'; cause:=NULLIF(item->>'root_cause','');
    grade_status:=CASE grade_status WHEN 'P' THEN 'present' WHEN 'A' THEN 'absent' WHEN 'E' THEN 'permission' WHEN 'L' THEN 'late' WHEN 'unexcused' THEN 'absent' WHEN 'excused' THEN 'permission' ELSE grade_status END;
    IF grade_status IS NULL OR grade_status NOT IN ('present','absent','late','permission') OR length(COALESCE(cause,''))>500 THEN RAISE EXCEPTION 'Invalid attendance status/cause' USING ERRCODE='22023'; END IF;
    PERFORM 1 FROM public.student_enrollments e JOIN public.students s ON s.id=e.student_id WHERE e.student_id=student AND e.class_id=c.id AND e.academic_year_id=p_year_id AND e.enrollment_status IN ('active','enrolled') AND s.is_active=true FOR SHARE OF e,s;
    IF NOT FOUND THEN RAISE EXCEPTION 'Student not actively enrolled in this class/year' USING ERRCODE='42501'; END IF;
    SELECT * INTO original FROM public.attendance_records WHERE student_id=student AND date=p_date AND academic_year_id=p_year_id FOR UPDATE;
    IF FOUND THEN
      IF original.class_id IS DISTINCT FROM c.id THEN RAISE EXCEPTION 'Attendance belongs to another class; preserve transfer history' USING ERRCODE='40001'; END IF;
      IF original.status=grade_status AND original.root_cause IS NOT DISTINCT FROM cause THEN CONTINUE; END IF;
      IF original.updated_at IS DISTINCT FROM NULLIF(item->>'previous_updated_at','')::TIMESTAMPTZ THEN RAISE EXCEPTION 'Attendance changed; reload and review before saving' USING ERRCODE='40001',DETAIL=jsonb_build_object('student_id',student,'current_status',original.status)::TEXT; END IF;
      UPDATE public.attendance_records SET status=grade_status,root_cause=cause,recorded_by=auth.uid(),updated_at=now_at WHERE id=original.id;
    ELSE
      IF NULLIF(item->>'previous_updated_at','') IS NOT NULL THEN RAISE EXCEPTION 'Attendance removed; reload before saving' USING ERRCODE='40001'; END IF;
      INSERT INTO public.attendance_records(class_id,student_id,academic_year_id,date,status,root_cause,recorded_by,updated_at) VALUES(c.id,student,p_year_id,p_date,grade_status,cause,auth.uid(),now_at);
    END IF;
    changes:=changes||jsonb_build_array(jsonb_build_object('student_id',student,'previous_status',original.status,'status',grade_status,'previous_recorded_by',original.recorded_by,'previous_updated_at',original.updated_at,'updated_at',now_at,'root_cause_changed',original.root_cause IS DISTINCT FROM cause));
    changed:=changed+1;
  END LOOP;
  IF changed>0 THEN
    INSERT INTO public.audit_logs(user_id,school_id,action,type,target_table,details) VALUES(auth.uid(),c.school_id,'CLASS_ATTENDANCE_SAVED','info','attendance_records',jsonb_build_object('class_id',c.id,'academic_year_id',p_year_id,'date',p_date,'changed_count',changed,'changes',changes));
  END IF;
  RETURN jsonb_build_object('success',true,'count',jsonb_array_length(p_records),'changed',changed,'workspace',public.attendance_workspace(c.id,p_year_id,p_date));
END $$;

-- Monitor read access is deliberately minimal: the guarded workspace RPC supplies the roster.
-- Restrictive policies close any legacy teacher_id-based path when a profile's role is Monitor.
DO $$ DECLARE t TEXT; cmd TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['students','student_enrollments','grades','monthly_attendance_summaries','student_health_records','home_visits','ai_generations','student_study_plans','audit_logs','system_settings','school_infrastructure','announcements','documents','support_cases','support_interventions','grade_snapshots','parent_contacts','student_requests','correction_requests','activity_logs','giep_notes','telegram_parent_subscriptions','telegram_bot_sessions','exam_subject_standards','exam_grading_scales'] LOOP
    EXECUTE format('CREATE POLICY monitor_no_direct_access ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN (''teacher'',''admin'',''principal'') AND is_active=true)) WITH CHECK (EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN (''teacher'',''admin'',''principal'') AND is_active=true))',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['classes','attendance_records'] LOOP
    FOREACH cmd IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
      IF cmd='INSERT' THEN
        EXECUTE format('CREATE POLICY monitor_no_%s ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role=''monitor''))',lower(cmd),t);
      ELSE
        EXECUTE format('CREATE POLICY monitor_no_%s ON public.%I AS RESTRICTIVE FOR %s TO authenticated USING (NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role=''monitor''))',lower(cmd),t,cmd);
      END IF;
    END LOOP;
  END LOOP;
END $$;
CREATE POLICY monitor_class_read_limit ON public.classes AS RESTRICTIVE FOR SELECT TO authenticated USING (
  NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='monitor') OR
  (monitor_id=auth.uid() AND EXISTS(SELECT 1 FROM public.profiles p JOIN public.academic_years y ON y.id=classes.academic_year_id WHERE p.id=auth.uid() AND p.is_active=true AND p.school_id=classes.school_id AND y.school_id=p.school_id AND y.is_active=true AND y.status='active')));
CREATE POLICY monitor_attendance_read ON public.attendance_records FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.classes c JOIN public.profiles p ON p.id=auth.uid() WHERE c.id=attendance_records.class_id AND c.monitor_id=p.id AND p.role='monitor' AND p.is_active=true AND p.school_id=c.school_id AND c.academic_year_id=attendance_records.academic_year_id));
CREATE POLICY monitor_attendance_read_limit ON public.attendance_records AS RESTRICTIVE FOR SELECT TO authenticated USING (
  NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='monitor') OR EXISTS(SELECT 1 FROM public.classes c WHERE c.id=attendance_records.class_id AND c.monitor_id=auth.uid() AND c.academic_year_id=attendance_records.academic_year_id));

-- Extend the existing profile security trigger rather than relying on browser role restrictions.
CREATE OR REPLACE FUNCTION public.monitor_profile_guard() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id=auth.uid();
  IF actor.role='monitor' AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.school_id IS DISTINCT FROM OLD.school_id OR NEW.is_active IS DISTINCT FROM OLD.is_active OR NEW.is_archived IS DISTINCT FROM OLD.is_archived) THEN RAISE EXCEPTION 'Monitor cannot alter account privileges' USING ERRCODE='42501'; END IF;
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.school_id IS DISTINCT FROM OLD.school_id) AND EXISTS(SELECT 1 FROM public.classes WHERE monitor_id=OLD.id AND is_archived=false) THEN RAISE EXCEPTION 'Unassign monitor classes before changing role/school' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER monitor_profile_guard BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.monitor_profile_guard();

-- This internal, unused-in-the-app view otherwise bypasses profile RLS for every new authenticated role.
REVOKE ALL ON public.diagnostic_orphaned_profiles FROM PUBLIC,anon,authenticated;
ALTER VIEW public.diagnostic_orphaned_profiles SET (security_invoker=true);

REVOKE ALL ON FUNCTION public.assign_class_monitor(UUID,UUID,UUID,UUID,UUID),public.provision_school_profile(UUID,JSONB),public.attendance_class_access(UUID,UUID,BOOLEAN),public.attendance_workspace(UUID,UUID,DATE),public.save_class_attendance(UUID,UUID,DATE,JSONB),public.attendance_school_dates(UUID,UUID,DATE,DATE),public.attendance_school_day(DATE,UUID) FROM PUBLIC,anon,authenticated,service_role;
-- Trigger execution does not require API roles to call these functions directly.
REVOKE ALL ON FUNCTION public.monitor_assignment_guard(),public.monitor_profile_guard() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.assign_class_monitor(UUID,UUID,UUID,UUID,UUID),public.provision_school_profile(UUID,JSONB),public.attendance_workspace(UUID,UUID,DATE),public.save_class_attendance(UUID,UUID,DATE,JSONB),public.attendance_school_dates(UUID,UUID,DATE,DATE) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
