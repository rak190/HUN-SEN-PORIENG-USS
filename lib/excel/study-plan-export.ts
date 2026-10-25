import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Classroom, Student } from '@/types';
import {
  STUDY_PLAN_SUBJECTS,
  STUDY_PLAN_MONTHS,
  getGradeScoreBands,
  getSubjectGradeLetter,
  toKhmerDigits,
  SubjectPlanTarget,
  StudyPlanSchoolInfo,
  StudyPlanTeacherInfo,
} from '@/app/(dashboard)/homeroom/student-study-plans/StudentStudyPlanDocument';
import { getCurriculumSchemaForClass } from '@/lib/curriculum';

export interface StudentStudyPlanExportItem {
  student: Student;
  planTargets?: Record<string, SubjectPlanTarget>;
  photoBuffer?: ArrayBuffer | Uint8Array;
}

export interface GenerateStudyPlanWorkbookOptions {
  classInfo: Classroom;
  academicYearName: string;
  schoolInfo?: StudyPlanSchoolInfo;
  teacherInfo?: StudyPlanTeacherInfo;
  studentsData: StudentStudyPlanExportItem[];
  gradesData?: Array<{ period: string; scores: Record<string, number>; student_id?: string }>;
  issueDateText?: string;
}

/**
 * Thin border helper for table and metadata cells
 */
const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
};

/**
 * Fetch student photo as ArrayBuffer safely (supports browser fetch and data URLs)
 */
export async function fetchPhotoBuffer(photoUrl?: string | null): Promise<ArrayBuffer | null> {
  if (!photoUrl || typeof photoUrl !== 'string' || !photoUrl.trim()) return null;
  try {
    if (photoUrl.startsWith('data:')) {
      const parts = photoUrl.split(',');
      const base64 = parts[1];
      if (!base64) return null;
      if (typeof window !== 'undefined' && window.atob) {
        const binary = window.atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
      }
      return Buffer.from(base64, 'base64').buffer as ArrayBuffer;
    }

    if (typeof fetch !== 'undefined') {
      const res = await fetch(photoUrl, { mode: 'cors' });
      if (!res.ok) return null;
      return await res.arrayBuffer();
    }
  } catch (err) {
    console.warn('Failed to fetch student photo for Excel export:', err);
  }
  return null;
}

/**
 * Generates an ExcelJS Workbook matching the official Cambodian school sample 'ផែនការសិស្ស 8-12.xlsx'
 */
