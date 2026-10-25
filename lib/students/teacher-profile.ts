import {
  EDITABLE_GRID_COLUMNS,
  normalizeGridCell,
  validateGridCell,
  type CellValue,
  type GridPatch,
} from "./grid";

const contextKeys = new Set(["id", "class_id", "academic_year_id", "original"]);

/** Reject protected/unknown writes; role and class context are authorized separately on the server. */
export function teacherProfileChanges(
  input: Record<string, unknown>,
): GridPatch {
  const changes: GridPatch = {};
  for (const [key, value] of Object.entries(input)) {
    if (contextKeys.has(key) || value === undefined) continue;
    const column = EDITABLE_GRID_COLUMNS.find((c) => c.key === key);
    if (!column)
      throw new Error(`Forbidden: Protected or unknown student field: ${key}`);
    const normalized = normalizeGridCell(column, value);
    const error = validateGridCell(column, normalized);
    if (error) throw new Error(`${column.label}: ${error}`);
    changes[key] = normalized;
  }
  return changes;
}

/** Form snapshots may contain protected display values; only changed editable fields leave the UI. */
export function buildTeacherProfileUpdate(
  current: Record<string, unknown>,
  baseline: Record<string, unknown>,
) {
  const changes: GridPatch = {},
    original: GridPatch = {};
  for (const column of EDITABLE_GRID_COLUMNS) {
    if (!Object.hasOwn(current, column.key)) continue;
    const value = normalizeGridCell(column, current[column.key]);
    const before = (baseline[column.key] ?? null) as CellValue;
    if ((value ?? "") !== (before ?? "")) {
      changes[column.key] = value;
      original[column.key] = before;
    }
  }
  return { id: String(baseline.id || ""), ...changes, original };
}
