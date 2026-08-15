import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user || (user.user_metadata?.role !== 'admin' && user.user_metadata?.role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  // Fetch the latest 50 logs
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Reverse them to show oldest first in the UI terminal (tail -f style)
  const logs = data.reverse();
  return NextResponse.json({ logs });
}

export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user || (user.user_metadata?.role !== 'admin' && user.user_metadata?.role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const body = await req.json();
  const { action, type = 'info' } = body;

  if (!action) {
    return NextResponse.json({ error: 'Action string is required' }, { status: 400 });
  }

  const { data, error } = await supabase
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
