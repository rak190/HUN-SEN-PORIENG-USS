'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Student, StudentHealthRecord } from '@/types';
import { 
  Save, Search, ChevronDown, Activity, AlertCircle, Printer, Download, History, 
  HeartHandshake, ClipboardList, AlertTriangle, Sparkles, CheckCircle2,
  FileSpreadsheet, FileText, Check, X, ShieldCheck,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { upsertHealthRecords } from './actions';
import * as XLSX from 'xlsx';

interface HealthBoardClientProps {
  allStudents: Student[];
  initialHealthRecords: StudentHealthRecord[];
}

// Helpers to identify actual medical issues vs normal health standards
const isAbnormalVision = (val?: string | null) => {
  if (!val) return false;
  const v = val.trim();
  if (v === '' || v === 'ធម្មតា' || v === '6/6' || v === 'ល្អ' || v.includes('?')) return false;
  return true; // e.g. 6/9, 6/12, 6/18, 6/60, ម៉្ញូប, ស្រវាំង, ពិការ
};

const isAbnormalHearing = (val?: string | null) => {
  if (!val) return false;
  const v = val.trim();
  if (v === '' || v === 'ធម្មតា' || v === 'ល្អ' || v.includes('?')) return false;
  return true; // e.g. ខ្សោយ, ខ្សោយស្តាប់, ថ្លង់
};

const isAbnormalDental = (val?: string | null) => {
  if (!val) return false;
  const v = val.trim();
  if (v === '' || v === 'ធម្មតា' || v === 'ល្អ' || v.includes('?')) return false;
  return true; // e.g. ពុកធ្មេញ, ឈឺធ្មេញ, ដកធ្មេញ
};

const sanitizeHealthValue = (val?: string | null, defaultVal: string = 'ធម្មតា') => {
  if (!val) return defaultVal;
  if (val.includes('?')) return defaultVal;
  return val.trim();
};

export default function HealthBoardClient({ allStudents, initialHealthRecords }: HealthBoardClientProps) {
  const router = useRouter();
  const { classes, activeClass, setActiveClass, profile } = useAuth();
  
  // Local class selection initialized from activeClass context
  const [selectedClassId, setSelectedClassId] = useState<string>(activeClass?.id || classes[0]?.id || 'all');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeClass?.id) {
      setSelectedClassId(activeClass.id);
    } else if (classes.length > 0 && selectedClassId === 'all') {
      setSelectedClassId(classes[0].id);
    }
  }, [activeClass?.id, classes]);

  // Close export dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter students by selected class
  const students = useMemo(() => {
    if (!selectedClassId || selectedClassId === 'all') return allStudents;
    return allStudents.filter(s => s.class_id === selectedClassId);
  }, [allStudents, selectedClassId]);

  const [healthRecords, setHealthRecords] = useState<StudentHealthRecord[]>(initialHealthRecords);

  // Sync when initialHealthRecords changes
  useEffect(() => {
    setHealthRecords(initialHealthRecords);
  }, [initialHealthRecords]);

  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'screening' | 'attention' | 'history'>('screening');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Default to today's date for new records
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' }).format(new Date());
  const [recordDate, setRecordDate] = useState(today);

  // Auto-dismiss toast after 3.5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Current human-readable class name
  const currentClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId) || activeClass || { name: '7A', grade: '7' };
  }, [classes, selectedClassId, activeClass]);

  // Automatic Data Sync: Initialize state by combining student master profile + health records
  const initialData: Record<string, Partial<StudentHealthRecord>> = useMemo(() => {
    const data: Record<string, Partial<StudentHealthRecord>> = {};
    
    students.forEach(student => {
      // Find exact record for this date or latest historical record
      const existing = healthRecords.find(r => r.student_id === student.id && r.recorded_date === recordDate);
      const anyLatest = healthRecords
        .filter(r => r.student_id === student.id)
        .sort((a, b) => b.recorded_date.localeCompare(a.recorded_date))[0];

      const refRecord = existing || anyLatest;

      // Auto-extract height & weight from student master record if not in health table
      const fallbackHeightCm = student.height_m 
        ? Math.round(student.height_m * 100) 
        : (student as any).height_cm || undefined;
      const weight = refRecord?.weight_kg || student.weight_kg || undefined;
      const heightCm = refRecord?.height_cm || fallbackHeightCm;

      // Auto-compute BMI
      const heightM = heightCm ? heightCm / 100 : 0;
      const computedBmi = weight && heightM > 0 
        ? parseFloat((Number(weight) / (heightM * heightM)).toFixed(1)) 
        : (student.bmi || undefined);

      // Auto-determine vision from devices or health issues
      let defaultVision = '6/6';
      if ((student as any).assistive_device === 'glasses' || (student as any).health_info?.includes('ភ្នែក')) {
        defaultVision = '6/12';
      }
      const cleanVisionLeft = sanitizeHealthValue(refRecord?.vision_left, defaultVision);
      const cleanVisionRight = sanitizeHealthValue(refRecord?.vision_right, defaultVision);

      // Auto-determine hearing
      let defaultHearing = 'ធម្មតា';
      if ((student as any).assistive_device === 'hearing_aid' || (student as any).health_info?.includes('ស្តាប់')) {
        defaultHearing = 'ខ្សោយ';
      }
      const cleanHearing = sanitizeHealthValue(refRecord?.hearing, defaultHearing);
      const cleanDental = sanitizeHealthValue(refRecord?.dental, 'ធម្មតា');

      // Clean notes from mojibake / question marks
      let cleanNotes = refRecord?.notes || (student as any).health_info || (student as any).health_issues || '';
      if (cleanNotes.includes('???') || cleanNotes === 'សុខភាពទូទៅល្អ') cleanNotes = '';

      data[student.id] = {
        student_id: student.id,
        class_id: student.class_id || selectedClassId || undefined,
        recorded_date: recordDate,
        weight_kg: weight,
        height_cm: heightCm,
        bmi: computedBmi,
        vision_left: cleanVisionLeft,
        vision_right: cleanVisionRight,
        hearing: cleanHearing,
        dental: cleanDental,
        notes: cleanNotes
      };
    });
    return data;
  }, [students, healthRecords, recordDate, selectedClassId]);

  const [formData, setFormData] = useState<Record<string, Partial<StudentHealthRecord>>>(initialData);

  // Sync formData when initialData changes
  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  // When date changes, update form data based on records for that date
  const handleDateChange = (newDate: string) => {
    setRecordDate(newDate);
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedClassId(val);
    const matching = classes.find(c => c.id === val);
    if (matching && setActiveClass) {
      setActiveClass(matching);
    }
  };

  const handleInputChange = (studentId: string, field: keyof StudentHealthRecord, value: string | number | undefined) => {
    setFormData(prev => {
      const current = prev[studentId] || {};
      const updated = { ...current, [field]: value };
      
      // Auto recalculate BMI if weight or height changes
      if (field === 'weight_kg' || field === 'height_cm') {
        const w = field === 'weight_kg' ? Number(value || 0) : Number(current.weight_kg || 0);
        const h = field === 'height_cm' ? Number(value || 0) : Number(current.height_cm || 0);
        const hM = h > 0 ? h / 100 : 0;
        updated.bmi = w > 0 && hM > 0 ? parseFloat((w / (hM * hM)).toFixed(1)) : undefined;
      }

      return {
        ...prev,
        [studentId]: updated
      };
    });
  };

  // Quick Fill Action: Set all empty/corrupted eye, ear, and dental fields to '6/6' & 'ធម្មតា' AND auto-save
  const handleQuickFillNormal = async () => {
    setIsSaving(true);
    
    const updatedFormData: Record<string, Partial<StudentHealthRecord>> = {};
    const recordsToSave: Partial<StudentHealthRecord>[] = [];
    const updatedHealthList: StudentHealthRecord[] = [...healthRecords];

    students.forEach(std => {
      const existing = formData[std.id] || {};
      const w = existing.weight_kg !== undefined ? existing.weight_kg : std.weight_kg || undefined;
      const h = existing.height_cm !== undefined ? existing.height_cm : (std.height_m ? Math.round(std.height_m * 100) : undefined);
      const heightM = h ? h / 100 : 0;
      const bmi = w && heightM > 0 ? parseFloat((Number(w) / (heightM * heightM)).toFixed(1)) : undefined;

      const record: Partial<StudentHealthRecord> = {
        student_id: std.id,
        class_id: std.class_id || selectedClassId || undefined,
        recorded_date: recordDate,
        weight_kg: w,
        height_cm: h,
        bmi,
        vision_left: '6/6',
        vision_right: '6/6',
        hearing: 'ធម្មតា',
        dental: 'ធម្មតា',
        notes: '',
      };

      updatedFormData[std.id] = record;
      recordsToSave.push(record);

      // Update in memory healthRecords list
      const recIdx = updatedHealthList.findIndex(r => r.student_id === std.id && r.recorded_date === recordDate);
      const mockRecord: StudentHealthRecord = {
        id: recIdx >= 0 ? updatedHealthList[recIdx].id : `rec-${std.id}-${recordDate}`,
        student_id: std.id,
        class_id: (std.class_id || selectedClassId) as string,
        recorded_date: recordDate,
        weight_kg: w,
        height_cm: h,
        bmi,
        vision_left: '6/6',
        vision_right: '6/6',
        hearing: 'ធម្មតា',
        dental: 'ធម្មតា',
        notes: '',
        created_at: new Date().toISOString()
      };

      if (recIdx >= 0) {
        updatedHealthList[recIdx] = mockRecord;
      } else {
        updatedHealthList.push(mockRecord);
      }
    });

    setFormData(updatedFormData);
    setHealthRecords(updatedHealthList);

    try {
      await upsertHealthRecords(recordsToSave);
      setToast({
        text: 'បានកំណត់ «ធម្មតា» និងរក្សាទុកទិន្នន័យជូនសិស្សទាំងអស់ដោយជោគជ័យ!',
        type: 'success'
      });
      router.refresh();
    } catch (err) {
      console.warn('Quick fill save error:', err);
      setToast({
        text: 'បានកំណត់ «ធម្មតា» លើតារាងរួចរាល់!',
        type: 'success'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (selectedClassId === 'all') {
      setToast({ text: 'សូមជ្រើសរើសថ្នាក់ណាមួយជាមុនសិន។', type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      const recordsToSave = Object.values(formData).filter(r => 
        r.weight_kg !== undefined || 
        r.height_cm !== undefined || 
        r.vision_left || 
        r.vision_right || 
        r.hearing || 
        r.dental || 
        (r.notes && r.notes.trim() !== '')
      );

      await upsertHealthRecords(recordsToSave);

      // Update in-memory records
      setHealthRecords(prev => {
        const nextList = [...prev];
        recordsToSave.forEach(rec => {
          const idx = nextList.findIndex(r => r.student_id === rec.student_id && r.recorded_date === rec.recorded_date);
          const item: StudentHealthRecord = {
            id: idx >= 0 ? nextList[idx].id : `rec-${rec.student_id}-${rec.recorded_date}`,
            student_id: rec.student_id as string,
            class_id: (rec.class_id || selectedClassId) as string,
            recorded_date: rec.recorded_date as string,
            weight_kg: rec.weight_kg,
            height_cm: rec.height_cm,
            bmi: rec.bmi,
            vision_left: rec.vision_left,
            vision_right: rec.vision_right,
            hearing: rec.hearing,
            dental: rec.dental,
            notes: rec.notes,
            created_at: new Date().toISOString()
          };
          if (idx >= 0) nextList[idx] = item;
          else nextList.push(item);
        });
        return nextList;
      });

      setToast({
        text: 'ទិន្នន័យសុខភាពត្រូវបានរក្សាទុក និង Sync ទៅកាន់តារាងសិស្សដោយជោគជ័យ!',
        type: 'success'
      });
      router.refresh();
    } catch {
      setToast({
        text: 'បរាជ័យក្នុងការរក្សាទុកទិន្នន័យ។',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const [sortState, setSortState] = useState<{ field: string | null; direction: 'asc' | 'desc' | null }>({
    field: null,
    direction: null,
  });

  const handleSort = (field: string) => {
    setSortState(prev => {
      if (prev.field !== field) {
        return { field, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { field, direction: 'desc' };
      }
      return { field: null, direction: null };
    });
  };

  const filteredStudents = useMemo(() => {
    let result = students.filter(s => 
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.student_id_number && s.student_id_number.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (sortState.field && sortState.direction) {
      const { field, direction } = sortState;
      const factor = direction === 'asc' ? 1 : -1;

      result = [...result].sort((a, b) => {
        const formA = formData[a.id] || {};
        const formB = formData[b.id] || {};

        let valA: any = a[field as keyof Student];
        let valB: any = b[field as keyof Student];

        if (field === 'weight_kg') {
          valA = formA.weight_kg !== undefined ? formA.weight_kg : (a.weight_kg || 0);
          valB = formB.weight_kg !== undefined ? formB.weight_kg : (b.weight_kg || 0);
        } else if (field === 'height_cm') {
          valA = formA.height_cm !== undefined ? formA.height_cm : (a.height_m ? a.height_m * 100 : 0);
          valB = formB.height_cm !== undefined ? formB.height_cm : (b.height_m ? b.height_m * 100 : 0);
        } else if (field === 'bmi') {
          const wA = formA.weight_kg !== undefined ? formA.weight_kg : (a.weight_kg || 0);
          const hA = (formA.height_cm !== undefined ? formA.height_cm : (a.height_m ? a.height_m * 100 : 0)) / 100;
          valA = wA > 0 && hA > 0 ? wA / (hA * hA) : 0;

          const wB = formB.weight_kg !== undefined ? formB.weight_kg : (b.weight_kg || 0);
          const hB = (formB.height_cm !== undefined ? formB.height_cm : (b.height_m ? b.height_m * 100 : 0)) / 100;
          valB = wB > 0 && hB > 0 ? wB / (hB * hB) : 0;
        } else if (field === 'vision_left') {
          valA = formA.vision_left || '';
          valB = formB.vision_left || '';
        } else if (field === 'vision_right') {
          valA = formA.vision_right || '';
          valB = formB.vision_right || '';
        } else if (field === 'hearing') {
          valA = formA.hearing || '';
          valB = formB.hearing || '';
        } else if (field === 'dental') {
          valA = formA.dental || '';
          valB = formB.dental || '';
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * factor;
        }

        return String(valA || '').localeCompare(String(valB || ''), 'km', { numeric: true }) * factor;
      });
    }

    return result;
  }, [students, searchQuery, sortState, formData]);

  const renderSortHeader = (label: string, field: string, align: 'left' | 'center' | 'right' = 'left', className: string = '') => {
    const isActive = sortState.field === field && sortState.direction !== null;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`px-3.5 py-3.5 whitespace-nowrap cursor-pointer select-none hover:bg-slate-100/80 transition-colors group ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'} ${className}`}
      >
        <div className={`inline-flex items-center gap-1.5 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
          <span>{label}</span>
          <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
            {isActive ? (
              sortState.direction === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-[#155EEF] font-bold" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-[#155EEF] font-bold" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60 group-hover:opacity-100" />
            )}
          </span>
        </div>
      </th>
    );
  };

  // Derive Health Concerns (ONLY real health concerns, no 6/6 and no ??? false positives)
  const latestByStudent = useMemo(() => {
    const map = new Map<string, StudentHealthRecord>();
    [...healthRecords].sort((a, b) => b.recorded_date.localeCompare(a.recorded_date)).forEach(record => {
      if (!map.has(record.student_id)) map.set(record.student_id, record);
    });
    return map;
  }, [healthRecords]);

  const healthConcerns = useMemo(() => {
    return students.flatMap(student => {
      const formRecord = formData[student.id];
      const record = formRecord || latestByStudent.get(student.id);
      if (!record) return [];

      const weight = Number(record.weight_kg || 0);
      const heightM = Number(record.height_cm || 0) / 100;
      const bmi = weight > 0 && heightM > 0 ? Number((weight / (heightM * heightM)).toFixed(1)) : 0;

      const reasons: string[] = [];
      if (bmi > 0 && bmi < 18.5) reasons.push(`BMI ទាប/ស្គម (${bmi})`);
      if (bmi >= 25 && bmi < 30) reasons.push(`លើសទម្ងន់ (${bmi})`);
      if (bmi >= 30) reasons.push(`ធាត់ (${bmi})`);

      if (isAbnormalVision(record.vision_left)) reasons.push(`ភ្នែកឆ្វេង៖ ${record.vision_left}`);
      if (isAbnormalVision(record.vision_right)) reasons.push(`ភ្នែកស្តាំ៖ ${record.vision_right}`);
      if (isAbnormalHearing(record.hearing)) reasons.push(`ការស្តាប់៖ ${record.hearing}`);
      if (isAbnormalDental(record.dental)) reasons.push(`ធ្មេញ៖ ${record.dental}`);

      const note = record.notes?.trim();
      if (note && !note.includes('???') && note !== 'សុខភាពទូទៅល្អ' && note !== '—' && note !== '-') {
        reasons.push(note);
      }

      return reasons.length ? [{ student, record, bmi, reasons }] : [];
    }).filter(item => item.student.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [students, formData, latestByStudent, searchQuery]);

  const historicalRows = useMemo(() => {
    let list = healthRecords.map(record => ({
      record,
      student: students.find(student => student.id === record.student_id)
    })).filter(item => item.student && item.student.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (sortState.field && sortState.direction) {
      const { field, direction } = sortState;
      const factor = direction === 'asc' ? 1 : -1;

      list = [...list].sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (field === 'recorded_date') {
          valA = a.record.recorded_date;
          valB = b.record.recorded_date;
        } else if (field === 'full_name') {
          valA = a.student?.full_name || '';
          valB = b.student?.full_name || '';
        } else if (field === 'student_id_number') {
          valA = a.student?.student_id_number || '';
          valB = b.student?.student_id_number || '';
        } else if (field === 'weight_kg') {
          valA = Number(a.record.weight_kg || 0);
          valB = Number(b.record.weight_kg || 0);
        } else if (field === 'height_cm') {
          valA = Number(a.record.height_cm || 0);
          valB = Number(b.record.height_cm || 0);
        } else if (field === 'bmi') {
          const hA = Number(a.record.height_cm || 0) / 100;
          valA = Number(a.record.bmi || (a.record.weight_kg && hA ? Number(a.record.weight_kg) / (hA * hA) : 0));
          const hB = Number(b.record.height_cm || 0) / 100;
          valB = Number(b.record.bmi || (b.record.weight_kg && hB ? Number(b.record.weight_kg) / (hB * hB) : 0));
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * factor;
        }

        return String(valA).localeCompare(String(valB), 'km', { numeric: true }) * factor;
      });
    } else {
      list.sort((a, b) => b.record.recorded_date.localeCompare(a.record.recorded_date));
    }

    return list;
  }, [healthRecords, students, searchQuery, sortState]);

  const attentionCount = healthConcerns.length;
  const screenedCount = useMemo(() => {
    return Object.values(formData).filter(r => r.weight_kg || r.height_cm || r.vision_left || r.dental).length;
  }, [formData]);
  const normalHealthCount = Math.max(0, screenedCount - healthConcerns.length);

  // 1. Export Excel (.xlsx) Context-Aware for each tab
  const exportHealthExcel = () => {
    setIsExportMenuOpen(false);

    if (activeTab === 'attention') {
      const rows = healthConcerns.map(({ student, record, bmi, reasons }, index) => ({
        'ល.រ': index + 1,
        'អត្តលេខ': student.student_id_number || '',
        'គោត្តនាម និងនាម': student.full_name,
        'ភេទ': student.gender === 'F' || student.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស',
        'កាលបរិច្ឆេទ': record.recorded_date,
        'ទម្ងន់ (គ.ក)': record.weight_kg || '',
        'កម្ពស់ (ស.ម)': record.height_cm || '',
        'BMI': bmi || '',
        'បញ្ហាសុខភាពត្រូវតាមដាន': reasons.join(', '),
        'ស្ថានភាព': 'ត្រូវការយកចិត្តទុកដាក់ និងគាំទ្រ',
        'កំណត់ចំណាំ': record.notes || ''
      }));
      const sheet = XLSX.utils.json_to_sheet(rows);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, 'Health_Attention');
      XLSX.writeFile(book, `MoEYS_Health_Attention_${currentClass?.name || 'Class'}_${recordDate}.xlsx`);
      setToast({ text: 'បានទាញយកបញ្ជីសិស្សត្រូវយកចិត្តទុកដាក់ជា Excel (.xlsx)!', type: 'success' });
      return;
    }

    if (activeTab === 'history') {
      const rows = historicalRows.map(({ record, student }, index) => {
        const heightM = Number(record.height_cm || 0) / 100;
        const bmi = Number(record.bmi || (record.weight_kg && heightM ? Number(record.weight_kg) / (heightM * heightM) : 0));
        return {
          'ល.រ': index + 1,
          'កាលបរិច្ឆេទ': record.recorded_date,
          'អត្តលេខ': student?.student_id_number || '',
          'គោត្តនាម និងនាម': student?.full_name || '',
          'ភេទ': student?.gender === 'F' || student?.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស',
          'ទម្ងន់ (គ.ក)': record.weight_kg || '',
          'កម្ពស់ (ស.ម)': record.height_cm || '',
          'BMI': bmi ? bmi.toFixed(1) : '',
          'ភ្នែកឆ្វេង': sanitizeHealthValue(record.vision_left, '6/6'),
          'ភ្នែកស្តាំ': sanitizeHealthValue(record.vision_right, '6/6'),
          'ការស្តាប់': sanitizeHealthValue(record.hearing, 'ធម្មតា'),
          'ធ្មេញ': sanitizeHealthValue(record.dental, 'ធម្មតា'),
          'កំណត់ចំណាំ': record.notes || ''
        };
      });
      const sheet = XLSX.utils.json_to_sheet(rows);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, 'Health_History');
      XLSX.writeFile(book, `MoEYS_Health_History_${currentClass?.name || 'Class'}.xlsx`);
      setToast({ text: 'បានទាញយកប្រវត្តិពិនិត្យសុខភាពជា Excel (.xlsx)!', type: 'success' });
      return;
    }

    // Default Screening Tab Excel
    const rows = filteredStudents.map((student, index) => {
      const record = formData[student.id] || {};
      const weight = Number(record.weight_kg || 0);
      const heightM = Number(record.height_cm || 0) / 100;
      const bmi = Number(record.bmi || (weight > 0 && heightM > 0 ? (weight / (heightM * heightM)).toFixed(1) : 0));
      
      let nutritionStatus = 'ធម្មតា';
      if (bmi > 0) {
        if (bmi < 18.5) nutritionStatus = 'ស្គម';
        else if (bmi >= 25 && bmi < 30) nutritionStatus = 'លើសទម្ងន់';
        else if (bmi >= 30) nutritionStatus = 'ធាត់';
      }

      return {
        'ល.រ': index + 1,
        'អត្តលេខ': student.student_id_number || '',
        'គោត្តនាម និងនាម': student.full_name,
        'ភេទ': student.gender === 'F' || student.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស',
        'កាលបរិច្ឆេទពិនិត្យ': recordDate,
        'ទម្ងន់ (គ.ក)': record.weight_kg || '',
        'កម្ពស់ (ស.ម)': record.height_cm || '',
        'BMI': bmi > 0 ? bmi : '',
        'ស្ថានភាពអាហារូបត្ថម្ភ': bmi > 0 ? nutritionStatus : '',
        'ភ្នែកឆ្វេង (Left Eye)': sanitizeHealthValue(record.vision_left, '6/6'),
        'ភ្នែកស្តាំ (Right Eye)': sanitizeHealthValue(record.vision_right, '6/6'),
        'ការស្តាប់ (Hearing)': sanitizeHealthValue(record.hearing, 'ធម្មតា'),
        'សុខភាពធ្មេញ (Dental)': sanitizeHealthValue(record.dental, 'ធម្មតា'),
        'កំណត់ចំណាំ': record.notes && !record.notes.includes('???') ? record.notes : ''
      };
    });

    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'GEIP_3.3.1.3_Health');
    XLSX.writeFile(book, `MoEYS_GEIP_Health_${currentClass?.name || 'Class'}_${recordDate}.xlsx`);
    
    setToast({ text: 'បានទាញយកឯកសារ Excel (.xlsx) ដោយជោគជ័យ!', type: 'success' });
  };

  // 2. Export PDF (.pdf) via High-Quality Context-Aware Print Preview
  const exportHealthPdf = () => {
    setIsExportMenuOpen(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 print:p-0 print:m-0 print:space-y-0 print:pb-0">
      
      {/* ================= STRICT GLOBAL PRINT STYLES ================= */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 8mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: var(--font-siemreap), 'Siemreap', sans-serif !important;
          }
          nav, aside, header, footer, .sidebar, [role="navigation"] {
            display: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>

      {/* ================= ON-SCREEN INTERACTIVE UI (STRICTLY HIDDEN DURING PRINT) ================= */}
      <div className="space-y-6 print:hidden">

        {/* Toast Notification Banner */}
        {toast && (
          <div className="fixed top-5 right-5 z-50 animate-bounce duration-300">
            <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-black ${
              toast.type === 'success'
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20'
                : 'bg-rose-500 text-white border-rose-400 shadow-rose-500/20'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              <span>{toast.text}</span>
            </div>
          </div>
        )}

        {/* Header with Sub-tabs and Global Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 shadow-2xs">
                <Activity className="w-6 h-6" />
              </div>
              <span>សុខភាពសិក្សា</span>
            </h1>
            <p className="text-xs font-semibold text-[#64748B]">
              ទិន្នន័យសុខភាពត្រូវបាន Sync ជាមួយព័ត៌មានសិស្សដោយស្វ័យប្រវត្តិ (ពិនិត្យភ្នែក ត្រចៀក ធ្មេញ និងកាយសម្បទា)
            </p>

            {/* Sub-tabs (Pill Menu) */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/60 mt-1">
              <button
                onClick={() => setActiveTab('screening')}
                className={`px-4 sm:px-5 py-2 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'screening'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <ClipboardList className="w-4 h-4" /> បញ្ចូលការពិនិត្យ
              </button>
              <button
                onClick={() => setActiveTab('attention')}
                className={`px-4 sm:px-5 py-2 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'attention'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>ត្រូវយកចិត្តទុកដាក់</span>
                {attentionCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {attentionCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 sm:px-5 py-2 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <History className="w-4 h-4" /> ប្រវត្តិសុខភាព
              </button>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 self-start sm:self-auto mt-2 sm:mt-0">
            {/* Class Dropdown */}
            <div className="relative shrink-0">
              <select
                value={selectedClassId}
                onChange={handleClassChange}
                className="appearance-none bg-white border border-slate-200/80 rounded-2xl px-5 py-2.5 pr-10 text-xs sm:text-sm font-black text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#155EEF] cursor-pointer hover:border-slate-300"
              >
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>ថ្នាក់ {cls.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* DUAL EXPORT DROPDOWN (Excel + PDF) */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-2xl text-xs sm:text-sm transition-all border border-slate-200/80 cursor-pointer shadow-2xs"
              >
                <Download className="w-4 h-4 text-[#155EEF]" />
                <span>ទាញយកទិន្នន័យ</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-fadeIn">
                  <button
                    onClick={exportHealthExcel}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-emerald-50 text-left transition-colors group cursor-pointer"
                  >
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 group-hover:scale-105 transition-transform">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">ឯកសារ Excel (.xlsx)</p>
                      <p className="text-[10px] font-bold text-slate-400">ទាញយកទិន្នន័យ Tab នេះ</p>
                    </div>
                  </button>

                  <button
                    onClick={exportHealthPdf}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-rose-50 text-left transition-colors group cursor-pointer mt-1"
                  >
                    <div className="p-2 rounded-xl bg-rose-100 text-rose-700 group-hover:scale-105 transition-transform">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">ឯកសារ PDF (.pdf)</p>
                      <p className="text-[10px] font-bold text-slate-400">A4 Landscape ផ្លូវការ MoEYS</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving || selectedClassId === 'all'}
              className="flex items-center gap-2 bg-[#155EEF] hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer hover:scale-105 active:scale-95"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកទិន្នន័យ'}
            </button>
          </div>
        </div>

        {/* ================= TAB 1: SCREENING ENTRY ================= */}
        {activeTab === 'screening' && (
          <div className="bg-white rounded-[28px] p-6 shadow-xs border border-slate-100">
            {/* Table Header Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-black text-slate-800">
                  តារាងស្រង់ទិន្នន័យសុខភាព
                </h2>
                <span className="text-xs font-black bg-rose-50 text-rose-600 px-3 py-1 rounded-xl border border-rose-100">
                  ថ្នាក់ទី {currentClass?.name || '7A'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Quick Fill Button */}
                <button
                  type="button"
                  onClick={handleQuickFillNormal}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black shadow-sm shadow-amber-500/20 cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  title="កំណត់ភ្នែក (6/6) ត្រចៀក និងធ្មេញ ទៅជា «ធម្មតា» សម្រាប់សិស្សទាំងអស់ ហើយ Save ចូល Database ភ្លាមៗ"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSaving ? 'កំពុងដំណើរការ...' : 'កំណត់ទាំងអស់ជាធម្មតា'}</span>
                </button>

                {/* Search Box */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ស្វែងរកតាមឈ្មោះ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2 pl-10 pr-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#155EEF] focus:bg-white"
                  />
                </div>

                {/* Date Picker */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5">
                  <span className="text-xs font-bold text-slate-500 shrink-0">កាលបរិច្ឆេទ:</span>
                  <input
                    type="date"
                    value={recordDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {selectedClassId === 'all' && students.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-black text-slate-700 mb-1">សូមជ្រើសរើសថ្នាក់</h3>
                <p className="text-xs font-semibold text-slate-400">
                  ជ្រើសរើសថ្នាក់ណាមួយនៅខាងលើ ដើម្បីចាប់ផ្តើមបញ្ចូលទិន្នន័យសុខភាពសិស្ស។
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/70 shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] text-slate-600 uppercase font-black bg-slate-50 border-b border-slate-200/80 sticky top-0">
                    <tr>
                      <th className="px-3.5 py-3.5 whitespace-nowrap w-12 text-center">ល.រ</th>
                      {renderSortHeader('ឈ្មោះសិស្ស', 'full_name', 'left', 'min-w-[150px]')}
                      {renderSortHeader('ភេទ', 'gender', 'center', 'w-16')}
                      {renderSortHeader('ទម្ងន់ (kg)', 'weight_kg', 'left', 'min-w-[95px]')}
                      {renderSortHeader('កម្ពស់ (cm)', 'height_cm', 'left', 'min-w-[95px]')}
                      {renderSortHeader('BMI / ស្ថានភាព', 'bmi', 'center', 'min-w-[105px]')}
                      {renderSortHeader('ភ្នែកឆ្វេង', 'vision_left', 'left', 'min-w-[115px]')}
                      {renderSortHeader('ភ្នែកស្តាំ', 'vision_right', 'left', 'min-w-[115px]')}
                      {renderSortHeader('ត្រចៀក', 'hearing', 'left', 'min-w-[115px]')}
                      {renderSortHeader('ធ្មេញ', 'dental', 'left', 'min-w-[115px]')}
                      <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[180px]">កំណត់ចំណាំ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-12 text-center text-slate-400 font-bold">
                          មិនមានសិស្សនៅក្នុងថ្នាក់នេះទេ
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student, index) => {
                        const data = formData[student.id] || {};
                        const weight = Number(data.weight_kg || 0);
                        const heightM = Number(data.height_cm || 0) / 100;
                        const bmi = Number(data.bmi || (weight > 0 && heightM > 0 ? (weight / (heightM * heightM)).toFixed(1) : 0));

                        return (
                          <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-3.5 py-3 font-bold text-slate-500 text-center">{index + 1}</td>
                            <td className="px-3.5 py-3">
                              <p className="font-black text-slate-800 text-xs">{student.full_name}</p>
                              <p className="text-[10px] font-bold text-slate-400">{student.student_id_number || '—'}</p>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                student.gender === 'F' || student.gender === 'ស្រី'
                                  ? 'bg-pink-50 text-pink-700 border border-pink-100'
                                  : 'bg-blue-50 text-blue-700 border border-blue-100'
                              }`}>
                                {student.gender === 'F' || student.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                step="0.1"
                                value={data.weight_kg !== undefined ? data.weight_kg : ''}
                                onChange={(e) => handleInputChange(student.id, 'weight_kg', e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="w-full bg-white border border-slate-200/80 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-[#155EEF] focus:ring-1 focus:ring-[#155EEF]"
                                placeholder="kg"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                step="0.5"
                                value={data.height_cm !== undefined ? data.height_cm : ''}
                                onChange={(e) => handleInputChange(student.id, 'height_cm', e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="w-full bg-white border border-slate-200/80 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-[#155EEF] focus:ring-1 focus:ring-[#155EEF]"
                                placeholder="cm"
                              />
                            </td>
                            {/* Real-time Dynamic BMI Pill */}
                            <td className="px-2 py-2 text-center">
                              {bmi > 0 ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="font-black text-slate-800 text-xs">{bmi}</span>
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
                                    bmi < 18.5
                                      ? 'bg-amber-100 text-amber-800'
                                      : bmi >= 25
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    {bmi < 18.5 ? 'ស្គម' : bmi >= 25 ? (bmi >= 30 ? 'ធាត់' : 'លើសទម្ងន់') : 'ធម្មតា'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-300 font-bold">—</span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <select
                                value={data.vision_left || '6/6'}
                                onChange={(e) => handleInputChange(student.id, 'vision_left', e.target.value)}
                                className="w-full bg-white border border-slate-200/80 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#155EEF] cursor-pointer"
                              >
                                <option value="6/6">6/6 (ធម្មតា)</option>
                                <option value="ធម្មតា">ធម្មតា</option>
                                <option value="6/9">6/9 (ស្រវាំងស្រាល)</option>
                                <option value="6/12">6/12 (ម៉្ញូបស្រាល)</option>
                                <option value="6/18">6/18 (ម៉្ញូបមធ្យម)</option>
                                <option value="6/60">6/60 (គំហើញខ្សោយ)</option>
                                <option value="ម៉្ញូប">ម៉្ញូប</option>
                                <option value="ស្រវាំង">ស្រវាំង</option>
                                <option value="ពិការ">ពិការ</option>
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <select
                                value={data.vision_right || '6/6'}
                                onChange={(e) => handleInputChange(student.id, 'vision_right', e.target.value)}
                                className="w-full bg-white border border-slate-200/80 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#155EEF] cursor-pointer"
                              >
                                <option value="6/6">6/6 (ធម្មតា)</option>
                                <option value="ធម្មតា">ធម្មតា</option>
                                <option value="6/9">6/9 (ស្រវាំងស្រាល)</option>
                                <option value="6/12">6/12 (ម៉្ញូបស្រាល)</option>
                                <option value="6/18">6/18 (ម៉្ញូបមធ្យម)</option>
                                <option value="6/60">6/60 (គំហើញខ្សោយ)</option>
                                <option value="ម៉្ញូប">ម៉្ញូប</option>
                                <option value="ស្រវាំង">ស្រវាំង</option>
                                <option value="ពិការ">ពិការ</option>
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <select
                                value={sanitizeHealthValue(data.hearing, 'ធម្មតា')}
                                onChange={(e) => handleInputChange(student.id, 'hearing', e.target.value)}
                                className="w-full bg-white border border-slate-200/80 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#155EEF] cursor-pointer"
                              >
                                <option value="ធម្មតា">ធម្មតា (ល្អ)</option>
                                <option value="ខ្សោយ">ខ្សោយ</option>
                                <option value="ខ្សោយស្តាប់">ខ្សោយស្តាប់</option>
                                <option value="ថ្លង់">ថ្លង់</option>
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <select
                                value={sanitizeHealthValue(data.dental, 'ធម្មតា')}
                                onChange={(e) => handleInputChange(student.id, 'dental', e.target.value)}
                                className="w-full bg-white border border-slate-200/80 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#155EEF] cursor-pointer"
                              >
                                <option value="ធម្មតា">ធម្មតា (ល្អ)</option>
                                <option value="ពុកធ្មេញ">ពុកធ្មេញ</option>
                                <option value="ឈឺធ្មេញ">ឈឺធ្មេញ</option>
                                <option value="ដកធ្មេញ">ដកធ្មេញ</option>
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={data.notes && !data.notes.includes('???') ? data.notes : ''}
                                onChange={(e) => handleInputChange(student.id, 'notes', e.target.value)}
                                className="w-full bg-white border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#155EEF]"
                                placeholder="ចំណាំបញ្ហាសុខភាព..."
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

        {/* ================= TAB 2: NEEDS ATTENTION ================= */}
        {activeTab === 'attention' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-black text-xl shrink-0">
                  {attentionCount}
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-800">សិស្សត្រូវតាមដានសរុប</p>
                  <p className="text-[11px] font-bold text-slate-400">មានបញ្ហាសុខភាព ឬ BMI</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-amber-100 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-black text-xl shrink-0">
                  {healthConcerns.filter(item => item.bmi > 0 && (item.bmi < 18.5 || item.bmi >= 25)).length}
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-800">បញ្ហាអាហារូបត្ថម្ភ / BMI</p>
                  <p className="text-[11px] font-bold text-slate-400">ស្គម ឬលើសទម្ងន់</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-blue-100 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-xl shrink-0">
                  {healthConcerns.filter(item => item.reasons.some(reason => /ភ្នែក|ស្តាប់|ធ្មេញ/.test(reason))).length}
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-800">ភ្នែក ត្រចៀក និងធ្មេញ</p>
                  <p className="text-[11px] font-bold text-slate-400">ត្រូវការវ៉ែនតា ឬព្យាបាល</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[28px] p-6 shadow-xs border border-slate-100 overflow-hidden">
              <h3 className="font-black text-slate-800 text-base mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <span>បញ្ជីឈ្មោះសិស្សត្រូវយកចិត្តទុកដាក់ និងគាំទ្រ</span>
              </h3>

              <div className="overflow-x-auto rounded-2xl border border-slate-200/70">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-black text-slate-600 uppercase border-b border-slate-200/80">
                    <tr>
                      <th className="p-3.5">ឈ្មោះសិស្ស</th>
                      <th className="p-3.5">កាលបរិច្ឆេទ</th>
                      <th className="p-3.5">បញ្ហាត្រូវតាមដាន</th>
                      <th className="p-3.5 text-right">សកម្មភាពគាំទ្រ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {healthConcerns.map(({ student, record, reasons }) => (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5">
                          <p className="font-black text-slate-800 text-xs">{student.full_name}</p>
                          <p className="text-[10px] font-bold text-slate-400">{student.student_id_number || '—'}</p>
                        </td>
                        <td className="p-3.5 font-bold text-slate-600">{record.recorded_date}</td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            {reasons.map((reason, idx) => (
                              <span key={idx} className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-100">
                                {reason}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <Link
                            href={`/support?student=${encodeURIComponent(student.id)}&category=health`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#155EEF] hover:bg-blue-700 text-white font-black text-xs shadow-xs hover:scale-105 transition-all"
                          >
                            <HeartHandshake className="w-3.5 h-3.5" />
                            <span>បើកករណីគាំទ្រ</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {!healthConcerns.length && (
                      <tr>
                        <td colSpan={4} className="p-12 text-center">
                          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                          <p className="font-black text-slate-700 text-sm">មិនមានសិស្សប្រឈមបញ្ហាសុខភាពត្រូវតាមដានទេ</p>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">សិស្សទាំងអស់មានស្ថានភាពសុខភាពល្អ និងប្រក្រតី</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: HEALTH HISTORY ================= */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-[28px] p-6 shadow-xs border border-slate-100 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                <span>ប្រវត្តិកំណត់ត្រាពិនិត្យសុខភាពសិស្ស</span>
              </h3>
              <span className="text-xs font-bold text-slate-500">
                សរុប {historicalRows.length} កំណត់ត្រា
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/70">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-black text-slate-600 uppercase border-b border-slate-200/80">
                  <tr>
                    {renderSortHeader('កាលបរិច្ឆេទ', 'recorded_date', 'left', 'p-3.5')}
                    {renderSortHeader('ឈ្មោះសិស្ស', 'full_name', 'left', 'p-3.5')}
                    {renderSortHeader('ទម្ងន់ / កម្ពស់', 'weight_kg', 'left', 'p-3.5')}
                    {renderSortHeader('BMI', 'bmi', 'left', 'p-3.5')}
                    <th className="p-3.5">ភ្នែក (ឆ្វេង / ស្តាំ)</th>
                    <th className="p-3.5">ការស្តាប់</th>
                    <th className="p-3.5">ធ្មេញ</th>
                    <th className="p-3.5">កំណត់ចំណាំ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {historicalRows.map(({ record, student }) => {
                    const heightM = Number(record.height_cm || 0) / 100;
                    const bmi = Number(record.bmi || (record.weight_kg && heightM ? Number(record.weight_kg) / (heightM * heightM) : 0));
                    return (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5 font-black text-slate-700">{record.recorded_date}</td>
                        <td className="p-3.5 font-black text-slate-800">{student?.full_name}</td>
                        <td className="p-3.5 font-bold text-slate-600">{record.weight_kg || '—'} kg / {record.height_cm || '—'} cm</td>
                        <td className="p-3.5 font-black text-slate-800">{bmi ? bmi.toFixed(1) : '—'}</td>
                        <td className="p-3.5 font-bold">{sanitizeHealthValue(record.vision_left, '6/6')} / {sanitizeHealthValue(record.vision_right, '6/6')}</td>
                        <td className="p-3.5 font-bold">{sanitizeHealthValue(record.hearing, 'ធម្មតា')}</td>
                        <td className="p-3.5 font-bold">{sanitizeHealthValue(record.dental, 'ធម្មតា')}</td>
                        <td className="p-3.5 font-medium text-slate-500">{record.notes && !record.notes.includes('???') ? record.notes : '—'}</td>
                      </tr>
                    );
                  })}
                  {!historicalRows.length && (
                    <tr>
                      <td colSpan={8} className="p-12 text-center font-bold text-slate-400">
                        មិនទាន់មានប្រវត្តិពិនិត្យសុខភាពនៅឡើយទេ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ================= DEDICATED OFFICIAL A4 LANDSCAPE PRINTABLE REPORTS (VISIBLE ONLY IN PRINT) ================= */}

      {/* REPORT 1: OFFICIAL SCREENING MASTER SHEET (FOR TAB: SCREENING) */}
      {activeTab === 'screening' && (
        <div className="hidden print:block font-siemreap text-black bg-white p-2 w-full">
          {/* Header */}
          <div className="flex justify-between items-start mb-3 border-b border-black pb-2">
            <div className="text-left space-y-0.5">
              <p className="font-moul text-[11px]">ក្រសួងអប់រំ យុវជន និងកីឡា</p>
              <p className="font-moul text-[10px]">មន្ទីរអប់រំ យុវជន និងកីឡា ខេត្តព្រៃវែង</p>
              <p className="font-black text-[10.5px]">វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</p>
            </div>

            <div className="text-center space-y-0.5">
              <p className="font-moul text-[13px]">ព្រះរាជាណាចក្រកម្ពុជា</p>
              <p className="font-moul text-[11px]">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
              <p className="text-[10px] font-bold">៚ ------------------ ៚</p>
            </div>

            <div className="text-right space-y-0.5 text-[10.5px]">
              <p className="font-bold">កាលបរិច្ឆេទពិនិត្យ៖ <span className="font-black">{recordDate}</span></p>
              <p className="font-bold">ថ្នាក់ទី៖ <span className="font-black">{currentClass?.name || '7A'}</span></p>
              <p className="font-bold">ឆ្នាំសិក្សា៖ ២០២៥-២០២៦</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center my-2">
            <h2 className="font-moul text-[13px] tracking-wide">
              តារាងស្រង់ទិន្នន័យពិនិត្យសុខភាពសិស្សប្រចាំថ្នាក់ (GEIP ៣.៣.១.៣)
            </h2>
            <p className="text-[10px] font-bold text-slate-700 mt-0.5">
              (ការពិនិត្យគំហើញភ្នែក ការស្តាប់ សុខភាពធ្មេញ និងស្ថានភាពកាយសម្បទា)
            </p>
          </div>

          {/* Mini Summary Strip */}
          <div className="grid grid-cols-4 gap-2 border border-black p-1.5 text-center text-[10px] font-black mb-2.5 bg-slate-50">
            <div>សិស្សសរុប៖ <span className="text-blue-900">{students.length} នាក់</span></div>
            <div>បានពិនិត្យរួច៖ <span className="text-emerald-900">{screenedCount} នាក់ ({students.length > 0 ? Math.round((screenedCount / students.length) * 100) : 0}%)</span></div>
            <div>សុខភាពធម្មតា៖ <span className="text-teal-900">{normalHealthCount} នាក់</span></div>
            <div>ត្រូវយកចិត្តទុកដាក់/គាំទ្រ៖ <span className="text-rose-900">{attentionCount} នាក់</span></div>
          </div>

          {/* Master Screening Table */}
          <table className="w-full border-collapse border border-black text-[9px] text-center mb-4">
            <thead>
              <tr className="bg-slate-100 font-black">
                <th className="border border-black p-1 w-7">ល.រ</th>
                <th className="border border-black p-1 w-16">អត្តលេខ</th>
                <th className="border border-black p-1 text-left min-w-[130px]">គោត្តនាម និងនាម</th>
                <th className="border border-black p-1 w-10">ភេទ</th>
                <th className="border border-black p-1 w-14">ទម្ងន់ (kg)</th>
                <th className="border border-black p-1 w-14">កម្ពស់ (cm)</th>
                <th className="border border-black p-1 w-12">BMI</th>
                <th className="border border-black p-1 w-18">អាហារូបត្ថម្ភ</th>
                <th className="border border-black p-1 w-16">ភ្នែកឆ្វេង</th>
                <th className="border border-black p-1 w-16">ភ្នែកស្តាំ</th>
                <th className="border border-black p-1 w-16">ការស្តាប់</th>
                <th className="border border-black p-1 w-16">ធ្មេញ</th>
                <th className="border border-black p-1 text-left min-w-[130px]">កំណត់ចំណាំ / ការគាំទ្រ</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((std, idx) => {
                const data = formData[std.id] || {};
                const weight = Number(data.weight_kg || 0);
                const heightM = Number(data.height_cm || 0) / 100;
                const bmi = Number(data.bmi || (weight > 0 && heightM > 0 ? (weight / (heightM * heightM)).toFixed(1) : 0));
                
                let nutritionStatus = 'ធម្មតា';
                if (bmi > 0) {
                  if (bmi < 18.5) nutritionStatus = 'ស្គម';
                  else if (bmi >= 25 && bmi < 30) nutritionStatus = 'លើសទម្ងន់';
                  else if (bmi >= 30) nutritionStatus = 'ធាត់';
                }

                return (
                  <tr key={std.id} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                    <td className="border border-black p-1 font-bold">{idx + 1}</td>
                    <td className="border border-black p-1 font-bold">{std.student_id_number || '-'}</td>
                    <td className="border border-black p-1 text-left font-black">{std.full_name}</td>
                    <td className="border border-black p-1 font-bold">{std.gender === 'F' || std.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'}</td>
                    <td className="border border-black p-1">{data.weight_kg ? `${data.weight_kg}` : '-'}</td>
                    <td className="border border-black p-1">{data.height_cm ? `${data.height_cm}` : '-'}</td>
                    <td className="border border-black p-1 font-black">{bmi > 0 ? bmi.toFixed(1) : '-'}</td>
                    <td className="border border-black p-1 font-bold">{bmi > 0 ? nutritionStatus : '-'}</td>
                    <td className="border border-black p-1 font-bold">{sanitizeHealthValue(data.vision_left, '6/6')}</td>
                    <td className="border border-black p-1 font-bold">{sanitizeHealthValue(data.vision_right, '6/6')}</td>
                    <td className="border border-black p-1 font-bold">{sanitizeHealthValue(data.hearing, 'ធម្មតា')}</td>
                    <td className="border border-black p-1 font-bold">{sanitizeHealthValue(data.dental, 'ធម្មតា')}</td>
                    <td className="border border-black p-1 text-left font-medium">{data.notes && !data.notes.includes('???') ? data.notes : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Signatures */}
          <div className="flex justify-between items-start text-xs font-bold pt-3 px-8">
            <div className="text-center w-56">
              <p>បានឃើញ និងឯកភាព</p>
              <p className="font-moul text-xs mt-1">នាយកសាលា</p>
              <div className="h-16" />
              <p>................................................</p>
            </div>
            <div className="text-center w-56">
              <p>ថ្ងៃទី...... ខែ...... ឆ្នាំ២០២...</p>
              <p className="font-moul text-xs mt-1">គ្រូទទួលបន្ទុកសុខភាព</p>
              <div className="h-16" />
              <p className="font-black">{profile?.full_name || '................................................'}</p>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 2: OFFICIAL NEEDS ATTENTION REPORT (FOR TAB: ATTENTION) */}
      {activeTab === 'attention' && (
        <div className="hidden print:block font-siemreap text-black bg-white p-2 w-full">
          {/* Header */}
          <div className="flex justify-between items-start mb-3 border-b border-black pb-2">
            <div className="text-left space-y-0.5">
              <p className="font-moul text-[11px]">ក្រសួងអប់រំ យុវជន និងកីឡា</p>
              <p className="font-moul text-[10px]">មន្ទីរអប់រំ យុវជន និងកីឡា ខេត្តព្រៃវែង</p>
              <p className="font-black text-[10.5px]">វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</p>
            </div>

            <div className="text-center space-y-0.5">
              <p className="font-moul text-[13px]">ព្រះរាជាណាចក្រកម្ពុជា</p>
              <p className="font-moul text-[11px]">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
              <p className="text-[10px] font-bold">៚ ------------------ ៚</p>
            </div>

            <div className="text-right space-y-0.5 text-[10.5px]">
              <p className="font-bold">កាលបរិច្ឆេទរបាយការណ៍៖ <span className="font-black">{recordDate}</span></p>
              <p className="font-bold">ថ្នាក់ទី៖ <span className="font-black">{currentClass?.name || '7A'}</span></p>
              <p className="font-bold">ឆ្នាំសិក្សា៖ ២០២៥-២០២៦</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center my-2">
            <h2 className="font-moul text-[13px] tracking-wide text-red-950">
              តារាងបញ្ជីឈ្មោះសិស្សត្រូវយកចិត្តទុកដាក់ និងគាំទ្រសុខភាព
            </h2>
            <p className="text-[10px] font-bold text-slate-700 mt-0.5">
              (សិស្សមានបញ្ហាគំហើញភ្នែក ការស្តាប់ សុខភាពធ្មេញ ឬកង្វះអាហារូបត្ថម្ភ/BMI)
            </p>
          </div>

          {/* Mini Summary Strip */}
          <div className="grid grid-cols-3 gap-2 border border-black p-1.5 text-center text-[10px] font-black mb-2.5 bg-rose-50/50">
            <div>សិស្សត្រូវតាមដានសរុប៖ <span className="text-rose-900">{attentionCount} នាក់</span></div>
            <div>បញ្ហាអាហារូបត្ថម្ភ / BMI៖ <span className="text-amber-900">{healthConcerns.filter(i => i.bmi > 0 && (i.bmi < 18.5 || i.bmi >= 25)).length} នាក់</span></div>
            <div>បញ្ហាភ្នែក ត្រចៀក ឬធ្មេញ៖ <span className="text-blue-900">{healthConcerns.filter(i => i.reasons.some(r => /ភ្នែក|ស្តាប់|ធ្មេញ/.test(r))).length} នាក់</span></div>
          </div>

          {/* Attention Table */}
          <table className="w-full border-collapse border border-black text-[9.5px] text-center mb-4">
            <thead>
              <tr className="bg-slate-100 font-black">
                <th className="border border-black p-1.5 w-8">ល.រ</th>
                <th className="border border-black p-1.5 w-24">អត្តលេខ</th>
                <th className="border border-black p-1.5 text-left min-w-[150px]">គោត្តនាម និងនាម</th>
                <th className="border border-black p-1.5 w-12">ភេទ</th>
                <th className="border border-black p-1.5 w-24">កាលបរិច្ឆេទ</th>
                <th className="border border-black p-1.5 w-24">ទម្ងន់/កម្ពស់ (BMI)</th>
                <th className="border border-black p-1.5 text-left min-w-[200px]">បញ្ហាសុខភាពត្រូវតាមដាន</th>
                <th className="border border-black p-1.5 text-left min-w-[180px]">ផែនការសកម្មភាពគាំទ្រ / បញ្ជូនបន្ត</th>
              </tr>
            </thead>
            <tbody>
              {healthConcerns.map(({ student, record, bmi, reasons }, idx) => (
                <tr key={student.id} className={idx % 2 === 1 ? 'bg-rose-50/30' : 'bg-white'}>
                  <td className="border border-black p-1.5 font-bold">{idx + 1}</td>
                  <td className="border border-black p-1.5 font-bold">{student.student_id_number || '-'}</td>
                  <td className="border border-black p-1.5 text-left font-black">{student.full_name}</td>
                  <td className="border border-black p-1.5 font-bold">{student.gender === 'F' || student.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'}</td>
                  <td className="border border-black p-1.5">{record.recorded_date}</td>
                  <td className="border border-black p-1.5 font-bold">{record.weight_kg ? `${record.weight_kg}kg` : '-'} / {record.height_cm ? `${record.height_cm}cm` : '-'} ({bmi || '-'})</td>
                  <td className="border border-black p-1.5 text-left font-bold text-rose-900">{reasons.join(', ')}</td>
                  <td className="border border-black p-1.5 text-left font-medium">{record.notes && !record.notes.includes('???') ? record.notes : 'បើកករណីគាំទ្រ និងណាត់ជួបអាណាព្យាបាល'}</td>
                </tr>
              ))}
              {!healthConcerns.length && (
                <tr>
                  <td colSpan={8} className="border border-black p-6 text-center font-bold text-emerald-800">
                    មិនមានសិស្សប្រឈមបញ្ហាសុខភាពត្រូវតាមដានទេ (សិស្សទាំងអស់មានសុខភាពល្អ និងប្រក្រតី)
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Signatures */}
          <div className="flex justify-between items-start text-xs font-bold pt-3 px-8">
            <div className="text-center w-56">
              <p>បានឃើញ និងឯកភាព</p>
              <p className="font-moul text-xs mt-1">នាយកសាលា</p>
              <div className="h-16" />
              <p>................................................</p>
            </div>
            <div className="text-center w-56">
              <p>ថ្ងៃទី...... ខែ...... ឆ្នាំ២០២...</p>
              <p className="font-moul text-xs mt-1">គ្រូទទួលបន្ទុកសុខភាព</p>
              <div className="h-16" />
              <p className="font-black">{profile?.full_name || '................................................'}</p>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 3: OFFICIAL HISTORY REPORT (FOR TAB: HISTORY) */}
      {activeTab === 'history' && (
        <div className="hidden print:block font-siemreap text-black bg-white p-2 w-full">
          {/* Header */}
          <div className="flex justify-between items-start mb-3 border-b border-black pb-2">
            <div className="text-left space-y-0.5">
              <p className="font-moul text-[11px]">ក្រសួងអប់រំ យុវជន និងកីឡា</p>
              <p className="font-moul text-[10px]">មន្ទីរអប់រំ យុវជន និងកីឡា ខេត្តព្រៃវែង</p>
              <p className="font-black text-[10.5px]">វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</p>
            </div>

            <div className="text-center space-y-0.5">
              <p className="font-moul text-[13px]">ព្រះរាជាណាចក្រកម្ពុជា</p>
              <p className="font-moul text-[11px]">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
              <p className="text-[10px] font-bold">៚ ------------------ ៚</p>
            </div>

            <div className="text-right space-y-0.5 text-[10.5px]">
              <p className="font-bold">សរុបកំណត់ត្រា៖ <span className="font-black">{historicalRows.length}</span></p>
              <p className="font-bold">ថ្នាក់ទី៖ <span className="font-black">{currentClass?.name || '7A'}</span></p>
              <p className="font-bold">ឆ្នាំសិក្សា៖ ២០២៥-២០២៦</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center my-2">
            <h2 className="font-moul text-[13px] tracking-wide">
              តារាងកំណត់ត្រាប្រវត្តិពិនិត្យសុខភាពសិស្ស
            </h2>
            <p className="text-[10px] font-bold text-slate-700 mt-0.5">
              (កំណត់ត្រាពិនិត្យសុខភាពសិស្សប្រចាំថ្នាក់តាមកាលបរិច្ឆេទ)
            </p>
          </div>

          {/* History Table */}
          <table className="w-full border-collapse border border-black text-[9px] text-center mb-4">
            <thead>
              <tr className="bg-slate-100 font-black">
                <th className="border border-black p-1 w-8">ល.រ</th>
                <th className="border border-black p-1 w-20">កាលបរិច្ឆេទ</th>
                <th className="border border-black p-1 w-20">អត្តលេខ</th>
                <th className="border border-black p-1 text-left min-w-[140px]">គោត្តនាម និងនាម</th>
                <th className="border border-black p-1 w-12">ភេទ</th>
                <th className="border border-black p-1 w-24">ទម្ងន់ / កម្ពស់</th>
                <th className="border border-black p-1 w-14">BMI</th>
                <th className="border border-black p-1 w-20">ភ្នែក (ឆ្វេង/ស្តាំ)</th>
                <th className="border border-black p-1 w-16">ការស្តាប់</th>
                <th className="border border-black p-1 w-16">ធ្មេញ</th>
                <th className="border border-black p-1 text-left min-w-[150px]">កំណត់ចំណាំ</th>
              </tr>
            </thead>
            <tbody>
              {historicalRows.map(({ record, student }, idx) => {
                const heightM = Number(record.height_cm || 0) / 100;
                const bmi = Number(record.bmi || (record.weight_kg && heightM ? Number(record.weight_kg) / (heightM * heightM) : 0));
                return (
                  <tr key={record.id} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                    <td className="border border-black p-1 font-bold">{idx + 1}</td>
                    <td className="border border-black p-1 font-bold">{record.recorded_date}</td>
                    <td className="border border-black p-1 font-bold">{student?.student_id_number || '-'}</td>
                    <td className="border border-black p-1 text-left font-black">{student?.full_name}</td>
                    <td className="border border-black p-1 font-bold">{student?.gender === 'F' || student?.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'}</td>
                    <td className="border border-black p-1 font-bold">{record.weight_kg || '-'} kg / {record.height_cm || '-'} cm</td>
                    <td className="border border-black p-1 font-black">{bmi ? bmi.toFixed(1) : '-'}</td>
                    <td className="border border-black p-1 font-bold">{sanitizeHealthValue(record.vision_left, '6/6')} / {sanitizeHealthValue(record.vision_right, '6/6')}</td>
                    <td className="border border-black p-1 font-bold">{sanitizeHealthValue(record.hearing, 'ធម្មតា')}</td>
                    <td className="border border-black p-1 font-bold">{sanitizeHealthValue(record.dental, 'ធម្មតា')}</td>
                    <td className="border border-black p-1 text-left font-medium">{record.notes && !record.notes.includes('???') ? record.notes : '-'}</td>
                  </tr>
                );
              })}
              {!historicalRows.length && (
                <tr>
                  <td colSpan={11} className="border border-black p-6 text-center font-bold text-slate-400">
                    មិនទាន់មានប្រវត្តិពិនិត្យសុខភាពនៅឡើយទេ
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Signatures */}
          <div className="flex justify-between items-start text-xs font-bold pt-3 px-8">
            <div className="text-center w-56">
              <p>បានឃើញ និងឯកភាព</p>
              <p className="font-moul text-xs mt-1">នាយកសាលា</p>
              <div className="h-16" />
              <p>................................................</p>
            </div>
            <div className="text-center w-56">
              <p>ថ្ងៃទី...... ខែ...... ឆ្នាំ២០២...</p>
              <p className="font-moul text-xs mt-1">គ្រូទទួលបន្ទុកសុខភាព</p>
              <div className="h-16" />
              <p className="font-black">{profile?.full_name || '................................................'}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
