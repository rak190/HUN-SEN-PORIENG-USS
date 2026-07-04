'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  GraduationCap,
  Users,
  CalendarCheck,
  Award,
  CheckCircle2,
  School,
  BarChart3,
  Megaphone,
  Building2,
  ArrowRight,
  TrendingUp,
  Clock
} from 'lucide-react';

export default function PrincipalDashboardPage() {
  const { profile } = useAuth();

  const quickLinks = [
    { title: 'គ្រូ & បុគ្គលិក', desc: 'គ្រប់គ្រងបញ្ជីគ្រូ និងថ្នាក់បន្ទុក', href: '/principal/staff', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'សិស្សទូទាំងសាលា', desc: 'ពិនិត្យទិន្នន័យ និងស្ថិតិសិស្សានុសិស្ស', href: '/principal/students', icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'របាយការណ៍សាលា', desc: 'វិភាគអត្រាវត្តមាន និងលទ្ធផលសិក្សា', href: '/principal/reports', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'សេចក្តីជូនដំណឹង', desc: 'ផ្សព្វផ្សាយព័ត៌មាន និងសេចក្តីប្រកាស', href: '/principal/announcements', icon: Megaphone, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'ការកំណត់សាលា', desc: 'កែប្រែព័ត៌មាន និងឆ្នាំសិក្សា', href: '/principal/settings', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-8 rounded-[28px] text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-purple-200 border border-white/20">
            <GraduationCap className="w-4 h-4 text-[#FFCF59]" />
            <span>ផ្ទាំងគ្រប់គ្រងសម្រាប់នាយកសាលា</span>
          </div>
          <h1 className="text-3xl font-extrabold">
            {profile?.school_code === 'Porieng-2026' ? 'វិទ្យាល័យហ៊ុនសែនពោធិ៍រៀង' : profile?.school_code || 'សាលារៀនកម្ពុជា'}
          </h1>
          <p className="text-purple-200 text-sm">
            តាមដានសកម្មភាពបង្រៀន វត្តមានសិស្ស និងស្ថិតិទូទាំងសាលារៀនក្នុងពេលតែមួយ។
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shrink-0 text-center">
          <span className="text-xs font-bold text-purple-200 uppercase block">កូដចូលរួមសាលា</span>
          <div className="text-2xl font-black text-[#FFCF59] font-mono tracking-wider mt-1">Porieng-2026</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#64748B] uppercase">គ្រូបង្រៀនសរុប</span>
            <div className="text-3xl font-black text-slate-900 mt-1">14 នាក់</div>
            <div className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> ភ្ជាប់គណនី 100%
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#155EEF]">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#64748B] uppercase">ថ្នាក់រៀនសរុប</span>
            <div className="text-3xl font-black text-slate-900 mt-1">18 ថ្នាក់</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">ថ្នាក់ទី 7 ដល់ 12</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <School className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#64748B] uppercase">វត្តមានសាលាប្រចាំខែ</span>
            <div className="text-3xl font-black text-emerald-600 mt-1">96.4 %</div>
            <div className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +1.2% ធៀបនឹងខែមុន
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CalendarCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#64748B] uppercase">សិស្សានុសិស្សសរុប</span>
            <div className="text-3xl font-black text-slate-900 mt-1">680 នាក់</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">ស្រី 352 នាក់</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards Grid — Adopting Reference Project Concept */}
      <div className="space-y-3">
        <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
          <span>មុខងារគ្រប់គ្រងសម្រាប់នាយកសាលា (Standalone Navigation)</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickLinks.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={idx}
                href={item.href}
                className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs hover:shadow-md hover:border-[#155EEF]/50 transition-all group flex items-start justify-between"
              >
                <div className="space-y-2">
                  <div className={`w-12 h-12 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center font-bold`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-800 group-hover:text-[#155EEF] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs font-semibold text-[#64748B]">
                    {item.desc}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-[#155EEF] group-hover:text-white text-slate-400 flex items-center justify-center transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Strip */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#155EEF]" />
            <span>សកម្មភាពថ្មីៗក្នុងសាលារៀន</span>
          </h3>
          <Link href="/principal/announcements" className="text-xs font-extrabold text-[#155EEF] hover:underline">
            មើលទាំងអស់ &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-[18px] bg-slate-50/80 border border-slate-100 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-xs">
              98%
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-800">អត្រាវត្តមានថ្នាក់ 12 ក បានកើនឡើង</div>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">គ្រូបន្ទុកថ្នាក់៖ លោកគ្រូ សុខា បានបញ្ជូនរបាយការណ៍ថ្ងៃនេះ</p>
            </div>
          </div>

          <div className="p-4 rounded-[18px] bg-slate-50/80 border border-slate-100 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#155EEF] flex items-center justify-center shrink-0 font-bold text-xs">
              ថ្មី
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-800">សេចក្តីប្រកាស៖ កិច្ចប្រជុំគរុកោសល្យខែសីហា</div>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">បានផ្សព្វផ្សាយទៅកាន់គ្រូបង្រៀនទាំងអស់ដោយជោគជ័យ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
