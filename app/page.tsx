'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

import Image from 'next/image';

export default function RootPage() {
  const { user, profile, loading, isDemoMode } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user || isDemoMode) {
        if (profile?.role === 'admin') router.replace('/admin');
        else if (profile?.role === 'principal') router.replace('/principal');
        else if (profile?.role === 'monitor') router.replace('/monitor/attendance');
        else router.replace('/homeroom');
      } else {
        router.replace('/login');
      }
    }
  }, [user, profile, loading, isDemoMode, router]);

  // Use the exact same premium loading animation as the dashboard layout
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#f0f5ff] to-[#e1ebff] text-slate-700 relative overflow-hidden">
      {/* Subtle background decorative shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
         <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-[#c2d6ff] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
         <div className="absolute top-[20%] right-[-10%] w-80 h-80 bg-[#dbe6ff] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
         <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-[#e1ebff] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center backdrop-blur-md bg-white/50 p-10 rounded-[32px] shadow-xl border border-white/60">
        <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
           {/* Pulsing ring */}
           <div className="absolute inset-0 bg-[#155EEF] rounded-full animate-ping opacity-25"></div>
           {/* School Logo */}
           <div className="w-20 h-20 rounded-full bg-white shadow-md flex items-center justify-center p-3 relative z-10 animate-pulse">
              <Image src="/school_logo.png" alt="School Logo" width={80} height={80} className="w-full h-full object-contain" priority />
           </div>
        </div>
        
        <h2 className="text-xl font-extrabold tracking-tight text-[#155EEF] mb-3 font-moul text-center px-4">វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</h2>
        <p className="text-sm font-medium tracking-wide text-[#475467] mb-8 text-center px-4">កំពុងភ្ជាប់ទៅប្រព័ន្ធគ្រប់គ្រងសាលា...</p>
        
        {/* Sleek indeterminate progress bar */}
        <div className="w-56 h-1.5 bg-[#dbe6ff] rounded-full overflow-hidden relative shadow-inner">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#155EEF] to-transparent w-[50%] animate-shimmer"></div>
        </div>
      </div>
    </div>
  );
}
