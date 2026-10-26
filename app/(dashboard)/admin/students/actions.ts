'use server';

import { createClient } from '@/lib/supabase/server';
import { getServerAuth, requireRole } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';
import { AdminUpdateStudentSchema, type AdminUpdateStudentPayload } from './student-edit-schema';
import { normalizeBasicRegistrationRows } from '@/lib/students/basic-registration';
import type { AdminStudentRow } from '@/lib/students/admin-workspace';

export async function fetchExportData(filters: { q?: string, class?: string, teacher?: string, gender?: string, desk?: string }) {
  const { user, profile, role } = await getServerAuth();
  
  if (!user || !profile || (role !== 'admin' && role !== 'principal')) {
    return { success: false, error: 'Unauthorized: Admin access required.' };
  }

  const supabase = await createClient();

  if (role === 'admin') {
    if (!profile.is_active || !profile.school_id) return { success: false, error: 'Active school-scoped Admin required.' };
    const { data: year, error: yearError } = await supabase.from('academic_years').select('id').eq('school_id',profile.school_id).eq('is_active',true).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle();
    if (yearError || !year) return { success: false, error: yearError?.message || 'No active academic year' };
    const exported: AdminStudentRow[] = [];
    let expected = 0;
    for (let page = 1; page <= 20; page++) {
      const unassigned = filters.class === 'unassigned' || filters.class === 'គ្មានថ្នាក់';
      const { data,error } = await supabase.rpc('admin_student_directory',{
        p_year:year.id,p_class:filters.class && filters.class!=='all' && !unassigned ? filters.class : null,
        p_search:filters.q || '',p_unassigned:unassigned,p_gender:filters.gender || 'all',p_desk:filters.desk || 'all',p_teacher:filters.teacher || 'all',p_page:page,p_page_size:500,
      });
      if (error || !data || !Array.isArray(data.rows)) return { success: false, error: error?.message || 'Export query failed' };
      expected = Number(data.filtered_total); exported.push(...data.rows);
      if (exported.length >= expected) break;
    }
    if (exported.length !== expected || new Set(exported.map(row => row.id)).size !== expected) return { success: false, error: 'Roster changed during export or exceeds 10,000 rows. Please retry or filter by class.' };
    return { success: true, data: exported };
  }

  // Scope to Active Academic Year as Single Source of Truth
  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let query = supabase.from('active_class_rosters').select('*');

  if (activeYear?.id) {
    query = query.eq('academic_year_id', activeYear.id);
  }

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
    student_id_number?: string | null;
    full_name: string; 
    gender: string; 
    class_id: string; 
    status: string; 
  }>;
  academic_year_id: string;
}) {
  try {
    const { requirePrincipal } = await import('@/lib/auth-server');
    await requirePrincipal();
    const records = normalizeBasicRegistrationRows(payload.records);
    const adminSupabase = await createClient();

    const { data, error } = await adminSupabase.rpc('bulk_quick_register_students', {
      student_records: records,
      target_year_id: payload.academic_year_id,
    });

    if (error) {
      console.error('Admin basic register error:', error);
      return { success: false, error: error.message };
    }
    if (!data?.success) return { success: false, error: 'ការចុះឈ្មោះបរាជ័យ។ សូមព្យាយាមម្តងទៀត។' };

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
    const { profile } = await requirePrincipal();
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    let targetYearId = academicYearId;
    if (!targetYearId || targetYearId === 'fetch-active') {
      const { data: yearData } = await supabase
        .from('academic_years')
        .select('id')
        .eq('school_id', profile.school_id)
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
    if (!rpcRes?.success) throw new Error('Class assignment was not confirmed');

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/students');
    revalidatePath('/students');
    revalidatePath('/classes/info');

    return { success: true, count: Number(rpcRes.reassigned_count), classIds: [targetClassId,...(Array.isArray(rpcRes.source_class_ids) ? rpcRes.source_class_ids : [])] as string[] };
  } catch (err: any) {
    console.error('Bulk assign class error:', err);
    return { success: false, error: err.message || 'Unknown error occurred' };
  }
}

export async function batchRegisterBasicStudents(studentsData: any[], academicYearId: string) {
  try {
    const { requirePrincipal } = await import('@/lib/auth-server');
    await requirePrincipal();
    const supabase = await createClient();

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
        student_id_number: s.student_id_number ?? s.student_id ?? null,
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
      p_students: normalizeBasicRegistrationRows(cleanData, false),
      p_academic_year_id: targetYearId,
    });

    if (error) {
      console.error('Batch register atomic error:', error);
      return { success: false, error: error.message };
    }
    if (!data?.success) return { success: false, error: 'ការចុះឈ្មោះបរាជ័យ។ សូមព្យាយាមម្តងទៀត។' };

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/students');
    revalidatePath('/admin/students', 'page');
    revalidatePath('/homeroom');
    revalidatePath('/homeroom/profiling');
    revalidatePath('/classes');

    return { success: true, count: data.count };
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

// ============================================================================
// ADMIN STUDENT PROFILE EDITING ACTION
// ============================================================================

export async function updateAdminStudentProfileAction(payload: AdminUpdateStudentPayload) {
  try {
    // 1. Authoritative Role Verification (Admin Only)
    const { user, profile, role } = await getServerAuth();
    if (!user || !profile || role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin privileges required.' };
    }

    // 2. Strict Payload Validation
    const validationResult = AdminUpdateStudentSchema.safeParse(payload);
    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      return {
        success: false,
        error: firstIssue ? `${firstIssue.message}` : 'ទិន្នន័យមិនត្រឹមត្រូវ (Invalid input data)',
      };
    }

    const validated = validationResult.data;
    const cleanIdNumber = validated.student_id_number;
    const cleanFullName = validated.full_name.trim();
    const normalizedGender = (validated.gender === 'ស្រី' || validated.gender === 'F') ? 'F' : 'M';

    const supabase = await createClient();

    // 3. Verify Target Student Exists
    const { data: currentStudent, error: findError } = await supabase
      .from('students')
      .select('id, student_id_number, full_name, photo_url')
      .eq('id', validated.studentId)
      .maybeSingle();

    if (findError || !currentStudent) {
      return { success: false, error: 'រកមិនឃើញទិន្នន័យសិស្សនៅក្នុងប្រព័ន្ធទេ (Student not found).' };
    }

    if (currentStudent.student_id_number?.trim() && !cleanIdNumber) {
      return { success: false, error: 'មិនអាចលុបអត្តលេខដែលបានកំណត់រួចទេ។ សូមរក្សាអត្តលេខចាស់ ឬបញ្ចូលអត្តលេខថ្មី។' };
    }

    // 4. Duplicate Check: Ensure student_id_number is not assigned to another student
    const { data: conflictStudent, error: conflictErr } = cleanIdNumber ? await supabase
      .from('students')
      .select('id, full_name')
      .eq('student_id_number', cleanIdNumber)
      .neq('id', validated.studentId)
      .maybeSingle() : { data: null, error: null };

    if (conflictErr) {
      console.error('Duplicate student_id_number check error:', conflictErr);
      return { success: false, error: 'មិនអាចពិនិត្យអត្តលេខស្ទួនបានទេ។ សូមព្យាយាមម្តងទៀត។' };
    }

    if (conflictStudent) {
      return {
        success: false,
        error: `អត្តលេខសិស្ស "${cleanIdNumber}" ត្រូវបានប្រើប្រាស់រួចហើយដោយសិស្ស ${conflictStudent.full_name}។ សូមពិនិត្យម្តងទៀត។`,
      };
    }

    // 5. Build Explicit Column Allowlist for public.students
    const studentUpdates: Record<string, any> = {
      full_name: cleanFullName,
      student_id_number: cleanIdNumber,
      english_name: validated.english_name ? validated.english_name.trim() : null,
      gender: normalizedGender,
      dob: validated.dob,
      date_of_birth: validated.dob,
      photo_url: validated.photo_url && validated.photo_url.trim().length > 0 ? validated.photo_url.trim() : null,
      parent_phone: validated.parent_phone ? validated.parent_phone.trim() : null,
      emergency_contact_phone: validated.emergency_contact_phone ? validated.emergency_contact_phone.trim() : null,
      father_name: validated.father_name ? validated.father_name.trim() : null,
      father_job: validated.father_job ? validated.father_job.trim() : null,
      father_phone: validated.father_phone ? validated.father_phone.trim() : null,
      mother_name: validated.mother_name ? validated.mother_name.trim() : null,
      mother_job: validated.mother_job ? validated.mother_job.trim() : null,
      mother_phone: validated.mother_phone ? validated.mother_phone.trim() : null,
      guardian_name: validated.guardian_name ? validated.guardian_name.trim() : null,
      guardian_job: validated.guardian_job ? validated.guardian_job.trim() : null,
      guardian_phone: validated.guardian_phone ? validated.guardian_phone.trim() : null,
      current_address: validated.current_address ? validated.current_address.trim() : null,
      address: validated.current_address ? validated.current_address.trim() : null,
      status: validated.status || null,
      scholarship: validated.scholarship || null,
      id_poor: validated.id_poor || null,
      orphan: validated.orphan || null,
      distance_km: validated.distance_km !== undefined && validated.distance_km !== null ? Number(validated.distance_km) : null,
      disability: validated.disability || null,
      special_needs_status: validated.special_needs_status ? validated.special_needs_status.trim() : null,
      updated_at: new Date().toISOString(),
    };

    // 6. Execute Canonical Update on public.students
    const { data: updatedStudent, error: updateError } = await supabase
      .from('students')
      .update(studentUpdates)
      .eq('id', validated.studentId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === '23505') {
        return {
          success: false,
          error: `អត្តលេខសិស្ស "${cleanIdNumber}" មានភាពជាន់គ្នាជាមួយសិស្សផ្សេងទៀតក្នុងប្រព័ន្ធ។`,
        };
      }
      return {
        success: false,
        error: `បរាជ័យក្នុងការកែប្រែទិន្នន័យ៖ ${updateError.message}`,
      };
    }

    // 7. Update Enrollment-Specific Seating (desk_number, room_number) for Active Academic Year
    let targetYearId = validated.academic_year_id;
    if (!targetYearId) {
      const { data: activeYear } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      targetYearId = activeYear?.id;
    }

    let enrollmentUpdated = false;
    if (targetYearId && (validated.desk_number !== undefined || validated.room_number !== undefined)) {
      const enrollmentUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (validated.desk_number !== undefined) {
        enrollmentUpdates.desk_number = validated.desk_number ? validated.desk_number.trim() : null;
      }
      if (validated.room_number !== undefined) {
        enrollmentUpdates.room_number = validated.room_number ? validated.room_number.trim() : null;
      }

      const { error: enrollErr } = await supabase
        .from('student_enrollments')
        .update(enrollmentUpdates)
        .eq('student_id', validated.studentId)
        .eq('academic_year_id', targetYearId);

      if (!enrollErr) {
        enrollmentUpdated = true;
      } else {
        console.warn('Enrollment seating update warning:', enrollErr.message);
      }
    }

    // 8. Structured Audit Logging
    const changedFieldKeys = Object.keys(studentUpdates).filter((k) => k !== 'updated_at');
    if (enrollmentUpdated) {
      if (validated.desk_number !== undefined) changedFieldKeys.push('desk_number');
      if (validated.room_number !== undefined) changedFieldKeys.push('room_number');
    }

    try {
      await supabase.from('audit_logs').insert([{
        action: `បានកែសម្រួលព័ត៌មានផ្ទាល់ខ្លួនរបស់សិស្ស៖ ${cleanFullName} (${cleanIdNumber})`,
        type: 'info',
        user_id: user.id,
        school_id: profile.school_id,
        target_table: 'students',
        record_id: validated.studentId,
        details: {
          student_id: validated.studentId,
          student_name: cleanFullName,
          student_id_number: cleanIdNumber,
          updated_fields: changedFieldKeys,
        },
        status: 'success',
      }]);
    } catch (auditErr) {
      console.warn('Audit logging warning:', auditErr);
    }

    // 9. Revalidate Server Pages & Scoped Client Cache
    try {
      revalidatePath('/admin/students');
    } catch (revalErr) {
      console.warn('revalidatePath warning for /admin/students:', revalErr);
    }

    return {
      success: true,
      student: {
        ...updatedStudent,
        latin_name: updatedStudent.english_name || null,
        desk_number: validated.desk_number ?? null,
        room_number: validated.room_number ?? null,
      },
    };
  } catch (err: any) {
    console.error('updateAdminStudentProfileAction error:', err);
    return {
      success: false,
      error: err?.message || 'មានបញ្ហាមិនរំពឹងទុកក្នុងការកែប្រែព័ត៌មានសិស្ស',
    };
  }
}
