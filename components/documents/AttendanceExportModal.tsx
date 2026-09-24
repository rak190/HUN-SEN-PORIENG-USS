'use client';

import React, { useState, useEffect } from 'react';
import { CalendarCheck, Printer } from 'lucide-react';
import { Student, AcademicYear } from '@/types';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';

interface AttendanceExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  classId: string;
  students: Student[];
  teacherName: string;
  academicYear: AcademicYear | null;
}

export function AttendanceExportModal({
  isOpen,
  onClose,
  className,
  classId,
  students,
  teacherName,
  academicYear,
}: AttendanceExportModalProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [dailyRecords, setDailyRecords] = useState<any[]>([]);
  
  const supabase = createClient();

  const MONTHS = [
    { value: '11', label: 'វិច្ឆិកា' },
    { value: '12', label: 'ធ្នូ' },
    { value: '01', label: 'មករា' },
    { value: '02', label: 'កុម្ភៈ' },
    { value: '03', label: 'មីនា' },
    { value: '04', label: 'មេសា' },
    { value: '05', label: 'ឧសភា' },
    { value: '06', label: 'មិថុនា' },
    { value: '07', label: 'កក្កដា' },
    { value: '08', label: 'សីហា' },
    { value: '09', label: 'កញ្ញា' },
    { value: '10', label: 'តុលា' }
  ];

  useEffect(() => {
    if (!isOpen || !classId) return;
    
    async function fetchAttendance() {
      setLoading(true);
      // Construct date boundaries for the selected month (YYYY-MM)
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-31`; // good enough for string comparison in DB

      const { data } = await supabase
        .from('attendance_records')
        .select('student_id, date, status')
        .eq('class_id', classId)
        .gte('date', startDate)
        .lte('date', endDate);

      setDailyRecords(data || []);
      setLoading(false);
    }
    fetchAttendance();
  }, [isOpen, selectedMonth, classId, supabase]);

  if (!isOpen) return null;

  const handlePrintPDF = () => {
    // Generate header cells for 1 to 31
    let daysHeaderHtml = '';
    for (let day = 1; day <= 31; day++) {
      daysHeaderHtml += `<th style="width: 15px; border: 1px solid #94a3b8; padding: 2px; text-align: center; font-size: 10px;">${day}</th>`;
    }

    const rowsHtml = students.map((std, idx) => {
      let absentCount = 0;
      let permCount = 0;

      let daysCells = '';
      for (let day = 1; day <= 31; day++) {
        const dayStr = day.toString().padStart(2, '0');
        const fullDate = `${selectedMonth}-${dayStr}`;
        const record = dailyRecords.find(r => r.student_id === std.id && r.date === fullDate);
        
        let displayChar = '';
        let bgColor = '';
        if (record) {
          if (record.status === 'absent' || record.status === 'A') {
            displayChar = 'អ'; bgColor = '#fecdd3'; absentCount++;
          } else if (record.status === 'permission' || record.status === 'P') {
            displayChar = 'ច'; bgColor = '#fef08a'; permCount++;
          } else if (record.status === 'late' || record.status === 'L') {
            displayChar = 'យ'; bgColor = '#fed7aa';
          } else if (record.status === 'present') {
            displayChar = 'វ'; bgColor = '#bbf7d0';
          }
        }
        
        daysCells += `<td style="border: 1px solid #94a3b8; padding: 2px; text-align: center; font-size: 10px; background-color: ${bgColor}; font-weight: bold;">${displayChar}</td>`;
      }

      return `
        <tr>
          <td style="border: 1px solid #94a3b8; padding: 4px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #94a3b8; padding: 4px; text-align: center;">${std.student_id_number || '-'}</td>
          <td style="border: 1px solid #94a3b8; padding: 4px 6px; white-space: nowrap;">${std.full_name}</td>
          <td style="border: 1px solid #94a3b8; padding: 4px; text-align: center;">${std.gender === 'F' || std.gender === 'ស្រី' ? 'ស' : 'ប'}</td>
          ${daysCells}
          <td style="border: 1px solid #94a3b8; padding: 4px; text-align: center; font-weight: bold; background-color: #fef08a;">${permCount > 0 ? permCount : ''}</td>
          <td style="border: 1px solid #94a3b8; padding: 4px; text-align: center; font-weight: bold; background-color: #fecdd3;">${absentCount > 0 ? absentCount : ''}</td>
          <td style="border: 1px solid #94a3b8; padding: 4px; text-align: center; font-weight: bold;">${permCount + absentCount > 0 ? permCount + absentCount : ''}</td>
          <td style="border: 1px solid #94a3b8; padding: 4px;"></td>
        </tr>
      `;
    }).join('');

    const currentYearStr = selectedMonth.slice(0, 4);
    const currentMonthNum = selectedMonth.slice(5, 7);
    const monthObj = MONTHS.find(m => m.value === currentMonthNum);
    const monthLabel = monthObj ? `ខែ${monthObj.label} ឆ្នាំ${currentYearStr}` : selectedMonth;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Monthly_Attendance_${className}_${selectedMonth}</title>
        <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&family=Moul&family=Siemreap&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: 'Kantumruy Pro', 'Siemreap', sans-serif; font-size: 11px; margin: 0; padding: 0; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .font-muol { font-family: 'Moul', serif; }
          .header-grid { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
          .header-left, .header-right { text-align: center; line-height: 1.5; font-size: 12px; }
          .main-title { text-align: center; margin: 10px 0 15px; font-size: 18px; }
          
          .class-info { display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: bold; font-size: 12px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10.5px; }
          th { background-color: #e2e8f0; border: 1px solid #94a3b8; padding: 4px; text-align: center; font-weight: bold; }
          
          .signatures { display: flex; justify-content: space-between; text-align: center; margin-top: 30px; font-size: 12px; }
          
          .legend { display: flex; gap: 15px; margin-bottom: 10px; font-size: 10px; font-weight: bold; }
          .legend-item { display: flex; items-center; gap: 5px; }
          .legend-box { width: 12px; height: 12px; border: 1px solid #000; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="header-grid">
          <div class="header-left font-muol">
            ក្រសួងអប់រំ យុវជន និងកីឡា<br/>
            មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តព្រៃវែង<br/>
            វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង
          </div>
          <div class="header-right font-muol">
            ព្រះរាជាណាចក្រកម្ពុជា<br/>
            ជាតិ សាសនា ព្រះមហាក្សត្រ<br/>
            <img src="https://upload.wikimedia.org/wikipedia/commons/4/4b/Flourish.svg" height="12" alt="flourish" style="margin-top:5px;"/> ក្រយៅ
          </div>
        </div>

        <div class="main-title font-muol">បញ្ជីវត្តមានសិស្សប្រចាំខែ</div>

        <div class="class-info">
          <div>កម្រិតថ្នាក់៖ <span>${className}</span></div>
          <div>${monthLabel}</div>
          <div>គ្រូបន្ទុកថ្នាក់៖ <span>${teacherName}</span></div>
        </div>

        <div class="legend">
          <div class="legend-item"><span class="legend-box" style="background-color: #bbf7d0;"></span> វ = វត្តមាន (Present)</div>
          <div class="legend-item"><span class="legend-box" style="background-color: #fef08a;"></span> ច = ច្បាប់ (Permission)</div>
          <div class="legend-item"><span class="legend-box" style="background-color: #fecdd3;"></span> អ = អវត្តមាន (Absent)</div>
          <div class="legend-item"><span class="legend-box" style="background-color: #fed7aa;"></span> យ = យឺត (Late)</div>
        </div>

        <table>
          <thead>
            <tr>
              <th rowspan="2" style="width: 25px;">ល.រ</th>
              <th rowspan="2" style="width: 50px;">អត្តលេខ</th>
              <th rowspan="2" style="min-width: 120px;">គោត្តនាម និងនាម</th>
              <th rowspan="2" style="width: 30px;">ភេទ</th>
              <th colspan="31">ថ្ងៃទីក្នុងខែ</th>
              <th colspan="3">សរុប</th>
              <th rowspan="2" style="width: 60px;">ផ្សេងៗ</th>
            </tr>
            <tr>
              ${daysHeaderHtml}
              <th style="width: 30px;">ច្បាប់</th>
              <th style="width: 30px;">អត់ច្បាប់</th>
              <th style="width: 30px;">សរុបរួម</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="signatures">
          <div style="width: 30%">
            <div class="font-muol">បានឃើញ និងឯកភាព</div>
            <div style="margin-top: 5px;">ថ្ងៃទី......... ខែ......... ឆ្នាំ២០២...</div>
            <div class="font-muol" style="margin-top: 5px;">នាយកវិទ្យាល័យ</div>
            <div style="height: 70px;"></div>
            <div>................................................</div>
          </div>
          <div style="width: 30%">
            <div style="margin-top: 5px;">ពោធិ៍រៀង, ថ្ងៃទី......... ខែ......... ឆ្នាំ២០២...</div>
            <div class="font-muol" style="margin-top: 5px;">គ្រូបន្ទុកថ្នាក់</div>
            <div style="height: 70px;"></div>
            <div style="font-weight: bold;">${teacherName}</div>
          </div>
        </div>

        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 500); };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  // Generate Year-Month options
  const monthOptions = [];
  const startMonth = 10; // Let's say November is start for Cambodia
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 1; y <= currentYear + 1; y++) {
    for (let m = 1; m <= 12; m++) {
      const mStr = m.toString().padStart(2, '0');
      const val = `${y}-${mStr}`;
      const label = MONTHS.find(x => x.value === mStr)?.label || mStr;
      monthOptions.push({ value: val, label: `ខែ${label} ឆ្នាំ${y}` });
    }
  }

  // Find index of current month and take a window around it
  const currentVal = new Date().toISOString().slice(0, 7);
  const curIdx = monthOptions.findIndex(o => o.value === currentVal) || monthOptions.length - 12;
  const displayOptions = monthOptions.slice(Math.max(0, curIdx - 6), curIdx + 6);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="បញ្ជីវត្តមានសិស្សប្រចាំខែ"
      subtitle={`ថ្នាក់ ${className}`}
      icon={<CalendarCheck className="w-5 h-5 text-indigo-600" />}
    >
      <div className="p-6">
        <p className="text-sm text-slate-600 mb-6">
          ជ្រើសរើសខែដើម្បីទាញយក ឬបោះពុម្ពបញ្ជីវត្តមានសិស្សប្រចាំខែរបស់អ្នក។ ទិន្នន័យត្រូវបានទាញចេញពីកំណត់ត្រាជាក់ស្ដែង។
        </p>

        <div className="space-y-4 mb-8">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">ខែ និងឆ្នាំ</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
            >
              {displayOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          onClick={handlePrintPDF} 
          disabled={loading}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? 'កំពុងទាញយកទិន្នន័យ...' : (
            <>
              <Printer className="w-4 h-4" /> មើលទម្រង់គំរូ & បោះពុម្ព A4
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
