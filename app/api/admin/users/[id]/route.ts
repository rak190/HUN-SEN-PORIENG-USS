import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const adminClient = createAdminClient();
  const body = await req.json();

  const { fullName, role, schoolCode, password } = body;

  if (!adminClient) {
    // Return mock response for demo environment
    const roleKh =
      role === 'principal'
        ? 'នាយកសាលា'
        : role === 'admin'
        ? 'អ្នកគ្រប់គ្រងប្រព័ន្ធ'
        : role === 'monitor'
        ? 'ប្រធានថ្នាក់'
        : 'គ្រូបន្ទុកថ្នាក់';

    return NextResponse.json({
      isDemo: true,
      message: 'User updated in demo mode.',
      user: {
        id,
        name: fullName,
        role,
        roleKh,
        school: schoolCode || 'Porieng-2026',
      },
    });
  }

  try {
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
      const { error: authError } = await adminClient.auth.admin.updateUserById(id, {
        password,
        user_metadata: { full_name: fullName, role },
      });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
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
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({
      isDemo: true,
      message: 'User deleted in demo mode.',
      id,
    });
  }

  try {
    // 1. Delete profile
    await adminClient.from('profiles').delete().eq('id', id);

    // 2. Delete Auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({
      isDemo: false,
      message: 'User successfully deleted',
      id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete user' }, { status: 500 });
  }
}
