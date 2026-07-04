'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Building2, Save, CheckCircle2, Shield, Calendar, Phone, Mail, MapPin } from 'lucide-react';

export default function PrincipalSettingsPage() {
  const { profile } = useAuth();
  const [saved, setSaved] = useState(false);
  const [schoolName, setSchoolName] = useState('វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង');
  const [schoolCode, setSchoolCode] = useState('Porieng-2026');
  const [academicYear, setAcademicYear] = useState('2025 - 2026');
  const [phone, setPhone] = useState('012 888 999');
  const [address, setAddress] = useState('ស្រុកពោធិ៍រៀង ខេត្តព្រៃវែង');

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

        <div className="pt-4 border-t border-slate-100 flex justify-end">
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
