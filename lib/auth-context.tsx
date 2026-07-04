'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from './supabase/client';
import { Profile, Classroom } from '@/types';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  activeClass: Classroom | null;
  classes: Classroom[];
  loading: boolean;
  isDemoMode: boolean;
  login: (username: string, password: string) => Promise<{ error?: string }>;
  register: (username: string, password: string, fullName: string, role?: 'teacher' | 'principal' | 'admin', schoolCode?: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  setActiveClass: (cls: Classroom | null) => void;
  refreshClasses: () => Promise<void>;
  setRole: (role: 'teacher' | 'principal' | 'admin') => void;
}

const DEFAULT_PROFILE: Profile = {
  id: 'demo-teacher-id',
  username: 'kruadmin041030',
  full_name: 'លោកគ្រូ/អ្នកគ្រូ សុខា (Demo)',
  role: 'teacher',
  school_id: 'main-school',
  school_code: 'Porieng-2026',
  created_at: new Date().toISOString(),
};

const DEMO_CLASSES: Classroom[] = [
  {
    id: 'demo-class-1',
    school_id: 'main-school',
    teacher_id: 'demo-teacher-id',
    name: '12 ក',
    grade: '12',
    subjects: [
      { id: 'math', label: 'គណិតវិទ្យា' },
      { id: 'physics', label: 'រូបវិទ្យា' },
      { id: 'khmer', label: 'ភាសាខ្មែរ' },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-class-2',
    school_id: 'main-school',
    teacher_id: 'demo-teacher-id',
    name: '11 ខ',
    grade: '11',
    subjects: [
      { id: 'math', label: 'គណិតវិទ្យា' },
      { id: 'ict', label: 'ICT' },
    ],
    created_at: new Date().toISOString(),
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(DEFAULT_PROFILE);
  const [classes, setClasses] = useState<Classroom[]>(DEMO_CLASSES);
  const [activeClass, setActiveClass] = useState<Classroom | null>(DEMO_CLASSES[0]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  const supabase = createClient();

  useEffect(() => {
    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setIsDemoMode(false);
          await fetchProfile(session.user.id);
          await refreshClassesForUser(session.user.id);
        } else {
          // Keep demo mode active if no user session
          setIsDemoMode(true);
        }
      } catch (err) {
        console.warn('Supabase offline or not configured, using Demo Mode:', err);
        setIsDemoMode(true);
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
        setProfile(DEFAULT_PROFILE);
        setClasses(DEMO_CLASSES);
        setActiveClass(DEMO_CLASSES[0]);
        setIsDemoMode(true);
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
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', userId);
      if (data && !error && data.length > 0) {
        setClasses(data as Classroom[]);
        if (!activeClass || !data.some(c => c.id === activeClass.id)) {
          setActiveClass(data[0] as Classroom);
        }
      } else if (!data || data.length === 0) {
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
      setClasses([...DEMO_CLASSES]);
    }
  }

  async function login(username: string, password: string): Promise<{ error?: string }> {
    const cleanUsername = username.trim().toLowerCase();
    const email = `${cleanUsername}@kruai.app`;

    const isAdminDemo = cleanUsername === 'admin' || cleanUsername === 'sysadmin' || cleanUsername === 'kruadmin';
    const isPrincipalDemo = cleanUsername === 'kruadmin041030' || cleanUsername === 'principal';
    const isTeacherDemo = cleanUsername === 'teacher' || cleanUsername === 'teacher1' || cleanUsername === 'demo' || cleanUsername === 'homeroom';
    const isMonitorDemo = cleanUsername === 'monitor';

    // 1. Instant Demo Mode: never make a network call for demo users
    if (isAdminDemo || isPrincipalDemo || isTeacherDemo || isMonitorDemo || password === 'password123') {
      setIsDemoMode(true);
      setUser({ id: 'demo-teacher-id', email });
      const assignedRole = isAdminDemo ? 'admin' : isPrincipalDemo ? 'principal' : isMonitorDemo ? 'monitor' : 'teacher';
      const assignedName = isAdminDemo 
        ? 'លោកគ្រូ/អ្នកគ្រូ សុខា (អ្នកគ្រប់គ្រងប្រព័ន្ធ)' 
        : isPrincipalDemo 
        ? 'លោកគ្រូ/អ្នកគ្រូ សុខា (នាយកសាលា)' 
        : isMonitorDemo
        ? 'សិស្ស ខៀវ សុវណ្ណារាជ (ប្រធានថ្នាក់)'
        : 'លោកគ្រូ/អ្នកគ្រូ សម្បត្តិ (គ្រូបន្ទុកថ្នាក់)';

      setProfile({
        ...DEFAULT_PROFILE,
        username: cleanUsername,
        full_name: assignedName,
        role: assignedRole,
      });
      setClasses(DEMO_CLASSES);
      setActiveClass(DEMO_CLASSES[0]);
      return {};
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: 'គណនី ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ។ (Invalid credentials)' };
      }

      setIsDemoMode(false);
      return {};
    } catch (e: any) {
      // If network fails (Failed to fetch / offline), allow seamless offline fallback
      if (e?.message?.includes('fetch') || e?.name === 'TypeError') {
        setIsDemoMode(true);
        setUser({ id: 'demo-teacher-id', email });
        const assignedRole = isAdminDemo ? 'admin' : isPrincipalDemo ? 'principal' : isMonitorDemo ? 'monitor' : 'teacher';
        const assignedName = isAdminDemo 
          ? 'លោកគ្រូ/អ្នកគ្រូ សុខា (អ្នកគ្រប់គ្រងប្រព័ន្ធ)' 
          : isPrincipalDemo 
          ? 'លោកគ្រូ/អ្នកគ្រូ សុខា (នាយកសាលា)' 
          : isMonitorDemo
          ? 'សិស្ស ខៀវ សុវណ្ណារាជ (ប្រធានថ្នាក់)'
          : 'លោកគ្រូ/អ្នកគ្រូ សម្បត្តិ (គ្រូបន្ទុកថ្នាក់)';

        setProfile({
          ...DEFAULT_PROFILE,
          username: cleanUsername,
          full_name: assignedName,
          role: assignedRole,
        });
        setClasses(DEMO_CLASSES);
        setActiveClass(DEMO_CLASSES[0]);
        return {};
      }
      return { error: e?.message || 'កំហុសក្នុងការចូលប្រព័ន្ធ។' };
    }
  }

  async function register(
    username: string,
    password: string,
    fullName: string,
    role: 'teacher' | 'principal' | 'admin' | 'monitor' = 'teacher',
    schoolCode: string = 'Porieng-2026'
  ): Promise<{ error?: string }> {
    const cleanUsername = username.trim().toLowerCase();
    const email = `${cleanUsername}@kruai.app`;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        // Create profile in Supabase
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: data.user.id,
            username: cleanUsername,
            full_name: fullName.trim() || cleanUsername,
            role,
            school_id: schoolCode.toLowerCase() === 'porieng-2026' ? 'main-school' : `school-${Date.now()}`,
            school_code: schoolCode || 'Porieng-2026',
          },
        ]);

        if (profileError) {
          console.error('Profile insert error:', profileError);
        }
      }

      return {};
    } catch (e: any) {
      return { error: e?.message || 'កំហុសក្នុងការចុះឈ្មោះ។' };
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    setUser(null);
    setProfile(DEFAULT_PROFILE);
    setClasses(DEMO_CLASSES);
    setActiveClass(DEMO_CLASSES[0]);
    setIsDemoMode(true);
  }

  function setRole(newRole: 'teacher' | 'principal' | 'admin' | 'monitor') {
    setProfile((prev) => {
      if (!prev) return DEFAULT_PROFILE;
      let name = prev.full_name;
      if (newRole === 'principal') name = 'នាយកសាលា សុខា (Demo)';
      else if (newRole === 'admin') name = 'អ្នកគ្រប់គ្រង សុខា (Demo)';
      else if (newRole === 'monitor') name = 'សិស្ស ខៀវ សុវណ្ណារាជ (ប្រធានថ្នាក់)';
      else if (newRole === 'teacher') name = 'លោកគ្រូ/អ្នកគ្រូ សុខា (Demo)';
      return { ...prev, role: newRole, full_name: name };
    });
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
        register,
        logout,
        setActiveClass,
        refreshClasses,
        setRole,
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
