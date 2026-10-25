import { test } from "node:test";
import assert from "node:assert/strict";
import { createStudentGridWorkbook } from '../../lib/excel/student-grid-export';
import {
  GRID_COLUMNS,
  EDITABLE_GRID_COLUMNS,
  parseClipboard,
  quoteClipboard,
  normalizeGridCell,
  validateGridCell,
  mapHeaders,
  previewImport,
  applyBlock,
  stageGridUpdates,
  GridRow,
} from "../../lib/students/grid";

const column = (key: string) => GRID_COLUMNS.find((c) => c.key === key)!;
const roster: GridRow[] = Array.from({ length: 45 }, (_, i) => ({
  id: `uuid-${i}`,
  student_id_number: `S${String(i + 1).padStart(3, "0")}`,
  full_name: `សិស្ស ${i + 1}`,
  gender: i % 2 ? "F" : "M",
  father_phone: "012345678",
  address: "អាសយដ្ឋានដើម",
}));

test('Class workbook retains every student, canonical headers and phone zeros on reimport', async () => {
  const ExcelJS = (await import('exceljs')).default;
  const book = createStudentGridWorkbook(roster);
  const reloaded = new ExcelJS.Workbook();
  await reloaded.xlsx.load(await book.xlsx.writeBuffer());
  const sheet = reloaded.worksheets[0];
  assert.equal(sheet.rowCount, 46);
  const headers = GRID_COLUMNS.map((_, i) => String(sheet.getRow(1).getCell(i + 1).value));
  assert.deepEqual(mapHeaders(headers), GRID_COLUMNS.map(c => c.key));
  const phoneIndex = GRID_COLUMNS.findIndex(c => c.key === 'father_phone') + 1;
  assert.equal(sheet.getRow(2).getCell(phoneIndex).value, '012345678');
  const matrix = Array.from({ length: 45 }, (_, i) => GRID_COLUMNS.map((_, ci) => String(sheet.getRow(i + 2).getCell(ci + 1).value ?? '')));
  assert.ok(previewImport(matrix, mapHeaders(headers), roster).every(row => row.studentId && row.errors.length === 0));
});

