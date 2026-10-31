'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/lib/auth-context';
import { AlertCircle, RefreshCw, LogOut, Menu } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { authStatus, authError, retryAuth, logout, profile } = useAuth();
  const [leftMenuOpen, setLeftMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/login');
    } else if (authStatus === 'authenticated' && profile?.role === 'monitor' && pathname && !pathname.startsWith('/monitor/')) {
      router.replace('/monitor/attendance');
    }
  }, [authStatus, router, profile?.role, pathname]);

  // 1. Initial Loading Splash Screen
  if (authStatus === 'loading') {
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
          <p className="text-sm font-medium tracking-wide text-[#475467] mb-8 text-center px-4">កំពុងរៀបចំប្រព័ន្ធគ្រប់គ្រងសាលា...</p>
          
          {/* Sleek indeterminate progress bar */}
          <div className="w-56 h-1.5 bg-[#dbe6ff] rounded-full overflow-hidden relative shadow-inner">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#155EEF] to-transparent w-[50%] animate-shimmer"></div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Fail-Closed Authentication Error Screen
  if (authStatus === 'error') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
        <div className="bg-white p-8 sm:p-10 rounded-[28px] shadow-xl max-w-md w-full border border-rose-100 flex flex-col items-center text-center relative z-10">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-5">
            <AlertCircle className="w-8 h-8" />
          </div>
          
          <h2 className="text-lg font-bold text-slate-900 mb-2 font-moul">បរាជ័យក្នុងការផ្ទៀងផ្ទាត់គណនី</h2>
          <p className="text-sm text-slate-600 mb-8 leading-relaxed">
            {authError || 'មិនអាចទាញយកព័ត៌មានគណនីរបស់អ្នកពីប្រព័ន្ធបានទេ។ សូមព្យាយាមម្តងទៀត ឬចាកចេញពីគណនី។'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => retryAuth()}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#155EEF] hover:bg-[#124bbf] text-white font-medium rounded-xl text-sm transition-all shadow-sm active:scale-98 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>ព្យាយាមម្តងទៀត</span>
            </button>
            <button
              onClick={() => logout()}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition-all active:scale-98 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>ចាកចេញ</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Unauthenticated State: Handled by redirection, prevent flashing protected UI
  if (authStatus === 'unauthenticated') {
    return null;
  }

  // 4. Authenticated Shell
  return (
    <div className="bg-white h-screen w-full flex flex-col lg:flex-row overflow-hidden font-sans text-slate-800 select-none relative print:h-auto print:overflow-visible print:block">
      {/* ================= MOBILE & TABLET TOP HEADER ================= */}
      <header className="lg:hidden flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-100 z-30 shrink-0 relative shadow-2xs print:hidden">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => { setLeftMenuOpen(true); }}
            className="p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Open Navigation"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Image src="/school_logo.png" alt="School Logo" width={32} height={32} className="w-8 h-8 object-contain shrink-0" priority />
          <div className="flex flex-col min-w-0 py-0.5">
            <span className="text-sm font-extrabold text-slate-900 tracking-tight whitespace-nowrap truncate">វិ. ហ៊ុន សែន ពោធិ៍រៀង</span>
            <span className="text-[10px] font-bold text-[#155EEF] tracking-wide whitespace-nowrap truncate">វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</span>
          </div>
        </div>
      </header>

      {/* ================= MOBILE SLIDE-OUT LEFT DRAWER ================= */}
      {leftMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-fadeIn">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-2xs" onClick={() => setLeftMenuOpen(false)} />
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-250">
            <Sidebar onClose={() => setLeftMenuOpen(false)} className="w-full h-full bg-white flex flex-col justify-between py-6 px-6 overflow-y-auto select-none" />
          </div>
        </div>
      )}

      {/* ================= LEFT SIDEBAR (Desktop) ================= */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      {/* ================= CENTER MAIN CONTENT ================= */}
      <div className="flex-1 flex flex-col py-3 px-2 md:py-4 md:px-3 overflow-hidden min-w-0 print:h-auto print:overflow-visible print:p-0 print:block">
        <main className="flex-1 bg-[#F4F7FE] rounded-2xl md:rounded-[32px] lg:rounded-[36px] flex flex-col overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10 shadow-xs border border-slate-100/80 relative print:h-auto print:overflow-visible print:bg-white print:p-0 print:shadow-none print:border-none print:rounded-none print:block">
          <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
