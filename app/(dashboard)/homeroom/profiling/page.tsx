import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import ProfileCompletionClient from './ProfileCompletionClient';
import { getProfileCompletionStats } from './actions';

interface PageProps {
  searchParams: Promise<{ classId?: string }>;
}

export default async function ProfileCompletionPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { classId = 'all' } = await searchParams;

  // 1. Get user profile
  const { user, profile, role } = await getServerAuth();
  if (!user) {
    redirect('/login');
  }

  // 2. Fetch active academic year
  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id, name')
    .eq('is_active', true)
    .single();

  if (!activeYear) {
    return (
      <div className="p-8 text-center text-slate-500">
        មិនមានឆ្នាំសិក្សាសកម្មទេ។ សូមទាក់ទងអ្នកគ្រប់គ្រងប្រព័ន្ធ។ (No active academic year)
      </div>
    );
  }

  // 3. Determine effective classId
  let teacherClassName = null;
  let effectiveClassId: string | null = null;
  
  if (profile?.role === 'teacher') {
    const { data: classroom } = await supabase
      .from('classes')
      .select('id, name')
      .eq('teacher_id', profile.id)
      .eq('academic_year_id', activeYear.id)
      .maybeSingle();
      
    if (classroom) {
      teacherClassName = classroom.name;
      effectiveClassId = classroom.id;
    }
  } else if (classId && classId !== 'all') {
    effectiveClassId = classId;
    const { data: classroom } = await supabase
      .from('classes')
      .select('name')
      .eq('id', effectiveClassId)
      .maybeSingle();
    if (classroom) teacherClassName = classroom.name;
  } else {
    // If admin didn't select a class, grab the first active class as default
    const { data: firstClass } = await supabase
      .from('classes')
      .select('id, name')
      .eq('academic_year_id', activeYear.id)
      .limit(1)
      .maybeSingle();
      
    if (firstClass) {
      effectiveClassId = firstClass.id;
      teacherClassName = firstClass.name;
    }
  }

  if (!effectiveClassId) {
    return (
      <div className="p-8 text-center text-slate-500">
        អ្នកមិនទាន់មានថ្នាក់រៀនទទួលបន្ទុកទេ ក្នុងឆ្នាំសិក្សានេះ។ (No class assigned for this year)
      </div>
    );
  }

  // 4. Fetch classes for dropdown (if admin/principal)
  let allClasses: any[] = [];
  if (profile?.role === 'admin' || profile?.role === 'principal') {
    const { data: classesList } = await supabase
      .from('classes')
      .select('id, name')
      .eq('academic_year_id', activeYear.id)
      .order('name');
    allClasses = classesList || [];
  }

  // 5. Fetch completion stats
  const stats = await getProfileCompletionStats(effectiveClassId, activeYear.id);

  return (
    <ProfileCompletionClient 
      stats={stats} 
      className={teacherClassName || 'Unknown'} 
      classId={effectiveClassId}
      allClasses={allClasses}
      userRole={profile?.role || 'teacher'}
    />
  );
}
