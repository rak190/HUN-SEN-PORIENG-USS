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

    // Resolve class details (school_id, academic_year_id, monitor_id)
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, school_id, academic_year_id, teacher_id, monitor_id')
      .eq('id', validated.class_id)
      .maybeSingle();

    if (classError || !classData) {
      return { success: false, error: 'Class not found or inaccessible.' };
    }

    if (role === 'monitor' && classData.monitor_id !== user.id) {
      return { success: false, error: 'Forbidden: You are not authorized to record attendance for this class.' };
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

const MonitorAttendanceRecordSchema = z.object({
  student_id: z.string().uuid(),
  status: z.enum(['present', 'absent', 'permission', 'late', 'P', 'A', 'L', 'E']),
});

const SubmitMonitorAttendanceSchema = z.object({
  class_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.array(MonitorAttendanceRecordSchema),
  academic_year_id: z.string().uuid().nullable().optional(),
});

export type SubmitMonitorAttendancePayload = z.infer<typeof SubmitMonitorAttendanceSchema>;

/**
 * Server-Side Authoritative Monitor Attendance Submission Action
 * Verifies caller authentication, monitor-to-class assignment, school scope,
 * active student enrollments, academic year lock, and writes via admin client with audit logging.
 */
export async function submitMonitorAttendanceAction(payload: SubmitMonitorAttendancePayload) {
  try {
    const validated = SubmitMonitorAttendanceSchema.parse(payload);
    const { user, profile, role } = await getServerAuth();

    if (!user || !profile || !role) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    if (!['monitor', 'teacher', 'admin', 'principal'].includes(role)) {
      return { success: false, error: 'Forbidden: Insufficient privileges to submit monitor attendance.' };
    }

    const supabase = await createClient();

    // 1. Fetch class details and verify monitor-to-class assignment
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, school_id, academic_year_id, teacher_id, monitor_id')
      .eq('id', validated.class_id)
      .maybeSingle();

    if (classError || !classData) {
      return { success: false, error: 'រកមិនឃើញថ្នាក់រៀននេះទេ (Class not found).' };
    }

    // School boundary guard
    if (role !== 'admin' && profile.school_id && classData.school_id !== profile.school_id) {
      return { success: false, error: 'Forbidden: You cannot submit attendance outside your school institution.' };
    }

    // Role-specific assignment check
    if (role === 'monitor') {
      const isAssignedMonitor = classData.monitor_id === user.id || classData.teacher_id === user.id;
      if (!isAssignedMonitor) {
        return { 
          success: false, 
          error: 'Forbidden: អ្នកមិនមែនជាប្រធានថ្នាក់នៃថ្នាក់រៀននេះទេ (You are not assigned as monitor for this class).' 
        };
      }
    } else if (role === 'teacher') {
      if (classData.teacher_id !== user.id) {
        return { success: false, error: 'Forbidden: You are not authorized to submit attendance for this class.' };
      }
    }

    // 2. Validate Academic Year
    const targetYearId = validated.academic_year_id || classData.academic_year_id;
    if (!targetYearId) {
      return { success: false, error: 'រកមិនឃើញឆ្នាំសិក្សាសកម្មសម្រាប់ថ្នាក់រៀននេះទេ (No academic year linked to class).' };
    }

    const { data: yearData } = await supabase
      .from('academic_years')
      .select('status')
      .eq('id', targetYearId)
      .maybeSingle();

    if (yearData && ['closed', 'archived'].includes(yearData.status)) {
      return { success: false, error: 'ប្រតិបត្តិការត្រូវបានបដិសេធ៖ ឆ្នាំសិក្សានេះត្រូវបានបិទបញ្ចប់រួចហើយ (Academic year is locked).' };
    }

    // 3. Phnom Penh UTC+7 Date sanity check (Cannot submit future attendance)
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

    // 4. Verify all students are actively enrolled in this class and academic year
    const studentIds = validated.records.map((r) => r.student_id);
    const { data: activeEnrollments, error: enrollError } = await supabase
      .from('student_enrollments')
      .select('student_id')
      .eq('class_id', validated.class_id)
      .eq('academic_year_id', targetYearId)
      .eq('enrollment_status', 'active')
      .in('student_id', studentIds);

    if (enrollError) {
      return { success: false, error: 'Failed to verify active student enrollments.' };
    }

    const enrolledSet = new Set((activeEnrollments || []).map((e) => e.student_id));
    const unauthorizedStudents = studentIds.filter((sid) => !enrolledSet.has(sid));
    if (unauthorizedStudents.length > 0) {
      return {
        success: false,
        error: `សិស្សមួយចំនួនមិនមានឈ្មោះក្នុងបញ្ជីថ្នាក់រៀនសកម្មទេ (Students not enrolled in class: ${unauthorizedStudents.length}).`,
      };
    }

    // 5. Authoritative Normalized Upsert via Service Role
    const upsertPayload = validated.records.map((r) => {
      let normalizedStatus: 'present' | 'absent' | 'late' | 'permission' = 'present';
      if (r.status === 'present' || r.status === 'P') normalizedStatus = 'present';
      else if (r.status === 'absent' || r.status === 'A') normalizedStatus = 'absent';
      else if (r.status === 'late' || r.status === 'L') normalizedStatus = 'late';
      else if (r.status === 'permission' || r.status === 'E') normalizedStatus = 'permission';

      return {
        class_id: validated.class_id,
        student_id: r.student_id,
        academic_year_id: targetYearId,
        date: validated.date,
        status: normalizedStatus,
        recorded_by: user.id,
        updated_at: new Date().toISOString(),
      };
    });

    const adminClient = createAdminClient();
    const { error: upsertError } = await adminClient
      .from('attendance_records')
      .upsert(upsertPayload, { onConflict: 'student_id,date,academic_year_id' });

    if (upsertError) {
      console.error('Failed to submit monitor attendance:', upsertError);
      return { success: false, error: upsertError.message || 'Failed to submit monitor attendance.' };
    }

    // 6. Audit Log Entry
    try {
      await adminClient.from('audit_logs').insert({
        user_id: user.id,
        action: `បញ្ជូនវត្តមានប្រចាំថ្ងៃ (Monitor attendance submitted for class ${classData.id} on ${validated.date})`,
        type: 'info',
        target_table: 'attendance_records',
        details: {
          class_id: classData.id,
          academic_year_id: targetYearId,
          date: validated.date,
          student_count: upsertPayload.length,
          actor_role: role,
        },
        status: 'success',
      });
    } catch (auditErr) {
      console.warn('Non-fatal monitor attendance audit logging error:', auditErr);
    }

    revalidatePath('/monitor/attendance');
    revalidatePath('/attendance');
    revalidatePath('/homeroom');
    revalidatePath('/admin/attendance');
    revalidatePath('/admin');

    return { success: true, count: upsertPayload.length };
  } catch (err: any) {
    console.error('submitMonitorAttendanceAction caught error:', err);
    return { success: false, error: err?.message || 'Unknown error occurred while submitting attendance.' };
  }
}

