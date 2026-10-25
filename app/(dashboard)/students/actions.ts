'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { formatKhmerAddress } from './types';

const StudentSchema = z.object({
  id: z.string().optional(),
  class_id: z.string().optional(),
  academic_year_id: z.string().optional(),
  student_id_number: z.string().optional(),
  full_name: z.string().optional(),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  age: z.coerce.number().optional(),
  birth_cert_no: z.string().optional(),
  status: z.string().optional(),
  scholarship: z.string().optional(),
  id_poor: z.string().optional(),
  orphan: z.string().optional(),
  indigenous: z.string().optional(),
  distance_km: z.coerce.number().optional(),
  weight_kg: z.coerce.number().optional(),
  height_m: z.coerce.number().optional(),
  bmi: z.coerce.number().optional(),
  nutrition_status: z.string().optional(),
  disability: z.string().optional(),
  assistive_device: z.string().optional(),
  health_issues: z.string().optional(),
  father_name: z.string().optional(),
  father_job: z.string().optional(),
  father_phone: z.string().optional(),
  mother_name: z.string().optional(),
  mother_job: z.string().optional(),
  mother_phone: z.string().optional(),
  guardian_name: z.string().optional(),
  guardian_job: z.string().optional(),
  guardian_phone: z.string().optional(),
  siblings_count: z.coerce.number().optional(),
  migrant_status: z.string().optional(),
  domestic_violence: z.string().optional(),
  housing: z.string().optional(),
  income: z.coerce.number().optional(),
  address: z.string().optional(),
  desk_number: z.string().optional(),
  room_number: z.string().optional(),
  student_phone: z.string().optional(),
  parent_phone: z.string().optional(),
  current_status: z.string().optional(),
  enrollment_status: z.string().optional(),
  is_active: z.boolean().optional(),
}).passthrough();

export type SaveStudentPayload = z.infer<typeof StudentSchema>;

