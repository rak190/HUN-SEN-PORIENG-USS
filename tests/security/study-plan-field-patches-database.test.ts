import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { PRETEST_SUBJECTS } from '../../lib/study-plans/pretest-import';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
test('study-plan field patch RPC: actual PostgreSQL authorization, isolation, conflicts and rollback (required, never skipped)', async (t) => {
    const db = new PGlite();
    try {
        await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::UUID $$;
      CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE SQL AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
      GRANT USAGE ON SCHEMA auth TO PUBLIC;
      CREATE TABLE profiles(id UUID PRIMARY KEY,role TEXT,school_id TEXT,is_active BOOLEAN);
      CREATE TABLE classes(id UUID PRIMARY KEY,school_id TEXT,teacher_id UUID,academic_year_id UUID,is_archived BOOLEAN);
      CREATE TABLE academic_years(id UUID PRIMARY KEY,school_id TEXT,status TEXT,is_active BOOLEAN);
      CREATE TABLE students(id UUID PRIMARY KEY,is_active BOOLEAN);
      CREATE TABLE student_enrollments(student_id UUID,class_id UUID,academic_year_id UUID,enrollment_status TEXT);
      CREATE TABLE grades(student_id UUID,class_id UUID,academic_year_id UUID,status TEXT,period TEXT,scores JSONB);
      CREATE TABLE student_study_plans(student_id UUID,class_id UUID,academic_year_id UUID,subject_targets JSONB NOT NULL DEFAULT '{}',updated_at TIMESTAMPTZ,UNIQUE(student_id,academic_year_id));
      CREATE TABLE audit_logs(user_id UUID,school_id TEXT,action TEXT,type TEXT,target_table TEXT,details JSONB);
      INSERT INTO profiles VALUES('${id(1)}','teacher','a',true),('${id(2)}','teacher','a',true),('${id(3)}','admin','b',true),('${id(4)}','teacher','a',false),('${id(5)}','student','a',true),('${id(6)}','admin','a',true),('${id(7)}','principal','a',true);
      INSERT INTO academic_years VALUES('${id(10)}','a','active',true),('${id(11)}','a','closed',true),('${id(12)}','a','active',false),('${id(13)}','b','active',true);
      INSERT INTO classes VALUES('${id(20)}','a','${id(1)}','${id(10)}',false),('${id(21)}','a','${id(2)}','${id(10)}',false),('${id(22)}','a','${id(1)}','${id(11)}',false),('${id(23)}','a','${id(1)}','${id(12)}',false),('${id(24)}','a','${id(1)}','${id(10)}',true),('${id(25)}','b','${id(3)}','${id(13)}',false);
      INSERT INTO students SELECT ('00000000-0000-4000-8000-'||lpad((1000+n)::TEXT,12,'0'))::UUID,true FROM generate_series(1,61)n;
      INSERT INTO student_enrollments SELECT id,'${id(20)}','${id(10)}','active' FROM students WHERE id<>'${id(1061)}';
    `);
        const migration = fs.readFileSync('supabase/migrations/095_study_plan_field_patches.sql', 'utf8');
        await db.exec(migration);
        await db.exec(migration);
        const session = async (actor = 1, role = 'authenticated') => { await db.exec('RESET ROLE'); await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)", [id(actor), role]); await db.exec(`SET ROLE ${role}`); };
        const patch = (student = 1001, subject = 'math', previous: string | null = '', next = 'A', path = 'initial') => ({ studentId: id(student), subjectId: subject, path, previousGrade: previous, newGrade: next });
        const save = async (patches: unknown[], cls = 20, year = 10) => db.query<{
            result: {
                plans: Record<string, unknown>;
                student_count: number;
                cell_count: number;
            };
        }>('SELECT patch_student_study_plans_atomic($1,$2,$3::jsonb) AS result', [id(cls), id(year), JSON.stringify(patches)]);
        const snapshot = async () => { await db.exec('RESET ROLE'); const result = await db.query('SELECT student_id,subject_targets FROM student_study_plans ORDER BY student_id'); await session(); return result.rows; };
        await session();
        await t.test('600 initial-only writes create exactly 60 plans and no student masters', async () => {
            const patches = Array.from({ length: 60 }, (_, i) => PRETEST_SUBJECTS.map(subject => patch(i + 1001, subject))).flat();
            const result = (await save(patches)).rows[0].result;
            assert.equal(result.cell_count, 600);
            assert.equal(result.student_count, 60);
            await db.exec('RESET ROLE');
            assert.equal((await db.query<{
                n: number;
            }>('SELECT count(*)::INT AS n FROM students')).rows[0].n, 61);
            assert.equal((await db.query<{
                n: number;
            }>('SELECT count(*)::INT AS n FROM student_study_plans')).rows[0].n, 60);
            await session();
        });
        await t.test('initial patch preserves latest months/end-years/other subjects including concurrent unrelated changes', async () => {
            await db.exec('RESET ROLE');
            await db.query("UPDATE student_study_plans SET subject_targets=subject_targets||$1::jsonb WHERE student_id=$2", [JSON.stringify({ math: { initial: 'A', plan: { nov: 'B' }, actual: { nov: 'C' }, end_plan: 'D', end_actual: 'E', otherMetadata: 'keep' }, khmer: { initial: 'F' } }), id(1001)]);
            await session();
            const result = (await save([patch(1001, 'math', 'A', 'B')])).rows[0].result;
            const targets = result.plans[id(1001)] as Record<string, unknown>;
            assert.deepEqual(targets.math, { initial: 'B', plan: { nov: 'B' }, actual: { nov: 'C' }, end_plan: 'D', end_actual: 'E', otherMetadata: 'keep' });
            assert.deepEqual(targets.khmer, { initial: 'F' });
        });
        await t.test('stale same-path change rejects whole batch and reports student/subject/path; retry is idempotent', async () => {
            const before = await snapshot();
            await assert.rejects(save([patch(1002, 'math', 'A', 'C'), patch(1001, 'math', 'A', 'D')]), error => { const value = error as {
                code: string;
                detail: string;
            }; assert.equal(value.code, '40001'); assert.equal(JSON.parse(value.detail)[0].studentId, id(1001)); return true; });
            assert.deepEqual(await snapshot(), before);
            assert.equal((await save([patch(1001, 'math', 'A', 'B')])).rows[0].result.cell_count, 1);
        });
        await t.test('unassigned, inactive and withdrawn students fail closed; invalid batch rolls back', async () => {
            const before = await snapshot();
            await assert.rejects(save([patch(1002, 'math', 'A', 'B'), patch(1061)]), /enrolled/);
            assert.deepEqual(await snapshot(), before);
            await db.exec('RESET ROLE');
            await db.query('UPDATE students SET is_active=false WHERE id=$1', [id(1003)]);
            await session();
            await assert.rejects(save([patch(1003)]), /inactive/);
            await db.exec('RESET ROLE');
            await db.query("UPDATE student_enrollments SET enrollment_status='withdrawn' WHERE student_id=$1", [id(1004)]);
            await session();
            await assert.rejects(save([patch(1004)]), /enrolled/);
        });
        await t.test('teacher ownership, roles, school and active-year gates reject forged contexts', async () => {
            for (const actor of [2, 3, 4, 5]) {
                await session(actor);
                await assert.rejects(save([patch()]));
            }
            await session();
            for (const [cls, year] of [[21, 10], [22, 11], [23, 12], [24, 10], [25, 13], [20, 11]])
                await assert.rejects(save([patch()], cls, year));
            for (const actor of [6, 7]) {
                await session(actor);
                await save([patch(1005, 'math', 'A', 'B')]);
            }
            await session();
        });
        await t.test('canonical fields/letter values only; no broad JSON, student or audit mutations', async () => {
            for (const bad of [{ ...patch(), subjectId: 'made_up' }, { ...patch(), path: 'plan.bad_month' }, { ...patch(), newGrade: '5' }, { ...patch(), newGrade: 5 }, { ...patch(), school_id: 'b' }, { ...patch(), path: 'id' }, { ...patch(), previousGrade: 42 }])
                await assert.rejects(save([bad]));
            await assert.rejects(save([patch(), patch()]));
        });
        await t.test('manual non-initial grid edits patch individual months and respect official actual locks', async () => {
            const result = (await save([patch(1001, 'math', 'B', 'A', 'plan.nov')])).rows[0].result;
            assert.equal(((result.plans[id(1001)] as Record<string, Record<string, string>>).math).initial, 'B');
            await db.exec('RESET ROLE');
            await db.query("INSERT INTO grades VALUES($1,$2,$3,'published','nov','{\"math\":0}')", [id(1001), id(20), id(10)]);
            await session();
            await assert.rejects(save([patch(1001, 'math', 'C', 'D', 'actual.nov')]), /Published/);
            await save([patch(1001, 'math', 'E', '', 'end_actual')]);
        });
        await t.test('audit failure rolls back every plan write', async () => {
            const before = await snapshot();
            await db.exec('RESET ROLE');
            await db.exec("CREATE FUNCTION reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit unavailable'; END $$; CREATE TRIGGER audit_failure BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_audit();");
            await session();
            await assert.rejects(save([patch(1006, 'math', 'A', 'E')]), /Audit unavailable/);
            assert.deepEqual(await snapshot(), before);
            await db.exec('RESET ROLE');
            await db.exec('DROP TRIGGER audit_failure ON audit_logs');
            await session();
        });
        await t.test('anonymous/service-role callers cannot execute the RPC', async () => {
            await session(1, 'anon');
            await assert.rejects(save([patch()]));
            await session(1, 'service_role');
            await assert.rejects(save([patch()]));
            await session();
        });
    }
    finally {
        await db.close();
    }
});
