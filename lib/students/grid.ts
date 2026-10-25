import { parseStudentDob } from "../utils/student-date";
import { ADDRESS_KEYS, mergeAddressCells } from "./address";

export type CellValue = string | number | null;
export type GridRow = { id: string; [field: string]: unknown };
export type GridPatch = Record<string, CellValue>;
export type GridDrafts = Record<string, GridPatch>;
export interface GridSnapshot {
  drafts: GridDrafts;
  originals: GridDrafts;
}
export interface GridColumn {
  key: string;
  db: string;
  label: string;
  group: string;
  editable: boolean;
  kind: "text" | "number" | "date" | "enum";
  aliases: string[];
  options?: Record<string, string>;
  width: number;
  section?: string;
  virtual?: "address";
  hiddenInTable?: boolean;
}
const yesNo = { yes: "មាន", no: "គ្មាន" };
function col(
  key: string,
  label: string,
  group: string,
  extra: Partial<GridColumn> = {},
): GridColumn {
  return {
    key,
    db: key,
    label,
    group,
    editable: true,
    kind: "text",
    aliases: [key],
    width: 160,
    ...extra,
  };
}
export const GRID_COLUMNS: GridColumn[] = [
  col("student_id_number", "អត្តលេខ", "អត្តសញ្ញាណ", {
    editable: false,
    aliases: ["Student ID", "ID"],
    width: 120,
  }),
  col("full_name", "គោត្តនាម និងនាម", "អត្តសញ្ញាណ", {
    editable: false,
    aliases: ["Full Name", "Name", "ឈ្មោះសិស្ស"],
    width: 220,
  }),
  col("gender", "ភេទ", "ព័ត៌មានផ្ទាល់ខ្លួន", {
    editable: false,
    options: { M: "ប្រុស", F: "ស្រី" },
    aliases: ["Gender"],
  }),
  col("english_name", "ឈ្មោះជាអក្សរឡាតាំង", "ព័ត៌មានផ្ទាល់ខ្លួន", {
    aliases: ["English Name"],
  }),
  col("date_of_birth", "ថ្ងៃខែឆ្នាំកំណើត", "ព័ត៌មានផ្ទាល់ខ្លួន", {
    db: "dob",
    kind: "date",
    aliases: ["DOB", "Date of Birth", "dob"],
  }),
  col("pob", "ទីកន្លែងកំណើត", "ព័ត៌មានផ្ទាល់ខ្លួន", {
    aliases: ["Place of Birth", "ទីកន្លែងកំណើត"],
  }),
  col("primary_school", "មកពីសាលាបឋមសិក្សា", "ការសិក្សា"),
  col("secondary_school", "មកពីសាលាមធ្យមសិក្សា", "ការសិក្សា"),
  col("exam_grade", "និទ្ទេស", "ការសិក្សា", {
    section: "ប្រឡងសញ្ញាបត្រមធ្យមសិក្សាបឋមភូមិ",
  }),
  col("age", "អាយុ", "ព័ត៌មានផ្ទាល់ខ្លួន", { editable: false }),
  col("birth_cert_no", "លេខសំបុត្រកំណើត", "ព័ត៌មានផ្ទាល់ខ្លួន"),
  col("student_phone", "លេខទូសព្ទសិស្ស", "ព័ត៌មានផ្ទាល់ខ្លួន", {
    aliases: ["លេខទូរស័ព្ទសិស្ស"],
  }),
  col("desk_number", "លេខតុ", "ការសិក្សា", { editable: false }),
  col("room_number", "លេខបន្ទប់", "ការសិក្សា", {
    editable: false,
    aliases: ["បន្ទប់"],
  }),
  col("status", "ប្រភេទចុះឈ្មោះ", "ការសិក្សា", {
    kind: "enum",
    options: { new: "ថ្មី", repeater: "ត្រួតថ្នាក់", transfer: "ផ្ទេរចូល" },
  }),
  col("current_status", "ស្ថានភាពចុះឈ្មោះ", "ការសិក្សា", { editable: false }),
  col("prev_school", "សាលាមុន", "ការសិក្សា"),
  col("scholarship", "អាហារូបករណ៍", "ការសិក្សា", {
    kind: "enum",
    options: yesNo,
  }),
  col("ethnicity", "ជនជាតិ / ជនជាតិដើមភាគតិច", "ការសិក្សា"),
  col("scholarship_program", "គម្រោង/កម្មវិធី", "ការសិក្សា", {
    section: "អាហារូបករណ៏",
  }),
  col("scholarship_materials", "សម្ភារៈ", "ការសិក្សា", {
    section: "អាហារូបករណ៏",
  }),
  col("scholarship_funding", "ថវិកា", "ការសិក្សា", { section: "អាហារូបករណ៏" }),
  col("scholarship_other", "ផ្សេងៗ", "ការសិក្សា", {
    section: "អាហារូបករណ៏",
    aliases: ["scholarship_other", "ផ្សេងៗ (អាហារូបករណ៏)"],
  }),
  col("elective_subject", "មុខវិជ្ជាជ្រើសរើស", "ការសិក្សា"),
  col("student_roles", "តួនាទីសិស្សក្នុងសាលារៀន", "ការសិក្សា"),
  col("notes", "ផ្សេងៗ", "ព័ត៌មានផ្ទាល់ខ្លួន", {
    aliases: ["Notes", "ផ្សេងៗ"],
  }),
  col("id_poor", "ប័ណ្ណក្រីក្រ", "ការសិក្សា", {
    kind: "enum",
    options: { none: "គ្មាន", level_1: "កម្រិត ១", level_2: "កម្រិត ២" },
  }),
  col("orphan", "កំព្រា", "ការសិក្សា", { kind: "enum", options: yesNo }),
  col("indigenous", "ជនជាតិដើមភាគតិច", "ការសិក្សា", {
    kind: "enum",
    options: yesNo,
  }),
  col("distance_km", "ចម្ងាយទៅសាលា (km)", "ការសិក្សា", { kind: "number" }),
  col("height_m", "កម្ពស់ (m)", "សុខភាព", { kind: "number" }),
  col("weight_kg", "ទម្ងន់ (kg)", "សុខភាព", { kind: "number" }),
  col("bmi", "BMI", "សុខភាព", { editable: false }),
  col("nutrition_status", "ស្ថានភាពអាហារូបត្ថម្ភ", "សុខភាព", {
    editable: false,
  }),
  col("disability", "ពិការភាព", "សុខភាព", {
    kind: "enum",
    aliases: ["លក្ខណៈពិសេស (ពិការភាព)", "disability"],
    options: { none: "គ្មាន", mild: "ស្រាល", severe: "ធ្ងន់" },
  }),
  col("assistive_device", "ឧបករណ៍ជំនួយ", "សុខភាព"),
  col("health_issues", "កំណត់សម្គាល់សុខភាព", "សុខភាព", {
    db: "health_note",
    width: 260,
  }),
  ...(["father", "mother", "guardian"] as const).flatMap((who, index) => {
    const name = ["ឪពុក", "ម្តាយ", "អាណាព្យាបាល"][index];
    return [
      col(`${who}_name`, `ឈ្មោះ${name}`, "គ្រួសារ", {
        section: `ព័ត៌មាន${name}`,
      }),
      col(`${who}_job`, "មុខរបរ", "គ្រួសារ", {
        section: `ព័ត៌មាន${name}`,
        aliases: [`មុខរបរ${name}`, `${who}_job`],
      }),
      col(`${who}_phone`, "លេខទូសព្ទ", "គ្រួសារ", {
        section: `ព័ត៌មាន${name}`,
        aliases: [`លេខទូរស័ព្ទ${name}`, `${who}_phone`],
      }),
    ];
  }),
  col("parent_phone", "លេខទំនាក់ទំនងចម្បង", "គ្រួសារ"),
  col("siblings_count", "ចំនួនបងប្អូន", "គ្រួសារ", { kind: "number" }),
  col("income", "ចំណូលគ្រួសារ", "គ្រួសារ", { kind: "number" }),
  col("address", "អាសយដ្ឋានបច្ចុប្បន្ន", "ទីលំនៅ", {
    db: "current_address",
    width: 300,
    aliases: ["Address", "current_address"],
    hiddenInTable: true,
  }),
  ...ADDRESS_KEYS.map((key, index) =>
    col(key, ["ភូមិ", "ឃុំ", "ស្រុក", "ខេត្ត"][index], "ទីលំនៅ", {
      db: "current_address",
      virtual: "address",
      section: "អាសយដ្ឋានបច្ចុប្បន្ន",
    }),
  ),
  col("migrant_status", "ចំណាកស្រុក", "ទីលំនៅ", {
    kind: "enum",
    options: { none: "គ្មាន", parents: "ឪពុកម្តាយ", student: "សិស្ស" },
  }),
  col("housing", "ស្ថានភាពលំនៅឋាន", "ទីលំនៅ"),
];
export const EDITABLE_GRID_COLUMNS = GRID_COLUMNS.filter(
  (c) => c.editable && !c.virtual,
);

