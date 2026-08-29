import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';

export async function GET() {
  const { user, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) return NextResponse.json({ logs: [] });

  // Fetch the latest 200 logs with user profile
  const { data, error } = await adminClient
    .from('audit_logs')
    .select('id, action, type, created_at, profiles:user_id(full_name, username)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mappedLogs = (data || []).map((log: any) => ({
    id: log.id,
    time: new Date(log.created_at).toLocaleString('km-KH'),
    user: log.profiles?.username || log.profiles?.full_name || 'System',
    action: log.action,
    type: log.type,
    status: 'បានកត់ត្រា'
  }));

  return NextResponse.json({ logs: mappedLogs });
}

export async function POST(req: Request) {
  const { user, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  const body = await req.json();
  const { action, type = 'info' } = body;

  if (!action) {
    return NextResponse.json({ error: 'Action string is required' }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from('audit_logs')
    .insert([
      {
        action,
        type,
        user_id: user.id
      }
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ log: data });
}

export async function DELETE(req: Request) {
  const { user, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode');

    if (mode === 'old') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      await adminClient.from('audit_logs').delete().lt('created_at', thirtyDaysAgo.toISOString());
    } else {
      // Clear all
      await adminClient.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
