import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';

export async function GET() {
  const { user, role, profile } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) return NextResponse.json({ logs: [] });

  let query = adminClient
    .from('audit_logs')
    .select('id, action, type, created_at, profiles:user_id(full_name, username)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (role === 'principal' && profile?.school_id) {
    query = query.eq('school_id', profile.school_id);
  }

  const { data, error } = await query;

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
  const { user, role, profile } = await getServerAuth();

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
        user_id: user.id,
        ...(profile?.school_id ? { school_id: profile.school_id } : {})
      }
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ log: data });
}

