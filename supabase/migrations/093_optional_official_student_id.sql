-- Official school IDs are optional; the database-generated student UUID remains the identity.
-- Abort safely on existing ID conflicts; never merge, delete or renumber students.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.students'::regclass AND attname = 'student_id_number' AND attnotnull) THEN
    RAISE EXCEPTION 'student_id_number must be nullable; inspect the unexpected NOT NULL constraint before release';
  END IF;
  IF EXISTS (SELECT 1 FROM public.students WHERE NULLIF(btrim(student_id_number),'') IS NOT NULL GROUP BY btrim(student_id_number) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Conflicting official student IDs exist. Review and reconcile them before applying migration 093; no records were changed.' USING ERRCODE = '23505';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS students_official_id_normalized_unique
  ON public.students ((NULLIF(btrim(student_id_number), '')));

CREATE OR REPLACE FUNCTION public.normalize_official_student_id()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.student_id_number := NULLIF(btrim(NEW.student_id_number),'');
  IF TG_OP = 'UPDATE' AND NULLIF(btrim(OLD.student_id_number),'') IS NOT NULL AND NEW.student_id_number IS NULL THEN
    RAISE EXCEPTION 'មិនអាចលុបអត្តលេខដែលបានកំណត់រួចទេ។ សូមរក្សាអត្តលេខចាស់ ឬបញ្ចូលអត្តលេខថ្មី។' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_normalize_official_student_id ON public.students;
CREATE TRIGGER trg_normalize_official_student_id BEFORE INSERT OR UPDATE OF student_id_number ON public.students
FOR EACH ROW EXECUTE FUNCTION public.normalize_official_student_id();

CREATE OR REPLACE FUNCTION public._register_basic_students_v093(
  p_records JSONB, p_year UUID, p_caller UUID, p_require_class BOOLEAN
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_actor UUID; v_profile public.profiles%ROWTYPE; v_year public.academic_years%ROWTYPE;
  v_record JSONB; v_class public.classes%ROWTYPE; v_existing public.students%ROWTYPE;
  v_id UUID; v_official TEXT; v_name TEXT; v_gender TEXT; v_raw_dob TEXT; v_dob DATE;
  v_class_id UUID; v_count INT := 0; v_ids JSONB := '[]'; v_seen TEXT[] := '{}';
BEGIN
  IF auth.role() = 'service_role' THEN v_actor := COALESCE(p_caller,auth.uid());
  ELSIF auth.role() = 'authenticated' THEN v_actor := auth.uid();
  ELSE RAISE EXCEPTION 'Unauthorized session' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_actor FOR SHARE;
  IF NOT FOUND OR v_profile.is_active IS DISTINCT FROM true OR v_profile.role IS NULL OR v_profile.role NOT IN ('admin','principal') THEN
    RAISE EXCEPTION 'Forbidden: active Admin/Principal required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_year FROM public.academic_years WHERE id = p_year FOR SHARE;
  IF NOT FOUND OR v_year.status IS NULL THEN RAISE EXCEPTION 'Academic year not found' USING ERRCODE = '23503'; END IF;
  IF v_year.status IN ('closed','archived') THEN RAISE EXCEPTION 'Academic year is locked' USING ERRCODE = '55000'; END IF;
  IF v_profile.role = 'principal' AND (v_profile.school_id IS NULL OR v_profile.school_id IS DISTINCT FROM v_year.school_id) THEN
    RAISE EXCEPTION 'Forbidden: academic year school mismatch' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_records) IS DISTINCT FROM 'array' OR jsonb_array_length(p_records) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'Expected 1 to 500 student rows' USING ERRCODE = '22023';
  END IF;
  -- Serialize both registration entry points, including ID-less duplicate review checks.
  PERFORM pg_advisory_xact_lock(hashtextextended('basic-student-registration-v093',0));
  FOR v_record IN SELECT value FROM jsonb_array_elements(p_records) LOOP
    IF jsonb_typeof(v_record) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid student row' USING ERRCODE = '22023'; END IF;
    IF v_record ? 'student_id_number' AND jsonb_typeof(v_record->'student_id_number') NOT IN ('string','null') THEN
      RAISE EXCEPTION 'Official student IDs must be text to preserve leading zeros' USING ERRCODE = '22023';
    END IF;
    v_official := NULLIF(btrim(v_record->>'student_id_number'),'');
    v_name := NULLIF(btrim(v_record->>'full_name'),'');
    v_gender := CASE lower(btrim(v_record->>'gender')) WHEN 'm' THEN 'M' WHEN 'male' THEN 'M' WHEN 'ប្រុស' THEN 'M' WHEN 'ប' THEN 'M'
      WHEN 'f' THEN 'F' WHEN 'female' THEN 'F' WHEN 'ស្រី' THEN 'F' WHEN 'ស' THEN 'F' ELSE NULL END;
    IF v_name IS NULL OR v_gender IS NULL THEN RAISE EXCEPTION 'Full name and valid gender are required' USING ERRCODE = '22023'; END IF;
    IF length(v_official) > 50 OR length(v_name) > 100 THEN RAISE EXCEPTION 'Student ID or name is too long' USING ERRCODE = '22023'; END IF;
    IF COALESCE(NULLIF(v_record->>'status',''),'new') NOT IN ('new','repeater','transfer') THEN RAISE EXCEPTION 'Invalid registration type' USING ERRCODE = '22023'; END IF;
    IF v_official = ANY(v_seen) THEN RAISE EXCEPTION 'Duplicate official ID within batch: %', v_official USING ERRCODE = '23505'; END IF;
    IF v_official IS NOT NULL THEN v_seen := array_append(v_seen,v_official); END IF;
    v_class_id := NULLIF(v_record->>'class_id','')::UUID;
    IF v_class_id IS NULL AND (p_require_class OR v_profile.role = 'principal') THEN
      RAISE EXCEPTION 'A valid class is required' USING ERRCODE = '23503';
    END IF;
    IF v_class_id IS NOT NULL THEN
      SELECT * INTO v_class FROM public.classes WHERE id = v_class_id FOR SHARE;
      IF NOT FOUND OR v_class.is_archived IS DISTINCT FROM false OR v_class.academic_year_id IS DISTINCT FROM p_year OR v_class.school_id IS DISTINCT FROM v_year.school_id THEN
        RAISE EXCEPTION 'Invalid class/year/school combination' USING ERRCODE = '23503';
      END IF;
      IF v_profile.role = 'principal' AND v_profile.school_id IS DISTINCT FROM v_class.school_id THEN
        RAISE EXCEPTION 'Forbidden: class school mismatch' USING ERRCODE = '42501';
      END IF;
    END IF;
    v_raw_dob := COALESCE(NULLIF(btrim(v_record->>'dob'),''),NULLIF(btrim(v_record->>'date_of_birth'),''));
    v_dob := NULL;
    IF v_raw_dob IS NOT NULL THEN
      IF v_raw_dob !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Invalid DOB; use YYYY-MM-DD' USING ERRCODE = '22023'; END IF;
      v_dob := v_raw_dob::DATE;
      IF v_dob > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Phnom_Penh')::DATE THEN RAISE EXCEPTION 'DOB cannot be in the future' USING ERRCODE = '22023'; END IF;
    END IF;
    v_id := NULL;
    IF v_official IS NOT NULL THEN
      SELECT * INTO v_existing FROM public.students WHERE NULLIF(btrim(student_id_number),'') = v_official FOR UPDATE;
      IF FOUND THEN
        v_id := v_existing.id;
        IF btrim(v_existing.full_name) IS DISTINCT FROM v_name OR v_existing.gender IS DISTINCT FROM v_gender
          OR (v_dob IS NOT NULL AND v_existing.dob IS NOT NULL AND v_dob IS DISTINCT FROM v_existing.dob) THEN
          RAISE EXCEPTION 'Official ID identity conflict. Review the existing UUID-based student before registration.' USING ERRCODE = '23505';
        END IF;
        IF v_profile.role = 'principal' AND (NOT EXISTS (
          SELECT 1 FROM public.student_enrollments e JOIN public.classes c ON c.id=e.class_id
          WHERE e.student_id=v_id AND c.school_id=v_profile.school_id
        ) OR EXISTS (
          SELECT 1 FROM public.student_enrollments e JOIN public.classes c ON c.id=e.class_id
          WHERE e.student_id=v_id AND c.school_id IS DISTINCT FROM v_profile.school_id
        )) THEN RAISE EXCEPTION 'Forbidden: existing student school mismatch' USING ERRCODE = '42501'; END IF;
      END IF;
    ELSE
      -- Name is a review signal, never a matching key. Existing candidates must be reconciled explicitly.
      IF EXISTS (SELECT 1 FROM public.students s WHERE btrim(s.full_name)=v_name AND s.gender=v_gender
        AND (v_dob IS NULL OR s.dob IS NULL OR s.dob=v_dob)
        AND (v_profile.role='admin' OR EXISTS (SELECT 1 FROM public.student_enrollments e JOIN public.classes c ON c.id=e.class_id WHERE e.student_id=s.id AND c.school_id=v_profile.school_id))) THEN
        RAISE EXCEPTION 'Possible duplicate without official ID: %. Review the existing student; no automatic merge was performed.', v_name USING ERRCODE = '23505';
      END IF;
    END IF;
    IF v_id IS NULL THEN
      INSERT INTO public.students(student_id_number,full_name,gender,dob,date_of_birth,current_address,
        father_name,father_job,father_phone,mother_name,mother_job,mother_phone,parent_phone,status,is_active,updated_at)
      VALUES(v_official,v_name,v_gender,v_dob,v_dob,NULLIF(v_record->>'address',''),
        NULLIF(v_record->>'father_name',''),NULLIF(v_record->>'father_job',''),NULLIF(v_record->>'father_phone',''),
        NULLIF(v_record->>'mother_name',''),NULLIF(v_record->>'mother_job',''),NULLIF(v_record->>'mother_phone',''),
        COALESCE(NULLIF(v_record->>'father_phone',''),NULLIF(v_record->>'mother_phone','')),
        COALESCE(NULLIF(v_record->>'status',''),'new'),true,now()) RETURNING id INTO v_id;
    ELSE
      UPDATE public.students SET dob=COALESCE(v_dob,dob), date_of_birth=COALESCE(v_dob,date_of_birth),
        current_address=COALESCE(NULLIF(v_record->>'address',''),current_address),
        father_name=COALESCE(NULLIF(v_record->>'father_name',''),father_name), father_job=COALESCE(NULLIF(v_record->>'father_job',''),father_job), father_phone=COALESCE(NULLIF(v_record->>'father_phone',''),father_phone),
        mother_name=COALESCE(NULLIF(v_record->>'mother_name',''),mother_name), mother_job=COALESCE(NULLIF(v_record->>'mother_job',''),mother_job), mother_phone=COALESCE(NULLIF(v_record->>'mother_phone',''),mother_phone),
        parent_phone=COALESCE(NULLIF(v_record->>'father_phone',''),NULLIF(v_record->>'mother_phone',''),parent_phone),
        status=COALESCE(NULLIF(v_record->>'status',''),status),is_active=true, updated_at=now() WHERE id=v_id;
    END IF;
    IF v_class_id IS NOT NULL THEN
      PERFORM 1 FROM public.student_enrollments WHERE student_id=v_id AND academic_year_id=p_year FOR UPDATE;
      -- A registration retry must not silently move an existing enrollment or reopen lifecycle outcomes.
      IF EXISTS (SELECT 1 FROM public.student_enrollments WHERE student_id=v_id AND academic_year_id=p_year
        AND (class_id IS DISTINCT FROM v_class_id OR enrollment_status NOT IN ('active','enrolled') OR year_result NOT IN ('enrolled','ongoing'))) THEN
        RAISE EXCEPTION 'Existing enrollment requires the authorized placement/lifecycle workflow' USING ERRCODE = '23505';
      END IF;
      INSERT INTO public.student_enrollments(student_id,class_id,academic_year_id,enrollment_status,year_result,desk_number,room_number,updated_at)
      VALUES(v_id,v_class_id,p_year,'active','enrolled',NULLIF(btrim(v_record->>'desk_number'),''),NULLIF(btrim(v_record->>'room_number'),''),now())
      ON CONFLICT(student_id,academic_year_id) DO UPDATE SET desk_number=COALESCE(EXCLUDED.desk_number,student_enrollments.desk_number),room_number=COALESCE(EXCLUDED.room_number,student_enrollments.room_number),updated_at=now();
    END IF;
    v_count := v_count+1; v_ids := v_ids || jsonb_build_array(v_id);
  END LOOP;
  INSERT INTO public.audit_logs(user_id,action) VALUES(v_actor,'BASIC_STUDENT_REGISTRATION: ' || v_count);
  RETURN jsonb_build_object('success',true,'count',v_count,'student_ids',v_ids);
END $$;
REVOKE ALL ON FUNCTION public._register_basic_students_v093(JSONB,UUID,UUID,BOOLEAN) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.bulk_quick_register_students(student_records JSONB,target_year_id UUID,admin_user_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT public._register_basic_students_v093(student_records,target_year_id,admin_user_id,true)
$$;
CREATE OR REPLACE FUNCTION public.batch_register_students_atomic(p_students JSONB,p_academic_year_id UUID,p_caller_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT public._register_basic_students_v093(p_students,p_academic_year_id,p_caller_id,false)
$$;
REVOKE ALL ON FUNCTION public.bulk_quick_register_students(JSONB,UUID,UUID) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.batch_register_students_atomic(JSONB,UUID,UUID) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bulk_quick_register_students(JSONB,UUID,UUID),public.batch_register_students_atomic(JSONB,UUID,UUID) TO authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
