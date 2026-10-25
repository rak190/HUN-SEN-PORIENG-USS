import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { GRID_COLUMNS, EDITABLE_GRID_COLUMNS } from "../../lib/students/grid";
import { calculateStudentAge } from "../../lib/students/derived-profile";

// Actual PostgreSQL executes the production RPC in an isolated database, never a school database.
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const teacher = uuid(1),
  principal = uuid(2),
  monitor = uuid(3),
  classroom = uuid(10),
  otherClass = uuid(11),
  year = uuid(20);

test("Roster repair is additive, idempotent and preserves dependent views and archived-class filtering", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE authenticated;
      CREATE TABLE students (id UUID PRIMARY KEY, is_active BOOLEAN, full_name TEXT, student_phone TEXT);
      CREATE TABLE classes (id UUID PRIMARY KEY, name TEXT, academic_year_id UUID, teacher_id UUID, is_archived BOOLEAN);
      CREATE TABLE student_enrollments (student_id UUID, class_id UUID, enrollment_status TEXT, desk_number TEXT, room_number TEXT);
      CREATE VIEW active_class_rosters WITH (security_invoker=true) AS
      SELECT e.class_id AS enrollment_class_id, c.name AS class_name, c.academic_year_id, c.teacher_id,
        e.enrollment_status AS current_enrollment_status, e.desk_number, e.room_number, s.id, s.is_active, s.full_name
      FROM student_enrollments e JOIN classes c ON c.id=e.class_id JOIN students s ON s.id=e.student_id;
      CREATE VIEW dependent_roster_count AS SELECT count(*) AS n FROM active_class_rosters;
      GRANT SELECT ON active_class_rosters TO authenticated;
      INSERT INTO students VALUES ('${uuid(100)}',true,'Dara','012345678');
      INSERT INTO classes VALUES ('${classroom}','7A','${year}','${teacher}',false), ('${otherClass}','old','${year}','${teacher}',true);
      INSERT INTO student_enrollments VALUES ('${uuid(100)}','${classroom}','active','1',NULL), ('${uuid(100)}','${otherClass}','active','1',NULL);
    `);
    const migration = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/088_repair_student_profile_roster_projection.sql",
      ),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    const rows = (
      await db.query<{ student_phone: string; prev_school: null }>(
        "SELECT student_phone,prev_school FROM active_class_rosters",
      )
    ).rows;
    assert.deepEqual(rows, [{ student_phone: "012345678", prev_school: null }]);
    assert.equal(
      Number(
        (await db.query<{ n: string }>("SELECT n FROM dependent_roster_count"))
          .rows[0].n,
      ),
      1,
    );
    assert.equal(
      (
        await db.query<{ allowed: boolean }>(
          "SELECT has_table_privilege('authenticated','active_class_rosters','SELECT') AS allowed",
        )
      ).rows[0].allowed,
      true,
    );
    assert.ok(
      (
        await db.query<{ reloptions: string[] }>(
          "SELECT reloptions FROM pg_class WHERE relname='active_class_rosters'",
        )
      ).rows[0].reloptions.includes("security_invoker=true"),
    );
  } finally {
    await db.close();
  }
});

test("Homeroom grid PostgreSQL authorization, conflicts and atomic persistence", async (t) => {
  const db = new PGlite();
  try {
    const fields = [
      ...new Map(
        GRID_COLUMNS.filter(
          (c) =>
            c.key !== "migrant_status" &&
            ![
              "pob",
              "primary_school",
              "secondary_school",
              "exam_grade",
              "ethnicity",
              "scholarship_program",
              "scholarship_materials",
              "scholarship_funding",
              "scholarship_other",
              "elective_subject",
              "student_roles",
              "notes",
            ].includes(c.key) &&
            !["current_status", "desk_number", "room_number"].includes(c.key),
        ).map((c) => [
          c.db,
          `${c.db} ${c.kind === "number" || ["bmi", "age"].includes(c.key) ? "NUMERIC" : c.kind === "date" ? "DATE" : "TEXT"}`,
        ]),
      ).values(),
    ].join(",");
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true),'')::UUID $$;
      CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE SQL AS $$ SELECT current_setting('request.jwt.claim.role', true) $$;
      GRANT USAGE ON SCHEMA auth TO PUBLIC;
      CREATE TABLE profiles (id UUID PRIMARY KEY, role TEXT, school_id TEXT, is_active BOOLEAN);
      CREATE TABLE academic_years (id UUID PRIMARY KEY, school_id TEXT, status TEXT, is_active BOOLEAN);
      CREATE TABLE classes (id UUID PRIMARY KEY, school_id TEXT, teacher_id UUID, academic_year_id UUID, is_archived BOOLEAN, name TEXT);
      CREATE TABLE students (id UUID PRIMARY KEY, is_active BOOLEAN DEFAULT true, updated_at TIMESTAMPTZ DEFAULT now(), date_of_birth DATE, ${fields});
      CREATE TABLE student_enrollments (student_id UUID, class_id UUID, academic_year_id UUID, enrollment_status TEXT, desk_number TEXT, room_number TEXT, UNIQUE(student_id,academic_year_id));
      CREATE TABLE student_health_records (student_id UUID, class_id UUID NOT NULL, academic_year_id UUID NOT NULL, recorded_date DATE, weight_kg NUMERIC(5,2), height_cm NUMERIC(5,2), bmi NUMERIC(4,2), notes TEXT, vision_left TEXT, UNIQUE(student_id,recorded_date,academic_year_id));
      CREATE TABLE audit_logs (user_id UUID, school_id TEXT, action TEXT, type TEXT, target_table TEXT, details JSONB);
      INSERT INTO profiles VALUES ('${teacher}','teacher','school-a',true), ('${principal}','principal','school-b',true), ('${monitor}','monitor','school-a',true);
      INSERT INTO academic_years VALUES ('${year}','school-a','active',true);
      INSERT INTO classes VALUES ('${classroom}','school-a','${teacher}','${year}',false,'7A'), ('${otherClass}','school-a',NULL,'${year}',false,'7B');
    `);
    for (let i = 0; i < 45; i++) {
      await db.query(
        "INSERT INTO students (id, student_id_number, full_name, gender, father_phone, height_m, weight_kg) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [
          uuid(100 + i),
          `S${i + 1}`,
          `Student ${i + 1}`,
          "M",
          "012345678",
          1.5,
          45,
        ],
      );
      await db.query(
        "INSERT INTO student_enrollments VALUES ($1,$2,$3,$4,NULL,NULL)",
        [uuid(100 + i), classroom, year, "active"],
      );
    }
    await db.exec(
      fs.readFileSync(
        path.join(
          process.cwd(),
          "supabase/migrations/087_homeroom_student_grid.sql",
        ),
        "utf8",
      ),
    );
    await db.exec(`
      CREATE FUNCTION public.save_student_atomic(p_student JSONB,p_class_id UUID,p_academic_year_id UUID,p_health JSONB DEFAULT NULL,p_caller_id UUID DEFAULT NULL) RETURNS JSONB LANGUAGE SQL AS $$ SELECT jsonb_build_object('success',true,'legacy_admin',true) $$;
      CREATE FUNCTION public.batch_update_student_profiles_atomic(p_class_id UUID,p_updates JSONB,p_caller_id UUID DEFAULT NULL) RETURNS JSONB LANGUAGE SQL AS $$ SELECT jsonb_build_object('success',true,'legacy_admin',true) $$;
      INSERT INTO profiles VALUES ('${uuid(4)}','admin','school-a',true);
      GRANT SELECT,UPDATE ON students,student_enrollments TO authenticated;
    `);
    const permissionMigration = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/089_homeroom_profile_permissions.sql",
      ),
      "utf8",
    );
    await db.exec(permissionMigration);
    await db.exec(permissionMigration);
    const rosterMigration = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/090_school_roster_profile_fields.sql",
      ),
      "utf8",
    );
    await db.exec(rosterMigration);
    await db.exec(rosterMigration);
    const session = async (id: string, role = "authenticated") => {
      await db.exec("RESET ROLE");
      await db.query(
        "SELECT set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claim.role',$2,false)",
        [id, role],
      );
      await db.exec(`SET ROLE ${role}`);
    };
    const save = (updates: unknown[], classId = classroom, yearId = year) =>
      db.query(
        "SELECT public.save_homeroom_student_grid($1,$2,$3::jsonb) AS result",
        [classId, yearId, JSON.stringify(updates)],
      );
    const update = (
      changes: Record<string, unknown>,
      original: Record<string, unknown>,
      id = uuid(100),
    ) => ({ id, changes, original });
    await t.test(
      "anonymous, monitor, inactive teacher and cross-school principal are denied",
      async () => {
        await session("", "anon");
        await assert.rejects(
          save([update({ english_name: "Test" }, { english_name: null })]),
        );
        await session(monitor);
        await assert.rejects(
          save([update({ english_name: "Test" }, { english_name: null })]),
          /Forbidden/,
        );
        await session(principal);
        await assert.rejects(
          save([update({ english_name: "Test" }, { english_name: null })]),
          /school mismatch/,
        );
        await db.exec(
          `RESET ROLE; UPDATE profiles SET is_active=false WHERE id='${teacher}'`,
        );
        await session(teacher);
        await assert.rejects(
          save([update({ english_name: "Test" }, { english_name: null })]),
          /inactive/,
        );
        await db.exec(
          `RESET ROLE; UPDATE profiles SET is_active=true WHERE id='${teacher}'`,
        );
        await db.exec(`UPDATE profiles SET role=NULL WHERE id='${teacher}'`);
        await session(teacher);
        await assert.rejects(
          save([update({ english_name: "Test" }, { english_name: null })]),
          /unauthorized profile/,
        );
        await db.exec(
          `RESET ROLE; UPDATE profiles SET role='teacher' WHERE id='${teacher}'`,
        );
      },
    );
    await t.test(
      "class ownership, year context, closed years and active enrollment are rechecked",
      async () => {
        await session(teacher);
        await assert.rejects(
          save(
            [update({ english_name: "Test" }, { english_name: null })],
            otherClass,
          ),
          /ownership/,
        );
        await assert.rejects(
          save(
            [update({ english_name: "Test" }, { english_name: null })],
            classroom,
            uuid(999),
          ),
          /academic year/,
        );
        await db.exec(
          `RESET ROLE; UPDATE academic_years SET status='closed',is_active=false`,
        );
        await session(teacher);
        await assert.rejects(
          save([update({ english_name: "Test" }, { english_name: null })]),
          /locked/,
        );
        await db.exec(
          `RESET ROLE; SELECT set_config('request.jwt.claim.sub','${uuid(4)}',false); UPDATE academic_years SET status='active',is_active=true; UPDATE student_enrollments SET enrollment_status='transferred_out' WHERE student_id='${uuid(100)}'`,
        );
        await session(teacher);
        await assert.rejects(
          save([update({ english_name: "Test" }, { english_name: null })]),
          /not actively enrolled/,
        );
        await db.exec(
          `RESET ROLE; SELECT set_config('request.jwt.claim.sub','${uuid(4)}',false); UPDATE student_enrollments SET enrollment_status='active'`,
        );
      },
    );
    await t.test(
      "all identity/placement/calculated fields and forged fields are denied at RPC boundary",
      async () => {
        await session(teacher);
        for (const key of [
          "student_id_number",
          "full_name",
          "gender",
          "desk_number",
          "room_number",
          "current_status",
          "age",
          "bmi",
          "nutrition_status",
          "school_id",
          "actor_id",
        ]) {
          await assert.rejects(
            save([update({ [key]: "forged" }, { [key]: null })]),
            /Protected/,
          );
        }
        await assert.rejects(
          save([update({ english_name: "Test" }, {})]),
          /missing baseline/,
        );
        await assert.rejects(
          save([update({ income: "bad" }, { income: null })]),
          /Invalid number/,
        );
        await assert.rejects(
          save([update({ disability: "bad" }, { disability: null })]),
          /Invalid disability/,
        );
        await assert.rejects(
          save([
            update({ father_phone: "bad" }, { father_phone: "012345678" }),
          ]),
          /Invalid phone/,
        );
        await assert.rejects(
          save([
            update({ date_of_birth: "2099-01-01" }, { date_of_birth: null }),
          ]),
          /date of birth/,
        );
      },
    );
    await t.test(
      "45 students persist with health synchronization, retained leading zeros and one audit event",
      async () => {
        await session(teacher);
        const result = await save(
          Array.from({ length: 45 }, (_, i) =>
            update(
              {
                english_name: `Name ${i}`,
                height_m: 1.6,
                guardian_phone: "099123456",
              },
              { english_name: null, height_m: 1.5, guardian_phone: null },
              uuid(100 + i),
            ),
          ),
        );
        assert.deepEqual((result.rows[0] as { result: unknown }).result, {
          success: true,
          updated_count: 45,
        });
        await db.exec("RESET ROLE");
        assert.equal(
          (
            await db.query<{ n: number }>(
              "SELECT count(*)::int n FROM students WHERE height_m=1.6 AND guardian_phone='099123456' AND father_phone='012345678'",
            )
          ).rows[0].n,
          45,
        );
        assert.equal(
          (
            await db.query<{ n: number }>(
              "SELECT count(*)::int n FROM student_health_records WHERE height_cm=160 AND bmi=17.6",
            )
          ).rows[0].n,
          45,
        );
        assert.equal(
          (
            await db.query<{ n: number }>(
              "SELECT count(*)::int n FROM audit_logs",
            )
          ).rows[0].n,
          1,
        );
      },
    );
    await t.test(
      "Every supported profile field round-trips through canonical columns",
      async () => {
        await db.exec("RESET ROLE");
        const before = (
          await db.query<{ record: Record<string, unknown> }>(
            "SELECT to_jsonb(s) AS record FROM students s WHERE id=$1",
            [uuid(102)],
          )
        ).rows[0].record;
        const samples: Record<string, unknown> = {
          date_of_birth: "2008-01-22",
          status: "repeater",
          distance_km: 2.5,
          weight_kg: 45,
          height_m: 1.6,
          siblings_count: 2,
          income: 0,
          scholarship: "yes",
          orphan: "no",
          indigenous: "yes",
          disability: "mild",
          id_poor: "level_1",
          migrant_status: "parents",
        };
        const changes = Object.fromEntries(
          EDITABLE_GRID_COLUMNS.map((c) => [
            c.key,
            samples[c.key] ??
              (c.key.includes("phone") ? "099123456" : `test ${c.key}`),
          ]),
        );
        const original = Object.fromEntries(
          EDITABLE_GRID_COLUMNS.map((c) => [c.key, before[c.db] ?? null]),
        );
        await session(teacher);
        await save([update(changes, original, uuid(102))]);
        // Lost-response retry is safe when desired values already exist.
        await save([update(changes, original, uuid(102))]);
        await db.exec("RESET ROLE");
        const after = (
          await db.query<{ record: Record<string, unknown> }>(
            "SELECT to_jsonb(s) AS record FROM students s WHERE id=$1",
            [uuid(102)],
          )
        ).rows[0].record;
        for (const c of EDITABLE_GRID_COLUMNS)
          assert.deepEqual(after[c.db], changes[c.key], c.key);
        assert.equal(after.full_name, before.full_name);
        assert.equal(after.gender, before.gender);
        assert.equal(after.bmi, 17.6);
        assert.equal(after.nutrition_status, "ស្គម");
        assert.equal(Number(after.age), calculateStudentAge("2008-01-22"));
      },
    );
    await t.test(
      "stale edited field aborts the entire batch and reports conflicts",
      async () => {
        await db.exec(
          `UPDATE students SET english_name='concurrent' WHERE id='${uuid(101)}'`,
        );
        await session(teacher);
        await assert.rejects(
          save([
            update({ english_name: "overwrite" }, { english_name: "Name 0" }),
            update(
              { english_name: "overwrite" },
              { english_name: "Name 1" },
              uuid(101),
            ),
          ]),
          (error) => {
            assert.match((error as Error).message, /ផ្ទុកថ្មី/);
            assert.match(
              String((error as { detail: string }).detail),
              /english_name/,
            );
            return true;
          },
        );
        await db.exec("RESET ROLE");
        assert.equal(
          (
            await db.query<{ english_name: string }>(
              "SELECT english_name FROM students WHERE id=$1",
              [uuid(100)],
            )
          ).rows[0].english_name,
          "Name 0",
        );
      },
    );
    await t.test(
      "explicit clears synchronize DOB aliases and health without erasing other screening fields",
      async () => {
        await db.exec(
          `UPDATE students SET dob='2008-01-01', date_of_birth='2008-01-01' WHERE id='${uuid(100)}'; UPDATE student_health_records SET vision_left='6/12' WHERE student_id='${uuid(100)}'`,
        );
        await session(teacher);
        await save([
          update(
            { date_of_birth: null, weight_kg: null, address: null },
            { date_of_birth: "2008-01-01", weight_kg: 45, address: null },
          ),
        ]);
        await db.exec("RESET ROLE");
        const student = (
          await db.query<{
            dob: null;
            date_of_birth: null;
            weight_kg: null;
            bmi: null;
            height_m: string;
          }>(
            "SELECT dob,date_of_birth,weight_kg,bmi,height_m FROM students WHERE id=$1",
            [uuid(100)],
          )
        ).rows[0];
        assert.equal(student.dob, null);
        assert.equal(student.date_of_birth, null);
        assert.equal(student.weight_kg, null);
        assert.equal(student.bmi, null);
        assert.equal(Number(student.height_m), 1.6);
        const health = (
          await db.query<{ vision_left: string; weight_kg: null }>(
            "SELECT vision_left,weight_kg FROM student_health_records WHERE student_id=$1",
            [uuid(100)],
          )
        ).rows[0];
        assert.equal(health.vision_left, "6/12");
        assert.equal(health.weight_kg, null);
      },
    );
    await t.test(
      "Legacy RPCs reject teacher bypasses and forged actors while preserving administrator delegation",
      async () => {
        await session(teacher);
        await assert.rejects(
          db.query("SELECT public.save_student_atomic($1,$2,$3,NULL,$4)", [
            JSON.stringify({ id: uuid(100), full_name: "forged" }),
            classroom,
            year,
            uuid(4),
          ]),
          /Teachers must use/,
        );
        await assert.rejects(
          db.query(
            "SELECT public.batch_update_student_profiles_atomic($1,$2,$3)",
            [
              classroom,
              JSON.stringify([{ id: uuid(100), full_name: "forged" }]),
              uuid(4),
            ],
          ),
          /Teachers must use/,
        );
        await assert.rejects(
          db.query(
            "SELECT public._save_student_atomic_admin_v088($1,$2,$3,NULL,$4)",
            ["{}", classroom, year, uuid(4)],
          ),
          /permission denied/,
        );
        await session("", "service_role");
        await assert.rejects(
          db.query("SELECT public.save_student_atomic($1,$2,$3,NULL,$4)", [
            "{}",
            classroom,
            year,
            teacher,
          ]),
          /Teachers must use/,
        );
        await session(principal);
        await assert.rejects(
          db.query(
            "SELECT public.batch_update_student_profiles_atomic($1,$2,NULL)",
            [classroom, "[]"],
          ),
          /school scope/,
        );
        await session(uuid(4));
        const result = await db.query<{ result: { legacy_admin: boolean } }>(
          "SELECT public.save_student_atomic($1,$2,$3,NULL,NULL) AS result",
          ["{}", classroom, year],
        );
        assert.equal(result.rows[0].result.legacy_admin, true);
        const batch = await db.query<{ result: { legacy_admin: boolean } }>(
          "SELECT public.batch_update_student_profiles_atomic($1,$2,NULL) AS result",
          [classroom, "[]"],
        );
        assert.equal(batch.rows[0].result.legacy_admin, true);
        await db.exec("RESET ROLE");
      },
    );
    await t.test(
      "Database table guards independently reject protected teacher edits",
      async () => {
        await session(teacher);
        for (const statement of [
          "full_name='forged'",
          "gender='F'",
          "student_id_number='forged'",
          "age=99",
          "bmi=99",
          "nutrition_status='forged'",
        ]) {
          await assert.rejects(
            db.query(`UPDATE students SET ${statement} WHERE id=$1`, [
              uuid(100),
            ]),
            /Forbidden/,
          );
        }
        await assert.rejects(
          db.query(
            "UPDATE student_enrollments SET desk_number='99' WHERE student_id=$1",
            [uuid(100)],
          ),
          /approval/,
        );
        await assert.rejects(
          db.query(
            "UPDATE student_enrollments SET enrollment_status='dropped' WHERE student_id=$1",
            [uuid(100)],
          ),
          /approval/,
        );
        // Existing health-screening RPCs use two decimals. Their valid calculated values still work.
        await db.query(
          "UPDATE students SET weight_kg=45,height_m=1.55,bmi=18.73,nutrition_status='ធម្មតា' WHERE id=$1",
          [uuid(144)],
        );
        const calculated = (
          await db.query<{ bmi: string }>(
            "SELECT bmi FROM students WHERE id=$1",
            [uuid(144)],
          )
        ).rows[0];
        assert.equal(Number(calculated.bmi), 18.7);
        await db.exec("RESET ROLE");
      },
    );
    await t.test(
      "audit failures roll back student and health writes; duplicate IDs are rejected",
      async () => {
        await db.exec(
          `CREATE FUNCTION fail_grid_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit unavailable'; END $$; CREATE TRIGGER fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_grid_audit()`,
        );
        await session(teacher);
        await assert.rejects(
          save([update({ height_m: 1.7 }, { height_m: 1.6 })]),
          /audit unavailable/,
        );
        await assert.rejects(
          save([
            update({ height_m: 1.7 }, { height_m: 1.6 }),
            update({ height_m: 1.7 }, { height_m: 1.6 }),
          ]),
          /Duplicate/,
        );
        await db.exec("RESET ROLE");
        assert.equal(
          Number(
            (
              await db.query<{ height_m: string }>(
                "SELECT height_m FROM students WHERE id=$1",
                [uuid(100)],
              )
            ).rows[0].height_m,
          ),
          1.6,
        );
        assert.equal(
          Number(
            (
              await db.query<{ height_cm: string }>(
                "SELECT height_cm FROM student_health_records WHERE student_id=$1",
                [uuid(100)],
              )
            ).rows[0].height_cm,
          ),
          160,
        );
      },
    );
  } finally {
    await db.close();
  }
});
