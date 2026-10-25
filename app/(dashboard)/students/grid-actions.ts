"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  requireTeacher,
  requireRole,
  requireClassAccess,
} from "@/lib/auth-server";
import { teacherProfileChanges } from "@/lib/students/teacher-profile";
import type { GridPatch, GridRow } from "@/lib/students/grid";
import { EDITABLE_GRID_COLUMNS, validateGridCell } from "@/lib/students/grid";
import { revalidatePath } from "next/cache";

const cell = z.union([z.string().max(4000), z.number().finite(), z.null()]);
const patch = z.record(z.string(), cell).superRefine((values, ctx) => {
  for (const [key, value] of Object.entries(values)) {
    const column = EDITABLE_GRID_COLUMNS.find((c) => c.key === key);
    const error = column
      ? validateGridCell(column, value)
      : "Protected or unknown field";
    if (error) ctx.addIssue({ code: "custom", path: [key], message: error });
  }
});
const schema = z
  .object({
    class_id: z.string().uuid(),
    academic_year_id: z.string().uuid(),
    updates: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            changes: patch,
            original: z.record(z.string(), cell),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict();

export async function saveHomeroomStudentGridAction(
  input: z.input<typeof schema>,
) {
  try {
    await requireTeacher();
    const payload = schema.parse(input);
    const ids = new Set<string>();
    for (const item of payload.updates) {
      if (
        ids.has(item.id) ||
        !Object.keys(item.changes).length ||
        Object.keys(item.changes).some(
          (key) => !Object.hasOwn(item.original, key),
        ) ||
        Object.keys(item.original).some(
          (key) => !Object.hasOwn(item.changes, key),
        )
      ) {
        return {
          success: false as const,
          error:
            "Invalid update: duplicate student or missing original field values.",
        };
      }
      ids.add(item.id);
    }
    // Use the caller's verified session. The RPC independently authorizes every write.
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("save_homeroom_student_grid", {
      p_class_id: payload.class_id,
      p_academic_year_id: payload.academic_year_id,
      p_updates: payload.updates,
    });
    if (error)
      return {
        success: false as const,
        error: ["PGRST202", "42883"].includes(error.code)
          ? "សូមឱ្យ Admin អនុវត្ត Migration 087 មុនរក្សាទុក។ ទិន្នន័យមិនទាន់ត្រូវបានផ្លាស់ប្តូរទេ។"
          : error.message,
        conflicts: error.details || undefined,
      };
    if (!data?.success)
      return {
        success: false as const,
        error: "មិនអាចរក្សាទុកបានទេ។ សូមព្យាយាមម្តងទៀត។",
      };
    for (const path of [
      "/students",
      "/homeroom",
      "/health",
      "/homeroom/student-study-plans",
      "/classes/info",
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

/** Legacy teacher forms share the same atomic path, field policy and year guards as the grid. */
export async function saveTeacherStudentProfiles(input: {
  class_id: string;
  academic_year_id?: string;
  updates: Record<string, unknown>[];
}) {
  try {
    await requireRole(["teacher"]);
    if (
      !input?.class_id ||
      !Array.isArray(input.updates) ||
      input.updates.length < 1 ||
      input.updates.length > 200
    )
      throw new Error("Invalid teacher profile update");
    await requireClassAccess(input.class_id);
    // Validate before issuing reads, and never forward browser identity, seating or derived values.
    const prepared = input.updates.map((item) => ({
      item,
      changes: teacherProfileChanges(item),
    }));
    const supabase = await createClient();
    const { data: classroom, error: classError } = await supabase
      .from("classes")
      .select("academic_year_id")
      .eq("id", input.class_id)
      .single();
    if (
      classError ||
      !classroom?.academic_year_id ||
      (input.academic_year_id &&
        input.academic_year_id !== classroom.academic_year_id)
    )
      throw new Error("Invalid class academic year");
    const ids = prepared.map(({ item }) => z.string().uuid().parse(item.id));
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .in("id", ids);
    if (error) throw new Error(error.message);
    const byId = new Map(
      ((data as GridRow[]) || []).map((row) => [row.id, row]),
    );
    const updates = prepared.flatMap(({ item, changes }, index) => {
      const row = byId.get(ids[index]);
      if (!row) throw new Error("Forbidden: Student unavailable");
      if (!Object.keys(changes).length) return [];
      const supplied = item.original as GridPatch | undefined;
      const original =
        supplied ||
        (Object.fromEntries(
          Object.keys(changes).map((key) => {
            const column = EDITABLE_GRID_COLUMNS.find((c) => c.key === key)!;
            return [key, row[column.db] ?? null];
          }),
        ) as GridPatch);
      return [{ id: ids[index], changes, original }];
    });
    if (!updates.length) return { success: true as const, count: 0 };
    return await saveHomeroomStudentGridAction({
      class_id: input.class_id,
      academic_year_id: classroom.academic_year_id,
      updates,
    });
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "ការរក្សាទុកបរាជ័យ",
    };
  }
}
