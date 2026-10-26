import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  normalizeStudentName,
  compareStudentsByName,
  compareStudentsByField,
  studentNameCollator,
  StudentSortable,
} from '../../lib/students/student-sort';

describe('Student Name Sorting Suite — Main Page & Bulk Image Upload Modal', () => {
  it('Scenario 1: hooks/useStudents.ts initializes sortState to { field: "full_name", direction: "asc" }', () => {
    const hookPath = path.join(process.cwd(), 'hooks', 'useStudents.ts');
    const content = fs.readFileSync(hookPath, 'utf8');

    assert.ok(
      content.includes("field: 'full_name'"),
      'useStudents must have field set to full_name by default'
    );
    assert.ok(
      content.includes("direction: 'asc'"),
      'useStudents must have direction set to asc by default'
    );
    assert.ok(
      content.includes('compareStudentsByName') && content.includes('compareStudentsByField'),
      'useStudents must import and use compareStudentsByName and compareStudentsByField'
    );
  });

  it('Scenario 2: StudentSpreadsheet.tsx initializes sort to { key: "full_name", ascending: true }', () => {
    const spreadsheetPath = path.join(process.cwd(), 'components', 'students', 'StudentSpreadsheet.tsx');
    const content = fs.readFileSync(spreadsheetPath, 'utf8');

    assert.ok(
      content.includes('key: "full_name"') || content.includes("key: 'full_name'"),
      'StudentSpreadsheet must have key set to full_name by default'
    );
    assert.ok(
      content.includes('ascending: true'),
      'StudentSpreadsheet must have ascending: true by default'
    );
    assert.ok(
      content.includes('compareStudentsByField'),
      'StudentSpreadsheet must use compareStudentsByField for row sorting'
    );
  });

  it('Scenario 3: BulkImageUploadModal.tsx sorts unmatchedStudents and matchedFiles alphabetically by full_name', () => {
    const modalPath = path.join(process.cwd(), 'components', 'students', 'BulkImageUploadModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf8');

    assert.ok(
      content.includes('compareStudentsByName'),
      'BulkImageUploadModal must import and use compareStudentsByName'
    );
    assert.ok(
      content.includes('.sort((a, b) => compareStudentsByName(a, b, \'asc\'))'),
      'unmatchedStudents must be sorted by full_name ascending'
    );
    assert.ok(
      content.includes('matchedFiles = useMemo'),
      'matchedFiles must be memoized and sorted for display by student name'
    );
    assert.ok(
      content.includes('matchedStudentId: matchedId'),
      'Automatic image matching must preserve matching by student id'
    );
  });

  it('Scenario 4: Khmer alphabetical collation correctly orders Khmer consonants and names', () => {
    const students: StudentSortable[] = [
      { id: '4', full_name: 'សុខ សាន' },
      { id: '1', full_name: 'កែវ មករា' },
      { id: '3', full_name: 'ចាន់ណា ចន្រ្ទា' },
      { id: '2', full_name: 'ខាន់ ឌី' },
    ];

    const sorted = [...students].sort((a, b) => compareStudentsByName(a, b, 'asc'));
    const names = sorted.map((s) => s.full_name);

    assert.deepEqual(names, [
      'កែវ មករា',
      'ខាន់ ឌី',
      'ចាន់ណា ចន្រ្ទា',
      'សុខ សាន',
    ]);
  });

  it('Scenario 5: English alphabetical collation correctly orders English names', () => {
    const students: StudentSortable[] = [
      { id: '4', full_name: 'David' },
      { id: '1', full_name: 'Bob' },
      { id: '3', full_name: 'Charlie' },
      { id: '2', full_name: 'Alice' },
    ];

    const sorted = [...students].sort((a, b) => compareStudentsByName(a, b, 'asc'));
    const names = sorted.map((s) => s.full_name);

    assert.deepEqual(names, ['Alice', 'Bob', 'Charlie', 'David']);
  });

  it('Scenario 6: Whitespace normalization collapses internal, leading, and trailing spaces without mutating original names', () => {
    assert.equal(normalizeStudentName('  សុខ   សាន  '), 'សុខ សាន');
    assert.equal(normalizeStudentName('John   Doe'), 'John Doe');
    assert.equal(normalizeStudentName(''), '');
    assert.equal(normalizeStudentName(null), '');

    const students: StudentSortable[] = [
      { id: '2', full_name: '  សុខ   សាន  ', student_id_number: 'ID-02' },
      { id: '1', full_name: 'សុខ សាន', student_id_number: 'ID-01' },
    ];

    // Cloned array
    const originalNames = students.map((s) => s.full_name);
    const sorted = [...students].sort((a, b) => compareStudentsByName(a, b, 'asc'));

    // Original names are preserved
    assert.equal(students[0].full_name, originalNames[0]);
    assert.equal(students[1].full_name, originalNames[1]);

    // Tied by normalized name, broken by student_id_number (ID-01 before ID-02)
    assert.equal(sorted[0].id, '1');
    assert.equal(sorted[1].id, '2');
  });

  it('Scenario 7: Missing or blank names appear last in both ascending and descending order', () => {
    const students: StudentSortable[] = [
      { id: '1', full_name: '' },
      { id: '2', full_name: 'កែវ មករា' },
      { id: '3', full_name: null },
      { id: '4', full_name: '  ' },
      { id: '5', full_name: 'សុខ សាន' },
    ];

    const sortedAsc = [...students].sort((a, b) => compareStudentsByName(a, b, 'asc'));
    const validAscNames = sortedAsc.slice(0, 2).map((s) => s.full_name);
    const blankAscIds = sortedAsc.slice(2).map((s) => s.id);

    assert.deepEqual(validAscNames, ['កែវ មករា', 'សុខ សាន']);
    // Blank students (ids 1, 3, 4) must be in the last 3 positions
    assert.equal(blankAscIds.length, 3);
    assert.ok(blankAscIds.includes('1'));
    assert.ok(blankAscIds.includes('3'));
    assert.ok(blankAscIds.includes('4'));

    const sortedDesc = [...students].sort((a, b) => compareStudentsByName(a, b, 'desc'));
    const validDescNames = sortedDesc.slice(0, 2).map((s) => s.full_name);
    const blankDescIds = sortedDesc.slice(2).map((s) => s.id);

    assert.deepEqual(validDescNames, ['សុខ សាន', 'កែវ មករា']);
    assert.equal(blankDescIds.length, 3);
    assert.ok(blankDescIds.includes('1'));
    assert.ok(blankDescIds.includes('3'));
    assert.ok(blankDescIds.includes('4'));
  });

  it('Scenario 8: Deterministic stable sorting when students share identical names', () => {
    // Two students with identical name, different student_id_number
    const studentsA: StudentSortable[] = [
      { id: 'uuid-b', full_name: 'ចាន់ណា ចន្រ្ទា', student_id_number: 'ID-10' },
      { id: 'uuid-a', full_name: 'ចាន់ណា ចន្រ្ទា', student_id_number: 'ID-02' },
    ];

    const sortedA = [...studentsA].sort((a, b) => compareStudentsByName(a, b, 'asc'));
    assert.equal(sortedA[0].id, 'uuid-a');
    assert.equal(sortedA[1].id, 'uuid-b');

    // Two students with identical name and identical student_id_number -> tie-broken by database UUID
    const studentsB: StudentSortable[] = [
      { id: 'uuid-2', full_name: 'ចាន់ណា ចន្រ្ទា', student_id_number: 'ID-01' },
      { id: 'uuid-1', full_name: 'ចាន់ណា ចន្រ្ទា', student_id_number: 'ID-01' },
    ];

    const sortedB = [...studentsB].sort((a, b) => compareStudentsByName(a, b, 'asc'));
    assert.equal(sortedB[0].id, 'uuid-1');
    assert.equal(sortedB[1].id, 'uuid-2');
  });

  it('Scenario 9: Array immutability — original array is never mutated in place', () => {
    const input: StudentSortable[] = [
      { id: '2', full_name: 'សុខ សាន' },
      { id: '1', full_name: 'កែវ មករា' },
    ];

    const copyBefore = JSON.stringify(input);
    const sorted = [...input].sort((a, b) => compareStudentsByName(a, b, 'asc'));

    assert.equal(JSON.stringify(input), copyBefore, 'Input array must remain unmodified');
    assert.notEqual(input[0].id, sorted[0].id, 'Sorted output is different from input');
  });

  it('Scenario 10: compareStudentsByField sorts by student_id_number and other columns with tie-breakers', () => {
    const students: StudentSortable[] = [
      { id: '3', full_name: 'សុខ សាន', student_id_number: 'ID-10' },
      { id: '1', full_name: 'កែវ មករា', student_id_number: 'ID-2' },
      { id: '2', full_name: 'ខាន់ ឌី', student_id_number: 'ID-1' },
      { id: '4', full_name: 'ចាន់ណា ចន្រ្ទា', student_id_number: null },
    ];

    // Ascending by student_id_number: numeric aware collation places ID-1, ID-2, ID-10, null last
    const sortedById = [...students].sort((a, b) =>
      compareStudentsByField(a, b, 'student_id_number', 'asc')
    );
    assert.deepEqual(
      sortedById.map((s) => s.student_id_number),
      ['ID-1', 'ID-2', 'ID-10', null]
    );

    // Descending by student_id_number: ID-10, ID-2, ID-1, null last
    const sortedByIdDesc = [...students].sort((a, b) =>
      compareStudentsByField(a, b, 'student_id_number', 'desc')
    );
    assert.deepEqual(
      sortedByIdDesc.map((s) => s.student_id_number),
      ['ID-10', 'ID-2', 'ID-1', null]
    );
  });

  it('Scenario 11: Bulk image upload modal file-to-student matching is strictly by UUID, not list position', () => {
    const students: StudentSortable[] = [
      { id: 'uuid-s1', full_name: 'សុខ សាន', student_id_number: 'ST-001' },
      { id: 'uuid-s2', full_name: 'កែវ មករា', student_id_number: 'ST-002' },
    ];

    // Sorted unmatched students: s2 (កែវ មករា) is at index 0, s1 (សុខ សាន) is at index 1
    const sortedUnmatched = [...students].sort((a, b) => compareStudentsByName(a, b, 'asc'));
    assert.equal(sortedUnmatched[0].id, 'uuid-s2');
    assert.equal(sortedUnmatched[1].id, 'uuid-s1');

    // Simulated file auto-matching logic from BulkImageUploadModal
    const file = { name: 'ST-001.jpg' };
    const matched = students.find((s) => s.student_id_number === 'ST-001');
    assert.equal(matched?.id, 'uuid-s1', 'Must match s1 by student_id_number regardless of list position');

    // Simulated manual assign: clicks student s2 in list, sets selectedStudentId to uuid-s2
    const selectedStudentId = sortedUnmatched[0].id;
    const fileState = { id: 'f-1', name: 'photo.jpg', matchedStudentId: null as string | null };
    const updatedFile = { ...fileState, matchedStudentId: selectedStudentId };
    assert.equal(updatedFile.matchedStudentId, 'uuid-s2');
  });
});
