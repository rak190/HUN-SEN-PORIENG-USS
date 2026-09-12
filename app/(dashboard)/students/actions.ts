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
    
    const { requireClassAccess, requireAdmin } = await import('@/lib/auth-server');
    if (validatedPayload.class_id) {
      await requireClassAccess(validatedPayload.class_id);
    } else {
      await requireAdmin();
    }
    const supabase = createAdminClient();


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

    let savedStudent = null;

    if (validatedPayload.id && validatedPayload.id.length > 20 && !validatedPayload.id.startsWith('std-') && !validatedPayload.id.startsWith('mock-')) {
      // Update existing student
      const { data, error } = await supabase
        .from('students')
        .update(dbRecord)
        .eq('id', validatedPayload.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error.message);
        return { success: false, error: error.message };
      } else {
        savedStudent = { ...payload, ...(data || dbRecord) };
      }
    } else {
      // Insert new student
      // Ensure required core fields have fallbacks for creation only if they are missing
      if (!dbRecord.full_name) dbRecord.full_name = 'មិនមានឈ្មោះ';
      if (!dbRecord.student_id_number) dbRecord.student_id_number = `ID-${Date.now().toString().slice(-4)}`;
      
      const { data, error } = await supabase
        .from('students')
        .insert([dbRecord])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error.message);
        return { success: false, error: error.message };
      } else {
        savedStudent = { ...payload, ...(data || dbRecord) };
      }
    }

    // Attempt to update enrollment record if academic_year_id is provided
    if (validatedPayload.academic_year_id && savedStudent?.id && validatedPayload.class_id) {
       await supabase.from('student_enrollments').upsert({
          student_id: savedStudent.id,
          class_id: validatedPayload.class_id,
          academic_year_id: validatedPayload.academic_year_id,
          enrollment_status: enrollmentStatus,
          desk_number: validatedPayload.desk_number || null,
          room_number: validatedPayload.room_number || null,
       }, { onConflict: 'student_id,academic_year_id' });
    }

    // Bidirectional sync: If health data was entered in /students, sync into student_health_records
    const studentId = validatedPayload.id || savedStudent?.id;
    if (studentId && (validatedPayload.weight_kg || validatedPayload.height_m || healthNotes || validatedPayload.assistive_device)) {
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

      try {
        await supabase.from('student_health_records').upsert({
          student_id: studentId,
          class_id: validatedPayload.class_id || dbRecord.class_id,
          recorded_date: today,
          weight_kg: validatedPayload.weight_kg ? Number(validatedPayload.weight_kg) : null,
          height_cm: heightCm,
          bmi: calculatedBmi,
          vision_left: vision,
          vision_right: vision,
          hearing: hearing,
          dental: 'ធម្មតា',
          notes: healthNotes || ''
        }, { onConflict: 'student_id,recorded_date' });
      } catch (healthSyncErr) {
        console.warn('Failed to auto-sync to health records:', healthSyncErr);
      }
    }

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
    const { requireTeacher } = await import('@/lib/auth-server');
    const { user } = await requireTeacher(); // allow teachers to bulk register their students
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

