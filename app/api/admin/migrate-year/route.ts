import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';

export async function POST(req: Request) {
  const { user, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal')) {
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
    // 1. Fetch all classes from source year including MoEYS metadata
    const { data: sourceClasses, error: fetchErr } = await adminClient
      .from('classes')
      .select('name, grade, teacher_id, shift, room_number, track')
      .eq('academic_year_id', sourceYearId);

    if (fetchErr) throw fetchErr;

    if (!sourceClasses || sourceClasses.length === 0) {
      return NextResponse.json({ error: 'ឆ្នាំសិក្សាប្រភពមិនទាន់មានថ្នាក់រៀនសម្រាប់ចម្លងទេ។' }, { status: 400 });
    }

    // 2. Fetch existing classes in target year to avoid duplicates
    const { data: targetClasses, error: targetErr } = await adminClient
      .from('classes')
      .select('name')
      .eq('academic_year_id', targetYearId);

    if (targetErr) throw targetErr;

    const existingNames = new Set((targetClasses || []).map(c => c.name.trim().toLowerCase()));

    // 3. Filter only classes that don't already exist in the target year, preserving shift, room, track
    const newClassesToInsert = sourceClasses
      .filter(c => !existingNames.has(c.name.trim().toLowerCase()))
      .map(c => ({
        name: c.name,
        grade: String(c.grade),
        teacher_id: c.teacher_id,
        shift: c.shift || (['10', '11', '12'].includes(String(c.grade)) ? 'ព្រឹក' : 'រសៀល'),
        room_number: c.room_number || null,
        track: c.track || 'ទូទៅ',
        academic_year_id: targetYearId
      }));

    if (newClassesToInsert.length === 0) {
      return NextResponse.json({ 
        isDemo: false,
        success: true, 
        count: 0,
        message: 'ថ្នាក់រៀនទាំងអស់មានរួចហើយនៅក្នុងឆ្នាំសិក្សាគោលដៅ។'
      });
    }

    // 4. Batch insert into the target academic year
    const { error: insertErr } = await adminClient
      .from('classes')
      .insert(newClassesToInsert);

    if (insertErr) throw insertErr;

    return NextResponse.json({ 
      isDemo: false,
      success: true, 
      count: newClassesToInsert.length,
      message: `បានចម្លងរចនាសម្ព័ន្ធថ្នាក់រៀនចំនួន ${newClassesToInsert.length} ថ្នាក់ទៅឆ្នាំថ្មីជោគជ័យ!`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
