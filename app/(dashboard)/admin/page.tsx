import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';
import AdminDashboardClient from './DashboardClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const reqStart = performance.now();
  const { month } = await searchParams;
  const supabase = await createClient();

  // 1. Authoritative Server-Side User and Role Verification (deduplicated via React.cache)
  const { user, profile, role } = await getServerAuth();
  if (!user || !profile) redirect('/login');

  if (role === 'principal') {
    redirect('/principal');
  }

  if (role !== 'admin') {
    redirect('/homeroom');
  }

  const userSchoolId = profile.school_id || null;
  const dbErrors: string[] = [];

  // Date Calculations (Cambodia Asia/Phnom_Penh UTC+7 Semantics)
  const now = new Date();
  const cambodiaFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayStrPH = cambodiaFormatter.format(now); // "YYYY-MM-DD"
  const defaultMonthStr = todayStrPH.slice(0, 7); // "YYYY-MM"

  let currentMonthStr = defaultMonthStr;
  if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    currentMonthStr = month;
  }

  const [yearStr, monthStr] = currentMonthStr.split('-');
  const selYear = parseInt(yearStr, 10);
  const selMonth = parseInt(monthStr, 10);
  const daysInMonth = new Date(selYear, selMonth, 0).getDate();

  const startMonthStr = `${currentMonthStr}-01`;
  const endMonthStr = `${currentMonthStr}-${String(daysInMonth).padStart(2, '0')}`;
  const effectiveEndMonthStr = currentMonthStr === defaultMonthStr && todayStrPH < endMonthStr ? todayStrPH : endMonthStr;

  // ==========================================
  // STAGE 1: Parallel Independent Queries
  // ==========================================
  const s1Start = performance.now();

  let yearQuery = supabase
    .from('academic_years')
    .select('id, name, status')
    .eq('is_active', true);
  if (userSchoolId) {
    yearQuery = yearQuery.eq('school_id', userSchoolId);
  }
  const yearPromise = yearQuery
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let teachersQuery = supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'teacher')
    .eq('is_active', true);
  if (userSchoolId) {
    teachersQuery = teachersQuery.eq('school_id', userSchoolId);
  }
  const teachersPromise = teachersQuery;

  const activityPromise = supabase
    .from('audit_logs')
    .select('id, action, created_at, profiles(full_name, school_id)')
    .order('created_at', { ascending: false })
    .limit(8);

  let correctionsQuery = supabase
    .from('correction_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (userSchoolId) {
    correctionsQuery = correctionsQuery.eq('school_id', userSchoolId);
  }
  const correctionsPromise = correctionsQuery;

  const [
    { data: activeYearData, error: yearError },
    { count: teachersCount, error: tchError },
    { data: activitiesData },
    { count: correctionsCount }
  ] = await Promise.all([
    yearPromise,
    teachersPromise,
    activityPromise,
    correctionsPromise
  ]);

  const s1Duration = performance.now() - s1Start;

  if (yearError) {
    dbErrors.push('Failed to load active academic year');
  }
  if (tchError) {
    dbErrors.push('Failed to load teachers');
  }

  const activeYearId = activeYearData?.id || null;
  const teachers = teachersCount ?? 0;
  const pendingCorrections = correctionsCount ?? 0;

  const activities = (activitiesData || []).filter(log => {
    if (!userSchoolId || role === 'admin') return true;
    const logSchoolId = (log.profiles as any)?.school_id;
    return !logSchoolId || logSchoolId === userSchoolId;
  });

  // ==========================================
  // STAGE 2: Class Resolution
  // (Requires activeYearId resolved in Stage 1)
  // ==========================================
  const s2Start = performance.now();

  let classesQuery = supabase
    .from('classes')
    .select('id, name', { count: 'exact' });

  if (userSchoolId) {
    classesQuery = classesQuery.eq('school_id', userSchoolId);
  }
  if (activeYearId) {
    classesQuery = classesQuery.eq('academic_year_id', activeYearId);
  }

  const { count: activeClassesCount, data: clsRows, error: clsError } = await classesQuery;
  const s2Duration = performance.now() - s2Start;

  if (clsError) {
    dbErrors.push('Failed to load classes');
  }

  const activeClasses = activeClassesCount ?? clsRows?.length ?? 0;
  const schoolClassIds = clsRows?.map(c => c.id) || [];

  // ==========================================
  // STAGE 3: Parallel Class-Dependent Queries
  // (Requires schoolClassIds resolved in Stage 2)
  // ==========================================
  const s3Start = performance.now();

  let totalStudents = 0;
  let present = 0;
  let absent = 0;
  let permission = 0;
  let todayAbsent = 0;
  let todayRecorded = 0;
  let missingIdCount = 0;
  const atRiskStudents: any[] = [];

  if (schoolClassIds.length > 0) {
    // 1. Enrolled students
    const enrollmentsPromise = supabase
      .from('student_enrollments')
      .select('student_id', { count: 'exact', head: true })
      .in('class_id', schoolClassIds)
      .eq('enrollment_status', 'active');

    // 2. Monthly attendance records
    let monthAttQuery = supabase
      .from('attendance_records')
      .select('status')
      .gte('date', startMonthStr)
      .lte('date', effectiveEndMonthStr)
      .in('class_id', schoolClassIds);
    if (activeYearId) {
      monthAttQuery = monthAttQuery.eq('academic_year_id', activeYearId);
    }
    const monthAttPromise = monthAttQuery;

    // 3. Today attendance live counts
    let todayAbsentQuery = supabase
      .from('attendance_records')
      .select('student_id', { count: 'exact', head: true })
      .eq('date', todayStrPH)
      .in('status', ['absent', 'unexcused', 'excused', 'A'])
      .in('class_id', schoolClassIds);
    if (activeYearId) {
      todayAbsentQuery = todayAbsentQuery.eq('academic_year_id', activeYearId);
    }

    let todayRecordedQuery = supabase
      .from('attendance_records')
      .select('student_id', { count: 'exact', head: true })
      .eq('date', todayStrPH)
      .in('class_id', schoolClassIds);
    if (activeYearId) {
      todayRecordedQuery = todayRecordedQuery.eq('academic_year_id', activeYearId);
    }

    // 4. Full At-Risk Absences (Zero Truncation: Scans ALL unexcused absences in active classes)
    let recentAbsQuery = supabase
      .from('attendance_records')
      .select('student_id, students(full_name)')
      .gte('date', startMonthStr)
      .lte('date', effectiveEndMonthStr)
      .in('status', ['absent', 'A', 'unexcused'])
      .in('class_id', schoolClassIds);
    if (activeYearId) {
      recentAbsQuery = recentAbsQuery.eq('academic_year_id', activeYearId);
    }
    const recentAbsPromise = recentAbsQuery;

    // 5. Data Quality: missing student IDs in active classes
    const missingIdPromise = supabase
      .from('active_class_rosters')
      .select('id', { count: 'exact', head: true })
      .in('enrollment_class_id', schoolClassIds)
      .or('student_id_number.is.null,student_id_number.eq.""');

    const [
      { count: enrolledCount, error: stdError },
      { data: monthAttendance, error: attError },
      { count: absentTodayCount },
      { count: recordedTodayCount },
      { data: recentAbsences },
      { count: missingCount }
    ] = await Promise.all([
      enrollmentsPromise,
      monthAttPromise,
      todayAbsentQuery,
      todayRecordedQuery,
      recentAbsPromise,
      missingIdPromise
    ]);

    if (stdError) {
      dbErrors.push('Failed to load student enrollments');
    } else {
      totalStudents = enrolledCount ?? 0;
    }

    if (attError) {
      dbErrors.push('Failed to load monthly attendance');
    } else if (monthAttendance) {
      monthAttendance.forEach(record => {
        const s = record.status;
        if (s === 'present' || s === 'P') present++;
        else if (s === 'absent' || s === 'A' || s === 'unexcused') absent++;
        else if (s === 'permission' || s === 'L' || s === 'excused') permission++;
      });
    }

    todayAbsent = absentTodayCount || 0;
    todayRecorded = recordedTodayCount || 0;
    missingIdCount = missingCount ?? 0;

    // Compute complete EWS at-risk student list
    if (recentAbsences) {
      const absenceCounts: Record<string, { name: string, count: number }> = {};
      recentAbsences.forEach(r => {
        const sid = r.student_id;
        if (!absenceCounts[sid]) {
          absenceCounts[sid] = {
            name: (r.students as any)?.full_name || (Array.isArray(r.students) && r.students[0]?.full_name) || 'Unknown',
            count: 0
          };
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
  } else if (!userSchoolId && role === 'admin') {
    // Super-admin without a school assigned
    const { count: allActiveStudents, error: stdError } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);
    if (!stdError) totalStudents = allActiveStudents ?? 0;
  }

  const s3Duration = performance.now() - s3Start;
  const totalDuration = performance.now() - reqStart;

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Perf:Server] AdminDashboard total: ${totalDuration.toFixed(1)}ms (S1: ${s1Duration.toFixed(1)}ms, S2: ${s2Duration.toFixed(1)}ms, S3: ${s3Duration.toFixed(1)}ms)`);
  }

  atRiskStudents.sort((a, b) => (a.severity === 'high' ? -1 : 1));

  const todayTotal = totalStudents;
  const totalMonthly = present + absent + permission;
  const absentRate = totalMonthly === 0 ? '0' : ((absent / totalMonthly) * 100).toFixed(1);

  return (
    <AdminDashboardClient
      stats={{
        totalStudents,
        activeClasses,
        teachers,
        absentRate,
        todayTotal,
        todayAbsent,
        todayRecorded
      }}
      pieData={{ present, absent, permission }}
      activities={(activities as any) || []}
      atRiskStudents={atRiskStudents.slice(0, 10)}
      currentMonth={currentMonthStr}
      dataQuality={{
        missingIdCount,
        pendingCorrections
      }}
      dbErrors={dbErrors}
    />
  );
}
