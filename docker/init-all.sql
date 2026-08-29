-- ==============================================================================
-- DATABASE INITIALIZATION SCRIPT FOR DOCKER (KRU AI / HUN SEN PORIENG HIGH SCHOOL)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Schools Table
CREATE TABLE IF NOT EXISTS public.schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  principal_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default School (Hun Sen Porieng High School)
INSERT INTO public.schools (id, name, code)
VALUES ('main-school', 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង', 'Porieng-2026')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;

-- 2. Profiles Table (Teachers, Admin, Principal, Monitor)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'principal', 'admin', 'monitor')),
  school_id TEXT NOT NULL DEFAULT 'main-school' REFERENCES public.schools(id),
  school_code TEXT NOT NULL DEFAULT 'Porieng-2026',
  phone TEXT,
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Administrator & Principal Profiles
INSERT INTO public.profiles (id, username, full_name, role, school_id, school_code, phone, subject)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin_porieng', 'សាន សុវិជ្ជា (Admin ICT)', 'admin', 'main-school', 'Porieng-2026', '093690905', 'ICT'),
  ('00000000-0000-0000-0000-000000000002', 'principal_porieng', 'ហេង ឈាងលី (នាយកសាលា)', 'principal', 'main-school', 'Porieng-2026', '0966894077', 'ទូទៅ'),
  ('00000000-0000-0000-0000-000000000003', 'kruadmin041030', 'លោកគ្រូ/អ្នកគ្រូ សុខា', 'teacher', 'main-school', 'Porieng-2026', '012345678', 'គណិតវិទ្យា')
ON CONFLICT (username) DO NOTHING;

-- 3. Academic Years Table
CREATE TABLE IF NOT EXISTS public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_current BOOLEAN DEFAULT false,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.academic_years (id, name, is_current, start_date, end_date)
VALUES ('00000000-0000-0000-0000-000000000010', '២០២៥-២០២៦', true, '2025-11-01', '2026-08-31')
ON CONFLICT DO NOTHING;

-- 4. Classes Table
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL DEFAULT 'main-school' REFERENCES public.schools(id),
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  room TEXT,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  subjects JSONB DEFAULT '[]'::jsonb,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Classes for Hun Sen Porieng (Grades 7 to 12)
INSERT INTO public.classes (id, school_id, teacher_id, name, grade, subjects)
VALUES 
  ('10000000-0000-0000-0000-000000000012', 'main-school', '00000000-0000-0000-0000-000000000003', '12A', '12', '[{"id":"khmer","label":"ភាសាខ្មែរ"},{"id":"math","label":"គណិតវិទ្យា"},{"id":"physics","label":"រូបវិទ្យា"}]'::jsonb),
  ('10000000-0000-0000-0000-000000000011', 'main-school', NULL, '11A', '11', '[{"id":"khmer","label":"ភាសាខ្មែរ"},{"id":"math","label":"គណិតវិទ្យា"}]'::jsonb),
  ('10000000-0000-0000-0000-000000000010', 'main-school', NULL, '10A', '10', '[{"id":"khmer","label":"ភាសាខ្មែរ"},{"id":"math","label":"គណិតវិទ្យា"}]'::jsonb),
  ('10000000-0000-0000-0000-000000000009', 'main-school', NULL, '9A', '9', '[{"id":"khmer","label":"ភាសាខ្មែរ"},{"id":"math","label":"គណិតវិទ្យា"}]'::jsonb),
  ('10000000-0000-0000-0000-000000000008', 'main-school', NULL, '8A', '8', '[{"id":"khmer","label":"ភាសាខ្មែរ"},{"id":"math","label":"គណិតវិទ្យា"}]'::jsonb),
  ('10000000-0000-0000-0000-000000000007', 'main-school', NULL, '7A', '7', '[{"id":"khmer","label":"ភាសាខ្មែរ"},{"id":"math","label":"គណិតវិទ្យា"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 5. Students Table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id_number TEXT,
  desk_number TEXT,
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('M', 'F', 'ប្រុស', 'ស្រី')),
  dob DATE,
  parent_phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'new', -- 'new', 'repeater', 'transfer'
  enrollment_status TEXT DEFAULT 'studying', -- 'studying', 'dropped', 'transferred', 'suspended'
  disability TEXT DEFAULT 'none', -- 'none', 'mild', 'severe'
  distance_km NUMERIC,
  id_poor TEXT DEFAULT 'none', -- 'none', 'level_1', 'level_2'
  poor_id_status TEXT DEFAULT 'none',
  is_orphan BOOLEAN DEFAULT FALSE,
  transport_mode TEXT DEFAULT 'bicycle',
  dropout_risk BOOLEAN DEFAULT FALSE,
  is_slow_learner BOOLEAN DEFAULT FALSE,
  behavior_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);

