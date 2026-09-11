'use server';

import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';

export async function fetchExportData(filters: { q?: string, class?: string, teacher?: string, gender?: string, desk?: string }) {
  const { user, role } = await getServerAuth();
  
  if (!user || (role !== 'admin' && role !== 'principal')) {
    return { success: false, error: 'Unauthorized: Admin access required.' };
  }

  const supabase = await createClient();

  let query = supabase.from('students').select('*, classes(name, teacher_id)');

  // Apply filters
  if (filters.q) {
    query = query.or(`full_name.ilike.%${filters.q}%,student_id_number.ilike.%${filters.q}%,desk_number.ilike.%${filters.q}%,room_number.ilike.%${filters.q}%`);
  }

  if (filters.gender && filters.gender !== 'all') {
    if (filters.gender === 'M') {
      query = query.in('gender', ['ប្រុស', 'M']);
    } else if (filters.gender === 'F') {
      query = query.in('gender', ['ស្រី', 'F']);
    }
  }

  if (filters.desk && filters.desk !== 'all') {
    if (filters.desk === 'assigned') {
      query = query.not('desk_number', 'is', null).neq('desk_number', '');
    } else if (filters.desk === 'unassigned') {
      query = query.or('desk_number.is.null,desk_number.eq.""');
    }
  }
  
  if (filters.class && filters.class !== 'all') {
    if (filters.class === 'គ្មានថ្នាក់') {
       query = query.is('class_id', null);
    }
  }

  const { data: studentsData, error } = await query.order('student_id_number', { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!studentsData || studentsData.length === 0) {
    return { success: true, data: [] };
  }

  const teacherIds = [...new Set(studentsData.map(s => s.classes?.teacher_id).filter(Boolean))];
  let profiles: any[] = [];
  
  if (teacherIds.length > 0) {
    const { data } = await supabase.from('profiles').select('id, full_name').in('id', teacherIds);
    profiles = data || [];
  }

  const mapped = studentsData.map(s => {
    const teacherProfile = profiles?.find(p => p.id === s.classes?.teacher_id);
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

  // Apply memory filters for class and teacher
  let filtered = mapped;
  if (filters.class && filters.class !== 'all' && filters.class !== 'គ្មានថ្នាក់') {
    filtered = filtered.filter(s => s.class_name === filters.class);
  }
  if (filters.teacher && filters.teacher !== 'all') {
    filtered = filtered.filter(s => s.homeroom_teacher === filters.teacher);
  }

  return { success: true, data: filtered };
}

export async function adminBasicRegisterAction(payload: {
  records: Array<{ 
    student_id_number: string; 
    full_name: string; 
    gender: string; 
    class_id: string; 
    status: string; 
  }>;
  academic_year_id: string;
}) {
  try {
    const { requireAdmin } = await import('@/lib/auth-server');
    const { user } = await requireAdmin(); // strict admin requirement
    const supabase = await createClient(); // this uses the service role for admin routes? 
    // Wait, createAdminClient is usually used for bypass RLS. Let's import it.
    // Actually, createClient is fine because requireAdmin ensures we are admin, but let's see what was imported.
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase.rpc('bulk_quick_register_students', {
      student_records: payload.records,
      target_year_id: payload.academic_year_id,
      admin_user_id: user?.id
    });

    if (error) {
      console.error('Admin basic register error:', error);
      return { success: false, error: error.message };
    }

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/students');
    revalidatePath('/students');
    revalidatePath('/classes/info');
    return { success: true, count: data?.count || 0 };
  } catch (err: any) {
    console.error('Admin basic register action caught error:', err?.message);
    return { success: false, error: err?.message || 'Unknown error occurred' };
  }
}

