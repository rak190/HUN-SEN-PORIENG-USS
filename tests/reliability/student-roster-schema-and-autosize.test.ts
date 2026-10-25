import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchSchemaCompatibleRoster, isMissingProfileColumn, unavailableProfileFields } from '../../lib/students/roster';
import { automaticColumnWidths } from '../../lib/students/column-widths';
import { GRID_COLUMNS } from '../../lib/students/grid';

function clientWithReplies(replies: { data: unknown; error: null | { code: string; message: string } }[]) {
  const calls: { table: string; projection: string; filters: [string, unknown][] }[] = [];
  const client = { from(table: string) {
    const call = { table, projection: '', filters: [] as [string, unknown][] }; calls.push(call);
    const query = {
      select(projection: string) { call.projection = projection; return query; },
      eq(key: string, value: unknown) { call.filters.push([key, value]); return query; },
      in(key: string, value: unknown) { call.filters.push([key, value]); return query; },
      order() { return query; },
      then(resolve: (value: unknown) => void) { resolve(replies.shift()!); },
    };
    return query;
  } } as unknown as SupabaseClient;
  return { client, calls };
}
const missing = { code: '42703', message: 'column active_class_rosters.student_phone does not exist' };

test('Current schemas use one explicit, class/year-scoped roster query', async () => {
  const row = { id: 'a', student_phone: '012345678' };
  const { client, calls } = clientWithReplies([{ data: [row], error: null }]);
  assert.deepEqual(await fetchSchemaCompatibleRoster(client, 'class-a', 'year-a', 'id,student_phone'), [row]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].projection, 'id,student_phone');
  assert.deepEqual(calls[0].filters, [['enrollment_class_id', 'class-a'], ['academic_year_id', 'year-a']]);
});
test('Stale views recover existing master profile values without replacing enrollment placement', async () => {
  const roster = { id: 'a', enrollment_class_id: 'class-a', desk_number: '10', full_name: 'Dara' };
  const { client, calls } = clientWithReplies([
    { data: null, error: missing }, { data: [roster], error: null },
    { data: [{ id: 'a', student_phone: '012345678', desk_number: '99', full_name: 'different' }, { id: 'outside', student_phone: '099999999' }], error: null },
  ]);
  const result = await fetchSchemaCompatibleRoster(client, 'class-a', 'year-a', 'id,student_phone');
  assert.equal(result[0].student_phone, '012345678');
  assert.equal(result[0].desk_number, '10'); assert.equal(result[0].full_name, 'Dara');
  assert.equal(result.length, 1);
  assert.deepEqual(calls[2].filters, [['id', ['a']]]);
  assert.deepEqual(calls[1].filters, calls[0].filters);
});
test('Unmigrated columns remain explicitly unavailable; NULL is an available blank value', async () => {
  const { client } = clientWithReplies([
    { data: null, error: missing }, { data: [{ id: 'a' }], error: null },
    { data: [{ id: 'a', guardian_phone: null }], error: null },
  ]);
  const rows = await fetchSchemaCompatibleRoster(client, 'class-a', 'year-a', 'id,student_phone');
  assert.ok(unavailableProfileFields(rows).includes('student_phone'));
  assert.ok(!unavailableProfileFields(rows).includes('guardian_phone'));
  assert.equal(Object.hasOwn(rows[0], 'student_phone'), false);
});
test('Authorization, network and unknown-column failures never enter schema compatibility fallback', async () => {
  for (const error of [{ code: '42501', message: 'permission denied' }, { code: 'FETCH_ERROR', message: 'network unavailable' }, { code: '42703', message: 'column active_class_rosters.enrollment_class_id does not exist' }]) {
    const { client, calls } = clientWithReplies([{ data: null, error }]);
    await assert.rejects(fetchSchemaCompatibleRoster(client, 'class-a', 'year-a', 'id,student_phone'), value => value === error);
    assert.equal(calls.length, 1);
  }
  assert.equal(isMissingProfileColumn(missing), true);
});
test('Automatic widths fit labels, enum labels, phone strings and edited content; long notes are bounded', () => {
  const columns = ['full_name', 'student_phone', 'address', 'scholarship'].map(key => GRID_COLUMNS.find(c => c.key === key)!);
  const widths = automaticColumnWidths(columns, [{ id: 'a', full_name: 'Sok Dara', student_phone: '012345678', address: 'short', scholarship: 'yes' }], {}, text => text.length * 8);
  const edited = automaticColumnWidths(columns, [{ id: 'a', full_name: 'Sok Dara' }], { a: { student_phone: '+855 (0) 123 456 789', address: 'x'.repeat(4000) } }, text => text.length * 8);
  assert.ok(widths.full_name >= 180);
  assert.ok(edited.student_phone > widths.student_phone);
  assert.equal(edited.address, 520);
  assert.ok(widths.scholarship >= 'អាហារូបករណ៍ ↑'.length * 8 + 32);
});

test('Long examination section expands automatically to fit one compact header line', () => {
  const column = GRID_COLUMNS.find(column => column.key === 'exam_grade')!;
  const widths = automaticColumnWidths([column], [], {}, text => text.length * 9);
  assert.ok(widths.exam_grade >= column.section!.length * 9 + 32);
  const shared = [{ ...column, key: 'a' }, { ...column, key: 'b' }];
  const grouped = automaticColumnWidths(shared, [], {}, text => text.length * 9);
  assert.ok(grouped.a + grouped.b >= column.section!.length * 9 + 32);
});
