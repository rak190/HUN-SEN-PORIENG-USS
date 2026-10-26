/**
 * Student Name & Field Sorting Utility
 * 
 * Provides locale-aware, deterministic, and stable sorting for student rosters:
 * - Supports Khmer (km-KH / km) and English (en) scripts via Intl.Collator
 * - Normalizes internal/leading/trailing whitespace for comparison without mutating original data
 * - Places missing or blank names at the end (nulls last)
 * - Guarantees deterministic order for students with identical names via Student ID (secondary)
 *   and database UUID (tertiary tie-breaker)
 */

export interface StudentSortable {
  id: string;
  full_name?: string | null;
  student_id_number?: string | null;
}

export const studentNameCollator = new Intl.Collator(['km-KH', 'km', 'en-US', 'en'], {
  numeric: true,
  sensitivity: 'variant',
});

/**
 * Normalizes name strings for comparison: trims leading/trailing spaces and collapses
 * multiple consecutive spaces into a single space.
 */
export function normalizeStudentName(name?: string | null): string {
  if (!name) return '';
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Deterministic secondary and tertiary tie-breaker for identical student names.
 */
function tieBreak<T extends StudentSortable>(a: T, b: T): number {
  const idA = (a.student_id_number ?? '').trim();
  const idB = (b.student_id_number ?? '').trim();

  // Present Student IDs come before missing Student IDs
  if (idA && !idB) return -1;
  if (!idA && idB) return 1;
  if (idA && idB) {
    const idCmp = studentNameCollator.compare(idA, idB);
    if (idCmp !== 0) return idCmp;
  }

  // Final tie-breaker: database UUID
  return String(a.id ?? '').localeCompare(String(b.id ?? ''));
}

/**
 * Compares two students by full_name in the specified direction.
 * - Missing or blank names appear last in both ascending and descending order.
 * - Same names use Student ID and database UUID as stable tie-breakers.
 */
export function compareStudentsByName<T extends StudentSortable>(
  a: T,
  b: T,
  direction: 'asc' | 'desc' = 'asc'
): number {
  const normA = normalizeStudentName(a.full_name);
  const normB = normalizeStudentName(b.full_name);
  const factor = direction === 'asc' ? 1 : -1;

  const isBlankA = !normA;
  const isBlankB = !normB;

  // Blank/missing names always go last
  if (isBlankA && !isBlankB) return 1;
  if (!isBlankA && isBlankB) return -1;
  if (isBlankA && isBlankB) {
    return tieBreak(a, b);
  }

  const nameCmp = studentNameCollator.compare(normA, normB);
  if (nameCmp !== 0) {
    return nameCmp * factor;
  }

  // Names are identical -> use stable tie-breaker
  return tieBreak(a, b);
}

/**
 * Compares two students by an arbitrary field.
 * - If field is 'full_name', delegates to compareStudentsByName.
 * - Blank/null values always go last.
 * - Numbers are compared numerically.
 * - Strings are compared using the locale-aware collator.
 * - Ties are broken using full_name and id.
 */
export function compareStudentsByField<T extends StudentSortable>(
  a: T,
  b: T,
  field: string,
  direction: 'asc' | 'desc' = 'asc',
  getValue?: (item: T, field: string) => unknown
): number {
  if (field === 'full_name') {
    return compareStudentsByName(a, b, direction);
  }

  const factor = direction === 'asc' ? 1 : -1;
  const valA = getValue ? getValue(a, field) : (a as any)[field];
  const valB = getValue ? getValue(b, field) : (b as any)[field];

  const isBlankA = valA === null || valA === undefined || valA === '';
  const isBlankB = valB === null || valB === undefined || valB === '';

  if (isBlankA && !isBlankB) return 1;
  if (!isBlankA && isBlankB) return -1;
  if (isBlankA && isBlankB) {
    return compareStudentsByName(a, b, 'asc');
  }

  if (typeof valA === 'number' && typeof valB === 'number') {
    if (valA !== valB) {
      return (valA - valB) * factor;
    }
    return compareStudentsByName(a, b, 'asc');
  }

  const strA = String(valA).trim();
  const strB = String(valB).trim();
  const cmp = studentNameCollator.compare(strA, strB);
  if (cmp !== 0) {
    return cmp * factor;
  }

  return compareStudentsByName(a, b, 'asc');
}
