import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import MasterStudentsClient from './MasterStudentsClient';

export const dynamic = 'force-dynamic';
const UNASSIGNED_LEGACY_LABEL = '\u1782\u17d2\u1798\u17b6\u1793\u1790\u17d2\u1793\u17b6\u1780\u17cb';

export default async function AdminStudentsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { user, role, profile } = await getServerAuth();
  
  if (!user) redirect('/login');
  if (role === 'principal') redirect('/principal/students');
  if (role !== 'admin') redirect('/homeroom');

  if (!profile?.is_active || !profile.school_id) throw new Error('Active school-scoped Admin required');
  const resolvedParams = (await searchParams) || {};
  const page = Math.max(1,parseInt(String(resolvedParams.page || '1'),10) || 1);
  const pageSize = 50;
  const q = String(resolvedParams.q || '').slice(0,200);
  const filterClass = String(resolvedParams.class || 'all');
  const filterTeacher = String(resolvedParams.teacher || 'all');
  const filterGender = String(resolvedParams.gender || 'all');
  const filterDesk = String(resolvedParams.desk || 'all');
  const supabase = await createClient();
  const { data: activeYear,error: yearError } = await supabase.from('academic_years').select('id,name').eq('school_id',profile.school_id).eq('is_active',true).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle();
  if (yearError || !activeYear) throw new Error(yearError?.message || 'No writable active academic year found');
  const { data: dbClasses,error: classError } = await supabase.from('classes').select('id,name,teacher_id').eq('school_id',profile.school_id).eq('academic_year_id',activeYear.id).eq('is_archived',false).order('name');
  if (classError) throw new Error(classError.message);
  const classOptions = (dbClasses || []).map(c => ({id:c.id,name:c.name}));
  const teacherIds = [...new Set((dbClasses || []).map(c => c.teacher_id).filter(Boolean))];
  const teacherResult = teacherIds.length ? await supabase.from('profiles').select('id,full_name').in('id',teacherIds) : {data:[],error:null};
  if (teacherResult.error) throw new Error(teacherResult.error.message);
  const teacherNames = (teacherResult.data || []).map(t => t.full_name);
  const legacyMatches = classOptions.filter(c => c.name===filterClass);
  const selected = classOptions.find(c => c.id===filterClass) || (legacyMatches.length===1 ? legacyMatches[0] : undefined);
  const unassigned = filterClass==='unassigned' || filterClass===UNASSIGNED_LEGACY_LABEL;
  if (filterClass!=='all' && !unassigned && !selected) throw new Error('Invalid class UUID filter');
  const { data: directory,error } = await supabase.rpc('admin_student_directory',{
    p_year:activeYear.id,p_class:selected?.id || null,p_search:q,p_unassigned:unassigned,
    p_gender:filterGender,p_desk:filterDesk,p_teacher:filterTeacher,p_page:page,p_page_size:pageSize,
  });
  if (error || !directory || !Array.isArray(directory.rows)) throw new Error(error?.message || 'Student directory could not be loaded');
  const mappedStudents = directory.rows;
  const totalCount = Number(directory.filtered_total);
  return (
    <MasterStudentsClient 
      initialStudents={mappedStudents} 
      totalCount={totalCount}
      globalStats={{
        total: Number(directory.total),
        female: Number(directory.female),
        male: Number(directory.male),
        classes: classOptions.length
      }}
      activeAcademicYearId={activeYear.id}
      activeAcademicYearName={activeYear.name}
      currentPage={page}
      pageSize={pageSize}
      filters={{
        q,
        class: selected?.id || (unassigned ? 'unassigned' : filterClass),
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
