import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const DEMO_USERS = [
  { id: 'USR-01', username: 'kruadmin041030', name: 'លោកគ្រូ/អ្នកគ្រូ សុខា', role: 'teacher', roleKh: 'គ្រូបន្ទុកថ្នាក់', school: 'Porieng-2026', status: 'សកម្ម', lastLogin: '3 នាទីមុន', created_at: new Date().toISOString() },
  { id: 'USR-02', username: 'principal_porieng', name: 'នាយកសាលា សុខា', role: 'principal', roleKh: 'នាយកសាលា', school: 'Porieng-2026', status: 'សកម្ម', lastLogin: '1 ម៉ោងមុន', created_at: new Date().toISOString() },
];

const generatePin = () => Math.floor(100000 + Math.random() * 900000).toString();

const getRoleKh = (role: string) => {
  return role === 'principal' ? 'នាយកសាលា' : role === 'admin' ? 'អ្នកគ្រប់គ្រងប្រព័ន្ធ' : role === 'monitor' ? 'ប្រធានថ្នាក់' : 'គ្រូបន្ទុកថ្នាក់';
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ isDemo: true, users: DEMO_USERS });
  }

  try {
    const { data: profiles, error: profileError } = await adminClient.from('profiles').select('*').order('created_at', { ascending: false });
    if (profileError) throw profileError;

    const { data: authData } = await adminClient.auth.admin.listUsers();
    const authUserMap = new Map((authData?.users || []).map(u => [u.id, u]));

    const mappedUsers = (profiles || []).map(p => {
      const authUser = authUserMap.get(p.id);
      return {
        id: p.id,
        username: p.username || p.full_name,
        name: p.full_name || p.username,
        role: p.role || 'teacher',
        roleKh: getRoleKh(p.role || 'teacher'),
        school: p.school_code || 'Porieng-2026',
        status: authUser?.banned_until ? 'បានផ្អាក' : 'សកម្ម',
        lastLogin: authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleTimeString() : 'មិនធ្លាប់',
        created_at: p.created_at,
      };
    });

    return NextResponse.json({ isDemo: false, users: mappedUsers });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== 'admin') {
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
    const newDemoUsers = usersToCreate.map((u: any, idx: number) => ({
      id: `USR-${Date.now()}-${idx}`,
      username: u.username.trim().toLowerCase(),
      name: u.fullName.trim(),
      role: u.role || 'teacher',
      roleKh: getRoleKh(u.role || 'teacher'),
      school: u.schoolCode || 'Porieng-2026',
      status: 'សកម្ម',
      lastLogin: 'ឥឡូវនេះ',
      created_at: new Date().toISOString(),
    }));
    return NextResponse.json({ isDemo: true, users: newDemoUsers });
  }

  const createdUsers = [];
  const errors = [];

  for (const u of usersToCreate) {
    try {
      const cleanUsername = u.username.trim().toLowerCase();
      const email = `${cleanUsername}@kruai.app`;
      const generatedPassword = u.password?.trim() || generatePin();
      
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { full_name: u.fullName.trim(), role: u.role || 'teacher' },
      });

      if (createError) {
        errors.push({ username: cleanUsername, error: createError.message });
        continue;
      }

      if (newUser.user) {
        await adminClient.from('profiles').insert([{
          id: newUser.user.id,
          username: cleanUsername,
          full_name: u.fullName.trim(),
          role: u.role || 'teacher',
          school_id: (u.schoolCode || 'Porieng-2026').toLowerCase() === 'porieng-2026' ? 'main-school' : `school-${Date.now()}`,
          school_code: u.schoolCode || 'Porieng-2026',
        }]);

        createdUsers.push({
          id: newUser.user.id,
          username: cleanUsername,
          name: u.fullName.trim(),
          role: u.role || 'teacher',
          roleKh: getRoleKh(u.role || 'teacher'),
          school: u.schoolCode || 'Porieng-2026',
          status: 'សកម្ម',
          lastLogin: 'មិនធ្លាប់',
          created_at: new Date().toISOString(),
          generatedPassword: !u.password?.trim() ? generatedPassword : null
        });
      }
    } catch (err: any) {
      errors.push({ username: u.username, error: err.message });
    }
  }

  return NextResponse.json({ isDemo: false, users: createdUsers, errors });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) return NextResponse.json({ isDemo: true });

  const body = await req.json();
  const { id, action, updates } = body;

  if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

  try {
    if (action === 'toggle_status') {
      const { status } = updates;
      // Bans user for 100 years if 'បានផ្អាក', unbans if 'សកម្ម'
      const banDuration = status === 'បានផ្អាក' ? 100 * 365 * 24 * 60 * 60 : 0; 
      
      if (banDuration > 0) {
         // Current Supabase js doesn't have banUser directly in some versions, update user attribute banned_until
         await adminClient.auth.admin.updateUserById(id, { ban_duration: '876000h' });
      } else {
         await adminClient.auth.admin.updateUserById(id, { ban_duration: 'none' });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'reset_password') {
      const newPin = generatePin();
      const { error } = await adminClient.auth.admin.updateUserById(id, { password: newPin });
      if (error) throw error;
      return NextResponse.json({ success: true, newPassword: newPin });
    }

    if (action === 'update_profile') {
      const { name, role, username } = updates;
      const profileUpdates: any = {};
      const authUpdates: any = { user_metadata: {} };
      
      if (name) {
        profileUpdates.full_name = name;
        authUpdates.user_metadata.full_name = name;
      }
      if (role) {
        profileUpdates.role = role;
        authUpdates.user_metadata.role = role;
      }
      if (username) {
        profileUpdates.username = username;
        // Updating email to match new username for consistency
        authUpdates.email = `${username.trim().toLowerCase()}@kruai.app`;
      }

      await adminClient.auth.admin.updateUserById(id, authUpdates);
      await adminClient.from('profiles').update(profileUpdates).eq('id', id);
      
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

  const adminClient = createAdminClient();
  if (!adminClient) return NextResponse.json({ isDemo: true, success: true });

  try {
    // Delete profile first (if not cascading)
    await adminClient.from('profiles').delete().eq('id', id);
    // Delete auth user
    const { error } = await adminClient.auth.admin.deleteUser(id);
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
