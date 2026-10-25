import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  generateStudyPlanWorkbook,
  GenerateStudyPlanWorkbookOptions,
} from '../../lib/excel/study-plan-export';
import { Classroom, Student } from '../../types';

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
});
