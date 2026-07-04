'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Student, MonthlyAttendanceSummary, RootCauseAbsence } from '@/types';
import {
  CalendarCheck,
  CheckCircle2,
  RefreshCw,
  Search,
  AlertTriangle,
  Calendar,
  Users,
  AlertCircle,
  Percent
} from 'lucide-react';
import Link from 'next/link';

const ROOT_CAUSE_OPTIONS: { value: RootCauseAbsence; label: string }[] = [
  { value: 'farming', label: '🌾 ជួយការងារស្រែចម្ការ' },
  { value: 'poverty', label: '💸 ជីវភាពខ្វះខាត' },
  { value: 'illness', label: '🏥 ឈឺ / សុខភាព' },
  { value: 'transport', label: '🚲 គ្មានមធ្យោបាយ' },
  { value: 'migration', label: '🚚 ចំណាកស្រុក' },
  { value: 'other', label: '❓ ផ្សេងៗ' },
];

const DEMO_STUDENTS_ATT: Student[] = [
  { id: 'std-1', class_id: 'demo-class-1', student_id_number: 'ID-001', full_name: 'កែវ ច័ន្ទធីតា', gender: 'F', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-2', class_id: 'demo-class-1', student_id_number: 'ID-002', full_name: 'ខៀវ សុវណ្ណារាជ', gender: 'M', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-3', class_id: 'demo-class-1', student_id_number: 'ID-003', full_name: 'ចាន់ សុភាព', gender: 'F', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-4', class_id: 'demo-class-1', student_id_number: 'ID-004', full_name: 'ដួង រដ្ឋា', gender: 'M', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-5', class_id: 'demo-class-1', student_id_number: 'ID-005', full_name: 'ទិត្យ វិសាល', gender: 'M', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-6', class_id: 'demo-class-1', student_id_number: 'ID-006', full_name: 'ប៊ុន រស្មី', gender: 'F', is_active: true, created_at: new Date().toISOString() },
];

export default function MonthlyAttendanceForm() {
  const { activeClass, user, isDemoMode } = useAuth();
  const [students, setStudents] = useState<Student[]>(DEMO_STUDENTS_ATT);
  
  // Format current month to YYYY-MM
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Stats
  const [totalSchoolDays, setTotalSchoolDays] = useState<number>(25);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // State to hold form data
  const [formData, setFormData] = useState<Record<string, { 
    absent_count: number; 
    permission_count: number; 
    late_count: number;
    root_cause?: RootCauseAbsence | null;
    needs_home_visit?: boolean;
  }>>({});

  const supabase = createClient();

  useEffect(() => {
    if (isDemoMode || !activeClass) {
      setStudents(DEMO_STUDENTS_ATT);
      // Demo data
      setFormData({
        'std-1': { absent_count: 0, permission_count: 0, late_count: 0 },
        'std-5': { absent_count: 4, permission_count: 1, late_count: 0, root_cause: 'farming', needs_home_visit: true },
      });
      return;
    }

    async function loadData() {
      setLoading(true);
      try {
        const { data: stdData } = await supabase
          .from('students')
          .select('*')
          .eq('class_id', activeClass?.id || '')
          .order('full_name', { ascending: true });

        if (stdData && stdData.length > 0) {
          setStudents(stdData as Student[]);
        } else {
          setStudents(DEMO_STUDENTS_ATT);
        }

        const { data: attData } = await supabase
          .from('monthly_attendance_summaries')
          .select('*')
          .eq('class_id', activeClass?.id || '')
          .eq('month', selectedMonth);

        const newMap: Record<string, any> = {};
        
        // Initialize empty for all students
        const allStudents = stdData && stdData.length > 0 ? stdData : DEMO_STUDENTS_ATT;
        allStudents.forEach((s) => {
          newMap[s.id] = { absent_count: 0, permission_count: 0, late_count: 0, root_cause: null, needs_home_visit: false };
        });

        // Fill with fetched data
        if (attData) {
          attData.forEach((rec: any) => {
            newMap[rec.student_id] = {
              absent_count: rec.absent_count || 0,
              permission_count: rec.permission_count || 0,
              late_count: rec.late_count || 0,
              root_cause: rec.root_cause || null,
              needs_home_visit: rec.needs_home_visit || false
            };
          });
        }
        setFormData(newMap);
        setHasUnsavedChanges(false);
      } catch (e) {
        console.error('Error loading monthly attendance:', e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [activeClass, selectedMonth, isDemoMode]);

  async function handleInputChange(studentId: string, field: 'absent_count' | 'permission_count' | 'late_count', value: string) {
    const numValue = parseInt(value, 10) || 0;
    setFormData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: numValue
      }
    }));
    setHasUnsavedChanges(true);
  }

  function handleRootCauseChange(studentId: string, cause: RootCauseAbsence | '') {
    setFormData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        root_cause: cause === '' ? null : cause as RootCauseAbsence
      }
    }));
    setHasUnsavedChanges(true);
  }

  function handleHomeVisitToggle(studentId: string) {
    setFormData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        needs_home_visit: !prev[studentId].needs_home_visit
      }
    }));
    setHasUnsavedChanges(true);
  }

  async function handleSaveAll() {
    setSyncStatus('syncing');

    if (isDemoMode || !activeClass) {
      setTimeout(() => {
        setSyncStatus('synced');
        setHasUnsavedChanges(false);
      }, 600);
      return;
    }

    try {
      const upsertPayload = students.map((s) => ({
        class_id: activeClass.id,
        student_id: s.id,
        month: selectedMonth,
        absent_count: formData[s.id]?.absent_count || 0,
        permission_count: formData[s.id]?.permission_count || 0,
        late_count: formData[s.id]?.late_count || 0,
        root_cause: formData[s.id]?.root_cause || null,
        needs_home_visit: formData[s.id]?.needs_home_visit || false,
        recorded_by: user?.id || null,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('monthly_attendance_summaries')
        .upsert(upsertPayload, { onConflict: 'class_id,student_id,month' });

      if (error) throw error;
      setSyncStatus('synced');
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error('Failed to sync monthly attendance:', e);
      setSyncStatus('error');
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    let nextRow = rowIndex;
    let nextCol = colIndex;

    switch (e.key) {
      case 'ArrowUp':
        nextRow -= 1;
        break;
      case 'ArrowDown':
      case 'Enter':
        nextRow += 1;
        break;
      case 'ArrowLeft':
        nextCol -= 1;
        break;
      case 'ArrowRight':
        nextCol += 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    const nextInputId = `input-${nextRow}-${nextCol}`;
    const nextInput = document.getElementById(nextInputId) as HTMLInputElement | null;
    if (nextInput) {
      nextInput.focus();
    }
  };

  const filteredStudents = students.filter((s) =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.student_id_number && s.student_id_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate Stats
  const stats = useMemo(() => {
    let totalAbsent = 0;
    let ewsAlerts = 0;
    
    Object.values(formData).forEach(data => {
      totalAbsent += (data.absent_count || 0);
      if ((data.absent_count || 0) > 3) {
        ewsAlerts += 1;
      }
    });

    const totalPossibleDays = students.length * totalSchoolDays;
    const attendanceRate = totalPossibleDays > 0 
      ? Math.max(0, ((totalPossibleDays - totalAbsent) / totalPossibleDays) * 100).toFixed(1)
      : '100.0';

    return { totalAbsent, ewsAlerts, attendanceRate };
  }, [formData, students.length, totalSchoolDays]);

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
          <Calendar className="w-4 h-4" /> ជ្រើសរើសខែ
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span>ចំនួនថ្ងៃរៀនសរុប៖</span>
            <input 
              type="number" 
              value={totalSchoolDays}
              onChange={e => setTotalSchoolDays(Number(e.target.value) || 0)}
              className="w-12 bg-transparent text-center font-black text-[#155EEF] focus:outline-none"
              min="1"
              max="31"
            />
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer"
          />
        </div>
      </div>
      
      {/* Stats Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-[11px] font-extrabold text-slate-500 uppercase">
            <Users className="w-3.5 h-3.5" /> សិស្សសរុប
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{students.length} <span className="text-sm text-slate-500 font-bold">នាក់</span></div>
        </div>
        
        <div className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-[11px] font-extrabold text-rose-600 uppercase">
            <AlertCircle className="w-3.5 h-3.5" /> ឥតច្បាប់សរុប
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">{stats.totalAbsent} <span className="text-sm text-rose-400 font-bold">ថ្ងៃ</span></div>
        </div>
        
        <div className={`p-4 rounded-[20px] border shadow-sm flex flex-col justify-center transition-colors ${stats.ewsAlerts > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
          <div className={`flex items-center gap-2 text-[11px] font-extrabold uppercase ${stats.ewsAlerts > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
            <AlertTriangle className="w-3.5 h-3.5" /> សិស្សប្រឈមគ្រោះថ្នាក់ (&gt;3 ថ្ងៃ)
          </div>
          <div className={`text-2xl font-black mt-1 ${stats.ewsAlerts > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {stats.ewsAlerts} <span className={`text-sm font-bold ${stats.ewsAlerts > 0 ? 'text-rose-500' : 'text-slate-500'}`}>នាក់</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-[#155EEF] to-blue-700 p-4 rounded-[20px] border border-blue-800 shadow-sm flex flex-col justify-center text-white">
          <div className="flex items-center gap-2 text-[11px] font-extrabold text-blue-100 uppercase">
            <Percent className="w-3.5 h-3.5" /> អត្រាវត្តមានរួម
          </div>
          <div className="text-2xl font-black mt-1 text-white">
            {stats.attendanceRate}%
          </div>
        </div>
      </div>

      {syncStatus === 'error' && (
        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ។ សូមព្យាយាមម្តងទៀត!
        </div>
      )}

      {/* Quick Search and Save Button */}
      <div className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-2xs flex flex-wrap justify-between items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="ស្វែងរកឈ្មោះសិស្ស..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#155EEF]"
          />
        </div>
        
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-xs font-bold text-rose-500 animate-pulse flex items-center gap-1.5 hidden sm:flex">
              <AlertTriangle className="w-3.5 h-3.5" /> មិនទាន់រក្សាទុកទេ
            </span>
          )}
          <button
            onClick={handleSaveAll}
            disabled={syncStatus === 'syncing' || (!hasUnsavedChanges && syncStatus === 'synced')}
            className={`px-6 py-2.5 text-white rounded-full text-xs font-black shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
              hasUnsavedChanges 
                ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200 ring-2 ring-rose-500 ring-offset-2' 
                : 'bg-[#155EEF] hover:bg-blue-700 shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed'
            }`}
          >
            {syncStatus === 'syncing' ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> កំពុងរក្សាទុក...</>
            ) : hasUnsavedChanges ? (
              <><AlertTriangle className="w-4 h-4" /> រក្សាទុកការផ្លាស់ប្តូរ</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> រក្សាទុកទិន្នន័យរួចរាល់</>
            )}
          </button>
        </div>
      </div>
      
      {/* Table wrapped in new card style */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <th className="pb-3 pl-4 w-12 text-center">ល.រ</th>
              <th className="pb-3 px-4">អត្តលេខ</th>
              <th className="pb-3 px-5">គោត្តនាម & នាម</th>
              <th className="pb-3 px-3 text-center">ភេទ</th>
              <th className="pb-3 px-3 text-center text-rose-600">ឥតច្បាប់ (A)</th>
              <th className="pb-3 px-3 text-center text-[#155EEF]">ច្បាប់ (E)</th>
              <th className="pb-3 px-3 text-center text-purple-600">សរុប (Total)</th>
              <th className="pb-3 px-4 text-center">មូលហេតុ (Root Cause)</th>
              <th className="pb-3 px-4 text-center">ចុះសួរសុខទុក្ខ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                  {loading ? 'កំពុងទាញទិន្នន័យ...' : 'មិនមានទិន្នន័យសិស្សទេ។'}
                </td>
              </tr>
            ) : (
              filteredStudents.map((std, index) => {
                const stdData = formData[std.id] || { absent_count: 0, permission_count: 0, late_count: 0, root_cause: null, needs_home_visit: false };
                const isHighAbsent = stdData.absent_count > 3;
                
                return (
                  <tr key={std.id} className={`hover:bg-slate-50/80 transition-colors ${isHighAbsent ? 'bg-rose-50/30' : ''}`}>
                    <td className="py-4 pl-4 text-center text-slate-400 font-bold">{index + 1}</td>
                    <td className="py-4 px-4 font-mono text-xs text-slate-500">{std.student_id_number || `ID-${index + 101}`}</td>
                    <td className="py-4 px-5 font-black text-slate-800">
                      <div className="flex items-center gap-2">
                        {std.full_name}
                        {isHighAbsent && <span title="ប្រឈមគ្រោះថ្នាក់បោះបង់ការសិក្សា"><AlertTriangle className="w-3.5 h-3.5 text-rose-500" /></span>}
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        std.gender === 'F' || std.gender === 'ស្រី'
                          ? 'bg-pink-100 text-pink-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {std.gender === 'F' || std.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'}
                      </span>
                    </td>
                    
                    <td className="py-3 px-3">
                      <div className="flex justify-center">
                        <input 
                          id={`input-${index}-0`}
                          type="number" 
                          min="0" 
                          max="31"
                          value={stdData.absent_count === 0 ? '' : stdData.absent_count}
                          placeholder="0"
                          onChange={(e) => handleInputChange(std.id, 'absent_count', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 0)}
                          onFocus={(e) => e.target.select()}
                          className="w-14 p-2 text-center text-sm font-black text-rose-600 bg-rose-50 border border-rose-200 rounded-lg focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex justify-center">
                        <input 
                          id={`input-${index}-1`}
                          type="number" 
                          min="0" 
                          max="31"
                          value={stdData.permission_count === 0 ? '' : stdData.permission_count}
                          placeholder="0"
                          onChange={(e) => handleInputChange(std.id, 'permission_count', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 1)}
                          onFocus={(e) => e.target.select()}
                          className="w-14 p-2 text-center text-sm font-black text-[#155EEF] bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:border-[#155EEF] focus:ring-1 focus:ring-[#155EEF] transition-all"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex justify-center">
                        <div className="w-14 p-2 text-center text-sm font-black text-purple-600 bg-purple-50 border border-purple-200 rounded-lg select-none">
                          {(stdData.absent_count || 0) + (stdData.permission_count || 0)}
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-3 px-4">
                      {stdData.permission_count > 0 ? (
                        <select
                          value={stdData.root_cause || ''}
                          onChange={(e) => handleRootCauseChange(std.id, e.target.value as RootCauseAbsence | '')}
                          className="w-full max-w-[160px] p-2 rounded-xl bg-amber-50/80 border border-amber-200 text-[10px] font-bold text-amber-950 focus:outline-none focus:border-[#155EEF] mx-auto block"
                        >
                          <option value="">--ជ្រើសរើស--</option>
                          {ROOT_CAUSE_OPTIONS.map((rc) => (
                            <option key={rc.value} value={rc.value}>{rc.label}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-[10px] text-slate-300 text-center font-medium">-</div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                       {isHighAbsent ? (
                         <button
                           onClick={() => handleHomeVisitToggle(std.id)}
                           className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                             stdData.needs_home_visit 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-rose-500 text-white border-rose-600 shadow-sm shadow-rose-200 hover:bg-rose-600 animate-pulse'
                           }`}
                         >
                           {stdData.needs_home_visit ? '✓ បានចុះទៅ' : 'ត្រូវការចុះបន្ទាន់'}
                         </button>
                       ) : stdData.absent_count > 0 ? (
                          <button
                           onClick={() => handleHomeVisitToggle(std.id)}
                           className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                             stdData.needs_home_visit 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                           }`}
                         >
                           {stdData.needs_home_visit ? '✓ បានចុះទៅ' : 'មិនចាំបាច់'}
                         </button>
                       ) : (
                         <div className="text-[10px] text-slate-300 text-center font-medium">-</div>
                       )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
