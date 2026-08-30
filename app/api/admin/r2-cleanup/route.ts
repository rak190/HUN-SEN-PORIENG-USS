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

    let deletedCount = 0;
    let activatedCount = 0;
    
    if (stalePending && stalePending.length > 0) {
      // We need to import HeadObjectCommand
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
      const { r2Client, R2_BUCKET_NAME } = await import('@/lib/cloudflare-r2');

      for (const doc of stalePending) {
        try {
          // Check if object exists in R2
          await r2Client.send(new HeadObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: doc.file_url
          }));
          
          // It exists, so the upload actually succeeded but the finalize step failed.
          await adminClient
            .from('documents')
            .update({ status: 'active' })
            .eq('id', doc.id);
            
          activatedCount++;
        } catch (error: any) {
          if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            // It doesn't exist, so the upload was abandoned. Delete the DB record.
            await adminClient
              .from('documents')
              .delete()
              .eq('id', doc.id);
              
            deletedCount++;
          } else {
            console.error(`Error checking R2 object ${doc.file_url}:`, error);
          }
        }
      }
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
