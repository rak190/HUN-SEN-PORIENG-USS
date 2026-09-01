'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export interface SaveStudentPayload {
  id?: string;
  class_id?: string;
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

    const dbRecord: Record<string, any> = {
      full_name: payload.full_name || 'គ្មានឈ្មោះ',
      student_id_number: payload.student_id_number || `ID-${Date.now().toString().slice(-4)}`,
      gender: normalizedGender,
      dob: payload.date_of_birth || null,
      age: payload.age ? Number(payload.age) : null,
      status,
      scholarship,
      id_poor: idPoor,
      orphan,
      distance_km: payload.distance_km ? Number(payload.distance_km) : null,
      weight_kg: payload.weight_kg ? Number(payload.weight_kg) : null,
      height_m: payload.height_m ? Number(payload.height_m) : null,
      bmi: calculatedBmi,
      nutrition_status: nutritionStatus,
      disability,
      assistive_device: payload.assistive_device || null,
      health_note: healthNotes,
      siblings_count: payload.siblings_count ? Number(payload.siblings_count) : 0,
      income: payload.income ? Number(payload.income) : null,
      address: payload.address || null,
      parent_phone: payload.father_phone || payload.mother_phone || payload.parent_phone || payload.student_phone || null,
      desk_number: payload.desk_number || null,
      room_number: payload.room_number || null,
      enrollment_status: enrollmentStatus,
      is_active: isActive,
    };

    if (payload.class_id) {
      dbRecord.class_id = payload.class_id;
    }

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
