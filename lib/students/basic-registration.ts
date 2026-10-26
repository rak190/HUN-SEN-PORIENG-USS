import { z } from "zod";
import { parseStudentDob } from "../utils/student-date";

export const optionalOfficialId = z
  .string()
  .trim()
  .max(50)
  .nullish()
  .transform((value) => value || null);
export const optionalRegistrationDob = z
  .string()
  .trim()
  .nullish()
  .transform((value) => {
    if (!value) return null;
    return parseStudentDob(value) || value;
  })
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "ទម្រង់ថ្ងៃខែឆ្នាំកំណើតមិនត្រឹមត្រូវ")
      .nullable(),
  );

const gender = z
  .string()
  .trim()
  .transform((value) => {
    const lower = value.toLowerCase();
    if (["m", "male", "ប្រុស", "ប"].includes(lower)) return "M";
    if (["f", "female", "ស្រី", "ស"].includes(lower)) return "F";
    return value;
  })
  .pipe(z.enum(["M", "F"], { message: "ភេទមិនត្រឹមត្រូវ (ប្រុស/ស្រី)" }));

export const basicStudentRegistrationSchema = z.object({
  student_id_number: optionalOfficialId,
  full_name: z.string().trim().min(1, "សូមបញ្ចូលឈ្មោះសិស្ស").max(100),
  gender,
  class_id: z.string().uuid().nullable().optional(),
  status: z.enum(["new", "repeater", "transfer"]).optional(),
  dob: optionalRegistrationDob,
  desk_number: z.string().trim().max(20).nullish(),
  room_number: z.string().trim().max(20).nullish(),
  address: z.string().max(4000).nullish(),
  father_name: z.string().max(100).nullish(),
  father_job: z.string().max(100).nullish(),
  father_phone: z.string().max(30).nullish(),
  mother_name: z.string().max(100).nullish(),
  mother_job: z.string().max(100).nullish(),
  mother_phone: z.string().max(30).nullish(),
});

export function normalizeBasicRegistrationRows(
  rows: unknown,
  requireClass = true,
) {
  const result = z
    .array(basicStudentRegistrationSchema)
    .min(1)
    .max(500)
    .parse(rows);
  const ids = new Set<string>();
  for (const row of result) {
    if (requireClass && !row.class_id)
      throw new Error("សូមជ្រើសរើសថ្នាក់សិស្ស");
    if (row.student_id_number && ids.has(row.student_id_number))
      throw new Error("មានអត្តលេខស្ទួនក្នុងតារាង");
    if (row.student_id_number) ids.add(row.student_id_number);
  }
  return result;
}
