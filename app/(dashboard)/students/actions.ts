'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export interface SaveStudentPayload {
  id?: string;
  class_id?: string;
  academic_year_id?: string;
  student_id_number?: string;
  full_name?: string;
  gender?: string;
  date_of_birth?: string;
  age?: number;
  birth_cert_no?: string;
  status?: string;
  scholarship?: string;
  id_poor?: string;
  orphan?: string;
  indigenous?: string;
  distance_km?: number;
  weight_kg?: number;
  height_m?: number;
  bmi?: number;
  nutrition_status?: string;
  disability?: string;
  assistive_device?: string;
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
  migrant_status?: string;
  domestic_violence?: string;
  housing?: string;
  income?: number;
  address?: string;
  desk_number?: string;
  room_number?: string;
  student_phone?: string;
  parent_phone?: string;
  current_status?: string;
  enrollment_status?: string;
  is_active?: boolean;
}

export async function saveStudentAction(payload: SaveStudentPayload) {
  try {
    const { requireClassAccess, requireAdmin } = await import('@/lib/auth-server');
    if (payload.class_id) {
      await requireClassAccess(payload.class_id);
    } else {
      await requireAdmin();
    }
    const supabase = createAdminClient();

    const normalizedGender = payload.gender === 'F' || payload.gender === 'ស្រី' ? 'F' : 'M';
    const status = payload.status === 'repeater' ? 'repeater' : payload.status === 'transfer' ? 'transfer' : 'new';
    const scholarship = payload.scholarship === 'yes' ? 'yes' : 'no';
    const idPoor = payload.id_poor === 'level_1' ? 'level_1' : payload.id_poor === 'level_2' ? 'level_2' : 'none';
    const orphan = payload.orphan === 'yes' ? 'yes' : 'no';
    const disability = payload.disability === 'mild' ? 'mild' : payload.disability === 'severe' ? 'severe' : 'none';
    const enrollmentStatus = payload.current_status || payload.enrollment_status || 'active';
    const isActive = enrollmentStatus === 'active';

    // Calculate BMI & Nutrition Status if weight and height are provided
    let calculatedBmi = payload.bmi ? Number(payload.bmi) : null;
    let nutritionStatus = payload.nutrition_status || null;
    if (payload.weight_kg && payload.height_m && payload.height_m > 0) {
      calculatedBmi = parseFloat((Number(payload.weight_kg) / (Number(payload.height_m) * Number(payload.height_m))).toFixed(1));
      if (calculatedBmi < 18.5) nutritionStatus = 'ស្គម';
      else if (calculatedBmi >= 25 && calculatedBmi < 30) nutritionStatus = 'លើសទម្ងន់';
      else if (calculatedBmi >= 30) nutritionStatus = 'ធាត់';
      else nutritionStatus = 'ធម្មតា';
    }

    const healthNotes = payload.health_issues || null;

    // Use progressive updating: only overwrite fields if they are explicitly sent as non-empty in the payload
    // or if they are required core fields.
    const dbRecord: Record<string, any> = {
      full_name: payload.full_name,
      student_id_number: payload.student_id_number,
      gender: normalizedGender,
      status,
      enrollment_status: enrollmentStatus,
      is_active: isActive,
    };

    if (payload.class_id) dbRecord.class_id = payload.class_id;
    if (payload.date_of_birth !== undefined) dbRecord.dob = payload.date_of_birth || null;
    if (payload.age !== undefined) dbRecord.age = payload.age ? Number(payload.age) : null;
    if (payload.scholarship !== undefined) dbRecord.scholarship = scholarship;
    if (payload.id_poor !== undefined) dbRecord.id_poor = idPoor;
    if (payload.orphan !== undefined) dbRecord.orphan = orphan;
    if (payload.distance_km !== undefined) dbRecord.distance_km = payload.distance_km ? Number(payload.distance_km) : null;
    if (payload.weight_kg !== undefined) dbRecord.weight_kg = payload.weight_kg ? Number(payload.weight_kg) : null;
    if (payload.height_m !== undefined) dbRecord.height_m = payload.height_m ? Number(payload.height_m) : null;
    if (calculatedBmi !== null) dbRecord.bmi = calculatedBmi;
    if (nutritionStatus !== null) dbRecord.nutrition_status = nutritionStatus;
    if (payload.disability !== undefined) dbRecord.disability = disability;
    if (payload.assistive_device !== undefined) dbRecord.assistive_device = payload.assistive_device || null;
    if (healthNotes !== null) dbRecord.health_note = healthNotes;
    if (payload.siblings_count !== undefined) dbRecord.siblings_count = payload.siblings_count ? Number(payload.siblings_count) : 0;
    if (payload.income !== undefined) dbRecord.income = payload.income ? Number(payload.income) : null;
    if (payload.address !== undefined) dbRecord.current_address = payload.address || null;
    if (payload.father_name !== undefined) dbRecord.father_name = payload.father_name || null;
    if (payload.father_job !== undefined) dbRecord.father_job = payload.father_job || null;
    if (payload.mother_name !== undefined) dbRecord.mother_name = payload.mother_name || null;
    if (payload.mother_job !== undefined) dbRecord.mother_job = payload.mother_job || null;
    if (payload.guardian_name !== undefined) dbRecord.guardian_name = payload.guardian_name || null;
    if (payload.guardian_job !== undefined) dbRecord.guardian_job = payload.guardian_job || null;
    if (payload.father_phone || payload.mother_phone || payload.parent_phone || payload.student_phone) {
      dbRecord.parent_phone = payload.father_phone || payload.mother_phone || payload.parent_phone || payload.student_phone || null;
    }
    if (payload.father_phone !== undefined) dbRecord.father_phone = payload.father_phone || null;
    if (payload.mother_phone !== undefined) dbRecord.mother_phone = payload.mother_phone || null;
    if (payload.guardian_phone !== undefined) dbRecord.guardian_phone = payload.guardian_phone || null;
    if (payload.desk_number !== undefined) dbRecord.desk_number = payload.desk_number || null;
    if (payload.room_number !== undefined) dbRecord.room_number = payload.room_number || null;
    if (payload.birth_cert_no !== undefined) dbRecord.birth_cert_no = payload.birth_cert_no || null;
    if (payload.migrant_status !== undefined) dbRecord.migrant_status = payload.migrant_status || null;

    let savedStudent = null;

    if (payload.id && payload.id.length > 20 && !payload.id.startsWith('std-') && !payload.id.startsWith('mock-')) {
      // Update existing student
      const { data, error } = await supabase
        .from('students')
        .update(dbRecord)
        .eq('id', payload.id)
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
    if (payload.academic_year_id && savedStudent?.id && payload.class_id) {
       await supabase.from('student_enrollments').upsert({
          student_id: savedStudent.id,
          class_id: payload.class_id,
          academic_year_id: payload.academic_year_id,
          enrollment_status: enrollmentStatus,
          desk_number: dbRecord.desk_number || null,
          room_number: dbRecord.room_number || null,
       }, { onConflict: 'student_id,academic_year_id' });
    }

    // Bidirectional sync: If health data was entered in /students, sync into student_health_records
    const studentId = payload.id || savedStudent?.id;
    if (studentId && (payload.weight_kg || payload.height_m || healthNotes || payload.assistive_device)) {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' }).format(new Date());
      const heightCm = payload.height_m ? Math.round(Number(payload.height_m) * 100) : null;
      
      let vision = '6/6';
      if (payload.assistive_device === 'glasses' || healthNotes?.includes('ភ្នែក')) {
        vision = '6/12';
      }
      let hearing = 'ធម្មតា';
      if (payload.assistive_device === 'hearing_aid' || healthNotes?.includes('ស្តាប់')) {
        hearing = 'ខ្សោយ';
      }

      try {
        await supabase.from('student_health_records').upsert({
          student_id: studentId,
          class_id: payload.class_id || dbRecord.class_id,
          recorded_date: today,
          weight_kg: payload.weight_kg ? Number(payload.weight_kg) : null,
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

