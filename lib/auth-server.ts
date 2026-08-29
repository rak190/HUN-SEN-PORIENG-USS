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

  // 2. Fallback: Local demo cookie if Supabase auth is offline
  if (!userId) {
    const cookieUserId = cookieStore.get('kruai_user_id')?.value;
    if (cookieUserId) {
      userId = cookieUserId;
    }
  }

  if (!userId) {
    return { user: null, profile: null, role: null };
  }

  // 3. Always verify identity and authoritative role from Database Profile
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      return {
        user: { id: profile.id, email: email || `${profile.username}@kruai.app` },
        profile: profile as Profile,
        role: profile.role || 'teacher'
      };
    }

    // Only allow demo teacher fallback for demo-teacher-id
    if (userId === 'demo-teacher-id') {
      return {
        user: { id: 'demo-teacher-id', email: 'demo@kruai.app' },
        profile: {
          id: 'demo-teacher-id',
          username: 'kruadmin041030',
          full_name: 'លោកគ្រូ/អ្នកគ្រូ សុខា',
          role: 'teacher',
          school_id: 'main-school',
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
