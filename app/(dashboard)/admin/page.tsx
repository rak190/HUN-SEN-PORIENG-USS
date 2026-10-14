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
  if (!user || !profile) redirect('/login');

  if (role !== 'admin' && role !== 'principal') {
    redirect('/homeroom');
  }

  const userSchoolId = profile.school_id || null;
  const dbErrors: string[] = [];

  // 2. Fetch Active Academic Year for Scope
  let yearQuery = supabase
    .from('academic_years')
    .select('id, name, status')
    .eq('is_active', true);

  if (userSchoolId) {
    yearQuery = yearQuery.eq('school_id', userSchoolId);
  }

  const { data: activeYearData, error: yearError } = await yearQuery
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (yearError) {
    dbErrors.push('Failed to load active academic year');
  }
  const activeYearId = activeYearData?.id || null;

  // 3. Fetch Active Classes (Scoped to School and Active Academic Year)
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
  if (clsError) {
    dbErrors.push('Failed to load classes');
  }

  const activeClasses = activeClassesCount ?? clsRows?.length ?? 0;
  const schoolClassIds = clsRows?.map(c => c.id) || [];

  // 4. Fetch Enrolled Active Students Count (Scoped to School / Active Classes)
  let totalStudents = 0;
  if (schoolClassIds.length > 0) {
    const { count: enrolledCount, error: stdError } = await supabase
      .from('student_enrollments')
      .select('student_id', { count: 'exact', head: true })
      .in('class_id', schoolClassIds)
      .eq('enrollment_status', 'active');

    if (stdError) {
      dbErrors.push('Failed to load student enrollments');
    } else {
      totalStudents = enrolledCount ?? 0;
    }
  } else if (!userSchoolId && role === 'admin') {
    // Unrestricted super-admin with no school assigned
    const { count: allActiveStudents, error: stdError } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);
    if (!stdError) totalStudents = allActiveStudents ?? 0;
  }

  // 5. Fetch Teachers Count (Scoped to School)
  let teachersQuery = supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'teacher')
    .eq('is_active', true);

  if (userSchoolId) {
    teachersQuery = teachersQuery.eq('school_id', userSchoolId);
  }

  const { count: teachersCount, error: tchError } = await teachersQuery;
  if (tchError) {
    dbErrors.push('Failed to load teachers');
  }
  const teachers = teachersCount ?? 0;

  // 6. Date Calculations (Cambodia Asia/Phnom_Penh UTC+7 Semantics)
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
  // Avoid counting future dates if querying the current month
  const effectiveEndMonthStr = currentMonthStr === defaultMonthStr && todayStrPH < endMonthStr ? todayStrPH : endMonthStr;

  // 7. Fetch Attendance Records for Pie Chart (This Month)
  let present = 0;
  let absent = 0;
  let permission = 0;

  if (schoolClassIds.length > 0 || (!userSchoolId && role === 'admin')) {
    let monthAttQuery = supabase
      .from('attendance_records')
      .select('status')
      .gte('date', startMonthStr)
      .lte('date', effectiveEndMonthStr);

    if (schoolClassIds.length > 0) {
      monthAttQuery = monthAttQuery.in('class_id', schoolClassIds);
    }
    if (activeYearId) {
      monthAttQuery = monthAttQuery.eq('academic_year_id', activeYearId);
    }

    const { data: monthAttendance, error: attError } = await monthAttQuery;
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
  }

  // 8. Fetch Live Attendance for Today
  let todayAbsent = 0;
  let todayRecorded = 0;

  if (schoolClassIds.length > 0 || (!userSchoolId && role === 'admin')) {
    let todayAbsentQuery = supabase
      .from('attendance_records')
      .select('student_id', { count: 'exact', head: true })
      .eq('date', todayStrPH)
      .in('status', ['absent', 'unexcused', 'excused', 'A']);

    let todayRecordedQuery = supabase
      .from('attendance_records')
      .select('student_id', { count: 'exact', head: true })
      .eq('date', todayStrPH);

    if (schoolClassIds.length > 0) {
      todayAbsentQuery = todayAbsentQuery.in('class_id', schoolClassIds);
      todayRecordedQuery = todayRecordedQuery.in('class_id', schoolClassIds);
    }
    if (activeYearId) {
      todayAbsentQuery = todayAbsentQuery.eq('academic_year_id', activeYearId);
      todayRecordedQuery = todayRecordedQuery.eq('academic_year_id', activeYearId);
    }

    const [{ count: absentTodayCount }, { count: recordedTodayCount }] = await Promise.all([
      todayAbsentQuery,
      todayRecordedQuery,
    ]);

    todayAbsent = absentTodayCount || 0;
    todayRecorded = recordedTodayCount || 0;
  }

  const todayTotal = totalStudents;
  const totalMonthly = present + absent + permission;
  const absentRate = totalMonthly === 0 ? '0' : ((absent / totalMonthly) * 100).toFixed(1);

  // 9. Fetch Activity Logs (Scoped to School if not superadmin)
  let activityQuery = supabase
    .from('audit_logs')
    .select('id, action, created_at, profiles(full_name, school_id)')
    .order('created_at', { ascending: false })
    .limit(8);

  const { data: activitiesData } = await activityQuery;
  const activities = (activitiesData || [])
    .filter(log => {
      if (!userSchoolId || role === 'admin') return true;
      const logSchoolId = (log.profiles as any)?.school_id;
      return !logSchoolId || logSchoolId === userSchoolId;
    });

  // 10. Calculate At-Risk Students (Simple EWS, Scoped to Active Classes)
  const atRiskStudents: any[] = [];
  if (schoolClassIds.length > 0 || (!userSchoolId && role === 'admin')) {
    let recentAbsQuery = supabase
      .from('attendance_records')
      .select('student_id, students(full_name)')
      .gte('date', startMonthStr)
      .lte('date', effectiveEndMonthStr)
      .in('status', ['absent', 'A', 'unexcused']);

    if (schoolClassIds.length > 0) {
      recentAbsQuery = recentAbsQuery.in('class_id', schoolClassIds);
    }

    const { data: recentAbsences } = await recentAbsQuery;
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
  }

  atRiskStudents.sort((a, b) => (a.severity === 'high' ? -1 : 1));

  // 11. Data Quality Metrics (Scoped)
  let missingIdCount = 0;
  if (schoolClassIds.length > 0) {
    const { count: missingCount } = await supabase
      .from('active_class_rosters')
      .select('id', { count: 'exact', head: true })
      .in('enrollment_class_id', schoolClassIds)
      .or('student_id_number.is.null,student_id_number.eq.""');
    missingIdCount = missingCount ?? 0;
  }

  let pendingCorrections = 0;
  let correctionsQuery = supabase
    .from('correction_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (userSchoolId) {
    correctionsQuery = correctionsQuery.eq('school_id', userSchoolId);
  }

  const { count: correctionsCount } = await correctionsQuery;
  pendingCorrections = correctionsCount ?? 0;

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
