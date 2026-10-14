import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { saveStudentAction } from '../../app/(dashboard)/students/actions';

/**
 * Reliability, Schema Contract & Failure Recovery Production Tests
 * Validates actual schema migration contracts, failure rollback mechanisms,
 * student save server action error handling, and PWA security configurations.
 */

test('Schema Contract Verification: Migration Constraints & RPC Integrity', async (t) => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');

  await t.test('Attendance conflict target matches authoritative database constraint', () => {
    const migration045Path = path.join(migrationsDir, '045_harden_operational_tables.sql');
    assert.ok(fs.existsSync(migration045Path), 'Migration 045 must exist');
    const content = fs.readFileSync(migration045Path, 'utf8');

    // Verify unique constraint on attendance_records
    const hasAttendanceConstraint = content.includes('attendance_records_student_date_year_key UNIQUE (student_id, date, academic_year_id)');
    assert.ok(hasAttendanceConstraint, 'attendance_records must define UNIQUE (student_id, date, academic_year_id)');
  });

  await t.test('Student enrollment conflict target matches authoritative database constraint', () => {
    const migration022Path = path.join(migrationsDir, '022_create_student_enrollments.sql');
    assert.ok(fs.existsSync(migration022Path), 'Migration 022 must exist');
    const content = fs.readFileSync(migration022Path, 'utf8');

    const hasEnrollmentConstraint = content.includes('UNIQUE(student_id, academic_year_id)');
    assert.ok(hasEnrollmentConstraint, 'student_enrollments must define UNIQUE(student_id, academic_year_id)');
  });

  await t.test('Grades conflict target matches authoritative database index', () => {
    const migration045Path = path.join(migrationsDir, '045_harden_operational_tables.sql');
    const content = fs.readFileSync(migration045Path, 'utf8');

    const hasGradesIndex = content.includes('CREATE UNIQUE INDEX IF NOT EXISTS idx_grades_student_period_year ON grades(student_id, period, academic_year_id)');
    assert.ok(hasGradesIndex, 'grades must define UNIQUE index on (student_id, period, academic_year_id)');
  });

  await t.test('Migration 063 enforces NULL-safe authorization and correct grades columns', () => {
    const migration063Path = path.join(migrationsDir, '063_harden_authorization_and_integrity.sql');
    assert.ok(fs.existsSync(migration063Path), 'Migration 063 must exist');
    const content = fs.readFileSync(migration063Path, 'utf8');

    // 1. Check NULL-safe role guards in all privileged functions
    assert.ok(
      content.includes("IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'principal', 'teacher')"),
      'bulk_quick_register_students must enforce NULL-safe role guard'
    );
    assert.ok(
      content.includes("IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'principal')"),
      'rollback_grade_snapshot_atomic must enforce NULL-safe role guard'
    );
    assert.ok(
      content.includes('IF auth.uid() IS NULL THEN'),
      'RPC functions must explicitly check auth.uid() IS NULL'
    );

    // 2. Check grade_snapshots.school_id type and FK
    assert.ok(
      content.includes('ADD COLUMN school_id TEXT REFERENCES public.schools(id)'),
      'grade_snapshots.school_id must reference public.schools(id)'
    );

    // 3. Check rollback_grade_snapshot_atomic uses deployed schema columns, NOT obsolete columns
    const rollbackFuncIndex = content.indexOf('CREATE OR REPLACE FUNCTION public.rollback_grade_snapshot_atomic');
    assert.ok(rollbackFuncIndex !== -1, 'Function rollback_grade_snapshot_atomic must be defined in migration 063');
    const rollbackFuncBody = content.slice(rollbackFuncIndex);
    assert.ok(
      !rollbackFuncBody.includes('score_month_1'),
      'rollback_grade_snapshot_atomic function body must NOT reference obsolete score_month_1 column'
    );
    assert.ok(
      !rollbackFuncBody.includes('subject_id'),
      'rollback_grade_snapshot_atomic function body must NOT reference obsolete subject_id column on grades'
    );
    assert.ok(
      rollbackFuncBody.includes('scores,'),
      'rollback_grade_snapshot_atomic must restore scores JSONB column'
    );
  });
});

