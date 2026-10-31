import { getServerAuth } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
export async function curriculumAdmin() {
  const { user, role, profile } = await getServerAuth();
  if (
    !user ||
    !profile?.school_id ||
    profile.is_active !== true ||
    !role ||
    !["admin", "principal"].includes(role)
  )
    throw new Error("CURRICULUM_FORBIDDEN");
  return { db: await createClient(), schoolId: profile.school_id };
}
export function curriculumError(error: unknown) {
  if (error instanceof z.ZodError)
    return NextResponse.json(
      {
        error: `សូមពិនិត្យទិន្នន័យ៖ ${error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join(" · ")}`,
      },
      { status: 400 },
    );
  const code = (error as { code?: string })?.code;
  const conflict = ["40001", "40P01", "23505"].includes(code || "");
  const forbidden =
    code === "42501" ||
    (error instanceof Error && error.message === "CURRICULUM_FORBIDDEN");
  return NextResponse.json(
    {
      error: conflict
        ? "កម្មវិធីសិក្សាបានផ្លាស់ប្ដូរ ឬមានមុខវិជ្ជាស្ទួន។ ទិន្នន័យព្រាងនៅរក្សាទុក។ សូមផ្ទុកឡើងវិញ និងពិនិត្យមុនរក្សាទុក។"
        : forbidden
          ? "មិនមានសិទ្ធិលើឆ្នាំសិក្សានេះទេ។"
          : code === "55000"
            ? "ឆ្នាំសិក្សានេះត្រូវបានចាក់សោ។"
            : code === "PGRST202" || code === "42883"
              ? "សូមដំឡើង migration កម្មវិធីសិក្សាមុនប្រើមុខងារនេះ។"
              : ["22023", "22P02", "23514"].includes(code || "")
                ? "សូមពិនិត្យមុខវិជ្ជា ថ្នាក់ កម្មវិធី មេគុណ និងចន្លោះនិទ្ទេស។"
                : "មិនអាចផ្ទុក ឬរក្សាទុកកម្មវិធីសិក្សាបានទេ។ សូមសាកម្ដងទៀត។",
      conflict,
    },
    {
      status: conflict
        ? 409
        : forbidden
          ? 403
          : code === "55000"
            ? 423
            : ["22023", "22P02", "23514"].includes(code || "")
              ? 400
              : 503,
    },
  );
}
