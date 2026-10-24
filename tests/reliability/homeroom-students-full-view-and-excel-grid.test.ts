import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeKhmerDigits, normalizePastedCell } from '../../app/(dashboard)/students/types';

describe('Homeroom Students Master Full View & Excel Grid Suite', () => {
  const rootDir = process.cwd();

  test('Scenario 1: Tab 0 Master Full View is defined and set as default in students page', () => {
    const studentsPagePath = path.join(rootDir, 'app', '(dashboard)', 'students', 'page.tsx');
    assert.ok(fs.existsSync(studentsPagePath), 'students/page.tsx must exist');

    const content = fs.readFileSync(studentsPagePath, 'utf-8');

    // Verify Tab 0 in VIEW_TABS
    assert.ok(
      content.includes("id: 0") && content.includes("ទិដ្ឋភាពពេញលេញ (Master)"),
      'VIEW_TABS must include Tab 0 for Master Full View'
    );

    // Verify activeTableView defaults to 0
    assert.ok(
      content.includes("useState(0)"),
      'activeTableView must default to 0 for instant master spreadsheet access'
    );

    // Verify LayoutGrid icon import
    assert.ok(
      content.includes('LayoutGrid'),
      'LayoutGrid icon must be imported for master view tab'
    );
  });

  test('Scenario 2: StudentTable implements frozen sticky identification columns', () => {
    const studentTablePath = path.join(rootDir, 'components', 'students', 'StudentTable.tsx');
    assert.ok(fs.existsSync(studentTablePath), 'StudentTable.tsx must exist');

    const content = fs.readFileSync(studentTablePath, 'utf-8');

    // Sticky frozen columns: index, student_id_number, full_name
    assert.ok(
      content.includes('sticky left-0'),
      'Must freeze index column at sticky left-0'
    );
    assert.ok(
      content.includes('sticky left-12'),
      'Must freeze student_id_number column at sticky left-12'
    );
    assert.ok(
      content.includes('sticky left-40'),
      'Must freeze full_name column at sticky left-40'
    );
  });

  test('Scenario 3: normalizeKhmerDigits converts all Khmer numerals to ASCII digits', () => {
    assert.strictEqual(normalizeKhmerDigits('០១២៣៤៥៦៧៨៩'), '0123456789');
    assert.strictEqual(normalizeKhmerDigits('១៥/០៤/២០០៨'), '15/04/2008');
    assert.strictEqual(normalizeKhmerDigits('០១២ ៣៤៥ ៦៧៨'), '012 345 678');
    assert.strictEqual(normalizeKhmerDigits(''), '');
  });

  test('Scenario 4: normalizePastedCell properly normalizes dates, gender, and metrics from Excel', () => {
    // 1. Dates
    assert.strictEqual(normalizePastedCell('date_of_birth', '15/04/2008'), '2008-04-15');
    assert.strictEqual(normalizePastedCell('date_of_birth', '០៥-០៨-២០០៩'), '2009-08-05');
    assert.strictEqual(normalizePastedCell('date_of_birth', '2010-12-01'), '2010-12-01');

    // 2. Gender
    assert.strictEqual(normalizePastedCell('gender', 'ស្រី'), 'F');
    assert.strictEqual(normalizePastedCell('gender', 'female'), 'F');
    assert.strictEqual(normalizePastedCell('gender', 'f'), 'F');
    assert.strictEqual(normalizePastedCell('gender', 'ប្រុស'), 'M');
    assert.strictEqual(normalizePastedCell('gender', 'male'), 'M');
    assert.strictEqual(normalizePastedCell('gender', 'm'), 'M');

    // 3. Health Height & Weight
    assert.strictEqual(normalizePastedCell('height_m', '155'), 1.55);
    assert.strictEqual(normalizePastedCell('height_m', '1.62'), 1.62);
    assert.strictEqual(normalizePastedCell('height_m', '១៦០'), 1.6);
    assert.strictEqual(normalizePastedCell('weight_kg', '45'), 45);
    assert.strictEqual(normalizePastedCell('weight_kg', '៤៨.៥'), 49);

    // 4. Status & Equity
    assert.strictEqual(normalizePastedCell('status', 'ត្រួតថ្នាក់'), 'repeater');
    assert.strictEqual(normalizePastedCell('status', 'ផ្ទេរចូល'), 'transfer');
    assert.strictEqual(normalizePastedCell('status', 'ថ្មី'), 'new');
    assert.strictEqual(normalizePastedCell('id_poor', 'កម្រិត ១'), 'level_1');
    assert.strictEqual(normalizePastedCell('id_poor', 'កម្រិត ២'), 'level_2');
    assert.strictEqual(normalizePastedCell('id_poor', 'គ្មាន'), 'none');
    assert.strictEqual(normalizePastedCell('scholarship', 'មាន'), 'yes');
    assert.strictEqual(normalizePastedCell('scholarship', 'គ្មាន'), 'no');
    assert.strictEqual(normalizePastedCell('disability', 'ស្រាល'), 'mild');
    assert.strictEqual(normalizePastedCell('disability', 'ធ្ងន់'), 'severe');
    assert.strictEqual(normalizePastedCell('disability', 'គ្មាន'), 'none');

    // 5. Phone numbers
    assert.strictEqual(normalizePastedCell('student_phone', '០១២ ៣៤៥ ៦៧៨'), '012345678');
    assert.strictEqual(normalizePastedCell('father_phone', '+855 97 123 4567'), '+855971234567');
  });

  test('Scenario 5: batchUpdateStudentProfilesAction enforces authorization, roster isolation and atomic persistence', () => {
    const actionsPath = path.join(rootDir, 'app', '(dashboard)', 'students', 'actions.ts');
    assert.ok(fs.existsSync(actionsPath), 'actions.ts must exist');

    const content = fs.readFileSync(actionsPath, 'utf-8');

    // Server Action definition
    assert.ok(
      content.includes('export async function batchUpdateStudentProfilesAction'),
      'Must export batchUpdateStudentProfilesAction server action'
    );

    // Authorization verification
    assert.ok(
      content.includes('requireClassAccess(payload.class_id)'),
      'Must strictly enforce requireClassAccess for the target class'
    );

    // Class boundary check to ensure no unauthorized cross-class mutations
    assert.ok(
      content.includes('validStudentMap.has(item.id)'),
      'Must verify that each student being updated belongs to the verified class roster'
    );

    // Progressive update across tables
    assert.ok(
      content.includes(".from('students')") && content.includes(".update(studentFields)"),
      'Must update student profiling records in students table'
    );
    assert.ok(
      content.includes(".from('student_enrollments')") && content.includes(".update(enrollmentFields)"),
      'Must update desk_number and room_number in student_enrollments'
    );
    assert.ok(
      content.includes(".from('student_health_records')") && content.includes(".upsert("),
      'Must upsert student_health_records when health metrics are modified'
    );

    // Path revalidation
    assert.ok(
      content.includes("revalidatePath('/students')") &&
      content.includes("revalidatePath('/homeroom')") &&
      content.includes("revalidatePath('/health')"),
      'Must revalidate affected route paths after batch update'
    );
  });

  test('Scenario 6: Edit mode toggle and dirty protection guard work seamlessly without mounting StudentGridEntryModal', () => {
    const studentsPagePath = path.join(rootDir, 'app', '(dashboard)', 'students', 'page.tsx');
    const content = fs.readFileSync(studentsPagePath, 'utf-8');

    // Must NOT mount StudentGridEntryModal (preserves teacher permission isolation rule from Scenario 6)
    assert.strictEqual(
      content.includes('<StudentGridEntryModal'),
      false,
      'Must NOT mount StudentGridEntryModal on /students'
    );

    // Must manage edit mode and draft updates
    assert.ok(content.includes('isEditMode'), 'Must have isEditMode state');
    assert.ok(content.includes('draftUpdates'), 'Must track draftUpdates map');
    assert.ok(content.includes('unsavedCount'), 'Must compute unsavedCount');
    assert.ok(content.includes('useUnsavedChanges('), 'Must wire useUnsavedChanges hook');

    // Must have floating Save Bar
    assert.ok(
      content.includes('fixed bottom-6') && content.includes('រក្សាទុកការផ្លាស់ប្តូរ'),
      'Must render floating Save Bar when dirty'
    );
  });
});
