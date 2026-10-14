import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Stage 2 Reliability, Domain Business Logic & Operational Robustness Regression Suite
 * Tests actual production files for contract consistency, timezone math, schema alignment,
 * role guards, and failure recovery.
 */

test('Stage 2: Operational Reliability & Schema Integrity Suite', async (t) => {
  const rootDir = process.cwd();
  const migrationsDir = path.resolve(rootDir, 'supabase/migrations');

  // --------------------------------------------------------------------------
  // Scenario 1: Attendance Conflict Key & Schema Alignment
  // --------------------------------------------------------------------------
  await t.test('Scenario 1: Monitor attendance page provides academic_year_id and uses authoritative constraint', () => {
    const monitorAttendancePath = path.resolve(rootDir, 'app/(dashboard)/monitor/attendance/page.tsx');
    assert.ok(fs.existsSync(monitorAttendancePath), 'Monitor attendance page must exist');
    const content = fs.readFileSync(monitorAttendancePath, 'utf8');

    assert.ok(
      content.includes("onConflict: 'student_id,date,academic_year_id'"),
      'Monitor attendance page must use onConflict: student_id,date,academic_year_id matching migration 045'
    );
    assert.ok(
      !content.includes("onConflict: 'class_id,student_id,date'"),
      'Monitor attendance page must NOT use obsolete class_id,student_id,date conflict target'
    );
    assert.ok(
      content.includes('academic_year_id: targetYearId'),
      'Monitor attendance page must provide academic_year_id column in upsert payload'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Admin Dashboard UTC+7 Date Handling & Month Boundaries
  // --------------------------------------------------------------------------
  await t.test('Scenario 2: Admin dashboard date math preserves Cambodia UTC+7 semantics without ISO date slippage', () => {
    const adminPagePath = path.resolve(rootDir, 'app/(dashboard)/admin/page.tsx');
    const adminClientPath = path.resolve(rootDir, 'app/(dashboard)/admin/DashboardClient.tsx');
    assert.ok(fs.existsSync(adminPagePath), 'Admin dashboard page must exist');
    assert.ok(fs.existsSync(adminClientPath), 'Admin dashboard client must exist');

    const pageContent = fs.readFileSync(adminPagePath, 'utf8');
    const clientContent = fs.readFileSync(adminClientPath, 'utf8');

    // Ensure Asia/Phnom_Penh formatter is used for today's date
    assert.ok(
      pageContent.includes("timeZone: 'Asia/Phnom_Penh'"),
      'Admin dashboard must format current date in Asia/Phnom_Penh timezone'
    );

    // Verify month parameter regex validation
    assert.ok(
      pageContent.includes('/^\\d{4}-(0[1-9]|1[0-2])$/'),
      'Admin dashboard must validate month parameter against YYYY-MM format'
    );

    // Verify startMonthStr uses string math YYYY-MM-01 instead of Date.toISOString()
    assert.ok(
      pageContent.includes('`${currentMonthStr}-01`'),
      'Admin dashboard must construct startMonthStr via explicit YYYY-MM-01 string math'
    );

    // Verify DashboardClient academic year month generator does not use Date.toISOString()
    assert.ok(
      clientContent.includes('const value = `${year}-${String(monthNum).padStart(2, \'0\')}`'),
      'DashboardClient must format month options using calendar math to avoid UTC month slippage'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Admin Dashboard Scoping & Query Error Handling
  // --------------------------------------------------------------------------
  await t.test('Scenario 3: Admin dashboard queries are scoped by userSchoolId and capture dbErrors', () => {
    const adminPagePath = path.resolve(rootDir, 'app/(dashboard)/admin/page.tsx');
    const content = fs.readFileSync(adminPagePath, 'utf8');

    assert.ok(
      content.includes('userSchoolId = profile.school_id'),
      'Admin dashboard must derive userSchoolId from trusted server profile'
    );
    assert.ok(
      content.includes("classesQuery.eq('school_id', userSchoolId)"),
      'Classes query must be filtered by userSchoolId'
    );
    assert.ok(
      content.includes("teachersQuery.eq('school_id', userSchoolId)"),
      'Teachers query must be filtered by userSchoolId'
    );
    assert.ok(
      content.includes('dbErrors.push('),
      'Admin dashboard must record query errors instead of silently converting failures to zero'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Migration 067 Empty Snapshot Rollback & Score Bounds
  // --------------------------------------------------------------------------
  await t.test('Scenario 4: Migration 067 hardens empty snapshot rollback and score validation in RPCs', () => {
    const migration067Path = path.join(migrationsDir, '067_harden_rollback_and_batch_rpcs.sql');
    assert.ok(fs.existsSync(migration067Path), 'Migration 067 must exist');
    const content = fs.readFileSync(migration067Path, 'utf8');

    // 1. Empty snapshot handling
    assert.ok(
      content.includes('Case B: Legitimately empty snapshot'),
      'rollback_grade_snapshot_atomic must handle legitimately empty snapshots'
    );
    assert.ok(
      content.includes('DELETE FROM public.grades') && content.includes('class_id = v_class_id'),
      'rollback_grade_snapshot_atomic must delete post-snapshot grades for target class when snapshot is empty'
    );

    // 2. Score bounds validation in batch_upload_scores_atomic
    assert.ok(
      content.includes('Validation Error: Total score cannot be negative'),
      'batch_upload_scores_atomic must reject negative scores'
    );
    assert.ok(
      content.includes('Validation Error: Total score exceeds maximum allowed ceiling'),
      'batch_upload_scores_atomic must reject scores exceeding maximum ceiling'
    );

    // 3. Schema types in batch_register_students_atomic
    assert.ok(
      content.includes('v_caller_school_id TEXT;') && content.includes('v_class_school_id TEXT;'),
      'batch_register_students_atomic must declare school_id variables as TEXT, matching schools.id schema'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Student Transfer & Status Synchronization
  // --------------------------------------------------------------------------
  await t.test('Scenario 5: Student status mutations synchronize students.is_active and student_enrollments', () => {
    const studentActionsPath = path.resolve(rootDir, 'app/(dashboard)/students/actions.ts');
    const adminStudentActionsPath = path.resolve(rootDir, 'app/(dashboard)/admin/students/actions.ts');
    assert.ok(fs.existsSync(studentActionsPath), 'students/actions.ts must exist');
    assert.ok(fs.existsSync(adminStudentActionsPath), 'admin/students/actions.ts must exist');

    const studentContent = fs.readFileSync(studentActionsPath, 'utf8');
    const adminContent = fs.readFileSync(adminStudentActionsPath, 'utf8');

    // updateStudentStatusAction
    assert.ok(
      studentContent.includes('export async function updateStudentStatusAction'),
      'students/actions.ts must export updateStudentStatusAction'
    );
    assert.ok(
      studentContent.includes("is_active: false"),
      'updateStudentStatusAction must set is_active = false on students when transferred or dropped'
    );
    assert.ok(
      studentContent.includes("enrollment_status: enrollmentStatus"),
      'updateStudentStatusAction must update student_enrollments.enrollment_status'
    );
    assert.ok(
      studentContent.includes('export async function fetchStudentTransferHistoryAction'),
      'students/actions.ts must export fetchStudentTransferHistoryAction'
    );

    // bulkUpdateStudentStatus in admin
    assert.ok(
      adminContent.includes('const isActive = (status === \'active\' || status === \'enrolled\');'),
      'bulkUpdateStudentStatus must compute isActive state'
    );
    assert.ok(
      adminContent.includes('.from(\'students\')') && adminContent.includes('is_active: isActive'),
      'bulkUpdateStudentStatus must synchronize students.is_active with enrollment status'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Auth Session Cleanup on Role Mismatch & Unassigned Teacher Isolation
  // --------------------------------------------------------------------------
  await t.test('Scenario 6: Auth context signs out on role mismatch and isolates unassigned teachers', () => {
    const authContextPath = path.resolve(rootDir, 'lib/auth-context.tsx');
    assert.ok(fs.existsSync(authContextPath), 'lib/auth-context.tsx must exist');
    const content = fs.readFileSync(authContextPath, 'utf8');

    // Sign out on role mismatch
    assert.ok(
      content.includes('await supabase.auth.signOut();') && content.includes('effectiveRole !== expectedRole'),
      'login must immediately call supabase.auth.signOut() if role does not match expected role'
    );

    // Pass role to refreshClassesForUser
    assert.ok(
      content.includes('await refreshClassesForUser(dbProfile.id, effectiveRole'),
      'login must pass effectiveRole to refreshClassesForUser'
    );

    // Unassigned teacher isolation
    assert.ok(
      content.includes("if (userRole === 'teacher') {") && content.includes('setClasses([]);'),
      'refreshClassesForUser must isolate unassigned teachers with empty classes rather than leaking all classes'
    );

    // Logout cache purge
    assert.ok(
      content.includes("window.caches.delete(key)") && content.includes("static-image-assets"),
      'logout must purge static-image-assets from Cache Storage'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Next.js Rewrite & PWA Runtime Cache Hardening
  // --------------------------------------------------------------------------
  await t.test('Scenario 7: next.config.ts removes localhost:3001 rewrite and restricts image caching', () => {
    const nextConfigPath = path.resolve(rootDir, 'next.config.ts');
    assert.ok(fs.existsSync(nextConfigPath), 'next.config.ts must exist');
    const content = fs.readFileSync(nextConfigPath, 'utf8');

    // Verify 127.0.0.1:3001 is guarded by development flag
    assert.ok(
      content.includes("ENABLE_LOCAL_POSTGREST_PROXY === 'true'"),
      'next.config.ts must NOT enable localhost:3001 proxy unconditionally in production'
    );

    // Verify image caching is scoped to public UI assets
    assert.ok(
      content.includes("/^\\/(?:icons|images|_next\\/static)\\/.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i"),
      'PWA image caching must only match public application UI paths and exclude private student media'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 8: CI Environment Configuration Template
  // --------------------------------------------------------------------------
  await t.test('Scenario 8: .env.example exists and defines all required system variables', () => {
    const envExamplePath = path.resolve(rootDir, '.env.example');
    assert.ok(fs.existsSync(envExamplePath), '.env.example must exist');
    const content = fs.readFileSync(envExamplePath, 'utf8');

    assert.ok(content.includes('NEXT_PUBLIC_SUPABASE_URL='), '.env.example must define NEXT_PUBLIC_SUPABASE_URL');
    assert.ok(content.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY='), '.env.example must define NEXT_PUBLIC_SUPABASE_ANON_KEY');
    assert.ok(content.includes('SUPABASE_SERVICE_ROLE_KEY='), '.env.example must define SUPABASE_SERVICE_ROLE_KEY');
  });
});
