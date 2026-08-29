import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { user, role: userRole } = await getServerAuth();

  if (!user || userRole !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const body = await req.json();

  const { users } = body;

  if (!Array.isArray(users) || users.length === 0) {
    return NextResponse.json(
      { error: 'សូមផ្តល់បញ្ជីគណនីយ៉ាងហោចណាស់ 1 (Users array is required)' },
      { status: 400 }
    );
  }

  if (!adminClient) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const results: any[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const userItem of users) {
    const { username, password, fullName, role, schoolCode, phone, subject } = userItem;

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
    const newUserId = crypto.randomUUID();

    let authUserId: string = newUserId;
    try {
      try {
        const { data: authCreated, error: createErr } = await adminClient.auth.admin.createUser({
          id: newUserId,
          email,
          password: finalPassword,
          email_confirm: true,
          user_metadata: {
            full_name: fullName.trim(),
            role: finalRole,
          },
        });

        if (authCreated?.user) {
          authUserId = authCreated.user.id;
        } else if (createErr) {
          const { data: userList } = await adminClient.auth.admin.listUsers();
          const existing = userList?.users?.find(u => u.email === email);
          if (existing) {
            authUserId = existing.id;
            await adminClient.auth.admin.updateUserById(existing.id, {
              password: finalPassword,
              user_metadata: { full_name: fullName.trim(), role: finalRole }
            });
          }
        }
      } catch (_) {}

      const { error: profileError } = await adminClient.from('profiles').upsert([
        {
          id: authUserId,
          username: cleanUsername,
          full_name: fullName.trim(),
          role: finalRole,
          school_id: '11111111-1111-1111-1111-111111111111',
          school_code: finalSchool,
          phone: phone || null,
          subject: subject || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
      ], { onConflict: 'username' });

      if (profileError) {
        failCount++;
        results.push({ username: cleanUsername, error: profileError.message });
      } else {
        successCount++;
        results.push({
          id: authUserId,
          username: cleanUsername,
          name: fullName.trim(),
          role: finalRole,
          school: finalSchool,
          status: 'ជោគជ័យ',
        });
      }
    } catch (err: any) {
      failCount++;
      results.push({ username: cleanUsername, error: err.message });
    }
  }

  return NextResponse.json({
    isDemo: false,
    message: `បានបង្កើតគណនីជោគជ័យ ${successCount} នាក់${failCount > 0 ? ` (បរាជ័យ ${failCount} នាក់)` : ''}`,
    users: results,
    successCount,
    failCount,
  });
}
