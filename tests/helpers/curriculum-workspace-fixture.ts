import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { clientFixture } from "./client-fixture";
export const curriculumId = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
/** Isolated PostgreSQL + actual API handlers. Auth/cookies and cache invalidation are test boundaries. */
export async function curriculumWorkspaceFixture() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::UUID$$;
    CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE SQL AS $$SELECT current_setting('request.jwt.claim.role',true)$$;
    GRANT USAGE ON SCHEMA auth TO PUBLIC;
    CREATE TABLE profiles(id UUID PRIMARY KEY,role TEXT,is_active BOOLEAN,school_id TEXT);
    CREATE TABLE academic_years(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT,start_date DATE,end_date DATE,is_active BOOLEAN,status TEXT,school_id TEXT);
    CREATE TABLE audit_logs(user_id UUID,school_id TEXT,action TEXT,type TEXT,target_table TEXT,details JSONB);
    INSERT INTO profiles VALUES('${curriculumId(1)}','admin',true,'school-a');
    INSERT INTO academic_years VALUES('${curriculumId(10)}','2025-2026','2025-11-01','2026-10-01',false,'planned','school-a'),('${curriculumId(11)}','2026-2027','2026-11-01','2027-10-01',true,'active','school-a'),('${curriculumId(12)}','2024-2025','2024-11-01','2025-10-01',false,'closed','school-a'),('${curriculumId(13)}','Foreign school','2026-11-01','2027-10-01',true,'active','school-b');`);
  for (const file of [
    "051_exam_subject_standards.sql",
    "057_exam_standards_versioning.sql",
  ])
    await db.exec(readFileSync("supabase/migrations/" + file, "utf8"));
  await db.exec(
    "DELETE FROM exam_subject_standards;DELETE FROM exam_grading_scales;",
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/20261031032150_exam_curriculum_workspace.sql",
      "utf8",
    ),
  );
  await db.query(
    "INSERT INTO exam_subject_standards(academic_year_id,subject_name,grade_level,stream_type,coefficient,max_score,is_core) VALUES($1,'គណិតវិទ្យា',8,'general',2,100,true),($1,'ភាសាខ្មែរ',11,'science',3,150,true)",
    [curriculumId(10)],
  );
  await db.query(
    "INSERT INTO exam_grading_scales(academic_year_id,grade_letter,min_percentage,max_percentage,gpa_point,description_khmer) VALUES($1,'A',90,100,4,'Test A'),($1,'F',0,49.99,0,'Test F')",
    [curriculumId(10)],
  );
  await db.exec(
    `GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated; SELECT set_config('request.jwt.claim.sub','${curriculumId(1)}',false),set_config('request.jwt.claim.role','authenticated',false); SET ROLE authenticated;`,
  );
  const actor = {
    user: { id: curriculumId(1) },
    role: "admin",
    profile: {
      id: curriculumId(1),
      role: "admin",
      is_active: true,
      school_id: "school-a",
    },
  };
  let connections = 0,
    missingRpc = false;
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      if (missingRpc) return { data: null, error: { code: "PGRST202" } };
      const allowed: Record<string, string[]> = {
        exam_curriculum_workspace: ["p_year"],
        save_exam_curriculum: [
          "p_year",
          "p_revision",
          "p_subjects",
          "p_scales",
          "p_delete_subjects",
          "p_delete_scales",
          "p_confirm_delete",
        ],
        clone_exam_curriculum: [
          "p_source",
          "p_target",
          "p_source_revision",
          "p_target_revision",
          "p_replace",
        ],
      };
      if (!allowed[name]) throw new Error("Unconfigured fixture RPC");
      const keys = allowed[name],
        values = keys.map((key) =>
          key === "p_subjects" || key === "p_scales"
            ? JSON.stringify(args[key])
            : args[key],
        );
      try {
        const result = await db.query<{ data: unknown }>(
          `SELECT ${name}(${keys.map((_, index) => "$" + (index + 1)).join(",")}) data`,
          values,
        );
        return { data: result.rows[0].data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    from: (table: string) => {
      if (!["academic_years", "exam_subject_standards", "exam_grading_scales"].includes(table))
        throw new Error("Unconfigured fixture table");
      const filters: Array<[string, unknown]> = [];
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => {
          if (!["school_id", "academic_year_id", "grade_level"].includes(key)) throw new Error("Unconfigured fixture filter");
          filters.push([key, value]);
          return query;
        },
        order: () => query,
        then: (resolve: (result: unknown) => void, reject: (error: unknown) => void) => db.query(`SELECT * FROM ${table}${filters.length ? " WHERE " + filters.map(([key], index) => key + "=$" + (index + 1)).join(" AND ") : ""}`, filters.map(([, value]) => value)).then(result => resolve({ data: result.rows, error: null }), reject),
      };
      return query;
    },
  };
  Object.assign(globalThis, {
    curriculumApiFixture: {
      actor,
      connect: () => {
        connections++;
        return client;
      },
    },
  });
  const stubs = {
    "@/lib/auth-server":
      "export const getServerAuth=async()=>globalThis.curriculumApiFixture.actor;",
    "@/lib/supabase/server":
      "export const createClient=async()=>globalThis.curriculumApiFixture.connect();",
    "next/cache": "export const revalidatePath=()=>{};",
  };
  const routes = await clientFixture<{
    GET: (request: Request) => Promise<Response>;
    PATCH: (request: Request) => Promise<Response>;
  }>("app/api/admin/exam-standards/route.ts", stubs);
  const cloning = await clientFixture<{
    POST: (request: Request) => Promise<Response>;
  }>("app/api/admin/exam-standards/clone/route.ts", stubs);
  return {
    db,
    client,
    actor,
    connectionCount: () => connections,
    missingRpc: (value: boolean) => {
      missingRpc = value;
    },
    handle: (request: Request) =>
      request.method === "GET"
        ? routes.GET(request)
        : new URL(request.url).pathname.endsWith("/clone")
          ? cloning.POST(request)
          : routes.PATCH(request),
  };
}
