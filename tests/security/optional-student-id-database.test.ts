import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const migration = fs.readFileSync(
  "supabase/migrations/093_optional_official_student_id.sql",
  "utf8",
);
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::UUID $$;
    CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE SQL AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
    GRANT USAGE ON SCHEMA auth TO PUBLIC;
    CREATE TABLE profiles(id UUID PRIMARY KEY,role TEXT,school_id TEXT,is_active BOOLEAN DEFAULT true);
    CREATE TABLE academic_years(id UUID PRIMARY KEY,school_id TEXT,status TEXT);
    CREATE TABLE classes(id UUID PRIMARY KEY,school_id TEXT,academic_year_id UUID,is_archived BOOLEAN DEFAULT false);
    CREATE TABLE students(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),student_id_number TEXT,full_name TEXT,gender TEXT,dob DATE,date_of_birth DATE,current_address TEXT,father_name TEXT,father_job TEXT,father_phone TEXT,mother_name TEXT,mother_job TEXT,mother_phone TEXT,parent_phone TEXT,status TEXT,is_active BOOLEAN,updated_at TIMESTAMPTZ);
    CREATE TABLE student_enrollments(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),student_id UUID REFERENCES students(id),class_id UUID,academic_year_id UUID,enrollment_status TEXT,year_result TEXT,desk_number TEXT,room_number TEXT,updated_at TIMESTAMPTZ,UNIQUE(student_id,academic_year_id));
    CREATE TABLE audit_logs(user_id UUID,action TEXT);
    CREATE TABLE attendance(student_id UUID REFERENCES students(id), present BOOLEAN);
    CREATE TABLE grades(student_id UUID REFERENCES students(id),score INT);
    INSERT INTO profiles VALUES('${uuid(1)}','admin','school-a',true),('${uuid(2)}','principal','school-a',true),('${uuid(3)}','teacher','school-a',true),('${uuid(4)}','admin','school-a',false);
    INSERT INTO academic_years VALUES('${uuid(10)}','school-a','active'),('${uuid(11)}','school-b','active'),('${uuid(12)}','school-a','closed');
    INSERT INTO classes VALUES('${uuid(20)}','school-a','${uuid(10)}',false),('${uuid(21)}','school-b','${uuid(11)}',false),('${uuid(22)}','school-a','${uuid(12)}',false);
    GRANT SELECT,UPDATE ON students TO authenticated;
  `);
  return db;
}

test("Optional IDs persist atomically through both production registration RPCs", async (t) => {
  const db = await fixture();
  try {
    await db.exec(migration);
    await db.exec(migration);
    const session = async (actor: number, role = "authenticated") => {
      await db.exec("RESET ROLE");
      await db.query(
        "SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",
        [uuid(actor), role],
      );
      await db.exec(`SET ROLE ${role}`);
    };
    const save = async (
      rows: unknown[],
      batch = false,
      year = 10,
      actor = 999,
    ) => {
      const name = batch
        ? "batch_register_students_atomic"
        : "bulk_quick_register_students";
      return (
        await db.query<{ result: { count: number; student_ids: string[] } }>(
          `SELECT public.${name}($1::jsonb,$2,$3) AS result`,
          [JSON.stringify(rows), uuid(year), uuid(actor)],
        )
      ).rows[0].result;
    };
    const row = (name: string, id?: string | null) => ({
      full_name: name,
      gender: "M",
      student_id_number: id,
      class_id: uuid(20),
    });
    await t.test(
      "50 blank IDs create 50 UUIDs and active enrollments in each entry point",
      async () => {
        await session(1);
        for (const batch of [false, true]) {
          const input = Array.from({ length: 50 }, (_, i) =>
            row(`Student ${batch} ${i}`, [undefined, null, "", "   "][i % 4]),
          );
          const result = await save(input, batch);
          assert.equal(result.count, 50);
          assert.equal(new Set(result.student_ids).size, 50);
        }
        await db.exec("RESET ROLE");
        const data = (
          await db.query<{ n: number; ids: number; enrolled: number }>(
            "SELECT (SELECT count(*)::int FROM students WHERE student_id_number IS NULL) AS n,(SELECT count(DISTINCT id)::int FROM students) AS ids,(SELECT count(*)::int FROM student_enrollments WHERE enrollment_status='active') AS enrolled",
          )
        ).rows[0];
        assert.deepEqual(data, { n: 100, ids: 100, enrolled: 100 });
      },
    );
    await t.test(
      "mixed IDs retain zeros, retry existing identity, and reject identity overwrites",
      async () => {
        await session(1);
        const result = await save([
          row("Mixed 1", " 00101 "),
          row("Mixed 2"),
          row("Mixed 3", null),
          row("Mixed 4", "00104"),
        ]);
        assert.equal(result.count, 4);
        const retry = await save([row("Mixed 1", "00101")], true);
        assert.equal(retry.student_ids[0], result.student_ids[0]);
        await assert.rejects(
          save([row("Different identity", "00101")]),
          /identity conflict/,
        );
        await assert.rejects(
          save([row("Dup A", "00199"), row("Dup B", " 00199 ")]),
          /Duplicate official ID/,
        );
      },
    );
    await t.test(
      "later assignment keeps UUID, enrollment, attendance and grades; assigned IDs cannot be erased",
      async () => {
        await session(1);
        const {
          student_ids: [id],
        } = await save([row("Assign later")]);
        await db.exec("RESET ROLE");
        await db.query("INSERT INTO attendance VALUES($1,true);", [id]);
        await db.query("INSERT INTO grades VALUES($1,75);", [id]);
        const enrollment = (
          await db.query(
            "SELECT id FROM student_enrollments WHERE student_id=$1",
            [id],
          )
        ).rows;
        await db.query("UPDATE students SET current_address=$1 WHERE id=$2", [
          "New address",
          id,
        ]);
        await db.query("UPDATE students SET student_id_number=$1 WHERE id=$2", [
          " 00725 ",
          id,
        ]);
        assert.equal(
          (
            await db.query<{ student_id_number: string }>(
              "SELECT student_id_number FROM students WHERE id=$1",
              [id],
            )
          ).rows[0].student_id_number,
          "00725",
        );
        assert.deepEqual(
          (
            await db.query(
              "SELECT id FROM student_enrollments WHERE student_id=$1",
              [id],
            )
          ).rows,
          enrollment,
        );
        assert.equal(
          (await db.query("SELECT * FROM attendance WHERE student_id=$1", [id]))
            .rows.length,
          1,
        );
        assert.equal(
          (await db.query("SELECT * FROM grades WHERE student_id=$1", [id]))
            .rows.length,
          1,
        );
        await assert.rejects(
          db.query("UPDATE students SET student_id_number=$1 WHERE id=$2", [
            " ",
            id,
          ]),
          /មិនអាច/,
        );
        const other = (
          await db.query<{ id: string }>(
            "SELECT id FROM students WHERE id<>$1 LIMIT 1",
            [id],
          )
        ).rows[0].id;
        await assert.rejects(
          db.query("UPDATE students SET student_id_number=$1 WHERE id=$2", [
            "00725",
            other,
          ]),
          /unique/i,
        );
      },
    );
    await t.test(
      "weak identity matches require review and never merge or partially insert",
      async () => {
        await session(1);
        await save([row("Same name")]);
        await assert.rejects(save([row("Same name")]), /Possible duplicate/);
        await assert.rejects(
          save([row("Repeated name"), row("Repeated name")]),
          /Possible duplicate/,
        );
        await assert.rejects(
          save([
            row("Rollback new"),
            row("Invalid", null),
            { ...row("Invalid class"), class_id: uuid(999) },
          ]),
          /Invalid class/,
        );
        await db.exec("RESET ROLE");
        assert.equal(
          (
            await db.query(
              "SELECT * FROM students WHERE full_name IN ('Rollback new','Invalid')",
            )
          ).rows.length,
          0,
        );
      },
    );
    await t.test(
      "role, caller, school, year, and archived-class checks cannot be forged",
      async () => {
        await session(3);
        await assert.rejects(
          save([row("Forbidden")], false, 10, 1),
          /Forbidden/,
        );
        await assert.rejects(
          db.query("SELECT _register_basic_students_v093($1,$2,$3,false)", [
            JSON.stringify([row("Bypass")]),
            uuid(10),
            uuid(1),
          ]),
          /permission denied/,
        );
        await session(1, "anon");
        await assert.rejects(save([row("Anonymous")]), /permission denied/);
        await session(4);
        await assert.rejects(save([row("Inactive")]), /Forbidden/);
        await session(2);
        await save([row("Principal accepted")]);
        await assert.rejects(
          save([{ ...row("Cross school"), class_id: uuid(21) }], false, 11),
          /school mismatch/,
        );
        await session(1);
        await assert.rejects(
          save([{ ...row("Invalid gender"), gender: "unknown" }]),
          /valid gender/,
        );
        await assert.rejects(
          save([{ ...row("Numeric ID"), student_id_number: 125 }]),
          /must be text/,
        );
        await assert.rejects(save([row("Locked")], false, 12), /locked/);
        await assert.rejects(
          save([{ ...row("Wrong year"), class_id: uuid(21) }]),
          /Invalid class/,
        );
        await db.exec("RESET ROLE");
        await db.exec(
          `UPDATE classes SET is_archived=true WHERE id='${uuid(20)}'`,
        );
        await session(1);
        await assert.rejects(save([row("Archived")]), /Invalid class/);
        await db.exec("RESET ROLE");
        await db.exec(
          `UPDATE classes SET is_archived=false WHERE id='${uuid(20)}'`,
        );
      },
    );
    await t.test(
      "audit failure rolls back all student and enrollment writes",
      async () => {
        await db.exec(
          `RESET ROLE; CREATE FUNCTION fail_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit unavailable'; END $$; CREATE TRIGGER fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_audit();`,
        );
        await session(1);
        await assert.rejects(
          save([row("Audit rollback")]),
          /Audit unavailable/,
        );
        await db.exec("RESET ROLE");
        assert.equal(
          (
            await db.query(
              "SELECT id FROM students WHERE full_name='Audit rollback'",
            )
          ).rows.length,
          0,
        );
      },
    );
  } finally {
    await db.close();
  }
});

test("Migration refuses existing normalized ID conflicts without rewriting student data", async () => {
  const db = await fixture();
  try {
    await db.exec(
      "INSERT INTO students(student_id_number,full_name) VALUES('001','A'),(' 001 ','B')",
    );
    await assert.rejects(
      db.exec(migration),
      /Conflicting official student IDs/,
    );
    await db.exec("ROLLBACK");
    assert.deepEqual(
      (
        await db.query(
          "SELECT student_id_number FROM students ORDER BY full_name",
        )
      ).rows,
      [{ student_id_number: "001" }, { student_id_number: " 001 " }],
    );
  } finally {
    await db.close();
  }
});
