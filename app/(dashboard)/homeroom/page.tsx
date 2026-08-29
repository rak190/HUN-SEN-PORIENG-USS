import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import { ActivityLog } from '@/types';

interface PageProps {
  searchParams: Promise<{ classId?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { classId = 'all' } = await searchParams;

  // 1. Get user profile
  const { user, profile, role } = await getServerAuth();
  if (!user) {
    redirect('/login');
  }

  if (role === 'monitor') {
    redirect('/monitor/attendance');
  }

  // 1.5 Fetch homeroom teacher's class
  let teacherClassName = null;
  let teacherClassId: string | null = null;
  if (profile?.role === 'teacher') {
    const { data: classroom } = await supabase
      .from('classes')
      .select('id, name')
      .eq('teacher_id', profile.id)
      .maybeSingle();
    if (classroom) {
      teacherClassName = classroom.name;
      teacherClassId = classroom.id;
    }
  }

  // Determine effective classId:
  // For teachers, ALWAYS strictly scope to their assigned class!
  let effectiveClassId: string | null = null;
  if (profile?.role === 'teacher') {
    effectiveClassId = teacherClassId;
  } else if (classId !== 'all') {
    effectiveClassId = classId;
  }

  // 2. Fetch basic stats
  let studentsQuery = supabase.from('students').select('id, gender', { count: 'exact' });
  if (effectiveClassId) {
    studentsQuery = studentsQuery.eq('class_id', effectiveClassId);
  }
  const { data: studentsData, count: studentsCount } = await studentsQuery;

  let remediationQuery = supabase.from('students').select('id', { count: 'exact' }).eq('is_slow_learner', true);
  if (effectiveClassId) {
    remediationQuery = remediationQuery.eq('class_id', effectiveClassId);
  }
  const { data: remData, count: remCount } = await remediationQuery;
  const remediationCount = remCount ?? remData?.length ?? 0;

  // 3. Activity Logs (from activity_logs table)
  let activityQuery = supabase
    .from('activity_logs')
    .select('id, title, description, activity_type, class_id, created_at')
    .order('created_at', { ascending: false })
    .limit(20);
  if (effectiveClassId) {
    activityQuery = activityQuery.eq('class_id', effectiveClassId);
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
  if (effectiveClassId) {
    weeklyQuery = weeklyQuery.eq('class_id', effectiveClassId);
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
  const monthIds = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  
  const currentDate = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    trendMonths.push({
      monthStr: d.toISOString().slice(0, 7), // YYYY-MM
      periodId: monthIds[d.getMonth()], // map to ACADEMIC_PERIODS
      label: monthLabels[d.getMonth()]
    });
  }
  const trendMonthStrs = trendMonths.map(m => m.monthStr);
  const trendPeriodIds = trendMonths.map(m => m.periodId);

  let monthlyAttQuery = supabase
    .from('monthly_attendance_summaries')
    .select('month, absent_count, permission_count')
    .in('month', trendMonthStrs);
  if (effectiveClassId) {
    monthlyAttQuery = monthlyAttQuery.eq('class_id', effectiveClassId);
  }
  const { data: monthlyAttRaw } = await monthlyAttQuery;

  let gradesQuery = supabase
    .from('grades')
    .select('period, total_score')
    .in('period', trendPeriodIds);
  if (effectiveClassId) {
    gradesQuery = gradesQuery.eq('class_id', effectiveClassId);
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
      attPct = Math.max(0, Math.round(((totalPossibleAtt - totalAbsences) / totalPossibleAtt) * 100));
    }

    const monthGrades = gradesRaw?.filter(r => r.period === tm.periodId) || [];
    let avgGrade = 0;
    if (monthGrades.length > 0) {
      const sum = monthGrades.reduce((acc, curr) => acc + (curr.total_score || 0), 0);
      avgGrade = Math.round(sum / monthGrades.length);
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
  let reportsQuery = supabase.from('monthly_report_cards').select('id', { count: 'exact' });
  if (effectiveClassId) {
    reportsQuery = reportsQuery.eq('class_id', effectiveClassId);
  }
  const { data: repData, count: repCount } = await reportsQuery;
  const reportsCount = repCount ?? repData?.length ?? 0;

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
    attendance: overallAtt > 0 ? `${overallAtt}%` : '100%',
    reports: (reportsCount || 0).toString(),
    totalNum: (studentsCount || 0).toString(),
    girls: girlsCount.toString(),
    boys: boysCount.toString(),
    classNameKh: teacherClassName || (effectiveClassId ? `ថ្នាក់ ${effectiveClassId}` : 'គ្រប់ថ្នាក់ទាំងអស់'),
    weeklyData,
    trendData
  };

  const activities: ActivityLog[] = (activityData || []).map(a => ({
    id: a.id,
    title: a.title || 'សកម្មភាព',
    description: a.description || 'កំណត់ត្រា',
    activity_type: (a.activity_type || 'award') as any,
    class_id: a.class_id,
    created_at: a.created_at,
  }));

  // 7. Fetch real At-Risk students based on new risk_level schema
  let atRiskQuery = supabase
    .from('students')
    .select('id, full_name, risk_level, behavior_history')
    .in('risk_level', ['high', 'medium']);
    
  if (effectiveClassId) {
    atRiskQuery = atRiskQuery.eq('class_id', effectiveClassId);
  }
  
  const { data: atRiskData } = await atRiskQuery;
  const atRiskStudents = (atRiskData || []).map(s => {
    let reasons: string[] = [];
    if (Array.isArray(s.behavior_history)) {
      reasons = s.behavior_history;
    }
    if (reasons.length === 0) {
       reasons = [s.risk_level === 'high' ? 'អវត្តមានច្រើន / ពិន្ទុធ្លាក់ចុះខ្លាំង' : 'ត្រូវការការតាមដានបន្ថែម'];
    }
    return {
      id: s.id,
      name: s.full_name,
      reasons: reasons,
      severity: s.risk_level as 'high' | 'medium'
    };
  });

  return <DashboardClient stats={stats} activities={activities} profile={profile} atRiskStudents={atRiskStudents} />;
}
