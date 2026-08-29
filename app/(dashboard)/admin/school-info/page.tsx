'use client';

import React, { useState, useEffect } from 'react';
import { Save, RefreshCcw, CheckCircle2, Download, Building2, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function AdminSchoolInfoPage() {
  const [loading, setLoading] = useState(true);
  const [isSavingSchool, setIsSavingSchool] = useState(false);
  const [schoolSaved, setSchoolSaved] = useState(false);
  
  // Basic Info
  const [schoolName, setSchoolName] = useState('វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង');
  const [schoolNameEn, setSchoolNameEn] = useState('Hun Sen Porieng High School');
  const [schoolType, setSchoolType] = useState('វិទ្យាល័យ (ទី៧-១២)');
  const [schoolCode, setSchoolCode] = useState('14110401901');
  const [academicYear, setAcademicYear] = useState('២០២៥-២០២៦');
  const [abbreviation, setAbbreviation] = useState('វិ.ហ.ស.ពោធិ៍រៀង');
  const [department, setDepartment] = useState('មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តព្រៃវែង');
  
  // Address
  const [village, setVillage] = useState('ពោធិ៍រៀងត្បូង');
  const [commune, setCommune] = useState('ពោធិ៍រៀង');
  const [district, setDistrict] = useState('ពោធិ៍រៀង');
  const [province, setProvince] = useState('ព្រៃវែង');

  // Key Personnel
  const [principalName, setPrincipalName] = useState('លោក ហេង ឈាងលី');
  const [principalTitle, setPrincipalTitle] = useState('នាយកសាលា');
  const [principalPhone, setPrincipalPhone] = useState('096 689 4077');
  
  const [ictLeadName, setIctLeadName] = useState('លោកស្រី សាន សុវិជ្ជា');
  const [ictLeadPhone, setIctLeadPhone] = useState('093 690 905');
  const [ictLeadEmail, setIctLeadEmail] = useState('san.sovichea.hs@moeys.gov.kh');

  const [smcHeadName, setSmcHeadName] = useState('លោក ទន់ ផានី');
  const [smcHeadPhone, setSmcHeadPhone] = useState('068 908 838');

  // Infrastructure
  const [waterSupply, setWaterSupply] = useState('ទឹកអណ្តូង / ម៉ាស៊ីនចម្រោះ');
  const [electricity, setElectricity] = useState('អគ្គិសនីរដ្ឋ');
  const [internet, setInternet] = useState('Wi-Fi');

  // Load from API on mount
  useEffect(() => {
    async function loadSchoolInfo() {
      try {
        const res = await fetch('/api/admin/school-info');
        if (res.ok) {
          const { schoolInfo } = await res.json();
          if (schoolInfo) {
            if (schoolInfo.schoolName) setSchoolName(schoolInfo.schoolName);
            if (schoolInfo.schoolNameEn) setSchoolNameEn(schoolInfo.schoolNameEn);
            if (schoolInfo.schoolType) setSchoolType(schoolInfo.schoolType);
            if (schoolInfo.schoolCode) setSchoolCode(schoolInfo.schoolCode);
            if (schoolInfo.academicYear) setAcademicYear(schoolInfo.academicYear);
            if (schoolInfo.abbreviation) setAbbreviation(schoolInfo.abbreviation);
            if (schoolInfo.department) setDepartment(schoolInfo.department);

            if (schoolInfo.village) setVillage(schoolInfo.village);
            if (schoolInfo.commune) setCommune(schoolInfo.commune);
            if (schoolInfo.district) setDistrict(schoolInfo.district);
            if (schoolInfo.province) setProvince(schoolInfo.province);

            if (schoolInfo.principalName) setPrincipalName(schoolInfo.principalName);
            if (schoolInfo.principalTitle) setPrincipalTitle(schoolInfo.principalTitle);
            if (schoolInfo.principalPhone) setPrincipalPhone(schoolInfo.principalPhone);

            if (schoolInfo.ictLeadName) setIctLeadName(schoolInfo.ictLeadName);
            if (schoolInfo.ictLeadPhone) setIctLeadPhone(schoolInfo.ictLeadPhone);
            if (schoolInfo.ictLeadEmail) setIctLeadEmail(schoolInfo.ictLeadEmail);

            if (schoolInfo.smcHeadName) setSmcHeadName(schoolInfo.smcHeadName);
            if (schoolInfo.smcHeadPhone) setSmcHeadPhone(schoolInfo.smcHeadPhone);

            if (schoolInfo.waterSupply) setWaterSupply(schoolInfo.waterSupply);
            if (schoolInfo.electricity) setElectricity(schoolInfo.electricity);
            if (schoolInfo.internet) setInternet(schoolInfo.internet);
          }
        }
      } catch (err) {
        console.error('Failed to load school info:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSchoolInfo();
  }, []);

  const handleSaveSchool = async () => {
    setIsSavingSchool(true);
    try {
      const payload = {
        schoolName,
        schoolNameEn,
        schoolType,
        schoolCode,
        academicYear,
        abbreviation,
        department,
        village,
        commune,
        district,
        province,
        principalName,
        principalTitle,
        principalPhone,
        ictLeadName,
        ictLeadPhone,
        ictLeadEmail,
        smcHeadName,
        smcHeadPhone,
        waterSupply,
        electricity,
        internet,
      };

      const res = await fetch('/api/admin/school-info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolInfo: payload })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save school info');
      }

      setSchoolSaved(true);
      setTimeout(() => setSchoolSaved(false), 3000);
    } catch (err: any) {
      alert('កំហុសក្នុងការរក្សាទុក៖ ' + err.message);
    } finally {
      setIsSavingSchool(false);
    }
  };

  const ClassicInput = ({ label, value, onChange, required = false, type = 'text', placeholder = '' }: any) => (
    <div className="space-y-2">
      <label className="text-[13px] font-bold text-slate-700 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input 
        type={type} 
        value={value} 
        onChange={(e) => onChange && onChange(e.target.value)} 
        placeholder={placeholder}
        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50/50"
      />
    </div>
  );

  const ClassicSelect = ({ label, value, onChange, required = false, options }: any) => (
    <div className="space-y-2">
      <label className="text-[13px] font-bold text-slate-700 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select 
        value={value} 
        onChange={(e) => onChange && onChange(e.target.value)} 
        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50/50 appearance-none cursor-pointer"
      >
        {options.map((opt: any) => (
          <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-8 h-8 text-[#155EEF]" />
            ព័ត៌មានគ្រឹះស្ថានសិក្សា
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5">
            កំណត់ព័ត៌មានទូទៅ ទីតាំង និងគណៈគ្រប់គ្រងសាលារៀន (GEIP MoEYS Standard)
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button 
            onClick={handleSaveSchool} 
            disabled={isSavingSchool || loading}
            className="px-6 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-full text-sm transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            {isSavingSchool ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSavingSchool ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកការកែប្រែ'}</span>
          </button>
        </div>
      </header>

      {/* Success Alert */}
      {schoolSaved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>ព័ត៌មានសាលារៀនត្រូវបានរក្សាទុកជោគជ័យទៅក្នុងប្រព័ន្ធ Database!</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-2 font-bold">
          <Loader2 className="w-6 h-6 animate-spin text-[#155EEF]" />
          <span>កំពុងទាញយកព័ត៌មានសាលារៀន...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* General Info Card */}
            <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs space-y-5">
              <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#155EEF]"></span>
                ព័ត៌មានទូទៅ
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ClassicInput label="ឈ្មោះសាលា (ភាសាខ្មែរ)" value={schoolName} onChange={setSchoolName} required />
                <ClassicInput label="ឈ្មោះសាលា (អក្សរឡាតាំង)" value={schoolNameEn} onChange={setSchoolNameEn} />
                <ClassicInput label="អក្សរកាត់" value={abbreviation} onChange={setAbbreviation} />
                <ClassicInput label="លេខកូដសាលា (EMIS Code)" value={schoolCode} onChange={setSchoolCode} required />
                <ClassicInput label="មន្ទីរអប់រំ យុវជន និងកីឡា" value={department} onChange={setDepartment} />
                <ClassicSelect 
                  label="កម្រិតសាលា" 
                  value={schoolType} 
                  onChange={setSchoolType} 
                  options={['វិទ្យាល័យ (ទី៧-១២)', 'អនុវិទ្យាល័យ (ទី៧-៩)', 'បឋមសិក្សា (ទី១-៦)']} 
                />
              </div>
            </div>

            {/* Location Card */}
            <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs space-y-5">
              <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFCF59]"></span>
                ទីតាំងភូមិសាស្ត្រ
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ClassicInput label="ភូមិ" value={village} onChange={setVillage} />
                <ClassicInput label="ឃុំ / សង្កាត់" value={commune} onChange={setCommune} />
                <ClassicInput label="ស្រុក / ខណ្ឌ" value={district} onChange={setDistrict} />
                <ClassicInput label="ខេត្ត / រាជធានី" value={province} onChange={setProvince} />
              </div>
            </div>

            {/* Infrastructure Card */}
            <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs space-y-5">
              <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                ហេដ្ឋារចនាសម្ព័ន្ធ និងប្រភពថាមពល
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ClassicSelect 
                  label="ប្រភពទឹកស្អាត" 
                  value={waterSupply} 
                  onChange={setWaterSupply} 
                  options={['ទឹកអណ្តូង / ម៉ាស៊ីនចម្រោះ', 'ទឹកម៉ាស៊ីនរដ្ឋ', 'ទឹកភ្លៀង', 'គ្មានប្រភពទឹក']} 
                />
                <ClassicSelect 
                  label="ប្រភពអគ្គិសនី" 
                  value={electricity} 
                  onChange={setElectricity} 
                  options={['អគ្គិសនីរដ្ឋ', 'សូឡា (Solar)', 'ម៉ាស៊ីនភ្លើង', 'គ្មានអគ្គិសនី']} 
                />
                <ClassicSelect 
                  label="ប្រព័ន្ធអ៊ីនធឺណិត" 
                  value={internet} 
                  onChange={setInternet} 
                  options={['Wi-Fi', 'ខ្សែអុបទិក (Fiber)', '4G/5G Router', 'គ្មាន']} 
                />
              </div>
            </div>

          </div>

          {/* Right Column: Key Personnel */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 shadow-xs space-y-5">
              <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                គណៈគ្រប់គ្រង និងទំនាក់ទំនង
              </h3>
              
              <div className="space-y-4">
                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
                  <span className="text-xs font-black text-[#155EEF] uppercase block">នាយកសាលា</span>
                  <ClassicInput label="គោត្តនាម & នាម" value={principalName} onChange={setPrincipalName} />
                  <ClassicInput label="លេខទូរស័ព្ទ" value={principalPhone} onChange={setPrincipalPhone} />
                </div>

                <div className="p-3.5 bg-yellow-50/50 rounded-xl border border-yellow-100 space-y-3">
                  <span className="text-xs font-black text-amber-700 uppercase block">គ្រូទទួលបន្ទុក ICT / Admin</span>
                  <ClassicInput label="គោត្តនាម & នាម" value={ictLeadName} onChange={setIctLeadName} />
                  <ClassicInput label="លេខទូរស័ព្ទ" value={ictLeadPhone} onChange={setIctLeadPhone} />
                  <ClassicInput label="អ៊ីមែល" value={ictLeadEmail} onChange={setIctLeadEmail} />
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <span className="text-xs font-black text-slate-700 uppercase block">គណៈកម្មការទ្រទ្រង់សាលា (SMC)</span>
                  <ClassicInput label="ប្រធាន SMC" value={smcHeadName} onChange={setSmcHeadName} />
                  <ClassicInput label="លេខទូរស័ព្ទ" value={smcHeadPhone} onChange={setSmcHeadPhone} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
