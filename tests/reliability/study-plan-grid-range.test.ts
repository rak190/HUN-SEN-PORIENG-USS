import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewGradeRange, nextEditableCell } from '../../lib/study-plans/grid-range';
const students = [{ id: 'b', full_name: 'Second', student_id_number: '002' }, { id: 'a', full_name: 'First', student_id_number: '001' }];
const subjects = [{ id: 'khmer', label: 'Khmer' }, { id: 'math', label: 'Math' }];
test('rectangular and single-column paste captures displayed UUID destinations, preserves blanks and omits unchanged cells', () => {
  const review = previewGradeRange('A\t\n\tC', students, subjects, { row: 0, column: 0 }, () => 'B', () => false);
  assert.deepEqual(review.errors, []);
  assert.deepEqual(review.changes.map(c => [c.studentId, c.subjectId, c.oldGrade, c.newGrade]), [['b','khmer','B','A'], ['a','math','B','C']]);
  assert.deepEqual(previewGradeRange('A\nB', students, subjects, { row: 0, column: 1 }, () => 'A', () => false).changes.map(c => [c.studentId,c.subjectId]), [['a','math']]);
});
test('range review fails closed on numeric scores, bad grades, overflow including blanks, duplicate UUIDs and official cells', () => {
  for (const value of ['5', '៥', '90', 'G', 'A\nB\n', 'A\tB\t']) {
    const review = previewGradeRange(value, students, subjects, { row: 1, column: 1 }, () => '', () => false);
    assert.ok(review.errors.length, value);
  }
  assert.ok(previewGradeRange('A', students, subjects, { row: 0, column: 0 }, () => '', () => true).errors.length);
  assert.ok(previewGradeRange('A', [students[0],students[0]], subjects, { row: 0, column: 0 }, () => '', () => false).errors.length);
  assert.ok(previewGradeRange('A', students, subjects, { row: -1, column: 0 }, () => '', () => false).errors.length);
});
test('navigation skips official cells, respects axes and lets Tab leave the first/last editable cell', () => {
  const editable = (r: number, c: number) => !(r === 1 && c === 0);
  assert.deepEqual(nextEditableCell(0,0,3,2,'down',editable), {row:2,column:0});
  assert.deepEqual(nextEditableCell(0,1,3,2,'next',editable), {row:1,column:1});
  assert.deepEqual(nextEditableCell(2,0,3,2,'up',editable), {row:0,column:0});
  assert.equal(nextEditableCell(2,1,3,2,'next',editable), null);
  assert.equal(nextEditableCell(0,0,3,2,'previous',editable), null);
});

test('full 52-row range preview retains every destination UUID in the authoritative visible order', () => {
  const roster = Array.from({length:52}, (_,i) => ({id:`uuid-${52-i}`,full_name:`Student ${i}`}));
  const review = previewGradeRange(roster.map(()=> 'A\tB').join('\n'), roster, subjects, {row:0,column:0},()=>'',()=>false);
  assert.deepEqual(review.errors,[]);
  assert.equal(review.changes.length,104);
  assert.equal(review.matched,52);
  assert.deepEqual(review.changes.slice(-2).map(c=>[c.studentId,c.subjectId,c.newGrade]),[['uuid-1','khmer','A'],['uuid-1','math','B']]);
});
