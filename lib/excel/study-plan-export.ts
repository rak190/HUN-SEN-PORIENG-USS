import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Classroom, Student } from '@/types';
import {
  STUDY_PLAN_SUBJECTS,
  STUDY_PLAN_MONTHS,
  getGradeScoreBands,
  toKhmerDigits,
  SubjectPlanTarget,
  StudyPlanSchoolInfo,
  StudyPlanTeacherInfo,
  ScoreBandScale,
  resolveAuthoritativeGradeLetter,
  lookupScoreWithAliases,
} from '@/app/(dashboard)/homeroom/student-study-plans/types';
import { getCurriculumSchemaForClass, CurriculumSchema } from '@/lib/curriculum';

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
 * Standard thin border for all table grid and metadata cells
 */
export const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
};

/**
 * Sets standard column widths matching official school template 'ផែនការសិស្ស 8-12.xlsx'
 */
export function setStudyPlanColumnWidths(ws: ExcelJS.Worksheet) {
  ws.getColumn(1).width = 9.22; // A: មុខវិជ្ជា
  ws.getColumn(2).width = 9.0;  // B: កម្រិតពិន្ទុនៅដើមឆ្នាំ
  for (let c = 3; c <= 24; c++) {
    ws.getColumn(c).width = 5.33; // C..X: Months Nov-Aug & Year-end
  }
}

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

export interface RenderStudentBlockParams {
  worksheet: ExcelJS.Worksheet;
  workbook: ExcelJS.Workbook;
  startRow: number;
  item: StudentStudyPlanExportItem;
  classInfo: Classroom;
  academicYearName: string;
  schoolInfo?: StudyPlanSchoolInfo;
  teacherInfo?: StudyPlanTeacherInfo;
  gradesData?: Array<{ period: string; scores: Record<string, number>; student_id?: string }>;
  issueDateText?: string;
  departmentName: string;
  schoolName: string;
  provinceName: string;
  teacherName: string;
  teacherPhone: string;
  gradeSubtitle: string;
  defaultDateStr: string;
  scoreBands: ScoreBandScale[];
  schema: CurriculumSchema;
  gradeLevelNum: number;
}

/**
 * Renders one complete student study plan document block (27 rows) into a worksheet
 * starting at startRow. Reused identically for single-sheet and multi-sheet exports.
 */
