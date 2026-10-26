import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Batch Register Atomic Integrity & Contract Suite', () => {
  const rootDir = process.cwd();

  it('Scenario 1: Migration 079 drops legacy 2-arg signature and prevents PGRST203', () => {
    const migPath = path.join(rootDir, 'supabase', 'migrations', '079_fix_batch_register_students_atomic.sql');
    assert.ok(fs.existsSync(migPath), 'Migration 079 must exist');

    const content = fs.readFileSync(migPath, 'utf8');

    // 1. Must drop 2-arg overload
    assert.ok(
      content.includes('DROP FUNCTION IF EXISTS public.batch_register_students_atomic(JSONB, UUID);'),
      'Must drop legacy 2-arg signature to prevent PostgREST ambiguity'
    );

    // 2. Must define 3-arg canonical signature
    assert.ok(
      content.includes('CREATE OR REPLACE FUNCTION public.batch_register_students_atomic('),
      'Must define batch_register_students_atomic function'
    );
    assert.ok(
      content.includes('p_caller_id UUID DEFAULT NULL'),
      'Must include p_caller_id parameter'
    );
  });

  it('Scenario 2: Migration 079 implements safe date parsing and eliminates 42P10 ON CONFLICT crash', () => {
    const migPath = path.join(rootDir, 'supabase', 'migrations', '079_fix_batch_register_students_atomic.sql');
    const content = fs.readFileSync(migPath, 'utf8');

    // Safe date parsing block
    assert.ok(
      content.includes('EXCEPTION WHEN OTHERS THEN'),
      'Must contain exception block for safe date parsing'
    );

    // Ensure NO "ON CONFLICT (student_id_number)" in SQL execution
    const insertStudentsBlock = content.match(/INSERT INTO public\.students \([\s\S]*?\);/);
    assert.ok(insertStudentsBlock, 'Must contain INSERT INTO public.students statement');
    assert.ok(
      !insertStudentsBlock[0].includes('ON CONFLICT (student_id_number)'),
      'INSERT INTO public.students must NOT use ON CONFLICT (student_id_number)'
    );

    // Ensure student lookup by student_id_number
    assert.ok(
      content.includes('WHERE student_id_number = trim(v_student_id_number)'),
      'Must look up existing student by student_id_number'
    );

    // Ensure desk_number and room_number in student_enrollments
    assert.ok(
      content.includes('room_number') && content.includes('desk_number'),
      'Must properly handle room_number and desk_number'
    );
  });

  it('Scenario 3: batchRegisterBasicStudents uses the authenticated session and handles dob/date_of_birth', () => {
    const actionsPath = path.join(rootDir, 'app', '(dashboard)', 'admin', 'students', 'actions.ts');
    assert.ok(fs.existsSync(actionsPath), 'actions.ts must exist');

    const content = fs.readFileSync(actionsPath, 'utf8');

    // Registration uses the verified session; PostgreSQL ignores forged actor parameters.
    const registration = content.slice(content.indexOf('export async function batchRegisterBasicStudents'), content.indexOf('export async function', content.indexOf('export async function batchRegisterBasicStudents') + 1));
    assert.ok(
      registration.includes('await createClient()') && !registration.includes('p_caller_id'),
      'Batch registration must use its authenticated client without browser actor attribution'
    );

    // Must map dob and date_of_birth
    assert.ok(
      content.includes('s.dob || s.date_of_birth'),
      'batchRegisterBasicStudents must capture s.dob or s.date_of_birth'
    );
  });
});
