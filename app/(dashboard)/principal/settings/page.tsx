'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Building2, Shield, Loader2 } from 'lucide-react';

export default function PrincipalSettingsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);

  const [schoolName, setSchoolName] = useState('វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង');
  const [schoolType, setSchoolType] = useState('វិទ្យាល័យ (ទី៧-១២)');
  const [schoolCode, setSchoolCode] = useState('14110401901');
  const [academicYear, setAcademicYear] = useState('២០២៥-២០២៦');
  const [address, setAddress] = useState('ភូមិពោធិ៍រៀងត្បូង ឃុំពោធិ៍រៀង ស្រុកពោធិ៍រៀង ខេត្តព្រៃវែង');

  const [principalName, setPrincipalName] = useState('លោក ហេង ឈាងលី');
  const [principalPhone, setPrincipalPhone] = useState('096 689 4077');
  const [principalEmail, setPrincipalEmail] = useState('heg.chheangly.hs@moeys.gov.kh');

  const [ictTeacherName, setIctTeacherName] = useState('លោកស្រី សាន សុវិជ្ជា');
  const [ictTeacherPhone, setIctTeacherPhone] = useState('093 690 905');
  const [ictTeacherEmail, setIctTeacherEmail] = useState('san.sovichea.hs@moeys.gov.kh');

  const [smcHeadName, setSmcHeadName] = useState('លោក ទន់ ផានី');
  const [smcHeadPhone, setSmcHeadPhone] = useState('068 908 838');

  const [waterSystem, setWaterSystem] = useState('ទឹកអណ្តូង / ម៉ាស៊ីនចម្រោះ');
  const [electricity, setElectricity] = useState('អគ្គិសនីរដ្ឋ');
  const [internet, setInternet] = useState('Wi-Fi');

  useEffect(() => {
    async function loadInfo() {
      try {
        const res = await fetch('/api/admin/school-info');
        if (res.ok) {
          const { schoolInfo } = await res.json();
          if (schoolInfo) {
            if (schoolInfo.schoolName) setSchoolName(schoolInfo.schoolName);
            if (schoolInfo.schoolType) setSchoolType(schoolInfo.schoolType);
            if (schoolInfo.schoolCode) setSchoolCode(schoolInfo.schoolCode);
            if (schoolInfo.academicYear) setAcademicYear(schoolInfo.academicYear);

            const addrParts = [schoolInfo.village ? `ភូមិ${schoolInfo.village}` : '', schoolInfo.commune ? `ឃុំ${schoolInfo.commune}` : '', schoolInfo.district ? `ស្រុក${schoolInfo.district}` : '', schoolInfo.province ? `ខេត្ត${schoolInfo.province}` : ''].filter(Boolean);
            if (addrParts.length > 0) setAddress(addrParts.join(' '));

            if (schoolInfo.principalName) setPrincipalName(schoolInfo.principalName);
            if (schoolInfo.principalPhone) setPrincipalPhone(schoolInfo.principalPhone);

            if (schoolInfo.ictLeadName) setIctTeacherName(schoolInfo.ictLeadName);
            if (schoolInfo.ictLeadPhone) setIctTeacherPhone(schoolInfo.ictLeadPhone);
            if (schoolInfo.ictLeadEmail) setIctTeacherEmail(schoolInfo.ictLeadEmail);

            if (schoolInfo.smcHeadName) setSmcHeadName(schoolInfo.smcHeadName);
            if (schoolInfo.smcHeadPhone) setSmcHeadPhone(schoolInfo.smcHeadPhone);

            if (schoolInfo.waterSupply) setWaterSystem(schoolInfo.waterSupply);
            if (schoolInfo.electricity) setElectricity(schoolInfo.electricity);
            if (schoolInfo.internet) setInternet(schoolInfo.internet);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadInfo();
  }, []);

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
        <Shield className="w-5 h-5 text-slate-500 shrink-0" />
        <span>ទំព័រនេះសម្រាប់តែមើលប៉ុណ្ណោះ។ ប្រសិនបើលោកអ្នកចង់កែប្រែ សូមទាក់ទងទៅកាន់ Admin (គ្រូ ICT) ក្នុងទំព័រ Admin School Info។</span>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-2 font-bold">
          <Loader2 className="w-6 h-6 animate-spin text-[#155EEF]" />
          <span>កំពុងទាញយកព័ត៌មានសាលារៀន...</span>
        </div>
      ) : (
        /* Settings Form Card */
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
              <input type="text" value={schoolName} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold bg-slate-50 text-slate-700 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">កូដសាលារៀន (EMIS)៖</label>
              <input type="text" value={schoolCode} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold bg-slate-50 text-slate-700 cursor-not-allowed" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">កម្រិតសាលា៖</label>
              <input type="text" value={schoolType} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold bg-slate-50 text-slate-700 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1.5">ឆ្នាំសិក្សា៖</label>
              <input type="text" value={academicYear} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold bg-slate-50 text-slate-700 cursor-not-allowed" />
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1.5">អាសយដ្ឋាន៖</label>
            <input type="text" value={address} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm font-bold bg-slate-50 text-slate-700 cursor-not-allowed" />
          </div>

          {/* Key Personnel */}
          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-sm font-extrabold text-slate-800 mb-4">គណៈគ្រប់គ្រង និងទំនាក់ទំនង</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-black text-[#155EEF] uppercase block">នាយកសាលា</span>
                <p className="text-sm font-bold text-slate-800">{principalName}</p>
                <p className="text-xs font-medium text-slate-500">{principalPhone}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-black text-amber-700 uppercase block">គ្រូ ICT / Admin</span>
                <p className="text-sm font-bold text-slate-800">{ictTeacherName}</p>
                <p className="text-xs font-medium text-slate-500">{ictTeacherPhone}</p>
                <p className="text-[11px] font-mono text-slate-400 truncate">{ictTeacherEmail}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-black text-slate-700 uppercase block">ប្រធាន SMC</span>
                <p className="text-sm font-bold text-slate-800">{smcHeadName}</p>
                <p className="text-xs font-medium text-slate-500">{smcHeadPhone}</p>
              </div>
            </div>
          </div>

          {/* Utilities */}
          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-sm font-extrabold text-slate-800 mb-4">ហេដ្ឋារចនាសម្ព័ន្ធ</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 block">ប្រភពទឹក</span>
                <span className="text-sm font-bold text-slate-800">{waterSystem}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 block">អគ្គិសនី</span>
                <span className="text-sm font-bold text-slate-800">{electricity}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 block">អ៊ីនធឺណិត</span>
                <span className="text-sm font-bold text-slate-800">{internet}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
