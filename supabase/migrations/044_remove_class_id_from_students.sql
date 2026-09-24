-- 43_remove_class_id_from_students.sql
BEGIN;

-- 1. DROP ALL EXISTING RLS POLICIES ON AFFECTED TABLES
DROP POLICY IF EXISTS "Students manage scope" ON students;
DROP POLICY IF EXISTS "Visits manage scope" ON home_visits;
DROP POLICY IF EXISTS "Interventions manage scope" ON support_interventions;
DROP POLICY IF EXISTS "Parent contacts manage scope" ON parent_contacts;

-- For these, we also drop any legacy policies from 28 or 35 that might still be lingering (just in case)
DROP POLICY IF EXISTS "Teachers modify students in class" ON students;
DROP POLICY IF EXISTS "Teachers modify visits in class" ON home_visits;
DROP POLICY IF EXISTS "Teachers modify parent contacts in class" ON parent_contacts;

-- 2. RECREATE POLICIES USING student_enrollments AS THE AUTHORIZATION BRIDGE
-- We enforce that a teacher can manage a student IF that student has an active enrollment in the teacher's active class.

-- Students
CREATE POLICY "Students manage scope" ON students FOR ALL USING (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM student_enrollments se
    JOIN classes ON classes.id = se.class_id 
    WHERE se.student_id = students.id AND (
      (is_principal() AND classes.school_id = user_school_id()) OR 
      (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = se.academic_year_id AND is_active = TRUE))
    )
  )
) WITH CHECK (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM student_enrollments se
    JOIN classes ON classes.id = se.class_id 
    WHERE se.student_id = students.id AND (
      (is_principal() AND classes.school_id = user_school_id()) OR 
      (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = se.academic_year_id AND is_active = TRUE))
    )
  )
);

-- Home Visits
CREATE POLICY "Visits manage scope" ON home_visits FOR ALL USING (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM student_enrollments se
    JOIN classes ON classes.id = se.class_id 
    WHERE se.student_id = home_visits.student_id AND (
      (is_principal() AND classes.school_id = user_school_id()) OR 
      (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = se.academic_year_id AND is_active = TRUE))
    )
  )
) WITH CHECK (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM student_enrollments se
    JOIN classes ON classes.id = se.class_id 
    WHERE se.student_id = home_visits.student_id AND (
      (is_principal() AND classes.school_id = user_school_id()) OR 
      (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = se.academic_year_id AND is_active = TRUE))
    )
  )
);

-- Parent Contacts
CREATE POLICY "Parent contacts manage scope" ON parent_contacts FOR ALL USING (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM student_enrollments se
    JOIN classes ON classes.id = se.class_id 
    WHERE se.student_id = parent_contacts.student_id AND (
      (is_principal() AND classes.school_id = user_school_id()) OR 
      (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = se.academic_year_id AND is_active = TRUE))
    )
  )
) WITH CHECK (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM student_enrollments se
    JOIN classes ON classes.id = se.class_id 
    WHERE se.student_id = parent_contacts.student_id AND (
      (is_principal() AND classes.school_id = user_school_id()) OR 
      (classes.teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM academic_years WHERE id = se.academic_year_id AND is_active = TRUE))
    )
  )
);

-- Support Interventions (joins via support_cases which joins via student_enrollments)
CREATE POLICY "Interventions manage scope" ON support_interventions FOR ALL USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM support_cases WHERE support_cases.id = support_interventions.case_id AND (
    (is_principal() AND EXISTS (
        SELECT 1 FROM student_enrollments se
        JOIN classes ON classes.id = se.class_id 
        WHERE se.student_id = support_cases.student_id AND classes.school_id = user_school_id()
    )) OR 
    support_cases.teacher_id = auth.uid()
  ))
) WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM support_cases WHERE support_cases.id = support_interventions.case_id AND (
    (is_principal() AND EXISTS (
        SELECT 1 FROM student_enrollments se
        JOIN classes ON classes.id = se.class_id 
        WHERE se.student_id = support_cases.student_id AND classes.school_id = user_school_id()
    )) OR 
    support_cases.teacher_id = auth.uid()
  ))
);

-- 3. DROP COLUMNS FROM STUDENTS
-- This is the critical architectural shift. We drop the duplicate operational fields.
-- The view active_class_rosters will need to be re-created since it referenced these.
DROP VIEW IF EXISTS active_class_rosters CASCADE;

-- Drop the columns
ALTER TABLE students DROP COLUMN IF EXISTS class_id CASCADE;
ALTER TABLE students DROP COLUMN IF EXISTS desk_number CASCADE;
ALTER TABLE students DROP COLUMN IF EXISTS room_number CASCADE;

