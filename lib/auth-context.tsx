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
  login: (username: string, password: string, expectedRole?: string) => Promise<{ error?: string; role?: string }>;
  register: (username: string, password: string, fullName: string, role?: 'teacher' | 'principal' | 'admin', schoolCode?: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  setActiveClass: (cls: Classroom | null) => void;
  refreshClasses: () => Promise<void>;
  setRole: (role: 'teacher' | 'principal' | 'admin') => void;
}

const DEFAULT_PROFILE: Profile = {
  id: 'demo-teacher-id',
  username: 'kruadmin041030',
  full_name: 'លោកគ្រូ/អ្នកគ្រូ សុខា',
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
          const savedDemoProfile = localStorage.getItem('demo_profile');
          if (savedDemoProfile) {
            try {
              const parsedProfile = JSON.parse(savedDemoProfile);
              setProfile(parsedProfile);
              setUser({ id: parsedProfile.id, email: `${parsedProfile.username}@kruai.app` });
              setIsDemoMode(false);
              await refreshClassesForUser(parsedProfile.id);
            } catch (e) {}
          }
        }
      } catch (err) {
        const savedDemoProfile = localStorage.getItem('demo_profile');
        if (savedDemoProfile) {
          try {
            const parsedProfile = JSON.parse(savedDemoProfile);
            setProfile(parsedProfile);
            setUser({ id: parsedProfile.id, email: `${parsedProfile.username}@kruai.app` });
            setIsDemoMode(false);
            await refreshClassesForUser(parsedProfile.id);
          } catch (e) {}
        }
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
        const savedDemoProfile = localStorage.getItem('demo_profile');
        if (savedDemoProfile) {
          try {
            const parsedProfile = JSON.parse(savedDemoProfile);
            setProfile(parsedProfile);
            setUser({ id: parsedProfile.id, email: `${parsedProfile.username}@kruai.app` });
            setIsDemoMode(false);
            await refreshClassesForUser(parsedProfile.id);
          } catch (e) {}
        } else {
          setUser(null);
          setProfile(DEFAULT_PROFILE);
          setClasses(DEMO_CLASSES);
          setActiveClass(DEMO_CLASSES[0]);
          setIsDemoMode(true);
        }
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
      setClasses([...DEMO_CLASSES]);
    }
  }

  async function login(username: string, password: string, expectedRole?: string): Promise<{ error?: string; role?: string }> {
    const cleanUsername = username.trim().toLowerCase();
    const email = `${cleanUsername}@kruai.app`;

    const isValidPassword = password === 'password123' || password === '123456';

    // 1. Check local/sample accounts or query profile directly from PostgreSQL
    try {
      // Try to find profile in database by username
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', cleanUsername)
        .single();

      if (dbProfile && isValidPassword) {
        if (expectedRole && dbProfile.role !== expectedRole) {
          return { error: `គណនីនេះមិនមានសិទ្ធិជា ${expectedRole} ទេ។ សូមជ្រើសរើសតួនាទីឲ្យបានត្រឹមត្រូវ។` };
        }

        setIsDemoMode(false);
        setUser({ id: dbProfile.id, email });
        setProfile(dbProfile as Profile);
        localStorage.setItem('demo_profile', JSON.stringify(dbProfile));
        document.cookie = `kruai_user_id=${dbProfile.id}; path=/; max-age=2592000; SameSite=Lax`;
        document.cookie = `kruai_role=${dbProfile.role}; path=/; max-age=2592000; SameSite=Lax`;
        document.cookie = `kruai_username=${cleanUsername}; path=/; max-age=2592000; SameSite=Lax`;

        // Fetch real classes assigned to this teacher
        const { data: teacherClasses } = await supabase
          .from('classes')
          .select('*')
          .eq('teacher_id', dbProfile.id);

        if (teacherClasses && teacherClasses.length > 0) {
          setClasses(teacherClasses as Classroom[]);
          setActiveClass(teacherClasses[0] as Classroom);
        } else {
          // If principal/admin or teacher with no assigned class, fetch all classes
          const { data: allClasses } = await supabase.from('classes').select('*').order('name');
          if (allClasses && allClasses.length > 0) {
            setClasses(allClasses as Classroom[]);
            setActiveClass(allClasses[0] as Classroom);
          }
        }

        return { role: dbProfile.role };
      }
    } catch (err) {
      console.warn('Direct profile lookup error:', err);
    }

    // 2. Predefined fallback mapping for quick convenience
    const isAdmin = cleanUsername === 'admin' || cleanUsername === 'admin_porieng' || cleanUsername === 'sysadmin';
    const isPrincipal = cleanUsername === 'principal' || cleanUsername === 'principal_porieng' || cleanUsername === 'kruadmin041030';
    const isMonitor = cleanUsername === 'monitor';
    const isTeacher12 = cleanUsername === 'teacher' || cleanUsername === 'teacher_12a' || cleanUsername === 'teacher1';
    const isTeacher11 = cleanUsername === 'teacher_11a';
    const isTeacher10 = cleanUsername === 'teacher_10a';
    const isTeacher9 = cleanUsername === 'teacher_9a';
    const isTeacher8 = cleanUsername === 'teacher_8a';
    const isTeacher7 = cleanUsername === 'teacher_7a';

    const isKnownAccount = isAdmin || isPrincipal || isMonitor || isTeacher12 || isTeacher11 || isTeacher10 || isTeacher9 || isTeacher8 || isTeacher7;

    if (isKnownAccount && isValidPassword) {
      const assignedRole = isAdmin ? 'admin' : isPrincipal ? 'principal' : isMonitor ? 'monitor' : 'teacher';

      const assignedId = isAdmin 
        ? '00000000-0000-0000-0000-000000000001'
        : isPrincipal
        ? '00000000-0000-0000-0000-000000000002'
        : isTeacher11
        ? '00000000-0000-0000-0000-000000000011'
        : isTeacher10
        ? '00000000-0000-0000-0000-000000000010'
        : isTeacher9
        ? '00000000-0000-0000-0000-000000000009'
        : isTeacher8
        ? '00000000-0000-0000-0000-000000000008'
        : isTeacher7
        ? '00000000-0000-0000-0000-000000000007'
        : isMonitor
        ? '00000000-0000-0000-0000-000000000099'
        : '00000000-0000-0000-0000-000000000012';

      const assignedName = isAdmin 
        ? 'សាន សុវិជ្ជា (Admin ICT)' 
        : isPrincipal 
        ? 'ហេង ឈាងលី (នាយកសាលា)' 
        : isMonitor
        ? 'សិស្ស ខៀវ សុវណ្ណារាជ (ប្រធានថ្នាក់)'
        : isTeacher11
        ? 'លោកគ្រូ សម្បត្តិ (ថ្នាក់ ១១A)'
        : isTeacher10
        ? 'អ្នកគ្រូ ច័ន្ទរស្មី (ថ្នាក់ ១០A)'
        : isTeacher9
        ? 'លោកគ្រូ ប៊ុនធឿន (ថ្នាក់ ៩A)'
        : isTeacher8
        ? 'លោកគ្រូ វិសាល (ថ្នាក់ ៨A)'
        : isTeacher7
        ? 'អ្នកគ្រូ នារី (ថ្នាក់ ៧A)'
        : 'លោកគ្រូ សុខា (ថ្នាក់ ១២A)';

      const fallbackProfile: Profile = {
        id: assignedId,
        username: cleanUsername,
        full_name: assignedName,
        role: assignedRole as any,
        school_id: 'main-school',
        school_code: 'Porieng-2026',
        created_at: new Date().toISOString(),
      };

      setIsDemoMode(false);
      setUser({ id: assignedId, email });
      setProfile(fallbackProfile);
      localStorage.setItem('demo_profile', JSON.stringify(fallbackProfile));
      document.cookie = `kruai_user_id=${assignedId}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `kruai_role=${assignedRole}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `kruai_username=${cleanUsername}; path=/; max-age=2592000; SameSite=Lax`;

      // Fetch real class for this teacher
      try {
        const { data: teacherClasses } = await supabase.from('classes').select('*').eq('teacher_id', assignedId);
        if (teacherClasses && teacherClasses.length > 0) {
          setClasses(teacherClasses as Classroom[]);
          setActiveClass(teacherClasses[0] as Classroom);
        } else {
          const { data: allClasses } = await supabase.from('classes').select('*').order('name');
          if (allClasses && allClasses.length > 0) {
            setClasses(allClasses as Classroom[]);
            setActiveClass(allClasses[0] as Classroom);
          }
        }
      } catch (e) {
        console.error(e);
      }

      return { role: assignedRole };
    }

    if (isKnownAccount && !isValidPassword) {
      return { error: 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ។ (ពាក្យសម្ងាត់គំរូគឺ: 123456 ឬ password123)' };
    }

    // 3. Try Supabase Auth
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: 'គណនី ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ។' };
      }

      const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      const userRole = userProfile?.role || 'teacher';

      document.cookie = `kruai_user_id=${data.user.id}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `kruai_role=${userRole}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `kruai_username=${cleanUsername}; path=/; max-age=2592000; SameSite=Lax`;

      setIsDemoMode(false);
      return { role: userRole };
    } catch (e: any) {
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
    document.cookie = 'kruai_user_id=; path=/; max-age=0';
    document.cookie = 'kruai_role=; path=/; max-age=0';
    document.cookie = 'kruai_username=; path=/; max-age=0';
    localStorage.removeItem('demo_profile');
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
      if (newRole === 'principal') name = 'នាយកសាលា សុខា';
      else if (newRole === 'admin') name = 'អ្នកគ្រប់គ្រង សុខា';
      else if (newRole === 'monitor') name = 'សិស្ស ខៀវ សុវណ្ណារាជ (ប្រធានថ្នាក់)';
      else if (newRole === 'teacher') name = 'លោកគ្រូ/អ្នកគ្រូ សុខា';
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
