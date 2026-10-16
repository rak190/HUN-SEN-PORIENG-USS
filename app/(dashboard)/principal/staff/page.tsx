import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import PrincipalStaffClient from './StaffClient';

export const dynamic = 'force-dynamic';

export default async function PrincipalStaffPage() {
  const supabase = await createClient();

  const { user, profile, role } = await getServerAuth();
  if (!user) redirect('/login');

  if (role !== 'principal' && role !== 'admin') {
    redirect('/homeroom');
  }

  const schoolId = profile?.school_id;
  if (!schoolId) {
    return (
      <PrincipalStaffClient
        teachersList={[]}
        stats={{
          totalTeachers: 0,
          classesHandled: 0,
          totalStudents: 0,
        }}
      />
    );
  }

  // 1. Resolve Active Academic Year for the Principal's School
  const { data: schoolConfig } = await supabase
    .from('schools')
    .select('active_academic_year_id')
    .eq('id', schoolId)
    .maybeSingle();

  const activeYearId = schoolConfig?.active_academic_year_id;
  if (!activeYearId) {
    return (
      <PrincipalStaffClient
        teachersList={[]}
        stats={{
          totalTeachers: 0,
          classesHandled: 0,
          totalStudents: 0,
        }}
      />
    );
  }

  // 2. Fetch Teachers and Staff scoped to this school
  const { data: teachers } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['teacher', 'admin', 'principal', 'monitor'])
    .eq('school_id', schoolId);

  // 3. Fetch Classes strictly scoped to school_id, active_academic_year_id, and unarchived
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, teacher_id')
    .eq('school_id', schoolId)
    .eq('academic_year_id', activeYearId)
    .eq('is_archived', false);

  const activeClassIds = (classes || []).map(c => c.id);

  // 4. Fetch Student Counts from student_enrollments with pagination chunking
  let enrollments: { class_id: string }[] = [];
  if (activeClassIds.length > 0) {
    const CHUNK_SIZE = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const to = from + CHUNK_SIZE - 1;
      const { data: chunk, error } = await supabase
        .from('student_enrollments')
        .select('class_id')
        .eq('academic_year_id', activeYearId)
        .eq('enrollment_status', 'active')
        .in('class_id', activeClassIds)
        .range(from, to);

      if (error || !chunk || chunk.length === 0) {
        hasMore = false;
        break;
      }
      enrollments.push(...chunk);
      if (chunk.length < CHUNK_SIZE) {
        hasMore = false;
      } else {
        from += CHUNK_SIZE;
      }
    }
  }

  // 5. Fetch Attendance records to compute genuine class attendance rates
  const classAttendanceMap = new Map<string, { present: number; total: number }>();
  if (activeClassIds.length > 0) {
    const { data: attData } = await supabase
      .from('attendance_records')
      .select('class_id, status')
      .in('class_id', activeClassIds)
      .eq('academic_year_id', activeYearId);

    if (attData) {
      for (const rec of attData) {
        if (!rec.class_id) continue;
        const current = classAttendanceMap.get(rec.class_id) || { present: 0, total: 0 };
        current.total += 1;
        if (rec.status === 'present') {
          current.present += 1;
        }
        classAttendanceMap.set(rec.class_id, current);
      }
    }
  }

  const mappedTeachers = (teachers || []).map(t => {
    // Find the class this teacher is assigned to
    const assignedClass = classes?.find(c => c.teacher_id === t.id);
    
    // Count students in that class
    const studentCount = assignedClass 
      ? enrollments.filter(e => e.class_id === assignedClass.id).length 
      : 0;

    // Genuine attendance calculation:
    // - If teacher has an assigned class with attendance records: show percentage
    // - If teacher has an assigned class but no attendance recorded yet: show 'គ្មានទិន្នន័យ'
    // - If staff member has no assigned class: show '-'
    let attLabel = '-';
    if (assignedClass) {
      const attStats = classAttendanceMap.get(assignedClass.id);
      if (attStats && attStats.total > 0) {
        const pct = ((attStats.present / attStats.total) * 100).toFixed(1);
        attLabel = `${pct}%`;
      } else {
        attLabel = 'គ្មានទិន្នន័យ';
      }
    }

    return {
      id: t.id,
      username: t.username || '',
      name: t.full_name || 'មិនស្គាល់ឈ្មោះ',
      class: assignedClass ? assignedClass.name : 'មិនទាន់មានបន្ទុក',
      subject: t.role === 'teacher' ? (t.subject || 'ទូទៅ') : '-',
      students: studentCount || 0,
      att: attLabel,
      status: 'សកម្ម',
      phone: t.phone || 'គ្មានលេខទូរស័ព្ទ',
      email: `${t.username}@kruai.app`,
    };
  });

  const activeClassesCount = mappedTeachers.filter(t => t.class !== 'មិនទាន់មានបន្ទុក').length;
  const totalStudentsCount = mappedTeachers.reduce((sum, t) => sum + (t.students || 0), 0);

  return (
    <PrincipalStaffClient
      teachersList={mappedTeachers}
      stats={{
        totalTeachers: mappedTeachers.length,
        classesHandled: activeClassesCount,
        totalStudents: totalStudentsCount,
      }}
    />
  );
}