test("Excel clipboard round trip preserves quotes, tabs, blank rows and multiline Khmer text", () => {
  const cells = [
    ["S001", 'ភូមិ "ក"\nផ្លូវ\t១'],
    ["", ""],
    ["S003", "012345678"],
  ];
  assert.deepEqual(parseClipboard(quoteClipboard(cells) + "\r\n"), cells);
  assert.deepEqual(parseClipboard("a\tb\r\n\r\nc\td\r\n"), [
    ["a", "b"],
    [""],
    ["c", "d"],
  ]);
});
test("Normalization preserves phone zeros, valid zeroes, date semantics and invalid input for correction", () => {
  assert.equal(
    normalizeGridCell(column("father_phone"), "០១២៣៤៥៦៧៨"),
    "012345678",
  );
  assert.equal(normalizeGridCell(column("height_m"), "១៥៥"), 1.55);
  assert.equal(normalizeGridCell(column("income"), "0"), 0);
  assert.equal(
    normalizeGridCell(column("date_of_birth"), "២២/០១/២០០៨"),
    "2008-01-22",
  );
  assert.match(
    String(normalizeGridCell(column("date_of_birth"), "39553")),
    /^2008-/,
  );
  for (const [key, raw] of [
    ["date_of_birth", "31/02/2008"],
    ["date_of_birth", "2008"],
    ["income", "1,5"],
    ["income", "-5"],
    ["income", "12abc"],
    ["disability", "unknown"],
    ["father_phone", "hello"],
  ]) {
    const value = normalizeGridCell(column(key), raw);
    assert.equal(value, raw);
    assert.ok(
      validateGridCell(column(key), value),
      `${key} must retain an actionable error`,
    );
  }
  assert.ok(validateGridCell(column("siblings_count"), 1.5));
  assert.ok(validateGridCell(column("date_of_birth"), "2099-01-01"));
});
test("Header mapping supports shuffled bilingual headers and repeated family columns", () => {
  assert.deepEqual(
    mapHeaders([
      "ឈ្មោះឪពុក",
      "មុខរបរ",
      "លេខទូរស័ព្ទ",
      "ឈ្មោះម្តាយ",
      "មុខរបរ",
      "លេខទូរស័ព្ទ",
      "DOB",
      "Student ID",
      "???",
    ]),
    [
      "father_name",
      "father_job",
      "father_phone",
      "mother_name",
      "mother_job",
      "mother_phone",
      "date_of_birth",
      "student_id_number",
      "",
    ],
  );
});
test("Full-class import matches 45 reordered students by ID and preserves blank values", () => {
  const data = [...roster]
    .reverse()
    .map((s) => [String(s.student_id_number), `មុខរបរ ${s.id}`, "", "១៥៥"]);
  const preview = previewImport(
    data,
    ["student_id_number", "father_job", "father_phone", "height_m"],
    roster,
  );
  assert.equal(preview.length, 45);
  assert.ok(preview.every((p) => !p.errors.length));
  assert.equal(preview[0].studentId, "uuid-44");
  assert.equal(preview[0].patch.height_m, 1.55);
  assert.ok(!Object.hasOwn(preview[0].patch, "father_phone"));
  const staged = stageGridUpdates(
    { drafts: {}, originals: {} },
    Object.fromEntries(preview.map((p) => [p.studentId!, p.patch])),
    roster,
  );
  assert.equal(Object.keys(staged.drafts).length, 45);
  assert.equal(staged.originals["uuid-0"].height_m, null);
});
test("Unknown IDs never fall back to names; duplicate and ambiguous matches fail closed", () => {
  const unknown = previewImport(
    [["missing", String(roster[0].full_name)]],
    ["student_id_number", "full_name"],
    roster,
  );
  assert.ok(unknown[0].errors.length);
  assert.equal(unknown[0].studentId, undefined);
  const duplicate = previewImport(
    [["S001"], ["S001"]],
    ["student_id_number"],
    roster,
  );
  assert.ok(duplicate.every((r) => r.errors.length));
  const nameOnly = previewImport(
    [[String(roster[0].full_name)]],
    ["full_name"],
    roster,
  );
  assert.equal(nameOnly[0].studentId, "uuid-0");
  assert.equal(nameOnly[0].fallback, true);
  assert.ok(
    previewImport(
      [[String(roster[0].full_name)]],
      ["full_name"],
      [...roster, { ...roster[0], id: "other" }],
    )[0].errors.length,
  );
});
test("Block paste respects frozen/locked coordinates and refuses overflow without a partial patch", () => {
  const columns = [
    "student_id_number",
    "full_name",
    "gender",
    "english_name",
    "father_phone",
  ].map(column);
  const patch = applyBlock(roster, columns, 0, 0, [
    ["fake", "fake", "F", "Sok Dara", ""],
    ["", "", "", "Second", "099123456"],
  ]);
  assert.deepEqual(patch, {
    "uuid-0": { english_name: "Sok Dara" },
    "uuid-1": { english_name: "Second", father_phone: "099123456" },
  });
  assert.throws(() => applyBlock(roster, columns, 44, 3, [["a"], ["b"]]));
  assert.throws(() => applyBlock(roster, columns, 0, 4, [["a", "b"]]));
});
test("Draft changes retain original baselines through refresh, can explicitly clear, and undo without mutation", () => {
  const original = { drafts: {}, originals: {} };
  const first = stageGridUpdates(
    original,
    { "uuid-0": { address: "new", full_name: "forbidden" } },
    roster,
  );
  const second = stageGridUpdates(first, { "uuid-0": { address: null } }, [
    { ...roster[0], address: "concurrent change" },
  ]);
  assert.deepEqual(first.drafts, { "uuid-0": { address: "new" } });
  assert.equal(second.originals["uuid-0"].address, "អាសយដ្ឋានដើម");
  assert.equal(second.drafts["uuid-0"].address, null);
  assert.deepEqual(original, { drafts: {}, originals: {} });
  assert.deepEqual(
    stageGridUpdates(second, { "uuid-0": { address: "អាសយដ្ឋានដើម" } }, roster),
    original,
  );
});
test("Identity, placement, seating, enrollment and calculated columns remain protected", () => {
  for (const key of [
    "student_id_number",
    "full_name",
    "gender",
    "desk_number",
    "room_number",
    "current_status",
    "age",
    "bmi",
    "nutrition_status",
  ])
    assert.equal(column(key).editable, false);
  for (const key of [
    "status",
    "guardian_job",
    "orphan",
    "indigenous",
    "assistive_device",
    "housing",
    "migrant_status",
  ])
    assert.ok(EDITABLE_GRID_COLUMNS.some((c) => c.key === key));
});
