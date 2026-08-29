import React from 'react';
import { createClient } from '@/lib/supabase/server';
import HealthBoardClient from './HealthBoardClient';
import { Student, StudentHealthRecord } from '@/types';

export default async function HealthPage() {
  const supabase = await createClient();

  // 1. Fetch Students
  const { data: studentsData } = await supabase
    .from('students')
    .select('*')
    .order('full_name', { ascending: true });
    
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