export async function saveStudentAction(payload: SaveStudentPayload) {
  try {
    const validatedPayload = StudentSchema.parse(payload);
    
    const { getServerAuth, requireClassAccess, requireAdmin, requireStudentAccess } = await import('@/lib/auth-server');
    const { user, profile, role } = await getServerAuth();
    if (!user || !profile || !role) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    if (!['admin', 'principal', 'teacher'].includes(role)) {
      return { success: false, error: 'Forbidden: Insufficient role privileges.' };
    }

    if (validatedPayload.class_id) {
      await requireClassAccess(validatedPayload.class_id);
    } else {
      await requireAdmin();
    }

    const isExistingId = Boolean(
      validatedPayload.id &&
      validatedPayload.id.length > 20 &&
      !validatedPayload.id.startsWith('std-') &&
      !validatedPayload.id.startsWith('mock-')
    );

    // CRITICAL SECURITY RULE: Homeroom teachers can NEVER create new students directly!
    if (!isExistingId && role === 'teacher') {
      return {
        success: false,
        error: 'សិទ្ធិមិនគ្រប់គ្រាន់៖ គ្រូបន្ទុកថ្នាក់មិនអាចបញ្ជូលសិស្សថ្មីដោយផ្ទាល់បានទេ។ សូមដាក់ពាក្យស្នើសុំផ្ទេរចូល ឬទាក់ទងរដ្ឋបាលសាលា (Admin)។',
      };
    }

    // Target student authorization check: verify caller owns or has authority over this student
    if (isExistingId && validatedPayload.id) {
      await requireStudentAccess(validatedPayload.id, validatedPayload.class_id);
    }

    const supabase = createAdminClient();

    // Prevent duplicate student_id_number collisions across schools
    if (validatedPayload.student_id_number && !isExistingId) {
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id, student_enrollments(class_id, classes(school_id, teacher_id))')
        .eq('student_id_number', validatedPayload.student_id_number)
        .maybeSingle();

      if (existingStudent) {
        const enrollments = (existingStudent.student_enrollments as any[]) || [];
        const belongsToDifferentSchool = enrollments.some(
          (e) => e.classes?.school_id && e.classes.school_id !== profile.school_id
        );
        if (role !== 'admin' && belongsToDifferentSchool) {
          return {
            success: false,
            error: 'Student ID number is already registered at another school institution.',
          };
        }
        if (role === 'teacher') {
          const isTeacherClass = enrollments.some(
            (e) => e.classes?.teacher_id === user.id || e.class_id === validatedPayload.class_id
          );
          if (!isTeacherClass) {
            return {
              success: false,
              error: 'Forbidden: You do not have permission to modify this student in another class.',
            };
          }
        }
      }
    }


    const normalizedGender = validatedPayload.gender === 'F' || validatedPayload.gender === 'ស្រី' ? 'F' : 'M';
    const status = validatedPayload.status === 'repeater' ? 'repeater' : validatedPayload.status === 'transfer' ? 'transfer' : 'new';
    const scholarship = validatedPayload.scholarship === 'yes' ? 'yes' : 'no';
    const idPoor = validatedPayload.id_poor === 'level_1' ? 'level_1' : validatedPayload.id_poor === 'level_2' ? 'level_2' : 'none';
    const orphan = validatedPayload.orphan === 'yes' ? 'yes' : 'no';
    const disability = validatedPayload.disability === 'mild' ? 'mild' : validatedPayload.disability === 'severe' ? 'severe' : 'none';
    const enrollmentStatus = validatedPayload.current_status || validatedPayload.enrollment_status || 'active';
    const isActive = enrollmentStatus === 'active';

    // Calculate BMI & Nutrition Status if weight and height are provided
    let calculatedBmi = validatedPayload.bmi ? Number(validatedPayload.bmi) : null;
    let nutritionStatus = validatedPayload.nutrition_status || null;
    if (validatedPayload.weight_kg && validatedPayload.height_m && validatedPayload.height_m > 0) {
      calculatedBmi = parseFloat((Number(validatedPayload.weight_kg) / (Number(validatedPayload.height_m) * Number(validatedPayload.height_m))).toFixed(1));
      if (calculatedBmi < 18.5) nutritionStatus = 'ស្គម';
      else if (calculatedBmi >= 25 && calculatedBmi < 30) nutritionStatus = 'លើសទម្ងន់';
      else if (calculatedBmi >= 30) nutritionStatus = 'ធាត់';
      else nutritionStatus = 'ធម្មតា';
    }

    const healthNotes = validatedPayload.health_issues || null;

    // Use progressive updating: only overwrite fields if they are explicitly sent as non-empty in the payload
    // or if they are required core fields.
    const dbRecord: Record<string, any> = {
      full_name: validatedPayload.full_name,
      student_id_number: validatedPayload.student_id_number,
      gender: normalizedGender,
      status,
      enrollment_status: enrollmentStatus,
      is_active: isActive,
    };

    if (validatedPayload.date_of_birth !== undefined) dbRecord.dob = validatedPayload.date_of_birth || null;
    if (validatedPayload.age !== undefined) dbRecord.age = validatedPayload.age ? Number(validatedPayload.age) : null;
    if (validatedPayload.scholarship !== undefined) dbRecord.scholarship = scholarship;
    if (validatedPayload.id_poor !== undefined) dbRecord.id_poor = idPoor;
    if (validatedPayload.orphan !== undefined) dbRecord.orphan = orphan;
    if (validatedPayload.distance_km !== undefined) dbRecord.distance_km = validatedPayload.distance_km ? Number(validatedPayload.distance_km) : null;
    if (validatedPayload.weight_kg !== undefined) dbRecord.weight_kg = validatedPayload.weight_kg ? Number(validatedPayload.weight_kg) : null;
    if (validatedPayload.height_m !== undefined) dbRecord.height_m = validatedPayload.height_m ? Number(validatedPayload.height_m) : null;
    if (calculatedBmi !== null) dbRecord.bmi = calculatedBmi;
    if (nutritionStatus !== null) dbRecord.nutrition_status = nutritionStatus;
    if (validatedPayload.disability !== undefined) dbRecord.disability = disability;
    if (validatedPayload.assistive_device !== undefined) dbRecord.assistive_device = validatedPayload.assistive_device || null;
    if (healthNotes !== null) dbRecord.health_note = healthNotes;
    if (validatedPayload.siblings_count !== undefined) dbRecord.siblings_count = validatedPayload.siblings_count ? Number(validatedPayload.siblings_count) : 0;
    if (validatedPayload.income !== undefined) dbRecord.income = validatedPayload.income ? Number(validatedPayload.income) : null;
    if (validatedPayload.address !== undefined) dbRecord.current_address = validatedPayload.address || null;
    if (validatedPayload.father_name !== undefined) dbRecord.father_name = validatedPayload.father_name || null;
    if (validatedPayload.father_job !== undefined) dbRecord.father_job = validatedPayload.father_job || null;
    if (validatedPayload.mother_name !== undefined) dbRecord.mother_name = validatedPayload.mother_name || null;
    if (validatedPayload.mother_job !== undefined) dbRecord.mother_job = validatedPayload.mother_job || null;
    if (validatedPayload.guardian_name !== undefined) dbRecord.guardian_name = validatedPayload.guardian_name || null;
    if (validatedPayload.guardian_job !== undefined) dbRecord.guardian_job = validatedPayload.guardian_job || null;
    if (validatedPayload.parent_phone || validatedPayload.father_phone || validatedPayload.mother_phone || validatedPayload.guardian_phone) {
      dbRecord.parent_phone = validatedPayload.parent_phone || validatedPayload.father_phone || validatedPayload.mother_phone || validatedPayload.guardian_phone || null;
    }
    if (validatedPayload.father_phone !== undefined) dbRecord.father_phone = validatedPayload.father_phone || null;
    if (validatedPayload.mother_phone !== undefined) dbRecord.mother_phone = validatedPayload.mother_phone || null;
    if (validatedPayload.guardian_phone !== undefined) dbRecord.guardian_phone = validatedPayload.guardian_phone || null;
    if (validatedPayload.birth_cert_no !== undefined) dbRecord.birth_cert_no = validatedPayload.birth_cert_no || null;
    if (validatedPayload.migrant_status !== undefined) dbRecord.migrant_status = validatedPayload.migrant_status || null;
    const rawPhoto = (validatedPayload as any).photo_url;
    if (rawPhoto !== undefined) {
      dbRecord.photo_url = typeof rawPhoto === 'string' && rawPhoto.trim().length > 0 
        ? rawPhoto.trim() 
        : null;
    }

    // Resolve academic_year_id if not explicitly provided
    let targetYearId = validatedPayload.academic_year_id;
    if (!targetYearId && validatedPayload.class_id) {
      const { data: classData } = await supabase
        .from('classes')
        .select('academic_year_id')
        .eq('id', validatedPayload.class_id)
        .maybeSingle();
      targetYearId = classData?.academic_year_id;
    }
    if (!targetYearId) {
      const { data: activeYear } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      targetYearId = activeYear?.id;
    }

    if (!targetYearId) {
      return { success: false, error: 'Target academic year could not be resolved.' };
    }

    if (!validatedPayload.class_id) {
      return { success: false, error: 'Target class ID is required.' };
    }

    // Prepare health payload if entered
    let healthPayload: Record<string, any> | null = null;
    if (validatedPayload.weight_kg || validatedPayload.height_m || healthNotes || validatedPayload.assistive_device) {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' }).format(new Date());
      const heightCm = validatedPayload.height_m ? Math.round(Number(validatedPayload.height_m) * 100) : null;
      let vision = '6/6';
      if (validatedPayload.assistive_device === 'glasses' || healthNotes?.includes('ភ្នែក')) {
        vision = '6/12';
      }
      let hearing = 'ធម្មតា';
      if (validatedPayload.assistive_device === 'hearing_aid' || healthNotes?.includes('ស្តាប់')) {
        hearing = 'ខ្សោយ';
      }

      healthPayload = {
        recorded_date: today,
        weight_kg: validatedPayload.weight_kg ? Number(validatedPayload.weight_kg) : null,
        height_cm: heightCm,
        bmi: calculatedBmi,
        vision_left: vision,
        vision_right: vision,
        hearing: hearing,
        dental: 'ធម្មតា',
        notes: healthNotes || '',
      };
    }

    // Atomically save student, enrollment, and health record in a single transaction
    const { data: atomicResult, error: atomicError } = await supabase.rpc('save_student_atomic', {
      p_student: dbRecord,
      p_class_id: validatedPayload.class_id,
      p_academic_year_id: targetYearId,
      p_health: healthPayload,
      p_caller_id: user.id,
    });

    if (atomicError || !atomicResult?.success) {
      console.error('save_student_atomic error:', atomicError?.message);
      return {
        success: false,
        error: atomicError?.message || 'Failed to save student record atomically.',
      };
    }

    // Ensure photo_url is persisted to public.students
    const targetStudentId = atomicResult.student_id;
    if (rawPhoto !== undefined && targetStudentId) {
      const photoUrlToSave = typeof rawPhoto === 'string' && rawPhoto.trim().length > 0
        ? rawPhoto.trim()
        : null;
      await supabase
        .from('students')
        .update({ photo_url: photoUrlToSave, updated_at: new Date().toISOString() })
        .eq('id', targetStudentId);
      dbRecord.photo_url = photoUrlToSave;
    }

    const savedStudent = { ...payload, ...dbRecord, id: targetStudentId };

    revalidatePath('/students');
    revalidatePath('/homeroom/student-study-plans');
    revalidatePath('/homeroom/profiling');
    revalidatePath('/homeroom');
    revalidatePath('/health');
    revalidatePath('/classes/info');

    return { success: true, student: savedStudent };
  } catch (err: any) {
    console.error('Save student action caught error:', err?.message);
    return { success: false, error: err?.message || 'Unknown error occurred while saving student' };
  }
}

