'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, Search, Filter, FileSpreadsheet, 
  Download, Edit2, Check, X, ShieldCheck,
  ArrowRightLeft, UserX
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import StudentMigrationModal from './components/StudentMigrationModal';
import StudentProfileDrawer from './components/StudentProfileDrawer';

export default function MasterStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeClass, setActiveClass] = useState('all');
  const [activeTeacher, setActiveTeacher] = useState('all');
  const [activeGender, setActiveGender] = useState('all');
  const [activeDeskStatus, setActiveDeskStatus] = useState('all');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [selectedProfileStudent, setSelectedProfileStudent] = useState<any | null>(null);

  useEffect(() => {
    async function fetchStudents() {
      setLoading(true);
      try {
        const supabase = createClient();
        
        // Fetch students and join classes to get teacher_id
        const { data: studentsData, error } = await supabase
          .from('students')
          .select('*, classes(name, teacher_id)');
          
        if (error) throw error;
        
        if (studentsData && studentsData.length > 0) {
          // Fetch profiles to get teacher names
          const teacherIds = [...new Set(studentsData.map(s => s.classes?.teacher_id).filter(Boolean))];
          const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', teacherIds);
          
          const mapped = studentsData.map(s => {
            const teacherProfile = profiles?.find(p => p.id === s.classes?.teacher_id);
            return {
              id: s.id,
              full_name: s.full_name,
              student_id_number: s.student_id_number,
              desk_number: s.desk_number,
              room_number: s.room_number,
              gender: s.gender,
              class_name: s.classes?.name || 'គ្មានថ្នាក់',
              homeroom_teacher: teacherProfile ? teacherProfile.full_name : 'មិនមាន',
              is_active: s.is_active
            };
          });
          setStudents(mapped);
        } else {
          setStudents([]);
        }
      } catch (err: any) {
        console.error("Supabase Fetch Error:", err.message || err.details || err);
        alert("បរាជ័យក្នុងការទាញយកទិន្នន័យ (Failed to fetch students): " + (err.message || 'Unknown error'));
        setStudents([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name.includes(searchQuery) 
      || (s.student_id_number || '').includes(searchQuery)
      || (s.desk_number || '').includes(searchQuery)
      || (s.room_number || '').includes(searchQuery);
    const matchesClass = activeClass === 'all' || s.class_name === activeClass;
    const matchesTeacher = activeTeacher === 'all' || s.homeroom_teacher === activeTeacher;
    
    const matchesGender = activeGender === 'all' 
      || (activeGender === 'M' && (s.gender === 'ប្រុស' || s.gender === 'M'))
      || (activeGender === 'F' && (s.gender === 'ស្រី' || s.gender === 'F'));
      
    const matchesDeskStatus = activeDeskStatus === 'all'
      || (activeDeskStatus === 'assigned' && !!s.desk_number)
      || (activeDeskStatus === 'unassigned' && !s.desk_number);
      
    return matchesSearch && matchesClass && matchesTeacher && matchesGender && matchesDeskStatus;
  });

  const handleExport = () => {
    if (filteredStudents.length === 0) return;
    
    const wsData = filteredStudents.map((s, index) => ({
      'ល.រ': index + 1,
      'អត្តលេខ': s.student_id_number || '',
      'គោត្តនាម និងនាម': s.full_name,
      'ភេទ': s.gender,
      'ថ្នាក់': s.class_name,
      'គ្រូបន្ទុកថ្នាក់': s.homeroom_teacher,
      'ប្លង់តុ': s.desk_number || '',
      'លេខបន្ទប់': s.room_number || '',
      'ស្ថានភាព': s.is_active ? 'សកម្ម' : 'ផ្អាក'
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    
    // Auto-size columns
    ws['!cols'] = [
      { wch: 5 },  // No
      { wch: 15 }, // ID
      { wch: 30 }, // Name
      { wch: 10 }, // Gender
      { wch: 15 }, // Class
      { wch: 25 }, // Teacher
      { wch: 15 }, // Desk Number
      { wch: 15 }, // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students Registry");
    XLSX.writeFile(wb, `KruSmart_Students_Registry_${new Date().toLocaleDateString('km-KH').replace(/\//g, '-')}.xlsx`);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudents(filteredStudents.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-bold animate-pulse">កំពុងផ្ទុក...</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn select-none p-4 md:p-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            <Users className="w-8 h-8 text-[#155EEF]" />
            ទិន្នន័យសិស្សទូទាំងសាលា
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-1">
            ទិន្នន័យនេះបានមកពីគ្រូបន្ទុកថ្នាក់បញ្ចូល (Read-only ឬ Override ក្នុងនាម Admin)
          </p>
        </div>
        
        <div className="flex gap-2">
          <Link 
            href="/admin/giep-import"
            className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition-colors border border-slate-200 shadow-sm flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> សមកាលកម្ម (GIEP)
          </Link>
          <button 
            onClick={handleExport}
            disabled={filteredStudents.length === 0}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> ទាញយក (Export)
          </button>
        </div>
      </header>

      {/* Mini Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-2">
        <div className="bg-[#155EEF] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-blue-500/20 text-white flex flex-col justify-between min-h-[130px] cursor-pointer border border-blue-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">{students.length}</h2>
            <div className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all shadow-2xs">
              <Users className="w-4 h-4 text-white group-hover:text-[#155EEF] transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-blue-100 mt-4">សិស្សសរុប</p>
        </div>

        <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{students.filter(s => s.gender === 'ស្រី' || s.gender === 'F').length}</h2>
            <div className="w-9 h-9 bg-yellow-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-2xs">
              <Users className="w-4 h-4 text-yellow-900" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">សិស្សស្រី</p>
        </div>

        <div className="bg-rose-500 rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-rose-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">{students.filter(s => !s.is_active).length}</h2>
            <div className="w-9 h-9 bg-rose-400 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-2xs">
              <UserX className="w-4 h-4 text-rose-50" />
            </div>
          </div>
          <p className="text-sm font-bold text-rose-100 mt-4">សិស្សផ្អាក</p>
        </div>

        <div className="bg-emerald-500 rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-emerald-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">{students.filter(s => s.class_name === 'គ្មានថ្នាក់').length}</h2>
            <div className="w-9 h-9 bg-emerald-400 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-50" />
            </div>
          </div>
          <p className="text-sm font-bold text-emerald-100 mt-4">សិស្សគ្មានថ្នាក់ (Unassigned)</p>
        </div>
      </div>

      {/* Master Data Grid */}
      <div className="bg-white rounded-[24px] shadow-xs border border-slate-100/80 overflow-hidden mt-6">
        
        {/* Mission Control Header */}
        <div className="p-4 border-b border-slate-100/80 bg-slate-50/80">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            
            {/* Context Aware Action Area (Search vs Bulk Actions) */}
            <div className="flex-1 transition-all duration-300">
              {selectedStudents.length > 0 ? (
                <div className="flex items-center gap-3 bg-[#155EEF] text-white p-2 rounded-xl shadow-md animate-in slide-in-from-left-4">
                  <div className="font-bold flex items-center gap-2 text-sm pl-2">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    សិស្ស {selectedStudents.length} នាក់ ត្រូវបានជ្រើសរើស
                  </div>
                  <button 
                    onClick={() => setIsMigrationModalOpen(true)}
                    className="ml-auto px-4 py-1.5 bg-white text-[#155EEF] font-black rounded-lg hover:bg-blue-50 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-sm flex items-center gap-2 text-xs"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" /> ផ្ទេរថ្នាក់ (Bulk Migrate)
                  </button>
                  <button 
                    onClick={() => setSelectedStudents([])}
                    className="p-1.5 bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative w-full max-w-xl group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400 group-focus-within:text-[#155EEF] transition-colors" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="ស្វែងរកសិស្សតាមឈ្មោះ, អត្តលេខ, ឬ ប្លង់តុ..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#155EEF]/10 focus:border-[#155EEF] transition-all shadow-sm"
                  />
                </div>
              )}
            </div>
            
            {/* Filters Area */}
            <div className={`flex flex-wrap sm:flex-nowrap gap-2 transition-opacity duration-300 ${selectedStudents.length > 0 ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <select 
                  value={activeClass}
                  onChange={(e) => setActiveClass(e.target.value)}
                  className="w-full sm:w-32 pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-slate-300 focus:ring-2 focus:ring-[#155EEF]/20 focus:border-[#155EEF] outline-none transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="all">គ្រប់ថ្នាក់</option>
                  {Array.from(new Set(students.map(s => s.class_name))).map(c => <option key={c} value={c as string}>{c as string}</option>)}
                </select>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <select 
                  value={activeTeacher}
                  onChange={(e) => setActiveTeacher(e.target.value)}
                  className="w-full sm:w-32 pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-slate-300 focus:ring-2 focus:ring-[#155EEF]/20 focus:border-[#155EEF] outline-none transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="all">គ្រប់គ្រូ</option>
                  {Array.from(new Set(students.map(s => s.homeroom_teacher))).map(teacher => (
                    <option key={teacher as string} value={teacher as string}>{teacher as string}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <select 
                  value={activeGender}
                  onChange={(e) => setActiveGender(e.target.value)}
                  className="w-full sm:w-28 pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-slate-300 focus:ring-2 focus:ring-[#155EEF]/20 focus:border-[#155EEF] outline-none transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="all">គ្រប់ភេទ</option>
                  <option value="M">ប្រុស</option>
                  <option value="F">ស្រី</option>
                </select>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <select 
                  value={activeDeskStatus}
                  onChange={(e) => setActiveDeskStatus(e.target.value)}
                  className="w-full sm:w-36 pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-slate-300 focus:ring-2 focus:ring-[#155EEF]/20 focus:border-[#155EEF] outline-none transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="all">ស្ថានភាពប្លង់តុ</option>
                  <option value="assigned">មានប្លង់តុ</option>
                  <option value="unassigned">គ្មានប្លង់តុ</option>
                </select>
              </div>
            </div>
            
          </div>
        </div>

        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F4F7FE] sticky top-0 z-10 border-b border-blue-100/80">
              <tr>
                <th className="p-3 w-10 text-center border-r border-blue-100/80">
                  <input 
                    type="checkbox" 
                    checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-[#155EEF] rounded border-blue-200 focus:ring-[#155EEF]"
                  />
                </th>
                <th className="px-4 py-3 text-[11px] font-black text-blue-700 uppercase tracking-wider border-r border-blue-100/80">សិស្ស</th>
                <th className="px-4 py-3 text-[11px] font-black text-blue-700 uppercase tracking-wider text-center border-r border-blue-100/80">ភេទ</th>
                <th className="px-4 py-3 text-[11px] font-black text-blue-700 uppercase tracking-wider text-center border-r border-blue-100/80">ថ្នាក់</th>
                <th className="px-4 py-3 text-[11px] font-black text-blue-700 uppercase tracking-wider text-center border-r border-blue-100/80">ប្លង់តុ</th>
                <th className="px-4 py-3 text-[11px] font-black text-blue-700 uppercase tracking-wider text-center border-r border-blue-100/80">លេខបន្ទប់</th>
                <th className="px-4 py-3 text-[11px] font-black text-blue-700 uppercase tracking-wider border-r border-blue-100/80">គ្រូបន្ទុកថ្នាក់</th>
                <th className="px-4 py-3 text-[11px] font-black text-blue-700 uppercase tracking-wider text-center">ស្ថានភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStudents.map((s) => (
                <tr 
                  key={s.id} 
                  className="hover:bg-slate-50 transition-colors group cursor-pointer"
                  onClick={() => setSelectedProfileStudent(s)}
                >
                  <td className="p-2 text-center border-r border-slate-100" onClick={e => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedStudents.includes(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="w-3.5 h-3.5 text-[#155EEF] rounded border-slate-300 focus:ring-[#155EEF]"
                    />
                  </td>
                  <td className="px-4 py-2 border-r border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-500 uppercase text-xs border border-slate-200">
                        {s.full_name.substring(0, 1)}
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className="font-extrabold text-slate-900 text-sm leading-tight">{s.full_name}</p>
                        <p className="text-[10px] font-bold text-slate-500 leading-tight">
                          {s.student_id_number || 'គ្មានអត្តលេខ'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center border-r border-slate-100">
                    <span className="font-bold text-slate-700 text-[13px]">{s.gender}</span>
                  </td>
                  <td className="px-4 py-2 text-center border-r border-slate-100">
                    <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs font-bold border border-slate-200">{s.class_name}</span>
                  </td>
                  <td className="px-4 py-2 text-center border-r border-slate-100">
                    {s.desk_number ? (
                      <span className="font-black text-[#155EEF] text-[13px]">{s.desk_number}</span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 italic">គ្មាន</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center border-r border-slate-100">
                    {s.room_number ? (
                      <span className="inline-flex px-2 py-0.5 bg-blue-50 text-[#155EEF] rounded-md text-xs font-black border border-blue-100">{s.room_number}</span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 italic">គ្មាន</span>
                    )}
                  </td>
                  <td className="px-4 py-2 border-r border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#155EEF]/10 flex items-center justify-center text-[#155EEF] font-bold text-[9px]">
                        {s.homeroom_teacher.substring(0, 1)}
                      </div>
                      <span className="font-bold text-slate-700 text-xs">{s.homeroom_teacher}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {s.is_active ? (
                      <span className="inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-black uppercase tracking-wider border border-emerald-200">សកម្ម</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md text-[10px] font-black uppercase tracking-wider border border-slate-200">ផ្អាក</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center border-r border-slate-100">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <Search className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-bold">គ្មានទិន្នន័យសិស្ស (No students found)</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StudentMigrationModal 
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        selectedStudentIds={selectedStudents}
        onComplete={() => {
          setSelectedStudents([]);
          window.location.reload();
        }}
      />

      <StudentProfileDrawer
        isOpen={!!selectedProfileStudent}
        onClose={() => setSelectedProfileStudent(null)}
        student={selectedProfileStudent}
      />
    </div>
  );
}
