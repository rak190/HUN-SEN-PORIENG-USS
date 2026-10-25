'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Classroom, Student } from '@/types';
import {
  STUDY_PLAN_SUBJECTS,
  STUDY_PLAN_MONTHS,
  SubjectPlanTarget,
  getGradeScoreBands,
  getSubjectGradeLetter,
  toKhmerDigits,
} from './StudentStudyPlanDocument';
import { GRADE_LETTERS, GradeLetter } from './types';
import { batchSaveStudentStudyPlansAction } from './actions';
import {
  X,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Search,
  ClipboardPaste,
  Sparkles,
  Copy,
  Lock,
  ArrowRight,
  Filter,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';

export type StudyPlanGridMode = 'initial' | 'expected' | 'actual';

interface StudentStudyPlanGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  classInfo: Classroom;
  academicYearId?: string;
  academicYearName: string;
  gradesData?: Array<{ period: string; scores: Record<string, number>; student_id?: string }>;
  currentStudyPlansMap?: Record<string, Record<string, SubjectPlanTarget>>;
  studyPlansMap?: Record<string, Record<string, SubjectPlanTarget>>;
  onSaveSuccess: (updatedMap: Record<string, Record<string, SubjectPlanTarget>>) => void;
}

const GRADE_OPTIONS: Array<{ value: GradeLetter | ''; label: string }> = [
  { value: '', label: '-' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
];

export default function StudentStudyPlanGridModal({
  isOpen,
  onClose,
  students,
  classInfo,
  academicYearId = '',
  academicYearName,
  gradesData = [],
  currentStudyPlansMap,
  studyPlansMap,
  onSaveSuccess,
}: StudentStudyPlanGridModalProps) {
  const activePlansMap = studyPlansMap || currentStudyPlansMap || {};

  // Grid Mode: 'initial' (តេស្តដើមឆ្នាំ), 'expected' (លទ្ធផលរំពឹងទុក), 'actual' (ពិន្ទុជាក់ស្តែង)
  const [activeMode, setActiveMode] = useState<StudyPlanGridMode>('initial');

  // Selected Month for Modes B and C (default: nov / វិច្ឆិកា)
  const [selectedMonth, setSelectedMonth] = useState<string>('nov');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Working copy of study plans map: student_id -> Record<subject_id, SubjectPlanTarget>
  const [draftPlansMap, setDraftPlansMap] = useState<
    Record<string, Record<string, SubjectPlanTarget>>
  >(() => JSON.parse(JSON.stringify(activePlansMap)));

  // Changed cells set: Set<`${student_id}:${subject_id}:${field_key}`>
  const [changedCells, setChangedCells] = useState<Set<string>>(new Set());

  // Save states
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Clipboard paste preview modal state
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);

  // Month Clone state
  const [cloneTargetMonth, setCloneTargetMonth] = useState<string>('dec');

  // Re-sync draft plans if activePlansMap changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftPlansMap(JSON.parse(JSON.stringify(activePlansMap)));
      setChangedCells(new Set());
      setFeedback(null);
    }
  }, [isOpen, activePlansMap]);

  // Filtered students by search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(q) ||
        s.student_id_number?.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Published scores lookup map: student_id -> period -> subject_id -> score
  const publishedScoresByStudent = useMemo(() => {
    const map: Record<string, Record<string, Record<string, number>>> = {};
    gradesData.forEach((g: any) => {
      if (g && g.student_id && g.period && g.scores) {
        if (!map[g.student_id]) map[g.student_id] = {};
        map[g.student_id][g.period] = g.scores;
      }
    });
    return map;
  }, [gradesData]);

  // Grade level number and max scores
  const gradeLevelNum = useMemo(() => {
    return parseInt(String(classInfo.grade || '12').replace(/[^0-9]/g, ''), 10) || 12;
  }, [classInfo.grade]);

  // Get canonical max score for a subject
  const getSubjectMaxScore = useCallback(
    (subId: string) => {
      if (gradeLevelNum === 10 && (subId === 'khmer' || subId === 'math')) return 150;
      if (gradeLevelNum >= 11 && (subId === 'khmer' || subId === 'math')) return 125;
      if (gradeLevelNum <= 9 && (subId === 'khmer' || subId === 'math')) return 100;
      return 50;
    },
    [gradeLevelNum]
  );

  // Cell ID generator for keyboard navigation
  const getCellId = (studentIndex: number, subjectIndex: number) => {
    return `grid-cell-${studentIndex}-${subjectIndex}`;
  };

  // Focus a specific cell
  const focusCell = (studentIndex: number, subjectIndex: number) => {
    const el = document.getElementById(getCellId(studentIndex, subjectIndex)) as HTMLElement | null;
    if (el) {
      el.focus();
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };

  // Update a single grade value in draft state
  const handleUpdateGrade = useCallback(
    (studentId: string, subjectId: string, value: string) => {
      const canonicalVal = (value || '').toUpperCase().trim();
      const validGrade = ['', 'A', 'B', 'C', 'D', 'E', 'F'].includes(canonicalVal)
        ? canonicalVal
        : '';

      setDraftPlansMap((prev) => {
        const studentRecord = prev[studentId] || {};
        const subjectTarget = studentRecord[subjectId] || {};

        let updatedTarget: SubjectPlanTarget;

        if (activeMode === 'initial') {
          updatedTarget = {
            ...subjectTarget,
            initial: validGrade,
          };
        } else if (activeMode === 'expected') {
          if (selectedMonth === 'end_plan') {
            updatedTarget = {
              ...subjectTarget,
              end_plan: validGrade,
            };
          } else {
            updatedTarget = {
              ...subjectTarget,
              plan: {
                ...(subjectTarget.plan || {}),
                [selectedMonth]: validGrade,
              },
            };
          }
        } else {
          // activeMode === 'actual'
          if (selectedMonth === 'end_actual') {
            updatedTarget = {
              ...subjectTarget,
              end_actual: validGrade,
            };
          } else {
            updatedTarget = {
              ...subjectTarget,
              actual: {
                ...(subjectTarget.actual || {}),
                [selectedMonth]: validGrade,
              },
            };
          }
        }

        return {
          ...prev,
          [studentId]: {
            ...studentRecord,
            [subjectId]: updatedTarget,
          },
        };
      });

      const cellKey = `${studentId}:${subjectId}:${activeMode}:${selectedMonth}`;
      setChangedCells((prev) => new Set(prev).add(cellKey));
    },
    [activeMode, selectedMonth]
  );

  // Keyboard navigation & instant grade shortcut handler
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLElement>,
    studentIndex: number,
    subjectIndex: number,
    studentId: string,
    subjectId: string,
    isLocked: boolean
  ) => {
    const TOTAL_STUDENTS = filteredStudents.length;
    const TOTAL_SUBJECTS = STUDY_PLAN_SUBJECTS.length; // 10

    // 1. Enter key: moves to next student (or previous with Shift)
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextStudent = e.shiftKey
        ? Math.max(0, studentIndex - 1)
        : Math.min(TOTAL_STUDENTS - 1, studentIndex + 1);
      focusCell(nextStudent, subjectIndex);
      return;
    }

    // 2. Tab key: moves to next subject (or previous with Shift)
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        if (subjectIndex > 0) {
          focusCell(studentIndex, subjectIndex - 1);
        } else if (studentIndex > 0) {
          focusCell(studentIndex - 1, TOTAL_SUBJECTS - 1);
        }
      } else {
        if (subjectIndex < TOTAL_SUBJECTS - 1) {
          focusCell(studentIndex, subjectIndex + 1);
        } else if (studentIndex < TOTAL_STUDENTS - 1) {
          focusCell(studentIndex + 1, 0);
        }
      }
      return;
    }

    // 3. Arrow Down
    if (e.key === 'ArrowDown') {
      if (e.altKey) return;
      e.preventDefault();
      focusCell(Math.min(TOTAL_STUDENTS - 1, studentIndex + 1), subjectIndex);
      return;
    }

    // 4. Arrow Up
    if (e.key === 'ArrowUp') {
      if (e.altKey) return;
      e.preventDefault();
      focusCell(Math.max(0, studentIndex - 1), subjectIndex);
      return;
    }

    // 5. Arrow Right
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusCell(studentIndex, Math.min(TOTAL_SUBJECTS - 1, subjectIndex + 1));
      return;
    }

    // 6. Arrow Left
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusCell(studentIndex, Math.max(0, subjectIndex - 1));
      return;
    }

    // 7. Instant Grade Entry (A-F, a-f, or numeric 1-6)
    if (!isLocked) {
      const keyUpper = e.key.toUpperCase();
      const gradeMap: Record<string, GradeLetter> = {
        A: 'A',
        B: 'B',
        C: 'C',
        D: 'D',
        E: 'E',
        F: 'F',
        '1': 'A',
        '2': 'B',
        '3': 'C',
        '4': 'D',
        '5': 'E',
        '6': 'F',
      };

      if (gradeMap[keyUpper]) {
        e.preventDefault();
        handleUpdateGrade(studentId, subjectId, gradeMap[keyUpper]);
        // Auto-advance down for fast column entry
        if (studentIndex < TOTAL_STUDENTS - 1) {
          focusCell(studentIndex + 1, subjectIndex);
        }
        return;
      }

      // Backspace / Delete: clears cell
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleUpdateGrade(studentId, subjectId, '');
        return;
      }
    }
  };

  // Quick fill all students with a specific grade for the current view
  const handleQuickFill = (grade: GradeLetter) => {
    if (!confirm(`តើអ្នកពិតជាចង់កំណត់និទ្ទេស "${grade}" សម្រាប់គ្រប់សិស្ស និងគ្រប់មុខវិជ្ជាក្នុងទិដ្ឋភាពនេះមែនទេ?`)) {
      return;
    }

    setDraftPlansMap((prev) => {
      const next = { ...prev };
      filteredStudents.forEach((student) => {
        const studentRecord = { ...(next[student.id] || {}) };

        STUDY_PLAN_SUBJECTS.forEach((sub) => {
          // If in actual mode and published grade exists, skip
          if (activeMode === 'actual') {
            const periodKey = selectedMonth === 'end_actual' ? 'annual' : selectedMonth;
            const publishedScore = publishedScoresByStudent[student.id]?.[periodKey]?.[sub.id];
            if (publishedScore !== undefined && publishedScore !== null) return;
          }

          const subjectTarget = { ...(studentRecord[sub.id] || {}) };

          if (activeMode === 'initial') {
            subjectTarget.initial = grade;
          } else if (activeMode === 'expected') {
            if (selectedMonth === 'end_plan') {
              subjectTarget.end_plan = grade;
            } else {
              subjectTarget.plan = {
                ...(subjectTarget.plan || {}),
                [selectedMonth]: grade,
              };
            }
          } else {
            if (selectedMonth === 'end_actual') {
              subjectTarget.end_actual = grade;
            } else {
              subjectTarget.actual = {
                ...(subjectTarget.actual || {}),
                [selectedMonth]: grade,
              };
            }
          }

          studentRecord[sub.id] = subjectTarget;
          setChangedCells((c) => new Set(c).add(`${student.id}:${sub.id}:${activeMode}:${selectedMonth}`));
        });

        next[student.id] = studentRecord;
      });

      return next;
    });

    setFeedback({
      type: 'success',
      message: `បានបំពេញនិទ្ទេស ${grade} សម្រាប់គ្រប់សិស្សក្នុងទិដ្ឋភាពបច្ចុប្បន្នដោយជោគជ័យ`,
    });
  };

  // Clone expected targets from selectedMonth to cloneTargetMonth
  const handleCloneMonthTargets = () => {
    if (selectedMonth === cloneTargetMonth) {
      alert('សូមជ្រើសរើសខែគោលដៅខុសពីខែបច្ចុប្បន្ន។');
      return;
    }

    const sourceLabel =
      STUDY_PLAN_MONTHS.find((m) => m.id === selectedMonth)?.label || selectedMonth;
    const targetLabel =
      STUDY_PLAN_MONTHS.find((m) => m.id === cloneTargetMonth)?.label || cloneTargetMonth;

    if (
      !confirm(
        `តើអ្នកចង់ចម្លងផែនការរំពឹងទុកពីខែ "${sourceLabel}" ទៅកាន់ខែ "${targetLabel}" សម្រាប់គ្រប់សិស្សមែនទេ?`
      )
    ) {
      return;
    }

    setDraftPlansMap((prev) => {
      const next = { ...prev };
      let clonedCount = 0;

      filteredStudents.forEach((student) => {
        const studentRecord = { ...(next[student.id] || {}) };

        STUDY_PLAN_SUBJECTS.forEach((sub) => {
          const subjectTarget = { ...(studentRecord[sub.id] || {}) };
          const sourceGrade = subjectTarget.plan?.[selectedMonth] || '';

          if (sourceGrade) {
            subjectTarget.plan = {
              ...(subjectTarget.plan || {}),
              [cloneTargetMonth]: sourceGrade,
            };
            studentRecord[sub.id] = subjectTarget;
            clonedCount++;
            setChangedCells((c) =>
              new Set(c).add(`${student.id}:${sub.id}:expected:${cloneTargetMonth}`)
            );
          }
        });

        next[student.id] = studentRecord;
      });

      setFeedback({
        type: 'success',
        message: `បានចម្លងផែនការ ${clonedCount} ក្រឡាពី ${sourceLabel} ទៅ ${targetLabel} ដោយជោគជ័យ`,
      });

      return next;
    });
  };

  // Fast Excel Clipboard Paste Listener
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        alert('មិនមានទិន្នន័យក្នុង Clipboard ទេ។ សូមចម្លងពី Excel ជាមុនសិន។');
        return;
      }

      const rows = text
        .trim()
        .split(/\r?\n/)
        .map((r) => r.split('\t').map((c) => c.trim()));

      if (rows.length === 0) return;

      // 1. Detect headers in first row or inspect data
      let headerRowIndex = -1;
      const subjectColMap: Record<number, string> = {};

      // Check rows 0..2 for subject headers
      for (let ri = 0; ri < Math.min(3, rows.length); ri++) {
        const row = rows[ri];
        let foundSubjects = 0;

        row.forEach((cell, ci) => {
          const normCell = cell.toLowerCase().replace(/\s+/g, '');
          const matchedSub = STUDY_PLAN_SUBJECTS.find(
            (s) =>
              normCell.includes(s.id) ||
              normCell.includes(s.label.toLowerCase()) ||
              normCell.includes(s.officialLabel.toLowerCase()) ||
              (s.aliases && s.aliases.some((a) => normCell.includes(a)))
          );

          if (matchedSub) {
            subjectColMap[ci] = matchedSub.id;
            foundSubjects++;
          }
        });

        if (foundSubjects >= 2) {
          headerRowIndex = ri;
          break;
        }
      }

      // If no subject headers found, assume columns starting from 3 or 4 match canonical subject order
      if (headerRowIndex === -1 || Object.keys(subjectColMap).length === 0) {
        STUDY_PLAN_SUBJECTS.forEach((sub, sIdx) => {
          // Heuristic: Col 0: ID/No, Col 1: Name, Col 2: Gender, Col 3..12: Subjects
          subjectColMap[3 + sIdx] = sub.id;
        });
      }

      const dataRows = headerRowIndex !== -1 ? rows.slice(headerRowIndex + 1) : rows;

      // Match student ID mapping
      const studentIdIndexMap = new Map<string, Student>();
      students.forEach((s) => {
        if (s.student_id_number) studentIdIndexMap.set(s.student_id_number.trim(), s);
        if (s.id) studentIdIndexMap.set(s.id.trim(), s);
      });

      let matchedStudentsCount = 0;
      let updatedCellsCount = 0;
      let invalidRowsCount = 0;

      setDraftPlansMap((prev) => {
        const next = { ...prev };

        dataRows.forEach((row) => {
          // Try to locate student in row: Col 0 or Col 1 or Col 2
          let matchedStudent: Student | undefined;

          for (let ci = 0; ci < Math.min(3, row.length); ci++) {
            const candidate = row[ci]?.trim();
            if (candidate && studentIdIndexMap.has(candidate)) {
              matchedStudent = studentIdIndexMap.get(candidate);
              break;
            }
          }

          // Fallback: match by full_name
          if (!matchedStudent) {
            for (let ci = 0; ci < Math.min(3, row.length); ci++) {
              const nameCandidate = row[ci]?.trim();
              if (nameCandidate) {
                const byName = students.filter(
                  (s) => s.full_name?.trim().toLowerCase() === nameCandidate.toLowerCase()
                );
                if (byName.length === 1) {
                  matchedStudent = byName[0];
                  break;
                }
              }
            }
          }

          if (!matchedStudent) {
            invalidRowsCount++;
            return;
          }

          matchedStudentsCount++;
          const studentRecord = { ...(next[matchedStudent.id] || {}) };

          // Iterate mapped subject columns
          Object.entries(subjectColMap).forEach(([colIdxStr, subId]) => {
            const colIdx = parseInt(colIdxStr, 10);
            const rawVal = row[colIdx];
            if (rawVal === undefined || rawVal === null) return;

            // Normalize grade letter
            const valUpper = rawVal.trim().toUpperCase();
            const gradeMap: Record<string, GradeLetter> = {
              A: 'A',
              B: 'B',
              C: 'C',
              D: 'D',
              E: 'E',
              F: 'F',
              '1': 'A',
              '2': 'B',
              '3': 'C',
              '4': 'D',
              '5': 'E',
              '6': 'F',
            };

            const canonicalGrade = gradeMap[valUpper];
            if (!canonicalGrade && valUpper !== '') return;

            const subjectTarget = { ...(studentRecord[subId] || {}) };

            if (activeMode === 'initial') {
              subjectTarget.initial = canonicalGrade || '';
            } else if (activeMode === 'expected') {
              if (selectedMonth === 'end_plan') {
                subjectTarget.end_plan = canonicalGrade || '';
              } else {
                subjectTarget.plan = {
                  ...(subjectTarget.plan || {}),
                  [selectedMonth]: canonicalGrade || '',
                };
              }
            } else {
              // activeMode === 'actual'
              if (selectedMonth === 'end_actual') {
                subjectTarget.end_actual = canonicalGrade || '';
              } else {
                subjectTarget.actual = {
                  ...(subjectTarget.actual || {}),
                  [selectedMonth]: canonicalGrade || '',
                };
              }
            }

            studentRecord[subId] = subjectTarget;
            updatedCellsCount++;
            setChangedCells((c) =>
              new Set(c).add(`${matchedStudent!.id}:${subId}:${activeMode}:${selectedMonth}`)
            );
          });

          next[matchedStudent.id] = studentRecord;
        });

        return next;
      });

      setClipboardNotice(
        `បានផ្គូផ្គងសិស្ស ${matchedStudentsCount} នាក់ និងកែប្រែ ${updatedCellsCount} ក្រឡាដោយជោគជ័យ ${
          invalidRowsCount > 0 ? `(រំលងជួរមិនស្គាល់អត្តលេខ ${invalidRowsCount})` : ''
        }`
      );
    } catch (err: any) {
      console.error('Error pasting from clipboard:', err);
      alert('មានបញ្ហាក្នុងការអាន Clipboard។ សូមពិនិត្យសិទ្ធិ Browser។');
    }
  };

  // Save all staged changes atomically via Server Action
  const handleSaveAll = async () => {
    setIsSaving(true);
    setFeedback(null);

    try {
      // Build batch payload of all students in class
      const plansPayload = students.map((s) => ({
        student_id: s.id,
        subject_targets: draftPlansMap[s.id] || {},
      }));

      const res = await batchSaveStudentStudyPlansAction({
        class_id: classInfo.id,
        academic_year_id: academicYearId,
        plans: plansPayload,
      });

      if (!res.success) {
        setFeedback({
          type: 'error',
          message: res.error || 'បរាជ័យក្នុងការរក្សាទុកទិន្នន័យ',
        });
        return;
      }

      setFeedback({
        type: 'success',
        message: `បានរក្សាទុកផែនការសិក្សាសម្រាប់សិស្ស ${res.count || plansPayload.length} នាក់ដោយជោគជ័យ!`,
      });

      setChangedCells(new Set());
      onSaveSuccess(draftPlansMap);
    } catch (err: any) {
      console.error('Fatal error during batch save:', err);
      setFeedback({
        type: 'error',
        message: err?.message || 'មានបញ្ហាមិនរំពឹងទុកលើ Server',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans">
        {/* ----------------- TOP MODAL HEADER ----------------- */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-100 text-[#155EEF] flex items-center justify-center text-sm">
                🎯
              </span>
              <span>បញ្ចូលកម្រិតនិទ្ទេសផែនការសិក្សាទូទាំងថ្នាក់</span>
              <span className="text-xs font-bold text-slate-400 bg-slate-200/60 px-2.5 py-0.5 rounded-lg font-sans">
                ថ្នាក់ទី {toKhmerDigits(classInfo.name)}
              </span>
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              ឆ្នាំសិក្សា {toKhmerDigits(academicYearName)} • ជ្រើសរើសរបៀបដើម្បីបញ្ចូលនិទ្ទេស (A ដល់ F) សម្រាប់សិស្សទាំងអស់
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-200/70 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ----------------- MODE SELECTOR TABS ----------------- */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveMode('initial')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeMode === 'initial'
                  ? 'bg-[#155EEF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              ១. តេស្តដើមឆ្នាំ (Pre-Test)
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('expected')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeMode === 'expected'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              ២. ផែនការរំពឹងទុក (Expected Targets)
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('actual')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeMode === 'actual'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              ៣. លទ្ធផលជាក់ស្តែង (Actual Results)
            </button>
          </div>

          {/* Month Selector for Modes B and C */}
          {activeMode !== 'initial' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-extrabold text-slate-700">ខែវាយតម្លៃ៖</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
              >
                {STUDY_PLAN_MONTHS.map((m) => (
                  <option key={m.id} value={m.id}>
                    ខែ {m.label}
                  </option>
                ))}
                {activeMode === 'expected' && (
                  <option value="end_plan">គ្រោងចុងឆ្នាំ (End of Year)</option>
                )}
                {activeMode === 'actual' && (
                  <option value="end_actual">លទ្ធផលជាក់ស្តែងចុងឆ្នាំ</option>
                )}
              </select>
            </div>
          )}
        </div>

        {/* ----------------- ACTION & QUICK TOOLS BAR ----------------- */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Quick Fill Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-slate-600">បំពេញលឿន៖</span>
            {GRADE_LETTERS.map((ltr) => (
              <button
                key={ltr}
                type="button"
                onClick={() => handleQuickFill(ltr)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 font-black text-slate-800 text-xs transition-colors cursor-pointer flex items-center justify-center"
                title={`កំណត់គ្រប់ក្រឡាជា ${ltr}`}
              >
                {ltr}
              </button>
            ))}

            {/* Mode B: Month Cloning */}
            {activeMode === 'expected' && selectedMonth !== 'end_plan' && (
              <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-200">
                <span className="font-extrabold text-purple-900">ចម្លងផែនការទៅ៖</span>
                <select
                  value={cloneTargetMonth}
                  onChange={(e) => setCloneTargetMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-bold"
                >
                  {STUDY_PLAN_MONTHS.filter((m) => m.id !== selectedMonth).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleCloneMonthTargets}
                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg font-bold text-xs cursor-pointer transition-colors"
                >
                  ចម្លង
                </button>
              </div>
            )}
          </div>

          {/* Right: Search & Excel Paste */}
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ស្វែងរកសិស្ស..."
                className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Excel Paste Button */}
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              title="បិទភ្ជាប់ទិន្នន័យពី Excel (Clipboard Paste)"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>បិទភ្ជាប់ Excel</span>
            </button>
          </div>
        </div>

        {/* ----------------- FEEDBACK & NOTICE BANNERS ----------------- */}
        {clipboardNotice && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {clipboardNotice}
            </span>
            <button
              onClick={() => setClipboardNotice(null)}
              className="text-emerald-700 hover:text-emerald-900"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {feedback && (
          <div
            className={`px-6 py-2.5 text-xs font-bold flex items-center gap-2 border-b ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                : feedback.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-100'
                : 'bg-rose-50 text-rose-800 border-rose-100'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* ----------------- MAIN SPREADSHEET TABLE VIEWPORT ----------------- */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50/50">
          <table className="w-full border-collapse border border-slate-200 text-xs font-semibold text-center bg-white shadow-2xs rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold sticky top-0 z-20 shadow-xs">
                <th className="border border-slate-200 p-2 w-10 text-center">ល.រ</th>
                <th className="border border-slate-200 p-2 w-24 text-center">អត្តលេខ</th>
                <th className="border border-slate-200 p-2 w-44 text-left">គោត្តនាម និងនាម</th>
                <th className="border border-slate-200 p-2 w-14 text-center">ភេទ</th>
                {STUDY_PLAN_SUBJECTS.map((sub, sIdx) => (
                  <th
                    key={sub.id}
                    className="border border-slate-200 p-2 w-16 text-center text-[#7030A0]"
                  >
                    <div>{sub.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      ({getSubjectMaxScore(sub.id)}ពិន្ទុ)
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={4 + STUDY_PLAN_SUBJECTS.length}
                    className="p-8 text-center text-slate-400 font-bold"
                  >
                    មិនមានទិន្នន័យសិស្សដែលត្រូវនឹងការស្វែងរកទេ
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, rIdx) => {
                  const studentRecord = draftPlansMap[student.id] || {};
                  const genderText =
                    student.gender === 'F' || student.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស';

                  return (
                    <tr key={student.id} className="hover:bg-blue-50/40 transition-colors">
                      {/* Index */}
                      <td className="border border-slate-200 p-1.5 text-center text-slate-400 font-mono text-[11px]">
                        {toKhmerDigits(rIdx + 1)}
                      </td>

                      {/* Student ID Number */}
                      <td className="border border-slate-200 p-1.5 text-center font-mono font-bold text-slate-700 text-[11px]">
                        {student.student_id_number || '-'}
                      </td>

                      {/* Full Name */}
                      <td className="border border-slate-200 p-1.5 text-left font-bold text-slate-900 truncate max-w-[170px]">
                        {student.full_name}
                      </td>

                      {/* Gender */}
                      <td className="border border-slate-200 p-1.5 text-center text-slate-600 text-[11px]">
                        {genderText}
                      </td>

                      {/* 10 Subject Input Cells */}
                      {STUDY_PLAN_SUBJECTS.map((sub, cIdx) => {
                        const target = studentRecord[sub.id] || {};
                        let cellValue = '';
                        let isLocked = false;
                        let isOfficial = false;

                        if (activeMode === 'initial') {
                          cellValue = target.initial || '';
                        } else if (activeMode === 'expected') {
                          cellValue =
                            selectedMonth === 'end_plan'
                              ? target.end_plan || ''
                              : target.plan?.[selectedMonth] || '';
                        } else {
                          // Mode C: Actuals
                          const periodKey =
                            selectedMonth === 'end_actual' ? 'annual' : selectedMonth;
                          const publishedScore =
                            publishedScoresByStudent[student.id]?.[periodKey]?.[sub.id];

                          if (publishedScore !== undefined && publishedScore !== null) {
                            const maxScore = getSubjectMaxScore(sub.id);
                            cellValue = getSubjectGradeLetter(publishedScore, maxScore, gradeLevelNum);
                            isLocked = true;
                            isOfficial = true;
                          } else {
                            cellValue =
                              selectedMonth === 'end_actual'
                                ? target.end_actual || ''
                                : target.actual?.[selectedMonth] || '';
                          }
                        }

                        const cellKey = `${student.id}:${sub.id}:${activeMode}:${selectedMonth}`;
                        const isChanged = changedCells.has(cellKey);

                        return (
                          <td
                            key={sub.id}
                            className={`border border-slate-200 p-1 text-center transition-colors ${
                              isOfficial
                                ? 'bg-red-50/70'
                                : isChanged
                                ? 'bg-amber-100/70'
                                : 'bg-white'
                            }`}
                          >
                            {isOfficial ? (
                              <div
                                className="w-full py-1 text-center font-black text-red-600 flex items-center justify-center gap-1 cursor-not-allowed"
                                title="ពិន្ទុផ្លូវការដែលបានចេញផ្សាយ (Official Published Grade)"
                              >
                                <span>{cellValue || '-'}</span>
                                <Lock className="w-3 h-3 text-red-400" />
                              </div>
                            ) : (
                              <select
                                id={getCellId(rIdx, cIdx)}
                                value={cellValue}
                                onChange={(e) =>
                                  handleUpdateGrade(student.id, sub.id, e.target.value)
                                }
                                onKeyDown={(e) =>
                                  handleCellKeyDown(e, rIdx, cIdx, student.id, sub.id, isLocked)
                                }
                                className={`w-full py-1 text-center font-bold text-xs rounded-lg border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-blue-50/90 ${
                                  cellValue
                                    ? activeMode === 'actual'
                                      ? 'text-red-700 border-red-200 italic font-semibold'
                                      : 'text-blue-900 border-blue-200 bg-blue-50/50'
                                    : 'text-slate-400 border-slate-200 bg-slate-50/40'
                                }`}
                              >
                                {GRADE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ----------------- MODAL BOTTOM BAR ----------------- */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-3">
            <span>
              សិស្សសរុប <strong>{toKhmerDigits(students.length)}</strong> នាក់
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              កែប្រែ <strong>{toKhmerDigits(changedCells.size)}</strong> ក្រឡា
            </span>
            <span>•</span>
            <span className="hidden sm:inline text-slate-400">
              ចុច <strong>1–6</strong> ឬ <strong>A–F</strong> ដើម្បីបញ្ចូលលឿន • ចុច <strong>Ctrl+S</strong> ដើម្បីរក្សាទុក
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              បោះបង់
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-5 py-2 bg-[#155EEF] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>រក្សាទុកទាំងអស់ ({toKhmerDigits(changedCells.size)})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