export async function bulkQuickRegisterAction(payload: {
  records: Array<{ 
    student_id_number: string; 
    full_name: string; 
    gender: string; 
    class_id: string; 
    status: string; 
    dob?: string | null;
    address?: string | null;
    father_name?: string | null;
    father_job?: string | null;
    father_phone?: string | null;
    mother_name?: string | null;
    mother_job?: string | null;
    mother_phone?: string | null;
  }>;
  academic_year_id: string;
}) {
  try {
    if (!payload?.records || !Array.isArray(payload.records) || payload.records.length === 0) {
      return { success: false, error: 'No student records provided for registration.' };
    }

    if (!payload.academic_year_id) {
      return { success: false, error: 'Target academic year ID is required.' };
    }

    // Security Guard: Verify every single record has a valid class_id
    for (const r of payload.records) {
      if (!r.class_id) {
        return { success: false, error: 'All student records must have an assigned class_id.' };
      }
    }

    const { requirePrincipal, requireClassAccess } = await import('@/lib/auth-server');
    const { user } = await requirePrincipal(); // Only admins and principals can register new students

    // Security Guard: Verify access to all unique class_ids in the payload
    const uniqueClassIds = Array.from(new Set(payload.records.map((r) => r.class_id)));
    for (const classId of uniqueClassIds) {
      await requireClassAccess(classId);
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc('bulk_quick_register_students', {
      student_records: payload.records,
      target_year_id: payload.academic_year_id,
      admin_user_id: user?.id
    });

    if (error) {
      console.error('Bulk quick register error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/students');
    revalidatePath('/classes/info');
    return { success: true, count: data?.count || 0 };
  } catch (err: any) {
    console.error('Bulk register action caught error:', err?.message);
    return { success: false, error: err?.message || 'Unknown error occurred' };
  }
}

export async function updateStudentStatusAction(payload: {
  student_id: string;
  action_type: string;
  action_date: string;
  reason?: string;
  class_id?: string;
}) {
  try {
    const { getServerAuth, requireStudentAccess } = await import('@/lib/auth-server');
    const { user, profile, role } = await getServerAuth();
    if (!user || !profile || !role) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    if (!['admin', 'principal', 'teacher'].includes(role)) {
      return { success: false, error: 'Forbidden: Insufficient privileges.' };
    }

    await requireStudentAccess(payload.student_id, payload.class_id);

    const supabase = createAdminClient();

    let newStatus = 'dropout';
    let enrollmentStatus = 'dropped_out';
    if (payload.action_type === 'ផ្ទេរចេញ' || payload.action_type === 'transfer') {
      newStatus = 'transfer';
      enrollmentStatus = 'transferred_out';
    } else if (payload.action_type === 'មរណភាព' || payload.action_type === 'deceased') {
      newStatus = 'deceased';
      enrollmentStatus = 'dropped_out';
    }

    const noteDetails = `មូលហេតុ: ${payload.reason || 'មិនបានបញ្ជាក់'} | កាលបរិច្ឆេទ: ${payload.action_date} | ដោយ: ${profile.full_name || profile.username}`;

    // 1. Update students table
    const { error: studentError } = await supabase
      .from('students')
      .update({
        enrollment_status: newStatus,
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.student_id);

    if (studentError) {
      return { success: false, error: studentError.message };
    }

    // 2. Update active enrollment in student_enrollments
    let enrollQuery = supabase
      .from('student_enrollments')
      .update({
        enrollment_status: enrollmentStatus,
        notes: noteDetails,
        updated_at: new Date().toISOString(),
      })
      .eq('student_id', payload.student_id)
      .eq('enrollment_status', 'active');

    if (payload.class_id) {
      enrollQuery = enrollQuery.eq('class_id', payload.class_id);
    }

    await enrollQuery;

    // 3. Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'UPDATE_STUDENT_STATUS',
      target_table: 'students',
      record_id: payload.student_id,
      details: {
        action_type: payload.action_type,
        action_date: payload.action_date,
        reason: payload.reason,
        class_id: payload.class_id,
      },
    });

    revalidatePath('/students');
    revalidatePath('/homeroom');
    revalidatePath('/admin/students');
    return { success: true };
  } catch (err: any) {
    console.error('updateStudentStatusAction error:', err);
    return { success: false, error: err?.message || 'Unknown error occurred while updating status' };
  }
}

export async function fetchStudentTransferHistoryAction(classId: string) {
  try {
    const { getServerAuth, requireClassAccess } = await import('@/lib/auth-server');
    await getServerAuth();
    await requireClassAccess(classId);

    const supabase = createAdminClient();
    const { data: records, error } = await supabase
      .from('student_enrollments')
      .select('id, student_id, enrollment_status, notes, updated_at, students(student_id_number, full_name, gender)')
      .eq('class_id', classId)
      .in('enrollment_status', ['transferred_out', 'dropped_out', 'suspended'])
      .order('updated_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const history = (records || []).map((r) => {
      const student = (r.students as any) || {};
      let statusLabel = 'ផ្ទេរចេញ';
      if (r.enrollment_status === 'dropped_out') statusLabel = 'បោះបង់ការសិក្សា';
      else if (r.enrollment_status === 'suspended') statusLabel = 'ផ្អាកការសិក្សា';

      return {
        id: r.id,
        student_id: r.student_id,
        student_id_number: student.student_id_number || '-',
        full_name: student.full_name || 'Unknown',
        status: statusLabel,
        date: r.updated_at ? r.updated_at.split('T')[0] : '-',
        reason: r.notes || '-',
      };
    });

    return { success: true, history };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch transfer history' };
  }
}

