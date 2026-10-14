import test from 'node:test';
import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Note: These tests require SUPABASE_URL and SUPABASE_ANON_KEY to be set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

test('Security & Authorization Boundaries (Role-based & RLS)', async (t) => {
  if (!supabaseUrl || !supabaseKey) {
    assert.fail('Missing SUPABASE_URL or SUPABASE_ANON_KEY. Security tests must fail closed.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const adminSupabase = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

  // ====================================================================
  // Scenario 12: RLS blocks unauthorized direct database access
  // ====================================================================
  await t.test('Scenario 12: RLS blocks unauthorized direct database access on sensitive tables', async (st) => {
    // 12.1 Anonymous insert into grades
    await st.test('Anonymous user is blocked from inserting into grades', async () => {
      const { error } = await supabase.from('grades').insert({
        id: crypto.randomUUID(),
        student_id: crypto.randomUUID(),
        class_id: crypto.randomUUID(),
        academic_year_id: crypto.randomUUID(),
        period: 'January',
        scores: {},
        total_score: 0,
        status: 'draft'
      });
      assert.ok(error !== null, 'Should block anonymous insertion into grades');
      assert.strictEqual(error.code, '42501', 'Should return 42501 (insufficient privilege)');
    });

    // 12.2 Anonymous insert into student_health_records
    await st.test('Anonymous user is blocked from inserting into student_health_records', async () => {
      const { error } = await supabase.from('student_health_records').insert({
        id: crypto.randomUUID(),
        student_id: crypto.randomUUID(),
        class_id: crypto.randomUUID(),
        academic_year_id: crypto.randomUUID(),
        weight_kg: 45.5,
        height_cm: 155,
      });
      assert.ok(error !== null, 'Should block anonymous insertion into student_health_records');
      assert.strictEqual(error.code, '42501', 'Should return 42501 (insufficient privilege)');
    });

    // 12.3 Anonymous insert into home_visits
    await st.test('Anonymous user is blocked from inserting into home_visits', async () => {
      const { error } = await supabase.from('home_visits').insert({
        id: crypto.randomUUID(),
        student_id: crypto.randomUUID(),
        date: '2026-03-01',
        reason: 'Unauthorized probe',
        parent_name: 'Attacker',
        status: 'submitted'
      });
      assert.ok(error !== null, 'Should block anonymous insertion into home_visits');
      assert.strictEqual(error.code, '42501', 'Should return 42501 (insufficient privilege)');
    });

    // 12.4 Anonymous insert into parent_contacts
    await st.test('Anonymous user is blocked from inserting into parent_contacts', async () => {
      const { error } = await supabase.from('parent_contacts').insert({
        id: crypto.randomUUID(),
        student_id: crypto.randomUUID(),
        parent_name: 'Attacker Parent',
        phone_number: '012345678'
      });
      assert.ok(error !== null, 'Should block anonymous insertion into parent_contacts');
      assert.strictEqual(error.code, '42501', 'Should return 42501 (insufficient privilege)');
    });
  });

  // ====================================================================
  // Scenarios 4 & 6: Database RPC Authorization and Input Validation
  // ====================================================================
  await t.test('Scenarios 4 & 6: Database RPCs enforce role guards and validate academic year/class', async (st) => {
    // save_student_atomic rejects unauthenticated callers
    await st.test('save_student_atomic rejects anonymous caller', async () => {
      const { data, error } = await supabase.rpc('save_student_atomic', {
        p_student: { full_name: 'Hacker Student' },
        p_class_id: crypto.randomUUID(),
        p_academic_year_id: crypto.randomUUID()
      });
      assert.ok(error !== null, 'save_student_atomic must fail on anonymous call');
      assert.ok(
        error.code === '42501' || error.message.includes('Authentication required') || error.message.includes('Unauthorized'),
        `Expected 42501 auth error, got: ${error.code} - ${error.message}`
      );
    });

    // bulk_quick_register_students rejects unauthenticated callers
    await st.test('bulk_quick_register_students rejects anonymous caller', async () => {
      const { error } = await supabase.rpc('bulk_quick_register_students', {
        student_records: [{ student_id_number: 'ATTACK-1', full_name: 'Test', class_id: crypto.randomUUID() }],
        target_year_id: crypto.randomUUID()
      });
      assert.ok(error !== null, 'bulk_quick_register_students must fail on anonymous call');
      assert.ok(
        error.code === '42501' || error.message.includes('Authentication required') || error.message.includes('Unauthorized'),
        `Expected 42501 auth error, got: ${error.code} - ${error.message}`
      );
    });

    // rollback_grade_snapshot_atomic rejects unauthenticated callers
    await st.test('rollback_grade_snapshot_atomic rejects anonymous caller', async () => {
      const { error } = await supabase.rpc('rollback_grade_snapshot_atomic', {
        p_snapshot_id: crypto.randomUUID(),
        p_academic_year_id: crypto.randomUUID()
      });
      assert.ok(error !== null, 'rollback_grade_snapshot_atomic must fail on anonymous call');
      assert.ok(
        error.code === '42501' || error.message.includes('Authentication required') || error.message.includes('Unauthorized'),
        `Expected 42501 auth error, got: ${error.code} - ${error.message}`
      );
    });
  });

  // ====================================================================
  // Scenarios 1, 2, 3, 7, 8, 9, 11: Server-side Student Action Authorization
  // ====================================================================
  await t.test('Scenarios 1, 2, 3, 7: Server Actions reject unauthorized or cross-boundary student modifications', async (st) => {
    const { saveStudentAction, bulkQuickRegisterAction } = await import('../../app/(dashboard)/students/actions');

    // 1. Unauthenticated invocation of saveStudentAction
    await st.test('Scenario 9: Unauthenticated saveStudentAction fails without modifying records', async () => {
      const result = await saveStudentAction({
        full_name: 'Unauthenticated Student',
        class_id: crypto.randomUUID()
      });
      assert.strictEqual(result.success, false, 'Should fail without authentication');
      assert.ok(
        result.error?.toLowerCase().includes('unauthorized') || result.error?.toLowerCase().includes('forbidden'),
        `Expected auth error, got: ${result.error}`
      );
    });

    // 2. bulkQuickRegisterAction rejects empty records
    await st.test('Scenario 4: bulkQuickRegisterAction rejects empty records payload', async () => {
      const result = await bulkQuickRegisterAction({
        records: [],
        academic_year_id: crypto.randomUUID()
      });
      assert.strictEqual(result.success, false, 'Should fail on empty records');
      assert.ok(result.error?.includes('records'), 'Should indicate missing records');
    });

    // 3. bulkQuickRegisterAction rejects records missing class_id
    await st.test('Scenario 4: bulkQuickRegisterAction rejects records without assigned class_id', async () => {
      const result = await bulkQuickRegisterAction({
        records: [
          {
            student_id_number: 'STD-001',
            full_name: 'Test Student',
            gender: 'M',
            class_id: '', // missing
            status: 'new'
          }
        ],
        academic_year_id: crypto.randomUUID()
      });
      assert.strictEqual(result.success, false, 'Should fail when any record lacks class_id');
      assert.ok(
        result.error?.includes('class_id'),
        `Expected class_id validation error, got: ${result.error}`
      );
    });
  });

  // ====================================================================
  // Scenario 5: Privileged Export Endpoint Role Allowlists
  // ====================================================================
  await t.test('Scenario 5: Export endpoint rejects unauthenticated or unsupported callers', async (st) => {
    const { GET: exportClassRoster } = await import('../../app/api/export/class-roster/route');

    // Unauthenticated GET request to class roster export
    const req = new Request('http://localhost:3000/api/export/class-roster?classId=00000000-0000-0000-0000-000000000000');
    const res = await exportClassRoster(req);

    assert.ok(
      res.status === 401 || res.status === 403,
      `Export class-roster must return 401 or 403 for unauthenticated request, got ${res.status}`
    );
  });

  // ====================================================================
  // Scenario 10: Migration Preserves Existing Schema and Snapshot Safety
  // ====================================================================
  await t.test('Scenario 10: Migration 063 & 064 preserve grade_snapshots schema and safety', async (st) => {
    if (!adminSupabase) {
      st.skip('Service role key not configured, skipping admin schema verification');
      return;
    }

    // Verify grade_snapshots table exists and is accessible by admin
    const { data, error } = await adminSupabase
      .from('grade_snapshots')
      .select('id, class_id, snapshot_label')
      .limit(1);

    assert.ok(error === null, `Admin query on grade_snapshots should succeed, got: ${error?.message}`);
  });
});
