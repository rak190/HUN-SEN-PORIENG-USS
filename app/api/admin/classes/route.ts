import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || (user.user_metadata?.role !== 'admin' && user.user_metadata?.role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get('academic_year_id');
  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({
      isDemo: true,
      classes: [
        { id: 'cls-1', name: 'ថ្នាក់ ១០ ក', shift: 'ព្រឹក', room_number: '១០១', track: 'ទូទៅ', teacher_id: null, grade: '10', student_count: 38, female_count: 20 },
        { id: 'cls-2', name: 'ថ្នាក់ ១០ ខ', shift: 'ព្រឹក', room_number: '១០២', track: 'ទូទៅ', teacher_id: null, grade: '10', student_count: 48, female_count: 26 },
        { id: 'cls-3', name: 'ថ្នាក់ ១១ ក', shift: 'ព្រឹក', room_number: '២០១', track: 'វិទ្យាសាស្ត្រពិត', teacher_id: null, grade: '11', student_count: 35, female_count: 18 },
        { id: 'cls-4', name: 'ថ្នាក់ ១២ ក', shift: 'ព្រឹក', room_number: '២០២', track: 'វិទ្យាសាស្ត្រសង្គម', teacher_id: null, grade: '12', student_count: 42, female_count: 22 },
        { id: 'cls-5', name: 'ថ្នាក់ ៧ ក', shift: 'រសៀល', room_number: '១០១', track: 'ទូទៅ', teacher_id: null, grade: '7', student_count: 0, female_count: 0 },
        { id: 'cls-6', name: 'ថ្នាក់ ៨ ក', shift: 'រសៀល', room_number: '១០២', track: 'ទូទៅ', teacher_id: null, grade: '8', student_count: 39, female_count: 19 },
      ]
    });
  }

  try {
    let query = adminClient
      .from('classes')
      .select('*, profiles:teacher_id(id, full_name), students(id, gender, is_active)')
      .order('name', { ascending: true });

    if (academicYearId) {
      query = query.eq('academic_year_id', academicYearId);
    }

    const { data: classesData, error } = await query;

    if (error) throw error;

    // Calculate live student enrollment counts per class
    const classes = (classesData || []).map((c: any) => {
      const activeStudents = (c.students || []).filter((s: any) => s.is_active !== false);
      const student_count = activeStudents.length;
      const female_count = activeStudents.filter((s: any) => s.gender === 'F' || s.gender === 'ស្រី').length;
      const { students: _, ...rest } = c;
      return {
        ...rest,
        shift: rest.shift || (['10', '11', '12'].includes(String(rest.grade)) ? 'ព្រឹក' : 'រសៀល'),
        room_number: rest.room_number || '',
        track: rest.track || 'ទូទៅ',
        student_count,
        female_count
      };
    });

    return NextResponse.json({ isDemo: false, classes });
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
  const adminClient = createAdminClient();

  // Batch insert support (e.g. from Bulk Generate or Excel Import)
  if (Array.isArray(body.classes)) {
    if (!adminClient) {
      const demoClasses = body.classes.map((c: any, idx: number) => ({
        id: `cls-batch-${Date.now()}-${idx}`,
        ...c,
        shift: c.shift || 'ព្រឹក',
        room_number: c.room_number || '',
        track: c.track || 'ទូទៅ',
        teacher_id: c.teacher_id || null,
        student_count: 0,
        female_count: 0
      }));
      return NextResponse.json({ isDemo: true, classes: demoClasses });
    }

    try {
      const records = body.classes.map((c: any) => ({
        name: c.name,
        grade: String(c.grade),
        academic_year_id: c.academic_year_id,
        teacher_id: c.teacher_id || null,
        shift: c.shift || (['10', '11', '12'].includes(String(c.grade)) ? 'ព្រឹក' : 'រសៀល'),
        room_number: c.room_number || null,
        track: c.track || 'ទូទៅ'
      }));

      const { data: inserted, error } = await adminClient
        .from('classes')
        .insert(records)
        .select('*, profiles:teacher_id(id, full_name)');

      if (error) throw error;

      const classesWithCounts = (inserted || []).map((c: any) => ({
        ...c,
        student_count: 0,
        female_count: 0
      }));

      return NextResponse.json({ isDemo: false, classes: classesWithCounts });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Single class insert support
  const { name, grade, academic_year_id, teacher_id, shift, room_number, track } = body;

  if (!adminClient) {
    return NextResponse.json({
      isDemo: true,
      class: { 
        id: `cls-demo-${Date.now()}`, 
        name, 
        grade, 
        academic_year_id, 
        teacher_id: teacher_id || null,
        shift: shift || 'ព្រឹក',
        room_number: room_number || '',
        track: track || 'ទូទៅ',
        student_count: 0,
        female_count: 0
      }
    });
  }

  try {
    // Check for duplicates first
    const { data: existingClass, error: duplicateCheckErr } = await adminClient
      .from('classes')
      .select('id')
      .ilike('name', name.trim())
      .eq('academic_year_id', academic_year_id)
      .maybeSingle();

    if (duplicateCheckErr) throw duplicateCheckErr;
    if (existingClass) {
      return NextResponse.json({ error: `ថ្នាក់ឈ្មោះ "${name}" មានរួចហើយនៅក្នុងឆ្នាំសិក្សានេះ!` }, { status: 400 });
    }

    const { data: newClass, error } = await adminClient
      .from('classes')
      .insert([{ 
        name: name.trim(), 
        grade: String(grade), 
        academic_year_id,
        teacher_id: teacher_id || null,
        shift: shift || (['10', '11', '12'].includes(String(grade)) ? 'ព្រឹក' : 'រសៀល'),
        room_number: room_number || null,
        track: track || 'ទូទៅ'
      }])
      .select('*, profiles:teacher_id(id, full_name)')
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      isDemo: false, 
      class: { ...newClass, student_count: 0, female_count: 0 } 
    });
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
  const { id, teacher_id, name, grade, shift, room_number, track } = body;

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ isDemo: true, success: true });
  }

  try {
    const updateData: any = {};
    if (teacher_id !== undefined) updateData.teacher_id = teacher_id || null;
    if (name !== undefined) updateData.name = name;
    if (grade !== undefined) updateData.grade = String(grade);
    if (shift !== undefined) updateData.shift = shift;
    if (room_number !== undefined) updateData.room_number = room_number || null;
    if (track !== undefined) updateData.track = track;

    const { error } = await adminClient
      .from('classes')
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
    return NextResponse.json({ error: 'Class ID required.' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ isDemo: true, success: true });
  }

  try {
    // Safety check: ensure no students belong to this class before deleting
    const { count, error: countErr } = await adminClient
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', id);

    if (countErr) throw countErr;
    if (count && count > 0) {
      return NextResponse.json({ 
        error: `មិនអាចលុបថ្នាក់នេះបានទេ ព្រោះមានសិស្សកំពុងរៀនចំនួន ${count} នាក់! សូមផ្ទេរសិស្សចេញសិនមុននឹងលុបថ្នាក់។` 
      }, { status: 400 });
    }

    const { error } = await adminClient
      .from('classes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ isDemo: false, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

