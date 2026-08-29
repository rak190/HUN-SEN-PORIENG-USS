import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';
import crypto from 'crypto';

const generatePin = () => crypto.randomInt(100000, 999999).toString();

const getRoleKh = (role: string) => {
  return role === 'principal' ? 'នាយកសាលា' : role === 'admin' ? 'អ្នកគ្រប់គ្រងប្រព័ន្ធ' : role === 'monitor' ? 'ប្រធានថ្នាក់' : 'គ្រូបន្ទុកថ្នាក់';
};

export async function GET() {
  const { user, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ isDemo: false, users: [] });
  }

  try {
    const { data: profiles, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (profileError) throw profileError;

    let authUserMap = new Map<string, any>();
    try {
      const { data: authData } = await adminClient.auth.admin.listUsers();
      if (authData?.users) {
        authUserMap = new Map(authData.users.map(u => [u.id, u]));
      }
    } catch (_) {
      // In local mode without GoTrue, safely continue with profile list
    }

    const mappedUsers = (profiles || []).map(p => {
      const authUser = authUserMap.get(p.id);
      return {
        id: p.id,
        username: p.username || p.full_name,
        name: p.full_name || p.username,
        full_name: p.full_name || p.username,
        role: p.role || 'teacher',
        roleKh: getRoleKh(p.role || 'teacher'),
        school: p.school_code || 'Porieng-2026',
        status: authUser?.banned_until ? 'បានផ្អាក' : 'សកម្ម',
        lastLogin: authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleTimeString() : 'មិនធ្លាប់',
        phone: p.phone || 'គ្មានលេខទូរស័ព្ទ',
        subject: p.subject || 'មិនបញ្ជាក់',
        created_at: p.created_at,
      };
    });

    return NextResponse.json({ isDemo: false, users: mappedUsers });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user, role } = await getServerAuth();

  if (!user || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const body = await req.json();
  
  let usersToCreate = [];
  if (Array.isArray(body.users)) {
    usersToCreate = body.users;
  } else if (body.username && body.fullName) {
    usersToCreate = [body];
  } else {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (!adminClient) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const createdUsers = [];
  const errors = [];

  for (const u of usersToCreate) {
    try {
      const cleanUsername = u.username.trim().toLowerCase();
      
      // Phase 2: Role Hierarchy Check
      if (u.role === 'admin' && role !== 'admin') {
        errors.push({ username: u.username, error: 'Principal cannot create an admin account.' });
        continue;
      }

      // Phase 3: Validate uniqueness before provisioning
      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle();
        
      if (existingProfile) {
        errors.push({ username: u.username, error: 'Username already exists.' });
        continue;
      }

      const email = `${cleanUsername}@kruai.app`;
      const generatedPassword = u.password?.trim() || generatePin();
      const newUserId = crypto.randomUUID();
      
      const { data: authCreated, error: createErr } = await adminClient.auth.admin.createUser({
        id: newUserId,
        email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { full_name: u.fullName.trim(), role: u.role || 'teacher' },
      });

      if (createErr || !authCreated?.user) {
        errors.push({ username: u.username, error: createErr?.message || 'Failed to create auth user.' });
        continue;
      }
      
      const authUserId = authCreated.user.id;

      const { error: insertProfileErr } = await adminClient.from('profiles').insert([{
        id: authUserId,
        username: cleanUsername,
        full_name: u.fullName.trim(),
        role: u.role || 'teacher',
        school_id: '11111111-1111-1111-1111-111111111111',
        school_code: u.schoolCode || 'Porieng-2026',
        phone: u.phone || null,
        subject: u.subject || null,
        is_active: true,
      }]);

      if (insertProfileErr) {
        // Rollback Auth user creation
        await adminClient.auth.admin.deleteUser(authUserId);
        errors.push({ username: u.username, error: 'Failed to create profile. Rolled back auth.' });
        continue;
      }

      createdUsers.push({
        id: authUserId,
        username: cleanUsername,
        name: u.fullName.trim(),
        role: u.role || 'teacher',
        roleKh: getRoleKh(u.role || 'teacher'),
        school: u.schoolCode || 'Porieng-2026',
        status: 'សកម្ម',
        lastLogin: 'មិនធ្លាប់',
        phone: u.phone || '',
        subject: u.subject || '',
        created_at: new Date().toISOString(),
        tempPassword: !u.password?.trim() ? generatedPassword : null
      });
    } catch (err: any) {
      errors.push({ username: u.username, error: err.message });
    }
  }

  return NextResponse.json({ isDemo: false, users: createdUsers, errors });
}

export async function PATCH(req: Request) {
  const { user, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  const body = await req.json();
  const { id, action, updates } = body;

  if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

  try {
    const { data: targetProfile } = await adminClient.from('profiles').select('role, is_active').eq('id', id).single();
    
    if (targetProfile?.role === 'admin' && role !== 'admin') {
      return NextResponse.json({ error: 'Principal cannot modify an admin account.' }, { status: 403 });
    }

    if (action === 'toggle_status') {
      const { status } = updates;
      
      if (targetProfile?.role === 'admin' && status === 'បានផ្អាក') {
        const { count } = await adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin').eq('is_active', true);
        if (count !== null && count <= 1) {
          return NextResponse.json({ error: 'Cannot suspend the last active admin.' }, { status: 400 });
        }
      }

      try {
        const banDuration = status === 'បានផ្អាក' ? '876000h' : 'none';
        await adminClient.auth.admin.updateUserById(id, { ban_duration: banDuration });
        await adminClient.from('profiles').update({ is_active: status !== 'បានផ្អាក' }).eq('id', id);
      } catch (_) {}
      return NextResponse.json({ success: true });
    }

    if (action === 'reset_password') {
      const newPin = generatePin();
      try {
        await adminClient.auth.admin.updateUserById(id, { password: newPin });
      } catch (_) {}
      return NextResponse.json({ success: true, newPassword: newPin });
    }

    if (action === 'update_profile') {
      const { name, role: newRole, username, phone, subject } = updates;
      const profileUpdates: any = {};
      
      if (newRole === 'admin' && role !== 'admin') {
        return NextResponse.json({ error: 'Principal cannot assign admin role.' }, { status: 403 });
      }

      if (targetProfile?.role === 'admin' && newRole && newRole !== 'admin') {
        const { count } = await adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin').eq('is_active', true);
        if (count !== null && count <= 1) {
          return NextResponse.json({ error: 'Cannot demote the last active admin.' }, { status: 400 });
        }
      }
      
      if (name) profileUpdates.full_name = name;
      if (newRole) profileUpdates.role = newRole;
      if (username) profileUpdates.username = username;
      if (phone !== undefined) profileUpdates.phone = phone;
      if (subject !== undefined) profileUpdates.subject = subject;

      try {
        await adminClient.auth.admin.updateUserById(id, {
          email: username ? `${username.trim().toLowerCase()}@kruai.app` : undefined,
          user_metadata: { full_name: name, role: newRole }
        });
      } catch (_) {}

      const { error: profileErr } = await adminClient.from('profiles').update(profileUpdates).eq('id', id);
      if (profileErr) throw profileErr;
      
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { user, role } = await getServerAuth();

  if (!user || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

  const adminClient = createAdminClient();
  if (!adminClient) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const { data: targetProfile } = await adminClient.from('profiles').select('role, is_active').eq('id', id).single();
    
    if (targetProfile?.role === 'admin' && role !== 'admin') {
      return NextResponse.json({ error: 'Principal cannot delete an admin account.' }, { status: 403 });
    }

    if (targetProfile?.role === 'admin') {
      const { count } = await adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
      if (count !== null && count <= 1) {
        return NextResponse.json({ error: 'Cannot delete the last admin account.' }, { status: 400 });
      }
    }

    // Delete profile
    await adminClient.from('profiles').delete().eq('id', id);
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
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