-- 6. Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'permission', 'P', 'A', 'L', 'E')),
  note TEXT,
  root_cause TEXT, -- 'farming', 'poverty', 'illness', 'transport', 'migration', 'other'
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_student_date UNIQUE (student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_class_date ON public.attendance_records(class_id, date);

-- 7. Monthly Attendance Summaries Table
CREATE TABLE IF NOT EXISTS public.monthly_attendance_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- e.g. '2026-01'
  absent_count INTEGER DEFAULT 0,
  permission_count INTEGER DEFAULT 0,
  late_count INTEGER DEFAULT 0,
  root_cause TEXT,
  needs_home_visit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_student_month UNIQUE (student_id, month)
);

-- 8. Grades Table
CREATE TABLE IF NOT EXISTS public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- 'dec', 'jan', 'feb', 'sem1-exam', 'sem1-summary', 'may', 'jun', 'jul', 'sem2-exam', 'sem2-summary', 'annual'
  month INTEGER,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_score NUMERIC(6,2),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'submitted', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_student_period UNIQUE (student_id, period)
);

CREATE INDEX IF NOT EXISTS idx_grades_class_period ON public.grades(class_id, period);

-- 9. Student Health Records Table (GEIP 3.3.1.3 Eye & Ear Screening)
CREATE TABLE IF NOT EXISTS public.student_health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(5,2),
  height_cm NUMERIC(5,2),
  bmi NUMERIC(4,2),
  vision_left TEXT,
  vision_right TEXT,
  hearing TEXT,
  dental TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_student_health_date UNIQUE (student_id, recorded_date)
);

CREATE INDEX IF NOT EXISTS idx_health_class_date ON public.student_health_records(class_id, recorded_date);

