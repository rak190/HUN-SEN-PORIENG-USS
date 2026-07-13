'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Users, Search, Plus, CheckCircle2, Phone, Mail, Award, BookOpen } from 'lucide-react';

export default function PrincipalStaffPage() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const teachersList = [
    { id: 1, name: 'លោកគ្រូ/អ្នកគ្រូ សុខា', class: '12 ក', subject: 'គណិតវិទ្យា', students: 42, att: '98.5%', status: 'សកម្ម', phone: '012 345 678', email: 'sokha@school.edu.kh' },
    { id: 2, name: 'លោកគ្រូ សម្បត្តិ', class: '11 ខ', subject: 'រូបវិទ្យា', students: 38, att: '95.0%', status: 'សកម្ម', phone: '093 456 789', email: 'sambath@school.edu.kh' },
    { id: 3, name: 'អ្នកគ្រូ ច័ន្ទរស្មី', class: '10 គ', subject: 'ភាសាខ្មែរ', students: 45, att: '97.2%', status: 'សកម្ម', phone: '010 889 900', email: 'chanreasmey@school.edu.kh' },
    { id: 4, name: 'លោកគ្រូ ប៊ុនធឿន', class: '9 ក', subject: 'ប្រវត្តិវិទ្យា', students: 40, att: '94.8%', status: 'សកម្ម', phone: '088 123 4567', email: 'bunthoeun@school.edu.kh' },
    { id: 5, name: 'អ្នកគ្រូ សុវណ្ណារី', class: '12 ខ', subject: 'គីមីវិទ្យា', students: 41, att: '99.1%', status: 'សកម្ម', phone: '011 223 344', email: 'sovannary@school.edu.kh' },
    { id: 6, name: 'លោកគ្រូ វិសាល', class: '8 ក', subject: 'អង់គ្លេស', students: 44, att: '96.3%', status: 'សកម្ម', phone: '085 998 877', email: 'visal@school.edu.kh' },
  ];

  const filteredTeachers = teachersList.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.class.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Reference UI Standard Two-Column Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            គ្រូបង្រៀន & បុគ្គលិកសាលា
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5 flex items-center gap-1.5">
            <span>សាលារៀន៖</span>
            <span className="font-bold text-[#155EEF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {profile?.school_code || 'Porieng-2026'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Real-time Search Pill */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ស្វែងរកគ្រូ ឬមុខវិជ្ជា..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200/80 rounded-full text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#155EEF] shadow-xs transition-all"
            />
          </div>

          {/* Primary Action Button */}
          <button
            onClick={() => alert('មុខងារបន្ថែមគ្រូបង្រៀនថ្មីកំពុងរៀបចំ!')}
            className="px-5 py-3 rounded-full bg-[#155EEF] hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer shrink-0 hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>បន្ថែមគ្រូថ្មី</span>
          </button>
        </div>
      </header>

      {/* Overview Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{teachersList.length}</h2>
            <div className="w-10 h-10 rounded-full bg-yellow-900/10 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all">
              <Users className="w-5 h-5 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">គ្រូបង្រៀនសរុប</p>
        </div>

        <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{teachersList.length}</h2>
            <div className="w-10 h-10 rounded-full bg-yellow-900/10 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all">
              <Award className="w-5 h-5 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">ថ្នាក់រៀនបន្ទុក</p>
        </div>

        <div className="bg-[#155EEF] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-blue-500/20 flex flex-col justify-between min-h-[130px] border border-blue-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">99.2%</h2>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all">
              <CheckCircle2 className="w-5 h-5 text-white group-hover:text-[#155EEF] transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-blue-100 mt-4">អត្រាវត្តមានគ្រូប្រចាំខែ</p>
        </div>
      </div>

      {/* Teachers Directory Table — Clean White Card */}
      <div className="bg-white rounded-[24px] border border-slate-100/80 shadow-xs overflow-hidden">
        <div className="p-5 bg-white border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#155EEF]" />
            <span>បញ្ជីឈ្មោះគ្រូបង្រៀន និងថ្នាក់ទទួលបន្ទុក ({filteredTeachers.length} នាក់)</span>
          </h3>
          <span className="text-xs font-extrabold text-[#155EEF] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            អាប់ដេតតាម Realtime
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
                <th className="py-4 px-6">ល.រ</th>
                <th className="py-4 px-6 min-w-[200px]">ឈ្មោះគ្រូបង្រៀន</th>
                <th className="py-4 px-6 text-center">ថ្នាក់បន្ទុក</th>
                <th className="py-4 px-6">មុខវិជ្ជាឯកទេស</th>
                <th className="py-4 px-6 text-center">សិស្សសរុប</th>
                <th className="py-4 px-6 text-center">អត្រាវត្តមានសិស្ស</th>
                <th className="py-4 px-6">ទំនាក់ទំនង</th>
                <th className="py-4 px-6 text-right">ស្ថានភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold">
              {filteredTeachers.map((t, idx) => {
                const getInitial = (name: string) => name.replace('លោកគ្រូ/អ្នកគ្រូ ', '').replace('លោកគ្រូ ', '').replace('អ្នកគ្រូ ', '').charAt(0);
                const colors = ['bg-rose-100 text-rose-600', 'bg-blue-100 text-blue-600', 'bg-emerald-100 text-emerald-600', 'bg-purple-100 text-purple-600', 'bg-amber-100 text-amber-600'];
                const avatarColor = colors[idx % colors.length];

                return (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                    <td className="py-4 px-6 font-bold text-slate-400">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${avatarColor} group-hover:scale-105 transition-transform`}>
                          {getInitial(t.name)}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-800 group-hover:text-[#155EEF] transition-colors">{t.name}</div>
                          <div className="text-[11px] font-bold text-slate-500 mt-0.5">{t.subject} • ID: T-{String(t.id).padStart(4, '0')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="px-3 py-1 rounded-full bg-blue-50 text-[#155EEF] font-black text-xs border border-blue-200/80 inline-block">
                        {t.class}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-700">{t.subject}</td>
                    <td className="py-4 px-6 text-center text-slate-600">{t.students} នាក់</td>
                    <td className="py-4 px-6 text-center font-extrabold text-emerald-600">{t.att}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col text-[11px] font-bold text-slate-500 gap-1">
                        <span className="flex items-center gap-1.5 text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-fit"><Phone className="w-3 h-3 text-slate-400" /> {t.phone}</span>
                        <span className="flex items-center gap-1.5 text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-fit"><Mail className="w-3 h-3" /> {t.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase border border-emerald-200/50">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{t.status}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
