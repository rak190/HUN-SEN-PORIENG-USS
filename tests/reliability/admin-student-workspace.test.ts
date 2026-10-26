import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_STUDENT_COLUMNS,
  adminPatchPayload,
  normalizeAdminCell,
  pasteAdminCells,
  stageAdminCells,
  validateAdminCell,
} from "../../lib/students/admin-workspace";
import type { GridRow } from "../../lib/students/grid";

const roster: GridRow[] = Array.from({ length: 60 }, (_, i) => ({
  id: `uuid-${i}`,
  full_name: `Student ${i}`,
  student_id_number: null,
  gender: "M",
  class_name: "7A",
  dob: null,
  desk_number: String(i + 1).padStart(2, "0"),
  parent_phone: "legacy free text",
}));
test("Class paste, reorder, hidden drafts and save payload retain immutable UUIDs and originals", () => {
  const columns = ADMIN_STUDENT_COLUMNS.filter(
    (column) => !("extra" in column),
  );
  const matrix = roster
    .slice(0, 50)
    .map((_, i) => [
      `00${i}`,
      `កែ ${i}`,
      "ស្រី",
      "forged class",
      "22 01 2012",
      "R1",
      String(i + 1),
    ]);
  const pasted = pasteAdminCells(roster, columns, 0, 0, matrix);
  const drafts = stageAdminCells({}, roster, pasted);
  assert.equal(Object.keys(drafts).length, 50);
  assert.equal(drafts["uuid-0"].gender, "F");
  assert.equal(drafts["uuid-0"].dob, "2012-01-22");
  assert.equal(drafts["uuid-0"].class_name, undefined);
  const reordered = [...roster].reverse();
  const payload = adminPatchPayload(reordered, drafts);
  assert.equal(payload[0].studentId, "uuid-0");
  assert.equal(payload[0].changes.student_id_number, "000");
  assert.equal(payload[0].original.student_id_number, null);
  assert.equal(payload[0].changes.parent_phone, undefined);
  assert.equal(
    Object.keys(drafts).length,
    50,
    "Filtering display rows cannot drop hidden drafts",
  );
  assert.throws(
    () => pasteAdminCells(roster, columns, 59, 0, [["one"], ["two"]]),
    /លើស/,
  );
  assert.equal(
    Object.keys(drafts).length,
    50,
    "Overflow cannot partially apply",
  );
});
test("Blank paste preserves values; explicit clearing and undo snapshots preserve unrelated fields", () => {
  const first = stageAdminCells({}, roster, {
    "uuid-0": { parent_phone: "099123456" },
  });
  const second = stageAdminCells(first, roster, {
    "uuid-0": { parent_phone: null },
  });
  assert.equal(second["uuid-0"].parent_phone, null);
  assert.equal(first["uuid-0"].parent_phone, "099123456");
  const blank = pasteAdminCells(roster, ADMIN_STUDENT_COLUMNS, 0, 0, [
    ["", ""],
  ]);
  assert.deepEqual(blank, {});
  assert.deepEqual(
    stageAdminCells(first, roster, {
      "uuid-0": { parent_phone: "legacy free text" },
    }),
    {},
  );
});
test("Only changed fields are validated; ID-less profiles remain editable and protected writes are rejected", () => {
  const payload = adminPatchPayload(roster, {
    "uuid-0": { full_name: "New name" },
  });
  assert.deepEqual(payload[0], {
    studentId: "uuid-0",
    changes: { full_name: "New name" },
    original: { full_name: "Student 0" },
  });
  for (const key of [
    "id",
    "class_id",
    "class_name",
    "academic_year_id",
    "registration_school_id",
    "enrollment_status",
  ])
    assert.throws(() =>
      stageAdminCells({}, roster, { "uuid-0": { [key]: "forged" } }),
    );
  assert.equal(normalizeAdminCell("gender", "unknown"), "unknown");
  assert.ok(validateAdminCell("gender", "unknown"));
  assert.equal(normalizeAdminCell("student_phone", "០១២៣៤៥៦៧៨"), "012345678");
  assert.equal(normalizeAdminCell("dob", "2012"), "2012");
  assert.ok(validateAdminCell("dob", "2012"));
  assert.ok(validateAdminCell("student_id_number", null, "00125"));
  assert.equal(validateAdminCell("student_id_number", null, null), null);
});
