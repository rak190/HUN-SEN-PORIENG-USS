import { test } from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { applySchema, findBasicImportHeader } from "../../lib/import/schema";
import {
  normalizeBasicRegistrationRows,
  optionalOfficialId,
} from "../../lib/students/basic-registration";
import { AdminUpdateStudentSchema } from "../../app/(dashboard)/admin/students/student-edit-schema";

const classId = "00000000-0000-4000-8000-000000000020";
test("Official ID normalization preserves text and leading zeros; only nonempty duplicates are rejected", () => {
  for (const input of [undefined, null, "", "   "])
    assert.equal(optionalOfficialId.parse(input), null);
  assert.equal(optionalOfficialId.parse(" 00125 "), "00125");
  assert.throws(() => optionalOfficialId.parse(125));
  const rows = normalizeBasicRegistrationRows(
    Array.from({ length: 50 }, (_, i) => ({
      full_name: `Student ${i}`,
      gender: i % 2 ? "ស្រី" : "M",
      class_id: classId,
      student_id_number: i % 2 ? " " : null,
    })),
  );
  assert.equal(rows.length, 50);
  assert.ok(
    rows.every((row) => row.student_id_number === null && row.dob === null),
  );
  assert.deepEqual(
    normalizeBasicRegistrationRows([
      {
        full_name: "A",
        gender: "M",
        class_id: classId,
        student_id_number: "00101",
      },
    ])[0].student_id_number,
    "00101",
  );
  assert.throws(() =>
    normalizeBasicRegistrationRows([
      {
        full_name: "A",
        gender: "M",
        class_id: classId,
        student_id_number: "00101",
      },
      {
        full_name: "B",
        gender: "F",
        class_id: classId,
        student_id_number: " 00101 ",
      },
    ]),
  );
  for (const row of [
    { full_name: "", gender: "M", class_id: classId },
    { full_name: "A", gender: "bad", class_id: classId },
    { full_name: "A", gender: "M" },
  ])
    assert.throws(() => normalizeBasicRegistrationRows([row]));
});

test("Basic Excel header/schema mapping accepts omitted IDs, missing values, reordered headers and Khmer/English names", () => {
  for (const headers of [
    ["Full Name", "Gender", "Class"],
    ["ថ្នាក់", "ភេទ", "គោត្តនាម និងនាម"],
    ["អត្តលេខ", "នាមត្រកូល", "នាមខ្លួន", "ភេទ", "ថ្នាក់"],
  ]) {
    const values = headers.map(
      (header) =>
        ({
          "Full Name": "Dara",
          Gender: "F",
          Class: "7A",
          ថ្នាក់: "7A",
          ភេទ: "ស្រី",
          "គោត្តនាម និងនាម": "ដារ៉ា",
          អត្តលេខ: "",
          នាមត្រកូល: "សុខ",
          នាមខ្លួន: "ដារ៉ា",
        })[header] || "",
    );
    const matrix = [["Instructions"], headers, values];
    assert.equal(findBasicImportHeader(matrix), 1);
    const mapped = applySchema(
      Object.fromEntries(headers.map((header, i) => [header, values[i]])),
      values,
      headers,
      { requireStudentId: false },
    );
    assert.deepEqual(mapped.errors, []);
    assert.equal(mapped.result.student_id_number, null);
    assert.equal(mapped.result.gender, "F");
    assert.equal(mapped.result.class_name, "7A");
  }
  const input = { "Full Name": "Dara", Gender: "invalid", Class: "7A" };
  assert.ok(
    applySchema(input, [], [], { requireStudentId: false }).errors.some(
      (error) => error.column === "ភេទ",
    ),
  );
  assert.ok(
    applySchema({ ...input, Gender: "M" }, [], []).errors.some(
      (error) => error.column === "អត្តលេខ",
    ),
    "Other import callers still require ID by default",
  );
  assert.deepEqual(
    applySchema({ "full name": "Dara", gender: "m", class: "7A" }, [], [], {
      requireStudentId: false,
    }).errors,
    [],
  );
});

test("Excel formatted ID text remains zero-padded while blank IDs remain blank", () => {
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Student ID", "Full Name", "Gender", "Class"],
    [101, "Dara", "M", "7A"],
    ["", "Sophea", "F", "7A"],
  ]);
  sheet.A2.z = "00000";
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Data");
  const read = XLSX.read(
    XLSX.write(book, { type: "buffer", bookType: "xlsx" }),
    { type: "buffer" },
  );
  const rows = XLSX.utils.sheet_to_json<string[]>(read.Sheets.Data, {
    header: 1,
    raw: false,
    defval: "",
  });
  const results = rows
    .slice(1)
    .map((row) =>
      applySchema(
        Object.fromEntries(rows[0].map((header, i) => [header, row[i]])),
        row,
        rows[0],
        { requireStudentId: false },
      ),
    );
  assert.equal(results[0].result.student_id_number, "00101");
  assert.equal(results[1].result.student_id_number, null);
  assert.ok(results.every((result) => result.errors.length === 0));
});

test("Existing UUID profile edits and later ID assignment accept missing DOB and official ID", () => {
  const base = {
    studentId: classId,
    full_name: "Sok Dara",
    gender: "M",
    dob: "",
  };
  assert.equal(AdminUpdateStudentSchema.parse(base).student_id_number, null);
  assert.equal(AdminUpdateStudentSchema.parse(base).dob, null);
  assert.equal(
    AdminUpdateStudentSchema.parse({ ...base, student_id_number: "00725" })
      .student_id_number,
    "00725",
  );
  assert.equal(
    AdminUpdateStudentSchema.parse({ ...base, dob: "22 01 2008" }).dob,
    "2008-01-22",
  );
  assert.equal(
    AdminUpdateStudentSchema.safeParse({ ...base, dob: "bad date" }).success,
    false,
  );
});
