import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  parseStudentDob,
  formatDobForDisplay,
  formatDobWithSlash,
  isValidDobString,
  normalizeKhmerToWesternDigits
} from '../../lib/utils/student-date';
import { normalizePastedCell } from '../../app/(dashboard)/students/types';
import { AdminUpdateStudentSchema } from '../../app/(dashboard)/admin/students/student-edit-schema';

describe('Student Date of Birth (dd mm yyyy) Format Reliability Suite', () => {

  describe('Scenario 1: parseStudentDob parsing variations', () => {
    test('parses space-separated "dd mm yyyy"', () => {
      assert.strictEqual(parseStudentDob('22 01 2008'), '2008-01-22');
      assert.strictEqual(parseStudentDob('5 3 2009'), '2009-03-05');
      assert.strictEqual(parseStudentDob('15  04  2010'), '2010-04-15');
      assert.strictEqual(parseStudentDob(' 31 12 2007 '), '2007-12-31');
    });

    test('parses Khmer numerals with spaces and slashes', () => {
      assert.strictEqual(parseStudentDob('២២ ០១ ២០០៨'), '2008-01-22');
      assert.strictEqual(parseStudentDob('១៥/០៤/២០០៩'), '2009-04-15');
      assert.strictEqual(parseStudentDob('០៥-១២-២០១០'), '2010-12-05');
    });

    test('parses slashes, dashes, and dots', () => {
      assert.strictEqual(parseStudentDob('22/01/2008'), '2008-01-22');
      assert.strictEqual(parseStudentDob('22-01-2008'), '2008-01-22');
      assert.strictEqual(parseStudentDob('22.01.2008'), '2008-01-22');
    });

    test('preserves standard ISO YYYY-MM-DD', () => {
      assert.strictEqual(parseStudentDob('2008-01-22'), '2008-01-22');
      assert.strictEqual(parseStudentDob('2010-11-05'), '2010-11-05');
    });

    test('parses Excel numeric serial date numbers', () => {
      // 39553 -> 2008-04-15
      assert.strictEqual(parseStudentDob(39553), '2008-04-15');
      assert.strictEqual(parseStudentDob('39553'), '2008-04-15');
    });

    test('rejects invalid or impossible dates', () => {
      assert.strictEqual(parseStudentDob('31 02 2008'), null, 'Feb 31 is invalid');
      assert.strictEqual(parseStudentDob('29 02 2007'), null, 'Feb 29 on non-leap year is invalid');
      assert.strictEqual(parseStudentDob('22 13 2008'), null, 'Month 13 is invalid');
      assert.strictEqual(parseStudentDob('00 05 2008'), null, 'Day 0 is invalid');
      assert.strictEqual(parseStudentDob('hello'), null);
      assert.strictEqual(parseStudentDob(''), null);
      assert.strictEqual(parseStudentDob('-'), null);
      assert.strictEqual(parseStudentDob(null), null);
      assert.strictEqual(parseStudentDob(undefined), null);
    });

    test('accepts valid leap year Feb 29', () => {
      assert.strictEqual(parseStudentDob('29 02 2008'), '2008-02-29', '2008 is a leap year');
      assert.strictEqual(parseStudentDob('29 02 2004'), '2004-02-29', '2004 is a leap year');
    });
  });

  describe('Scenario 2: formatDobForDisplay formatting', () => {
    test('formats ISO YYYY-MM-DD into "DD MM YYYY" with spaces', () => {
      assert.strictEqual(formatDobForDisplay('2008-01-22'), '22 01 2008');
      assert.strictEqual(formatDobForDisplay('2010-04-05'), '05 04 2010');
      assert.strictEqual(formatDobForDisplay(''), '');
      assert.strictEqual(formatDobForDisplay(null), '');
      assert.strictEqual(formatDobForDisplay(undefined), '');
    });

    test('formatDobWithSlash formats into "DD/MM/YYYY"', () => {
      assert.strictEqual(formatDobWithSlash('2008-01-22'), '22/01/2008');
    });
  });

  describe('Scenario 3: Integration with types.ts normalizePastedCell', () => {
    test('normalizePastedCell handles "date_of_birth" with space-separated "dd mm yyyy"', () => {
      assert.strictEqual(normalizePastedCell('date_of_birth', '22 01 2008'), '2008-01-22');
      assert.strictEqual(normalizePastedCell('date_of_birth', '15 04 2009'), '2009-04-15');
      assert.strictEqual(normalizePastedCell('date_of_birth', '២២ ០១ ២០០៨'), '2008-01-22');
    });

    test('normalizePastedCell handles "dob" field name as well', () => {
      assert.strictEqual(normalizePastedCell('dob', '10 11 2007'), '2007-11-10');
    });
  });

  describe('Scenario 4: AdminUpdateStudentSchema transforms DD MM YYYY into ISO YYYY-MM-DD', () => {
    test('accepts "dd mm yyyy" and transforms to ISO', () => {
      const payload = {
        studentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        full_name: 'សុខ គង់',
        student_id_number: 'STU-9901',
        gender: 'ប្រុស' as const,
        dob: '22 01 2008'
      };
      const res = AdminUpdateStudentSchema.safeParse(payload);
      assert.ok(res.success, 'Must parse DD MM YYYY successfully');
      if (res.success) {
        assert.strictEqual(res.data.dob, '2008-01-22');
      }
    });

    test('rejects malformed dob in schema', () => {
      const payload = {
        studentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        full_name: 'សុខ គង់',
        student_id_number: 'STU-9901',
        gender: 'ប្រុស' as const,
        dob: '32 01 2008'
      };
      const res = AdminUpdateStudentSchema.safeParse(payload);
      assert.strictEqual(res.success, false, 'Invalid day 32 must fail validation');
    });
  });

  describe('Scenario 5: Excel Import Schema DOB Aliases', () => {
    test('studentImportSchema has DD MM YYYY header alias', async () => {
      const { studentImportSchema } = await import('../../lib/import/schema');
      const dobField = studentImportSchema.find(f => f.canonicalField === 'dob');
      assert.ok(dobField, 'dobField must exist');
      assert.ok(dobField?.headers.includes('ថ្ងៃខែឆ្នាំកំណើត (DD MM YYYY)'));
      assert.strictEqual(dobField?.normalize?.('15 04 2009'), '2009-04-15');
    });
  });

  describe('Scenario 6: StudentGoogleSheetGrid UI and Validation Contracts', () => {
    test('StudentGoogleSheetGrid contains DD MM YYYY header and placeholder', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const gridFile = fs.readFileSync(
        path.join(process.cwd(), 'app', '(dashboard)', 'admin', 'students', 'components', 'StudentGoogleSheetGrid.tsx'),
        'utf8'
      );
      assert.ok(gridFile.includes('ថ្ងៃខែឆ្នាំកំណើត (DD MM YYYY)'), 'Grid header must state DD MM YYYY');
      assert.ok(gridFile.includes("placeholder={field === 'dob' ? '22 01 2008' : ''}"), 'Grid placeholder must show 22 01 2008');
      assert.ok(gridFile.includes('parseStudentDob'), 'Grid must use parseStudentDob');
      assert.ok(gridFile.includes('formatDobForDisplay'), 'Grid must use formatDobForDisplay');
    });
  });

  describe('Scenario 7: Export and Template Alignments', () => {
    test('MasterStudentsClient download template includes DD MM YYYY column and sample', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const clientFile = fs.readFileSync(
        path.join(process.cwd(), 'app', '(dashboard)', 'admin', 'students', 'MasterStudentsClient.tsx'),
        'utf8'
      );
      assert.ok(clientFile.includes("'ថ្ងៃខែឆ្នាំកំណើត (DD MM YYYY)': '15 04 2008'"), 'Template must include sample 15 04 2008');
      assert.ok(clientFile.includes('formatDobForDisplay'), 'Client export must use formatDobForDisplay');
    });

    test('ClassRosterExportModal includes DD MM YYYY in Excel and PDF headers', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const exportFile = fs.readFileSync(
        path.join(process.cwd(), 'components', 'documents', 'ClassRosterExportModal.tsx'),
        'utf8'
      );
      assert.ok(exportFile.includes('ថ្ងៃខែឆ្នាំកំណើត (DD MM YYYY)'), 'Class roster header must include DD MM YYYY');
      assert.ok(exportFile.includes('formatDobForDisplay'), 'Class roster must format date with formatDobForDisplay');
    });
  });
});
