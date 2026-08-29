'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Users, Search, Download, CheckCircle2, Phone, Award, BookOpen, GraduationCap } from 'lucide-react';

export interface TeacherRecord {
  id: string | number;
  name: string;
  class: string;
  subject: string;
  students: number;
  att: string;
  status: string;
  phone: string;
  email: string;
  username: string;
}

export interface StaffClientProps {
  teachersList: TeacherRecord[];
  stats: {
    totalTeachers: number;
    classesHandled: number;
    totalStudents: number;
  };
}

export default function PrincipalStaffClient({ teachersList, stats }: StaffClientProps) {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTeachers = teachersList.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.class.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = () => {
    const headers = ['ល.រ', 'ឈ្មោះបុគ្គលិក/គ្រូ', 'ថ្នាក់បន្ទុក', 'មុខវិជ្ជាឯកទេស', 'សិស្សសរុប', 'អត្រាវត្តមានសិស្ស', 'ទំនាក់ទំនង (លេខទូរស័ព្ទ)', 'ស្ថានភាព'];
    const rows = filteredTeachers.map((t, idx) => [
      String(idx + 1).padStart(2, '0'),
      t.name,
      t.class,
      t.subject,
      t.students,
      t.att,
      t.phone,
      t.status
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `staff_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            onClick={handleExport}
            className="px-5 py-3 rounded-full bg-[#155EEF] hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer shrink-0 hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            <span>ទាញទិន្នន័យចេញ</span>
          </button>
        </div>
      </header>

      {/* Overview Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] border border-slate-200">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none">{stats.totalTeachers}</h2>
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-all shadow-2xs">
              <Users className="w-5 h-5 text-slate-500 transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-500 mt-4">បុគ្គលិកសរុប</p>
        </div>

        <div className="bg-white rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] border border-slate-200">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none">{stats.classesHandled}</h2>
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-all shadow-2xs">
              <Award className="w-5 h-5 text-slate-500 transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-500 mt-4">ថ្នាក់រៀនបន្ទុក</p>
        </div>

        <div className="bg-gradient-to-br from-[#155EEF] to-blue-700 rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-blue-500/20 flex flex-col justify-between min-h-[130px] border border-blue-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">{stats.totalStudents}</h2>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all shadow-2xs">
              <GraduationCap className="w-5 h-5 text-white group-hover:text-[#155EEF] transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-blue-100 mt-4">សិស្សសរុបក្នុងបន្ទុក</p>
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

        <div className="overflow-x-auto flex-1 max-h-[600px] pb-4 px-2">
          <table className="w-full text-left border-collapse border-spacing-y-1 min-w-[900px]" style={{borderSpacing: '0 4px', borderCollapse: 'separate'}}>
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm rounded-xl">
              <tr>
                <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">ល.រ</th>
                <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[200px]">ឈ្មោះបុគ្គលិក/គ្រូ</th>
                <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">ថ្នាក់បន្ទុក</th>
                <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">មុខវិជ្ជាឯកទេស</th>
                <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">សិស្សសរុប</th>
                <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">អត្រាវត្តមានសិស្ស</th>
                <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">ទំនាក់ទំនង</th>
                <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">ស្ថានភាព</th>
              </tr>
            </thead>
            <tbody className="text-sm font-semibold">
              {filteredTeachers.map((t, idx) => {
                const getInitial = (name: string) => {
                  if (!name) return 'U';
                  return name.replace('លោកគ្រូ/អ្នកគ្រូ ', '').replace('លោកគ្រូ ', '').replace('អ្នកគ្រូ ', '').charAt(0);
                };
                const colors = ['bg-rose-100 text-rose-600', 'bg-blue-100 text-blue-600', 'bg-emerald-100 text-emerald-600', 'bg-purple-100 text-purple-600', 'bg-amber-100 text-amber-600'];
                const avatarColor = colors[idx % colors.length];

                return (
                  <tr key={t.id} className="bg-white hover:bg-blue-50/30 hover:shadow-xs transition-all duration-200 group rounded-xl cursor-pointer">
                    <td className="px-4 py-2.5 rounded-l-xl border-y border-l border-slate-100 group-hover:border-blue-200 transition-colors text-center font-bold text-slate-400">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="px-4 py-2.5 border-y border-slate-100 group-hover:border-blue-200 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-[12px] shadow-sm ${avatarColor} group-hover:scale-105 transition-transform`}>
                          {getInitial(t.name)}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-800 group-hover:text-[#155EEF] transition-colors">{t.name}</div>
                          <div className="text-[11px] font-bold text-slate-500 mt-0.5">{t.subject} • ID: T-{String(t.id).slice(0, 4)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 border-y border-slate-100 group-hover:border-blue-200 transition-colors text-center">
                      <span className="px-3 py-1 rounded-full bg-blue-50 text-[#155EEF] font-black text-xs border border-blue-200/80 inline-block shadow-sm">
                        {t.class}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 border-y border-slate-100 group-hover:border-blue-200 transition-colors text-center font-bold text-slate-700">{t.subject}</td>
                    <td className="px-4 py-2.5 border-y border-slate-100 group-hover:border-blue-200 transition-colors text-center text-slate-600">{t.students} នាក់</td>
                    <td className="px-4 py-2.5 border-y border-slate-100 group-hover:border-blue-200 transition-colors text-center font-extrabold text-emerald-600">{t.att}</td>
                    <td className="px-4 py-2.5 border-y border-slate-100 group-hover:border-blue-200 transition-colors">
                      <div className="flex flex-col text-[11px] font-bold text-slate-500 gap-1">
                        <span className="flex items-center gap-1.5 text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 w-fit shadow-sm"><Phone className="w-3 h-3 text-slate-400" /> {t.phone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 rounded-r-xl border-y border-r border-slate-100 group-hover:border-blue-200 transition-colors text-right">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase border border-emerald-200/50 shadow-sm">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{t.status}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTeachers.length === 0 && (
            <div className="p-8 text-center text-slate-500 font-bold text-sm">
              រកមិនឃើញទិន្នន័យគ្រូទេ
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
