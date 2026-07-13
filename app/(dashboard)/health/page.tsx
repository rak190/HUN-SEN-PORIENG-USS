import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import HealthBoardClient from './HealthBoardClient';
import { Student, StudentHealthRecord } from '@/types';

interface PageProps {
  searchParams: Promise<{ classId?: string }>;
}

export default async function HealthPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData?.user) {
    // Demo Mode: Allow access without redirecting
    // redirect('/');
  }

  const { classId = 'all' } = await searchParams;

  // 1. Fetch Students
  let studentsQuery = supabase
    .from('students')
    .select('*')
    .order('full_name', { ascending: true });
    
  if (classId !== 'all') {
    studentsQuery = studentsQuery.eq('class_id', classId);
  }
  
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
        students={students} 
        healthRecords={healthRecords} 
        classId={classId} 
      />
    </div>
  );
}
