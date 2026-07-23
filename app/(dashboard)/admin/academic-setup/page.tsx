'use client';

import React, { useState } from 'react';
import { 
  BookOpen, Plus, Search, Calendar, ChevronRight, CheckCircle2, 
  Users, Building, School, Settings, ArrowRight, Save, Wand2, GraduationCap, AlertCircle
} from 'lucide-react';

export default function AcademicSetupPage() {
  const [activeStep, setActiveStep] = useState(1);
  const [academicYear, setAcademicYear] = useState('2025-2026');

  // Mock data for classes
  const mockClasses = [
    { id: '10A', name: 'ថ្នាក់ ១០ ក', shift: 'ព្រឹក', teacher: 'សុខ សាន្ត' },
    { id: '10B', name: 'ថ្នាក់ ១០ ខ', shift: 'ព្រឹក', teacher: 'មិនទាន់ចាត់តាំង' },
    { id: '11A', name: 'ថ្នាក់ ១១ ក', shift: 'រសៀល', teacher: 'ចាន់ ធូ' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn select-none max-w-5xl mx-auto pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            <School className="w-8 h-8 text-[#155EEF]" />
            ការកំណត់សាលារៀន (School Setup)
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-1">
            ដំណើរការរៀបចំឆ្នាំសិក្សា និងចាត់តាំងថ្នាក់រៀន តាមស្ដង់ដារ MoEYS SIS
          </p>
        </div>
      </header>

      {/* Stepper Workflow */}
      <div className="flex items-center justify-between bg-white p-4 rounded-[20px] shadow-xs border border-slate-100">
        <div className={`flex items-center gap-3 ${activeStep >= 1 ? 'text-[#155EEF]' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${activeStep >= 1 ? 'bg-blue-100' : 'bg-slate-100'}`}>1</div>
          <span className="font-bold text-sm hidden sm:block">ឆ្នាំសិក្សា</span>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300" />
        
        <div className={`flex items-center gap-3 ${activeStep >= 2 ? 'text-[#155EEF]' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${activeStep >= 2 ? 'bg-blue-100' : 'bg-slate-100'}`}>2</div>
          <span className="font-bold text-sm hidden sm:block">បង្កើតថ្នាក់រៀន</span>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300" />
        
        <div className={`flex items-center gap-3 ${activeStep >= 3 ? 'text-[#155EEF]' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${activeStep >= 3 ? 'bg-blue-100' : 'bg-slate-100'}`}>3</div>
          <span className="font-bold text-sm hidden sm:block">គ្រូបន្ទុកថ្នាក់</span>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300" />
        
        <div className={`flex items-center gap-3 ${activeStep >= 4 ? 'text-indigo-600' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${activeStep >= 4 ? 'bg-indigo-100' : 'bg-slate-100'}`}>4</div>
          <span className="font-bold text-sm hidden sm:block">ឡើងថ្នាក់</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-[24px] shadow-sm border border-slate-100/80 p-6 sm:p-8 overflow-hidden relative">
        
        {/* STEP 1: Academic Year */}
        {activeStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-extrabold text-slate-800">កំណត់ឆ្នាំសិក្សាបច្ចុប្បន្ន</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">ឆ្នាំសិក្សា (Academic Year)</label>
                <select 
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 focus:border-[#155EEF] focus:ring-1 focus:ring-[#155EEF] outline-none"
                >
                  <option value="2025-2026">២០២៥ - ២០២៦</option>
                  <option value="2024-2025">២០២៤ - ២០២៥</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">កាលបរិច្ឆេទចូលរៀន (Start Date)</label>
                <input type="date" defaultValue="2025-11-01" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-[#155EEF] outline-none" />
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3 mt-4">
              <Settings className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-amber-800 leading-relaxed">
                ការកំណត់ឆ្នាំសិក្សានឹងជះឥទ្ធិពលដល់ការទាញយករបាយការណ៍ SIS ទាំងអស់។ សូមប្រាកដថាអ្នកបានជ្រើសរើសឆ្នាំសិក្សាត្រឹមត្រូវមុននឹងបន្ត។
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={() => setActiveStep(2)}
                className="px-6 py-3 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-sm shadow-md flex items-center gap-2"
              >
                បន្ទាប់ (បង្កើតថ្នាក់រៀន) <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Classes */}
        {activeStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Building className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-extrabold text-slate-800">គ្រប់គ្រងថ្នាក់រៀនសរុប</h2>
              </div>
              <button className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-lg text-xs flex items-center gap-2 border border-emerald-200">
                <Plus className="w-4 h-4" /> បន្ថែមថ្នាក់រៀន
              </button>
            </div>

            <div className="overflow-hidden border border-slate-200 rounded-2xl">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">ឈ្មោះថ្នាក់</th>
                    <th className="px-6 py-4">វេនសិក្សា (Shift)</th>
                    <th className="px-6 py-4 text-center">ស្ថានភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                  {mockClasses.map((cls, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">{cls.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs ${cls.shift === 'ព្រឹក' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {cls.shift}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-[10px] border border-emerald-100">Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between pt-4">
              <button 
                onClick={() => setActiveStep(1)}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-sm transition-colors"
              >
                ត្រឡប់ក្រោយ
              </button>
              <button 
                onClick={() => setActiveStep(3)}
                className="px-6 py-3 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-sm shadow-md flex items-center gap-2"
              >
                បន្ទាប់ (ចាត់តាំងគ្រូ) <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Assign Teachers */}
        {activeStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-extrabold text-slate-800">ចាត់តាំងគ្រូបន្ទុកថ្នាក់ (Homeroom Assignment)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockClasses.map((cls, idx) => (
                <div key={idx} className="p-5 border border-slate-200 rounded-2xl bg-white shadow-xs hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-black text-lg text-slate-900">{cls.name}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{cls.shift}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">គ្រូបន្ទុកថ្នាក់</label>
                    <select className={`w-full p-2 border rounded-lg text-xs font-bold outline-none ${cls.teacher === 'មិនទាន់ចាត់តាំង' ? 'border-rose-300 text-rose-600 bg-rose-50' : 'border-slate-200 text-slate-700 bg-slate-50'}`}>
                      <option>{cls.teacher}</option>
                      {cls.teacher === 'មិនទាន់ចាត់តាំង' && <option>ជ្រើសរើសគ្រូ...</option>}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-8 border-t border-slate-100 mt-8">
              <button 
                onClick={() => setActiveStep(2)}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-sm transition-colors"
              >
                ត្រឡប់ក្រោយ
              </button>
              <button 
                onClick={() => setActiveStep(4)}
                className="px-6 py-3 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-sm shadow-md flex items-center gap-2"
              >
                បន្ទាប់ (រៀបចំឡើងថ្នាក់) <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Promotion Wizard */}
        {activeStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 mb-6">
              <Wand2 className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-extrabold text-slate-800">ការឡើងថ្នាក់ដោយស្វ័យប្រវត្តិ (Promotion Wizard)</h2>
            </div>
            
            <p className="text-sm font-semibold text-slate-600 mb-8">
              កំណត់លក្ខខណ្ឌ ដើម្បីឲ្យប្រព័ន្ធធ្វើការរុញសិស្សទៅថ្នាក់ថ្មី ដោយស្វ័យប្រវត្តិ។ 
              ទិន្នន័យឆ្នាំចាស់ {academicYear === '2025-2026' ? '2024-2025' : 'ឆ្នាំមុន'} នឹងត្រូវបានរក្សាទុកជា Archive។
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                {/* Source */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">១. ថ្នាក់ប្រភព (Source Class)</label>
                  <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-800 outline-none">
                    <option>ថ្នាក់ ១០ ក</option>
                    <option>ថ្នាក់ ១០ ខ</option>
                  </select>
                </div>
                
                {/* Condition */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">២. លក្ខខណ្ឌ (Pass Criteria)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">មធ្យមភាគ {`>=`}</span>
                    <input type="number" defaultValue={25} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-800 text-center outline-none" />
                  </div>
                </div>

                {/* Destination */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">៣. ថ្នាក់គោលដៅ (Dest. Class)</label>
                  <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-800 outline-none">
                    <option>ថ្នាក់ ១១ ក</option>
                    <option>ថ្នាក់ ១១ ខ</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200 w-full sm:w-auto">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-bold">សិស្សដែលធ្លាក់ នឹងត្រូវបានកត់ត្រាជា "ត្រួតថ្នាក់" ដោយស្វ័យប្រវត្តិ។</span>
                </div>
                
                <button 
                  onClick={() => {
                    alert(`ប្រព័ន្ធនឹងដំណើរការ:\n- បិទបញ្ជីថ្នាក់ ១០ក ឆ្នាំសិក្សាចាស់ (${academicYear === '2025-2026' ? '2024-2025' : 'ឆ្នាំមុន'})\n- បង្កើតទិន្នន័យសិស្សថ្មីសម្រាប់ឆ្នាំ ${academicYear}\n- សិស្សមានពិន្ទុ >= 25 នឹងចូលថ្នាក់ ១១ក\n- សិស្សមានពិន្ទុ < 25 នឹងជាប់ឈ្មោះជា 'ត្រួតថ្នាក់'\n\nទិន្នន័យត្រូវបានរក្សាទុកដោយសុវត្ថិភាព!`);
                  }}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-sm shadow-md flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <GraduationCap className="w-4 h-4" /> ដំណើរការ (Execute)
                </button>
              </div>
            </div>

            <div className="flex justify-between pt-8 border-t border-slate-100 mt-8">
              <button 
                onClick={() => setActiveStep(3)}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-sm transition-colors"
              >
                ត្រឡប់ក្រោយ
              </button>
              <button 
                onClick={() => alert('រក្សាទុកការកំណត់សាលាដោយជោគជ័យ!')}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm shadow-md shadow-emerald-500/20 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> បញ្ចប់ការរៀបចំ (Finish Setup)
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
