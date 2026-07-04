'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Student, AttendanceRecord, AttendanceStatus, RootCauseAbsence } from '@/types';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Download,
  Search,
  Filter,
  AlertTriangle,
  Home,
  HelpCircle,
  Calendar,
  Users
} from 'lucide-react';
import Link from 'next/link';

const ROOT_CAUSE_OPTIONS: { value: RootCauseAbsence; label: string }[] = [
  { value: 'farming', label: '🌾 ជួយការងារស្រែចម្ការ / គ្រួសារ' },
  { value: 'poverty', label: '💸 ជីវភាពខ្វះខាត / គ្មានលុយចាយប្រចាំថ្ងៃ' },
  { value: 'illness', label: '🏥 ឈឺ / បញ្ហាសុខភាព' },
  { value: 'transport', label: '🚲 ខ្វះមធ្យោបាយធ្វើដំណើរ / ផ្លូវលិចទឹក' },
  { value: 'migration', label: '🚚 គ្រួសារចំណាកស្រុក' },
  { value: 'other', label: '❓ មូលហេតុផ្សេងៗ' },
];

const DEMO_STUDENTS_ATT: Student[] = [
  { id: 'std-1', class_id: 'demo-class-1', student_id_number: 'ID-001', full_name: 'កែវ ច័ន្ទធីតា', gender: 'F', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-2', class_id: 'demo-class-1', student_id_number: 'ID-002', full_name: 'ខៀវ សុវណ្ណារាជ', gender: 'M', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-3', class_id: 'demo-class-1', student_id_number: 'ID-003', full_name: 'ចាន់ សុភាព', gender: 'F', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-4', class_id: 'demo-class-1', student_id_number: 'ID-004', full_name: 'ដួង រដ្ឋា', gender: 'M', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-5', class_id: 'demo-class-1', student_id_number: 'ID-005', full_name: 'ទិត្យ វិសាល', gender: 'M', is_active: true, created_at: new Date().toISOString() },
  { id: 'std-6', class_id: 'demo-class-1', student_id_number: 'ID-006', full_name: 'ប៊ុន រស្មី', gender: 'F', is_active: true, created_at: new Date().toISOString() },
];

