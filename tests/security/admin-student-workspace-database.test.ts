import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test('Workspace migration fails closed when official-ID uniqueness migration is missing', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE TABLE students(id UUID PRIMARY KEY,student_id_number TEXT)');
    await assert.rejects(db.exec(fs.readFileSync('supabase/migrations/094_admin_existing_student_workspace.sql','utf8')), /migration 093/);
    await db.exec('ROLLBACK');
    assert.equal((await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='students' AND column_name='registration_school_id'")).rows.length,0);
  } finally { await db.close(); }
});
test("Admin workspace executes directory, patches and class operations in PostgreSQL", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::UUID $$;
      CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE SQL AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
      GRANT USAGE ON SCHEMA auth TO PUBLIC;
      CREATE TABLE schools(id TEXT PRIMARY KEY);
      CREATE TABLE profiles(id UUID PRIMARY KEY,role TEXT,school_id TEXT,is_active BOOLEAN,full_name TEXT);
      CREATE TABLE academic_years(id UUID PRIMARY KEY,school_id TEXT,status TEXT,is_active BOOLEAN);
      CREATE TABLE classes(id UUID PRIMARY KEY,school_id TEXT,academic_year_id UUID,is_archived BOOLEAN,teacher_id UUID,name TEXT);
      CREATE TABLE students(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),student_id_number TEXT,full_name TEXT,english_name TEXT,gender TEXT,dob DATE,date_of_birth DATE,age INT,student_phone TEXT,parent_phone TEXT,father_name TEXT,father_job TEXT,father_phone TEXT,mother_name TEXT,mother_job TEXT,mother_phone TEXT,guardian_phone TEXT,current_address TEXT,status TEXT,is_active BOOLEAN DEFAULT true,photo_url TEXT,updated_at TIMESTAMPTZ DEFAULT now());
      CREATE TABLE student_enrollments(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),student_id UUID REFERENCES students(id),class_id UUID REFERENCES classes(id),academic_year_id UUID,enrollment_status TEXT,year_result TEXT,desk_number TEXT,room_number TEXT,updated_at TIMESTAMPTZ,UNIQUE(student_id,academic_year_id));
      CREATE TABLE audit_logs(user_id UUID,school_id TEXT,action TEXT,type TEXT,target_table TEXT,details JSONB);
      CREATE TABLE grades(student_id UUID REFERENCES students(id),class_id UUID,academic_year_id UUID,score NUMERIC);
      CREATE TABLE attendance(student_id UUID REFERENCES students(id),class_id UUID,academic_year_id UUID,present BOOLEAN);
      INSERT INTO schools VALUES('school-a'),('school-b');
      INSERT INTO profiles VALUES('${id(1)}','admin','school-a',true,'Admin'),('${id(2)}','principal','school-a',true,'Principal'),('${id(3)}','teacher','school-a',true,'Teacher'),('${id(4)}','admin','school-b',true,'Other admin'),('${id(5)}','admin','school-a',false,'Inactive');
      INSERT INTO academic_years VALUES('${id(10)}','school-a','active',true),('${id(11)}','school-b','active',true),('${id(12)}','school-a','closed',false);
      INSERT INTO classes VALUES('${id(20)}','school-a','${id(10)}',false,'${id(3)}','7A'),('${id(21)}','school-a','${id(10)}',false,NULL,'7B'),('${id(22)}','school-b','${id(11)}',false,NULL,'7A'),('${id(23)}','school-a','${id(10)}',false,NULL,'9A'),('${id(24)}','school-a','${id(12)}',false,NULL,'Old');
    `);
    await db.exec(
      fs.readFileSync(
        "supabase/migrations/093_optional_official_student_id.sql",
        "utf8",
      ),
    );
    const migration = fs.readFileSync(
      "supabase/migrations/094_admin_existing_student_workspace.sql",
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    const session = async (actor = 1, role = "authenticated") => {
      await db.exec("RESET ROLE");
      await db.query(
        "SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",
        [id(actor), role],
      );
      await db.exec(`SET ROLE ${role}`);
    };
    await session();
    await db.exec("RESET ROLE");
    await db.exec(`
      INSERT INTO students(id,student_id_number,full_name,english_name,gender,dob,date_of_birth,photo_url,parent_phone,status)
      SELECT ('00000000-0000-4000-8000-'||lpad((1000+n)::TEXT,12,'0'))::UUID,CASE WHEN n%4=0 THEN NULL ELSE lpad(n::TEXT,6,'0') END,'Student '||lpad(n::TEXT,4,'0'),'English '||n,CASE WHEN n%2=0 THEN 'F' ELSE 'M' END,'2012-01-01','2012-01-01','photo/key.webp','legacy phone text','new' FROM generate_series(1,2000) n;
      INSERT INTO student_enrollments(student_id,class_id,academic_year_id,enrollment_status,year_result)
      SELECT id,CASE WHEN full_name<='Student 0060' THEN '${id(20)}'::UUID WHEN full_name<='Student 0560' THEN '${id(21)}'::UUID ELSE '${id(23)}'::UUID END,'${id(10)}','active','enrolled' FROM students;
      INSERT INTO grades VALUES('${id(1001)}','${id(24)}','${id(12)}',75);
      INSERT INTO attendance VALUES('${id(1001)}','${id(24)}','${id(12)}',true);
    `);
    const directory = async (
      args: {
        cls?: number;
        query?: string;
        page?: number;
        size?: number;
        editor?: boolean;
        unassigned?: boolean;
      } = {},
    ) => {
      const data = await db.query<{
        result: {
          rows: Record<string, unknown>[];
          total: number;
          filtered_total: number;
          female: number;
          male: number;
          missing_ids: number;
        };
      }>(
        "SELECT admin_student_directory($1,$2,$3,$4,'all','all','all',$5,$6,$7) AS result",
        [
          id(10),
          args.cls ? id(args.cls) : null,
          args.query || "",
          args.unassigned || false,
          args.page || 1,
          args.size || 50,
          args.editor || false,
        ],
      );
      return data.rows[0].result;
    };
    const save = (updates: unknown[], cls = 20, year = 10) =>
      db.query("SELECT admin_patch_students($1,$2,$3::jsonb)", [
        id(cls),
        id(year),
        JSON.stringify(updates),
      ]);
    const patch = (
      student: Record<string, unknown>,
      changes: Record<string, unknown>,
    ) => ({
      studentId: student.id,
      changes,
      original: Object.fromEntries(
        Object.keys(changes).map((key) => [key, student[key] ?? null]),
      ),
    });
    await t.test(
      "2,000 students are filtered and sorted across server pages; a 60-student class is not truncated",
      async () => {
        await session();
        const first = await directory();
        const second = await directory({ page: 2 });
        assert.equal(first.total, 2000);
        assert.equal(first.rows.length, 50);
        assert.equal(second.rows[0].full_name, "Student 0051");
        assert.equal(first.female, 1000);
        assert.equal(first.male, 1000);
        assert.equal(first.missing_ids, 500);
        const later = await directory({ query: "English 1950" });
        assert.equal(later.filtered_total, 1);
        assert.equal(later.total, 2000);
        assert.equal(later.rows[0].id, id(2950));
        const classPage = await directory({ cls: 20 });
        assert.equal(classPage.filtered_total, 60);
        assert.equal(classPage.rows.length, 50);
        const editor = await directory({ cls: 20, size: 100, editor: true });
        assert.equal(editor.rows.length, 60);
        assert.equal(
          (await directory({ cls: 21, size: 500 })).rows.length,
          500,
        );
        assert.equal(
          (await directory({ query: "%,id.eq.fake" })).filtered_total,
          0,
        );
      },
    );
    await t.test(
      "50 reordered UUID patches preserve untouched profiles, enrollments and child records",
      async () => {
        const before = (await directory({ cls: 20, size: 100, editor: true }))
          .rows;
        const updates = before
          .slice(0, 50)
          .reverse()
          .map((student, i) =>
            patch(student, {
              full_name: `កែប្រែ ${i}`,
              student_id_number: `NEW${String(i).padStart(5, "0")}`,
              desk_number: String(i + 1).padStart(2, "0"),
            }),
          );
        await save(updates);
        const after = (await directory({ cls: 20, size: 100, editor: true }))
          .rows;
        for (const update of updates) {
          const student = after.find((row) => row.id === update.studentId)!;
          for (const [key, value] of Object.entries(update.changes))
            assert.equal(student[key], value);
          assert.equal(student.parent_phone, "legacy phone text");
          assert.equal(student.photo_url, "photo/key.webp");
          assert.equal(
            student.enrollment_id,
            before.find((row) => row.id === student.id)!.enrollment_id,
          );
        }
        assert.deepEqual(
          after.find((row) => row.id === before[59].id),
          before[59],
        );
        await db.exec("RESET ROLE");
        assert.equal(
          (
            await db.query<{ n: number }>(
              "SELECT count(*)::int n FROM students",
            )
          ).rows[0].n,
          2000,
        );
        assert.equal((await db.query("SELECT * FROM grades")).rows.length, 1);
        assert.equal(
          (await db.query("SELECT * FROM attendance")).rows.length,
          1,
        );
        await session();
      },
    );
    await t.test(
      "same-field conflicts reject the entire batch while idempotent retries are safe",
      async () => {
        const loaded = (await directory({ cls: 20, size: 100, editor: true }))
          .rows;
        const student = loaded[0],
          other = loaded[1];
        const update = patch(student, { english_name: "First admin" });
        await save([update]);
        await save([update]);
        await assert.rejects(
          save([
            patch(student, { english_name: "Stale admin" }),
            patch(other, { father_name: "Must roll back" }),
          ]),
          /ទិន្នន័យ/,
        );
        const latest = (await directory({ cls: 20, size: 100, editor: true }))
          .rows;
        assert.equal(
          latest.find((row) => row.id === student.id)!.english_name,
          "First admin",
        );
        assert.equal(
          latest.find((row) => row.id === other.id)!.father_name,
          null,
        );
      },
    );
    await t.test(
      "NULL IDs remain editable, IDs can be assigned later, invalid and protected writes fail closed",
      async () => {
        const loaded = (await directory({ cls: 20, size: 100 })).rows;
        const student = loaded.find((row) => row.student_id_number === null)!;
        await save([
          patch(student, { full_name: "No official ID", desk_number: "03" }),
        ]);
        await save([
          patch(
            { ...student, full_name: "No official ID", desk_number: "03" },
            { student_id_number: "00725", dob: "2011-05-06" },
          ),
        ]);
        const latest = (await directory({ cls: 20, size: 100 })).rows.find(
          (row) => row.id === student.id,
        )!;
        assert.equal(latest.student_id_number, "00725");
        assert.equal(latest.dob, "2011-05-06");
        await assert.rejects(
          save([patch(latest, { student_id_number: null })]),
          /cannot be cleared/,
        );
        const other = loaded.find((row) => row.id !== student.id)!;
        await assert.rejects(
          save([patch(other, { student_id_number: "00725" })]),
          /unique/,
        );
        for (const field of [
          "id",
          "class_id",
          "academic_year_id",
          "registration_school_id",
          "teacher_id",
          "school_id",
          "is_active",
          "student_study_plan",
        ])
          await assert.rejects(
            save([patch(latest, { [field]: "forged" })]),
            /Protected field/,
          );
        await assert.rejects(
          save([patch(latest, { gender: "unknown" })]),
          /Invalid gender/,
        );
        await assert.rejects(
          save([patch(latest, { dob: "2011-02-31" })]),
          /date|range/i,
        );
      },
    );
    await t.test(
      "teacher, principal, inactive Admin, foreign class, wrong year and closed year are rejected",
      async () => {
        for (const actor of [2, 3, 5]) {
          await session(actor);
          await assert.rejects(directory(), /Admin/);
        }
        await session(4);
        await assert.rejects(directory(), /year/);
        await session(1, "anon");
        await assert.rejects(directory(), /permission denied/);
        await session();
        await assert.rejects(directory({ cls: 22 }), /Invalid class/);
        await assert.rejects(
          save(
            [
              {
                studentId: id(1001),
                changes: { full_name: "Wrong year" },
                original: { full_name: "old" },
              },
            ],
            20,
            12,
          ),
          /year/,
        );
        const foreign = (await directory({ cls: 21, size: 500 })).rows[0];
        await assert.rejects(
          save([patch(foreign, { desk_number: "01" })]),
          /not actively enrolled/,
        );
        await assert.rejects(
          db.query("SELECT _admin_student_school($1,$2)", [id(10), id(20)]),
          /permission denied/,
        );
      },
    );
    await t.test(
      "moves preserve enrollment UUIDs and history; verified never-enrolled students can be assigned",
      async () => {
        const source = (await directory({ cls: 20, size: 100 })).rows.slice(
          0,
          20,
        );
        const move = (ids: unknown[], target = 21, year = 10) =>
          db.query<{ result: { reassigned_count: number } }>(
            "SELECT batch_reassign_class_atomic($1::uuid[],$2,$3) result",
            [ids, id(target), id(year)],
          );
        const result = await move(source.map((row) => row.id));
        assert.equal(
          (result.rows[0].result as { reassigned_count: number })
            .reassigned_count,
          20,
        );
        const dest = [
          ...(await directory({ cls: 21, size: 500 })).rows,
          ...(await directory({ cls: 21, size: 500, page: 2 })).rows,
        ];
        for (const row of source)
          assert.equal(
            dest.find((student) => student.id === row.id)?.enrollment_id,
            row.enrollment_id,
          );
        await db.exec("RESET ROLE");
        const fresh = (
          await db.query<{ id: string; registration_school_id: string }>(
            "INSERT INTO students(full_name,gender,is_active,status,registration_school_id) VALUES('Fresh','F',true,'new','school-b') RETURNING id,registration_school_id",
          )
        ).rows[0];
        assert.equal(fresh.registration_school_id, "school-a");
        await db.query("SELECT set_config('request.jwt.claim.role','',false)");
        const unknown = (
          await db.query<{ id: string }>(
            "INSERT INTO students(full_name,gender,is_active,status) VALUES('Unknown school','M',true,'new') RETURNING id",
          )
        ).rows[0];
        await session();
        const unassigned = await directory({ unassigned: true });
        assert.equal(unassigned.filtered_total, 1);
        assert.equal(unassigned.rows[0].id, fresh.id);
        await move([fresh.id]);
        await assert.rejects(move([unknown.id]), /provenance/);
        await assert.rejects(move([fresh.id], 22, 11), /destination/);
        await assert.rejects(move([fresh.id], 21, 12), /destination/);
        await db.exec("RESET ROLE");
        assert.equal(
          (await db.query<{ class_id: string }>("SELECT class_id FROM grades"))
            .rows[0].class_id,
          id(24),
        );
        assert.equal(
          (
            await db.query<{ class_id: string }>(
              "SELECT class_id FROM attendance",
            )
          ).rows[0].class_id,
          id(24),
        );
        await session(3);
        await assert.rejects(move([fresh.id]), /authorized/);
        await session();
      },
    );
    await t.test(
      "audit errors roll back both profile/seating patches and class moves",
      async () => {
        const student = (await directory({ cls: 20, size: 100 })).rows[0];
        await db.exec(
          `RESET ROLE;CREATE FUNCTION fail_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit failed';END $$;CREATE TRIGGER fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_audit();`,
        );
        await session();
        await assert.rejects(
          save([patch(student, { full_name: "Rollback", desk_number: "99" })]),
          /Audit failed/,
        );
        await assert.rejects(
          db.query("SELECT batch_reassign_class_atomic($1::uuid[],$2,$3)", [
            [student.id],
            id(21),
            id(10),
          ]),
          /Audit failed/,
        );
        const latest = (await directory({ cls: 20, size: 100 })).rows.find(
          (row) => row.id === student.id,
        )!;
        assert.equal(latest.full_name, student.full_name);
        assert.equal(latest.desk_number, student.desk_number);
      },
    );
  } finally {
    await db.close();
  }
});
