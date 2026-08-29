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

  const { count: activeClasses } = await supabase
    .from('classes')
    .select('*', { count: 'exact', head: true });

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
        activeClasses: activeClasses || 0,
        teachers: teachers || 0,
        absentRate: dashboardData?.overallAttendance 
          ? (100 - parseFloat(dashboardData.overallAttendance)).toFixed(1) 
          : '0.0', // actions.ts returns overallAttendance, we want absentRate
      }}
      trendData={dashboardData?.trendData || []}
      atRiskStudents={dashboardData?.atRiskList || []}
      activities={(activities as any) || []}
    />
  );
}
