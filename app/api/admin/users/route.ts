import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Fallback demo data if Supabase Service Role key is not configured yet
const DEMO_USERS = [
  { id: 'USR-01', username: 'kruadmin041030', name: 'លោកគ្រូ/អ្នកគ្រូ សុខា', role: 'teacher', roleKh: 'គ្រូបន្ទុកថ្នាក់', school: 'Porieng-2026', status: 'សកម្ម', lastLogin: '3 នាទីមុន', created_at: new Date().toISOString() },
  { id: 'USR-02', username: 'principal_porieng', name: 'នាយកសាលា សុខា', role: 'principal', roleKh: 'នាយកសាលា', school: 'Porieng-2026', status: 'សកម្ម', lastLogin: '1 ម៉ោងមុន', created_at: new Date().toISOString() },
  { id: 'USR-03', username: 'sysadmin_porieng', name: 'អ្នកគ្រប់គ្រង សុខា', role: 'admin', roleKh: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ', school: 'Porieng-2026', status: 'សកម្ម', lastLogin: 'ឥឡូវនេះ', created_at: new Date().toISOString() },
  { id: 'USR-04', username: 'sambath_math', name: 'លោកគ្រូ សម្បត្តិ', role: 'teacher', roleKh: 'គ្រូបន្ទុកថ្នាក់', school: 'Porieng-2026', status: 'សកម្ម', lastLogin: 'ម្សិលមិញ', created_at: new Date().toISOString() },
  { id: 'USR-05', username: 'reasmey_kh', name: 'អ្នកគ្រូ ច័ន្ទរស្មី', role: 'teacher', roleKh: 'គ្រូបន្ទុកថ្នាក់', school: 'Porieng-2026', status: 'សកម្ម', lastLogin: '2 ម៉ោងមុន', created_at: new Date().toISOString() },
  { id: 'USR-06', username: 'bunthoeun_his', name: 'លោកគ្រូ ប៊ុនធឿន', role: 'teacher', roleKh: 'គ្រូបន្ទុកថ្នាក់', school: 'Porieng-2026', status: 'សកម្ម', lastLogin: '3 ថ្ងៃមុន', created_at: new Date().toISOString() },
];

export async function GET() {
  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({
      isDemo: true,
      message: 'SUPABASE_SERVICE_ROLE_KEY is missing. Using local demo mode.',
      users: DEMO_USERS,
    });
  }

  try {
    const { data: profiles, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profileError) {
      throw profileError;
    }

    const { data: authData } = await adminClient.auth.admin.listUsers();

    const authUserMap = new Map((authData?.users || []).map(u => [u.id, u]));

    const mappedUsers = (profiles || []).map(p => {
      const authUser = authUserMap.get(p.id);
      const roleKh =
        p.role === 'principal'
          ? 'នាយកសាលា'
          : p.role === 'admin'
          ? 'អ្នកគ្រប់គ្រងប្រព័ន្ធ'
          : p.role === 'monitor'
          ? 'ប្រធានថ្នាក់'
          : 'គ្រូបន្ទុកថ្នាក់';

      return {
        id: p.id,
        username: p.username || p.full_name,
        name: p.full_name || p.username,
        role: p.role || 'teacher',
        roleKh,
        school: p.school_code || 'Porieng-2026',
        status: authUser?.banned_until ? 'បានផ្អាក' : 'សកម្ម',
        lastLogin: authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleTimeString() : 'មិនធ្លាប់',
        created_at: p.created_at,
      };
    });

    return NextResponse.json({
      isDemo: false,
      users: mappedUsers,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const adminClient = createAdminClient();
  const body = await req.json();

  const { username, password, fullName, role, schoolCode } = body;

  if (!username || !password || !fullName || !role) {
    return NextResponse.json(
      { error: 'សូមបំពេញព័ត៌មានចាំបាច់ទាំងអស់ (Username, Password, Full Name, Role)' },
      { status: 400 }
    );
  }

  const cleanUsername = username.trim().toLowerCase();
  const email = `${cleanUsername}@kruai.app`;

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

    const newDemoUser = {
      id: `USR-${Date.now()}`,
      username: cleanUsername,
      name: fullName.trim(),
      role,
      roleKh,
      school: schoolCode || 'Porieng-2026',
      status: 'សកម្ម',
      lastLogin: 'ឥឡូវនេះ',
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      isDemo: true,
      message: 'User created in demo mode.',
      user: newDemoUser,
    });
  }

  try {
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        role,
      },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    if (newUser.user) {
      const { error: profileError } = await adminClient.from('profiles').insert([
        {
          id: newUser.user.id,
          username: cleanUsername,
          full_name: fullName.trim(),
          role,
          school_id: (schoolCode || 'Porieng-2026').toLowerCase() === 'porieng-2026' ? 'main-school' : `school-${Date.now()}`,
          school_code: schoolCode || 'Porieng-2026',
        },
      ]);

      if (profileError) {
        console.error('Failed to create profile:', profileError);
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
        id: newUser.user.id,
        username: cleanUsername,
        name: fullName.trim(),
        role,
        roleKh,
        school: schoolCode || 'Porieng-2026',
        status: 'សកម្ម',
        lastLogin: 'មិនធ្លាប់',
        created_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create user' }, { status: 500 });
  }
}
