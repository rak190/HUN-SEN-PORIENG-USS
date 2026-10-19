import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import StudentStudyPlansClient from './StudentStudyPlansClient';
import { Student, Classroom } from '@/types';
import Link from 'next/link';
import { AlertCircle, BookOpen, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ classId?: string }>;
}

export default async function StudentStudyPlansPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { classId } = await searchParams;

  // 1. Authoritative Server-Side Authentication
  const { user, profile, role } = await getServerAuth();
  if (!user || !profile) {
    redirect('/login');
  }

  if (role === 'monitor') {
    redirect('/monitor/attendance');
  }

  // 2. Fetch Active Academic Year
  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id, name')
    .eq('is_active', true)
    .maybeSingle();

  if (!activeYear) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm mt-8">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-black text-slate-900 mb-1">មិនមានឆ្នាំសិក្សាសកម្មទេ</h2>
        <p className="text-sm font-semibold text-slate-500">
          ប្រព័ន្ធមិនទាន់មានឆ្នាំសិក្សាណាមួយដែលបានកំណត់ជា &quot;សកម្ម&quot; នៅឡើយទេ។ សូមទាក់ទងអ្នកគ្រប់គ្រងប្រព័ន្ធ។
        </p>
      </div>
    );
  }

  // 3. Authoritative Class Resolution (Strict Role Scoping)
  let effectiveClassId: string | null = null;
  let classroom: Classroom | null = null;
  let availableClasses: Classroom[] = [];

  if (role === 'teacher') {
    // Teachers are strictly restricted to their assigned class(es)
    const { data: teacherClasses, error: teacherClassesError } = await supabase
      .from('classes')
      .select('id, name, grade, track, room_number, teacher_id, school_id, academic_year_id')
      .eq('teacher_id', profile.id)
      .eq('academic_year_id', activeYear.id)
      .eq('is_archived', false)
      .order('name', { ascending: true });

    if (teacherClassesError) {
      console.error('Error fetching teacher classes in /homeroom/student-study-plans:', teacherClassesError);
    }

    availableClasses = (teacherClasses as unknown as Classroom[]) || [];

    // Resilient Fallback: If no class has matching academic_year_id, check if assigned class has null academic_year_id
    if (availableClasses.length === 0) {
      const { data: fallbackClasses, error: fallbackError } = await supabase
        .from('classes')
        .select('id, name, grade, track, room_number, teacher_id, school_id, academic_year_id')
        .eq('teacher_id', profile.id)
        .is('academic_year_id', null)
        .eq('is_archived', false)
        .order('name', { ascending: true });

      if (fallbackError) {
        console.error('Error in teacher class fallback:', fallbackError);
      }
      if (fallbackClasses && fallbackClasses.length > 0) {
        availableClasses = fallbackClasses as unknown as Classroom[];
      }
    }

    if (classId && availableClasses.some((c) => c.id === classId)) {
      effectiveClassId = classId;
      classroom = availableClasses.find((c) => c.id === classId) || null;
    } else if (availableClasses.length > 0) {
      effectiveClassId = availableClasses[0].id;
      classroom = availableClasses[0];
    }
  } else if (role === 'admin' || role === 'principal') {
    // Admin & Principal can view all classes in their school
    let classesQuery = supabase
      .from('classes')
      .select('id, name, grade, track, room_number, teacher_id, school_id, academic_year_id')
      .eq('academic_year_id', activeYear.id)
      .eq('is_archived', false)
      .order('name', { ascending: true });

    if (profile.school_id) {
      classesQuery = classesQuery.eq('school_id', profile.school_id);
    }

    const { data: allSchoolClasses, error: schoolClassesError } = await classesQuery;
    if (schoolClassesError) {
      console.error('Error fetching school classes for admin/principal:', schoolClassesError);
    }
    availableClasses = (allSchoolClasses as unknown as Classroom[]) || [];

    if (classId && availableClasses.some((c) => c.id === classId)) {
      effectiveClassId = classId;
      classroom = availableClasses.find((c) => c.id === classId) || null;
    } else if (availableClasses.length > 0) {
      effectiveClassId = availableClasses[0].id;
      classroom = availableClasses[0];
    }
  }

  // Unassigned teacher state
  if (!classroom || !effectiveClassId) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm mt-8 space-y-4">
        <div className="w-16 h-16 bg-blue-50 text-[#155EEF] rounded-2xl flex items-center justify-center mx-auto">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">
          មិនមានថ្នាក់រៀនដែលត្រូវបានចាត់តាំងទេ
        </h2>
        <p className="text-sm font-semibold text-slate-500 max-w-md mx-auto leading-relaxed">
          លោកគ្រូ/អ្នកគ្រូ មិនទាន់ត្រូវបានចាត់តាំងជាគ្រូបន្ទុកថ្នាក់សម្រាប់ឆ្នាំសិក្សា{' '}
          <strong className="text-slate-800">{activeYear.name}</strong> នេះនៅឡើយទេ។
          សូមទាក់ទងគណៈគ្រប់គ្រងសាលា ឬអ្នកគ្រប់គ្រងប្រព័ន្ធដើម្បីចាត់តាំងថ្នាក់រៀន។
        </p>
        <div className="pt-2">
          <Link
            href="/homeroom"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ត្រឡប់ទៅផ្ទាំងកិច្ចការ</span>
          </Link>
        </div>
      </div>
    );
  }

  // 4. Concurrently fetch Class Roster, Published Grades, Teacher Profile, and School Info
  const [rosterRes, gradesRes, teacherRes, schoolRes] = await Promise.all([
    supabase
      .from('active_class_rosters')
      .select('*')
      .eq('enrollment_class_id', effectiveClassId)
      .eq('is_active', true)
      .order('full_name', { ascending: true }),
    supabase
      .from('grades')
      .select('student_id, period, scores')
      .eq('class_id', effectiveClassId)
      .eq('academic_year_id', activeYear.id)
      .eq('status', 'published'),
    classroom.teacher_id
      ? supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', classroom.teacher_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('schools')
      .select('name, abbreviation, department, province')
      .eq('id', classroom.school_id || profile.school_id || 'main-school')
      .maybeSingle(),
  ]);

  const students = (rosterRes.data as unknown as Student[]) || [];
  const gradesData = (gradesRes.data as unknown as Array<{ period: string; scores: Record<string, number> }>) || [];
  const teacherInfo = teacherRes.data || { full_name: profile.full_name, phone: profile.phone };
  const schoolInfo = schoolRes.data || undefined;

  return (
    <div className="space-y-4">
      {/* Class Selector Switcher (for Admin, Principal, or Teacher with multiple classes) */}
      {availableClasses.length > 1 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-600">
              {role === 'teacher' ? 'ជ្រើសរើសថ្នាក់រៀន៖' : 'ជ្រើសរើសថ្នាក់រៀន (Admin/Principal Switcher)៖'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {availableClasses.map((cls) => (
                <Link
                  key={cls.id}
                  href={`/homeroom/student-study-plans?classId=${cls.id}`}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    cls.id === effectiveClassId
                      ? 'bg-[#155EEF] text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cls.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Client Component */}
      <StudentStudyPlansClient
        students={students}
        classInfo={classroom}
        academicYearName={activeYear.name}
        schoolInfo={schoolInfo}
        teacherInfo={teacherInfo}
        gradesData={gradesData}
      />
    </div>
  );
}
