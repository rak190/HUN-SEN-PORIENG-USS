import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

test('Admin Role Production Gaps & Cross-Year Integrity Suite', async (t) => {
  // --------------------------------------------------------------------------
  // Scenario 1: Certificates Academic Year Isolation
  // --------------------------------------------------------------------------
  await t.test('Scenario 1: Certificates page strictly isolates classes and top student grades by selectedAcademicYearId', () => {
    const certPagePath = path.join(rootDir, 'app', '(dashboard)', 'admin', 'certificates', 'page.tsx');
    assert.ok(fs.existsSync(certPagePath), 'Certificates page must exist');
    const content = fs.readFileSync(certPagePath, 'utf8');

    // 1. Must track selectedAcademicYearId in state
    assert.ok(
      content.includes('selectedAcademicYearId') && content.includes('setSelectedAcademicYearId'),
      'Certificates page must manage selectedAcademicYearId in component state'
    );

    // 2. Must filter classesQuery by academic_year_id
    assert.ok(
      content.includes(".from('classes')") &&
      content.includes(".eq('academic_year_id', selectedAcademicYearId)"),
      'Classes count query must filter by selectedAcademicYearId'
    );

    // 3. Must filter gradesQuery by academic_year_id on both grades and class
    assert.ok(
      content.includes(".eq('period', 'annual')") &&
      content.includes(".eq('academic_year_id', selectedAcademicYearId)") &&
      content.includes(".eq('class.academic_year_id', selectedAcademicYearId)"),
      'Grades query must filter period=annual and academic_year_id on both grades table and joined class'
    );

    // 4. Must compute quota = classesCount * 3 and order by average then total_score
    assert.ok(
      content.includes('const quota = (classesCount || 0) * 3;'),
      'Cohort quota must strictly remain classesCount * 3'
    );
    assert.ok(
      content.includes(".order('average', { ascending: false, nullsFirst: false })") &&
      content.includes(".order('total_score', { ascending: false })"),
      'Grades query must rank top students by average descending then total_score descending'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Exam Standards Subject Pruning & Dynamic GPA
  // --------------------------------------------------------------------------
  await t.test('Scenario 2: Exam standards route prunes deleted subjects, verifies year lock, and respects dynamic GPA points', () => {
    const routePath = path.join(rootDir, 'app', 'api', 'admin', 'exam-standards', 'route.ts');
    assert.ok(fs.existsSync(routePath), 'Exam standards route must exist');
    const content = fs.readFileSync(routePath, 'utf8');

    // 1. Academic year lock check
    assert.ok(
      content.includes("['closed', 'archived'].includes(yearData.status)"),
      'Exam standards PATCH must reject mutations to closed or archived academic years'
    );

    // 2. Pruning deleted subjects
    assert.ok(
      content.includes(".from('exam_subject_standards')") &&
      content.includes("idsToDelete") &&
      content.includes(".delete()") &&
      content.includes(".in('id', idsToDelete)"),
      'Exam standards PATCH must identify and delete existing subject rows no longer present in incoming payload'
    );

    // 3. Respect dynamic numeric gpa_point
    assert.ok(
      content.includes('Number.isFinite(Number(r.gpa_point)) ? Number(r.gpa_point) : fallbackGpa'),
      'Exam standards PATCH must preserve custom finite numeric gpa_point values'
    );

    // 4. GET exposes gpa_point
    assert.ok(
      content.includes('gpa_point: r.gpa_point'),
      'Exam standards GET must expose gpa_point in grading ranges'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Atomic Batch Class Reassignment Migration 068
  // --------------------------------------------------------------------------
  await t.test('Scenario 3: Migration 068 defines batch_reassign_class_atomic with role guards and school boundaries', () => {
    const migration068Path = path.join(rootDir, 'supabase', 'migrations', '068_batch_reassign_class_atomic.sql');
    assert.ok(fs.existsSync(migration068Path), 'Migration 068 must exist');
    const content = fs.readFileSync(migration068Path, 'utf8');

    // 1. Function declaration
    assert.ok(
      content.includes('FUNCTION public.batch_reassign_class_atomic('),
      'Migration 068 must define batch_reassign_class_atomic RPC'
    );

    // 2. Role guards
    assert.ok(
      content.includes("v_caller_role NOT IN ('admin', 'principal')"),
      'batch_reassign_class_atomic must enforce Admin or Principal role check'
    );

    // 3. Principal school scoping
    assert.ok(
      content.includes("Forbidden: Cannot transfer students to a class outside your school institution") &&
      content.includes("Forbidden: Cannot transfer students belonging to another school institution"),
      'batch_reassign_class_atomic must prevent cross-school class reassignment by Principals'
    );

    // 4. Academic year lock check
    assert.ok(
      content.includes("v_year_status IN ('closed', 'archived')"),
      'batch_reassign_class_atomic must reject reassignment in locked academic years'
    );

    // 5. Atomic upsert into student_enrollments
    assert.ok(
      content.includes('INSERT INTO public.student_enrollments') &&
      content.includes('ON CONFLICT (student_id, academic_year_id)'),
      'batch_reassign_class_atomic must perform transactional upsert on student_enrollments'
    );

    // 6. Audit logging
    assert.ok(
      content.includes('INSERT INTO public.audit_logs') &&
      content.includes("'batch_reassign_class'"),
      'batch_reassign_class_atomic must record an audit log'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Students Actions Atomic RPC Usage
  // --------------------------------------------------------------------------
  await t.test('Scenario 4: bulkAssignClassAction and bulkTransferClass call batch_reassign_class_atomic RPC', () => {
    const actionsPath = path.join(rootDir, 'app', '(dashboard)', 'admin', 'students', 'actions.ts');
    assert.ok(fs.existsSync(actionsPath), 'Admin students actions must exist');
    const content = fs.readFileSync(actionsPath, 'utf8');

    // bulkAssignClassAction must invoke batch_reassign_class_atomic
    assert.ok(
      content.includes("supabase.rpc('batch_reassign_class_atomic'"),
      'bulkAssignClassAction and bulkTransferClass must invoke batch_reassign_class_atomic RPC'
    );

    // Verify both functions trigger revalidatePath('/admin/students')
    assert.ok(
      content.includes("revalidatePath('/admin/students')"),
      'Actions must revalidate admin students path upon completion'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 5: System Settings Cache Purge Handler
  // --------------------------------------------------------------------------
  await t.test('Scenario 5: Clear Cache in system settings is wired to /api/admin/system-actions purge-cache', () => {
    const settingsPath = path.join(rootDir, 'app', '(dashboard)', 'admin', 'system-settings', 'page.tsx');
    assert.ok(fs.existsSync(settingsPath), 'System settings page must exist');
    const content = fs.readFileSync(settingsPath, 'utf8');

    // No longer Coming Soon
    assert.ok(
      !content.includes('Coming Soon'),
      'Clear Cache must not display a Coming Soon disabled placeholder'
    );

    // Wires to purge-cache
    assert.ok(
      content.includes('/api/admin/system-actions') &&
      content.includes("action: 'purge-cache'") &&
      content.includes('isPurgingCache'),
      'Clear Cache button must call /api/admin/system-actions with purge-cache and show loading state'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Academic Years Date Sequence & Non-Empty Validation
  // --------------------------------------------------------------------------
  await t.test('Scenario 6: Academic years API rejects empty names and start_date >= end_date', () => {
    const routePath = path.join(rootDir, 'app', 'api', 'admin', 'academic-years', 'route.ts');
    assert.ok(fs.existsSync(routePath), 'Academic years route must exist');
    const content = fs.readFileSync(routePath, 'utf8');

    // Name non-empty check
    assert.ok(
      content.includes("name.trim().length === 0"),
      'Academic years route must reject empty or whitespace-only names'
    );

    // Date sequence check (start_date < end_date)
    assert.ok(
      content.includes('startDateObj >= endDateObj') || content.includes('startObj >= endObj'),
      'Academic years route must reject date ranges where start_date >= end_date'
    );

    // Khmer error message returned with HTTP 400
    assert.ok(
      content.includes('កាលបរិច្ឆេទចាប់ផ្តើមត្រូវតែនៅមុនកាលបរិច្ឆេទបញ្ចប់'),
      'Academic years route must return clear Khmer error message on invalid date sequence'
    );
  });
});
