'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';

export async function activateAcademicYear(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  
  // 1. Close current active
  await supabase.from('academic_years').update({ status: 'closed' }).eq('status', 'active');
  
  // 2. Set new active
  const { error } = await supabase.from('academic_years').update({ status: 'active' }).eq('id', id);
  if (error) return { success: false, error: error.message };
  
  revalidatePath('/admin/academic-setup');
  return { success: true };
}

export async function closeAcademicYear(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('academic_years').update({ status: 'closed' }).eq('id', id);
  if (error) return { success: false, error: error.message };
  
  revalidatePath('/admin/academic-setup');
  return { success: true };
}

export async function reopenAcademicYear(id: string, reason: string) {
  await requireAdmin();
  const supabase = await createClient();
  
  // Ensure no other year is active
  await supabase.from('academic_years').update({ status: 'closed' }).eq('status', 'active');
  
  const { error } = await supabase.from('academic_years').update({ status: 'active' }).eq('id', id);
  if (error) return { success: false, error: error.message };
  
  // Log the emergency reopen
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  if (admin) {
    const { data: { user } } = await supabase.auth.getUser();
    await admin.from('audit_logs').insert({ 
      action: 'REOPEN_ACADEMIC_YEAR', 
      details: { id, reason },
      user_id: user?.id
    });
  }
  
  revalidatePath('/admin/academic-setup');
  return { success: true };
}