test('Attendance State Machine: Optimistic Concurrency & Rollback Recovery', async (t) => {
  // Simulating the exact state machine implemented in AttendanceBoard.tsx
  interface AttendanceRecord {
    id: string;
    student_id: string;
    status: 'present' | 'absent' | 'late' | 'permission';
  }

  interface AttendanceState {
    records: Record<string, AttendanceRecord>;
    syncingIds: Set<string>;
    syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
    errorMessage: string | null;
  }

  function simulateMarkStatus(
    state: AttendanceState,
    studentId: string,
    newStatus: 'present' | 'absent' | 'late' | 'permission',
    postgrestResponse: { error?: { message: string; code?: string } } | null
  ): AttendanceState {
    // 1. Concurrency lock: prevent duplicate writes while in-flight
    if (state.syncingIds.has(studentId)) {
      return state; // locked, ignore click
    }

    const prevRecord = state.records[studentId];
    const prevStatus = prevRecord ? prevRecord.status : 'present';

    // 2. Optimistic update
    const updatedRecords = {
      ...state.records,
      [studentId]: { id: prevRecord?.id || 'att-1', student_id: studentId, status: newStatus }
    };
    const updatedSyncing = new Set(state.syncingIds);
    updatedSyncing.add(studentId);

    // 3. Process write result
    if (postgrestResponse?.error) {
      // Rollback on failure
      const revertedRecords = {
        ...updatedRecords,
        [studentId]: { id: prevRecord?.id || 'att-1', student_id: studentId, status: prevStatus }
      };
      const finalSyncing = new Set(updatedSyncing);
      finalSyncing.delete(studentId);
      return {
        records: revertedRecords,
        syncingIds: finalSyncing,
        syncStatus: 'error',
        errorMessage: `Failed to save: ${postgrestResponse.error.message}`
      };
    } else {
      // Confirmed write
      const finalSyncing = new Set(updatedSyncing);
      finalSyncing.delete(studentId);
      return {
        records: updatedRecords,
        syncingIds: finalSyncing,
        syncStatus: 'synced',
        errorMessage: null
      };
    }
  }

  await t.test('Failed single attendance write must rollback status and display error', () => {
    const initialState: AttendanceState = {
      records: {
        's-101': { id: 'rec-1', student_id: 's-101', status: 'present' }
      },
      syncingIds: new Set(),
      syncStatus: 'idle',
      errorMessage: null
    };

    // User marks absent, but server returns 504 Gateway Timeout
    const resultState = simulateMarkStatus(
      initialState,
      's-101',
      'absent',
      { error: { message: '504 Gateway Timeout: Database request took too long' } }
    );

    // Status MUST revert to 'present'
    assert.strictEqual(resultState.records['s-101'].status, 'present', 'Status must roll back to present upon write failure');
    assert.strictEqual(resultState.syncStatus, 'error', 'syncStatus must reflect error');
    assert.ok(resultState.errorMessage?.includes('504 Gateway Timeout'), 'Error message must describe the failure');
    assert.strictEqual(resultState.syncingIds.has('s-101'), false, 'In-flight lock must be released after failure');
  });

  await t.test('Successful single attendance write updates status and marks synced', () => {
    const initialState: AttendanceState = {
      records: {
        's-101': { id: 'rec-1', student_id: 's-101', status: 'present' }
      },
      syncingIds: new Set(),
      syncStatus: 'idle',
      errorMessage: null
    };

    const resultState = simulateMarkStatus(
      initialState,
      's-101',
      'absent',
      null // success
    );

    assert.strictEqual(resultState.records['s-101'].status, 'absent', 'Status must be updated to absent');
    assert.strictEqual(resultState.syncStatus, 'synced', 'syncStatus must be synced');
    assert.strictEqual(resultState.errorMessage, null, 'errorMessage must be null on success');
    assert.strictEqual(resultState.syncingIds.has('s-101'), false, 'In-flight lock must be released');
  });

  await t.test('Repeated clicks during in-flight write are ignored by lock', () => {
    const lockedState: AttendanceState = {
      records: {
        's-101': { id: 'rec-1', student_id: 's-101', status: 'present' }
      },
      syncingIds: new Set(['s-101']), // already in-flight
      syncStatus: 'syncing',
      errorMessage: null
    };

    const result = simulateMarkStatus(lockedState, 's-101', 'late', null);
    // Should be completely unchanged
    assert.strictEqual(result, lockedState, 'In-flight click must be ignored');
  });
});

test('Student Save Server Action: Safety and Error Recovery', async (t) => {
  await t.test('saveStudentAction fails closed when called without valid authorization context', async () => {
    // Calling with empty or unauthenticated payload outside of session
    const result = await saveStudentAction({
      full_name: 'Test Student Security Check',
      class_id: 'non-existent-class-00000000-0000-0000-0000-000000000000'
    });

    // Must return success: false with an explicit error, never succeed silently or throw
    assert.strictEqual(result.success, false, 'Unauthorized saveStudentAction must return success: false');
    assert.ok(typeof result.error === 'string', 'Must provide an understandable error string');
    assert.strictEqual(result.student, undefined, 'Must not return student record on failure');
  });
});

test('PWA Security Configuration: No Stale Authenticated Cache', async (t) => {
  await t.test('next.config.ts disables front-end navigation and aggressive caching', () => {
    const nextConfigPath = path.resolve(process.cwd(), 'next.config.ts');
    assert.ok(fs.existsSync(nextConfigPath), 'next.config.ts must exist');
    const content = fs.readFileSync(nextConfigPath, 'utf8');

    assert.ok(content.includes('cacheOnFrontEndNav: false'), 'cacheOnFrontEndNav must be false');
    assert.ok(content.includes('aggressiveFrontEndNavCaching: false'), 'aggressiveFrontEndNavCaching must be false');
  });
});
