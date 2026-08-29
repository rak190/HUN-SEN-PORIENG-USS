'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-server';

export async function resetCertificateTemplates() {
  await requireAdmin();
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
