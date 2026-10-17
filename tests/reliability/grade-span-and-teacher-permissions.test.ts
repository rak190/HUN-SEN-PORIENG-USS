import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Grade Span (7-12) & Teacher Permission Hardening Suite', () => {
  const rootDir = process.cwd();

  // ==========================================================================
  // SCENARIO 1: Grades 7-12 Scope in Admin Classes UI & Resolver
  // ==========================================================================
  it('Scenario 1: Admin classes page and useClasses filter dropdown fully support grades 7 to 12', () => {
    const pagePath = path.join(rootDir, 'app', '(dashboard)', 'admin', 'classes', 'page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf-8');

    // Must include options for Grades 7 through 12
    assert.ok(pageContent.includes('ថ្នាក់ទី ៧'), 'classes page must include option for ថ្នាក់ទី ៧');
    assert.ok(pageContent.includes('ថ្នាក់ទី ៨'), 'classes page must include option for ថ្នាក់ទី ៨');
    assert.ok(pageContent.includes('ថ្នាក់ទី ៩'), 'classes page must include option for ថ្នាក់ទី ៩');
    assert.ok(pageContent.includes('ថ្នាក់ទី ១០'), 'classes page must include option for ថ្នាក់ទី ១០');
    assert.ok(pageContent.includes('ថ្នាក់ទី ១១'), 'classes page must include option for ថ្នាក់ទី ១១');
    assert.ok(pageContent.includes('ថ្នាក់ទី ១២'), 'classes page must include option for ថ្នាក់ទី ១២');

    const hookPath = path.join(rootDir, 'app', '(dashboard)', 'admin', 'classes', 'useClasses.ts');
    const hookContent = fs.readFileSync(hookPath, 'utf-8');

    // Must normalize numerals to match both Khmer and Latin digits dynamically
    assert.ok(
      hookContent.includes('khmerToLatin') || hookContent.includes('replace(/\\D/g'),
      'useClasses.ts must normalize numerals for grade filtering'
    );
  });

  // ==========================================================================
  // SCENARIO 2: Curriculum Resolver handles Lower-Sec (7-9) vs Upper-Sec (10-12)
  // ==========================================================================
  it('Scenario 2: Curriculum schema properly distinguishes Lower-Secondary (7-9) from Upper-Secondary (10-12)', async () => {
    const { getCurriculumSchemaForClass, CURRICULUM_SCHEMAS } = await import('../../lib/curriculum');

    const schema7 = getCurriculumSchemaForClass('7', null);
    const schema8 = getCurriculumSchemaForClass('8', null);
    const schema9 = getCurriculumSchemaForClass('9', null);
    const schema10Sci = getCurriculumSchemaForClass('10', 'វិទ្យាសាស្ត្រពិត');
    const schema11Soc = getCurriculumSchemaForClass('11', 'វិទ្យាសាស្ត្រសង្គម');

    assert.equal(schema7.id, 'lower-sec', 'Grade 7 must resolve to lower-sec schema');
    assert.equal(schema8.id, 'lower-sec', 'Grade 8 must resolve to lower-sec schema');
    assert.equal(schema9.id, 'lower-sec', 'Grade 9 must resolve to lower-sec schema');
    assert.equal(schema10Sci.id, 'upper-sec-sci', 'Grade 10 Sci must resolve to upper-sec-sci');
    assert.equal(schema11Soc.id, 'upper-sec-art', 'Grade 11 Soc must resolve to upper-sec-art');
  });

  // ==========================================================================
  // SCENARIO 3: Teacher Student Creation Hardening in Server Actions
  // ==========================================================================
  it('Scenario 3: saveStudentAction and bulkQuickRegisterAction block teachers from registering new students', () => {
    const actionsPath = path.join(rootDir, 'app', '(dashboard)', 'students', 'actions.ts');
    const actionsContent = fs.readFileSync(actionsPath, 'utf-8');

    // saveStudentAction check
    assert.ok(
      actionsContent.includes("!isExistingId && role === 'teacher'"),
      'saveStudentAction must verify teacher cannot create new students'
    );
    assert.ok(
      actionsContent.includes('គ្រូបន្ទុកថ្នាក់មិនអាចបញ្ជូលសិស្សថ្មីដោយផ្ទាល់បានទេ'),
      'saveStudentAction must provide clear localized feedback'
    );

    // bulkQuickRegisterAction check
    assert.ok(
      actionsContent.includes('requirePrincipal()'),
      'bulkQuickRegisterAction must require principal or admin privileges'
    );
  });

  // ==========================================================================
  // SCENARIO 4: Migration 075 RPC Hardening & Student Requests Expansion
  // ==========================================================================
  it('Scenario 4: Migration 075 restricts RPC bulk registration to admin/principal and expands student_requests', () => {
    const migPath = path.join(rootDir, 'supabase', 'migrations', '075_enforce_teacher_student_permissions.sql');
    assert.ok(fs.existsSync(migPath), 'Migration 075 must exist');
    const migContent = fs.readFileSync(migPath, 'utf-8');

    // RPC role restriction
    assert.ok(
      migContent.includes("v_caller_role NOT IN ('admin', 'principal')"),
      'bulk_quick_register_students must disallow teachers'
    );

    // Schema expansion
    assert.ok(
      migContent.includes('request_type TEXT NOT NULL DEFAULT'),
      'student_requests must define request_type'
    );
    assert.ok(
      migContent.includes("'transfer_in', 'transfer_out', 'dropout'"),
      'request_type must support transfer_in, transfer_out, and dropout'
    );
    assert.ok(
      migContent.includes('student_id UUID REFERENCES public.students'),
      'student_requests must link student_id for transfer_out/dropout'
    );

    // approve_student_request RPC expansion
    assert.ok(
      migContent.includes("v_request.request_type = 'transfer_out'"),
      'approve_student_request must handle transfer_out'
    );
    assert.ok(
      migContent.includes("v_request.request_type = 'dropout'"),
      'approve_student_request must handle dropout'
    );
  });

  // ==========================================================================
  // SCENARIO 5: Student Requests Server Actions Exported & Functional
  // ==========================================================================
  it('Scenario 5: students/actions.ts exports submitStudentStatusRequestAction and fetchClassStudentRequestsAction', () => {
    const actionsPath = path.join(rootDir, 'app', '(dashboard)', 'students', 'actions.ts');
    const actionsContent = fs.readFileSync(actionsPath, 'utf-8');

    assert.ok(
      actionsContent.includes('export async function submitStudentStatusRequestAction'),
      'Must export submitStudentStatusRequestAction'
    );
    assert.ok(
      actionsContent.includes('export async function fetchClassStudentRequestsAction'),
      'Must export fetchClassStudentRequestsAction'
    );
    assert.ok(
      actionsContent.includes("from('student_requests')") && actionsContent.includes('.insert('),
      'submitStudentStatusRequestAction must insert into student_requests'
    );
  });

  // ==========================================================================
  // SCENARIO 6: Homeroom Students Page UI Hardening
  // ==========================================================================
  it('Scenario 6: /students page removes arbitrary creation modals and renders requests pipeline', () => {
    const pagePath = path.join(rootDir, 'app', '(dashboard)', 'students', 'page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf-8');

    // Modals must NOT be imported or rendered on the teacher page
    assert.ok(!pageContent.includes('<StudentImportModal'), 'Teacher page must not mount StudentImportModal');
    assert.ok(!pageContent.includes('<StudentGridEntryModal'), 'Teacher page must not mount StudentGridEntryModal');

    // Transfer tab must feature both requests list and historical records
    assert.ok(pageContent.includes('បញ្ជីសំណើដែលបានដាក់ស្នើទៅ Admin'), 'Must render submitted requests table');
    assert.ok(pageContent.includes('ប្រវត្តិសិស្សផ្ទេរចេញ ឬបោះបង់ជាផ្លូវការ'), 'Must render official inactive records');
    assert.ok(pageContent.includes('submitStudentStatusRequestAction'), 'Must submit status requests through server action');
  });

  // ==========================================================================
  // SCENARIO 7: Admin Requests Desk Handles All 3 Request Types
  // ==========================================================================
  it('Scenario 7: AdminStudentRequestsDrawer renders badges for transfer_in/out/dropout and approves accordingly', () => {
    const drawerPath = path.join(
      rootDir,
      'app',
      '(dashboard)',
      'admin',
      'students',
      'components',
      'AdminStudentRequestsDrawer.tsx'
    );
    const drawerContent = fs.readFileSync(drawerPath, 'utf-8');

    assert.ok(drawerContent.includes('transfer_out'), 'Drawer must handle transfer_out');
    assert.ok(drawerContent.includes('dropout'), 'Drawer must handle dropout');
    assert.ok(drawerContent.includes('transfer_in'), 'Drawer must handle transfer_in');
    assert.ok(drawerContent.includes('isTransferIn && !studentId.trim()'), 'Only transfer_in mandates new student ID input');
  });
});
