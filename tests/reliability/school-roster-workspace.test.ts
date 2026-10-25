import { test } from "node:test";
import assert from "node:assert/strict";
import {
  schoolRosterColumns,
  mapHeaders,
  stageGridUpdates,
  previewImport,
  type GridSnapshot,
} from "../../lib/students/grid";
import {
  addressCellValue,
  mergeAddressCells,
} from "../../lib/students/address";
import { generateOfficialSchoolRosterWorkbook } from "../../lib/excel/officialSchoolRosterExport";

test("School roster headers follow both official layouts, with contextual family and scholarship labels", () => {
  const lower = schoolRosterColumns().map((column) => column.key);
  assert.deepEqual(lower.slice(0, 15), [
    "student_id_number",
    "full_name",
    "gender",
    "date_of_birth",
    "pob",
    "primary_school",
    "secondary_school",
    "father_name",
    "father_job",
    "father_phone",
    "mother_name",
    "mother_job",
    "mother_phone",
    "addr_village",
    "addr_commune",
  ]);
  assert.deepEqual(
    schoolRosterColumns(true)
      .slice(6, 10)
      .map((column) => column.key),
    ["room_number", "desk_number", "exam_grade", "secondary_school"],
  );
  assert.deepEqual(
    mapHeaders([
      "អត្តលេខ",
      "គោត្តនាម និងនាម",
      "ថ្ងៃ ខែ ឆ្នាំ កំណើត",
      "ឈ្មោះឪពុក",
      "មុខរបរ",
      "លេខទូសព្ទ",
      "ឈ្មោះម្តាយ",
      "មុខរបរ",
      "លេខទូសព្ទ",
      "ភូមិ",
      "ឃុំ",
      "ស្រុក",
      "ខេត្ត",
      "គម្រោង/កម្មវិធី",
      "សម្ភារៈ",
      "ថវិកា",
      "ផ្សេងៗ",
      "ផ្សេងៗ",
    ]),
    [
      "student_id_number",
      "full_name",
      "date_of_birth",
      "father_name",
      "father_job",
      "father_phone",
      "mother_name",
      "mother_job",
      "mother_phone",
      "addr_village",
      "addr_commune",
      "addr_district",
      "addr_province",
      "scholarship_program",
      "scholarship_materials",
      "scholarship_funding",
      "scholarship_other",
      "notes",
    ],
  );
  assert.deepEqual(
    mapHeaders(["មុខរបរ", "លេខទូសព្ទ"]),
    ["", ""],
    "Repeated family fields require context",
  );
});

test("Four address cells stage a single canonical change with the original conflict baseline", () => {
  const address = "ភូមិ១ សង្កាត់បឹងកក់១ ខណ្ឌទួលគោក រាជធានីភ្នំពេញ";
  const rows = [{ id: "a", address }];
  const empty: GridSnapshot = { drafts: {}, originals: {} };
  const first = stageGridUpdates(empty, { a: { addr_village: "២" } }, rows);
  assert.deepEqual(first.drafts, {
    a: { address: "ភូមិ២ សង្កាត់បឹងកក់១ ខណ្ឌទួលគោក រាជធានីភ្នំពេញ" },
  });
  const second = stageGridUpdates(
    first,
    { a: { addr_commune: "បឹងកក់២" } },
    rows,
  );
  assert.equal(addressCellValue(second.drafts.a.address, "addr_village"), "២");
  assert.equal(
    addressCellValue(second.drafts.a.address, "addr_commune"),
    "បឹងកក់២",
  );
  assert.deepEqual(second.originals, { a: { address } });
  assert.equal(
    first.drafts.a.address,
    "ភូមិ២ សង្កាត់បឹងកក់១ ខណ្ឌទួលគោក រាជធានីភ្នំពេញ",
    "Undo snapshots stay immutable",
  );
  const cleared = stageGridUpdates(second, { a: { addr_commune: null } }, rows);
  assert.equal(addressCellValue(cleared.drafts.a.address, "addr_commune"), "");
  assert.equal(
    addressCellValue(cleared.drafts.a.address, "addr_province"),
    "ភ្នំពេញ",
  );
  assert.equal(mergeAddressCells(null, { addr_village: null }), null);
  assert.deepEqual(
    stageGridUpdates(first, { a: { addr_village: "១" } }, rows),
    empty,
  );
});

