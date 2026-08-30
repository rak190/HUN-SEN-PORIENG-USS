'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, AlertCircle, Search, 
  Filter, UserX, Clock, Building2, Users, Check,
  AlertTriangle, Mic, ArrowUpRight, Phone, Download, TrendingDown, TrendingUp
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function MasterAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [classesStatus, setClassesStatus] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'unexcused' | 'excused'>('all');
  
  // Date Picker State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeframe, setTimeframe] = useState<'daily'|'monthly'|'yearly'>('daily');
  const [activeTab, setActiveTab] = useState<'call-list'|'compliance'|'watchlist'>('call-list');
  const [dbClasses, setDbClasses] = useState<any[]>([]);

  // Custom Combobox State
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [classSearchQuery, setClassSearchQuery] = useState('');

  const todayStr = new Date().toLocaleDateString('km-KH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch real classes from database
        const { data: dbClassesData } = await supabase
          .from('classes')
          .select('id, name, grade, teacher_id, profiles:teacher_id(full_name)')
          .order('grade')
          .order('name');
        
        const validClasses = dbClassesData || [];
        setDbClasses(validClasses);

        let startDateStr = selectedDate;
        let endDateStr = selectedDate;

        if (timeframe === 'monthly') {
           const date = new Date(selectedDate);
           startDateStr = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
           endDateStr = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
        } else if (timeframe === 'yearly') {
           const date = new Date(selectedDate);
           startDateStr = new Date(date.getFullYear(), 0, 1).toISOString().split('T')[0];
           endDateStr = new Date(date.getFullYear(), 11, 31).toISOString().split('T')[0];
        }

        // Fetch attendance
        const query = supabase
          .from('attendance_records')
          .select('*, students(full_name, student_id_number, gender)')
          .gte('date', startDateStr)
          .lte('date', endDateStr);

        const { data: attData } = await query;
        const records = attData || [];

        // Build data structures
        const classSubmissions = new Set(records.map(r => r.class_id));
        const newClassesStatus = validClasses.map(c => ({
          id: c.id,
          name: c.name,
          isSubmitted: classSubmissions.has(c.id) // Simplistic check: if ANY record exists, it's submitted
        }));
        setClassesStatus(newClassesStatus);

        // Process absentees (exclude 'present')
        const absentees = records.filter(r => r.status !== 'present');
        
        if (timeframe === 'daily') {
           setAbsentStudents(absentees.map(a => {
             const cls = validClasses.find(c => c.id === a.class_id);
             return {
               id: a.student_id,
               student_name: (a.students as any)?.full_name || 'មិនស្គាល់',
               student_id_number: (a.students as any)?.student_id_number || '',
               gender: (a.students as any)?.gender || '',
               class_name: cls?.name || '',
               reason: a.status === 'absent' || a.status === 'A' ? 'គ្មានការអនុញ្ញាត (Unexcused)' : 'សុំច្បាប់',
               unexcused: a.status === 'absent' || a.status === 'A' ? 1 : 0,
               excused: a.status === 'permission' || a.status === 'P' ? 1 : 0
             };
           }));
        } else {
           const aggMap: Record<string, any> = {};
           absentees.forEach(a => {
             if (!aggMap[a.student_id]) {
                const cls = validClasses.find(c => c.id === a.class_id);
                aggMap[a.student_id] = {
                   id: a.student_id,
                   student_name: (a.students as any)?.full_name || 'មិនស្គាល់',
                   student_id_number: (a.students as any)?.student_id_number || '',
                   gender: (a.students as any)?.gender || '',
                   class_name: cls?.name || '',
                   total: 0,
                   unexcused: 0,
                   excused: 0
                };
             }
             aggMap[a.student_id].total += 1;
             if (a.status === 'absent' || a.status === 'A') {
               aggMap[a.student_id].unexcused += 1;
             } else {
               aggMap[a.student_id].excused += 1;
             }
           });
           setAbsentStudents(Object.values(aggMap).sort((a,b) => b.total - a.total));
        }

        // Leaderboard (simplified to submission existence for the period)
        const lb = validClasses.map(c => {
           // Count unique dates this class submitted
           const classRecords = records.filter(r => r.class_id === c.id);
           const uniqueDates = new Set(classRecords.map(r => r.date)).size;
           // If daily, it's 100% or 0%. If monthly, max ~30 days. Let's just simulate rate based on unique dates.
           // Actually, since we simplified, let's just make it 100% if they submitted *anything* in the selected period, else 0%
           // A more complex query could calculate actual school days vs submitted days.
           const rate = uniqueDates > 0 ? 100 : 0; 
           return {
             id: c.id,
             name: (c.profiles as any)?.full_name || 'មិនមានគ្រូ',
             class_name: c.name,
             rate,
             streak: 0 // Simplification requested by user
           };
        });
        setLeaderboard(lb.sort((a,b) => b.rate - a.rate));

        // Watchlist (High absences this month/period)
        // Just reuse the aggregated data if monthly, otherwise we should calculate it.
        // For simplicity, we just filter absentees that have > 2 absences in the selected period.
        const watchlistMap: Record<string, any> = {};
        absentees.forEach(a => {
           if (!watchlistMap[a.student_id]) {
             const cls = validClasses.find(c => c.id === a.class_id);
             watchlistMap[a.student_id] = {
               id: a.student_id,
               name: (a.students as any)?.full_name || 'មិនស្គាល់',
               class_name: cls?.name || '',
               absences_this_month: 0,
             };
           }
           watchlistMap[a.student_id].absences_this_month += 1;
        });
        const wl = Object.values(watchlistMap)
           .filter(s => s.absences_this_month >= 3)
           .map(s => ({
             ...s,
             status: s.absences_this_month >= 5 ? 'critical' : 'warning'
           }))
           .sort((a,b) => b.absences_this_month - a.absences_this_month);
        setWatchlist(wl);

      } catch (err: any) {
        console.error('Error fetching data:', err.message || err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [timeframe, selectedDate]); // Refresh when timeframe or date changes


  const filteredAbsentees = absentStudents.filter(a => {
    const matchesSearch = a.student_name.includes(searchQuery) || a.student_id_number.includes(searchQuery);
    
    let matchesClass = false;
    if (filterClass === 'all') {
      matchesClass = true;
    } else if (filterClass.startsWith('GRADE:')) {
      const gradeTarget = filterClass.replace('GRADE:', '');
      const validClassNames = dbClasses.filter(c => String(c.grade) === String(gradeTarget)).map(c => c.name);
      matchesClass = validClassNames.includes(a.class_name);
    } else {
      matchesClass = a.class_name === filterClass;
    }
    
    let matchesType = true;
    if (filterType === 'unexcused') {
      matchesType = timeframe === 'daily' ? a.reason.includes('គ្មានការអនុញ្ញាត') : a.unexcused > 0;
    }
    if (filterType === 'excused') {
      matchesType = timeframe === 'daily' ? !a.reason.includes('គ្មានការអនុញ្ញាត') : a.excused > 0;
    }
    
    return matchesSearch && matchesClass && matchesType;
  });

  const totalClasses = classesStatus.length;
  const submittedClasses = classesStatus.filter(c => c.isSubmitted).length;
  const missingClasses = classesStatus.filter(c => !c.isSubmitted);

  const groupedClasses = dbClasses.reduce((acc, cls) => {
    const grade = cls.grade || 'Other';
    if (!acc[grade]) acc[grade] = [];
    acc[grade].push(cls);
    return acc;
  }, {} as Record<string, { id: string; name: string }[]>);

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-bold animate-pulse">កំពុងផ្ទុកទិន្នន័យ...</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            ផ្ទាំងត្រួតពិនិត្យវត្តមានសរុប
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5">
            ទិដ្ឋភាពទូទៅនៃអវត្តមានសិស្សប្រចាំថ្ងៃ {todayStr}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          
          {/* Timeframe Toggle */}
          <div className="flex bg-slate-200/50 p-1 rounded-xl">
            <button 
              onClick={() => setTimeframe('daily')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${timeframe === 'daily' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              ប្រចាំថ្ងៃ
            </button>
            <button 
              onClick={() => setTimeframe('monthly')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${timeframe === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              ប្រចាំខែ
            </button>
            <button 
              onClick={() => setTimeframe('yearly')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${timeframe === 'yearly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              ប្រចាំឆ្នាំ
            </button>
          </div>

          {/* Date Picker */}
          <div className="relative">
            {timeframe === 'daily' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#155EEF]/20 cursor-pointer"
              />
            )}
            {timeframe === 'monthly' && (
              <input
                type="month"
                value={selectedDate.substring(0, 7)}
                onChange={(e) => setSelectedDate(e.target.value + '-01')}
                className="bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#155EEF]/20 cursor-pointer"
              />
            )}
            {timeframe === 'yearly' && (
              <select
                value={selectedDate.substring(0, 4)}
                onChange={(e) => setSelectedDate(e.target.value + '-01-01')}
                className="bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#155EEF]/20 cursor-pointer appearance-none pr-8"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            )}
          </div>

          {/* Export Button */}
          <button
            className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm text-slate-700 hover:bg-slate-50 transition-all font-bold text-sm flex items-center gap-2 cursor-pointer"
            title="ទាញយករបាយការណ៍ (Export to Excel)"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">នាំចេញ</span>
          </button>

          {/* Search Bar */}
          <div className="relative flex-1 sm:flex-none sm:w-56 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ស្វែងរកអវត្តមាន..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-100/80 rounded-full py-2.5 pl-11 pr-4 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155EEF] text-slate-700 placeholder-slate-400 transition-all"
            />
          </div>
        </div>
      </header>



      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 mt-8 mb-6">
        <button
          onClick={() => setActiveTab('call-list')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'call-list' ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
        >
          បញ្ជីសិស្សអវត្តមាន
        </button>
        <button
          onClick={() => setActiveTab('watchlist')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'watchlist' ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
        >
          សិស្សមានហានិភ័យ
        </button>
        <button
          onClick={() => setActiveTab('compliance')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'compliance' ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
        >
          តាមដានគ្រូបង្រៀន
        </button>
      </div>

      {/* COMPLIANCE TAB */}
      {activeTab === 'compliance' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Action Board: Missing Submissions (EWS) */}
        <div className="bg-white rounded-[24px] shadow-xs border border-slate-100/80 overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-rose-500" />
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">ត្រូវតាមដានបន្ទាន់</h3>
              </div>
              <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black px-2 py-0.5 rounded-md">{missingClasses.length} ថ្នាក់</span>
            </div>
            <div className="p-4 flex-1">
              {missingClasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-emerald-600 h-full">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-8 h-8" />
                  </div>
                  <p className="font-bold text-sm text-emerald-600 mt-1">គ្រប់ថ្នាក់រៀនទាំងអស់បានស្រង់វត្តមានរួចរាល់</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {missingClasses.map(c => (
                    <li key={c.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-rose-200 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center font-black text-rose-600 text-sm">
                          {c.name}
                        </div>
                        <span className="font-bold text-slate-600 text-xs">មិនទាន់បញ្ជូន</span>
                      </div>
                      <button className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 group-hover:bg-rose-50 group-hover:text-rose-600 group-hover:border-rose-200 text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2">
                        រំលឹកគ្រូ
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        {/* Teacher Compliance Leaderboard */}
        <div className="bg-white rounded-[24px] shadow-xs border border-slate-100/80 overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3">
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
                ចំណាត់ថ្នាក់គ្រូបន្ទុកថ្នាក់
              </h3>
            </div>
            <div className="p-6">
              <ul className="space-y-5">
                {leaderboard.map((teacher, idx) => (
                  <li key={teacher.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="font-black text-slate-300 text-lg w-4 text-center">
                        {idx + 1}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 text-xs">
                        {teacher.name.substring(0, 1)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{teacher.name}</div>
                        <div className="text-[10px] font-bold text-slate-400">ថ្នាក់ {teacher.class_name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-black text-sm ${teacher.rate === 100 ? 'text-emerald-500' : teacher.rate > 80 ? 'text-amber-500' : 'text-rose-500'}`}>
                        {teacher.rate}%
                      </div>
                      {teacher.streak > 0 && (
                        <div className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 mt-0.5 shadow-xs">
                          🔥 {teacher.streak} ថ្ងៃជាប់គ្នា
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
        </div>
      </div>
      )}

      {/* WATCHLIST TAB */}
      {activeTab === 'watchlist' && (
        <div className="bg-white rounded-[24px] shadow-xs border border-slate-100/80 overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">បញ្ជីសិស្សត្រូវតាមដាន</h3>
              </div>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-white border-b-2 border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">ឈ្មោះសិស្ស</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-center border-b border-slate-100">ថ្នាក់</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">អវត្តមានខែនេះ</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right border-b border-slate-100">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {watchlist.map(student => (
                    <tr key={student.id} className="transition-colors border-l-4 border-l-rose-500 bg-rose-50/10 hover:bg-rose-50/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm bg-rose-100 text-rose-600">
                            {student.name.substring(0, 1)}
                          </div>
                          <div className="font-extrabold text-slate-800 text-sm leading-tight">{student.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex px-3 py-1 bg-white text-slate-700 rounded-full text-xs font-bold border border-slate-200 shadow-sm">{student.class_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-bold border border-rose-200">
                          <AlertTriangle className="w-3 h-3" /> {student.absences_this_month} ដង
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="px-4 py-2 bg-rose-500 text-white hover:bg-rose-600 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-2 ml-auto hover:scale-105 active:scale-95">
                          <Phone className="w-4 h-4" /> ទាក់ទងអាណាព្យាបាល
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      )}

      {/* CALL LIST TAB (Absentees Table) */}
      {activeTab === 'call-list' && (
        <div className="bg-white rounded-[24px] shadow-xs border border-slate-100/80 overflow-hidden flex flex-col">
            
            {/* Table Header & Controls */}
            <div className="p-6 border-b border-slate-100 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">បញ្ជីសិស្សអវត្តមាន</h3>
                  <p className="text-[11px] text-[#64748B] font-medium">បញ្ជីសិស្សដែលត្រូវទាក់ទងអាណាព្យាបាល</p>
                </div>
                
                {/* Type Filter Pills */}
                <div className="flex bg-slate-200/50 p-1 rounded-xl">
                  <button 
                    onClick={() => setFilterType('all')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${filterType === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    ទាំងអស់
                  </button>
                  <button 
                    onClick={() => setFilterType('unexcused')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${filterType === 'unexcused' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    គ្មានច្បាប់
                  </button>
                  <button 
                    onClick={() => setFilterType('excused')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${filterType === 'excused' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    សុំច្បាប់
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative">
                  <button 
                    onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#155EEF]/20 shadow-sm cursor-pointer min-w-[180px] text-left flex justify-between items-center"
                  >
                    <span>
                      {filterClass === 'all' 
                        ? 'គ្រប់ថ្នាក់ទាំងអស់' 
                        : filterClass.startsWith('GRADE:') 
                          ? `ថ្នាក់ទី ${filterClass.replace('GRADE:', '')} ទាំងអស់` 
                          : `ថ្នាក់ ${filterClass}`}
                    </span>
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {isClassDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsClassDropdownOpen(false)}></div>
                      <div className="absolute left-0 mt-2 w-[300px] sm:w-[500px] bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden flex flex-col p-5 gap-4">
                        <button
                          onClick={() => { setFilterClass('all'); setIsClassDropdownOpen(false); }}
                          className={`w-full text-center px-4 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer ${filterClass === 'all' ? 'bg-[#155EEF] text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                          បង្ហាញគ្រប់ថ្នាក់ទាំងអស់
                        </button>
                        
                        <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                          {(Object.entries(groupedClasses) as any[]).sort(([gA], [gB]) => gA.localeCompare(gB, undefined, { numeric: true })).map(([grade, classes]: [string, any[]]) => (
                            <div key={grade} className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                              <div className="sm:w-24 shrink-0 flex flex-col items-start gap-1 sm:mt-1">
                                <div className="font-extrabold text-slate-400 text-xs">
                                  ថ្នាក់ទី {grade}
                                </div>
                                <button
                                  onClick={() => { setFilterClass(`GRADE:${grade}`); setIsClassDropdownOpen(false); }}
                                  className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors cursor-pointer ${filterClass === `GRADE:${grade}` ? 'bg-[#155EEF] text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}
                                >
                                  ទាំងអស់
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2 flex-1">
                                {classes.map((c: any) => (
                                  <button
                                    key={c.id}
                                    onClick={() => { setFilterClass(c.name); setIsClassDropdownOpen(false); }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${filterClass === c.name ? 'bg-[#155EEF] text-white shadow-sm ring-2 ring-[#155EEF]/20' : 'bg-white border border-slate-200 text-slate-600 hover:border-[#155EEF]/50 hover:bg-blue-50'}`}
                                  >
                                    {c.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="relative w-full sm:w-64 group">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#155EEF] transition-colors" />
                <input
                  type="text"
                  placeholder="ស្វែងរកអវត្តមានសិស្ស..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#155EEF]/20 transition-all shadow-sm"
                />
              </div>
            </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-white border-b-2 border-slate-100">
                  <tr>
                    <th className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">ឈ្មោះសិស្ស</th>
                    <th className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-wider text-center border-b border-slate-100">ថ្នាក់</th>
                    {timeframe === 'daily' ? (
                      <th className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">មូលហេតុ (ថ្ងៃនេះ)</th>
                    ) : (
                      <th className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">អវត្តមានសរុប</th>
                    )}
                    <th className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-wider text-right border-b border-slate-100">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAbsentees.map((a, idx) => {
                    const isUnexcused = timeframe === 'daily' ? a.reason.includes('គ្មានការអនុញ្ញាត') : a.unexcused > 0;
                    
                    return (
                    <tr key={idx} className={`transition-colors border-l-[3px] ${isUnexcused ? 'border-l-rose-500 bg-rose-50/10 hover:bg-rose-50/30' : 'border-l-transparent hover:bg-slate-50'}`}>
                      <td className="px-6 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${isUnexcused ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                            {a.student_name.substring(0, 1)}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-800 text-sm leading-tight">{a.student_name}</div>
                            <div className="font-bold text-slate-400 text-[10px] mt-0.5 tracking-wider">{a.student_id_number}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-2.5 text-center">
                        <span className="inline-flex px-3 py-1 bg-white text-slate-700 rounded-full text-xs font-bold border border-slate-200 shadow-sm">{a.class_name}</span>
                      </td>
                      <td className="px-6 py-2.5">
                        {timeframe === 'daily' ? (
                          a.reason.includes('គ្មានការអនុញ្ញាត') ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[11px] font-bold border border-rose-200">
                              <AlertTriangle className="w-3.5 h-3.5" /> គ្មានច្បាប់
                            </span>
                          ) : (
                            <span className="inline-flex px-3 py-1 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded-full text-[11px] font-bold">
                              {a.reason}
                            </span>
                          )
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-700 text-sm">{a.total} ដង</span>
                            {a.unexcused > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md text-[10px] font-bold border border-rose-200">
                                {a.unexcused} គ្មានច្បាប់
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-2.5 text-right">
                        {isUnexcused ? (
                          <button className="px-4 py-1.5 bg-rose-500 text-white hover:bg-rose-600 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ml-auto hover:scale-105 active:scale-95 cursor-pointer">
                            <Phone className="w-3.5 h-3.5" /> ទាក់ទង
                          </button>
                        ) : (
                          <button className="px-4 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer">
                            មើលប្រវត្តិ
                          </button>
                        )}
                      </td>
                    </tr>
                  )})}
                  {filteredAbsentees.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-slate-500 font-bold">គ្មានទិន្នន័យអវត្តមាន</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        </div>
      )}
        </div>
  );
}
