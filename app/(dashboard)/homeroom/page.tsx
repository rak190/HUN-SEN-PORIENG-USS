import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import { ActivityLog } from '@/types';

interface PageProps {
  searchParams: Promise<{ classId?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { classId = 'all' } = await searchParams;

  const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL;

  // 1. Get user profile
  let profile = null;
  if (!isDemo) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single();
      profile = profileData;
    }
  }

  if (profile?.role === 'monitor') {
    redirect('/monitor/attendance');
  }

  // Check if we're in demo mode to bypass the rest of the queries
  if (isDemo) {
    if (profile?.role === 'monitor') {
      redirect('/monitor/attendance');
    }
    return <DashboardClient stats={{
      students: '45',
      remediation: '4',
      attendance: '95%',
      reports: '1',
      totalNum: '45',
      girls: '23',
      boys: '22',
      classNameKh: classId === 'all' ? 'គ្រប់ថ្នាក់ទាំងអស់' : `ថ្នាក់ ${classId}`,
      weeklyData: [
        { day: 'ច', present: 98, absent: 2 },
        { day: 'អ', present: 95, absent: 5 },
        { day: 'ព', present: 100, absent: 0 },
        { day: 'ព្រ', present: 90, absent: 10 },
        { day: 'សុ', present: 93, absent: 7 },
      ],
      trendData: [
        { monthLabel: 'មករា', attendancePct: 92, gradePct: 65 },
        { monthLabel: 'កុម្ភៈ', attendancePct: 94, gradePct: 68 },
        { monthLabel: 'មីនា', attendancePct: 91, gradePct: 70 },
        { monthLabel: 'មេសា', attendancePct: 88, gradePct: 72 },
        { monthLabel: 'ឧសភា', attendancePct: 95, gradePct: 75 },
        { monthLabel: 'មិថុនា', attendancePct: 96, gradePct: 78 },
      ]
    }} activities={[
      { id: '1', title: 'របាយការណ៍ថ្មី', description: 'បានបញ្ជូនរបាយការណ៍ប្រចាំខែ', activity_type: 'report', created_at: new Date().toISOString() },
      { id: '2', title: 'វត្តមាន', description: 'បានស្រង់វត្តមានសិស្សចំនួន ៤៥ នាក់', activity_type: 'attendance', created_at: new Date().toISOString() }
    ]} profile={profile} atRiskStudents={[
      { id: '101', name: 'សៅ សុភាព', reasons: ['អវត្តមាន ៤ ដងក្នុងខែនេះ', 'ធ្លាក់ពិន្ទុគណិតវិទ្យា (៤៥)'], severity: 'high' },
      { id: '102', name: 'ដួង វិចិត្រ', reasons: ['ធ្លាក់ពិន្ទុរូបវិទ្យា និងគីមីវិទ្យា'], severity: 'medium' },
      { id: '103', name: 'ម៉ៅ រស្មី', reasons: ['បញ្ហាវិន័យ៖ ឈ្លោះប្រកែកគ្នា'], severity: 'high' }
    ]} />;
  }

  // 2. Fetch basic stats
  let studentsQuery = supabase.from('students').select('id, gender', { count: 'exact' });
  if (classId !== 'all') {
    studentsQuery = studentsQuery.eq('class_id', classId);
  }
  const { data: studentsData, count: studentsCount } = await studentsQuery;

  let remediationQuery = supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_slow_learner', true);
  if (classId !== 'all') {
    remediationQuery = remediationQuery.eq('class_id', classId);
  }
  const { count: remediationCount } = await remediationQuery;

  // 3. Activity Logs
  let activityQuery = supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (classId !== 'all') {
    activityQuery = activityQuery.eq('class_id', classId);
  }
  const { data: activityData } = await activityQuery;

  // 4. Fetch Weekly Attendance (Current Week: Mon-Fri)
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon
  const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
  const monday = new Date(today.setDate(diffToMonday));
  
  const weekDates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d.toISOString().split('T')[0]); // YYYY-MM-DD
  }

  let weeklyQuery = supabase
    .from('attendance_records')
    .select('date, status')
    .in('date', weekDates);
  if (classId !== 'all') {
    weeklyQuery = weeklyQuery.eq('class_id', classId);
  }
  const { data: weeklyDataRaw } = await weeklyQuery;

  const weeklyData = weekDates.map((date, index) => {
    const dayLabels = ['ច', 'អ', 'ព', 'ព្រ', 'សុ'];
    const dayRecords = weeklyDataRaw?.filter(r => r.date === date) || [];
    let present = 0;
    let absent = 0;
    
    dayRecords.forEach(r => {
      if (r.status === 'present' || r.status === 'P') present++;
      if (r.status === 'absent' || r.status === 'A') absent++;
    });

    const total = present + absent;
    const presentPct = total > 0 ? Math.round((present / total) * 100) : 0;
    const absentPct = total > 0 ? Math.round((absent / total) * 100) : 0;

    return {
      day: dayLabels[index],
      present: presentPct,
      absent: absentPct
    };
  });

  // 5. Fetch 8-Month Trend Data
  const trendMonths = [];
  const monthLabels = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
  
  const currentDate = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    trendMonths.push({
      monthStr: d.toISOString().slice(0, 7), // YYYY-MM
      label: monthLabels[d.getMonth()]
    });
  }
  const trendMonthStrs = trendMonths.map(m => m.monthStr);

  let monthlyAttQuery = supabase
    .from('monthly_attendance_summaries')
    .select('month, absent_count, permission_count')
    .in('month', trendMonthStrs);
  if (classId !== 'all') {
    monthlyAttQuery = monthlyAttQuery.eq('class_id', classId);
  }
  const { data: monthlyAttRaw } = await monthlyAttQuery;

  let gradesQuery = supabase
    .from('grade_records')
    .select('period_id, total_score')
    .in('period_id', trendMonthStrs);
  if (classId !== 'all') {
    gradesQuery = gradesQuery.eq('class_id', classId);
  }
  const { data: gradesRaw } = await gradesQuery;

  const assumedDaysPerMonth = 20;
  const totalPossibleAtt = (studentsCount || 0) * assumedDaysPerMonth;
  let overallAttSum = 0;
  let overallAttCount = 0;

  const trendData = trendMonths.map(tm => {
    const monthAtt = monthlyAttRaw?.filter(r => r.month === tm.monthStr) || [];
    let totalAbsences = 0;
    monthAtt.forEach(r => {
      totalAbsences += (r.absent_count || 0) + (r.permission_count || 0);
    });
    
    let attPct = 0;
    if (studentsCount && studentsCount > 0) {
      // We have students, so 0 absences means 100% attendance
      attPct = Math.max(0, Math.round(((totalPossibleAtt - totalAbsences) / totalPossibleAtt) * 100));
    }

    const monthGrades = gradesRaw?.filter(r => r.period_id === tm.monthStr) || [];
    let avgGrade = 0;
    if (monthGrades.length > 0) {
      const sum = monthGrades.reduce((acc, curr) => acc + (curr.total_score || 0), 0);
      avgGrade = Math.round(sum / monthGrades.length); // Assume max is 100
    }

    if (attPct > 0) {
      overallAttSum += attPct;
      overallAttCount++;
    }

    return {
      monthLabel: tm.label,
      attendancePct: attPct,
      gradePct: avgGrade
    };
  });

  // 6. Fetch Total Monthly Report Cards
  let reportsQuery = supabase.from('monthly_report_cards').select('*', { count: 'exact', head: true });
  if (classId !== 'all') {
    reportsQuery = reportsQuery.eq('class_id', classId);
  }
  const { count: reportsCount } = await reportsQuery;

  // Calculate basic demographics
  let girlsCount = 0;
  let boysCount = 0;
  if (studentsData) {
    girlsCount = studentsData.filter(s => s.gender === 'F' || s.gender === 'ស្រី').length;
    boysCount = studentsData.filter(s => s.gender === 'M' || s.gender === 'ប្រុស').length;
  }

  const overallAtt = overallAttCount > 0 ? Math.round(overallAttSum / overallAttCount) : 0;

  const stats = {
    students: (studentsCount || 0).toString(),
    remediation: (remediationCount || 0).toString(),
    attendance: overallAtt > 0 ? `${overallAtt}%` : '0%',
    reports: (reportsCount || 0).toString(),
    totalNum: (studentsCount || 0).toString(),
    girls: girlsCount.toString(),
    boys: boysCount.toString(),
    classNameKh: classId === 'all' ? 'គ្រប់ថ្នាក់ទាំងអស់' : `ថ្នាក់ ${classId}`,
    weeklyData,
    trendData
  };

  const activities: ActivityLog[] = activityData || [];

  // TODO: Fetch real atRiskStudents based on EWS logic
  const mockAtRiskStudents = [
    { id: '101', name: 'សៅ សុភាព', reasons: ['អវត្តមាន ៤ ដងក្នុងខែនេះ', 'ធ្លាក់ពិន្ទុគណិតវិទ្យា (៤៥)'], severity: 'high' as const },
    { id: '102', name: 'ដួង វិចិត្រ', reasons: ['ធ្លាក់ពិន្ទុរូបវិទ្យា និងគីមីវិទ្យា'], severity: 'medium' as const },
    { id: '103', name: 'ម៉ៅ រស្មី', reasons: ['បញ្ហាវិន័យ៖ ឈ្លោះប្រកែកគ្នា'], severity: 'high' as const }
  ];

  return <DashboardClient stats={stats} activities={activities} profile={profile} atRiskStudents={mockAtRiskStudents} />;
}
