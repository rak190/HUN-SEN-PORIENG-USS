-- 37_fix_principal_role_security.sql
BEGIN;

-- 1. DROP THE VULNERABLE POLICIES FROM MIGRATION 35
DROP POLICY IF EXISTS "Teachers modify students in class" ON students;
DROP POLICY IF EXISTS "Teachers modify attendance in class" ON attendance_records;
DROP POLICY IF EXISTS "Teachers modify grades in class" ON grades;
DROP POLICY IF EXISTS "Teachers modify grade records in class" ON grade_records;
DROP POLICY IF EXISTS "Teachers modify health in class" ON student_health_records;
DROP POLICY IF EXISTS "Teachers modify visits in class" ON home_visits;
DROP POLICY IF EXISTS "Teachers modify interventions in class" ON support_interventions;
DROP POLICY IF EXISTS "Teachers modify parent contacts in class" ON parent_contacts;
DROP POLICY IF EXISTS "Teachers modify enrollments in class" ON student_enrollments;

-- 2. OVERWRITE THE `manage scope` POLICIES FROM MIGRATION 28 
-- TO PROPERLY ENFORCE ACADEMIC YEAR ISOLATION FOR TEACHERS ONLY

-- Students
DROP POLICY IF EXISTS "Students manage scope" ON students;
CREATE POLICY "Students manage scope" ON students FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = students.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = students.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
);

-- Attendance Records
DROP POLICY IF EXISTS "Attendance manage scope" ON attendance_records;
CREATE POLICY "Attendance manage scope" ON attendance_records FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = attendance_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = attendance_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
);

-- Grades
DROP POLICY IF EXISTS "Grades manage scope" ON grades;
CREATE POLICY "Grades manage scope" ON grades FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grades.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grades.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
);

-- Grade Records
DROP POLICY IF EXISTS "Grade records manage scope" ON grade_records;
CREATE POLICY "Grade records manage scope" ON grade_records FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grade_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = grade_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
);

-- Student Health Records
DROP POLICY IF EXISTS "Health manage scope" ON student_health_records;
CREATE POLICY "Health manage scope" ON student_health_records FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_health_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_health_records.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
);

-- Home Visits
DROP POLICY IF EXISTS "Visits manage scope" ON home_visits;
CREATE POLICY "Visits manage scope" ON home_visits FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = home_visits.student_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = home_visits.student_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
);

-- Support Interventions
DROP POLICY IF EXISTS "Interventions manage scope" ON support_interventions;
CREATE POLICY "Interventions manage scope" ON support_interventions FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM support_cases WHERE support_cases.id = support_interventions.case_id AND (
    (is_principal() AND EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = support_cases.student_id AND classes.school_id = user_school_id())) OR 
    support_cases.teacher_id = auth.uid()
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM support_cases WHERE support_cases.id = support_interventions.case_id AND (
    (is_principal() AND EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = support_cases.student_id AND classes.school_id = user_school_id())) OR 
    support_cases.teacher_id = auth.uid()
  ))
);

-- Parent Contacts
DROP POLICY IF EXISTS "Parent contacts manage scope" ON parent_contacts;
CREATE POLICY "Parent contacts manage scope" ON parent_contacts FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = parent_contacts.student_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM students JOIN classes ON classes.id = students.class_id WHERE students.id = parent_contacts.student_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
);

-- Student Enrollments
DROP POLICY IF EXISTS "Enrollments manage scope" ON student_enrollments;
CREATE POLICY "Enrollments manage scope" ON student_enrollments FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_enrollments.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM classes WHERE classes.id = student_enrollments.class_id AND (
    (is_principal() AND classes.school_id = user_school_id()) OR 
    (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = classes.academic_year_id AND is_active = TRUE))
  ))
);


