'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { StudentHealthRecord } from '@/types';
import { z } from 'zod';

const HealthRecordItemSchema = z.object({
  student_id: z.string().uuid('Invalid student ID'),
  class_id: z.string().uuid('Invalid class ID'),
  recorded_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)'),
  weight_kg: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().positive().max(300).nullable().optional()
  ),
  height_cm: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().positive().max(300).nullable().optional()
  ),
  bmi: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().positive().nullable().optional()
  ),
  vision_left: z.string().max(100).optional(),
  vision_right: z.string().max(100).optional(),
  hearing: z.string().max(100).optional(),
  dental: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

const AcademicYearIdSchema = z.string().uuid('Invalid academic year ID');

export async function upsertHealthRecords(
  records: Partial<StudentHealthRecord>[],
  academicYearId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    // 1. Authoritative Server Authentication Check
    const { getServerAuth, requireClassAccess } = await import('@/lib/auth-server');
    const { user, profile, role } = await getServerAuth();

    if (!user || !profile || !role) {
      return { success: false, error: 'Unauthorized: Authentication required to modify health records.' };
    }

    // 2. Role Authorization Guard (Admin, Principal, or Teacher only)
    if (!['admin', 'principal', 'teacher'].includes(role)) {
      return { success: false, error: 'Forbidden: Insufficient privileges to modify health records.' };
    }

    // 3. Validate Academic Year Input
    const yearParsed = AcademicYearIdSchema.safeParse(academicYearId);
    if (!yearParsed.success) {
      return { success: false, error: 'Invalid or missing academic year ID.' };
    }

    // 4. Validate Records Payload
    if (!Array.isArray(records) || records.length === 0) {
      return { success: false, error: 'Records payload cannot be empty.' };
    }

    const filteredRecords = records.filter(r => r.student_id && r.class_id && r.recorded_date);
    if (filteredRecords.length === 0) {
      return { success: false, error: 'No valid health records with student_id, class_id, and recorded_date.' };
    }

    // Validate each record schema
    const validRecords: any[] = [];
    for (const rec of filteredRecords) {
      const parsed = HealthRecordItemSchema.safeParse(rec);
      if (!parsed.success) {
        return {
          success: false,
          error: `Validation error: ${parsed.error.issues.map(i => i.message).join(', ')}`,
        };
      }
      validRecords.push(parsed.data);
    }

    // 5. Verify Class Authorization for Caller
    const distinctClassIds = Array.from(new Set(validRecords.map(r => r.class_id)));
    for (const cid of distinctClassIds) {
      await requireClassAccess(cid);
    }

    const adminClient = createAdminClient();

    // 6. Verify Academic Year Exists & Check Lifecycle Lock Status
    const { data: yearData, error: yearQueryError } = await adminClient
      .from('academic_years')
      .select('id, status')
      .eq('id', academicYearId)
      .maybeSingle();

    if (yearQueryError || !yearData) {
      return { success: false, error: 'រកមិនឃើញឆ្នាំសិក្សាដែលបានស្នើសុំ (Academic year not found).' };
    }

    if (['closed', 'archived'].includes(yearData.status)) {
      return {
        success: false,
        error: 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សានេះត្រូវបានបិទបញ្ចប់ និងចាក់សោរួចហើយ (Academic year is locked).',
      };
    }

    // 7. Invoke Atomic Database Transaction via RPC
    const { data: rpcResult, error: rpcError } = await adminClient.rpc('upsert_health_records_atomic', {
      p_records: validRecords,
      p_academic_year_id: academicYearId,
      p_caller_id: user.id,
    });

    if (rpcError) {
      console.error('upsert_health_records_atomic RPC error:', rpcError.message);
      return {
        success: false,
        error: rpcError.message || 'Database error occurred while persisting health records.',
      };
    }

    if (!rpcResult?.success) {
      return {
        success: false,
        error: rpcResult?.error || 'Failed to persist health records.',
      };
    }

    // 8. Revalidate Affected Paths
    revalidatePath('/health');
    revalidatePath('/students');
    revalidatePath('/classes/info');

    return {
      success: true,
      count: rpcResult.count ?? validRecords.length,
    };
  } catch (err: any) {
    console.error('upsertHealthRecords caught error:', err?.message);
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while saving health records.',
    };
  }
}