/** Familiar school-template order; supplemental profile details remain available afterwards. */
export function schoolRosterColumns(upperSecondary = false): GridColumn[] {
  const keys = [
    "student_id_number",
    "full_name",
    "gender",
    "date_of_birth",
    "pob",
    "primary_school",
    ...(upperSecondary ? ["room_number", "desk_number", "exam_grade"] : []),
    "secondary_school",
    "father_name",
    "father_job",
    "father_phone",
    "mother_name",
    "mother_job",
    "mother_phone",
    ...ADDRESS_KEYS,
    "student_phone",
    "ethnicity",
    "scholarship_program",
    "scholarship_materials",
    "scholarship_funding",
    "scholarship_other",
    "disability",
    "elective_subject",
    "id_poor",
    "student_roles",
    "notes",
  ];
  const ordered = keys.map((key) => GRID_COLUMNS.find((c) => c.key === key)!);
  return [
    ...ordered,
    ...GRID_COLUMNS.filter((c) => !keys.includes(c.key)),
  ].filter((c) => !c.hiddenInTable);
}
export function westernDigits(value: string): string {
  return value.replace(/[០-៩]/g, (c) => String("០១២៣៤៥៦៧៨៩".indexOf(c)));
}
export function normalizeGridCell(column: GridColumn, raw: unknown): CellValue {
  if (raw === null) return null;
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const digits = westernDigits(text);
  if (column.key === "gender") {
    if (["f", "female", "ស្រី", "ស"].includes(digits.toLowerCase())) return "F";
    if (["m", "male", "ប្រុស", "ប"].includes(digits.toLowerCase())) return "M";
  }
  if (column.kind === "date") {
    // A year alone must never become an invented January 1st birthday.
    const complete =
      /^(?:\d{5}|\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:T[\d:.Z+-]+)?|\d{1,2}[\s/.-]+\d{1,2}[\s/.-]+\d{4})$/;
    return complete.test(digits) ? parseStudentDob(digits) || text : text;
  }
  if (column.kind === "number") {
    if (digits.includes(",") && !/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(digits))
      return text;
    const numeric = digits.replace(/,/g, "");
    if (!/^\d+(\.\d+)?$/.test(numeric)) return text;
    const number = Number(numeric);
    return column.key === "height_m" && number > 3 ? number / 100 : number;
  }
  if (column.options) {
    const match = Object.entries(column.options).find(
      ([key, label]) => key === digits.toLowerCase() || label === text,
    );
    if (match) return match[0];
    if (["yes", "no"].every((key) => key in column.options!)) {
      if (["1", "true", "បាទ", "ចាស"].includes(digits.toLowerCase()))
        return "yes";
      if (["0", "false", "ទេ"].includes(digits.toLowerCase())) return "no";
    }
  }
  return column.key.includes("phone") ? digits : text;
}
export function validateGridCell(
  column: GridColumn,
  value: unknown,
): string | null {
  if (value === null || value === "") return null;
  if (
    column.kind === "number" &&
    (typeof value !== "number" || !Number.isFinite(value) || value < 0)
  )
    return "សូមបញ្ចូលលេខវិជ្ជមាន ឬសូន្យ";
  if (column.key === "siblings_count" && !Number.isInteger(value))
    return "សូមបញ្ចូលចំនួនគត់";
  if (["height_m", "weight_kg"].includes(column.key) && Number(value) <= 0)
    return "តម្លៃត្រូវធំជាងសូន្យ";
  if (column.key === "height_m" && Number(value) > 3)
    return "កម្ពស់មិនត្រឹមត្រូវ (ឯកតា m)";
  if (column.key === "weight_kg" && Number(value) > 999.99)
    return "ទម្ងន់លើសកម្រិតដែលអាចរក្សាទុក";
  if (
    column.kind === "date" &&
    (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      parseStudentDob(value) !== value)
  )
    return "ថ្ងៃកំណើតមិនត្រឹមត្រូវ (ថ្ងៃ/ខែ/ឆ្នាំ)";
  if (
    column.kind === "date" &&
    String(value) >
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Phnom_Penh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date())
  )
    return "ថ្ងៃកំណើតមិនអាចនៅពេលអនាគត";
  if (
    column.kind === "enum" &&
    !Object.hasOwn(column.options || {}, String(value))
  )
    return "សូមជ្រើសតម្លៃពីបញ្ជី";
  if (
    column.key.includes("phone") &&
    !/^\+?[\d ()-]{6,25}$/.test(String(value))
  )
    return "លេខទូរស័ព្ទមិនត្រឹមត្រូវ";
  if (typeof value === "string" && value.length > 4000)
    return "អត្ថបទវែងពេក (អតិបរមា 4000 តួ)";
  return null;
}
/** Quoted TSV supports Excel tabs/newlines inside cells and retains interior blank rows. */
export function parseClipboard(text: string, html?: string): string[][] {
  if (html && typeof DOMParser !== "undefined") {
    const table = new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector("table");
    if (table) {
      const rows: string[][] = [];
      const occupied = new Map<string, boolean>();
      for (const [ri, tr] of Array.from(table.rows).entries()) {
        const row: string[] = [];
        for (const cell of Array.from(tr.cells)) {
          while (occupied.has(`${ri}:${row.length}`)) row.push("");
          const ci = row.length;
          cell.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
          row.push(cell.textContent || "");
          for (let span = 1; span < cell.colSpan; span++) row.push("");
          for (let r = 1; r < cell.rowSpan; r++)
            for (let c = 0; c < cell.colSpan; c++)
              occupied.set(`${ri + r}:${ci + c}`, true);
        }
        while (occupied.has(`${ri}:${row.length}`)) row.push("");
        rows.push(row);
      }
      return rows;
    }
  }
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' && (quoted || cell === "")) {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (ch === "\t" || ch === "\n" || ch === "\r")) {
      row.push(cell);
      cell = "";
      if (ch !== "\t") {
        rows.push(row);
        row = [];
        if (ch === "\r" && text[i + 1] === "\n") i++;
      }
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
export function quoteClipboard(rows: unknown[][]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? "");
          return /[\t\r\n"]/.test(text)
            ? `"${text.replace(/"/g, '""')}"`
            : text;
        })
        .join("\t"),
    )
    .join("\n");
}
const headerKey = (s: string) => s.toLowerCase().replace(/[\s_.()៖:]+/g, "");
export function mapHeaders(headers: string[]): string[] {
  let family = "";
  let scholarship = false;
  return headers.map((header) => {
    if (/អាហារូបករណ|គម្រោង|scholarship/i.test(header)) scholarship = true;
    if (scholarship && header.trim() === "ផ្សេងៗ") {
      scholarship = false;
      return "scholarship_other";
    }
    if (/ពិការភាព|ថ្នាក់ទី|មុខវិជ្ជា/.test(header)) scholarship = false;
    if (/ឪពុក|father/i.test(header)) family = "father";
    else if (/ម្តាយ|mother/i.test(header)) family = "mother";
    else if (/អាណាព្យាបាល|guardian/i.test(header)) family = "guardian";
    const exact = GRID_COLUMNS.filter((c) =>
      [c.key, c.label, ...c.aliases].some(
        (alias) => headerKey(alias) === headerKey(header),
      ),
    );
    if (exact.length === 1) return exact[0].key;
    if (header.trim() === "ផ្សេងៗ" && !scholarship) return "notes";
    if (family && /^(មុខរបរ|occupation|job)$/i.test(header.trim()))
      return `${family}_job`;
    if (
      family &&
      /^(លេខទូសព្ទ|លេខទូរស័ព្ទ|លេខទូស័ព្ទ|phone)$/i.test(header.trim())
    )
      return `${family}_phone`;
    return "";
  });
}
export interface ImportPreviewRow {
  source: number;
  studentId?: string;
  name: string;
  patch: GridPatch;
  errors: string[];
  fallback: boolean;
}
export function previewImport(
  matrix: string[][],
  mapping: string[],
  students: GridRow[],
): ImportPreviewRow[] {
  const rows = matrix.map((cells, index): ImportPreviewRow => {
    const record = Object.fromEntries(
      mapping.flatMap((field, i) => (field ? [[field, cells[i] || ""]] : [])),
    );
    const id = westernDigits(record.student_id_number || "").trim();
    const name = (record.full_name || "").trim();
    const gender = normalizeGridCell(GRID_COLUMNS[2], record.gender);
    const matches = students.filter((s) =>
      id
        ? westernDigits(String(s.student_id_number)).trim() === id
        : name &&
          String(s.full_name).trim() === name &&
          (!gender || s.gender === gender),
    );
    const errors: string[] = [];
    if (matches.length !== 1)
      errors.push(
        id ? "អត្តលេខមិនមានក្នុងថ្នាក់ ឬស្ទួន" : "មិនអាចផ្គូផ្គងឈ្មោះតែមួយបាន",
      );
    const patch: GridPatch = {};
    for (const column of GRID_COLUMNS.filter((c) => c.editable)) {
      if (!record[column.key]?.trim()) continue;
      const value = normalizeGridCell(column, record[column.key]);
      patch[column.key] = value;
      const error = validateGridCell(column, value);
      if (error) errors.push(`${column.label}: ${error}`);
    }
    return {
      source: index + 1,
      studentId: matches.length === 1 ? matches[0].id : undefined,
      name: matches.length === 1 ? String(matches[0].full_name) : name,
      patch,
      errors,
      fallback: !id,
    };
  });
  const counts = new Map<string, number>();
  rows.forEach((r) => {
    if (r.studentId)
      counts.set(r.studentId, (counts.get(r.studentId) || 0) + 1);
  });
  rows.forEach((r) => {
    if (r.studentId && counts.get(r.studentId)! > 1)
      r.errors.push("សិស្សត្រូវបានផ្គូផ្គងស្ទួន");
  });
  return rows;
}
export function applyBlock(
  rows: GridRow[],
  columns: GridColumn[],
  startRow: number,
  startCol: number,
  matrix: string[][],
): GridDrafts {
  if (
    startRow + matrix.length > rows.length ||
    matrix.some((r) => startCol + r.length > columns.length)
  )
    throw new Error("ទិន្នន័យលើសចំនួនជួរ ឬជួរឈរ។ សូមពិនិត្យតំបន់បិទភ្ជាប់។");
  const updates: GridDrafts = {};
  matrix.forEach((cells, ri) =>
    cells.forEach((text, ci) => {
      const column = columns[startCol + ci];
      if (!column.editable || !text.trim()) return;
      (updates[rows[startRow + ri].id] ||= {})[column.key] = normalizeGridCell(
        column,
        text,
      );
    }),
  );
  return updates;
}

