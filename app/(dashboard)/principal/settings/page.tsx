'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Building2, Save, CheckCircle2, Shield, Calendar, Phone, Mail, MapPin, Users, Target } from 'lucide-react';

export default function PrincipalSettingsPage() {
  const { profile } = useAuth();
  // These are now view-only, managed by the Admin.
  // In a real implementation, fetch these from Supabase.
  const [schoolName] = useState('វិទ្យាល័យ ហ៊ុនសែន ពាមរក៍');
  const [schoolType] = useState('វិទ្យាល័យ');
  const [schoolCode] = useState('14110401901');
  const [academicYear] = useState('២០២៥-២០២៦');
  const [schoolArea] = useState('15223');
  const [totalClasses] = useState('24');
  const [address] = useState('ភូមិពោធិ៍រៀងត្បូង ឃុំពោធិ៍រៀង ស្រុកពោធិ៍រៀង ខេត្តព្រៃវែង');

  const [principalName] = useState('លោក ហេង ឈាងលី');
  const [principalPhone] = useState('096 689 4077');
  const [principalEmail] = useState('heg.chheangly.hs@moeys.gov.kh');

  const [ictTeacherName] = useState('លោកស្រី សាន សុវិជ្ជា');
  const [ictTeacherPhone] = useState('093 690 905');
  const [ictTeacherEmail] = useState('san.sovichea.hs@moeys.gov.kh');

  const [smcHeadName] = useState('លោក ទន់ ផានី');
  const [smcHeadPhone] = useState('068 908 838');

  const [schoolLevel] = useState('វិទ្យាល័យ (ទី៧-១២)');
  const [distanceKm] = useState('13.9');

  const [waterSystem] = useState('ទឹកអណ្តូង / ម៉ាស៊ីនចម្រោះ');
  const [electricity] = useState('អគ្គិសនីរដ្ឋ');
  const [internet] = useState('Wi-fi');

  const [pisaDobStart] = useState('2009-05-10');
  const [pisaDobEnd] = useState('2010-06-28');
  const [hasGrade12Exam] = useState(true);

  return (
    <div className="space-y-6 animate-fadeIn select-none max-w-4xl mx-auto">
      {/* Reference UI Standard Two-Column Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            ការកំណត់ទូទៅរបស់សាលារៀន
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5 flex items-center gap-1.5">
            <span>គ្រប់គ្រងព័ត៌មាន និងឆ្នាំសិក្សា៖</span>
            <span className="font-bold text-[#155EEF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {profile?.school_code || 'Porieng-2026'}
            </span>
          </p>
        </div>
      </header>

      {/* Read Only Banner */}
      <div className="p-4 rounded-[20px] bg-slate-50 border border-slate-200 text-slate-700 font-extrabold text-sm flex items-center gap-2 animate-fadeIn">
        <Shield className="w-5 h-5 text-slate-500" />
        <span>ទំព័រនេះសម្រាប់តែមើលប៉ុណ្ណោះ។ ប្រសិនបើលោកអ្នកចង់កែប្រែ សូមទាក់ទងទៅកាន់ Admin (គ្រូ ICT)។</span>
      </div>

      {/* Settings Form Card */}
      <div className="bg-white p-8 rounded-[24px] border border-slate-100/80 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#155EEF] flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800">ព័ត៌មានគ្រឹះស្ថានសិក្សា</h3>
            <p className="text-xs text-slate-500 font-medium">ព័ត៌មាននេះនឹងបង្ហាញនៅលើប័ណ្ណសរសើរ និងរបាយការណ៍ផ្លូវការ</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="sm:col-span-2">
            <label className="text-xs font-extrabold text-slate-700 block mb-1.5">ឈ្មោះសាលារៀន (ខ្មែរ)៖</label>
            <input type="text" value={schoolName} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1.5">ប្រភេទសាលា៖</label>
            <input type="text" value={schoolType} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1.5">កូដសម្គាល់សាលា៖</label>
            <input type="text" value={schoolCode} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-mono font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1.5">ឆ្នាំសិក្សាបច្ចុប្បន្ន៖</label>
            <input type="text" value={academicYear} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1.5">កម្រិតសាលារៀន៖</label>
            <input type="text" value={schoolLevel} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1.5">ផ្ទៃក្រឡាសាលារៀន (m²)៖</label>
            <input type="text" value={schoolArea} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1.5">ចំនួនថ្នាក់រៀនសរុប៖</label>
            <input type="number" value={totalClasses} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1.5">ចម្ងាយពីទីរួមខេត្ត (Km)៖</label>
            <input type="text" value={distanceKm} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
          </div>
          <div className="sm:col-span-3">
            <label className="text-xs font-extrabold text-slate-700 block mb-1.5">អាសយដ្ឋានសាលារៀន៖</label>
            <input type="text" value={address} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
          </div>
        </div>

        {/* Section 2: Key Personnel */}
        <div className="pt-6 mt-6 border-t border-slate-100">
          <div className="border-b border-slate-100 pb-4 flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">ព័ត៌មានបុគ្គលិកអប់រំ និងស្ថាប័ន GIEP</h3>
              <p className="text-xs text-slate-500 font-medium">ទំនាក់ទំនង និងអ្នកទទួលបន្ទុកគម្រោង</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Principal */}
            <div className="sm:col-span-1 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
              <h4 className="font-extrabold text-sm text-slate-800">នាយក/នាយិកា</h4>
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">ឈ្មោះ៖</label>
                <input type="text" value={principalName} readOnly className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">ទូរស័ព្ទ៖</label>
                <input type="text" value={principalPhone} readOnly className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Gmail៖</label>
                <input type="text" value={principalEmail} readOnly className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
              </div>
            </div>

            {/* ICT Teacher */}
            <div className="sm:col-span-1 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
              <h4 className="font-extrabold text-sm text-slate-800">គ្រូបង្គោល ICT</h4>
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">ឈ្មោះ៖</label>
                <input type="text" value={ictTeacherName} readOnly className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">ទូរស័ព្ទ៖</label>
                <input type="text" value={ictTeacherPhone} readOnly className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Gmail៖</label>
                <input type="text" value={ictTeacherEmail} readOnly className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
              </div>
            </div>

            {/* SMC Head */}
            <div className="sm:col-span-1 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
              <h4 className="font-extrabold text-sm text-slate-800">ប្រធាន គ.គ.ស</h4>
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">ឈ្មោះ៖</label>
                <input type="text" value={smcHeadName} readOnly className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">ទូរស័ព្ទ៖</label>
                <input type="text" value={smcHeadPhone} readOnly className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Infrastructure */}
        <div className="pt-6 mt-6 border-t border-slate-100">
          <div className="border-b border-slate-100 pb-4 flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">ហេដ្ឋារចនាសម្ព័ន្ធ (Infrastructure)</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">ប្រព័ន្ធទឹកស្អាត៖</label>
              <input type="text" value={waterSystem} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">បណ្តាញអគ្គិសនី៖</label>
              <input type="text" value={electricity} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">អ៊ីនធឺណិត (Internet)៖</label>
              <input type="text" value={internet} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
            </div>
          </div>
        </div>

        {/* Section 3: PISA Configuration */}
        <div className="pt-6 mt-6 border-t border-slate-100">
          <div className="border-b border-slate-100 pb-4 flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">ការកំណត់ប្រឡង (Examinations)</h3>
              <p className="text-xs text-slate-500 font-medium">ការកំណត់អាយុ PISA និងមណ្ឌលប្រឡង</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">ចាប់ពីថ្ងៃ៖</label>
              <input type="date" value={pisaDobStart} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">ដល់ថ្ងៃ៖</label>
              <input type="date" value={pisaDobEnd} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold bg-slate-50 text-slate-500 cursor-not-allowed" />
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
              <input type="checkbox" checked={hasGrade12Exam} readOnly className="w-5 h-5 accent-slate-400 rounded cursor-not-allowed" />
              <label className="text-sm font-extrabold text-slate-500">មានសិស្សប្រឡងទុតិយភូមិ</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
