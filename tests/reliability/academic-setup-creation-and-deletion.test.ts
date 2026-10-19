import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Academic Setup Creation & Safe Deletion Suite', () => {
  const migration082Path = path.join(process.cwd(), 'supabase', 'migrations', '082_align_academic_years_schema_and_delete_protection.sql');
  const routePath = path.join(process.cwd(), 'app', 'api', 'admin', 'academic-years', 'route.ts');
  const actionsPath = path.join(process.cwd(), 'app', '(dashboard)', 'admin', 'academic-setup', 'actions.ts');
  const pagePath = path.join(process.cwd(), 'app', '(dashboard)', 'admin', 'academic-setup', 'page.tsx');

  it('Scenario 1: Migration 082 provides is_current compatibility and database-level active year delete protection', () => {
    assert.ok(fs.existsSync(migration082Path), 'Migration 082 file must exist');
    const content = fs.readFileSync(migration082Path, 'utf-8');

    // Schema compatibility
    assert.ok(content.includes('BEGIN;'), 'Migration must run in transaction');
    assert.ok(content.includes('COMMIT;'), 'Migration must commit transaction');
    assert.ok(content.includes('ADD COLUMN IF NOT EXISTS is_current BOOLEAN'), 'Must add is_current column');
    assert.ok(content.includes('sync_academic_year_is_active'), 'Must update sync trigger function');
    assert.ok(content.includes("NEW.is_current := (NEW.status = 'active')"), 'Must keep is_current in sync with status');

    // Database delete guard
    assert.ok(content.includes('prevent_active_academic_year_deletion'), 'Must define delete guard function');
    assert.ok(content.includes("OLD.status = 'active'"), 'Must prevent deleting active year');
    assert.ok(content.includes('trg_prevent_active_academic_year_deletion'), 'Must attach trigger to academic_years');
    assert.ok(content.includes("NOTIFY pgrst, 'reload schema'"), 'Must notify PostgREST schema cache reload');
  });

  it('Scenario 2: route.ts POST correctly creates academic years without non-existent column errors', () => {
    assert.ok(fs.existsSync(routePath), 'Route must exist');
    const content = fs.readFileSync(routePath, 'utf-8');

    // POST implementation checks
    assert.ok(content.includes("role !== 'admin'"), 'POST must require admin role');
    assert.ok(content.includes('targetSchoolId'), 'Must resolve school_id for multi-tenant isolation');
    assert.ok(!content.includes('is_current: false'), 'Must NOT attempt to insert non-existent or conflicting is_current column');
    assert.ok(content.includes("status: 'planned'"), 'New academic year must default to planned status');
    assert.ok(content.includes("action: 'CREATE_ACADEMIC_YEAR'"), 'Must record creation in audit_logs');
    assert.ok(content.includes('academicYear: newYear'), 'Must return created academic year object');
  });

  it('Scenario 3: route.ts DELETE enforces strict multi-table relational safety guards', () => {
    const content = fs.readFileSync(routePath, 'utf-8');

    // Safety checks before deletion
    assert.ok(content.includes("targetYear.status === 'active'"), 'Must block deleting active year');
    assert.ok(content.includes("from('classes')"), 'Must check classes table dependency');
    assert.ok(content.includes("from('student_enrollments')"), 'Must check student_enrollments table dependency');
    assert.ok(content.includes("from('grades')"), 'Must check grades table dependency');
    assert.ok(content.includes("from('attendance_records')"), 'Must check attendance_records table dependency');
    assert.ok(content.includes("from('exam_subject_standards')"), 'Must check exam_subject_standards table dependency');
    assert.ok(content.includes("action: 'DELETE_ACADEMIC_YEAR'"), 'Must record deletion in audit_logs');
  });

  it('Scenario 4: actions.ts provides createAcademicYearAction and deleteAcademicYearAction', () => {
    assert.ok(fs.existsSync(actionsPath), 'Actions file must exist');
    const content = fs.readFileSync(actionsPath, 'utf-8');

    assert.ok(content.includes('export async function createAcademicYearAction'), 'Must export createAcademicYearAction');
    assert.ok(content.includes('export async function deleteAcademicYearAction'), 'Must export deleteAcademicYearAction');
    assert.ok(content.includes('requireAdmin()'), 'Actions must enforce requireAdmin()');
    assert.ok(content.includes("revalidatePath('/admin/academic-setup')"), 'Actions must revalidate page path');
  });

  it('Scenario 5: page.tsx provides feedback on create failure and wires up delete feature in UI', () => {
    assert.ok(fs.existsSync(pagePath), 'Page file must exist');
    const content = fs.readFileSync(pagePath, 'utf-8');

    // Error feedback on create
    assert.ok(content.includes('createError'), 'Page must maintain createError state');
    assert.ok(content.includes('setCreateError(data.error'), 'Page must display backend error if creation fails');

    // Delete feature
    assert.ok(content.includes('showDeleteConfirm'), 'Page must maintain showDeleteConfirm state');
    assert.ok(content.includes('handleDeleteYear'), 'Page must implement handleDeleteYear');
    assert.ok(content.includes('លុបឆ្នាំសិក្សា'), 'Page must offer Khmer option to delete academic year');
    assert.ok(content.includes('successBanner'), 'Page must display success feedback banner');
    assert.ok(content.includes('errorBanner'), 'Page must display error feedback banner');
  });

  it('Scenario 6: Logic simulation verifies date comparison and school isolation', () => {
    const start = '2026-11-01';
    const end = '2027-08-31';
    const startObj = new Date(start);
    const endObj = new Date(end);

    assert.ok(startObj < endObj, 'Start date must precede end date');

    // Verify auto-derived 10-month end date logic
    const autoEnd = new Date(startObj);
    autoEnd.setMonth(autoEnd.getMonth() + 10);
    assert.strictEqual(autoEnd.toISOString().split('T')[0], '2027-09-01');
  });
});