test("School sheet imports preserve blank address components and stage the new optional details", () => {
  const rows = [
    {
      id: "a",
      student_id_number: "0001",
      full_name: "Dara",
      address: "ភូមិក ឃុំខ ស្រុកគ ខេត្តឃ",
    },
  ];
  const preview = previewImport(
    [["0001", "ង", "", "សាលាក", "សាលាខ", "ខ្មែរ"]],
    [
      "student_id_number",
      "addr_village",
      "addr_province",
      "primary_school",
      "secondary_school",
      "ethnicity",
    ],
    rows,
  );
  assert.deepEqual(preview[0].errors, []);
  assert.equal(Object.hasOwn(preview[0].patch, "addr_province"), false);
  const staged = stageGridUpdates(
    { drafts: {}, originals: {} },
    { a: preview[0].patch },
    rows,
  );
  assert.equal(staged.drafts.a.address, "ភូមិង ឃុំខ ស្រុកគ ខេត្តឃ");
  assert.equal(staged.drafts.a.secondary_school, "សាលាខ");
});

test("School export keeps its layout and fills existing cells from the newly supported profiles", async () => {
  for (const grade of [7, 10]) {
    const upper = grade === 10;
    const options = {
      classInfo: { id: "class", name: `${grade}A`, grade },
      academicYear: { name: "2026-2027" },
    };
    const base = await generateOfficialSchoolRosterWorkbook({
      ...options,
      students: [{ id: "a", full_name: "Dara" }],
    });
    const book = await generateOfficialSchoolRosterWorkbook({
      ...options,
      students: [
        {
          id: "a",
          full_name: "Dara",
          student_id_number: "0001",
          pob: "ព្រៃវែង",
          prev_school: "legacy",
          primary_school: "បឋមក",
          secondary_school: "អនុវិទ្យាល័យខ",
          ethnicity: "ខ្មែរ",
          scholarship_program: "កម្មវិធីក",
          scholarship_materials: "សៀវភៅ",
          scholarship_funding: "10000",
          scholarship_other: "កាបូប",
          student_roles: "កាកបាទក្រហម, កាយរិទ្ធិ",
          elective_subject: "កសិកម្ម",
          notes: "កំណត់សម្គាល់",
          current_address: "ភូមិក ឃុំខ ស្រុកគ ខេត្តឃ",
        },
      ],
    });
    const sheet = book.worksheets[0],
      original = base.worksheets[0];
    assert.deepEqual(sheet.model.merges, original.model.merges);
    assert.deepEqual(
      sheet.columns.map((column) => column.width),
      original.columns.map((column) => column.width),
    );
    const row = sheet.getRow(upper ? 12 : 9);
    assert.equal(row.getCell(2).value, "0001");
    assert.equal(row.getCell(6).value, "ព្រៃវែង");
    assert.equal(row.getCell(7).value, "បឋមក");
    assert.equal(row.getCell(upper ? 11 : 8).value, "អនុវិទ្យាល័យខ");
    assert.equal(row.getCell(upper ? 23 : 20).value, "ខ្មែរ");
    assert.equal(
      row.getCell(upper ? 30 : 27).value,
      "",
      "Month remains report-owned",
    );
    for (const [i, value] of ["កម្មវិធីក", "សៀវភៅ", "10000", "កាបូប"].entries())
      assert.equal(row.getCell((upper ? 24 : 21) + i).value, value);
    assert.equal(row.getCell(upper ? 38 : 35).value, "✔");
    assert.equal(row.getCell(upper ? 39 : 36).value, "✔");
    assert.equal(row.getCell(upper ? 42 : 39).value, "កំណត់សម្គាល់");
  }
});
