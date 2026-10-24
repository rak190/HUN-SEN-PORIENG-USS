'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth, requireClassAccess } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';
import { SubjectPlanTarget } from './types';

export interface SaveStudyPlanPayload {
  student_id: string;
  class_id: string;
  academic_year_id: string;
  subject_targets: Record<string, SubjectPlanTarget>;
}

export interface BatchSaveStudyPlanPayload {
  class_id: string;
  academic_year_id: string;
  plans: Array<{
    student_id: string;
    subject_targets: Record<string, SubjectPlanTarget>;
  }>;
}

/**
 * Saves or updates planned goal levels for a single student in a class.
 * Enforces strict server-side authorization and class enrollment verification.
 */
export async function saveStudentStudyPlanAction(payload: SaveStudyPlanPayload) {
  try {
    if (!payload?.student_id || !payload?.class_id || !payload?.academic_year_id) {
      return { success: false, error: 'ព័ត៌មានមិនពេញលេញ (Missing student, class, or year)' };
    }

    // 1. Authoritative Server-Side Authentication
    const { user, profile, role } = await getServerAuth();
    if (!user || !profile || !role) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    // 2. Strict Class Access Authorization
    await requireClassAccess(payload.class_id);

    const supabase = createAdminClient();

    // 3. Verify student is legitimately enrolled in this class
    const { data: enrollment, error: enrollError } = await supabase
      .from('student_enrollments')
      .select('id')
      .eq('student_id', payload.student_id)
      .eq('class_id', payload.class_id)
      .maybeSingle();

    if (enrollError || !enrollment) {
      return { success: false, error: 'សិស្សមិនមានឈ្មោះក្នុងបញ្ជីថ្នាក់រៀននេះទេ' };
    }

    // 4. Upsert into student_study_plans
    const { error: upsertError } = await supabase
      .from('student_study_plans')
      .upsert(
        {
          student_id: payload.student_id,
          class_id: payload.class_id,
          academic_year_id: payload.academic_year_id,
          subject_targets: payload.subject_targets || {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,academic_year_id' }
      );

    if (upsertError) {
      console.warn('[saveStudentStudyPlanAction] Upsert error:', upsertError);
      // Resilient handling if table not yet deployed in remote schema cache
      if (upsertError.code === '42P01' || upsertError.code === 'PGRST205') {
        return {
          success: false,
          warning: 'តារាងរក្សាទុកផែនការសិក្សា student_study_plans មិនទាន់ត្រូវបានដាក់ដំណើរការលើ Server (Pending Migration 085)',
          error: 'Database table pending migration',
        };
      }
      return { success: false, error: upsertError.message || 'Failed to save student study plan' };
    }

    revalidatePath('/homeroom/student-study-plans');
    return { success: true };
  } catch (err: any) {
    console.error('[saveStudentStudyPlanAction] Caught exception:', err);
    return { success: false, error: err?.message || 'Unexpected server error' };
  }
}

/**
 * Batch saves or updates planned goal levels for multiple students in a class.
 */
export async function batchSaveStudentStudyPlansAction(payload: BatchSaveStudyPlanPayload) {
  try {
    if (!payload?.class_id || !payload?.academic_year_id || !Array.isArray(payload.plans)) {
      return { success: false, error: 'Invalid batch payload' };
    }

    const { user, profile, role } = await getServerAuth();
    if (!user || !profile || !role) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    await requireClassAccess(payload.class_id);

    const supabase = createAdminClient();

    // Verify all students are enrolled in this class
    const { data: validEnrollments } = await supabase
      .from('student_enrollments')
      .select('student_id')
      .eq('class_id', payload.class_id);

    const validStudentIds = new Set((validEnrollments || []).map((e: any) => e.student_id));

    const recordsToUpsert = payload.plans
      .filter((p) => validStudentIds.has(p.student_id))
      .map((p) => ({
        student_id: p.student_id,
        class_id: payload.class_id,
        academic_year_id: payload.academic_year_id,
        subject_targets: p.subject_targets || {},
        updated_at: new Date().toISOString(),
      }));

    if (recordsToUpsert.length === 0) {
      return { success: false, error: 'គ្មានសិស្សត្រឹមត្រូវណាមួយត្រូវបានរកឃើញក្នុងថ្នាក់នេះទេ' };
    }

    const { error: upsertError } = await supabase
      .from('student_study_plans')
      .upsert(recordsToUpsert, { onConflict: 'student_id,academic_year_id' });

    if (upsertError) {
      console.warn('[batchSaveStudentStudyPlansAction] Upsert error:', upsertError);
      if (upsertError.code === '42P01' || upsertError.code === 'PGRST205') {
        return {
          success: false,
          warning: 'តារាងរក្សាទុកផែនការសិក្សា student_study_plans មិនទាន់ត្រូវបានដាក់ដំណើរការលើ Server (Pending Migration 085)',
          error: 'Database table pending migration',
        };
      }
      return { success: false, error: upsertError.message || 'Failed to batch save study plans' };
    }

    revalidatePath('/homeroom/student-study-plans');
    return { success: true, count: recordsToUpsert.length };
  } catch (err: any) {
    console.error('[batchSaveStudentStudyPlansAction] Caught exception:', err);
    return { success: false, error: err?.message || 'Unexpected server error' };
  }
}
