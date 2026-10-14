'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth, requireClassAccess } from '@/lib/auth-server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const AttendanceRecordSchema = z.object({
  student_id: z.string().uuid(),
  status: z.enum(['present', 'absent', 'permission', 'late', 'P', 'A', 'L', 'E', 'unexcused', 'excused']),
  root_cause: z.string().nullable().optional(),
});

const BatchAttendanceSchema = z.object({
  class_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.array(AttendanceRecordSchema),
  academic_year_id: z.string().uuid().nullable().optional(),
});

export type BatchAttendancePayload = z.infer<typeof BatchAttendanceSchema>;

/**
 * Server-Side Authoritative Batch Attendance Action
 * Verifies class authorization, active student enrollments, academic year lock, and unique constraints.
 */
export async function saveAttendanceBatchAction(payload: BatchAttendancePayload) {
  try {
    const validated = BatchAttendanceSchema.parse(payload);
    const { user, profile, role } = await getServerAuth();

    if (!user || !profile || !role) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    if (!['admin', 'principal', 'teacher', 'monitor'].includes(role)) {
      return { success: false, error: 'Forbidden: Insufficient privileges to record attendance.' };
    }

    // Role-specific class authorization guard
    if (role !== 'monitor') {
      await requireClassAccess(validated.class_id);
    }

    const supabase = await createClient();

    // Resolve class details (school_id, academic_year_id)
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, school_id, academic_year_id, teacher_id')
      .eq('id', validated.class_id)
      .maybeSingle();

    if (classError || !classData) {
      return { success: false, error: 'Class not found or inaccessible.' };
    }

    if (role === 'principal' && classData.school_id !== profile.school_id) {
      return { success: false, error: 'Forbidden: Cannot record attendance outside your school.' };
    }

    const targetYearId = validated.academic_year_id || classData.academic_year_id;
    if (!targetYearId) {
      return { success: false, error: 'Could not resolve academic year for this class.' };
    }

    // Check Institutional Academic Year Lock
    const { data: yearData } = await supabase
      .from('academic_years')
      .select('status')
      .eq('id', targetYearId)
      .maybeSingle();

    if (yearData && ['closed', 'archived'].includes(yearData.status)) {
      return { success: false, error: 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សានេះត្រូវបានបិទបញ្ចប់រួចហើយ (Academic year is locked).' };
    }

    // Date sanity check (Cannot record future attendance)
    const phnomPenhToday = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    if (validated.date > phnomPenhToday) {
      return { success: false, error: 'មិនអាចកត់ត្រាវត្តមានសម្រាប់កាលបរិច្ឆេទនាពេលអនាគតបានទេ (Cannot record future attendance).' };
    }

    if (validated.records.length === 0) {
      return { success: true, count: 0 };
    }

    // Verify all students are actively enrolled in this class
    const studentIds = validated.records.map((r) => r.student_id);
    const { data: activeEnrollments, error: enrollError } = await supabase
      .from('student_enrollments')
      .select('student_id')
      .eq('class_id', validated.class_id)
      .eq('academic_year_id', targetYearId)
      .eq('enrollment_status', 'active')
      .in('student_id', studentIds);

    if (enrollError) {
      return { success: false, error: 'Failed to verify student enrollment records.' };
    }

    const enrolledSet = new Set((activeEnrollments || []).map((e) => e.student_id));
    const unauthorizedStudents = studentIds.filter((sid) => !enrolledSet.has(sid));
    if (unauthorizedStudents.length > 0) {
      return {
        success: false,
        error: `សិស្សមួយចំនួនមិនមានឈ្មោះក្នុងបញ្ជីថ្នាក់រៀនសកម្មទេ (Students not enrolled in class: ${unauthorizedStudents.length}).`,
      };
    }

    // Normalize status strings
    const upsertPayload = validated.records.map((r) => {
      let normalizedStatus = r.status;
      if (r.status === 'P') normalizedStatus = 'present';
      else if (r.status === 'A' || r.status === 'unexcused') normalizedStatus = 'absent';
      else if (r.status === 'L') normalizedStatus = 'late';
      else if (r.status === 'E' || r.status === 'excused') normalizedStatus = 'permission';

      return {
        class_id: validated.class_id,
        student_id: r.student_id,
        academic_year_id: targetYearId,
        date: validated.date,
        status: normalizedStatus,
        root_cause: r.root_cause || null,
        recorded_by: user.id,
        updated_at: new Date().toISOString(),
      };
    });

    const adminClient = createAdminClient();
    const { error: upsertError } = await adminClient
      .from('attendance_records')
      .upsert(upsertPayload, { onConflict: 'student_id,date,academic_year_id' });

    if (upsertError) {
      console.error('Failed to upsert attendance records:', upsertError);
      return { success: false, error: upsertError.message || 'Failed to save attendance.' };
    }

    revalidatePath('/attendance');
    revalidatePath('/homeroom');
    revalidatePath('/admin/attendance');
    revalidatePath('/admin');

    return { success: true, count: upsertPayload.length };
  } catch (err: any) {
    console.error('saveAttendanceBatchAction caught error:', err);
    return { success: false, error: err?.message || 'Unknown error occurred while saving attendance.' };
  }
}

/**
 * Server-Side Authoritative Single Attendance Action
 */
export async function saveAttendanceSingleAction(payload: {
  class_id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'permission' | 'late' | 'P' | 'A' | 'L' | 'E' | 'unexcused' | 'excused';
  root_cause?: string | null;
  academic_year_id?: string | null;
}) {
  return saveAttendanceBatchAction({
    class_id: payload.class_id,
    date: payload.date,
    records: [
      {
        student_id: payload.student_id,
        status: payload.status,
        root_cause: payload.root_cause || null,
      },
    ],
    academic_year_id: payload.academic_year_id || undefined,
  });
}
