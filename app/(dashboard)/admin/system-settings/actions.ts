'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';
import { createClient } from '@supabase/supabase-js';

export async function archiveOldAuditLogsAction(password: string) {
  const { user, role, profile } = await getServerAuth();
  if (!user || role !== 'admin') throw new Error('Unauthorized');

  // Verify password using a regular client to ensure they know their credentials
  const supabaseAuth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error: authError } = await supabaseAuth.auth.signInWithPassword({
    email: user.email!,
    password
  });
  
  if (authError) throw new Error('ពាក្យសម្ងាត់មិនត្រឹមត្រូវ (Invalid password)');

  const adminClient = createAdminClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 180);
  const cutoffIso = cutoffDate.toISOString();

  // Fetch old logs
  const { data: oldLogs, error: fetchError } = await adminClient
    .from('audit_logs')
    .select('*')
    .lt('created_at', cutoffIso);
  
  if (fetchError) throw fetchError;
  if (!oldLogs || oldLogs.length === 0) {
    return { count: 0, logs: [] };
  }

  // Delete old logs
  const { error: deleteError } = await adminClient
    .from('audit_logs')
    .delete()
    .lt('created_at', cutoffIso);
  if (deleteError) throw deleteError;

  // Insert audit trail
  await adminClient.from('audit_logs').insert({
    action: `ARCHIVE_AUDIT_LOGS: Purged ${oldLogs.length} records older than ${cutoffIso.slice(0, 10)}`,
    type: 'warning',
    user_id: user.id,
    school_id: profile?.school_id || 'main-school'
  });

  return { count: oldLogs.length, logs: oldLogs };
}
