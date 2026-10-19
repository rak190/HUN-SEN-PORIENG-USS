'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Classroom, Student } from '@/types';
import StudentStudyPlanDocument, {
  StudyPlanSchoolInfo,
  StudyPlanTeacherInfo,
  toKhmerDigits,
} from './StudentStudyPlanDocument';
import {
  Printer,
  Download,
  Search,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  User,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';

interface StudentStudyPlansClientProps {
  students: Student[];
  classInfo: Classroom;
  academicYearName: string;
  schoolInfo?: StudyPlanSchoolInfo;
  teacherInfo?: StudyPlanTeacherInfo;
  gradesData?: Array<{ period: string; scores: Record<string, number> }>;
}

export default function StudentStudyPlansClient({
  students,
  classInfo,
  academicYearName,
  schoolInfo,
  teacherInfo,
  gradesData = [],
}: StudentStudyPlansClientProps) {
  // Active student for screen preview
  const [activeStudentId, setActiveStudentId] = useState<string>(
    students[0]?.id || ''
  );

  // Selected student IDs for batch actions (default: all selected)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(students.map((s) => s.id))
  );

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Print mode ('single' or 'batch')
  const [printMode, setPrintMode] = useState<'single' | 'batch'>('batch');
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  // PDF generation state
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  // Issue date string (editable by teacher)
  const [issueDate, setIssueDate] = useState(
    `វិ.ហសពោធិ៍រៀង ថ្ងៃទី១០ ខែវិច្ឆិកា ឆ្នាំ${toKhmerDigits(
      academicYearName.split('-')[0] || '២០២៥'
    )}`
  );

  // Ref to the preview document container
  const previewDocRef = useRef<HTMLDivElement>(null);
  // Hidden container for batch PDF generation
  const batchPdfContainerRef = useRef<HTMLDivElement>(null);

  // Filtered students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(q) ||
        s.student_id_number?.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Active student object
  const activeStudent = useMemo(() => {
    return (
      students.find((s) => s.id === activeStudentId) ||
      students[0] ||
      null
    );
  }, [students, activeStudentId]);

  // Selected students list
  const selectedStudents = useMemo(() => {
    return students.filter((s) => selectedIds.has(s.id));
  }, [students, selectedIds]);

  // Active student index in current filtered list
  const activeIndex = useMemo(() => {
    return filteredStudents.findIndex((s) => s.id === activeStudentId);
  }, [filteredStudents, activeStudentId]);

  // Toggle single selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle select all filtered
  const isAllFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedIds.has(s.id));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  // Navigation handlers
  const handlePrevStudent = () => {
    if (activeIndex > 0) {
      setActiveStudentId(filteredStudents[activeIndex - 1].id);
    }
  };

  const handleNextStudent = () => {
    if (activeIndex < filteredStudents.length - 1) {
      setActiveStudentId(filteredStudents[activeIndex + 1].id);
    }
  };

  // Trigger Print for currently previewed student
  const handlePrintSingle = () => {
    setPrintMode('single');
    setIsPreparingPrint(true);
    setTimeout(() => {
      window.print();
      setIsPreparingPrint(false);
    }, 250);
  };

  // Trigger Print for all selected students
  const handlePrintBatch = () => {
    if (selectedStudents.length === 0) {
      alert('សូមជ្រើសរើសសិស្សយ៉ាងហោចណាស់ម្នាក់ដើម្បីបោះពុម្ព (Please select at least 1 student)');
      return;
    }
    setPrintMode('batch');
    setIsPreparingPrint(true);
    setTimeout(() => {
      window.print();
      setIsPreparingPrint(false);
    }, 350);
  };

  // Download PDF for previewed student
  const handleDownloadSinglePdf = async () => {
    if (!activeStudent || !previewDocRef.current) return;
    setIsExportingPdf(true);
    try {
      const element = previewDocRef.current;
      const dataUrl = await toJpeg(element, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: 1122,
        height: 792,
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      pdf.addImage(dataUrl, 'JPEG', 0, 0, 297, 210);
      const safeName = activeStudent.full_name.replace(/\s+/g, '_');
      pdf.save(`Study_Plan_${classInfo.name}_${safeName}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('មានបញ្ហាក្នុងការបង្កើត PDF សូមសាកល្បងម្ដងទៀត។');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Download PDF for all selected students in batch
  const handleDownloadBatchPdf = async () => {
    if (selectedStudents.length === 0) {
      alert('សូមជ្រើសរើសសិស្សយ៉ាងហោចណាស់ម្នាក់ (Please select at least 1 student)');
      return;
    }

    if (!batchPdfContainerRef.current) return;

    setIsExportingPdf(true);
    setExportProgress({ current: 0, total: selectedStudents.length });

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const container = batchPdfContainerRef.current;
      const children = Array.from(container.children) as HTMLElement[];

      for (let i = 0; i < selectedStudents.length; i++) {
        setExportProgress({ current: i + 1, total: selectedStudents.length });
        const pageEl = children[i];
        if (!pageEl) continue;

        const dataUrl = await toJpeg(pageEl, {
          quality: 0.92,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          width: 1122,
          height: 792,
        });

        if (i > 0) {
          pdf.addPage('a4', 'landscape');
        }
        pdf.addImage(dataUrl, 'JPEG', 0, 0, 297, 210);
      }

      pdf.save(`Study_Plans_Batch_${classInfo.name}_(${selectedStudents.length}_students).pdf`);
    } catch (err) {
      console.error('Failed to generate batch PDF:', err);
      alert('មានបញ្ហាក្នុងការបង្កើត Batch PDF សូមសាកល្បងម្ដងទៀត។');
    } finally {
      setIsExportingPdf(false);
      setExportProgress(null);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20 print:p-0 print:m-0 print:pb-0">
      {/* ----------------- GLOBAL PRINT STYLES ----------------- */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm !important;
          }
          html, body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .study-plan-print-item {
            page-break-after: always !important;
            break-after: page !important;
            break-inside: avoid !important;
            width: 100% !important;
            height: 198mm !important;
            max-height: 198mm !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .study-plan-print-item:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* ----------------- SCREEN HEADER & TOOLBAR ----------------- */}
      <div className="print:hidden space-y-4">
        {/* Top Header Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 text-[#155EEF] rounded-2xl flex items-center justify-center border border-blue-100 shadow-2xs">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>ផែនការសិក្សារបស់សិស្ស</span>
                  <span className="text-xs font-bold text-slate-400 font-sans uppercase tracking-wider">
                    (Student Study Plans)
                  </span>
                </h1>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  បង្កើតឯកសារផែនការសិក្សារបស់សិស្សជាឯកត្តជន ឬជាបណ្តុំទូទាំងថ្នាក់ដោយស្វ័យប្រវត្តិ
                </p>
              </div>
            </div>

            {/* Badges Info */}
            <div className="flex flex-wrap items-center gap-2 mt-4 text-xs font-bold">
              <span className="bg-blue-50 text-[#155EEF] px-3 py-1 rounded-xl border border-blue-200/60 flex items-center gap-1.5">
                <span>ថ្នាក់ទី៖</span>
                <strong className="font-extrabold">{toKhmerDigits(classInfo.name)}</strong>
              </span>
              <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-xl border border-purple-200/60 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>ឆ្នាំសិក្សា {toKhmerDigits(academicYearName)}</span>
              </span>
              <span className="bg-slate-50 text-slate-700 px-3 py-1 rounded-xl border border-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>គ្រូបន្ទុកថ្នាក់៖ {teacherInfo?.full_name || 'មិនទាន់ចាត់តាំង'}</span>
              </span>
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl border border-emerald-200/60 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>សិស្សសរុប {toKhmerDigits(students.length)} នាក់</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Single Print */}
            <button
              onClick={handlePrintSingle}
              disabled={isPreparingPrint || !activeStudent}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black rounded-xl shadow-2xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>បោះពុម្ពសិស្សនេះ</span>
            </button>

            {/* Batch Print */}
            <button
              onClick={handlePrintBatch}
              disabled={isPreparingPrint || selectedStudents.length === 0}
              className="px-4 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>បោះពុម្ពដែលបានជ្រើសរើស ({toKhmerDigits(selectedStudents.length)})</span>
            </button>

            {/* PDF Dropdown / Batch Download */}
            <button
              onClick={handleDownloadBatchPdf}
              disabled={isExportingPdf || selectedStudents.length === 0}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {exportProgress
                      ? `ទាញយក PDF (${exportProgress.current}/${exportProgress.total})...`
                      : 'កំពុងទាញយក...'}
                  </span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>ទាញយក PDF បណ្តុំ ({toKhmerDigits(selectedStudents.length)})</span>
                </>
              )}
            </button>

            {/* Single PDF */}
            <button
              onClick={handleDownloadSinglePdf}
              disabled={isExportingPdf || !activeStudent}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="ទាញយក PDF សិស្សនេះ"
            >
              <Download className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Date Config Bar */}
        <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-[#155EEF]" />
            <span>កាលបរិច្ឆេទលើឯកសារ (Issue Date Text):</span>
            <input
              type="text"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 w-80 focus:outline-none focus:ring-2 focus:ring-[#155EEF]"
            />
          </div>

          <div className="text-xs font-bold text-slate-500">
            <span>បានជ្រើសរើស </span>
            <strong className="text-[#155EEF]">{toKhmerDigits(selectedStudents.length)}</strong>
            <span> / {toKhmerDigits(students.length)} នាក់</span>
          </div>
        </div>
      </div>

      {/* ----------------- MAIN SCREEN CONTENT AREA ----------------- */}
      <div className="print:hidden grid grid-cols-12 gap-6 items-start">
        {/* Left Side: Student Selection Roster (Col 12 on mobile, 4 on lg) */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 flex flex-col h-[820px]">
          {/* Search Box */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកតាមឈ្មោះ ឬអត្តលេខ..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#155EEF]"
            />
          </div>

          {/* Select All Toggle Header */}
          <div className="flex items-center justify-between px-2 py-2 border-b border-slate-100 text-xs font-bold text-slate-600 mb-2">
            <button
              onClick={handleToggleSelectAll}
              className="flex items-center gap-2 hover:text-[#155EEF] transition-colors cursor-pointer select-none"
            >
              {isAllFilteredSelected ? (
                <CheckSquare className="w-4 h-4 text-[#155EEF]" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>ជ្រើសរើសទាំងអស់ ({toKhmerDigits(filteredStudents.length)})</span>
            </button>
            <span className="text-[11px] text-slate-400">
              {toKhmerDigits(selectedStudents.length)} បានជ្រើស
            </span>
          </div>

          {/* Scrollable Student List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
            {filteredStudents.length === 0 ? (
              <div className="py-12 text-center text-xs font-bold text-slate-400">
                រកមិនឃើញសិស្សតាមការស្វែងរកទេ
              </div>
            ) : (
              filteredStudents.map((std, idx) => {
                const isSelected = selectedIds.has(std.id);
                const isActive = std.id === activeStudentId;

                return (
                  <div
                    key={std.id}
                    onClick={() => setActiveStudentId(std.id)}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-50/90 border-blue-200 shadow-2xs'
                        : 'bg-white hover:bg-slate-50/80 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(std.id);
                        }}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#155EEF]" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>

                      {/* Photo Thumbnail */}
                      <div className="w-8 h-10 rounded-xs border border-slate-200 overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                        {std.photo_url ? (
                          <img
                            src={std.photo_url}
                            alt=""
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <User className="w-4 h-4 text-slate-300" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex flex-col">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {std.full_name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                          <span>{std.student_id_number || `#${idx + 1}`}</span>
                          <span>•</span>
                          <span
                            className={
                              std.gender === 'F' || std.gender === 'ស្រី'
                                ? 'text-pink-600'
                                : 'text-blue-600'
                            }
                          >
                            {std.gender === 'F' || std.gender === 'ស្រី'
                              ? 'ស្រី'
                              : 'ប្រុស'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Active Indicator Pin */}
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-[#155EEF] shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Live Document Preview Canvas (Col 12 on mobile, 8 on lg) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-3">
          {/* Preview Navigation Toolbar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevStudent}
                disabled={activeIndex <= 0}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                title="សិស្សមុន"
              >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
              </button>

              <span className="text-xs font-bold text-slate-800 px-2 truncate max-w-xs">
                សិស្សទី {toKhmerDigits(activeIndex + 1)} នៃ {toKhmerDigits(filteredStudents.length)} ៖{' '}
                <strong className="text-[#155EEF]">{activeStudent?.full_name}</strong>
              </span>

              <button
                onClick={handleNextStudent}
                disabled={activeIndex >= filteredStudents.length - 1}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                title="សិស្សបន្ទាប់"
              >
                <ChevronRight className="w-4 h-4 text-slate-700" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-slate-400">ទិដ្ឋភាពមុនបោះពុម្ព (Print Preview)</span>
            </div>
          </div>

          {/* Interactive Document Viewport */}
          <div className="bg-slate-200/60 p-6 rounded-3xl border border-slate-200 shadow-inner overflow-x-auto flex justify-center">
            {activeStudent ? (
              <div ref={previewDocRef}>
                <StudentStudyPlanDocument
                  student={activeStudent}
                  classInfo={classInfo}
                  academicYearName={academicYearName}
                  schoolInfo={schoolInfo}
                  teacherInfo={teacherInfo}
                  gradesData={gradesData}
                  issueDateText={issueDate}
                />
              </div>
            ) : (
              <div className="py-24 text-center font-bold text-slate-400">
                មិនមានទិន្នន័យសិស្សទេ
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ----------------- HIDDEN PRINT CONTAINERS (Activated during window.print()) ----------------- */}
      <div className="hidden print:block">
        {printMode === 'single' ? (
          activeStudent && (
            <div className="study-plan-print-item">
              <StudentStudyPlanDocument
                student={activeStudent}
                classInfo={classInfo}
                academicYearName={academicYearName}
                schoolInfo={schoolInfo}
                teacherInfo={teacherInfo}
                gradesData={gradesData}
                issueDateText={issueDate}
              />
            </div>
          )
        ) : (
          selectedStudents.map((std) => (
            <div key={std.id} className="study-plan-print-item">
              <StudentStudyPlanDocument
                student={std}
                classInfo={classInfo}
                academicYearName={academicYearName}
                schoolInfo={schoolInfo}
                teacherInfo={teacherInfo}
                gradesData={gradesData}
                issueDateText={issueDate}
              />
            </div>
          ))
        )}
      </div>

      {/* ----------------- HIDDEN OFF-SCREEN CONTAINER FOR PDF EXPORT ----------------- */}
      <div
        ref={batchPdfContainerRef}
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        {selectedStudents.map((std) => (
          <div key={`pdf-${std.id}`} className="w-[1122px] h-[792px] bg-white mb-8">
            <StudentStudyPlanDocument
              student={std}
              classInfo={classInfo}
              academicYearName={academicYearName}
              schoolInfo={schoolInfo}
              teacherInfo={teacherInfo}
              gradesData={gradesData}
              issueDateText={issueDate}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
