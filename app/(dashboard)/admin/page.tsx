import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';
import AdminDashboardClient from './DashboardClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const supabase = await createClient();

  // 1. Verify User and Role
  const { user, profile, role } = await getServerAuth();
  if (!user) redirect('/login');

  if (role !== 'admin' && role !== 'principal') {
    redirect('/homeroom');
  }

  // 2. Fetch Basic Stats
  const { count: totalStudents, data: stdRows } = await supabase
    .from('students')
    .select('id', { count: 'exact' })
    .eq('is_active', true);

  const { count: activeClasses, data: clsRows } = await supabase
    .from('classes')
    .select('id', { count: 'exact' });

  const { count: teachers, data: tchRows } = await supabase
    .from('profiles')
    .select('id', { count: 'exact' })
    .eq('role', 'teacher');

  // 3. Date calculations
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  let startOfMonth: Date;
  let endOfMonth: Date;

  if (month) {
    const [yearStr, monthStr] = month.split('-');
    startOfMonth = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
    endOfMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0);
  } else {
    startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  }

  const startMonthStr = startOfMonth.toISOString().split('T')[0];
  const endMonthStr = endOfMonth.toISOString().split('T')[0];
  const currentMonthStr = startOfMonth.toISOString().slice(0, 7); // YYYY-MM

  // 4. Fetch Attendance Stats for Pie Chart (This Month)
  const { data: monthAttendance } = await supabase
    .from('attendance_records')
    .select('status')
    .gte('date', startMonthStr)
    .lte('date', endMonthStr);

  let present = 0;
  let absent = 0;
  let permission = 0;
  let todayAbsent = 0;
  let todayTotal = 0;

  if (monthAttendance) {
    monthAttendance.forEach(record => {
      if (record.status === 'present' || record.status === 'P') present++;
      if (record.status === 'absent' || record.status === 'A') absent++;
      if (record.status === 'permission' || record.status === 'L') permission++;
    });
  }

  // 5. Calculate Monthly Absent Rate
  const totalMonthly = present + absent + permission;
  const absentRate = totalMonthly === 0 ? '0' : ((absent / totalMonthly) * 100).toFixed(1);

  // 6. Fetch Activity Logs
  const { data: activities } = await supabase
    .from('audit_logs')
    .select('id, action, created_at, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(8);

  // 7. Calculate simple EWS (At-Risk Students)
  const atRiskStudents: any[] = [];
  
  const { data: recentAbsences } = await supabase
    .from('attendance_records')
    .select('student_id, students(full_name)')
    .gte('date', startMonthStr)
    .in('status', ['absent', 'A']);

  if (recentAbsences) {
    const absenceCounts: Record<string, { name: string, count: number }> = {};
    recentAbsences.forEach(r => {
      const sid = r.student_id;
      if (!absenceCounts[sid]) {
        absenceCounts[sid] = { name: (r.students as any)?.full_name || (Array.isArray(r.students) && r.students[0]?.full_name) || 'Unknown', count: 0 };
      }
      absenceCounts[sid].count++;
    });

    for (const [id, info] of Object.entries(absenceCounts)) {
      if (info.count >= 3) {
        atRiskStudents.push({
          id,
          name: info.name,
          severity: info.count >= 5 ? 'high' : 'medium',
          reasons: [`អវត្តមាន ${info.count} ដងក្នុងខែនេះ`]
        });
      }
    }
  }

  atRiskStudents.sort((a, b) => (a.severity === 'high' ? -1 : 1));

  return (
    <AdminDashboardClient
      stats={{
        totalStudents: totalStudents ?? stdRows?.length ?? 0,
        activeClasses: activeClasses ?? clsRows?.length ?? 0,
        teachers: teachers ?? tchRows?.length ?? 0,
        absentRate,
      }}
      pieData={{ present, absent, permission }}
      activities={(activities as any) || []}
      atRiskStudents={atRiskStudents.slice(0, 10)}
      currentMonth={currentMonthStr}
    />
  );
}
