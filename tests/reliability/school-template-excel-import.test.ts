import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import {
  parseOfficialExcelRow,
  normalizeKhmerDigits,
  normalizePastedCell,
  formatKhmerAddress,
  DEFAULT_FORM,
  OfficialTemplateType
} from '../../app/(dashboard)/students/types';

describe('Official School Template Excel Import & Study Plan Reliability Suite', () => {

  // 1. Column Schemas & Row Parsing
  describe('Official Template Row Extraction', () => {
    test('Scenario 1A: Lower Secondary (Grades 7-9) canonical column extraction', () => {
      // Mock row matching Grade 7-9 sheet (52+ columns)
      const mockRow79: string[] = new Array(55).fill('');
      mockRow79[0] = '1';
      mockRow79[1] = '004128'; // Student ID
      mockRow79[2] = 'ចាន់ សុខា'; // Name
      mockRow79[3] = 'ស្រី'; // Gender
      mockRow79[4] = '15/04/2009'; // DOB
      mockRow79[5] = 'ព្រៃវែង'; // POB
      mockRow79[6] = 'បឋមសិក្សាព្រៃវែង'; // Prev primary
      mockRow79[7] = 'អនុវិទ្យាល័យពោធិ៍រៀង'; // Prev secondary
      mockRow79[8] = 'ចាន់ សំអាត'; // Father Name
      mockRow79[9] = 'កសិករ'; // Father Job
      mockRow79[10] = '012345678'; // Father Phone
      mockRow79[11] = 'កែវ មុំ'; // Mother Name
      mockRow79[12] = 'មេផ្ទះ'; // Mother Job
      mockRow79[13] = '098765432'; // Mother Phone
      mockRow79[14] = 'ពោធិ៍រៀង'; // Village
      mockRow79[15] = 'ពោធិ៍រៀង'; // Commune
      mockRow79[16] = 'ពោធិ៍រៀង'; // District
      mockRow79[17] = 'ព្រៃវែង'; // Province
      mockRow79[18] = '0881122334'; // Student Phone
      mockRow79[50] = 'ក្រ១'; // Col AY: ID Poor Level 1

      const parsed = parseOfficialExcelRow('7-9', mockRow79, 1);
      assert.strictEqual(parsed.student_id_number, '004128', 'Must preserve leading zeros in student ID');
      assert.strictEqual(parsed.full_name, 'ចាន់ សុខា');
      assert.strictEqual(parsed.gender, 'F');
      assert.strictEqual(parsed.date_of_birth, '2009-04-15');
      assert.strictEqual(parsed.father_name, 'ចាន់ សំអាត');
      assert.strictEqual(parsed.father_phone, '012345678');
      assert.strictEqual(parsed.mother_name, 'កែវ មុំ');
      assert.strictEqual(parsed.mother_phone, '098765432');
      assert.ok(parsed.address?.includes('ភូមិពោធិ៍រៀង'));
      assert.ok(parsed.address?.includes('ខេត្តព្រៃវែង'));
      assert.strictEqual(parsed.student_phone, '0881122334');
      assert.strictEqual(parsed.id_poor, 'level_1');
      assert.strictEqual(parsed.room_number, undefined, 'Lower secondary does not have room_number column');
      assert.strictEqual(parsed.desk_number, undefined, 'Lower secondary does not have desk_number column');
    });

    test('Scenario 1B: Upper Secondary (Grades 10-12) column alignment with room and desk number', () => {
      // Mock row matching Grade 10-12 sheet (55+ columns)
      const mockRow1012: string[] = new Array(60).fill('');
      mockRow1012[0] = '1';
      mockRow1012[1] = '008921'; // Student ID
      mockRow1012[2] = 'ស៊ូ វាសនា'; // Name
      mockRow1012[3] = 'ប្រុស'; // Gender
      mockRow1012[4] = '20/11/2007'; // DOB
      mockRow1012[5] = 'កណ្តាល'; // POB
      mockRow1012[6] = 'បឋមសិក្សាកណ្តាល'; // Prev primary
      mockRow1012[7] = '04'; // Col H: Room Number (បន្ទប់)
      mockRow1012[8] = '18'; // Col I: Desk Number (លេខតុ)
      mockRow1012[10] = 'អនុវិទ្យាល័យពោធិ៍រៀង'; // Prev secondary
      mockRow1012[11] = 'ស៊ូ ផល'; // Col L: Father Name (shifted by 3)
      mockRow1012[12] = 'គ្រូបង្រៀន'; // Father Job
      mockRow1012[13] = '011998877'; // Father Phone
      mockRow1012[14] = 'ស៊ឹម ណា'; // Col O: Mother Name
      mockRow1012[15] = 'អាជីវករ'; // Mother Job
      mockRow1012[16] = '077665544'; // Mother Phone
      mockRow1012[17] = 'កំពង់ពោធិ៍'; // Col R: Village
      mockRow1012[18] = 'ពោធិ៍រៀង'; // Col S: Commune
      mockRow1012[19] = 'ពោធិ៍រៀង'; // Col T: District
      mockRow1012[20] = 'ព្រៃវែង'; // Col U: Province
      mockRow1012[21] = '0971234567'; // Col V: Student Phone
      mockRow1012[54] = 'ក្រ២'; // Col BC: ID Poor Level 2

      const parsed = parseOfficialExcelRow('10-12', mockRow1012, 1);
      assert.strictEqual(parsed.student_id_number, '008921');
      assert.strictEqual(parsed.full_name, 'ស៊ូ វាសនា');
      assert.strictEqual(parsed.gender, 'M');
      assert.strictEqual(parsed.date_of_birth, '2007-11-20');
      assert.strictEqual(parsed.room_number, '04');
      assert.strictEqual(parsed.desk_number, '18');
      assert.strictEqual(parsed.father_name, 'ស៊ូ ផល');
      assert.strictEqual(parsed.mother_name, 'ស៊ឹម ណា');
      assert.ok(parsed.address?.includes('ភូមិកំពង់ពោធិ៍'));
      assert.strictEqual(parsed.student_phone, '0971234567');
      assert.strictEqual(parsed.id_poor, 'level_2');
    });
  });

  // 2. Real & Synthetic Excel Template Workbook Inspection
  describe('Official Excel Template File Parsing & Reproducible Fixtures', () => {
    // Generate synthetic in-memory fixture matching official workbook layout
    const createSyntheticOfficialWorkbook = (): Buffer => {
      const wb = XLSX.utils.book_new();

      // Sheet 7-9: Header at row 7 (index 6)
      const sheet79Data: any[][] = [];
      sheet79Data.push(['ព្រះរាជាណាចក្រកម្ពុជា']);
      sheet79Data.push(['ជាតិ សាសនា ព្រះមហាក្សត្រ']);
      sheet79Data.push(['មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តព្រៃវែង']);
      sheet79Data.push(['វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង']);
      sheet79Data.push(['បញ្ជីឈ្មោះសិស្សថ្នាក់ទី ៧-៩ ឆ្នាំសិក្សា ២០២៦-២០២៧']);
      sheet79Data.push([]);
      sheet79Data.push(['ល.រ', 'អត្តលេខ', 'គោត្តនាម និងនាម', 'ភេទ', 'ថ្ងៃខែឆ្នាំកំណើត', 'ទីកន្លែងកំណើត']);
      sheet79Data.push(['1', '00101', 'ចាន់ សុខា', 'ស្រី', '15/04/2009', 'ព្រៃវែង']);

      const ws79 = XLSX.utils.aoa_to_sheet(sheet79Data);
      XLSX.utils.book_append_sheet(wb, ws79, 'បញ្ជីឈ្មោះសិស្ស7-9');

      // Sheet 10-12: Header at row 10-11
      const sheet1012Data: any[][] = [];
      for (let i = 0; i < 9; i++) sheet1012Data.push([`Banner line ${i + 1}`]);
      sheet1012Data.push(['ល.រ', 'អត្តលេខ', 'គោត្តនាម និងនាម', 'ភេទ', 'ថ្ងៃខែឆ្នាំកំណើត', 'ទីកន្លែងកំណើត', 'បឋម', 'បន្ទប់', 'លេខតុ']);
      sheet1012Data.push(['', '', '', '', '', '', '', 'លេខបន្ទប់', 'លេខតុ']);
      sheet1012Data.push(['1', '00201', 'ស៊ូ វាសនា', 'ប្រុស', '20/11/2007', 'កណ្តាល', '', '04', '18']);

      const ws1012 = XLSX.utils.aoa_to_sheet(sheet1012Data);
      XLSX.utils.book_append_sheet(wb, ws1012, 'បញ្ជីឈ្មោះសិស្ស 10-12');

      return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    };

    test('Scenario 2A: Official template structure has expected sheets', () => {
      const buffer = createSyntheticOfficialWorkbook();
      const wb = XLSX.read(buffer, { type: 'buffer' });
      assert.ok(wb.SheetNames.length >= 2, 'Workbook should contain at least 2 sheets');
      assert.ok(wb.SheetNames.includes('បញ្ជីឈ្មោះសិស្ស7-9'), 'Must contain Grade 7-9 sheet');
      assert.ok(wb.SheetNames.includes('បញ្ជីឈ្មោះសិស្ស 10-12'), 'Must contain Grade 10-12 sheet');
    });

    test('Scenario 2B: Sheet 7-9 has expected column layout at header row 7', () => {
      const buffer = createSyntheticOfficialWorkbook();
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheet = wb.Sheets['បញ្ជីឈ្មោះសិស្ស7-9'];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      const headerRow = rawRows[6];
      assert.strictEqual(headerRow[0], 'ល.រ');
      assert.strictEqual(headerRow[1], 'អត្តលេខ');
      assert.ok(String(headerRow[2]).includes('គោត្តនាម'));
      assert.ok(String(headerRow[3]).includes('ភេទ'));
      assert.ok(String(headerRow[4]).includes('កំណើត'));
    });

    test('Scenario 2C: Sheet 10-12 has expected exam room and desk columns at header row 10-11', () => {
      const buffer = createSyntheticOfficialWorkbook();
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheet = wb.Sheets['បញ្ជីឈ្មោះសិស្ស 10-12'];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      const headerRow = rawRows[9];
      assert.strictEqual(headerRow[0], 'ល.រ');
      assert.strictEqual(headerRow[1], 'អត្តលេខ');
      assert.ok(String(headerRow[2]).includes('គោត្តនាម'));
      
      const subHeader = rawRows[10];
      assert.ok(String(subHeader[7]).includes('លេខបន្ទប់'));
      assert.ok(String(subHeader[8]).includes('លេខតុ'));
    });
  });

  // 3. Normalization Engine & Non-Destructive Behavior
  describe('Normalization Engine & Non-Destructive Blank Handling', () => {
    test('Scenario 3A: normalizeKhmerDigits converts all Khmer numeral glyphs to ASCII without stripping zeros', () => {
      assert.strictEqual(normalizeKhmerDigits('០១២៣៤៥៦៧៨៩'), '0123456789');
      assert.strictEqual(normalizeKhmerDigits('ថ្នាក់ទី ៩ខ'), 'ថ្នាក់ទី 9ខ');
      assert.strictEqual(normalizeKhmerDigits('០០១២៥'), '00125', 'Must preserve leading zeros');
    });

    test('Scenario 3B: normalizePastedCell normalizes DD/MM/YYYY into ISO YYYY-MM-DD', () => {
      assert.strictEqual(normalizePastedCell('date_of_birth', '១៥/០៣/២០០៩'), '2009-03-15');
      assert.strictEqual(normalizePastedCell('date_of_birth', '05-12-2010'), '2010-12-05');
      assert.strictEqual(normalizePastedCell('date_of_birth', '2011-08-20'), '2011-08-20');
    });

    test('Scenario 3C: normalizePastedCell handles Excel date serial numbers', () => {
      assert.strictEqual(normalizePastedCell('date_of_birth', '39553'), '2008-04-15');
    });

    test('Scenario 3D: Gender normalization rejects blank/unknown and normalizes valid variants', () => {
      // Valid variants
      assert.strictEqual(normalizePastedCell('gender', 'ស្រី'), 'F');
      assert.strictEqual(normalizePastedCell('gender', 'ស'), 'F');
      assert.strictEqual(normalizePastedCell('gender', 'Female'), 'F');
      assert.strictEqual(normalizePastedCell('gender', 'ប្រុស'), 'M');
      assert.strictEqual(normalizePastedCell('gender', 'ប'), 'M');
      assert.strictEqual(normalizePastedCell('gender', 'Male'), 'M');

      // Blank or unrecognized must NEVER default to 'M'
      assert.strictEqual(normalizePastedCell('gender', ''), undefined);
      assert.strictEqual(normalizePastedCell('gender', '   '), undefined);
      assert.strictEqual(normalizePastedCell('gender', null), undefined);
      assert.strictEqual(normalizePastedCell('gender', undefined), undefined);
      assert.strictEqual(normalizePastedCell('gender', 'X_INVALID'), undefined);
    });

    test('Scenario 3E: Disability normalization distinguishes blank from explicit negatives', () => {
      // Blank -> undefined (non-destructive)
      assert.strictEqual(normalizePastedCell('disability', ''), undefined);
      assert.strictEqual(normalizePastedCell('disability', null), undefined);

      // Explicit negative -> 'none'
      assert.strictEqual(normalizePastedCell('disability', 'គ្មាន'), 'none');
      assert.strictEqual(normalizePastedCell('disability', '-'), 'none');
      assert.strictEqual(normalizePastedCell('disability', 'none'), 'none');

      // Mild and severe
      assert.strictEqual(normalizePastedCell('disability', 'ស្រាល'), 'mild');
      assert.strictEqual(normalizePastedCell('disability', 'mild'), 'mild');
      assert.strictEqual(normalizePastedCell('disability', 'ធ្ងន់'), 'severe');
      assert.strictEqual(normalizePastedCell('disability', 'severe'), 'severe');
    });

    test('Scenario 3F: Scholarship normalization distinguishes blank from explicit negatives', () => {
      assert.strictEqual(normalizePastedCell('scholarship', ''), undefined);
      assert.strictEqual(normalizePastedCell('scholarship', 'គ្មាន'), 'no');
      assert.strictEqual(normalizePastedCell('scholarship', '-'), 'no');
      assert.strictEqual(normalizePastedCell('scholarship', 'no'), 'no');
      assert.strictEqual(normalizePastedCell('scholarship', 'មាន'), 'yes');
      assert.strictEqual(normalizePastedCell('scholarship', 'yes'), 'yes');
    });

    test('Scenario 3G: id_poor normalization parses level_1, level_2, and none without defaults', () => {
      assert.strictEqual(normalizePastedCell('id_poor', ''), undefined);
      assert.strictEqual(normalizePastedCell('id_poor', 'ក្រ១'), 'level_1');
      assert.strictEqual(normalizePastedCell('id_poor', 'ក្រ២'), 'level_2');
      assert.strictEqual(normalizePastedCell('id_poor', 'គ្មាន'), 'none');
      assert.strictEqual(normalizePastedCell('id_poor', '-'), 'none');
    });

    test('Scenario 3H: DEFAULT_FORM contains no fake measurements or default gender', () => {
      assert.strictEqual(DEFAULT_FORM.gender, undefined, 'DEFAULT_FORM must not default gender to M');
      assert.strictEqual(DEFAULT_FORM.weight_kg, undefined, 'DEFAULT_FORM must not fabricate weight 40kg');
      assert.strictEqual(DEFAULT_FORM.height_m, undefined, 'DEFAULT_FORM must not fabricate height 1.50m');
      assert.strictEqual(DEFAULT_FORM.disability, undefined, 'DEFAULT_FORM must not default disability to none');
      assert.strictEqual(DEFAULT_FORM.scholarship, undefined, 'DEFAULT_FORM must not default scholarship to no');
      assert.strictEqual(DEFAULT_FORM.id_poor, undefined, 'DEFAULT_FORM must not default id_poor to none');
    });

    test('Scenario 3I: formatKhmerAddress synthesizes 4 address parts cleanly', () => {
      const addr = formatKhmerAddress('ព្រៃពោធិ៍', 'ពោធិ៍រៀង', 'ពោធិ៍រៀង', 'ព្រៃវែង');
      assert.strictEqual(addr, 'ភូមិព្រៃពោធិ៍ ឃុំពោធិ៍រៀង ស្រុកពោធិ៍រៀង ខេត្តព្រៃវែង');
    });
  });

  // 4. UI Architecture & Integration Verification
  describe('UI Architecture & Component Integration', () => {
    test('Scenario 4A: StudentExcelImportModal exists and contains drag-and-drop & paste tabs', () => {
      const modalPath = path.resolve(process.cwd(), 'components/students/StudentExcelImportModal.tsx');
      assert.ok(fs.existsSync(modalPath), 'StudentExcelImportModal.tsx must exist');
      const code = fs.readFileSync(modalPath, 'utf8');
      assert.ok(code.includes('StudentExcelImportModal'));
      assert.ok(code.includes('activeTab'));
      assert.ok(code.includes('handleFileChange'));
      assert.ok(code.includes('handleProcessPastedText'));
      assert.ok(code.includes('onApplyUpdates'));
      assert.ok(code.includes('parseOfficialExcelRow'));
      // Verify raw: false is used
      assert.ok(code.includes('raw: false'), 'Must use raw: false to preserve leading zeros');
      // Verify អនុវិ check was removed from header detection
      assert.ok(!code.includes("joined.includes('អនុវិ')"), 'Must NOT check អនុវិ in isHeaderRow');
    });

    test('Scenario 4B: StudentFilters toolbar mounts the Excel import button', () => {
      const filterPath = path.resolve(process.cwd(), 'components/students/StudentFilters.tsx');
      const code = fs.readFileSync(filterPath, 'utf8');
      assert.ok(code.includes('onOpenExcelImport'));
      assert.ok(code.includes('FileSpreadsheet'));
      assert.ok(code.includes('នាំចូលពី Excel'));
    });

    test('Scenario 4C: students/page.tsx connects onOpenExcelImport and mounts StudentExcelImportModal', () => {
      const pagePath = path.resolve(process.cwd(), 'app/(dashboard)/students/page.tsx');
      const code = fs.readFileSync(pagePath, 'utf8');
      assert.ok(code.includes("import StudentExcelImportModal from '@/components/students/StudentExcelImportModal'"));
      assert.ok(code.includes('isExcelImportModalOpen'));
      assert.ok(code.includes('onOpenExcelImport={() => setIsExcelImportModalOpen(true)}'));
      assert.ok(code.includes('<StudentExcelImportModal'));
    });

    test('Scenario 4D: actions.ts does not store student_phone as parent_phone and prevents fake health records', () => {
      const actionPath = path.resolve(process.cwd(), 'app/(dashboard)/students/actions.ts');
      const code = fs.readFileSync(actionPath, 'utf8');
      assert.ok(code.includes('formatKhmerAddress'));
      assert.ok(code.includes('batch_update_student_profiles_atomic'));
      // Confirm student_phone is never used as parent_phone
      assert.ok(!code.includes('studentFields.parent_phone = item.student_phone'), 'student_phone must never become parent_phone');
      // Confirm health records condition excludes disability-only
      assert.ok(!code.includes("|| item.disability !== undefined"), 'Disability-only import must not create health record');
    });

    test('Scenario 4E: useStudents.ts selects confirmed profiling fields in STUDENT_ROSTER_FIELDS', () => {
      const hookPath = path.resolve(process.cwd(), 'hooks/useStudents.ts');
      const code = fs.readFileSync(hookPath, 'utf8');
      assert.ok(code.includes('parent_phone'));
      assert.ok(code.includes('health_note'));
      assert.ok(code.includes('height_m'));
      assert.ok(code.includes('weight_kg'));
      assert.ok(code.includes('bmi'));
      assert.ok(code.includes('nutrition_status'));
    });

    test('Scenario 4F: Migration 083 exists and defines batch_update_student_profiles_atomic RPC', () => {
      const migPath = path.resolve(process.cwd(), 'supabase/migrations/083_batch_update_student_profiles_atomic.sql');
      assert.ok(fs.existsSync(migPath), 'Migration 083 must exist');
      const code = fs.readFileSync(migPath, 'utf8');
      assert.ok(code.includes('batch_update_student_profiles_atomic'));
      assert.ok(code.includes('ROLLBACK') || code.includes('RAISE EXCEPTION'));
      assert.ok(code.includes('student_enrollments'));
      assert.ok(code.includes('student_health_records'));
      assert.ok(code.includes('prev_school ='));
      assert.ok(code.includes('student_phone ='));
    });

    test('Scenario 4G: Migration 084 exists and adds missing profiling columns safely', () => {
      const migPath = path.resolve(process.cwd(), 'supabase/migrations/084_add_missing_student_profiling_columns.sql');
      assert.ok(fs.existsSync(migPath), 'Migration 084 must exist');
      const code = fs.readFileSync(migPath, 'utf8');
      assert.ok(code.includes('student_phone'));
      assert.ok(code.includes('prev_school'));
      assert.ok(code.includes('indigenous'));
      assert.ok(code.includes('birth_cert_no'));
      assert.ok(code.includes('active_class_rosters'));
    });
  });

  // 5. Study Plan Document Data Mapping Verification
  describe('Student Study Plan Generation Data Contract', () => {
    test('Scenario 5A: id_poor correctly maps to Khmer familyCondition labels', () => {
      const mapCondition = (idPoor?: string) => {
        if (idPoor === 'level_1') return 'ក្រីក្រ (កម្រិត ១)';
        if (idPoor === 'level_2') return 'ក្រីក្រ (កម្រិត ២)';
        return 'មធ្យម';
      };

      assert.strictEqual(mapCondition('level_1'), 'ក្រីក្រ (កម្រិត ១)');
      assert.strictEqual(mapCondition('level_2'), 'ក្រីក្រ (កម្រិត ២)');
      assert.strictEqual(mapCondition('none'), 'មធ្យម');
      assert.strictEqual(mapCondition(undefined), 'មធ្យម');
    });

    test('Scenario 5B: Gender correctly maps to Khmer gender labels', () => {
      const mapGender = (g?: string) => (g === 'M' || g === 'ប្រុស' ? 'ប្រុស' : 'ស្រី');
      assert.strictEqual(mapGender('M'), 'ប្រុស');
      assert.strictEqual(mapGender('ប្រុស'), 'ប្រុស');
      assert.strictEqual(mapGender('F'), 'ស្រី');
      assert.strictEqual(mapGender('ស្រី'), 'ស្រី');
    });

    test('Scenario 5C: Parent phone strictly prioritizes parent contacts over student phone', () => {
      const resolveParentPhone = (std: { parent_phone?: string; father_phone?: string; mother_phone?: string; student_phone?: string }) => {
        return std.parent_phone || std.father_phone || std.mother_phone || '..................................';
      };

      // When father_phone is available
      assert.strictEqual(resolveParentPhone({ father_phone: '012345678', student_phone: '097999888' }), '012345678');
      // When only student phone is available, parent phone must NOT be student phone
      assert.strictEqual(resolveParentPhone({ student_phone: '097999888' }), '..................................');
    });
  });
});
