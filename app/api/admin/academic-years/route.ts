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
      academicYears: []
    });
  }

  try {
    const { data: academicYears, error } = await adminClient
      .from('academic_years')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ isDemo: false, academicYears: academicYears || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const body = await req.json();
  const { name, start_date, end_date } = body;

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
  }

  try {
    const { data: newYear, error } = await adminClient
      .from('academic_years')
      .insert([{ 
        name, 
        start_date: start_date || null, 
        end_date: end_date || null,
        is_active: false, 
        is_current: false 
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ isDemo: false, academicYear: newYear });
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
  const { id, is_active, is_archived, name, start_date } = body;

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
  }

  try {
    // If setting a new active year, deactivate others and auto-archive
    if (is_active) {
      // 1. Get the currently active years
      const { data: activeYears } = await adminClient
        .from('academic_years')
        .select('id')
        .eq('is_active', true)
        .neq('id', id);

      // 2. Set them to inactive and archived
      if (activeYears && activeYears.length > 0) {
        const activeYearIds = activeYears.map((y: any) => y.id);
        
        await adminClient
          .from('academic_years')
          .update({ is_active: false, is_current: false, is_archived: true })
          .in('id', activeYearIds);
          
        // 3. Auto-archive all classes belonging to these old years
        await adminClient
          .from('classes')
          .update({ is_archived: true })
          .in('academic_year_id', activeYearIds);
      }
    }

    const updateData: any = {};
    if (is_active !== undefined) {
      updateData.is_active = is_active;
      updateData.is_current = is_active;
    }
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
  const { user, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Academic Year ID required.' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
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
