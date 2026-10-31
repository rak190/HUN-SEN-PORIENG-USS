import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { curriculumAdmin, curriculumError } from "@/lib/exam-standards-server";
import { curriculumSnapshot, saveCurriculumSchema } from "@/lib/exam-standards";
export async function GET(req: Request) {
  try {
    const { db, schoolId } = await curriculumAdmin();
    const year = new URL(req.url).searchParams.get("academicYearId");
    if (!year) {
      const { data, error } = await db
        .from("academic_years")
        .select("id,name,start_date,status,is_active")
        .eq("school_id", schoolId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return NextResponse.json(
        { academicYears: data || [] },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    z.uuid().parse(year);
    const { data, error } = await db.rpc("exam_curriculum_workspace", {
      p_year: year,
    });
    if (error) throw error;
    return NextResponse.json(
      { standards: curriculumSnapshot(data) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return curriculumError(error);
  }
}
export async function PATCH(req: Request) {
  try {
    const { db } = await curriculumAdmin();
    const input = saveCurriculumSchema.parse(await req.json());
    const { data, error } = await db.rpc("save_exam_curriculum", {
      p_year: input.academicYearId,
      p_revision: input.expectedRevision,
      p_subjects: input.subjects,
      p_scales: input.gradingScales,
      p_delete_subjects: input.deleteSubjectIds,
      p_delete_scales: input.deleteScaleIds,
      p_confirm_delete: input.confirmDelete,
    });
    if (error) throw error;
    const standards = curriculumSnapshot(data);
    for (const route of [
      "/admin/exam-standards",
      "/grades",
      "/admin/master-scores",
      "/homeroom/student-study-plans",
      "/report-cards",
    ])
      revalidatePath(route);
    return NextResponse.json({ success: true, standards });
  } catch (error) {
    return curriculumError(error);
  }
}
