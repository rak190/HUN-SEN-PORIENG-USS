import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';
import crypto from 'crypto';
import { BatchUserSchema } from '@/lib/validations/schemas';

export async function POST(req: Request) {
  const { user, role: userRole } = await getServerAuth();

  if (!user || userRole !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const body = await req.json();

  const validationResult = BatchUserSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: validationResult.error.issues[0].message },
      { status: 400 }
    );
  }

  const { users } = validationResult.data;

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
    const finalPassword = password || crypto.randomInt(100000, 999999).toString();
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
          if (createErr.message.includes('already exists') || createErr.status === 422) {
            throw new Error('Username already exists.');
          }
          throw createErr;
        }
      } catch (authErr: any) {
        failCount++;
        results.push({ username: cleanUsername, error: authErr.message || 'Failed to provision auth user' });
        continue;
      }

      const { data: schoolObj } = await adminClient
        .from('schools')
        .select('id')
        .eq('school_code', finalSchool)
        .maybeSingle();

      if (!schoolObj) {
        failCount++;
        results.push({ username: cleanUsername, error: 'Invalid school code.' });
        // Rollback Auth user creation
        await adminClient.auth.admin.deleteUser(authUserId).catch(() => {});
        continue;
      }

      const { error: profileError } = await adminClient.from('profiles').upsert([
        {
          id: authUserId,
          username: cleanUsername,
          full_name: fullName.trim(),
          role: finalRole,
          school_id: schoolObj.id,
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
        // Rollback Auth user creation
        await adminClient.auth.admin.deleteUser(authUserId).catch(() => {});
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
      console.error(`[Batch Provisioning Error] username=${cleanUsername}:`, err);
      // Sanitize client error
      const safeError = err.message?.includes('already exists') 
        ? 'ឈ្មោះគណនីមានរួចហើយ' 
        : 'មានបញ្ហាក្នុងការបង្កើតគណនី (Server Error)';
      results.push({ username: cleanUsername, error: safeError });
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
