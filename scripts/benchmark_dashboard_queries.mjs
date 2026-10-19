import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ohawwdnerddwpbwtiede.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oYXd3ZG5lcmRkd3Bid3RpZWRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzk2ODY5NywiZXhwIjoyMTAzNTQ0Njk3fQ.ImDv5-QFl3FFrksNMF7p0cA8CY4qZfLYTOTd1W9si2A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function benchmark() {
  console.log('====================================================');
  console.log(' Hun Sen Porieng USS — Admin Dashboard Performance Benchmark');
  console.log('====================================================');
  const userSchoolId = 'main-school';

  // 1. Measure Sequential Execution (Prior Baseline)
  console.log('\n[1] Running Baseline Sequential Execution...');
  const seqStart = performance.now();

  const t1 = performance.now();
  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id, name, status')
    .eq('school_id', userSchoolId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const yearDuration = performance.now() - t1;

  const activeYearId = activeYear?.id || null;

  const t2 = performance.now();
  let seqClassQuery = supabase
    .from('classes')
    .select('id, name', { count: 'exact' })
    .eq('school_id', userSchoolId);
  if (activeYearId) {
    seqClassQuery = seqClassQuery.eq('academic_year_id', activeYearId);
  }
  const { data: clsRows } = await seqClassQuery;
  const classesDuration = performance.now() - t2;

  const schoolClassIds = (clsRows || []).map(c => c.id);
  const targetClassIds = schoolClassIds.length ? schoolClassIds : ['00000000-0000-0000-0000-000000000000'];

  const t3 = performance.now();
  const { count: enrolledCount } = await supabase
    .from('student_enrollments')
    .select('student_id', { count: 'exact', head: true })
    .in('class_id', targetClassIds)
    .eq('enrollment_status', 'active');
  const enrollmentsDuration = performance.now() - t3;

  const t4 = performance.now();
  const { count: teachersCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', userSchoolId)
    .eq('role', 'teacher')
    .eq('is_active', true);
  const teachersDuration = performance.now() - t4;

  const t5 = performance.now();
  let seqMonthAttQuery = supabase
    .from('attendance_records')
    .select('status')
    .gte('date', '2026-10-01')
    .lte('date', '2026-10-19')
    .in('class_id', targetClassIds);
  if (activeYearId) {
    seqMonthAttQuery = seqMonthAttQuery.eq('academic_year_id', activeYearId);
  }
  const { data: monthAttendance } = await seqMonthAttQuery;
  const monthAttDuration = performance.now() - t5;

  const t6 = performance.now();
  let seqTodayAbsentQuery = supabase
    .from('attendance_records')
    .select('student_id', { count: 'exact', head: true })
    .eq('date', '2026-10-19')
    .in('status', ['absent', 'unexcused', 'excused', 'A'])
    .in('class_id', targetClassIds);
  if (activeYearId) {
    seqTodayAbsentQuery = seqTodayAbsentQuery.eq('academic_year_id', activeYearId);
  }
  const { count: absentToday } = await seqTodayAbsentQuery;
  const todayAttDuration = performance.now() - t6;

  const t7 = performance.now();
  const { data: activities } = await supabase
    .from('audit_logs')
    .select('id, action, created_at, profiles(full_name, school_id)')
    .order('created_at', { ascending: false })
    .limit(8);
  const activitiesDuration = performance.now() - t7;

  // Complete scan of at-risk absences without truncation (no .limit)
  const t8 = performance.now();
  let seqRecentAbsQuery = supabase
    .from('attendance_records')
    .select('student_id, students(full_name)')
    .gte('date', '2026-10-01')
    .lte('date', '2026-10-19')
    .in('status', ['absent', 'A', 'unexcused'])
    .in('class_id', targetClassIds);
  if (activeYearId) {
    seqRecentAbsQuery = seqRecentAbsQuery.eq('academic_year_id', activeYearId);
  }
  const { data: recentAbsences } = await seqRecentAbsQuery;
  const atRiskDuration = performance.now() - t8;

  const t9 = performance.now();
  const { count: missingIdCount } = await supabase
    .from('active_class_rosters')
    .select('id', { count: 'exact', head: true })
    .in('enrollment_class_id', targetClassIds)
    .or('student_id_number.is.null,student_id_number.eq.""');
  const missingIdDuration = performance.now() - t9;

  const t10 = performance.now();
  const { count: pendingCorrections } = await supabase
    .from('correction_requests')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', userSchoolId)
    .eq('status', 'pending');
  const correctionsDuration = performance.now() - t10;

  const totalSeqDuration = performance.now() - seqStart;

  console.log('Sequential timings:');
  console.log(`- Academic year: ${yearDuration.toFixed(1)}ms`);
  console.log(`- Classes: ${classesDuration.toFixed(1)}ms`);
  console.log(`- Enrollments count: ${enrollmentsDuration.toFixed(1)}ms`);
  console.log(`- Teachers count: ${teachersDuration.toFixed(1)}ms`);
  console.log(`- Monthly attendance: ${monthAttDuration.toFixed(1)}ms`);
  console.log(`- Today attendance: ${todayAttDuration.toFixed(1)}ms`);
  console.log(`- Audit activities: ${activitiesDuration.toFixed(1)}ms`);
  console.log(`- Full at-risk absences (zero truncation): ${atRiskDuration.toFixed(1)}ms`);
  console.log(`- Missing IDs count: ${missingIdDuration.toFixed(1)}ms`);
  console.log(`- Pending corrections count: ${correctionsDuration.toFixed(1)}ms`);
  console.log(`>>> Total Sequential Server Duration: ${totalSeqDuration.toFixed(1)}ms`);

  // 2. Measure Staged Parallel Execution (Implemented Optimization)
  console.log('\n[2] Running Staged Parallel Execution...');
  const parStart = performance.now();

  // Stage 1: Parallel Independent Queries
  const s1Start = performance.now();
  const [stage1Year, stage1Teachers, stage1Activities, stage1Corrections] = await Promise.all([
    supabase.from('academic_years').select('id, name, status').eq('school_id', userSchoolId).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('school_id', userSchoolId).eq('role', 'teacher').eq('is_active', true),
    supabase.from('audit_logs').select('id, action, created_at, profiles(full_name, school_id)').order('created_at', { ascending: false }).limit(8),
    supabase.from('correction_requests').select('id', { count: 'exact', head: true }).eq('school_id', userSchoolId).eq('status', 'pending')
  ]);
  const s1Duration = performance.now() - s1Start;

  const parYearId = stage1Year.data?.id || null;

  // Stage 2: Class Resolution (depends on parYearId)
  const s2Start = performance.now();
  let parClassQuery = supabase.from('classes').select('id, name', { count: 'exact' }).eq('school_id', userSchoolId);
  if (parYearId) {
    parClassQuery = parClassQuery.eq('academic_year_id', parYearId);
  }
  const { data: parClassRows } = await parClassQuery;
  const s2Duration = performance.now() - s2Start;

  const parClassIds = (parClassRows || []).map(c => c.id);
  const parTargetClassIds = parClassIds.length ? parClassIds : ['00000000-0000-0000-0000-000000000000'];

  // Stage 3: Parallel Class-Dependent Queries
  const s3Start = performance.now();
  let parMonthAttQuery = supabase.from('attendance_records').select('status').gte('date', '2026-10-01').lte('date', '2026-10-19').in('class_id', parTargetClassIds);
  if (parYearId) parMonthAttQuery = parMonthAttQuery.eq('academic_year_id', parYearId);

  let parTodayAbsentQuery = supabase.from('attendance_records').select('student_id', { count: 'exact', head: true }).eq('date', '2026-10-19').in('status', ['absent', 'unexcused', 'excused', 'A']).in('class_id', parTargetClassIds);
  if (parYearId) parTodayAbsentQuery = parTodayAbsentQuery.eq('academic_year_id', parYearId);

  let parTodayRecordedQuery = supabase.from('attendance_records').select('student_id', { count: 'exact', head: true }).eq('date', '2026-10-19').in('class_id', parTargetClassIds);
  if (parYearId) parTodayRecordedQuery = parTodayRecordedQuery.eq('academic_year_id', parYearId);

  let parRecentAbsQuery = supabase.from('attendance_records').select('student_id, students(full_name)').gte('date', '2026-10-01').lte('date', '2026-10-19').in('status', ['absent', 'A', 'unexcused']).in('class_id', parTargetClassIds);
  if (parYearId) parRecentAbsQuery = parRecentAbsQuery.eq('academic_year_id', parYearId);

  const [
    stage3Enrollments,
    stage3MonthAtt,
    stage3TodayAbsent,
    stage3TodayRecorded,
    stage3RecentAbs,
    stage3MissingId
  ] = await Promise.all([
    supabase.from('student_enrollments').select('student_id', { count: 'exact', head: true }).in('class_id', parTargetClassIds).eq('enrollment_status', 'active'),
    parMonthAttQuery,
    parTodayAbsentQuery,
    parTodayRecordedQuery,
    parRecentAbsQuery,
    supabase.from('active_class_rosters').select('id', { count: 'exact', head: true }).in('enrollment_class_id', parTargetClassIds).or('student_id_number.is.null,student_id_number.eq.""')
  ]);
  const s3Duration = performance.now() - s3Start;
  const totalParDuration = performance.now() - parStart;

  console.log(`- Stage 1 (Independent queries parallel): ${s1Duration.toFixed(1)}ms`);
  console.log(`- Stage 2 (Class resolution): ${s2Duration.toFixed(1)}ms`);
  console.log(`- Stage 3 (Class-dependent queries parallel): ${s3Duration.toFixed(1)}ms`);
  console.log(`>>> Total Staged Parallel Duration: ${totalParDuration.toFixed(1)}ms`);

  const delta = totalSeqDuration - totalParDuration;
  const improvementPct = ((delta / totalSeqDuration) * 100).toFixed(1);
  const factor = (totalSeqDuration / totalParDuration).toFixed(2);
  console.log(`\n====================================================`);
  console.log(`Result: ${improvementPct}% reduction in query latency (${factor}x speedup)`);
  console.log(`Absolute latency saved: ${delta.toFixed(1)}ms`);
  console.log(`====================================================`);
}

benchmark().catch(console.error);
