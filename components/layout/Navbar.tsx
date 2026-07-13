'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { ShieldAlert, LogOut, User, BookOpen, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { profile, activeClass, classes, setActiveClass, logout, isDemoMode, setRole } = useAuth();
  const router = useRouter();

  const handleRoleChange = (newRole: 'teacher' | 'principal' | 'admin') => {
    setRole(newRole);
    if (newRole === 'teacher') router.push('/homeroom');
    else if (newRole === 'principal') router.push('/principal');
    else if (newRole === 'admin') router.push('/admin');
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 transition-all duration-300">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left Section: School & Active Class Selector */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3.5 py-1.5 rounded-xl shadow-md shadow-blue-500/20">
            <img src="/school_logo.png" alt="School Logo" className="w-7 h-7 object-contain shrink-0" />
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-wide leading-none">
                វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង
              </span>
              <span className="text-[10px] font-bold text-[#FFCF59] tracking-wide mt-0.5">
                គុណធម៌ ចំណេះដឹង បំណិនវិជ្ជាជីវៈ
              </span>
            </div>
          </div>

          {profile?.role === 'teacher' && classes.length > 0 && (
            <div className="relative group">
              <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl cursor-pointer border border-slate-200/60 dark:border-slate-700 transition-all duration-200">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm font-semibold">
                  ថ្នាក់៖ {activeClass?.name || 'ជ្រើសរើសថ្នាក់'}
                </span>
                <ChevronDown className="w-4 h-4 opacity-60" />
              </div>

              {/* Class Dropdown */}
              <div className="absolute left-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 z-50">
                <div className="text-xs font-semibold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                  ថ្នាក់រៀនរបស់អ្នក
                </div>
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => setActiveClass(cls)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeClass?.id === cls.id
                        ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <span>{cls.name} (ថ្នាក់ទី {cls.grade})</span>
                    {activeClass?.id === cls.id && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Section: User Profile & Role Switcher */}
        <div className="flex items-center space-x-3">
          {/* Interactive Role Switcher Pill for Testing */}
          <div className="flex items-center space-x-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 px-3 py-1.5 rounded-full shadow-xs">
            <span className="text-[11px] font-extrabold text-[#155EEF] hidden sm:inline">តួនាទី៖</span>
            <select
              value={profile?.role || 'teacher'}
              onChange={(e) => handleRoleChange(e.target.value as any)}
              className="bg-transparent text-xs font-extrabold text-[#155EEF] focus:outline-none cursor-pointer"
            >
              <option value="teacher">គ្រូបន្ទុកថ្នាក់ (Teacher)</option>
              <option value="principal">នាយកសាលា (Principal)</option>
              <option value="admin">អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)</option>
            </select>
          </div>

          {isDemoMode && (
            <div className="flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-full text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Demo Mode</span>
            </div>
          )}

          <div className="flex items-center space-x-3 pl-3 border-l border-slate-200 dark:border-slate-800">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#155EEF] to-indigo-600 flex items-center justify-center text-white shadow-sm font-bold text-sm">
              {profile?.full_name?.slice(0, 1) || 'K'}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
                {profile?.full_name || 'អ្នកប្រើប្រាស់'}
              </span>
              <span className="text-[10px] font-bold text-[#155EEF]">
                {profile?.role === 'principal' ? 'នាយកសាលា' : profile?.role === 'admin' ? 'អ្នកគ្រប់គ្រងប្រព័ន្ធ' : 'គ្រូបន្ទុកថ្នាក់'}
              </span>
            </div>
          </div>

          <button
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
            title="ចាកចេញ (Logout)"
            className="p-2.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
