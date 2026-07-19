'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Student, StudentHealthRecord } from '@/types';
import { Save, Search, ChevronDown, Activity, AlertCircle, Printer, Download, History, HeartHandshake, ClipboardList, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { upsertHealthRecords } from './actions';
import * as XLSX from 'xlsx';

interface HealthBoardClientProps {
  students: Student[];
  healthRecords: StudentHealthRecord[];
  classId: string;
}

const DEMO_STUDENTS: Student[] = [
  { id: 'std-1', class_id: 'demo-class-1', full_name: 'កែវ ច័ន្ទធីតា', gender: 'F', is_active: true, student_id_number: '04931' },
  { id: 'std-2', class_id: 'demo-class-1', full_name: 'ខៀវ សុវណ្ណារាជ', gender: 'M', is_active: true, student_id_number: '04932' },
];

export default function HealthBoardClient({ students: initialStudents, healthRecords, classId }: HealthBoardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDemoMode, classes, activeClass } = useAuth();
  
  // Use demo data if in demo mode and no students are passed
  const students = (isDemoMode && initialStudents.length === 0) ? DEMO_STUDENTS : initialStudents;

  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'screening' | 'attention' | 'history'>('screening');

  // Default to today's date for new records
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' }).format(new Date());
  const [recordDate, setRecordDate] = useState(today);

  useEffect(() => {
    if (classId === 'all' && activeClass?.id) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('classId', activeClass.id);
      startTransition(() => router.replace(`?${params.toString()}`));
    }
  }, [activeClass?.id, classId, router, searchParams]);

  // Initialize state from existing records for the selected date
  const initialData: Record<string, Partial<StudentHealthRecord>> = {};
  students.forEach(student => {
    const existing = healthRecords.find(r => r.student_id === student.id && r.recorded_date === recordDate);
    initialData[student.id] = {
      student_id: student.id,
      class_id: student.class_id || undefined,
      recorded_date: recordDate,
      weight_kg: existing?.weight_kg || undefined,
      height_cm: existing?.height_cm || undefined,
      vision_left: existing?.vision_left || '',
      vision_right: existing?.vision_right || '',
      hearing: existing?.hearing || '',
      dental: existing?.dental || '',
      notes: existing?.notes || ''
    };
  });

  const [formData, setFormData] = useState(initialData);

  // When date changes, update form data based on records for that date
  const handleDateChange = (newDate: string) => {
    setRecordDate(newDate);
    const newData: Record<string, Partial<StudentHealthRecord>> = {};
    students.forEach(student => {
      const existing = healthRecords.find(r => r.student_id === student.id && r.recorded_date === newDate);
      newData[student.id] = {
        student_id: student.id,
        class_id: student.class_id || undefined,
        recorded_date: newDate,
        weight_kg: existing?.weight_kg || undefined,
        height_cm: existing?.height_cm || undefined,
        vision_left: existing?.vision_left || '',
        vision_right: existing?.vision_right || '',
        hearing: existing?.hearing || '',
        dental: existing?.dental || '',
        notes: existing?.notes || ''
      };
    });
    setFormData(newData);
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set('classId', val);
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const handleInputChange = (studentId: string, field: keyof StudentHealthRecord, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (classId === 'all') {
      alert('សូមជ្រើសរើសថ្នាក់ណាមួយជាមុនសិន។');
      return;
    }

    setIsSaving(true);
    try {
      const recordsToSave = Object.values(formData).filter(r => r.weight_kg !== undefined || r.height_cm !== undefined || r.notes !== '');
      await upsertHealthRecords(recordsToSave);
      alert('ទិន្នន័យសុខភាពត្រូវបានរក្សាទុកដោយជោគជ័យ។');
    } catch {
      alert('បរាជ័យក្នុងការរក្សាទុកទិន្នន័យ។');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const latestByStudent = new Map<string, StudentHealthRecord>();
  [...healthRecords].sort((a, b) => b.recorded_date.localeCompare(a.recorded_date)).forEach(record => {
    if (!latestByStudent.has(record.student_id)) latestByStudent.set(record.student_id, record);
  });
  const healthConcerns = students.flatMap(student => {
    const record = latestByStudent.get(student.id);
    if (!record) return [];
    const heightM = Number(record.height_cm || 0) / 100;
    const bmi = Number(record.bmi || (record.weight_kg && heightM ? Number(record.weight_kg) / (heightM * heightM) : 0));
    const reasons = [
      bmi > 0 && bmi < 18.5 ? `BMI ទាប (${bmi.toFixed(1)})` : '',
      bmi > 25 ? `BMI ខ្ពស់ (${bmi.toFixed(1)})` : '',
      record.vision_left && record.vision_left !== 'ធម្មតា' ? `ភ្នែកឆ្វេង៖ ${record.vision_left}` : '',
      record.vision_right && record.vision_right !== 'ធម្មតា' ? `ភ្នែកស្តាំ៖ ${record.vision_right}` : '',
      record.hearing && record.hearing !== 'ធម្មតា' ? `ការស្តាប់៖ ${record.hearing}` : '',
      record.dental && record.dental !== 'ធម្មតា' ? `ធ្មេញ៖ ${record.dental}` : '',
      record.notes || '',
    ].filter(Boolean);
    return reasons.length ? [{ student, record, bmi, reasons }] : [];
  }).filter(item => item.student.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
  const historicalRows = healthRecords.map(record => ({ record, student: students.find(student => student.id === record.student_id) })).filter(item => item.student && item.student.full_name.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => b.record.recorded_date.localeCompare(a.record.recorded_date));

  const exportHealth = () => {
    const rows = filteredStudents.map((student, index) => {
      const record = formData[student.id] || {};
      const weight = Number(record.weight_kg || 0);
      const heightM = Number(record.height_cm || 0) / 100;
      const bmi = weight > 0 && heightM > 0 ? Number((weight / (heightM * heightM)).toFixed(1)) : '';
      return { 'ល.រ': index + 1, 'អត្តលេខ': student.student_id_number || '', 'គោត្តនាម និងនាម': student.full_name,
        'ភេទ': student.gender === 'F' || student.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស', 'កាលបរិច្ឆេទ': recordDate,
        'ទម្ងន់': record.weight_kg || '', 'កម្ពស់': record.height_cm || '', BMI: bmi,
        'ភ្នែកឆ្វេង': record.vision_left || '', 'ភ្នែកស្តាំ': record.vision_right || '', 'ការស្តាប់': record.hearing || '', 'ធ្មេញ': record.dental || '', 'កំណត់សម្គាល់': record.notes || '' };
    });
    const sheet = XLSX.utils.json_to_sheet(rows); const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Student Health');
    XLSX.writeFile(book, `Student_Health_${classId}_${recordDate}.xlsx`);
  };

  return (
    <div className={`space-y-6 animate-fadeIn ${isPending ? 'opacity-70' : ''}`}>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
            សុខភាពសិក្សា
          </h1>
          <p className="text-sm font-semibold text-[#64748B] mt-1.5">
            កត់ត្រា និងតាមដានស្ថានភាពសុខភាពសិស្សប្រចាំថ្នាក់
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative shrink-0">
            <select
              value={classId}
              onChange={handleClassChange}
              disabled={isPending}
              className="appearance-none bg-white border border-slate-200/80 rounded-full px-5 py-2.5 pr-10 text-sm font-bold text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155EEF] cursor-pointer"
            >
              <option value="all">ជ្រើសរើសថ្នាក់</option>
              {classes.map(cls => <option key={cls.id} value={cls.id}>ថ្នាក់ {cls.name}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ស្វែងរកសិស្ស..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200/80 rounded-full py-2.5 pl-11 pr-4 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155EEF]"
            />
          </div>

          <div className="flex items-center gap-2 print:hidden shrink-0 mt-2 sm:mt-0">
            <button 
              onClick={exportHealth}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-full text-sm transition-colors border border-slate-200 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Excel
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-full text-sm transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" /> បោះពុម្ព
            </button>
          </div>
          
          <button
            onClick={handleSave}
            disabled={isSaving || classId === 'all'}
            className="flex items-center gap-2 bg-[#155EEF] text-white px-5 py-2.5 rounded-full font-bold shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកទិន្នន័យ'}
          </button>
        </div>
      </header>

      {/* Tab Menu */}
      <div className="overflow-x-auto print:hidden pb-2">
        <div className="flex items-center gap-1 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl w-max border border-white/60 shadow-sm">
          {[
            { id: 'screening', label: 'បញ្ចូលការពិនិត្យ', icon: ClipboardList, count: null },
            { id: 'attention', label: 'ត្រូវយកចិត្តទុកដាក់', icon: AlertTriangle, count: healthConcerns.length },
            { id: 'history', label: 'ប្រវត្តិសុខភាព', icon: History, count: healthRecords.length },
          ].map(({ id, label, icon: Icon, count }) => (
            <button key={id} onClick={() => setActiveTab(id as typeof activeTab)} className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition-all duration-300 ${activeTab === id ? 'bg-white text-[#155EEF] shadow-md shadow-slate-200/50 scale-105' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'}`}>
              <Icon className="w-4 h-4" />{label}
              {count !== null && <span className={`px-1.5 py-0.5 rounded-full text-[9px] border ${id === 'attention' && count ? 'bg-rose-100/50 text-rose-700 border-rose-200' : 'bg-slate-100/50 text-slate-600 border-slate-200'}`}>{count}</span>}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'attention' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <HealthMetric label="សិស្សត្រូវតាមដាន" value={healthConcerns.length} tone="rose" />
            <HealthMetric label="បញ្ហា BMI" value={healthConcerns.filter(item => item.bmi > 0 && (item.bmi < 18.5 || item.bmi > 25)).length} tone="amber" />
            <HealthMetric label="ភ្នែក/ត្រចៀក/ធ្មេញ" value={healthConcerns.filter(item => item.reasons.some(reason => /ភ្នែក|ស្តាប់|ធ្មេញ/.test(reason))).length} tone="blue" />
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl shadow-slate-200/40 border border-white/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead><tr className="bg-slate-50/50 text-[10px] font-black text-slate-500"><th className="p-4">សិស្ស</th><th className="p-4">ពិនិត្យចុងក្រោយ</th><th className="p-4">បញ្ហាត្រូវតាមដាន</th><th className="p-4 text-right">សកម្មភាព</th></tr></thead>
                <tbody className="divide-y divide-slate-100/50 text-xs">
                  {healthConcerns.map(({ student, record, reasons }) => <tr key={student.id} className="hover:bg-slate-50/50 transition-colors"><td className="p-4"><p className="font-black text-slate-800">{student.full_name}</p><p className="text-[10px] font-bold text-slate-400">{student.student_id_number || '—'}</p></td><td className="p-4 font-bold text-slate-600">{record.recorded_date}</td><td className="p-4"><div className="flex flex-wrap gap-1">{reasons.map(reason => <span key={reason} className="px-2 py-1 rounded-md bg-rose-50 text-rose-700 font-black">{reason}</span>)}</div></td><td className="p-4 text-right"><Link href={`/support?student=${encodeURIComponent(student.id)}&category=health`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#155EEF] to-blue-600 text-white font-black shadow-sm hover:shadow-md transition-all"><HeartHandshake className="w-3.5 h-3.5" />បើកករណីគាំទ្រ</Link></td></tr>)}
                  {!healthConcerns.length && <tr><td colSpan={4} className="p-12 text-center"><Activity className="w-8 h-8 text-emerald-500 mx-auto" /><p className="font-black text-slate-600 mt-2">មិនមានបញ្ហាសុខភាពដែលត្រូវតាមដាន</p></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl shadow-slate-200/40 border border-white/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead><tr className="bg-slate-50/50 text-[10px] font-black text-slate-500"><th className="p-4">កាលបរិច្ឆេទ</th><th className="p-4">សិស្ស</th><th className="p-4">ទម្ងន់/កម្ពស់</th><th className="p-4">BMI</th><th className="p-4">ភ្នែក</th><th className="p-4">ការស្តាប់</th><th className="p-4">ធ្មេញ</th><th className="p-4">កំណត់ចំណាំ</th></tr></thead>
              <tbody className="divide-y divide-slate-100/50 text-xs">
                {historicalRows.map(({ record, student }) => { const heightM = Number(record.height_cm || 0) / 100; const bmi = Number(record.bmi || (record.weight_kg && heightM ? Number(record.weight_kg) / (heightM * heightM) : 0)); return <tr key={record.id} className="hover:bg-slate-50/50 transition-colors"><td className="p-4 font-black text-slate-700">{record.recorded_date}</td><td className="p-4 font-black text-slate-800">{student?.full_name}</td><td className="p-4 font-bold text-slate-600">{record.weight_kg || '—'} kg / {record.height_cm || '—'} cm</td><td className="p-4 font-black">{bmi ? bmi.toFixed(1) : '—'}</td><td className="p-4 font-bold">{record.vision_left || '—'} / {record.vision_right || '—'}</td><td className="p-4 font-bold">{record.hearing || '—'}</td><td className="p-4 font-bold">{record.dental || '—'}</td><td className="p-4 font-bold text-slate-500">{record.notes || '—'}</td></tr>})}
                {!historicalRows.length && <tr><td colSpan={8} className="p-12 text-center font-bold text-slate-400">មិនទាន់មានប្រវត្តិពិនិត្យសុខភាព</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'screening' && (
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl shadow-slate-200/40 border border-white/60">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-extrabold text-slate-800">តារាងស្រង់ទិន្នន័យសុខភាព</h2>
            {classId !== 'all' && (
              <span className="text-xs font-black bg-rose-50 text-rose-600 px-2 py-1 rounded-lg border border-rose-100">
                ថ្នាក់ទី {classId.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-600">កាលបរិច្ឆេទពិនិត្យ:</span>
            <input
              type="date"
              value={recordDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#155EEF] cursor-pointer"
            />
          </div>
        </div>

        {classId === 'all' ? (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-600 mb-2">សូមជ្រើសរើសថ្នាក់</h3>
            <p className="text-sm font-medium text-slate-500">
              ជ្រើសរើសថ្នាក់ណាមួយនៅខាងលើ ដើម្បីចាប់ផ្តើមបញ្ចូលទិន្នន័យសុខភាពសិស្ស។
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 uppercase font-extrabold bg-slate-50/80 border-b border-slate-200/80 sticky top-0">
                <tr>
                  <th className="px-4 py-4 whitespace-nowrap w-16">ល.រ</th>
                  <th className="px-4 py-4 whitespace-nowrap min-w-[150px]">ឈ្មោះសិស្ស</th>
                  <th className="px-4 py-4 whitespace-nowrap w-20 text-center">ភេទ</th>
                  <th className="px-4 py-4 whitespace-nowrap min-w-[100px]">ទម្ងន់ (គ.ក)</th>
                  <th className="px-4 py-4 whitespace-nowrap min-w-[100px]">កម្ពស់ (ស.ម)</th>
                  <th className="px-4 py-4 whitespace-nowrap min-w-[120px]">ភ្នែកឆ្វេង</th>
                  <th className="px-4 py-4 whitespace-nowrap min-w-[120px]">ភ្នែកស្តាំ</th>
                  <th className="px-4 py-4 whitespace-nowrap min-w-[120px]">ត្រចៀក</th>
                  <th className="px-4 py-4 whitespace-nowrap min-w-[120px]">ធ្មេញ</th>
                  <th className="px-4 py-4 whitespace-nowrap min-w-[200px]">កំណត់ចំណាំ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500 font-medium">
                      មិនមានសិស្សនៅក្នុងថ្នាក់នេះទេ
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, index) => {
                    const data = formData[student.id] || {};
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-600">{index + 1}</td>
                        <td className="px-4 py-3 font-extrabold text-slate-800">{student.full_name}</td>
                        <td className="px-4 py-3 font-bold text-slate-500 text-center">{student.gender}</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.1"
                            value={data.weight_kg || ''}
                            onChange={(e) => handleInputChange(student.id, 'weight_kg', parseFloat(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-700 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                            placeholder="kg"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.1"
                            value={data.height_cm || ''}
                            onChange={(e) => handleInputChange(student.id, 'height_cm', parseFloat(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-700 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                            placeholder="cm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={data.vision_left || ''}
                            onChange={(e) => handleInputChange(student.id, 'vision_left', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-semibold text-slate-700 focus:outline-none focus:border-rose-400 cursor-pointer"
                          >
                            <option value="">ជ្រើសរើស</option>
                            <option value="ធម្មតា">ធម្មតា</option>
                            <option value="ម៉្ញូប">ម៉្ញូប</option>
                            <option value="ស្រវាំង">ស្រវាំង</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={data.vision_right || ''}
                            onChange={(e) => handleInputChange(student.id, 'vision_right', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-semibold text-slate-700 focus:outline-none focus:border-rose-400 cursor-pointer"
                          >
                            <option value="">ជ្រើសរើស</option>
                            <option value="ធម្មតា">ធម្មតា</option>
                            <option value="ម៉្ញូប">ម៉្ញូប</option>
                            <option value="ស្រវាំង">ស្រវាំង</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={data.hearing || ''}
                            onChange={(e) => handleInputChange(student.id, 'hearing', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-semibold text-slate-700 focus:outline-none focus:border-rose-400 cursor-pointer"
                          >
                            <option value="">ជ្រើសរើស</option>
                            <option value="ធម្មតា">ធម្មតា</option>
                            <option value="ខ្សោយ">ខ្សោយ</option>
                            <option value="ថ្លង់">ថ្លង់</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={data.dental || ''}
                            onChange={(e) => handleInputChange(student.id, 'dental', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-semibold text-slate-700 focus:outline-none focus:border-rose-400 cursor-pointer"
                          >
                            <option value="">ជ្រើសរើស</option>
                            <option value="ធម្មតា">ធម្មតា</option>
                            <option value="ពុក">ពុកធ្មេញ</option>
                            <option value="ឈឺ">ឈឺធ្មេញ</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={data.notes || ''}
                            onChange={(e) => handleInputChange(student.id, 'notes', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-semibold text-slate-700 focus:outline-none focus:border-rose-400"
                            placeholder="កំណត់ចំណាំផ្សេងៗ..."
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

function HealthMetric({ label, value, tone }: { label: string; value: number; tone: 'rose' | 'amber' | 'blue' }) {
  const styles = {
    rose: { bg: 'bg-rose-500', from: 'from-rose-500', to: 'to-rose-600', shadow: 'shadow-rose-200' },
    amber: { bg: 'bg-amber-500', from: 'from-amber-500', to: 'to-amber-600', shadow: 'shadow-amber-200' },
    blue: { bg: 'bg-blue-500', from: 'from-[#155EEF]', to: 'to-blue-600', shadow: 'shadow-blue-200' },
  };
  const s = styles[tone];
  
  return (
    <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 p-5 shadow-xl shadow-slate-200/40 group hover:scale-[1.02] transition-all duration-300">
      <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${s.from} ${s.to} opacity-[0.08] rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700`} />
      <div className="flex items-center gap-4 relative z-10">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.from} ${s.to} flex items-center justify-center text-white font-black text-xl shadow-lg ${s.shadow}`}>
          {value}
        </div>
        <div>
          <p className="text-sm font-extrabold text-slate-800">{label}</p>
        </div>
      </div>
    </div>
  );
}
