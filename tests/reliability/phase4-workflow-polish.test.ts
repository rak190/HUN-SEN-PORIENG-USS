import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(__dirname, '../..');

test('Phase 4: Workflow Polish & Mock Data Purge Suite', async (t) => {
  const migration073Path = path.join(rootDir, 'supabase', 'migrations', '073_create_giep_notes_and_monitor_assignment.sql');
  const attendanceActionsPath = path.join(rootDir, 'app', '(dashboard)', 'attendance', 'actions.ts');
  const giepActionsPath = path.join(rootDir, 'app', '(dashboard)', 'giep', 'actions.ts');
  const giepPagePath = path.join(rootDir, 'app', '(dashboard)', 'giep', 'page.tsx');
  const monitorAttendancePath = path.join(rootDir, 'app', '(dashboard)', 'monitor', 'attendance', 'page.tsx');
  const monitorMissingPath = path.join(rootDir, 'app', '(dashboard)', 'monitor', 'missing', 'page.tsx');
  const gridModalPath = path.join(rootDir, 'components', 'students', 'StudentGridEntryModal.tsx');
  const importModalPath = path.join(rootDir, 'components', 'students', 'StudentImportModal.tsx');
  const authContextPath = path.join(rootDir, 'lib', 'auth-context.tsx');

  // --------------------------------------------------------------------------
  // Scenario 1: Migration 073 Schema, Backfill, and RLS
  // --------------------------------------------------------------------------
  await t.test('Scenario 1: Migration 073 defines giep_notes, adds monitor_id to classes, and sets RLS', () => {
    assert.ok(fs.existsSync(migration073Path), '073_create_giep_notes_and_monitor_assignment.sql must exist');
    const sql = fs.readFileSync(migration073Path, 'utf8');

    // 1. monitor_id on classes
    assert.ok(
      sql.includes('ALTER TABLE public.classes') && sql.includes('ADD COLUMN IF NOT EXISTS monitor_id UUID'),
      'Migration 073 must add monitor_id to classes'
    );

    // 2. giep_notes table
    assert.ok(
      sql.includes('CREATE TABLE IF NOT EXISTS public.giep_notes') &&
      sql.includes('activity_name TEXT NOT NULL') &&
      sql.includes('activity_date DATE NOT NULL') &&
      sql.includes('class_id UUID NOT NULL REFERENCES public.classes'),
      'Migration 073 must create public.giep_notes table with foreign keys'
    );

    // 3. Data backfill from documents
    assert.ok(
      sql.includes('INSERT INTO public.giep_notes') &&
      sql.includes("FROM public.documents d") &&
      sql.includes("category IN ('geip', 'giep')"),
      'Migration 073 must backfill legacy GIEP notes from documents table'
    );

    // 4. Row Level Security policies
    assert.ok(
      sql.includes('ALTER TABLE public.giep_notes ENABLE ROW LEVEL SECURITY;') &&
      sql.includes('giep_notes_select_policy') &&
      sql.includes('giep_notes_insert_policy') &&
      sql.includes('giep_notes_update_policy') &&
      sql.includes('giep_notes_delete_policy'),
      'Migration 073 must define complete RLS policies on giep_notes'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 2: submitMonitorAttendanceAction Server Authorization
  // --------------------------------------------------------------------------
  await t.test('Scenario 2: submitMonitorAttendanceAction validates authentication, monitor assignment, and locks', () => {
    assert.ok(fs.existsSync(attendanceActionsPath), 'attendance/actions.ts must exist');
    const content = fs.readFileSync(attendanceActionsPath, 'utf8');

    assert.ok(
      content.includes('export async function submitMonitorAttendanceAction'),
      'actions.ts must export submitMonitorAttendanceAction'
    );

    // Authentication and role guard
    assert.ok(
      content.includes("['monitor', 'teacher', 'admin', 'principal'].includes(role)"),
      'submitMonitorAttendanceAction must restrict to monitor, teacher, admin, principal'
    );

    // Monitor assignment check
    assert.ok(
      content.includes('classData.monitor_id === user.id || classData.teacher_id === user.id'),
      'submitMonitorAttendanceAction must verify monitor-to-class assignment'
    );

    // School boundary guard
    assert.ok(
      content.includes('classData.school_id !== profile.school_id'),
      'submitMonitorAttendanceAction must verify school boundary'
    );

    // Academic year lock check
    assert.ok(
      content.includes("['closed', 'archived'].includes(yearData.status)"),
      'submitMonitorAttendanceAction must verify academic year is not locked'
    );

    // Student enrollment check
    assert.ok(
      content.includes('.from(\'student_enrollments\')') &&
      content.includes('.eq(\'enrollment_status\', \'active\')'),
      'submitMonitorAttendanceAction must verify active student enrollments'
    );

    // Service role admin client upsert with authoritative constraint target
    assert.ok(
      content.includes("onConflict: 'student_id,date,academic_year_id'"),
      'submitMonitorAttendanceAction must use onConflict: student_id,date,academic_year_id'
    );

    // Audit logging
    assert.ok(
      content.includes(".from('audit_logs').insert"),
      'submitMonitorAttendanceAction must insert an audit log'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Purge Mock Data Fallbacks in Monitor Pages
  // --------------------------------------------------------------------------
  await t.test('Scenario 3: /monitor/attendance and /monitor/missing contain zero fictional rosters or dates', () => {
    assert.ok(fs.existsSync(monitorAttendancePath), 'monitor/attendance/page.tsx must exist');
    const attContent = fs.readFileSync(monitorAttendancePath, 'utf8');

    // Must NOT contain fictional student array
    assert.ok(
      !attContent.includes("name: 'កែវ ច័ន្ទធីតា'"),
      'monitor attendance page must NOT contain fictional student names'
    );
    assert.ok(
      !attContent.includes('studentsData.length < 15'),
      'monitor attendance page must NOT inject fake students when count < 15'
    );
    assert.ok(
      !attContent.includes('mockPast.setDate'),
      'monitor attendance page must NOT inject fake missing dates'
    );

    // Must call submitMonitorAttendanceAction
    assert.ok(
      attContent.includes('submitMonitorAttendanceAction'),
      'monitor attendance page must call submitMonitorAttendanceAction'
    );

    // /monitor/missing page check
    assert.ok(fs.existsSync(monitorMissingPath), 'monitor/missing/page.tsx must exist');
    const missContent = fs.readFileSync(monitorMissingPath, 'utf8');
    assert.ok(
      !missContent.includes('mockPast.setDate'),
      'monitor missing page must NOT generate fake missing dates'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Student Modals Fail Closed on Missing Class
  // --------------------------------------------------------------------------
  await t.test('Scenario 4: StudentGridEntryModal and StudentImportModal do NOT simulate success when !activeClass', () => {
    assert.ok(fs.existsSync(gridModalPath), 'StudentGridEntryModal.tsx must exist');
    const gridContent = fs.readFileSync(gridModalPath, 'utf8');

    assert.ok(
      !gridContent.includes('if (isDemoMode || !activeClass)'),
      'StudentGridEntryModal must NOT simulate success when !activeClass'
    );
    assert.ok(
      gridContent.includes('if (!activeClass)'),
      'StudentGridEntryModal must explicitly check and reject !activeClass'
    );

    assert.ok(fs.existsSync(importModalPath), 'StudentImportModal.tsx must exist');
    const importContent = fs.readFileSync(importModalPath, 'utf8');
    assert.ok(
      !importContent.includes('if (isDemoMode || !activeClass)'),
      'StudentImportModal must NOT simulate success when !activeClass'
    );
    assert.ok(
      importContent.includes('if (!activeClass)'),
      'StudentImportModal must explicitly check and reject !activeClass'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 5: GIEP Module Migrated to giep_notes and Server Actions
  // --------------------------------------------------------------------------
  await t.test('Scenario 5: /giep and giep/actions.ts operate on giep_notes table with requireClassAccess', () => {
    assert.ok(fs.existsSync(giepActionsPath), 'giep/actions.ts must exist');
    const actionsContent = fs.readFileSync(giepActionsPath, 'utf8');

    assert.ok(
      actionsContent.includes('saveGiepNoteAction') && actionsContent.includes('deleteGiepNoteAction'),
      'giep/actions.ts must export saveGiepNoteAction and deleteGiepNoteAction'
    );
    assert.ok(
      actionsContent.includes('requireClassAccess(validated.class_id)'),
      'saveGiepNoteAction must enforce requireClassAccess'
    );
    assert.ok(
      actionsContent.includes(".from('giep_notes')"),
      'saveGiepNoteAction must target giep_notes table'
    );

    assert.ok(fs.existsSync(giepPagePath), 'giep/page.tsx must exist');
    const pageContent = fs.readFileSync(giepPagePath, 'utf8');
    assert.ok(
      pageContent.includes(".from('giep_notes')"),
      'giep/page.tsx must load evidence from giep_notes table'
    );
    assert.ok(
      pageContent.includes('saveGiepNoteAction'),
      'giep/page.tsx must call saveGiepNoteAction'
    );
    assert.ok(
      !pageContent.includes(".from('documents').insert"),
      'giep/page.tsx must NOT insert activity logs into documents table'
    );

    // auth-context.tsx monitor support
    assert.ok(fs.existsSync(authContextPath), 'auth-context.tsx must exist');
    const authContent = fs.readFileSync(authContextPath, 'utf8');
    assert.ok(
      authContent.includes('monitor_id.eq.'),
      'auth-context.tsx must query monitor_id for class assignment'
    );
  });
});
