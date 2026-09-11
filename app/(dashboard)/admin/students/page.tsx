import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import MasterStudentsClient from './MasterStudentsClient';

export const dynamic = 'force-dynamic';

export default async function AdminStudentsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { user, role } = await getServerAuth();
  
  if (!user) redirect('/login');
  if (role !== 'admin' && role !== 'principal') redirect('/homeroom');

  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page as string) || 1;
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const q = (resolvedParams.q as string) || '';
  const filterClass = (resolvedParams.class as string) || 'all';
  const filterTeacher = (resolvedParams.teacher as string) || 'all';
  const filterGender = (resolvedParams.gender as string) || 'all';
  const filterDesk = (resolvedParams.desk as string) || 'all';

  const supabase = await createClient();

  // We need to figure out all unique classes and teachers for the dropdowns.
  // Instead of querying everything, we'll fetch them separately to populate filters.
  const { data: dbClasses } = await supabase.from('classes').select('id, name, teacher_id');
  const classOptions = dbClasses ? dbClasses.map(c => ({ id: c.id, name: c.name })) : [];
  const classNames = classOptions.map(c => c.name);
  
  const teacherIds = dbClasses ? [...new Set(dbClasses.map(c => c.teacher_id).filter(Boolean))] : [];
  let teacherProfiles: any[] = [];
  if (teacherIds.length > 0) {
    const { data } = await supabase.from('profiles').select('id, full_name').in('id', teacherIds);
    teacherProfiles = data || [];
  }
  const teacherNames = teacherProfiles.map(t => t.full_name);

  // Main Query
  let query = supabase
    .from('students')
    .select('*, classes(name, teacher_id)', { count: 'exact' });

  // Apply filters
  if (q) {
    query = query.or(`full_name.ilike.%${q}%,student_id_number.ilike.%${q}%,desk_number.ilike.%${q}%,room_number.ilike.%${q}%`);
  }

  if (filterGender && filterGender !== 'all') {
    if (filterGender === 'M') {
      query = query.in('gender', ['ប្រុស', 'M']);
    } else if (filterGender === 'F') {
      query = query.in('gender', ['ស្រី', 'F']);
    }
  }

  if (filterDesk && filterDesk !== 'all') {
    if (filterDesk === 'assigned') {
      query = query.not('desk_number', 'is', null).neq('desk_number', '');
    } else if (filterDesk === 'unassigned') {
      query = query.or('desk_number.is.null,desk_number.eq.""');
    }
  }

  if (filterClass && filterClass !== 'all') {
    if (filterClass === 'គ្មានថ្នាក់') {
       query = query.is('class_id', null);
    }
  }

  // Fetch paginated data
  const { data: studentsData, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  const totalCount = count || 0;
  let mappedStudents: any[] = [];

  if (studentsData && studentsData.length > 0) {
    mappedStudents = studentsData.map(s => {
      const teacherProfile = teacherProfiles?.find(p => p.id === s.classes?.teacher_id);
      return {
        id: s.id,
        full_name: s.full_name,
        student_id_number: s.student_id_number,
        desk_number: s.desk_number,
        room_number: s.room_number,
        gender: s.gender,
        class_name: s.classes?.name || 'គ្មានថ្នាក់',
        homeroom_teacher: teacherProfile ? teacherProfile.full_name : 'មិនមាន',
        is_active: s.is_active
      };
    });
  }

  // Filter in memory for class/teacher if needed (Supabase limitation)
  if (filterClass && filterClass !== 'all' && filterClass !== 'គ្មានថ្នាក់') {
    mappedStudents = mappedStudents.filter(s => s.class_name === filterClass);
  }
  if (filterTeacher && filterTeacher !== 'all') {
    mappedStudents = mappedStudents.filter(s => s.homeroom_teacher === filterTeacher);
  }

  return (
    <MasterStudentsClient 
      initialStudents={mappedStudents} 
      totalCount={totalCount}
      currentPage={page}
      pageSize={pageSize}
      filters={{
        q,
        class: filterClass,
        teacher: filterTeacher,
        gender: filterGender,
        desk: filterDesk
      }}
      filterOptions={{
        classes: classOptions,
        teachers: teacherNames
      }}
    />
  );
}
