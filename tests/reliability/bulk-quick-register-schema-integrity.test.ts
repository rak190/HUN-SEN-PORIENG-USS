import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Bulk Quick Register Schema Integrity & Contract Suite', () => {
  const rootDir = process.cwd();

  it('Scenario 1: Migration 078 strictly aligns with canonical schema without non-existent columns', () => {
    const migPath = path.join(rootDir, 'supabase', 'migrations', '078_add_students_updated_at_and_fix_bulk_register.sql');
    assert.ok(fs.existsSync(migPath), 'Migration 078 must exist');

    const content = fs.readFileSync(migPath, 'utf8');

    // 1. Must use current_address on students
    assert.ok(content.includes('current_address'), 'Must populate current_address in students');

    // 2. Must NOT insert desk_number or room_number into students
    const insertStudentsMatch = content.match(/INSERT INTO public\.students \(([\s\S]*?)\) VALUES/);
    assert.ok(insertStudentsMatch, 'Must contain INSERT INTO public.students statement');
    const studentCols = insertStudentsMatch[1];
    assert.ok(!studentCols.includes('desk_number'), 'students table must NOT contain desk_number');
    assert.ok(!studentCols.includes('room_number'), 'students table must NOT contain room_number');
    assert.ok(!studentCols.includes('school_id'), 'students table must NOT contain school_id');

    // 3. Must insert desk_number and room_number into student_enrollments
    const insertEnrollMatch = content.match(/INSERT INTO public\.student_enrollments \(([\s\S]*?)\) VALUES/);
    assert.ok(insertEnrollMatch, 'Must contain INSERT INTO public.student_enrollments statement');
    const enrollCols = insertEnrollMatch[1];
    assert.ok(enrollCols.includes('desk_number'), 'student_enrollments table must contain desk_number');
    assert.ok(enrollCols.includes('room_number'), 'student_enrollments table must contain room_number');

    // 4. Must enforce admin and principal authorization
    assert.ok(
      content.includes("v_caller_role NOT IN ('admin', 'principal')"),
      'bulk_quick_register_students must restrict execution to admin or principal'
    );
  });
});
