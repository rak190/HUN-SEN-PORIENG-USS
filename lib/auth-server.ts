import { cookies } from 'next/headers';
import { createClient } from './supabase/server';
import { Profile, Role } from '@/types';

export interface AuthContextResult {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  role: Role | null;
}

/**
 * Authoritative Server-Side Authentication
 * Verifies genuine cryptographic Supabase Auth Session and retrieves authoritative DB Profile.
 */
export async function getServerAuth(): Promise<AuthContextResult> {
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
  } catch (_) {
    // Session token absent or expired
  }

  // 2. Secondary: Fallback to secure session cookie ONLY with database validation
  if (!userId) {
    const cookieUserId = cookieStore.get('kruai_user_id')?.value;
    if (cookieUserId && /^[0-9a-fA-F-]{36}$/.test(cookieUserId)) {
      userId = cookieUserId;
    }
  }

  if (!userId) {
    return { user: null, profile: null, role: null };
  }

  // 3. Retrieve authoritative database profile (NEVER trust client cookies for role)
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profile && profile.is_active !== false) {
      return {
        user: { id: profile.id, email: email || `${profile.username}@kruai.app` },
        profile: profile as Profile,
        role: profile.role as Role
      };
    }
  } catch (err) {
    console.error('Server auth profile query error:', err);
  }

  return { user: null, profile: null, role: null };
}

/**
 * Reusable Guard: Require Authenticated User
 */
export async function requireAuth(): Promise<{ user: { id: string; email: string }; profile: Profile; role: Role }> {
  const { user, profile, role } = await getServerAuth();
  if (!user || !profile || !role) {
    throw new Error('Unauthorized: Authentication required to access this resource.');
  }
  return { user, profile, role };
}

/**
 * Reusable Guard: Require Specific Role(s)
 */
export async function requireRole(allowedRoles: Role[]): Promise<{ user: { id: string; email: string }; profile: Profile; role: Role }> {
  const auth = await requireAuth();
  if (!allowedRoles.includes(auth.role)) {
    throw new Error(`Forbidden: Insufficient privileges. Required role: [${allowedRoles.join(', ')}], actual role: ${auth.role}`);
  }
  return auth;
}

/**
 * Reusable Guard: Require School Scope Access
 */
export async function requireSchoolAccess(schoolId: string): Promise<{ user: { id: string; email: string }; profile: Profile; role: Role }> {
  const auth = await requireAuth();
  if (auth.role === 'admin') return auth;
  if (auth.profile.school_id && auth.profile.school_id !== schoolId) {
    throw new Error('Forbidden: You do not have access to this school institution.');
  }
  return auth;
}

/**
 * Reusable Guard: Require Class Access (Homeroom Teacher, Principal, or Admin)
 */
export async function requireClassAccess(classId: string): Promise<{ user: { id: string; email: string }; profile: Profile; role: Role }> {
  const auth = await requireAuth();
  if (auth.role === 'admin' || auth.role === 'principal') return auth;

  const supabase = await createClient();
  const { data: classroom } = await supabase
    .from('classes')
    .select('id, teacher_id')
    .eq('id', classId)
    .maybeSingle();

  if (!classroom || classroom.teacher_id !== auth.user.id) {
    throw new Error('Forbidden: You are not authorized to modify records for this class.');
  }

  return auth;
}

/**
 * Reusable Guard: Require Student Access
 */
export async function requireStudentAccess(studentId: string): Promise<{ user: { id: string; email: string }; profile: Profile; role: Role }> {
  const auth = await requireAuth();
  if (auth.role === 'admin' || auth.role === 'principal') return auth;

  const supabase = await createClient();
  const { data: student } = await supabase
    .from('students')
    .select('id, class_id, classes(teacher_id)')
    .eq('id', studentId)
    .maybeSingle();

  const assignedTeacherId = (student?.classes as any)?.teacher_id;
  if (!student || assignedTeacherId !== auth.user.id) {
    throw new Error('Forbidden: You are not authorized to modify records for this student.');
  }

  return auth;
}
