'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from './supabase/client';
import { Profile, Classroom, AcademicYear, Role } from '@/types';
import { clearAllClientCaches } from '@/lib/cache/client-cache';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  activeClass: Classroom | null;
  activeAcademicYear: AcademicYear | null;
  classes: Classroom[];
  loading: boolean;
  authStatus: AuthStatus;
  authError: string | null;
  isDemoMode: boolean;
  login: (username: string, password: string, expectedRole?: string) => Promise<{ error?: string; role?: string }>;
  logout: () => Promise<void>;
  setActiveClass: (cls: Classroom | null) => void;
  refreshClasses: () => Promise<void>;
  retryAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [activeClass, setActiveClass] = useState<Classroom | null>(null);
  const [activeAcademicYear, setActiveAcademicYear] = useState<AcademicYear | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  const authSeqRef = useRef<number>(0);
  const currentUserIdRef = useRef<string | null>(null);
  const profileRef = useRef<Profile | null>(null);

  const supabase = createClient();

  // Helper to fetch and refresh classes scoped strictly by role, school, and active year
  async function refreshClassesForUser(userId: string, userRole?: string, userSchoolId?: string) {
    try {
      // Resolve active academic year ID defensively if not already set
      let yearId = activeAcademicYear?.id;
      if (!yearId) {
        const { data: actYear } = await supabase
          .from('academic_years')
          .select('id')
          .eq('is_active', true)
          .maybeSingle();
        if (actYear) yearId = actYear.id;
      }

      // 1. Try to find classes assigned to this teacher or monitor
      let assignedQuery = supabase
        .from('classes')
        .select('*')
        .or(`teacher_id.eq.${userId},monitor_id.eq.${userId}`)
        .eq('is_archived', false)
        .order('name');

      if (yearId) {
        assignedQuery = assignedQuery.eq('academic_year_id', yearId);
      }

      const { data: assignedClasses } = await assignedQuery;

      if (assignedClasses && assignedClasses.length > 0) {
        setClasses(assignedClasses as Classroom[]);
        setActiveClass(prev => (prev && assignedClasses.some(c => c.id === prev.id)) ? prev : assignedClasses[0] as Classroom);
        return;
      }

      // If the user is explicitly a teacher, do not fallback to fetching all classes
      // This prevents unassigned teachers from seeing other teachers' classes
      if (userRole === 'teacher') {
        setClasses([]);
        setActiveClass(null);
        return;
      }

      // If the user is explicitly a monitor, do not fallback to fetching all classes
      // This prevents unassigned monitors from seeing other classes
      if (userRole === 'monitor') {
        setClasses([]);
        setActiveClass(null);
        return;
      }

      // 2. If no classes assigned to this user (e.g. Admin or Principal), fetch classes scoped to school and active year
      let query = supabase
        .from('classes')
        .select('*')
        .eq('is_archived', false)
        .order('name');

      if (yearId) {
        query = query.eq('academic_year_id', yearId);
      }

      const targetSchool = userSchoolId || profileRef.current?.school_id;
      if (targetSchool) {
        query = query.eq('school_id', targetSchool);
      }

      const { data: allClasses } = await query;

      if (allClasses && allClasses.length > 0) {
        setClasses(allClasses as Classroom[]);
        setActiveClass(prev => (prev && allClasses.some(c => c.id === prev.id)) ? prev : allClasses[0] as Classroom);
      } else {
        setClasses([]);
        setActiveClass(null);
      }
    } catch (e) {
      console.error('Error fetching classes:', e);
    }
  }

  // Background loader for academic year and classes (runs concurrently once profile is authenticated)
  const loadBackgroundContext = useCallback(async (
    userId: string,
    userProfile: Profile,
    seq: number
  ) => {
    try {
      const yearPromise = (async () => {
        let yearQuery = supabase
          .from('academic_years')
          .select('*')
          .eq('is_active', true);
        if (userProfile.school_id) {
          yearQuery = yearQuery.eq('school_id', userProfile.school_id);
        }
        const { data } = await yearQuery
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return data as AcademicYear | null;
      })();

      const classesPromise = refreshClassesForUser(userId, userProfile.role, userProfile.school_id);

      const [academicYear] = await Promise.all([yearPromise, classesPromise]);

      // Guard: Discard results if a newer session was initiated while queries were in-flight
      if (seq !== authSeqRef.current) return;

      if (academicYear) {
        setActiveAcademicYear(academicYear);
      }
    } catch (bgErr) {
      console.warn('Background data load non-fatal warning:', bgErr);
    }
  }, [supabase]);

  // Synchronize authenticated session in a race-safe, decoupled manner
  const syncSession = useCallback(async (session: any, eventName: string) => {
    const seq = ++authSeqRef.current;

    // 1. Case: No authenticated user session
    if (!session?.user) {
      currentUserIdRef.current = null;
      profileRef.current = null;
      setUser(null);
      setProfile(null);
      setClasses([]);
      setActiveClass(null);
      setActiveAcademicYear(null);
      setIsDemoMode(false);
      setAuthError(null);
      setAuthStatus('unauthenticated');
      return;
    }

    const userId = session.user.id;
    const isExistingActiveSession = userId === currentUserIdRef.current && !!profileRef.current;

    // 2. Case: Token Refreshed for same active user (deduplicate database queries)
    if (eventName === 'TOKEN_REFRESHED' && isExistingActiveSession) {
      setUser(session.user);
      return;
    }

    // 3. Case: New user or identity switch — immediately clear old sensitive context
    if (userId !== currentUserIdRef.current) {
      clearAllClientCaches();
      currentUserIdRef.current = userId;
      profileRef.current = null;
      setProfile(null);
      setClasses([]);
      setActiveClass(null);
      setActiveAcademicYear(null);
    }

    setUser(session.user);
    setIsDemoMode(false);
    // Never switch authStatus to 'loading' if user is already actively authenticated!
    // This stops DashboardLayout from unmounting active pages/drawers/forms on tab switches.
    if (!isExistingActiveSession) {
      setAuthStatus('loading');
    }
    setAuthError(null);

    try {
      // Authoritative database profile query
      const { data: dbProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // Guard: Discard late-arriving responses from prior sessions
      if (seq !== authSeqRef.current) return;

      if (profileErr || !dbProfile) {
        // If this is an already verified active session and we hit a transient network error,
        // do not abruptly kick out or destroy the UI. Keep current session.
        if (isExistingActiveSession && profileErr) {
          console.warn('[auth-context] Transient background profile query error (preserving session):', profileErr);
          return;
        }

        // Fail-closed: Never retain unverified session
        currentUserIdRef.current = null;
        profileRef.current = null;
        setUser(null);
        setProfile(null);
        setClasses([]);
        setActiveClass(null);
        setActiveAcademicYear(null);
        setAuthError(profileErr ? 'បរាជ័យក្នុងការទាញយកទិន្នន័យគណនីពី Server' : 'រកមិនឃើញទិន្នន័យគណនីរបស់អ្នកនៅក្នុងប្រព័ន្ធទេ');
        setAuthStatus('error');
        return;
      }

      // Check active account status
      if (dbProfile.is_active === false) {
        currentUserIdRef.current = null;
        profileRef.current = null;
        setUser(null);
        setProfile(null);
        setClasses([]);
        setActiveClass(null);
        setActiveAcademicYear(null);
        setAuthError('គណនីនេះត្រូវបានផ្អាកដំណើរការបណ្តោះអាសន្ន។ សូមទាក់ទងអ្នកគ្រប់គ្រងសាលា។');
        setAuthStatus('error');
        return;
      }

      // Profile verified! Unblock the authenticated dashboard shell immediately
      profileRef.current = dbProfile as Profile;
      setProfile(dbProfile as Profile);
      setAuthError(null);
      setAuthStatus('authenticated');

      // Concurrently load academic year and classes in background
      loadBackgroundContext(userId, dbProfile as Profile, seq);
    } catch (err: any) {
      if (seq !== authSeqRef.current) return;
      if (isExistingActiveSession) {
        console.warn('[auth-context] Transient background profile error (preserving session):', err);
        return;
      }
      currentUserIdRef.current = null;
      profileRef.current = null;
      setUser(null);
      setProfile(null);
      setClasses([]);
      setActiveClass(null);
      setActiveAcademicYear(null);
      setAuthError(err?.message || 'កំហុសបច្ចេកទេសក្នុងការផ្ទៀងផ្ទាត់គណនី');
      setAuthStatus('error');
    }
  }, [supabase, loadBackgroundContext]);

  // Main lifecycle: single listener, decoupled dispatch, fail-closed safety timer
  useEffect(() => {
    let isMounted = true;

    // Safety timeout: after 8 seconds, fail closed to an explicit error state
    // Never imply authentication or bypass authorization on timeout!
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setAuthStatus(prev => {
          if (prev === 'loading') {
            setAuthError('ការតភ្ជាប់មានបញ្ហា ឬចំណាយពេលយូរពេកក្នុងការផ្ទៀងផ្ទាត់គណនី។ សូមព្យាយាមម្តងទៀត។');
            return 'error';
          }
          return prev;
        });
      }
    }, 8000);

    // Register auth listener with microtask decoupling to avoid Supabase lock issues
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      queueMicrotask(() => {
        if (!isMounted) return;
        syncSession(session, event);
      });
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, syncSession]);

  // Manual retry handler
  const retryAuth = useCallback(async () => {
    setAuthStatus('loading');
    setAuthError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await syncSession(session, 'RETRY');
    } catch (err: any) {
      setAuthError(err?.message || 'បរាជ័យក្នុងការតភ្ជាប់ឡើងវិញ');
      setAuthStatus('error');
    }
  }, [supabase, syncSession]);

  // Refresh classes on demand (e.g., after creating a class or switching academic year)
  const refreshClasses = useCallback(async () => {
    if (user && profileRef.current && !isDemoMode) {
      await refreshClassesForUser(user.id, profileRef.current?.role, profileRef.current?.school_id);
    } else {
      setClasses([]);
      setActiveClass(null);
    }
  }, [user, isDemoMode]);

  // Authenticate user with role verification
  const login = useCallback(async (
    username: string,
    password: string,
    expectedRole?: string
  ): Promise<{ error?: string; role?: string }> => {
    const cleanUsername = username.trim().toLowerCase();
    const email = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@kruai.app`;

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData?.user) {
        return { error: 'ឈ្មោះគណនី ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ។' };
      }

      // Fetch authoritative database profile
      const { data: dbProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileErr || !dbProfile) {
        await supabase.auth.signOut();
        return { error: 'រកមិនឃើញទិន្នន័យគណនីនៅក្នុងប្រព័ន្ធទេ។' };
      }

      const effectiveRole = dbProfile.role || 'teacher';

      // Enforce expected role guard
      if (expectedRole && effectiveRole !== expectedRole) {
        await supabase.auth.signOut();
        document.cookie = 'kruai_user_id=; path=/; max-age=0';
        document.cookie = 'kruai_role=; path=/; max-age=0';
        document.cookie = 'kruai_username=; path=/; max-age=0';
        const roleLabel = expectedRole === 'admin' ? 'អ្នកគ្រប់គ្រង' : expectedRole === 'principal' ? 'នាយកសាលា' : expectedRole === 'monitor' ? 'ប្រធានថ្នាក់' : 'គ្រូបន្ទុកថ្នាក់';
        return { error: `គណនីនេះមិនមានសិទ្ធិជា ${roleLabel} ទេ។ សូមជ្រើសរើសតួនាទីឲ្យបានត្រឹមត្រូវ។` };
      }

      // Proactively populate assigned classes for confirmed session
      await refreshClassesForUser(dbProfile.id, effectiveRole, dbProfile.school_id);

      return { role: effectiveRole };
    } catch (authErr) {
      console.warn('Supabase auth sign in error:', authErr);
      return { error: 'មានបញ្ហាបច្ចេកទេសក្នុងការចូលប្រព័ន្ធ។ សូមព្យាយាមម្តងទៀត។' };
    }
  }, [supabase]);

  // Sign out and purge runtime state and browser caches
  const logout = useCallback(async () => {
    const seq = ++authSeqRef.current;
    currentUserIdRef.current = null;
    profileRef.current = null;
    clearAllClientCaches();

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase sign out error:', err);
    }

    document.cookie = 'kruai_user_id=; path=/; max-age=0';
    document.cookie = 'kruai_role=; path=/; max-age=0';
    document.cookie = 'kruai_username=; path=/; max-age=0';
    localStorage.removeItem('demo_profile');

    // Purge browser runtime image & api caches to prevent data retention across accounts
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cacheKeys = await window.caches.keys();
        for (const key of cacheKeys) {
          if (key.includes('static-image-assets') || key.includes('api')) {
            await window.caches.delete(key);
          }
        }
      } catch (cacheErr) {
        console.debug('Failed to clear caches on logout:', cacheErr);
      }
    }

    if (seq === authSeqRef.current) {
      setUser(null);
      setProfile(null);
      setClasses([]);
      setActiveClass(null);
      setActiveAcademicYear(null);
      setIsDemoMode(false);
      setAuthError(null);
      setAuthStatus('unauthenticated');
    }
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        activeClass,
        classes,
        loading: authStatus === 'loading',
        authStatus,
        authError,
        isDemoMode,
        login,
        logout,
        setActiveClass,
        refreshClasses,
        activeAcademicYear,
        retryAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
