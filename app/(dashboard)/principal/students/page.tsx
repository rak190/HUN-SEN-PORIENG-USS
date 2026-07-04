'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { GraduationCap, Search, Filter, CheckCircle2, Award, Users, BookOpen } from 'lucide-react';

export default function PrincipalStudentsPage() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');

  const studentsList = [
    { id: 'ID-001', name: 'កែវ ច័ន្ទធីតា', gender: 'F', grade: '12', class: '12 ក', gpa: '3.85', rank: 'A', status: 'សកម្ម' },
    { id: 'ID-002', name: 'ខៀវ សុវណ្ណារាជ', gender: 'M', grade: '12', class: '12 ក', gpa: '3.92', rank: 'A', status: 'សកម្ម' },
    { id: 'ID-003', name: 'ចាន់ សុភាព', gender: 'F', grade: '12', class: '12 ក', gpa: '3.45', rank: 'B', status: 'សកម្ម' },
    { id: 'ID-004', name: 'ដួង រដ្ឋា', gender: 'M', grade: '11', class: '11 ខ', gpa: '3.10', rank: 'B', status: 'សកម្ម' },
    { id: 'ID-005', name: 'ទិត្យ វិសាល', gender: 'M', grade: '11', class: '11 ខ', gpa: '2.85', rank: 'C', status: 'សកម្ម' },
    { id: 'ID-006', name: 'ប៊ុន រស្មី', gender: 'F', grade: '10', class: '10 គ', gpa: '3.65', rank: 'A', status: 'សកម្ម' },
    { id: 'ID-007', name: 'ពេជ្រ សុខលី', gender: 'F', grade: '10', class: '10 គ', gpa: '3.20', rank: 'B', status: 'សកម្ម' },
    { id: 'ID-008', name: 'ហេង វណ្ណៈ', gender: 'M', grade: '9', class: '9 ក', gpa: '2.95', rank: 'C', status: 'សកម្ម' },
  ];

  const filteredStudents = studentsList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase()) || s.class.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = selectedGrade === 'all' || s.grade === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Reference UI Standard Two-Column Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            បញ្ជីសិស្សទូទាំងសាលារៀន
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5 flex items-center gap-1.5">
            <span>សរុបសិស្សសកម្ម៖</span>
            <span className="font-bold text-[#155EEF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              680 នាក់ (ស្រី 352 នាក់)
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Grade Filter Pill */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-full border border-slate-200/80 shadow-xs">
            <Filter className="w-4 h-4 text-[#FFCF59]" />
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">គ្រប់កម្រិតថ្នាក់ (All Grades)</option>
              <option value="12">ថ្នាក់ទី 12</option>
              <option value="11">ថ្នាក់ទី 11</option>
              <option value="10">ថ្នាក់ទី 10</option>
              <option value="9">ថ្នាក់ទី 9</option>
            </select>
          </div>

          {/* Search Pill */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ស្វែងរកឈ្មោះ ឬអត្តលេខ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200/80 rounded-full text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#155EEF] shadow-xs"
            />
          </div>
        </div>
      </header>

      {/* Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[20px] border border-slate-100/80 shadow-xs">
          <div className="text-xs font-bold text-[#64748B]">សិស្សថ្នាក់ទី 12</div>
          <div className="text-2xl font-black text-[#155EEF] mt-1">145 នាក់</div>
        </div>
        <div className="bg-white p-5 rounded-[20px] border border-slate-100/80 shadow-xs">
          <div className="text-xs font-bold text-[#64748B]">សិស្សថ្នាក់ទី 11</div>
          <div className="text-2xl font-black text-slate-800 mt-1">160 នាក់</div>
        </div>
        <div className="bg-white p-5 rounded-[20px] border border-slate-100/80 shadow-xs">
          <div className="text-xs font-bold text-[#64748B]">សិស្សថ្នាក់ទី 10</div>
          <div className="text-2xl font-black text-slate-800 mt-1">185 នាក់</div>
        </div>
        <div className="bg-white p-5 rounded-[20px] border border-slate-100/80 shadow-xs">
          <div className="text-xs font-bold text-[#64748B]">អត្រាជាប់និទ្ទេស A និង B</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">48.5 %</div>
        </div>
      </div>

      {/* Students Table — Clean White Card */}
      <div className="bg-white rounded-[24px] border border-slate-100/80 shadow-xs overflow-hidden">
        <div className="p-5 bg-white border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#155EEF]" />
            <span>បង្ហាញលទ្ធផលស្វែងរក ({filteredStudents.length} នាក់)</span>
          </h3>
          <span className="text-xs font-extrabold text-[#64748B] bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
            កម្រិតថ្នាក់៖ {selectedGrade === 'all' ? 'ទាំងអស់' : `ទី ${selectedGrade}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
                <th className="py-4 px-6 w-16 text-center">ល.រ</th>
                <th className="py-4 px-6">អត្តលេខ</th>
                <th className="py-4 px-6 min-w-[180px]">គោត្តនាម & នាម</th>
                <th className="py-4 px-4 text-center">ភេទ</th>
                <th className="py-4 px-6 text-center">ថ្នាក់រៀន</th>
                <th className="py-4 px-6 text-center">មធ្យមភាគ (GPA)</th>
                <th className="py-4 px-6 text-center">ចំណាត់ថ្នាក់</th>
                <th className="py-4 px-6 text-right">ស្ថានភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold">
              {filteredStudents.map((s, idx) => {
                let badgeClass = 'bg-slate-100 text-slate-700';
                if (s.rank === 'A') badgeClass = 'bg-emerald-500 text-white shadow-xs font-black';
                else if (s.rank === 'B') badgeClass = 'bg-[#155EEF] text-white shadow-xs font-black';
                else if (s.rank === 'C') badgeClass = 'bg-indigo-500 text-white font-bold';

                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-6 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-3 px-6 font-mono text-slate-500">{s.id}</td>
                    <td className="py-3 px-6 font-extrabold text-slate-800">{s.name}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${s.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                        {s.gender === 'F' ? 'ស្រី' : 'ប្រុស'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center font-extrabold text-[#155EEF]">{s.class}</td>
                    <td className="py-3 px-6 text-center font-mono font-black text-slate-700">{s.gpa}</td>
                    <td className="py-3 px-6 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs ${badgeClass}`}>
                        Rank {s.rank}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{s.status}</span>
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
