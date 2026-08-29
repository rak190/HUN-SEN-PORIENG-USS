import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import PrincipalDashboardClient from './DashboardClient';
import { fetchPrincipalDashboardData } from './actions';

export const dynamic = 'force-dynamic';

export default async function PrincipalDashboardPage() {
  const supabase = await createClient();

  // 1. Verify User and Role
  const { user, profile, role } = await getServerAuth();
  if (!user) redirect('/login');

  if (role !== 'principal' && role !== 'admin') {
    redirect('/homeroom');
  }

  // 2. Fetch missing stats (Teachers & Classes) not covered by actions.ts
  const { count: teachers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'teacher');

  const { data: activeClassesList } = await supabase
    .from('classes')
    .select('id, name')
    .eq('is_archived', false)
    .order('name');

  const activeClassesCount = activeClassesList?.length || 0;

  // 2.5 Real-time Attendance & Support Ops
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' }).format(new Date());
  const { data: todayAttendance } = await supabase
    .from('attendance_records')
    .select('class_id')
    .eq('date', todayStr);

  const recordedClassIds = new Set((todayAttendance || []).map(a => a.class_id));
  const unsubmittedAttendanceClasses = (activeClassesList || [])
    .filter(c => !recordedClassIds.has(c.id))
    .map(c => c.name);

  const { count: pendingFollowUpsCount } = await supabase
    .from('support_cases')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'resolved');

  // 3. Fetch Audit Logs for Recent Activities
  const { data: activities } = await supabase
    .from('audit_logs')
    .select('id, action, created_at, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(8);

  // 4. Fetch the heavy aggregated data from actions.ts (trendData, atRisk, etc)
  const dashboardData = await fetchPrincipalDashboardData();
  
  return (
    <PrincipalDashboardClient
      stats={{
        totalStudents: dashboardData?.totalStudents || 0,
        activeClasses: activeClassesCount,
        teachers: teachers || 0,
        absentRate: dashboardData?.overallAttendance 
          ? (100 - parseFloat(dashboardData.overallAttendance)).toFixed(1) 
          : '0.0',
      }}
      trendData={dashboardData?.trendData || []}
      atRiskStudents={dashboardData?.atRiskList || []}
      activities={(activities as any) || []}
      unsubmittedAttendanceClasses={unsubmittedAttendanceClasses}
      pendingFollowUpsCount={pendingFollowUpsCount || 0}
    />
  );
}
