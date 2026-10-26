"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  validateAdminCell,
  type AdminStudentRow,
} from "@/lib/students/admin-workspace";

const uuid = z.string().uuid();
async function client() {
  const auth = await requireRole(["admin"]);
  if (!auth.profile?.is_active || !auth.profile.school_id)
    throw new Error("Active school-scoped Admin required");
  return createClient();
}

export async function loadAdminStudentClass(classId: string, yearId: string) {
  try {
    uuid.parse(classId);
    uuid.parse(yearId);
    const db = await client();
    const rows: AdminStudentRow[] = [];
    let expected = 0;
    for (let page = 1; page <= 5; page++) {
      const { data, error } = await db.rpc("admin_student_directory", {
        p_year: yearId,
        p_class: classId,
        p_editor: true,
        p_page: page,
        p_page_size: 100,
      });
      if (error)
        throw new Error(
          error.code === "PGRST202"
            ? "សូមឱ្យ Admin ដំឡើង migration 094 មុនប្រើកន្លែងកែប្រែនេះ។"
            : error.message,
        );
      if (!data || !Array.isArray(data.rows))
        throw new Error("Invalid roster response");
      expected = Number(data.filtered_total);
      if (expected > 500)
        throw new Error(
          "ថ្នាក់នេះលើស 500 សិស្ស។ សូមទាក់ទង Admin ដើម្បីពិនិត្យចំនួនសិស្ស។",
        );
      rows.push(...data.rows);
      if (rows.length >= expected) break;
    }
    if (
      rows.length !== expected ||
      new Set(rows.map((row) => row.id)).size !== expected
    )
      throw new Error("Roster changed during loading. Please reload.");
    return { success: true as const, rows };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "មិនអាចផ្ទុកបញ្ជីសិស្សបានទេ",
    };
  }
}

const cell = z.union([z.string().max(4000), z.null()]);
const patch = z.record(z.string(), cell);
const saveSchema = z
  .object({
    classId: uuid,
    academicYearId: uuid,
    updates: z
      .array(
        z.object({ studentId: uuid, changes: patch, original: patch }).strict(),
      )
      .min(1)
      .max(500),
  })
  .strict();
export async function saveAdminStudentPatches(
  input: z.input<typeof saveSchema>,
) {
  try {
    const db = await client();
    const payload = saveSchema.parse(input);
    const seen = new Set<string>();
    for (const update of payload.updates) {
      if (
        seen.has(update.studentId) ||
        !Object.keys(update.changes).length ||
        Object.keys(update.original).some(
          (key) => !Object.hasOwn(update.changes, key),
        )
      )
        throw new Error("Invalid student patches");
      seen.add(update.studentId);
      for (const [key, value] of Object.entries(update.changes)) {
        if (!Object.hasOwn(update.original, key))
          throw new Error("Missing original field value");
        const error = validateAdminCell(key, value, update.original[key]);
        if (error) throw new Error(error);
      }
    }
    const { data, error } = await db.rpc("admin_patch_students", {
      p_class: payload.classId,
      p_year: payload.academicYearId,
      p_updates: payload.updates,
    });
    if (error)
      return {
        success: false as const,
        error:
          error.code === "PGRST202"
            ? "សូមដំឡើង migration 094 មុនរក្សាទុក។ ការកែប្រែរបស់អ្នកនៅតែមាន។"
            : error.message,
        conflicts: error.code === "40001" ? error.details : undefined,
      };
    if (!data?.success) throw new Error("Save was not confirmed");
    for (const path of [
      "/admin/students",
      "/students",
      "/homeroom",
      "/classes/info",
      "/attendance",
      "/homeroom/student-study-plans",
    ])
      revalidatePath(path);
    return { success: true as const, count: Number(data.updated_count) };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "ការរក្សាទុកបរាជ័យ",
    };
  }
}
