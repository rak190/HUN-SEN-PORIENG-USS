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

  // 1. Fetch Teachers and Staff
  const { data: teachers } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['teacher', 'admin', 'principal', 'monitor']);

  // 2. Fetch Classes to map teacher_id
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, teacher_id');

  // 3. Fetch Student Counts
  const { data: students } = await supabase
    .from('students')
    .select('class_id')
    .eq('is_active', true);

  const mappedTeachers = (teachers || []).map(t => {
    // Find the class this teacher is assigned to
    const assignedClass = classes?.find(c => c.teacher_id === t.id);
    
    // Count students in that class
    const studentCount = assignedClass 
      ? students?.filter(s => s.class_id === assignedClass.id).length 
      : 0;

    return {
      id: t.id,
      username: t.username || '',
      name: t.full_name || 'មិនស្គាល់ឈ្មោះ',
      class: assignedClass ? assignedClass.name : 'មិនទាន់មានបន្ទុក',
      subject: t.role === 'teacher' ? (t.subject || 'ទូទៅ') : '-',
      students: studentCount || 0,
      att: '100%', // Teacher attendance tracking not yet implemented in DB, defaulting to 100%
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
