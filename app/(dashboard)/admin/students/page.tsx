import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import MasterStudentsClient from './MasterStudentsClient';

export const dynamic = 'force-dynamic';

export default async function AdminStudentsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { user, role } = await getServerAuth();
  
  if (!user) redirect('/login');
  if (role === 'principal') redirect('/principal/students');
  if (role !== 'admin') redirect('/homeroom');

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

  // 1. Fetch Active Academic Year as Single Source of Truth
  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id, name')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const activeYearId = activeYear?.id || null;

  // 2. Fetch Active Classes (Strictly scoped to active academic year and not archived)
  let classesQuery = supabase
    .from('classes')
    .select('id, name, teacher_id')
    .eq('is_archived', false);

  if (activeYearId) {
    classesQuery = classesQuery.eq('academic_year_id', activeYearId);
  }

  const { data: dbClasses } = await classesQuery.order('name', { ascending: true });
  const classOptions = dbClasses ? dbClasses.map(c => ({ id: c.id, name: c.name })) : [];
  const classNames = classOptions.map(c => c.name);
  
  const teacherIds = dbClasses ? [...new Set(dbClasses.map(c => c.teacher_id).filter(Boolean))] : [];
  let teacherProfiles: any[] = [];
  if (teacherIds.length > 0) {
    const { data } = await supabase.from('profiles').select('id, full_name').in('id', teacherIds);
    teacherProfiles = data || [];
  }
  const teacherNames = teacherProfiles.map(t => t.full_name);

  // 3. Main Query (Strictly scoped to active academic year)
  let query = supabase
    .from('active_class_rosters')
    .select('*', { count: 'exact' });

  if (activeYearId) {
    query = query.eq('academic_year_id', activeYearId);
  }

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
       query = query.is('enrollment_class_id', null);
    } else {
       query = query.eq('class_name', filterClass);
    }
  }

  if (filterTeacher && filterTeacher !== 'all') {
    const matchingTeacherIds = teacherProfiles.filter(t => t.full_name === filterTeacher).map(t => t.id);
    if (matchingTeacherIds.length > 0) {
      query = query.in('teacher_id', matchingTeacherIds);
    } else {
      query = query.is('teacher_id', null); // Force empty result if no teacher matches
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
      const teacherProfile = teacherProfiles?.find(p => p.id === s.teacher_id);
      return {
        id: s.id,
        full_name: s.full_name,
        student_id_number: s.student_id_number,
        desk_number: s.desk_number,
        room_number: s.room_number,
        gender: s.gender,
        class_name: s.class_name || 'គ្មានថ្នាក់',
        homeroom_teacher: teacherProfile ? teacherProfile.full_name : 'មិនមាន',
        is_active: s.is_active
      };
    });
  }

  // Fetch Global Stats (Scoped to active academic year)
  let femaleQuery = supabase.from('active_class_rosters').select('*', { count: 'exact', head: true }).in('gender', ['F', 'ស្រី']);
  let maleQuery = supabase.from('active_class_rosters').select('*', { count: 'exact', head: true }).in('gender', ['M', 'ប្រុស']);

  if (activeYearId) {
    femaleQuery = femaleQuery.eq('academic_year_id', activeYearId);
    maleQuery = maleQuery.eq('academic_year_id', activeYearId);
  }

  const { count: femaleCount } = await femaleQuery;
  const { count: maleCount } = await maleQuery;

  return (
    <MasterStudentsClient 
      initialStudents={mappedStudents} 
      totalCount={totalCount}
      globalStats={{
        total: totalCount,
        female: femaleCount || 0,
        male: maleCount || 0,
        classes: classOptions.length
      }}
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
