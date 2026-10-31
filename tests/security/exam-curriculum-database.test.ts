import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
type Snapshot = {
  revision: string;
  subjects: Array<{
    id: string;
    subject_name: string;
    grade_level: number;
    stream_type: string;
    coefficient: number;
    max_score: number;
    is_core: boolean;
  }>;
  gradingScales: Array<{ id: string; grade_letter: string }>;
};
test("curriculum: required isolated PostgreSQL transactions, permissions and real historical migrations", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::UUID$$;
      CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE SQL AS $$SELECT current_setting('request.jwt.claim.role',true)$$;
      GRANT USAGE ON SCHEMA auth TO PUBLIC;
      CREATE TABLE profiles(id UUID PRIMARY KEY,role TEXT,is_active BOOLEAN,school_id TEXT);
      CREATE TABLE academic_years(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT,start_date DATE,end_date DATE,is_active BOOLEAN,status TEXT,school_id TEXT);
      CREATE TABLE audit_logs(user_id UUID,school_id TEXT,action TEXT,type TEXT,target_table TEXT,details JSONB);
      INSERT INTO profiles VALUES('${id(1)}','admin',true,'a'),('${id(2)}','principal',true,'a'),('${id(3)}','teacher',true,'a'),('${id(4)}','monitor',true,'a'),('${id(5)}','admin',true,'b'),('${id(6)}','admin',false,'a');
      INSERT INTO academic_years VALUES('${id(10)}','2025-2026','2025-11-01','2026-10-01',false,'planning','a'),('${id(11)}','2026-2027','2026-11-01','2027-10-01',true,'active','a'),('${id(12)}','Closed','2024-11-01','2025-10-01',false,'closed','a'),('${id(13)}','Foreign','2026-11-01','2027-10-01',true,'active','b');`);
    for (const file of [
      "051_exam_subject_standards.sql",
      "057_exam_standards_versioning.sql",
    ])
      await db.exec(readFileSync("supabase/migrations/" + file, "utf8"));
    // Reproduce the original mismatch: service-role invocation has no end-user auth.uid().
    await db.exec('SET ROLE service_role');
    await assert.rejects(db.query('SELECT clone_exam_standards_to_year($1,$2)', [id(10), id(11)]), /Unauthorized/);
    await db.exec('RESET ROLE');
    await db.exec(
      "DELETE FROM exam_subject_standards; DELETE FROM exam_grading_scales; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated,anon,service_role;",
    );
    await db.exec(
      readFileSync(
        "supabase/migrations/20261031032150_exam_curriculum_workspace.sql",
        "utf8",
      ),
    );
    await db.exec(
      "GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;",
    );
    const session = async (n = 1, role = "authenticated") => {
      await db.exec("RESET ROLE");
      await db.query(
        "SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",
        [n ? id(n) : "", role],
      );
      await db.exec(`SET ROLE ${role}`);
    };
    const load = async (year = 11) =>
      (
        await db.query<{ result: Snapshot }>(
          "SELECT exam_curriculum_workspace($1) result",
          [id(year)],
        )
      ).rows[0].result;
    const save = async (
      subjects: unknown[],
      scales: unknown[] = [],
      year = 11,
      revision?: string,
      deleted: string[] = [],
      confirmed = false,
    ) =>
      (
        await db.query<{ result: Snapshot }>(
          "SELECT save_exam_curriculum($1,$2,$3,$4,$5,$6,$7) result",
          [
            id(year),
            revision ?? (await load(year)).revision,
            JSON.stringify(subjects),
            JSON.stringify(scales),
            deleted,
            [],
            confirmed,
          ],
        )
      ).rows[0].result;
    const row = (
      grade: number,
      stream = "general",
      coefficient = 0,
      max = 100,
    ) => ({
      subject_name: "គណិតវិទ្យា",
      grade_level: grade,
      stream_type: stream,
      coefficient,
      max_score: max,
      is_core: true,
    });
    const strip = (r: Snapshot["subjects"][number]) => ({
      id: r.id,
      subject_name: r.subject_name,
      grade_level: r.grade_level,
      stream_type: r.stream_type,
      coefficient: r.coefficient,
      max_score: r.max_score,
      is_core: r.is_core,
    });
    const clone = async (
      replace = false,
      sourceRev?: string,
      targetRev?: string,
    ) =>
      db.query("SELECT clone_exam_curriculum($1,$2,$3,$4,$5)", [
        id(10),
        id(11),
        sourceRev ?? (await load(10)).revision,
        targetRev ?? (await load()).revision,
        replace,
      ]);
    await session();
    await assert.rejects(db.query('INSERT INTO exam_subject_standards(academic_year_id,subject_name,grade_level,stream_type,coefficient,max_score) VALUES($1,$2,99,$3,-1,50)', [id(11), 'Invalid direct write', 'general']), /curriculum_subject_values/);
    await t.test(
      "empty year, first subject, full exact grade/stream configuration, zero and decimal values persist",
      async () => {
        assert.equal((await load()).subjects.length, 0);
        await save([row(7)]);
        let state = await load();
        assert.equal(state.subjects[0].coefficient, 0);
        assert.equal(state.subjects[0].grade_level, 7);
        await save([
          row(10, "general", 1.5, 80),
          row(11, "science", 2, 150),
          row(11, "social", 1, 50),
          row(12, "science", 3, 175),
        ]);
        state = await load();
        assert.equal(
          state.subjects.length,
          5,
          "Omitted grade 7 was not pruned",
        );
        const science = state.subjects.find(
          (s) => s.grade_level === 11 && s.stream_type === "science",
        )!;
        await save([{ ...strip(science), max_score: 125 }]);
        assert.equal(
          (await load()).subjects.find((s) => s.grade_level === 12)!.max_score,
          175,
        );
      },
    );
    await t.test(
      "invalid/duplicate/forged fields, nonfinite values, precision loss and unconfirmed deletion roll back",
      async () => {
        const before = await load();
        for (const bad of [
          { ...row(7), subject_name: "" },
          row(6),
          row(8, "science"),
          row(10, "bad"),
          row(10, "social", -1),
          row(10, "social", 1.23),
          { ...row(10), max_score: "NaN" },
          { ...row(10), actor_id: id(1) },
        ])
          await assert.rejects(save([bad]));
        await assert.rejects(save([row(9), row(9)]));
        await assert.rejects(save([row(7)]));
        await assert.rejects(
          save([], [], 11, before.revision, [before.subjects[0].id]),
          /confirmation/,
        );
        assert.equal((await load()).revision, before.revision);
        await save([], [], 11, before.revision, [before.subjects[0].id], true);
        assert.equal((await load()).subjects.length, 4);
      },
    );
    await t.test(
      "subjects/scales/audit commit together; invalid scales or audit failures never leave partial changes",
      async () => {
        const before = await load();
        await assert.rejects(
          save(
            [{ ...row(9), subject_name: "Rollback" }],
            [
              {
                grade_letter: "A",
                min_percentage: 101,
                max_percentage: 100,
                gpa_point: 4,
                description_khmer: "Invalid",
              },
            ],
          ),
        );
        assert.equal((await load()).revision, before.revision);
        await db.exec("RESET ROLE");
        await db.exec(
          "CREATE FUNCTION fail_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'audit unavailable';END$$; CREATE TRIGGER fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_audit();",
        );
        await session();
        await assert.rejects(
          save([{ ...row(9), subject_name: "Rollback" }]),
          /audit unavailable/,
        );
        assert.equal((await load()).revision, before.revision);
        await db.exec("RESET ROLE");
        await db.exec("DROP TRIGGER fail_audit ON audit_logs");
        await session();
      },
    );
    await t.test(
      "clone previews are versioned; occupied targets need explicit replacement; source stays intact",
      async () => {
        await save(
          [row(8)],
          [
            {
              grade_letter: "F",
              min_percentage: 0,
              max_percentage: 49.99,
              gpa_point: 0,
              description_khmer: "Fail",
            },
          ],
          10,
        );
        const source = await load(10),
          target = await load();
        await assert.rejects(clone(), /confirm replacement/);
        assert.equal((await load()).revision, target.revision);
        await assert.rejects(
          clone(true, "stale", target.revision),
          /preview changed/,
        );
        await db.exec('RESET ROLE');
        await db.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_audit();");
        await session();
        await assert.rejects(clone(true), /audit unavailable/);
        assert.equal((await load()).revision, target.revision, 'Failed clone restores the entire occupied target');
        await db.exec('RESET ROLE'); await db.exec('DROP TRIGGER fail_audit ON audit_logs'); await session();
        await clone(true);
        assert.equal((await load()).subjects[0].grade_level, 8);
        assert.equal((await load()).gradingScales[0].grade_letter, "F");
        assert.equal((await load(10)).revision, source.revision);
        const copied = await load();
        await db.query('SELECT save_exam_curriculum($1,$2,$3,$4,$5,$6,true)', [id(11), copied.revision, '[]', '[]', copied.subjects.map(row => row.id), copied.gradingScales.map(row => row.id)]);
        await clone(false);
        assert.equal((await load()).subjects[0].grade_level, 8, 'Empty targets clone without replacement');
        await assert.rejects(
          db.query("SELECT clone_exam_standards_to_year($1,$2)", [
            id(10),
            id(11),
          ]),
          /confirm replacement/,
        );
      },
    );
    await t.test(
      "stale competing writes conflict; other-year data is unchanged",
      async () => {
        const state = await load(),
          source = await load(10),
          current = strip(state.subjects[0]);
        const results = await Promise.allSettled([
          save([{ ...current, coefficient: 1 }], [], 11, state.revision),
          save([{ ...current, coefficient: 2 }], [], 11, state.revision),
        ]);
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
        assert.equal((await load(10)).revision, source.revision);
      },
    );
    await t.test(
      "school/year locks, anonymous/inactive/Teacher/Monitor/service-role calls, forged identities and direct RLS fail closed",
      async () => {
        await assert.rejects(load(13), /denied/);
        await assert.rejects(save([], [], 12), /locked/);
        await db.exec("RESET ROLE");
        await db.query("UPDATE academic_years SET status=$1 WHERE id=$2", [
          "archived",
          id(12),
        ]);
        await session();
        await assert.rejects(save([], [], 12), /locked/);
        const foreign = await load();
        await assert.rejects(
          save([{ ...row(9), id: foreign.subjects[0].id }], [], 10),
          /identity/,
        );
        for (const actor of [3, 4, 5, 6, 0]) {
          await session(actor);
          await assert.rejects(load());
          await assert.rejects(
            db.query("SELECT save_exam_curriculum($1,$2,$3,$4)", [
              id(11),
              foreign.revision,
              "[]",
              "[]",
            ]),
          );
        }
        await session(5);
        assert.equal(
          (
            await db.query(
              "SELECT * FROM exam_subject_standards WHERE academic_year_id=$1",
              [id(11)],
            )
          ).rows.length,
          0,
        );
        await assert.rejects(
          db.query(
            "INSERT INTO exam_subject_standards(academic_year_id,subject_name,grade_level) VALUES($1,$2,7)",
            [id(11), "forged"],
          ),
        );
        for (const role of ["anon", "service_role"]) {
          await session(1, role);
          await assert.rejects(load(), /permission denied/);
        }
        await session();
        await assert.rejects(
          db.query("SELECT exam_curriculum_state($1)", [id(11)]),
          /permission denied/,
        );
      },
    );
  } finally {
    await db.close();
  }
});
