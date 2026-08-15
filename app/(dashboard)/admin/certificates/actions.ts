'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export async function resetCertificateTemplates() {
  const adminClient = createAdminClient();
  if (!adminClient) {
    return { success: false, error: 'Admin client not configured' };
  }

  const { error } = await adminClient
    .from('system_settings')
    .delete()
    .eq('key', 'certificate_templates');

  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}
