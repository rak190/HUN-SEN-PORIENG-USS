'use client';

import React from 'react';
import { Classroom, Student } from '@/types';
import { getCurriculumSchemaForClass } from '@/lib/curriculum';

export interface StudyPlanSchoolInfo {
  name?: string;
  abbreviation?: string;
  department?: string;
  province?: string;
}

export interface StudyPlanTeacherInfo {
  full_name: string;
  phone?: string | null;
}

interface StudentStudyPlanDocumentProps {
  student: Student;
  classInfo: Classroom;
  academicYearName: string;
  schoolInfo?: StudyPlanSchoolInfo;
  teacherInfo?: StudyPlanTeacherInfo;
  gradesData?: Array<{ period: string; scores: Record<string, number> }>;
  issueDateText?: string;
  className?: string;
}

// Convert numbers to Khmer numerals
export function toKhmerDigits(num: number | string): string {
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return String(num).replace(/[0-9]/g, (d) => khmerDigits[parseInt(d, 10)]);
}

// Map score to letter grade based on max score (125, 75, or 50) as defined in official reference document
export function getSubjectGradeLetter(score: number | undefined | null, maxScore: number = 50): string {
  if (score === undefined || score === null || isNaN(score)) return '';
  const s = Number(score);
  if (maxScore >= 100) {
    if (s >= 112) return 'A';
    if (s >= 100) return 'B';
    if (s >= 88) return 'C';
    if (s >= 75) return 'D';
    if (s >= 63) return 'E';
    return 'F';
  } else if (maxScore >= 65) {
    if (s >= 68) return 'A';
    if (s >= 60) return 'B';
    if (s >= 53) return 'C';
    if (s >= 45) return 'D';
    if (s >= 38) return 'E';
    return 'F';
  } else {
    // Default 50 scale
    if (s >= 45) return 'A';
    if (s >= 40) return 'B';
    if (s >= 35) return 'C';
    if (s >= 30) return 'D';
    if (s >= 25) return 'E';
    return 'F';
  }
}

// 10 Academic Months matching Cambodian Upper Secondary calendar
export const STUDY_PLAN_MONTHS = [
  { id: 'nov', label: 'វិច្ឆិកា', shortLabel: 'វិច្ឆិកា' },
  { id: 'dec', label: 'ធ្នូ', shortLabel: 'ធ្នូ' },
  { id: 'jan', label: 'មករា', shortLabel: 'មករា' },
  { id: 'feb', label: 'កុម្ភៈ', shortLabel: 'កុម្ភៈ' },
  { id: 'mar', label: 'មីនា', shortLabel: 'មីនា' },
  { id: 'apr', label: 'មេសា', shortLabel: 'មេសា' },
  { id: 'may', label: 'ឧសភា', shortLabel: 'ឧសភា' },
  { id: 'jun', label: 'មិថុនា', shortLabel: 'មិថុនា' },
  { id: 'jul', label: 'កក្កដា', shortLabel: 'កក្កដា' },
  { id: 'aug', label: 'សីហា', shortLabel: 'សីហា' },
];

