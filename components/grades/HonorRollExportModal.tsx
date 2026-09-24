'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Award, CheckCircle2, AlertCircle, X, Printer, UserCircle, FileText } from 'lucide-react';
import { Student, Profile, AcademicYear } from '@/types';
import { CurriculumSchema, SubjectSchema } from '@/lib/curriculum';
import { computeSummaryGrades } from '@/lib/domain/grading';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';

interface HonorRollExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  classId: string;
  students: Student[];
  activeSchema: CurriculumSchema;
  teacherName: string;
  academicYear: AcademicYear | null;
}

export function HonorRollExportModal({
  isOpen,
  onClose,
  className,
  classId,
  students,
  activeSchema,
  teacherName,
  academicYear,
}: HonorRollExportModalProps) {
  const [scope, setScope] = useState<'monthly' | 'semester' | 'annual'>('monthly');
  const [periodKey, setPeriodKey] = useState<string>('dec');
  const [threshold, setThreshold] = useState<'top5' | 'top10' | 'all_good'>('top5');
  
  const [isLoading, setIsLoading] = useState(false);
  const [matrixData, setMatrixData] = useState<Record<string, Record<string, number>>>({});
  
  const supabase = createClient();

  const subjects: SubjectSchema[] = activeSchema.subjects;
  const maxTotalScore = subjects.reduce((sum, sub) => sum + sub.maxScore, 0);
  const totalCoefficient = maxTotalScore / 50;
  
  // Available periods
  const MONTHS = [
    { key: 'dec', label: 'ធ្នូ' },
    { key: 'jan', label: 'មករា' },
    { key: 'feb', label: 'កុម្ភៈ' },
    { key: 'mar', label: 'មីនា' },
    { key: 'apr', label: 'មេសា' },
    { key: 'may', label: 'ឧសភា' },
    { key: 'jun', label: 'មិថុនា' },
    { key: 'jul', label: 'កក្កដា' },
    { key: 'aug', label: 'សីហា' }
  ];
  const SEMESTERS = [
    { key: 'sem1-summary', label: 'ឆមាសទី១' },
    { key: 'sem2-summary', label: 'ឆមាសទី២' }
  ];

  // Auto-update periodKey when scope changes to avoid invalid states
  useEffect(() => {
    if (scope === 'monthly') setPeriodKey('dec');
    else if (scope === 'semester') setPeriodKey('sem1-summary');
    else if (scope === 'annual') setPeriodKey('annual');
  }, [scope]);

  // Fetch grades whenever scope or periodKey changes
  useEffect(() => {
    if (!isOpen || !classId) return;

    async function fetchGrades() {
      setIsLoading(true);
      
      let targetPeriods = [periodKey];
      if (periodKey === 'sem1-summary') {
        targetPeriods = ['dec', 'jan', 'feb', 'sem1-exam', 'sem1-summary'];
      } else if (periodKey === 'sem2-summary') {
        targetPeriods = ['may', 'jun', 'jul', 'sem2-exam', 'sem2-summary'];
      } else if (periodKey === 'annual') {
        targetPeriods = ['dec', 'jan', 'feb', 'sem1-exam', 'sem1-summary', 'may', 'jun', 'jul', 'sem2-exam', 'sem2-summary', 'annual'];
      }

      const { data: gradesData } = await supabase
        .from('grades')
        .select('student_id, period, scores')
        .eq('class_id', classId)
        .in('period', targetPeriods)
        .eq('status', 'published');

      const flatColumns = activeSchema.subjects.flatMap(sub => {
        const cols = [];
        if (sub.subMetrics) {
          sub.subMetrics.forEach(metric => cols.push(`${sub.id}_${metric.id}`));
        }
        cols.push(sub.id);
        return cols;
      });

      const newMap: Record<string, Record<string, number>> = {};
      if (gradesData) {
        students.forEach(s => {
          newMap[s.id] = computeSummaryGrades(gradesData, s.id, periodKey, flatColumns);
        });
      }
      setMatrixData(newMap);
      setIsLoading(false);
    }

    fetchGrades();
  }, [isOpen, scope, periodKey, classId, students, activeSchema, supabase]);

  const rankedStudents = useMemo(() => {
    const computed = students.map(std => {
      const isDropoutOrInactive = std.is_active === false;
      const stdScores = matrixData[std.id] || {};
      
      let total = 0;
      subjects.forEach(sub => {
        if (!isDropoutOrInactive) {
          const score = stdScores[sub.id];
          total += (score !== undefined && score !== null && !isNaN(score)) ? Number(score) : 0;
        }
      });

      const average = Number((total / totalCoefficient).toFixed(2));
      
      let grade = 'F';
      let gradeKh = 'មធ្យម';
      if (!isDropoutOrInactive) {
        if (average >= 42.5) { grade = 'A'; gradeKh = 'ល្អប្រសើរ'; }
        else if (average >= 40.0) { grade = 'B'; gradeKh = 'ល្អណាស់'; }
        else if (average >= 35.0) { grade = 'C'; gradeKh = 'ល្អ'; }
        else if (average >= 30.0) { grade = 'D'; gradeKh = 'ល្អបង្គួរ'; }
        else if (average >= 25.0) { grade = 'E'; gradeKh = 'មធ្យម'; }
      }

      return {
        ...std,
        isDropoutOrInactive,
        totalScore: Number(total.toFixed(2)),
        average,
        grade,
        gradeKh,
      };
    }).filter(s => !s.isDropoutOrInactive);

    // Sort by total score descending
    computed.sort((a, b) => b.totalScore - a.totalScore);

    // Assign Rank (handling ties)
    let currentRank = 1;
    let previousScore = -1;
    let skipCount = 0;

    const ranked = computed.map((s, idx) => {
      if (s.totalScore === previousScore) {
        skipCount++;
      } else {
        currentRank += skipCount;
        if (idx === 0) currentRank = 1; // First element
        skipCount = 1;
        previousScore = s.totalScore;
      }
      return { ...s, rank: currentRank };
    });

    // Apply threshold filter
    if (threshold === 'top5') return ranked.filter(s => s.rank <= 5);
    if (threshold === 'top10') return ranked.filter(s => s.rank <= 10);
    if (threshold === 'all_good') return ranked.filter(s => s.average >= 25.0);

    return ranked;
  }, [students, matrixData, subjects, totalCoefficient, threshold]);

  if (!isOpen) return null;

  const getPeriodLabel = () => {
    if (scope === 'monthly') return `ខែ${MONTHS.find(m => m.key === periodKey)?.label || ''}`;
    if (scope === 'semester') return SEMESTERS.find(s => s.key === periodKey)?.label || '';
    if (scope === 'annual') return `ឆ្នាំសិក្សា ${academicYear?.name || '២០២៣-២០២៤'}`;
    return '';
  };

  const handleExportExcel = async () => {
    const { 
      createOfficialMoEYSWorkbook, 
      applyMoEYSHeaders, 
      applyStandardTableStyles, 
      autoAdjustColumnWidths, 
      addSignatureBlock,
      downloadExcel
    } = await import('@/lib/excel/styledExcelGenerator');

    const totalCols = 9; 
    const periodLabel = getPeriodLabel();
    const { workbook, worksheet, startRow } = createOfficialMoEYSWorkbook({
      sheetName: `កិត្តិយស_${periodLabel}`,
      orientation: 'portrait',
      documentTitle: 'តារាងកិត្តិយសសិស្សពូកែ',
      schoolName: 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង'
    });

    applyMoEYSHeaders(
      worksheet, 
      totalCols, 
      'តារាងកិត្តិយសសិស្សពូកែ',
      `ថ្នាក់ ${className} | ${periodLabel} | ឆ្នាំសិក្សា ${academicYear?.name || '២០២៣-២០២៤'}`
    );

    // Headers
    const headers = ['ចំណាត់ថ្នាក់', 'អត្តលេខ', 'គោត្តនាម និងនាម', 'ភេទ', 'ថ្ងៃខែឆ្នាំកំណើត', 'ពិន្ទុសរុប', 'មធ្យមភាគ', 'កម្រិតតម្លៃ', 'ផ្សេងៗ'];
    const headerRow = worksheet.getRow(startRow);
    headers.forEach((h, i) => {
      headerRow.getCell(i + 1).value = h;
    });

    // Data
    rankedStudents.forEach((std, idx) => {
      const row = worksheet.getRow(startRow + 1 + idx);
      row.getCell(1).value = std.rank;
      row.getCell(2).value = std.student_id_number || '-';
      row.getCell(3).value = std.full_name;
      row.getCell(4).value = std.gender === 'F' || std.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស';
      row.getCell(5).value = std.date_of_birth ? new Date(std.date_of_birth).toLocaleDateString('en-GB') : '-';
      row.getCell(6).value = std.totalScore;
      row.getCell(7).value = std.average;
      row.getCell(8).value = std.gradeKh;
      row.getCell(9).value = std.rank <= 3 ? 'សិស្សឆ្នើម' : std.rank <= 5 ? 'សិស្សពូកែ' : '';
    });

    applyStandardTableStyles(worksheet, startRow, startRow + 1, rankedStudents.length, totalCols);
    
    // Auto widths
    autoAdjustColumnWidths(worksheet, totalCols, [10, 12, 25, 8, 14, 10, 10, 12, 12]);
    addSignatureBlock(worksheet, startRow + 1 + rankedStudents.length + 3, totalCols, teacherName);

    await downloadExcel(workbook, `HonorRoll_${className}_${periodLabel}.xlsx`);
  };

  const handlePrintPDF = () => {
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    const periodLabel = getPeriodLabel();

    const rowsHtml = rankedStudents.map((std, idx) => `
      <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
        <td style="border: 1px solid #94a3b8; padding: 6px 4px; text-align: center; font-weight: bold;">${idx + 1}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 4px; font-family: monospace; font-size: 11px; text-align: center;">${std.student_id_number || '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 6px; font-weight: bold; text-align: left; color: #0f172a;">${std.full_name}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 4px; text-align: center;">${std.gender === 'F' || std.gender === 'ស្រី' ? 'ស' : 'ប'}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 4px; text-align: center;">${std.date_of_birth ? new Date(std.date_of_birth).toLocaleDateString('en-GB') : '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 4px; text-align: center; font-weight: black; color: #1e3a8a; background-color: #eff6ff;">${std.totalScore}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 4px; text-align: center; font-weight: black; color: #1e3a8a; background-color: #eff6ff;">${std.average}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 4px; text-align: center; font-weight: black; color: #b45309; background-color: ${std.rank === 1 ? '#fef3c7' : '#fffbeb'}; font-size: 13px;">លេខ ${std.rank}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 4px; text-align: center; font-weight: bold; color: ${std.grade === 'F' ? '#e11d48' : '#15803d'}; background-color: ${std.grade === 'F' ? '#fff1f2' : '#f0fdf4'};">${std.gradeKh}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 4px; text-align: center; font-style: italic; color: #64748b;">${std.rank <= 3 ? 'សិស្សឆ្នើម' : std.rank <= 5 ? 'សិស្សពូកែ' : ''}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Honor_Roll_${className}_${periodLabel}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&family=Moul&family=Siemreap&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { box-sizing: border-box; }
          body {
            font-family: 'Kantumruy Pro', 'Siemreap', sans-serif;
            font-size: 12px; color: #0f172a; margin: 0; padding: 0; background-color: #fff;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          .font-muol { font-family: 'Moul', serif; }
          .document-frame {
            border: 2px solid #1e3a8a;
            padding: 2px;
          }
          .document-inner-frame {
            border: 1px solid #1e3a8a;
            padding: 20px;
            min-height: 950px;
          }
          .header-grid { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; }
          .header-left { text-align: center; line-height: 1.6; font-size: 13px; }
          .header-right { text-align: center; line-height: 1.6; font-size: 13px; }
          .main-title { text-align: center; margin: 20px 0 25px; }
          .main-title h1 { font-family: 'Moul', serif; font-size: 20px; margin: 0 0 10px; color: #1e3a8a; letter-spacing: 0.5px; }
          .main-title p { font-size: 14px; margin: 0; color: #1e3a8a; font-family: 'Moul', serif; }
          
          .class-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            padding: 10px 15px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
          }

          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 30px; }
          th { border: 1px solid #94a3b8; padding: 10px 6px; font-weight: 700; text-align: center; color: #f8fafc; background-color: #1e293b; }
          
          .commendation {
            text-align: center;
            font-style: italic;
            font-weight: 600;
            color: #1e3a8a;
            margin: 30px 40px;
            line-height: 1.8;
            font-size: 12.5px;
          }

          .signatures { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; font-size: 13px; page-break-inside: avoid; }
          .signature-col { width: 45%; }
          .signature-space { height: 90px; }
        </style>
      </head>
      <body>
        <div class="document-frame">
          <div class="document-inner-frame">
            <div class="header-grid">
              <div class="header-left">
                <div class="font-muol">ក្រសួងអប់រំ យុវជន និងកីឡា</div>
                <div class="font-muol">មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តព្រៃវែង</div>
                <div class="font-muol">វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</div>
              </div>
              <div class="header-right">
                <div class="font-muol" style="font-size: 15px;">ព្រះរាជាណាចក្រកម្ពុជា</div>
                <div class="font-muol">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
                <div style="letter-spacing: 2px; margin-top: 5px;"><img src="https://upload.wikimedia.org/wikipedia/commons/4/4b/Flourish.svg" height="15" alt="flourish" onerror="this.style.display='none'" /> ក្រយៅ </div>
              </div>
            </div>

            <div class="main-title">
              <h1>តារាងកិត្តិយសសិស្សពូកែ</h1>
              <p>ប្រចាំ${periodLabel}</p>
            </div>

            <div class="class-info">
              <div>កម្រិតថ្នាក់៖ <span style="color: #1e3a8a;">${className}</span></div>
              <div>បន្ទប់លេខ៖ <span style="color: #1e3a8a;">${className.replace(/[^0-9]/g, '') || '-'}</span></div>
              <div>គ្រូបន្ទុកថ្នាក់៖ <span style="color: #1e3a8a;">${teacherName}</span></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 35px;">ល.រ</th>
                  <th style="width: 70px;">អត្តលេខ</th>
                  <th style="min-width: 140px; text-align: left; padding-left: 6px;">គោត្តនាម និងនាម</th>
                  <th style="width: 45px;">ភេទ</th>
                  <th style="width: 80px;">ថ្ងៃខែឆ្នាំកំណើត</th>
                  <th style="width: 65px;">ពិន្ទុសរុប</th>
                  <th style="width: 65px;">មធ្យមភាគ</th>
                  <th style="width: 70px;">ចំណាត់ថ្នាក់</th>
                  <th style="width: 70px;">និទ្ទេស</th>
                  <th style="width: 100px;">ការសរសើរ/ផ្សេងៗ</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="commendation">
              "គណៈគ្រប់គ្រងសាលា និងលោកគ្រូ/អ្នកគ្រូបន្ទុកថ្នាក់ សូមសម្តែងនូវការកោតសរសើរ និងអបអរសាទរយ៉ាងកក់ក្តៅចំពោះក្មួយៗសិស្សានុសិស្សដែលបានខិតខំប្រឹងប្រែងរៀនសូត្ររហូតទទួលបានលទ្ធផលល្អប្រសើរ!"
            </div>

            <div class="signatures">
              <div class="signature-col">
                <div class="font-muol">បានឃើញ និងឯកភាព</div>
                <div style="font-weight: bold; margin-top: 5px;">ថ្ងៃទី......... ខែ......... ឆ្នាំ២០២...</div>
                <div class="font-muol" style="margin-top: 5px;">នាយកវិទ្យាល័យ</div>
                <div class="signature-space"></div>
                <div style="font-weight: bold;">................................................</div>
              </div>
              <div class="signature-col">
                <div style="font-weight: bold;">ថ្ងៃ................... ខែ........... ឆ្នាំ............. ព.ស. ២៥៦...</div>
                <div style="font-weight: bold; margin-top: 5px;">ពោធិ៍រៀង, ថ្ងៃទី......... ខែ......... ឆ្នាំ២០២...</div>
                <div class="font-muol" style="margin-top: 5px;">គ្រូបន្ទុកថ្នាក់</div>
                <div class="signature-space"></div>
                <div style="font-weight: bold;">${teacherName}</div>
              </div>
            </div>

            <script>
              window.onload = function() {
                setTimeout(function() { window.print(); }, 500);
              };
            </script>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1000,height=1200');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      headerBg="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-white"
      icon={<Award className="w-5 h-5 text-white" />}
      title="តារាងកិត្តិយសសិស្សពូកែ (Honor Roll)"
      subtitle={`ថ្នាក់ ${className} • ${getPeriodLabel()}`}
    >
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Scope Selection */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700">ប្រភេទចំណាត់ថ្នាក់</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input type="radio" name="scope" value="monthly" checked={scope === 'monthly'} onChange={() => setScope('monthly')} className="text-amber-600 focus:ring-amber-500 w-4 h-4" />
                <span className="text-sm font-semibold text-slate-700">ប្រចាំខែ (Monthly)</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input type="radio" name="scope" value="semester" checked={scope === 'semester'} onChange={() => setScope('semester')} className="text-amber-600 focus:ring-amber-500 w-4 h-4" />
                <span className="text-sm font-semibold text-slate-700">ប្រចាំឆមាស (Semester)</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input type="radio" name="scope" value="annual" checked={scope === 'annual'} onChange={() => setScope('annual')} className="text-amber-600 focus:ring-amber-500 w-4 h-4" />
                <span className="text-sm font-semibold text-slate-700">ប្រចាំឆ្នាំ (Annual)</span>
              </label>
            </div>
          </div>

          {/* Period Selection */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700">ជ្រើសរើសពេលវេលា</label>
            {scope === 'monthly' && (
              <select
                value={periodKey}
                onChange={(e) => setPeriodKey(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
              >
                {MONTHS.map(m => (
                  <option key={m.key} value={m.key}>ខែ{m.label}</option>
                ))}
              </select>
            )}
            {scope === 'semester' && (
              <select
                value={periodKey}
                onChange={(e) => setPeriodKey(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
              >
                {SEMESTERS.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            )}
            {scope === 'annual' && (
              <div className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">
                ឆ្នាំសិក្សា {academicYear?.name || '២០២៣-២០២៤'} (ពេញមួយឆ្នាំ)
              </div>
            )}
          </div>

          {/* Threshold Selection */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700">ជ្រើសរើសសិស្ស</label>
            <select
              value={threshold}
              onChange={(e: any) => setThreshold(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
            >
              <option value="top5">សិស្សឆ្នើម Top 5 (លេខ ១ ដល់ ៥)</option>
              <option value="top10">សិស្សឆ្នើម Top 10 (លេខ ១ ដល់ ១០)</option>
              <option value="all_good">សិស្សជាប់និទ្ទេសល្អទាំងអស់ (មធ្យមភាគ {'>'}= ២៥)</option>
            </select>
          </div>
        </div>

        {/* Preview Summary */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">សិស្សជាប់ចំណាត់ថ្នាក់</p>
              <h3 className="text-xl font-black text-slate-900 mt-1">
                {isLoading ? '...' : `${rankedStudents.length} នាក់`}
              </h3>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={handlePrintPDF}
              disabled={isLoading || rankedStudents.length === 0}
              className="px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span>មើលទម្រង់គំរូ & បោះពុម្ព A4</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={isLoading || rankedStudents.length === 0}
              className="px-6 py-3.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-black text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              <span>ទាញយកជា Excel</span>
            </button>
          </div>
        </div>
        
        {isLoading && (
          <div className="text-center text-sm font-semibold text-slate-500 py-4 animate-pulse">
            កំពុងទាញយកទិន្នន័យពិន្ទុ...
          </div>
        )}
      </div>
    </Modal>
  );
}
