import { formatDobForDisplay } from "../utils/student-date";
import type { GridColumn, GridDrafts, GridRow } from "./grid";
import { addressCellValue } from "./address";

export type TextMeasurer = (text: string) => number;
const estimate: TextMeasurer = (text) =>
  Array.from(text).reduce(
    (total, char) =>
      total +
      (/\p{Mark}/u.test(char) ? 0 : /[\u1780-\u17ff]/.test(char) ? 10 : 7),
    0,
  );

/** Measure the entire class, including drafts; keep very long notes within a readable width. */
export function automaticColumnWidths(
  columns: GridColumn[],
  rows: GridRow[],
  drafts: GridDrafts,
  measure: TextMeasurer = estimate,
): Record<string, number> {
  const widths = Object.fromEntries(
    columns.map((column) => {
      let width =
        measure(`${column.editable ? "" : "🔒 "}${column.label} ↑`) + 32;
      for (const row of rows) {
        const value =
          column.virtual === "address"
            ? addressCellValue(
                Object.hasOwn(drafts[row.id] || {}, "address")
                  ? drafts[row.id].address
                  : (row.address ?? row.current_address),
                column.key,
              )
            : Object.hasOwn(drafts[row.id] || {}, column.key)
              ? drafts[row.id][column.key]
              : row[column.key];
        const text =
          column.options?.[String(value)] ||
          (column.kind === "date"
            ? formatDobForDisplay(String(value ?? "")) || String(value ?? "")
            : String(value ?? ""));
        for (const line of text.split(/\r?\n/))
          width = Math.max(
            width,
            measure(line) + (column.key === "full_name" ? 52 : 24),
          );
      }
      return [
        column.key,
        Math.ceil(
          Math.min(
            column.key === "full_name" ? 320 : 520,
            Math.max(column.key === "full_name" ? 180 : 90, width),
          ),
        ),
      ];
    }),
  );
  // Section labels share the same horizontal space as their child columns.
  // Expand that space instead of forcing a long Khmer label into a tall header.
  for (let start = 0; start < columns.length;) {
    const section = columns[start].section;
    let end = start + 1;
    while (section && end < columns.length && columns[end].section === section)
      end++;
    if (section) {
      const current = columns
        .slice(start, end)
        .reduce((sum, column) => sum + widths[column.key], 0);
      const required = Math.ceil(measure(section) + 32);
      if (required > current)
        widths[columns[end - 1].key] += required - current;
    }
    start = end;
  }
  return widths;
}
