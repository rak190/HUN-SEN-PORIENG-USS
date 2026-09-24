'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { 
  Users, Search, Filter, FileSpreadsheet, 
  Download, Edit2, Check, X, ShieldCheck, Trash2, Loader2,
  ArrowRightLeft, UserX, ChevronLeft, ChevronRight, GraduationCap, ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// Assuming the font exists or we fallback
import { suwannaphumBase64 } from '@/public/fonts/SuwannaphumBase64';

import StudentMigrationModal from './components/StudentMigrationModal';
import StudentPromotionModal from './components/StudentPromotionModal';
import StudentProfileDrawer from './components/StudentProfileDrawer';
import AdminBasicRegistrationModal from '@/components/admin/AdminBasicRegistrationModal';
import AdminBasicImportModal from '@/components/admin/AdminBasicImportModal';
import GIEPImportManager from './components/GIEPImportManager';
import StudentGoogleSheetGrid from './components/StudentGoogleSheetGrid';
import AdminStudentRequestsQueue from './components/AdminStudentRequestsDrawer';
import { fetchExportData, getPendingStudentRequests, batchRegisterBasicStudents, bulkArchiveStudents } from './actions';

interface MasterStudentsClientProps {
  initialStudents: any[];
  totalCount: number;
  globalStats?: {
    total: number;
    female: number;
    male: number;
    classes: number;
  };
  currentPage: number;
  pageSize: number;
  filters: {
    q: string;
    class: string;
    teacher: string;
    gender: string;
    desk: string;
  };
  filterOptions: {
    classes: { id: string; name: string }[];
    teachers: string[];
  };
}

