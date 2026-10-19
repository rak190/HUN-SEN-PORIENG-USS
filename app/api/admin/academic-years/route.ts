import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';

export async function GET() {
  const { user, profile, role } = await getServerAuth();

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
    let query = adminClient
      .from('academic_years')
      .select('*')
      .order('start_date', { ascending: false });

    if (profile?.school_id) {
      query = query.or(`school_id.eq.${profile.school_id},school_id.eq.main-school`);
    }

    const { data: academicYears, error } = await query;

    if (error) throw error;

    return NextResponse.json({ isDemo: false, academicYears: academicYears || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user, profile, role } = await getServerAuth();

  if (!user || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized. Only Admins can modify academic years.' }, { status: 403 });
  }

  const body = await req.json();
  const { name, start_date, end_date, is_active } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ 
      error: 'សូមបញ្ចូលឈ្មោះឆ្នាំសិក្សាឱ្យបានត្រឹមត្រូវ (Academic year name is required)' 
    }, { status: 400 });
  }

  if (!start_date) {
    return NextResponse.json({ 
      error: 'សូមបញ្ចូលកាលបរិច្ឆេទចាប់ផ្តើមឱ្យបានត្រឹមត្រូវ (Start date is required)' 
    }, { status: 400 });
  }

  const startDateObj = new Date(start_date);
  if (isNaN(startDateObj.getTime())) {
    return NextResponse.json({ 
      error: 'កាលបរិច្ឆេទចាប់ផ្តើមមិនត្រឹមត្រូវតាមទម្រង់ (Invalid start date format)' 
    }, { status: 400 });
  }

  // Calculate or validate effective end date
  let effectiveEndDate = end_date;
  if (!effectiveEndDate) {
    // Standard Cambodian academic year spans ~10 months (e.g., Nov to Aug/Oct)
    const derivedEnd = new Date(startDateObj);
    derivedEnd.setMonth(derivedEnd.getMonth() + 10);
    effectiveEndDate = derivedEnd.toISOString().split('T')[0];
  } else {
    const endDateObj = new Date(effectiveEndDate);
    if (isNaN(endDateObj.getTime())) {
      return NextResponse.json({ 
        error: 'កាលបរិច្ឆេទបញ្ចប់មិនត្រឹមត្រូវតាមទម្រង់ (Invalid end date format)' 
      }, { status: 400 });
    }
    if (startDateObj >= endDateObj) {
      return NextResponse.json({ 
        error: 'កាលបរិច្ឆេទចាប់ផ្តើមត្រូវតែនៅមុនកាលបរិច្ឆេទបញ្ចប់ (Start date must be before end date)' 
      }, { status: 400 });
    }
  }

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
  }

  const targetSchoolId = profile?.school_id || 'main-school';

  try {
    // Check if an academic year with the same name already exists in this school
    const { data: existing } = await adminClient
      .from('academic_years')
      .select('id, name')
      .eq('school_id', targetSchoolId)
      .ilike('name', name.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ 
        error: `ឈ្មោះឆ្នាំសិក្សា "${name.trim()}" មានរួចហើយក្នុងប្រព័ន្ធ។ (Academic year name already exists)` 
      }, { status: 400 });
    }

    const shouldBeActive = is_active === true;

    // If setting as active, close previous active years (trigger syncs is_active & is_current)
    if (shouldBeActive) {
      await adminClient
        .from('academic_years')
        .update({ status: 'closed', is_active: false })
        .eq('school_id', targetSchoolId)
        .eq('status', 'active');
    }

    const { data: newYear, error } = await adminClient
      .from('academic_years')
      .insert([{ 
        school_id: targetSchoolId,
        name: name.trim(), 
        start_date: start_date, 
        end_date: effectiveEndDate,
        status: shouldBeActive ? 'active' : 'planned', // status: 'planned' by default
        is_active: shouldBeActive,
        is_archived: false 
      }])
      .select()
      .single();

    if (error) throw error;

    // Record in audit_logs
    await adminClient.from('audit_logs').insert([{
      action: 'CREATE_ACADEMIC_YEAR',
      user_id: user.id,
      school_id: targetSchoolId,
      target_table: 'academic_years',
      record_id: newYear.id,
      status: 'success',
      details: {
        name: newYear.name,
        start_date: newYear.start_date,
        end_date: newYear.end_date,
        status: newYear.status,
        is_active: newYear.is_active
      }
    }]);

    return NextResponse.json({ isDemo: false, success: true, academicYear: newYear });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { user, profile, role } = await getServerAuth();

  if (!user || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized. Only Admins can modify academic years.' }, { status: 403 });
  }

  const body = await req.json();
  const { id, is_active, is_archived, name, start_date, end_date } = body;

  if (!id) {
    return NextResponse.json({ error: 'Academic year ID is required' }, { status: 400 });
  }

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return NextResponse.json({ 
      error: 'ឈ្មោះឆ្នាំសិក្សាមិនអាចទទេបានទេ (Academic year name cannot be empty)' 
    }, { status: 400 });
  }

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
  }

  const targetSchoolId = profile?.school_id || 'main-school';

  try {
    // Validate date sequence if dates are provided in update
    if (start_date !== undefined || end_date !== undefined) {
      let effectiveStart = start_date;
      let effectiveEnd = end_date;

      if (!effectiveStart || !effectiveEnd) {
        const { data: existingRow } = await adminClient
          .from('academic_years')
          .select('start_date, end_date')
          .eq('id', id)
          .maybeSingle();

        if (existingRow) {
          if (!effectiveStart) effectiveStart = existingRow.start_date;
          if (!effectiveEnd) effectiveEnd = existingRow.end_date;
        }
      }

      if (effectiveStart && effectiveEnd) {
        const startObj = new Date(effectiveStart);
        const endObj = new Date(effectiveEnd);
        if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) {
          return NextResponse.json({ error: 'កាលបរិច្ឆេទមិនត្រឹមត្រូវតាមទម្រង់ (Invalid date format)' }, { status: 400 });
        }
        if (startObj >= endObj) {
          return NextResponse.json({ 
            error: 'កាលបរិច្ឆេទចាប់ផ្តើមត្រូវតែនៅមុនកាលបរិច្ឆេទបញ្ចប់ (Start date must be before end date)' 
          }, { status: 400 });
        }
      }
    }

    // If activating a new academic year, close active peers and auto-archive
    if (is_active) {
      // 1. Get currently active years
      const { data: activeYears } = await adminClient
        .from('academic_years')
        .select('id')
        .eq('school_id', targetSchoolId)
        .eq('status', 'active')
        .neq('id', id);

      // 2. Set them to closed and archived
      if (activeYears && activeYears.length > 0) {
        const activeYearIds = activeYears.map((y: any) => y.id);
        
        await adminClient
          .from('academic_years')
          .update({ status: 'closed', is_active: false, is_archived: true })
          .in('id', activeYearIds);
          
        // 3. Auto-archive all classes belonging to these old years
        await adminClient
          .from('classes')
          .update({ is_archived: true })
          .in('academic_year_id', activeYearIds);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (is_active !== undefined) {
      updateData.is_active = is_active;
      updateData.status = is_active ? 'active' : 'closed';
    }
    if (is_archived !== undefined) {
      updateData.is_archived = is_archived;
      if (is_archived && !is_active) {
        updateData.status = 'archived';
      }
    }
    if (name !== undefined) updateData.name = name.trim();
    if (start_date !== undefined) updateData.start_date = start_date || null;
    if (end_date !== undefined) updateData.end_date = end_date || null;

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
  const { user, profile, role } = await getServerAuth();

  if (!user || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized. Only Admins can delete academic years.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  let id = searchParams.get('id');

  // Support ID via JSON body as well
  if (!id) {
    try {
      const body = await req.json();
      id = body?.id;
    } catch {
      // Body was empty or not json
    }
  }

  if (!id) {
    return NextResponse.json({ error: 'Academic Year ID required.' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
  }

  const targetSchoolId = profile?.school_id || 'main-school';

  try {
    // 1. Fetch the target academic year
    const { data: targetYear, error: fetchErr } = await adminClient
      .from('academic_years')
      .select('id, name, status, is_active, school_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (!targetYear) {
      return NextResponse.json({ error: 'រកមិនឃើញឆ្នាំសិក្សានេះទេ (Academic year not found).' }, { status: 404 });
    }

    // Verify school boundary
    if (targetYear.school_id && targetYear.school_id !== targetSchoolId) {
      return NextResponse.json({ error: 'Forbidden: Cannot delete academic year of another school.' }, { status: 403 });
    }

    // 2. SAFETY GUARD: Active Year Protection
    if (targetYear.status === 'active' || targetYear.is_active === true) {
      return NextResponse.json({ 
        error: 'មិនអាចលុបឆ្នាំសិក្សាដែលកំពុងដំណើរការ (Active) បានទេ។ សូមកំណត់ឆ្នាំសិក្សាផ្សេងជា Active ជាមុនសិន។' 
      }, { status: 400 });
    }

    // 3. SAFETY GUARD: Classes Dependency Check
    const { count: classCount, error: classErr } = await adminClient
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .eq('academic_year_id', id);

    if (classErr) throw classErr;
    if (classCount && classCount > 0) {
      return NextResponse.json({ 
        error: `មិនអាចលុបឆ្នាំសិក្សានេះបានទេ ដោយសារមានថ្នាក់រៀនចំនួន ${classCount} ថ្នាក់កំពុងប្រើប្រាស់វា។` 
      }, { status: 400 });
    }

    // 4. SAFETY GUARD: Student Enrollments Dependency Check
    const { count: enrollmentCount, error: enrollErr } = await adminClient
      .from('student_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('academic_year_id', id);

    if (enrollErr) throw enrollErr;
    if (enrollmentCount && enrollmentCount > 0) {
      return NextResponse.json({ 
        error: `មិនអាចលុបឆ្នាំសិក្សានេះបានទេ ដោយសារមានសិស្សចុះឈ្មោះចំនួន ${enrollmentCount} នាក់នៅក្នុងឆ្នាំសិក្សានេះ។` 
      }, { status: 400 });
    }

    // 5. SAFETY GUARD: Grades Dependency Check
    const { count: gradeCount, error: gradeErr } = await adminClient
      .from('grades')
      .select('id', { count: 'exact', head: true })
      .eq('academic_year_id', id);

    if (gradeErr) throw gradeErr;
    if (gradeCount && gradeCount > 0) {
      return NextResponse.json({ 
        error: `មិនអាចលុបឆ្នាំសិក្សានេះបានទេ ដោយសារមានកំណត់ត្រាពិន្ទុនៅក្នុងឆ្នាំសិក្សានេះ។` 
      }, { status: 400 });
    }

    // 6. SAFETY GUARD: Attendance Records Dependency Check
    const { count: attendanceCount, error: attErr } = await adminClient
      .from('attendance_records')
      .select('id', { count: 'exact', head: true })
      .eq('academic_year_id', id);

    if (attErr) throw attErr;
    if (attendanceCount && attendanceCount > 0) {
      return NextResponse.json({ 
        error: `មិនអាចលុបឆ្នាំសិក្សានេះបានទេ ដោយសារមានកំណត់ត្រាវត្តមាននៅក្នុងឆ្នាំសិក្សានេះ។` 
      }, { status: 400 });
    }

    // 7. Clean up attached exam standards & grading scales for unused academic year
    await adminClient
      .from('exam_grading_scales')
      .delete()
      .eq('academic_year_id', id);

    await adminClient
      .from('exam_subject_standards')
      .delete()
      .eq('academic_year_id', id);

    // Execute deletion of accidental/unused year
    const { error: delErr } = await adminClient
      .from('academic_years')
      .delete()
      .eq('id', id);

    if (delErr) throw delErr;

    // Log to audit_logs
    await adminClient.from('audit_logs').insert([{
      action: 'DELETE_ACADEMIC_YEAR',
      user_id: user.id,
      school_id: targetSchoolId,
      target_table: 'academic_years',
      record_id: id,
      status: 'success',
      details: {
        deleted_year_id: id,
        name: targetYear.name,
        status: targetYear.status
      }
    }]);

    return NextResponse.json({ isDemo: false, success: true, message: 'បានលុបឆ្នាំសិក្សាជោគជ័យ' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
