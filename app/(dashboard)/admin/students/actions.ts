'use server';

import { createClient } from '@/lib/supabase/server';
import { getServerAuth, requireRole } from '@/lib/auth-server';

export async function fetchExportData(filters: { q?: string, class?: string, teacher?: string, gender?: string, desk?: string }) {
  const { user, profile, role } = await getServerAuth();
  
  if (!user || !profile || (role !== 'admin' && role !== 'principal')) {
    return { success: false, error: 'Unauthorized: Admin access required.' };
  }

  const supabase = await createClient();

  let query = supabase.from('active_class_rosters').select('*');

  // Principal institutional scoping
  if (role === 'principal' && profile.school_id) {
    const { data: schoolClasses } = await supabase
      .from('classes')
      .select('id')
      .eq('school_id', profile.school_id);
    const classIds = schoolClasses?.map((c) => c.id) || [];
    query = query.in('enrollment_class_id', classIds);
  }

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
    const { requirePrincipal } = await import('@/lib/auth-server');
    const { user } = await requirePrincipal(); // strict admin requirement
    const supabase = await createClient(); // this uses the service role for admin routes? 
    // Wait, createAdminClient is usually used for bypass RLS. Let's import it.
    // Actually, createClient is fine because requirePrincipal ensures we are admin, but let's see what was imported.
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
    const { profile, role } = await requireRole(['admin', 'principal']);
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    // Fetch existing students for the current academic year, scoped to school
    let rostersQuery = supabase
      .from('active_class_rosters')
      .select('id, student_id_number, full_name, gender, class_name')
      .eq('academic_year_id', academic_year_id);

    if (role === 'principal' && profile.school_id) {
      const { data: schoolClasses } = await supabase
        .from('classes')
        .select('id')
        .eq('school_id', profile.school_id);
      const classIds = schoolClasses?.map((c) => c.id) || [];
      rostersQuery = rostersQuery.in('enrollment_class_id', classIds);
    }

    const { data: existingStudents, error } = await rostersQuery;

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
    const { requirePrincipal } = await import('@/lib/auth-server');
    await requirePrincipal();
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

export async function bulkAssignClassAction(studentIds: string[], targetClassId: string, academicYearId: string) {
  try {
    const { requirePrincipal } = await import('@/lib/auth-server');
    await requirePrincipal();
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    let targetYearId = academicYearId;
    if (!targetYearId || targetYearId === 'fetch-active') {
      const { data: yearData } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (yearData) targetYearId = yearData.id;
    }

    if (!targetYearId) return { success: false, error: 'No active academic year found.' };

    const { data: rpcRes, error } = await supabase.rpc('batch_reassign_class_atomic', {
      p_student_ids: studentIds,
      p_target_class_id: targetClassId,
      p_academic_year_id: targetYearId
    });

    if (error) throw error;

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/students');
    revalidatePath('/students');
    revalidatePath('/classes/info');

    return { success: true, count: rpcRes?.reassigned_count || studentIds.length };
  } catch (err: any) {
    console.error('Bulk assign class error:', err);
    return { success: false, error: err.message || 'Unknown error occurred' };
  }
}

export async function batchRegisterBasicStudents(studentsData: any[], academicYearId: string) {
  try {
    const { requirePrincipal } = await import('@/lib/auth-server');
    const { user } = await requirePrincipal();
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    let targetYearId = academicYearId;
    if (targetYearId === 'fetch-active') {
      const { data: yearData } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_active', true)
        .single();
      if (yearData) targetYearId = yearData.id;
    }

    const cleanData = studentsData.map(s => {
      const rawDob = s.dob || s.date_of_birth || null;
      const sanitizedDob = rawDob && typeof rawDob === 'string' && rawDob.trim() !== '' ? rawDob.trim() : null;
      return {
        student_id_number: String(s.student_id_number || s.student_id || '').trim(),
        full_name: String(s.full_name || s.name_khmer || '').trim(),
        gender: s.gender,
        dob: sanitizedDob,
        date_of_birth: sanitizedDob,
        class_id: s.class_id || null,
        room_number: s.room_number || null,
        desk_number: s.desk_number || null
      };
    });

    const { data, error } = await supabase.rpc('batch_register_students_atomic', {
      p_students: cleanData,
      p_academic_year_id: targetYearId,
      p_caller_id: user.id
    });

    if (error) {
      console.error('Batch register atomic error:', error);
      return { success: false, error: error.message };
    }

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/students');
    revalidatePath('/admin/students', 'page');
    revalidatePath('/homeroom');
    revalidatePath('/homeroom/profiling');
    revalidatePath('/classes');

    return { success: true, count: data?.count || cleanData.length };
  } catch (err: any) {
    console.error('Batch register caught error:', err);
    return { success: false, error: err?.message || 'Unknown error occurred' };
  }
}

export async function getPendingStudentRequests() {
  try {
    const { requirePrincipal } = await import('@/lib/auth-server');
    await requirePrincipal();
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('student_requests')
      .select(`
        id, request_type, student_name, gender, date_of_birth, status, reason, effective_date, details, created_at,
        student_id,
        class:classes(id, name),
        requester:profiles!student_requests_requested_by_fkey(full_name),
        student:students(id, student_id_number, full_name, gender)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return { success: true, data };
  } catch (err: any) {
    console.error('Get pending requests error:', err);
    return { success: false, error: err?.message || 'Unknown error occurred' };
  }
}

export async function approveStudentRequest(
  requestId: string,
  studentIdNumber?: string,
  classId?: string,
  academicYearId: string = 'fetch-active',
  adminNotes?: string
) {
  try {
    const { requirePrincipal } = await import('@/lib/auth-server');
    const { user } = await requirePrincipal();
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    let targetYearId = academicYearId;
    if (targetYearId === 'fetch-active') {
      const { data: yearData } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_active', true)
        .single();
      if (yearData) targetYearId = yearData.id;
    }

    const { data, error } = await supabase.rpc('approve_student_request', {
      p_request_id: requestId,
      p_student_id_number: studentIdNumber || null,
      p_class_id: classId || null,
      p_admin_notes: adminNotes || '',
      p_academic_year_id: targetYearId,
      p_admin_user_id: user?.id
    });

    if (error) throw error;

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/students');
    revalidatePath('/homeroom');
    
    return { success: true, data };
  } catch (err: any) {
    console.error('Approve request error:', err);
    return { success: false, error: err?.message || 'Unknown error occurred' };
  }
}

export async function rejectStudentRequest(requestId: string, adminNotes?: string) {
  try {
    const { requirePrincipal } = await import('@/lib/auth-server');
    await requirePrincipal();
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('student_requests')
      .update({
        status: 'rejected',
        admin_notes: adminNotes,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) throw error;

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/students');
    revalidatePath('/homeroom');
    
    return { success: true };
  } catch (err: any) {
    console.error('Reject request error:', err);
    return { success: false, error: err?.message || 'Unknown error occurred' };
  }
}

export async function archiveStudent(studentId: string, academicYearId: string) {
  try {
    const { requirePrincipal } = await import('@/lib/auth-server');
    await requirePrincipal();
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    let targetYearId = academicYearId;
    if (!targetYearId || targetYearId === 'fetch-active') {
      const { data: yearData } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_active', true)
        .single();
      if (yearData) targetYearId = yearData.id;
    }

    if (!targetYearId) return { success: false, error: 'No active academic year found.' };

    const { error } = await supabase
      .from('student_enrollments')
      .update({
        enrollment_status: 'dropped',
        updated_at: new Date().toISOString()
      })
      .eq('student_id', studentId)
      .eq('academic_year_id', targetYearId);

    if (error) throw error;

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/students');
    
    return { success: true };
  } catch (err: any) {
    console.error('Archive student error:', err);
    return { success: false, error: err?.message || 'Unknown error occurred' };
  }
}

export async function bulkArchiveStudents(studentIds: string[], academicYearId: string) {
  try {
    const { requirePrincipal } = await import('@/lib/auth-server');
    await requirePrincipal();
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    let targetYearId = academicYearId;
    if (!targetYearId || targetYearId === 'fetch-active') {
      const { data: yearData } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_active', true)
        .single();
      if (yearData) targetYearId = yearData.id;
    }

    if (!targetYearId) return { success: false, error: 'No active academic year found.' };

    const { error } = await supabase
      .from('student_enrollments')
      .update({
        enrollment_status: 'dropped',
        updated_at: new Date().toISOString()
      })
      .in('student_id', studentIds)
      .eq('academic_year_id', targetYearId);

    if (error) throw error;

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/students');
    
    return { success: true };
  } catch (err: any) {
    console.error('Bulk archive students error:', err);
    return { success: false, error: err?.message || 'Unknown error occurred' };
  }
}

export async function bulkTransferClass(studentIds: string[], newClassId: string, academicYearId: string) {
  try {
    const { requirePrincipal } = await import('@/lib/auth-server');
    await requirePrincipal();
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    let targetYearId = academicYearId;
    if (!targetYearId || targetYearId === 'fetch-active') {
      const { data: yearData } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (yearData) targetYearId = yearData.id;
    }

    if (!targetYearId) return { success: false, error: 'No active academic year found.' };

    const { data: rpcRes, error } = await supabase.rpc('batch_reassign_class_atomic', {
      p_student_ids: studentIds,
      p_target_class_id: newClassId,
      p_academic_year_id: targetYearId
    });

    if (error) throw error;

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/students');
    revalidatePath('/homeroom');
    revalidatePath('/students');
    revalidatePath('/classes/info');
    
    return { success: true, count: rpcRes?.reassigned_count || studentIds.length };
  } catch (err: any) {
    console.error('Bulk transfer class error:', err);
    return { success: false, error: err?.message || 'Unknown error occurred' };
  }
}

export async function bulkUpdateStudentStatus(studentIds: string[], status: string, academicYearId: string) {
  try {
    const { requirePrincipal } = await import('@/lib/auth-server');
    const { profile, role } = await requirePrincipal();
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    let targetYearId = academicYearId;
    if (!targetYearId || targetYearId === 'fetch-active') {
      const { data: yearData } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (yearData) targetYearId = yearData.id;
    }

    if (!targetYearId) return { success: false, error: 'No active academic year found.' };

    // Principal boundary enforcement
    if (role === 'principal' && profile.school_id) {
      const { data: currentEnrollments } = await supabase
        .from('student_enrollments')
        .select('student_id, classes!inner(school_id)')
        .in('student_id', studentIds)
        .eq('academic_year_id', targetYearId);

      const hasForeignStudent = (currentEnrollments || []).some(
        (e: any) => e.classes?.school_id && e.classes.school_id !== profile.school_id
      );

      if (hasForeignStudent) {
        return { success: false, error: 'Forbidden: Cannot modify students belonging to another school institution.' };
      }
    }

    // 1. Update student_enrollments
    const { error: enrollError } = await supabase
      .from('student_enrollments')
      .update({
        enrollment_status: status,
        updated_at: new Date().toISOString()
      })
      .in('student_id', studentIds)
      .eq('academic_year_id', targetYearId);

    if (enrollError) throw enrollError;

    // 2. Synchronize students table active state
    const isActive = (status === 'active' || status === 'enrolled');
    const { error: studentError } = await supabase
      .from('students')
      .update({
        is_active: isActive,
        enrollment_status: status,
        updated_at: new Date().toISOString()
      })
      .in('id', studentIds);

    if (studentError) throw studentError;

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/students');
    revalidatePath('/students');
    revalidatePath('/homeroom');
    
    return { success: true };
  } catch (err: any) {
    console.error('Bulk update status error:', err);
    return { success: false, error: err?.message || 'Unknown error occurred' };
  }
}
