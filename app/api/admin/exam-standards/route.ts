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
    return NextResponse.json({ standards: null });
  }

  const { data } = await adminClient
    .from('system_settings')
    .select('value')
    .eq('key', 'exam_standards')
    .maybeSingle();

  return NextResponse.json({ standards: data?.value || null });
}

export async function PATCH(req: Request) {
  const { user, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const body = await req.json();
  const { standards } = body;

  if (!standards) {
    return NextResponse.json({ error: 'standards payload is required' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  const { error } = await adminClient
    .from('system_settings')
    .upsert({
      key: 'exam_standards',
      value: standards,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log to audit logs
  await adminClient.from('audit_logs').insert([{
    action: `បានកែសម្រួលស្តង់ដារការប្រលង និងការកំណត់ពិន្ទុ`,
    type: 'info',
    user_id: user.id
  }]);

  return NextResponse.json({ success: true });
}