-- 10. Home Visits Table
CREATE TABLE IF NOT EXISTS public.home_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  contract_notes TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Support Cases & Interventions Table
CREATE TABLE IF NOT EXISTS public.support_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  summary TEXT NOT NULL,
  next_follow_up_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.support_cases(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NOT NULL,
  outcome TEXT,
  follow_up_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  size TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.system_settings (key, value)
VALUES 
  ('school_name', 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង'),
  ('school_code', 'Porieng-2026'),
  ('current_academic_year', '២០២៥-២០២៦')
ON CONFLICT (key) DO NOTHING;

-- 14. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- SAMPLE SEED DATA (156 STUDENTS ACROSS GRADES 7-12, GRADES, ATTENDANCE, HEALTH)
-- ==============================================================================

DO $$
DECLARE
  class_ids UUID[] := ARRAY[
    '10000000-0000-0000-0000-000000000012'::UUID, -- 12A
    '10000000-0000-0000-0000-000000000011'::UUID, -- 11A
    '10000000-0000-0000-0000-000000000010'::UUID, -- 10A
    '10000000-0000-0000-0000-000000000009'::UUID, -- 9A
    '10000000-0000-0000-0000-000000000008'::UUID, -- 8A
    '10000000-0000-0000-0000-000000000007'::UUID  -- 7A
  ];
  cid UUID;
  c_idx INT;
  s_idx INT;
  std_id UUID;
  s_gender TEXT;
  s_name TEXT;
  s_code TEXT;
  s_desk TEXT;
  s_idpoor TEXT;
  s_dropout BOOLEAN;
  s_slow BOOLEAN;
  s_status TEXT;
  
  female_names TEXT[] := ARRAY[
    'កែវ ច័ន្ទធីតា', 'ចាន់ សុភាព', 'ប៊ុន រស្មី', 'ម៉ៅ គន្ធា', 'សុខ ស្រីនាង',
    'អ៊ុ ស្រីម៉ៅ', 'ហែម សុខុម', 'ឡុង ចរិយា', 'សេង ស្រីលក្ខណ៍', 'ទេព ម៉ាលីស',
    'ឃុន ស្រីពេជ្រ', 'ទូច សុជាតា', 'ពេជ្រ សោភា', 'ឌួង ធីតា', 'ឈុន ស្រីអូន'
  ];
  
  male_names TEXT[] := ARRAY[
    'ខៀវ សុវណ្ណារាជ', 'ដួង រដ្ឋា', 'ទិត្យ វិសាល', 'ប៉ែន សម្បត្តិ', 'សោម សុផាត',
    'នួន វិចិត្រ', 'មាស សុខា', 'ហេង រតនៈ', 'យីន វាសនា', 'ឈាង សុវណ្ណ',
    'ស៊ុន រិទ្ធី', 'គឹម ពិសិដ្ឋ', 'ឡេង សុភ័ក្រ្ត', 'ជុំ បញ្ញា', 'រ៉េត សុភ័ណ្ឌ'
  ];
BEGIN
  FOR c_idx IN 1..6 LOOP
    cid := class_ids[c_idx];

    FOR s_idx IN 1..26 LOOP
      std_id := ('20000000-0000-0000-' || LPAD(c_idx::TEXT, 4, '0') || '-' || LPAD(s_idx::TEXT, 12, '0'))::UUID;
      s_desk := 'A-' || LPAD(s_idx::TEXT, 2, '0');
      s_code := (10 + c_idx)::TEXT || LPAD(s_idx::TEXT, 3, '0');

      IF s_idx % 2 = 1 THEN
        s_gender := 'F';
        s_name := female_names[((s_idx + 1) / 2) % 15 + 1];
      ELSE
        s_gender := 'M';
        s_name := male_names[(s_idx / 2) % 15 + 1];
      END IF;

      s_idpoor := CASE WHEN s_idx IN (3, 11) THEN 'level_1' WHEN s_idx IN (7, 19) THEN 'level_2' ELSE 'none' END;
      s_dropout := (s_idx IN (5, 17));
      s_slow := (s_idx IN (5, 9, 21));
      s_status := CASE WHEN s_idx = 26 THEN 'dropped' WHEN s_idx = 25 THEN 'transferred' ELSE 'studying' END;

      INSERT INTO public.students (
        id, class_id, student_id_number, desk_number, full_name, gender, dob,
        parent_phone, is_active, status, enrollment_status, id_poor, poor_id_status,
        is_orphan, transport_mode, dropout_risk, is_slow_learner, distance_km
      )
      VALUES (
        std_id, cid, s_code, s_desk, s_name, s_gender,
        ('200' || (12 - c_idx)::TEXT || '-0' || (s_idx % 9 + 1)::TEXT || '-15')::DATE,
        '012' || LPAD((s_idx * 37)::TEXT, 6, '0'),
        (s_status = 'studying'),
        CASE WHEN s_idx = 4 THEN 'repeater' ELSE 'new' END,
        s_status,
        s_idpoor,
        s_idpoor,
        (s_idx = 11),
        CASE WHEN s_idx % 3 = 0 THEN 'walking' ELSE 'bicycle' END,
        s_dropout,
        s_slow,
        (s_idx * 0.8)::NUMERIC(4,1)
      )
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.attendance_records (class_id, student_id, date, status, root_cause)
      VALUES
        (cid, std_id, CURRENT_DATE, CASE WHEN s_idx = 5 THEN 'absent' WHEN s_idx = 9 THEN 'permission' ELSE 'present' END, CASE WHEN s_idx = 5 THEN 'farming' ELSE NULL END),
        (cid, std_id, CURRENT_DATE - INTERVAL '1 day', CASE WHEN s_idx = 5 THEN 'absent' WHEN s_idx = 17 THEN 'absent' ELSE 'present' END, CASE WHEN s_idx = 5 THEN 'farming' WHEN s_idx = 17 THEN 'illness' ELSE NULL END)
      ON CONFLICT (student_id, date) DO NOTHING;

      INSERT INTO public.monthly_attendance_summaries (class_id, student_id, month, absent_count, permission_count, late_count, root_cause, needs_home_visit)
      VALUES (
        cid, std_id, TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
        CASE WHEN s_idx = 5 THEN 4 WHEN s_idx = 17 THEN 3 WHEN s_idx = 9 THEN 2 ELSE 0 END,
        CASE WHEN s_idx = 9 THEN 2 ELSE 0 END,
        CASE WHEN s_idx = 2 THEN 1 ELSE 0 END,
        CASE WHEN s_idx = 5 THEN 'farming' WHEN s_idx = 17 THEN 'illness' ELSE NULL END,
        (s_idx IN (5, 17))
      )
      ON CONFLICT (student_id, month) DO NOTHING;

      INSERT INTO public.grades (class_id, student_id, period, scores, total_score, status)
      VALUES (
        cid, std_id, 'sem1-summary',
        jsonb_build_object(
          'khmer', CASE WHEN s_status = 'dropped' THEN 0 ELSE 60 + (s_idx * 3) % 35 END,
          'math', CASE WHEN s_status = 'dropped' THEN 0 ELSE 55 + (s_idx * 7) % 40 END,
          'physics', CASE WHEN s_status = 'dropped' THEN 0 ELSE 50 + (s_idx * 5) % 45 END,
          'chem', CASE WHEN s_status = 'dropped' THEN 0 ELSE 58 + (s_idx * 4) % 38 END,
          'bio', CASE WHEN s_status = 'dropped' THEN 0 ELSE 62 + (s_idx * 2) % 32 END,
          'english', CASE WHEN s_status = 'dropped' THEN 0 ELSE 50 + (s_idx * 6) % 45 END
        ),
        CASE WHEN s_status = 'dropped' THEN 0 ELSE (335 + (s_idx * 27) % 230)::NUMERIC(6,2) END,
        'published'
      )
      ON CONFLICT (student_id, period) DO NOTHING;

      INSERT INTO public.student_health_records (
        student_id, class_id, recorded_date, weight_kg, height_cm, bmi,
        vision_left, vision_right, hearing, dental, notes
      )
      VALUES (
        std_id, cid, CURRENT_DATE,
        (40 + (s_idx * 2) % 25)::NUMERIC(5,2),
        (148 + (s_idx * 3) % 28)::NUMERIC(5,2),
        (18.5 + (s_idx * 0.3) % 5)::NUMERIC(4,2),
        CASE WHEN s_idx = 7 THEN '6/12' WHEN s_idx = 13 THEN '6/9' ELSE '6/6' END,
        CASE WHEN s_idx = 7 THEN '6/12' ELSE '6/6' END,
        CASE WHEN s_idx = 21 THEN 'ខ្សោយស្តាប់' ELSE 'ធម្មតា' END,
        CASE WHEN s_idx % 4 = 0 THEN 'ពុកធ្មេញ' ELSE 'ធម្មតា' END,
        CASE WHEN s_idx = 7 THEN 'គំហើញខ្សោយ ត្រូវការបញ្ជូនទៅពេទ្យភ្នែក' ELSE 'សុខភាពទូទៅល្អ' END
      )
      ON CONFLICT (student_id, recorded_date) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

