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
  classesLoading: boolean;
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
  const [classesLoading,setClassesLoading]=useState(false);
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
  async function refreshClassesForUser(userId:string,userRole?:string,userSchoolId?:string,seq=authSeqRef.current) {
    if(seq===authSeqRef.current)setClassesLoading(true);
    const clear=()=>{if(seq===authSeqRef.current){setClasses([]);setActiveClass(null);setClassesLoading(false);}};
    if(!userSchoolId || !userRole || !['teacher','monitor','principal','admin'].includes(userRole)){clear();return;}
    try {
      const {data:year,error:yearError}=await supabase.from('academic_years').select('id').eq('school_id',userSchoolId).eq('is_active',true).eq('status','active').maybeSingle();
      if(yearError)throw yearError;
      if(!year){clear();return;}
      let query=supabase.from('classes').select('*').eq('school_id',userSchoolId).eq('academic_year_id',year.id).eq('is_archived',false).order('name');
      if(userRole==='monitor')query=query.eq('monitor_id',userId);
      else if(userRole==='teacher')query=query.eq('teacher_id',userId);
      const {data,error}=await query;
      if(seq!==authSeqRef.current)return;
      if(error)throw error;
      const assigned=(data||[]) as Classroom[];
      setClasses(assigned);
      setClassesLoading(false);
      setAuthError(null);
      setActiveClass(previous=>{const next=assigned.find(c=>c.id===previous?.id)||assigned[0]||null;return previous&&next&&JSON.stringify(previous)===JSON.stringify(next)?previous:next;});
    }catch{
      if(seq!==authSeqRef.current)return;
      setClassesLoading(false);
      setAuthError('មិនអាចផ្ទុកថ្នាក់បានទេ។ សូមសាកម្ដងទៀត។');
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

      const classesPromise = refreshClassesForUser(userId, userProfile.role, userProfile.school_id, seq);

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
  const syncSession = useCallback(async (session: any) => {
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

    // Role/assignment may change while a token remains valid. Recheck the profile on refresh.

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
      if (dbProfile.is_active !== true) {
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
        syncSession(event === 'SIGNED_OUT' ? null : session);
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
    if(!profileRef.current || !currentUserIdRef.current)setAuthStatus('loading');
    setAuthError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await syncSession(session);
    } catch (err: any) {
      setAuthError(err?.message || 'បរាជ័យក្នុងការតភ្ជាប់ឡើងវិញ');
      setAuthStatus('error');
    }
  }, [supabase, syncSession]);

  useEffect(()=>{
    if(profile?.role!=='monitor')return;
    const refresh=()=>{void retryAuth();};
    window.addEventListener('focus',refresh);
    return()=>window.removeEventListener('focus',refresh);
  },[profile?.role,retryAuth]);

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

      if(dbProfile.is_active!==true || !['admin','principal','teacher','monitor'].includes(dbProfile.role)){await supabase.auth.signOut();return {error:'គណនីនេះត្រូវបានផ្អាក ឬមិនមានតួនាទីត្រឹមត្រូវទេ។'};}
      const effectiveRole = dbProfile.role;

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
    setUser(null);setProfile(null);setClasses([]);setActiveClass(null);setActiveAcademicYear(null);setAuthStatus('unauthenticated');

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
        classesLoading,
        loading: authStatus === 'loading',
        authStatus,
        authError,
        isDemoMode,
        login,
        logout,
        setActiveClass: (nextClass) => {
          if (nextClass?.id !== activeClass?.id && typeof window !== 'undefined') {
            const event = new Event('student-context-change', { cancelable: true });
            if (!window.dispatchEvent(event)) return;
          }
          setActiveClass(nextClass);
        },
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
