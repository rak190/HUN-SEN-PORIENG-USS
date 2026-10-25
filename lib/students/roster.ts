import type { SupabaseClient } from '@supabase/supabase-js';
import { EDITABLE_GRID_COLUMNS, type GridRow } from './grid';

const profileFields = [...new Set(EDITABLE_GRID_COLUMNS.map(column => column.db))];

/** A missing optional projection must not make an otherwise valid class disappear. */
export function isMissingProfileColumn(error: { code?: string; message?: string }): boolean {
  if (!['42703', 'PGRST204'].includes(error.code || '')) return false;
  return profileFields.some(field => new RegExp(`(?:[.\\s'"\\x60])${field}(?:[\\s'"\\x60]|$)`).test(error.message || ''));
}

export async function fetchSchemaCompatibleRoster(
  supabase: SupabaseClient, classId: string, yearId: string | undefined, fields: string,
): Promise<GridRow[]> {
  const selectRoster = (projection: string) => {
    let query = supabase.from('active_class_rosters').select(projection).eq('enrollment_class_id', classId);
    if (yearId) query = query.eq('academic_year_id', yearId);
    return query.order('student_id_number', { ascending: true });
  };
  const initial = await selectRoster(fields);
  if (!initial.error) return (initial.data || []) as unknown as GridRow[];
  if (!isMissingProfileColumn(initial.error)) throw initial.error;

  // Only legacy projections use wildcard reads, bounded to the authorized class/year.
  // Security-invoker view and normal session RLS remain in force for both queries.
  const fallback = await selectRoster('*');
  if (fallback.error) throw fallback.error;
  const rows = (fallback.data || []) as unknown as GridRow[];
  if (!rows.length) return rows;
  const missing = profileFields.filter(field => rows.some(row => !Object.hasOwn(row, field)));
  if (!missing.length) return rows;
  const profiles = await supabase.from('students').select('*').in('id', rows.map(row => row.id));
  if (profiles.error) throw profiles.error;
  const byId = new Map((profiles.data as GridRow[] || []).map(row => [row.id, row]));
  return rows.map(row => {
    const profile = byId.get(row.id);
    return { ...row, ...Object.fromEntries(missing.filter(field => profile && Object.hasOwn(profile, field)).map(field => [field, profile![field]])) };
  });
}

export function unavailableProfileFields(rows: GridRow[]): string[] {
  if (!rows.length) return [];
  return EDITABLE_GRID_COLUMNS.filter(column => rows.some(row => !Object.hasOwn(row, column.db))).map(column => column.key);
}