export async function submitStudentStatusRequestAction(payload: {
  request_type: 'transfer_in' | 'transfer_out' | 'dropout';
  class_id: string;
  student_id?: string;
  student_name?: string;
  gender?: string;
  date_of_birth?: string;
  reason: string;
  effective_date: string;
  details?: Record<string, any>;
}) {
  try {
    const { getServerAuth, requireClassAccess } = await import('@/lib/auth-server');
    const { user, profile, role } = await getServerAuth();
    if (!user || !profile || !role) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    if (!payload.class_id) {
      return { success: false, error: 'Class ID is required.' };
    }

    await requireClassAccess(payload.class_id);

    // Validate based on request_type
    if (payload.request_type === 'transfer_in') {
      if (!payload.student_name || !payload.student_name.trim()) {
        return { success: false, error: 'សូមបញ្ចូលឈ្មោះសិស្សផ្ទេរចូល។' };
      }
    } else if (payload.request_type === 'transfer_out' || payload.request_type === 'dropout') {
      if (!payload.student_id) {
        return { success: false, error: 'សូមជ្រើសរើសសិស្សដែលត្រូវស្នើសុំ។' };
      }
    }

    const supabase = createAdminClient();

    // If transfer_out or dropout, fetch student name & gender from students table
    let sName = payload.student_name || '';
    let sGender = payload.gender || 'M';
    let sDob = payload.date_of_birth || null;
    if (payload.student_id) {
      const { data: std } = await supabase
        .from('students')
        .select('full_name, gender, dob')
        .eq('id', payload.student_id)
        .maybeSingle();
      if (std) {
        sName = std.full_name || sName;
        sGender = std.gender || sGender;
        sDob = std.dob || sDob;
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from('student_requests')
      .insert({
        request_type: payload.request_type,
        class_id: payload.class_id,
        student_id: payload.student_id || null,
        student_name: sName,
        gender: sGender,
        date_of_birth: sDob,
        reason: payload.reason || '',
        effective_date: payload.effective_date || new Date().toISOString().split('T')[0],
        details: payload.details || {},
        requested_by: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('submitStudentStatusRequestAction insert error:', insertError);
      return { success: false, error: insertError.message };
    }

    revalidatePath('/students');
    revalidatePath('/homeroom');
    revalidatePath('/admin/students');

    return { success: true, request: inserted };
  } catch (err: any) {
    console.error('submitStudentStatusRequestAction error:', err);
    return { success: false, error: err?.message || 'Failed to submit student request.' };
  }
}

export async function fetchClassStudentRequestsAction(classId: string) {
  try {
    const { getServerAuth, requireClassAccess } = await import('@/lib/auth-server');
    await getServerAuth();
    await requireClassAccess(classId);

    const supabase = createAdminClient();
    const { data: requests, error } = await supabase
      .from('student_requests')
      .select('id, request_type, student_name, gender, date_of_birth, status, reason, effective_date, admin_notes, created_at, reviewed_at, student_id, student:students(student_id_number, full_name)')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, requests: requests || [] };
  } catch (err: any) {
    console.error('fetchClassStudentRequestsAction error:', err);
    return { success: false, error: err?.message || 'Failed to fetch student requests' };
  }
}

export async function batchUpdateStudentProfilesAction(payload: {
  class_id: string;
  updates: Array<{
    id: string;
    desk_number?: string;
    room_number?: string;
    full_name?: string;
    english_name?: string;
    gender?: string;
    date_of_birth?: string;
    birth_cert_no?: string;
    student_phone?: string;
    parent_phone?: string;
    status?: 'new' | 'repeater' | 'transfer';
    prev_school?: string;
    indigenous?: 'yes' | 'no';
    scholarship?: 'yes' | 'no';
    id_poor?: 'none' | 'level_1' | 'level_2';
    orphan?: 'yes' | 'no';
    distance_km?: number;
    weight_kg?: number;
    height_m?: number;
    disability?: 'none' | 'mild' | 'severe';
    health_issues?: string;
    father_name?: string;
    father_job?: string;
    father_phone?: string;
    mother_name?: string;
    mother_job?: string;
    mother_phone?: string;
    guardian_name?: string;
    guardian_job?: string;
    guardian_phone?: string;
    siblings_count?: number;
    income?: number;
    address?: string;
    addr_village?: string;
    addr_commune?: string;
    addr_district?: string;
    addr_province?: string;
    migrant_status?: 'none' | 'parents' | 'student';
    housing?: string;
  }>;
}) {
  try {
    if (!payload?.class_id) {
      return { success: false, error: 'Target class ID is required.' };
    }

    if (!payload?.updates || !Array.isArray(payload.updates) || payload.updates.length === 0) {
      return { success: false, error: 'No student updates provided.' };
    }

    const { getServerAuth, requireClassAccess } = await import('@/lib/auth-server');
    const { user, profile, role } = await getServerAuth();
    if (!user || !profile || !role) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    // Security Gate: Ensure caller has legitimate authority over this class roster
    await requireClassAccess(payload.class_id);

    const supabase = createAdminClient();

    // Verify all target students belong to this class
    const { data: enrollments, error: enrolErr } = await supabase
      .from('student_enrollments')
      .select('student_id, academic_year_id')
      .eq('class_id', payload.class_id);

    if (enrolErr || !enrollments) {
      return { success: false, error: enrolErr?.message || 'Failed to verify class enrollment roster.' };
    }

    const validStudentMap = new Map<string, string>();
    for (const e of enrollments) {
      validStudentMap.set(e.student_id, e.academic_year_id);
    }

    for (const item of payload.updates) {
      if (!item.id || !validStudentMap.has(item.id)) {
        return {
          success: false,
          error: `Unauthorized mutation: Student ${item.id || 'unknown'} is not enrolled in class ${payload.class_id}.`
        };
      }
    }

    // Prepare normalized update items
    const preparedUpdates = payload.updates.map(item => {
      let currentAddress: string | undefined = undefined;
      if (item.address !== undefined) {
        currentAddress = item.address.trim() || undefined;
      } else if (item.addr_village || item.addr_commune || item.addr_district || item.addr_province) {
        const fullAddr = formatKhmerAddress(item.addr_village, item.addr_commune, item.addr_district, item.addr_province);
        if (fullAddr) currentAddress = fullAddr;
      }

      return {
        ...item,
        current_address: currentAddress,
      };
    });

    // 1. Primary execution path: Atomic Database RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('batch_update_student_profiles_atomic', {
      p_class_id: payload.class_id,
      p_updates: preparedUpdates,
      p_caller_id: user.id,
    });

    if (!rpcError && rpcData?.success) {
      revalidatePath('/students');
      revalidatePath('/homeroom');
      revalidatePath('/homeroom/student-study-plans');
      revalidatePath('/health');
      revalidatePath('/classes/info');
      return { 
        success: true, 
        count: rpcData.updated_count ?? preparedUpdates.length,
        executionMode: 'atomic_rpc'
      };
    }

    // If RPC failed due to an authorization or validation error, return immediately
    if (rpcError && rpcError.code !== 'PGRST202' && rpcError.code !== '42883') {
      console.error('[batchUpdateStudentProfilesAction] RPC error:', rpcError);
      return { success: false, error: rpcError.message || 'Atomic batch update failed.' };
    }

    // 2. Fallback progressive updates (if RPC function not yet deployed)
    console.warn('[batchUpdateStudentProfilesAction] RPC unavailable, falling back to safe sequential update loop');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' }).format(new Date());
    let updatedCount = 0;

    for (const item of preparedUpdates) {
      const studentFields: Record<string, any> = {};

      if (item.full_name !== undefined) studentFields.full_name = item.full_name.trim();
      if (item.english_name !== undefined) studentFields.english_name = item.english_name.trim() || null;
      if (item.gender !== undefined) {
        studentFields.gender = item.gender === 'F' || item.gender === 'ស្រី' ? 'F' : 'M';
      }
      if (item.date_of_birth !== undefined) studentFields.dob = item.date_of_birth || null;
      if (item.birth_cert_no !== undefined) studentFields.birth_cert_no = item.birth_cert_no.trim() || null;
      if (item.student_phone !== undefined) {
        studentFields.student_phone = item.student_phone.trim() || null;
      }
      if (item.status !== undefined) studentFields.status = item.status;
      if (item.prev_school !== undefined) studentFields.prev_school = item.prev_school.trim() || null;
      if (item.indigenous !== undefined) studentFields.indigenous = item.indigenous;
      if (item.scholarship !== undefined) studentFields.scholarship = item.scholarship === 'yes' ? 'yes' : 'no';
      if (item.id_poor !== undefined) studentFields.id_poor = item.id_poor;
      if (item.orphan !== undefined) studentFields.orphan = item.orphan === 'yes' ? 'yes' : 'no';
      if (item.distance_km !== undefined) studentFields.distance_km = item.distance_km ? Number(item.distance_km) : 0;
      if (item.disability !== undefined) studentFields.disability = item.disability;
      if (item.health_issues !== undefined) studentFields.health_note = item.health_issues.trim() || null;

      // BMI & nutrition calculation
      if (item.weight_kg !== undefined || item.height_m !== undefined) {
        const w = item.weight_kg !== undefined ? Number(item.weight_kg) : null;
        const h = item.height_m !== undefined ? Number(item.height_m) : null;
        if (w !== null) studentFields.weight_kg = w;
        if (h !== null) studentFields.height_m = h;
        if (w && h && h > 0) {
          const bmi = parseFloat((w / (h * h)).toFixed(1));
          studentFields.bmi = bmi;
          if (bmi < 18.5) studentFields.nutrition_status = 'ស្គម';
          else if (bmi >= 25 && bmi < 30) studentFields.nutrition_status = 'លើសទម្ងន់';
          else if (bmi >= 30) studentFields.nutrition_status = 'ធាត់';
          else studentFields.nutrition_status = 'ធម្មតា';
        }
      }

      if (item.father_name !== undefined) studentFields.father_name = item.father_name.trim() || null;
      if (item.father_job !== undefined) studentFields.father_job = item.father_job.trim() || null;
      if (item.father_phone !== undefined) studentFields.father_phone = item.father_phone.trim() || null;
      if (item.mother_name !== undefined) studentFields.mother_name = item.mother_name.trim() || null;
      if (item.mother_job !== undefined) studentFields.mother_job = item.mother_job.trim() || null;
      if (item.mother_phone !== undefined) studentFields.mother_phone = item.mother_phone.trim() || null;
      if (item.guardian_name !== undefined) studentFields.guardian_name = item.guardian_name.trim() || null;
      if (item.guardian_job !== undefined) studentFields.guardian_job = item.guardian_job.trim() || null;
      if (item.guardian_phone !== undefined) studentFields.guardian_phone = item.guardian_phone.trim() || null;

      // Parent phone: strictly father, mother, guardian, or explicit parent phone.
      // Priority 2: NEVER store student_phone as parent_phone!
      const parentContact = item.parent_phone?.trim() || item.father_phone?.trim() || item.mother_phone?.trim() || item.guardian_phone?.trim();
      if (parentContact) {
        studentFields.parent_phone = parentContact;
      }

      if (item.siblings_count !== undefined) studentFields.siblings_count = Number(item.siblings_count) || 0;
      if (item.income !== undefined) studentFields.income = Number(item.income) || 0;
      if (item.current_address !== undefined) studentFields.current_address = item.current_address;
      if (item.migrant_status !== undefined) studentFields.migrant_status = item.migrant_status || 'none';
      if (item.housing !== undefined) studentFields.housing = item.housing.trim() || null;

      // 1. Update students table with resilient column fallback
      if (Object.keys(studentFields).length > 0) {
        let { error: studentErr } = await supabase
          .from('students')
          .update(studentFields)
          .eq('id', item.id);

        // If the remote database has not yet run Migration 084 (e.g. column student_phone or prev_school does not exist),
        // safely fall back to updating the confirmed canonical columns so the batch does not fail.
        if (studentErr && (studentErr.code === '42703' || String(studentErr.message).includes('does not exist'))) {
          console.warn('[batchUpdateStudentProfilesAction] Schema column mismatch on remote DB:', studentErr.message);
          const sanitizedFields = { ...studentFields };
          delete sanitizedFields.student_phone;
          delete sanitizedFields.prev_school;
          delete sanitizedFields.birth_cert_no;
          delete sanitizedFields.indigenous;
          delete sanitizedFields.assistive_device;

          const retryResult = await supabase
            .from('students')
            .update(sanitizedFields)
            .eq('id', item.id);
          studentErr = retryResult.error;
        }

        if (studentErr) {
          console.error(`[batchUpdateStudentProfilesAction] Error updating student ${item.id}:`, studentErr);
          throw new Error(`បរាជ័យក្នុងការកែប្រែព័ត៌មានសិស្ស: ${studentErr.message}`);
        }
      }

      // 2. Update student_enrollments for desk_number and room_number
      const enrollmentFields: Record<string, any> = {};
      if (item.desk_number !== undefined) enrollmentFields.desk_number = item.desk_number.trim() || null;
      if (item.room_number !== undefined) enrollmentFields.room_number = item.room_number.trim() || null;

      if (Object.keys(enrollmentFields).length > 0) {
        const { error: enrolUpdateErr } = await supabase
          .from('student_enrollments')
          .update(enrollmentFields)
          .eq('student_id', item.id)
          .eq('class_id', payload.class_id);

        if (enrolUpdateErr) {
          console.error(`[batchUpdateStudentProfilesAction] Error updating enrollment for ${item.id}:`, enrolUpdateErr);
          throw new Error(`បរាជ័យក្នុងការកែប្រែទិន្នន័យថ្នាក់: ${enrolUpdateErr.message}`);
        }
      }

      // 3. Update health records - ONLY if actual health measurements/notes are provided.
      // Priority 1: Profile imports with only disability must NOT fabricate empty/default health records.
      if (item.weight_kg !== undefined || item.height_m !== undefined || item.health_issues !== undefined) {
        const academicYearId = validStudentMap.get(item.id);
        if (academicYearId) {
          const heightCm = item.height_m ? Math.round(Number(item.height_m) * 100) : null;
          const weightKg = item.weight_kg ? Number(item.weight_kg) : null;
          const bmi = weightKg && heightCm ? parseFloat((weightKg / ((heightCm / 100) * (heightCm / 100))).toFixed(1)) : null;

          await supabase.from('student_health_records').upsert({
            student_id: item.id,
            academic_year_id: academicYearId,
            recorded_date: today,
            weight_kg: weightKg,
            height_cm: heightCm,
            bmi,
            vision_left: '6/6',
            vision_right: '6/6',
            hearing: 'ធម្មតា',
            dental: 'ធម្មតា',
            notes: item.health_issues || '',
          }, { onConflict: 'student_id,recorded_date' });
        }
      }

      updatedCount++;
    }

    revalidatePath('/students');
    revalidatePath('/homeroom');
    revalidatePath('/homeroom/student-study-plans');
    revalidatePath('/health');
    revalidatePath('/classes/info');

    return { 
      success: true, 
      count: updatedCount,
      executionMode: 'sequential_fallback',
      warning: 'ទិន្នន័យត្រូវបានរក្សាទុកជាជោគជ័យ (មុខងារ RPC Atomic មិនទាន់ត្រូវបានដាក់ឱ្យដំណើរការលើ Server)'
    };
  } catch (err: any) {
    console.error('[batchUpdateStudentProfilesAction] Caught exception:', err);
    return { success: false, error: err?.message || 'Failed to batch update student profiles.' };
  }
}