export default function MasterStudentsClient({
  initialStudents,
  totalCount,
  globalStats,
  currentPage,
  pageSize,
  filters,
  filterOptions
}: MasterStudentsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [students, setStudents] = useState<any[]>(initialStudents);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [selectedProfileStudent, setSelectedProfileStudent] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.q);
  const [isBasicRegistrationModalOpen, setIsBasicRegistrationModalOpen] = useState(false);
  const [isBasicImportModalOpen, setIsBasicImportModalOpen] = useState(false);
  const [isGiepImportModalOpen, setIsGiepImportModalOpen] = useState(false);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'list' | 'grid' | 'requests'>('list');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isSavingGrid, setIsSavingGrid] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleTabChange = (tab: 'list' | 'grid' | 'requests') => {
    startTransition(() => {
      setActiveTab(tab);
    });
  };

  const [importExportMenuOpen, setImportExportMenuOpen] = useState(false);
  const [classOpsMenuOpen, setClassOpsMenuOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleBulkArchive = async () => {
    if (!confirm(`តើអ្នកពិតជាចង់លុប/ផ្អាកសិស្សចំនួន ${selectedStudents.length} នាក់នេះមែនទេ? (Soft Delete)`)) {
      return;
    }
    setIsArchiving(true);
    // Since we don't have the active year directly in props for this, we pass 'fetch-active'
    const res = await bulkArchiveStudents(selectedStudents, 'fetch-active');
    setIsArchiving(false);
    if (res.success) {
      alert('បានលុបដោយជោគជ័យ!');
      setSelectedStudents([]);
      // Reload is handled by revalidatePath in actions, but we can also manually refresh router
      router.refresh();
    } else {
      alert(`បរាជ័យ: ${res.error}`);
    }
  };

  // Fetch pending requests on mount and after actions
  const fetchRequests = async () => {
    const res = await getPendingStudentRequests();
    if (res.success) {
      setPendingRequests(res.data || []);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Sync state with props
  useEffect(() => {
    setStudents(initialStudents);
    // Clear selection on page or filter change to prevent accidental cross-page bulk actions
    setSelectedStudents([]);
  }, [initialStudents, filters, currentPage]);

  // Debounced Search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== filters.q) {
        updateFilter('q', localSearch);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [localSearch]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.action-dropdown')) {
        setImportExportMenuOpen(false);
        setClassOpsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateFilter = (key: string, value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== 'all') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 when filters change (except when changing page)
      if (key !== 'page') {
        params.delete('page');
      }
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const res = await fetchExportData(filters);
      if (!res.success) {
        alert("បរាជ័យក្នុងការទាញយកទិន្នន័យ៖ " + res.error);
        return;
      }
      
      const exportData = res.data;
      if (!exportData || exportData.length === 0) {
        alert("មិនមានទិន្នន័យសម្រាប់ទាញយកទេ");
        return;
      }

      const doc = new jsPDF();
      
      // Add Khmer font
      doc.addFileToVFS("Suwannaphum.ttf", suwannaphumBase64);
      doc.addFont("Suwannaphum.ttf", "Suwannaphum", "normal");
      doc.setFont("Suwannaphum");

      doc.setFontSize(16);
      doc.text("បញ្ជីរាយនាមសិស្ស (Student Roster)", 14, 15);
      
      doc.setFontSize(10);
      doc.text(`សរុប: ${exportData.length} នាក់`, 14, 22);

      const tableData = exportData.map((s: any, index: number) => [
        index + 1,
        s.student_id_number || '',
        s.full_name,
        s.gender,
        s.class_name,
        s.desk_number || '',
        s.room_number || '',
        s.is_active ? 'សកម្ម' : 'ផ្អាក'
      ]);

      autoTable(doc, {
        head: [['ល.រ', 'អត្តលេខ', 'គោត្តនាម និងនាម', 'ភេទ', 'ថ្នាក់', 'លេខតុ', 'បន្ទប់', 'ស្ថានភាព']],
        body: tableData,
        startY: 25,
        styles: {
          font: 'Suwannaphum',
          fontSize: 9,
        },
        headStyles: {
          fillColor: [21, 94, 239],
          textColor: 255,
          fontStyle: 'bold'
        }
      });

      doc.save(`Students_Roster_${new Date().toLocaleDateString('km-KH').replace(/\//g, '-')}.pdf`);
    } catch (err) {
      console.error(err);
      alert("មានបញ្ហាក្នុងការទាញយក PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetchExportData(filters);
      if (!res.success) {
        alert("បរាជ័យក្នុងការទាញយកទិន្នន័យ៖ " + res.error);
        return;
      }
      
      const exportData = res.data;
      if (!exportData || exportData.length === 0) {
        alert("មិនមានទិន្នន័យសម្រាប់ទាញយកទេ");
        return;
      }
      
      const wsData = exportData.map((s: any, index: number) => ({
        'ល.រ': index + 1,
        'អត្តលេខ': s.student_id_number || '',
        'គោត្តនាម និងនាម': s.full_name,
        'ភេទ': s.gender,
        'ថ្នាក់': s.class_name,
        'គ្រូបន្ទុកថ្នាក់': s.homeroom_teacher,
        'លេខតុ': s.desk_number || '',
        'លេខបន្ទប់': s.room_number || '',
        'ស្ថានភាព': s.is_active ? 'សកម្ម' : 'ផ្អាក'
      }));

      const ws = XLSX.utils.json_to_sheet(wsData);
      
      ws['!cols'] = [
        { wch: 5 },  // No
        { wch: 15 }, // ID
        { wch: 30 }, // Name
        { wch: 10 }, // Gender
        { wch: 15 }, // Class
        { wch: 25 }, // Teacher
        { wch: 15 }, // Desk Number
        { wch: 15 }, // Status
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students Registry");
      XLSX.writeFile(wb, `KruSmart_Students_Registry_${new Date().toLocaleDateString('km-KH').replace(/\//g, '-')}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("មានបញ្ហាក្នុងការទាញយក");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    // 1. Instructions Sheet (Read Me)
    const readmeData = [
      ['ការណែនាំអំពីការប្រើប្រាស់គំរូ Excel (Read Me)'],
      [''],
      ['១. សូមកុំប្តូរឈ្មោះ Column (ជួរឈរ) ខាងលើឱ្យសោះ។ ប្រព័ន្ធនឹងអានទិន្នន័យតាមឈ្មោះទាំងនេះ។'],
      ['២. ព័ត៌មានដែលចាំបាច់ត្រូវតែមាន៖ អត្តលេខ, នាមត្រកូល, នាមខ្លួន, និង ភេទ។'],
      ['៣. ភេទ៖ សូមបញ្ចូល "M" ឬ "ប្រុស" សម្រាប់សិស្សប្រុស, "F" ឬ "ស្រី" សម្រាប់សិស្សស្រី។'],
      ['៤. ថ្នាក់៖ សូមបញ្ចូលឈ្មោះថ្នាក់ឱ្យបានត្រឹមត្រូវ (ឧ. "7A", "10A") បើមិនទាន់មានថ្នាក់ សូមទុកទទេ។'],
      ['៥. លេខតុ និង បន្ទប់ប្រឡង៖ អាចទុកទទេបានប្រសិនបើមិនទាន់មាន។'],
      ['៦. ឆ្នាំសិក្សា៖ សូមបញ្ចូលឆ្នាំសិក្សាបច្ចុប្បន្ន (ឧ. "2024-2025")។'],
      [''],
      ['បញ្ជាក់៖ ទិន្នន័យដែលបញ្ចូលនៅទីនេះ នឹងក្លាយជាទិន្នន័យគោល (Basic Data) សម្រាប់គ្រូបន្ទុកថ្នាក់។']
    ];

    const wsReadme = XLSX.utils.aoa_to_sheet(readmeData);
    // Set column widths for readme
    wsReadme['!cols'] = [{ wch: 80 }];

    // 2. Data Template Sheet
    const wsData = [{
      'អត្តលេខ': '',
      'នាមត្រកូល': '',
      'នាមខ្លួន': '',
      'ភេទ': '',
      'ថ្នាក់': '',
      'ឆ្នាំសិក្សា': '',
      'លេខតុ': '',
      'បន្ទប់ប្រឡង': ''
    }];

    const ws = XLSX.utils.json_to_sheet(wsData);
    
    // Set column widths for data
    ws['!cols'] = [
      { wch: 15 }, // អត្តលេខ
      { wch: 20 }, // នាមត្រកូល
      { wch: 20 }, // នាមខ្លួន
      { wch: 10 }, // ភេទ
      { wch: 15 }, // ថ្នាក់
      { wch: 15 }, // ឆ្នាំសិក្សា
      { wch: 10 }, // លេខតុ
      { wch: 15 }  // បន្ទប់ប្រឡង
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsReadme, "ការណែនាំ (Read Me)");
    XLSX.utils.book_append_sheet(wb, ws, "ទិន្នន័យសិស្ស (Data)");
    
    XLSX.writeFile(wb, `Basic_Registration_Template.xlsx`);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudents(students.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6 animate-fadeIn select-none p-4 md:p-8 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-2">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-[#155EEF]" />
            ការគ្រប់គ្រងទិន្នន័យសិស្ស
          </h1>
          
          {/* Sub-header stats row */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm text-sm">
              <span className="text-slate-500 font-semibold">សរុប:</span>
              <span className="font-bold text-slate-800">{globalStats?.total || totalCount}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm text-sm">
              <span className="text-slate-500 font-semibold">ស្រី:</span>
              <span className="font-bold text-pink-600">{globalStats?.female || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm text-sm">
              <span className="text-slate-500 font-semibold">ប្រុស:</span>
              <span className="font-bold text-blue-600">{globalStats?.male || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm text-sm">
              <span className="text-slate-500 font-semibold">ថ្នាក់សកម្ម:</span>
              <span className="font-bold text-emerald-600">{globalStats?.classes || 0}</span>
            </div>
          </div>
        </div>
        
        {/* Consolidated Action Hierarchy */}
        <div className="flex flex-wrap items-center gap-2 relative z-20">
          
          {/* Secondary Actions (Dropdowns) */}
          <div className="flex items-center gap-2">
            
            {/* Class Operations Dropdown */}
            <div className="relative action-dropdown">
              <button 
                onClick={() => {
                  setClassOpsMenuOpen(!classOpsMenuOpen);
                  setImportExportMenuOpen(false);
                }}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-sm"
              >
                សកម្មភាពថ្នាក់ <ChevronDown className="w-4 h-4" />
              </button>
              
              {classOpsMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-1 z-50 animate-in fade-in slide-in-from-top-2">
                  <button 
                    onClick={() => { setIsMigrationModalOpen(true); setClassOpsMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#155EEF] flex items-center gap-2 transition-colors"
                  >
                    <ArrowRightLeft className="w-4 h-4" /> ផ្ទេរប្តូរថ្នាក់សិស្ស
                  </button>
                  <button 
                    onClick={() => { setIsPromotionModalOpen(true); setClassOpsMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-teal-600 flex items-center gap-2 transition-colors"
                  >
                    <GraduationCap className="w-4 h-4" /> ឡើងថ្នាក់សិស្ស
                  </button>
                </div>
              )}
            </div>

            {/* Import / Export Dropdown */}
            <div className="relative action-dropdown">
              <button 
                onClick={() => {
                  setImportExportMenuOpen(!importExportMenuOpen);
                  setClassOpsMenuOpen(false);
                }}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-sm"
              >
                នាំចូល & នាំចេញ <ChevronDown className="w-4 h-4" />
              </button>
              
              {importExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-1 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">នាំចូល (Import)</div>
                  <button 
                    onClick={() => { setIsBasicImportModalOpen(true); setImportExportMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> នាំចូលឯកសារ Excel/CSV
                  </button>
                  <button 
                    onClick={() => { setIsGiepImportModalOpen(true); setImportExportMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> នាំចូលទិន្នន័យ GIEP
                  </button>
                  <div className="h-px bg-slate-100 my-1"></div>
                  <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">ទាញយក (Export & Templates)</div>
                  <button 
                    onClick={() => { handleExport(); setImportExportMenuOpen(false); }}
                    disabled={isExporting || totalCount === 0}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" /> ទាញយកបញ្ជីសិស្ស (Excel)
                  </button>
                  <button 
                    onClick={() => { handleExportPDF(); setImportExportMenuOpen(false); }}
                    disabled={isExporting || totalCount === 0}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-red-600 flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" /> ទាញយកបញ្ជីសិស្ស (PDF)
                  </button>
                  <button 
                    onClick={() => { handleDownloadTemplate(); setImportExportMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-slate-400" /> ទាញយកគំរូទម្រង់ Excel
                  </button>
                </div>
              )}
            </div>
            
          </div>

          {/* Primary CTA */}
          <button 
            onClick={() => setIsBasicRegistrationModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow font-medium px-4 py-2 rounded-xl flex items-center gap-2 text-sm transition-all"
          >
            <span className="font-black text-lg leading-none mb-0.5">+</span> ចុះឈ្មោះសិស្សថ្មី
          </button>
          
        </div>
      </header>

      {/* Segmented Sub-Tab Navigation Bar */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 inline-flex flex-wrap items-center gap-1.5 mb-2 backdrop-blur-sm mt-4">
        <button
          onClick={() => handleTabChange('list')}
          className={`${
            activeTab === 'list'
              ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60 rounded-xl px-4 py-2 text-sm font-medium transition-all flex items-center gap-2'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-xl px-4 py-2 text-sm font-medium transition-all flex items-center gap-2'
          }`}
        >
          <Users className="w-4 h-4" />
          តារាងសិស្សសរុប
        </button>
        <button
          onClick={() => handleTabChange('grid')}
          className={`${
            activeTab === 'grid'
              ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60 rounded-xl px-4 py-2 text-sm font-medium transition-all flex items-center gap-2'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-xl px-4 py-2 text-sm font-medium transition-all flex items-center gap-2'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          បញ្ចូលទិន្នន័យបឋម (Google Sheet Grid)
        </button>
        <button
          onClick={() => handleTabChange('requests')}
          className={`${
            activeTab === 'requests'
              ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60 rounded-xl px-4 py-2 text-sm font-medium transition-all flex items-center gap-2'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-xl px-4 py-2 text-sm font-medium transition-all flex items-center gap-2'
          }`}
        >
          <UserX className="w-4 h-4" />
          សំណើសិស្សថ្មីពីគ្រូ
          {pendingRequests.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white shadow-sm animate-in zoom-in">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Views */}
      <div className="relative">
        {isPending && (
          <div className="absolute inset-0 z-50 flex items-start justify-center pt-20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] rounded-[24px]">
            <div className="flex flex-col items-center gap-2 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700">
              <Loader2 className="w-6 h-6 animate-spin text-[#155EEF]" />
              <span className="font-kantumruy text-sm font-bold text-slate-700 dark:text-slate-200">កំពុងផ្ទុកទិន្នន័យ...</span>
            </div>
          </div>
        )}

      {activeTab === 'grid' && (
        <div className="mt-6">
          <StudentGoogleSheetGrid 
            activeClasses={filterOptions.classes}
            isSaving={isSavingGrid}
            onCancel={() => setActiveTab('list')}
            onSave={async (students) => {
              setIsSavingGrid(true);
              const res = await batchRegisterBasicStudents(students, 'fetch-active');
              setIsSavingGrid(false);
              
              if (res.success) {
                alert(`បានបញ្ចូលទិន្នន័យសិស្សចំនួន ${res.count} នាក់ដោយជោគជ័យ!`);
                setActiveTab('list');
                router.refresh();
              } else {
                alert('មានបញ្ហាក្នុងការបញ្ចូលទិន្នន័យ: ' + res.error);
              }
            }}
          />
        </div>
      )}

      {activeTab === 'requests' && (
        <AdminStudentRequestsQueue
          requests={pendingRequests}
          activeAcademicYearId="fetch-active"
          onRefresh={() => {
            fetchRequests();
            router.refresh();
          }}
        />
      )}

      {activeTab === 'list' && (
        <div className="bg-white rounded-[24px] shadow-xs border border-slate-100/80 overflow-hidden mt-6">
          
          {/* Mission Control Header */}
          <div className="p-4 border-b border-slate-100/80 bg-slate-50/80">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              
              {/* Context Aware Action Area (Search vs Bulk Actions) */}
              <div className="flex-1 transition-all duration-300">
                {selectedStudents.length > 0 ? (
                  <div className="flex items-center gap-3 bg-[#155EEF] text-white p-2 rounded-xl shadow-md animate-in slide-in-from-left-4">
                    <div className="font-bold flex items-center gap-2 text-sm pl-2">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      សិស្ស {selectedStudents.length} នាក់ ត្រូវបានជ្រើសរើស (ទំព័រនេះ)
                    </div>
                    <button 
                      onClick={() => setIsMigrationModalOpen(true)}
                      className="ml-auto px-4 py-1.5 bg-white text-[#155EEF] font-black rounded-lg hover:bg-blue-50 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-sm flex items-center gap-2 text-xs"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" /> ផ្ទេរថ្នាក់ (Bulk Migrate)
                    </button>
                    <button 
                      onClick={handleBulkArchive}
                      disabled={isArchiving}
                      className="px-4 py-1.5 bg-rose-500/20 text-white font-black rounded-lg hover:bg-rose-500 hover:shadow-lg transition-all shadow-sm flex items-center gap-2 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {isArchiving ? 'កំពុងលុប...' : 'លុប/ផ្អាក (Soft Delete)'}
                    </button>
                    <button 
                      onClick={() => setSelectedStudents([])}
                      className="p-1.5 bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative w-full max-w-xl group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400 group-focus-within:text-[#155EEF] transition-colors" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="ស្វែងរកសិស្សតាមឈ្មោះ, អត្តលេខ, ឬ លេខតុ..." 
                      value={localSearch}
                      onChange={(e) => setLocalSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#155EEF]/10 focus:border-[#155EEF] transition-all shadow-sm"
                    />
                  </div>
                )}
              </div>
              
              {/* Filters Area */}
              <div className={`flex flex-wrap sm:flex-nowrap gap-2 transition-opacity duration-300 ${selectedStudents.length > 0 ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <select 
                    value={filters.class}
                    onChange={(e) => updateFilter('class', e.target.value)}
                    className="pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#155EEF]/20 focus:border-[#155EEF] appearance-none shadow-sm cursor-pointer"
                  >
                    <option value="all">គ្រប់ថ្នាក់</option>
                    <option value="គ្មានថ្នាក់">គ្មានថ្នាក់</option>
                    {filterOptions.classes.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <select 
                    value={filters.teacher}
                    onChange={(e) => updateFilter('teacher', e.target.value)}
                    className="w-full sm:w-32 pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-slate-300 focus:ring-2 focus:ring-[#155EEF]/20 focus:border-[#155EEF] outline-none transition-all appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="all">គ្រប់គ្រូ</option>
                    {filterOptions.teachers.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <select 
                    value={filters.gender}
                    onChange={(e) => updateFilter('gender', e.target.value)}
                    className="w-full sm:w-28 pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-slate-300 focus:ring-2 focus:ring-[#155EEF]/20 focus:border-[#155EEF] outline-none transition-all appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="all">គ្រប់ភេទ</option>
                    <option value="M">ប្រុស</option>
                    <option value="F">ស្រី</option>
                  </select>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <select 
                    value={filters.desk}
                    onChange={(e) => updateFilter('desk', e.target.value)}
                    className="w-full sm:w-36 pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-slate-300 focus:ring-2 focus:ring-[#155EEF]/20 focus:border-[#155EEF] outline-none transition-all appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="all">ស្ថានភាពលេខតុ</option>
                    <option value="assigned">មានលេខតុ</option>
                    <option value="unassigned">គ្មានលេខតុ</option>
                  </select>
                </div>
              </div>
              
            </div>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F4F7FE] sticky top-0 z-10 border-b border-blue-100/80">
                <tr>
                  <th className="p-3 w-10 text-center border-r border-blue-100/80">
                    <input 
                      type="checkbox" 
                      checked={selectedStudents.length === students.length && students.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-[#155EEF] rounded border-blue-200 focus:ring-[#155EEF]"
                    />
                  </th>
                  <th className="px-4 py-3 text-[11px] font-black text-blue-700 uppercase tracking-wider border-r border-blue-100/80">សិស្ស</th>
                  <th className="px-4 py-3 text-[11px] font-black text-blue-700 uppercase tracking-wider text-center border-r border-blue-100/80">ភេទ</th>
                  <th className="px-4 py-3 text-[11px] font-black text-blue-700 uppercase tracking-wider text-center border-r border-blue-100/80">ថ្នាក់</th>
                  <th className="px-4 py-3 text-[11px] font-black text-blue-700 uppercase tracking-wider text-center border-r border-blue-100/80">លេខតុ</th>
                  <th className="px-4 py-3 text-[11px] font-black text-blue-700 uppercase tracking-wider text-center border-r border-blue-100/80">លេខបន្ទប់</th>
                  <th className="px-4 py-3 text-[11px] font-black text-blue-700 uppercase tracking-wider border-r border-blue-100/80">គ្រូបន្ទុកថ្នាក់</th>
                  <th className="px-4 py-3 text-[11px] font-black text-blue-700 uppercase tracking-wider text-center">ស្ថានភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.length > 0 ? (
                  students.map((student) => (
                    <tr 
                      key={student.id} 
                      className={`hover:bg-blue-50/50 transition-colors group cursor-pointer ${
                        selectedStudents.includes(student.id) ? 'bg-blue-50/80' : ''
                      }`}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('input[type="checkbox"]')) return;
                        if ((e.target as HTMLElement).closest('button')) return;
                        setSelectedProfileStudent(student);
                      }}
                    >
                      <td className="p-3 text-center border-r border-slate-100">
                        <input 
                          type="checkbox" 
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleSelect(student.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-[#155EEF] rounded border-slate-300 focus:ring-[#155EEF]"
                        />
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0 group-hover:bg-[#155EEF] group-hover:text-white transition-colors">
                            {student.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm group-hover:text-[#155EEF] transition-colors">{student.full_name}</div>
                            <div className="text-xs font-semibold text-slate-500">{student.student_id_number || 'មិនមានអត្តលេខ'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center border-r border-slate-100">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${
                          student.gender === 'ប្រុស' || student.gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                        }`}>
                          {student.gender}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center border-r border-slate-100">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                          student.class_name !== 'គ្មានថ្នាក់' ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}>
                          {student.class_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center border-r border-slate-100">
                        {student.desk_number ? (
                          <span className="font-bold text-slate-700 text-sm">{student.desk_number}</span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center border-r border-slate-100">
                        {student.room_number ? (
                          <span className="font-bold text-slate-700 text-sm">{student.room_number}</span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          {student.homeroom_teacher !== 'មិនមាន' ? (
                            <span className="text-sm font-semibold text-slate-700">{student.homeroom_teacher}</span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400 italic">មិនទាន់កំណត់</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase ${
                          student.is_active 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {student.is_active ? 'សកម្ម' : 'ផ្អាក'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500 font-semibold text-sm">
                      {localSearch ? 'រកមិនឃើញសិស្សដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ' : 'មិនមានទិន្នន័យសិស្ស'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm font-semibold text-slate-600">
                បង្ហាញទំព័រ <span className="text-slate-900 font-bold">{currentPage}</span> នៃ <span className="text-slate-900 font-bold">{totalPages}</span> (សរុប {totalCount} នាក់)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateFilter('page', (currentPage - 1).toString())}
                  disabled={currentPage <= 1}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex gap-1 overflow-x-auto max-w-[200px] hide-scrollbar">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Show pages around current
                    let p = currentPage - 2 + i;
                    if (currentPage <= 3) p = i + 1;
                    else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                    
                    if (p > 0 && p <= totalPages) {
                      return (
                        <button
                          key={p}
                          onClick={() => updateFilter('page', p.toString())}
                          className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                            currentPage === p 
                              ? 'bg-[#155EEF] text-white shadow-sm' 
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => updateFilter('page', (currentPage + 1).toString())}
                  disabled={currentPage >= totalPages}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}
      </div>

      {/* Modals & Drawers */}
      <AdminBasicRegistrationModal
        isOpen={isBasicRegistrationModalOpen}
        onClose={() => setIsBasicRegistrationModalOpen(false)}
        onSuccess={() => {
          setIsBasicRegistrationModalOpen(false);
          // Refresh the page
          router.refresh();
        }}
        filterOptions={{
          classes: filterOptions.classes
        }}
      />

      <StudentMigrationModal 
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        selectedStudentIds={selectedStudents}
        onComplete={() => {
          setIsMigrationModalOpen(false);
          setSelectedStudents([]);
          // Force refresh
          router.refresh();
        }}
      />

      <StudentPromotionModal 
        isOpen={isPromotionModalOpen}
        onClose={() => setIsPromotionModalOpen(false)}
        onComplete={() => {
          setIsPromotionModalOpen(false);
          setSelectedStudents([]);
          router.refresh();
        }}
      />

      <StudentProfileDrawer
        student={selectedProfileStudent}
        isOpen={!!selectedProfileStudent}
        onClose={() => {
          setSelectedProfileStudent(null);
          router.refresh();
        }}
      />
      <AdminBasicImportModal
        isOpen={isBasicImportModalOpen}
        onClose={() => setIsBasicImportModalOpen(false)}
        onSuccess={(data) => {
          setIsBasicImportModalOpen(false);
          router.refresh();
        }}
      />
      {isGiepImportModalOpen && (
        <GIEPImportManager 
          onClose={() => setIsGiepImportModalOpen(false)}
          onImportComplete={() => {
            setIsGiepImportModalOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