export function stageGridUpdates(
  previous: GridSnapshot,
  updates: GridDrafts,
  students: GridRow[],
): GridSnapshot {
  const byId = new Map(students.map((s) => [s.id, s]));
  const drafts = structuredClone(previous.drafts);
  const originals = structuredClone(previous.originals);
  for (const [id, patch] of Object.entries(updates)) {
    const student = byId.get(id);
    if (!student) continue;
    const canonical = { ...patch };
    if (ADDRESS_KEYS.some((key) => Object.hasOwn(patch, key))) {
      const address = Object.hasOwn(patch, "address")
        ? patch.address
        : Object.hasOwn(drafts[id] || {}, "address")
          ? drafts[id].address
          : (student.address ?? student.current_address);
      canonical.address = mergeAddressCells(address, patch);
    }
    for (const [key, value] of Object.entries(canonical)) {
      if (!EDITABLE_GRID_COLUMNS.some((c) => c.key === key)) continue;
      const original = Object.hasOwn(originals[id] || {}, key)
        ? originals[id][key]
        : ((student[key] ??
            (key === "address" ? student.current_address : null) ??
            null) as CellValue);
      if ((original ?? "") === (value ?? "")) {
        delete drafts[id]?.[key];
        delete originals[id]?.[key];
      } else {
        (drafts[id] ||= {})[key] = value;
        (originals[id] ||= {})[key] = original;
      }
    }
    if (!Object.keys(drafts[id] || {}).length) {
      delete drafts[id];
      delete originals[id];
    }
  }
  return { drafts, originals };
}
