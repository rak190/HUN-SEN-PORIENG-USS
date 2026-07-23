import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const adminClient = createAdminClient();
  const body = await req.json();

  const { users } = body;

  if (!Array.isArray(users) || users.length === 0) {
    return NextResponse.json(
      { error: 'សូមផ្តល់បញ្ជីគណនីយ៉ាងហោចណាស់ 1 (Users array is required)' },
      { status: 400 }
    );
  }

  // Handle Demo Mode if Service Role Key is missing
  if (!adminClient) {
    const createdUsers = users.map((u, idx) => {
      const roleKh =
        u.role === 'principal'
          ? 'នាយកសាលា'
          : u.role === 'admin'
          ? 'អ្នកគ្រប់គ្រងប្រព័ន្ធ'
          : u.role === 'monitor'
          ? 'ប្រធានថ្នាក់'
          : 'គ្រូបន្ទុកថ្នាក់';

      return {
        id: `USR-BATCH-${Date.now()}-${idx}`,
        username: (u.username || `user_${idx}`).trim().toLowerCase(),
        name: (u.fullName || u.username).trim(),
        role: u.role || 'teacher',
        roleKh,
        school: u.schoolCode || 'Porieng-2026',
        status: 'សកម្ម',
        lastLogin: 'មិនធ្លាប់',
        created_at: new Date().toISOString(),
      };
    });

    return NextResponse.json({
      isDemo: true,
      message: 'Batch users created in demo mode.',
      users: createdUsers,
      successCount: createdUsers.length,
      failCount: 0,
    });
  }

  const results: any[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const userItem of users) {
    const { username, password, fullName, role, schoolCode } = userItem;

    if (!username || !fullName) {
      failCount++;
      results.push({ username, error: 'ព័ត៌មានមិនគ្រប់គ្រាន់ (Missing name or username)' });
      continue;
    }

    const cleanUsername = username.trim().toLowerCase();
    const email = `${cleanUsername}@kruai.app`;
    const finalPassword = password || 'password123';
    const finalRole = role || 'teacher';
    const finalSchool = schoolCode || 'Porieng-2026';

    try {
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: finalPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName.trim(),
          role: finalRole,
        },
      });

      if (createError) {
        failCount++;
        results.push({ username: cleanUsername, error: createError.message });
        continue;
      }

      if (newUser.user) {
        await adminClient.from('profiles').insert([
          {
            id: newUser.user.id,
            username: cleanUsername,
            full_name: fullName.trim(),
            role: finalRole,
            school_id: finalSchool.toLowerCase() === 'porieng-2026' ? 'main-school' : `school-${Date.now()}`,
            school_code: finalSchool,
          },
        ]);
      }

      const roleKh =
        finalRole === 'principal'
          ? 'នាយកសាលា'
          : finalRole === 'admin'
          ? 'អ្នកគ្រប់គ្រងប្រព័ន្ធ'
          : finalRole === 'monitor'
          ? 'ប្រធានថ្នាក់'
          : 'គ្រូបន្ទុកថ្នាក់';

      successCount++;
      results.push({
        id: newUser.user.id,
        username: cleanUsername,
        name: fullName.trim(),
        role: finalRole,
        roleKh,
        school: finalSchool,
        status: 'សកម្ម',
        lastLogin: 'មិនធ្លាប់',
        created_at: new Date().toISOString(),
      });
    } catch (err: any) {
      failCount++;
      results.push({ username: cleanUsername, error: err?.message || 'Failed' });
    }
  }

  return NextResponse.json({
    isDemo: false,
    users: results.filter(r => r.id),
    results,
    successCount,
    failCount,
  });
}
