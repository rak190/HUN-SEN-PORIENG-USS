import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  generateOfficialSchoolRosterWorkbook,
  parseKhmerAddressParts,
  isUpperSecondary,
  StudentRosterRecord,
} from '../../lib/excel/officialSchoolRosterExport';

describe('Official School Excel Student Roster Export Suite', () => {
  const sampleStudents: StudentRosterRecord[] = [
    {
      id: 'student-uuid-1',
      student_id_number: '04757',
      full_name: 'រ៉ូ សាន',
      gender: 'M',
      date_of_birth: '2013-03-15',
      pob: 'ព្រៃវែង',
      prev_school: 'បឋមសិក្សាពោធិ៍រៀង',
      room_number: '02',
      desk_number: '14',
      exam_grade: 'B',
      father_name: 'សុខ គង់',
      father_job: 'កសិករ',
      father_phone: '012345678',
      mother_name: 'ម៉ៅ វ៉ាន់នី',
      mother_job: 'មេផ្ទះ',
      mother_phone: '098765432',
      current_address: 'ភូមិព្រៃស្រឡៅ ឃុំពោធិ៍រៀង ស្រុកពោធិ៍រៀង ខេត្តព្រៃវែង',
      student_phone: '088123456',
      indigenous: 'no',
      scholarship: 'yes',
      id_poor: 'level_1',
      disability: 'none',
      notes: 'សិស្សរៀនពូកែ',
    },
    {
      id: 'student-uuid-2',
      student_id_number: '04758',
      full_name: 'គឹម សុផល',
      gender: 'F',
      date_of_birth: '2012-08-20',
      pob: 'កំពង់ចាម',
      prev_school: 'បឋមសិក្សាស្វាយអន្ទរ',
      room_number: '05',
      desk_number: '01',
      exam_grade: 'A',
      father_name: 'ចាន់ សុខ',
      father_job: 'អាជីវករ',
      father_phone: '077112233',
      mother_name: 'ហេង ស៊ីណា',
      mother_job: 'អាជីវករ',
      mother_phone: '088998877',
      current_address: 'ភូមិតាសួស ឃុំស្វាយអន្ទរ ស្រុកស្វាយអន្ទរ ខេត្តព្រៃវែង',
      student_phone: '097554433',
      indigenous: 'yes',
      scholarship: 'no',
      id_poor: 'level_2',
      disability: 'mild',
      assistive_device: 'វ៉ែនតា',
      notes: '',
    },
  ];

  describe('Address Parser Utility', () => {
    it('Scenario 1A: Correctly splits complete 4-tier Cambodian address into components', () => {
      const parsed = parseKhmerAddressParts('ភូមិព្រៃស្រឡៅ ឃុំពោធិ៍រៀង ស្រុកពោធិ៍រៀង ខេត្តព្រៃវែង');
      assert.equal(parsed.village, 'ព្រៃស្រឡៅ');
      assert.equal(parsed.commune, 'ពោធិ៍រៀង');
      assert.equal(parsed.district, 'ពោធិ៍រៀង');
      assert.equal(parsed.province, 'ព្រៃវែង');
    });

    it('Scenario 1B: Handles sangkat and khan urban Cambodian addresses', () => {
      const parsed = parseKhmerAddressParts('ភូមិ១ សង្កាត់បឹងកក់១ ខណ្ឌទួលគោក រាជធានីភ្នំពេញ');
      assert.equal(parsed.village, '១');
      assert.equal(parsed.commune, 'បឹងកក់១');
      assert.equal(parsed.district, 'ទួលគោក');
      assert.equal(parsed.province, 'ភ្នំពេញ');
    });

    it('Scenario 1C: Gracefully handles empty or partial addresses without error', () => {
      const empty = parseKhmerAddressParts('');
      assert.equal(empty.village, '');
      assert.equal(empty.commune, '');
      assert.equal(empty.district, '');
      assert.equal(empty.province, '');

      const partial = parseKhmerAddressParts('ភូមិត្រពាំង');
      assert.equal(partial.village, 'ត្រពាំង');
      assert.equal(partial.commune, '');
    });
  });

  describe('Grade Level Classification', () => {
    it('Scenario 2A: Detects Grade 7, 8, 9 as Lower Secondary (7-9)', () => {
      assert.equal(isUpperSecondary({ id: '1', name: '៧ក', grade: 7 }), false);
      assert.equal(isUpperSecondary({ id: '2', name: '៨ខ', grade: 8 }), false);
      assert.equal(isUpperSecondary({ id: '3', name: '៩គ', grade: 9 }), false);
      assert.equal(isUpperSecondary({ id: '4', name: 'Grade 7A' }), false);
    });

    it('Scenario 2B: Detects Grade 10, 11, 12 as Upper Secondary (10-12)', () => {
      assert.equal(isUpperSecondary({ id: '5', name: '១០ក', grade: 10 }), true);
      assert.equal(isUpperSecondary({ id: '6', name: '១១ខ', grade: 11 }), true);
      assert.equal(isUpperSecondary({ id: '7', name: '១២គ', grade: 12 }), true);
      assert.equal(isUpperSecondary({ id: '8', name: 'Grade 10B' }), true);
      assert.equal(isUpperSecondary({ id: '9', name: 'ថ្នាក់ទី១១' }), true);
    });
  });

  describe('Lower Secondary Template Generation (Grade 7–9)', () => {
    it('Scenario 3A: Generates sheet titled "បញ្ជីឈ្មោះសិស្ស7-9" with exactly 39 columns', async () => {
      const wb = await generateOfficialSchoolRosterWorkbook({
        students: sampleStudents,
        classInfo: { id: 'c1', name: '៧ក', grade: 7 },
        academicYear: { id: 'y1', name: '២០២៦-២០២៧' },
        schoolInfo: { name: 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង', province: 'ព្រៃវែង' },
      });

      const ws = wb.getWorksheet('បញ្ជីឈ្មោះសិស្ស7-9');
      assert.ok(ws, 'Worksheet "បញ្ជីឈ្មោះសិស្ស7-9" must exist');
      assert.equal(ws.actualColumnCount, 39, 'G7-9 sheet must have exactly 39 columns');

      // Verify Kingdom Motto and Title Banners
      assert.equal(ws.getCell('A1').value, 'ព្រះរាជាណាចក្រកម្ពុជា');
      assert.equal(ws.getCell('A2').value, 'ជាតិ សាសនា ព្រះមហាក្សត្រ');
      assert.equal(ws.getCell('A5').value, 'ព័ត៌មានសិស្ស');

      // Verify Header Row 7 & 8 Styling
      const headerCell = ws.getCell('A7');
      assert.equal(headerCell.value, 'ល.រ');
      assert.ok(headerCell.fill, 'Header cell must have fill color');
      assert.equal((headerCell.fill as any).fgColor?.argb, 'FFD9E1F2', 'Header fill must be soft pastel blue (#D9E1F2)');
      assert.ok(headerCell.border, 'Header cell must have borders');
    });

    it('Scenario 3B: Maps student demographics and poverty indicators correctly for G7-9', async () => {
      const wb = await generateOfficialSchoolRosterWorkbook({
        students: sampleStudents,
        classInfo: { id: 'c1', name: '៨ក', grade: 8 },
        academicYear: { id: 'y1', name: '២០២៦-២០២៧' },
        schoolInfo: { name: 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង', province: 'ព្រៃវែង' },
      });

      const ws = wb.getWorksheet('បញ្ជីឈ្មោះសិស្ស7-9');
      assert.ok(ws);

      // Student 1 (Row 9)
      const r9 = ws.getRow(9);
      assert.equal(r9.getCell(1).value, 1); // No.
      assert.equal(r9.getCell(2).value, '04757'); // ID
      assert.equal(r9.getCell(3).value, 'រ៉ូ សាន'); // Full Name
      assert.equal(r9.getCell(4).value, 'ប្រុស'); // Gender
      assert.equal(r9.getCell(5).value, '2013-03-15'); // DOB
      assert.equal(r9.getCell(6).value, 'ព្រៃវែង'); // POB
      assert.equal(r9.getCell(7).value, 'បឋមសិក្សាពោធិ៍រៀង'); // Primary School
      assert.equal(r9.getCell(9).value, 'សុខ គង់'); // Father
      assert.equal(r9.getCell(11).value, '012345678'); // Father Phone
      assert.equal(r9.getCell(15).value, 'ព្រៃស្រឡៅ'); // Address: Village
      assert.equal(r9.getCell(16).value, 'ពោធិ៍រៀង'); // Address: Commune
      assert.equal(r9.getCell(17).value, 'ពោធិ៍រៀង'); // Address: District
      assert.equal(r9.getCell(18).value, 'ព្រៃវែង'); // Address: Province
      assert.equal(r9.getCell(19).value, '088123456'); // Student Phone
      assert.equal(r9.getCell(21).value, '✔'); // Scholarship
      assert.equal(r9.getCell(31).value, '✔'); // ក្រ១ (Poor Level 1)
      assert.equal(r9.getCell(32).value, ''); // ក្រ២ (Poor Level 2 is blank)

      // Student 2 (Row 10) - Poor Level 2
      const r10 = ws.getRow(10);
      assert.equal(r10.getCell(3).value, 'គឹម សុផល');
      assert.equal(r10.getCell(4).value, 'ស្រី');
      assert.equal(r10.getCell(31).value, ''); // ក្រ១ is blank
      assert.equal(r10.getCell(32).value, '✔'); // ក្រ២ (Poor Level 2)


    });
  });

  describe('Upper Secondary Template Generation (Grade 10–12)', () => {
    it('Scenario 4A: Generates sheet titled "បញ្ជីឈ្មោះសិស្ស 10-12" with exactly 42 columns and Lower Secondary Exam headers', async () => {
      const wb = await generateOfficialSchoolRosterWorkbook({
        students: sampleStudents,
        classInfo: { id: 'c2', name: '១០ក', grade: 10 },
        academicYear: { id: 'y1', name: '២០២៦-២០២៧' },
        schoolInfo: { name: 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង', province: 'ព្រៃវែង' },
      });

      const ws = wb.getWorksheet('បញ្ជីឈ្មោះសិស្ស 10-12');
      assert.ok(ws, 'Worksheet "បញ្ជីឈ្មោះសិស្ស 10-12" must exist');
      assert.equal(ws.actualColumnCount, 42, 'G10-12 sheet must have exactly 42 columns');

      // Verify Lower Secondary Diploma Exam Group Headers at Row 10 & 11
      const examGroupHeader = ws.getCell(10, 8);
      assert.equal(examGroupHeader.value, 'ប្រឡងសញ្ញាបត្រមធ្យមសិក្សាបឋមភូមិ');
      assert.equal(ws.getCell(11, 8).value, 'លេខបន្ទប់');
      assert.equal(ws.getCell(11, 9).value, 'លេខតុ');
      assert.equal(ws.getCell(11, 10).value, 'និទ្ទេស');
      assert.equal(ws.getCell(11, 11).value, 'មកពីសាលាមធ្យមសិក្សា');

      // Verify Student 1 data at Row 12
      const r12 = ws.getRow(12);
      assert.equal(r12.getCell(1).value, 1);
      assert.equal(r12.getCell(3).value, 'រ៉ូ សាន');
      assert.equal(r12.getCell(8).value, '02'); // Room No.
      assert.equal(r12.getCell(9).value, '14'); // Desk No.
      assert.equal(r12.getCell(10).value, 'B'); // Exam Grade
      assert.equal(r12.getCell(11).value, 'បឋមសិក្សាពោធិ៍រៀង'); // Secondary school
      assert.equal(r12.getCell(12).value, 'សុខ គង់'); // Father
      assert.equal(r12.getCell(18).value, 'ព្រៃស្រឡៅ'); // Address: Village
      assert.equal(r12.getCell(34).value, '✔'); // ក្រ១ (Col 54 in G10-12)


    });

    it('Scenario 4B: Generates valid binary xlsx buffer that parses cleanly in ExcelJS', async () => {
      const wb = await generateOfficialSchoolRosterWorkbook({
        students: sampleStudents,
        classInfo: { id: 'c2', name: '១១ក', grade: 11 },
        academicYear: { id: 'y1', name: '២០២៦-២០២៧' },
        schoolInfo: { name: 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង', province: 'ព្រៃវែង' },
      });

      const buffer = await wb.xlsx.writeBuffer();
      assert.ok(buffer.byteLength > 5000, 'Buffer must be a non-trivial xlsx archive (>5KB)');

      // Verify the buffer can be re-read cleanly
      const reReadWb = new ExcelJS.Workbook();
      await reReadWb.xlsx.load(buffer as any);
      assert.equal(reReadWb.worksheets.length, 2);
      assert.equal(reReadWb.worksheets[0].name, 'បញ្ជីឈ្មោះសិស្ស 10-12');
    });
  });
});
