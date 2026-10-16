import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

test('Health Records Security & Server-Side Authorization Suite', async (t) => {
  const { upsertHealthRecords } = await import('../../app/(dashboard)/health/actions');

  // ====================================================================
  // Scenario 1: Unauthenticated Invocations Must Fail Closed
  // ====================================================================
  await t.test('Scenario 1: Unauthenticated upsertHealthRecords returns success: false with unauthorized error', async () => {
    const dummyStudentId = crypto.randomUUID();
    const dummyClassId = crypto.randomUUID();
    const dummyYearId = crypto.randomUUID();

    const result = await upsertHealthRecords(
      [
        {
          student_id: dummyStudentId,
          class_id: dummyClassId,
          recorded_date: '2026-10-16',
          weight_kg: 50,
          height_cm: 160,
        },
      ],
      dummyYearId
    );

    assert.strictEqual(result.success, false, 'Unauthenticated invocation must never succeed');
    assert.ok(
      typeof result.error === 'string' &&
      (result.error.toLowerCase().includes('unauthorized') || result.error.toLowerCase().includes('forbidden')),
      `Expected authorization error string, got: ${result.error}`
    );
    assert.strictEqual(result.count, undefined, 'Must not return count on unauthorized invocation');
  });

  // ====================================================================
  // Scenario 2: Validation Guards (Empty Payload & Malformed Data)
  // ====================================================================
  await t.test('Scenario 2: upsertHealthRecords validates payload and rejects empty records', async () => {
    const dummyYearId = crypto.randomUUID();

    // Empty array
    const emptyResult = await upsertHealthRecords([], dummyYearId);
    assert.strictEqual(emptyResult.success, false, 'Empty payload must fail validation');

    // Invalid academic year ID
    const invalidYearResult = await upsertHealthRecords(
      [
        {
          student_id: crypto.randomUUID(),
          class_id: crypto.randomUUID(),
          recorded_date: '2026-10-16',
        },
      ],
      'not-a-valid-uuid'
    );
    assert.strictEqual(invalidYearResult.success, false, 'Invalid academic year ID must fail validation');
  });

  // ====================================================================
  // Scenario 3: Database Migration 069 Contract Integrity
  // ====================================================================
  await t.test('Scenario 3: Migration 069 defines upsert_health_records_atomic with role, year lock, and scope guards', () => {
    const migrationPath = path.join(rootDir, 'supabase', 'migrations', '069_upsert_health_records_atomic.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration 069 must exist at supabase/migrations/069_upsert_health_records_atomic.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');

    // 1. Function declaration and SECURITY DEFINER
    assert.ok(
      content.includes('FUNCTION public.upsert_health_records_atomic(') &&
      content.includes('SECURITY DEFINER'),
      'Migration 069 must define upsert_health_records_atomic with SECURITY DEFINER'
    );

    // 2. Caller authentication and role allowlist
    assert.ok(
      content.includes("v_caller_role NOT IN ('admin', 'principal', 'teacher')"),
      'Must enforce role check allowing only admin, principal, or teacher'
    );

    // 3. Academic year lifecycle lock check
    assert.ok(
      content.includes("v_year_status IN ('closed', 'archived')"),
      'Must reject locked (closed or archived) academic years'
    );

    // 4. Principal school boundary scoping
    assert.ok(
      content.includes("v_caller_school_id IS DISTINCT FROM v_class_school_id"),
      'Must prevent principals from modifying records outside their school institution'
    );

    // 5. Teacher homeroom class ownership scoping
    assert.ok(
      content.includes("v_class_teacher_id IS DISTINCT FROM v_caller_id"),
      'Must prevent teachers from modifying records for classes not assigned to them'
    );

    // 6. Student enrollment verification
    assert.ok(
      content.includes('student_enrollments') && content.includes('academic_year_id = p_academic_year_id'),
      'Must verify student is enrolled in the target class for the academic year'
    );

    // 7. Atomic sync to students table
    assert.ok(
      content.includes('UPDATE public.students') &&
      content.includes('weight_kg = COALESCE') &&
      content.includes('height_m = COALESCE') &&
      content.includes('bmi = COALESCE'),
      'Must atomically synchronize biometric measurements to the students table'
    );
  });

  // ====================================================================
  // Scenario 4: Client and Action Zero Silent Error Suppression
  // ====================================================================
  await t.test('Scenario 4: Server action and client UI eliminate false-positive success fallbacks', () => {
    const actionPath = path.join(rootDir, 'app', '(dashboard)', 'health', 'actions.ts');
    assert.ok(fs.existsSync(actionPath), 'actions.ts must exist');
    const actionContent = fs.readFileSync(actionPath, 'utf8');

    // Ensure fallback: true is completely removed
    assert.ok(
      !actionContent.includes('fallback: true'),
      'Must not return fallback: true on error'
    );

    // Ensure error returns success: false
    assert.ok(
      actionContent.includes('return { success: false'),
      'Errors in actions.ts must return success: false'
    );

    // Check client error handling
    const clientPath = path.join(rootDir, 'app', '(dashboard)', 'health', 'HealthBoardClient.tsx');
    assert.ok(fs.existsSync(clientPath), 'HealthBoardClient.tsx must exist');
    const clientContent = fs.readFileSync(clientPath, 'utf8');

    assert.ok(
      clientContent.includes('if (!res || !res.success)'),
      'HealthBoardClient must check if response is falsy or success is false'
    );
  });

  // ====================================================================
  // Scenario 5: Health Page Scope Isolation
  // ====================================================================
  await t.test('Scenario 5: HealthPage isolates unassigned teachers and principal school scope', () => {
    const pagePath = path.join(rootDir, 'app', '(dashboard)', 'health', 'page.tsx');
    assert.ok(fs.existsSync(pagePath), 'Health page.tsx must exist');
    const pageContent = fs.readFileSync(pagePath, 'utf8');

    assert.ok(
      pageContent.includes("studentsQuery.in('class_id', ['00000000-0000-0000-0000-000000000000'])"),
      'HealthPage must filter unassigned teachers to an empty set to prevent student data leaks'
    );
    assert.ok(
      pageContent.includes("role === 'principal' && profile?.school_id"),
      'HealthPage must scope principal queries to classes in their school'
    );
  });
});
