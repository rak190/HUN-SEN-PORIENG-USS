'use client';

import React, { useState, useEffect } from 'react';
import { 
  Save, Trash2, PencilLine, Check, Plus, BookText, SlidersHorizontal, Trophy, CheckCircle2, Loader2
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function AdminExamStandardsPage() {
  const searchParams = useSearchParams();
  const validTabs = ['subjects', 'grading'];
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'subjects' | 'grading'>(
    (initialTab && validTabs.includes(initialTab)) ? initialTab as any : 'subjects'
  );
  
  const [coefficientView, setCoefficientView] = useState('11-12-sci');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEditingGrades, setIsEditingGrades] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [gradingRanges, setGradingRanges] = useState([
    { id: 'A', label: 'ល្អប្រសើរ (Excellent)', min: 85, max: 100, color: 'emerald' },
    { id: 'B', label: 'ល្អណាស់ (Very Good)', min: 80, max: 84, color: 'emerald' },
    { id: 'C', label: 'ល្អ (Good)', min: 70, max: 79, color: 'blue' },
    { id: 'D', label: 'បង្គួរ (Fair)', min: 60, max: 69, color: 'amber' },
    { id: 'E', label: 'មធ្យម (Average)', min: 50, max: 59, color: 'orange' },
    { id: 'F', label: 'ធ្លាក់ (Fail)', min: 0, max: 49, color: 'rose' },
  ]);
  
  const [globalSubjects, setGlobalSubjects] = useState([
    { id: '1', name: 'ភាសាខ្មែរ', grades: ['7','8','9','10','11','12'], type: 'កំហិត', sci: 1, soc: 2, gen: 1 },
    { id: '2', name: 'គណិតវិទ្យា', grades: ['7','8','9','10','11','12'], type: 'កំហិត', sci: 2, soc: 1, gen: 1 },
    { id: '3', name: 'រូបវិទ្យា', grades: ['7','8','9','10','11','12'], type: 'កំហិត', sci: 2, soc: 1, gen: 1 },
    { id: '4', name: 'គីមីវិទ្យា', grades: ['7','8','9','10','11','12'], type: 'កំហិត', sci: 2, soc: 1, gen: 1 },
    { id: '5', name: 'ជីវវិទ្យា', grades: ['7','8','9','10','11','12'], type: 'កំហិត', sci: 2, soc: 1, gen: 1 },
    { id: '6', name: 'ប្រវត្តិវិទ្យា', grades: ['7','8','9','10','11','12'], type: 'កំហិត', sci: 1, soc: 2, gen: 1 },
    { id: '7', name: 'ភូមិវិទ្យា', grades: ['7','8','9','10','11','12'], type: 'កំហិត', sci: 1, soc: 2, gen: 1 },
    { id: '8', name: 'សីលធម៌ ពលរដ្ឋ', grades: ['7','8','9','10','11','12'], type: 'កំហិត', sci: 1, soc: 2, gen: 1 },
    { id: '9', name: 'ផែនដី និងបរិស្ថាន', grades: ['7','8','9','10','11','12'], type: 'កំហិត', sci: 1, soc: 1, gen: 1 },
    { id: '10', name: 'ភាសាបរទេស', grades: ['7','8','9','10','11','12'], type: 'កំហិត', sci: 1, soc: 1, gen: 1 },
  ]);

  useEffect(() => {
    async function loadStandards() {
      try {
        const res = await fetch('/api/admin/exam-standards');
        if (res.ok) {
          const { standards } = await res.json();
          if (standards) {
            if (standards.gradingRanges) setGradingRanges(standards.gradingRanges);
            if (standards.globalSubjects) setGlobalSubjects(standards.globalSubjects);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadStandards();
  }, []);

  const handleSaveStandards = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/exam-standards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standards: {
            gradingRanges,
            globalSubjects
          }
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save standards');
      }

      setHasUnsavedChanges(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert('កំហុសក្នុងការរក្សាទុក៖ ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            ស្តង់ដារការប្រលង និងមុខវិជ្ជា
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5">
            រៀបចំកម្មវិធីសិក្សា និងប្រព័ន្ធដាក់ពិន្ទុ (MoEYS Standard)
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button 
            onClick={handleSaveStandards} 
            disabled={isSaving}
            className="px-6 py-3 bg-[#155EEF] hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-full text-sm transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap group cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />}
            <span>{isSaving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកទិន្នន័យ'}</span>
          </button>
        </div>
      </header>

      {/* Success Alert */}
      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>ការកំណត់ស្តង់ដារប្រលង និងពិន្ទុត្រូវបានរក្សាទុកជោគជ័យ!</span>
        </div>
      )}

      {/* Action Switcher */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-slate-200/60 pb-4">
        <div className="flex gap-1.5 p-1 bg-white rounded-xl border border-slate-100 shadow-xs">
          <button 
            type="button" 
            onClick={() => setActiveTab('subjects')} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${activeTab === 'subjects' ? 'bg-purple-600 text-white shadow-2xs font-extrabold' : 'bg-transparent text-slate-600 hover:bg-slate-50'}`}
          >
            <BookText className="w-3.5 h-3.5" /> មុខវិជ្ជា
          </button>
          <button 
            type="button" 
            onClick={() => setActiveTab('grading')} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${activeTab === 'grading' ? 'bg-emerald-600 text-white shadow-2xs font-extrabold' : 'bg-transparent text-slate-600 hover:bg-slate-50'}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> ការកំណត់ពិន្ទុ
          </button>
        </div>
      </div>

      {/* TAB CONTENT: SUBJECTS */}
      {activeTab === 'subjects' && (
        <div className="space-y-6 animate-fadeIn max-w-6xl">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-[#155EEF] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-blue-500/20 text-white flex flex-col justify-between min-h-[130px] cursor-pointer border border-blue-400/30">
              <div className="flex justify-between items-start">
                <h2 className="text-4xl font-black text-white tracking-tight leading-none">{globalSubjects.length}</h2>
                <div className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all shadow-2xs">
                  <BookText className="w-4 h-4 text-white group-hover:text-[#155EEF] transition-colors" />
                </div>
              </div>
              <p className="text-sm font-bold text-blue-100 mt-4">មុខវិជ្ជាសរុប</p>
            </div>
            
            <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-yellow-400/30">
              <div className="flex justify-between items-start">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{globalSubjects.filter(s => s.grades.some(g => parseInt(g) < 10)).length}</h2>
                <div className="w-9 h-9 bg-yellow-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-2xs">
                  <BookText className="w-4 h-4 text-yellow-900" />
                </div>
              </div>
              <p className="text-sm font-bold text-yellow-950 mt-4">អនុវិទ្យាល័យ</p>
            </div>
            
            <div className="bg-white rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-slate-100 hover:border-slate-200">
              <div className="flex justify-between items-start">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{globalSubjects.filter(s => s.grades.some(g => parseInt(g) >= 10)).length}</h2>
                <div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-2xs">
                  <BookText className="w-4 h-4 text-indigo-600" />
                </div>
              </div>
              <p className="text-sm font-bold text-slate-500 mt-4">វិទ្យាល័យ</p>
            </div>
            
            <div className="bg-white rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-slate-100 hover:border-slate-200">
              <div className="flex justify-between items-start">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{globalSubjects.filter(s => s.type === 'កំហិត').length}</h2>
                <div className="w-9 h-9 bg-rose-50 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-2xs">
                  <BookText className="w-4 h-4 text-rose-600" />
                </div>
              </div>
              <p className="text-sm font-bold text-slate-500 mt-4">មុខវិជ្ជាកំហិត</p>
            </div>
          </div>

          <div className="bg-white rounded-[24px] shadow-sm border border-slate-100/80 flex flex-col h-[550px] overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 shrink-0 gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-[17px] flex items-center gap-2">
                  <span>កម្មវិធីសិក្សាតាមមុខវិជ្ជា</span>
                </h3>
                <p className="text-[12px] text-slate-400 font-medium mt-1">គ្រប់គ្រងបញ្ជីមុខវិជ្ជា និងកំណត់កម្រិតថ្នាក់បង្រៀនដោយផ្ទាល់</p>
              </div>
              <button 
                onClick={() => { setGlobalSubjects([...globalSubjects, { id: Date.now().toString(), name: 'មុខវិជ្ជាថ្មី', grades: ['7','8','9','10','11','12'], type: 'កំហិត', sci: 1, soc: 1, gen: 1 }]); setHasUnsavedChanges(true); }}
                className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-full text-[13px] font-bold transition-all flex items-center gap-2 shadow-sm whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-600" /> បន្ថែមមុខវិជ្ជា
              </button>
            </div>

            <div className="overflow-y-auto flex-1 h-full pb-4 px-4 sm:px-6">
              <table className="w-full text-left border-collapse min-w-[700px]" style={{borderSpacing: '0 8px', borderCollapse: 'separate'}}>
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider w-[40%] rounded-l-[16px] bg-[#f8fafc]">មុខវិជ្ជា (SUBJECT)</th>
                    <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider bg-[#f8fafc]">កម្រិតថ្នាក់ (GRADES)</th>
                    <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider w-12 text-right rounded-r-[16px] bg-[#f8fafc]"></th>
                  </tr>
                </thead>
                <tbody>
                  {globalSubjects.map((subject, idx) => (
                    <tr key={subject.id} className="bg-white hover:bg-emerald-50/30 hover:shadow-xs transition-all duration-200 group rounded-xl relative">
                      <td className="px-4 py-1.5 transition-all duration-300 rounded-l-[16px] border-y border-l border-slate-200 group-hover:border-emerald-200 relative">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg shrink-0 bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
                            <BookText className="w-4 h-4" />
                          </div>
                          <input 
                            type="text" 
                            value={subject.name}
                            placeholder="បញ្ចូលឈ្មោះមុខវិជ្ជា..."
                            onChange={(e) => {
                              const newSubjects = [...globalSubjects];
                              newSubjects[idx].name = e.target.value;
                              setGlobalSubjects(newSubjects);
                              setHasUnsavedChanges(true);
                            }}
                            className="bg-transparent border border-transparent outline-none font-black text-slate-900 text-[13px] hover:bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-md px-2 py-1.5 w-full transition-all" 
                          />
                        </div>
                      </td>
                      <td className="px-4 py-1.5 border-y border-slate-200 group-hover:border-emerald-200 transition-colors">
                        <div className="flex gap-1 flex-wrap items-center">
                          {['7','8','9','10','11','12'].map(g => {
                            const isActive = subject.grades.includes(g);
                            return (
                              <button 
                                key={g} 
                                onClick={() => {
                                  const newSubjects = [...globalSubjects];
                                  if (isActive) {
                                    newSubjects[idx].grades = subject.grades.filter(grade => grade !== g);
                                  } else {
                                    newSubjects[idx].grades = [...subject.grades, g].sort((a,b) => parseInt(a) - parseInt(b));
                                  }
                                  setGlobalSubjects(newSubjects);
                                  setHasUnsavedChanges(true);
                                }}
                                  className={`w-7 h-6 rounded-md text-[11px] font-black border transition-all cursor-pointer flex items-center justify-center ${
                                    isActive 
                                      ? 'bg-blue-50 text-[#155EEF] border-blue-200' 
                                      : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-100 hover:text-slate-600'
                                  }`}
                                title={`ថ្នាក់ទី ${g}`}
                              >
                                {g}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 rounded-r-[16px] border-y border-r border-slate-200 group-hover:border-emerald-200 text-right transition-colors relative">
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button onClick={() => { setGlobalSubjects(globalSubjects.filter(s => s.id !== subject.id)); setHasUnsavedChanges(true); }} className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: GRADING */}
      {activeTab === 'grading' && (
        <div className="space-y-6 animate-fadeIn max-w-6xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                <SlidersHorizontal className="w-6 h-6 text-[#155EEF]" /> ការកំណត់ប្រព័ន្ធពិន្ទុ (MoEYS Standard)
              </h2>
              <p className="text-sm font-semibold text-slate-500 mt-1">រៀបចំមេគុណមុខវិជ្ជា រូបមន្ត និងនិទ្ទេសស្របតាមស្តង់ដារក្រសួងអប់រំ យុវជន និងកីឡា</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white border border-slate-200 hover:bg-blue-50 text-slate-700 hover:text-[#155EEF] hover:border-blue-200 rounded-xl text-sm font-bold transition-colors shadow-xs cursor-pointer">
                ត្រឡប់ទៅលំនាំដើម
              </button>
            </div>
          </div>

          {/* Settings Grid */}
          <div className="flex flex-col gap-8">
            
            {/* Top Section */}
            <div className="w-full space-y-6">
              
              {/* Grading Letters (និទ្ទេស) */}
              <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-6 group">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 border border-blue-100 text-[#155EEF] rounded-lg">
                      <Trophy className="w-5 h-5" />
                    </div>
                    ការកំណត់និទ្ទេស (Grading Letters)
                  </h3>
                  <button 
                    onClick={() => setIsEditingGrades(!isEditingGrades)}
                    className="p-2 hover:bg-blue-50 rounded-xl text-slate-400 hover:text-[#155EEF] transition-all duration-300 shadow-sm border border-slate-100 cursor-pointer"
                  >
                    {isEditingGrades ? <Check className="w-4 h-4 text-[#155EEF]" /> : <PencilLine className="w-4 h-4" />}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gradingRanges.map((grade, index) => (
                    <div key={grade.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 hover:scale-[1.01] hover:shadow-md ${
                      grade.color === 'emerald' ? 'border-emerald-100 bg-emerald-50/30' :
                      grade.color === 'blue' ? 'border-blue-100 bg-blue-50/30' :
                      grade.color === 'amber' ? 'border-amber-100 bg-amber-50/30' :
                      grade.color === 'orange' ? 'border-orange-100 bg-orange-50/30' :
                      'border-rose-100 bg-rose-50/30'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-10 h-10 rounded-xl font-black flex items-center justify-center shadow-sm border ${
                          grade.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          grade.color === 'blue' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          grade.color === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          grade.color === 'orange' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                          'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>{grade.id}</span>
                        <span className={`text-sm font-bold ${
                          grade.color === 'emerald' ? 'text-emerald-700' :
                          grade.color === 'blue' ? 'text-blue-700' :
                          grade.color === 'amber' ? 'text-amber-700' :
                          grade.color === 'orange' ? 'text-orange-700' :
                          'text-rose-700'
                        }`}>{grade.label}</span>
                      </div>
                      {isEditingGrades ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={grade.min} 
                            onChange={(e) => {
                              const newRanges = [...gradingRanges];
                              newRanges[index].min = parseInt(e.target.value) || 0;
                              setGradingRanges(newRanges);
                              setHasUnsavedChanges(true);
                            }}
                            className="w-16 px-2 py-1 text-center bg-white border border-slate-200 rounded text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#155EEF]"
                          />
                          <span className="text-slate-400 font-bold">-</span>
                          <input 
                            type="number" 
                            value={grade.max} 
                            onChange={(e) => {
                              const newRanges = [...gradingRanges];
                              newRanges[index].max = parseInt(e.target.value) || 0;
                              setGradingRanges(newRanges);
                              setHasUnsavedChanges(true);
                            }}
                            className="w-16 px-2 py-1 text-center bg-white border border-slate-200 rounded text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#155EEF]/50"
                          />
                        </div>
                      ) : (
                        <span className={`text-sm font-black ${
                          grade.color === 'emerald' ? 'text-emerald-900' :
                          grade.color === 'blue' ? 'text-blue-900' :
                          grade.color === 'amber' ? 'text-amber-900' :
                          grade.color === 'orange' ? 'text-orange-900' :
                          'text-rose-900'
                        }`}>
                          {grade.id === 'F' ? `< ${grade.max + 1}%` : `${grade.min} - ${grade.max}%`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Section - Subject Coefficients */}
            <div className="w-full bg-white rounded-[24px] shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-transparent">
                <div className="flex flex-col gap-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 border border-blue-100 text-[#155EEF] rounded-lg">
                          <BookText className="w-5 h-5" />
                        </div>
                        ការកំណត់មេគុណមុខវិជ្ជា
                      </h3>
                      <p className="text-[11px] font-semibold text-slate-500 mt-1 ml-9">
                        កំណត់មេគុណមុខវិជ្ជាទៅតាមកម្រិតថ្នាក់នីមួយៗ
                      </p>
                    </div>
                    <button 
                      onClick={() => { setGlobalSubjects([...globalSubjects, { id: Date.now().toString(), name: '', grades: ['7','8','9','10','11','12'], type: 'កំហិត', sci: 1, soc: 1, gen: 1 }]); setHasUnsavedChanges(true); }}
                      className="px-3 py-1.5 bg-blue-50 text-[#155EEF] hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-blue-100 shrink-0 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> បន្ថែមមុខវិជ្ជា
                    </button>
                  </div>
                  <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 overflow-x-auto no-scrollbar shadow-inner w-full backdrop-blur-sm">
                    {[
                      { id: '7-8', label: '៧-៨' },
                      { id: '9', label: '៩' },
                      { id: '10', label: '១០' },
                      { id: '11-12-sci', label: '១១-១២ (វិទ្យាសាស្ត្រ)' },
                      { id: '11-12-soc', label: '១១-១២ (សង្គម)' },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setCoefficientView(tab.id)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-300 flex-1 cursor-pointer ${
                          coefficientView === tab.id 
                            ? 'bg-white text-[#155EEF] shadow-sm scale-[1.02] border border-slate-100' 
                            : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 shadow-xs">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">មុខវិជ្ជា (Subject)</th>
                      {coefficientView === '11-12-sci' ? (
                        <th className="px-6 py-4 text-xs font-black text-slate-600 bg-slate-100/50 text-center uppercase tracking-wider">មេគុណ (វិទ្យាសាស្ត្រ)</th>
                      ) : coefficientView === '11-12-soc' ? (
                        <th className="px-6 py-4 text-xs font-black text-slate-600 bg-slate-100/50 text-center uppercase tracking-wider">មេគុណ (សង្គម)</th>
                      ) : (
                        <th className="px-6 py-4 text-xs font-black text-slate-600 bg-slate-100/50 text-center uppercase tracking-wider">មេគុណ (ទូទៅ)</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {globalSubjects.map((subject, idx) => (
                      <tr key={subject.id} className="hover:bg-slate-50 transition-all duration-200 group">
                        <td className="px-6 py-3.5 transition-all duration-300">
                          <div className="flex items-center">
                            <div className="w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 -ml-2">
                              <button onClick={() => { setGlobalSubjects(globalSubjects.filter(s => s.id !== subject.id)); setHasUnsavedChanges(true); }} className="p-1 text-slate-300 hover:text-rose-500 transition-colors cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <input 
                              type="text" 
                              value={subject.name}
                              placeholder="ឈ្មោះមុខវិជ្ជា..."
                              onChange={(e) => {
                                const newSubjects = [...globalSubjects];
                                newSubjects[idx].name = e.target.value;
                                setGlobalSubjects(newSubjects);
                                setHasUnsavedChanges(true);
                              }}
                              className="bg-transparent border border-transparent outline-none font-extrabold text-slate-700 hover:border-slate-200 focus:border-[#155EEF] focus:bg-white focus:ring-2 focus:ring-[#155EEF]/20 rounded px-2 py-1 w-full text-sm transition-all" 
                            />
                          </div>
                        </td>
                        {coefficientView === '11-12-sci' ? (
                          <td className="px-6 py-3.5 text-center bg-slate-50/50 group-hover:bg-white transition-colors border-l border-slate-50">
                            <input type="number" value={subject.sci} onChange={(e) => { const newSubj = [...globalSubjects]; newSubj[idx].sci = parseInt(e.target.value)||0; setGlobalSubjects(newSubj); setHasUnsavedChanges(true); }} className="w-16 px-2 py-1.5 text-center font-black text-slate-800 bg-transparent border border-transparent rounded-xl focus:bg-white focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/20 outline-none hover:bg-white hover:border-slate-200 transition-all" />
                          </td>
                        ) : coefficientView === '11-12-soc' ? (
                          <td className="px-6 py-3.5 text-center bg-slate-50/50 group-hover:bg-white transition-colors border-l border-slate-50">
                            <input type="number" value={subject.soc} onChange={(e) => { const newSubj = [...globalSubjects]; newSubj[idx].soc = parseInt(e.target.value)||0; setGlobalSubjects(newSubj); setHasUnsavedChanges(true); }} className="w-16 px-2 py-1.5 text-center font-black text-slate-800 bg-transparent border border-transparent rounded-xl focus:bg-white focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/20 outline-none hover:bg-white hover:border-slate-200 transition-all" />
                          </td>
                        ) : (
                          <td className="px-6 py-3.5 text-center bg-slate-50/50 group-hover:bg-white transition-colors border-l border-slate-50">
                            <input type="number" value={subject.gen} onChange={(e) => { const newSubj = [...globalSubjects]; newSubj[idx].gen = parseInt(e.target.value)||0; setGlobalSubjects(newSubj); setHasUnsavedChanges(true); }} className="w-16 px-2 py-1.5 text-center font-black text-slate-800 bg-transparent border border-transparent rounded-xl focus:bg-white focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/20 outline-none hover:bg-white hover:border-slate-200 transition-all" />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sticky Action Bar */}
          <div className={`sticky bottom-6 mt-8 z-20 transition-all duration-500 ease-in-out ${hasUnsavedChanges ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
            <div className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Save className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800">រក្សាទុកការផ្លាស់ប្តូរ (Save Changes)</h4>
                  <p className="text-[11px] font-bold text-slate-500">ការផ្លាស់ប្តូរនិទ្ទេស និងមេគុណនឹងត្រូវអនុវត្តភ្លាមៗ។</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setHasUnsavedChanges(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  បោះបង់
                </button>
                <button 
                  onClick={handleSaveStandards}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#155EEF] hover:bg-blue-700 disabled:opacity-50 hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isSaving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
