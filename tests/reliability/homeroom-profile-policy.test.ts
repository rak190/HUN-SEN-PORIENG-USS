import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateStudentAge,
  calculateStudentHealth,
  deriveStudentProfile,
  phnomPenhDate,
} from "../../lib/students/derived-profile";
import {
  teacherProfileChanges,
  buildTeacherProfileUpdate,
} from "../../lib/students/teacher-profile";

test("Age uses the Phnom Penh date, birthday boundary and canonical DOB, never stored age", () => {
  assert.equal(phnomPenhDate(new Date("2026-10-24T18:00:00Z")), "2026-10-25");
  assert.equal(calculateStudentAge("2008-10-25", "2026-10-25"), 18);
  assert.equal(calculateStudentAge("2008-10-26", "2026-10-25"), 17);
  for (const dob of [null, "", "2008", "2008-02-31", "2027-01-01"])
    assert.equal(calculateStudentAge(dob, "2026-10-25"), null);
  assert.equal(
    deriveStudentProfile(
      { age: 99, dob: "2008-01-01" },
      { date_of_birth: null },
      "2026-10-25",
    ).age,
    null,
  );
});
test("Health previews use the existing server formula and clear derived values for missing/invalid inputs", () => {
  assert.deepEqual(calculateStudentHealth(45, 1.6), {
    bmi: 17.6,
    nutrition_status: "ស្គម",
  });
  assert.deepEqual(calculateStudentHealth(60, 1.6), {
    bmi: 23.4,
    nutrition_status: "ធម្មតា",
  });
  assert.equal(calculateStudentHealth(70, 1.6).nutrition_status, "លើសទម្ងន់");
  assert.equal(calculateStudentHealth(90, 1.6).nutrition_status, "ធាត់");
  for (const value of [null, "", 0, -1, "oops"])
    assert.deepEqual(calculateStudentHealth(value, 1.6), {
      bmi: null,
      nutrition_status: null,
    });
  const row = {
    date_of_birth: "2008-01-01",
    height_m: 1.6,
    weight_kg: 60,
    age: 99,
    bmi: 99,
  };
  assert.equal(
    deriveStudentProfile(row, { weight_kg: 45 }, "2026-10-25").bmi,
    17.6,
  );
  assert.equal(
    deriveStudentProfile(row, { height_m: null }, "2026-10-25")
      .nutrition_status,
    null,
  );
});
test("Every teacher save rejects protected identity, seating, lifecycle and calculated inputs", () => {
  for (const key of [
    "student_id_number",
    "full_name",
    "gender",
    "age",
    "desk_number",
    "room_number",
    "bmi",
    "nutrition_status",
    "current_status",
    "enrollment_status",
    "is_active",
    "actor_id",
    "school_id",
  ])
    assert.throws(
      () => teacherProfileChanges({ [key]: "forged" }),
      /Forbidden/,
    );
  assert.deepEqual(
    teacherProfileChanges({
      id: "student",
      class_id: "class",
      status: "repeater",
      father_phone: "០១២៣៤៥៦៧៨",
    }),
    { status: "repeater", father_phone: "012345678" },
  );
  assert.throws(() => teacherProfileChanges({ status: "dropout" }));
});
test("Profile drawer saves only changed editable fields with original values, not protected display fields", () => {
  const row = {
    id: "student",
    full_name: "Dara",
    gender: "M",
    age: 18,
    bmi: 20,
    desk_number: "1",
    status: "new",
    father_phone: "012345678",
  };
  assert.deepEqual(
    buildTeacherProfileUpdate(
      {
        ...row,
        full_name: "forged",
        age: 99,
        status: "transfer",
        father_phone: "",
      },
      row,
    ),
    {
      id: "student",
      status: "transfer",
      father_phone: null,
      original: { status: "new", father_phone: "012345678" },
    },
  );
});
