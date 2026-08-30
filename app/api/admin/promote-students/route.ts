import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';

export async function POST(req: Request) {
  const { user, role } = await getServerAuth();

  if (!user || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const body = await req.json();
  const { sourceClassId, targetClassId } = body;

  if (!sourceClassId || !targetClassId) {
    return NextResponse.json({ error: 'Source and Target Class IDs are required.' }, { status: 400 });
  }

  if (sourceClassId === targetClassId) {
    return NextResponse.json({ error: 'Source and Target Classes cannot be the same.' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    const { data, error } = await adminClient.rpc('promote_students', {
      p_source_class_id: sourceClassId,
      p_target_class_id: targetClassId
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
