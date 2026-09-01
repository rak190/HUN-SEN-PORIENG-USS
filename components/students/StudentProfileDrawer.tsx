import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MassiveProfilingStudent, DEFAULT_FORM } from '@/app/(dashboard)/students/types';
import { UserSquare2, FileText, Heart, Users, MapPin, X, Loader2, Check } from 'lucide-react';

const VIEW_TABS = [
  { id: 1, label: 'មូលដ្ឋាន', icon: UserSquare2 },
  { id: 2, label: 'ការសិក្សា', icon: FileText },
  { id: 3, label: 'សុខភាព', icon: Heart },
  { id: 4, label: 'គ្រួសារ', icon: Users },
  { id: 5, label: 'ទីលំនៅ', icon: MapPin },
];

interface StudentProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Partial<MassiveProfilingStudent>;
  activeTab?: number;
  onSave: (data: Partial<MassiveProfilingStudent>) => Promise<void>;
}

export default function StudentProfileDrawer({ isOpen, onClose, initialData, activeTab = 1, onSave }: StudentProfileDrawerProps) {
  const [formData, setFormData] = useState<Partial<MassiveProfilingStudent>>({});
  const [activeModalTab, setActiveModalTab] = useState(activeTab);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
      setActiveModalTab(activeTab);
    }
  }, [isOpen, initialData, activeTab]);

  const handleWeightChange = (val: number) => {
    const h = formData.height_m || 0;
    let bmi = 0;
    let nutrition_status = 'ធម្មតា';
    if (val > 0 && h > 0) {
      bmi = parseFloat((val / (h * h)).toFixed(1));
      if (bmi < 18.5) nutrition_status = 'ស្គម';
      else if (bmi >= 25 && bmi < 30) nutrition_status = 'លើសទម្ងន់';
      else if (bmi >= 30) nutrition_status = 'ធាត់';
    }
    setFormData(prev => ({ ...prev, weight_kg: val, bmi, nutrition_status }));
  };

  const handleHeightChange = (val: number) => {
    const w = formData.weight_kg || 0;
    let bmi = 0;
    let nutrition_status = 'ធម្មតា';
    if (w > 0 && val > 0) {
      bmi = parseFloat((w / (val * val)).toFixed(1));
      if (bmi < 18.5) nutrition_status = 'ស្គម';
      else if (bmi >= 25 && bmi < 30) nutrition_status = 'លើសទម្ងន់';
      else if (bmi >= 30) nutrition_status = 'ធាត់';
    }
    setFormData(prev => ({ ...prev, height_m: val, bmi, nutrition_status }));
  };

  useEffect(() => {
    if (formData.weight_kg && formData.height_m && formData.height_m > 0) {
      const bmi = parseFloat((formData.weight_kg / (formData.height_m * formData.height_m)).toFixed(1));
      let status = 'ធម្មតា';
      if (bmi < 17) status = 'ស្គម';
      else if (bmi < 18.5) status = 'ខ្វះគីឡូ';
      else if (bmi >= 25 && bmi < 30) status = 'លើសគីឡូ';
      else if (bmi >= 30) status = 'ធាត់';
      
      if (formData.bmi !== bmi || formData.nutrition_status !== status) {
        setFormData(prev => ({ ...prev, bmi, nutrition_status: status }));
      }
    }
  }, [formData.weight_kg, formData.height_m]);

  const handleSaveInternal = async () => {
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#155EEF] flex items-center justify-center font-black">
              <UserSquare2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800">
                {formData.id ? 'កែប្រែប្រវត្តិរូបសិស្ស' : 'បង្កើតប្រវត្តិរូបសិស្សថ្មី'}
              </h2>
              <p className="text-xs font-bold text-[#64748B]">
                {formData.full_name ? `${formData.full_name} (${formData.student_id_number || 'គ្មានអត្តលេខ'})` : 'បញ្ចូលព័ត៌មានលម្អិតសិស្ស'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Tabs Navigation */}
        <div className="flex px-6 border-b border-slate-100 bg-slate-50/70 overflow-x-auto hide-scrollbar shrink-0 gap-1.5 py-1.5">
          {VIEW_TABS.map(tab => (
            <button 
              key={tab.id} 
              type="button"
              onClick={() => setActiveModalTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all cursor-pointer ${
                activeModalTab === tab.id 
                  ? 'bg-white text-[#155EEF] shadow-xs border border-slate-200/60 font-black' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" /> 
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-slate-50/30 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeModalTab === 1 && (
              <>
                <label className="block text-xs font-bold text-slate-700">
                  អត្តលេខ
                  <input type="text" value={formData.student_id_number || ''} onChange={e=>setFormData({...formData, student_id_number:e.target.value})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  ឈ្មោះពេញ
                  <input type="text" value={formData.full_name || ''} onChange={e=>setFormData({...formData, full_name:e.target.value})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  ភេទ
                  <select value={formData.gender || 'M'} onChange={e=>setFormData({...formData, gender:e.target.value})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]">
                    <option value="M">ប្រុស</option>
                    <option value="F">ស្រី</option>
                  </select>
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  ថ្ងៃខែឆ្នាំកំណើត
                  <input type="date" value={formData.date_of_birth || ''} onChange={e=>setFormData({...formData, date_of_birth:e.target.value})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  អាយុ
                  <input type="number" value={formData.age || ''} onChange={e=>setFormData({...formData, age:Number(e.target.value)})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  លេខសំបុត្រកំណើត
                  <input type="text" value={formData.birth_cert_no || ''} onChange={e=>setFormData({...formData, birth_cert_no:e.target.value})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  ប្លង់តុ (Desk Number)
                  <input type="text" placeholder="A-01" value={formData.desk_number || ''} onChange={e=>setFormData({...formData, desk_number:e.target.value})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  លេខបន្ទប់ប្រឡង (Exam Room)
                  <input type="text" placeholder="បន្ទប់ ១" value={formData.room_number || ''} onChange={e=>setFormData({...formData, room_number:e.target.value})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
              </>
            )}
            {activeModalTab === 2 && (
              <>
                <label className="block text-xs font-bold text-slate-700">
                  ស្ថានភាព
                  <select value={formData.status||'new'} onChange={e=>setFormData({...formData, status:e.target.value as any})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]">
                    <option value="new">ថ្មី</option>
                    <option value="repeater">ត្រួត</option>
                  </select>
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  សាលាមុន (បើមាន)
                  <input type="text" value={formData.prev_school||''} onChange={e=>setFormData({...formData, prev_school:e.target.value})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  បណ្ណក្រីក្រ
                  <select value={formData.id_poor||'none'} onChange={e=>setFormData({...formData, id_poor:e.target.value as any})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]">
                    <option value="none">គ្មាន</option>
                    <option value="level_1">ក្រីក្រ ១</option>
                    <option value="level_2">ក្រីក្រ ២</option>
                  </select>
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  អាហារូបករណ៍
                  <select value={formData.scholarship||'no'} onChange={e=>setFormData({...formData, scholarship:e.target.value as any})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]">
                    <option value="no">គ្មាន</option>
                    <option value="yes">មាន</option>
                  </select>
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  ចម្ងាយពីផ្ទះ (គ.ម)
                  <input type="number" value={formData.distance_km||0} onChange={e=>setFormData({...formData, distance_km:Number(e.target.value)})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  កុមារកំព្រា
                  <select value={formData.orphan||'no'} onChange={e=>setFormData({...formData, orphan:e.target.value as any})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]">
                    <option value="no">ទេ</option>
                    <option value="yes">បាទ/ចាស</option>
                  </select>
                </label>
              </>
            )}
            {activeModalTab === 3 && (
              <>
                <label className="block text-xs font-bold text-slate-700">
                  ទម្ងន់ (គ.ក្រ)
                  <input type="number" value={formData.weight_kg||0} onChange={e=>handleWeightChange(Number(e.target.value))} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  កម្ពស់ (ម៉ែត្រ ឧ. 1.55)
                  <input type="number" step="0.01" value={formData.height_m||0} onChange={e=>handleHeightChange(Number(e.target.value))} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
                <div className="sm:col-span-2 p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex justify-between items-center shadow-xs">
                  <div>
                    <span className="text-xs font-bold text-emerald-800">សន្ទស្សន៍ម៉ាសរាងកាយ (BMI)</span>
                    <div className="text-lg font-black text-emerald-950">{formData.bmi || 0}</div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black shadow-xs ${formData.nutrition_status==='ធម្មតា'?'bg-emerald-600 text-white':'bg-rose-500 text-white'}`}>
                    {formData.nutrition_status || 'ធម្មតា'}
                  </span>
                </div>
                <label className="block text-xs font-bold text-slate-700">
                  ពិការភាព
                  <select value={formData.disability||'none'} onChange={e=>setFormData({...formData, disability:e.target.value as any})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]">
                    <option value="none">គ្មាន</option>
                    <option value="mild">ស្រាល</option>
                    <option value="severe">ធ្ងន់</option>
                  </select>
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  បញ្ហាសុខភាព
                  <input type="text" value={formData.health_issues||''} onChange={e=>setFormData({...formData, health_issues:e.target.value})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
              </>
            )}
            {activeModalTab === 4 && (
              <>
                <label className="block text-xs font-bold text-slate-700">
                  ឈ្មោះឪពុក
                  <input type="text" value={formData.father_name||''} onChange={e=>setFormData({...formData, father_name:e.target.value})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  មុខរបរឪពុក
                  <input type="text" value={formData.father_job||''} onChange={e=>setFormData({...formData, father_job:e.target.value})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  ឈ្មោះម្តាយ
                  <input type="text" value={formData.mother_name||''} onChange={e=>setFormData({...formData, mother_name:e.target.value})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  មុខរបរម្តាយ
                  <input type="text" value={formData.mother_job||''} onChange={e=>setFormData({...formData, mother_job:e.target.value})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  ចំណូលគ្រួសារ ($)
                  <input type="number" value={formData.income||0} onChange={e=>setFormData({...formData, income:Number(e.target.value)})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  ចំណាកស្រុក
                  <select value={formData.migrant_status||'none'} onChange={e=>setFormData({...formData, migrant_status:e.target.value as any})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]">
                    <option value="none">គ្មាន</option>
                    <option value="parents">ឪពុកម្តាយ</option>
                  </select>
                </label>
              </>
            )}
            {activeModalTab === 5 && (
              <>
                <label className="block text-xs font-bold text-slate-700 sm:col-span-2">
                  អាសយដ្ឋានបច្ចុប្បន្ន
                  <input type="text" value={formData.address||''} onChange={e=>setFormData({...formData, address:e.target.value})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  ទូរស័ព្ទឪពុកម្តាយ
                  <input type="text" value={formData.father_phone||''} onChange={e=>setFormData({...formData, father_phone:e.target.value})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  ទូរស័ព្ទសិស្ស
                  <input type="text" value={formData.student_phone||''} onChange={e=>setFormData({...formData, student_phone:e.target.value})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  ស្ថានភាពចុងក្រោយ
                  <select value={formData.current_status||'active'} onChange={e=>setFormData({...formData, current_status:e.target.value as any})} className="mt-1 w-full p-2.5 bg-white border border-slate-200/80 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]">
                    <option value="active">កំពុងរៀន</option>
                    <option value="dropout">បោះបង់</option>
                  </select>
                </label>
              </>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3 shrink-0 rounded-b-3xl">
          <span className="text-xs font-bold text-slate-400 hidden sm:inline">
            * រាល់ការកែប្រែនឹងត្រូវធ្វើសមកាលកម្មទៅប្រព័ន្ធកណ្តាលភ្លាមៗ
          </span>
          <div className="flex gap-2.5 ml-auto">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              បោះបង់
            </button>
            <button 
              type="button" 
              onClick={handleSaveInternal} 
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-[#155EEF] hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>កំពុងរក្សាទុក...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>រក្សាទុកទិន្នន័យ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
