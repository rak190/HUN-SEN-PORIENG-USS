import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('Monitor workflow: required isolated PostgreSQL integration (never skipped)',async t=>{
  const db=new PGlite();
  try{
    await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::UUID$$;
      CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE SQL AS $$SELECT current_setting('request.jwt.claim.role',true)$$;
      GRANT USAGE ON SCHEMA auth TO PUBLIC;
      CREATE TABLE auth.users(id UUID PRIMARY KEY,email TEXT UNIQUE);
      CREATE TABLE schools(id TEXT PRIMARY KEY,code TEXT);
      INSERT INTO schools VALUES('a','A'),('b','B');
      CREATE TABLE profiles(id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,username TEXT UNIQUE,full_name TEXT,role TEXT CONSTRAINT profiles_role_check CHECK(role IN ('admin','teacher','principal')),school_id TEXT,school_code TEXT,phone TEXT,subject TEXT,is_active BOOLEAN DEFAULT true,is_archived BOOLEAN DEFAULT false);
      CREATE TABLE academic_years(id UUID PRIMARY KEY,school_id TEXT,start_date DATE,end_date DATE,is_active BOOLEAN,status TEXT);
      CREATE TABLE classes(id UUID PRIMARY KEY,school_id TEXT,academic_year_id UUID,teacher_id UUID,monitor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,is_archived BOOLEAN DEFAULT false);
      CREATE TABLE students(id UUID PRIMARY KEY,full_name TEXT,gender TEXT,is_active BOOLEAN DEFAULT true);
      CREATE TABLE student_enrollments(id UUID DEFAULT gen_random_uuid(),student_id UUID,class_id UUID,academic_year_id UUID,enrollment_status TEXT);
      CREATE TABLE attendance_records(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),student_id UUID REFERENCES students(id),class_id UUID,academic_year_id UUID,date DATE,status TEXT,root_cause TEXT,recorded_by UUID,updated_at TIMESTAMPTZ DEFAULT now(),UNIQUE(student_id,date,academic_year_id));
      CREATE TABLE grades(id UUID,student_id UUID,class_id UUID);
      CREATE TABLE monthly_attendance_summaries(id UUID,student_id UUID,class_id UUID);
      CREATE TABLE audit_logs(id UUID DEFAULT gen_random_uuid(),user_id UUID,school_id TEXT,action TEXT,type TEXT,target_table TEXT,details JSONB);
      INSERT INTO auth.users SELECT ('00000000-0000-4000-8000-'||lpad(n::TEXT,12,'0'))::UUID,'user'||n||'@kruai.app' FROM generate_series(1,9)n;
      INSERT INTO profiles(id,username,full_name,role,school_id) VALUES('${id(1)}','user1','Admin','admin','a'),('${id(2)}','user2','Teacher','teacher','a'),('${id(5)}','user5','Other admin','admin','b'),('${id(8)}','user8','Principal','principal','a');
      INSERT INTO academic_years VALUES('${id(10)}','a',CURRENT_DATE-60,CURRENT_DATE+365,true,'active'),('${id(11)}','a',CURRENT_DATE-400,CURRENT_DATE-61,false,'closed'),('${id(12)}','b',CURRENT_DATE-60,CURRENT_DATE+365,true,'active');
      INSERT INTO classes(id,school_id,academic_year_id,teacher_id) VALUES('${id(20)}','a','${id(10)}','${id(2)}'),('${id(21)}','a','${id(10)}','${id(2)}'),('${id(22)}','b','${id(12)}','${id(2)}'),('${id(23)}','a','${id(11)}','${id(2)}');
      INSERT INTO students SELECT ('00000000-0000-4000-8000-'||lpad((100+n)::TEXT,12,'0'))::UUID,'Student '||n,'F',n<>6 FROM generate_series(1,6)n;
      INSERT INTO student_enrollments(student_id,class_id,academic_year_id,enrollment_status) SELECT id,'${id(20)}','${id(10)}',CASE WHEN id='${id(105)}' THEN 'transferred' ELSE 'active' END FROM students;
      INSERT INTO student_enrollments(student_id,class_id,academic_year_id,enrollment_status) VALUES('${id(101)}','${id(20)}','${id(10)}','active');
      GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
      CREATE POLICY profiles_read ON profiles FOR SELECT TO authenticated USING(true);
      CREATE POLICY profiles_self_update ON profiles FOR UPDATE TO authenticated USING(id=auth.uid());
      CREATE VIEW diagnostic_orphaned_profiles AS SELECT p.id,p.username FROM profiles p LEFT JOIN auth.users u ON u.id=p.id WHERE u.id IS NULL;
      GRANT SELECT ON diagnostic_orphaned_profiles TO authenticated,anon;
    `);
    const privateTables=['student_health_records','home_visits','ai_generations','student_study_plans','system_settings','school_infrastructure','announcements','documents','support_cases','support_interventions','grade_snapshots','parent_contacts','student_requests','correction_requests','activity_logs','giep_notes','telegram_parent_subscriptions','telegram_bot_sessions','exam_subject_standards','exam_grading_scales'];
    for(const table of privateTables)await db.exec(`CREATE TABLE ${table}(id UUID DEFAULT gen_random_uuid()); ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY; CREATE POLICY legacy_access ON ${table} FOR ALL TO authenticated USING(true); GRANT SELECT,INSERT,UPDATE,DELETE ON ${table} TO authenticated; INSERT INTO ${table} DEFAULT VALUES;`);
    await assert.rejects(db.query('INSERT INTO profiles(id,role) VALUES($1,$2)',[id(3),'monitor']),/profiles_role_check/);
    // Supabase can grant authenticated EXECUTE through default privileges as well as PUBLIC.
    await db.exec('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;');
    await db.exec(fs.readFileSync('supabase/migrations/20261030164925_monitor_role_and_attendance_integrity.sql','utf8'));
    await db.exec(`INSERT INTO profiles(id,username,full_name,role,school_id,is_active) VALUES('${id(3)}','user3','Monitor','monitor','a',true),('${id(4)}','user4','Second monitor','monitor','a',true),('${id(6)}','user6','Inactive monitor','monitor','a',false),('${id(9)}','user9','Foreign monitor','monitor','b',true);
      ALTER TABLE classes ENABLE ROW LEVEL SECURITY; CREATE POLICY legacy_class_select ON classes FOR SELECT TO authenticated USING(true); CREATE POLICY legacy_class_update ON classes FOR UPDATE TO authenticated USING(teacher_id=auth.uid() OR EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('admin','principal')));
      ALTER TABLE students ENABLE ROW LEVEL SECURITY; CREATE POLICY legacy_students ON students FOR ALL TO authenticated USING(true);
      ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY; CREATE POLICY legacy_enrollments ON student_enrollments FOR ALL TO authenticated USING(true);
      ALTER TABLE grades ENABLE ROW LEVEL SECURITY; CREATE POLICY legacy_grades ON grades FOR ALL TO authenticated USING(true);
      ALTER TABLE monthly_attendance_summaries ENABLE ROW LEVEL SECURITY; CREATE POLICY legacy_summaries ON monthly_attendance_summaries FOR ALL TO authenticated USING(true);
      ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
      CREATE POLICY staff_attendance ON attendance_records FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('teacher','admin','principal')));
    `);
    const session=async(actor=1,role='authenticated')=>{await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",[actor?id(actor):'',role]);await db.exec(`SET ROLE ${role}`);};
    const assign=(cls=20,monitor:number|null=3,previous:number|null=null,oldClass:number|null=null,year=10)=>db.query('SELECT assign_class_monitor($1,$2,$3,$4,$5) result',[id(cls),id(year),monitor?id(monitor):null,previous?id(previous):null,oldClass?id(oldClass):null]);
    const day=(await db.query<{date_string:string}>("SELECT to_char(work_date,'YYYY-MM-DD') AS date_string FROM generate_series(CURRENT_DATE-7,CURRENT_DATE-1,interval '1 day') AS dates(work_date) WHERE extract(isodow from work_date) BETWEEN 1 AND 5 ORDER BY work_date DESC LIMIT 1")).rows[0].date_string;
    const workspace=async(cls=20,year=10)=> (await db.query<{result:{students:{id:string}[];records:{student_id:string;status:string;updated_at:string}[];missingDays:string[]}}> ('SELECT attendance_workspace($1,$2,$3) result',[id(cls),id(year),day])).rows[0].result;
    const row=(n:number,status:string,version:string|null=null)=>({student_id:id(n),status,previous_updated_at:version});
    const save=(records:unknown[],cls=20,year=10,date=day)=>db.query<{result:{count:number;changed:number}}>('SELECT save_class_attendance($1,$2,$3,$4::jsonb) result',[id(cls),id(year),date,JSON.stringify(records)]);
    await session();
    await t.test('account profile and assignment are atomic, preserve roles, audit success and reject duplicates',async()=>{
      const input={username:'user7',fullName:'New Monitor',role:'monitor',monitorClassId:id(20),previousMonitorId:null};
      await db.query('SELECT provision_school_profile($1,$2::jsonb)',[id(7),JSON.stringify(input)]);
      assert.equal((await db.query<{monitor_id:string}>('SELECT monitor_id FROM classes WHERE id=$1',[id(20)])).rows[0].monitor_id,id(7));
      await assert.rejects(db.query('SELECT provision_school_profile($1,$2::jsonb)',[id(7),JSON.stringify(input)]),/Profile already exists/);
      await assign(20,3,7);
    });
    await t.test('assignment rejects forged context, inactive/wrong-role accounts, silent replacement and conflicting double assignments',async()=>{
      await assert.rejects(db.query('UPDATE classes SET monitor_id=$1 WHERE id=$2',[id(4),id(20)]),/Use assign_class_monitor/);
      await assert.rejects(assign(20,4,null),/assignment changed/);
      await assert.rejects(assign(21,3),/already assigned/);
      await assert.rejects(assign(21,6),/Eligible active/);
      await assert.rejects(assign(21,2),/Eligible active/);
      await assert.rejects(assign(21,9),/Eligible active/);
      await assert.rejects(assign(22,4,null,null,12),/context denied/);
      await assert.rejects(assign(23,4,null,null,11),/year locked/);
      await session(3);await assert.rejects(assign(21,4),/Administrator required/);await session();
    });
    await t.test('roster is UUID-based, deduplicated, active and scoped to the assigned class/year',async()=>{
      await session(3);const data=await workspace();assert.equal(data.students.length,4);assert.equal(new Set(data.students.map(s=>s.id)).size,4);assert.ok(data.missingDays.includes(day));
      await assert.rejects(workspace(21),/context denied/);await assert.rejects(workspace(20,11),/context denied/);
      const calendar=(await db.query<{dates:string[]}>('SELECT attendance_school_dates($1,$2,$3::date-7,$3::date) dates',[id(20),id(10),day])).rows[0].dates;
      assert.ok(calendar.every(date=>![0,6].includes(new Date(date+'T00:00:00Z').getUTCDay())));
      await assert.rejects(db.query('SELECT attendance_school_dates($1,$2,$3,$3)',[id(21),id(10),day]),/context denied/);
    });
    await t.test('all four statuses, partial missing-day detection, completion, reload and idempotent retries',async()=>{
      await save([row(101,'P')]);assert.ok((await workspace()).missingDays.includes(day));
      const rest=[row(102,'absent'),row(103,'L'),row(104,'E')];await save(rest);
      const data=await workspace();assert.equal(data.records.length,4);assert.deepEqual(data.records.map(r=>r.status).sort(),['absent','late','permission','present']);assert.ok(!data.missingDays.includes(day));
      assert.equal((await save(rest)).rows[0].result.changed,0);
    });
    await t.test('teacher correction is seen by Monitor and Admin; stale updates conflict atomically',async()=>{
      const before=await workspace();const first=before.records.find(r=>r.student_id===id(101))!;
      await session(2);await save([row(101,'absent',first.updated_at)]);
      await session(1);assert.equal((await workspace()).records.find(r=>r.student_id===id(101))!.status,'absent');
      await session(3);await assert.rejects(save([row(102,'present',before.records.find(r=>r.student_id===id(102))!.updated_at),row(101,'late',first.updated_at)]),/Attendance changed/);
      assert.equal((await workspace()).records.find(r=>r.student_id===id(102))!.status,'absent','The entire failed batch rolled back');
      const fresh=(await workspace()).records.find(r=>r.student_id===id(101))!;await save([row(101,'permission',fresh.updated_at)]);
      assert.equal((await workspace()).records.find(r=>r.student_id===id(101))!.status,'permission');
      const version=(await workspace()).records.find(r=>r.student_id===id(104))!.updated_at;
      const concurrent=await Promise.allSettled([save([row(104,'late',version)]),save([row(104,'absent',version)])]);
      assert.equal(concurrent.filter(result=>result.status==='fulfilled').length,1,'One competing update wins; the other must reconcile');
      assert.equal(concurrent.filter(result=>result.status==='rejected').length,1);
    });
    await t.test('invalid/duplicate/foreign students, wrong years, future and impossible dates fail closed',async()=>{
      await assert.rejects(save([row(101,'bad')]),/Invalid attendance/);
      await assert.rejects(save([row(101,'present'),row(101,'absent')]),/unique attendance/);
      await assert.rejects(save([row(105,'present')]),/not actively enrolled/);
      await assert.rejects(save([row(106,'present')]),/not actively enrolled/);
      await assert.rejects(save([row(101,'present')],21),/context denied/);
      await assert.rejects(save([row(101,'present')],22,12),/context denied/);
      await assert.rejects(save([row(101,'present')],20,11),/context denied/);
      await assert.rejects(save([row(101,'present')],20,10,'2099-01-01'),/Date outside/);
      await assert.rejects(save([row(101,'present')],20,10,'2026-02-30'),/out of range/);
    });
    await t.test('Monitor direct-table writes, private roster reads, profile escalation and teacher_id fallback are blocked',async()=>{
      assert.equal((await db.query('SELECT * FROM students')).rows.length,0);
      assert.equal((await db.query('UPDATE classes SET monitor_id=$1 WHERE id=$2 RETURNING id',[id(4),id(20)])).rows.length,0);
      await assert.rejects(db.query('INSERT INTO attendance_records(student_id,class_id,academic_year_id,date,status) VALUES($1,$2,$3,$4,$5)',[id(101),id(20),id(10),day,'absent']),/row-level security/);
      await assert.rejects(db.query('UPDATE profiles SET role=$1 WHERE id=$2',['admin',id(3)]),/cannot alter/);
      for(const table of privateTables){assert.equal((await db.query(`SELECT * FROM ${table}`)).rows.length,0);await assert.rejects(db.exec(`INSERT INTO ${table} DEFAULT VALUES`),/row-level security/);}
      await assert.rejects(db.exec('SELECT * FROM diagnostic_orphaned_profiles'),/permission denied/);
      await db.exec('RESET ROLE');await db.query('UPDATE classes SET teacher_id=$1 WHERE id=$2',[id(3),id(21)]);await session(3);await assert.rejects(workspace(21),/context denied/);
    });
    await t.test('explicit reassignment and unassignment immediately revoke old class access, preserve records and close sessions',async()=>{
      await session();await assign(21,3,null,20);await session(3);await assert.rejects(workspace(20),/context denied/);assert.equal((await workspace(21)).students.length,0);
      await session();await assign(21,null,3);await session(3);await assert.rejects(workspace(21),/context denied/);
      await session(0);await assert.rejects(workspace(),/Active authenticated/);
      await session(6);await assert.rejects(workspace(),/Active authenticated/);
      await session(1);assert.equal((await workspace()).records.length,4);
    });
    await t.test('audit failure rolls back attendance and profile/assignment transactions',async()=>{
      await db.exec('RESET ROLE');await db.exec("CREATE FUNCTION fail_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'audit unavailable'; END$$; CREATE TRIGGER fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_audit();");
      await session(2);const data=await workspace();const r=data.records.find(r=>r.student_id===id(102))!;
      await assert.rejects(save([row(102,'late',r.updated_at)]),/audit unavailable/);assert.equal((await workspace()).records.find(r=>r.student_id===id(102))!.status,'absent');
      await session(1);await assert.rejects(assign(20,4,null),/audit unavailable/);assert.equal((await db.query<{monitor_id:string|null}>('SELECT monitor_id FROM classes WHERE id=$1',[id(20)])).rows[0].monitor_id,null);
      await db.exec('RESET ROLE');await db.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[id(30),'user30@kruai.app']);await session(1);
      await assert.rejects(db.query('SELECT provision_school_profile($1,$2::jsonb)',[id(30),JSON.stringify({username:'user30',fullName:'Rollback monitor',role:'monitor',monitorClassId:id(20),previousMonitorId:null})]),/audit unavailable/);
      assert.equal((await db.query('SELECT id FROM profiles WHERE id=$1',[id(30)])).rows.length,0);
    });
    await t.test('anonymous and service-role RPC execution is denied',async()=>{
      await session(3);
      await assert.rejects(db.query('SELECT attendance_class_access($1,$2,false)',[id(20),id(10)]),/permission denied/);
      await assert.rejects(db.query('SELECT attendance_school_day($1,$2)',[day,id(10)]),/permission denied/);
      await assert.rejects(db.query('SELECT monitor_assignment_guard()'),/permission denied/);
      await assert.rejects(db.query('SELECT monitor_profile_guard()'),/permission denied/);
      for(const role of ['anon','service_role']){await session(1,role);await assert.rejects(workspace(),/permission denied/);await assert.rejects(save([row(101,'present')]),/permission denied/);}
    });
  }finally{await db.close();}
});
