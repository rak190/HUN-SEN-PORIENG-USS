import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { requirePrincipal } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { calculateGradeLetter } from '@/lib/domain/grading';
import { ACADEMIC_PERIODS } from '@/lib/academic-periods';
import PrincipalClassesClient from './ClassesClient';

export const dynamic = 'force-dynamic';

export default async function PrincipalClassesPage() {
  const supabase = await createClient();

  // 1. Verify User and Role
  let auth;
  try {
    auth = await requirePrincipal();
  } catch {
    redirect('/homeroom');
  }

  const { profile } = auth;
  const schoolId = profile?.school_id || '';

  // 2. Fetch Active Academic Year
  let yearQuery = supabase
    .from('academic_years')
    .select('id, name')
    .eq('is_active', true);

  if (schoolId) {
    yearQuery = yearQuery.eq('school_id', schoolId);
  }

  const { data: activeYear } = await yearQuery.order('created_at', { ascending: false }).limit(1).maybeSingle();
  const activeYearId = activeYear?.id || null;

  // 3. Fetch Classes scoped to school (if set) and not archived
  let classesQuery = supabase
    .from('classes')
    .select('id, name, grade, track, room_number, shift, teacher_id, monitor_id, academic_year_id')
    .eq('is_archived', false)
    .order('name');

  if (schoolId) {
    classesQuery = classesQuery.eq('school_id', schoolId);
  }
  if (activeYearId) {
    classesQuery = classesQuery.eq('academic_year_id', activeYearId);
  }

  const { data: classesData, error: classesError } = await classesQuery;
  if (classesError) {
    console.error('Error loading classes for principal:', classesError);
  }
  const rawClasses = classesData || [];
  const classIds = rawClasses.map(c => c.id);

  // 4. Fetch Teachers and Staff for mapping
  let profilesQuery = supabase
    .from('profiles')
    .select('id, full_name, phone, role, username');

  if (schoolId) {
    profilesQuery = profilesQuery.eq('school_id', schoolId);
  }

  const { data: profilesData } = await profilesQuery;
  const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

  // 5. Fetch Student counts (Total and Female) per class from active_class_rosters
  const { data: rosterData } = await supabase
    .from('active_class_rosters')
    .select('enrollment_class_id, gender');

  const studentCounts: Record<string, { total: number; female: number }> = {};
  (rosterData || []).forEach((r: any) => {
    const cid = r.enrollment_class_id;
    if (!cid) return;
    if (!studentCounts[cid]) {
      studentCounts[cid] = { total: 0, female: 0 };
    }
    studentCounts[cid].total += 1;
    if (r.gender === 'F' || r.gender === 'ស្រី') {
      studentCounts[cid].female += 1;
    }
  });

  // 6. Fetch Today's Attendance records to check submission status
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' }).format(new Date());
  const { data: todayAttendance } = await supabase
    .from('attendance_records')
    .select('class_id')
    .eq('date', todayStr);

  const recordedClassIds = new Set((todayAttendance || []).map(a => a.class_id));

  // 7. Fetch Dynamic Grading Scales (if configured in /admin/exam-standards)
  let scalesQuery = supabase.from('exam_grading_scales').select('*');
  if (activeYearId) {
    scalesQuery = scalesQuery.eq('academic_year_id', activeYearId);
  }
  const { data: dynamicScalesData } = await scalesQuery;
  const dynamicScales = dynamicScalesData || [];

  // 8. Fetch Published Grades for these classes
  const classGradesByPeriod: Record<string, Record<string, {
    isPublished: boolean;
    totalGraded: number;
    averageScore50: number;
    passingRate: number;
    gradeDistribution: { A: number; B: number; C: number; D: number; E: number; F: number };
  }>> = {};

  const publishedPeriodsSet = new Set<string>();

  if (classIds.length > 0) {
    let gradesQuery = supabase
      .from('grades')
      .select('class_id, period, total_score, average, status, student_id')
      .in('class_id', classIds)
      .eq('status', 'published');

    if (activeYearId) {
      gradesQuery = gradesQuery.eq('academic_year_id', activeYearId);
    }

    const { data: publishedGrades } = await gradesQuery;

    // Intermediate aggregation structure
    const rawAggregates: Record<string, Record<string, {
      totalScoreSum: number;
      count: number;
      dist: { A: number; B: number; C: number; D: number; E: number; F: number };
      passingCount: number;
    }>> = {};

    (publishedGrades || []).forEach((row: any) => {
      const cid = row.class_id;
      const pid = row.period;
      if (!cid || !pid) return;

      publishedPeriodsSet.add(pid);

      if (!rawAggregates[cid]) rawAggregates[cid] = {};
      if (!rawAggregates[cid][pid]) {
        rawAggregates[cid][pid] = {
          totalScoreSum: 0,
          count: 0,
          dist: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
          passingCount: 0
        };
      }

      const item = rawAggregates[cid][pid];
      item.count += 1;

      // Determine score value to calculate letter grade
      const avg = row.average !== null && row.average !== undefined ? Number(row.average) : 0;
      const tot = row.total_score !== null && row.total_score !== undefined ? Number(row.total_score) : 0;
      const val = avg > 0 ? avg : tot;
      item.totalScoreSum += (avg > 0 ? (avg <= 10.0 ? avg * 5 : avg) : (tot > 0 && tot <= 50 ? tot : (tot / 10)));

      // Calculate letter grade (A, B, C, D, E, F)
      const res = calculateGradeLetter(val, dynamicScales);
      const letter = (res.letter as 'A' | 'B' | 'C' | 'D' | 'E' | 'F') || 'F';
      if (item.dist[letter] !== undefined) {
        item.dist[letter] += 1;
      } else {
        item.dist['F'] += 1;
      }

      if (['A', 'B', 'C', 'D', 'E'].includes(letter)) {
        item.passingCount += 1;
      }
    });

    // Finalize stats per class & period
    Object.keys(rawAggregates).forEach(cid => {
      classGradesByPeriod[cid] = {};
      Object.keys(rawAggregates[cid]).forEach(pid => {
        const d = rawAggregates[cid][pid];
        const avgScore50 = d.count > 0 ? parseFloat((d.totalScoreSum / d.count).toFixed(2)) : 0;
        const passRate = d.count > 0 ? Math.round((d.passingCount / d.count) * 100) : 0;

        classGradesByPeriod[cid][pid] = {
          isPublished: true,
          totalGraded: d.count,
          averageScore50: avgScore50,
          passingRate: passRate,
          gradeDistribution: d.dist
        };
      });
    });
  }

  // 9. Determine default active period
  const allKnownPeriods = ACADEMIC_PERIODS.map(p => p.id);
  // Find the latest period that has published grades, or fallback to 'dec'
  const publishedPeriodsList = Array.from(publishedPeriodsSet);
  const defaultPeriod = publishedPeriodsList.length > 0 
    ? (publishedPeriodsList.find(p => p === 'dec' || p === 'jan' || p === 'sem1-exam') || publishedPeriodsList[0])
    : 'dec';

  // 10. Map classes with full details
  const mappedClasses = rawClasses.map(c => {
    const teacher = c.teacher_id ? profilesMap.get(c.teacher_id) : null;
    const monitor = c.monitor_id ? profilesMap.get(c.monitor_id) : null;
    const counts = studentCounts[c.id] || { total: 0, female: 0 };
    const hasAttendanceToday = recordedClassIds.has(c.id);

    return {
      id: c.id,
      name: c.name,
      grade: c.grade ? String(c.grade) : '12',
      track: c.track || 'ទូទៅ',
      roomNumber: c.room_number || 'មិនទាន់កំណត់',
      shift: c.shift || 'ព្រឹក',
      teacher: teacher ? {
        id: teacher.id,
        name: teacher.full_name || 'មិនស្គាល់',
        phone: teacher.phone || 'គ្មានលេខទូរស័ព្ទ',
        username: teacher.username || '',
      } : null,
      monitor: monitor ? {
        id: monitor.id,
        name: monitor.full_name || 'មិនស្គាល់',
      } : null,
      totalStudents: counts.total,
      femaleStudents: counts.female,
      hasAttendanceToday,
    };
  });

  // 11. Calculate Aggregates
  const totalClasses = mappedClasses.length;
  const classesWithTeacher = mappedClasses.filter(c => c.teacher !== null).length;
  const totalStudents = mappedClasses.reduce((sum, c) => sum + c.totalStudents, 0);
  const totalFemale = mappedClasses.reduce((sum, c) => sum + c.femaleStudents, 0);
  const attendanceSubmittedToday = mappedClasses.filter(c => c.hasAttendanceToday).length;

  return (
    <PrincipalClassesClient
      classes={mappedClasses}
      classGradesByPeriod={classGradesByPeriod}
      initialPeriod={defaultPeriod}
      stats={{
        totalClasses,
        classesWithTeacher,
        totalStudents,
        totalFemale,
        attendanceSubmittedToday,
        todayDate: todayStr,
      }}
      schoolCode={profile?.school_code || 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង'}
    />
  );
}
