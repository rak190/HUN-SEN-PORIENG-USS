import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const adminClient = createAdminClient();

  if (!adminClient) {
    // Demo fallback
    return NextResponse.json({
      isDemo: true,
      settings: {
        maintenance_mode: false,
        environment: 'production',
        rls_enabled: true
      }
    });
  }

  try {
    const { data: settingsArray, error } = await adminClient
      .from('system_settings')
      .select('*');

    if (error) throw error;

    // Convert array of {key, value} to object
    const settings: Record<string, any> = {};
    if (settingsArray) {
      settingsArray.forEach(row => {
        settings[row.key] = row.value;
      });
    }

    return NextResponse.json({ isDemo: false, settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const body = await req.json();
  const { key, value } = body;

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ isDemo: true, success: true });
  }

  try {
    const { error } = await adminClient
      .from('system_settings')
      .upsert({ 
        key, 
        value, 
        updated_at: new Date().toISOString(),
        updated_by: user.id 
      });

    if (error) throw error;

    return NextResponse.json({ isDemo: false, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
