import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { requirePrincipal } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import PrincipalDashboardClient from './DashboardClient';
import { fetchPrincipalDashboardData } from './actions';

export const dynamic = 'force-dynamic';

export default async function PrincipalDashboardPage() {
  const supabase = await createClient();

  // 1. Verify User and Role
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

  // 2. Fetch Active Academic Year specifically for Principal's school
  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id, name')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const activeYearId = activeYear?.id;

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

  // 3. Fetch Teachers scoped strictly to this school
  const { count: teachers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('role', 'teacher')
    .eq('is_active', true);

  // 4. Fetch Active Classes scoped strictly to this school and active academic year
  const { data: activeClassesList } = await supabase
    .from('classes')
    .select('id, name')
    .eq('school_id', schoolId)
    .eq('academic_year_id', activeYearId)
    .eq('is_archived', false)
    .order('name');

  const activeClasses = activeClassesList || [];
  const activeClassesCount = activeClasses.length;
  const activeClassIds = activeClasses.map(c => c.id);

  // 5. Real-time Attendance scoped strictly to active classes of this school
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' }).format(new Date());
  let recordedClassIds = new Set<string>();
  if (activeClassIds.length > 0) {
    const { data: todayAttendance } = await supabase
      .from('attendance_records')
      .select('class_id')
      .eq('date', todayStr)
      .in('class_id', activeClassIds);

    recordedClassIds = new Set((todayAttendance || []).map(a => a.class_id));
  }

  const unsubmittedAttendanceClasses = activeClasses
    .filter(c => !recordedClassIds.has(c.id))
    .map(c => c.name);

  // 6. Pending Support Cases scoped strictly to active classes of this school
  let pendingFollowUpsCount = 0;
  if (activeClassIds.length > 0) {
    const { count } = await supabase
      .from('support_cases')
      .select('*', { count: 'exact', head: true })
      .in('class_id', activeClassIds)
      .neq('status', 'resolved');

    pendingFollowUpsCount = count || 0;
  }

  // 7. Recent Audit Activities scoped strictly to this school
  const { data: activities } = await supabase
    .from('audit_logs')
    .select('id, action, created_at, profiles(full_name)')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(8);

  // 8. Fetch aggregated academic & student statistics from actions.ts (scoped to school & active year)
  const dashboardData = await fetchPrincipalDashboardData();

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
