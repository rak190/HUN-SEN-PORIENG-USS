'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import {
  Users, Search, UserPlus, Download, Edit, MapPin, Heart, FileSpreadsheet, Table,
  Phone, AlertCircle, FileText, UserSquare2, BarChart3, Info, BookOpen, Clock, Activity, TrendingUp, AlertTriangle, LogOut, ChevronDown, Loader2, X, Check,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import StudentImportModal from '@/components/students/StudentImportModal';
import StudentGridEntryModal from '@/components/students/StudentGridEntryModal';
import { saveStudentAction } from './actions';

interface MassiveProfilingStudent {
  id: string;
  // Tab 1: Basic
  student_id_number: string;
  desk_number?: string;
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
  const [students, setStudents] = useState<MassiveProfilingStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [mainTab, setMainTab] = useState<'list' | 'at-risk' | 'transfer'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [activeTableView, setActiveTableView] = useState(1);
  const [activeModalTab, setActiveModalTab] = useState(1);
  const [formData, setFormData] = useState<Partial<MassiveProfilingStudent>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#export-geip-dropdown')) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
    const fetchStudents = async () => {
      if (!activeClass?.id) return;
      setIsLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', activeClass.id)
        .order('student_id_number', { ascending: true });

      if (data) {
        setStudents(data.map(d => ({
          ...DEFAULT_FORM,
          ...d,
          current_status: d.enrollment_status || 'active',
        } as MassiveProfilingStudent)));
      }
      setIsLoading(false);
    };
    fetchStudents();
  }, [activeClass?.id]);

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

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusForm.studentId) return;
    
    setIsSaving(true);
    const student = students.find(s => s.id === statusForm.studentId);
    if (student) {
       let newStatus = 'dropout';
       if (statusForm.actionType === 'ផ្ទេរចេញ') newStatus = 'transfer';
       else if (statusForm.actionType === 'មរណភាព') newStatus = 'deceased';
       
       const { error } = await supabase
         .from('students')
         .update({ 
            enrollment_status: newStatus,
            is_active: newStatus === 'active'
         })
         .eq('id', student.id);

       if (!error) {
         setStudents(students.map(s => s.id === student.id ? { ...s, current_status: newStatus as any } : s));
         setTransferRecords([{
            id: Date.now().toString(),
            student_id_number: student.student_id_number,
            full_name: student.full_name,
            status: statusForm.actionType,
            date: statusForm.actionDate,
            reason: statusForm.reason
         }, ...transferRecords]);
       } else {
         console.error('Error updating status:', error);
         alert('មានបញ្ហាក្នុងការកែប្រែស្ថានភាពសិស្ស');
       }
    }
    
    setIsSaving(false);
    setIsStatusModalOpen(false);
    setStatusForm({
      studentId: '',
      actionType: 'ផ្ទេរចេញ',
      actionDate: new Date().toISOString().split('T')[0],
      reason: ''
    });
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

  const filteredStudents = useMemo<MassiveProfilingStudent[]>(() => {
    let result = students.filter(s => 
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (s.student_id_number && s.student_id_number.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (sortState.field && sortState.direction) {
      const { field, direction } = sortState;
      const factor = direction === 'asc' ? 1 : -1;

      result = [...result].sort((a: any, b: any) => {
        let valA = a[field];
        let valB = b[field];

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * factor;
        }

        return String(valA).localeCompare(String(valB), 'km', { numeric: true }) * factor;
      });
    }

    return result;
  }, [students, searchQuery, sortState]);

  const renderSortHeader = (label: string, field: string, align: 'left' | 'center' | 'right' = 'left') => {
    const isActive = sortState.field === field && sortState.direction !== null;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`p-4 cursor-pointer select-none hover:bg-slate-100/80 transition-colors group ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}
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

  const handleExportGEIPExcel = () => {
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
      'ទម្ងន់ (kg)': std.weight_kg,
      'កម្ពស់ (m)': std.height_m,
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

  const handleExportGEIPPDF = () => {
    const total = students.length;
    const female = students.filter(s => s.gender === 'F' || s.gender === 'ស្រី').length;
    const active = students.filter(s => s.current_status === 'active').length;
    const dropout = students.filter(s => s.current_status === 'dropout').length;
    const idPoorCount = students.filter(s => s.id_poor && s.id_poor !== 'none').length;
    const scholarshipCount = students.filter(s => s.scholarship === 'yes').length;
    const disabilityCount = students.filter(s => s.disability && s.disability !== 'none').length;

    const rowsHtml = students.map((std, idx) => `
      <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
        <!-- 1. ព័ត៌មានផ្ទាល់ខ្លួន -->
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-weight: bold;">${idx + 1}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; font-family: monospace; font-size: 7.5px; text-align: center;">${std.student_id_number || '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 4px; font-weight: bold; text-align: left; color: #0f172a; white-space: nowrap;">${std.full_name}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center;">${std.gender === 'F' || std.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 7.5px; white-space: nowrap;">${std.date_of_birth || '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center;">${std.age || '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 7.5px;">${std.birth_cert_no || '-'}</td>

        <!-- 2. ការសិក្សា & សមធម៌ -->
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 7.5px;">${std.status === 'new' ? 'ថ្មី' : std.status === 'repeater' ? 'ត្រួតថ្នាក់' : 'ផ្ទេរចូល'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: left; font-size: 7.5px;">${std.prev_school || '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 7.5px;">${std.indigenous === 'yes' ? 'បាទ/ចាស' : 'ទេ'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 7.5px;">${std.orphan === 'yes' ? 'បាទ/ចាស' : 'ទេ'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 7.5px;">${std.id_poor === 'level_1' ? 'កម្រិត ១' : std.id_poor === 'level_2' ? 'កម្រិត ២' : 'គ្មាន'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 7.5px;">${std.scholarship === 'yes' ? 'មាន' : 'គ្មាន'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 7.5px;">${std.distance_km || 0}</td>

        <!-- 3. សុខភាព & អាហារូបត្ថម្ភ -->
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 7.5px;">${std.disability === 'mild' ? 'ស្រាល' : std.disability === 'severe' ? 'ធ្ងន់' : 'គ្មាន'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 7.5px;">${std.assistive_device || '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 7.5px;">${std.weight_kg || '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 7.5px;">${std.height_m || '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 7.5px; font-weight: bold;">${std.bmi || '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 7.5px;">${std.nutrition_status || 'ធម្មតា'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: left; font-size: 7.5px;">${std.health_issues || '-'}</td>

        <!-- 4. គ្រួសារ & ទីលំនៅ -->
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; font-size: 7.5px; text-align: left;">${std.father_name ? `${std.father_name}${std.father_job ? ` (${std.father_job})` : ''}` : '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; font-size: 7.5px; text-align: center; font-family: monospace;">${std.father_phone || '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; font-size: 7.5px; text-align: left;">${std.mother_name ? `${std.mother_name}${std.mother_job ? ` (${std.mother_job})` : ''}` : '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; font-size: 7.5px; text-align: center; font-family: monospace;">${std.mother_phone || '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; font-size: 7.5px; text-align: center;">${std.migrant_status === 'parents' ? 'ឪពុកម្តាយ' : std.migrant_status === 'student' ? 'សិស្ស' : 'គ្មាន'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; font-size: 7.5px; text-align: center;">${std.domestic_violence === 'yes' ? 'មាន' : 'គ្មាន'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; font-size: 7.5px; text-align: center;">${std.housing ? `${std.housing} / $${std.income || 0}` : `$${std.income || 0}`}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; font-size: 7.5px; text-align: center;">${std.siblings_count || 0}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; font-size: 7.5px; text-align: left;">${std.address || '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; font-size: 7.5px; text-align: center; font-family: monospace;">${std.student_phone || '-'}</td>

        <!-- 5. ស្ថានភាពចុងក្រោយ -->
        <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 7.5px; font-weight: bold; color: ${std.current_status === 'dropout' ? '#e11d48' : '#15803d'};">
          ${std.current_status === 'dropout' ? 'បោះបង់' : 'កំពុងរៀន'}
        </td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>MoEYS_GEIP_Master_Data_${activeClass?.name || 'Class'}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&family=Moul&family=Siemreap&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 landscape;
            margin: 5mm 6mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Kantumruy Pro', 'Siemreap', sans-serif;
            font-size: 8px;
            color: #0f172a;
            margin: 0;
            padding: 6px;
            background-color: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .font-muol {
            font-family: 'Moul', serif;
          }
          .header-grid {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
          }
          .header-left {
            text-align: left;
            line-height: 1.4;
            font-size: 9px;
          }
          .header-right {
            text-align: center;
            line-height: 1.4;
            font-size: 9px;
          }
          .main-title {
            text-align: center;
            margin: 2px 0 10px;
          }
          .main-title h1 {
            font-family: 'Moul', serif;
            font-size: 13px;
            margin: 0 0 3px;
            color: #1e3a8a;
          }
          .main-title p {
            font-size: 9.5px;
            margin: 0;
            color: #475569;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7.8px;
          }
          th {
            border: 1px solid #94a3b8;
            padding: 3px 2px;
            font-weight: 700;
            text-align: center;
            color: #1e293b;
          }
          .stats-box {
            margin-top: 10px;
            padding: 6px 12px;
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 8.5px;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .signatures {
            margin-top: 16px;
            display: flex;
            justify-content: space-between;
            text-align: center;
            font-size: 9.5px;
            page-break-inside: avoid;
          }
          .signature-col {
            width: 250px;
          }
          .signature-space {
            height: 45px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header-grid">
          <div class="header-left">
            <div>ក្រសួងអប់រំ យុវជន និងកីឡា</div>
            <div>មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តព្រៃវែង</div>
            <div style="font-weight: bold; font-size: 10.5px; color: #1e3a8a;">វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</div>
          </div>
          <div class="header-right">
            <div class="font-muol" style="font-size: 10.5px;">ព្រះរាជាណាចក្រកម្ពុជា</div>
            <div class="font-muol" style="font-size: 9.5px;">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
            <div style="font-size: 11px; letter-spacing: 2px;">***</div>
          </div>
        </div>

        <div class="main-title">
          <h1>បញ្ជីឈ្មោះ និងស្ថិតិព័ត៌មានលម្អិតសិស្ស GEIP គ្រប់ទិន្នន័យ (Master Profiling)</h1>
          <p>គម្រោងកែលម្អការអប់រំចំណេះទូទៅ (GEIP - IDA.No.7024-KH) • ថ្នាក់ទី៖ <strong>${activeClass?.name || '...'}</strong> • ឆ្នាំសិក្សា៖ <strong>២០២៥-២០២៦</strong></p>
        </div>

        <table>
          <thead>
            <!-- Level 1: Group Headers -->
            <tr>
              <th rowspan="2" style="width: 18px; background-color: #f1f5f9;">ល.រ</th>
              <th colspan="6" style="background-color: #f1f5f9; color: #0f172a; border-bottom: 1px solid #94a3b8;">១. ព័ត៌មានផ្ទាល់ខ្លួន</th>
              <th colspan="7" style="background-color: #eff6ff; color: #1e3a8a; border-bottom: 1px solid #94a3b8;">២. ការសិក្សា & សមធម៌</th>
              <th colspan="7" style="background-color: #f0fdf4; color: #14532d; border-bottom: 1px solid #94a3b8;">៣. សុខភាព & អាហារូបត្ថម្ភ</th>
              <th colspan="10" style="background-color: #fffbeb; color: #78350f; border-bottom: 1px solid #94a3b8;">៤. គ្រួសារ & ទីលំនៅ</th>
              <th rowspan="2" style="width: 38px; background-color: #fdf2f8; color: #831843;">ស្ថានភាព</th>
            </tr>
            <!-- Level 2: Detail Column Headers -->
            <tr>
              <!-- 1. ព័ត៌មានផ្ទាល់ខ្លួន -->
              <th style="width: 44px; background-color: #f8fafc;">អត្តលេខ</th>
              <th style="min-width: 75px; text-align: left; padding-left: 4px; background-color: #f8fafc;">គោត្តនាម និងនាម</th>
              <th style="width: 24px; background-color: #f8fafc;">ភេទ</th>
              <th style="width: 48px; background-color: #f8fafc;">ថ្ងៃកំណើត</th>
              <th style="width: 18px; background-color: #f8fafc;">អាយុ</th>
              <th style="width: 40px; background-color: #f8fafc;">សំបុត្រកំណើត</th>

              <!-- 2. ការសិក្សា & សមធម៌ -->
              <th style="width: 36px; background-color: #f0f7ff;">ស្ថានភាព</th>
              <th style="width: 45px; background-color: #f0f7ff;">សាលាមុន</th>
              <th style="width: 30px; background-color: #f0f7ff;">ជនជាតិ</th>
              <th style="width: 28px; background-color: #f0f7ff;">កំព្រា</th>
              <th style="width: 36px; background-color: #f0f7ff;">បណ្ណក្រីក្រ</th>
              <th style="width: 36px; background-color: #f0f7ff;">អាហារូបករណ៍</th>
              <th style="width: 26px; background-color: #f0f7ff;">ចម្ងាយ</th>

              <!-- 3. សុខភាព & អាហារូបត្ថម្ភ -->
              <th style="width: 32px; background-color: #f5fdf8;">ពិការភាព</th>
              <th style="width: 38px; background-color: #f5fdf8;">ឧបករណ៍</th>
              <th style="width: 26px; background-color: #f5fdf8;">ទម្ងន់</th>
              <th style="width: 26px; background-color: #f5fdf8;">កម្ពស់</th>
              <th style="width: 24px; background-color: #f5fdf8;">BMI</th>
              <th style="width: 42px; background-color: #f5fdf8;">អាហារូបត្ថម្ភ</th>
              <th style="width: 45px; background-color: #f5fdf8;">បញ្ហាសុខភាព</th>

              <!-- 4. គ្រួសារ & ទីលំនៅ -->
              <th style="width: 60px; background-color: #fefce8;">ឪពុក (មុខរបរ)</th>
              <th style="width: 46px; background-color: #fefce8;">ទូរស័ព្ទឪពុក</th>
              <th style="width: 60px; background-color: #fefce8;">ម្តាយ (មុខរបរ)</th>
              <th style="width: 46px; background-color: #fefce8;">ទូរស័ព្ទម្តាយ</th>
              <th style="width: 32px; background-color: #fefce8;">ចំណាកស្រុក</th>
              <th style="width: 26px; background-color: #fefce8;">ហិង្សា</th>
              <th style="width: 46px; background-color: #fefce8;">ជម្រក/ចំណូល</th>
              <th style="width: 24px; background-color: #fefce8;">បងប្អូន</th>
              <th style="min-width: 65px; background-color: #fefce8;">អាសយដ្ឋាន</th>
              <th style="width: 46px; background-color: #fefce8;">ទូរស័ព្ទសិស្ស</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="stats-box">
          <div>
            <span>សរុបសិស្ស៖ <strong>${total}</strong> នាក់ (ស្រី៖ <strong>${female}</strong> នាក់)</span>
            <span style="margin: 0 8px; color: #94a3b8;">|</span>
            <span>កំពុងរៀន៖ <strong>${active}</strong> នាក់</span>
            <span style="margin: 0 8px; color: #94a3b8;">|</span>
            <span>បោះបង់៖ <strong style="color: #e11d48;">${dropout}</strong> នាក់</span>
          </div>
          <div>
            <span>ក្រីក្រ៖ <strong>${idPoorCount}</strong></span>
            <span style="margin: 0 6px; color: #94a3b8;">|</span>
            <span>អាហារូបករណ៍៖ <strong>${scholarshipCount}</strong></span>
            <span style="margin: 0 6px; color: #94a3b8;">|</span>
            <span>ពិការភាព៖ <strong>${disabilityCount}</strong></span>
          </div>
        </div>

        <div class="signatures">
          <div class="signature-col">
            <div class="font-muol">បានឃើញ និងឯកភាព</div>
            <div style="font-weight: bold; margin-top: 2px;">នាយកសាលា</div>
            <div class="signature-space"></div>
            <div style="font-weight: bold;">................................................</div>
          </div>
          <div class="signature-col">
            <div style="color: #64748b; font-size: 9px;">ថ្ងៃទី......... ខែ......... ឆ្នាំ២០២...</div>
            <div class="font-muol" style="margin-top: 2px;">គ្រូបន្ទុកថ្នាក់</div>
            <div class="signature-space"></div>
            <div style="font-weight: bold;">................................................</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1200,height=850');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
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

  const handleSave = async () => {
    setIsSaving(true);
    
    const payload = {
      ...formData,
      class_id: activeClass?.id,
      current_status: formData.current_status || 'active',
      is_active: (formData.current_status || 'active') === 'active',
    };

    try {
      const res = await saveStudentAction(payload);
      
      if (res && res.success && res.student) {
        const savedStudent = {
          ...DEFAULT_FORM,
          ...formData,
          ...res.student,
          current_status: res.student.enrollment_status || formData.current_status || 'active',
        } as MassiveProfilingStudent;

        if (formData.id) {
          setStudents(prev => prev.map(s => s.id === formData.id ? savedStudent : s));
        } else {
          setStudents(prev => [savedStudent, ...prev]);
        }
        setIsModalOpen(false);
      } else {
        // Optimistic fallback update
        const fallbackStudent = {
          ...DEFAULT_FORM,
          ...formData,
          id: formData.id || `std-${Date.now()}`,
          current_status: formData.current_status || 'active',
        } as MassiveProfilingStudent;

        if (formData.id) {
          setStudents(prev => prev.map(s => s.id === formData.id ? fallbackStudent : s));
        } else {
          setStudents(prev => [fallbackStudent, ...prev]);
        }
        setIsModalOpen(false);
      }
    } catch (err: any) {
      console.warn('handleSave error (applied local update):', err?.message);
      const fallbackStudent = {
        ...DEFAULT_FORM,
        ...formData,
        id: formData.id || `std-${Date.now()}`,
        current_status: formData.current_status || 'active',
      } as MassiveProfilingStudent;

      if (formData.id) {
        setStudents(prev => prev.map(s => s.id === formData.id ? fallbackStudent : s));
      } else {
        setStudents(prev => [fallbackStudent, ...prev]);
      }
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
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
        <div id="export-geip-dropdown" className="relative">
          <button 
            type="button"
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} 
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>ទាញយកទិន្នន័យ GEIP</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isExportMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <span className="text-[11px] font-bold text-slate-400">ទម្រង់ឯកសារនាំចេញ GEIP</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsExportMenuOpen(false);
                  handleExportGEIPExcel();
                }}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-slate-50 text-left transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-800">ទាញយកជា Excel (.xlsx)</div>
                  <div className="text-[10px] font-bold text-slate-400">តារាងទិន្នន័យពេញលេញ ២៨ ជួរឈរ</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsExportMenuOpen(false);
                  handleExportGEIPPDF();
                }}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-slate-50 text-left transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-800">ទាញយកជា PDF / បោះពុម្ព (.pdf)</div>
                  <div className="text-[10px] font-bold text-slate-400">ទម្រង់ក្រសួង A4 Landscape មានហត្ថលេខា</div>
                </div>
              </button>
            </div>
          )}
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
          {isLoading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
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
                {renderSortHeader('អត្តលេខ', 'student_id_number')}
                {renderSortHeader('ឈ្មោះ', 'full_name')}
                
                {/* Dynamic Columns based on View Filter */}
                {activeTableView === 1 && (
                  <>
                    {renderSortHeader('ភេទ', 'gender', 'center')}
                    {renderSortHeader('ប្លង់តុ', 'desk_number', 'center')}
                    {renderSortHeader('ថ្ងៃខែឆ្នាំកំណើត', 'date_of_birth')}
                    {renderSortHeader('អាយុ', 'age', 'center')}
                    <th className="p-4">សំបុត្រកំណើត</th>
                    <th className="p-4">ទូរស័ព្ទសិស្ស</th>
                  </>
                )}
                {activeTableView === 2 && (
                  <>
                    {renderSortHeader('ស្ថានភាព', 'status', 'center')}
                    <th className="p-4">សាលាមុន</th>
                    {renderSortHeader('អាហារូបករណ៍', 'scholarship', 'center')}
                    {renderSortHeader('ID Poor', 'id_poor', 'center')}
                    {renderSortHeader('ចម្ងាយ(គ.ម)', 'distance_km', 'center')}
                  </>
                )}
                {activeTableView === 3 && (
                  <>
                    {renderSortHeader('កម្ពស់', 'height_m', 'center')}
                    {renderSortHeader('ទម្ងន់', 'weight_kg', 'center')}
                    {renderSortHeader('BMI', 'bmi', 'center')}
                    {renderSortHeader('ពិការភាព', 'disability', 'center')}
                    <th className="p-4">បញ្ហាសុខភាព</th>
                  </>
                )}
                {activeTableView === 4 && (
                  <>
                    <th className="p-4">ឪពុក/ម្តាយ</th>
                    {renderSortHeader('បងប្អូន', 'siblings_count', 'center')}
                    {renderSortHeader('ចំណូល/ខែ', 'income', 'center')}
                    <th className="p-4">ផ្ទះសំបែង</th>
                    {renderSortHeader('ចំណាកស្រុក', 'migrant_status', 'center')}
                  </>
                )}
                {activeTableView === 5 && (
                  <>
                    {renderSortHeader('អាសយដ្ឋានបច្ចុប្បន្ន', 'address')}
                    {renderSortHeader('ស្ថានភាពចុងក្រោយ', 'current_status', 'center')}
                  </>
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
                      <td className="p-4 text-center">
                        <input
                          type="text"
                          defaultValue={std.desk_number || ''}
                          placeholder="A-01"
                          onBlur={(e) => {
                            if (e.target.value !== std.desk_number) {
                              setStudents(students.map(s => s.id === std.id ? { ...s, desk_number: e.target.value } : s));
                            }
                          }}
                          className="w-16 bg-transparent border border-transparent hover:border-slate-200 focus:border-[#155EEF] rounded-lg px-2 py-1 text-center text-xs font-bold font-mono outline-none transition-colors"
                        />
                      </td>
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
      {mounted && isModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsModalOpen(false)}
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
                onClick={() => setIsModalOpen(false)} 
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
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  បោះបង់
                </button>
                <button 
                  type="button" 
                  onClick={handleSave} 
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
      )}

      {/* Import Modal */}
      <StudentImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={handleBulkSuccess} 
      />

      {/* Contact Modal */}
      {mounted && isContactModalOpen && contactStudent && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsContactModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 flex justify-between items-start border-b border-slate-100 bg-slate-50/50">
              <div>
                <h2 className="text-lg font-black text-slate-800">ព័ត៌មានទំនាក់ទំនង</h2>
                <p className="text-xs font-bold text-slate-500 mt-1">អាណាព្យាបាលសិស្ស៖ {contactStudent.full_name}</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsContactModalOpen(false)} 
                className="p-2 hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 bg-slate-50/30">
              {contactStudent.father_phone && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex justify-between items-center shadow-xs">
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
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex justify-between items-center shadow-xs">
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
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex justify-between items-center shadow-xs">
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
                 <div className="text-center py-6 text-slate-400 font-bold text-sm">មិនមានលេខទូរស័ព្ទអាណាព្យាបាលទេ</div>
              )}
            </div>
            
            <div className="p-4 bg-white border-t border-slate-100">
               <button 
                 type="button"
                 onClick={() => setIsContactModalOpen(false)} 
                 className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl text-xs transition-colors cursor-pointer"
               >
                 បិទ
               </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Status Change Modal */}
      {mounted && isStatusModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsStatusModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 flex justify-between items-start border-b border-slate-100 bg-slate-50/50">
              <div>
                <h2 className="text-lg font-black text-slate-800">កត់ត្រាការផ្លាស់ប្តូរស្ថានភាព</h2>
                <p className="text-xs font-bold text-slate-500 mt-1">រក្សាទុកក្នុងប្រវត្តិបញ្ជីឈ្មោះសិក្សា</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsStatusModalOpen(false)} 
                className="p-2 hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleStatusSubmit} className="p-6 space-y-4">
              <div className="relative">
                <select 
                  required
                  value={statusForm.studentId}
                  onChange={e => setStatusForm({...statusForm, studentId: e.target.value})}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#155EEF] appearance-none bg-slate-50"
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
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#155EEF] appearance-none bg-slate-50"
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
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#155EEF] bg-slate-50"
                />
              </div>

              <textarea 
                placeholder="មូលហេតុ..."
                value={statusForm.reason}
                onChange={e => setStatusForm({...statusForm, reason: e.target.value})}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#155EEF] min-h-[100px] resize-none bg-slate-50"
              ></textarea>

              <button 
                type="submit"
                className="w-full py-3.5 bg-[#E3163A] hover:bg-rose-700 text-white font-black rounded-2xl text-sm transition-colors shadow-md shadow-rose-500/20 cursor-pointer"
              >
                រក្សាទុកការផ្លាស់ប្តូរ
              </button>
            </form>
          </div>
        </div>,
        document.body
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
