-- ==============================================================================
-- COMPREHENSIVE SAMPLE SEED DATA FOR HUN SEN PORIENG HIGH SCHOOL (KRU AI)
-- ==============================================================================

-- 1. Ensure School Exists
INSERT INTO public.schools (id, name, code)
VALUES ('main-school', 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង', 'Porieng-2026')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;

-- 2. Homeroom Teacher & Staff Profiles
INSERT INTO public.profiles (id, username, full_name, role, school_id, school_code, phone, subject)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin_porieng', 'សាន សុវិជ្ជា (Admin ICT)', 'admin', 'main-school', 'Porieng-2026', '093690905', 'ICT'),
  ('00000000-0000-0000-0000-000000000002', 'principal_porieng', 'ហេង ឈាងលី (នាយកសាលា)', 'principal', 'main-school', 'Porieng-2026', '0966894077', 'ទូទៅ'),
  ('00000000-0000-0000-0000-000000000012', 'teacher_12a', 'លោកគ្រូ សុខា', 'teacher', 'main-school', 'Porieng-2026', '012345678', 'គណិតវិទ្យា'),
  ('00000000-0000-0000-0000-000000000011', 'teacher_11a', 'លោកគ្រូ សម្បត្តិ', 'teacher', 'main-school', 'Porieng-2026', '093456789', 'រូបវិទ្យា'),
  ('00000000-0000-0000-0000-000000000010', 'teacher_10a', 'អ្នកគ្រូ ច័ន្ទរស្មី', 'teacher', 'main-school', 'Porieng-2026', '010889900', 'ភាសាខ្មែរ'),
  ('00000000-0000-0000-0000-000000000009', 'teacher_9a', 'លោកគ្រូ ប៊ុនធឿន', 'teacher', 'main-school', 'Porieng-2026', '0881234567', 'ប្រវត្តិវិទ្យា'),
  ('00000000-0000-0000-0000-000000000008', 'teacher_8a', 'លោកគ្រូ វិសាល', 'teacher', 'main-school', 'Porieng-2026', '085998877', 'ភាសាអង់គ្លេស'),
  ('00000000-0000-0000-0000-000000000007', 'teacher_7a', 'អ្នកគ្រូ នារី', 'teacher', 'main-school', 'Porieng-2026', '011223344', 'ជីវវិទ្យា')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, phone = EXCLUDED.phone, subject = EXCLUDED.subject;

-- 3. Academic Year
INSERT INTO public.academic_years (id, name, is_current, start_date, end_date)
VALUES ('00000000-0000-0000-0000-000000000010', '២០២៥-២០២៦', true, '2025-11-01', '2026-08-31')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_current = EXCLUDED.is_current;

-- 4. Classes (Assign Teachers)
INSERT INTO public.classes (id, school_id, teacher_id, name, grade, subjects, academic_year_id)
VALUES
  ('10000000-0000-0000-0000-000000000012', 'main-school', '00000000-0000-0000-0000-000000000012', '12A', '12', '[{"id":"khmer","label":"ភាសាខ្មែរ"},{"id":"math","label":"គណិតវិទ្យា"},{"id":"physics","label":"រូបវិទ្យា"},{"id":"chem","label":"គីមីវិទ្យា"},{"id":"bio","label":"ជីវវិទ្យា"},{"id":"history","label":"ប្រវត្តិវិទ្យា"},{"id":"english","label":"ភាសាអង់គ្លេស"}]'::jsonb, '00000000-0000-0000-0000-000000000010'),
  ('10000000-0000-0000-0000-000000000011', 'main-school', '00000000-0000-0000-0000-000000000011', '11A', '11', '[{"id":"khmer","label":"ភាសាខ្មែរ"},{"id":"math","label":"គណិតវិទ្យា"},{"id":"physics","label":"រូបវិទ្យា"},{"id":"chem","label":"គីមីវិទ្យា"},{"id":"bio","label":"ជីវវិទ្យា"},{"id":"english","label":"ភាសាអង់គ្លេស"}]'::jsonb, '00000000-0000-0000-0000-000000000010'),
  ('10000000-0000-0000-0000-000000000010', 'main-school', '00000000-0000-0000-0000-000000000010', '10A', '10', '[{"id":"khmer","label":"ភាសាខ្មែរ"},{"id":"math","label":"គណិតវិទ្យា"},{"id":"physics","label":"រូបវិទ្យា"},{"id":"chem","label":"គីមីវិទ្យា"},{"id":"english","label":"ភាសាអង់គ្លេស"}]'::jsonb, '00000000-0000-0000-0000-000000000010'),
  ('10000000-0000-0000-0000-000000000009', 'main-school', '00000000-0000-0000-0000-000000000009', '9A', '9', '[{"id":"khmer","label":"ភាសាខ្មែរ"},{"id":"math","label":"គណិតវិទ្យា"},{"id":"physics","label":"រូបវិទ្យា"},{"id":"history","label":"ប្រវត្តិវិទ្យា"},{"id":"english","label":"ភាសាអង់គ្លេស"}]'::jsonb, '00000000-0000-0000-0000-000000000010'),
  ('10000000-0000-0000-0000-000000000008', 'main-school', '00000000-0000-0000-0000-000000000008', '8A', '8', '[{"id":"khmer","label":"ភាសាខ្មែរ"},{"id":"math","label":"គណិតវិទ្យា"},{"id":"physics","label":"រូបវិទ្យា"},{"id":"english","label":"ភាសាអង់គ្លេស"}]'::jsonb, '00000000-0000-0000-0000-000000000010'),
  ('10000000-0000-0000-0000-000000000007', 'main-school', '00000000-0000-0000-0000-000000000007', '7A', '7', '[{"id":"khmer","label":"ភាសាខ្មែរ"},{"id":"math","label":"គណិតវិទ្យា"},{"id":"physics","label":"រូបវិទ្យា"},{"id":"english","label":"ភាសាអង់គ្លេស"}]'::jsonb, '00000000-0000-0000-0000-000000000010')
ON CONFLICT (id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id, subjects = EXCLUDED.subjects;

-- 5. Helper Function to Seed Class Students Cleanly
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
  -- Iterate through each class (12A to 7A)
  FOR c_idx IN 1..6 LOOP
    cid := class_ids[c_idx];

    -- Seed 26 students per class (13 Female, 13 Male)
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

      -- Assign sample risk and poverty characteristics
      s_idpoor := CASE WHEN s_idx IN (3, 11) THEN 'level_1' WHEN s_idx IN (7, 19) THEN 'level_2' ELSE 'none' END;
      s_dropout := (s_idx IN (5, 17));
      s_slow := (s_idx IN (5, 9, 21));
      s_status := CASE WHEN s_idx = 26 THEN 'dropped' WHEN s_idx = 25 THEN 'transferred' ELSE 'studying' END;

      -- Insert / Update Student Record
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
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        gender = EXCLUDED.gender,
        enrollment_status = EXCLUDED.enrollment_status,
        dropout_risk = EXCLUDED.dropout_risk,
        is_slow_learner = EXCLUDED.is_slow_learner;

      -- Insert Sample Attendance Records for current month
      INSERT INTO public.attendance_records (class_id, student_id, date, status, root_cause)
      VALUES
        (cid, std_id, CURRENT_DATE, CASE WHEN s_idx = 5 THEN 'absent' WHEN s_idx = 9 THEN 'permission' ELSE 'present' END, CASE WHEN s_idx = 5 THEN 'farming' ELSE NULL END),
        (cid, std_id, CURRENT_DATE - INTERVAL '1 day', CASE WHEN s_idx = 5 THEN 'absent' WHEN s_idx = 17 THEN 'absent' ELSE 'present' END, CASE WHEN s_idx = 5 THEN 'farming' WHEN s_idx = 17 THEN 'illness' ELSE NULL END),
        (cid, std_id, CURRENT_DATE - INTERVAL '2 day', CASE WHEN s_idx IN (5, 9) THEN 'absent' ELSE 'present' END, CASE WHEN s_idx = 5 THEN 'farming' ELSE NULL END)
      ON CONFLICT (student_id, date) DO NOTHING;

      -- Insert Monthly Attendance Summary
      INSERT INTO public.monthly_attendance_summaries (class_id, student_id, month, absent_count, permission_count, late_count, root_cause, needs_home_visit)
      VALUES (
        cid, std_id, TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
        CASE WHEN s_idx = 5 THEN 4 WHEN s_idx = 17 THEN 3 WHEN s_idx = 9 THEN 2 ELSE 0 END,
        CASE WHEN s_idx = 9 THEN 2 ELSE 0 END,
        CASE WHEN s_idx = 2 THEN 1 ELSE 0 END,
        CASE WHEN s_idx = 5 THEN 'farming' WHEN s_idx = 17 THEN 'illness' ELSE NULL END,
        (s_idx IN (5, 17))
      )
      ON CONFLICT (student_id, month) DO UPDATE SET
        absent_count = EXCLUDED.absent_count,
        permission_count = EXCLUDED.permission_count,
        root_cause = EXCLUDED.root_cause,
        needs_home_visit = EXCLUDED.needs_home_visit;

      -- Insert Sample Grades for Sem 1 & Annual Evaluation (GEIP 3.1.4 format)
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
      ON CONFLICT (student_id, period) DO UPDATE SET scores = EXCLUDED.scores, total_score = EXCLUDED.total_score;

      -- Insert Health Records (GEIP 3.3.1.3 Eye & Ear Screening)
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

-- 6. Insert Sample Support Cases & Interventions
INSERT INTO public.support_cases (id, class_id, student_id, category, priority, status, summary, next_follow_up_at)
VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000012', '20000000-0000-0000-0001-000000000005', 'attendance', 'high', 'open', 'អវត្តមានញឹកញាប់ដោយសារជួយធ្វើស្រែចម្ការ និងជីវភាពខ្វះខាត', CURRENT_DATE + INTERVAL '7 day'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000012', '20000000-0000-0000-0001-000000000009', 'achievement', 'medium', 'monitoring', 'ពិន្ទុគណិតវិទ្យា និងរូបវិទ្យាទាប ត្រូវការចូលរៀនបំប៉ន', CURRENT_DATE + INTERVAL '14 day'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000012', '20000000-0000-0000-0001-000000000007', 'health', 'medium', 'open', 'ភ្នែកមើលក្តារខៀនមិនសូវច្បាស់ (គំហើញ 6/12) ត្រូវការណាត់ជួបអាណាព្យាបាលកាត់វ៉ែនតា', CURRENT_DATE + INTERVAL '5 day')
ON CONFLICT (id) DO UPDATE SET summary = EXCLUDED.summary;

INSERT INTO public.support_interventions (case_id, action_type, action_date, notes, outcome)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'home_visit', CURRENT_DATE - INTERVAL '3 day', 'បានចុះសួរសុខទុក្ខដល់ផ្ទះ និងជួបអាណាព្យាបាលពន្យល់ពីសារៈសំខាន់នៃការសិក្សា', 'អាណាព្យាបាលយល់ព្រមសម្រួលឱ្យកូនមករៀនទៀងទាត់ឡើងវិញ'),
  ('30000000-0000-0000-0000-000000000002', 'remedial', CURRENT_DATE - INTERVAL '2 day', 'បានបញ្ចូលឈ្មោះក្នុងថ្នាក់បំប៉នគណិតវិទ្យាប្រចាំសប្តាហ៍', 'សិស្សចាប់ផ្តើមចូលរៀនបំប៉នបាន ២ លើក')
ON CONFLICT DO NOTHING;

-- 7. Insert Sample Home Visits
INSERT INTO public.home_visits (student_id, date, reason, parent_name, contract_notes, status)
VALUES
  ('20000000-0000-0000-0001-000000000005', CURRENT_DATE - INTERVAL '3 day', 'អវត្តមានច្រើនថ្ងៃជាប់គ្នា', 'ទិត្យ សារឿន (ឪពុក)', 'បានធ្វើកិច្ចសន្យាជំរុញឱ្យកូនមករៀន និងជួយតាមដានការងារផ្ទះ', 'submitted'),
  ('20000000-0000-0000-0001-000000000017', CURRENT_DATE - INTERVAL '6 day', 'ឈឺច្រើនដង និងមានហានិភ័យបោះបង់ការសិក្សា', 'សេង វណ្ណា (ម្តាយ)', 'បានលើកទឹកចិត្ត និងផ្តល់ជំនួយសៀវភៅប៊ិច', 'submitted')
ON CONFLICT DO NOTHING;

-- 8. Insert Activity Evidence (GEIP Documents)
INSERT INTO public.documents (class_id, uploader_id, title, type, file_url, size, category, status)
VALUES
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000012', 'ថ្នាក់បំប៉នមុខវិជ្ជាគណិតវិទ្យា (Remedial Math)', 'activity_log', 'https://storage.kruai.app/evidence/math-remedial.jpg', 'សិស្ស ១២ នាក់', 'geip', 'approved'),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000012', 'ការប្រជុំពិភាក្សាជាមួយអាណាព្យាបាលសិស្ស (Parent Meeting)', 'activity_log', 'https://storage.kruai.app/evidence/parent-meeting.jpg', 'អាណាព្យាបាល ១៨ នាក់', 'geip', 'approved'),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000012', 'ការពិនិត្យសុខភាពភ្នែក និងត្រចៀកសិស្ស (GEIP 3.3.1.3)', 'activity_log', 'https://storage.kruai.app/evidence/health-screening.jpg', 'សិស្ស ២៦ នាក់', 'geip', 'approved')
ON CONFLICT DO NOTHING;

-- 9. Insert Sample Audit Logs
INSERT INTO public.audit_logs (user_id, action, type, details)
VALUES
  ('00000000-0000-0000-0000-000000000012', 'បានកត់ត្រាវត្តមានសិស្សថ្នាក់ ១២A', 'attendance', '{"present": 24, "absent": 2}'::jsonb),
  ('00000000-0000-0000-0000-000000000012', 'បានបញ្ចូលពិន្ទុប្រចាំឆមាសទី១', 'grade', '{"period": "sem1-summary"}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'បានបង្កើតគណនីគ្រូបន្ទុកថ្នាក់ថ្មី', 'user_management', '{"role": "teacher"}'::jsonb)
ON CONFLICT DO NOTHING;
