import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || (user.user_metadata?.role !== 'admin' && user.user_metadata?.role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({
      isDemo: true,
      academicYears: [
        { id: 'ay-demo-1', name: '2026-2027', is_active: true, is_archived: false, start_date: '2026-10-01' },
        { id: 'ay-demo-2', name: '2025-2026', is_active: false, is_archived: true, start_date: '2025-10-01' },
      ]
    });
  }

  try {
    const { data: academicYears, error } = await adminClient
      .from('academic_years')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ isDemo: false, academicYears });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || (user.user_metadata?.role !== 'admin' && user.user_metadata?.role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const body = await req.json();
  const { name, start_date } = body;

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({
      isDemo: true,
      academicYear: { id: `ay-demo-${Date.now()}`, name, start_date, is_active: false, is_archived: false }
    });
  }

  try {
    const { data: newYear, error } = await adminClient
      .from('academic_years')
      .insert([{ name, start_date: start_date || null }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ isDemo: false, academicYear: newYear });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || (user.user_metadata?.role !== 'admin' && user.user_metadata?.role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const body = await req.json();
  const { id, is_active, is_archived, name, start_date } = body;

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ isDemo: true, success: true });
  }

  try {
    // If setting a new active year, deactivate others
    if (is_active) {
      await adminClient.from('academic_years').update({ is_active: false }).neq('id', id);
    }

    const updateData: any = {};
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_archived !== undefined) updateData.is_archived = is_archived;
    if (name !== undefined) updateData.name = name;
    if (start_date !== undefined) updateData.start_date = start_date || null;

    const { error } = await adminClient
      .from('academic_years')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ isDemo: false, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || (user.user_metadata?.role !== 'admin' && user.user_metadata?.role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Academic Year ID required.' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ isDemo: true, success: true });
  }

  try {
    // Safety check: ensure no classes belong to this academic year
    const { count, error: countErr } = await adminClient
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('academic_year_id', id);

    if (countErr) throw countErr;
    if (count && count > 0) {
      return NextResponse.json({ 
        error: `មិនអាចលុបឆ្នាំសិក្សានេះបានទេ ដោយសារមានថ្នាក់រៀនចំនួន ${count} កំពុងប្រើប្រាស់វា។ សូមលុប ឬប្តូរថ្នាក់រៀនជាមុនសិន។` 
      }, { status: 400 });
    }

    const { error } = await adminClient
      .from('academic_years')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ isDemo: false, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
