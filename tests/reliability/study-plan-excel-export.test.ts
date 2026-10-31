import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  generateStudyPlanWorkbook,
  generateSingleSheetClassWorkbook,
} from '../../lib/excel/study-plan-export';
import { Classroom, Student } from '../../types';
import { buildDynamicSchemaSync } from '../../lib/curriculum';
import { getSubjectGradeLetter } from '../../app/(dashboard)/homeroom/student-study-plans/types';

describe('Study Plan Excel Export Suite', () => {
  const sampleClass: Classroom = {
    id: 'class-uuid-1',
    name: '12A',
    grade: '12',
    school_id: 'school-uuid-1',
    academic_year_id: 'ay-2025-2026',
    subjects: [],
    created_at: '2026-01-01',
  };

  const sampleStudent1: Student = {
    id: 'student-1',
    student_id_number: '001',
    full_name: 'រ៉ូ សាន',
    gender: 'M',
    class_id: 'class-uuid-1',
    guardian_name: 'សុខ គង់',
    parent_phone: '012345678',
    family_condition: 'មធ្យម',
    is_active: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  const sampleStudent2: Student = {
    id: 'student-2',
    student_id_number: '002',
    full_name: 'គឹម សុផល',
    gender: 'F',
    class_id: 'class-uuid-1',
    guardian_name: 'ហេង ស៊ីណា',
    parent_phone: '088998877',
    id_poor: 'level_1',
    is_active: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  const sampleTargets = {
    khmer: { initial: 'B', plan: { nov: 'A', dec: 'A' }, end_plan: 'A' },
    math: { initial: 'C', plan: { nov: 'B', dec: 'B' }, end_plan: 'A' },
  };

  const sampleGrades = [
    { period: 'nov', scores: { khmer: 140, math: 142, physics: 48 }, student_id: 'student-1' },
    { period: 'dec', scores: { khmer: 145, math: 146, physics: 49 }, student_id: 'student-1' },
    { period: 'annual', scores: { khmer: 148, math: 149, physics: 50 }, student_id: 'student-1' },
  ];

  it('uses the class year/grade curriculum maximum in exported actual results after XLSX round-trip', async () => {
    const classInfo = {
      ...sampleClass,
      curriculumSchema: buildDynamicSchemaSync(12, 'science', [{
        subject_name: 'គណិតវិទ្យា', grade_level: 12, stream_type: 'science',
        coefficient: 2.5, max_score: 125, is_core: true,
      }]),
    };
    const wb = generateStudyPlanWorkbook({
      classInfo,
      academicYearName: '2026-2027',
      studentsData: [{ student: sampleStudent1, planTargets: {} }],
      gradesData: [{ period: 'nov', scores: { math: 100 }, student_id: sampleStudent1.id }],
    });
    const restored = new ExcelJS.Workbook();
    await restored.xlsx.load(await wb.xlsx.writeBuffer());
    // Math is the second subject; D is November's actual-result column.
    assert.equal(restored.worksheets[0].getCell('D15').value, getSubjectGradeLetter(100, 125, 12));
    assert.notEqual(restored.worksheets[0].getCell('D15').value, getSubjectGradeLetter(100, 150, 12));
  });

  it('Scenario 1: Generates valid landscape A4 page setup with exact margins', () => {
    const wb = generateStudyPlanWorkbook({
      classInfo: sampleClass,
      academicYearName: '2025-2026',
      schoolInfo: {
        name: 'វិ.ហ៊ុន សែន ពោធិ៍រៀង ',
        abbreviation: 'វិ. ហស ពោធិ៍រៀង',
        province: 'ព្រៃវែង',
      },
      teacherInfo: {
        full_name: 'គ្រូ សុវណ្ណ',
        phone: '012999888',
      },
      studentsData: [
        {
          student: sampleStudent1,
          planTargets: sampleTargets,
        },
      ],
      gradesData: sampleGrades,
    });

    assert.equal(wb.worksheets.length, 1);
    const ws = wb.worksheets[0];
    assert.equal(ws.name, '1');

    // Landscape A4 setup
    assert.equal(ws.pageSetup.orientation, 'landscape');
    assert.equal(ws.pageSetup.paperSize, 9);
    assert.equal(ws.pageSetup.fitToWidth, 1);
    assert.equal(ws.pageSetup.fitToHeight, 1);
    assert.equal(ws.pageSetup.horizontalCentered, true);
    assert.equal(ws.pageSetup.printArea, 'A1:X27');

    // Margins (0.2 inch)
    assert.equal(ws.pageSetup.margins?.left, 0.2);
    assert.equal(ws.pageSetup.margins?.right, 0.2);
    assert.equal(ws.pageSetup.margins?.top, 0.2);
    assert.equal(ws.pageSetup.margins?.bottom, 0.2);
  });

  it('Scenario 2: Column widths and row heights match the reference school template', () => {
    const wb = generateStudyPlanWorkbook({
      classInfo: sampleClass,
      academicYearName: '2025-2026',
      studentsData: [{ student: sampleStudent1 }],
    });

    const ws = wb.worksheets[0];

    // Col 1: 9.22, Col 2: 9.00, Cols 3-24: 5.33
    assert.equal(ws.getColumn(1).width, 9.22);
    assert.equal(ws.getColumn(2).width, 9.0);
    for (let c = 3; c <= 24; c++) {
      assert.equal(ws.getColumn(c).width, 5.33);
    }

    // Row heights
    assert.equal(ws.getRow(1).height, 24.0);
    assert.equal(ws.getRow(2).height, 24.0);
    assert.equal(ws.getRow(5).height, 26.0);
    assert.equal(ws.getRow(14).height, 19.5);
    assert.equal(ws.getRow(23).height, 19.5);
    assert.equal(ws.getRow(24).height, 18.0);
  });

  it('Scenario 3: Header formatting has purple accent (#7030A0) and red actuals (#FF0000)', () => {
    const wb = generateStudyPlanWorkbook({
      classInfo: sampleClass,
      academicYearName: '2025-2026',
      studentsData: [
        {
          student: sampleStudent1,
          planTargets: sampleTargets,
        },
      ],
      gradesData: sampleGrades,
    });

    const ws = wb.worksheets[0];

    // Title banner (Row 5) has purple color #7030A0
    const titleCell = ws.getCell('A5');
    assert.ok(String(titleCell.value).includes('ផែនការសិក្សារបស់សិស្ស'));
    assert.equal(titleCell.font?.color?.argb, 'FF7030A0');

    // Subject header (Row 12 Col 1) has purple color #7030A0
    const subHeader = ws.getCell('A12');
    assert.equal(subHeader.value, 'មុខវិជ្ជា');
    assert.equal(subHeader.font?.color?.argb, 'FF7030A0');

    // 10 Month sub-column header for 'ជាក់ស្តែង' has red color #FF0000
    // Nov actual is Col 4 (D13)
    const novActualHeader = ws.getCell(13, 4);
    assert.equal(novActualHeader.font?.color?.argb, 'FFFF0000');

    // Actual grade values in data row (Row 14 Khmer, Col 4 Nov Actual)
    const novActualData = ws.getCell(14, 4);
    assert.equal(novActualData.font?.color?.argb, 'FFFF0000');
    // Nov score 45 / 50 for Grade 12 maps to 'A'
    assert.equal(novActualData.value, 'A');

    // Planned target in data row (Row 14 Khmer, Col 3 Nov Target)
    const novTargetData = ws.getCell(14, 3);
    assert.equal(novTargetData.value, 'A');
    assert.notEqual(novTargetData.font?.color?.argb, 'FFFF0000');
  });

  it('Scenario 4: Batch export creates separate sheet tabs per student named 1, 2, ...', () => {
    const wb = generateStudyPlanWorkbook({
      classInfo: sampleClass,
      academicYearName: '2025-2026',
      studentsData: [
        { student: sampleStudent1, planTargets: sampleTargets },
        { student: sampleStudent2 },
      ],
      gradesData: sampleGrades,
    });

    assert.equal(wb.worksheets.length, 2);
    assert.equal(wb.worksheets[0].name, '1');
    assert.equal(wb.worksheets[1].name, '2');

    // Sheet 1 student name is រ៉ូ សាន
    assert.equal(wb.worksheets[0].getCell('D6').value, 'រ៉ូ សាន');
    // Sheet 2 student name is គឹម សុផល
    assert.equal(wb.worksheets[1].getCell('D6').value, 'គឹម សុផល');
  });

  it('Scenario 5: Generates binary buffer that re-reads cleanly in ExcelJS', async () => {
    const wb = generateStudyPlanWorkbook({
      classInfo: sampleClass,
      academicYearName: '2025-2026',
      studentsData: [{ student: sampleStudent1 }],
      gradesData: sampleGrades,
    });

    const buffer = await wb.xlsx.writeBuffer();
    assert.ok(buffer.byteLength > 1000);

    const reReadWb = new ExcelJS.Workbook();
    await reReadWb.xlsx.load(buffer);

    assert.equal(reReadWb.worksheets.length, 1);
    const reReadWs = reReadWb.worksheets[0];
    assert.equal(reReadWs.getCell('A1').value, 'ព្រះរាជាណាចក្រកម្ពុជា');
    assert.equal(reReadWs.getCell('A12').value, 'មុខវិជ្ជា');
    assert.equal(reReadWs.pageSetup.orientation, 'landscape');
  });

  it('Scenario 6: Whole-class single-sheet export creates exactly ONE worksheet named ផែនការសិស្សទាំងថ្នាក់', () => {
    const wb = generateSingleSheetClassWorkbook({
      classInfo: sampleClass,
      academicYearName: '2025-2026',
      studentsData: [
        { student: sampleStudent1, planTargets: sampleTargets },
        { student: sampleStudent2 },
      ],
      gradesData: sampleGrades,
    });

    assert.equal(wb.worksheets.length, 1, 'Single-sheet export must have exactly ONE worksheet');
    const ws = wb.worksheets[0];
    assert.equal(ws.name, 'ផែនការសិស្សទាំងថ្នាក់');
    assert.ok(ws.name.length <= 31, 'Worksheet name must satisfy Excel 31-character limit');
    assert.equal(ws.pageSetup.orientation, 'landscape');
    assert.equal(ws.pageSetup.paperSize, 9);
  });

  it('Scenario 7: Generates 50 complete student blocks vertically stacked without merge collisions and with page breaks', () => {
    // Generate 50 sample students
    const fiftyStudents = Array.from({ length: 50 }, (_, i) => ({
      student: {
        id: `student-uuid-${i + 1}`,
        student_id_number: String(i + 1).padStart(3, '0'),
        full_name: `សិស្ស ទី${i + 1}`,
        gender: i % 2 === 0 ? 'M' : 'F',
        class_id: 'class-uuid-1',
        is_active: true,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      } as Student,
      planTargets: sampleTargets,
    }));

    const wb = generateSingleSheetClassWorkbook({
      classInfo: sampleClass,
      academicYearName: '2025-2026',
      studentsData: fiftyStudents,
      gradesData: sampleGrades,
    });

    assert.equal(wb.worksheets.length, 1);
    const ws = wb.worksheets[0];

    // Total rows: 50 students * 28 rows per block = 1400 rows
    assert.ok(ws.rowCount >= 50 * 27, 'Worksheet must contain full rows for all 50 student document blocks');

    // Check first student at Block 1 (Row 1)
    assert.equal(ws.getCell('D6').value, 'សិស្ស ទី1');
    assert.equal(ws.getCell('A1').value, 'ព្រះរាជាណាចក្រកម្ពុជា');
    assert.equal(ws.getCell('A12').value, 'មុខវិជ្ជា');

    // Check 25th student at Block 25 (startRow = 1 + 24 * 28 = 673)
    const block25Start = 1 + 24 * 28;
    assert.equal(ws.getCell(block25Start + 5, 4).value, 'សិស្ស ទី25');
    assert.equal(ws.getCell(block25Start, 1).value, 'ព្រះរាជាណាចក្រកម្ពុជា');
    assert.equal(ws.getCell(block25Start + 11, 1).value, 'មុខវិជ្ជា');

    // Check 50th student at Block 50 (startRow = 1 + 49 * 28 = 1373)
    const block50Start = 1 + 49 * 28;
    assert.equal(ws.getCell(block50Start + 5, 4).value, 'សិស្ស ទី50');
    assert.equal(ws.getCell(block50Start, 1).value, 'ព្រះរាជាណាចក្រកម្ពុជា');
    assert.equal(ws.getCell(block50Start + 11, 1).value, 'មុខវិជ្ជា');

    // Verify row page breaks: rows 27, 27+28, 27+56, ... have page breaks
    const rowBreaks = (ws as any).rowBreaks || [];
    assert.ok(rowBreaks.some((b: any) => b.id === 27), 'Block 1 row 27 must have an explicit page break');
    assert.ok(rowBreaks.some((b: any) => b.id === 27 + 28), 'Block 2 row 55 must have an explicit page break');

    // Verify print area encompasses all 50 student document blocks
    assert.ok(ws.pageSetup.printArea?.startsWith('A1:X'), 'Print area must encompass full width A:X');
    assert.ok(ws.pageSetup.printArea?.endsWith(String(1 + 50 * 28 - 2)), 'Print area must encompass all 50 blocks');
  });

  it('Scenario 8: 50-student single-sheet workbook writes to buffer and re-reads cleanly in ExcelJS', async () => {
    const fiftyStudents = Array.from({ length: 50 }, (_, i) => ({
      student: {
        id: `student-uuid-${i + 1}`,
        student_id_number: String(i + 1).padStart(3, '0'),
        full_name: `សិស្ស ទី${i + 1}`,
        gender: 'M',
        class_id: 'class-uuid-1',
        is_active: true,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      } as Student,
      planTargets: sampleTargets,
    }));

    const wb = generateSingleSheetClassWorkbook({
      classInfo: sampleClass,
      academicYearName: '2025-2026',
      studentsData: fiftyStudents,
      gradesData: sampleGrades,
    });

    const buffer = await wb.xlsx.writeBuffer();
    assert.ok(buffer.byteLength > 20000, '50-student workbook buffer must be substantial');

    const reReadWb = new ExcelJS.Workbook();
    await reReadWb.xlsx.load(buffer);

    assert.equal(reReadWb.worksheets.length, 1);
    const reReadWs = reReadWb.worksheets[0];
    assert.equal(reReadWs.name, 'ផែនការសិស្សទាំងថ្នាក់');
    assert.equal(reReadWs.pageSetup.orientation, 'landscape');

    // Check first and 50th student names
    assert.equal(reReadWs.getCell('D6').value, 'សិស្ស ទី1');
    const block50Start = 1 + 49 * 28;
    assert.equal(reReadWs.getCell(block50Start + 5, 4).value, 'សិស្ស ទី50');
  });
});
