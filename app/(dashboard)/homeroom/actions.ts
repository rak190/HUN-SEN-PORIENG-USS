'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ActivityType } from '@/types';

export async function createActivityLog(data: {
  title: string;
  description: string;
  activity_type: ActivityType;
  class_id?: string;
}) {
  const supabase = await createClient();
  
  // Get current user to link to created_by
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error('Unauthorized');
  }

  const { error } = await supabase.from('activity_logs').insert({
    title: data.title,
    description: data.description,
    activity_type: data.activity_type,
    class_id: data.class_id,
    created_by: userData.user.id
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
