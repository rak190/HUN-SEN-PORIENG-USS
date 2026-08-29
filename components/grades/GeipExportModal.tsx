'use client';

import React, { useState, useRef, useMemo } from 'react';
import { X, Download, Printer, FileSpreadsheet, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Student } from '@/types';
import { CurriculumSchema, SubjectSchema } from '@/lib/curriculum';
import { exportGeipAssessmentToExcel } from '@/lib/geip-export';
import Modal from '@/components/ui/Modal';

interface GeipExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  periodLabel: string;
  periodKey: string;
  students: Student[];
  matrixData: Record<string, Record<string, number>>;
  activeSchema: CurriculumSchema;
  maxTotalScore: number;
}

export function GeipExportModal({
  isOpen,
  onClose,
  className,
  periodLabel,
  periodKey,
  students,
  matrixData,
  activeSchema,
  maxTotalScore,
}: GeipExportModalProps) {
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const subjects: SubjectSchema[] = activeSchema.subjects;
  const totalCoefficient = maxTotalScore / 50;

  // Process and compute students with GEIP Zero-Filling rule
  const computedStudents = useMemo(() => {
    return students.map(std => {
      const isDropoutOrInactive = std.is_active === false;
      const stdScores = matrixData[std.id] || {};
      
      let total = 0;
      const subjectScores: Record<string, number> = {};

      subjects.forEach(sub => {
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
  }, [students, matrixData, subjects, totalCoefficient]);

  const stats = useMemo(() => {
    const total = computedStudents.length;
    const female = computedStudents.filter(s => s.gender === 'F' || s.gender === 'ស្រី').length;
    const active = computedStudents.filter(s => !s.isDropoutOrInactive).length;
    const dropout = total - active;
    
    const grades = {
      A: computedStudents.filter(s => s.grade === 'A').length,
      B: computedStudents.filter(s => s.grade === 'B').length,
      C: computedStudents.filter(s => s.grade === 'C').length,
      D: computedStudents.filter(s => s.grade === 'D').length,
      E: computedStudents.filter(s => s.grade === 'E').length,
      F: computedStudents.filter(s => s.grade === 'F').length,
    };

    return { total, female, active, dropout, grades };
  }, [computedStudents]);

  if (!isOpen) return null;

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      await exportGeipAssessmentToExcel({
        className,
        periodLabel,
        periodKey,
        students,
        matrixData,
        activeSchema,
        maxTotalScore,
      });
    } catch (err) {
      console.error(err);
      alert('បរាជ័យក្នុងការទាញយក Excel');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      headerBg="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white"
      icon={
        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
          <FileSpreadsheet className="w-5 h-5 text-blue-200" />
        </div>
      }
      title={
        <div className="flex items-center gap-2 text-white">
          <span>នាំចេញរបាយការណ៍តេស្តស្តង់ដា GEIP ៣.១.៤</span>
          <span className="text-[10px] bg-blue-500/40 text-blue-100 px-2 py-0.5 rounded-full border border-blue-400/30 font-bold">
            MoEYS Standard
          </span>
        </div>
      }
      subtitle={<span className="text-blue-200">{`ថ្នាក់៖ ${className} • ${periodLabel} (ជំនួសលេខ ០ ស្វ័យប្រវត្តិចំពោះសិស្សអវត្តមាន/បោះបង់)`}</span>}
      showCloseButton={true}
    >
      <div className="flex flex-col max-h-[80vh]">

        {/* Quick Stats Strip */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-700">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span>សិស្សសរុប៖</span>
              <span className="text-slate-900 font-extrabold">{stats.total} នាក់ (ស្រី {stats.female})</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span>រៀនជាក់ស្តែង៖</span>
              <span className="font-extrabold">{stats.active} នាក់</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5 text-rose-600">
              <span>បោះបង់/អវត្តមាន៖</span>
              <span className="font-extrabold">{stats.dropout} នាក់</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExportingExcel ? 'កំពុងទាញយក...' : 'ទាញយកជា Excel (.xlsx)'}</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="px-4 py-2 bg-[#155EEF] hover:bg-blue-700 active:scale-95 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>បោះពុម្ព / Save PDF (A4)</span>
            </button>
          </div>
        </div>

        {/* Printable & Scrollable Preview Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/70">
          <div
            ref={printRef}
            className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-slate-900 print:border-none print:shadow-none print:p-0 print:m-0"
          >
            {/* MoEYS Official Document Header */}
            <div className="text-center mb-6">
              <h3 className="font-muol text-sm tracking-wide text-slate-900 mb-1">
                ព្រះរាជាណាចក្រកម្ពុជា
              </h3>
              <h4 className="font-muol text-xs tracking-wider text-slate-800 mb-3">
                ជាតិ សាសនា ព្រះមហាក្សត្រ
              </h4>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-2 mt-4 border-b border-slate-200 pb-2">
                <div className="text-left">
                  <p className="text-blue-900 font-extrabold">ក្រសួងអប់រំ យុវជន និងកីឡា</p>
                  <p className="text-slate-600 font-semibold">គម្រោងកែលម្អការអប់រំចំណេះទូទៅ (GEIP)</p>
                  <p className="text-slate-900 font-bold">វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</p>
                </div>
                <div className="text-right">
                  <p>ថ្នាក់៖ <span className="font-extrabold text-blue-900">{className}</span></p>
                  <p>សម័យប្រឡង/តេស្ត៖ <span className="font-bold text-slate-900">{periodLabel}</span></p>
                  <p className="text-[10px] text-slate-500">កាលបរិច្ឆេទ៖ {new Date().toLocaleDateString('km-KH')}</p>
                </div>
              </div>
              <h2 className="font-muol text-base text-blue-950 mt-4">
                តារាងលទ្ធផលតេស្តស្តង់ដា និងការវាយតម្លៃ GEIP ៣.១.៤
              </h2>
            </div>

            {/* Zero Fill Alert Note */}
            <div className="mb-3 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-[11px] font-semibold text-amber-900 print:bg-transparent print:border-none print:p-0">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 print:hidden" />
              <span>
                * សម្គាល់៖ សិស្សអវត្តមាន បោះបង់ ឬមិនបានប្រឡង ត្រូវបានជំនួសដោយពិន្ទុ <strong>0</strong> គ្រប់មុខវិជ្ជា ដើម្បីធានាបាននូវភាពពេញលេញនៃទិន្នន័យគម្រោង GEIP។
              </span>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="border border-slate-300 py-2 px-1 w-8">ល.រ</th>
                    <th className="border border-slate-300 py-2 px-2 min-w-[70px]">អត្តលេខ</th>
                    <th className="border border-slate-300 py-2 px-3 text-left min-w-[140px]">គោត្តនាម និងនាម</th>
                    <th className="border border-slate-300 py-2 px-1 w-10">ភេទ</th>
                    <th className="border border-slate-300 py-2 px-2 w-14">ស្ថានភាព</th>
                    {subjects.map(sub => (
                      <th key={sub.id} className="border border-slate-300 py-1.5 px-1 min-w-[45px] text-[11px] bg-blue-50/60">
                        <div>{sub.label}</div>
                        <div className="text-[9px] font-normal text-slate-500">({sub.maxScore})</div>
                      </th>
                    ))}
                    <th className="border border-slate-300 py-2 px-2 bg-blue-100 text-blue-950 font-black min-w-[55px]">
                      សរុប<br />({maxTotalScore})
                    </th>
                    <th className="border border-slate-300 py-2 px-1 bg-blue-100 text-blue-950 font-black min-w-[45px]">
                      មធ្យម<br />(50)
                    </th>
                    <th className="border border-slate-300 py-2 px-1 bg-amber-100 text-amber-950 font-black w-10">
                      ចំណាត់<br />ថ្នាក់
                    </th>
                    <th className="border border-slate-300 py-2 px-1 bg-amber-100 text-amber-950 font-black w-10">
                      និទ្ទេស
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {computedStudents.map((std, idx) => (
                    <tr
                      key={std.id}
                      className={`hover:bg-slate-50 ${idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}
                    >
                      <td className="border border-slate-300 py-1.5 px-1 font-bold text-slate-600">{idx + 1}</td>
                      <td className="border border-slate-300 py-1.5 px-2 font-mono text-[10px] text-slate-600">{std.student_id_number || '-'}</td>
                      <td className="border border-slate-300 py-1.5 px-3 text-left font-bold text-slate-900">{std.full_name}</td>
                      <td className="border border-slate-300 py-1.5 px-1">{std.gender === 'F' || std.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'}</td>
                      <td className="border border-slate-300 py-1.5 px-1">
                        <span className={`text-[10px] font-bold ${std.isDropoutOrInactive ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {std.isDropoutOrInactive ? 'បោះបង់' : 'រៀន'}
                        </span>
                      </td>
                      {subjects.map(sub => {
                        const val = std.subjectScores[sub.id];
                        return (
                          <td key={sub.id} className="border border-slate-300 py-1.5 px-1">
                            <span className={val === 0 ? 'text-slate-400 font-normal' : 'font-bold text-slate-800'}>
                              {val}
                            </span>
                          </td>
                        );
                      })}
                      <td className="border border-slate-300 py-1.5 px-1 font-black text-blue-900 bg-blue-50/30">{std.totalScore}</td>
                      <td className="border border-slate-300 py-1.5 px-1 font-bold text-slate-800 bg-blue-50/30">{std.average}</td>
                      <td className="border border-slate-300 py-1.5 px-1 font-bold text-slate-900 bg-amber-50/30">
                        {std.isDropoutOrInactive ? '-' : idx + 1}
                      </td>
                      <td className="border border-slate-300 py-1.5 px-1 font-black bg-amber-50/30">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          std.grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                          std.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                          std.grade === 'C' ? 'bg-sky-100 text-sky-800' :
                          std.grade === 'D' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {std.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Statistics Summary & Signatures */}
            <div className="mt-6 pt-4 border-t border-slate-200 text-xs">
              <div className="flex flex-wrap items-center justify-between font-bold text-slate-800 gap-4 mb-8">
                <div>
                  <p>សរុបសិស្ស៖ <strong>{stats.total}</strong> នាក់ (ស្រី៖ <strong>{stats.female}</strong> នាក់) | រៀនជាក់ស្តែង៖ <strong>{stats.active}</strong> នាក់ | បោះបង់៖ <strong className="text-rose-600">{stats.dropout}</strong> នាក់</p>
                  <p className="mt-1 text-slate-600">ស្ថិតិនិទ្ទេស៖ A: <strong>{stats.grades.A}</strong> | B: <strong>{stats.grades.B}</strong> | C: <strong>{stats.grades.C}</strong> | D: <strong>{stats.grades.D}</strong> | E: <strong>{stats.grades.E}</strong> | F: <strong>{stats.grades.F}</strong></p>
                </div>
              </div>

              <div className="grid grid-cols-2 text-center pt-2">
                <div>
                  <p className="font-muol text-xs text-slate-900 mb-1">បានឃើញ និងឯកភាព</p>
                  <p className="font-bold text-slate-700">នាយកសាលា</p>
                  <div className="h-16"></div>
                  <p className="font-bold text-slate-800">................................................</p>
                </div>

                <div>
                  <p className="text-slate-600 text-[11px] mb-1">ថ្ងៃទី......... ខែ......... ឆ្នាំ២០២...</p>
                  <p className="font-muol text-xs text-slate-900">គ្រូបន្ទុកថ្នាក់</p>
                  <div className="h-16"></div>
                  <p className="font-bold text-slate-800">................................................</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>KruAI • GEIP Project Standard Integration</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
          >
            បិទ
          </button>
        </div>

      </div>
    </Modal>
  );
}
