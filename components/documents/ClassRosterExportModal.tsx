'use client';

import React from 'react';
import { FileText, Printer } from 'lucide-react';
import { Student, AcademicYear } from '@/types';
import Modal from '@/components/ui/Modal';
import * as XLSX from 'xlsx';

interface ClassRosterExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  classId: string;
  students: Student[];
  teacherName: string;
  academicYear: AcademicYear | null;
}

export function ClassRosterExportModal({
  isOpen,
  onClose,
  className,
  classId,
  students,
  teacherName,
  academicYear,
}: ClassRosterExportModalProps) {
  if (!isOpen) return null;

  const handleExportExcel = async () => {
    const { 
      createOfficialMoEYSWorkbook, 
      applyMoEYSHeaders, 
      applyStandardTableStyles, 
      autoAdjustColumnWidths, 
      addSignatureBlock,
      downloadExcel
    } = await import('@/lib/excel/styledExcelGenerator');

    const totalCols = 10;
    const { workbook, worksheet, startRow } = createOfficialMoEYSWorkbook({
      sheetName: 'បញ្ជីរាយនាមសិស្ស',
      orientation: 'portrait',
      documentTitle: 'បញ្ជីរាយនាមសិស្សផ្លូវការ',
      schoolName: 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង'
    });

    applyMoEYSHeaders(
      worksheet, 
      totalCols, 
      `បញ្ជីរាយនាមសិស្សផ្លូវការប្រចាំថ្នាក់ ${className}`,
      `ឆ្នាំសិក្សា ${academicYear?.name || '២០២៣-២០២៤'}`
    );

    // Headers
    const headers = ['ល.រ', 'អត្តលេខ', 'គោត្តនាម និងនាម', 'ភេទ', 'ថ្ងៃខែឆ្នាំកំណើត', 'ទីកន្លែងកំណើត / អាស័យដ្ឋានបច្ចុប្បន្ន', 'ឈ្មោះអាណាព្យាបាល', 'លេខទូរស័ព្ទ', 'បណ្ណក្រីក្រ', 'ផ្សេងៗ'];
    const headerRow = worksheet.getRow(startRow);
    headers.forEach((h, i) => {
      headerRow.getCell(i + 1).value = h;
    });

    // Data
    students.forEach((std, idx) => {
      const row = worksheet.getRow(startRow + 1 + idx);
      row.getCell(1).value = idx + 1;
      row.getCell(2).value = std.student_id_number || '-';
      row.getCell(3).value = std.full_name;
      row.getCell(4).value = std.gender === 'F' || std.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស';
      row.getCell(5).value = std.date_of_birth ? new Date(std.date_of_birth).toLocaleDateString('en-GB') : '-';
      row.getCell(6).value = std.current_address || '-';
      row.getCell(7).value = std.guardian_name || std.father_name || std.mother_name || '-';
      row.getCell(8).value = std.guardian_phone || std.father_phone || std.mother_phone || '-';
      row.getCell(9).value = std.id_poor === 'level_1' ? 'កម្រិត ១' : std.id_poor === 'level_2' ? 'កម្រិត ២' : '-';
      row.getCell(10).value = std.status === 'repeater' ? 'ត្រួតថ្នាក់' : std.status === 'transfer' ? 'ផ្ទេរចូល' : '';
    });

    applyStandardTableStyles(worksheet, startRow, startRow + 1, students.length, totalCols);
    
    // Auto widths with minimums for specific columns
    autoAdjustColumnWidths(worksheet, totalCols, [6, 12, 22, 6, 14, 25, 20, 12, 10, 10]);

    addSignatureBlock(worksheet, startRow + 1 + students.length + 2, totalCols, teacherName);

    await downloadExcel(workbook, `ClassRoster_${className}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrintPDF = () => {
    const today = new Date();
    const rowsHtml = students.map((std, idx) => `
      <tr>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${std.student_id_number || '-'}</td>
        <td style="border: 1px solid #000; padding: 6px;">${std.full_name}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${std.gender === 'F' || std.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${std.date_of_birth ? new Date(std.date_of_birth).toLocaleDateString('en-GB') : '-'}</td>
        <td style="border: 1px solid #000; padding: 6px;">${std.current_address || '-'}</td>
        <td style="border: 1px solid #000; padding: 6px;">${std.guardian_name || std.father_name || std.mother_name || '-'}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${std.guardian_phone || std.father_phone || std.mother_phone || '-'}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${std.id_poor === 'level_1' ? 'កម្រិត ១' : std.id_poor === 'level_2' ? 'កម្រិត ២' : ''}</td>
        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${std.status === 'repeater' ? 'ត្រួតថ្នាក់' : std.status === 'transfer' ? 'ផ្ទេរចូល' : ''}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Class_Roster_${className}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&family=Moul&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: 'Kantumruy Pro', sans-serif; font-size: 12px; }
          .font-muol { font-family: 'Moul', serif; }
          .header-grid { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .header-left, .header-right { text-align: center; line-height: 1.6; }
          .main-title { text-align: center; margin-bottom: 20px; font-size: 18px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11px; }
          th { border: 1px solid #000; padding: 8px; background-color: #f1f5f9; font-weight: bold; text-align: center; }
          .signatures { display: flex; justify-content: space-between; text-align: center; margin-top: 40px; }
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
        
        <div class="main-title font-muol">
          បញ្ជីរាយនាមសិស្សផ្លូវការប្រចាំថ្នាក់ ${className}
        </div>
        <div style="text-align: center; margin-bottom: 15px; font-weight: bold;">
          ឆ្នាំសិក្សា ${academicYear?.name || '២០២៣-២០២៤'}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">ល.រ</th>
              <th style="width: 70px;">អត្តលេខ</th>
              <th style="width: 150px;">គោត្តនាម និងនាម</th>
              <th style="width: 50px;">ភេទ</th>
              <th style="width: 80px;">ថ្ងៃខែឆ្នាំកំណើត</th>
              <th>ទីកន្លែងកំណើត / អាស័យដ្ឋានបច្ចុប្បន្ន</th>
              <th style="width: 120px;">ឈ្មោះអាណាព្យាបាល</th>
              <th style="width: 90px;">លេខទូរស័ព្ទ</th>
              <th style="width: 70px;">បណ្ណក្រីក្រ</th>
              <th style="width: 70px;">ផ្សេងៗ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="signatures">
          <div style="width: 40%">
            <div class="font-muol">បានឃើញ និងឯកភាព</div>
            <div style="margin-top: 5px;">ថ្ងៃទី......... ខែ......... ឆ្នាំ២០២...</div>
            <div class="font-muol" style="margin-top: 5px;">នាយកវិទ្យាល័យ</div>
            <div style="height: 80px;"></div>
            <div>................................................</div>
          </div>
          <div style="width: 40%">
            <div style="margin-top: 5px;">ពោធិ៍រៀង, ថ្ងៃទី......... ខែ......... ឆ្នាំ២០២...</div>
            <div class="font-muol" style="margin-top: 5px;">គ្រូបន្ទុកថ្នាក់</div>
            <div style="height: 80px;"></div>
            <div style="font-weight: bold;">${teacherName}</div>
          </div>
        </div>

        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 500); };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="បញ្ជីរាយនាមសិស្ស (Class Roster)"
      subtitle={`ថ្នាក់ ${className}`}
      icon={<FileText className="w-5 h-5 text-indigo-600" />}
    >
      <div className="p-6">
        <p className="text-sm text-slate-600 mb-6">
          បញ្ជីនេះមានផ្ទុកទិន្នន័យសិស្សពិតប្រាកដចំនួន <strong>{students.length} នាក់</strong> រួមមានព័ត៌មានផ្ទាល់ខ្លួន ទីលំនៅ អាណាព្យាបាល និងបណ្ណក្រីក្រ។
        </p>
        <div className="flex gap-4">
          <button onClick={handlePrintPDF} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer">
            <Printer className="w-4 h-4" /> មើលទម្រង់គំរូ & បោះពុម្ព A4
          </button>
          <button onClick={handleExportExcel} className="flex-1 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer">
            <FileText className="w-4 h-4" /> ទាញយកជា Excel
          </button>
        </div>
      </div>
    </Modal>
  );
}
