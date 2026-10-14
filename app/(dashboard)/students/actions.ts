'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

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
    if (validatedPayload.father_phone || validatedPayload.mother_phone || validatedPayload.parent_phone || validatedPayload.student_phone) {
      dbRecord.parent_phone = validatedPayload.father_phone || validatedPayload.mother_phone || validatedPayload.parent_phone || validatedPayload.student_phone || null;
    }
    if (validatedPayload.father_phone !== undefined) dbRecord.father_phone = validatedPayload.father_phone || null;
    if (validatedPayload.mother_phone !== undefined) dbRecord.mother_phone = validatedPayload.mother_phone || null;
    if (validatedPayload.guardian_phone !== undefined) dbRecord.guardian_phone = validatedPayload.guardian_phone || null;
    if (validatedPayload.birth_cert_no !== undefined) dbRecord.birth_cert_no = validatedPayload.birth_cert_no || null;
    if (validatedPayload.migrant_status !== undefined) dbRecord.migrant_status = validatedPayload.migrant_status || null;

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

    const savedStudent = { ...payload, ...dbRecord, id: atomicResult.student_id };

    revalidatePath('/students');
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

    const { requireTeacher, requireClassAccess } = await import('@/lib/auth-server');
    const { user } = await requireTeacher(); // allow teachers, principals, admins

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

