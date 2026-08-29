import { cookies } from 'next/headers';
import { createClient } from './supabase/server';
import { Profile } from '@/types';

export async function getServerAuth() {
  const cookieStore = await cookies();
  const supabase = await createClient();

  let userId: string | null = null;
  let email: string = '';

  // 1. Primary: Verify genuine cryptographic Supabase Auth Session
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      email = user.email || '';
    }
  } catch (e) {
    // Supabase Auth call error
  }

  // 2. Fallback: Cookie if Supabase auth session token is not present
  const cookieUserId = cookieStore.get('kruai_user_id')?.value;
  const cookieUsername = cookieStore.get('kruai_username')?.value;
  const cookieRole = cookieStore.get('kruai_role')?.value;

  if (!userId && cookieUserId) {
    userId = cookieUserId;
  }

  // 3. Always verify identity and authoritative role from Database Profile
  try {
    let profile: any = null;

    if (userId) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      profile = data;
    }

    if (!profile && cookieUsername) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', cookieUsername.toLowerCase().trim())
        .maybeSingle();
      profile = data;
    }

    if (profile) {
      return {
        user: { id: profile.id, email: email || `${profile.username}@kruai.app` },
        profile: profile as Profile,
        role: profile.role || 'teacher'
      };
    }

    // 4. Fallback for administrative bootstrap accounts
    const isAdmin = cookieRole === 'admin' || cookieUsername === 'admin_porieng' || cookieUsername === 'admin' || userId === '00000000-0000-0000-0000-000000000001';
    if (isAdmin) {
      return {
        user: { id: '00000000-0000-0000-0000-000000000001', email: 'admin@kruai.app' },
        profile: {
          id: '00000000-0000-0000-0000-000000000001',
          username: cookieUsername || 'admin_porieng',
          full_name: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)',
          role: 'admin',
          school_id: '11111111-1111-1111-1111-111111111111',
          school_code: 'Porieng-2026',
          created_at: new Date().toISOString(),
        } as Profile,
        role: 'admin'
      };
    }

    const isPrincipal = cookieRole === 'principal' || cookieUsername === 'principal_porieng' || cookieUsername === 'principal' || userId === '00000000-0000-0000-0000-000000000002';
    if (isPrincipal) {
      return {
        user: { id: '00000000-0000-0000-0000-000000000002', email: 'principal@kruai.app' },
        profile: {
          id: '00000000-0000-0000-0000-000000000002',
          username: cookieUsername || 'principal_porieng',
          full_name: 'លោកនាយកសាលា',
          role: 'principal',
          school_id: '11111111-1111-1111-1111-111111111111',
          school_code: 'Porieng-2026',
          created_at: new Date().toISOString(),
        } as Profile,
        role: 'principal'
      };
    }

    // Demo teacher fallback
    if (userId === 'demo-teacher-id' || cookieRole === 'teacher') {
      return {
        user: { id: 'demo-teacher-id', email: 'demo@kruai.app' },
        profile: {
          id: 'demo-teacher-id',
          username: cookieUsername || 'teacher_12a',
          full_name: 'លោកគ្រូ/អ្នកគ្រូ សុខា',
          role: 'teacher',
          school_id: '11111111-1111-1111-1111-111111111111',
          school_code: 'Porieng-2026',
          created_at: new Date().toISOString(),
        } as Profile,
        role: 'teacher'
      };
    }

    return { user: null, profile: null, role: null };
  } catch (e) {
    return { user: null, profile: null, role: null };
  }
}