-- 3. PRINCIPAL DASHBOARD STATS RPC
-- Replaces massive memory usage in Next.js action
CREATE OR REPLACE FUNCTION get_principal_dashboard_stats(
    p_school_id TEXT,
    p_academic_year_id UUID
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Verify the caller is admin or principal of this school
    IF NOT is_admin() AND NOT (is_principal() AND user_school_id() = p_school_id) THEN
        RAISE EXCEPTION 'Forbidden: You do not have permission to view this school''s stats.';
    END IF;

    WITH active_classes AS (
        SELECT id, name, grade, track 
        FROM classes 
        WHERE school_id = p_school_id 
          AND academic_year_id = p_academic_year_id
          AND is_archived = false
    ),
    active_students_agg AS (
        SELECT 
            COUNT(s.id) AS total_students,
            COUNT(s.id) FILTER (WHERE s.gender IN ('F', 'ស្រី')) AS girls_count,
            COUNT(s.id) FILTER (WHERE s.dropout_risk = true OR s.is_slow_learner = true) AS at_risk_count,
            jsonb_agg(
                jsonb_build_object(
                    'id', s.id,
                    'name', s.full_name,
                    'reasons', CASE 
                        WHEN s.dropout_risk = true AND s.is_slow_learner = true THEN '["ហានិភ័យបោះបង់ការសិក្សា (អវត្តមានច្រើន / ពិន្ទុធ្លាក់ចុះ)", "សិស្សរៀនយឺត (ត្រូវការការជួយបំប៉ន)"]'::jsonb
                        WHEN s.dropout_risk = true THEN '["ហានិភ័យបោះបង់ការសិក្សា (អវត្តមានច្រើន / ពិន្ទុធ្លាក់ចុះ)"]'::jsonb
                        WHEN s.is_slow_learner = true THEN '["សិស្សរៀនយឺត (ត្រូវការការជួយបំប៉ន)"]'::jsonb
                        ELSE '["ស្ថិតក្នុងការតាមដានពិសេស"]'::jsonb
                    END,
                    'severity', CASE WHEN s.dropout_risk = true THEN 'high' ELSE 'medium' END
                )
            ) FILTER (WHERE s.dropout_risk = true OR s.is_slow_learner = true) AS at_risk_list
        FROM active_students s
        WHERE s.class_id IN (SELECT id FROM active_classes)
    ),
    attendance_stats AS (
        SELECT 
            TO_CHAR(date, 'YYYY-MM') AS month_key,
            COUNT(*) FILTER (WHERE status IN ('present', 'late', 'permission', 'P')) AS present_count,
            COUNT(*) AS total_count
        FROM attendance_records a
        WHERE a.class_id IN (SELECT id FROM active_classes)
        GROUP BY TO_CHAR(date, 'YYYY-MM')
    ),
    grade_stats AS (
        SELECT 
            period,
            AVG(
                CASE WHEN total_score > 0 THEN (total_score / (CASE WHEN CAST(c.grade AS INT) >= 10 THEN 500 ELSE 400 END)) * 100 ELSE NULL END
            ) AS avg_pct
        FROM grades g
        JOIN active_classes c ON c.id = g.class_id
        WHERE total_score > 0
        GROUP BY period
    ),
    grade_level_stats AS (
        SELECT 
            c.grade,
            COUNT(DISTINCT c.id) AS classes_count,
            COUNT(DISTINCT s.id) AS students_count,
            COUNT(a.id) FILTER (WHERE a.status IN ('present', 'late', 'permission', 'P')) AS att_present,
            COUNT(a.id) AS att_total,
            AVG(
                CASE WHEN g.total_score > 0 THEN (g.total_score / (CASE WHEN CAST(c.grade AS INT) >= 10 THEN 500 ELSE 400 END)) * 100 ELSE NULL END
            ) AS avg_score_pct
        FROM active_classes c
        LEFT JOIN active_students s ON s.class_id = c.id
        LEFT JOIN attendance_records a ON a.class_id = c.id
        LEFT JOIN grades g ON g.class_id = c.id
        GROUP BY c.grade
    )
    SELECT jsonb_build_object(
        'total_students', COALESCE((SELECT total_students FROM active_students_agg), 0),
        'girls_count', COALESCE((SELECT girls_count FROM active_students_agg), 0),
        'boys_count', COALESCE((SELECT total_students FROM active_students_agg), 0) - COALESCE((SELECT girls_count FROM active_students_agg), 0),
        'at_risk_count', COALESCE((SELECT at_risk_count FROM active_students_agg), 0),
        'at_risk_list', COALESCE((SELECT at_risk_list FROM active_students_agg), '[]'::jsonb),
        'attendance_by_month', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM attendance_stats t), '[]'::jsonb),
        'grade_by_period', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM grade_stats t), '[]'::jsonb),
        'grade_level_stats', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM grade_level_stats t), '[]'::jsonb)
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