export function renderStudentStudyPlanBlock(params: RenderStudentBlockParams): { endRow: number } {
  const {
    worksheet: ws,
    workbook,
    startRow,
    item,
    classInfo,
    academicYearName,
    teacherInfo,
    gradesData = [],
    departmentName,
    schoolName,
    provinceName,
    teacherName,
    teacherPhone,
    gradeSubtitle,
    defaultDateStr,
    scoreBands,
  } = params;

  const student = item.student;
  const planTargets = item.planTargets || {};

  // Build lookup map for this student's published exam scores: period -> scores
  const studentScoresByPeriod: Record<string, Record<string, number>> = {};
  gradesData.forEach((g: any) => {
    if (g && (g.student_id === student.id || !g.student_id) && g.period && g.scores) {
      studentScoresByPeriod[g.period] = g.scores;
    }
  });

  // Apply row heights for this student's 27-row document block
  ws.getRow(startRow + 0).height = 24.0;
  ws.getRow(startRow + 1).height = 24.0;
  ws.getRow(startRow + 2).height = 18.0;
  ws.getRow(startRow + 3).height = 18.0;
  ws.getRow(startRow + 4).height = 26.0;
  ws.getRow(startRow + 5).height = 18.0;
  ws.getRow(startRow + 6).height = 18.0;
  ws.getRow(startRow + 7).height = 18.0;
  ws.getRow(startRow + 8).height = 18.0;
  ws.getRow(startRow + 9).height = 16.5;
  ws.getRow(startRow + 10).height = 16.5;
  ws.getRow(startRow + 11).height = 20.0;
  ws.getRow(startRow + 12).height = 20.0;
  for (let r = startRow + 13; r <= startRow + 22; r++) {
    ws.getRow(r).height = 19.5;
  }
  for (let r = startRow + 23; r <= startRow + 26; r++) {
    ws.getRow(r).height = 18.0;
  }

  // ---------------- Row 1 & 2: Kingdom Motto ----------------
  ws.mergeCells(startRow + 0, 1, startRow + 0, 20);
  const r1 = ws.getCell(startRow + 0, 1);
  r1.value = 'ព្រះរាជាណាចក្រកម្ពុជា';
  r1.font = { name: 'Khmer OS Muol Light', size: 11, bold: true };
  r1.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(startRow + 1, 1, startRow + 1, 20);
  const r2 = ws.getCell(startRow + 1, 1);
  r2.value = 'ជាតិ សាសនា ព្រះមហាក្សត្រ';
  r2.font = { name: 'Khmer OS Muol Light', size: 11, bold: true };
  r2.alignment = { horizontal: 'center', vertical: 'middle' };

  // ---------------- Row 3 & 4: Ministry & School (Left side) ----------------
  ws.mergeCells(startRow + 2, 1, startRow + 2, 6);
  const r3 = ws.getCell(startRow + 2, 1);
  r3.value = departmentName;
  r3.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  r3.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells(startRow + 3, 1, startRow + 3, 6);
  const r4 = ws.getCell(startRow + 3, 1);
  r4.value = schoolName;
  r4.font = { name: 'Khmer OS Muol Light', size: 9, bold: true, color: { argb: 'FF155EEF' } };
  r4.alignment = { horizontal: 'left', vertical: 'middle' };

  // ---------------- Photo Frame (Rows 2..7, Cols 21..24) ----------------
  ws.mergeCells(startRow + 1, 21, startRow + 6, 24);
  const photoCell = ws.getCell(startRow + 1, 21);

  if (item.photoBuffer) {
    try {
      const imageId = workbook.addImage({
        buffer: item.photoBuffer as any,
        extension: 'jpeg',
      });
      ws.addImage(imageId, {
        tl: { col: 20, row: startRow + 0.1 } as any,
        br: { col: 24, row: startRow + 6.0 } as any,
        editAs: 'oneCell',
      });
    } catch (e) {
      console.warn('Could not add image to Excel block:', e);
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
  for (let pr = startRow + 1; pr <= startRow + 6; pr++) {
    for (let pc = 21; pc <= 24; pc++) {
      const c = ws.getCell(pr, pc);
      c.border = {
        top: pr === startRow + 1 ? { style: 'thin' } : undefined,
        bottom: pr === startRow + 6 ? { style: 'thin' } : undefined,
        left: pc === 21 ? { style: 'thin' } : undefined,
        right: pc === 24 ? { style: 'thin' } : undefined,
      };
    }
  }

  // ---------------- Row 5: Document Title Banner ----------------
  ws.mergeCells(startRow + 4, 1, startRow + 4, 20);
  const titleCell = ws.getCell(startRow + 4, 1);
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
  const familyCondition =
    student.family_condition ||
    (student.id_poor === 'level_1'
      ? 'ក្រីក្រ (កម្រិត ១)'
      : student.id_poor === 'level_2'
      ? 'ក្រីក្រ (កម្រិត ២)'
      : 'មធ្យម');

  // Row 6: ឈ្មោះសិស្ស | ភេទ | ថ្នាក់ទី | ស្ថានភាពគ្រួសារ
  ws.mergeCells(startRow + 5, 1, startRow + 5, 3);
  const cA6 = ws.getCell(startRow + 5, 1);
  cA6.value = 'ឈ្មោះសិស្ស ៖';
  cA6.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  cA6.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells(startRow + 5, 4, startRow + 5, 6);
  const cD6 = ws.getCell(startRow + 5, 4);
  cD6.value = student.full_name || '';
  cD6.font = { name: 'Khmer OS Muol Light', size: 9.5, bold: true };
  cD6.alignment = { horizontal: 'left', vertical: 'middle' };

  const cG6 = ws.getCell(startRow + 5, 7);
  cG6.value = 'ភេទ ៖';
  cG6.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  cG6.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(startRow + 5, 8, startRow + 5, 9);
  const cH6 = ws.getCell(startRow + 5, 8);
  cH6.value = genderText;
  cH6.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  cH6.alignment = { horizontal: 'center', vertical: 'middle' };

  const cJ6 = ws.getCell(startRow + 5, 10);
  cJ6.value = 'ថ្នាក់ទី៖';
  cJ6.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  cJ6.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(startRow + 5, 11, startRow + 5, 15);
  const cK6 = ws.getCell(startRow + 5, 11);
  cK6.value = toKhmerDigits(classInfo.name);
  cK6.font = { name: 'Khmer OS Siemreap', size: 9.5, bold: true, color: { argb: 'FF155EEF' } };
  cK6.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells(startRow + 5, 16, startRow + 5, 18);
  const cP6 = ws.getCell(startRow + 5, 16);
  cP6.value = 'ស្ថានភាពគ្រួសារ ៖';
  cP6.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  cP6.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells(startRow + 5, 19, startRow + 5, 20);
  const cS6 = ws.getCell(startRow + 5, 19);
  cS6.value = familyCondition;
  cS6.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  cS6.alignment = { horizontal: 'left', vertical: 'middle' };

  // Row 7: សាលារៀន | ខេត្ត
  ws.mergeCells(startRow + 6, 1, startRow + 6, 3);
  const cA7 = ws.getCell(startRow + 6, 1);
  cA7.value = 'សាលារៀន ៖';
  cA7.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  cA7.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells(startRow + 6, 4, startRow + 6, 15);
  const cD7 = ws.getCell(startRow + 6, 4);
  cD7.value = schoolName;
  cD7.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  cD7.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells(startRow + 6, 16, startRow + 6, 18);
  const cP7 = ws.getCell(startRow + 6, 16);
  cP7.value = 'ខេត្ត ៖';
  cP7.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  cP7.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells(startRow + 6, 19, startRow + 6, 20);
  const cS7 = ws.getCell(startRow + 6, 19);
  cS7.value = provinceName;
  cS7.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  cS7.alignment = { horizontal: 'left', vertical: 'middle' };

  // Row 8: ឈ្មោះមាតាបិតា | លេខទូរស័ព្ទ
  ws.mergeCells(startRow + 7, 1, startRow + 7, 3);
  const cA8 = ws.getCell(startRow + 7, 1);
  cA8.value = 'ឈ្មោះមាតាបិតា ៖';
  cA8.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  cA8.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells(startRow + 7, 4, startRow + 7, 15);
  const cD8 = ws.getCell(startRow + 7, 4);
  cD8.value = parentsName;
  cD8.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  cD8.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells(startRow + 7, 16, startRow + 7, 18);
  const cP8 = ws.getCell(startRow + 7, 16);
  cP8.value = 'លេខទូរស័ព្ទ ៖';
  cP8.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  cP8.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells(startRow + 7, 19, startRow + 7, 20);
  const cS8 = ws.getCell(startRow + 7, 19);
  cS8.value = toKhmerDigits(parentPhone);
  cS8.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  cS8.alignment = { horizontal: 'left', vertical: 'middle' };

  // Row 9: ឈ្មោះគ្រូបន្ទុកថ្នាក់ | លេខទូរស័ព្ទ
  ws.mergeCells(startRow + 8, 1, startRow + 8, 3);
  const cA9 = ws.getCell(startRow + 8, 1);
  cA9.value = 'ឈ្មោះគ្រូបន្ទុកថ្នាក់ ៖';
  cA9.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  cA9.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells(startRow + 8, 4, startRow + 8, 15);
  const cD9 = ws.getCell(startRow + 8, 4);
  cD9.value = teacherName;
  cD9.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  cD9.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells(startRow + 8, 16, startRow + 8, 18);
  const cP9 = ws.getCell(startRow + 8, 16);
  cP9.value = 'លេខទូរស័ព្ទ ៖';
  cP9.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  cP9.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells(startRow + 8, 19, startRow + 8, 20);
  const cS9 = ws.getCell(startRow + 8, 19);
  cS9.value = toKhmerDigits(teacherPhone);
  cS9.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  cS9.alignment = { horizontal: 'left', vertical: 'middle' };

  // ---------------- Score Bands Legend (Rows 10 & 11) ----------------
  if (scoreBands[0]) {
    ws.mergeCells(startRow + 9, 1, startRow + 9, 24);
    const b1 = ws.getCell(startRow + 9, 1);
    b1.value = `${scoreBands[0].title} ${scoreBands[0].ranges.map((r) => r.label).join('   ')}`;
    b1.font = { name: 'Khmer OS Siemreap', size: 8.5 };
    b1.alignment = { horizontal: 'left', vertical: 'middle' };
  }
  if (scoreBands[1]) {
    ws.mergeCells(startRow + 10, 1, startRow + 10, 24);
    const b2 = ws.getCell(startRow + 10, 1);
    b2.value = `${scoreBands[1].title} ${scoreBands[1].ranges.map((r) => r.label).join('   ')}`;
    b2.font = { name: 'Khmer OS Siemreap', size: 8.5 };
    b2.alignment = { horizontal: 'left', vertical: 'middle' };
  }

  // ---------------- Main Table Header (Rows 12 & 13) ----------------
  // Col 1: មុខវិជ្ជា
  ws.mergeCells(startRow + 11, 1, startRow + 12, 1);
  const hSub = ws.getCell(startRow + 11, 1);
  hSub.value = 'មុខវិជ្ជា';
  hSub.font = { name: 'Khmer OS Siemreap', size: 9.5, bold: true, color: { argb: 'FF7030A0' } };
  hSub.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  hSub.border = thinBorder;
  ws.getCell(startRow + 12, 1).border = thinBorder;

  // Col 2: កម្រិតពិន្ទុនៅដើមឆ្នាំ
  ws.mergeCells(startRow + 11, 2, startRow + 12, 2);
  const hInit = ws.getCell(startRow + 11, 2);
  hInit.value = 'កម្រិតពិន្ទុ\nនៅដើមឆ្នាំ';
  hInit.font = { name: 'Khmer OS Siemreap', size: 8.5, bold: true };
  hInit.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  hInit.border = thinBorder;
  ws.getCell(startRow + 12, 2).border = thinBorder;

  // Cols 3..22: Plan & Actual Header (Span C12:V12)
  ws.mergeCells(startRow + 11, 3, startRow + 11, 22);
  const hSpan = ws.getCell(startRow + 11, 3);
  hSpan.value = 'កម្រិតពិន្ទុនិងនិទ្ទេសដើមឆ្នាំ(ខ្មៅ) និងចុងឆ្នាំ(ក្រហម)';
  hSpan.font = { name: 'Khmer OS Siemreap', size: 9.5, bold: true };
  hSpan.alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 3; c <= 22; c++) {
    ws.getCell(startRow + 11, c).border = thinBorder;
  }

  // Row 13 sub-columns: 10 Months (Nov to Aug)
  STUDY_PLAN_MONTHS.forEach((m, mIdx) => {
    const planCol = 3 + mIdx * 2;
    const actCol = planCol + 1;

    // Plan Month Name (e.g. វិច្ឆិកា)
    const pCell = ws.getCell(startRow + 12, planCol);
    pCell.value = m.shortLabel;
    pCell.font = { name: 'Khmer OS Siemreap', size: 8.5, bold: true };
    pCell.alignment = { horizontal: 'center', vertical: 'middle' };
    pCell.border = thinBorder;

    // Actual Result Label (ជាក់ស្តែង in Bold Red)
    const aCell = ws.getCell(startRow + 12, actCol);
    aCell.value = 'ជាក់\nស្តែង';
    aCell.font = { name: 'Khmer OS Siemreap', size: 8, bold: true, color: { argb: 'FFFF0000' } };
    aCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    aCell.border = thinBorder;
  });

  // Col 23: គ្រោងចុងឆ្នាំ
  ws.mergeCells(startRow + 11, 23, startRow + 12, 23);
  const hEndPlan = ws.getCell(startRow + 11, 23);
  hEndPlan.value = 'គ្រោងចុង\nឆ្នាំ';
  hEndPlan.font = { name: 'Khmer OS Siemreap', size: 8.5, bold: true };
  hEndPlan.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  hEndPlan.border = thinBorder;
  ws.getCell(startRow + 12, 23).border = thinBorder;

  // Col 24: ជាក់ស្តែងចុងឆ្នាំ
  ws.mergeCells(startRow + 11, 24, startRow + 12, 24);
  const hEndAct = ws.getCell(startRow + 11, 24);
  hEndAct.value = 'ជាក់ស្តែង\nចុងឆ្នាំ';
  hEndAct.font = { name: 'Khmer OS Siemreap', size: 8.5, bold: true, color: { argb: 'FFFF0000' } };
  hEndAct.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  hEndAct.border = thinBorder;
  ws.getCell(startRow + 12, 24).border = thinBorder;

  // ---------------- Rows 14 to 23: 10 Subject Data Rows ----------------
  STUDY_PLAN_SUBJECTS.forEach((sub, sIdx) => {
    const rowNum = startRow + 13 + sIdx;
    const target = planTargets[sub.id] || {};

    // 1. Authoritative grade conversions matching curriculum
    const preTestScore = lookupScoreWithAliases(studentScoresByPeriod['pre-test'], sub.id, sub.aliases);
    const preTestLetter = resolveAuthoritativeGradeLetter(
      preTestScore,
      classInfo.grade,
      (classInfo as any).track,
      sub.id,
      sub.aliases,
      sub.officialLabel
    );
    const initialDisplay = target.initial || preTestLetter || '';

    const annualScore = lookupScoreWithAliases(studentScoresByPeriod['annual'], sub.id, sub.aliases);
    const annualLetter = resolveAuthoritativeGradeLetter(
      annualScore,
      classInfo.grade,
      (classInfo as any).track,
      sub.id,
      sub.aliases,
      sub.officialLabel
    );

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

      // Published official grade takes precedence; falls back to provisional actual
      const monthScore = lookupScoreWithAliases(studentScoresByPeriod[m.id], sub.id, sub.aliases);
      const officialActual = resolveAuthoritativeGradeLetter(
        monthScore,
        classInfo.grade,
        (classInfo as any).track,
        sub.id,
        sub.aliases,
        sub.officialLabel
      );
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
  // Col 1: នាយករង
  ws.mergeCells(startRow + 23, 1, startRow + 23, 3);
  const f1Top = ws.getCell(startRow + 23, 1);
  f1Top.value = 'បានឃើញ និងឯកភាព';
  f1Top.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  f1Top.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(startRow + 24, 1, startRow + 24, 3);
  const f1Bot = ws.getCell(startRow + 24, 1);
  f1Bot.value = 'នាយករង';
  f1Bot.font = { name: 'Khmer OS Muol Light', size: 9, bold: true };
  f1Bot.alignment = { horizontal: 'center', vertical: 'middle' };

  // Col 2: គ្រូទទួលបន្ទុកថ្នាក់
  ws.mergeCells(startRow + 23, 4, startRow + 23, 7);
  const f2Top = ws.getCell(startRow + 23, 4);
  f2Top.value = 'បានឃើញ និងឯកភាព';
  f2Top.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  f2Top.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(startRow + 24, 4, startRow + 24, 7);
  const f2Bot = ws.getCell(startRow + 24, 4);
  f2Bot.value = 'គ្រូទទួលបន្ទុកថ្នាក់';
  f2Bot.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  f2Bot.alignment = { horizontal: 'center', vertical: 'middle' };

  // Col 3: មាតាបិតាចុងឆ្នាំ
  ws.mergeCells(startRow + 23, 8, startRow + 23, 12);
  const f3Top = ws.getCell(startRow + 23, 8);
  f3Top.value = 'ហត្ថលេខាឬ';
  f3Top.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  f3Top.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(startRow + 24, 8, startRow + 24, 12);
  const f3Bot = ws.getCell(startRow + 24, 8);
  f3Bot.value = 'ស្នាមមេដៃមាតាបិតាចុងឆ្នាំ';
  f3Bot.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  f3Bot.alignment = { horizontal: 'center', vertical: 'middle' };

  // Col 4: មាតាបិតាដើមឆ្នាំ
  ws.mergeCells(startRow + 23, 13, startRow + 23, 17);
  const f4Top = ws.getCell(startRow + 23, 13);
  f4Top.value = 'ហត្ថលេខាឬ';
  f4Top.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  f4Top.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(startRow + 24, 13, startRow + 24, 17);
  const f4Bot = ws.getCell(startRow + 24, 13);
  f4Bot.value = 'ស្នាមមេដៃមាតាបិតាដើមឆ្នាំ';
  f4Bot.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  f4Bot.alignment = { horizontal: 'center', vertical: 'middle' };

  // Col 5: Lunar Date, Issue Date & Student Signature
  ws.mergeCells(startRow + 23, 18, startRow + 23, 24);
  const f5Lunar = ws.getCell(startRow + 23, 18);
  f5Lunar.value = 'ថ្ងៃចន្ទ ៥រោច ខែកត្តិក ឆ្នាំម្សាញ់ សប្តស័ក ព.ស.២៥៦៩';
  f5Lunar.font = { name: 'Khmer OS Siemreap', size: 8 };
  f5Lunar.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(startRow + 24, 18, startRow + 24, 24);
  const f5Date = ws.getCell(startRow + 24, 18);
  f5Date.value = defaultDateStr;
  f5Date.font = { name: 'Khmer OS Siemreap', size: 8.5, bold: true };
  f5Date.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(startRow + 26, 18, startRow + 26, 24);
  const f5Sig = ws.getCell(startRow + 26, 18);
  f5Sig.value = 'ហត្ថលេខានិងឈ្មោះសិស្ស';
  f5Sig.font = { name: 'Khmer OS Siemreap', size: 9, bold: true };
  f5Sig.alignment = { horizontal: 'center', vertical: 'middle' };

  return { endRow: startRow + 26 };
}

/**
 * Generates an ExcelJS Workbook with SEPARATE WORKSHEETS (1 sheet per student)
 * matching the official Cambodian school sample 'ផែនការសិស្ស 8-12.xlsx'
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

  const gradeSubtitle =
    gradeLevelNum === 11 || gradeLevelNum === 12
      ? `(ទុតិយភូមិ ថ្នាក់ទី ${toKhmerDigits(gradeLevelNum)})`
      : gradeLevelNum === 10
      ? '(ទុតិយភូមិ ថ្នាក់ទី ១០)'
      : `(បឋមភូមិ ថ្នាក់ទី ${toKhmerDigits(gradeLevelNum)})`;

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

    setStudyPlanColumnWidths(ws);

    renderStudentStudyPlanBlock({
      worksheet: ws,
      workbook,
      startRow: 1,
      item,
      classInfo,
      academicYearName,
      schoolInfo,
      teacherInfo,
      gradesData,
      issueDateText,
      departmentName,
      schoolName,
      provinceName,
      teacherName: teacherInfo?.full_name || '..................................',
      teacherPhone: teacherInfo?.phone || '..................................',
      gradeSubtitle,
      defaultDateStr,
      scoreBands,
      schema,
      gradeLevelNum,
    });
  });

  return workbook;
}

/**
 * Generates an ExcelJS Workbook with EXACTLY ONE WORKSHEET containing ALL student blocks
 * vertically arranged with appropriate spacing and explicit horizontal page breaks.
 */
export function generateSingleSheetClassWorkbook(options: GenerateStudyPlanWorkbookOptions): ExcelJS.Workbook {
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

  // Exactly one worksheet named 'ផែនការសិស្សទាំងថ្នាក់' (valid 21 chars <= 31 max)
  const ws = workbook.addWorksheet('ផែនការសិស្សទាំងថ្នាក់', {
    views: [{ showGridLines: true }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0, // let height flow across multiple pages
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
    },
  });

  setStudyPlanColumnWidths(ws);

  const gradeLevelNum = parseInt(String(classInfo.grade || '12').replace(/[^0-9]/g, ''), 10) || 12;
  const schema = getCurriculumSchemaForClass(classInfo.grade, (classInfo as any).track);

  const gradeSubtitle =
    gradeLevelNum === 11 || gradeLevelNum === 12
      ? `(ទុតិយភូមិ ថ្នាក់ទី ${toKhmerDigits(gradeLevelNum)})`
      : gradeLevelNum === 10
      ? '(ទុតិយភូមិ ថ្នាក់ទី ១០)'
      : `(បឋមភូមិ ថ្នាក់ទី ${toKhmerDigits(gradeLevelNum)})`;

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

  let currentRow = 1;

  studentsData.forEach((item, index) => {
    const blockStart = currentRow;
    const { endRow } = renderStudentStudyPlanBlock({
      worksheet: ws,
      workbook,
      startRow: blockStart,
      item,
      classInfo,
      academicYearName,
      schoolInfo,
      teacherInfo,
      gradesData,
      issueDateText,
      departmentName,
      schoolName,
      provinceName,
      teacherName: teacherInfo?.full_name || '..................................',
      teacherPhone: teacherInfo?.phone || '..................................',
      gradeSubtitle,
      defaultDateStr,
      scoreBands,
      schema,
      gradeLevelNum,
    });

    if (index < studentsData.length - 1) {
      // Add explicit horizontal page break at bottom of current student block
      ws.getRow(endRow).addPageBreak();
      // Leave 1 empty spacing row between student blocks
      ws.getRow(endRow + 1).height = 14.0;
      currentRow = endRow + 2;
    } else {
      currentRow = endRow;
    }
  });

  ws.pageSetup.printArea = `A1:X${currentRow}`;
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
 * (One worksheet per student, named '1', '2', etc.)
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

  const filename = `ផែនការសិក្សារបស់សិស្ស_ថ្នាក់ទី${params.classInfo.name}_(សិស្ស${items.length}នាក់_សន្លឹកដាច់ដោយឡែក).xlsx`;
  await downloadStudyPlanExcel(wb, filename);
}

/**
 * Export all students' study plans into EXACTLY ONE WORKSHEET in a single class workbook (.xlsx)
 * (Worksheet named 'ផែនការសិស្សទាំងថ្នាក់' with vertical blocks and explicit page breaks)
 */
export async function exportBatchStudyPlansSingleSheetExcel(params: {
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

  const wb = generateSingleSheetClassWorkbook({
    classInfo: params.classInfo,
    academicYearName: params.academicYearName,
    schoolInfo: params.schoolInfo,
    teacherInfo: params.teacherInfo,
    studentsData: items,
    gradesData: params.gradesData,
    issueDateText: params.issueDateText,
  });

  const filename = `ផែនការសិក្សារបស់សិស្ស_ថ្នាក់ទី${params.classInfo.name}_ទាំងថ្នាក់_សន្លឹកតែមួយ_(${items.length}នាក់).xlsx`;
  await downloadStudyPlanExcel(wb, filename);
}
