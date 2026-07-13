'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { GraduationCap, Search, Filter, CheckCircle2, Award, Users, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PrincipalStudentsPage() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const studentsList = [
    { id: 'ID-001', name: 'កែវ ច័ន្ទធីតា', gender: 'F', grade: '12', class: '12 ក', gpa: '3.85', rank: 'A', status: 'សកម្ម' },
    { id: 'ID-002', name: 'ខៀវ សុវណ្ណារាជ', gender: 'M', grade: '12', class: '12 ក', gpa: '3.92', rank: 'A', status: 'សកម្ម' },
    { id: 'ID-003', name: 'ចាន់ សុភាព', gender: 'F', grade: '12', class: '12 ក', gpa: '3.45', rank: 'B', status: 'សកម្ម' },
    { id: 'ID-004', name: 'ដួង រដ្ឋា', gender: 'M', grade: '11', class: '11 ខ', gpa: '3.10', rank: 'B', status: 'សកម្ម' },
    { id: 'ID-005', name: 'ទិត្យ វិសាល', gender: 'M', grade: '11', class: '11 ខ', gpa: '2.85', rank: 'C', status: 'សកម្ម' },
    { id: 'ID-006', name: 'ប៊ុន រស្មី', gender: 'F', grade: '10', class: '10 គ', gpa: '3.65', rank: 'A', status: 'សកម្ម' },
    { id: 'ID-007', name: 'ពេជ្រ សុខលី', gender: 'F', grade: '10', class: '10 គ', gpa: '3.20', rank: 'B', status: 'សកម្ម' },
    { id: 'ID-008', name: 'ហេង វណ្ណៈ', gender: 'M', grade: '9', class: '9 ក', gpa: '2.95', rank: 'C', status: 'សកម្ម' },
    { id: 'ID-009', name: 'សុវណ្ណ ពិសិដ្ឋ', gender: 'M', grade: '8', class: '8 ង', gpa: '3.10', rank: 'B', status: 'សកម្ម' },
    { id: 'ID-010', name: 'លីដា សុធារី', gender: 'F', grade: '7', class: '7 ច', gpa: '3.80', rank: 'A', status: 'សកម្ម' },
  ];

  // We wrap studentsList in useMemo in case it's passed from props or a hook in the future
  const students = useMemo(() => studentsList, []);

  // Dynamically extract available classes but ensure grades 7-12 always exist
  const filterOptions = useMemo(() => {
    const options: Record<string, Set<string>> = {
      '12': new Set(),
      '11': new Set(),
      '10': new Set(),
      '9': new Set(),
      '8': new Set(),
      '7': new Set(),
    };

    students.forEach(s => {
      if (!options[s.grade]) options[s.grade] = new Set();
      options[s.grade].add(s.class);
    });
    
    // Sort grades descending (12 to 7)
    const sortedGrades = Object.keys(options).sort((a, b) => Number(b) - Number(a));
    
    return sortedGrades.map(grade => ({
      grade,
      classes: Array.from(options[grade]).sort((a, b) => a.localeCompare(b, 'km'))
    }));
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = s.name.toLowerCase().includes(searchLower) || 
                            s.id.toLowerCase().includes(searchLower) || 
                            s.class.toLowerCase().includes(searchLower);
                            
      let matchesFilter = true;
      if (selectedFilter.startsWith('grade:')) {
        const targetGrade = selectedFilter.split(':')[1];
        matchesFilter = s.grade === targetGrade;
      } else if (selectedFilter.startsWith('class:')) {
        const targetClass = selectedFilter.split(':')[1];
        matchesFilter = s.class === targetClass;
      }

      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, selectedFilter, students]);

  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  
  const currentStudents = useMemo(() => {
    return filteredStudents.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredStudents, currentPage]);

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
          {/* Unified Grade & Class Filter Pill */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-full border border-slate-200/80 shadow-xs max-w-full">
            <Filter className="w-4 h-4 text-[#FFCF59] shrink-0" />
            <select
              value={selectedFilter}
              onChange={(e) => {
                setSelectedFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer w-full max-w-[200px] truncate"
            >
              <option value="all">គ្រប់កម្រិតថ្នាក់ (All Grades)</option>
              {filterOptions.map(({ grade, classes }) => (
                <optgroup key={grade} label={`ថ្នាក់ទី ${grade}`}>
                  <option value={`grade:${grade}`}>ថ្នាក់ទី {grade} ទាំងអស់</option>
                  {classes.length > 0 ? (
                    classes.map(c => (
                      <option key={c} value={`class:${c}`}>
                        ថ្នាក់ {c}
                      </option>
                    ))
                  ) : (
                    <option disabled value={`empty:${grade}`}>គ្មានសិស្សទេ</option>
                  )}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Search Pill */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ស្វែងរកឈ្មោះ ឬអត្តលេខ..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200/80 rounded-full text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#155EEF] shadow-xs transition-all"
            />
          </div>
        </div>
      </header>

      {/* Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">145</h2>
            <div className="w-10 h-10 rounded-full bg-yellow-900/10 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all">
              <Users className="w-5 h-5 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">សិស្សថ្នាក់ទី 12</p>
        </div>

        <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">160</h2>
            <div className="w-10 h-10 rounded-full bg-yellow-900/10 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all">
              <Users className="w-5 h-5 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">សិស្សថ្នាក់ទី 11</p>
        </div>

        <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">185</h2>
            <div className="w-10 h-10 rounded-full bg-yellow-900/10 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all">
              <Users className="w-5 h-5 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">សិស្សថ្នាក់ទី 10</p>
        </div>

        <div className="bg-[#155EEF] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-blue-500/20 flex flex-col justify-between min-h-[130px] border border-blue-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">48.5%</h2>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all">
              <Award className="w-5 h-5 text-white group-hover:text-[#155EEF] transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-blue-100 mt-4">អត្រាជាប់និទ្ទេស A និង B</p>
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
            {selectedFilter === 'all' 
              ? 'កម្រិតថ្នាក់៖ ទាំងអស់' 
              : selectedFilter.startsWith('grade:') 
                ? `កម្រិតថ្នាក់ទី ${selectedFilter.split(':')[1]}`
                : `ថ្នាក់រៀន៖ ${selectedFilter.split(':')[1]}`
            }
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
              {currentStudents.map((s, idx) => {
                let badgeClass = 'bg-slate-100 text-slate-700';
                if (s.rank === 'A') badgeClass = 'bg-emerald-500 text-white shadow-xs font-black border border-emerald-600/50';
                else if (s.rank === 'B') badgeClass = 'bg-[#155EEF] text-white shadow-xs font-black border border-blue-600/50';
                else if (s.rank === 'C') badgeClass = 'bg-indigo-500 text-white font-bold border border-indigo-600/50';

                const avatarColor = s.gender === 'F' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600';
                const initial = s.name.charAt(0);
                const absoluteIndex = ((currentPage - 1) * itemsPerPage) + idx + 1;

                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                    <td className="py-3 px-6 text-center text-slate-400 font-bold">{String(absoluteIndex).padStart(2, '0')}</td>
                    <td className="py-3 px-6 font-mono text-slate-500 text-xs">{s.id}</td>
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs ${avatarColor} group-hover:scale-105 transition-transform`}>
                          {initial}
                        </div>
                        <div className="font-extrabold text-slate-800 group-hover:text-[#155EEF] transition-colors">{s.name}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black border ${s.gender === 'F' ? 'bg-pink-50 text-pink-700 border-pink-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {s.gender === 'F' ? 'ស្រី' : 'ប្រុស'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-black text-[11px] border border-slate-200/80 inline-block group-hover:bg-blue-50 group-hover:text-[#155EEF] group-hover:border-blue-200 transition-colors">
                        {s.class}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center font-mono font-black text-slate-700">{s.gpa}</td>
                    <td className="py-3 px-6 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] ${badgeClass}`}>
                        RANK {s.rank}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase border border-emerald-200/50">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{s.status}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <p className="text-xs font-bold text-slate-500">
              បង្ហាញ {((currentPage - 1) * itemsPerPage) + (currentStudents.length > 0 ? 1 : 0)} ដល់ {Math.min(currentPage * itemsPerPage, filteredStudents.length)} នៃ {filteredStudents.length} សិស្ស
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
                មុន
              </button>
              <div className="flex items-center gap-1 px-2 text-xs font-black text-slate-700">
                {currentPage} / {totalPages}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center gap-1 cursor-pointer transition-colors"
              >
                បន្ទាប់
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
