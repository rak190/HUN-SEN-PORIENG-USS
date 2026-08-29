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
    return NextResponse.json({
      isDemo: false,
      settings: {
        maintenance_mode: false,
        environment: 'local',
        rls_enabled: true
      }
    });
  }

  try {
    const { data: settingsArray, error } = await adminClient
      .from('system_settings')
      .select('*');

    if (error) throw error;

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
  const { user, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const body = await req.json();
  const { key, value } = body;

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
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
