import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { requirePrincipal } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import PrincipalDashboardClient from './DashboardClient';
import { fetchPrincipalDashboardData } from './actions';

export const dynamic = 'force-dynamic';

export default async function PrincipalDashboardPage() {
  const reqStart = performance.now();
  const supabase = await createClient();

  // 1. Authoritative Role Verification (deduplicated via React.cache)
  let auth;
  try {
    auth = await requirePrincipal();
  } catch {
    redirect('/homeroom');
  }

  const { profile } = auth;
  const schoolId = profile?.school_id;

  // Fail closed if school_id is missing
  if (!schoolId) {
    return (
      <PrincipalDashboardClient
        stats={{
          totalStudents: 0,
          activeClasses: 0,
          teachers: 0,
          absentRate: '0.0',
          absentRateLabel: 'អត្រាអវត្តមានខែនេះ',
          yearlyAbsentRate: '0.0',
        }}
        trendData={[]}
        demographics={{ girls: 0, boys: 0 }}
        tableData={[]}
        overallGpa="0.00"
        atRiskStudents={[]}
        activities={[]}
        unsubmittedAttendanceClasses={[]}
        pendingFollowUpsCount={0}
        schoolName="មិនស្គាល់សាលា"
      />
    );
  }

  // ==========================================
  // STAGE 1: Active Academic Year Resolution
  // ==========================================
  const s1Start = performance.now();
  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id, name')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const activeYearId = activeYear?.id;
  const s1Duration = performance.now() - s1Start;

  // Fail closed if no active academic year is configured for this school
  if (!activeYearId) {
    return (
      <PrincipalDashboardClient
        stats={{
          totalStudents: 0,
          activeClasses: 0,
          teachers: 0,
          absentRate: '0.0',
          absentRateLabel: 'អត្រាអវត្តមានខែនេះ',
          yearlyAbsentRate: '0.0',
        }}
        trendData={[]}
        demographics={{ girls: 0, boys: 0 }}
        tableData={[]}
        overallGpa="0.00"
        atRiskStudents={[]}
        activities={[]}
        unsubmittedAttendanceClasses={[]}
        pendingFollowUpsCount={0}
        schoolName={profile?.school_code || 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង'}
      />
    );
  }

  // ==========================================
  // STAGE 2: Parallel Queries Dependent on Active Year
  // ==========================================
  const s2Start = performance.now();

  const teachersPromise = supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('role', 'teacher')
    .eq('is_active', true);

  const activeClassesPromise = supabase
    .from('classes')
    .select('id, name')
    .eq('school_id', schoolId)
    .eq('academic_year_id', activeYearId)
    .eq('is_archived', false)
    .order('name');

  const activitiesPromise = supabase
    .from('audit_logs')
    .select('id, action, created_at, profiles(full_name)')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(8);

  const dashboardDataPromise = fetchPrincipalDashboardData();

  const [
    { count: teachers },
    { data: activeClassesList },
    { data: activities },
    dashboardData
  ] = await Promise.all([
    teachersPromise,
    activeClassesPromise,
    activitiesPromise,
    dashboardDataPromise
  ]);

  const s2Duration = performance.now() - s2Start;

  const activeClasses = activeClassesList || [];
  const activeClassesCount = activeClasses.length;
  const activeClassIds = activeClasses.map(c => c.id);

  // ==========================================
  // STAGE 3: Parallel Class-Dependent Queries
  // ==========================================
  const s3Start = performance.now();
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' }).format(new Date());
  let recordedClassIds = new Set<string>();
  let pendingFollowUpsCount = 0;

  if (activeClassIds.length > 0) {
    const todayAttendancePromise = supabase
      .from('attendance_records')
      .select('class_id')
      .eq('date', todayStr)
      .in('class_id', activeClassIds);

    const supportCasesPromise = supabase
      .from('support_cases')
      .select('*', { count: 'exact', head: true })
      .in('class_id', activeClassIds)
      .neq('status', 'resolved');

    const [{ data: todayAttendance }, { count: supportCount }] = await Promise.all([
      todayAttendancePromise,
      supportCasesPromise
    ]);

    recordedClassIds = new Set((todayAttendance || []).map(a => a.class_id));
    pendingFollowUpsCount = supportCount || 0;
  }

  const s3Duration = performance.now() - s3Start;
  const totalDuration = performance.now() - reqStart;

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Perf:Server] PrincipalDashboard total: ${totalDuration.toFixed(1)}ms (S1: ${s1Duration.toFixed(1)}ms, S2: ${s2Duration.toFixed(1)}ms, S3: ${s3Duration.toFixed(1)}ms)`);
  }

  const unsubmittedAttendanceClasses = activeClasses
    .filter(c => !recordedClassIds.has(c.id))
    .map(c => c.name);

  // Resolve true monthly absence rate vs year-to-date rate
  const hasMonthlyRate = dashboardData?.thisMonthAbsentRate !== null && dashboardData?.thisMonthAbsentRate !== undefined;
  const absentRate = hasMonthlyRate
    ? dashboardData!.thisMonthAbsentRate!
    : (dashboardData?.yearlyAbsentRate || '0.0');
  const absentRateLabel = hasMonthlyRate ? 'អត្រាអវត្តមានខែនេះ' : 'អត្រាអវត្តមានប្រចាំឆ្នាំ (YTD)';
  const yearlyAbsentRate = dashboardData?.yearlyAbsentRate || '0.0';

  return (
    <PrincipalDashboardClient
      stats={{
        totalStudents: dashboardData?.totalStudents || 0,
        activeClasses: activeClassesCount,
        teachers: teachers || 0,
        absentRate,
        absentRateLabel,
        yearlyAbsentRate,
      }}
      trendData={dashboardData?.trendData || []}
      demographics={{
        girls: dashboardData?.girlsCount || 0,
        boys: dashboardData?.boysCount || 0,
      }}
      tableData={dashboardData?.tableData || []}
      overallGpa={dashboardData?.overallGpa || '0.00'}
      atRiskStudents={dashboardData?.atRiskList || []}
      activities={(activities as any) || []}
      unsubmittedAttendanceClasses={unsubmittedAttendanceClasses}
      pendingFollowUpsCount={pendingFollowUpsCount}
      schoolName={profile?.school_code === 'Porieng-2026' ? 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង' : profile?.school_code || 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង'}
    />
  );
}
