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
  } catch (err) {
    console.debug('Auth check failed:', err);
  }

  if (!userId) {
    return { user: null, profile: null, role: null };
  }

  // 2. Retrieve authoritative database profile (NEVER trust client cookies for role)
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
  if (auth.role === 'admin') return auth;

  const supabase = await createClient();
  const { data: classroom } = await supabase
    .from('classes')
    .select('id, teacher_id, school_id')
    .eq('id', classId)
    .maybeSingle();

  if (!classroom) {
    throw new Error('Forbidden: Record not found.');
  }

  if (auth.role === 'principal') {
    if (classroom.school_id !== auth.profile.school_id) {
      throw new Error('Forbidden: You are not authorized to modify records outside your school.');
    }
    return auth;
  }

  if (classroom.teacher_id !== auth.user.id) {
    throw new Error('Forbidden: You are not authorized to modify records for this class.');
  }

  return auth;
}

/**
 * Reusable Guard: Require Student Access
 */
export async function requireStudentAccess(studentId: string): Promise<{ user: { id: string; email: string }; profile: Profile; role: Role }> {
  const auth = await requireAuth();
  if (auth.role === 'admin') return auth;

  const supabase = await createClient();
  const { data: student } = await supabase
    .from('students')
    .select('id, class_id, classes(teacher_id, school_id)')
    .eq('id', studentId)
    .maybeSingle();

  if (!student) {
    throw new Error('Forbidden: Student record not found.');
  }

  const classData = student.classes as any;

  if (auth.role === 'principal') {
    if (classData?.school_id !== auth.profile.school_id) {
      throw new Error('Forbidden: You are not authorized to modify students outside your school.');
    }
    return auth;
  }

  if (classData?.teacher_id !== auth.user.id) {
    throw new Error('Forbidden: You are not authorized to modify records for this student.');
  }

  return auth;
}

export async function requireAdmin() { return requireRole(['admin']); }
export async function requirePrincipal() { return requireRole(['principal', 'admin']); }
export async function requireTeacher() { return requireRole(['teacher', 'principal', 'admin']); }
export async function requireMonitor() { return requireRole(['monitor', 'admin']); }
