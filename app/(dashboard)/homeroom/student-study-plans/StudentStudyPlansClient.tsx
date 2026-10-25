'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Classroom, Student } from '@/types';
import StudentStudyPlanDocument, {
  StudyPlanSchoolInfo,
  StudyPlanTeacherInfo,
  toKhmerDigits,
  STUDY_PLAN_MONTHS,
} from './StudentStudyPlanDocument';
import {
  STUDY_PLAN_SUBJECTS,
  SubjectPlanTarget,
} from './types';
import { saveStudentStudyPlanAction } from './actions';
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
  Target,
  X,
  Save,
  Check,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';

interface StudentStudyPlansClientProps {
  students: Student[];
  classInfo: Classroom;
  academicYearId?: string;
  academicYearName: string;
  schoolInfo?: StudyPlanSchoolInfo;
  teacherInfo?: StudyPlanTeacherInfo;
  gradesData?: Array<{ period: string; scores: Record<string, number>; student_id?: string }>;
  initialStudyPlansMap?: Record<string, Record<string, SubjectPlanTarget>>;
}

const GRADE_LETTER_OPTIONS = ['', 'A', 'B', 'C', 'D', 'E', 'F'];

export default function StudentStudyPlansClient({
  students,
  classInfo,
  academicYearId,
  academicYearName,
  schoolInfo,
  teacherInfo,
  gradesData = [],
  initialStudyPlansMap = {},
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

  // Excel generation state
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [excelProgress, setExcelProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  // Issue date string (editable by teacher)
  const [issueDate, setIssueDate] = useState(
    `វិ.ហសពោធិ៍រៀង ថ្ងៃទី១០ ខែវិច្ឆិកា ឆ្នាំ${toKhmerDigits(
      academicYearName.split('-')[0] || '២០២៥'
    )}`
  );

  // Study Plans Map: student_id -> Record<subject_id, SubjectPlanTarget>
  const [studyPlansMap, setStudyPlansMap] = useState<
    Record<string, Record<string, SubjectPlanTarget>>
  >(initialStudyPlansMap);

  // Goal Setting Modal State
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingTargets, setEditingTargets] = useState<Record<string, SubjectPlanTarget>>({});
  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const [goalFeedback, setGoalFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

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

  // Toggle select all
  const handleToggleSelectAll = () => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
    }
  };

  // Navigate next/prev student
  const handleNextStudent = () => {
    if (activeIndex < filteredStudents.length - 1) {
      setActiveStudentId(filteredStudents[activeIndex + 1].id);
    }
  };

  const handlePrevStudent = () => {
    if (activeIndex > 0) {
      setActiveStudentId(filteredStudents[activeIndex - 1].id);
    }
  };

  // Single Print handler
  const handlePrintSingle = () => {
    setPrintMode('single');
    setIsPreparingPrint(true);
    setTimeout(() => {
      window.print();
      setIsPreparingPrint(false);
    }, 200);
  };

  // Batch Print handler
  const handlePrintBatch = () => {
    if (selectedStudents.length === 0) {
      alert('សូមជ្រើសរើសសិស្សយ៉ាងហោចណាស់ម្នាក់ដើម្បីបោះពុម្ព។');
      return;
    }
    setPrintMode('batch');
    setIsPreparingPrint(true);
    setTimeout(() => {
      window.print();
      setIsPreparingPrint(false);
    }, 300);
  };

  // Export Single PDF
  const handleExportSinglePdf = async () => {
    if (!previewDocRef.current || !activeStudent) return;
    setIsExportingPdf(true);
    try {
      const dataUrl = await toJpeg(previewDocRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pageWidth, pageHeight);

      const safeName = (activeStudent.full_name || 'Student').replace(/\s+/g, '_');
      pdf.save(`Study_Plan_${classInfo.name}_${safeName}.pdf`);
    } catch (error) {
      console.error('Error generating single PDF:', error);
      alert('មានបញ្ហាក្នុងការទាញយក PDF។ សូមព្យាយាមម្តងទៀត។');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export Batch PDF
  const handleExportBatchPdf = async () => {
    if (selectedStudents.length === 0) {
      alert('សូមជ្រើសរើសសិស្សយ៉ាងហោចណាស់ម្នាក់ដើម្បីទាញយក PDF។');
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

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const studentNodes = Array.from(batchPdfContainerRef.current.children) as HTMLElement[];

      for (let i = 0; i < studentNodes.length; i++) {
        setExportProgress({ current: i + 1, total: studentNodes.length });
        const node = studentNodes[i];

        const dataUrl = await toJpeg(node, {
          quality: 0.96,
          pixelRatio: 2.5,
          backgroundColor: '#ffffff',
        });

        if (i > 0) pdf.addPage('a4', 'landscape');
        pdf.addImage(dataUrl, 'JPEG', 0, 0, pageWidth, pageHeight);
      }

      pdf.save(`Study_Plans_Batch_${classInfo.name}_(${selectedStudents.length}_students).pdf`);
    } catch (error) {
      console.error('Error generating batch PDF:', error);
      alert('មានបញ្ហាក្នុងការបង្កើត PDF ជាបណ្តុំ។ សូមសាកល្បងបោះពុម្ពជំនួសវិញ។');
    } finally {
      setIsExportingPdf(false);
      setExportProgress(null);
    }
  };

  const handleDownloadBatchPdf = handleExportBatchPdf;
  const handleDownloadSinglePdf = handleExportSinglePdf;

  // Single Student Excel Export Handler
  const handleExportSingleExcel = async () => {
    if (!activeStudent) return;
    setIsExportingExcel(true);
    try {
      const { exportSingleStudyPlanExcel } = await import('@/lib/excel/study-plan-export');
      await exportSingleStudyPlanExcel({
        student: activeStudent,
        classInfo,
        academicYearName,
        schoolInfo,
        teacherInfo,
        planTargets: studyPlansMap[activeStudent.id] || {},
        gradesData,
        issueDateText: issueDate,
      });
    } catch (error) {
      console.error('Error exporting single Excel:', error);
      alert('មានបញ្ហាក្នុងការទាញយក Excel សម្រាប់សិស្សនេះ។');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Batch Class Excel Export Handler
  const handleExportBatchExcel = async () => {
    if (selectedStudents.length === 0) return;
    setIsExportingExcel(true);
    setExcelProgress({ current: 0, total: selectedStudents.length });
    try {
      const { exportBatchStudyPlansExcel } = await import('@/lib/excel/study-plan-export');
      await exportBatchStudyPlansExcel({
        students: selectedStudents,
        classInfo,
        academicYearName,
        schoolInfo,
        teacherInfo,
        studyPlansMap,
        gradesData,
        issueDateText: issueDate,
        onProgress: (current, total) => {
          setExcelProgress({ current, total });
        },
      });
    } catch (error) {
      console.error('Error exporting batch Excel:', error);
      alert('មានបញ្ហាក្នុងការបង្កើត Excel ជាបណ្តុំ។');
    } finally {
      setIsExportingExcel(false);
      setExcelProgress(null);
    }
  };

  // Open Goal Setting Modal
  const handleOpenGoalModal = () => {
    if (!activeStudent) return;
    const existing = studyPlansMap[activeStudent.id] || {};
    // Deep clone to isolate form state
    const cloned: Record<string, SubjectPlanTarget> = {};
    STUDY_PLAN_SUBJECTS.forEach((sub) => {
      cloned[sub.id] = {
        initial: existing[sub.id]?.initial || '',
        plan: { ...(existing[sub.id]?.plan || {}) },
        end_plan: existing[sub.id]?.end_plan || '',
      };
    });
    setEditingTargets(cloned);
    setGoalFeedback(null);
    setIsGoalModalOpen(true);
  };

  // Save Goal Settings
  const handleSaveGoals = async () => {
    if (!activeStudent || !classInfo.id) return;
    setIsSavingGoals(true);
    setGoalFeedback(null);

    const yearId = academicYearId || classInfo.academic_year_id || '';
    const res = await saveStudentStudyPlanAction({
      student_id: activeStudent.id,
      class_id: classInfo.id,
      academic_year_id: yearId,
      subject_targets: editingTargets,
    });

    setIsSavingGoals(false);
    if (res.success) {
      // Update local state immediately for instant preview reflection
      setStudyPlansMap((prev) => ({
        ...prev,
        [activeStudent.id]: editingTargets,
      }));
      setGoalFeedback({
        type: 'success',
        message: 'ផែនការសិក្សាត្រូវបានរក្សាទុកជាជោគជ័យ!',
      });
      setTimeout(() => {
        setIsGoalModalOpen(false);
      }, 1000);
    } else if (res.warning) {
      // Graceful fallback: Still update local state for preview/print
      setStudyPlansMap((prev) => ({
        ...prev,
        [activeStudent.id]: editingTargets,
      }));
      setGoalFeedback({
        type: 'warning',
        message: `${res.warning} (ទិន្នន័យត្រូវបានបង្ហាញលើផ្ទាំង Preview បណ្តោះអាសន្ន)`,
      });
    } else {
      setGoalFeedback({
        type: 'error',
        message: res.error || 'បរាជ័យក្នុងការរក្សាទុកផែនការសិក្សា',
      });
    }
  };

  // Quick Preset Helper: Fill all months of a subject or all subjects
  const handleQuickFillAll = (letter: string) => {
    setEditingTargets((prev) => {
      const next: Record<string, SubjectPlanTarget> = {};
      STUDY_PLAN_SUBJECTS.forEach((sub) => {
        const planObj: Record<string, string> = {};
        STUDY_PLAN_MONTHS.forEach((m) => {
          planObj[m.id] = letter;
        });
        next[sub.id] = {
          initial: prev[sub.id]?.initial || letter,
          plan: planObj,
          end_plan: letter,
        };
      });
      return next;
    });
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20 print:p-0 print:m-0 print:pb-0">
      {/* ----------------- GLOBAL PRINT STYLES ----------------- */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm !important;
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
                  បង្កើត និងបោះពុម្ពឯកសារផែនការសិក្សារបស់សិស្សតាមទម្រង់ផ្លូវការរបស់សាលា
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
            {/* Goal Setting Button */}
            <button
              onClick={handleOpenGoalModal}
              disabled={!activeStudent}
              className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-black rounded-xl shadow-2xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="កំណត់កម្រិតពិន្ទុគ្រោងសម្រាប់សិស្សនេះ"
            >
              <Target className="w-4 h-4 text-amber-700" />
              <span>កំណត់ផែនការគ្រោង (Edit Goals)</span>
            </button>

            {/* Single Print */}
            <button
              onClick={handlePrintSingle}
              disabled={isPreparingPrint || !activeStudent}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black rounded-xl shadow-2xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>បោះពុម្ពសិស្សនេះ</span>
            </button>

            {/* Single PDF */}
            <button
              onClick={handleExportSinglePdf}
              disabled={isExportingPdf || !activeStudent}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black rounded-xl shadow-2xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isExportingPdf && !exportProgress ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : (
                <Download className="w-4 h-4 text-slate-500" />
              )}
              <span>ទាញយក PDF សិស្សនេះ</span>
            </button>

            {/* Single Excel */}
            <button
              onClick={handleExportSingleExcel}
              disabled={isExportingExcel || !activeStudent}
              className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs font-black rounded-xl shadow-2xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="ទាញយកឯកសារ Excel (.xlsx) សម្រាប់សិស្សនេះ"
            >
              {isExportingExcel && !excelProgress ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              )}
              <span>ទាញយក Excel សិស្សនេះ</span>
            </button>

            {/* Batch Print */}
            <button
              onClick={handlePrintBatch}
              disabled={isPreparingPrint || selectedStudents.length === 0}
              className="px-4 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>បោះពុម្ពទាំងថ្នាក់ ({toKhmerDigits(selectedStudents.length)})</span>
            </button>

            {/* Batch PDF */}
            <button
              onClick={handleExportBatchPdf}
              disabled={isExportingPdf || selectedStudents.length === 0}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {exportProgress ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Download className="w-4 h-4 text-white" />
              )}
              <span>
                {exportProgress
                  ? `កំពុងដំណើរការ (${exportProgress.current}/${exportProgress.total})`
                  : `ទាញយក PDF ទាំងថ្នាក់ (${toKhmerDigits(selectedStudents.length)})`}
              </span>
            </button>

            {/* Batch Excel */}
            <button
              onClick={handleExportBatchExcel}
              disabled={isExportingExcel || selectedStudents.length === 0}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="ទាញយកសៀវភៅ Excel (.xlsx) ទាំងថ្នាក់ ដែលមានសន្លឹកកិច្ចការដាច់ដោយឡែកសម្រាប់សិស្សម្នាក់ៗ"
            >
              {excelProgress ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-white" />
              )}
              <span>
                {excelProgress
                  ? `កំពុងបង្កើត Excel (${excelProgress.current}/${excelProgress.total})`
                  : `ទាញយក Excel ទាំងថ្នាក់ (${toKhmerDigits(selectedStudents.length)})`}
              </span>
            </button>
          </div>
        </div>

        {/* Date of Issue Config Bar */}
        <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-600">កាលបរិច្ឆេទចេញឯកសារ៖</span>
            <input
              type="text"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-800 text-xs w-72 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="កាលបរិច្ឆេទ..."
            />
          </div>
          <p className="text-[11px] font-semibold text-slate-500">
            * គន្លឹះ៖ ពិន្ទុជាក់ស្តែង (ក្រហម) នឹងទាញយកដោយស្វ័យប្រវត្តិតាមរយៈពិន្ទុដែលបានចេញផ្សាយក្នុងម៉ូឌុលពិន្ទុ
          </p>
        </div>
      </div>

      {/* ----------------- MAIN WORKSPACE (SIDEBAR + PREVIEW) ----------------- */}
      <div className="print:hidden grid grid-cols-12 gap-6 items-start">
        {/* Left Side: Student Roster Sidebar (Col 12 on mobile, 4 on lg) */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 space-y-3">
          {/* Search Box & Select All */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ស្វែងរកតាមឈ្មោះ ឬអត្តលេខ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center justify-between px-1 text-xs">
              <button
                onClick={handleToggleSelectAll}
                className="font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
              >
                {selectedIds.size === students.length ? (
                  <CheckSquare className="w-4 h-4 text-[#155EEF]" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>
                  {selectedIds.size === students.length
                    ? 'ដោះការជ្រើសរើសទាំងអស់'
                    : 'ជ្រើសរើសទាំងអស់'}
                </span>
              </button>
              <span className="font-extrabold text-slate-400 text-[11px]">
                បានជ្រើស {toKhmerDigits(selectedIds.size)} / {toKhmerDigits(students.length)}
              </span>
            </div>
          </div>

          {/* Student Cards List */}
          <div className="space-y-1 max-h-[640px] overflow-y-auto pr-1">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400">
                រកមិនឃើញសិស្សទេ
              </div>
            ) : (
              filteredStudents.map((std, idx) => {
                const isActive = std.id === activeStudentId;
                const isSelected = selectedIds.has(std.id);
                const hasPlan = !!studyPlansMap[std.id];

                return (
                  <div
                    key={std.id}
                    onClick={() => setActiveStudentId(std.id)}
                    className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      isActive
                        ? 'bg-blue-50/70 border-blue-200 shadow-2xs'
                        : 'bg-white hover:bg-slate-50/80 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Checkbox for batch */}
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
                      <div className="w-8 h-10 rounded-xs border border-slate-200 overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center relative">
                        {std.photo_url ? (
                          <img
                            src={std.photo_url}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.thumb-fallback');
                              if (fallback) (fallback as HTMLElement).style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`thumb-fallback w-full h-full flex items-center justify-center ${std.photo_url ? 'hidden' : 'flex'}`}>
                          <User className="w-4 h-4 text-slate-300" />
                        </div>
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
                          {hasPlan && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 font-bold">មានផែនការ</span>
                            </>
                          )}
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
                  planTargets={studyPlansMap[activeStudent.id] || {}}
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

      {/* ----------------- GOAL SETTING MODAL ----------------- */}
      {isGoalModalOpen && activeStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-600" />
                  <span>កំណត់កម្រិតពិន្ទុគ្រោង ៖ {activeStudent.full_name}</span>
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  ថ្នាក់ទី {toKhmerDigits(classInfo.name)} • ជ្រើសរើសកម្រិតនិទ្ទេសគ្រោង (A ដល់ F) សម្រាប់ខែនីមួយៗ
                </p>
              </div>

              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Quick Presets Bar */}
            <div className="px-6 py-2.5 bg-amber-50/60 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-amber-900">បំពេញស្វ័យប្រវត្តិកម្រិតគ្រោង៖</span>
                {['B', 'C', 'D'].map((ltr) => (
                  <button
                    key={ltr}
                    type="button"
                    onClick={() => handleQuickFillAll(ltr)}
                    className="px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    កំណត់ទាំងអស់ {ltr}
                  </button>
                ))}
              </div>

              <span className="text-[11px] font-semibold text-amber-700">
                * កម្រិតគ្រោងនឹងបង្ហាញលើជួរឈរខ្មៅ (គ្រោង) នៃឯកសារ
              </span>
            </div>

            {/* Modal Feedback Banner */}
            {goalFeedback && (
              <div
                className={`px-6 py-2.5 text-xs font-bold flex items-center gap-2 ${
                  goalFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100'
                    : goalFeedback.type === 'warning'
                    ? 'bg-amber-50 text-amber-800 border-b border-amber-100'
                    : 'bg-rose-50 text-rose-800 border-b border-rose-100'
                }`}
              >
                {goalFeedback.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{goalFeedback.message}</span>
              </div>
            )}

            {/* Modal Table Body */}
            <div className="p-6 overflow-y-auto overflow-x-auto flex-1">
              <table className="w-full border-collapse border border-slate-200 text-xs font-semibold text-center">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold">
                    <th className="border border-slate-200 p-2 text-left w-28">មុខវិជ្ជា</th>
                    <th className="border border-slate-200 p-2 w-20">ដើមឆ្នាំ</th>
                    {STUDY_PLAN_MONTHS.map((m) => (
                      <th key={m.id} className="border border-slate-200 p-1 w-14">
                        {m.shortLabel}
                      </th>
                    ))}
                    <th className="border border-slate-200 p-2 w-20">ចុងឆ្នាំ</th>
                  </tr>
                </thead>
                <tbody>
                  {STUDY_PLAN_SUBJECTS.map((sub) => {
                    const currentTarget = editingTargets[sub.id] || {};
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/80">
                        {/* Subject Name */}
                        <td className="border border-slate-200 p-2 text-left font-bold text-slate-900">
                          {sub.label}
                        </td>

                        {/* Beginning of Year Initial Goal */}
                        <td className="border border-slate-200 p-1">
                          <select
                            value={currentTarget.initial || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingTargets((prev) => ({
                                ...prev,
                                [sub.id]: {
                                  ...(prev[sub.id] || {}),
                                  initial: val,
                                },
                              }));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1 text-center font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {GRADE_LETTER_OPTIONS.map((g) => (
                              <option key={g} value={g}>
                                {g || '-'}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 10 Monthly Plan Goals */}
                        {STUDY_PLAN_MONTHS.map((m) => {
                          const monthVal = currentTarget.plan?.[m.id] || '';
                          return (
                            <td key={m.id} className="border border-slate-200 p-1">
                              <select
                                value={monthVal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditingTargets((prev) => ({
                                    ...prev,
                                    [sub.id]: {
                                      ...(prev[sub.id] || {}),
                                      plan: {
                                        ...(prev[sub.id]?.plan || {}),
                                        [m.id]: val,
                                      },
                                    },
                                  }));
                                }}
                                className={`w-full border rounded-lg p-1 text-center font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                  monthVal
                                    ? 'bg-blue-50 text-blue-900 border-blue-200'
                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                              >
                                {GRADE_LETTER_OPTIONS.map((g) => (
                                  <option key={g} value={g}>
                                    {g || '-'}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        })}

                        {/* End of Year Plan Goal */}
                        <td className="border border-slate-200 p-1">
                          <select
                            value={currentTarget.end_plan || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingTargets((prev) => ({
                                ...prev,
                                [sub.id]: {
                                  ...(prev[sub.id] || {}),
                                  end_plan: val,
                                },
                              }));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1 text-center font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {GRADE_LETTER_OPTIONS.map((g) => (
                              <option key={g} value={g}>
                                {g || '-'}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                ការកែប្រែនឹងត្រូវរក្សាទុកក្នុងប្រព័ន្ធ និងបង្ហាញលើឯកសារភ្លាមៗ
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="button"
                  onClick={handleSaveGoals}
                  disabled={isSavingGoals}
                  className="px-5 py-2 bg-[#155EEF] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingGoals ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>រក្សាទុកផែនការ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                planTargets={studyPlansMap[activeStudent.id] || {}}
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
                planTargets={studyPlansMap[std.id] || {}}
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
          <div key={`pdf-${std.id}`} className="w-[1122px] min-h-[765px] bg-white mb-8 overflow-hidden">
            <StudentStudyPlanDocument
              student={std}
              classInfo={classInfo}
              academicYearName={academicYearName}
              schoolInfo={schoolInfo}
              teacherInfo={teacherInfo}
              gradesData={gradesData}
              planTargets={studyPlansMap[std.id] || {}}
              issueDateText={issueDate}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
