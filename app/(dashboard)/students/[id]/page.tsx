'use client';

import React, { useState, useEffect, use } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
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
  Download
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

// Mock database fetch
const getMockStudent = (id: string): StudentProfile => {
  return {
    id,
    student_id_number: 'ID-04931',
    full_name: 'កែវ ច័ន្ទធីតា',
    english_name: 'Keo Chantida',
    gender: 'F',
    date_of_birth: '2010-05-14',
    age: 15,
    class_name: '12 ក',
    photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chantida&backgroundColor=b6e3f4',
    
    address: 'ភូមិអង្គរយស ឃុំព្រែកអន្ទះ ស្រុកពោធិ៍រៀង ខេត្តព្រៃវែង',
    student_phone: '012 345 678',
    parent_name: 'កែវ សំណាង',
    parent_phone: '070 789 217',
    emergency_phone: '070 789 217',
    
    status: 'new',
    scholarship: 'no',
    id_poor: 'level_1',
    learning_difficulty: 'ខ្សោយគណិតវិទ្យា',
    
    family_condition: 'ឳពុកម្តាយធ្វើការរោងចក្រ ជីដូនជាអ្នកមើលថែ',
    income: 200,
    housing: 'ផ្ទះឈើប្រកស័ង្កសី',
    orphan: 'no',
    siblings_count: 2,
    distance_km: 2.5,
    
    weight_kg: 45,
    height_m: 1.53,
    bmi: 19.2,
    nutrition_status: 'ធម្មតា',
    disability: 'none',
    health_note: 'ឧស្សាហ៍ឈឺក្បាលពេលអាកាសធាតុក្តៅ',
    
    risk_level: 'medium',
    attendance_rate: 88,
    absences_this_month: 4,
    score_average: 65.5,
    score_rank: 12,
    behavior_history: ['ការគោរពវិន័យល្អ', 'ចូលរួមសកម្មភាពក្រុមបានល្អ'],
    teacher_notes: [
      { date: '2026-07-01', note: 'បានជួបប្រឹក្សាអំពីការអវត្តមានច្រើនក្នុងខែមុន។' },
      { date: '2026-06-15', note: 'ពិន្ទុគណិតវិទ្យាធ្លាក់ចុះ ត្រូវការការយកចិត្តទុកដាក់បន្ថែម។' }
    ]
  };
};

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile | null>(null);

  useEffect(() => {
    // In a real app, fetch from Supabase
    setStudent(getMockStudent(resolvedParams.id));
  }, [resolvedParams.id]);

  if (!student) {
    return <div className="p-8 text-center text-slate-500 font-bold">កំពុងផ្ទុកទិន្នន័យ...</div>;
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 print:m-0 print:p-0 print:bg-white print:text-black print:absolute print:inset-0">
      {/* Navigation & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 print:hidden">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm bg-white border border-slate-200 px-4 py-2 rounded-xl w-fit transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> ត្រឡប់ក្រោយ
        </button>
        <div className="flex flex-wrap gap-2">
          <button className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-black rounded-xl text-xs flex items-center gap-2 transition-colors border border-emerald-100 cursor-pointer">
            <Phone className="w-4 h-4" /> ទាក់ទងអាណាព្យាបាល
          </button>
          <button className="px-4 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 font-black rounded-xl text-xs flex items-center gap-2 transition-colors border border-purple-100 cursor-pointer">
            <Activity className="w-4 h-4" /> កំណត់ត្រាប្រឹក្សា
          </button>
          <button className="px-4 py-2 bg-blue-50 text-[#155EEF] hover:bg-blue-100 font-black rounded-xl text-xs flex items-center gap-2 transition-colors border border-blue-100 cursor-pointer">
            <Home className="w-4 h-4" /> ចុះសួរសុខទុក្ខ
          </button>
          <button onClick={handlePrint} className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-700 font-black rounded-xl text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer">
            <Printer className="w-4 h-4" /> បោះពុម្ពប្រវត្តិរូប
          </button>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white p-6 md:p-8 rounded-[24px] border border-slate-200 shadow-xs print:shadow-none print:border-slate-800 print:rounded-none">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-center">
          <img src={student.photo_url} alt={student.full_name} className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-slate-50 object-cover shadow-sm bg-slate-100 print:border-slate-300" />
          <div className="flex-1 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <h1 className="text-3xl font-black text-slate-900">{student.full_name}</h1>
              <span className="text-lg font-bold text-slate-500 hidden sm:inline">|</span>
              <span className="text-xl font-bold text-slate-600 font-serif">{student.english_name}</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-600">
              <span className="bg-slate-100 px-3 py-1 rounded-lg">អត្តលេខ៖ <span className="font-mono text-slate-900">{student.student_id_number}</span></span>
              <span className="bg-[#155EEF]/10 text-[#155EEF] px-3 py-1 rounded-lg">ថ្នាក់៖ {student.class_name}</span>
              {student.gender === 'F' ? (
                <span className="bg-pink-50 text-pink-600 px-3 py-1 rounded-lg">ភេទ៖ ស្រី</span>
              ) : (
                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg">ភេទ៖ ប្រុស</span>
              )}
              {student.risk_level !== 'low' && (
                <span className={`px-3 py-1 rounded-lg flex items-center gap-1.5 animate-pulse ${
                  student.risk_level === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  <AlertTriangle className="w-4 h-4" /> ហានិភ័យបោះបង់ការសិក្សា
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4 print:text-sm print:break-inside-avoid">
        
        {/* Column 1: Personal & Family */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-2xs print:shadow-none print:border-slate-800 print:rounded-none">
            <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 print:border-slate-400">
              <User className="w-5 h-5 text-[#155EEF]" /> ព័ត៌មានផ្ទាល់ខ្លួន
            </h2>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500 font-bold">ថ្ងៃខែឆ្នាំកំណើត៖</span> <span className="font-black text-slate-800">{student.date_of_birth} ({student.age} ឆ្នាំ)</span></li>
              <li className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500 font-bold">ទូរស័ព្ទសិស្ស៖</span> <span className="font-mono font-bold text-slate-800">{student.student_phone || '-'}</span></li>
              <li className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500 font-bold">អាសយដ្ឋាន៖</span> <span className="font-bold text-slate-800 text-right w-2/3">{student.address}</span></li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-2xs print:shadow-none print:border-slate-800 print:rounded-none">
            <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 print:border-slate-400">
              <Users className="w-5 h-5 text-[#155EEF]" /> គ្រួសារ និងអាណាព្យាបាល
            </h2>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500 font-bold">ឈ្មោះអាណាព្យាបាល៖</span> <span className="font-black text-slate-800">{student.parent_name}</span></li>
              <li className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500 font-bold">ទូរស័ព្ទអាណាព្យាបាល៖</span> <span className="font-mono font-black text-emerald-600">{student.parent_phone}</span></li>
              <li className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500 font-bold">ស្ថានភាពគ្រួសារ៖</span> <span className="font-bold text-slate-800 text-right w-2/3">{student.family_condition}</span></li>
              <li className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500 font-bold">ចំណូលគ្រួសារ៖</span> <span className="font-black text-emerald-600">${student.income}/ខែ</span></li>
              <li className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500 font-bold">ប្រភេទផ្ទះ៖</span> <span className="font-bold text-slate-800">{student.housing}</span></li>
              <li className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500 font-bold">ចម្ងាយពីសាលា៖</span> <span className="font-bold text-slate-800">{student.distance_km} គ.ម</span></li>
            </ul>
          </div>
        </div>

        {/* Column 2: Academic & Health */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-2xs print:shadow-none print:border-slate-800 print:rounded-none">
            <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 print:border-slate-400">
              <GraduationCap className="w-5 h-5 text-[#155EEF]" /> ការសិក្សា និងគាំពារ
            </h2>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500 font-bold">ស្ថានភាពសិស្ស៖</span> <span className="font-black text-slate-800">{student.status === 'new' ? 'សិស្សថ្មី' : 'ត្រួតថ្នាក់'}</span></li>
              <li className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-bold">បណ្ណក្រីក្រ (Poor ID)៖</span> 
                {student.id_poor !== 'none' ? (
                  <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded">{student.id_poor === 'level_1' ? 'កម្រិត ១' : 'កម្រិត ២'}</span>
                ) : (
                  <span className="font-bold text-slate-500">គ្មាន</span>
                )}
              </li>
              <li className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500 font-bold">អាហារូបករណ៍៖</span> <span className="font-black text-slate-800">{student.scholarship === 'yes' ? 'បាទ/ចាស' : 'ទេ'}</span></li>
              <li className="flex flex-col gap-1 border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-bold">បញ្ហាក្នុងការរៀនសូត្រ៖</span> 
                <span className="font-bold text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-100">{student.learning_difficulty || 'គ្មាន'}</span>
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-2xs print:shadow-none print:border-slate-800 print:rounded-none">
            <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 print:border-slate-400">
              <HeartPulse className="w-5 h-5 text-rose-500" /> សុខភាព (GEIP)
            </h2>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500 font-bold">ទម្ងន់ / កម្ពស់៖</span> <span className="font-black text-slate-800">{student.weight_kg} kg / {student.height_m} m</span></li>
              <li className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-bold">លទ្ធផល BMI៖</span> 
                <span className={`font-black px-2 py-0.5 rounded ${student.nutrition_status === 'ធម្មតា' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {student.bmi} ({student.nutrition_status})
                </span>
              </li>
              <li className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500 font-bold">ពិការភាព៖</span> <span className="font-black text-slate-800">{student.disability === 'none' ? 'គ្មាន' : 'មាន'}</span></li>
              <li className="flex flex-col gap-1 border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-bold">កំណត់សម្គាល់សុខភាព៖</span> 
                <span className="font-bold text-slate-700 bg-slate-50 p-2 rounded-lg">{student.health_note || 'គ្មានបញ្ហាជាក់លាក់'}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Column 3: History & Logs */}
        <div className="space-y-6 print:col-span-2">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-2xs flex flex-col justify-center print:border-slate-800 print:rounded-none">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> អត្រាវត្តមាន</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{student.attendance_rate}%</div>
              {student.absences_this_month > 0 && <div className="text-xs font-bold text-rose-500 mt-1">អវត្តមាន {student.absences_this_month} ដងខែនេះ</div>}
            </div>
            <div className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-2xs flex flex-col justify-center print:border-slate-800 print:rounded-none">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> ពិន្ទុមធ្យម</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{student.score_average}</div>
              <div className="text-xs font-bold text-[#155EEF] mt-1">ចំណាត់ថ្នាក់លេខ {student.score_rank}</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-2xs print:shadow-none print:border-slate-800 print:rounded-none">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2 print:border-slate-400">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" /> កំណត់ត្រាគ្រូបន្ទុកថ្នាក់
              </h2>
              <button className="text-xs font-bold text-[#155EEF] hover:underline print:hidden cursor-pointer">+ បន្ថែម</button>
            </div>
            
            <div className="space-y-4">
              {student.teacher_notes.length === 0 ? (
                <p className="text-xs text-slate-500 font-bold italic text-center py-4">មិនទាន់មានកំណត់ត្រានៅឡើយទេ</p>
              ) : (
                student.teacher_notes.map((note, idx) => (
                  <div key={idx} className="border-l-2 border-[#155EEF] pl-3 py-1">
                    <div className="text-[10px] font-black text-slate-400 mb-0.5">{note.date}</div>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">{note.note}</p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 print:border-slate-400">
              <h3 className="text-xs font-black text-slate-500 uppercase mb-2">កំណត់ត្រាអាកប្បកិរិយា</h3>
              <div className="flex flex-wrap gap-2">
                {student.behavior_history.map((bh, idx) => (
                  <span key={idx} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold">{bh}</span>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
