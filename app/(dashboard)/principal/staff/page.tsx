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
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200/80 rounded-full text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#155EEF] shadow-xs"
            />
          </div>

          {/* Primary Action Button */}
          <button
            onClick={() => alert('មុខងារបន្ថែមគ្រូបង្រៀនថ្មីកំពុងរៀបចំ!')}
            className="px-5 py-2.5 rounded-full bg-[#155EEF] hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>បន្ថែមគ្រូថ្មី</span>
          </button>
        </div>
      </header>

      {/* Overview Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-[20px] border border-slate-100/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#64748B]">គ្រូបង្រៀនសរុប</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{teachersList.length} នាក់</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#155EEF] flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-[20px] border border-slate-100/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#64748B]">គ្រូបន្ទុកថ្នាក់</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{teachersList.length} ថ្នាក់</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-[20px] border border-slate-100/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#64748B]">អត្រាវត្តមានគ្រូប្រចាំខែ</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">99.2 %</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
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
              {filteredTeachers.map((t, idx) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-400">{idx + 1}</td>
                  <td className="py-4 px-6 font-extrabold text-slate-800">{t.name}</td>
                  <td className="py-4 px-6 text-center">
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-[#155EEF] font-black text-xs border border-blue-200/80">
                      {t.class}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-700">{t.subject}</td>
                  <td className="py-4 px-6 text-center text-slate-600">{t.students} នាក់</td>
                  <td className="py-4 px-6 text-center font-extrabold text-emerald-600">{t.att}</td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1 text-slate-700"><Phone className="w-3 h-3 text-slate-400" /> {t.phone}</span>
                      <span className="flex items-center gap-1 text-slate-400"><Mail className="w-3 h-3" /> {t.email}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