export default function StudentStudyPlanDocument({
  student,
  classInfo,
  academicYearName,
  schoolInfo,
  teacherInfo,
  gradesData = [],
  issueDateText,
  className = '',
}: StudentStudyPlanDocumentProps) {
  // Curriculum Schema
  const schema = getCurriculumSchemaForClass(classInfo.grade, (classInfo as any).track);

  // Map grades by period strictly for this student
  const scoresByPeriod: Record<string, Record<string, number>> = {};
  gradesData.forEach((g: any) => {
    if (g && g.period && (!g.student_id || g.student_id === student.id)) {
      scoresByPeriod[g.period] = g.scores || {};
    }
  });

  // Grade level subtitle (Grade 11 & 12 as per reference doc)
  const gradeLevelStr = String(classInfo.grade || '12').trim();
  const gradeSubtitle = ['11', '12'].includes(gradeLevelStr)
    ? '(ទុតិយភូមិ ថ្នាក់ទី១១ និង១២)'
    : gradeLevelStr === '10'
    ? '(ទុតិយភូមិ ថ្នាក់ទី១០)'
    : `(ថ្នាក់ទី${toKhmerDigits(gradeLevelStr)})`;

  // Gender text
  const genderText =
    student.gender === 'M' || student.gender === 'ប្រុស' ? 'ប្រុស' : 'ស្រី';

  // Parents' names
  const parentsName =
    student.guardian_name ||
    [student.father_name, student.mother_name].filter(Boolean).join(' - ') ||
    '..................................';

  // Parent phone
  const parentPhone =
    student.parent_phone ||
    student.father_phone ||
    student.mother_phone ||
    '..................................';

  // Teacher info
  const teacherName = teacherInfo?.full_name || '..................................';
  const teacherPhone = teacherInfo?.phone || '..................................';

  // Family condition (ស្ថានភាពគ្រួសារ)
  const familyCondition =
    student.id_poor === 'level_1'
      ? 'ក្រីក្រ (កម្រិត ១)'
      : student.id_poor === 'level_2'
      ? 'ក្រីក្រ (កម្រិត ២)'
      : 'មធ្យម';

  // School and Province defaults
  const departmentName =
    schoolInfo?.department ||
    `មន្ទីរអប់រំ យុវជន និងកីឡាខេត្ត${schoolInfo?.province || 'ព្រៃវែង'}`;
  const schoolName = schoolInfo?.name || 'វិ.ហ៊ុន សែន ពោធិ៍រៀង';
  const schoolAbbr = schoolInfo?.abbreviation || 'វិ.ហស ពោធិ៍រៀង';
  const provinceName = schoolInfo?.province || 'ព្រៃវែង';

  // Issue date default
  const defaultIssueDate =
    issueDateText ||
    `${schoolAbbr} ថ្ងៃទី១០ ខែវិច្ឆិកា ឆ្នាំ${toKhmerDigits(academicYearName.split('-')[0] || '២០២៥')}`;

  return (
    <div
      className={`study-plan-page w-[1122px] min-h-[790px] shrink-0 bg-white p-7 text-black shadow-lg rounded-sm border border-slate-300 print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:h-full flex flex-col justify-between font-siemreap select-none ${className}`}
      style={{ boxSizing: 'border-box' }}
    >
      {/* ----------------- TOP HEADER SECTION ----------------- */}
      <div>
        <div className="flex justify-between items-start leading-tight">
          {/* Top Left: School & Provincial Ministry */}
          <div className="text-left">
            <p className="text-[12px] font-bold text-slate-800">{departmentName}</p>
            <p className="text-[14px] font-moul font-bold text-[#155EEF] tracking-wide mt-0.5">
              {schoolName}
            </p>
          </div>

          {/* Top Right: Kingdom Motto & Royal Ribbon */}
          <div className="text-center pr-28">
            <p className="text-[13px] font-moul font-bold text-slate-900 leading-snug">
              ព្រះរាជាណាចក្រកម្ពុជា
            </p>
            <p className="text-[13px] font-moul font-bold text-slate-900 leading-snug">
              ជាតិ សាសនា ព្រះមហាក្សត្រ
            </p>
            <p className="text-[12px] text-amber-600 tracking-widest mt-0.5 font-serif select-none">
              
            </p>
          </div>
        </div>

        {/* Document Title Banner */}
        <div className="text-center mt-1 mb-2">
          <h1 className="text-[15px] font-moul text-purple-900 tracking-wide">
            ផែនការសិក្សារបស់សិស្ស ឆ្នាំសិក្សា{toKhmerDigits(academicYearName)}{' '}
            <span className="text-purple-800 font-bold">{gradeSubtitle}</span>
          </h1>
        </div>

        {/* Student Photo and Identity Grid */}
        <div className="flex items-start justify-between gap-4 mt-2">
          {/* Left Metadata Grid (2-column layout matching reference) */}
          <div className="flex-1 grid grid-cols-12 gap-y-1 text-[12px] font-semibold text-slate-900 leading-relaxed">
            {/* Row 1 */}
            <div className="col-span-8 flex items-center flex-wrap gap-x-4">
              <span className="whitespace-nowrap">
                ឈ្មោះសិស្ស ៖{' '}
                <strong className="font-moul text-[13px] text-slate-900 ml-1">
                  {student.full_name}
                </strong>
              </span>
              <span className="whitespace-nowrap">
                ភេទ ៖ <strong className="font-bold">{genderText}</strong>
              </span>
              <span className="whitespace-nowrap">
                ថ្នាក់ទី៖{' '}
                <strong className="font-bold text-[#155EEF]">
                  {toKhmerDigits(classInfo.name)}
                </strong>
              </span>
            </div>
            <div className="col-span-4 text-left">
              <span>
                ស្ថានភាពគ្រួសារ ៖{' '}
                <strong className="font-bold text-slate-900">{familyCondition}</strong>
              </span>
            </div>

            {/* Row 2 */}
            <div className="col-span-8">
              <span>
                សាលារៀន ៖{' '}
                <strong className="font-bold text-slate-900">{schoolAbbr}</strong>
              </span>
            </div>
            <div className="col-span-4 text-left">
              <span>
                ខេត្ត ៖ <strong className="font-bold text-slate-900">{provinceName}</strong>
              </span>
            </div>

            {/* Row 3 */}
            <div className="col-span-8">
              <span>
                ឈ្មោះមាតាបិតា ៖{' '}
                <strong className="font-bold text-slate-900">{parentsName}</strong>
              </span>
            </div>
            <div className="col-span-4 text-left">
              <span>
                លេខទូរស័ព្ទ ៖{' '}
                <strong className="font-bold text-slate-900">{toKhmerDigits(parentPhone)}</strong>
              </span>
            </div>

            {/* Row 4 */}
            <div className="col-span-8">
              <span>
                ឈ្មោះគ្រូបន្ទុកថ្នាក់ ៖{' '}
                <strong className="font-bold text-slate-900">{teacherName}</strong>
              </span>
            </div>
            <div className="col-span-4 text-left">
              <span>
                លេខទូរស័ព្ទ ៖{' '}
                <strong className="font-bold text-slate-900">{toKhmerDigits(teacherPhone)}</strong>
              </span>
            </div>
          </div>

          {/* Right: Student Photo Frame (Passport 3x4 ratio) */}
          <div className="w-[102px] h-[132px] shrink-0 border border-slate-400 bg-slate-50 p-0.5 rounded-xs overflow-hidden flex items-center justify-center shadow-2xs">
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt={student.full_name}
                className="w-full h-full object-cover rounded-xs"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-300 rounded-xs bg-slate-100/50">
                <span className="text-[10px] font-bold text-slate-400">រូបថត 3x4</span>
              </div>
            )}
          </div>
        </div>

        {/* Official 3-Tier Grading Scale Legend */}
        <div className="mt-2.5 mb-1.5 text-[10.5px] font-siemreap leading-tight text-slate-900 space-y-0.5 border-t border-slate-200 pt-1.5">
          <p className="truncate">
            <span className="font-bold">កម្រិតពិន្ទុ(ពិន្ទុ ០០ដល់១២៥)៖</span> F ក្រោម ៦៣ពិន្ទុ&nbsp;&nbsp;&nbsp;E ពី ៦៣-៧៤ពិន្ទុ&nbsp;&nbsp;&nbsp;D ពី ៧៥-៨៧ពិន្ទុ&nbsp;&nbsp;&nbsp;C ពី ៨៨-៩៩ពិន្ទុ&nbsp;&nbsp;&nbsp;B ពី ១០០-១១១ពិន្ទុ&nbsp;&nbsp;&nbsp;A ពី ១១២-១២៥ពិន្ទុ
          </p>
          <p className="truncate">
            <span className="font-bold">កម្រិតពិន្ទុ(ពិន្ទុ ០០ដល់៧៥)៖</span> F ក្រោម ៣៨ពិន្ទុ&nbsp;&nbsp;&nbsp;E ពី ៣៨-៤៤ពិន្ទុ&nbsp;&nbsp;&nbsp;D ពី ៤៥-៥២ពិន្ទុ&nbsp;&nbsp;&nbsp;C ពី ៥៣-៥៩ពិន្ទុ&nbsp;&nbsp;&nbsp;B ពី ៦០-៦៧ពិន្ទុ&nbsp;&nbsp;&nbsp;A ពី ៦៨-៧៥ពិន្ទុ
          </p>
          <p className="truncate">
            <span className="font-bold">កម្រិតពិន្ទុ(ពិន្ទុ ០០ដល់៥០)៖</span> F ក្រោម ២៥ពិន្ទុ&nbsp;&nbsp;&nbsp;E ពី ២៥-២៩ពិន្ទុ&nbsp;&nbsp;&nbsp;D ពី ៣០-៣៤ពិន្ទុ&nbsp;&nbsp;&nbsp;C ពី ៣៥-៣៩ពិន្ទុ&nbsp;&nbsp;&nbsp;B ពី ៤០-៤៤ពិន្ទុ&nbsp;&nbsp;&nbsp;A ពី ៤៥-៥០ពិន្ទុ
          </p>
        </div>

        {/* ----------------- MAIN SUBJECT & 10-MONTH TABLE ----------------- */}
        <table className="w-full border-collapse border border-black text-[11px] font-siemreap text-center table-fixed mt-1">
          <thead>
            {/* Header Row 1 */}
            <tr className="bg-slate-50 print:bg-white text-black font-bold">
              <th
                rowSpan={2}
                className="border border-black p-1 w-[82px] text-center font-bold"
              >
                មុខវិជ្ជា
              </th>
              <th
                rowSpan={2}
                className="border border-black p-0.5 w-[65px] text-center font-bold leading-tight text-[10px]"
              >
                កម្រិតពិន្ទុ
                <br />
                នៅដើមឆ្នាំ
              </th>
              <th
                colSpan={20}
                className="border border-black p-1 text-center font-bold text-[10.5px]"
              >
                កម្រិតពិន្ទុនិងនិទ្ទេសដើមឆ្នាំ(ខ្មៅ) និងចុងឆ្នាំ(ក្រហម)
              </th>
              <th
                rowSpan={2}
                className="border border-black p-0.5 w-[50px] text-center font-bold text-[10.5px] leading-tight"
              >
                គ្រោងចុង
                <br />
                ឆ្នាំ
              </th>
              <th
                rowSpan={2}
                className="border border-black p-0.5 w-[52px] text-center font-bold text-[10.5px] leading-tight text-red-600"
              >
                លទ្ធផល
                <br />
                ជាក់ស្តែង
              </th>
            </tr>

            {/* Header Row 2: 10 Months with sub-columns */}
            <tr className="bg-slate-50 print:bg-white text-black font-bold text-[9.5px]">
              {STUDY_PLAN_MONTHS.map((m) => (
                <React.Fragment key={m.id}>
                  <th className="border border-black p-0.5 text-center w-[38px] leading-none">
                    {m.shortLabel}
                  </th>
                  <th className="border border-black p-0.5 text-center w-[38px] leading-tight text-red-600">
                    ជាក់
                    <br />
                    ស្តែង
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {schema.subjects.map((sub) => {
              // Subject label aligned with reference document
              const displayLabel =
                sub.id === 'foreign_lang'
                  ? 'អង់គ្លេស'
                  : sub.id === 'morals'
                  ? 'ពលរដ្ឋវិជ្ជា'
                  : sub.label;

              // Helper for score lookup with alias support
              const getScore = (periodId: string) => {
                const periodScores = scoresByPeriod[periodId];
                if (!periodScores) return undefined;
                if (periodScores[sub.id] !== undefined) return periodScores[sub.id];
                if (sub.id === 'foreign_lang') {
                  if (periodScores['english'] !== undefined) return periodScores['english'];
                  if (periodScores['eng'] !== undefined) return periodScores['eng'];
                }
                if (sub.id === 'morals') {
                  if (periodScores['civics'] !== undefined) return periodScores['civics'];
                }
                return undefined;
              };

              // Beginning of year target/grade (pre-test)
              const preTestScore = getScore('pre-test');
              const preTestLetter = getSubjectGradeLetter(preTestScore, sub.maxScore);

              // Annual result
              const annualScore = getScore('annual');
              const annualLetter = getSubjectGradeLetter(annualScore, sub.maxScore);

              return (
                <tr key={sub.id} className="h-[28px] hover:bg-slate-50/50">
                  {/* Subject Name */}
                  <td className="border border-black px-1.5 py-0.5 text-left font-bold truncate">
                    {displayLabel}
                  </td>

                  {/* Beginning of Year Level */}
                  <td className="border border-black p-0.5 font-bold text-center">
                    {preTestLetter || ''}
                  </td>

                  {/* 10 Monthly Columns (Target & Actual) */}
                  {STUDY_PLAN_MONTHS.map((m) => {
                    const monthScore = getScore(m.id);
                    const monthLetter = getSubjectGradeLetter(monthScore, sub.maxScore);

                    return (
                      <React.Fragment key={m.id}>
                        {/* Target Col (Empty by default for student goal setting) */}
                        <td className="border border-black p-0.5 text-center font-medium"></td>
                        {/* Actual Col (Shows real published score/letter or empty) */}
                        <td className="border border-black p-0.5 text-center font-bold text-red-600">
                          {monthLetter || ''}
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {/* End of Year Plan (គ្រោងចុងឆ្នាំ) */}
                  <td className="border border-black p-0.5 text-center font-bold"></td>

                  {/* End of Year Result (លទ្ធផលជាក់ស្តែង) */}
                  <td className="border border-black p-0.5 text-center font-bold text-red-600">
                    {annualLetter || ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ----------------- 5-COLUMN ENDORSEMENT FOOTER ----------------- */}
      <div className="mt-4 pt-1 grid grid-cols-5 text-center text-[11px] font-siemreap leading-normal">
        {/* Col 1: Vice Principal Approval */}
        <div className="flex flex-col justify-between items-center h-[96px]">
          <div>
            <p className="font-bold text-slate-900">បានឃើញ និងឯកភាព</p>
            <p className="font-moul text-[11px] text-slate-900 mt-0.5">នាយករង</p>
          </div>
        </div>

        {/* Col 2: Homeroom Teacher Approval */}
        <div className="flex flex-col justify-between items-center h-[96px]">
          <div>
            <p className="font-bold text-slate-900">បានឃើញ និងឯកភាព</p>
            <p className="font-bold text-slate-900 mt-0.5">គ្រូទទួលបន្ទុកថ្នាក់</p>
          </div>
        </div>

        {/* Col 3: Parent End-of-year Signature */}
        <div className="flex flex-col justify-between items-center h-[96px]">
          <div>
            <p className="font-bold text-slate-900">ហត្ថលេខាឬ</p>
            <p className="font-bold text-slate-900">ស្នាមមេដៃមាតាបិតាចុងឆ្នាំ</p>
          </div>
        </div>

        {/* Col 4: Parent Beginning-of-year Signature */}
        <div className="flex flex-col justify-between items-center h-[96px]">
          <div>
            <p className="font-bold text-slate-900">ហត្ថលេខាឬ</p>
            <p className="font-bold text-slate-900">ស្នាមមេដៃមាតាបិតាដើមឆ្នាំ</p>
          </div>
        </div>

        {/* Col 5: Cambodian Date & Student Signature */}
        <div className="flex flex-col justify-between items-center h-[96px] text-right">
          <div className="w-full text-center">
            <p className="text-[10px] text-slate-700 leading-tight">
              ថ្ងៃចន្ទ ៥រោច ខែកត្តិក ឆ្នាំម្សាញ់ សប្តស័ក ព.ស.២៥៦៩
            </p>
            <p className="text-[10.5px] font-semibold text-slate-900 leading-tight mt-0.5">
              {defaultIssueDate}
            </p>
          </div>
          <div className="w-full text-center mt-auto">
            <p className="text-[11px] font-bold text-slate-900">ហត្ថលេខានិង ឈ្មោះសិស្ស</p>
          </div>
        </div>
      </div>
    </div>
  );
}
