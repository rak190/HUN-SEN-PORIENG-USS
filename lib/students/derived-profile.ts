import { parseStudentDob } from "../utils/student-date";

export function phnomPenhDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Phnom_Penh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** DOB is the source of truth; never infer a birthday or use a stale stored age. */
export function calculateStudentAge(
  dob: unknown,
  today = phnomPenhDate(),
): number | null {
  if (
    typeof dob !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dob) ||
    parseStudentDob(dob) !== dob ||
    dob > today
  )
    return null;
  const [year, month, day] = today.split("-").map(Number);
  const [birthYear, birthMonth, birthDay] = dob.split("-").map(Number);
  return (
    year -
    birthYear -
    (month < birthMonth || (month === birthMonth && day < birthDay) ? 1 : 0)
  );
}

function positiveNumber(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !/^\d+(\.\d+)?$/.test(String(value))
  )
    return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

/** Matches the existing atomic profile RPC: one decimal and the established thresholds. */
export function calculateStudentHealth(weight: unknown, height: unknown) {
  const w = positiveNumber(weight),
    h = positiveNumber(height);
  if (w === null || h === null || h > 3 || w > 999.99)
    return { bmi: null, nutrition_status: null };
  const bmi = Number((w / (h * h)).toFixed(1));
  return {
    bmi,
    nutrition_status:
      bmi < 18.5
        ? "ស្គម"
        : bmi < 25
          ? "ធម្មតា"
          : bmi < 30
            ? "លើសទម្ងន់"
            : "ធាត់",
  };
}

export function deriveStudentProfile(
  row: Record<string, unknown>,
  patch: Record<string, unknown> = {},
  today = phnomPenhDate(),
) {
  const value = (key: string) =>
    Object.hasOwn(patch, key) ? patch[key] : row[key];
  const dob = Object.hasOwn(patch, "date_of_birth")
    ? patch.date_of_birth
    : (row.date_of_birth ?? row.dob);
  return {
    age: calculateStudentAge(dob, today),
    ...calculateStudentHealth(value("weight_kg"), value("height_m")),
  };
}
