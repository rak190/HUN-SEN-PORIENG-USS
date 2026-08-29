import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';

export async function GET() {
  const { user, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ schoolInfo: null });
  }

  const { data } = await adminClient
    .from('system_settings')
    .select('value')
    .eq('key', 'school_info')
    .maybeSingle();

  return NextResponse.json({ schoolInfo: data?.value || null });
}

export async function PATCH(req: Request) {
  const { user, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const body = await req.json();
  const { schoolInfo } = body;

  if (!schoolInfo) {
    return NextResponse.json({ error: 'schoolInfo is required' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  const { error } = await adminClient
    .from('system_settings')
    .upsert({
      key: 'school_info',
      value: schoolInfo,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Log it
  await adminClient.from('audit_logs').insert([{
    action: `បានកែសម្រួលព័ត៌មានសាលា និងទិន្នន័យ GEIP`,
    type: 'info',
    user_id: user.id
  }]);

  return NextResponse.json({ success: true });
}
