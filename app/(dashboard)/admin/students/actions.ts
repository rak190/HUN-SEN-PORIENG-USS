'use server';

import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';

export async function fetchExportData(filters: { q?: string, class?: string, teacher?: string, gender?: string, desk?: string }) {
  const { user, role } = await getServerAuth();
  
  if (!user || (role !== 'admin' && role !== 'principal')) {
    return { success: false, error: 'Unauthorized: Admin access required.' };
  }

  const supabase = await createClient();

  let query = supabase.from('active_class_rosters').select('*');

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
       query = query.is('enrollment_class_id', null);
    }
  }

  const { data: studentsData, error } = await query.order('student_id_number', { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!studentsData || studentsData.length === 0) {
    return { success: true, data: [] };
  }

  const teacherIds = [...new Set(studentsData.map(s => s.teacher_id).filter(Boolean))];
  let profiles: any[] = [];
  
  if (teacherIds.length > 0) {
    const { data } = await supabase.from('profiles').select('id, full_name').in('id', teacherIds);
    profiles = data || [];
  }

  const mapped = studentsData.map(s => {
    const teacherProfile = profiles?.find(p => p.id === s.teacher_id);
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

export async function processGiepMatchingAction(records: any[], academic_year_id: string) {
  try {
    const { requireAdmin } = await import('@/lib/auth-server');
    await requireAdmin();
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    // Fetch existing students for the current academic year
    // To match we need student_id_number, full_name, gender, etc.
    const { data: existingStudents, error } = await supabase
      .from('active_class_rosters')
      .select('id, student_id_number, full_name, gender, class_name')
      .eq('academic_year_id', academic_year_id);

    if (error) throw error;

    const existingMap = new Map();
    existingStudents?.forEach(s => {
      if (s.student_id_number) {
        existingMap.set(s.student_id_number.trim(), s);
      }
    });

    const matched = [];
    const conflicts = [];
    const newRecords = [];

    for (const record of records) {
       const existing = existingMap.get(record.student_id_number);
       if (existing) {
          // Check for conflicts
          const isNameConflict = existing.full_name !== record.full_name;
          // Gender might be normalized
          const isGenderConflict = existing.gender !== record.gender;
          
          if (isNameConflict || isGenderConflict) {
             conflicts.push({ ...record, existing });
          } else {
             matched.push({ ...record, existing_id: existing.id });
          }
       } else {
          newRecords.push(record);
       }
    }

    return { success: true, matched, conflicts, newRecords };
  } catch (err: any) {
    console.error('Process GIEP mapping error:', err);
    return { success: false, error: err.message || 'Unknown error occurred' };
  }
}

export async function processGiepCommitAction(
  matched: any[], 
  conflicts: any[], 
  newRecords: any[], 
  academic_year_id: string
) {
  try {
    const { requireAdmin } = await import('@/lib/auth-server');
    await requireAdmin();
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();
    
    const allRecordsToProcess = [...matched, ...conflicts, ...newRecords];
    
    // First, fetch existing classes so we can map class_name to class_id
    const { data: dbClasses } = await supabase.from('classes').select('id, name');
    const classMap = new Map();
    dbClasses?.forEach(c => classMap.set(c.name.trim(), c.id));
    
    let successCount = 0;

    for (const record of allRecordsToProcess) {
       let studentId = record.existing_id || record.existing?.id;
       const classId = classMap.get(record.class_name);
       
       const dbRecord: any = {
          student_id_number: record.student_id_number,
          full_name: record.full_name,
          gender: record.gender,
       };

       if (studentId) {
          await supabase.from('students').update(dbRecord).eq('id', studentId);
       } else {
          dbRecord.status = 'new';
          dbRecord.is_active = true;
          const { data } = await supabase.from('students').insert([dbRecord]).select().single();
          if (data) studentId = data.id;
       }
       
       if (studentId && classId) {
          // Upsert enrollment
          await supabase.from('student_enrollments').upsert({
             student_id: studentId,
             class_id: classId,
             academic_year_id: academic_year_id,
             enrollment_status: 'active',
             desk_number: record.desk_number || null,
             room_number: record.room_number || null
          }, { onConflict: 'student_id,academic_year_id' });
       }
       
       successCount++;
    }

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/students');
    revalidatePath('/students');
    
    return { success: true, count: successCount };
  } catch (err: any) {
    console.error('Process GIEP commit error:', err);
    return { success: false, error: err.message || 'Unknown error occurred' };
  }
}
