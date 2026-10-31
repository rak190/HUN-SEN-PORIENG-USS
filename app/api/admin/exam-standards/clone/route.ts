import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { curriculumAdmin, curriculumError } from "@/lib/exam-standards-server";
import {
  cloneCurriculumSchema,
  curriculumSnapshot,
} from "@/lib/exam-standards";
export async function POST(req: Request) {
  try {
    const { db } = await curriculumAdmin();
    const input = cloneCurriculumSchema.parse(await req.json());
    const { data, error } = await db.rpc("clone_exam_curriculum", {
      p_source: input.sourceYearId,
      p_target: input.targetYearId,
      p_source_revision: input.sourceRevision,
      p_target_revision: input.targetRevision,
      p_replace: input.replace,
    });
    if (error) throw error;
    const standards = curriculumSnapshot(data);
    for (const route of [
      "/admin/exam-standards",
      "/grades",
      "/homeroom/student-study-plans",
      "/report-cards",
    ])
      revalidatePath(route);
    return NextResponse.json({ success: true, standards });
  } catch (error) {
    return curriculumError(error);
  }
}
