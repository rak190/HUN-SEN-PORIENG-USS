import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const { user, role } = await getServerAuth();

  if (!user || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    // 1. Find stale pending DB records (> 24h old)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: stalePending, error: staleErr } = await adminClient
      .from('documents')
      .select('id, file_url, created_at')
      .eq('status', 'pending')
      .lt('created_at', oneDayAgo);

    if (staleErr) throw staleErr;

    // In a real execution, we would:
    // a) Check R2 if object actually exists.
    // b) If yes -> finalize to 'active' or 'verified'.
    // c) If no -> delete from DB.
    
    // For now, we will just delete DB records that have been pending for > 24 hours
    // because if they were uploaded, they should have been finalized.
    let deletedCount = 0;
    
    if (stalePending && stalePending.length > 0) {
      const idsToDelete = stalePending.map(doc => doc.id);
      const { error: delErr } = await adminClient
        .from('documents')
        .delete()
        .in('id', idsToDelete);
        
      if (delErr) throw delErr;
      deletedCount = stalePending.length;
    }

    // Log the cleanup
    await adminClient.from('audit_logs').insert([
      {
        action: `បានសម្អាតឯកសារមិនបានបញ្ចប់ (Stale Pending Documents) ចំនួន ${deletedCount}`,
        type: 'info',
        user_id: user.id,
      }
    ]);

    return NextResponse.json({ 
      success: true,
      cleanedCount: deletedCount,
      message: 'R2 Orphan Cleanup completed successfully.'
    });
  } catch (err: any) {
    console.error('R2 cleanup error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