-- 4. RECREATE ACTIVE_CLASS_ROSTERS VIEW
CREATE OR REPLACE VIEW active_class_rosters AS
SELECT 
    e.class_id as enrollment_class_id, 
    c.name as class_name, 
    c.academic_year_id,
    c.teacher_id,
    e.enrollment_status as current_enrollment_status,
    e.desk_number,
    e.room_number,
    s.*
FROM student_enrollments e
JOIN classes c ON c.id = e.class_id
JOIN students s ON s.id = e.student_id
WHERE s.is_active = true 
  AND (e.enrollment_status = 'active' OR e.enrollment_status = 'enrolled' OR e.enrollment_status IS NULL);

-- 5. UPDATE FUNCTIONS
-- bulk_quick_register_students
CREATE OR REPLACE FUNCTION bulk_quick_register_students(
    student_records JSONB,
    target_year_id UUID,
    admin_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    record JSONB;
    v_student_id UUID;
    v_class_id UUID;
    v_student_id_number TEXT;
    v_full_name TEXT;
    v_gender TEXT;
    v_status TEXT;
    v_desk_number TEXT;
    v_room_number TEXT;
    
    v_dob DATE;
    v_address TEXT;
    v_father_name TEXT;
    v_father_job TEXT;
    v_father_phone TEXT;
    v_mother_name TEXT;
    v_mother_job TEXT;
    v_mother_phone TEXT;
    v_parent_phone TEXT;
    
    affected_count INT := 0;
BEGIN
    FOR record IN SELECT * FROM jsonb_array_elements(student_records)
    LOOP
        v_class_id := (record->>'class_id')::UUID;
        v_student_id_number := record->>'student_id_number';
        v_full_name := record->>'full_name';
        v_gender := record->>'gender';
        v_status := COALESCE(record->>'status', 'new');
        v_desk_number := record->>'desk_number';
        v_room_number := record->>'room_number';
        
        BEGIN
            v_dob := (record->>'dob')::DATE;
        EXCEPTION WHEN OTHERS THEN
            v_dob := NULL;
        END;

        v_address := record->>'address';
        v_father_name := record->>'father_name';
        v_father_job := record->>'father_job';
        v_father_phone := record->>'father_phone';
        v_mother_name := record->>'mother_name';
        v_mother_job := record->>'mother_job';
        v_mother_phone := record->>'mother_phone';
        
        v_parent_phone := COALESCE(v_father_phone, v_mother_phone);

        SELECT id INTO v_student_id FROM students WHERE student_id_number = v_student_id_number LIMIT 1;
        
        IF v_student_id IS NULL THEN
            -- Insert new student Master Identity
            INSERT INTO students (
                student_id_number, full_name, gender, status, is_active,
                dob, current_address, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, parent_phone
            ) VALUES (
                v_student_id_number, v_full_name, v_gender, v_status, true,
                v_dob, v_address, v_father_name, v_father_job, v_father_phone, v_mother_name, v_mother_job, v_mother_phone, v_parent_phone
            ) RETURNING id INTO v_student_id;
        ELSE
            -- Update core fields
            UPDATE students 
            SET 
                full_name = COALESCE(v_full_name, full_name),
                gender = COALESCE(v_gender, gender),
                is_active = true,
                dob = COALESCE(v_dob, dob),
                current_address = COALESCE(v_address, current_address),
                father_name = COALESCE(v_father_name, father_name),
                father_job = COALESCE(v_father_job, father_job),
                father_phone = COALESCE(v_father_phone, father_phone),
                mother_name = COALESCE(v_mother_name, mother_name),
                mother_job = COALESCE(v_mother_job, mother_job),
                mother_phone = COALESCE(v_mother_phone, mother_phone),
                parent_phone = COALESCE(v_parent_phone, parent_phone),
                updated_at = NOW()
            WHERE id = v_student_id;
        END IF;

        -- Upsert the student enrollment for the target academic year (Operational data goes here)
        INSERT INTO student_enrollments (
            student_id, class_id, academic_year_id, enrollment_status, year_result, desk_number, room_number
        ) VALUES (
            v_student_id, v_class_id, target_year_id, 'active', 'enrolled', v_desk_number, v_room_number
        )
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET
            class_id = COALESCE(EXCLUDED.class_id, student_enrollments.class_id),
            desk_number = COALESCE(EXCLUDED.desk_number, student_enrollments.desk_number),
            room_number = COALESCE(EXCLUDED.room_number, student_enrollments.room_number),
            enrollment_status = 'active',
            updated_at = NOW();

        affected_count := affected_count + 1;
    END LOOP;

    IF affected_count > 0 AND admin_user_id IS NOT NULL THEN
        INSERT INTO audit_logs (user_id, action) 
        VALUES (admin_user_id, 'បានចុះឈ្មោះសិស្សរហ័សចំនួន ' || affected_count || ' នាក់តាមរយៈការនាំចូល (Import/Grid)');
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'count', affected_count, 
        'message', 'បានចុះឈ្មោះសិស្សរហ័សចំនួន ' || affected_count || ' នាក់ដោយជោគជ័យ'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate get_principal_dashboard_stats to avoid using students.class_id
CREATE OR REPLACE FUNCTION get_principal_dashboard_stats(
    p_school_id TEXT,
    p_academic_year_id UUID
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
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
    -- Replaced active_students direct usage to join via student_enrollments
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
        FROM students s
        JOIN student_enrollments se ON se.student_id = s.id
        WHERE se.academic_year_id = p_academic_year_id
          AND se.class_id IN (SELECT id FROM active_classes)
          AND s.is_active = true
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
            COUNT(DISTINCT se.student_id) AS students_count,
            COUNT(a.id) FILTER (WHERE a.status IN ('present', 'late', 'permission', 'P')) AS att_present,
            COUNT(a.id) AS att_total,
            AVG(
                CASE WHEN g.total_score > 0 THEN (g.total_score / (CASE WHEN CAST(c.grade AS INT) >= 10 THEN 500 ELSE 400 END)) * 100 ELSE NULL END
            ) AS avg_score_pct
        FROM active_classes c
        LEFT JOIN student_enrollments se ON se.class_id = c.id AND se.academic_year_id = p_academic_year_id
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

-- 9. RECREATE PROMOTE_STUDENTS RPC
CREATE OR REPLACE FUNCTION promote_students(
    p_source_class_id UUID,
    p_target_class_id UUID,
    p_eligible_student_ids UUID[]
) RETURNS JSONB AS $$
DECLARE
    promoted_count INT := 0;
    actual_uid UUID;
    caller_school_id TEXT;
    is_authorized BOOLEAN;
    source_school_id TEXT;
    target_school_id TEXT;
    source_year_id UUID;
    target_year_id UUID;
BEGIN
    actual_uid := auth.uid();
    
    IF actual_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: You must be logged in to promote students.';
    END IF;

    -- Validate caller role and school
    SELECT role IN ('admin', 'principal'), school_id 
    INTO is_authorized, caller_school_id
    FROM profiles WHERE id = actual_uid;

    IF NOT is_authorized THEN
        RAISE EXCEPTION 'Forbidden: Only administrators or principals can perform promotions.';
    END IF;

    IF p_source_class_id = p_target_class_id THEN
        RAISE EXCEPTION 'Source and target classes cannot be the same.';
    END IF;

    -- Validate cross-school promotion
    SELECT school_id, academic_year_id INTO source_school_id, source_year_id FROM classes WHERE id = p_source_class_id;
    SELECT school_id, academic_year_id INTO target_school_id, target_year_id FROM classes WHERE id = p_target_class_id;

    IF source_school_id != target_school_id THEN
        RAISE EXCEPTION 'Forbidden: Cannot promote students across different schools.';
    END IF;

    -- If principal, ensure classes belong to their school
    IF NOT is_admin() AND caller_school_id != source_school_id THEN
        RAISE EXCEPTION 'Forbidden: You cannot promote students outside your school.';
    END IF;

    -- Upsert source enrollments (update year_result to 'promoted')
    IF source_year_id IS NOT NULL THEN
        UPDATE student_enrollments
        SET year_result = 'promoted', updated_at = NOW()
        WHERE class_id = p_source_class_id 
          AND academic_year_id = source_year_id 
          AND student_id = ANY(p_eligible_student_ids);
    END IF;

    -- Upsert target enrollments
    IF target_year_id IS NOT NULL THEN
        INSERT INTO student_enrollments (student_id, class_id, academic_year_id, enrollment_status, year_result, updated_at)
        SELECT e.student_id, p_target_class_id, target_year_id, 'active', 'enrolled', NOW()
        FROM student_enrollments e 
        WHERE e.class_id = p_source_class_id 
          AND e.student_id = ANY(p_eligible_student_ids)
          AND e.academic_year_id = source_year_id
        ON CONFLICT (student_id, academic_year_id) DO UPDATE SET 
            class_id = EXCLUDED.class_id,
            year_result = 'enrolled',
            updated_at = NOW();
    END IF;

    -- Ensure students are active
    UPDATE students SET is_active = true WHERE id = ANY(p_eligible_student_ids);

    SELECT array_length(p_eligible_student_ids, 1) INTO promoted_count;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Students promoted successfully',
        'promoted_count', COALESCE(promoted_count, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
