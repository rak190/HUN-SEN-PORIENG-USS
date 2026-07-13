'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/lib/auth-context';
import { Loader2, Menu } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, profile } = useAuth();
  const [leftMenuOpen, setLeftMenuOpen] = useState(false);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'NR';

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white text-slate-700">
        <div className="w-12 h-12 rounded-2xl bg-[#155EEF] flex items-center justify-center text-white mb-4 shadow-lg animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-sm font-bold tracking-tight text-[#155EEF]">កំពុងរៀបចំប្រព័ន្ធគ្រប់គ្រងសាលា វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង...</p>
      </div>
    );
  }

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
          <img src="/school_logo.png" alt="School Logo" className="w-8 h-8 object-contain shrink-0" />
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

      {/* ================= CENTER MAIN CONTENT (Rounded Gray Frame) ================= */}
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
