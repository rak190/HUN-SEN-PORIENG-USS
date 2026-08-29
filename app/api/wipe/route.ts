import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const { user, role } = await getServerAuth();
  
  if (!user || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Administrator access required.' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }
  
  const { error } = await adminClient.from('system_settings').delete().eq('key', 'certificate_templates');
  
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, message: 'Certificate templates reset.' });
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed. Use POST with Admin Authorization.' }, { status: 405 });
}
