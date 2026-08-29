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
      source_class_id: sourceClassId,
      target_class_id: targetClassId,
      admin_user_id: user.id
    });

    if (error) throw error;

    // Log the promotion
    await adminClient.from('audit_logs').insert([
      {
        action: `បានដំឡើងថ្នាក់សិស្សពីថ្នាក់ ${sourceClassId} ទៅថ្នាក់ ${targetClassId}`,
        type: 'warn',
        user_id: user.id,
      }
    ]);

    return NextResponse.json({ 
      isDemo: false,
      ...data
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
