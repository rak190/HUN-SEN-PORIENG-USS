'use client';

import React, { useState, useEffect, use } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Printer,
  Phone,
  FileText,
  HeartPulse,
  Home,
  AlertTriangle,
  User,
  GraduationCap,
  MapPin,
  Users,
  Activity,
  History,
  TrendingUp,
  Download,
  Calendar,
  Briefcase
} from 'lucide-react';

interface StudentProfile {
  id: string;
  student_id_number: string;
  full_name: string;
  english_name: string;
  gender: string;
  date_of_birth: string;
  age: number;
  class_name: string;
  photo_url: string;
  
  // Contact
  address: string;
  student_phone: string;
  parent_name: string;
  parent_phone: string;
  emergency_phone: string;

  // Academic Status
  status: 'new' | 'repeater' | 'transfer';
  scholarship: 'yes' | 'no';
  id_poor: 'none' | 'level_1' | 'level_2';
  learning_difficulty: string;

  // Family & Demographics
  family_condition: string;
  income: number;
  housing: string;
  orphan: 'yes' | 'no';
  siblings_count: number;
  distance_km: number;

  // Health
  weight_kg: number;
  height_m: number;
  bmi: number;
  nutrition_status: string;
  disability: 'none' | 'mild' | 'severe';
  health_note: string;

