'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import * as XLSX from 'xlsx';
import {
  Users, Search, UserPlus, Download, Edit, MapPin, Heart, FileSpreadsheet, Table,
  Phone, AlertCircle, FileText, UserSquare2, BarChart3, Info, BookOpen, Clock, Activity, TrendingUp, AlertTriangle, LogOut, ChevronDown
} from 'lucide-react';
import StudentImportModal from '@/components/students/StudentImportModal';
import StudentGridEntryModal from '@/components/students/StudentGridEntryModal';

interface MassiveProfilingStudent {
  id: string;
  // Tab 1: Basic
  student_id_number: string;
  full_name: string;
  gender: string;
  date_of_birth: string;
  age: number;
  birth_cert_no: string;
  student_phone: string;
  // Tab 2: Academic
  status: 'new' | 'repeater' | 'transfer';
  prev_school: string;
  scholarship: 'yes' | 'no';
  id_poor: 'none' | 'level_1' | 'level_2';
  orphan: 'yes' | 'no';
  indigenous: 'yes' | 'no';
  distance_km: number;
  // Tab 3: Health
  weight_kg: number;
  height_m: number;
  bmi: number;
  nutrition_status: string;
  disability: 'none' | 'mild' | 'severe';
  assistive_device: string;
  health_issues: string;
  // Tab 4: Family
  father_name: string; father_job: string; father_phone: string;
  mother_name: string; mother_job: string; mother_phone: string;
  guardian_name: string; guardian_job: string; guardian_phone: string;
  siblings_count: number;
  migrant_status: 'none' | 'parents' | 'student';
  domestic_violence: 'yes' | 'no';
  housing: string;
  income: number;
  // Tab 5: Address & Status
  address: string;
  current_status: 'active' | 'dropout' | 'deceased';
  // Risk & Class tracking (from Mockup)
  risk_level: 'low' | 'medium' | 'high';
  attendance_rate: number;
}

export const INITIAL_STUDENTS: MassiveProfilingStudent[] = [
  { 
    id: 'std-1', student_id_number: '04931', full_name: 'កែវ ច័ន្ទធីតា', gender: 'F', date_of_birth: '2010-05-14', age: 15, birth_cert_no: 'B-001', student_phone: '012345678',
    status: 'new', prev_school: 'ប. ជា ស៊ីម', scholarship: 'no', id_poor: 'none', orphan: 'no', indigenous: 'no', distance_km: 2.5,
    weight_kg: 45, height_m: 1.53, bmi: 19.2, nutrition_status: 'ធម្មតា', disability: 'none', assistive_device: 'គ្មាន', health_issues: 'ធម្មតា',
    father_name: 'កែវ សំណាង', father_job: 'កសិករ', father_phone: '070789217', mother_name: 'វ៉ាត សំអូន', mother_job: 'កសិករ', mother_phone: '070789217',
    guardian_name: '', guardian_job: '', guardian_phone: '', siblings_count: 2, migrant_status: 'none', domestic_violence: 'no', housing: 'ផ្ទះឈើប្រកស័ង្កសី', income: 200,
    address: 'ភូមិអង្គរយស ឃុំព្រែកអន្ទះ', current_status: 'active',
    risk_level: 'high', attendance_rate: 88
  },
  { 
    id: 'std-2', student_id_number: '04932', full_name: 'ខៀវ សុវណ្ណារាជ', gender: 'M', date_of_birth: '2009-11-20', age: 16, birth_cert_no: 'B-002', student_phone: '098765432',
    status: 'repeater', prev_school: 'ប. បាក់ដោក', scholarship: 'yes', id_poor: 'level_1', orphan: 'no', indigenous: 'no', distance_km: 12.0,
    weight_kg: 40, height_m: 1.55, bmi: 16.6, nutrition_status: 'ស្គម', disability: 'none', assistive_device: 'គ្មាន', health_issues: 'ខ្សោយគំហើញ',
    father_name: 'ខៀវ សារ៉ុម', father_job: 'កសិករ', father_phone: '0967219931', mother_name: 'កុន ច្រិប', mother_job: 'កសិករ', mother_phone: '0967219931',
    guardian_name: '', guardian_job: '', guardian_phone: '', siblings_count: 4, migrant_status: 'parents', domestic_violence: 'no', housing: 'ផ្ទះថ្ម', income: 250,
    address: 'ភូមិថ្មី ឃុំព្រែកអន្ទះ', current_status: 'active',
    risk_level: 'medium', attendance_rate: 96
  },
];

const DEFAULT_FORM: Partial<MassiveProfilingStudent> = {
  gender: 'M', status: 'new', prev_school: '', scholarship: 'no', id_poor: 'none', orphan: 'no', indigenous: 'no', distance_km: 0,
  weight_kg: 40, height_m: 1.50, disability: 'none', assistive_device: '', health_issues: '',
  siblings_count: 0, migrant_status: 'none', domestic_violence: 'no', housing: '', income: 0, current_status: 'active',
  risk_level: 'low', attendance_rate: 100
};

