'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import {
  Users, Search, UserPlus, Download, Edit, MapPin, Heart, FileSpreadsheet, Table,
  Phone, AlertCircle, FileText, UserSquare2, BarChart3, Info, BookOpen, Clock, Activity, TrendingUp, AlertTriangle, LogOut, ChevronDown, Loader2, X, Check,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import StudentImportModal from '@/components/students/StudentImportModal';
import StudentGridEntryModal from '@/components/students/StudentGridEntryModal';
import StudentTable from '@/components/students/StudentTable';
import StudentProfileDrawer from '@/components/students/StudentProfileDrawer';
import StudentFilters from '@/components/students/StudentFilters';
import { saveStudentAction } from './actions';
import { useStudents } from '@/hooks/useStudents';

import { MassiveProfilingStudent, DEFAULT_FORM } from './types';

const VIEW_TABS = [
  { id: 1, label: 'មូលដ្ឋាន', icon: UserSquare2 },
  { id: 2, label: 'ការសិក្សា', icon: FileText },
  { id: 3, label: 'សុខភាព', icon: Heart },
  { id: 4, label: 'គ្រួសារ', icon: Users },
  { id: 5, label: 'ទីលំនៅ', icon: MapPin },
];

export default function StudentsPage() {
  const { activeClass } = useAuth();
  
  const { 
    students, setStudents, 
    isLoading, 
    searchQuery, setSearchQuery, 
    sortState, handleSort, 
    filteredStudents 
  } = useStudents(activeClass?.id);

  const [isSaving, setIsSaving] = useState(false);
  const [profileDrawerData, setProfileDrawerData] = useState<Partial<MassiveProfilingStudent> | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const [activeTableView, setActiveTableView] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [mainTab, setMainTab] = useState<'list' | 'at-risk' | 'transfer'>('list');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const supabase = createClient();
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



  const handleExportGEIPExcel = () => {
    const wsData = students.map((std) => ({
      'អត្តលេខ': std.student_id_number,
      'ប្លង់តុ': std.desk_number || '',
      'លេខបន្ទប់ប្រឡង': std.room_number || '',
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
    setProfileDrawerData({ ...DEFAULT_FORM, student_id_number: `ID-${Math.floor(Math.random()*10000)}` });
  };

  const openEditModal = (std: MassiveProfilingStudent) => {
    setProfileDrawerData(std);
  };

  const handleSave = async (data: Partial<MassiveProfilingStudent>) => {
    setIsSaving(true);
    
    const payload = {
      ...data,
      class_id: activeClass?.id,
      current_status: data.current_status || 'active',
      is_active: (data.current_status || 'active') === 'active',
    };

    try {
      const res = await saveStudentAction(payload);
      
      if (res && res.success && res.student) {
        const savedStudent = {
          ...DEFAULT_FORM,
          ...data,
          ...res.student,
          current_status: res.student.enrollment_status || data.current_status || 'active',
        } as MassiveProfilingStudent;

        if (data.id) {
          setStudents(prev => prev.map(s => s.id === data.id ? savedStudent : s));
        } else {
          setStudents(prev => [savedStudent, ...prev]);
        }
        setProfileDrawerData(null);
      } else {
        // Optimistic fallback update
        const fallbackStudent = {
          ...DEFAULT_FORM,
          ...data,
          id: data.id || `std-${Date.now()}`,
          current_status: data.current_status || 'active',
        } as MassiveProfilingStudent;

        if (data.id) {
          setStudents(prev => prev.map(s => s.id === data.id ? fallbackStudent : s));
        } else {
          setStudents(prev => [fallbackStudent, ...prev]);
        }
        setProfileDrawerData(null);
      }
    } catch (err: any) {
      console.warn('handleSave error (applied local update):', err?.message);
      const fallbackStudent = {
        ...DEFAULT_FORM,
        ...data,
        id: data.id || `std-${Date.now()}`,
        current_status: data.current_status || 'active',
      } as MassiveProfilingStudent;

      if (data.id) {
        setStudents(prev => prev.map(s => s.id === data.id ? fallbackStudent : s));
      } else {
        setStudents(prev => [fallbackStudent, ...prev]);
      }
      setProfileDrawerData(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkSuccess = (newStudents: any[]) => {
    // Add new students to the list.
    setStudents(prev => [...prev, ...newStudents]);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredStudents.map(s => s.id));
    else setSelectedIds([]);
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបសិស្សចំនួន ${selectedIds.length} នាក់នេះមែនទេ? (សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ)`)) return;
    setIsSaving(true);
    const { error } = await supabase.from('students').delete().in('id', selectedIds);
    if (!error) {
      setStudents(prev => prev.filter(s => !selectedIds.includes(s.id)));
      setSelectedIds([]);
    } else {
      console.error(error);
      alert('បរាជ័យក្នុងការលុបសិស្ស');
    }
    setIsSaving(false);
  };

  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('បញ្ជីឈ្មោះសិស្ស', { views: [{ showGridLines: false }] });

      const headerFont = { name: 'Kantumruy Pro', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      const cellFont = { name: 'Khmer OS Siemreap', size: 10 };
      const thinBorder = {
        top: { style: 'thin' as any }, left: { style: 'thin' as any },
        bottom: { style: 'thin' as any }, right: { style: 'thin' as any }
      };

      const headers = [
        'ល.រ', 'អត្តលេខ', 'នាមត្រកូល និងនាមខ្លួន', 'ភេទ (M/F)', 'ថ្ងៃខែឆ្នាំកំណើត (DD/MM/YYYY)', 'លេខទូរស័ព្ទសិស្ស', 
        'ស្ថានភាព (new/repeater/transfer)', 'សាលាមុន', 'អាហារូបករណ៍ (yes/no)', 'បណ្ណក្រីក្រ (none/level_1/level_2)', 'កំព្រា (yes/no)', 'ជនជាតិដើមភាគតិច (yes/no)', 'ចម្ងាយមកសាលា(គ.ម)',
        'ទម្ងន់(គ.ក)', 'កម្ពស់(ម)', 'ពិការភាព (none/mild/severe)', 'បញ្ហាសុខភាព',
        'ឈ្មោះឪពុក', 'មុខរបរឪពុក', 'ទូរស័ព្ទឪពុក',
        'ឈ្មោះម្តាយ', 'មុខរបរម្តាយ', 'ទូរស័ព្ទម្តាយ',
        'ឈ្មោះអាណាព្យាបាល', 'មុខរបរអាណាព្យាបាល', 'ទូរស័ព្ទអាណាព្យាបាល',
        'ចំនួនបងប្អូន', 'ស្ថានភាពចំណាកស្រុក (none/parents/student)', 'ហិង្សាក្នុងគ្រួសារ (yes/no)', 'ទីជម្រក', 'ចំណូលប្រចាំខែ(រៀល)',
        'អាសយដ្ឋានបច្ចុប្បន្ន'
      ];

      const headerRow = sheet.addRow(headers);
      headerRow.height = 30;
      headerRow.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        cell.font = headerFont;
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = thinBorder;
        sheet.getColumn(colNumber).width = colNumber === 1 ? 5 : 20;
      });

      for (let i = 1; i <= 10; i++) {
        const row = sheet.addRow([i, `ID-${1000+i}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        row.height = 25;
        row.eachCell(cell => {
          cell.font = cellFont;
          cell.border = thinBorder;
          cell.alignment = { vertical: 'middle' };
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `MoEYS_Master_Template_${activeClass?.name || 'Class'}.xlsx`;
      link.click();
    } catch (e) {
      console.error(e);
      alert('មានបញ្ហាក្នុងការទាញយកគំរូ');
    }
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
          <StudentFilters 
            totalStudents={students.length}
            isLoading={isLoading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedIdsCount={selectedIds.length}
            onDeleteSelected={handleDeleteSelected}
            isSaving={isSaving}
            onOpenImport={() => setIsImportModalOpen(true)}
            onDownloadTemplate={handleDownloadTemplate}
            onOpenGrid={() => setIsGridModalOpen(true)}
            onAddStudent={openAddModal}
          />

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
      <StudentTable 
        students={students}
        setStudents={setStudents}
        filteredStudents={filteredStudents}
        activeTableView={activeTableView}
        sortState={sortState}
        handleSort={handleSort}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        openEditModal={openEditModal}
        openStatusModal={(std) => {
          setStatusForm({ ...statusForm, studentId: std.id });
          setIsStatusModalOpen(true);
        }}
      />
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
