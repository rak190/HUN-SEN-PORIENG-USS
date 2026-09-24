-- 06_secure_rls_policies.sql
BEGIN;

-- Helper function to check if user is admin or principal (Bypasses RLS on profiles to avoid recursion)
CREATE OR REPLACE FUNCTION is_admin_or_principal()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'principal')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Drop the overly permissive policies if they exist
DROP POLICY IF EXISTS "Allow read/write access to profiles for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow read/write access to schools for authenticated users" ON schools;
DROP POLICY IF EXISTS "Allow read/write access to classes for authenticated users" ON classes;
DROP POLICY IF EXISTS "Allow read/write access to students for authenticated users" ON students;
DROP POLICY IF EXISTS "Allow read/write access to attendance_records for authenticated users" ON attendance_records;
DROP POLICY IF EXISTS "Allow read/write access to grades for authenticated users" ON grades;
DROP POLICY IF EXISTS "Allow read/write access to ai_generations for authenticated users" ON ai_generations;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Schools viewable by all" ON schools;
DROP POLICY IF EXISTS "Classes viewable by all" ON classes;
DROP POLICY IF EXISTS "Teachers can update own classes" ON classes;
DROP POLICY IF EXISTS "Students viewable by all" ON students;
DROP POLICY IF EXISTS "Teachers can modify students in their class" ON students;
DROP POLICY IF EXISTS "Attendance viewable by all" ON attendance_records;
DROP POLICY IF EXISTS "Teachers can modify attendance in their class" ON attendance_records;
DROP POLICY IF EXISTS "Grades viewable by all" ON grades;
DROP POLICY IF EXISTS "Teachers can modify grades in their class" ON grades;
DROP POLICY IF EXISTS "Users can manage own AI generations" ON ai_generations;

-- 2. Profiles: Users can read all, update their own. Admins can update all.
CREATE POLICY "Profiles viewable by everyone" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin_or_principal());
CREATE POLICY "Admins insert profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id OR is_admin_or_principal());
CREATE POLICY "Admins delete profile" ON profiles FOR DELETE USING (is_admin_or_principal());

-- 3. Schools: Viewable by all. Admins can insert/update/delete.
CREATE POLICY "Schools viewable by all" ON schools FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage schools" ON schools FOR ALL USING (is_admin_or_principal());

-- 4. Classes: Viewable by all. Teachers can update own classes. Admins/Principals full access.
CREATE POLICY "Classes viewable by all" ON classes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers can update own classes" ON classes FOR UPDATE USING (teacher_id = auth.uid() OR is_admin_or_principal());
CREATE POLICY "Admins can manage classes" ON classes FOR ALL USING (is_admin_or_principal());

-- 5. Students: Viewable by all. Teachers can insert/update in their classes.
CREATE POLICY "Students viewable by all" ON students FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers modify students in class" ON students FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM classes WHERE classes.id = students.class_id AND classes.teacher_id = auth.uid()
  )
);

-- 6. Attendance & Grades: Viewable by all. Teachers can only modify their own classes.
CREATE POLICY "Attendance viewable by all" ON attendance_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers modify attendance in class" ON attendance_records FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM classes WHERE classes.id = attendance_records.class_id AND classes.teacher_id = auth.uid()
  )
);

CREATE POLICY "Grades viewable by all" ON grades FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers modify grades in class" ON grades FOR ALL USING (
  is_admin_or_principal() OR
  EXISTS (
    SELECT 1 FROM classes WHERE classes.id = grades.class_id AND classes.teacher_id = auth.uid()
  )
);

-- 7. AI Generations: Users can read/write their own.
CREATE POLICY "Manage AI generations" ON ai_generations FOR ALL USING (teacher_id = auth.uid() OR is_admin_or_principal());

COMMIT;