export default function AttendanceBoard() {
  const { activeClass, user, isDemoMode } = useAuth();
  const [students, setStudents] = useState<Student[]>(DEMO_STUDENTS_ATT);
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [rootCauses, setRootCauses] = useState<Record<string, RootCauseAbsence>>({ 'std-5': 'farming', 'std-3': 'illness' });
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'realtime'>('synced');

  const supabase = createClient();

  useEffect(() => {
    if (isDemoMode || !activeClass) {
      setStudents(DEMO_STUDENTS_ATT);
      setRecords({ 'std-1': 'present', 'std-2': 'present', 'std-3': 'permission', 'std-4': 'present', 'std-5': 'absent', 'std-6': 'present' });
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
          .from('attendance_records')
          .select('*')
          .eq('class_id', activeClass?.id || '')
          .eq('date', selectedDate);

        const newMap: Record<string, AttendanceStatus> = {};
        const newCauseMap: Record<string, RootCauseAbsence> = {};
        if (attData) {
          attData.forEach((rec: any) => {
            newMap[rec.student_id] = rec.status;
            if (rec.root_cause) newCauseMap[rec.student_id] = rec.root_cause;
          });
        }
        setRecords(newMap);
        setRootCauses(newCauseMap);
      } catch (e) {
        console.error('Error loading attendance:', e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [activeClass, selectedDate, isDemoMode]);

  async function handleMarkStatus(studentId: string, status: AttendanceStatus) {
    setRecords((prev) => ({ ...prev, [studentId]: status }));
    setSyncStatus('syncing');

    if (isDemoMode || !activeClass) {
      setTimeout(() => setSyncStatus('synced'), 400);
      return;
    }

    try {
      await supabase.from('attendance_records').upsert({
        class_id: activeClass.id,
        student_id: studentId,
        date: selectedDate,
        status,
        root_cause: rootCauses[studentId] || null,
        recorded_by: user?.id || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'class_id,student_id,date' });

      setSyncStatus('synced');
    } catch (e) {
      console.error('Failed to sync attendance:', e);
      setSyncStatus('synced');
    }
  }

  function handleRootCauseChange(studentId: string, cause: RootCauseAbsence) {
    setRootCauses((prev) => ({ ...prev, [studentId]: cause }));
  }

  async function handleMarkAll(status: AttendanceStatus) {
    const newMap: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      newMap[s.id] = status;
    });
    setRecords(newMap);
    setSyncStatus('syncing');

    if (isDemoMode || !activeClass) {
      setTimeout(() => setSyncStatus('synced'), 400);
      return;
    }

    const upsertPayload = students.map((s) => ({
      class_id: activeClass.id,
      student_id: s.id,
      date: selectedDate,
      status,
      root_cause: rootCauses[s.id] || null,
      recorded_by: user?.id || null,
      updated_at: new Date().toISOString(),
    }));

    await supabase.from('attendance_records').upsert(upsertPayload, { onConflict: 'class_id,student_id,date' });
    setSyncStatus('synced');
  }

  const filteredStudents = students.filter((s) =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.student_id_number && s.student_id_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const total = students.length;
  const presentCount = Object.values(records).filter((v) => v === 'present' || v === 'P').length;
  const absentCount = Object.values(records).filter((v) => v === 'absent' || v === 'A').length;
  const lateCount = Object.values(records).filter((v) => v === 'late' || v === 'L').length;
  const permCount = Object.values(records).filter((v) => v === 'permission' || v === 'E').length;

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
          <Calendar className="w-4 h-4" /> ថ្ងៃខែឆ្នាំ
        </h2>
        <div className="flex items-center gap-2">
          <input 
            type="date" 
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer"
          />
        </div>
      </div>

      {absentCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-black shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-rose-900">
                🔴 ប្រព័ន្ធប្រកាសអាសន្ន EWS៖ មានសិស្ស {absentCount} នាក់អវត្តមានឥតច្បាប់នៅថ្ងៃនេះ!
              </div>
              <div className="text-[11px] font-bold text-rose-700 mt-0.5">
                គម្រោង GEIP តម្រូវឱ្យគ្រូបន្ទុកថ្នាក់បញ្ជាក់មូលហេតុអវត្តមាន និងចុះសួរសុខទុក្ខដល់ផ្ទះបើអវត្តមានលើសពី 3 ថ្ងៃ។
              </div>
            </div>
          </div>
          <Link
            href="/students"
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs text-center shrink-0 shadow-sm transition-all"
          >
            📝 កត់ត្រាចុះដល់ផ្ទះឥឡូវនេះ
          </Link>
        </div>
      )}

      {/* Stats Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-[#FFCF59] p-4 rounded-[20px] border border-yellow-400/30 text-center shadow-2xs">
          <span className="text-[11px] font-extrabold text-yellow-950 uppercase">សិស្សសរុប</span>
          <div className="text-2xl font-black text-slate-900 mt-0.5">{total} នាក់</div>
        </div>
        <div className="bg-white p-4 rounded-[20px] border border-slate-200 text-center shadow-2xs">
          <span className="text-[11px] font-extrabold text-emerald-600 uppercase">វត្តមាន (P)</span>
          <div className="text-2xl font-black text-emerald-600 mt-0.5">{presentCount} នាក់</div>
        </div>
        <div className="bg-white p-4 rounded-[20px] border border-slate-200 text-center shadow-2xs">
          <span className="text-[11px] font-extrabold text-rose-600 uppercase">អវត្តមាន (A)</span>
          <div className="text-2xl font-black text-rose-600 mt-0.5">{absentCount} នាក់</div>
        </div>
        <div className="bg-white p-4 rounded-[20px] border border-slate-200 text-center shadow-2xs">
          <span className="text-[11px] font-extrabold text-amber-600 uppercase">យឺត (L)</span>
          <div className="text-2xl font-black text-amber-600 mt-0.5">{lateCount} នាក់</div>
        </div>
        <div className="bg-[#155EEF] p-4 rounded-[20px] border border-blue-400/30 text-center text-white shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-extrabold text-blue-100 uppercase">ច្បាប់ (E)</span>
          <div className="text-2xl font-black text-white mt-0.5">{permCount} នាក់</div>
        </div>
      </div>

      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <h3 className="font-bold text-slate-800 text-lg">បញ្ជីសិស្ស ({students.length})</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
            {syncStatus === 'syncing' ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-[#155EEF]" />
                <span>កំពុងរក្សាទុក...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>បានរក្សាទុក</span>
              </>
            )}
          </div>
          <button onClick={() => handleMarkAll('present')} className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full font-bold text-sm hover:bg-emerald-100 transition-colors flex items-center gap-2 cursor-pointer">
            <CheckCircle2 className="w-4 h-4" /> វត្តមានទាំងអស់
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <th className="pb-3 pl-4 w-12 text-center">ល.រ</th>
              <th className="pb-3 px-2">អត្តលេខ</th>
              <th className="pb-3 px-4">នាមត្រកូល និងនាមខ្លួន</th>
              <th className="pb-3 px-2 text-center">ភេទ</th>
              <th className="pb-3 px-4 text-center">ស្ថានភាពអវត្តមាន</th>
              <th className="pb-3 px-4">មូលហេតុ (GEIP)</th>
            </tr>
          </thead>
          <tbody className="text-sm font-medium text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                  កំពុងទាញយកបញ្ជីសិស្ស...
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                  មិនមានសិស្សនៅក្នុងថ្នាក់នេះទេ
                </td>
              </tr>
            ) : (
              filteredStudents.map((std, idx) => {
                const currentStatus = records[std.id];
                const isAbsentOrExcused = currentStatus === 'absent' || currentStatus === 'A' || currentStatus === 'permission' || currentStatus === 'E';

                return (
                  <tr key={std.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-4 px-2 font-mono text-xs text-slate-500">{std.student_id_number || `ID-${idx + 101}`}</td>
                    <td className="py-4 px-4 font-black text-slate-800">{std.full_name}</td>
                    <td className="py-4 px-2 text-center text-slate-500 font-bold">{std.gender === 'F' || std.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-3">
                        
                        <label className={`flex items-center gap-1.5 cursor-pointer px-4 py-2 rounded-full border transition-colors select-none ${currentStatus === 'present' || currentStatus === 'P' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                          <input 
                            type="radio" 
                            name={`status-${std.id}`} 
                            value="present"
                            checked={currentStatus === 'present' || currentStatus === 'P'}
                            onChange={() => handleMarkStatus(std.id, 'present')}
                            className="hidden"
                          />
                          <span className="font-extrabold text-xs">វត្តមាន</span>
                        </label>

                        <label className={`flex items-center gap-1.5 cursor-pointer px-4 py-2 rounded-full border transition-colors select-none ${currentStatus === 'absent' || currentStatus === 'A' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                          <input 
                            type="radio" 
                            name={`status-${std.id}`} 
                            value="absent"
                            checked={currentStatus === 'absent' || currentStatus === 'A'}
                            onChange={() => handleMarkStatus(std.id, 'absent')}
                            className="hidden"
                          />
                          <span className="font-extrabold text-xs">អវត្តមាន</span>
                        </label>

                        <label className={`flex items-center gap-1.5 cursor-pointer px-4 py-2 rounded-full border transition-colors select-none ${currentStatus === 'permission' || currentStatus === 'E' ? 'bg-[#155EEF]/10 border-[#155EEF]/30 text-[#155EEF]' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                          <input 
                            type="radio" 
                            name={`status-${std.id}`} 
                            value="permission"
                            checked={currentStatus === 'permission' || currentStatus === 'E'}
                            onChange={() => handleMarkStatus(std.id, 'permission')}
                            className="hidden"
                          />
                          <span className="font-extrabold text-xs">ច្បាប់</span>
                        </label>

                        <label className={`flex items-center gap-1.5 cursor-pointer px-4 py-2 rounded-full border transition-colors select-none ${currentStatus === 'late' || currentStatus === 'L' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                          <input 
                            type="radio" 
                            name={`status-${std.id}`} 
                            value="late"
                            checked={currentStatus === 'late' || currentStatus === 'L'}
                            onChange={() => handleMarkStatus(std.id, 'late')}
                            className="hidden"
                          />
                          <span className="font-extrabold text-xs">យឺត</span>
                        </label>

                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {isAbsentOrExcused ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={rootCauses[std.id] || 'farming'}
                            onChange={(e) => handleRootCauseChange(std.id, e.target.value as RootCauseAbsence)}
                            className="w-full max-w-[200px] p-2 rounded-xl bg-amber-50/80 border border-amber-300 text-[10px] font-bold text-amber-950 focus:outline-none focus:border-[#155EEF]"
                          >
                            {ROOT_CAUSE_OPTIONS.map((rc) => (
                              <option key={rc.value} value={rc.value}>{rc.label}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>គ្មានបញ្ហា EWS</span>
                        </span>
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
  );
}
