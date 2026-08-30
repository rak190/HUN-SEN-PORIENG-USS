import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';

export async function POST(req: Request) {
  const { user, role } = await getServerAuth();

  if (!user || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const body = await req.json();
  const { sourceYearId, targetYearId } = body;

  if (!sourceYearId || !targetYearId) {
    return NextResponse.json({ error: 'Source and Target Academic Year IDs are required.' }, { status: 400 });
  }

  if (sourceYearId === targetYearId) {
    return NextResponse.json({ error: 'Source and Target Academic Years cannot be identical.' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    const { data, error } = await adminClient.rpc('migrate_academic_year', {
      p_source_year_id: sourceYearId,
      p_target_year_id: targetYearId
    });

    if (error) throw error;

    return NextResponse.json({ 
      isDemo: false,
      ...data
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