/**
 * Authoritatively updates a single student's photo_url with class authorization check.
 */
export async function updateStudentPhotoAction(payload: {
  studentId: string;
  photoUrl: string | null;
  classId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { getServerAuth, requireClassAccess } = await import('@/lib/auth-server');
    const { user, profile, role } = await getServerAuth();
    if (!user || !profile || !role) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    if (!payload.studentId) {
      return { success: false, error: 'Student ID is required.' };
    }

    if (role === 'teacher') {
      if (!payload.classId) {
        return { success: false, error: 'Class ID is required for teacher photo updates.' };
      }
      await requireClassAccess(payload.classId);
    } else if (role !== 'admin' && role !== 'principal') {
      return { success: false, error: 'Forbidden: Insufficient permissions.' };
    }

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    // Verify student belongs to caller's scope
    if (role === 'teacher' && payload.classId) {
      const { data: enrollment } = await supabase
        .from('student_enrollments')
        .select('id')
        .eq('student_id', payload.studentId)
        .eq('class_id', payload.classId)
        .maybeSingle();

      if (!enrollment) {
        return { success: false, error: 'Forbidden: Student does not belong to this class roster.' };
      }
    }

    const cleanPhotoUrl = payload.photoUrl && payload.photoUrl.trim().length > 0 ? payload.photoUrl.trim() : null;

    const { error: updateErr } = await supabase
      .from('students')
      .update({
        photo_url: cleanPhotoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.studentId);

    if (updateErr) {
      console.error('[updateStudentPhotoAction] Update error:', updateErr);
      return { success: false, error: updateErr.message || 'Failed to update student photo.' };
    }

    revalidatePath('/students');
    revalidatePath('/homeroom/student-study-plans');
    revalidatePath('/homeroom/profiling');
    revalidatePath('/homeroom');

    return { success: true };
  } catch (err: any) {
    console.error('[updateStudentPhotoAction] Caught exception:', err);
    return { success: false, error: err?.message || 'Failed to update student photo.' };
  }
}

/**
 * Authoritatively batch updates multiple students' photo_urls with class-level authorization.
 */
export async function batchUpdateStudentPhotosAction(payload: {
  classId?: string;
  updates: Array<{ studentId: string; photoUrl: string | null }>;
}): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { getServerAuth, requireClassAccess } = await import('@/lib/auth-server');
    const { user, profile, role } = await getServerAuth();
    if (!user || !profile || !role) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    if (!payload.updates || !Array.isArray(payload.updates) || payload.updates.length === 0) {
      return { success: false, error: 'No photo updates provided.' };
    }

    if (role === 'teacher') {
      if (!payload.classId) {
        return { success: false, error: 'Class ID is required for teacher photo updates.' };
      }
      await requireClassAccess(payload.classId);
    } else if (role !== 'admin' && role !== 'principal') {
      return { success: false, error: 'Forbidden: Insufficient permissions.' };
    }

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    // Verify all students belong to the authorized class roster if teacher
    if (role === 'teacher' && payload.classId) {
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('student_id')
        .eq('class_id', payload.classId);

      const enrolledIds = new Set((enrollments || []).map((e: any) => e.student_id));
      for (const item of payload.updates) {
        if (!enrolledIds.has(item.studentId)) {
          return {
            success: false,
            error: `Forbidden: Student ${item.studentId} does not belong to this class roster.`,
          };
        }
      }
    }

    let updatedCount = 0;
    const nowIso = new Date().toISOString();

    for (const item of payload.updates) {
      const cleanPhotoUrl = item.photoUrl && item.photoUrl.trim().length > 0 ? item.photoUrl.trim() : null;
      const { error } = await supabase
        .from('students')
        .update({
          photo_url: cleanPhotoUrl,
          updated_at: nowIso,
        })
        .eq('id', item.studentId);

      if (!error) {
        updatedCount++;
      } else {
        console.warn(`[batchUpdateStudentPhotosAction] Failed to update photo for ${item.studentId}:`, error);
      }
    }

    revalidatePath('/students');
    revalidatePath('/homeroom/student-study-plans');
    revalidatePath('/homeroom/profiling');
    revalidatePath('/homeroom');

    return { success: true, count: updatedCount };
  } catch (err: any) {
    console.error('[batchUpdateStudentPhotosAction] Caught exception:', err);
    return { success: false, error: err?.message || 'Failed to batch update student photos.' };
  }
}

