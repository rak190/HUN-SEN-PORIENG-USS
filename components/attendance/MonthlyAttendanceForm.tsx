'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Student, MonthlyAttendanceSummary, RootCauseAbsence, AttendanceRecord } from '@/types';
import {
  CalendarCheck,
  CheckCircle2,
  RefreshCw,
  Search,
  AlertTriangle,
  Calendar,
  Users,
  AlertCircle,
  Percent,
  Activity,
  ShieldAlert,
  Smartphone,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
  Download
} from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

const ROOT_CAUSE_OPTIONS: { value: RootCauseAbsence; label: string }[] = [
  { value: 'farming', label: '🌾 ជួយការងារស្រែចម្ការ' },
  { value: 'poverty', label: '💸 ជីវភាពខ្វះខាត' },
  { value: 'illness', label: '🏥 ឈឺ / សុខភាព' },
  { value: 'transport', label: '🚲 គ្មានមធ្យោបាយ' },
  { value: 'migration', label: '🚚 ចំណាកស្រុក' },
  { value: 'other', label: '❓ ផ្សេងៗ' },
];

export default function MonthlyAttendanceForm() {
  const { activeClass, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  
  // Format current month to YYYY-MM
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [viewMode, setViewMode] = useState<'monthly' | 'daily'>('monthly');
  const [rawDailyRecords, setRawDailyRecords] = useState<AttendanceRecord[]>([]);
  
  // Stats & Command Center Data
  const [totalSchoolDays, setTotalSchoolDays] = useState<number>(25);
  const [monitorDaysSubmitted, setMonitorDaysSubmitted] = useState<number>(0);
  const [totalMonthlyAbsences, setTotalMonthlyAbsences] = useState<number>(0);
  const [dropoutAlertsCount, setDropoutAlertsCount] = useState<number>(0);

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    if (!activeClass?.id) {
      alert('សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន');
      return;
    }

    setExporting(true);
    try {
      if (!students || students.length === 0) {
        alert('មិនទាន់មានទិន្នន័យសិស្សសម្រាប់ទាញយកទេ');
        return;
      }

      const { 
        createOfficialMoEYSWorkbook, 
        applyMoEYSHeaders, 
        applyStandardTableStyles, 
        autoAdjustColumnWidths, 
        addSignatureBlock,
        downloadExcel
      } = await import('@/lib/excel/styledExcelGenerator');

      const totalCols = 4 + 31 + 3; // base(4) + days(31) + totals(3)
      const { workbook, worksheet, startRow } = createOfficialMoEYSWorkbook({
        sheetName: `វត្តមាន_${selectedMonth}`,
        orientation: 'landscape',
        documentTitle: 'បញ្ជីវត្តមានសិស្សប្រចាំខែ',
        schoolName: 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង'
      });

      const currentYearStr = selectedMonth.slice(0, 4);
      const currentMonthNum = selectedMonth.slice(5, 7);
      const monthObj = [
        { value: '01', label: 'មករា' }, { value: '02', label: 'កុម្ភៈ' }, { value: '03', label: 'មីនា' }, { value: '04', label: 'មេសា' },
        { value: '05', label: 'ឧសភា' }, { value: '06', label: 'មិថុនា' }, { value: '07', label: 'កក្កដា' }, { value: '08', label: 'សីហា' },
        { value: '09', label: 'កញ្ញា' }, { value: '10', label: 'តុលា' }, { value: '11', label: 'វិច្ឆិកា' }, { value: '12', label: 'ធ្នូ' }
      ].find(m => m.value === currentMonthNum);
      
      const monthLabel = monthObj ? `ខែ${monthObj.label} ឆ្នាំ${currentYearStr}` : selectedMonth;
      const ac = activeClass as any;
      const teacherName = ac.homeroom_teacher?.full_name || '.....................................';

      applyMoEYSHeaders(
        worksheet, 
        totalCols, 
        'បញ្ជីវត្តមានសិស្សប្រចាំខែ',
        `ថ្នាក់ ${activeClass.name} | ${monthLabel} | គ្រូបន្ទុកថ្នាក់៖ ${teacherName}`
      );

      // Headers Row 1
      const headerRow1 = worksheet.getRow(startRow);
      const headerRow2 = worksheet.getRow(startRow + 1);

      worksheet.mergeCells(startRow, 1, startRow + 1, 1);
      headerRow1.getCell(1).value = 'ល.រ';
      worksheet.mergeCells(startRow, 2, startRow + 1, 2);
      headerRow1.getCell(2).value = 'អត្តលេខ';
      worksheet.mergeCells(startRow, 3, startRow + 1, 3);
      headerRow1.getCell(3).value = 'គោត្តនាម និងនាម';
      worksheet.mergeCells(startRow, 4, startRow + 1, 4);
      headerRow1.getCell(4).value = 'ភេទ';

      worksheet.mergeCells(startRow, 5, startRow, 5 + 30);
      headerRow1.getCell(5).value = 'ថ្ងៃទីក្នុងខែ';
      for (let day = 1; day <= 31; day++) {
        headerRow2.getCell(4 + day).value = day;
      }

      worksheet.mergeCells(startRow, 36, startRow, 38);
      headerRow1.getCell(36).value = 'សរុបអវត្តមាន';
      headerRow2.getCell(36).value = 'ច្បាប់';
      headerRow2.getCell(37).value = 'អត់ច្បាប់';
      headerRow2.getCell(38).value = 'សរុបរួម';

      applyStandardTableStyles(worksheet, startRow, startRow + 2, 0, totalCols);
      applyStandardTableStyles(worksheet, startRow + 1, startRow + 2, 0, totalCols);

      students.forEach((s, idx) => {
        const row = worksheet.getRow(startRow + 2 + idx);
        row.getCell(1).value = idx + 1;
        row.getCell(2).value = s.student_id_number || '-';
        row.getCell(3).value = s.full_name;
        row.getCell(4).value = s.gender === 'F' || s.gender === 'ស្រី' ? 'ស' : 'ប';

        let absentCount = formData[s.id]?.absent_count || 0;
        let permCount = formData[s.id]?.permission_count || 0;

        for (let day = 1; day <= 31; day++) {
          const dayStr = day.toString().padStart(2, '0');
          const fullDate = `${selectedMonth}-${dayStr}`;
          const record = rawDailyRecords.find(r => r.student_id === s.id && r.date === fullDate);
          
          const cell = row.getCell(4 + day);
          if (record) {
            if (record.status === 'absent' || record.status === 'A') {
              cell.value = 'អ';
              cell.font = { name: 'Khmer OS Battambang', size: 10, color: { argb: 'FFDC2626' } };
            } else if (record.status === 'permission' || record.status === 'P') {
              cell.value = 'ច';
              cell.font = { name: 'Khmer OS Battambang', size: 10, color: { argb: 'FFD97706' } };
            } else if (record.status === 'late' || record.status === 'L') {
              cell.value = 'យ';
            } else if (record.status === 'present') {
              cell.value = 'វ';
              cell.font = { name: 'Khmer OS Battambang', size: 10, color: { argb: 'FF16A34A' } };
            }
          }
        }

        row.getCell(36).value = permCount > 0 ? permCount : '';
        row.getCell(37).value = absentCount > 0 ? absentCount : '';
        row.getCell(38).value = permCount + absentCount > 0 ? permCount + absentCount : '';
      });

      applyStandardTableStyles(worksheet, startRow, startRow + 2, students.length, totalCols);
      
      const minWidths = [6, 12, 22, 6];
      for (let i = 0; i < 31; i++) minWidths.push(4); 
      minWidths.push(8, 8, 8);
      autoAdjustColumnWidths(worksheet, totalCols, minWidths);

      addSignatureBlock(worksheet, startRow + 2 + students.length + 3, totalCols, teacherName);

      await downloadExcel(workbook, `Attendance_${activeClass.name}_${selectedMonth}.xlsx`);
    } catch (err: any) {
      console.error('Error exporting attendance:', err);
      alert(`មានបញ្ហាក្នុងការទាញយក Excel: ${err?.message || 'Error'}`);
    } finally {
      setExporting(false);
    }
  };

  const handlePrintPDF = () => {
    if (!activeClass?.id) {
      alert('សូមជ្រើសរើសថ្នាក់រៀនជាមុនសិន');
      return;
    }

    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    const khmerMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
    const monthLabel = khmerMonths[month - 1];
    
    // Attempt to parse academic year from string (e.g. "2024-2025") or fallback
    let academicYear = '2024-2025';
    const ac = activeClass as any;
    if (ac.academic_year?.name) {
      academicYear = ac.academic_year.name;
    } else {
      academicYear = `${year}-${year + 1}`;
    }
    
    const rowsHtml = students.map((std, idx) => {
      const summary = formData[std.id] || { absent_count: 0, permission_count: 0, late_count: 0 };
      const absentTotal = (summary.absent_count || 0);
      const permissionTotal = (summary.permission_count || 0);
      const totalAbsences = absentTotal + permissionTotal;
      
      let daysHtml = '';
      for (let i = 1; i <= 31; i++) {
        if (i > daysInMonth) {
          daysHtml += `<td style="border: 1px solid #94a3b8; background-color: #f1f5f9;"></td>`;
        } else {
          const dateStr = `${yearStr}-${monthStr}-${i.toString().padStart(2, '0')}`;
          const dayRecord = rawDailyRecords.find(r => r.student_id === std.id && r.date === dateStr);
          
          let displayChar = '';
          let cellColor = '#1e3a8a';
          if (dayRecord) {
            if (dayRecord.status === 'permission') { displayChar = 'ច'; }
            if (dayRecord.status === 'absent') { displayChar = 'អ'; cellColor = '#e11d48'; }
            // present stays blank
          }
          daysHtml += `<td style="border: 1px solid #94a3b8; padding: 2px; text-align: center; font-weight: bold; color: ${cellColor}">${displayChar}</td>`;
        }
      }

      return `
        <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
          <td style="border: 1px solid #94a3b8; padding: 4px 2px; text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="border: 1px solid #94a3b8; padding: 4px 2px; font-family: monospace; font-size: 9px; text-align: center;">${std.student_id_number || '-'}</td>
          <td style="border: 1px solid #94a3b8; padding: 4px 4px; font-weight: bold; text-align: left; color: #0f172a; white-space: nowrap;">${std.full_name}</td>
          <td style="border: 1px solid #94a3b8; padding: 4px 2px; text-align: center;">${std.gender === 'F' || std.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'}</td>
          ${daysHtml}
          <td style="border: 1px solid #94a3b8; padding: 4px 2px; text-align: center; font-weight: bold; color: #1e3a8a;">${permissionTotal || ''}</td>
          <td style="border: 1px solid #94a3b8; padding: 4px 2px; text-align: center; font-weight: bold; color: #e11d48;">${absentTotal || ''}</td>
          <td style="border: 1px solid #94a3b8; padding: 4px 2px; text-align: center; font-weight: black; color: #0f172a; background-color: #eff6ff;">${totalAbsences || ''}</td>
          <td style="border: 1px solid #94a3b8; padding: 4px 2px; text-align: left; font-size: 8px;">${summary.root_cause || ''}</td>
        </tr>
      `;
    }).join('');

    let daysHeaderHtml = '';
    for (let i = 1; i <= 31; i++) {
      daysHeaderHtml += `<th style="width: 18px; background-color: #eff6ff; color: #1e3a8a; padding: 4px 2px;">${i}</th>`;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Attendance_Report_${activeClass.name}_${selectedMonth}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&family=Moul&family=Siemreap&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          * { box-sizing: border-box; }
          body {
            font-family: 'Kantumruy Pro', 'Siemreap', sans-serif;
            font-size: 9.5px; color: #0f172a; margin: 0; padding: 0; background-color: #fff;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          .font-muol { font-family: 'Moul', serif; }
          .header-grid { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
          .header-left { text-align: center; line-height: 1.5; font-size: 11px; font-family: 'Moul', serif; }
          .header-right { text-align: center; line-height: 1.5; font-size: 11px; }
          .main-title { text-align: center; margin: 10px 0 15px; }
          .main-title h1 { font-family: 'Moul', serif; font-size: 16px; margin: 0 0 5px; color: #1e3a8a; }
          .main-title p { font-size: 11px; margin: 0; color: #475569; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
          th { border: 1px solid #94a3b8; padding: 6px 4px; font-weight: 700; text-align: center; color: #1e293b; }
          .signatures { margin-top: 30px; display: flex; justify-content: space-between; text-align: center; font-size: 11px; page-break-inside: avoid; }
          .signature-col { width: 250px; }
          .signature-space { height: 60px; }
        </style>
      </head>
      <body>
        <div class="header-grid">
          <div class="header-left">
            <div>ក្រសួងអប់រំ យុវជន និងកីឡា</div>
            <div>មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តព្រៃវែង</div>
            <div>វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</div>
          </div>
          <div class="header-right">
            <div class="font-muol">ព្រះរាជាណាចក្រកម្ពុជា</div>
            <div class="font-muol" style="font-size: 10px;">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
            <div style="letter-spacing: 2px;">***</div>
          </div>
        </div>

        <div class="main-title">
          <h1>បញ្ជីវត្តមានសិស្សប្រចាំខែ ${monthLabel} ឆ្នាំសិក្សា ${academicYear}</h1>
          <p>កម្រិតថ្នាក់៖ <strong style="color: #1e3a8a;">${activeClass.name}</strong> • គ្រូបន្ទុកថ្នាក់៖ <strong>${user?.full_name || '................................'}</strong></p>
        </div>

        <table>
          <thead>
            <tr>
              <th rowspan="2" style="width: 25px; background-color: #f1f5f9;">ល.រ</th>
              <th rowspan="2" style="width: 60px; background-color: #f1f5f9;">អត្តលេខ</th>
              <th rowspan="2" style="min-width: 120px; text-align: left; padding-left: 6px; background-color: #f1f5f9;">គោត្តនាម និងនាម</th>
              <th rowspan="2" style="width: 35px; background-color: #f1f5f9;">ភេទ</th>
              <th colspan="31" style="background-color: #eff6ff; color: #1e3a8a;">ថ្ងៃទី ១ ដល់ ៣១</th>
              <th colspan="3" style="background-color: #dbeafe; color: #1e3a8a; font-weight: 900;">សរុបអវត្តមាន</th>
              <th rowspan="2" style="width: 50px; background-color: #f1f5f9;">ផ្សេងៗ</th>
            </tr>
            <tr>
              ${daysHeaderHtml}
              <th style="width: 30px; background-color: #dbeafe; color: #1e3a8a;">ច</th>
              <th style="width: 30px; background-color: #dbeafe; color: #e11d48;">អ</th>
              <th style="width: 35px; background-color: #dbeafe; color: #1e3a8a; font-weight: 900;">សរុប</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="signatures">
          <div class="signature-col">
            <div class="font-muol">បានឃើញ និងឯកភាព</div>
            <div style="font-weight: bold; margin-top: 2px;">នាយកសាលា</div>
            <div class="signature-space"></div>
          </div>
          <div class="signature-col">
            <div style="color: #64748b; font-size: 10px;">ថ្ងៃទី......... ខែ......... ឆ្នាំ២០២...</div>
            <div class="font-muol" style="margin-top: 2px;">គ្រូបន្ទុកថ្នាក់</div>
            <div class="signature-space"></div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
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

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // State to hold form data
  const [formData, setFormData] = useState<Record<string, { 
    absent_count: number; 
    permission_count: number; 
    late_count: number;
    root_cause?: RootCauseAbsence | null;
    needs_home_visit?: boolean;
  }>>({});

  const supabase = createClient();

  useEffect(() => {
    if (!activeClass) {
      setStudents([]);
      setMonitorDaysSubmitted(0);
      setTotalMonthlyAbsences(0);
      setDropoutAlertsCount(0);
      setFormData({});
      setRawDailyRecords([]);
      return;
    }

    async function loadData() {
      setLoading(true);
      try {
        const { data: stdData } = await supabase
          .from('active_class_rosters')
          .select('*')
          .eq('enrollment_class_id', activeClass?.id || '')
          .order('full_name', { ascending: true });

        if (stdData && stdData.length > 0) {
          setStudents(stdData as Student[]);
        } else {
          setStudents([]);
        }

        const { data: summaryData } = await supabase
          .from('monthly_attendance_summaries')
          .select('*')
          .eq('class_id', activeClass?.id || '')
          .eq('month', selectedMonth);

        const startDate = `${selectedMonth}-01`;
        const endDate = `${selectedMonth}-31`;

        const { data: dailyRecords } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('class_id', activeClass?.id || '')
          .gte('date', startDate)
          .lte('date', endDate);

        const allStudents = stdData && stdData.length > 0 ? stdData : [];
        const newMap: Record<string, any> = {};
        
        const daysSubmitted = new Set<string>();
        let totalAbsences = 0;
        let dropoutCount = 0;

        // 1. Calculate auto-sums from Monitor's daily records
        const autoSums: Record<string, any> = {};
        allStudents.forEach((s) => {
          autoSums[s.id] = { absent_count: 0, permission_count: 0, late_count: 0 };
        });

        if (dailyRecords) {
          setRawDailyRecords(dailyRecords as AttendanceRecord[]);
          dailyRecords.forEach(rec => {
            daysSubmitted.add(rec.date);
            if (!autoSums[rec.student_id]) autoSums[rec.student_id] = { absent_count: 0, permission_count: 0, late_count: 0 };
            
            if (rec.status === 'absent') { autoSums[rec.student_id].absent_count++; totalAbsences++; }
            if (rec.status === 'permission') autoSums[rec.student_id].permission_count++;
            if (rec.status === 'late') autoSums[rec.student_id].late_count++;
          });
        }
        
        setMonitorDaysSubmitted(daysSubmitted.size);

        // 2. Initialize with Auto-Sums, then OVERRIDE with Teacher's manual input if it exists
        allStudents.forEach((s) => {
          newMap[s.id] = { ...autoSums[s.id], root_cause: null, needs_home_visit: false };
        });

        if (summaryData) {
          summaryData.forEach((rec: any) => {
            // Only override if teacher explicitly saved it (we can assume if it exists in this table, it's a teacher override)
            newMap[rec.student_id] = {
              absent_count: rec.absent_count !== null ? rec.absent_count : autoSums[rec.student_id].absent_count,
              permission_count: rec.permission_count !== null ? rec.permission_count : autoSums[rec.student_id].permission_count,
              late_count: rec.late_count !== null ? rec.late_count : autoSums[rec.student_id].late_count,
              root_cause: rec.root_cause || null,
              needs_home_visit: rec.needs_home_visit || false
            };
            if (newMap[rec.student_id].absent_count >= 3) {
              dropoutCount++;
            }
          });
        }

        setTotalMonthlyAbsences(totalAbsences);
        setDropoutAlertsCount(dropoutCount);

        setFormData(newMap);
        setHasUnsavedChanges(false);
      } catch (e) {
        console.error('Error loading monthly attendance:', e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [activeClass, selectedMonth]);

  async function handleInputChange(studentId: string, field: 'absent_count' | 'permission_count' | 'late_count', value: string) {
    const numValue = parseInt(value, 10) || 0;
    setFormData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: numValue
      }
    }));
    setHasUnsavedChanges(true);
  }

  function handleRootCauseChange(studentId: string, cause: RootCauseAbsence | '') {
    setFormData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        root_cause: cause === '' ? null : cause as RootCauseAbsence
      }
    }));
    setHasUnsavedChanges(true);
  }

  function handleHomeVisitToggle(studentId: string) {
    setFormData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        needs_home_visit: !prev[studentId].needs_home_visit
      }
    }));
    setHasUnsavedChanges(true);
  }

  async function handleSaveAll() {
    setSyncStatus('syncing');

    if (!activeClass) {
      setTimeout(() => {
        setSyncStatus('synced');
        setHasUnsavedChanges(false);
      }, 600);
      return;
    }

    try {
      const upsertPayload = students.map((s) => ({
        class_id: activeClass.id,
        student_id: s.id,
        month: selectedMonth,
        absent_count: formData[s.id]?.absent_count || 0,
        permission_count: formData[s.id]?.permission_count || 0,
        late_count: formData[s.id]?.late_count || 0,
        root_cause: formData[s.id]?.root_cause || null,
        needs_home_visit: formData[s.id]?.needs_home_visit || false,
        recorded_by: user?.id || null,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('monthly_attendance_summaries')
        .upsert(upsertPayload, { onConflict: 'class_id,student_id,month' });

      if (error) throw error;
      setSyncStatus('synced');
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error('Failed to sync monthly attendance:', e);
      setSyncStatus('error');
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    let nextRow = rowIndex;
    let nextCol = colIndex;

    switch (e.key) {
      case 'ArrowUp':
        nextRow -= 1;
        break;
      case 'ArrowDown':
      case 'Enter':
        nextRow += 1;
        break;
      case 'ArrowLeft':
        nextCol -= 1;
        break;
      case 'ArrowRight':
        nextCol += 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    const nextInputId = `input-${nextRow}-${nextCol}`;
    const nextInput = document.getElementById(nextInputId) as HTMLInputElement | null;
    if (nextInput) {
      nextInput.focus();
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
    let result = students.filter((s) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.student_id_number && s.student_id_number.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (sortState.field && sortState.direction) {
      const { field, direction } = sortState;
      const factor = direction === 'asc' ? 1 : -1;

      result = [...result].sort((a, b) => {
        const dataA = formData[a.id] || { absent_count: 0, permission_count: 0, late_count: 0 };
        const dataB = formData[b.id] || { absent_count: 0, permission_count: 0, late_count: 0 };

        let valA: any = a[field as keyof Student];
        let valB: any = b[field as keyof Student];

        if (field === 'absent_count') {
          valA = Number(dataA.absent_count || 0);
          valB = Number(dataB.absent_count || 0);
        } else if (field === 'permission_count') {
          valA = Number(dataA.permission_count || 0);
          valB = Number(dataB.permission_count || 0);
        } else if (field === 'total_absent') {
          valA = Number(dataA.absent_count || 0) + Number(dataA.permission_count || 0);
          valB = Number(dataB.absent_count || 0) + Number(dataB.permission_count || 0);
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
        className={`sticky top-0 bg-slate-50/80 backdrop-blur-sm z-10 pb-3 cursor-pointer select-none hover:bg-slate-100/80 transition-colors group ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'} ${className}`}
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

  // Calculate Stats
  const stats = useMemo(() => {
    let totalAbsent = 0;
    const ewsAlerts = 0;
    
    Object.values(formData).forEach(data => {
      totalAbsent += (data.absent_count || 0);
    });

    const totalPossibleDays = students.length * totalSchoolDays;
    const attendanceRate = totalPossibleDays > 0 
      ? Math.max(0, ((totalPossibleDays - totalAbsent) / totalPossibleDays) * 100).toFixed(1)
      : '100.0';

    return { totalAbsent, ewsAlerts, attendanceRate };
  }, [formData, students.length, totalSchoolDays]);

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      
      {/* View Toggle Pill */}
      <div className="flex justify-center mb-6 print:hidden">
        <div className="bg-slate-100/80 p-1 rounded-full flex items-center gap-1 border border-slate-200/50 backdrop-blur-sm">
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-6 py-2.5 rounded-full text-sm font-black transition-all ${
              viewMode === 'monthly'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            សរុបប្រចាំខែ
          </button>
          <button
            onClick={() => setViewMode('daily')}
            className={`px-6 py-2.5 rounded-full text-sm font-black transition-all ${
              viewMode === 'daily'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            កំណត់ត្រាប្រចាំថ្ងៃ
          </button>
        </div>
      </div>

      {viewMode === 'monthly' ? (
        <>
          {/* ================= COMMAND CENTER DASHBOARD ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:hidden">
        
        {/* Monitor Sync Status */}
        <div className="bg-white/70 backdrop-blur-md border border-slate-200/60 p-5 rounded-2xl shadow-sm flex items-start gap-4">
          <div className="bg-[#155EEF]/10 p-3 rounded-xl text-[#155EEF]">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">កំណត់ត្រាប្រធានថ្នាក់</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-slate-800">{monitorDaysSubmitted}</span>
              <span className="text-sm font-bold text-slate-400 mb-1">/ {totalSchoolDays} ថ្ងៃ</span>
            </div>
            <p className="text-[10px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> ទិន្នន័យបញ្ជូនស្វ័យប្រវត្តិ
            </p>
          </div>
        </div>

        {/* Total Absences */}
        <div className="bg-white/70 backdrop-blur-md border border-slate-200/60 p-5 rounded-2xl shadow-sm flex items-start gap-4">
          <div className="bg-amber-500/10 p-3 rounded-xl text-amber-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">អវត្តមានសរុប (ខែនេះ)</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-slate-800">{totalMonthlyAbsences}</span>
              <span className="text-sm font-bold text-slate-400 mb-1">ដង</span>
            </div>
            <p className="text-[10px] font-bold text-amber-600 mt-1">
              ចំនួនអវត្តមានសរុបប្រចាំខែ
            </p>
          </div>
        </div>

        {/* Dropout Alerts */}
        <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-100 p-5 rounded-2xl shadow-sm flex items-start gap-4">
          <div className="bg-rose-500 p-3 rounded-xl text-white shadow-md shadow-rose-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-rose-600/80 mb-1">ប្រឈមការបោះបង់ (អវត្តមាន &gt; ៣)</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-rose-600">{dropoutAlertsCount}</span>
              <span className="text-sm font-bold text-rose-400 mb-1">នាក់</span>
            </div>
            <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> ត្រូវការចុះសួរសុខទុក្ខបន្ទាន់
            </p>
          </div>
        </div>
      </div>

      {/* Main Controls Card */}
      <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
            <Calendar className="w-4 h-4" /> ជ្រើសរើសខែ
          </h2>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span>ចំនួនថ្ងៃរៀនសរុប៖</span>
            <input 
              type="number" 
              value={totalSchoolDays}
              onChange={e => setTotalSchoolDays(Number(e.target.value) || 0)}
              className="w-12 bg-transparent text-center font-black text-[#155EEF] focus:outline-none"
              min="1"
              max="31"
            />
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer"
          />
        </div>
        
        {/* Export Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl text-sm transition-colors border border-slate-200 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> {exporting ? 'កំពុងទាញយក...' : 'ទាញយក Excel (Matrix)'}
          </button>
          <button 
            onClick={handlePrintPDF}
            className="flex items-center gap-2 px-4 py-2 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" /> បោះពុម្ពបញ្ជីវត្តមាន (A4)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        <div className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-[11px] font-extrabold text-rose-600 uppercase">
            <AlertCircle className="w-3.5 h-3.5" /> ឥតច្បាប់សរុប
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">{stats.totalAbsent} <span className="text-sm text-rose-400 font-bold">ថ្ងៃ</span></div>
        </div>
        
        <div className={`p-4 rounded-[20px] border shadow-sm flex flex-col justify-center transition-colors ${stats.ewsAlerts > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
          <div className={`flex items-center gap-2 text-[11px] font-extrabold uppercase ${stats.ewsAlerts > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
            <AlertTriangle className="w-3.5 h-3.5" /> សិស្សប្រឈមគ្រោះថ្នាក់ (&gt;3 ថ្ងៃ)
          </div>
          <div className={`text-2xl font-black mt-1 ${stats.ewsAlerts > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {stats.ewsAlerts} <span className={`text-sm font-bold ${stats.ewsAlerts > 0 ? 'text-rose-500' : 'text-slate-500'}`}>នាក់</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-[#155EEF] to-blue-700 p-4 rounded-[20px] border border-blue-800 shadow-sm flex flex-col justify-center text-white">
          <div className="flex items-center gap-2 text-[11px] font-extrabold text-blue-100 uppercase">
            <Percent className="w-3.5 h-3.5" /> អត្រាវត្តមានរួម
          </div>
          <div className="text-2xl font-black mt-1 text-white">
            {stats.attendanceRate}%
          </div>
        </div>
      </div>

      {syncStatus === 'error' && (
        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ។ សូមព្យាយាមម្តងទៀត!
        </div>
      )}

      {/* Quick Search and Save Button */}
      <div className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-2xs flex flex-wrap justify-between items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="ស្វែងរកឈ្មោះសិស្ស..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#155EEF]"
          />
        </div>
        
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-xs font-bold text-rose-500 animate-pulse flex items-center gap-1.5 hidden sm:flex">
              <AlertTriangle className="w-3.5 h-3.5" /> មិនទាន់រក្សាទុកទេ
            </span>
          )}
          <button
            onClick={handleSaveAll}
            disabled={syncStatus === 'syncing' || (!hasUnsavedChanges && syncStatus === 'synced')}
            className={`px-6 py-2.5 text-white rounded-full text-xs font-black shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
              hasUnsavedChanges 
                ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200 ring-2 ring-rose-500 ring-offset-2' 
                : 'bg-[#155EEF] hover:bg-blue-700 shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed'
            }`}
          >
            {syncStatus === 'syncing' ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> កំពុងរក្សាទុក...</>
            ) : hasUnsavedChanges ? (
              <><AlertTriangle className="w-4 h-4" /> រក្សាទុកការផ្លាស់ប្តូរ</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> រក្សាទុកទិន្នន័យរួចរាល់</>
            )}
          </button>
        </div>
      </div>
      
      {/* Table wrapped in new card style */}
      <div className="bg-transparent overflow-hidden">
      <div className="overflow-x-auto pb-8">
        <table className="w-full text-left border-separate border-spacing-y-2 min-w-[900px]">
          <thead>
            <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              <th className="sticky top-0 bg-slate-50/80 backdrop-blur-sm z-10 pb-3 pl-4 w-12 text-center rounded-l-xl">ល.រ</th>
              {renderSortHeader('អត្តលេខ', 'student_id_number', 'left', 'px-4')}
              {renderSortHeader('គោត្តនាម & នាម', 'full_name', 'left', 'px-5')}
              {renderSortHeader('ភេទ', 'gender', 'center', 'px-3')}
              {renderSortHeader('ឥតច្បាប់', 'absent_count', 'center', 'px-3 text-rose-600')}
              {renderSortHeader('ច្បាប់', 'permission_count', 'center', 'px-3 text-[#155EEF]')}
              {renderSortHeader('សរុប', 'total_absent', 'center', 'px-3 text-purple-600')}
              <th className="sticky top-0 bg-slate-50/80 backdrop-blur-sm z-10 pb-3 px-4 text-center rounded-r-xl">ចុះសួរសុខទុក្ខ</th>
            </tr>
          </thead>
          <tbody className="text-sm font-semibold text-slate-700">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                  {loading ? 'កំពុងទាញទិន្នន័យ...' : 'មិនមានទិន្នន័យសិស្សទេ។'}
                </td>
              </tr>
            ) : (
              filteredStudents.map((std, index) => {
                const stdData = formData[std.id] || { absent_count: 0, permission_count: 0, late_count: 0, root_cause: null, needs_home_visit: false };
                const isHighAbsent = stdData.absent_count > 3;
                
                return (
                  <tr key={std.id} className={`group bg-white hover:bg-slate-50 transition-all duration-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 ${isHighAbsent ? 'ring-1 ring-rose-200 bg-rose-50/20 hover:bg-rose-50/40' : ''}`}>
                    <td className="py-4 pl-4 text-center text-slate-400 font-bold rounded-l-[16px]">{index + 1}</td>
                    <td className="py-4 px-4 font-mono text-xs text-slate-500">{std.student_id_number || `ID-${index + 101}`}</td>
                    <td className="py-4 px-5 font-black text-slate-800">
                      <div className="flex items-center gap-2">
                        {std.full_name}
                        {isHighAbsent && <span title="ប្រឈមគ្រោះថ្នាក់បោះបង់ការសិក្សា"><AlertTriangle className="w-3.5 h-3.5 text-rose-500" /></span>}
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        std.gender === 'F' || std.gender === 'ស្រី'
                          ? 'bg-pink-100 text-pink-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {std.gender === 'F' || std.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'}
                      </span>
                    </td>
                    
                    <td className="py-3 px-3">
                      <div className="flex justify-center">
                        <input 
                          id={`input-${index}-0`}
                          type="number" 
                          min="0" 
                          max="31"
                          value={stdData.absent_count === 0 ? '' : stdData.absent_count}
                          placeholder="0"
                          onChange={(e) => handleInputChange(std.id, 'absent_count', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 0)}
                          onFocus={(e) => e.target.select()}
                          className="w-14 p-2 text-center text-sm font-black text-rose-600 bg-rose-50 border border-rose-200 rounded-lg focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex justify-center">
                        <input 
                          id={`input-${index}-1`}
                          type="number" 
                          min="0" 
                          max="31"
                          value={stdData.permission_count === 0 ? '' : stdData.permission_count}
                          placeholder="0"
                          onChange={(e) => handleInputChange(std.id, 'permission_count', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 1)}
                          onFocus={(e) => e.target.select()}
                          className="w-14 p-2 text-center text-sm font-black text-[#155EEF] bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:border-[#155EEF] focus:ring-1 focus:ring-[#155EEF] transition-all"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex justify-center">
                        <div className="w-14 p-2 text-center text-sm font-black text-purple-600 bg-purple-50 border border-purple-200 rounded-lg select-none">
                          {(stdData.absent_count || 0) + (stdData.permission_count || 0)}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center rounded-r-[16px]">
                       {isHighAbsent ? (
                         <button
                           onClick={() => handleHomeVisitToggle(std.id)}
                           className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                             stdData.needs_home_visit 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-rose-500 text-white border-rose-600 shadow-sm shadow-rose-200 hover:bg-rose-600 animate-pulse'
                           }`}
                         >
                           {stdData.needs_home_visit ? '✓ បានចុះទៅ' : 'ត្រូវការចុះបន្ទាន់'}
                         </button>
                       ) : stdData.absent_count > 0 ? (
                          <button
                           onClick={() => handleHomeVisitToggle(std.id)}
                           className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                             stdData.needs_home_visit 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                           }`}
                         >
                           {stdData.needs_home_visit ? '✓ បានចុះទៅ' : 'មិនចាំបាច់'}
                         </button>
                       ) : (
                         <div className="text-[10px] text-slate-300 text-center font-medium">-</div>
                       )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
        </div>
        </>
      ) : (
        /* ================= DAILY LOGS VIEW ================= */
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-200/60 print:hidden overflow-hidden flex flex-col min-h-[600px]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#155EEF]" /> កំណត់ត្រាប្រចាំថ្ងៃ
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-[10px] font-bold"><div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-200"></div> វត្តមាន</div>
              <div className="flex items-center gap-1 text-[10px] font-bold"><div className="w-3 h-3 rounded-full bg-rose-100 border border-rose-200"></div> អវត្តមាន</div>
              <div className="flex items-center gap-1 text-[10px] font-bold"><div className="w-3 h-3 rounded-full bg-purple-100 border border-purple-200"></div> ច្បាប់</div>
              <div className="flex items-center gap-1 text-[10px] font-bold"><div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-200"></div> យឺត</div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0 min-w-[1200px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-white border-b-2 border-slate-200 pb-3 pl-4 w-12 text-center text-[10px] font-black text-slate-400 uppercase">ល.រ</th>
                  <th className="sticky left-12 z-20 bg-white border-b-2 border-slate-200 pb-3 px-4 min-w-[200px] text-[10px] font-black text-slate-400 uppercase">គោត្តនាម & នាម</th>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <th key={day} className="border-b-2 border-slate-200 border-l border-slate-100 pb-3 px-1 text-center w-8 text-[10px] font-black text-slate-400 hover:bg-slate-50 transition-colors cursor-default" title={`ថ្ងៃទី ${day}`}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr><td colSpan={33} className="py-12 text-center text-slate-400 font-medium">មិនមានទិន្នន័យសិស្សទេ។</td></tr>
                ) : (
                  filteredStudents.map((std, index) => (
                    <tr key={std.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white py-3 pl-4 text-center text-slate-400 font-bold text-xs">{index + 1}</td>
                      <td className="sticky left-12 z-10 bg-white py-3 px-4 font-black text-slate-800 text-xs truncate max-w-[200px]">
                        {std.full_name}
                      </td>
                      {Array.from({ length: 31 }, (_, i) => {
                        const dayStr = `${selectedMonth}-${String(i + 1).padStart(2, '0')}`;
                        const record = rawDailyRecords.find(r => r.student_id === std.id && r.date === dayStr);
                        
                        let bgColor = '';
                        let letter = '';
                        let textColor = '';
                        
                        if (record) {
                          if (record.status === 'present') { bgColor = 'bg-emerald-100/50'; letter = 'P'; textColor = 'text-emerald-600'; }
                          else if (record.status === 'absent') { bgColor = 'bg-rose-100'; letter = 'A'; textColor = 'text-rose-600'; }
                          else if (record.status === 'permission') { bgColor = 'bg-purple-100'; letter = 'E'; textColor = 'text-purple-600'; }
                          else if (record.status === 'late') { bgColor = 'bg-amber-100'; letter = 'L'; textColor = 'text-amber-600'; }
                        }
                        
                        return (
                          <td key={dayStr} className="py-2 px-1 text-center border-l border-slate-100/50 hover:bg-slate-50 transition-colors cursor-default" title={`ថ្ងៃទី ${String(i + 1).padStart(2, '0')}`}>
                            <div className={`w-7 h-7 mx-auto rounded-md flex items-center justify-center text-[10px] font-black ${bgColor} ${textColor}`}>
                              {letter}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= PDF PRINT MATRIX (A4) ================= */}
      <div className="hidden print:block w-full bg-white text-black p-4">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { size: A4 landscape; margin: 15mm; }
            body, * {
              font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important;
              color: black !important;
            }
            h1, h2, h3, h4, .font-moul, [class*="font-extrabold"], [class*="font-black"] {
              font-family: 'Khmer OS Moul Light', 'Khmer OS Moul', 'Moul', cursive !important;
            }
            .print-table { width: 100%; border-collapse: collapse; font-size: 10px; }
            .print-table th, .print-table td { border: 1px solid #000; padding: 2px 4px; text-align: center; }
            .print-table th { background-color: #f1f5f9 !important; font-weight: bold; }
            .text-left { text-align: left !important; }
          }
        `}} />
        
        <div className="text-center mb-6">
          <h1 className="text-xl font-moul mb-2">បញ្ជីវត្តមានប្រចាំខែ {selectedMonth}</h1>
          <h2 className="text-lg font-bold">ថ្នាក់ទី៖ {activeClass?.name} | សរុបថ្ងៃរៀន៖ {totalSchoolDays} ថ្ងៃ</h2>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th rowSpan={2} className="w-8">ល.រ</th>
              <th rowSpan={2} className="w-40 text-left">ឈ្មោះសិស្ស</th>
              <th rowSpan={2} className="w-12">ភេទ</th>
              <th colSpan={31}>ថ្ងៃទី / Date</th>
              <th colSpan={3}>សរុប (Total)</th>
            </tr>
            <tr>
              {Array.from({ length: 31 }, (_, i) => (
                <th key={i} className="w-6 text-[9px]">{i + 1}</th>
              ))}
              <th className="w-10">អ</th>
              <th className="w-10">ច</th>
              <th className="w-10">យ</th>
            </tr>
          </thead>
          <tbody>
            {students.map((std, idx) => {
              const absent = formData[std.id]?.absent_count || 0;
              const perm = formData[std.id]?.permission_count || 0;
              const late = formData[std.id]?.late_count || 0;
              
              return (
                <tr key={std.id}>
                  <td>{idx + 1}</td>
                  <td className="text-left font-bold">{std.full_name}</td>
                  <td>{std.gender === 'F' || std.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'}</td>
                  
                  {Array.from({ length: 31 }, (_, i) => {
                    const dayStr = `${selectedMonth}-${String(i + 1).padStart(2, '0')}`;
                    const record = rawDailyRecords.find(r => r.student_id === std.id && r.date === dayStr);
                    let char = '';
                    if (record) {
                      if (record.status === 'absent') char = 'អ';
                      else if (record.status === 'permission') char = 'ច';
                      else if (record.status === 'late') char = 'យ';
                      else if (record.status === 'present') char = 'វ';
                    }
                    return <td key={dayStr} className="text-[10px]">{char}</td>;
                  })}
                  
                  <td className="font-bold">{absent || ''}</td>
                  <td className="font-bold">{perm || ''}</td>
                  <td className="font-bold">{late || ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
