'use client';

import React, { useState } from 'react';
import { Save, RefreshCcw, CheckCircle2, Download } from 'lucide-react';
import Image from 'next/image';

export default function AdminSchoolInfoPage() {
  const [isSavingSchool, setIsSavingSchool] = useState(false);
  const [schoolSaved, setSchoolSaved] = useState(false);
  
  // Basic Info
  const [schoolName, setSchoolName] = useState('វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង');
  const [schoolNameEn, setSchoolNameEn] = useState('Hun Sen Peam Ro High School');
  const [schoolType, setSchoolType] = useState('វិទ្យាល័យ (ទី៧-១២)');
  const [schoolCode, setSchoolCode] = useState('14110401901');
  const [academicYear, setAcademicYear] = useState('២០២៥-២០២៦');
  const [abbreviation, setAbbreviation] = useState('');
  const [department, setDepartment] = useState('');
  
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

  const handleSaveSchool = () => {
    setIsSavingSchool(true);
    setTimeout(() => {
      setIsSavingSchool(false);
      setSchoolSaved(true);
      setTimeout(() => setSchoolSaved(false), 3000);
    }, 1500);
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
    <div className="space-y-6 animate-fadeIn select-none p-4 md:p-8 bg-slate-50 min-h-screen">
      
      {/* ព័ត៌មានសាលា (School Info) Card */}
      <div className="bg-white rounded-[24px] shadow-sm hover:shadow-md border border-slate-100 p-6 md:p-8 transition-all">
        
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">ព័ត៌មានសាលា</h2>
          <button
            onClick={handleSaveSchool}
            disabled={isSavingSchool || schoolSaved}
            className={`px-6 py-2.5 rounded shadow-sm text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              schoolSaved 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                : isSavingSchool 
                  ? 'bg-[#155EEF]/70 text-white cursor-wait' 
                  : 'bg-[#155EEF] hover:bg-blue-700 text-white'
            }`}
          >
            {schoolSaved ? <CheckCircle2 className="w-4 h-4" /> : isSavingSchool ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {schoolSaved ? 'បានរក្សាទុក' : isSavingSchool ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
          {/* Logo Section */}
          <div className="flex flex-col items-center gap-4 shrink-0 mx-auto md:mx-0">
            <div className="w-48 h-48 rounded-full border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden bg-white relative">
              <Image 
                src="/school_logo.png" 
                alt="School Logo" 
                fill
                className="object-contain p-2"
              />
            </div>
          </div>

          {/* Form Fields Section */}
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <ClassicInput 
              label="ឈ្មោះសាលា (ខ្មែរ)" 
              value={schoolName} 
              onChange={setSchoolName} 
              required 
            />
            <ClassicInput 
              label="ឈ្មោះសាលា (ភាសាអង់គ្លេស)" 
              value={schoolNameEn} 
              onChange={setSchoolNameEn} 
              required 
            />
            <ClassicSelect 
              label="ប្រភេទសាលា" 
              value={schoolType} 
              onChange={setSchoolType} 
              required 
              options={['វិទ្យាល័យ (ទី៧-១២)', 'អនុវិទ្យាល័យ', 'បឋមសិក្សា']}
            />
            <ClassicInput 
              label="អក្សរកាត់" 
              value={abbreviation} 
              onChange={setAbbreviation} 
              placeholder="បញ្ចូលឈ្មោះ..." 
            />
            <ClassicInput 
              label="មន្ទីរ/ការិយាល័យ" 
              value={department} 
              onChange={setDepartment} 
              placeholder="បញ្ចូលឈ្មោះ..." 
            />
            <ClassicInput 
              label="លេខសម្គាល់សាលា" 
              value={schoolCode} 
              onChange={setSchoolCode} 
              required 
            />
            <ClassicInput 
              label="ឆ្នាំសិក្សា" 
              value={academicYear} 
              onChange={setAcademicYear} 
              required 
            />
            
            {/* Level Checkboxes matching the image */}
            <div className="col-span-1 sm:col-span-2 space-y-3 mt-2">
              <label className="text-[13px] font-bold text-slate-700 block">
                កម្រិតភូមិសិក្សា <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" disabled />
                  <span className="text-sm text-slate-500">បឋមសិក្សា</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" defaultChecked />
                  <span className="text-sm text-slate-700">អនុវិទ្យាល័យ</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" defaultChecked />
                  <span className="text-sm text-slate-700">វិទ្យាល័យ</span>
                </label>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ព័ត៌មានទំនាក់ទំនង និងបុគ្គលិក (Contact & Personnel) Card */}
      <div className="bg-white rounded-[24px] shadow-sm hover:shadow-md border border-slate-100 p-6 md:p-8 transition-all">
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mb-8">ព័ត៌មានទំនាក់ទំនង និងបុគ្គលិក</h2>
        
        <div className="space-y-8">
          {/* Principal */}
          <div>
            <h3 className="text-sm font-bold text-slate-500 mb-4 pb-2 border-b border-slate-100">នាយកសាលា</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
              <ClassicInput label="នាយកសាលា" value={principalName} onChange={setPrincipalName} />
              <ClassicSelect label="គោរមងារ" value={principalTitle} onChange={setPrincipalTitle} options={['នាយកសាលា', 'នាយិកាសាលា', 'Professor']} />
              <ClassicInput label="លេខទូរស័ព្ទ" value={principalPhone} onChange={setPrincipalPhone} required />
            </div>
          </div>

          {/* ICT Lead */}
          <div>
            <h3 className="text-sm font-bold text-slate-500 mb-4 pb-2 border-b border-slate-100">គ្រូបង្គោល ICT</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
              <ClassicInput label="ឈ្មោះ" value={ictLeadName} onChange={setIctLeadName} />
              <ClassicInput label="លេខទូរស័ព្ទ" value={ictLeadPhone} onChange={setIctLeadPhone} required />
              <ClassicInput label="អ៊ីមែល" value={ictLeadEmail} onChange={setIctLeadEmail} required />
            </div>
          </div>

          {/* SMC Head */}
          <div>
            <h3 className="text-sm font-bold text-slate-500 mb-4 pb-2 border-b border-slate-100">ប្រធាន គ.គ.ស</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
              <ClassicInput label="ឈ្មោះ" value={smcHeadName} onChange={setSmcHeadName} />
              <ClassicInput label="លេខទូរស័ព្ទ" value={smcHeadPhone} onChange={setSmcHeadPhone} required />
            </div>
          </div>
        </div>
      </div>

      {/* ទីតាំងភូមិសាស្ត្រ និងហេដ្ឋារចនាសម្ព័ន្ធ (Location & Infrastructure) Card */}
      <div className="bg-white rounded-[24px] shadow-sm hover:shadow-md border border-slate-100 p-6 md:p-8 transition-all">
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mb-8">ទីតាំង និងហេដ្ឋារចនាសម្ព័ន្ធ</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Address */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-slate-500 pb-2 border-b border-slate-100">ទីតាំងភូមិសាស្ត្រ</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              <ClassicInput label="ខេត្ត/ក្រុង" value={province} onChange={setProvince} />
              <ClassicInput label="ស្រុក/ខណ្ឌ" value={district} onChange={setDistrict} />
              <ClassicInput label="ឃុំ/សង្កាត់" value={commune} onChange={setCommune} />
              <ClassicInput label="ភូមិ" value={village} onChange={setVillage} />
            </div>
          </div>

          {/* Infrastructure */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-slate-500 pb-2 border-b border-slate-100">ហេដ្ឋារចនាសម្ព័ន្ធ</h3>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5">
              <ClassicInput label="ប្រព័ន្ធទឹកស្អាត" value={waterSupply} onChange={setWaterSupply} />
              <ClassicInput label="ប្រព័ន្ធអគ្គិសនី" value={electricity} onChange={setElectricity} />
              <ClassicInput label="ប្រព័ន្ធអ៊ីនធឺណិត" value={internet} onChange={setInternet} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
