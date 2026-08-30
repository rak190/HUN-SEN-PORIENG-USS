'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from './supabase/client';
import { Profile, Classroom, AcademicYear } from '@/types';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  activeClass: Classroom | null;
  activeAcademicYear: AcademicYear | null;
  classes: Classroom[];
  loading: boolean;
  isDemoMode: boolean;
  login: (username: string, password: string, expectedRole?: string) => Promise<{ error?: string; role?: string }>;
  logout: () => Promise<void>;
  setActiveClass: (cls: Classroom | null) => void;
  refreshClasses: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [activeClass, setActiveClass] = useState<Classroom | null>(null);
  const [activeAcademicYear, setActiveAcademicYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  const supabase = createClient();

  useEffect(() => {
    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setIsDemoMode(false);
          const { data: dbProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (dbProfile) {
            setProfile(dbProfile as Profile);
            const { data: academicYear } = await supabase
              .from('academic_years')
              .select('*')
              .eq('school_id', (dbProfile as Profile).school_id)
              .eq('is_active', true)
              .single();
            if (academicYear) setActiveAcademicYear(academicYear as AcademicYear);
          }

          await refreshClassesForUser(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setClasses([]);
          setActiveClass(null);
          setActiveAcademicYear(null);
          setIsDemoMode(false);
        }
      } catch (err) {
        console.error('initAuth error:', err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsDemoMode(false);
        await fetchProfile(session.user.id);
        await refreshClassesForUser(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setClasses([]);
        setActiveClass(null);
        setIsDemoMode(false);
      }
      setLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data && !error) {
        setProfile(data as Profile);
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
  }

  async function refreshClassesForUser(userId: string) {
    try {
      // 1. Try to find classes assigned to this teacher
      const { data: teacherClasses } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', userId)
        .order('name');

      if (teacherClasses && teacherClasses.length > 0) {
        setClasses(teacherClasses as Classroom[]);
        setActiveClass(prev => (prev && teacherClasses.some(c => c.id === prev.id)) ? prev : teacherClasses[0] as Classroom);
        return;
      }

      // 2. If no classes assigned to this user (e.g. Admin or Principal), fetch all classes
      const { data: allClasses } = await supabase
        .from('classes')
        .select('*')
        .order('name');

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

  async function refreshClasses() {
    if (user && !isDemoMode) {
      await refreshClassesForUser(user.id);
    } else {
      setClasses([]);
    }
  }

  async function login(username: string, password: string, expectedRole?: string): Promise<{ error?: string; role?: string }> {
    const cleanUsername = username.trim().toLowerCase();
    const email = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@kruai.app`;

    // 1. Primary: Genuine Supabase Auth Login
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!authError && authData?.user) {
        // Fetch authoritative database profile
        let { data: dbProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        const effectiveRole = dbProfile?.role || expectedRole || 'teacher';

        if (expectedRole && effectiveRole !== expectedRole) {
          const roleLabel = expectedRole === 'admin' ? 'អ្នកគ្រប់គ្រង' : expectedRole === 'principal' ? 'នាយកសាលា' : expectedRole === 'monitor' ? 'ប្រធានថ្នាក់' : 'គ្រូបន្ទុកថ្នាក់';
          return { error: `គណនីនេះមិនមានសិទ្ធិជា ${roleLabel} ទេ។ សូមជ្រើសរើសតួនាទីឲ្យបានត្រឹមត្រូវ។` };
        }

        setIsDemoMode(false);
        setUser({ id: authData.user.id, email });
        setProfile(dbProfile as Profile);
        
        if (dbProfile) {
          const { data: academicYear } = await supabase
            .from('academic_years')
            .select('*')
            .eq('school_id', dbProfile.school_id)
            .eq('is_active', true)
            .single();
          if (academicYear) setActiveAcademicYear(academicYear as AcademicYear);
        }

        await refreshClassesForUser(dbProfile.id);
        return { role: effectiveRole };
      }
    } catch (authErr) {
      console.warn('Supabase auth sign in error:', authErr);
    }

    return { error: 'ឈ្មោះគណនី ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ។' };
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
    } catch (err) { console.warn('Supabase sign out error:', err); }
    document.cookie = 'kruai_user_id=; path=/; max-age=0';
    document.cookie = 'kruai_role=; path=/; max-age=0';
    document.cookie = 'kruai_username=; path=/; max-age=0';
    localStorage.removeItem('demo_profile');
    setUser(null);
    setProfile(null);
    setClasses([]);
    setActiveClass(null);
    setIsDemoMode(false);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        activeClass,
        classes,
        loading,
        isDemoMode,
        login,
        logout,
        setActiveClass,
        refreshClasses,
        activeAcademicYear,
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
