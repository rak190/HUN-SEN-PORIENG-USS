'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Student, StudentHealthRecord } from '@/types';
import { Save, Search, ChevronDown, Activity, AlertCircle } from 'lucide-react';
import { upsertHealthRecords } from './actions';

interface HealthBoardClientProps {
  students: Student[];
  healthRecords: StudentHealthRecord[];
  classId: string;
}

export default function HealthBoardClient({ students, healthRecords, classId }: HealthBoardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Default to today's date for new records
  const today = new Date().toISOString().split('T')[0];
  const [recordDate, setRecordDate] = useState(today);

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

  const handleInputChange = (studentId: string, field: keyof StudentHealthRecord, value: any) => {
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
    } catch (error) {
      alert('បរាជ័យក្នុងការរក្សាទុកទិន្នន័យ។');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <option value="12a">ថ្នាក់ទី 12 ក</option>
              <option value="11b">ថ្នាក់ទី 11 ខ</option>
              <option value="10c">ថ្នាក់ទី 10 គ</option>
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

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60">
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
    </div>
  );
}
