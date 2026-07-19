'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  FolderCog,
  ShieldCheck,
  Database,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Server,
  RefreshCw,
  ArrowRight,
  UserCog,
  History,
  Settings
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { profile } = useAuth();

  const quickLinks = [
    { title: 'គ្រប់គ្រងអ្នកប្រើប្រាស់', desc: 'បង្កើតគណនី និងកំណត់សិទ្ធិ RBAC', href: '/admin/users', icon: UserCog, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'កំណត់ហេតុប្រព័ន្ធ', desc: 'ត្រួតពិនិត្យសកម្មភាព និង Audit Trail', href: '/admin/logs', icon: History, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'បម្រុងទុកទិន្នន័យ', desc: 'បង្កើត Database Backup & Restore', href: '/admin/backup', icon: Database, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'ការកំណត់ប្រព័ន្ធ', desc: 'កែប្រែ API Key និងប៉ារ៉ាម៉ែត្រ', href: '/admin/settings', icon: Settings, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Header Bar */}
      <div className="bg-white p-6 md:p-8 rounded-[28px] shadow-xs border border-slate-100/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 bg-[#FFCF59] text-yellow-950 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider shadow-2xs">
            <FolderCog className="w-4 h-4" />
            <span>ផ្ទាំងគ្រប់គ្រងប្រព័ន្ធ</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
            ផ្ទាំងគ្រប់គ្រងប្រព័ន្ធទូទៅ
          </h1>
          <p className="text-[#64748B] text-sm font-medium">
            ត្រួតពិនិត្យការតភ្ជាប់ Supabase Database, Realtime WebSockets, និង RLS Security Policies។
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-blue-50/80 px-4 py-2.5 rounded-2xl border border-blue-100/60 shrink-0 text-xs font-extrabold text-[#155EEF]">
          <Server className="w-4 h-4 text-[#155EEF] animate-pulse" />
          <span>ដំណើរការល្អ v2.0 (Next.js)</span>
        </div>
      </div>

      {/* System Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs hover:shadow-md transition-all space-y-4 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">មូលដ្ឋានទិន្នន័យ Supabase</span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-extrabold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>បានភ្ជាប់</span>
            </span>
          </div>
          <div className="flex items-center space-x-3.5 pt-1">
            <div className="w-12 h-12 rounded-2xl bg-[#155EEF]/10 flex items-center justify-center text-[#155EEF] shrink-0 group-hover:bg-[#155EEF] group-hover:text-white transition-colors">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-black text-slate-800">PostgreSQL + RLS</div>
              <div className="text-xs font-semibold text-[#64748B]">តារាងទិន្នន័យចំនួន 7</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs hover:shadow-md transition-all space-y-4 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">បណ្តាញ Realtime WebSockets</span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-extrabold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>សកម្ម</span>
            </span>
          </div>
          <div className="flex items-center space-x-3.5 pt-1">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-black text-slate-800">Supabase Realtime</div>
              <div className="text-xs font-semibold text-[#64748B]">បណ្តាញសមកាលកម្មវត្តមាន</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs hover:shadow-md transition-all space-y-4 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">ប្រព័ន្ធសុវត្ថិភាព RLS</span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#155EEF] border border-blue-200 text-xs font-extrabold shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ការពារសកម្ម</span>
            </span>
          </div>
          <div className="flex items-center space-x-3.5 pt-1">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-[#155EEF] shrink-0 group-hover:bg-[#155EEF] group-hover:text-white transition-colors">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-black text-slate-800">Role-Based RBAC</div>
              <div className="text-xs font-semibold text-[#64748B]">កំណត់សិទ្ធិតាមតួនាទី</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards Grid — Adopting Reference Project Concept */}
      <div className="space-y-3">
        <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
          <span>មុខងារគ្រប់គ្រងសម្រាប់អ្នកគ្រប់គ្រងប្រព័ន្ធ</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={idx}
                href={item.href}
                className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs hover:shadow-md hover:border-[#155EEF]/50 transition-all group flex flex-col justify-between h-full space-y-4"
              >
                <div className="space-y-3">
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
                <div className="flex items-center text-xs font-extrabold text-[#155EEF] pt-2 border-t border-slate-50 group-hover:translate-x-1 transition-transform">
                  <span>ចូលគ្រប់គ្រង</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Security Alerts Preview */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#155EEF]" />
            <span>ស្ថានភាពសុវត្ថិភាព និងការព្រមានចុងក្រោយ</span>
          </h3>
          <Link href="/admin/logs" className="text-xs font-extrabold text-[#155EEF] hover:underline">
            មើលកំណត់ហេតុទាំងអស់ &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-[18px] bg-emerald-50/60 border border-emerald-100 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <div className="text-xs font-extrabold text-slate-800">ប្រព័ន្ធការពារ RLS ដំណើរការ 100%</div>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">គ្មានការប៉ុនប៉ងចូលប្រើខុសប្រក្រតីត្រូវបានរកឃើញទេ</p>
            </div>
          </div>

          <div className="p-4 rounded-[18px] bg-blue-50/60 border border-blue-100 flex items-center gap-3">
            <Database className="w-6 h-6 text-[#155EEF] shrink-0" />
            <div>
              <div className="text-xs font-extrabold text-slate-800">ការបម្រុងទុកទិន្នន័យស្វ័យប្រវត្តិជោគជ័យ</div>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Snapshot ថ្ងៃនេះនៅម៉ោង 06:00 ព្រឹកត្រូវបានរក្សាទុក</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
