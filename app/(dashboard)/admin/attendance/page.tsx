'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, AlertCircle, Search, 
  Filter, UserX, Clock, Building2, Users, Check
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function MasterAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [classesStatus, setClassesStatus] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');

  const supabase = createClient();
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    setLoading(true);
    
    // 1. Fetch all classes
    const { data: allClasses, error: classesError } = await supabase
      .from('classes')
      .select('id, name');

    // 2. Fetch today's attendance records
    const { data: todayAttendance, error: attError } = await supabase
      .from('attendance_records')
      .select(`
        id,
        status,
        reason,
        class_id,
        student:students(id, full_name, student_id_number, gender, is_active),
        classes!attendance_records_class_id_fkey(id, name)
      `)
      .eq('date', todayStr);

    if (classesError || attError) {
      console.error(classesError || attError);
    }

    const attendanceRecords = todayAttendance || [];

    // Analyze class submissions
    const submittedClassIds = new Set(attendanceRecords.map((a: any) => a.class_id));
    
    const classStats = (allClasses || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      isSubmitted: submittedClassIds.has(c.id)
    })).sort((a, b) => a.name.localeCompare(b.name));

    setClassesStatus(classStats);

    // Filter absentees
    const absentees = attendanceRecords
      .filter((a: any) => a.status === 'absent')
      .map((a: any) => ({
        id: a.id,
        student_name: a.student?.full_name || 'Unknown',
        student_id_number: a.student?.student_id_number || 'N/A',
        gender: a.student?.gender === 'F' ? 'ស្រី' : 'ប្រុស',
        class_name: a.classes?.name || 'Unknown Class',
        reason: a.reason || 'គ្មានការអនុញ្ញាត (Unexcused)'
      }));

    setAbsentStudents(absentees);
    setLoading(false);
  };

  const classList = ['all', ...Array.from(new Set(absentStudents.map(a => a.class_name)))].sort();
  
  const filteredAbsentees = absentStudents.filter(a => {
    const matchesSearch = a.student_name.includes(searchQuery) || a.student_id_number.includes(searchQuery);
    const matchesClass = filterClass === 'all' || a.class_name === filterClass;
    return matchesSearch && matchesClass;
  });

  const totalClasses = classesStatus.length;
  const submittedClasses = classesStatus.filter(c => c.isSubmitted).length;
  const missingClasses = classesStatus.filter(c => !c.isSubmitted);

  return (
    <div className="space-y-6 animate-fadeIn select-none pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            <Calendar className="w-8 h-8 text-[#155EEF]" />
            ផ្ទាំងគ្រប់គ្រងអវត្តមានសរុប (Master Attendance)
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-1">
            ទិដ្ឋភាពទូទៅនៃអវត្តមានសិស្ស និងការបញ្ជូនវត្តមានរបស់ថ្នាក់រៀនទូទាំងសាលាសម្រាប់ថ្ងៃនេះ ({todayStr})
          </p>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-2xl leading-none mb-1">{absentStudents.length}</h4>
            <p className="text-[11px] font-bold text-slate-500">សិស្សអវត្តមានសរុបថ្ងៃនេះ</p>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-2xl leading-none mb-1">
              {submittedClasses} <span className="text-sm text-slate-400">/ {totalClasses}</span>
            </h4>
            <p className="text-[11px] font-bold text-slate-500">ថ្នាក់រៀនបានបញ្ជូនវត្តមាន</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm flex items-center gap-4 bg-rose-50/30">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center animate-pulse">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-rose-700 text-2xl leading-none mb-1">
              {missingClasses.length}
            </h4>
            <p className="text-[11px] font-bold text-rose-600">ថ្នាក់មិនទាន់បញ្ជូនវត្តមាន</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Missing Submissions Alert (EWS) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-[24px] shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-slate-800">ថ្នាក់រៀនមិនទាន់ស្រង់វត្តមាន</h3>
            </div>
            <div className="p-4">
              {loading ? (
                <p className="text-sm font-bold text-slate-400 animate-pulse text-center p-4">កំពុងផ្ទុក...</p>
              ) : missingClasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                    <Check className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">គ្រប់ថ្នាក់រៀនបានបញ្ជូនវត្តមានរួចរាល់។</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {missingClasses.map(c => (
                    <li key={c.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <span className="font-extrabold text-amber-900">{c.name}</span>
                      <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-200/50 px-2 py-1 rounded-md">Pending</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Absentee Roster */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[24px] shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4 flex-wrap">
              <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                <UserX className="w-5 h-5 text-rose-500" />
                បញ្ជីសិស្សអវត្តមានថ្ងៃនេះ
              </h3>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-48 shrink-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ស្វែងរកសិស្ស..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#155EEF]"
                  />
                </div>
                <select 
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#155EEF] cursor-pointer"
                >
                  <option value="all">គ្រប់ថ្នាក់</option>
                  {classList.filter(c => c !== 'all').map(c => (
                    <option key={c} value={c as string}>{c as string}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="p-3 whitespace-nowrap">ឈ្មោះសិស្ស</th>
                    <th className="p-3 whitespace-nowrap">ភេទ</th>
                    <th className="p-3 whitespace-nowrap">ថ្នាក់រៀន</th>
                    <th className="p-3 whitespace-nowrap">មូលហេតុអវត្តមាន</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-sm font-bold text-slate-400 animate-pulse">
                        កំពុងផ្ទុកទិន្នន័យ...
                      </td>
                    </tr>
                  ) : filteredAbsentees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-sm font-bold text-slate-400">
                        មិនមានសិស្សអវត្តមានទេ (ឬរកមិនឃើញ)
                      </td>
                    </tr>
                  ) : (
                    filteredAbsentees.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-extrabold text-slate-900 text-sm">
                          {student.student_name}
                        </td>
                        <td className="p-3 text-xs font-bold text-slate-600">
                          {student.gender}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-[#155EEF]/10 text-[#155EEF] font-black text-xs rounded border border-[#155EEF]/20">
                            {student.class_name}
                          </span>
                        </td>
                        <td className="p-3 text-xs font-bold text-slate-600">
                          {student.reason}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
