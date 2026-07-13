'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Building2, Save, CheckCircle2, Shield, Calendar, Phone, Mail, MapPin, Users, Target } from 'lucide-react';

export default function PrincipalSettingsPage() {
  const { profile } = useAuth();
  const [saved, setSaved] = useState(false);
  const [schoolName, setSchoolName] = useState('វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង');
  const [schoolCode, setSchoolCode] = useState('14110401901');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [phone, setPhone] = useState('096 689 4077');
  const [address, setAddress] = useState('ភូមិពោធិ៍រៀងត្បូង ឃុំពោធិ៍រៀង ស្រុកពោធិ៍រៀង ខេត្តព្រៃវែង');

  // New GEIP configs
  const [principalName, setPrincipalName] = useState('លោក ហេង ឈាងលី');
  const [ictTeacherName, setIctTeacherName] = useState('លោកស្រី សាន សុវិជ្ជា');
  const [smcHeadName, setSmcHeadName] = useState('លោក ទន់ ផានី');
  const [schoolLevel, setSchoolLevel] = useState('វិទ្យាល័យ (ទី៧-១២)');
  const [distanceKm, setDistanceKm] = useState('13.9');
  
  const [pisaDobStart, setPisaDobStart] = useState('2009-05-10');
  const [pisaDobEnd, setPisaDobEnd] = useState('2010-06-28');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

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

      {saved && (
        <div className="p-4 rounded-[20px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>ការកំណត់ត្រូវបានរក្សាទុកដោយជោគជ័យ!</span>
        </div>
      )}

      {/* Settings Form Card */}
      <form onSubmit={handleSave} className="bg-white p-8 rounded-[24px] border border-slate-100/80 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#155EEF] flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800">ព័ត៌មានគ្រឹះស្ថានសិក្សា</h3>
            <p className="text-xs text-slate-500 font-medium">ព័ត៌មាននេះនឹងបង្ហាញនៅលើប័ណ្ណសរសើរ និងរបាយការណ៍ផ្លូវការ</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1.5">ឈ្មោះសាលារៀន (ខ្មែរ)៖</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold focus:outline-none focus:border-[#155EEF]"
            />
          </div>
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1.5">កូដសម្គាល់សាលា (School Code)៖</label>
            <input
              type="text"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-mono font-bold focus:outline-none focus:border-[#155EEF] bg-slate-50"
            />
          </div>
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1.5">ឆ្នាំសិក្សាបច្ចុប្បន្ន៖</label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold focus:outline-none focus:border-[#155EEF]"
            />
          </div>
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1.5">លេខទូរស័ព្ទទំនាក់ទំនង៖</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold focus:outline-none focus:border-[#155EEF]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-extrabold text-slate-700 block mb-1.5">អាសយដ្ឋានសាលារៀន៖</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold focus:outline-none focus:border-[#155EEF]"
            />
          </div>
        </div>

        {/* Section 2: Key Personnel */}
        <div className="pt-6 mt-6 border-t border-slate-100">
          <div className="border-b border-slate-100 pb-4 flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">ព័ត៌មានបុគ្គលិកអប់រំ និងស្ថាប័ន</h3>
              <p className="text-xs text-slate-500 font-medium">ព័ត៌មានផ្នែករដ្ឋបាល និងគណៈកម្មការសាលា (SEIP)</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">នាយក/នាយិកា៖</label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">គ្រូបង្គោល ICT៖</label>
              <input
                type="text"
                value={ictTeacherName}
                onChange={(e) => setIctTeacherName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">ប្រធាន គ.គ.ស៖</label>
              <input
                type="text"
                value={smcHeadName}
                onChange={(e) => setSmcHeadName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">កម្រិតសាលារៀន៖</label>
              <input
                type="text"
                value={schoolLevel}
                onChange={(e) => setSchoolLevel(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">ចម្ងាយទីទីរួមខេត្ត (Km)៖</label>
              <input
                type="text"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold focus:outline-none focus:border-indigo-500"
              />
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
              <h3 className="text-lg font-extrabold text-slate-800">ការកំណត់អាយុសម្រាប់ប្រឡង PISA</h3>
              <p className="text-xs text-slate-500 font-medium">ចន្លោះថ្ងៃខែឆ្នាំកំណើត ដែលត្រូវចាត់ចូលជាបេក្ខជនសាកល្បង PISA</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">ចាប់ពីថ្ងៃ (Start DOB)៖</label>
              <input
                type="date"
                value={pisaDobStart}
                onChange={(e) => setPisaDobStart(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">ដល់ថ្ងៃ (End DOB)៖</label>
              <input
                type="date"
                value={pisaDobEnd}
                onChange={(e) => setPisaDobEnd(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex justify-end mt-4">
          <button
            type="submit"
            className="px-8 py-3 rounded-full bg-[#155EEF] hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>រក្សាទុកការកែប្រែ</span>
          </button>
        </div>
      </form>
    </div>
  );
}
