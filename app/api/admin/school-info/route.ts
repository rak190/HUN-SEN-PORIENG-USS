import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user || (user.user_metadata?.role !== 'admin' && user.user_metadata?.role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'school_info')
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is not found
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ schoolInfo: data?.value || null });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user || (user.user_metadata?.role !== 'admin' && user.user_metadata?.role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const body = await req.json();
  const { schoolInfo } = body;

  if (!schoolInfo) {
    return NextResponse.json({ error: 'schoolInfo is required' }, { status: 400 });
  }

  const { error } = await supabase
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
  await supabase.from('audit_logs').insert([{
    action: `Updated School Information & GIEP settings`,
    type: 'info',
    user_id: user.id
  }]);

  return NextResponse.json({ success: true });
}
