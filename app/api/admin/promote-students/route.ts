import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';

export async function POST(req: Request) {
  const { user, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal')) {
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
    // 1. Fetch active students in source class
    const { data: students, error: fetchErr } = await adminClient
      .from('students')
      .select('id')
      .eq('class_id', sourceClassId)
      .eq('is_active', true);

    if (fetchErr) throw fetchErr;

    if (!students || students.length === 0) {
      return NextResponse.json({ error: 'មិនមានសិស្សនៅក្នុងថ្នាក់ប្រភពនេះទេ (No students to promote).' }, { status: 400 });
    }

    const studentIds = students.map((s: any) => s.id);

    // 2. Update their class_id
    const { error: updateErr } = await adminClient
      .from('students')
      .update({ class_id: targetClassId })
      .in('id', studentIds);

    if (updateErr) throw updateErr;

    return NextResponse.json({ 
      isDemo: false,
      success: true, 
      count: studentIds.length,
      message: `បានផ្ទេរ ឬឡើងថ្នាក់សិស្សចំនួន ${studentIds.length} នាក់ជោគជ័យ!`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
