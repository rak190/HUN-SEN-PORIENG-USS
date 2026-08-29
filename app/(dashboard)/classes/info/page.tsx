'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Printer, Download, Users, Activity, TrendingUp, BarChart3, Calendar, User, ArrowUpRight, GraduationCap } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import ClassSchedule from '@/components/classes/ClassSchedule';
import { Student } from '@/types';

export default function ClassInfoPage() {
  const { activeClass, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'stats'>('info');
  const [students, setStudents] = useState<Student[]>([]);
  const [teacherName, setTeacherName] = useState<string>('មិនទាន់កំណត់');
  const [academicYear, setAcademicYear] = useState<string>('២០២៥-២០២៦');
  const [attRate, setAttRate] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function loadClassData() {
      if (!activeClass) {
        setStudents([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. Fetch Students
        const { data: stdData } = await supabase
          .from('students')
          .select('*')
          .eq('class_id', activeClass.id)
          .eq('is_active', true)
          .order('full_name', { ascending: true });

        setStudents((stdData as Student[]) || []);

        // 2. Fetch Teacher Profile
        if (activeClass.teacher_id) {
          const { data: teacherData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', activeClass.teacher_id)
            .single();

          if (teacherData?.full_name) {
            setTeacherName(teacherData.full_name);
          }
        } else if (profile?.role === 'teacher' && profile.full_name) {
          setTeacherName(profile.full_name);
        } else {
          setTeacherName('មិនទាន់កំណត់');
        }

        // 3. Fetch Academic Year
        if (activeClass.academic_year_id) {
          const { data: yrData } = await supabase
            .from('academic_years')
            .select('name')
            .eq('id', activeClass.academic_year_id)
            .single();
          if (yrData?.name) setAcademicYear(yrData.name);
        }

        // 4. Calculate Attendance Rate for this class in current month
        const curMonth = new Date().toISOString().slice(0, 7);
        const { data: attData } = await supabase
          .from('attendance_records')
          .select('status')
          .eq('class_id', activeClass.id)
          .gte('date', `${curMonth}-01`)
          .lte('date', `${curMonth}-31`);

        if (attData && attData.length > 0) {
          const present = attData.filter(r => r.status === 'present' || r.status === 'P').length;
          setAttRate(Math.round((present / attData.length) * 100));
        } else {
          setAttRate(0);
        }
      } catch (err) {
        console.error('Error loading class info:', err);
      } finally {
        setLoading(false);
      }
    }

    loadClassData();
  }, [activeClass?.id, activeClass?.teacher_id, profile]);

  const girlsCount = students.filter(s => s.gender === 'F' || s.gender === 'ស្រី').length;
  const boysCount = students.filter(s => s.gender === 'M' || s.gender === 'ប្រុស').length;

  return (
    <div className="p-6 space-y-6 animate-fadeIn pb-12 print:p-0 print:space-y-0 print:pb-0 print:font-siemreap [&_h1]:print:font-moul [&_h2]:print:font-moul [&_h3]:print:font-moul [&_h4]:print:font-moul">
      {/* Header with Sub-tabs and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6 print:hidden">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-[#155EEF]" />
            <span>ព័ត៌មានថ្នាក់រៀន</span>
          </h1>
          <p className="text-xs font-semibold text-[#64748B]">
            ព័ត៌មានលម្អិតថ្នាក់រៀន កាលវិភាគបង្រៀន និងស្ថិតិសិស្សានុសិស្ស
          </p>
          
          {/* Sub-tabs (Pill Menu) */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-fit print:hidden border border-slate-200/60 mt-1">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-5 py-2 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer ${
                activeTab === 'info' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              ព័ត៌មានទូទៅ
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-5 py-2 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'stats' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" /> ស្ថិតិថ្នាក់រៀន
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden shrink-0 self-start sm:self-auto mt-2 sm:mt-0">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-blue-500/20 cursor-pointer hover:scale-105 active:scale-95"
          >
            <Printer className="w-4 h-4" /> បោះពុម្ព
          </button>
        </div>
      </div>

      {activeTab === 'info' ? (
        <>
        {/* ================= 4 STATE CARDS (MAIN CONCEPT STYLE) ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 print:hidden">
          {/* Card 1: ថ្នាក់រៀន */}
          <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[140px] border border-yellow-400/40">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">
                  {activeClass?.name || 'មិនទាន់ជ្រើស'}
                </h2>
                {activeClass?.grade && (
                  <span className="inline-flex items-center text-[11px] font-black text-yellow-950 bg-yellow-400/50 px-2.5 py-0.5 rounded-full border border-yellow-500/30">
                    កម្រិតថ្នាក់ទី {activeClass.grade}
                  </span>
                )}
              </div>
              <div className="w-9 h-9 rounded-full border border-yellow-900/20 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all shadow-2xs">
                <ArrowUpRight className="w-4 h-4 text-yellow-950 group-hover:text-white transition-colors" />
              </div>
            </div>
            <p className="text-xs sm:text-sm font-bold text-yellow-950 mt-4">ព័ត៌មានថ្នាក់រៀនបច្ចុប្បន្ន</p>
          </div>

          {/* Card 2: ឆ្នាំសិក្សា */}
          <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[140px] border border-yellow-400/40">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                {academicYear}
              </h2>
              <div className="w-9 h-9 rounded-full border border-yellow-900/20 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all shadow-2xs">
                <ArrowUpRight className="w-4 h-4 text-yellow-950 group-hover:text-white transition-colors" />
              </div>
            </div>
            <p className="text-xs sm:text-sm font-bold text-yellow-950 mt-4">ឆ្នាំសិក្សាផ្លូវការ</p>
          </div>

          {/* Card 3: គ្រូបន្ទុកថ្នាក់ */}
          <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[140px] border border-yellow-400/40 col-span-1">
            <div className="flex justify-between items-start">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug line-clamp-1">
                {teacherName}
              </h2>
              <div className="w-9 h-9 rounded-full border border-yellow-900/20 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all shadow-2xs shrink-0">
                <ArrowUpRight className="w-4 h-4 text-yellow-950 group-hover:text-white transition-colors" />
              </div>
            </div>
            <p className="text-xs sm:text-sm font-bold text-yellow-950 mt-4">គ្រូបន្ទុកថ្នាក់ទទួលខុសត្រូវ</p>
          </div>

          {/* Card 4: សិស្សសរុប (Featured #155EEF Blue) */}
          <div className="bg-[#155EEF] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-blue-500/20 text-white flex flex-col justify-between min-h-[140px] border border-blue-400/30 col-span-1">
            <div className="flex justify-between items-start">
              <div className="flex items-baseline gap-2">
                <h2 className="text-4xl font-black text-white tracking-tight leading-none">
                  {students.length}
                </h2>
                <span className="text-xs font-bold text-blue-200">នាក់</span>
              </div>
              <div className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all shadow-2xs">
                <ArrowUpRight className="w-4 h-4 text-white group-hover:text-[#155EEF] transition-colors" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs sm:text-sm font-bold text-blue-100">សិស្សសរុបក្នុងថ្នាក់</p>
              <div className="flex gap-1.5 text-[11px] font-black">
                <span className="bg-blue-600/70 px-2 py-0.5 rounded-lg border border-blue-400/30">ស្រី: {girlsCount}</span>
                <span className="bg-blue-600/70 px-2 py-0.5 rounded-lg border border-blue-400/30">ប្រុស: {boysCount}</span>
              </div>
            </div>
          </div>
        </div>
        <ClassSchedule />
      </>
      ) : (
        /* ================= STATISTICS TAB ================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          {/* Gender Demographic */}
          <div className="bg-white p-6 sm:p-7 rounded-[24px] border border-slate-100 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" /> សមាមាត្រសិស្សតាមភេទ
              </h3>
              <span className="text-xs font-bold text-[#64748B] bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/60">
                {activeClass?.name || 'ថ្នាក់រៀន'}
              </span>
            </div>

            {students.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 text-center py-8">មិនទាន់មានទិន្នន័យសិស្ស</p>
            ) : (
              <div className="flex items-end justify-center h-36 gap-10 py-2">
                <div className="flex flex-col items-center gap-2">
                  <div 
                    className="w-16 bg-blue-500 rounded-2xl shadow-sm transition-all duration-500 flex items-center justify-center text-white text-xs font-black" 
                    style={{ height: `${Math.max(36, Math.round((boysCount / students.length) * 120))}px` }}
                  >
                    {boysCount}
                  </div>
                  <span className="text-xs font-black text-slate-700">ប្រុស ({Math.round((boysCount / students.length) * 100)}%)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div 
                    className="w-16 bg-[#FFCF59] rounded-2xl shadow-sm transition-all duration-500 flex items-center justify-center text-yellow-950 text-xs font-black" 
                    style={{ height: `${Math.max(36, Math.round((girlsCount / students.length) * 120))}px` }}
                  >
                    {girlsCount}
                  </div>
                  <span className="text-xs font-black text-slate-700">ស្រី ({Math.round((girlsCount / students.length) * 100)}%)</span>
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs font-bold text-slate-500">
              <span>សរុបសិស្ស៖ <strong className="text-slate-800">{students.length} នាក់</strong></span>
              <span>ស្រី៖ <strong className="text-slate-800">{girlsCount} នាក់</strong></span>
            </div>
          </div>

          {/* Attendance Rate */}
          <div className="bg-white p-6 sm:p-7 rounded-[24px] border border-slate-100 shadow-xs flex flex-col items-center justify-between relative overflow-hidden">
            <div className="flex justify-between items-center w-full mb-4">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" /> អត្រាវត្តមានសរុប
              </h3>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/60">
                ខែនេះ
              </span>
            </div>

            <div className="relative w-36 h-36 flex items-center justify-center my-2">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-emerald-500" strokeDasharray={`${attRate}, 100`} strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute text-center">
                <div className="text-3xl font-black text-slate-900 leading-none">{attRate}<span className="text-base text-slate-500">%</span></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">វត្តមាន</span>
              </div>
            </div>

            <p className="text-xs font-bold text-slate-500 mt-2 text-center">អត្រាវត្តមានមធ្យមសរុបប្រចាំខែ</p>
          </div>

          {/* Academic Summary */}
          <div className="bg-white p-6 sm:p-7 rounded-[24px] border border-slate-100 shadow-xs flex flex-col justify-between">
            <h3 className="font-extrabold text-slate-800 text-base mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" /> សូចនាករសមធម៌ និងការសិក្សា
            </h3>
            <div className="space-y-3 flex-1 justify-center flex flex-col">
              <div className="flex justify-between items-center p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
                <span className="text-xs font-bold text-slate-600">សិស្សមានបណ្ណសមធម៌ (IDPoor):</span>
                <span className="text-xs font-black text-slate-900 bg-white px-2.5 py-1 rounded-xl shadow-2xs">{students.filter(s => s.id_poor && s.id_poor !== 'none').length} នាក់</span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
                <span className="text-xs font-bold text-slate-600">សិស្សទទួលអាហារូបករណ៍:</span>
                <span className="text-xs font-black text-slate-900 bg-white px-2.5 py-1 rounded-xl shadow-2xs">{students.filter(s => s.scholarship === 'yes').length} នាក់</span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-rose-50/60 rounded-2xl border border-rose-100">
                <span className="text-xs font-bold text-rose-700">សិស្សមានហានិភ័យបោះបង់ (Dropout):</span>
                <span className="text-xs font-black text-rose-600 bg-white px-2.5 py-1 rounded-xl shadow-2xs">{students.filter(s => s.dropout_risk || (s as any).current_status === 'dropout').length} នាក់</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
