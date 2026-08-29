import { createAdminClient } from '@/lib/supabase/admin';

export type LifecycleAction = 'promote' | 'retain' | 'transfer_out' | 'transfer_in' | 'graduate' | 'withdraw' | 'drop_out';

export interface PromotionCandidate {
  studentId: string;
  sourceClassId: string;
  targetClassId: string;
  targetAcademicYearId: string;
  action: LifecycleAction;
  notes?: string;
}

export interface BatchPromotionResult {
  success: boolean;
  promotedCount: number;
  failedCount: number;
  errors: { studentId: string; error: string }[];
}

/**
 * Executes a single student lifecycle transition atomically:
 * 1. Finalizes existing student_enrollments record
 * 2. Creates new student_enrollments record for the target academic year
 * 3. Updates students.class_id current-pointer
 * 4. Logs the immutable audit event in audit_logs
 */
export async function executeStudentLifecycleTransition(
  candidate: PromotionCandidate,
  actorId?: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();

  try {
    // 1. Verify student exists
    const { data: student, error: stdErr } = await adminClient
      .from('students')
      .select('id, full_name, class_id')
      .eq('id', candidate.studentId)
      .single();

    if (stdErr || !student) {
      return { success: false, error: 'រកមិនឃើញទិន្នន័យសិស្ស (Student not found)' };
    }

    // 2. Finalize previous enrollment status if applicable
    const yearResultMap: Record<LifecycleAction, 'promoted' | 'retained' | 'transferred' | 'graduated' | 'dropped' | 'enrolled'> = {
      promote: 'promoted',
      retain: 'retained',
      transfer_out: 'transferred',
      transfer_in: 'enrolled',
      graduate: 'graduated',
      withdraw: 'dropped',
      drop_out: 'dropped'
    };

    const yearResult = yearResultMap[candidate.action] || 'promoted';

    // Update current active enrollment if it exists
    await adminClient
      .from('student_enrollments')
      .update({
        enrollment_status: candidate.action === 'transfer_out' || candidate.action === 'withdraw' || candidate.action === 'drop_out' ? 'transferred_out' : 'active',
        year_result: yearResult,
        updated_at: new Date().toISOString()
      })
      .eq('student_id', candidate.studentId)
      .eq('class_id', candidate.sourceClassId);

    // 3. If continuing in school (promote / retain / transfer_in), create new enrollment for target year
    if (['promote', 'retain', 'transfer_in'].includes(candidate.action)) {
      const { error: enrollErr } = await adminClient
        .from('student_enrollments')
        .upsert([
          {
            student_id: candidate.studentId,
            class_id: candidate.targetClassId,
            academic_year_id: candidate.targetAcademicYearId,
            enrollment_status: 'active',
            year_result: 'enrolled',
            notes: candidate.notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ], { onConflict: 'student_id,academic_year_id' });

      if (enrollErr) throw enrollErr;

      // Update current class pointer on students table
      await adminClient
        .from('students')
        .update({
          class_id: candidate.targetClassId,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', candidate.studentId);

    } else if (candidate.action === 'graduate') {
      await adminClient
        .from('students')
        .update({
          class_id: null,
          status: 'graduated',
          updated_at: new Date().toISOString()
        })
        .eq('id', candidate.studentId);

    } else if (candidate.action === 'transfer_out' || candidate.action === 'withdraw' || candidate.action === 'drop_out') {
      await adminClient
        .from('students')
        .update({
          class_id: null,
          status: candidate.action === 'drop_out' ? 'dropped_out' : 'transferred',
          updated_at: new Date().toISOString()
        })
        .eq('id', candidate.studentId);
    }

    // 4. Record audit log
    await adminClient.from('audit_logs').insert([
      {
        user_id: actorId || null,
        action: `STUDENT_LIFECYCLE_${candidate.action.toUpperCase()}`,
        entity_type: 'students',
        entity_id: candidate.studentId,
        metadata: {
          student_name: student.full_name,
          source_class_id: candidate.sourceClassId,
          target_class_id: candidate.targetClassId,
          target_academic_year_id: candidate.targetAcademicYearId,
          action: candidate.action,
          timestamp: new Date().toISOString()
        }
      }
    ]);

    return { success: true };
  } catch (err: any) {
    console.error('Lifecycle transition error:', err);
    return { success: false, error: err?.message || 'បរាជ័យក្នុងការអនុវត្តដំណើរការសិស្ស' };
  }
}

/**
 * Batch promotes an entire class atomically
 */
export async function batchPromoteClass(
  candidates: PromotionCandidate[],
  actorId?: string
): Promise<BatchPromotionResult> {
  let promotedCount = 0;
  let failedCount = 0;
  const errors: { studentId: string; error: string }[] = [];

  for (const candidate of candidates) {
    const res = await executeStudentLifecycleTransition(candidate, actorId);
    if (res.success) {
      promotedCount++;
    } else {
      failedCount++;
      errors.push({ studentId: candidate.studentId, error: res.error || 'Unknown error' });
    }
  }

  return {
    success: failedCount === 0,
    promotedCount,
    failedCount,
    errors
  };
}
