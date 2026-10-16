'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';
import crypto from 'crypto';

export async function toggleStaffStatusAction(userId: string, targetStatus: boolean) {
  const { user, role } = await getServerAuth();
  if (!user || role !== 'admin') {
    throw new Error('Unauthorized. Only admins can modify staff status.');
  }

  if (user.id === userId) {
    throw new Error('អ្នកមិនអាចបិទគណនីខ្លួនឯងបានទេ (Cannot deactivate your own account).');
  }

  const supabase = createAdminClient();
  if (!supabase) throw new Error('Database unavailable');

  // 1. Update profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_active: targetStatus })
    .eq('id', userId);

  if (profileError) {
    throw new Error('បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពទម្រង់ (Failed to update profile)');
  }

  // 2. Update Supabase Auth ban duration
  // If targetStatus is true (active), unban (none). If false (inactive), ban for 100 years.
  const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: targetStatus ? 'none' : '876000h'
  });

  if (authError) {
    throw new Error('បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពសិទ្ធិចូលប្រើ (Failed to update auth status)');
  }

  // 3. Log audit event
  await supabase.from('audit_logs').insert([{
    action: targetStatus ? 'បានបើកដំណើរការគណនីបុគ្គលិកឡើងវិញ (Reactivated Staff)' : 'បានបិទដំណើរការគណនីបុគ្គលិក (Deactivated Staff)',
    type: targetStatus ? 'info' : 'warning',
    user_id: user.id
  }]);

  return { success: true };
}

export async function deleteStaffPermanentlyAction(userId: string) {
  const { user, role } = await getServerAuth();
  if (!user || role !== 'admin') {
    throw new Error('Unauthorized. Only admins can delete staff.');
  }

  if (user.id === userId) {
    throw new Error('អ្នកមិនអាចលុបគណនីខ្លួនឯងបានទេ (Cannot delete your own account).');
  }

  const supabase = createAdminClient();
  if (!supabase) throw new Error('Database unavailable');

  // 1. Guard against deleting the last active administrator
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', userId)
    .maybeSingle();

  if (targetProfile?.role === 'admin') {
    let adminCountQuery = supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('is_active', true);

    if (targetProfile.school_id) {
      adminCountQuery = adminCountQuery.eq('school_id', targetProfile.school_id);
    }
    const { count: adminCount } = await adminCountQuery;
    if ((adminCount || 0) <= 1) {
      throw new Error('មិនអាចលុបអ្នកគ្រប់គ្រងចុងក្រោយបានទេ (Cannot delete the last active administrator).');
    }
  }

  // 2. Relational Pre-Checks (Protect historical data integrity)
  const { count: classesCount } = await supabase
    .from('classes')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_id', userId);

  const { count: attendanceCount } = await supabase
    .from('attendance_records')
    .select('*', { count: 'exact', head: true })
    .eq('recorded_by', userId);

  const { data: teacherClasses } = await supabase
    .from('classes')
    .select('id')
    .eq('teacher_id', userId);

  const teacherClassIds = (teacherClasses || []).map(c => c.id);
  let gradesCount = 0;
  if (teacherClassIds.length > 0) {
    const { count } = await supabase
      .from('grades')
      .select('*', { count: 'exact', head: true })
      .in('class_id', teacherClassIds);
    gradesCount = count || 0;
  }

  const { count: snapshotsCount } = await supabase
    .from('grade_snapshots')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', userId);

  const { count: activityCount } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', userId);

  if (
    (classesCount && classesCount > 0) || 
    (attendanceCount && attendanceCount > 0) || 
    gradesCount > 0 ||
    (snapshotsCount && snapshotsCount > 0) ||
    (activityCount && activityCount > 0)
  ) {
    throw new Error("មិនអាចលុបគណនីនេះជាអចិន្ត្រៃយ៍បានទេ ព្រោះលោកគ្រូ/អ្នកគ្រូមានប្រវត្តិបង្រៀន និងបញ្ចូលទិន្នន័យក្នុងប្រព័ន្ធរួចហើយ។ សូមប្រើមុខងារ 'បិទដំណើរការ (Deactivate)' ជំនួសវិញ ដើម្បីការពារទិន្នន័យប្រវត្តិសាស្ត្រ។");
  }

  // 2. Safe Atomic Deletion
  const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
  if (profileError) {
    throw new Error('បរាជ័យក្នុងការលុបទម្រង់ (Failed to delete profile)');
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) {
    throw new Error('បរាជ័យក្នុងការលុបគណនី Auth (Failed to delete auth user): ' + authError.message);
  }

  // 3. Log audit event
  await supabase.from('audit_logs').insert([{
    action: 'បានលុបគណនីបុគ្គលិកជាអចិន្ត្រៃយ៍ (Deleted Staff Account Permanently)',
    type: 'error',
    user_id: user.id
  }]);

  return { success: true };
}

export async function resetStaffPasswordAction(userId: string, explicitPassword?: string) {
  const { user, role } = await getServerAuth();
  if (!user || role !== 'admin') {
    throw new Error('Unauthorized. Only admins can reset passwords.');
  }

  const supabase = createAdminClient();
  if (!supabase) throw new Error('Database unavailable');

  const newPassword = explicitPassword || crypto.randomBytes(4).toString('hex'); // 8 char hex

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword
  });

  if (error) {
    throw new Error('បរាជ័យក្នុងការកំណត់ពាក្យសម្ងាត់ថ្មី (Failed to reset password)');
  }

  await supabase.from('audit_logs').insert([{
    action: 'បានកំណត់ពាក្យសម្ងាត់បុគ្គលិកឡើងវិញ (Reset Staff Password)',
    type: 'warning',
    user_id: user.id
  }]);

  return { success: true, newPassword };
}

export async function updateStaffProfileAction(userId: string, updates: { role?: string, subject?: string, phone?: string, full_name?: string }) {
  const { user, role } = await getServerAuth();
  if (!user || role !== 'admin') {
    throw new Error('Unauthorized. Only admins can update profiles.');
  }

  if (updates.role && user.id === userId && updates.role !== 'admin') {
    throw new Error('អ្នកមិនអាចទម្លាក់តួនាទីខ្លួនឯងបានទេ (Cannot demote your own admin account).');
  }

  if (updates.role) {
    const validRoles = ['teacher', 'principal', 'admin', 'staff', 'monitor'];
    if (!validRoles.includes(updates.role)) {
      throw new Error('តួនាទីមិនត្រឹមត្រូវ (Invalid role)');
    }
  }

  const supabase = createAdminClient();
  if (!supabase) throw new Error('Database unavailable');

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    throw new Error('បរាជ័យក្នុងការកែប្រែព័ត៌មាន (Failed to update profile)');
  }

  await supabase.from('audit_logs').insert([{
    action: `បានផ្លាស់ប្តូរព័ត៌មានគណនីបុគ្គលិក (Updated Staff Profile)`,
    type: 'info',
    user_id: user.id
  }]);

  return { success: true };
}
