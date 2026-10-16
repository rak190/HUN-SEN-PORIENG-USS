import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

test('Phase 3: Page-Level Schema Query Migration Suite', async (t) => {
  const migration072Path = path.join(rootDir, 'supabase', 'migrations', '072_repair_active_views_and_health_rpc.sql');
  const gradesPath = path.join(rootDir, 'app', '(dashboard)', 'grades', 'page.tsx');
  const classGradeImportModalPath = path.join(rootDir, 'components', 'grades', 'ClassGradeImportModal.tsx');
  const reportCardsPath = path.join(rootDir, 'app', '(dashboard)', 'report-cards', 'page.tsx');
  const reportsPath = path.join(rootDir, 'app', '(dashboard)', 'reports', 'page.tsx');
  const classInfoPath = path.join(rootDir, 'app', '(dashboard)', 'classes', 'info', 'page.tsx');
  const giepReportPath = path.join(rootDir, 'app', '(dashboard)', 'giep', 'report', 'page.tsx');
  const adminClassesApiPath = path.join(rootDir, 'app', 'api', 'admin', 'classes', 'route.ts');
  const masterScoreModalPath = path.join(rootDir, 'components', 'admin', 'MasterScoreUploadModal.tsx');
  const examRoomPrintPath = path.join(rootDir, 'components', 'admin', 'ExamRoomPrintModal.tsx');
  const geipExportPath = path.join(rootDir, 'components', 'admin', 'GEIPExportModal.tsx');
  const moeysReportPrintPath = path.join(rootDir, 'app', '(dashboard)', 'admin', 'moeys-reports', 'print', 'page.tsx');
  const adminBasicImportPath = path.join(rootDir, 'components', 'admin', 'AdminBasicImportModal.tsx');
  const monitorAttendancePath = path.join(rootDir, 'app', '(dashboard)', 'monitor', 'attendance', 'page.tsx');
  const healthPagePath = path.join(rootDir, 'app', '(dashboard)', 'health', 'page.tsx');
  const studentTablePath = path.join(rootDir, 'components', 'students', 'StudentTable.tsx');
  const principalStaffPath = path.join(rootDir, 'app', '(dashboard)', 'principal', 'staff', 'page.tsx');
  const adminActionsPath = path.join(rootDir, 'app', '(dashboard)', 'admin', 'actions.ts');
  const studentProfilePath = path.join(rootDir, 'app', '(dashboard)', 'students', '[id]', 'page.tsx');

  // --------------------------------------------------------------------------
  // Scenario 1: Migration 072 View & Health RPC Integrity
  // --------------------------------------------------------------------------
  await t.test('Scenario 1: Migration 072 defines active_students with security_invoker and removes s.class_id from health RPC', () => {
    assert.ok(fs.existsSync(migration072Path), 'Migration 072 must exist in supabase/migrations/');
    const sql = fs.readFileSync(migration072Path, 'utf8');

    // 1. active_students view definition
    assert.ok(
      sql.includes('CREATE VIEW public.active_students WITH (security_invoker = true) AS') &&
      sql.includes('FROM public.students') &&
      sql.includes('WHERE is_active = true'),
      'Migration 072 must create active_students view with security_invoker = true'
    );

    // 2. upsert_health_records_atomic RPC definition
    assert.ok(
      sql.includes('FUNCTION public.upsert_health_records_atomic(') &&
      sql.includes('FROM public.student_enrollments se') &&
      !sql.includes('s.class_id = v_class_id'),
      'upsert_health_records_atomic must validate through student_enrollments without referencing dropped s.class_id'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 2: /api/admin/classes Computes Enrollments from student_enrollments
  // --------------------------------------------------------------------------
  await t.test('Scenario 2: /api/admin/classes computes counts via student_enrollments scoped to academic year', () => {
    assert.ok(fs.existsSync(adminClassesApiPath), 'Admin classes route file must exist');
    const content = fs.readFileSync(adminClassesApiPath, 'utf8');

    assert.ok(
      !content.includes('students(id, gender, is_active)'),
      'classes route must not query obsolete students foreign key on classes table'
    );

    assert.ok(
      content.includes('.from(\'student_enrollments\')') &&
      content.includes('students!inner(id, gender, is_active)') &&
      content.includes('eq(\'enrollment_status\', \'active\')') &&
      content.includes('student_count: counts.total') &&
      content.includes('female_count: counts.female'),
      'classes route must aggregate live student_count and female_count from student_enrollments'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Core Academic Pages Query active_class_rosters
  // --------------------------------------------------------------------------
  await t.test('Scenario 3: /grades, /report-cards, /reports, /classes/info, and /giep/report query active_class_rosters', () => {
    // /grades
    const gradesContent = fs.readFileSync(gradesPath, 'utf8');
    assert.ok(
      gradesContent.includes('.from(\'active_class_rosters\')') &&
      gradesContent.includes('.eq(\'enrollment_class_id\', activeClass?.id || \'\')') &&
      gradesContent.includes('academicYearId='),
      '/grades must query active_class_rosters and pass academicYearId to ClassGradeImportModal'
    );

    // ClassGradeImportModal
    const modalContent = fs.readFileSync(classGradeImportModalPath, 'utf8');
    assert.ok(
      modalContent.includes('academicYearId?: string') &&
      modalContent.includes('academic_year_id: academicYearId || null') &&
      modalContent.includes('student_id,period,academic_year_id'),
      'ClassGradeImportModal must include academic_year_id in grades upsert with multi-year conflict target'
    );

    // /report-cards
    const reportCardsContent = fs.readFileSync(reportCardsPath, 'utf8');
    assert.ok(
      reportCardsContent.includes('.from(\'active_class_rosters\')') &&
      reportCardsContent.includes('.eq(\'enrollment_class_id\', activeClass.id)'),
      '/report-cards must query active_class_rosters by enrollment_class_id'
    );

    // /reports
    const reportsContent = fs.readFileSync(reportsPath, 'utf8');
    assert.ok(
      reportsContent.includes('.from(\'active_class_rosters\')') &&
      reportsContent.includes('.eq(\'enrollment_class_id\', activeClass?.id)'),
      '/reports must query active_class_rosters by enrollment_class_id'
    );

    // /classes/info
    const classInfoContent = fs.readFileSync(classInfoPath, 'utf8');
    assert.ok(
      classInfoContent.includes('.from(\'active_class_rosters\')') &&
      classInfoContent.includes('.eq(\'enrollment_class_id\', activeClass.id)'),
      '/classes/info must query active_class_rosters by enrollment_class_id'
    );

    // /giep/report
    const giepContent = fs.readFileSync(giepReportPath, 'utf8');
    assert.ok(
      giepContent.includes('.from(\'active_class_rosters\')') &&
      giepContent.includes('enrollment_class_id') &&
      giepContent.includes('class_id: s.enrollment_class_id'),
      '/giep/report must query active_class_rosters and map class_id from enrollment_class_id'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Admin Modals & Reports Query active_class_rosters
  // --------------------------------------------------------------------------
  await t.test('Scenario 4: MasterScoreUploadModal, ExamRoomPrintModal, GEIPExportModal, and MOEYS Print query active_class_rosters', () => {
    // MasterScoreUploadModal
    const masterModalContent = fs.readFileSync(masterScoreModalPath, 'utf8');
    assert.ok(
      masterModalContent.includes('.from(\'active_class_rosters\')') &&
      masterModalContent.includes('rosterQuery.eq(\'academic_year_id\', academicYearId)') &&
      masterModalContent.includes('class_id: s.enrollment_class_id'),
      'MasterScoreUploadModal must query active_class_rosters scoped to academicYearId and map class_id'
    );

    // ExamRoomPrintModal
    const examPrintContent = fs.readFileSync(examRoomPrintPath, 'utf8');
    assert.ok(
      examPrintContent.includes('.from(\'active_class_rosters\')') &&
      examPrintContent.includes('class_id: s.enrollment_class_id') &&
      !examPrintContent.includes('classes(id, name, grade, track)'),
      'ExamRoomPrintModal must query active_class_rosters for seating without broken classes relation'
    );

    // GEIPExportModal
    const geipExportContent = fs.readFileSync(geipExportPath, 'utf8');
    assert.ok(
      geipExportContent.includes('.from(\'active_class_rosters\')') &&
      geipExportContent.includes('class_id: s.enrollment_class_id'),
      'GEIPExportModal must query active_class_rosters and map class_id for section grouping'
    );

    // MOEYS Print Report
    const moeysPrintContent = fs.readFileSync(moeysReportPrintPath, 'utf8');
    assert.ok(
      moeysPrintContent.includes('.from(\'active_class_rosters\')') &&
      moeysPrintContent.includes('class_name') &&
      !moeysPrintContent.includes('classes(name)'),
      'MOEYS print page must query active_class_rosters and use class_name'
    );

    // AdminBasicImportModal
    const adminBasicContent = fs.readFileSync(adminBasicImportPath, 'utf8');
    assert.ok(
      adminBasicContent.includes('.from(\'active_class_rosters\')') &&
      adminBasicContent.includes('class_id: d.enrollment_class_id'),
      'AdminBasicImportModal must query active_class_rosters for existing student duplicates'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Health, Attendance, Staff, and Seating Table Updates
  // --------------------------------------------------------------------------
  await t.test('Scenario 5: /monitor/attendance, /health, /principal/staff, StudentTable, and Admin Dashboard migrated', () => {
    // /monitor/attendance
    const monitorAttContent = fs.readFileSync(monitorAttendancePath, 'utf8');
    assert.ok(
      monitorAttContent.includes('.from(\'active_class_rosters\')') &&
      monitorAttContent.includes('.eq(\'enrollment_class_id\', activeClass.id)'),
      '/monitor/attendance must query active_class_rosters'
    );

    // /health
    const healthContent = fs.readFileSync(healthPagePath, 'utf8');
    assert.ok(
      healthContent.includes('.from(\'active_class_rosters\')') &&
      healthContent.includes('.in(\'enrollment_class_id\', classIds)') &&
      healthContent.includes('.eq(\'school_id\', profile.school_id)'),
      '/health must query active_class_rosters by enrollment_class_id and school_id'
    );

    // StudentTable inline edits
    const studentTableContent = fs.readFileSync(studentTablePath, 'utf8');
    assert.ok(
      studentTableContent.includes('.from(\'student_enrollments\').update({ desk_number: val || null }).eq(\'student_id\', std.id)') &&
      studentTableContent.includes('.from(\'student_enrollments\').update({ room_number: val || null }).eq(\'student_id\', std.id)'),
      'StudentTable onBlur must update student_enrollments for desk_number and room_number'
    );

    // /principal/staff
    const principalStaffContent = fs.readFileSync(principalStaffPath, 'utf8');
    assert.ok(
      principalStaffContent.includes('.from(\'student_enrollments\')') &&
      principalStaffContent.includes('.eq(\'enrollment_status\', \'active\')'),
      '/principal/staff must query student_enrollments to count class sizes'
    );

    // Admin actions (Dashboard metrics)
    const adminActionsContent = fs.readFileSync(adminActionsPath, 'utf8');
    assert.ok(
      adminActionsContent.includes('.from(\'student_enrollments\')') &&
      adminActionsContent.includes('.from(\'active_class_rosters\')') &&
      adminActionsContent.includes('totalStudentsQuery.eq(\'academic_year_id\', yearId)') &&
      adminActionsContent.includes('compQuery.eq(\'academic_year_id\', yearId)'),
      'Admin dashboard actions must query student_enrollments and active_class_rosters scoped by yearId'
    );

    // Student Profile [id] page
    const studentProfileContent = fs.readFileSync(studentProfilePath, 'utf8');
    assert.ok(
      studentProfileContent.includes('student_enrollments(class_id, enrollment_status, classes(name))') &&
      !studentProfileContent.includes('.select(\'*, classes(name)\')'),
      'Student profile page must join student_enrollments to resolve class_name'
    );
  });
});
