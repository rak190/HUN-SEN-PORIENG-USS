'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Classroom, Student } from '@/types';
import {
  STUDY_PLAN_SUBJECTS,
  STUDY_PLAN_MONTHS,
  SubjectPlanTarget,
  toKhmerDigits,
} from './StudentStudyPlanDocument';
import {
  GRADE_LETTERS,
  GradeLetter,
  resolveAuthoritativeGradeLetter,
  lookupScoreWithAliases,
  resolveSubjectMaxScore,
} from './types';
import { readStudyPlanPath } from '@/lib/study-plans/field-patches';
import { nextEditableCell, previewGradeRange } from '@/lib/study-plans/grid-range';
import { patchStudentStudyPlansAction } from './patch-actions';
import { buildStudyPlanPatches, type StudyPlansMap } from '@/lib/study-plans/field-patches';
import { parseSchoolPretestClipboard, type PretestPreview } from '@/lib/study-plans/pretest-import';
import SchoolPretestPasteControls from './SchoolPretestPasteControls';
import {
  X,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Search,
  ClipboardPaste,
  Lock,
  ArrowRight,
  CheckCircle2,
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
  saveAction?: typeof patchStudentStudyPlansAction;
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

export function toLatinDigits(str: string): string {
  if (!str) return '';
  const khmerNums = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  let result = str;
  khmerNums.forEach((kChar, idx) => {
    result = result.replaceAll(kChar, String(idx));
  });
  return result;
}

export interface PasteProposedChange {
  studentId: string;
  studentName: string;
  studentIdNumber?: string | null;
  subjectId: string;
  subjectLabel: string;
  oldGrade: string;
  newGrade: GradeLetter;
  isOfficialLocked: boolean;
  lockReason?: string;
  sourceRow?: number;
  raw?: string;
  maxScore?: number;
  match?: string;
}

export interface PastePreviewData {
  totalRows: number;
  matchedStudentsCount: number;
  unmatchedRowsCount: number;
  duplicateIdsCount: number;
  invalidValuesCount: number;
  lockedSkippedCount: number;
  proposedChanges: PasteProposedChange[];
  warnings: string[];
}

const EMPTY_PLANS: StudyPlansMap = {};
const EMPTY_GRADES: NonNullable<StudentStudyPlanGridModalProps['gradesData']> = [];

export default function StudentStudyPlanGridModal({
  isOpen,
  onClose,
  students,
  classInfo,
  academicYearId = '',
  academicYearName,
  gradesData = EMPTY_GRADES,
  currentStudyPlansMap,
  studyPlansMap,
  onSaveSuccess,
  saveAction = patchStudentStudyPlansAction,
}: StudentStudyPlanGridModalProps) {
  const activePlansMap = studyPlansMap || currentStudyPlansMap || EMPTY_PLANS;
  const [baselinePlans, setBaselinePlans] = useState<StudyPlansMap>(() => JSON.parse(JSON.stringify(activePlansMap)));
  const wasOpen = useRef(false);
  const saveBusy = useRef(false);
  const activeCell = useRef<{ row: number; column: number } | null>(null);
  const [fillSubject, setFillSubject] = useState('khmer');
  const [emptyOnly, setEmptyOnly] = useState(true);
  const [allowReplacement, setAllowReplacement] = useState(false);

  // Grid Mode: 'initial' (តេស្តដើមឆ្នាំ), 'expected' (លទ្ធផលរំពឹងទុក), 'actual' (ពិន្ទុជាក់ស្តែង)
  const [activeMode, setActiveMode] = useState<StudyPlanGridMode>('initial');

  // Selected Month for Modes B and C (default: nov / វិច្ឆិកា)
  const [selectedMonth, setSelectedMonth] = useState<string>('nov');
  const changeMode = (mode: StudyPlanGridMode) => {
    if (pastePreview || saveBusy.current) return;
    setActiveMode(mode);
    setSelectedMonth(month => month === 'end_plan' || month === 'end_actual' ? mode === 'actual' ? 'end_actual' : 'end_plan' : month);
    activeCell.current = null;
  };

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Working copy of study plans map: student_id -> Record<subject_id, SubjectPlanTarget>
  const [draftPlansMap, setDraftPlansMap] = useState<
    Record<string, Record<string, SubjectPlanTarget>>
  >(() => JSON.parse(JSON.stringify(activePlansMap)));


  // Save states
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Clipboard paste preview modal state
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);
  const [pastePreview, setPastePreview] = useState<PastePreviewData | null>(null);
  const [pasteText, setPasteText] = useState<string | null>(null);
  const [pasteBlocking, setPasteBlocking] = useState(true);
  const [saveConflicts, setSaveConflicts] = useState<NonNullable<Awaited<ReturnType<typeof patchStudentStudyPlansAction>>['conflicts']>>([]);

  // Month Clone state
  const [cloneTargetMonth, setCloneTargetMonth] = useState<string>('dec');

  // Re-sync draft plans if activePlansMap changes or modal opens
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setBaselinePlans(JSON.parse(JSON.stringify(activePlansMap)));
      setDraftPlansMap(JSON.parse(JSON.stringify(activePlansMap)));
      setFeedback(null);
      setPastePreview(null);
      setPasteText(null);
      setSaveConflicts([]);
      activeCell.current = null;
      setEmptyOnly(true);
      setAllowReplacement(false);
    }
    wasOpen.current = isOpen;
  }, [isOpen, activePlansMap]);

  const fieldPatches = useMemo(() => buildStudyPlanPatches(baselinePlans, draftPlansMap), [baselinePlans, draftPlansMap]);
  const changedKeys = useMemo(() => new Set(fieldPatches.map(patch => `${patch.studentId}:${patch.subjectId}:${patch.path}`)), [fieldPatches]);
  const currentPath = activeMode === 'initial' ? 'initial' : activeMode === 'expected' ? selectedMonth === 'end_plan' ? 'end_plan' : `plan.${selectedMonth}` : selectedMonth === 'end_actual' ? 'end_actual' : `actual.${selectedMonth}`;
  useEffect(() => {
    if (!isOpen || !fieldPatches.length) return;
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [isOpen, fieldPatches.length]);
  const closeGrid = () => {
    if (saveBusy.current) return;
    if (!fieldPatches.length || confirm('មានទិន្នន័យមិនទាន់រក្សាទុក។ តើចង់បោះបង់ការកែប្រែមែនទេ?')) onClose();
  };

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
    gradesData.forEach((g) => {
      if (g && g.student_id && g.period && g.scores) {
        if (!map[g.student_id]) map[g.student_id] = {};
        map[g.student_id][g.period] = g.scores;
      }
    });
    return map;
  }, [gradesData]);

  // Grade level number and max scores
  const gradeLevelNum = useMemo(() => {
    return parseInt(toLatinDigits(String(classInfo.grade || '')).replace(/[^0-9]/g, ''), 10) || 0;
  }, [classInfo.grade]);

  // Use the same curriculum/stream resolver as document rendering and official results.
  const getSubjectMaxScore = useCallback(
    (subId: string) => {
      const subject = STUDY_PLAN_SUBJECTS.find(subject => subject.id === subId);
      return resolveSubjectMaxScore(classInfo.grade, classInfo.track, subId, subject?.aliases, subject?.officialLabel, classInfo.curriculumSchema);
    },
    [classInfo.grade, classInfo.track, classInfo.curriculumSchema]
  );
  const isOfficialCell = (studentId: string, subjectId: string) => {
    const scores = publishedScoresByStudent[studentId]?.[selectedMonth === 'end_actual' ? 'annual' : selectedMonth];
    const subject = STUDY_PLAN_SUBJECTS.find(subject => subject.id === subjectId);
    const score = scores ? lookupScoreWithAliases(scores, subjectId, subject?.aliases) : null;
    return activeMode === 'actual' && score !== undefined && score !== null;
  };

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
      if (saveBusy.current || pastePreview) return;
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

    },
    [activeMode, selectedMonth, pastePreview, setDraftPlansMap]
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

    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const directions = { Enter: e.shiftKey ? 'up' : 'down', Tab: e.shiftKey ? 'previous' : 'next', ArrowDown: 'down', ArrowUp: 'up', ArrowLeft: 'left', ArrowRight: 'right' } as const;
    const direction = directions[e.key as keyof typeof directions];
    if (direction) {
      const next = nextEditableCell(studentIndex, subjectIndex, TOTAL_STUDENTS, TOTAL_SUBJECTS, direction,
        (row, column) => !isOfficialCell(filteredStudents[row].id, STUDY_PLAN_SUBJECTS[column].id));
      if (next) { e.preventDefault(); focusCell(next.row, next.column); }
      else if (e.key !== 'Tab') e.preventDefault();
      return;
    }

    // 7. Instant Grade Entry (A-F, a-f, or numeric 1-6)
    if (!isLocked && !e.ctrlKey && !e.metaKey) {
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
        const next = nextEditableCell(studentIndex, subjectIndex, TOTAL_STUDENTS, TOTAL_SUBJECTS, 'down',
          (row, column) => !isOfficialCell(filteredStudents[row].id, STUDY_PLAN_SUBJECTS[column].id));
        if (next) focusCell(next.row, next.column);
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

  // Empty-only fill is the default; existing grades need a separate explicit confirmation.
  const handleQuickFill = (grade: GradeLetter) => {
    if (saveBusy.current || pastePreview) return;
    const subjects = STUDY_PLAN_SUBJECTS.filter(subject => fillSubject === 'all' || subject.id === fillSubject);
    if (!confirm(emptyOnly ? 'បំពេញតែក្រឡាទទេក្នុងជម្រើសនេះ?' : 'ជំនួសនិទ្ទេសដែលមានស្រាប់ក្នុងជម្រើសនេះ?')) return;
    setDraftPlansMap(previous => {
      const next = { ...previous };
      for (const student of filteredStudents) {
        const record = { ...(next[student.id] || {}) };
        for (const subject of subjects) {
          if (isOfficialCell(student.id, subject.id)) continue;
          const target = record[subject.id] || {};
          if (emptyOnly && readStudyPlanPath(target, currentPath)) continue;
          const [field, month] = currentPath.split('.');
          record[subject.id] = field === 'plan' || field === 'actual'
            ? { ...target, [field]: { ...target[field], [month]: grade } }
            : { ...target, [field]: grade };
        }
        next[student.id] = record;
      }
      return next;
    });
    setFeedback({ type: 'warning', message: 'បានបំពេញទិន្នន័យព្រាង។ សូមពិនិត្យ ហើយរក្សាទុកទាំងអស់។' });
  };

  // Clone expected targets from selectedMonth to cloneTargetMonth
  const handleCloneMonthTargets = () => {
    if (saveBusy.current || pastePreview) return;
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
        `តើអ្នកចង់ចម្លងផែនការរំពឹងទុកពីខែ "${sourceLabel}" ទៅកាន់ខែ "${targetLabel}" សម្រាប់គ្រប់សិស្សមែនទេ?\n${emptyOnly ? 'បំពេញតែក្រឡាទទេ។' : 'និទ្ទេសដែលមានស្រាប់នឹងត្រូវជំនួស។'}`
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

          if (sourceGrade && (!emptyOnly || !subjectTarget.plan?.[cloneTargetMonth])) {
            subjectTarget.plan = {
              ...(subjectTarget.plan || {}),
              [cloneTargetMonth]: sourceGrade,
            };
            studentRecord[sub.id] = subjectTarget;
            clonedCount++;
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

  const openRangeReview = (text: string, start: { row: number; column: number }) => {
    try {
      const result = previewGradeRange(text, filteredStudents, STUDY_PLAN_SUBJECTS, start,
        (studentId, subjectId) => readStudyPlanPath(draftPlansMap[studentId]?.[subjectId], currentPath), isOfficialCell);
      setAllowReplacement(false);
      setPasteText(null);
      setPasteBlocking(result.errors.length > 0);
      setPastePreview({ totalRows: result.rows, matchedStudentsCount: result.matched, unmatchedRowsCount: 0,
        duplicateIdsCount: 0, invalidValuesCount: result.errors.length, lockedSkippedCount: result.changes.filter(change => change.isOfficialLocked).length,
        proposedChanges: result.changes, warnings: result.errors });
    } catch (error) { setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'ទិន្នន័យមិនត្រឹមត្រូវ' }); }
  };
  const openPasteReview = (text: string) => {
    try {
      parseSchoolPretestClipboard(text);
      setAllowReplacement(false);
      setPasteText(text);
      setPasteBlocking(true);
      setPastePreview({ totalRows: 0, matchedStudentsCount: 0, unmatchedRowsCount: 0, duplicateIdsCount: 0, invalidValuesCount: 0, lockedSkippedCount: 0, proposedChanges: [], warnings: [] });
    } catch (error) { setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Invalid clipboard' }); }
  };
  const handlePasteFromClipboard = async () => {
    if (saveBusy.current) return;
    try { openPasteReview(await navigator.clipboard.readText()); }
    catch { openPasteReview(''); }
  };
  const pasteCurrent = useMemo(() => Object.fromEntries(Object.entries(draftPlansMap).map(([studentId, targets]) => [studentId, Object.fromEntries(Object.entries(targets).map(([subjectId, target]) => [subjectId, { ...target, initial: activeMode === 'initial' ? target.initial : activeMode === 'expected' ? selectedMonth === 'end_plan' ? target.end_plan : target.plan?.[selectedMonth] : selectedMonth === 'end_actual' ? target.end_actual : target.actual?.[selectedMonth] }]))])), [draftPlansMap, activeMode, selectedMonth]);
  const receivePretestPreview = useCallback((preview: PretestPreview) => {
    setAllowReplacement(false);
    const blocked = preview.errors.length > 0 || preview.rows.some(row => !row.excluded && row.errors.length > 0);
    const proposedChanges: PasteProposedChange[] = preview.changes.map(change => {
      const subject = STUDY_PLAN_SUBJECTS.find(subject => subject.id === change.subjectId);
      const period = selectedMonth === 'end_actual' ? 'annual' : selectedMonth;
      const scores = publishedScoresByStudent[change.studentId]?.[period];
      const official = activeMode === 'actual' && scores ? lookupScoreWithAliases(scores, change.subjectId, subject?.aliases) : null;
      return { ...change, subjectLabel: subject?.label || change.subjectId, isOfficialLocked: official !== undefined && official !== null };
    });
    setPasteBlocking(blocked || proposedChanges.some(change => change.isOfficialLocked));
    setPastePreview({ totalRows: preview.rows.length, matchedStudentsCount: preview.matched, unmatchedRowsCount: preview.rows.filter(row => !row.excluded && !row.studentId).length, duplicateIdsCount: preview.duplicateRows, invalidValuesCount: preview.invalidScores, lockedSkippedCount: proposedChanges.filter(change => change.isOfficialLocked).length, proposedChanges, warnings: [...preview.errors, ...(proposedChanges.some(change => change.isOfficialLocked) ? ['ពិន្ទុផ្លូវការជាប់សោ។ សូមដកជួរដែលជាប់សោចេញពីការអនុវត្ត ឬចម្លងតែក្រឡាដែលអាចកែបាន។'] : [])] });
  }, [activeMode, selectedMonth, publishedScoresByStudent, setPastePreview, setPasteBlocking, setAllowReplacement]);

  // Confirm and apply paste preview proposed changes
  const handleConfirmPaste = () => {
    if (!pastePreview || pasteBlocking || saveBusy.current || (pastePreview.proposedChanges.some(change => !change.isOfficialLocked && change.oldGrade) && !allowReplacement)) return;

    const appliedCount = pastePreview.proposedChanges.filter(change => !change.isOfficialLocked).length;

    setDraftPlansMap((prev) => {
      const next = { ...prev };

      pastePreview.proposedChanges.forEach((change) => {
        if (change.isOfficialLocked) return; // Skip locked cells

        const studentRecord = { ...(next[change.studentId] || {}) };
        const subjectTarget = { ...(studentRecord[change.subjectId] || {}) };

        if (activeMode === 'initial') {
          subjectTarget.initial = change.newGrade;
        } else if (activeMode === 'expected') {
          if (selectedMonth === 'end_plan') {
            subjectTarget.end_plan = change.newGrade;
          } else {
            subjectTarget.plan = {
              ...(subjectTarget.plan || {}),
              [selectedMonth]: change.newGrade,
            };
          }
        } else {
          // activeMode === 'actual'
          if (selectedMonth === 'end_actual') {
            subjectTarget.end_actual = change.newGrade;
          } else {
            subjectTarget.actual = {
              ...(subjectTarget.actual || {}),
              [selectedMonth]: change.newGrade,
            };
          }
        }

        studentRecord[change.subjectId] = subjectTarget;
        next[change.studentId] = studentRecord;
      });

      return next;
    });

    setPastePreview(null);
    setPasteText(null);
    setClipboardNotice(
      `បានបញ្ចូល ${appliedCount} ក្រឡាពី Clipboard ដោយជោគជ័យ ${
        pastePreview.lockedSkippedCount > 0
          ? `(រំលងពិន្ទុផ្លូវការ ${pastePreview.lockedSkippedCount} ក្រឡា)`
          : ''
      }`
    );
  };

  // Save only changed student plans atomically via Server Action
  const handleSaveAll = async () => {
    if (saveBusy.current || pastePreview) return;
    const changedStudentIds = Array.from(
      new Set(fieldPatches.map(patch => patch.studentId))
    );

    if (fieldPatches.length === 0) {
      setFeedback({
        type: 'warning',
        message: 'មិនមានការផ្លាស់ប្តូរណាមួយត្រូវបានកែប្រែទេ (គ្មានទិន្នន័យត្រូវរក្សាទុក)',
      });
      return;
    }

    saveBusy.current = true;
    setIsSaving(true);
    setFeedback(null);

    try {
      const plansPayload = fieldPatches;
      const res = await saveAction({ class_id: classInfo.id, academic_year_id: academicYearId, patches: plansPayload });

      if (!res.success) {
        setSaveConflicts(res.conflicts || []);
        setFeedback({
          type: 'error',
          message: res.error || 'បរាជ័យក្នុងការរក្សាទុកទិន្នន័យ',
        });
        return;
      }

      setFeedback({
        type: 'success',
        message: `បានរក្សាទុកផែនការសិក្សាសម្រាប់សិស្ស ${res.count ?? changedStudentIds.length} នាក់ដោយជោគជ័យ!`,
      });

      const updatedMap = { ...activePlansMap, ...res.plans };
      setBaselinePlans(JSON.parse(JSON.stringify(updatedMap)));
      setSaveConflicts([]);
      setDraftPlansMap(updatedMap);
      onSaveSuccess(updatedMap);
    } catch (err) {
      console.error('Fatal error during batch save:', err);
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'មានបញ្ហាមិនរំពឹងទុកលើ Server',
      });
    } finally {
      saveBusy.current = false;
      setIsSaving(false);
    }
  };

  const reviewConflicts = () => {
    const baseline = structuredClone(baselinePlans), draft = structuredClone(draftPlansMap);
    for (const conflict of saveConflicts) {
      const student = students.find(student => student.id === conflict.studentId);
      const mine = fieldPatches.find(patch => patch.studentId === conflict.studentId && patch.subjectId === conflict.subjectId && patch.path === conflict.path)?.newGrade || '';
      const keepMine = confirm(`${student?.full_name || conflict.studentId} · ${conflict.subjectId} · ${conflict.path}\nនិទ្ទេសបច្ចុប្បន្ន៖ ${conflict.currentGrade || '-'}\nនិទ្ទេសអ្នក៖ ${mine || '-'}\nយល់ព្រម៖ រក្សានិទ្ទេសអ្នក / បោះបង់៖ ប្រើនិទ្ទេសបច្ចុប្បន្ន`);
      const write = (map: StudyPlansMap, value: string) => {
        const targets = map[conflict.studentId] ||= {};
        const target = targets[conflict.subjectId] ||= {};
        const [field, month] = conflict.path.split('.');
        if (field === 'plan' || field === 'actual') target[field] = { ...target[field], [month]: value };
        else target[field as 'initial' | 'end_plan' | 'end_actual'] = value;
      };
      write(baseline, conflict.currentGrade);
      if (!keepMine) write(draft, conflict.currentGrade);
    }
    setBaselinePlans(baseline); setDraftPlansMap(draft); setSaveConflicts([]);
    setFeedback({ type: 'warning', message: 'បានពិនិត្យការប៉ះទង្គិច។ សូមពិនិត្យតារាង ហើយចុចរក្សាទុកម្ដងទៀត។' });
  };

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="បញ្ចូលនិទ្ទេសទូទាំងថ្នាក់" onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); if (!pastePreview) void handleSaveAll(); } }} onPaste={event => { if (isSaving || pastePreview || (event.target instanceof HTMLElement && event.target.closest('input,textarea'))) return; event.preventDefault(); const text = event.clipboardData.getData('text/plain'); let table; try { table = parseSchoolPretestClipboard(text); } catch (error) { setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'ទិន្នន័យមិនត្រឹមត្រូវ' }); return; }
      if (activeCell.current && table.headerRow < 0 && event.target instanceof HTMLElement && event.target.closest('[data-grade-cell]')) openRangeReview(text, activeCell.current);
      else openPasteReview(text); }} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans">
        {/* ----------------- TOP MODAL HEADER ----------------- */}
        <div className="relative px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="pr-8">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-100 text-[#155EEF] flex items-center justify-center text-sm">
                🎯
              </span>
              <span>បញ្ចូលកម្រិតនិទ្ទេសផែនការសិក្សាទូទាំងថ្នាក់</span>
              <span className="shrink-0 whitespace-nowrap text-xs font-bold text-slate-400 bg-slate-200/60 px-2.5 py-0.5 rounded-lg font-sans">
                ថ្នាក់ទី {toKhmerDigits(classInfo.name)}
              </span>
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              ឆ្នាំសិក្សា {toKhmerDigits(academicYearName)} • ជ្រើសរើសរបៀបដើម្បីបញ្ចូលនិទ្ទេស (A ដល់ F) សម្រាប់សិស្សទាំងអស់
            </p>
          </div>

          <div className="absolute right-3 top-3 sm:right-6 sm:top-5 flex items-center gap-2">
            <button
              onClick={closeGrid}
              className="w-9 h-9 rounded-full bg-slate-200/70 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ----------------- MODE SELECTOR TABS ----------------- */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => changeMode('initial')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeMode === 'initial'
                  ? 'bg-[#155EEF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              ១. តេស្តដើមឆ្នាំ <span className="hidden sm:inline">(Pre-Test)</span>
            </button>

            <button
              type="button"
              onClick={() => changeMode('expected')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeMode === 'expected'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              ២. រំពឹងទុក <span className="hidden sm:inline">(Expected Targets)</span>
            </button>

            <button
              type="button"
              onClick={() => changeMode('actual')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeMode === 'actual'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              ៣. ជាក់ស្តែង <span className="hidden sm:inline">(Actual Results)</span>
            </button>
          </div>

          {/* Month Selector for Modes B and C */}
          {activeMode !== 'initial' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-extrabold text-slate-700">ខែវាយតម្លៃ៖</span>
              <select
                value={selectedMonth}
                aria-label="Assessment month"
                disabled={!!pastePreview || isSaving}
                onChange={(e) => { if (!pastePreview && !isSaving) { activeCell.current = null; setSelectedMonth(e.target.value); } }}
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
        <div className="px-3 sm:px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Quick Fill Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-slate-600">បំពេញលឿន៖</span>
            <select aria-label="Fill subject" value={fillSubject} onChange={event => setFillSubject(event.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold">
              <option value="all">គ្រប់មុខវិជ្ជា</option>{STUDY_PLAN_SUBJECTS.map(subject => <option key={subject.id} value={subject.id}>{subject.label}</option>)}
            </select>
            <label className="font-bold text-slate-600"><input type="checkbox" checked={emptyOnly} onChange={event => setEmptyOnly(event.target.checked)} /> បំពេញតែក្រឡាទទេ</label>
            {GRADE_LETTERS.map((ltr) => (
              <button
                key={ltr}
                type="button"
                onClick={() => handleQuickFill(ltr)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 font-black text-slate-800 text-xs transition-colors cursor-pointer flex items-center justify-center"
                disabled={isSaving || !!pastePreview}
                title={`បំពេញ ${ltr}`}
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
                disabled={!!pastePreview || isSaving}
                onChange={(e) => { activeCell.current = null; setSearchQuery(e.target.value); }}
                placeholder="ស្វែងរកសិស្ស..."
                className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold w-36 sm:w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        <p className="px-6 py-2 text-xs font-semibold text-slate-500 bg-white border-b border-slate-100">ចុចក្រឡាដើម្បីបញ្ចូលនិទ្ទេស · ចម្លងពី Excel ហើយចុច Ctrl+V · ក្រឡាទទេរក្សាទិន្នន័យចាស់</p>
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
            {saveConflicts.length > 0 && <button type="button" onClick={reviewConflicts} className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">ពិនិត្យការប៉ះទង្គិច ({saveConflicts.length})</button>}
          </div>
        )}

        {/* ----------------- MAIN SPREADSHEET TABLE VIEWPORT ----------------- */}
        <div className="flex-1 min-h-48 overflow-auto scroll-pl-[232px] sm:scroll-pl-[312px] scroll-pt-20 p-2 sm:p-6 bg-slate-50/50">
          <table className="w-full min-w-[1120px] table-fixed border-separate border-spacing-0 border border-slate-200 text-xs font-semibold text-center bg-white shadow-2xs">
            <colgroup><col className="w-8 sm:w-10" /><col className="w-18 sm:w-24" /><col className="w-32 sm:w-44" /><col className="w-14" />{STUDY_PLAN_SUBJECTS.map(subject => <col key={subject.id} />)}</colgroup>
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold sticky top-0 z-20 shadow-xs">
                <th className="border border-slate-200 p-2 sticky left-0 z-30 bg-slate-100 text-center">ល.រ</th>
                <th className="border border-slate-200 p-2 sticky left-8 sm:left-10 z-30 bg-slate-100 text-center">អត្តលេខ</th>
                <th className="border border-slate-200 p-2 sticky left-26 sm:left-34 z-30 bg-slate-100 text-left">គោត្តនាម និងនាម</th>
                <th className="border border-slate-200 p-2 w-14 text-center">ភេទ</th>
                {STUDY_PLAN_SUBJECTS.map((sub) => (
                  <th
                    key={sub.id}
                    className="border border-slate-200 p-2 text-center text-[#7030A0]"
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
                      <td className="border border-slate-200 p-1.5 sticky left-0 z-10 bg-white text-center text-slate-400 font-mono text-[11px]">
                        {toKhmerDigits(rIdx + 1)}
                      </td>

                      {/* Student ID Number */}
                      <td className="border border-slate-200 p-1.5 sticky left-8 sm:left-10 z-10 bg-white text-center font-mono font-bold text-slate-700 text-[11px]">
                        {student.student_id_number || '-'}
                      </td>

                      {/* Full Name */}
                      <td className="border border-slate-200 p-1.5 sticky left-26 sm:left-34 z-10 bg-white text-left font-bold text-slate-900">
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
                          const studentScores =
                            publishedScoresByStudent[student.id]?.[periodKey];
                          const publishedScore = studentScores
                            ? lookupScoreWithAliases(studentScores, sub.id)
                            : null;

                          if (publishedScore !== undefined && publishedScore !== null) {
                            cellValue = resolveAuthoritativeGradeLetter(
                              publishedScore,
                              classInfo.grade,
                              classInfo.track,
                              sub.id,
                              sub.aliases,
                              sub.officialLabel, classInfo.curriculumSchema
                            );
                            isLocked = true;
                            isOfficial = true;
                          } else {
                            cellValue =
                              selectedMonth === 'end_actual'
                                ? target.end_actual || ''
                                : target.actual?.[selectedMonth] || '';
                          }
                        }

                        const isChanged = changedKeys.has(`${student.id}:${sub.id}:${currentPath}`);

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
                                data-grade-cell="true"
                                aria-label={`${student.full_name} · ${sub.label}`}
                                onPointerDown={event => {
                                  // Click the grade to focus for typing/paste; the native arrow still opens the mouse dropdown.
                                  if (event.pointerType === 'mouse' && event.clientX < event.currentTarget.getBoundingClientRect().right - 20) {
                                    event.preventDefault();
                                    event.currentTarget.focus();
                                  }
                                }}
                                onFocus={() => { activeCell.current = { row: rIdx, column: cIdx }; }}
                                disabled={isSaving || !!pastePreview}
                                value={cellValue}
                                onChange={(e) => {
                                  handleUpdateGrade(student.id, sub.id, e.target.value);
                                  const next = nextEditableCell(rIdx, cIdx, filteredStudents.length, STUDY_PLAN_SUBJECTS.length, 'down', (row, column) => !isOfficialCell(filteredStudents[row].id, STUDY_PLAN_SUBJECTS[column].id));
                                  if (next && e.target.value) focusCell(next.row, next.column);
                                }}
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
              មិនទាន់រក្សាទុក <strong>{toKhmerDigits(fieldPatches.length)}</strong> ក្រឡា
            </span>
            <span>•</span>
            <span className="hidden sm:inline text-slate-400">
              ចុច <strong>1–6</strong> ឬ <strong>A–F</strong> ដើម្បីបញ្ចូលលឿន • ចុច <strong>Ctrl+S</strong> ដើម្បីរក្សាទុក
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={closeGrid}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              បោះបង់
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving || !!pastePreview || !fieldPatches.length}
              className="px-5 py-2 bg-[#155EEF] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? 'កំពុងរក្សាទុក…' : `រក្សាទុកទាំងអស់ (${toKhmerDigits(fieldPatches.length)})`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ----------------- PASTE PREVIEW & CONFIRMATION MODAL ----------------- */}
      {pastePreview && (
        <div role="dialog" aria-modal="true" aria-label="ពិនិត្យការផ្លាស់ប្តូរ Excel" className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-sm">
                    📋
                  </span>
                  <span>ផ្ទៀងផ្ទាត់ទិន្នន័យចម្លងពី Excel (Paste Review)</span>
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  ពិនិត្យមើលសិស្ស មុខវិជ្ជា និងនិទ្ទេសដែលបានរកឃើញមុនពេលបញ្ចូលទៅក្នុងតារាង
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPastePreview(null)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pasteText !== null && <SchoolPretestPasteControls
              text={pasteText}
              students={students}
              grade={gradeLevelNum}
              track={classInfo.track}
              className={classInfo.name}
              academicYear={academicYearName}
              current={pasteCurrent}
              initialMode={activeMode === 'initial'}
              onPreview={receivePretestPreview}
            />}
            {/* Summary statistics badges */}
            <div className="px-6 py-3 bg-slate-100/60 border-b border-slate-200 flex flex-wrap items-center gap-3 text-xs font-bold">
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-xl border border-blue-200">
                សិស្សផ្គូផ្គងបាន៖ {toKhmerDigits(pastePreview.matchedStudentsCount)} នាក់
              </span>
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl border border-emerald-200">
                ក្រឡានឹងកែប្រែ៖ {toKhmerDigits(pastePreview.proposedChanges.filter((c) => !c.isOfficialLocked).length)} ក្រឡា
              </span>
              {pastePreview.lockedSkippedCount > 0 && (
                <span className="bg-red-50 text-red-700 px-3 py-1 rounded-xl border border-red-200 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-red-600" />
                  <span>ពិន្ទុផ្លូវការជាប់សោ៖ {toKhmerDigits(pastePreview.lockedSkippedCount)}</span>
                </span>
              )}
              {pastePreview.unmatchedRowsCount > 0 && (
                <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-xl border border-amber-200">
                  ជួរមិនស្គាល់អត្តសញ្ញាណ៖ {toKhmerDigits(pastePreview.unmatchedRowsCount)}
                </span>
              )}
              {pastePreview.duplicateIdsCount > 0 && (
                <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-xl border border-purple-200">
                  អត្តលេខស្ទួន៖ {toKhmerDigits(pastePreview.duplicateIdsCount)}
                </span>
              )}
            </div>

            {/* Warnings list if any */}
            {pastePreview.warnings.length > 0 && (
              <div className="px-6 py-2.5 bg-amber-50/70 border-b border-amber-200 text-xs text-amber-800 space-y-1 max-h-24 overflow-y-auto">
                {pastePreview.warnings.map((w, wIdx) => (
                  <div key={wIdx} className="flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {pastePreview.proposedChanges.some(change => !change.isOfficialLocked && change.oldGrade) && <label className="px-6 py-3 text-xs font-bold text-amber-900 bg-amber-50"><input type="checkbox" checked={allowReplacement} onChange={event => setAllowReplacement(event.target.checked)} /> បញ្ជាក់ជំនួសនិទ្ទេសចាស់ ({pastePreview.proposedChanges.filter(change => !change.isOfficialLocked && change.oldGrade).length} ក្រឡា)</label>}
            {/* Proposed changes table */}
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full border-collapse border border-slate-200 text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2 text-center">ជួរ Excel</th>
                    <th className="p-2 text-left">ឈ្មោះសិស្ស</th>
                    <th className="p-2 text-center w-24">អត្តលេខ</th>
                    <th className="p-2 text-left w-28">មុខវិជ្ជា</th>
                    <th className="p-2 text-center w-20">និទ្ទេសចាស់</th>
                    <th className="p-2 text-center">ពិន្ទុដើម / អតិបរមា</th>
                    <th className="p-2 text-center w-10"></th>
                    <th className="p-2 text-center w-20">និទ្ទេសថ្មី</th>
                    <th className="p-2 text-center w-28">ស្ថានភាព</th>
                  </tr>
                </thead>
                <tbody>
                  {pastePreview.proposedChanges.slice(0, 100).map((change, cIdx) => (
                    <tr
                      key={cIdx}
                      className={`border-b border-slate-100 ${
                        change.isOfficialLocked ? 'bg-red-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-2 text-center text-slate-500">{change.sourceRow}</td>
                      <td className="p-2 font-bold text-slate-800">{change.studentName}</td>
                      <td className="p-2 text-center text-slate-500 font-mono">
                        {toKhmerDigits(change.studentIdNumber || '-')}
                      </td>
                      <td className="p-2 font-semibold text-slate-700">{change.subjectLabel}</td>
                      <td className="p-2 text-center text-slate-400 font-bold">{change.oldGrade || '-'}</td>
                      <td className="p-2 text-center text-slate-600">{change.raw} {change.maxScore ? `/ ${change.maxScore}` : ''}<br />{change.match}</td>
                      <td className="p-2 text-center text-slate-400">
                        <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                      </td>
                      <td className="p-2 text-center font-black text-blue-700">{change.newGrade}</td>
                      <td className="p-2 text-center">
                        {change.isOfficialLocked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-100/60 px-2 py-0.5 rounded-md">
                            <Lock className="w-3 h-3" />
                            <span>ជាប់សោ</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                            <Check className="w-3 h-3" />
                            <span>នឹងអនុវត្ត</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pastePreview.proposedChanges.length > 100 && (
                <p className="text-center text-xs text-slate-400 mt-3 font-semibold">
                  ... និងបង្ហាញ {toKhmerDigits(100)} ក្នុងចំណោម {toKhmerDigits(pastePreview.proposedChanges.length)} ការកែប្រែសរុប
                </p>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPastePreview(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                បោះបង់ (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmPaste}
                disabled={pasteBlocking || (pastePreview.proposedChanges.some(change => !change.isOfficialLocked && change.oldGrade) && !allowReplacement) || pastePreview.proposedChanges.filter((c) => !c.isOfficialLocked).length === 0}
                className="px-5 py-2 bg-[#155EEF] hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>
                  យល់ព្រមអនុវត្ត ({toKhmerDigits(pastePreview.proposedChanges.filter((c) => !c.isOfficialLocked).length)} ក្រឡា)
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
