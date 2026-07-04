'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { user, loading, isDemoMode } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user || isDemoMode) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, isDemoMode, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
      <p className="text-sm font-semibold animate-pulse">កំពុងភ្ជាប់ទៅប្រព័ន្ធគ្រប់គ្រងសាលា វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង...</p>
    </div>
  );
}
