import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { requirePrincipal } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
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

  // 2. Fetch Classes scoped to school (if set) and not archived
  let classesQuery = supabase
    .from('classes')
    .select('id, name, grade, track, room_number, shift, teacher_id, monitor_id, academic_year_id')
    .eq('is_archived', false)
    .order('name');

  if (schoolId) {
    classesQuery = classesQuery.eq('school_id', schoolId);
  }

  const { data: classesData, error: classesError } = await classesQuery;
  if (classesError) {
    console.error('Error loading classes for principal:', classesError);
  }
  const rawClasses = classesData || [];

  // 3. Fetch Teachers and Staff for mapping
  let profilesQuery = supabase
    .from('profiles')
    .select('id, full_name, phone, role, username');

  if (schoolId) {
    profilesQuery = profilesQuery.eq('school_id', schoolId);
  }

  const { data: profilesData } = await profilesQuery;
  const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

  // 4. Fetch Student counts (Total and Female) per class from active_class_rosters
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

  // 5. Fetch Today's Attendance records to check submission status
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' }).format(new Date());
  const { data: todayAttendance } = await supabase
    .from('attendance_records')
    .select('class_id')
    .eq('date', todayStr);

  const recordedClassIds = new Set((todayAttendance || []).map(a => a.class_id));

  // 6. Map classes with full details
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

  // 7. Calculate Aggregates
  const totalClasses = mappedClasses.length;
  const classesWithTeacher = mappedClasses.filter(c => c.teacher !== null).length;
  const totalStudents = mappedClasses.reduce((sum, c) => sum + c.totalStudents, 0);
  const totalFemale = mappedClasses.reduce((sum, c) => sum + c.femaleStudents, 0);
  const attendanceSubmittedToday = mappedClasses.filter(c => c.hasAttendanceToday).length;

  return (
    <PrincipalClassesClient
      classes={mappedClasses}
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
