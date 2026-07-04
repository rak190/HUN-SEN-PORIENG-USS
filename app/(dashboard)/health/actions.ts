'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { StudentHealthRecord } from '@/types';

export async function upsertHealthRecords(records: Partial<StudentHealthRecord>[]) {
  const supabase = await createClient();

  const validRecords = records.filter(r => r.student_id && r.class_id && r.recorded_date);
  
  if (validRecords.length === 0) return { success: true };

  const { error } = await supabase
    .from('student_health_records')
    .upsert(validRecords, { onConflict: 'student_id,recorded_date' });

  if (error) {
    console.error('Error saving health records:', error);
    throw new Error('បរាជ័យក្នុងការរក្សាទុកទិន្នន័យសុខភាព។');
  }

  revalidatePath('/health');
  return { success: true };
}