export function generateStudyPlanWorkbook(options: GenerateStudyPlanWorkbookOptions): ExcelJS.Workbook {
  const {
    classInfo,
    academicYearName,
    schoolInfo,
    teacherInfo,
    studentsData,
    gradesData = [],
    issueDateText,
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង';
  workbook.created = new Date();

  const gradeLevelNum = parseInt(String(classInfo.grade || '12').replace(/[^0-9]/g, ''), 10) || 12;
  const schema = getCurriculumSchemaForClass(classInfo.grade, (classInfo as any).track);

  // Grade level subtitle matching official sample
  const gradeSubtitle =
    gradeLevelNum === 11 || gradeLevelNum === 12
      ? `(ទុតិយភូមិ ថ្នាក់ទី ${toKhmerDigits(gradeLevelNum)})`
      : gradeLevelNum === 10
      ? '(ទុតិយភូមិ ថ្នាក់ទី ១០)'
      : `(បឋមភូមិ ថ្នាក់ទី ${toKhmerDigits(gradeLevelNum)})`;

  // Standard metadata strings
  const departmentName =
    schoolInfo?.department ||
    `មន្ទីរអប់រំ យុវជន និងកីឡាខេត្ត${schoolInfo?.province || 'ព្រៃវែង'}`;
  const schoolName = schoolInfo?.name || 'វិ.ហ៊ុន សែន ពោធិ៍រៀង ';
  const schoolAbbr = schoolInfo?.abbreviation || 'វិ. ហស ពោធិ៍រៀង';
  const provinceName = schoolInfo?.province || 'ព្រៃវែង';

  const defaultDateStr =
    issueDateText ||
    `${schoolAbbr} ថ្ងៃទី១០ ខែវិច្ឆិកា ឆ្នាំ${toKhmerDigits(academicYearName.split('-')[0] || '២០២៥')}`;

  const scoreBands = getGradeScoreBands(gradeLevelNum);

  // Build each worksheet (1 sheet per student, matching school template sheet naming '1', '2', etc.)
  studentsData.forEach((item, index) => {
    const student = item.student;
    const planTargets = item.planTargets || {};
    const sheetName = String(index + 1);

    const ws = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }],
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        horizontalCentered: true,
        verticalCentered: false,
        margins: {
          left: 0.2,
          right: 0.2,
          top: 0.2,
          bottom: 0.2,
          header: 0,
          footer: 0,
        },
        printArea: 'A1:X27',
      },
    });

    // Exact Column Widths from 'ផែនការសិស្ស 8-12.xlsx'
    ws.getColumn(1).width = 9.22; // A: មុខវិជ្ជា
    ws.getColumn(2).width = 9.0;  // B: កម្រិតពិន្ទុនៅដើមឆ្នាំ
    for (let c = 3; c <= 24; c++) {
      ws.getColumn(c).width = 5.33; // C..X: Months Nov-Aug & Year-end
    }

    // Exact Row Heights
    ws.getRow(1).height = 24.0;
    ws.getRow(2).height = 24.0;
    ws.getRow(3).height = 18.0;
    ws.getRow(4).height = 18.0;
    ws.getRow(5).height = 26.0;
    ws.getRow(6).height = 18.0;
    ws.getRow(7).height = 18.0;
    ws.getRow(8).height = 18.0;
    ws.getRow(9).height = 18.0;
    ws.getRow(10).height = 16.5;
    ws.getRow(11).height = 16.5;
    ws.getRow(12).height = 20.0;
    ws.getRow(13).height = 20.0;
    for (let r = 14; r <= 23; r++) {
      ws.getRow(r).height = 19.5;
    }
    for (let r = 24; r <= 27; r++) {
      ws.getRow(r).height = 18.0;
    }

    // ---------------- Row 1 & 2: Kingdom Motto ----------------
    ws.mergeCells('A1:T1');
    const r1 = ws.getCell('A1');
    r1.value = 'ព្រះរាជាណាចក្រកម្ពុជា';
    r1.font = { name: 'Khmer OS Muol Light', size: 11, bold: true };
    r1.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('A2:T2');
    const r2 = ws.getCell('A2');
    r2.value = 'ជាតិ សាសនា ព្រះមហាក្សត្រ';
    r2.font = { name: 'Khmer OS Muol Light', size: 11, bold: true };
    r2.alignment = { horizontal: 'center', vertical: 'middle' };

    // ---------------- Row 3 & 4: Ministry & School (Left side) ----------------
    ws.mergeCells('A3:F3');
    const r3 = ws.getCell('A3');
    r3.value = departmentName;
    r3.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    r3.alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells('A4:F4');
    const r4 = ws.getCell('A4');
    r4.value = schoolName;
    r4.font = { name: 'Khmer OS Muol Light', size: 9, bold: true, color: { argb: 'FF155EEF' } };
    r4.alignment = { horizontal: 'left', vertical: 'middle' };

    // ---------------- Top-Right 3x4 Photo (U2:X7) ----------------
    // Merge cells U2:X7 (Cols 21..24, Rows 2..7)
    ws.mergeCells('U2:X7');
    const photoCell = ws.getCell('U2');

    if (item.photoBuffer) {
      try {
        const imageId = workbook.addImage({
          buffer: item.photoBuffer as any,
          extension: 'jpeg',
        });
        ws.addImage(imageId, {
          tl: { col: 20, row: 1.1 } as any,
          br: { col: 24, row: 7 } as any,
          editAs: 'oneCell',
        });
      } catch (e) {
        console.warn('Could not add image to Excel sheet:', e);
        photoCell.value = 'រូបថត 3x4';
        photoCell.font = { name: 'Khmer OS Siemreap', size: 9, color: { argb: 'FF999999' } };
        photoCell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    } else {
      photoCell.value = 'រូបថត 3x4';
      photoCell.font = { name: 'Khmer OS Siemreap', size: 9, color: { argb: 'FF999999' } };
      photoCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Border around photo frame
    for (let pr = 2; pr <= 7; pr++) {
      for (let pc = 21; pc <= 24; pc++) {
        const c = ws.getCell(pr, pc);
        c.border = {
          top: pr === 2 ? { style: 'thin' } : undefined,
          bottom: pr === 7 ? { style: 'thin' } : undefined,
          left: pc === 21 ? { style: 'thin' } : undefined,
          right: pc === 24 ? { style: 'thin' } : undefined,
        };
      }
    }

    // ---------------- Row 5: Document Title Banner ----------------
    ws.mergeCells('A5:T5');
    const titleCell = ws.getCell('A5');
    titleCell.value = `ផែនការសិក្សារបស់សិស្ស ឆ្នាំសិក្សា${toKhmerDigits(academicYearName)} ${gradeSubtitle}`;
    titleCell.font = {
      name: 'Khmer OS Muol Light',
      size: 11,
      bold: true,
      color: { argb: 'FF7030A0' }, // Official Purple Accent
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // ---------------- Student Info Grid (Rows 6 to 9) ----------------
    const genderText = student.gender === 'F' || student.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស';
    const parentsName =
      student.guardian_name ||
      [student.father_name, student.mother_name].filter(Boolean).join(' - ') ||
      '..................................';
    const parentPhone =
      student.parent_phone ||
      student.father_phone ||
      student.mother_phone ||
      student.guardian_phone ||
      '..................................';
    const teacherName = teacherInfo?.full_name || '..................................';
    const teacherPhone = teacherInfo?.phone || '..................................';
    const familyCondition =
      student.family_condition ||
      (student.id_poor === 'level_1'
        ? 'ក្រីក្រ (កម្រិត ១)'
        : student.id_poor === 'level_2'
        ? 'ក្រីក្រ (កម្រិត ២)'
        : 'មធ្យម');

    // Row 6: ឈ្មោះសិស្ស | ភេទ | ថ្នាក់ទី | ស្ថានភាពគ្រួសារ
    ws.mergeCells('A6:C6');
    ws.getCell('A6').value = 'ឈ្មោះសិស្ស ៖';
    ws.getCell('A6').font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    ws.getCell('A6').alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells('D6:F6');
    ws.getCell('D6').value = student.full_name || '';
    ws.getCell('D6').font = { name: 'Khmer OS Muol Light', size: 9.5, bold: true };
    ws.getCell('D6').alignment = { horizontal: 'left', vertical: 'middle' };

    ws.getCell('G6').value = 'ភេទ ៖';
    ws.getCell('G6').font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    ws.getCell('G6').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('H6:I6');
    ws.getCell('H6').value = genderText;
    ws.getCell('H6').font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    ws.getCell('H6').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell('J6').value = 'ថ្នាក់ទី៖';
    ws.getCell('J6').font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    ws.getCell('J6').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('K6:O6');
    ws.getCell('K6').value = toKhmerDigits(classInfo.name);
    ws.getCell('K6').font = { name: 'Khmer OS Siemreap', size: 9.5, bold: true, color: { argb: 'FF155EEF' } };
    ws.getCell('K6').alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells('P6:R6');
    ws.getCell('P6').value = 'ស្ថានភាពគ្រួសារ ៖';
    ws.getCell('P6').font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    ws.getCell('P6').alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells('S6:T6');
    ws.getCell('S6').value = familyCondition;
    ws.getCell('S6').font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    ws.getCell('S6').alignment = { horizontal: 'left', vertical: 'middle' };

    // Row 7: សាលារៀន | ខេត្ត
    ws.mergeCells('A7:C7');
    ws.getCell('A7').value = 'សាលារៀន ៖';
    ws.getCell('A7').font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    ws.getCell('A7').alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells('D7:O7');
    ws.getCell('D7').value = schoolAbbr;
    ws.getCell('D7').font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    ws.getCell('D7').alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells('P7:R7');
    ws.getCell('P7').value = 'ខេត្ត ៖';
    ws.getCell('P7').font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    ws.getCell('P7').alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells('S7:T7');
    ws.getCell('S7').value = provinceName;
    ws.getCell('S7').font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    ws.getCell('S7').alignment = { horizontal: 'left', vertical: 'middle' };

    // Row 8: ឈ្មោះមាតាបិតា | លេខទូរស័ព្ទ
    ws.mergeCells('A8:C8');
    ws.getCell('A8').value = 'ឈ្មោះមាតាបិតា ៖';
    ws.getCell('A8').font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    ws.getCell('A8').alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells('D8:O8');
    ws.getCell('D8').value = parentsName;
    ws.getCell('D8').font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    ws.getCell('D8').alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells('P8:R8');
    ws.getCell('P8').value = 'លេខទូរស័ព្ទ ៖';
    ws.getCell('P8').font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    ws.getCell('P8').alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells('S8:T8');
    ws.getCell('S8').value = toKhmerDigits(parentPhone);
    ws.getCell('S8').font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    ws.getCell('S8').alignment = { horizontal: 'left', vertical: 'middle' };

    // Row 9: ឈ្មោះគ្រូបន្ទុកថ្នាក់ | លេខទូរស័ព្ទ
    ws.mergeCells('A9:C9');
    ws.getCell('A9').value = 'ឈ្មោះគ្រូបន្ទុកថ្នាក់ ៖';
    ws.getCell('A9').font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    ws.getCell('A9').alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells('D9:O9');
    ws.getCell('D9').value = teacherName;
    ws.getCell('D9').font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    ws.getCell('D9').alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells('P9:R9');
    ws.getCell('P9').value = 'លេខទូរស័ព្ទ ៖';
    ws.getCell('P9').font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    ws.getCell('P9').alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells('S9:T9');
    ws.getCell('S9').value = toKhmerDigits(teacherPhone);
    ws.getCell('S9').font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    ws.getCell('S9').alignment = { horizontal: 'left', vertical: 'middle' };

    // ---------------- Score Bands Legend (Rows 10 & 11) ----------------
    // Format score scale text directly with MoEYS letter bands
    if (scoreBands[0]) {
      ws.mergeCells('A10:X10');
      const b1 = ws.getCell('A10');
      b1.value = `${scoreBands[0].title} ${scoreBands[0].ranges.map((r) => r.label).join('   ')}`;
      b1.font = { name: 'Khmer OS Siemreap', size: 8.5 };
      b1.alignment = { horizontal: 'left', vertical: 'middle' };
    }
    if (scoreBands[1]) {
      ws.mergeCells('A11:X11');
      const b2 = ws.getCell('A11');
      b2.value = `${scoreBands[1].title} ${scoreBands[1].ranges.map((r) => r.label).join('   ')}`;
      b2.font = { name: 'Khmer OS Siemreap', size: 8.5 };
      b2.alignment = { horizontal: 'left', vertical: 'middle' };
    }

    // ---------------- Main Table Header (Rows 12 & 13) ----------------
    // Col 1: មុខវិជ្ជា (A12:A13)
    ws.mergeCells('A12:A13');
    const hSub = ws.getCell('A12');
    hSub.value = 'មុខវិជ្ជា';
    hSub.font = { name: 'Khmer OS Siemreap', size: 9.5, bold: true, color: { argb: 'FF7030A0' } };
    hSub.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    hSub.border = thinBorder;
    ws.getCell('A13').border = thinBorder;

    // Col 2: កម្រិតពិន្ទុនៅដើមឆ្នាំ (B12:B13)
    ws.mergeCells('B12:B13');
    const hInit = ws.getCell('B12');
    hInit.value = 'កម្រិតពិន្ទុ\nនៅដើមឆ្នាំ';
    hInit.font = { name: 'Khmer OS Siemreap', size: 8.5, bold: true };
    hInit.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    hInit.border = thinBorder;
    ws.getCell('B13').border = thinBorder;

    // Cols 3..22: Plan & Actual Header (C12:V12)
    ws.mergeCells('C12:V12');
    const hSpan = ws.getCell('C12');
    hSpan.value = 'កម្រិតពិន្ទុនិងនិទ្ទេសដើមឆ្នាំ(ខ្មៅ) និងចុងឆ្នាំ(ក្រហម)';
    hSpan.font = { name: 'Khmer OS Siemreap', size: 9.5, bold: true };
    hSpan.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let c = 3; c <= 22; c++) {
      ws.getCell(12, c).border = thinBorder;
    }

    // Row 13 sub-columns: 10 Months (Nov to Aug)
    STUDY_PLAN_MONTHS.forEach((m, mIdx) => {
      const planCol = 3 + mIdx * 2;
      const actCol = planCol + 1;

      // Plan Month Name (e.g. វិច្ឆិកា)
      const pCell = ws.getCell(13, planCol);
      pCell.value = m.shortLabel;
      pCell.font = { name: 'Khmer OS Siemreap', size: 8.5, bold: true };
      pCell.alignment = { horizontal: 'center', vertical: 'middle' };
      pCell.border = thinBorder;

      // Actual Result Label (ជាក់ស្តែង in Bold Red)
      const aCell = ws.getCell(13, actCol);
      aCell.value = 'ជាក់\nស្តែង';
      aCell.font = { name: 'Khmer OS Siemreap', size: 8, bold: true, color: { argb: 'FFFF0000' } };
      aCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      aCell.border = thinBorder;
    });

    // Col 23: គ្រោងចុងឆ្នាំ (W12:W13)
    ws.mergeCells('W12:W13');
    const hEndPlan = ws.getCell('W12');
    hEndPlan.value = 'គ្រោងចុង\nឆ្នាំ';
    hEndPlan.font = { name: 'Khmer OS Siemreap', size: 8.5, bold: true };
    hEndPlan.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    hEndPlan.border = thinBorder;
    ws.getCell('W13').border = thinBorder;

    // Col 24: លទ្ធផលជាក់ស្តែង (X12:X13 in Red)
    ws.mergeCells('X12:X13');
    const hEndAct = ws.getCell('X12');
    hEndAct.value = 'លទ្ធផល\nជាក់ស្តែង';
    hEndAct.font = { name: 'Khmer OS Siemreap', size: 8.5, bold: true, color: { argb: 'FFFF0000' } };
    hEndAct.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    hEndAct.border = thinBorder;
    ws.getCell('X13').border = thinBorder;

    // Map student published scores
    const studentScoresByPeriod: Record<string, Record<string, number>> = {};
    gradesData.forEach((g: any) => {
      if (g && g.period && (!g.student_id || g.student_id === student.id)) {
        studentScoresByPeriod[g.period] = g.scores || {};
      }
    });

    // ---------------- Table Data: 10 Subjects (Rows 14 to 23) ----------------
    STUDY_PLAN_SUBJECTS.forEach((sub, sIdx) => {
      const rowNum = 14 + sIdx;
      const target = planTargets[sub.id] || {};

      // Resolve max score for this subject
      const schemaSub = schema.subjects.find(
        (s) =>
          s.id === sub.id ||
          (sub.aliases && sub.aliases.includes(s.id)) ||
          s.label === sub.officialLabel
      );
      const maxScore =
        schemaSub?.maxScore || (gradeLevelNum <= 9 && (sub.id === 'khmer' || sub.id === 'math') ? 100 : 50);

      // Score lookup helper
      const getScore = (periodId: string) => {
        const periodScores = studentScoresByPeriod[periodId];
        if (!periodScores) return undefined;
        if (periodScores[sub.id] !== undefined) return periodScores[sub.id];
        if (sub.aliases) {
          for (const alias of sub.aliases) {
            if (periodScores[alias] !== undefined) return periodScores[alias];
          }
        }
        return undefined;
      };

      const preTestScore = getScore('pre-test');
      const preTestLetter = getSubjectGradeLetter(preTestScore, maxScore, gradeLevelNum);
      const initialDisplay = target.initial || preTestLetter || '';

      const annualScore = getScore('annual');
      const annualLetter = getSubjectGradeLetter(annualScore, maxScore, gradeLevelNum);

      // Col 1: Subject Name
      const subCell = ws.getCell(rowNum, 1);
      subCell.value = sub.label;
      subCell.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
      subCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      subCell.border = thinBorder;

      // Col 2: Beginning of year target
      const initCell = ws.getCell(rowNum, 2);
      initCell.value = initialDisplay;
      initCell.font = { name: 'Khmer OS Siemreap', size: 9.5, bold: true };
      initCell.alignment = { horizontal: 'center', vertical: 'middle' };
      initCell.border = thinBorder;

      // Cols 3..22: 10 Months Target & Actual
      STUDY_PLAN_MONTHS.forEach((m, mIdx) => {
        const planCol = 3 + mIdx * 2;
        const actCol = planCol + 1;

        const monthTargetLetter = target.plan?.[m.id] || '';
        const monthScore = getScore(m.id);
        const officialActual = getSubjectGradeLetter(monthScore, maxScore, gradeLevelNum);
        const monthActualLetter = officialActual || target.actual?.[m.id] || '';

        // Plan Cell (Black font)
        const pCell = ws.getCell(rowNum, planCol);
        pCell.value = monthTargetLetter;
        pCell.font = { name: 'Khmer OS Siemreap', size: 9.5, bold: true };
        pCell.alignment = { horizontal: 'center', vertical: 'middle' };
        pCell.border = thinBorder;

        // Actual Cell (Bold Red font)
        const aCell = ws.getCell(rowNum, actCol);
        aCell.value = monthActualLetter;
        aCell.font = { name: 'Khmer OS Siemreap', size: 9.5, bold: true, color: { argb: 'FFFF0000' } };
        aCell.alignment = { horizontal: 'center', vertical: 'middle' };
        aCell.border = thinBorder;
      });

      // Col 23: End of Year Plan (Black font)
      const endPlanCell = ws.getCell(rowNum, 23);
      endPlanCell.value = target.end_plan || '';
      endPlanCell.font = { name: 'Khmer OS Siemreap', size: 9.5, bold: true };
      endPlanCell.alignment = { horizontal: 'center', vertical: 'middle' };
      endPlanCell.border = thinBorder;

      // Col 24: End of Year Actual (Bold Red font)
      const endActCell = ws.getCell(rowNum, 24);
      endActCell.value = annualLetter || target.end_actual || '';
      endActCell.font = { name: 'Khmer OS Siemreap', size: 9.5, bold: true, color: { argb: 'FFFF0000' } };
      endActCell.alignment = { horizontal: 'center', vertical: 'middle' };
      endActCell.border = thinBorder;
    });

    // ---------------- 5-Column Endorsement Footer (Rows 24 to 27) ----------------
    // Col 1: នាយករង (A24:C24 and A25:C25)
    ws.mergeCells('A24:C24');
    const f1Top = ws.getCell('A24');
    f1Top.value = 'បានឃើញ និងឯកភាព';
    f1Top.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    f1Top.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('A25:C25');
    const f1Bot = ws.getCell('A25');
    f1Bot.value = 'នាយករង';
    f1Bot.font = { name: 'Khmer OS Muol Light', size: 9, bold: true };
    f1Bot.alignment = { horizontal: 'center', vertical: 'middle' };

    // Col 2: គ្រូទទួលបន្ទុកថ្នាក់ (D24:G24 and D25:G25)
    ws.mergeCells('D24:G24');
    const f2Top = ws.getCell('D24');
    f2Top.value = 'បានឃើញ និងឯកភាព';
    f2Top.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    f2Top.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('D25:G25');
    const f2Bot = ws.getCell('D25');
    f2Bot.value = 'គ្រូទទួលបន្ទុកថ្នាក់';
    f2Bot.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    f2Bot.alignment = { horizontal: 'center', vertical: 'middle' };

    // Col 3: មាតាបិតាចុងឆ្នាំ (H24:L24 and H25:L25)
    ws.mergeCells('H24:L24');
    const f3Top = ws.getCell('H24');
    f3Top.value = 'ហត្ថលេខាឬ';
    f3Top.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    f3Top.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('H25:L25');
    const f3Bot = ws.getCell('H25');
    f3Bot.value = 'ស្នាមមេដៃមាតាបិតាចុងឆ្នាំ';
    f3Bot.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    f3Bot.alignment = { horizontal: 'center', vertical: 'middle' };

    // Col 4: មាតាបិតាដើមឆ្នាំ (M24:Q24 and M25:Q25)
    ws.mergeCells('M24:Q24');
    const f4Top = ws.getCell('M24');
    f4Top.value = 'ហត្ថលេខាឬ';
    f4Top.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    f4Top.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('M25:Q25');
    const f4Bot = ws.getCell('M25');
    f4Bot.value = 'ស្នាមមេដៃមាតាបិតាដើមឆ្នាំ';
    f4Bot.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    f4Bot.alignment = { horizontal: 'center', vertical: 'middle' };

    // Col 5: Lunar Date, Issue Date & Student Signature (R24:X24, R25:X25, R27:X27)
    ws.mergeCells('R24:X24');
    const f5Lunar = ws.getCell('R24');
    f5Lunar.value = 'ថ្ងៃចន្ទ ៥រោច ខែកត្តិក ឆ្នាំម្សាញ់ សប្តស័ក ព.ស.២៥៦៩';
    f5Lunar.font = { name: 'Khmer OS Siemreap', size: 8 };
    f5Lunar.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('R25:X25');
    const f5Date = ws.getCell('R25');
    f5Date.value = defaultDateStr;
    f5Date.font = { name: 'Khmer OS Siemreap', size: 8.5, bold: true };
    f5Date.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('R27:X27');
    const f5Sig = ws.getCell('R27');
    f5Sig.value = 'ហត្ថលេខានិងឈ្មោះសិស្ស';
    f5Sig.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
    f5Sig.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  return workbook;
}

/**
 * Downloads an Excel workbook as a .xlsx file in the browser using FileSaver
 */
export async function downloadStudyPlanExcel(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * Export a single student study plan to Excel
 */
export async function exportSingleStudyPlanExcel(params: {
  student: Student;
  classInfo: Classroom;
  academicYearName: string;
  schoolInfo?: StudyPlanSchoolInfo;
  teacherInfo?: StudyPlanTeacherInfo;
  planTargets?: Record<string, SubjectPlanTarget>;
  gradesData?: Array<{ period: string; scores: Record<string, number>; student_id?: string }>;
  issueDateText?: string;
  photoBuffer?: ArrayBuffer | null;
}): Promise<void> {
  const photoBuf = params.photoBuffer !== undefined ? params.photoBuffer : await fetchPhotoBuffer(params.student.photo_url);

  const wb = generateStudyPlanWorkbook({
    classInfo: params.classInfo,
    academicYearName: params.academicYearName,
    schoolInfo: params.schoolInfo,
    teacherInfo: params.teacherInfo,
    studentsData: [
      {
        student: params.student,
        planTargets: params.planTargets,
        photoBuffer: photoBuf || undefined,
      },
    ],
    gradesData: params.gradesData,
    issueDateText: params.issueDateText,
  });

  const studentNameClean = (params.student.full_name || 'សិស្ស').replace(/[\\/*?:[\]]/g, '_');
  const filename = `ផែនការសិក្សារបស់សិស្ស_${params.classInfo.name}_${studentNameClean}.xlsx`;
  await downloadStudyPlanExcel(wb, filename);
}

/**
 * Export all selected students' study plans into a multi-sheet class workbook (.xlsx)
 */
export async function exportBatchStudyPlansExcel(params: {
  students: Student[];
  classInfo: Classroom;
  academicYearName: string;
  schoolInfo?: StudyPlanSchoolInfo;
  teacherInfo?: StudyPlanTeacherInfo;
  studyPlansMap?: Record<string, Record<string, SubjectPlanTarget>>;
  gradesData?: Array<{ period: string; scores: Record<string, number>; student_id?: string }>;
  issueDateText?: string;
  onProgress?: (current: number, total: number) => void;
}): Promise<void> {
  const total = params.students.length;
  const items: StudentStudyPlanExportItem[] = [];

  for (let i = 0; i < total; i++) {
    if (params.onProgress) {
      params.onProgress(i + 1, total);
    }
    const student = params.students[i];
    const photoBuf = await fetchPhotoBuffer(student.photo_url);
    items.push({
      student,
      planTargets: params.studyPlansMap?.[student.id] || {},
      photoBuffer: photoBuf || undefined,
    });
  }

  const wb = generateStudyPlanWorkbook({
    classInfo: params.classInfo,
    academicYearName: params.academicYearName,
    schoolInfo: params.schoolInfo,
    teacherInfo: params.teacherInfo,
    studentsData: items,
    gradesData: params.gradesData,
    issueDateText: params.issueDateText,
  });

  const filename = `ផែនការសិក្សារបស់សិស្ស_ថ្នាក់ទី${params.classInfo.name}_(សិស្ស${items.length}នាក់).xlsx`;
  await downloadStudyPlanExcel(wb, filename);
}
