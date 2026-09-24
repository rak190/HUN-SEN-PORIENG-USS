import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Student } from '@/types';
import { CurriculumSchema, SubjectSchema } from '@/lib/curriculum';

export interface GeipExportParams {
  schoolName?: string;
  className: string;
  periodLabel: string;
  periodKey: string;
  students: Student[];
  matrixData: Record<string, Record<string, number>>;
  activeSchema: CurriculumSchema;
  maxTotalScore: number;
}

export async function exportGeipAssessmentToExcel({
  schoolName = 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង',
  className,
  periodLabel,
  periodKey,
  students,
  matrixData,
  activeSchema,
  maxTotalScore,
}: GeipExportParams) {
  const { 
    createOfficialMoEYSWorkbook, 
    applyMoEYSHeaders, 
    applyStandardTableStyles, 
    autoAdjustColumnWidths, 
    addSignatureBlock,
    downloadExcel
  } = await import('@/lib/excel/styledExcelGenerator');

  const subjects: SubjectSchema[] = activeSchema.subjects;
  const totalSubjectCols = subjects.length;
  const totalCols = 5 + totalSubjectCols + 4; // Info (5) + Subjects + Total + Avg + Rank + Grade

  const { workbook, worksheet, startRow: defaultStartRow } = createOfficialMoEYSWorkbook({
    sheetName: `GEIP_${periodKey}`,
    orientation: 'landscape',
    documentTitle: `តារាងលទ្ធផលតេស្តស្តង់ដា និងការវាយតម្លៃ GEIP ៣.១.៤ (${periodLabel})`,
    schoolName
  });

  applyMoEYSHeaders(
    worksheet, 
    totalCols, 
    `តារាងលទ្ធផលតេស្តស្តង់ដា និងការវាយតម្លៃ GEIP ៣.១.៤ (${periodLabel})`,
    `ក្រសួងអប់រំ យុវជន និងកីឡា - គម្រោង GEIP (IDA.No.7024-KH) | ថ្នាក់៖ ${className}`
  );

  // Rule notice
  worksheet.mergeCells(7, 1, 7, totalCols);
  const noticeCell = worksheet.getCell(7, 1);
  noticeCell.value = '* សម្គាល់៖ សិស្សអវត្តមាន បោះបង់ ឬមិនបានប្រឡងត្រូវបានជំនួសដោយលេខសូន្យ (0) តាមស្តង់ដាគម្រោង GEIP';
  noticeCell.font = { name: 'Khmer OS Battambang', size: 9, italic: true, color: { argb: 'FFB42318' } };
  noticeCell.alignment = { horizontal: 'left', vertical: 'middle' };

  // 2. Table Headers (Row 8 & 9)
  const headerRow1 = 8;
  const headerRow2 = 9;

  // Base Columns
  const baseHeaders = [
    { col: 1, label: 'ល.រ', width: 6 },
    { col: 2, label: 'អត្តលេខ', width: 12 },
    { col: 3, label: 'គោត្តនាម និងនាម', width: 22 },
    { col: 4, label: 'ភេទ', width: 8 },
    { col: 5, label: 'ស្ថានភាព', width: 12 },
  ];

  baseHeaders.forEach(h => {
    worksheet.mergeCells(headerRow1, h.col, headerRow2, h.col);
    const cell = worksheet.getCell(headerRow1, h.col);
    cell.value = h.label;
  });

  // Subject Columns
  subjects.forEach((sub, index) => {
    const colIndex = 6 + index;
    worksheet.getCell(headerRow1, colIndex).value = sub.label;
    worksheet.getCell(headerRow2, colIndex).value = `(${sub.maxScore})`;
  });

  // End Columns (Total, Average, Rank, Grade)
  const endHeaders = [
    { label: `ពិន្ទុសរុប\n(${maxTotalScore})` },
    { label: 'មធ្យមភាគ\n(50)' },
    { label: 'ចំណាត់\nថ្នាក់' },
    { label: 'និទ្ទេស' },
  ];

  endHeaders.forEach((eh, idx) => {
    const colIndex = 6 + totalSubjectCols + idx;
    worksheet.mergeCells(headerRow1, colIndex, headerRow2, colIndex);
    worksheet.getCell(headerRow1, colIndex).value = eh.label;
  });

  applyStandardTableStyles(worksheet, headerRow1, headerRow1, 2, totalCols);

  // 3. Populate Student Rows (with Zero-filling for GEIP rule)
  const totalCoefficient = maxTotalScore / 50;

  // Pre-calculate ranks
  const computedStudents = students.map(std => {
    const isDropoutOrInactive = std.is_active === false;
    const stdScores = matrixData[std.id] || {};
    
    let total = 0;
    const subjectScores: Record<string, number> = {};

    subjects.forEach(sub => {
      // If inactive or missing, enforce 0 as per GEIP specification
      if (isDropoutOrInactive) {
        subjectScores[sub.id] = 0;
      } else {
        const score = stdScores[sub.id];
        subjectScores[sub.id] = (score !== undefined && score !== null && !isNaN(score)) ? Number(score) : 0;
      }
      total += subjectScores[sub.id];
    });

    const average = Number((total / totalCoefficient).toFixed(2));
    
    let grade = 'F';
    if (!isDropoutOrInactive) {
      if (average >= 42.5) grade = 'A';
      else if (average >= 40.0) grade = 'B';
      else if (average >= 35.0) grade = 'C';
      else if (average >= 30.0) grade = 'D';
      else if (average >= 25.0) grade = 'E';
    }

    return {
      ...std,
      isDropoutOrInactive,
      subjectScores,
      totalScore: Number(total.toFixed(2)),
      average,
      grade,
    };
  }).sort((a, b) => b.totalScore - a.totalScore);

  const startDataRow = 9;
  computedStudents.forEach((std, index) => {
    const rowNum = startDataRow + index;
    const row = worksheet.getRow(rowNum);
    row.height = 22;

    // 1. ល.រ
    const c1 = row.getCell(1);
    c1.value = index + 1;
    c1.alignment = { horizontal: 'center', vertical: 'middle' };

    // 2. អត្តលេខ
    const c2 = row.getCell(2);
    c2.value = std.student_id_number || '-';
    c2.alignment = { horizontal: 'center', vertical: 'middle' };

    // 3. ឈ្មោះ
    const c3 = row.getCell(3);
    c3.value = std.full_name;
    c3.alignment = { horizontal: 'left', vertical: 'middle' };
    c3.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };

    // 4. ភេទ
    const c4 = row.getCell(4);
    const isFemale = std.gender === 'F' || std.gender === 'ស្រី';
    c4.value = isFemale ? 'ស្រី' : 'ប្រុស';
    c4.alignment = { horizontal: 'center', vertical: 'middle' };

    // 5. ស្ថានភាព
    const c5 = row.getCell(5);
    c5.value = std.isDropoutOrInactive ? 'បោះបង់' : 'រៀន';
    c5.alignment = { horizontal: 'center', vertical: 'middle' };
    c5.font = {
      name: 'Khmer OS Siemreap',
      size: 8.5,
      color: { argb: std.isDropoutOrInactive ? 'FFDC2626' : 'FF16A34A' },
      bold: true,
    };

    // Subject Scores
    subjects.forEach((sub, subIdx) => {
      const colIdx = 6 + subIdx;
      const cell = row.getCell(colIdx);
      const val = std.subjectScores[sub.id];
      cell.value = val;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { name: 'Khmer OS Siemreap', size: 9 };
      if (val === 0) {
        cell.font = { name: 'Khmer OS Siemreap', size: 9, color: { argb: 'FF94A3B8' } };
      }
    });

    // Total Score
    const totalCell = row.getCell(6 + totalSubjectCols);
    totalCell.value = std.totalScore;
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalCell.font = { name: 'Khmer OS Siemreap', size: 9, bold: true, color: { argb: 'FF155EEF' } };

    // Average
    const avgCell = row.getCell(6 + totalSubjectCols + 1);
    avgCell.value = std.average;
    avgCell.alignment = { horizontal: 'center', vertical: 'middle' };
    avgCell.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };

    // Rank
    const rankCell = row.getCell(6 + totalSubjectCols + 2);
    rankCell.value = std.isDropoutOrInactive ? '-' : index + 1;
    rankCell.alignment = { horizontal: 'center', vertical: 'middle' };
    rankCell.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };

    // Grade
    const gradeCell = row.getCell(6 + totalSubjectCols + 3);
    gradeCell.value = std.grade;
    gradeCell.alignment = { horizontal: 'center', vertical: 'middle' };
    gradeCell.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };

    row.commit();
  });

  applyStandardTableStyles(worksheet, startDataRow, startDataRow, computedStudents.length, totalCols);

  // Auto widths
  const minWidths = [6, 12, 22, 8, 12];
  subjects.forEach(sub => minWidths.push(Math.max(10, sub.label.length * 1.5)));
  minWidths.push(12, 11, 9, 9);
  autoAdjustColumnWidths(worksheet, totalCols, minWidths);

  // 4. Summary & Signatures at bottom
  const summaryStartRow = startDataRow + computedStudents.length + 2;
  
  const totalCount = computedStudents.length;
  const femaleCount = computedStudents.filter(s => s.gender === 'F' || s.gender === 'ស្រី').length;
  const activeCount = computedStudents.filter(s => !s.isDropoutOrInactive).length;
  const dropoutCount = totalCount - activeCount;
  
  const gradeCounts = {
    A: computedStudents.filter(s => s.grade === 'A').length,
    B: computedStudents.filter(s => s.grade === 'B').length,
    C: computedStudents.filter(s => s.grade === 'C').length,
    D: computedStudents.filter(s => s.grade === 'D').length,
    E: computedStudents.filter(s => s.grade === 'E').length,
    F: computedStudents.filter(s => s.grade === 'F').length,
  };

  const sumRow1 = worksheet.getRow(summaryStartRow);
  worksheet.mergeCells(summaryStartRow, 1, summaryStartRow, totalCols);
  sumRow1.getCell(1).value = `សរុបសិស្ស៖ ${totalCount} នាក់ (ស្រី៖ ${femaleCount} នាក់) | រៀនជាក់ស្តែង៖ ${activeCount} នាក់ | បោះបង់៖ ${dropoutCount} នាក់`;
  sumRow1.getCell(1).font = { name: 'Khmer OS Battambang', size: 9.5, bold: true };
  sumRow1.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

  const sumRow2 = worksheet.getRow(summaryStartRow + 1);
  worksheet.mergeCells(summaryStartRow + 1, 1, summaryStartRow + 1, totalCols);
  sumRow2.getCell(1).value = `ស្ថិតិនិទ្ទេស៖ A: ${gradeCounts.A} | B: ${gradeCounts.B} | C: ${gradeCounts.C} | D: ${gradeCounts.D} | E: ${gradeCounts.E} | F: ${gradeCounts.F}`;
  sumRow2.getCell(1).font = { name: 'Khmer OS Battambang', size: 9, bold: true, color: { argb: 'FF1E293B' } };
  sumRow2.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

  addSignatureBlock(worksheet, summaryStartRow + 4, totalCols, '');

  await downloadExcel(workbook, `GEIP_3.1.4_${className}_${periodKey}.xlsx`);
}
