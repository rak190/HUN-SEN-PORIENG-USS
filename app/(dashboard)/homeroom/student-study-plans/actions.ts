'use server';

import { createClient } from '@/lib/supabase/server';
import { getServerAuth, requireClassAccess } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';
import {
  SubjectPlanTarget,
  SaveStudyPlanPayloadSchema,
  BatchSaveStudyPlanPayloadSchema,
} from './types';

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
 * Enforces strict server-side authorization and atomic RPC persistence.
 */
export async function saveStudentStudyPlanAction(
  payload: SaveStudyPlanPayload
): Promise<{ success: boolean; error?: string; warning?: string }> {
  try {
    const parseResult = SaveStudyPlanPayloadSchema.safeParse(payload);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0]?.message || 'Invalid study plan payload';
      return { success: false, error: `ទិន្នន័យមិនត្រឹមត្រូវ៖ ${issue}` };
    }

    const validData = parseResult.data;

    // 1. Authoritative Server-Side Authentication
    const { user, profile, role } = await getServerAuth();
    if (!user || !profile || !role) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    // 2. Strict Class Access Authorization (requires class membership)
    await requireClassAccess(payload.class_id);

    const supabase = await createClient();

    // 3. Delegate to Atomic Database RPC (Migration 091: validates student_enrollments, upserts student_study_plans)
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'save_student_study_plans_atomic',
      {
        p_class_id: validData.class_id,
        p_academic_year_id: validData.academic_year_id,
        p_plans: [
          {
            student_id: validData.student_id,
            subject_targets: validData.subject_targets,
          },
        ],
      }
    );

    if (rpcError) {
      console.warn('[saveStudentStudyPlanAction] RPC error:', rpcError);
      if (rpcError.code === '23503') {
        return { success: false, error: 'សិស្សមិនមានឈ្មោះក្នុងបញ្ជីថ្នាក់រៀនសម្រាប់ឆ្នាំសិក្សានេះទេ' };
      }
      if (rpcError.code === '55000') {
        return { success: false, error: 'ឆ្នាំសិក្សានេះត្រូវបានចាក់សោ ឬបិទបញ្ចប់ មិនអាចកែប្រែបានទេ' };
      }
      if (rpcError.code === '42501') {
        return { success: false, error: 'លោកគ្រូ/អ្នកគ្រូ គ្មានសិទ្ធិកែប្រែផែនការសិក្សាក្នុងថ្នាក់នេះទេ' };
      }
      return { success: false, error: rpcError.message || 'Failed to save student study plan' };
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
 * Enforces fail-closed validation: all students must be legitimately enrolled.
 */
export async function batchSaveStudentStudyPlansAction(
  payload: BatchSaveStudyPlanPayload
): Promise<{ success: boolean; error?: string; warning?: string; count?: number }> {
  try {
    const parseResult = BatchSaveStudyPlanPayloadSchema.safeParse(payload);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0]?.message || 'Invalid batch study plan payload';
      return { success: false, error: `ទិន្នន័យមិនត្រឹមត្រូវ៖ ${issue}` };
    }

    const validData = parseResult.data;

    // 1. Authoritative Server-Side Authentication
    const { user, profile, role } = await getServerAuth();
    if (!user || !profile || !role) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    // 2. Strict Class Access Authorization
    await requireClassAccess(validData.class_id);

    const supabase = await createClient();

    // 3. Delegate to Atomic Database RPC (Migration 091)
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'save_student_study_plans_atomic',
      {
        p_class_id: validData.class_id,
        p_academic_year_id: validData.academic_year_id,
        p_plans: validData.plans,
      }
    );

    if (rpcError) {
      console.warn('[batchSaveStudentStudyPlansAction] RPC error:', rpcError);
      if (rpcError.code === '23503') {
        return {
          success: false,
          error: 'មានសិស្សមួយចំនួនមិនមានឈ្មោះក្នុងបញ្ជីថ្នាក់រៀនសម្រាប់ឆ្នាំសិក្សានេះ (Validation Failed: un-enrolled students)',
        };
      }
      if (rpcError.code === '55000') {
        return { success: false, error: 'ឆ្នាំសិក្សានេះត្រូវបានចាក់សោ ឬបិទបញ្ចប់ មិនអាចកែប្រែបានទេ' };
      }
      if (rpcError.code === '42501') {
        return { success: false, error: 'លោកគ្រូ/អ្នកគ្រូ គ្មានសិទ្ធិកែប្រែផែនការសិក្សាក្នុងថ្នាក់នេះទេ' };
      }
      return { success: false, error: rpcError.message || 'Failed to batch save study plans' };
    }

    const updatedCount = rpcData?.updated_count ?? validData.plans.length;
    revalidatePath('/homeroom/student-study-plans');
    return { success: true, count: updatedCount };
  } catch (err: any) {
    console.error('[batchSaveStudentStudyPlansAction] Caught exception:', err);
    return { success: false, error: err?.message || 'Unexpected server error' };
  }
}
