'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';

export async function createAcademicYearAction(payload: { name: string; start_date: string; end_date?: string }) {
  const { user, profile } = await requireAdmin();
  const adminClient = createAdminClient();

  if (!adminClient) {
    return { success: false, error: 'Database service unavailable' };
  }

  const { name, start_date, end_date } = payload;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { success: false, error: 'សូមបញ្ចូលឈ្មោះឆ្នាំសិក្សាឱ្យបានត្រឹមត្រូវ' };
  }

  if (!start_date) {
    return { success: false, error: 'សូមបញ្ចូលកាលបរិច្ឆេទចាប់ផ្តើមឱ្យបានត្រឹមត្រូវ' };
  }

  const startDateObj = new Date(start_date);
  if (isNaN(startDateObj.getTime())) {
    return { success: false, error: 'កាលបរិច្ឆេទចាប់ផ្តើមមិនត្រឹមត្រូវតាមទម្រង់' };
  }

  let effectiveEndDate = end_date;
  if (!effectiveEndDate) {
    const derivedEnd = new Date(startDateObj);
    derivedEnd.setMonth(derivedEnd.getMonth() + 10);
    effectiveEndDate = derivedEnd.toISOString().split('T')[0];
  } else {
    const endDateObj = new Date(effectiveEndDate);
    if (isNaN(endDateObj.getTime())) {
      return { success: false, error: 'កាលបរិច្ឆេទបញ្ចប់មិនត្រឹមត្រូវតាមទម្រង់' };
    }
    if (startDateObj >= endDateObj) {
      return { success: false, error: 'កាលបរិច្ឆេទចាប់ផ្តើមត្រូវតែនៅមុនកាលបរិច្ឆេទបញ្ចប់' };
    }
  }

  const targetSchoolId = profile?.school_id || 'main-school';

  try {
    const { data: existing } = await adminClient
      .from('academic_years')
      .select('id')
      .eq('school_id', targetSchoolId)
      .ilike('name', name.trim())
      .maybeSingle();

    if (existing) {
      return { success: false, error: `ឈ្មោះឆ្នាំសិក្សា "${name.trim()}" មានរួចហើយក្នុងប្រព័ន្ធ។` };
    }

    const { data: newYear, error } = await adminClient
      .from('academic_years')
      .insert([{
        school_id: targetSchoolId,
        name: name.trim(),
        start_date,
        end_date: effectiveEndDate,
        status: 'planned',
        is_active: false,
        is_archived: false
      }])
      .select()
      .single();

    if (error) throw error;

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
        status: newYear.status
      }
    }]);

    revalidatePath('/admin/academic-setup');
    return { success: true, academicYear: newYear };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteAcademicYearAction(id: string) {
  const { user, profile } = await requireAdmin();
  const adminClient = createAdminClient();

  if (!adminClient) {
    return { success: false, error: 'Database service unavailable' };
  }

  const targetSchoolId = profile?.school_id || 'main-school';

  try {
    // 1. Fetch target academic year
    const { data: targetYear, error: fetchErr } = await adminClient
      .from('academic_years')
      .select('id, name, status, is_active, school_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!targetYear) {
      return { success: false, error: 'រកមិនឃើញឆ្នាំសិក្សានេះទេ' };
    }

    if (targetYear.school_id && targetYear.school_id !== targetSchoolId) {
      return { success: false, error: 'Forbidden: Cannot delete academic year of another school.' };
    }

    // 2. Active Year Protection
    if (targetYear.status === 'active' || targetYear.is_active === true) {
      return { 
        success: false, 
        error: 'មិនអាចលុបឆ្នាំសិក្សាដែលកំពុងដំណើរការ (Active) បានទេ។ សូមកំណត់ឆ្នាំសិក្សាផ្សេងជា Active ជាមុនសិន។' 
      };
    }

    // 3. Classes Check
    const { count: classCount } = await adminClient
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .eq('academic_year_id', id);

    if (classCount && classCount > 0) {
      return { 
        success: false, 
        error: `មិនអាចលុបឆ្នាំសិក្សានេះបានទេ ដោយសារមានថ្នាក់រៀនចំនួន ${classCount} ថ្នាក់កំពុងប្រើប្រាស់វា។` 
      };
    }

    // 4. Enrollments Check
    const { count: enrollmentCount } = await adminClient
      .from('student_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('academic_year_id', id);

    if (enrollmentCount && enrollmentCount > 0) {
      return { 
        success: false, 
        error: `មិនអាចលុបឆ្នាំសិក្សានេះបានទេ ដោយសារមានសិស្សចុះឈ្មោះចំនួន ${enrollmentCount} នាក់នៅក្នុងឆ្នាំសិក្សានេះ។` 
      };
    }

    // 5. Grades Check
    const { count: gradeCount } = await adminClient
      .from('grades')
      .select('id', { count: 'exact', head: true })
      .eq('academic_year_id', id);

    if (gradeCount && gradeCount > 0) {
      return { 
        success: false, 
        error: 'មិនអាចលុបឆ្នាំសិក្សានេះបានទេ ដោយសារមានកំណត់ត្រាពិន្ទុនៅក្នុងឆ្នាំសិក្សានេះ។' 
      };
    }

    // 6. Attendance Check
    const { count: attendanceCount } = await adminClient
      .from('attendance_records')
      .select('id', { count: 'exact', head: true })
      .eq('academic_year_id', id);

    if (attendanceCount && attendanceCount > 0) {
      return { 
        success: false, 
        error: 'មិនអាចលុបឆ្នាំសិក្សានេះបានទេ ដោយសារមានកំណត់ត្រាវត្តមាននៅក្នុងឆ្នាំសិក្សានេះ។' 
      };
    }

    // 7. Exam Standards Check
    const { count: standardCount } = await adminClient
      .from('exam_subject_standards')
      .select('id', { count: 'exact', head: true })
      .eq('academic_year_id', id);

    if (standardCount && standardCount > 0) {
      return { 
        success: false, 
        error: 'មិនអាចលុបឆ្នាំសិក្សានេះបានទេ ដោយសារមានស្តង់ដារវិញ្ញាសាប្រឡងភ្ជាប់ជាមួយឆ្នាំសិក្សានេះ។' 
      };
    }

    // Delete
    const { error: delErr } = await adminClient
      .from('academic_years')
      .delete()
      .eq('id', id);

    if (delErr) throw delErr;

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

    revalidatePath('/admin/academic-setup');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function activateAcademicYear(id: string) {
  const { user, profile } = await requireAdmin();
  const adminClient = createAdminClient();
  if (!adminClient) return { success: false, error: 'Database service unavailable' };
  
  const targetSchoolId = profile?.school_id || 'main-school';

  // 1. Close other active years in this school
  await adminClient
    .from('academic_years')
    .update({ status: 'closed', is_active: false })
    .eq('school_id', targetSchoolId)
    .eq('status', 'active');
  
  // 2. Set new active
  const { error } = await adminClient
    .from('academic_years')
    .update({ status: 'active', is_active: true })
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  
  await adminClient.from('audit_logs').insert([{
    action: 'ACTIVATE_ACADEMIC_YEAR',
    user_id: user.id,
    school_id: targetSchoolId,
    target_table: 'academic_years',
    record_id: id,
    status: 'success'
  }]);

  revalidatePath('/admin/academic-setup');
  return { success: true };
}

export async function closeAcademicYear(id: string) {
  const { user, profile } = await requireAdmin();
  const adminClient = createAdminClient();
  if (!adminClient) return { success: false, error: 'Database service unavailable' };

  const { error } = await adminClient
    .from('academic_years')
    .update({ status: 'closed', is_active: false })
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  
  await adminClient.from('audit_logs').insert([{
    action: 'CLOSE_ACADEMIC_YEAR',
    user_id: user.id,
    school_id: profile?.school_id || 'main-school',
    target_table: 'academic_years',
    record_id: id,
    status: 'success'
  }]);

  revalidatePath('/admin/academic-setup');
  return { success: true };
}

export async function reopenAcademicYear(id: string, reason: string) {
  const { user, profile } = await requireAdmin();
  const adminClient = createAdminClient();
  if (!adminClient) return { success: false, error: 'Database service unavailable' };

  const targetSchoolId = profile?.school_id || 'main-school';
  
  // Ensure no other year is active
  await adminClient
    .from('academic_years')
    .update({ status: 'closed', is_active: false })
    .eq('school_id', targetSchoolId)
    .eq('status', 'active');
  
  const { error } = await adminClient
    .from('academic_years')
    .update({ status: 'active', is_active: true })
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  
  await adminClient.from('audit_logs').insert([{ 
    action: 'REOPEN_ACADEMIC_YEAR', 
    target_table: 'academic_years',
    record_id: id,
    school_id: targetSchoolId,
    details: { id, reason },
    user_id: user.id,
    status: 'success'
  }]);
  
  revalidatePath('/admin/academic-setup');
  return { success: true };
}
