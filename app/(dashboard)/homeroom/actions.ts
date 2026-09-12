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
