import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role: userRole } = await getServerAuth();

  if (!user || (userRole !== 'admin' && userRole !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const { id } = await params;
  const adminClient = createAdminClient();
  const body = await req.json();

  const { fullName, role, schoolCode, password, homeroomClass } = body;

  if (!adminClient) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    const { data: targetProfile } = await adminClient.from('profiles').select('role, is_active').eq('id', id).single();

    if (targetProfile?.role === 'admin' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Principal cannot modify an admin account.' }, { status: 403 });
    }

    if (role === 'admin' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Principal cannot assign admin role.' }, { status: 403 });
    }

    if (targetProfile?.role === 'admin' && role && role !== 'admin') {
      const { count } = await adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin').eq('is_active', true);
      if (count !== null && count <= 1) {
        return NextResponse.json({ error: 'Cannot demote the last active admin.' }, { status: 400 });
      }
    }

    // 1. Update Profile row
    const updateData: any = {};
    if (fullName) updateData.full_name = fullName.trim();
    if (role) updateData.role = role;
    if (schoolCode) updateData.school_code = schoolCode;

    if (Object.keys(updateData).length > 0) {
      const { error: profileError } = await adminClient
        .from('profiles')
        .update(updateData)
        .eq('id', id);

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 });
      }
    }

    // 2. Update Auth User if password is changed
    if (password) {
      try {
        await adminClient.auth.admin.updateUserById(id, {
          password,
          user_metadata: { full_name: fullName, role },
        });

        // Log the password change
        await adminClient.from('audit_logs').insert([
          {
            action: `បានប្តូរពាក្យសម្ងាត់សម្រាប់គណនីលេខសម្គាល់ ${id}`,
            type: 'warn',
            user_id: user.id,
          }
        ]);
      } catch (_) {}
    }

    if (homeroomClass && role === 'teacher') {
      // Unassign any previous class
      await adminClient
        .from('classes')
        .update({ teacher_id: null })
        .eq('teacher_id', id);

      const { data: existingClass } = await adminClient
        .from('classes')
        .select('id')
        .eq('name', homeroomClass)
        .maybeSingle();

      if (existingClass) {
        await adminClient
          .from('classes')
          .update({ teacher_id: id })
          .eq('id', existingClass.id);
      }
    }

    const roleKh =
      role === 'principal'
        ? 'នាយកសាលា'
        : role === 'admin'
        ? 'អ្នកគ្រប់គ្រងប្រព័ន្ធ'
        : role === 'monitor'
        ? 'ប្រធានថ្នាក់'
        : 'គ្រូបន្ទុកថ្នាក់';

    return NextResponse.json({
      isDemo: false,
      user: {
        id,
        name: fullName,
        role,
        roleKh,
        school: schoolCode || 'Porieng-2026',
        homeroomClass,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role: userRole } = await getServerAuth();

  if (!user || userRole !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const { id } = await params;
  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    const { data: targetProfile } = await adminClient.from('profiles').select('role, is_active').eq('id', id).single();
    
    if (targetProfile?.role === 'admin' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Principal cannot delete an admin account.' }, { status: 403 });
    }

    if (targetProfile?.role === 'admin') {
      const { count } = await adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
      if (count !== null && count <= 1) {
        return NextResponse.json({ error: 'Cannot delete the last admin account.' }, { status: 400 });
      }
    }

    // 1. Delete profile
    const { error: profileErr } = await adminClient.from('profiles').delete().eq('id', id);
    if (profileErr) throw profileErr;

    // 2. Unassign teacher from any classes
    await adminClient.from('classes').update({ teacher_id: null }).eq('teacher_id', id);

    // 3. Delete auth user
    try {
      await adminClient.auth.admin.deleteUser(id);
    } catch (_) {}

    // Log the deletion
    await adminClient.from('audit_logs').insert([
      {
        action: `បានលុបគណនីលេខសម្គាល់ ${id}`,
        type: 'warn',
        user_id: user.id,
      }
    ]);

    return NextResponse.json({ isDemo: false, message: 'User deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete user' }, { status: 500 });
  }
}
