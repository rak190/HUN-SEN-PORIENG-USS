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

  // 3. Insert student securely with the enforced class_id
  const { error } = await supabase.from('students').insert({
    full_name: data.full_name,
    student_id_number: data.student_id_number || null,
    gender: data.gender || null,
    class_id: classroom.id,
    is_active: true
  });

  if (error) {
    console.error('Error adding student:', error);
    throw new Error('បរាជ័យក្នុងការបន្ថែមសិស្ស');
  }

  revalidatePath('/homeroom');
  revalidatePath('/admin/students');
}