const VIEW_TABS = [
  { id: 1, label: 'មូលដ្ឋាន', icon: UserSquare2 },
  { id: 2, label: 'ការសិក្សា', icon: FileText },
  { id: 3, label: 'សុខភាព', icon: Heart },
  { id: 4, label: 'គ្រួសារ', icon: Users },
  { id: 5, label: 'ទីលំនៅ', icon: MapPin },
];

export default function StudentsPage() {
  const { activeClass } = useAuth();
  const [students, setStudents] = useState<MassiveProfilingStudent[]>(INITIAL_STUDENTS);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [mainTab, setMainTab] = useState<'list' | 'at-risk' | 'transfer'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const [activeTableView, setActiveTableView] = useState(1);
  const [activeModalTab, setActiveModalTab] = useState(1);
  const [formData, setFormData] = useState<Partial<MassiveProfilingStudent>>({});

  // Contact Modal State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactStudent, setContactStudent] = useState<MassiveProfilingStudent | null>(null);

  // Status Change Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({
    studentId: '',
    actionType: 'ផ្ទេរចេញ',
    actionDate: new Date().toISOString().split('T')[0],
    reason: ''
  });
  const [transferRecords, setTransferRecords] = useState<any[]>([]);

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusForm.studentId) return;
    
    const student = students.find(s => s.id === statusForm.studentId);
    if (student) {
       // update student status
       let newStatus = 'dropout';
       if (statusForm.actionType === 'ផ្ទេរចេញ') newStatus = 'transfer';
       else if (statusForm.actionType === 'មរណភាព') newStatus = 'deceased';
       
       setStudents(students.map(s => s.id === student.id ? { ...s, current_status: newStatus as any } : s));
       
       // add to records
       setTransferRecords([{
          id: Date.now().toString(),
          student_id_number: student.student_id_number,
          full_name: student.full_name,
          status: statusForm.actionType,
          date: statusForm.actionDate,
          reason: statusForm.reason
       }, ...transferRecords]);
    }
    
    setIsStatusModalOpen(false);
    setStatusForm({
      studentId: '',
      actionType: 'ផ្ទេរចេញ',
      actionDate: new Date().toISOString().split('T')[0],
      reason: ''
    });
  };

  const filteredStudents = students.filter(s => s.full_name.includes(searchQuery) || s.student_id_number.includes(searchQuery));

  // Auto-calculate BMI
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

  const handleExportGEIP = () => {
    const wsData = students.map((std) => ({
      'អត្តលេខ': std.student_id_number,
      'នាមត្រកូល និងនាមខ្លួន': std.full_name,
      'ភេទ': std.gender === 'F' ? 'ស្រី' : 'ប្រុស',
      'ថ្ងៃខែឆ្នាំកំណើត': std.date_of_birth,
      'អាយុ': std.age,
      'លេខសំបុត្រកំណើត': std.birth_cert_no,
      'ស្ថានភាពសិស្ស': std.status === 'new' ? 'ថ្មី' : std.status === 'repeater' ? 'ត្រួតថ្នាក់' : 'ផ្ទេរចូល',
      'សាលាចំណុះឬក្រៅចំណុះ': std.prev_school,
      'ជនជាតិដើមភាគតិច': std.indigenous === 'yes' ? 'បាទ/ចាស' : 'ទេ',
      'ប្រភេទពិការភាព': std.disability === 'none' ? 'គ្មាន' : std.disability === 'mild' ? 'ស្រាល' : 'ធ្ងន់ធ្ងរ',
      'ឧបករណ៍ជំនួយ': std.assistive_device,
      'កំព្រា': std.orphan === 'yes' ? 'បាទ/ចាស' : 'ទេ',
      'បណ្ណក្រីក្រ': std.id_poor === 'none' ? 'គ្មាន' : std.id_poor === 'level_1' ? 'កម្រិត ១' : 'កម្រិត ២',
      'អាហារូបករណ៍': std.scholarship === 'yes' ? 'បាទ/ចាស' : 'ទេ',
      'ចម្ងាយ (គ.ម)': std.distance_km,
      'ទម្ងន់': std.weight_kg,
      'កម្ពស់': std.height_m,
      'BMI': std.bmi,
      'លទ្ធផលវាយតម្លៃសុខភាព': std.nutrition_status,
      'បញ្ហាសុខភាព': std.health_issues,
      'ឈ្មោះឪពុក': std.father_name, 'មុខរបរឪពុក': std.father_job, 'ទូរស័ព្ទឪពុក': std.father_phone,
      'ឈ្មោះម្តាយ': std.mother_name, 'មុខរបរម្តាយ': std.mother_job, 'ទូរស័ព្ទម្តាយ': std.mother_phone,
      'ចំណាកស្រុក': std.migrant_status,
      'ហឹង្សាក្នុងគ្រួសារ': std.domestic_violence === 'yes' ? 'មាន' : 'គ្មាន',
      'ជម្រក': std.housing,
      'ប្រាក់ចំណូល/ខែ': `$${std.income}`,
      'បងប្អូនបង្កើត': std.siblings_count,
      'អាសយដ្ឋានបច្ចុប្បន្ន': std.address,
      'លេខទូរស័ព្ទសិស្ស': std.student_phone,
      'ស្ថានភាពចុងក្រោយ': std.current_status,
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GEIP Master Profiling");
    XLSX.writeFile(wb, `MoEYS_GEIP_Master_Data_${activeClass?.name || 'Class'}.xlsx`);
  };

  const openAddModal = () => {
    setFormData({ ...DEFAULT_FORM, student_id_number: `ID-${Math.floor(Math.random()*10000)}` });
    setActiveModalTab(activeTableView); // Open modal to current table view
    setIsModalOpen(true);
  };

  const openEditModal = (std: MassiveProfilingStudent) => {
    setFormData(std);
    setActiveModalTab(activeTableView); // Open modal exactly to what they are looking at
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (formData.id) {
      setStudents(prev => prev.map(s => s.id === formData.id ? { ...s, ...formData } as MassiveProfilingStudent : s));
    } else {
      setStudents(prev => [...prev, { ...formData, id: `std-${Date.now()}` } as MassiveProfilingStudent]);
    }
    setIsModalOpen(false);
  };

  const handleBulkSuccess = (newStudents: any[]) => {
    // Add new students to the list.
    setStudents(prev => [...prev, ...newStudents]);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <Users className="w-8 h-8 text-[#155EEF]" />
            <span>បញ្ជីឈ្មោះសិស្ស</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] mt-1">គ្រប់គ្រងប្រវត្តិរូបលម្អិតសិស្សសម្រាប់ការចុះឈ្មោះ GEIP រួមមាន សុខភាព គ្រួសារ និងការសិក្សា</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportGEIP} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2">
            <Download className="w-4 h-4" /> ទាញយកទិន្នន័យ GEIP
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex space-x-2 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          onClick={() => setMainTab('list')}
          className={`flex items-center gap-2 px-6 py-3 font-black text-sm border-b-2 whitespace-nowrap transition-colors ${mainTab === 'list' ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <Users className="w-4 h-4" /> បញ្ជីរាយនាមសិស្ស
        </button>

        <button
          onClick={() => setMainTab('at-risk')}
          className={`flex items-center gap-2 px-6 py-3 font-black text-sm border-b-2 whitespace-nowrap transition-colors ${mainTab === 'at-risk' ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <AlertTriangle className="w-4 h-4" /> សិស្សប្រឈម
        </button>
        <button
          onClick={() => setMainTab('transfer')}
          className={`flex items-center gap-2 px-6 py-3 font-black text-sm border-b-2 whitespace-nowrap transition-colors ${mainTab === 'transfer' ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <LogOut className="w-4 h-4" /> ផ្ទេរ / បោះបង់ (Transfer / Dropout)
        </button>
      </div>

      {/* Tab 1: Student List (Existing Table) */}
      {mainTab === 'list' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Toolbar & Add Button */}
      <div className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-2xs flex flex-wrap justify-between items-center gap-4">
        <div className="flex gap-4 items-center">
          <div className="text-sm font-extrabold text-slate-700">សិស្សសរុប៖ <span className="text-[#155EEF]">{students.length} នាក់</span></div>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="ស្វែងរកអត្តលេខ ឬឈ្មោះ..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#155EEF]" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> នាំចូលឯកសារ
          </button>
          <button onClick={() => setIsGridModalOpen(true)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors">
            <Table className="w-4 h-4 text-indigo-600" /> បញ្ចូលតាមតារាង
          </button>
          <button onClick={openAddModal} className="px-6 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md shadow-blue-500/20 flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> បន្ថែមសិស្ស
          </button>
        </div>
      </div>

      {/* Table View Filters */}
      <div className="bg-white rounded-t-[24px] border border-slate-200 shadow-2xs flex overflow-x-auto hide-scrollbar">
        {VIEW_TABS.map(tab => (
          <button 
            key={tab.id} onClick={() => setActiveTableView(tab.id)}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-4 border-b-2 font-black text-xs transition-colors ${activeTableView === tab.id ? 'border-[#155EEF] text-[#155EEF] bg-blue-50/30' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            <tab.icon className="w-4 h-4" /> ទិដ្ឋភាព{tab.label}
          </button>
        ))}
      </div>

      {/* Dynamic Table */}
      <div className="bg-white rounded-b-[24px] border-x border-b border-slate-200 shadow-2xs -mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase">
                <th className="p-4">អត្តលេខ</th>
                <th className="p-4">ឈ្មោះ</th>
                
                {/* Dynamic Columns based on View Filter */}
                {activeTableView === 1 && (
                  <><th className="p-4 text-center">ភេទ</th><th className="p-4">ថ្ងៃខែឆ្នាំកំណើត</th><th className="p-4 text-center">អាយុ</th><th className="p-4">សំបុត្រកំណើត</th><th className="p-4">ទូរស័ព្ទសិស្ស</th></>
                )}
                {activeTableView === 2 && (
                  <><th className="p-4 text-center">ស្ថានភាព</th><th className="p-4">សាលាមុន</th><th className="p-4 text-center">អាហារូបករណ៍</th><th className="p-4 text-center">ID Poor</th><th className="p-4 text-center">ចម្ងាយ(គ.ម)</th></>
                )}
                {activeTableView === 3 && (
                  <><th className="p-4 text-center">កម្ពស់ / ទម្ងន់</th><th className="p-4 text-center">BMI / ស្ថានភាព</th><th className="p-4 text-center">ពិការភាព</th><th className="p-4">បញ្ហាសុខភាព</th></>
                )}
                {activeTableView === 4 && (
                  <><th className="p-4">ឪពុក/ម្តាយ</th><th className="p-4 text-center">បងប្អូន</th><th className="p-4 text-center">ចំណូល/ខែ</th><th className="p-4">ផ្ទះសំបែង</th><th className="p-4 text-center">ចំណាកស្រុក</th></>
                )}
                {activeTableView === 5 && (
                  <><th className="p-4">អាសយដ្ឋានបច្ចុប្បន្ន</th><th className="p-4 text-center">ស្ថានភាពចុងក្រោយ</th></>
                )}

                <th className="p-4 text-right">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="text-xs font-bold text-slate-700 divide-y divide-slate-100">
              {filteredStudents.map(std => (
                <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono text-slate-400">{std.student_id_number}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 font-black">{std.full_name}</span>
                      {std.risk_level === 'high' && <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded font-bold">ហានិភ័យខ្ពស់</span>}
                      {std.risk_level === 'medium' && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded font-bold">ហានិភ័យមធ្យម</span>}
                    </div>
                  </td>
                  
                  {activeTableView === 1 && (
                    <>
                      <td className="p-4 text-center">{std.gender === 'F' ? <span className="text-pink-600 bg-pink-50 px-2 py-0.5 rounded">ស្រី</span> : <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">ប្រុស</span>}</td>
                      <td className="p-4">{std.date_of_birth}</td>
                      <td className="p-4 text-center">{std.age}</td>
                      <td className="p-4 font-mono text-slate-500">{std.birth_cert_no || '-'}</td>
                      <td className="p-4 font-mono">{std.student_phone || '-'}</td>
                    </>
                  )}
                  {activeTableView === 2 && (
                    <>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] ${std.status === 'new' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {std.status === 'new' ? 'ថ្មី' : 'ត្រួតថ្នាក់'}
                        </span>
                      </td>
                      <td className="p-4">{std.prev_school || '-'}</td>
                      <td className="p-4 text-center">{std.scholarship === 'yes' ? 'មាន' : '-'}</td>
                      <td className="p-4 text-center">{std.id_poor !== 'none' ? <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded flex items-center justify-center gap-1 w-max mx-auto"><Heart className="w-3 h-3"/> {std.id_poor === 'level_1' ? 'កម្រិត ១' : 'កម្រិត ២'}</span> : '-'}</td>
                      <td className="p-4 text-center text-slate-500">{std.distance_km}</td>
                    </>
                  )}
                  {activeTableView === 3 && (
                    <>
                      <td className="p-4 text-center text-slate-500">{std.height_m}m / {std.weight_kg}kg</td>
                      <td className="p-4 text-center">
                        <span className={`text-[10px] px-2 py-1 rounded-md ${std.nutrition_status === 'ធម្មតា' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {std.bmi} ({std.nutrition_status})
                        </span>
                      </td>
                      <td className="p-4 text-center">{std.disability !== 'none' ? <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded flex items-center justify-center gap-1 w-max mx-auto"><AlertCircle className="w-3 h-3"/> មាន</span> : '-'}</td>
                      <td className="p-4">{std.health_issues || '-'}</td>
                    </>
                  )}
                  {activeTableView === 4 && (
                    <>
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-900">{std.father_name}</span>
                          <span className="text-[10px] text-slate-500">{std.mother_name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">{std.siblings_count}</td>
                      <td className="p-4 text-center text-emerald-600">${std.income}</td>
                      <td className="p-4 text-slate-500">{std.housing || '-'}</td>
                      <td className="p-4 text-center">{std.migrant_status !== 'none' ? 'មាន' : '-'}</td>
                    </>
                  )}
                  {activeTableView === 5 && (
                    <>
                      <td className="p-4 text-slate-600 truncate max-w-xs">{std.address}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] ${std.current_status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                          {std.current_status === 'active' ? 'កំពុងរៀន' : 'បោះបង់'}
                        </span>
                      </td>
                    </>
                  )}

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/students/${std.id}`} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors flex items-center gap-1.5">
                        <UserSquare2 className="w-3.5 h-3.5" /> ប្រវត្តិ
                      </Link>
                      <button onClick={() => openEditModal(std)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors flex items-center gap-1.5">
                        <Edit className="w-3.5 h-3.5" /> កែប្រែ
                      </button>
                      <button 
                        onClick={() => {
                          setStatusForm({ ...statusForm, studentId: std.id });
                          setIsStatusModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors flex items-center gap-1.5 font-bold whitespace-nowrap"
                      >
                        <LogOut className="w-3.5 h-3.5" /> ផ្ទេរ/បោះបង់
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && <div className="py-12 text-center text-slate-500 font-bold">មិនមានទិន្នន័យសិស្សទេ</div>}
        </div>
      </div>
      </div>
      )}



      {/* Tab 4: At-Risk Students */}
      {mainTab === 'at-risk' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Summary Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-rose-50 p-6 rounded-[24px] border border-rose-200">
              <h3 className="text-rose-800 font-black flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> ហានិភ័យកម្រិតខ្ពស់</h3>
              <div className="text-3xl font-black text-rose-600 mt-2">{students.filter(s => s.risk_level === 'high').length} នាក់</div>
            </div>
            <div className="bg-amber-50 p-6 rounded-[24px] border border-amber-200">
              <h3 className="text-amber-800 font-black flex items-center gap-2"><AlertCircle className="w-5 h-5" /> ហានិភ័យមធ្យម</h3>
              <div className="text-3xl font-black text-amber-600 mt-2">{students.filter(s => s.risk_level === 'medium').length} នាក់</div>
            </div>
            <div className="bg-emerald-50 p-6 rounded-[24px] border border-emerald-200">
              <h3 className="text-emerald-800 font-black flex items-center gap-2"><Heart className="w-5 h-5" /> ហានិភ័យទាប</h3>
              <div className="text-3xl font-black text-emerald-600 mt-2">{students.filter(s => s.risk_level === 'low').length} នាក់</div>
            </div>
          </div>
          
          <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-2xs">
             <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-black text-slate-800">សិស្សប្រឈមគ្រោះថ្នាក់បោះបង់ការសិក្សា</h3></div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 font-black text-xs">
                    <tr>
                      <th className="px-6 py-4">អត្តលេខ</th>
                      <th className="px-6 py-4">ឈ្មោះសិស្ស</th>
                      <th className="px-6 py-4">កម្រិតហានិភ័យ</th>
                      <th className="px-6 py-4">អត្រាវត្តមាន</th>
                      <th className="px-6 py-4">សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                    {students.filter(s => s.risk_level !== 'low').map(s => (
                       <tr key={s.id} className="hover:bg-slate-50">
                         <td className="px-6 py-4 font-mono text-slate-500">{s.student_id_number}</td>
                         <td className="px-6 py-4">{s.full_name}</td>
                         <td className="px-6 py-4">
                           <span className={`px-3 py-1 rounded-full text-xs ${s.risk_level === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                             {s.risk_level === 'high' ? 'ខ្ពស់' : 'មធ្យម'}
                           </span>
                         </td>
                         <td className="px-6 py-4">
                            <span className={s.attendance_rate < 90 ? 'text-rose-600' : 'text-slate-700'}>{s.attendance_rate}%</span>
                         </td>
                         <td className="px-6 py-4 flex gap-2">
                           <button 
                             onClick={() => { setContactStudent(s); setIsContactModalOpen(true); }}
                             className="px-3 py-1.5 bg-blue-50 text-[#155EEF] rounded-lg hover:bg-blue-100 flex items-center gap-1.5 transition-colors">
                             <Phone className="w-3.5 h-3.5" /> ទាក់ទងអាណាព្យាបាល
                           </button>
                         </td>
                       </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {/* Tab 5: Transfer / Dropout */}
      {mainTab === 'transfer' && (
         <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-end">
              <button 
                onClick={() => setIsStatusModalOpen(true)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs shadow-md shadow-rose-500/20 flex items-center gap-2 transition-colors">
                <LogOut className="w-4 h-4" /> ធ្វើការស្នើសុំផ្ទេរ/បោះបង់
              </button>
            </div>
            
            <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-2xs">
               <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-black text-slate-800">ប្រវត្តិសិស្សផ្ទេរ ឬបោះបង់ការសិក្សា</h3></div>
               <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-600 font-black text-xs">
                      <tr>
                        <th className="px-6 py-4">អត្តលេខ</th>
                        <th className="px-6 py-4">ឈ្មោះសិស្ស</th>
                        <th className="px-6 py-4">ស្ថានភាព</th>
                        <th className="px-6 py-4">កាលបរិច្ឆេទ</th>
                        <th className="px-6 py-4">មូលហេតុ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700 text-center">
                       {transferRecords.length === 0 ? (
                         <tr><td colSpan={5} className="py-12 text-slate-400">មិនមានទិន្នន័យ</td></tr>
                       ) : (
                         transferRecords.map(record => (
                           <tr key={record.id} className="hover:bg-slate-50 text-left">
                             <td className="px-6 py-4">{record.student_id_number}</td>
                             <td className="px-6 py-4">{record.full_name}</td>
                             <td className="px-6 py-4">
                               <span className={`px-2 py-1 rounded-md text-[10px] ${
                                  record.status === 'ផ្ទេរចេញ' ? 'bg-blue-100 text-blue-700' :
                                  record.status === 'បោះបង់ការសិក្សា' ? 'bg-amber-100 text-amber-700' :
                                  'bg-rose-100 text-rose-700'
                               }`}>
                                 {record.status}
                               </span>
                             </td>
                             <td className="px-6 py-4">{record.date}</td>
                             <td className="px-6 py-4 max-w-xs truncate text-slate-500">{record.reason || '-'}</td>
                           </tr>
                         ))
                       )}
                    </tbody>
                  </table>
               </div>
            </div>
         </div>
      )}

      {/* Massive Modal (Synchronized with activeModalTab) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-black text-slate-800">{formData.id ? 'កែប្រែប្រវត្តិរូបសិស្ស' : 'បង្កើតប្រវត្តិរូបសិស្សថ្មី'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 text-2xl font-bold hover:text-slate-700">&times;</button>
            </div>
            
            <div className="flex px-6 border-b border-slate-200 bg-slate-50 overflow-x-auto hide-scrollbar">
              {VIEW_TABS.map(tab => (
                <button 
                  key={tab.id} onClick={() => setActiveModalTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${activeModalTab === tab.id ? 'border-[#155EEF] text-[#155EEF] bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  <tab.icon className="w-4 h-4" /> {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeModalTab === 1 && (
                  <>
                    <label className="block text-xs font-bold text-slate-700">អត្តលេខ <input type="text" value={formData.student_id_number || ''} onChange={e=>setFormData({...formData, student_id_number:e.target.value})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl" /></label>
                    <label className="block text-xs font-bold text-slate-700">ឈ្មោះពេញ <input type="text" value={formData.full_name || ''} onChange={e=>setFormData({...formData, full_name:e.target.value})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl" /></label>
                    <label className="block text-xs font-bold text-slate-700">ភេទ <select value={formData.gender || 'M'} onChange={e=>setFormData({...formData, gender:e.target.value})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl"><option value="M">ប្រុស</option><option value="F">ស្រី</option></select></label>
                    <label className="block text-xs font-bold text-slate-700">ថ្ងៃខែឆ្នាំកំណើត <input type="date" value={formData.date_of_birth || ''} onChange={e=>setFormData({...formData, date_of_birth:e.target.value})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl" /></label>
                    <label className="block text-xs font-bold text-slate-700">អាយុ <input type="number" value={formData.age || ''} onChange={e=>setFormData({...formData, age:Number(e.target.value)})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl" /></label>
                    <label className="block text-xs font-bold text-slate-700">លេខសំបុត្រកំណើត <input type="text" value={formData.birth_cert_no || ''} onChange={e=>setFormData({...formData, birth_cert_no:e.target.value})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl" /></label>
                  </>
                )}
                {activeModalTab === 2 && (
                  <>
                    <label className="block text-xs font-bold text-slate-700">ស្ថានភាព <select value={formData.status||'new'} onChange={e=>setFormData({...formData, status:e.target.value as any})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl"><option value="new">ថ្មី</option><option value="repeater">ត្រួត</option></select></label>
                    <label className="block text-xs font-bold text-slate-700">សាលាមុន (បើមាន) <input type="text" value={formData.prev_school||''} onChange={e=>setFormData({...formData, prev_school:e.target.value})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl" /></label>
                    <label className="block text-xs font-bold text-slate-700">បណ្ណក្រីក្រ <select value={formData.id_poor||'none'} onChange={e=>setFormData({...formData, id_poor:e.target.value as any})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl"><option value="none">គ្មាន</option><option value="level_1">ក្រីក្រ ១</option><option value="level_2">ក្រីក្រ ២</option></select></label>
                    <label className="block text-xs font-bold text-slate-700">អាហារូបករណ៍ <select value={formData.scholarship||'no'} onChange={e=>setFormData({...formData, scholarship:e.target.value as any})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl"><option value="no">គ្មាន</option><option value="yes">មាន</option></select></label>
                    <label className="block text-xs font-bold text-slate-700">ចម្ងាយពីផ្ទះ (គ.ម) <input type="number" value={formData.distance_km||0} onChange={e=>setFormData({...formData, distance_km:Number(e.target.value)})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl" /></label>
                    <label className="block text-xs font-bold text-slate-700">កុមារកំព្រា <select value={formData.orphan||'no'} onChange={e=>setFormData({...formData, orphan:e.target.value as any})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl"><option value="no">ទេ</option><option value="yes">បាទ/ចាស</option></select></label>
                  </>
                )}
                {activeModalTab === 3 && (
                  <>
                    <label className="block text-xs font-bold text-slate-700">ទម្ងន់ <input type="number" value={formData.weight_kg||0} onChange={e=>setFormData({...formData, weight_kg:Number(e.target.value)})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl" /></label>
                    <label className="block text-xs font-bold text-slate-700">កម្ពស់ <input type="number" step="0.01" value={formData.height_m||0} onChange={e=>setFormData({...formData, height_m:Number(e.target.value)})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl" /></label>
                    <div className="sm:col-span-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between items-center shadow-inner">
                      <span className="text-sm font-black text-emerald-900">BMI លទ្ធផល៖ {formData.bmi}</span>
                      <span className={`px-4 py-1.5 rounded-full text-xs font-black ${formData.nutrition_status==='ធម្មតា'?'bg-emerald-600 text-white':'bg-rose-500 text-white'}`}>{formData.nutrition_status}</span>
                    </div>
                    <label className="block text-xs font-bold text-slate-700">ពិការភាព <select value={formData.disability||'none'} onChange={e=>setFormData({...formData, disability:e.target.value as any})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl"><option value="none">គ្មាន</option><option value="mild">ស្រាល</option><option value="severe">ធ្ងន់</option></select></label>
                    <label className="block text-xs font-bold text-slate-700">បញ្ហាសុខភាព <input type="text" value={formData.health_issues||''} onChange={e=>setFormData({...formData, health_issues:e.target.value})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl" /></label>
                  </>
                )}
                {activeModalTab === 4 && (
                  <>
                    <label className="block text-xs font-bold text-slate-700">ឈ្មោះឪពុក <input type="text" value={formData.father_name||''} onChange={e=>setFormData({...formData, father_name:e.target.value})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl" /></label>
                    <label className="block text-xs font-bold text-slate-700">មុខរបរឪពុក <input type="text" value={formData.father_job||''} onChange={e=>setFormData({...formData, father_job:e.target.value})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl" /></label>
                    <label className="block text-xs font-bold text-slate-700">ឈ្មោះម្តាយ <input type="text" value={formData.mother_name||''} onChange={e=>setFormData({...formData, mother_name:e.target.value})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl" /></label>
                    <label className="block text-xs font-bold text-slate-700">មុខរបរម្តាយ <input type="text" value={formData.mother_job||''} onChange={e=>setFormData({...formData, mother_job:e.target.value})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl" /></label>
                    <label className="block text-xs font-bold text-slate-700">ចំណូលគ្រួសារ ($) <input type="number" value={formData.income||0} onChange={e=>setFormData({...formData, income:Number(e.target.value)})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl" /></label>
                    <label className="block text-xs font-bold text-slate-700">ចំណាកស្រុក <select value={formData.migrant_status||'none'} onChange={e=>setFormData({...formData, migrant_status:e.target.value as any})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl"><option value="none">គ្មាន</option><option value="parents">ឪពុកម្តាយ</option></select></label>
                  </>
                )}
                {activeModalTab === 5 && (
                  <>
                    <label className="block text-xs font-bold text-slate-700 sm:col-span-2">អាសយដ្ឋានបច្ចុប្បន្ន <input type="text" value={formData.address||''} onChange={e=>setFormData({...formData, address:e.target.value})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl" /></label>
                    <label className="block text-xs font-bold text-slate-700">ទូរស័ព្ទឪពុកម្តាយ <input type="text" value={formData.father_phone||''} onChange={e=>setFormData({...formData, father_phone:e.target.value})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl" /></label>
                    <label className="block text-xs font-bold text-slate-700">ទូរស័ព្ទសិស្ស <input type="text" value={formData.student_phone||''} onChange={e=>setFormData({...formData, student_phone:e.target.value})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl" /></label>
                    <label className="block text-xs font-bold text-slate-700">ស្ថានភាពចុងក្រោយ <select value={formData.current_status||'active'} onChange={e=>setFormData({...formData, current_status:e.target.value as any})} className="mt-1 w-full p-2 border border-slate-200 rounded-xl"><option value="active">កំពុងរៀន</option><option value="dropout">បោះបង់</option></select></label>
                  </>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100">បោះបង់</button>
              <button onClick={handleSave} className="px-6 py-2 rounded-xl bg-[#155EEF] hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-500/20">រក្សាទុកទិន្នន័យ</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <StudentImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={handleBulkSuccess} 
      />

      {/* Contact Modal */}
      {isContactModalOpen && contactStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 pt-6 pb-4 flex justify-between items-start border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-800">ព័ត៌មានទំនាក់ទំនង</h2>
                <p className="text-xs font-bold text-slate-500 mt-1">អាណាព្យាបាលសិស្ស៖ {contactStudent.full_name}</p>
              </div>
              <button onClick={() => setIsContactModalOpen(false)} className="text-slate-400 text-2xl font-bold hover:text-slate-700">&times;</button>
            </div>
            
            <div className="p-6 space-y-4 bg-slate-50">
              {contactStudent.father_phone && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-500">ឪពុក ({contactStudent.father_name})</p>
                    <p className="text-sm font-black text-slate-800 mt-0.5">{contactStudent.father_phone}</p>
                  </div>
                  <a href={`tel:${contactStudent.father_phone}`} className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors">
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              )}

              {contactStudent.mother_phone && contactStudent.mother_phone !== contactStudent.father_phone && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-500">ម្តាយ ({contactStudent.mother_name})</p>
                    <p className="text-sm font-black text-slate-800 mt-0.5">{contactStudent.mother_phone}</p>
                  </div>
                  <a href={`tel:${contactStudent.mother_phone}`} className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors">
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              )}

              {contactStudent.guardian_phone && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-500">អាណាព្យាបាលផ្សេងទៀត</p>
                    <p className="text-sm font-black text-slate-800 mt-0.5">{contactStudent.guardian_phone}</p>
                  </div>
                  <a href={`tel:${contactStudent.guardian_phone}`} className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors">
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              )}
              
              {!contactStudent.father_phone && !contactStudent.mother_phone && !contactStudent.guardian_phone && (
                 <div className="text-center py-6 text-slate-500 font-bold text-sm">មិនមានលេខទូរស័ព្ទអាណាព្យាបាលទេ</div>
              )}
            </div>
            
            <div className="p-4 bg-white border-t border-slate-100">
               <button onClick={() => setIsContactModalOpen(false)} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors">
                 បិទ
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 pt-6 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-black text-slate-800">កត់ត្រាការផ្លាស់ប្តូរស្ថានភាព</h2>
                <p className="text-xs font-bold text-slate-500 mt-1">រក្សាទុកក្នុងប្រវត្តិបញ្ជីឈ្មោះសិក្សា</p>
              </div>
              <button onClick={() => setIsStatusModalOpen(false)} className="text-slate-400 text-2xl font-bold hover:text-slate-700">&times;</button>
            </div>
            
            <form onSubmit={handleStatusSubmit} className="p-6 pt-2 space-y-4">
              <div className="relative">
                <select 
                  required
                  value={statusForm.studentId}
                  onChange={e => setStatusForm({...statusForm, studentId: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#155EEF] appearance-none"
                >
                  <option value="" disabled>ជ្រើសរើសសិស្ស...</option>
                  {students.filter(s => s.current_status === 'active').map(s => (
                    <option key={s.id} value={s.id}>{s.student_id_number} · {s.full_name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <select 
                    value={statusForm.actionType}
                    onChange={e => setStatusForm({...statusForm, actionType: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#155EEF] appearance-none"
                  >
                    <option value="ផ្ទេរចេញ">ផ្ទេរចេញ</option>
                    <option value="បោះបង់ការសិក្សា">បោះបង់ការសិក្សា</option>
                    <option value="ដកបេក្ខភាព">ដកបេក្ខភាព</option>
                    <option value="មរណភាព">មរណភាព</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                <input 
                  type="date"
                  value={statusForm.actionDate}
                  onChange={e => setStatusForm({...statusForm, actionDate: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#155EEF]"
                />
              </div>

              <textarea 
                placeholder="មូលហេតុ..."
                value={statusForm.reason}
                onChange={e => setStatusForm({...statusForm, reason: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#155EEF] min-h-[100px] resize-none"
              ></textarea>

              <button 
                type="submit"
                className="w-full py-4 mt-2 bg-[#E3163A] hover:bg-rose-700 text-white font-black rounded-[14px] text-sm transition-colors"
              >
                រក្សាទុកការផ្លាស់ប្តូរ
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Grid Entry Modal */}
      {isGridModalOpen && (
        <StudentGridEntryModal 
          isOpen={isGridModalOpen} 
          onClose={() => setIsGridModalOpen(false)} 
          onSuccess={handleBulkSuccess} 
        />
      )}
    </div>
  );
}
