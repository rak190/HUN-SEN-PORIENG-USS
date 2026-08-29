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
    // 1. Fetch source and target class details including academic years
    const { data: sourceClass, error: sourceClassErr } = await adminClient
      .from('classes')
      .select('id, name, grade, academic_year_id')
      .eq('id', sourceClassId)
      .single();

    if (sourceClassErr || !sourceClass) {
      return NextResponse.json({ error: 'រកមិនឃើញថ្នាក់ប្រភពទេ (Source class not found).' }, { status: 400 });
    }

    const { data: targetClass, error: targetClassErr } = await adminClient
      .from('classes')
      .select('id, name, grade, academic_year_id')
      .eq('id', targetClassId)
      .single();

    if (targetClassErr || !targetClass) {
      return NextResponse.json({ error: 'រកមិនឃើញថ្នាក់គោលដៅទេ (Target class not found).' }, { status: 400 });
    }

    // 2. Fetch active students in source class
    const { data: students, error: fetchErr } = await adminClient
      .from('students')
      .select('id, desk_number, room_number, status')
      .eq('class_id', sourceClassId)
      .eq('is_active', true);

    if (fetchErr) throw fetchErr;

    if (!students || students.length === 0) {
      return NextResponse.json({ error: 'មិនមានសិស្សនៅក្នុងថ្នាក់ប្រភពនេះទេ (No students to promote).' }, { status: 400 });
    }

    const studentIds = students.map((s: any) => s.id);

    // 3. Preserve source year enrollment history if sourceClass has an academic_year_id
    if (sourceClass.academic_year_id) {
      const sourceEnrollments = students.map(s => ({
        student_id: s.id,
        class_id: sourceClassId,
        academic_year_id: sourceClass.academic_year_id,
        desk_number: s.desk_number || null,
        room_number: s.room_number || null,
        enrollment_status: s.status || 'active',
        year_result: 'promoted',
        updated_at: new Date().toISOString()
      }));

      await adminClient
        .from('student_enrollments')
        .upsert(sourceEnrollments, { onConflict: 'student_id,academic_year_id' });
    }

    // 4. Record new enrollment in target year if targetClass has an academic_year_id
    if (targetClass.academic_year_id) {
      const targetEnrollments = students.map(s => ({
        student_id: s.id,
        class_id: targetClassId,
        academic_year_id: targetClass.academic_year_id,
        enrollment_status: 'active',
        year_result: 'enrolled',
        updated_at: new Date().toISOString()
      }));

      await adminClient
        .from('student_enrollments')
        .upsert(targetEnrollments, { onConflict: 'student_id,academic_year_id' });
    }

    // 5. Update active class_id on students table
    const { error: updateErr } = await adminClient
      .from('students')
      .update({ 
        class_id: targetClassId,
        updated_at: new Date().toISOString()
      })
      .in('id', studentIds);

    if (updateErr) throw updateErr;

    // 6. Log in audit logs
    await adminClient.from('audit_logs').insert({
      user_id: user.id,
      action: `បានផ្ទេរ/ឡើងថ្នាក់សិស្សចំនួន ${studentIds.length} នាក់ពី ${sourceClass.name} ទៅ ${targetClass.name}`,
    });

    return NextResponse.json({ 
      isDemo: false,
      success: true, 
      count: studentIds.length,
      message: `បានផ្ទេរ ឬឡើងថ្នាក់សិស្សចំនួន ${studentIds.length} នាក់ពី ${sourceClass.name} ទៅ ${targetClass.name} ដោយរក្សាទុកប្រវត្តិកំណត់ត្រាជោគជ័យ!`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
