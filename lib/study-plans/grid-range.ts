import { parseClipboard } from '../students/grid';
import type { GradeLetter } from '@/app/(dashboard)/homeroom/student-study-plans/types';

export interface RangeStudent { id: string; full_name: string; student_id_number?: string | null }
export interface RangeSubject { id: string; label: string }
export interface RangeChange {
  studentId: string; studentName: string; studentIdNumber?: string | null;
  subjectId: string; subjectLabel: string; oldGrade: string; newGrade: GradeLetter;
  sourceRow: number; raw: string; isOfficialLocked: boolean;
}

/** Coordinates are the visible roster captured at paste time, never an identity inference. */
export function previewGradeRange(text: string, students: RangeStudent[], subjects: RangeSubject[],
  start: { row: number; column: number }, read: (studentId: string, subjectId: string) => string,
  locked: (studentId: string, subjectId: string) => boolean) {
  if (text.length > 2_000_000) throw new Error('ទិន្នន័យធំពេក។ សូមចម្លងតែថ្នាក់នេះ។');
  const rows = parseClipboard(text);
  const errors: string[] = [], changes: RangeChange[] = [];
  if (rows.length > 120 || rows.some(row => row.length > subjects.length)) errors.push('ទិន្នន័យលើសទំហំតារាង។ សូមចម្លងម្ដងទៀត។');
  if (!Number.isInteger(start.row) || !Number.isInteger(start.column) || start.row < 0 || start.column < 0 || start.row >= students.length || start.column >= subjects.length) errors.push('សូមជ្រើសក្រឡាចាប់ផ្ដើមម្ដងទៀត។');
  if (new Set(students.map(student => student.id)).size !== students.length) errors.push('បញ្ជីសិស្សស្ទួន។ សូមបើកតារាងម្ដងទៀត។');
  if (errors.length) return { rows: rows.length, changes, errors, matched: 0 };
  const matched = new Set<string>();
  rows.forEach((row, r) => row.forEach((raw, c) => {
    const student = students[start.row + r], subject = subjects[start.column + c];
    // Even blank cells outside the rectangle must not be silently truncated.
    if (!student || !subject) { errors.push(`ជួរ ${r + 1} ជួរឈរ ${c + 1} លើសតារាង។`); return; }
    const value = raw.trim().toUpperCase();
    if (!value) return;
    matched.add(student.id);
    if (!/^[A-F]$/.test(value)) { errors.push(`ជួរ ${r + 1} · ${student.full_name} · ${subject.label}៖ «${raw}» ត្រូវប្រើ A–F។ ពិន្ទុលេខត្រូវប្រើការនាំចូលតេស្តដែលផ្ទៀងផ្ទាត់។`); return; }
    const isOfficialLocked = locked(student.id, subject.id);
    if (isOfficialLocked) errors.push(`${student.full_name} · ${subject.label}៖ ពិន្ទុផ្លូវការជាប់សោ។ សូមចម្លងជួរដែលអាចកែបាន។`);
    const oldGrade = read(student.id, subject.id);
    if (oldGrade !== value || isOfficialLocked) changes.push({ studentId: student.id, studentName: student.full_name,
      studentIdNumber: student.student_id_number, subjectId: subject.id, subjectLabel: subject.label,
      oldGrade, newGrade: value as GradeLetter, sourceRow: r + 1, raw, isOfficialLocked });
  }));
  return { rows: rows.length, changes, errors, matched: matched.size };
}

/** A null target lets Tab leave the grid naturally rather than trapping focus. */
export function nextEditableCell(row: number, column: number, rowCount: number, columnCount: number,
  direction: 'up' | 'down' | 'left' | 'right' | 'previous' | 'next', editable: (r: number, c: number) => boolean) {
  for (let attempts = 0; attempts < rowCount * columnCount; attempts++) {
    if (direction === 'next' || direction === 'previous') {
      const index = row * columnCount + column + (direction === 'next' ? 1 : -1);
      if (index < 0 || index >= rowCount * columnCount) return null;
      row = Math.floor(index / columnCount); column = index % columnCount;
    } else {
      row += direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
      column += direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
      if (row < 0 || column < 0 || row >= rowCount || column >= columnCount) return null;
    }
    if (editable(row, column)) return { row, column };
  }
  return null;
}
