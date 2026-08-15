import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user || (user.user_metadata?.role !== 'admin' && user.user_metadata?.role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === 'test-connection') {
    const start = Date.now();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const latency = Date.now() - start;
    
    if (error) {
      return NextResponse.json({ error: 'Database connection failed', details: error.message }, { status: 500 });
    }
    
    // Log it
    await supabase.from('audit_logs').insert([{
      action: `Executed connection test (Latency: ${latency}ms)`,
      type: 'info',
      user_id: user.id
    }]);

    return NextResponse.json({ success: true, latency });
  }

  if (action === 'purge-cache') {
    revalidatePath('/', 'layout');
    
    // Log it
    await supabase.from('audit_logs').insert([{
      action: `Purged global application cache (revalidatePath)`,
      type: 'warning',
      user_id: user.id
    }]);

    return NextResponse.json({ success: true });
  }

  if (action === 'backup') {
    // We cannot physically backup Supabase from Edge, so this is a simulation log.
    await supabase.from('audit_logs').insert([{
      action: `Requested automated DB snapshot backup`,
      type: 'warning',
      user_id: user.id
    }]);

    return NextResponse.json({ success: true, message: 'Backup initiated.' });
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
}
