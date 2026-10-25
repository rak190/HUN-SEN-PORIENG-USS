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
import {
  GRADE_LETTERS,
  GradeLetter,
  resolveAuthoritativeGradeLetter,
  lookupScoreWithAliases,
} from './types';
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
  const [pastePreview, setPastePreview] = useState<PastePreviewData | null>(null);

  // Month Clone state
  const [cloneTargetMonth, setCloneTargetMonth] = useState<string>('dec');

  // Re-sync draft plans if activePlansMap changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftPlansMap(JSON.parse(JSON.stringify(activePlansMap)));
      setChangedCells(new Set());
      setFeedback(null);
      setPastePreview(null);
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
            const studentScores = publishedScoresByStudent[student.id]?.[periodKey];
            const publishedScore = studentScores ? lookupScoreWithAliases(studentScores, sub.id) : null;
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

  // Fast Excel Clipboard Paste with Preview & Collision Safeguards
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

      // 1. Detect headers in first rows (0..2)
      let headerRowIndex = -1;
      const subjectColMap: Record<number, string> = {};

      for (let ri = 0; ri < Math.min(3, rows.length); ri++) {
        const row = rows[ri];
        let foundSubjects = 0;

        row.forEach((cell, ci) => {
          const normCell = cell.toLowerCase().replace(/\s+/g, '');
          const matchedSub = STUDY_PLAN_SUBJECTS.find(
            (s) =>
              normCell === s.id.toLowerCase() ||
              normCell === s.label.toLowerCase() ||
              normCell === s.officialLabel.toLowerCase() ||
              normCell.includes(s.label.toLowerCase()) ||
              normCell.includes(s.officialLabel.toLowerCase()) ||
              (s.aliases && s.aliases.some((a) => normCell.includes(a.toLowerCase())))
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

      // If no subject headers found, assume columns starting from 3 match canonical subject order
      if (headerRowIndex === -1 || Object.keys(subjectColMap).length === 0) {
        STUDY_PLAN_SUBJECTS.forEach((sub, sIdx) => {
          subjectColMap[3 + sIdx] = sub.id;
        });
      }

      const dataRows = headerRowIndex !== -1 ? rows.slice(headerRowIndex + 1) : rows;

      // 2. Build multi-key student lookup indices for this class
      const studentByUuid = new Map<string, Student>();
      const studentByIdNumber = new Map<string, Student>();
      const studentsByName = new Map<string, Student[]>();

      students.forEach((s) => {
        if (s.id) studentByUuid.set(s.id.toLowerCase().trim(), s);
        if (s.student_id_number) {
          const rawNum = s.student_id_number.trim().toLowerCase();
          const latinNum = toLatinDigits(rawNum);
          studentByIdNumber.set(rawNum, s);
          studentByIdNumber.set(latinNum, s);
        }
        if (s.full_name) {
          const nameKey = s.full_name.trim().toLowerCase();
          const list = studentsByName.get(nameKey) || [];
          list.push(s);
          studentsByName.set(nameKey, list);
        }
      });

      const proposedChanges: PasteProposedChange[] = [];
      const seenStudentIds = new Set<string>();
      let matchedStudentsCount = 0;
      let unmatchedRowsCount = 0;
      let duplicateIdsCount = 0;
      let invalidValuesCount = 0;
      let lockedSkippedCount = 0;
      const warnings: string[] = [];

      dataRows.forEach((row, rowIdx) => {
        // Find student identity in columns 0..3
        let matchedStudent: Student | undefined;

        // Step A: Explicit UUID check
        for (let ci = 0; ci < Math.min(4, row.length); ci++) {
          const val = row[ci]?.trim().toLowerCase();
          if (val && studentByUuid.has(val)) {
            matchedStudent = studentByUuid.get(val);
            break;
          }
        }

        // Step B: Unique Student ID Number check (supporting Khmer & Latin digits)
        if (!matchedStudent) {
          for (let ci = 0; ci < Math.min(4, row.length); ci++) {
            const rawVal = row[ci]?.trim();
            if (rawVal) {
              const latinVal = toLatinDigits(rawVal).toLowerCase();
              if (studentByIdNumber.has(latinVal)) {
                matchedStudent = studentByIdNumber.get(latinVal);
                break;
              }
              if (studentByIdNumber.has(rawVal.toLowerCase())) {
                matchedStudent = studentByIdNumber.get(rawVal.toLowerCase());
                break;
              }
            }
          }
        }

        // Step C: Name matching fallback (strictly unambiguous in this class)
        if (!matchedStudent) {
          for (let ci = 0; ci < Math.min(4, row.length); ci++) {
            const nameCandidate = row[ci]?.trim().toLowerCase();
            if (nameCandidate) {
              const matchedList = studentsByName.get(nameCandidate);
              if (matchedList && matchedList.length === 1) {
                matchedStudent = matchedList[0];
                break;
              } else if (matchedList && matchedList.length > 1) {
                warnings.push(
                  `ជួរទី ${rowIdx + 1}: ឈ្មោះ "${row[ci]}" មានសិស្សជាន់គ្នា ${matchedList.length} នាក់ - ត្រូវការអត្តលេខដើម្បីបញ្ជាក់`
                );
              }
            }
          }
        }

        if (!matchedStudent) {
          unmatchedRowsCount++;
          return;
        }

        if (seenStudentIds.has(matchedStudent.id)) {
          duplicateIdsCount++;
          warnings.push(
            `សិស្ស "${matchedStudent.full_name}" (អត្តលេខ: ${matchedStudent.student_id_number || '-'}) មានទិន្នន័យស្ទួនក្នុង Clipboard`
          );
        } else {
          seenStudentIds.add(matchedStudent.id);
          matchedStudentsCount++;
        }

        const studentRecord = draftPlansMap[matchedStudent.id] || {};

        // Iterate mapped subject columns
        Object.entries(subjectColMap).forEach(([colIdxStr, subId]) => {
          const colIdx = parseInt(colIdxStr, 10);
          const rawVal = row[colIdx];
          if (rawVal === undefined || rawVal === null) return;
          const trimmed = rawVal.trim();
          if (trimmed === '') return; // Do not silently erase with blank

          const valUpper = trimmed.toUpperCase();
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
          if (!canonicalGrade) {
            invalidValuesCount++;
            return;
          }

          const subMeta = STUDY_PLAN_SUBJECTS.find((s) => s.id === subId);
          const subjectLabel = subMeta?.label || subId;
          const currentTarget = studentRecord[subId] || {};

          let oldGrade = '';
          let isOfficialLocked = false;
          let lockReason: string | undefined;

          if (activeMode === 'initial') {
            oldGrade = currentTarget.initial || '';
          } else if (activeMode === 'expected') {
            oldGrade =
              selectedMonth === 'end_plan'
                ? currentTarget.end_plan || ''
                : currentTarget.plan?.[selectedMonth] || '';
          } else {
            // Mode C: Actuals - check if official published grade exists!
            const periodKey = selectedMonth === 'end_actual' ? 'annual' : selectedMonth;
            const studentScores = publishedScoresByStudent[matchedStudent.id]?.[periodKey];
            const publishedScore = studentScores ? lookupScoreWithAliases(studentScores, subId) : null;

            if (publishedScore !== null && publishedScore !== undefined) {
              isOfficialLocked = true;
              lockedSkippedCount++;
              oldGrade = resolveAuthoritativeGradeLetter(
                publishedScore,
                classInfo.grade,
                (classInfo as any).track,
                subId,
                subMeta?.aliases,
                subMeta?.officialLabel
              );
              lockReason = 'ពិន្ទុផ្លូវការបានចេញផ្សាយរួច (Published Official Result)';
            } else {
              oldGrade =
                selectedMonth === 'end_actual'
                  ? currentTarget.end_actual || ''
                  : currentTarget.actual?.[selectedMonth] || '';
            }
          }

          proposedChanges.push({
            studentId: matchedStudent.id,
            studentName: matchedStudent.full_name || '',
            studentIdNumber: matchedStudent.student_id_number,
            subjectId: subId,
            subjectLabel,
            oldGrade,
            newGrade: canonicalGrade,
            isOfficialLocked,
            lockReason,
          });
        });
      });

      if (proposedChanges.length === 0 && unmatchedRowsCount === 0) {
        alert('មិនមានទិន្នន័យត្រូវកែប្រែត្រូវបានរកឃើញក្នុង Clipboard ទេ។');
        return;
      }

      setPastePreview({
        totalRows: dataRows.length,
        matchedStudentsCount,
        unmatchedRowsCount,
        duplicateIdsCount,
        invalidValuesCount,
        lockedSkippedCount,
        proposedChanges,
        warnings,
      });
    } catch (err: any) {
      console.error('Error pasting from clipboard:', err);
      alert('មានបញ្ហាក្នុងការអាន Clipboard។ សូមពិនិត្យសិទ្ធិ Browser។');
    }
  };

  // Confirm and apply paste preview proposed changes
  const handleConfirmPaste = () => {
    if (!pastePreview) return;

    let appliedCount = 0;

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
        appliedCount++;

        setChangedCells((c) =>
          new Set(c).add(`${change.studentId}:${change.subjectId}:${activeMode}:${selectedMonth}`)
        );
      });

      return next;
    });

    setPastePreview(null);
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
    const changedStudentIds = Array.from(
      new Set(Array.from(changedCells).map((k) => k.split(':')[0]))
    );

    if (changedStudentIds.length === 0) {
      setFeedback({
        type: 'warning',
        message: 'មិនមានការផ្លាស់ប្តូរណាមួយត្រូវបានកែប្រែទេ (គ្មានទិន្នន័យត្រូវរក្សាទុក)',
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      // Build batch payload containing ONLY the modified students
      const plansPayload = changedStudentIds.map((studentId) => ({
        student_id: studentId,
        subject_targets: {
          ...(activePlansMap[studentId] || {}),
          ...(draftPlansMap[studentId] || {}),
        },
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
        message: `បានរក្សាទុកផែនការសិក្សាសម្រាប់សិស្ស ${plansPayload.length} នាក់ដោយជោគជ័យ!`,
      });

      setChangedCells(new Set());
      const updatedMap = {
        ...activePlansMap,
        ...draftPlansMap,
      };
      onSaveSuccess(updatedMap);
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
                          const studentScores =
                            publishedScoresByStudent[student.id]?.[periodKey];
                          const publishedScore = studentScores
                            ? lookupScoreWithAliases(studentScores, sub.id)
                            : null;

                          if (publishedScore !== undefined && publishedScore !== null) {
                            cellValue = resolveAuthoritativeGradeLetter(
                              publishedScore,
                              classInfo.grade,
                              (classInfo as any).track,
                              sub.id,
                              sub.aliases,
                              sub.officialLabel
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

      {/* ----------------- PASTE PREVIEW & CONFIRMATION MODAL ----------------- */}
      {pastePreview && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
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
                  <span>ពិន្ទុផ្លូវការជាប់សោ (រំលង)៖ {toKhmerDigits(pastePreview.lockedSkippedCount)}</span>
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

            {/* Proposed changes table */}
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full border-collapse border border-slate-200 text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2 text-left">ឈ្មោះសិស្ស</th>
                    <th className="p-2 text-center w-24">អត្តលេខ</th>
                    <th className="p-2 text-left w-28">មុខវិជ្ជា</th>
                    <th className="p-2 text-center w-20">និទ្ទេសចាស់</th>
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
                      <td className="p-2 font-bold text-slate-800">{change.studentName}</td>
                      <td className="p-2 text-center text-slate-500 font-mono">
                        {toKhmerDigits(change.studentIdNumber || '-')}
                      </td>
                      <td className="p-2 font-semibold text-slate-700">{change.subjectLabel}</td>
                      <td className="p-2 text-center text-slate-400 font-bold">{change.oldGrade || '-'}</td>
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
                disabled={pastePreview.proposedChanges.filter((c) => !c.isOfficialLocked).length === 0}
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
