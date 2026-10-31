import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(__dirname, '../..');

test('Phase 4: Workflow Polish & Mock Data Purge Suite', async (t) => {
  const migration073Path = path.join(rootDir, 'supabase', 'migrations', '073_create_giep_notes_and_monitor_assignment.sql');
  const giepActionsPath = path.join(rootDir, 'app', '(dashboard)', 'giep', 'actions.ts');
  const giepPagePath = path.join(rootDir, 'app', '(dashboard)', 'giep', 'page.tsx');
  const monitorAttendancePath = path.join(rootDir, 'app', '(dashboard)', 'monitor', 'attendance', 'page.tsx');
  const monitorMissingPath = path.join(rootDir, 'app', '(dashboard)', 'monitor', 'missing', 'page.tsx');
  const gridModalPath = path.join(rootDir, 'components', 'students', 'StudentGridEntryModal.tsx');
  const importModalPath = path.join(rootDir, 'components', 'students', 'StudentImportModal.tsx');

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
  await t.test('Scenario 2: Monitor submission cannot bypass authentication',async()=>{
    const {submitMonitorAttendanceAction}=await import('../../app/(dashboard)/attendance/actions');
    const result=await submitMonitorAttendanceAction({class_id:'00000000-0000-4000-8000-000000000020',academic_year_id:'00000000-0000-4000-8000-000000000010',date:'2026-10-20',records:[{student_id:'00000000-0000-4000-8000-000000000101',status:'present'}]});
    assert.equal(result.success,false);
    assert.ok(result.error);
    // Role/class/year, original-value conflicts, all-or-nothing writes and audit failure run in PostgreSQL.
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

    // Monitor class resolution is covered behaviorally in monitor-auth-context.test.ts.
  });
});