  // Risk & History
  risk_level: 'low' | 'medium' | 'high';
  attendance_rate: number;
  absences_this_month: number;
  score_average: number;
  score_rank: number;
  behavior_history: string[];
  teacher_notes: { date: string; note: string }[];
}

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchStudentData() {
      const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(resolvedParams.id);
      
      if (!isUUID) {
        // If it's a demo link like 'std-1', redirect to students list or show error
        router.push('/students');
        return;
      }

      const { data, error } = await supabase
        .from('students')
        .select('*, classes(name)')
        .eq('id', resolvedParams.id)
        .single();

      if (data && !error) {
        // Map classes(name) to class_name since the join returns it nested
        const mappedData: StudentProfile = {
          ...data,
          class_name: data.classes?.name || 'មិនស្គាល់ថ្នាក់',
          // Ensure arrays are parsed if they come back as null
          behavior_history: data.behavior_history || [],
          teacher_notes: data.teacher_notes || []
        };
        setStudent(mappedData);
      }
    }
    
    fetchStudentData();
  }, [resolvedParams.id, router]);

  if (!student) {
    return <div className="p-8 text-center text-slate-500 font-bold">កំពុងផ្ទុកទិន្នន័យ...</div>;
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12 print:m-0 print:p-0 print:bg-white print:text-black print:absolute print:inset-0">
      
      {/* Navigation Header (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 print:hidden z-10 relative">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold text-sm bg-white/80 backdrop-blur-sm border border-slate-200 px-4 py-2 rounded-xl w-fit transition-all shadow-sm hover:shadow-md cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> ត្រឡប់ក្រោយ
        </button>
        <div className="flex flex-wrap gap-2">
          <button className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-black rounded-xl text-xs flex items-center gap-2 transition-colors border border-emerald-100 cursor-pointer shadow-sm hover:shadow">
            <Phone className="w-4 h-4" /> ទាក់ទង
          </button>
          <button className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 font-black rounded-xl text-xs flex items-center gap-2 transition-colors border border-purple-100 cursor-pointer shadow-sm hover:shadow">
            <Activity className="w-4 h-4" /> កំណត់ត្រា
          </button>
          <button onClick={handlePrint} className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-700 font-black rounded-xl text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer hover:shadow">
            <Printer className="w-4 h-4" /> បោះពុម្ព
          </button>
        </div>
      </div>

      {/* Hero Banner Section */}
      <div className="relative w-full rounded-[32px] bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl overflow-hidden print:bg-white print:shadow-none print:rounded-none">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 print:hidden"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-900/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4 print:hidden"></div>
        
        <div className="relative p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center md:items-end">
          {/* Avatar with Status Overlays */}
          <div className="relative shrink-0 z-10 group">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] border-4 border-white object-cover shadow-2xl bg-white overflow-hidden transition-transform duration-300 group-hover:scale-105 print:border-slate-300">
              <img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" />
            </div>
            {student.risk_level !== 'low' && (
              <div className={`absolute -top-3 -right-3 w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl border-4 border-white ${
                student.risk_level === 'high' ? 'bg-rose-500 animate-bounce' : 'bg-amber-500'
              }`}>
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            )}
            {student.gender === 'F' ? (
              <div className="absolute -bottom-3 -right-3 px-3 py-1 bg-pink-500 text-white text-xs font-black rounded-xl shadow-lg border-2 border-white">ស្រី</div>
            ) : (
              <div className="absolute -bottom-3 -right-3 px-3 py-1 bg-blue-500 text-white text-xs font-black rounded-xl shadow-lg border-2 border-white">ប្រុស</div>
            )}
          </div>
          
          {/* Main Info */}
          <div className="flex-1 space-y-4 text-center md:text-left z-10">
            <div className="space-y-1">
              <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-md print:text-slate-900">{student.full_name}</h1>
              <p className="text-xl md:text-2xl font-serif font-bold text-blue-100 print:text-slate-500">{student.english_name}</p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-white font-bold border border-white/10 print:bg-slate-100 print:text-slate-900">
                <User className="w-4 h-4" /> <span>ID: <span className="font-mono">{student.student_id_number}</span></span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-4 py-2 rounded-xl text-blue-700 font-black shadow-lg print:border print:border-slate-300">
                <GraduationCap className="w-4 h-4" /> <span>ថ្នាក់ {student.class_name}</span>
              </div>
              {student.id_poor !== 'none' && (
                <div className="flex items-center gap-1.5 bg-rose-500 px-4 py-2 rounded-xl text-white font-black shadow-lg">
                  <HeartPulse className="w-4 h-4" /> <span>បណ្ណក្រីក្រ ({student.id_poor === 'level_1' ? 'កម្រិត ១' : 'កម្រិត ២'})</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Floating Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2 -mt-4 relative z-20">
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col items-center text-center animate-slideUp" style={{ animationDelay: '0.1s' }}>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 mb-3">
            <History className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">អត្រាវត្តមាន</span>
          <div className="text-3xl font-black text-slate-900">{student.attendance_rate}%</div>
          {student.absences_this_month > 0 && <span className="text-[10px] font-bold text-rose-500 mt-1 bg-rose-50 px-2 py-0.5 rounded-full">អវត្តមាន {student.absences_this_month} ដង</span>}
        </div>
        
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col items-center text-center animate-slideUp" style={{ animationDelay: '0.2s' }}>
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ពិន្ទុមធ្យម</span>
          <div className="text-3xl font-black text-slate-900">{student.score_average}</div>
          <span className="text-[10px] font-bold text-blue-600 mt-1 bg-blue-50 px-2 py-0.5 rounded-full">ចំណាត់ថ្នាក់ទី {student.score_rank}</span>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col items-center text-center animate-slideUp" style={{ animationDelay: '0.3s' }}>
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-3">
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">អាយុ</span>
          <div className="text-3xl font-black text-slate-900">{student.age} <span className="text-lg">ឆ្នាំ</span></div>
          <span className="text-[10px] font-bold text-slate-500 mt-1">{student.date_of_birth}</span>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col items-center text-center animate-slideUp" style={{ animationDelay: '0.4s' }}>
          <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-3">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ស្ថានភាព BMI</span>
          <div className="text-3xl font-black text-slate-900">{student.bmi}</div>
          <span className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full ${student.nutrition_status === 'ធម្មតា' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {student.nutrition_status}
          </span>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 animate-slideUp" style={{ animationDelay: '0.5s' }}>
        
        {/* Left Column: Personal & Family */}
        <div className="space-y-6">
          {/* Contact Card */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-lg shadow-slate-100 print:shadow-none print:border-slate-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">ទំនាក់ទំនង</h2>
                <p className="text-sm font-bold text-slate-400">អាសយដ្ឋាន និងលេខទូរស័ព្ទ</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-sm font-bold text-slate-500 mb-1 sm:mb-0">ទូរស័ព្ទសិស្ស</span>
                <span className="font-mono font-black text-lg text-slate-900">{student.student_phone || '-'}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="block text-sm font-bold text-slate-500 mb-2">អាសយដ្ឋានបច្ចុប្បន្ន</span>
                <span className="font-bold text-slate-800 leading-relaxed">{student.address}</span>
              </div>
            </div>
          </div>

          {/* Family Card */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-lg shadow-slate-100 print:shadow-none print:border-slate-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">គ្រួសារ និងអាណាព្យាបាល</h2>
                <p className="text-sm font-bold text-slate-400">ព័ត៌មានសេដ្ឋកិច្ច និងអាណាព្យាបាល</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div>
                  <span className="block text-sm font-bold text-emerald-600/70 mb-1">អាណាព្យាបាល</span>
                  <span className="font-black text-lg text-emerald-800">{student.parent_name}</span>
                </div>
                <div className="mt-2 sm:mt-0 flex items-center gap-3">
                  <span className="font-mono font-black text-lg text-emerald-700">{student.parent_phone}</span>
                  <button className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md hover:bg-emerald-600 cursor-pointer transition-colors print:hidden">
                    <Phone className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="block text-xs font-bold text-slate-400 mb-1 uppercase">ចំណូលគ្រួសារ</span>
                  <span className="font-black text-emerald-600 text-xl">${student.income}<span className="text-sm text-slate-500">/ខែ</span></span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="block text-xs font-bold text-slate-400 mb-1 uppercase">ចម្ងាយពីសាលា</span>
                  <span className="font-black text-slate-800 text-xl">{student.distance_km} <span className="text-sm text-slate-500">គ.ម</span></span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="block text-sm font-bold text-slate-500 mb-2">ស្ថានភាពគ្រួសារ / លំនៅដ្ឋាន</span>
                <p className="font-bold text-slate-800">{student.family_condition}</p>
                <p className="font-bold text-slate-600 text-sm mt-1">ផ្ទះ៖ {student.housing}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Academic, Health, Notes */}
        <div className="space-y-6">
          
          {/* Academic Status Card */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-lg shadow-slate-100 print:shadow-none print:border-slate-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">ការសិក្សា</h2>
                <p className="text-sm font-bold text-slate-400">ស្ថានភាព និងបញ្ហាក្នុងការរៀនសូត្រ</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-sm font-bold text-slate-500">ស្ថានភាពសិស្ស</span>
                <span className="font-black text-slate-800 px-3 py-1 bg-white rounded-xl shadow-sm">{student.status === 'new' ? 'សិស្សថ្មី' : 'ត្រួតថ្នាក់ / ផ្ទេរមក'}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-sm font-bold text-slate-500">អាហារូបករណ៍</span>
                <span className={`font-black px-3 py-1 rounded-xl shadow-sm ${student.scholarship === 'yes' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-800'}`}>
                  {student.scholarship === 'yes' ? 'មានអាហារូបករណ៍' : 'គ្មាន'}
                </span>
              </div>
              {student.learning_difficulty && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-sm font-bold text-amber-700/70 mb-1">បញ្ហាក្នុងការរៀនសូត្រ (កត់សម្គាល់)</span>
                    <span className="font-black text-amber-900">{student.learning_difficulty}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Teacher Notes Card */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-lg shadow-slate-100 print:shadow-none print:border-slate-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">កំណត់ត្រាគ្រូ</h2>
                  <p className="text-sm font-bold text-slate-400">ប្រវត្តិ និងការប្រឹក្សា</p>
                </div>
              </div>
              <button className="text-sm font-bold bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer print:hidden shadow-sm">
                + បន្ថែម
              </button>
            </div>
            
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {student.teacher_notes.map((note, idx) => (
                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  {/* Timeline Node */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 relative">
                    <History className="w-4 h-4" />
                  </div>
                  {/* Card */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <span className="font-bold text-blue-600 text-xs block mb-1">{note.date}</span>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">{note.note}</p>
                  </div>
                </div>
              ))}
              {student.behavior_history.map((hist, idx) => (
                <div key={`hist-${idx}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-emerald-100 text-emerald-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 relative">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-sm font-bold text-emerald-800 leading-relaxed">{hist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
