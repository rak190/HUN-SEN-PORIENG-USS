import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import { ActivityLog } from '@/types';

interface PageProps {
  searchParams: Promise<{ classId?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: PageProps) {
  const reqStart = performance.now();
  const supabase = await createClient();
  const { classId = 'all' } = await searchParams;

  // 1. Authoritative Role Verification (deduplicated via React.cache)
  const { user, profile, role } = await getServerAuth();
  if (!user) {
    redirect('/login');
  }

  if (role === 'monitor') {
    redirect('/monitor/attendance');
  }

  // ==========================================
  // STAGE 1: Active Academic Year Resolution
  // ==========================================
  const s1Start = performance.now();
  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id')
    .eq('is_active', true)
    .maybeSingle();
  const s1Duration = performance.now() - s1Start;

  // ==========================================
  // STAGE 2: Teacher / Active Class Resolution
  // ==========================================
  const s2Start = performance.now();
  let teacherClassName = null;
  let teacherClassId: string | null = null;

  if (profile?.role === 'teacher') {
    let teacherClassQuery = supabase
      .from('classes')
      .select('id, name')
      .eq('teacher_id', profile.id)
      .eq('is_archived', false);

    if (activeYear?.id) {
      teacherClassQuery = teacherClassQuery.eq('academic_year_id', activeYear.id);
    }

    const { data: classroom } = await teacherClassQuery.maybeSingle();
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
  } else if (classId && classId !== 'all') {
    effectiveClassId = classId;
  }

  let activeClassIds: string[] = [];
  if (!effectiveClassId && activeYear) {
    const { data: classes } = await supabase
      .from('classes')
      .select('id')
      .eq('academic_year_id', activeYear.id)
      .eq('is_archived', false);
    activeClassIds = classes?.map(c => c.id) || [];
  }
  const s2Duration = performance.now() - s2Start;

  // Helper to scope queries to the active academic year
  const scopeQueryToYear = (query: any, classCol: string = 'class_id') => {
    if (effectiveClassId) {
      return query.eq(classCol, effectiveClassId);
    } else if (activeClassIds.length > 0) {
      return query.in(classCol, activeClassIds);
    } else if (activeYear) {
      return query.eq(classCol, '00000000-0000-0000-0000-000000000000');
    }
    return query;
  };

  // ==========================================
  // STAGE 3: Parallel Execution of All Class-Dependent Queries
  // ==========================================
  const s3Start = performance.now();

  // 1. Students roster
  let studentsQuery = supabase.from('active_class_rosters').select('*', { count: 'exact' });
  studentsQuery = scopeQueryToYear(studentsQuery, 'enrollment_class_id');

  // 2. Slow learners count
  let remediationQuery = supabase.from('active_class_rosters').select('id', { count: 'exact' }).eq('is_slow_learner', true);
  remediationQuery = scopeQueryToYear(remediationQuery, 'enrollment_class_id');

  // 3. Activity logs
  let activityQuery = supabase
    .from('activity_logs')
    .select('id, title, description, activity_type, class_id, created_at')
    .order('created_at', { ascending: false })
    .limit(20);
  activityQuery = scopeQueryToYear(activityQuery);

  // 4. Weekly Attendance (Current Week: Mon-Fri)
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
  weeklyQuery = scopeQueryToYear(weeklyQuery);

  // 5. 8-Month Trend Data
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
  monthlyAttQuery = scopeQueryToYear(monthlyAttQuery);

  let gradesQuery = supabase
    .from('grades')
    .select('period, total_score')
    .in('period', trendPeriodIds);
  gradesQuery = scopeQueryToYear(gradesQuery);

  // 6. Monthly Report Cards Count
  let reportsQuery = supabase.from('monthly_report_cards').select('id', { count: 'exact' });
  if (effectiveClassId) {
    reportsQuery = reportsQuery.eq('class_id', effectiveClassId);
  }

  // 7. At-risk students roster signals
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  let rosterAtRiskQuery = supabase
    .from('active_class_rosters')
    .select('id, full_name, dropout_risk, is_slow_learner, gender, father_phone, mother_phone, guardian_phone, emergency_contact_phone');

  if (effectiveClassId) {
    rosterAtRiskQuery = rosterAtRiskQuery.eq('enrollment_class_id', effectiveClassId);
  } else if (activeClassIds.length > 0) {
    rosterAtRiskQuery = rosterAtRiskQuery.in('enrollment_class_id', activeClassIds);
  }

  // 8. Current-month absence summaries for at-risk calculation
  let absenceQuery = supabase
    .from('monthly_attendance_summaries')
    .select('student_id, absent_count, permission_count')
    .eq('month', currentMonth);
  if (effectiveClassId) {
    absenceQuery = absenceQuery.eq('class_id', effectiveClassId);
  } else if (activeClassIds.length > 0) {
    absenceQuery = absenceQuery.in('class_id', activeClassIds);
  }

  // Execute all 8 stage 3 queries concurrently
  const [
    { data: studentsData, count: studentsCount },
    { data: remData, count: remCount },
    { data: activityData },
    { data: weeklyDataRaw },
    { data: monthlyAttRaw },
    { data: gradesRaw },
    { data: repData, count: repCount },
    { data: rosterData },
    { data: absenceData }
  ] = await Promise.all([
    studentsQuery,
    remediationQuery,
    activityQuery,
    weeklyQuery,
    monthlyAttQuery,
    gradesQuery,
    reportsQuery,
    rosterAtRiskQuery,
    absenceQuery
  ]);

  const s3Duration = performance.now() - s3Start;
  const totalDuration = performance.now() - reqStart;

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Perf:Server] HomeroomDashboard total: ${totalDuration.toFixed(1)}ms (S1: ${s1Duration.toFixed(1)}ms, S2: ${s2Duration.toFixed(1)}ms, S3: ${s3Duration.toFixed(1)}ms)`);
  }

  const remediationCount = remCount ?? remData?.length ?? 0;
  const reportsCount = repCount ?? repData?.length ?? 0;

  // Process Weekly Attendance
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

  // Process 8-Month Trend Data
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

  // Demographics
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
    classId: effectiveClassId || '',
    weeklyData,
    trendData,
    allStudents: studentsData || []
  };

  const activities: ActivityLog[] = (activityData || []).map(a => ({
    id: a.id,
    title: a.title || 'សកម្មភាព',
    description: a.description || 'កំណត់ត្រា',
    activity_type: (a.activity_type || 'award') as any,
    class_id: a.class_id,
    created_at: a.created_at,
  }));

  // Build a student → absence map for O(1) lookup
  const absenceMap: Record<string, { absent: number; permission: number }> = {};
  (absenceData || []).forEach((r: any) => {
    absenceMap[r.student_id] = {
      absent: r.absent_count || 0,
      permission: r.permission_count || 0,
    };
  });

  // EWS threshold: ≥ 3 unexcused absences in current month
  const EWS_ABSENCE_THRESHOLD = 3;

  const atRiskStudents = (rosterData || [])
    .map((s: any) => {
      const abs = absenceMap[s.id] || { absent: 0, permission: 0 };
      const highAbsence = abs.absent >= EWS_ABSENCE_THRESHOLD;

      const reasons: string[] = [];
      if (s.dropout_risk) reasons.push('ប្រឈមបោះបង់ការសិក្សា');
      if (s.is_slow_learner) reasons.push('រៀនយឺត – ត្រូវការការគាំទ្របន្ថែម');
      if (highAbsence) reasons.push(`អវត្តមានឥតច្បាប់ ${abs.absent} ថ្ងៃក្នុងខែនេះ`);

      if (reasons.length === 0) return null;

      const severity: 'high' | 'medium' =
        s.dropout_risk || abs.absent >= 5 ? 'high' : 'medium';

      const phone =
        s.father_phone || s.mother_phone || s.guardian_phone || s.emergency_contact_phone || null;

      return {
        id: s.id,
        name: s.full_name,
        reasons,
        severity,
        phone,
      };
    })
    .filter(Boolean) as import('@/types').AtRiskStudent[];

  return <DashboardClient stats={stats} activities={activities} profile={profile} atRiskStudents={atRiskStudents} />;
}
