import { parseStudentDob } from "../utils/student-date";
import { westernDigits, type GridDrafts, type GridRow } from "./grid";
import { phnomPenhDate } from "./derived-profile";

export type AdminStudentRow = GridRow & {
  full_name: string;
  class_name: string;
  enrollment_id: string;
  class_id: string;
};
export const ADMIN_STUDENT_COLUMNS = [
  { key: "student_id_number", label: "អត្តលេខ", width: "w-32" },
  { key: "full_name", label: "គោត្តនាម និង នាម*", width: "min-w-48" },
  { key: "gender", label: "ភេទ*", width: "w-24" },
  { key: "class_name", label: "ថ្នាក់", width: "w-32", locked: true },
  { key: "dob", label: "ថ្ងៃខែឆ្នាំកំណើត (DD MM YYYY)", width: "w-40" },
  { key: "room_number", label: "លេខបន្ទប់", width: "w-24" },
  { key: "desk_number", label: "លេខតុ", width: "w-24" },
  { key: "english_name", label: "ឈ្មោះជាឡាតាំង", width: "w-44", extra: true },
  {
    key: "student_phone",
    label: "លេខទូរស័ព្ទសិស្ស",
    width: "w-36",
    extra: true,
  },
  { key: "parent_phone", label: "លេខទំនាក់ទំនង", width: "w-36", extra: true },
  { key: "father_name", label: "ឈ្មោះឪពុក", width: "w-44", extra: true },
  { key: "mother_name", label: "ឈ្មោះម្តាយ", width: "w-44", extra: true },
  {
    key: "guardian_phone",
    label: "លេខទូរស័ព្ទអាណាព្យាបាល",
    width: "w-36",
    extra: true,
  },
  {
    key: "current_address",
    label: "អាសយដ្ឋានបច្ចុប្បន្ន",
    width: "min-w-72",
    extra: true,
  },
  { key: "status", label: "ប្រភេទចុះឈ្មោះ", width: "w-36", extra: true },
] satisfies {
  key: string;
  label: string;
  width: string;
  locked?: boolean;
  extra?: boolean;
}[];
export type AdminColumn = (typeof ADMIN_STUDENT_COLUMNS)[number];
export const ADMIN_EDITABLE_FIELDS = ADMIN_STUDENT_COLUMNS.filter(
  (column) => !("locked" in column),
).map((column) => column.key);

export function normalizeAdminCell(key: string, value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === "")
    return null;
  const text = String(value).trim();
  if (key === "gender") {
    if (["m", "male", "ប្រុស", "ប"].includes(text.toLowerCase())) return "M";
    if (["f", "female", "ស្រី", "ស"].includes(text.toLowerCase())) return "F";
  }
  if (key === "dob") {
    const digits = westernDigits(text);
    return /^(?:\d{5}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[\s/.-]+\d{1,2}[\s/.-]+\d{4})$/.test(
      digits,
    )
      ? parseStudentDob(digits) || text
      : text;
  }
  return key.endsWith("phone") ? westernDigits(text) : text;
}

export function validateAdminCell(
  key: string,
  value: unknown,
  original?: unknown,
): string | null {
  if (!ADMIN_EDITABLE_FIELDS.includes(key)) return "ព័ត៌មាននេះត្រូវបានការពារ";
  if (value !== null && typeof value !== "string") return "សូមបញ្ចូលជាអក្សរ";
  const text = String(value ?? "");
  if (key === "full_name" && !text.trim()) return "ឈ្មោះមិនអាចទទេ";
  if (key === "gender" && !["M", "F"].includes(text))
    return "ភេទមិនត្រឹមត្រូវ (M/F)";
  if (key === "status" && !["new", "repeater", "transfer"].includes(text))
    return "ប្រភេទចុះឈ្មោះ៖ new / repeater / transfer";
  if (
    key === "dob" &&
    text &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(text) || parseStudentDob(text) !== text)
  )
    return "ថ្ងៃខែឆ្នាំកំណើតមិនត្រឹមត្រូវ";
  if (key === "dob" && text && text > phnomPenhDate())
    return "ថ្ងៃកំណើតមិនអាចនៅពេលអនាគត";
  if (key === "student_id_number" && original && !text)
    return "មិនអាចលុបអត្តលេខដែលបានកំណត់រួចទេ";
  const max =
    key === "current_address"
      ? 4000
      : key.endsWith("phone")
        ? 30
        : ["desk_number", "room_number"].includes(key)
          ? 20
          : key === "student_id_number"
            ? 50
            : 100;
  return text.length > max ? `អត្ថបទវែងពេក (អតិបរមា ${max} តួ)` : null;
}

export function stageAdminCells(
  drafts: GridDrafts,
  rows: GridRow[],
  updates: GridDrafts,
): GridDrafts {
  const result = { ...drafts };
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const [id, patch] of Object.entries(updates)) {
    const row = byId.get(id);
    if (!row) throw new Error("រកមិនឃើញ UUID សិស្សក្នុងថ្នាក់ដែលបានផ្ទុក");
    const next = { ...result[id] };
    for (const [key, value] of Object.entries(patch)) {
      if (!ADMIN_EDITABLE_FIELDS.includes(key))
        throw new Error("មិនអាចកែប្រែព័ត៌មានការពារបានទេ");
      const normalized = normalizeAdminCell(key, value);
      if ((normalized ?? "") === (row[key] ?? "")) delete next[key];
      else next[key] = normalized;
    }
    if (Object.keys(next).length) result[id] = next;
    else delete result[id];
  }
  return result;
}

export function pasteAdminCells(
  rows: GridRow[],
  columns: AdminColumn[],
  rowIndex: number,
  columnIndex: number,
  matrix: string[][],
): GridDrafts {
  if (
    rowIndex + matrix.length > rows.length ||
    matrix.some((row) => columnIndex + row.length > columns.length)
  )
    throw new Error(
      "ទិន្នន័យលើសតំបន់ដែលបានផ្ទុក។ មិនមានសិស្សថ្មីត្រូវបានបង្កើតទេ។",
    );
  const updates: GridDrafts = {};
  matrix.forEach((cells, r) =>
    cells.forEach((value, c) => {
      const column = columns[columnIndex + c];
      if ("locked" in column || !value.trim()) return;
      (updates[rows[rowIndex + r].id] ||= {})[column.key] = normalizeAdminCell(
        column.key,
        value,
      );
    }),
  );
  return updates;
}

export function adminPatchPayload(rows: GridRow[], drafts: GridDrafts) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return Object.entries(drafts).map(([studentId, changes]) => {
    const row = byId.get(studentId);
    if (!row) throw new Error("Unknown student UUID");
    const validatedChanges: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(changes)) {
      const error = validateAdminCell(key, value, row[key]);
      if (error) throw new Error(error);
      validatedChanges[key] = typeof value === "string" ? value : null;
    }
    return {
      studentId,
      changes: validatedChanges,
      original: Object.fromEntries(
        Object.keys(changes).map((key) => [
          key,
          row[key] == null ? null : String(row[key]),
        ]),
      ),
    };
  });
}
