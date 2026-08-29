import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  const { user, role } = await getServerAuth();

  if (!user || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  const body = await req.json();
  const { action } = body;

  if (action === 'test-connection') {
    const start = Date.now();
    const { error } = await adminClient.from('profiles').select('id').limit(1);
    const latency = Date.now() - start;
    
    if (error) {
      return NextResponse.json({ error: 'Database connection failed', details: error.message }, { status: 500 });
    }
    
    // Log it
    await adminClient.from('audit_logs').insert([{
      action: `ធ្វើតេស្តល្បឿនតភ្ជាប់ទិន្នន័យ (Latency: ${latency}ms)`,
      type: 'info',
      user_id: user.id
    }]);

    return NextResponse.json({ success: true, latency });
  }

  if (action === 'purge-cache') {
    revalidatePath('/', 'layout');
    
    // Log it
    await adminClient.from('audit_logs').insert([{
      action: `បានសម្អាត Global Application Cache`,
      type: 'warning',
      user_id: user.id
    }]);

    return NextResponse.json({ success: true });
  }

  if (action === 'backup') {
    await adminClient.from('audit_logs').insert([{
      action: `ស្នើសុំបង្កើតទិន្នន័យបម្រុង Database Snapshot`,
      type: 'warning',
      user_id: user.id
    }]);

    return NextResponse.json({ success: true, message: 'Backup initiated.' });
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
}
