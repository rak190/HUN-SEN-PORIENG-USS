import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';
import HealthBoardClient from './HealthBoardClient';
import { Student, StudentHealthRecord } from '@/types';

export const dynamic = 'force-dynamic';

export default async function HealthPage() {
  const supabase = await createClient();
  const { user, role, profile } = await getServerAuth();

  let studentsQuery = supabase
    .from('students')
    .select('*')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  // If teacher, only fetch students in classes assigned to this teacher
  if (user && role === 'teacher') {
    const { data: teacherClasses } = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', user.id);

    const classIds = (teacherClasses || []).map(c => c.id);
    if (classIds.length > 0) {
      studentsQuery = studentsQuery.in('class_id', classIds);
    } else {
      studentsQuery = studentsQuery.in('class_id', ['00000000-0000-0000-0000-000000000000']);
    }
  } else if (user && role === 'principal' && profile?.school_id) {
    const { data: schoolClasses } = await supabase
      .from('classes')
      .select('id')
      .eq('school_id', profile.school_id);

    const classIds = (schoolClasses || []).map(c => c.id);
    if (classIds.length > 0) {
      studentsQuery = studentsQuery.in('class_id', classIds);
    } else {
      studentsQuery = studentsQuery.in('class_id', ['00000000-0000-0000-0000-000000000000']);
    }
  }

  // 1. Fetch Students
  const { data: studentsData } = await studentsQuery;
  const students: Student[] = studentsData || [];

  // 2. Fetch Health Records for these students
  let healthRecords: StudentHealthRecord[] = [];
  if (students.length > 0) {
    const studentIds = students.map(s => s.id);
    const { data: recordsData } = await supabase
      .from('student_health_records')
      .select('*')
      .in('student_id', studentIds);
      
    healthRecords = recordsData || [];
  }

  return (
    <div className="w-full h-full max-w-7xl mx-auto">
      <HealthBoardClient 
        allStudents={students} 
        initialHealthRecords={healthRecords} 
      />
    </div>
  );
}
