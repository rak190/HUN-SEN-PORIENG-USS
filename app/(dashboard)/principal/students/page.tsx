'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { GraduationCap, Search, Filter, Award, Users, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export default function PrincipalStudentsPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function fetchSchoolStudents() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('students')
          .select('id, full_name, student_id_number, gender, is_active, class_id, classes(id, name, grade, track)')
          .eq('is_active', true)
          .order('full_name');

        if (error) throw error;

        const mapped = (data || []).map((s: any) => ({
          id: s.student_id_number || s.id.slice(0, 8),
          dbId: s.id,
          name: s.full_name,
          gender: s.gender === 'F' || s.gender === 'ស្រី' ? 'F' : 'M',
          grade: s.classes?.grade ? String(s.classes.grade) : '12',
          class: s.classes?.name || 'គ្មានថ្នាក់',
          status: 'សកម្ម'
        }));

        setStudents(mapped);
      } catch (err) {
        console.error('Error fetching principal students:', err);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSchoolStudents();
  }, []);

  // Dynamically extract available classes from real data
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
      if (s.class && s.class !== 'គ្មានថ្នាក់') {
        options[s.grade].add(s.class);
      }
    });
    
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
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  
  const currentStudents = useMemo(() => {
    return filteredStudents.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredStudents, currentPage]);

  const g12Count = students.filter(s => s.grade === '12').length;
  const g11Count = students.filter(s => s.grade === '11').length;
  const g10Count = students.filter(s => s.grade === '10').length;
  const totalFemale = students.filter(s => s.gender === 'F').length;

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
              {students.length} នាក់ (ស្រី {totalFemale} នាក់)
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
              <option value="all">គ្រប់កម្រិតថ្នាក់</option>
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
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{g12Count}</h2>
            <div className="w-10 h-10 rounded-full bg-yellow-900/10 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all">
              <Users className="w-5 h-5 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">សិស្សថ្នាក់ទី 12</p>
        </div>

        <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{g11Count}</h2>
            <div className="w-10 h-10 rounded-full bg-yellow-900/10 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all">
              <Users className="w-5 h-5 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">សិស្សថ្នាក់ទី 11</p>
        </div>

        <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{g10Count}</h2>
            <div className="w-10 h-10 rounded-full bg-yellow-900/10 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all">
              <Users className="w-5 h-5 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">សិស្សថ្នាក់ទី 10</p>
        </div>

        <div className="bg-[#155EEF] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-blue-500/20 flex flex-col justify-between min-h-[130px] border border-blue-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">
              {students.length > 0 ? `${Math.round((totalFemale / students.length) * 100)}%` : '0%'}
            </h2>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all">
              <Award className="w-5 h-5 text-white group-hover:text-[#155EEF] transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-blue-100 mt-4">សមាមាត្រសិស្សស្រីទូទាំងសាលា</p>
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
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2 font-bold">
              <Loader2 className="w-6 h-6 animate-spin text-[#155EEF]" />
              <span>កំពុងទាញយកទិន្នន័យសិស្ស...</span>
            </div>
          ) : currentStudents.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-bold">
              មិនមានទិន្នន័យសិស្សត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ។
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
                  <th className="py-4 px-6 w-16 text-center">ល.រ</th>
                  <th className="py-4 px-6">អត្តលេខ</th>
                  <th className="py-4 px-6 min-w-[180px]">គោត្តនាម & នាម</th>
                  <th className="py-4 px-4 text-center">ភេទ</th>
                  <th className="py-4 px-6 text-center">ថ្នាក់រៀន</th>
                  <th className="py-4 px-6 text-center">កម្រិត</th>
                  <th className="py-4 px-6 text-right">ស្ថានភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-semibold">
                {currentStudents.map((s, idx) => {
                  const avatarColor = s.gender === 'F' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600';
                  const initial = s.name.charAt(0);
                  const absoluteIndex = ((currentPage - 1) * itemsPerPage) + idx + 1;

                  return (
                    <tr key={s.dbId || idx} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
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
                      <td className="py-3 px-6 text-center font-bold text-slate-600">
                        ថ្នាក់ទី {s.grade}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>{s.status}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-[#64748B]">
            ទំព័រទី {currentPage} នៃ {totalPages} (សរុប {filteredStudents.length} នាក់)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>ថយក្រោយ</span>
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>បន្ទាប់</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
