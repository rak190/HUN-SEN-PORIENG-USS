'use server';

import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';
import { ActivityType } from '@/types';

export async function createActivityLog(data: {
  title: string;
  description: string;
  activity_type: ActivityType;
  class_id?: string;
}) {
  const supabase = await createClient();
  
  // Get current user
  const { user } = await getServerAuth();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const { error } = await supabase.from('activity_logs').insert({
    title: data.title,
    description: data.description,
    activity_type: data.activity_type,
    class_id: data.class_id,
    created_by: user.id
  });

  if (error) {
    console.error('Error creating activity log:', error);
    throw new Error('Failed to create activity log');
  }

  revalidatePath('/homeroom');
}

export async function deleteActivityLog(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from('activity_logs').delete().eq('id', id);

  if (error) {
    console.error('Error deleting activity log:', error);
    throw new Error('Failed to delete activity log');
  }

  revalidatePath('/homeroom');
}

export async function addStudent(data: {
  full_name: string;
  student_id_number?: string;
  gender?: string;
}) {
  const supabase = await createClient();
  
  // 1. Get current user
  const { user } = await getServerAuth();
  if (!user) {
    throw new Error('Unauthorized');
  }

  // 2. Enforce logic: Find the class assigned to this teacher
  const { data: classroom, error: classError } = await supabase
    .from('classes')
    .select('id')
    .eq('teacher_id', user.id)
    .single();

  if (classError || !classroom) {
    throw new Error('អ្នកមិនទាន់មានថ្នាក់គ្រប់គ្រងនៅឡើយទេ (You are not assigned to a class yet)');
  }

  // 2.5 Get current academic year
  const { data: currentYear } = await supabase
    .from('academic_years')
    .select('id')
    .eq('is_active', true)
    .single();

  if (!currentYear) {
    throw new Error('មិនមានឆ្នាំសិក្សាសកម្មទេ (No active academic year found)');
  }

  // 3. Insert student securely without the class_id
  const { data: newStudent, error } = await supabase.from('students').insert({
    full_name: data.full_name,
    student_id_number: data.student_id_number || null,
    gender: data.gender || null,
    is_active: true
  }).select().single();

  if (error || !newStudent) {
    console.error('Error adding student:', error);
    throw new Error('បរាជ័យក្នុងការបន្ថែមសិស្ស');
  }

  // 4. Enroll the student in the teacher's class
  const { error: enrollError } = await supabase.from('student_enrollments').insert({
    student_id: newStudent.id,
    class_id: classroom.id,
    academic_year_id: currentYear.id,
    enrollment_status: 'active'
  });

  if (enrollError) {
    console.error('Error enrolling student:', enrollError);
    // Ideally we would rollback the student creation, but for now we throw
    throw new Error('សិស្សត្រូវបានបង្កើត ប៉ុន្តែបរាជ័យក្នុងការចុះឈ្មោះចូលថ្នាក់');
  }

  revalidatePath('/homeroom');
  revalidatePath('/admin/students');
}

export async function massProfileUpdateAction(studentData: any[]) {
  const supabase = await createClient();
  const { user } = await getServerAuth();
  
  if (!user) throw new Error('Unauthorized');
  if (!studentData || studentData.length === 0) return { success: true, count: 0 };

  // Get teacher's class
  const { data: classroom } = await supabase
    .from('classes')
    .select('id')
    .eq('teacher_id', user.id)
    .single();

  if (!classroom) throw new Error('អ្នកមិនទាន់មានថ្នាក់គ្រប់គ្រងនៅឡើយទេ');

  // Verify that all updated students actually belong to the teacher's class
  const studentIds = studentData.map(s => s.id).filter(Boolean);
  if (studentIds.length === 0) throw new Error('គ្មានទិន្នន័យត្រឹមត្រូវ');

  // Get current active academic year
  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id')
    .eq('is_active', true)
    .single();

  if (!activeYear) throw new Error('គ្មានឆ្នាំសិក្សាសកម្ម');

  const { data: enrollments } = await supabase
    .from('student_enrollments')
    .select('student_id')
    .eq('class_id', classroom.id)
    .eq('academic_year_id', activeYear.id)
    .eq('enrollment_status', 'active')
    .in('student_id', studentIds);

  const validStudentIds = new Set(enrollments?.map(e => e.student_id) || []);

  let updatedCount = 0;
  let errors: { id: string, name: string, reason: string }[] = [];

  for (const s of studentData) {
     if (!s.id) {
       errors.push({ id: 'N/A', name: s.full_name || 'Unknown', reason: 'Missing ID' });
       continue;
     }
     
     if (!validStudentIds.has(s.id)) {
       errors.push({ id: s.student_id_number || s.id, name: s.full_name, reason: 'Student not in your active class' });
       continue;
     }
     
     const payload = {
        date_of_birth: s.date_of_birth,
        birth_cert_no: s.birth_cert_no,
        student_phone: s.student_phone,
        status: s.status,
        prev_school: s.prev_school,
        scholarship: s.scholarship,
        id_poor: s.id_poor,
        orphan: s.orphan,
        indigenous: s.indigenous,
        distance_km: s.distance_km,
        weight_kg: s.weight_kg,
        height_m: s.height_m,
        bmi: s.bmi,
        nutrition_status: s.nutrition_status,
        disability: s.disability,
        assistive_device: s.assistive_device,
        health_issues: s.health_issues,
        father_name: s.father_name,
        father_job: s.father_job,
        father_phone: s.father_phone,
        mother_name: s.mother_name,
        mother_job: s.mother_job,
        mother_phone: s.mother_phone,
        guardian_name: s.guardian_name,
        guardian_job: s.guardian_job,
        guardian_phone: s.guardian_phone,
        siblings_count: s.siblings_count,
        migrant_status: s.migrant_status,
        domestic_violence: s.domestic_violence,
        housing: s.housing,
        income: s.income,
        current_address: s.current_address
     };

     // Remove undefined properties
     Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);

     if (Object.keys(payload).length > 0) {
        const { error } = await supabase.from('students').update(payload).eq('id', s.id);
        if (error) {
           errors.push({ id: s.student_id_number || s.id, name: s.full_name, reason: 'Database error: ' + error.message });
        } else {
           updatedCount++;
        }
     }
  }

  revalidatePath('/homeroom');
  revalidatePath('/students');
  return { success: true, count: updatedCount, errors };
}
