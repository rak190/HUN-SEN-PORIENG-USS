'use client';

import React, { useMemo } from 'react';
import { FileText, Printer, BarChart2 } from 'lucide-react';
import { Student, AcademicYear } from '@/types';
import Modal from '@/components/ui/Modal';

interface ProfilingSummaryExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  classId: string;
  students: Student[];
  teacherName: string;
  academicYear: AcademicYear | null;
}

export function ProfilingSummaryExportModal({
  isOpen,
  onClose,
  className,
  classId,
  students,
  teacherName,
  academicYear,
}: ProfilingSummaryExportModalProps) {
  const stats = useMemo(() => {
    const total = students.length;
    const female = students.filter(s => s.gender === 'F' || s.gender === 'ស្រី').length;
    const poor1 = students.filter(s => s.id_poor === 'level_1' || s.poor_id_status === 'poor_1').length;
    const poor2 = students.filter(s => s.id_poor === 'level_2' || s.poor_id_status === 'poor_2').length;
    const repeater = students.filter(s => s.status === 'repeater').length;
    const orphan = students.filter(s => s.orphan === 'yes' || s.is_orphan).length;
    const indigenous = students.filter(s => s.indigenous === 'yes').length;
    const disability = students.filter(s => s.disability === 'mild' || s.disability === 'severe').length;

    return { total, female, poor1, poor2, repeater, orphan, indigenous, disability };
  }, [students]);

  if (!isOpen) return null;

  const handlePrintPDF = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Profiling_Summary_${className}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&family=Moul&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Kantumruy Pro', sans-serif; font-size: 13px; color: #1e293b; }
          .font-muol { font-family: 'Moul', serif; }
          .header-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .header-left, .header-right { text-align: center; line-height: 1.6; }
          .main-title { text-align: center; margin-bottom: 25px; font-size: 20px; color: #1e3a8a; }
          
          .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .stat-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; text-align: center; background-color: #f8fafc; }
          .stat-value { font-size: 24px; font-weight: bold; color: #1e3a8a; margin-bottom: 5px; }
          .stat-label { font-size: 14px; font-weight: 600; color: #64748b; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          th { border: 1px solid #cbd5e1; padding: 12px; background-color: #f1f5f9; font-weight: bold; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 12px; }
          .text-right { text-align: right; font-weight: bold; color: #1e3a8a; }

          .signatures { display: flex; justify-content: space-between; text-align: center; margin-top: 50px; }
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
          របាយការណ៍ស្ថិតិជីវប្រវត្តិសិស្សប្រចាំថ្នាក់ ${className}
        </div>
        <div style="text-align: center; margin-bottom: 30px; font-weight: bold; font-size: 14px;">
          ឆ្នាំសិក្សា ${academicYear?.name || '២០២៣-២០២៤'}
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.total} នាក់</div>
            <div class="stat-label">សិស្សសរុប</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.female} នាក់</div>
            <div class="stat-label">សិស្សស្រីសរុប</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th colspan="2">ការបែងចែកចំណាត់ថ្នាក់សិស្ស (Student Profiling Categories)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>សិស្សមានបណ្ណក្រីក្រកម្រិត ១ (Poor ID 1)</td>
              <td class="text-right" style="width: 120px;">${stats.poor1} នាក់</td>
            </tr>
            <tr>
              <td>សិស្សមានបណ្ណក្រីក្រកម្រិត ២ (Poor ID 2)</td>
              <td class="text-right">${stats.poor2} នាក់</td>
            </tr>
            <tr>
              <td>សិស្សត្រួតថ្នាក់ (Repeater)</td>
              <td class="text-right">${stats.repeater} នាក់</td>
            </tr>
            <tr>
              <td>សិស្សកំព្រា (Orphan / Vulnerable)</td>
              <td class="text-right">${stats.orphan} នាក់</td>
            </tr>
            <tr>
              <td>សិស្សជនជាតិដើមភាគតិច (Indigenous)</td>
              <td class="text-right">${stats.indigenous} នាក់</td>
            </tr>
            <tr>
              <td>សិស្សមានពិការភាព (Disability / Special Needs)</td>
              <td class="text-right">${stats.disability} នាក់</td>
            </tr>
          </tbody>
        </table>

        <div class="signatures">
          <div style="width: 40%">
            <div class="font-muol">បានឃើញ និងឯកភាព</div>
            <div style="margin-top: 5px;">ថ្ងៃទី......... ខែ......... ឆ្នាំ២០២...</div>
            <div class="font-muol" style="margin-top: 5px;">នាយកវិទ្យាល័យ</div>
            <div style="height: 90px;"></div>
            <div>................................................</div>
          </div>
          <div style="width: 40%">
            <div style="margin-top: 5px;">ពោធិ៍រៀង, ថ្ងៃទី......... ខែ......... ឆ្នាំ២០២...</div>
            <div class="font-muol" style="margin-top: 5px;">គ្រូបន្ទុកថ្នាក់</div>
            <div style="height: 90px;"></div>
            <div style="font-weight: bold;">${teacherName}</div>
          </div>
        </div>

        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 500); };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1000,height=1200');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  const handleExportExcel = async () => {
    const { 
      createOfficialMoEYSWorkbook, 
      applyMoEYSHeaders, 
      applyStandardTableStyles, 
      autoAdjustColumnWidths, 
      addSignatureBlock,
      downloadExcel
    } = await import('@/lib/excel/styledExcelGenerator');

    const totalCols = 2; // Very simple table
    const { workbook, worksheet, startRow } = createOfficialMoEYSWorkbook({
      sheetName: 'ស្ថិតិជីវប្រវត្តិ',
      orientation: 'portrait',
      documentTitle: 'របាយការណ៍ស្ថិតិជីវប្រវត្តិសិស្ស',
      schoolName: 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង'
    });

    applyMoEYSHeaders(
      worksheet, 
      totalCols, 
      `របាយការណ៍ស្ថិតិជីវប្រវត្តិសិស្សប្រចាំថ្នាក់ ${className}`,
      `ឆ្នាំសិក្សា ${academicYear?.name || '២០២៣-២០២៤'}`
    );

    // Some pre-table stats
    worksheet.mergeCells(startRow, 1, startRow, 2);
    const statHeader = worksheet.getCell(startRow, 1);
    statHeader.value = `សិស្សសរុប: ${stats.total} នាក់ | សិស្សស្រីសរុប: ${stats.female} នាក់`;
    statHeader.font = { name: 'Khmer OS Battambang', size: 11, bold: true };
    statHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Headers
    const tableStart = startRow + 2;
    worksheet.mergeCells(tableStart, 1, tableStart, 2);
    const tableTitle = worksheet.getCell(tableStart, 1);
    tableTitle.value = 'ការបែងចែកចំណាត់ថ្នាក់សិស្ស (Student Profiling Categories)';
    tableTitle.font = { name: 'Khmer OS Battambang', size: 10, bold: true };
    tableTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    tableTitle.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    tableTitle.alignment = { horizontal: 'left', vertical: 'middle' };

    const dataRows = [
      ['សិស្សមានបណ្ណក្រីក្រកម្រិត ១ (Poor ID 1)', stats.poor1],
      ['សិស្សមានបណ្ណក្រីក្រកម្រិត ២ (Poor ID 2)', stats.poor2],
      ['សិស្សត្រួតថ្នាក់ (Repeater)', stats.repeater],
      ['សិស្សកំព្រា (Orphan / Vulnerable)', stats.orphan],
      ['សិស្សជនជាតិដើមភាគតិច (Indigenous)', stats.indigenous],
      ['សិស្សមានពិការភាព (Disability / Special Needs)', stats.disability],
    ];

    dataRows.forEach((row, idx) => {
      const r = worksheet.getRow(tableStart + 1 + idx);
      r.getCell(1).value = row[0];
      r.getCell(2).value = `${row[1]} នាក់`;
    });

    applyStandardTableStyles(worksheet, tableStart, tableStart + 1, dataRows.length, totalCols);
    autoAdjustColumnWidths(worksheet, totalCols, [60, 20]);
    addSignatureBlock(worksheet, tableStart + 1 + dataRows.length + 3, totalCols, teacherName);

    await downloadExcel(workbook, `ProfilingSummary_${className}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="របាយការណ៍ស្ថិតិជីវប្រវត្តិសិស្ស"
      subtitle={`ថ្នាក់ ${className}`}
      icon={<BarChart2 className="w-5 h-5 text-indigo-600" />}
    >
      <div className="p-6">
        <p className="text-sm text-slate-600 mb-6">
          របាយការណ៍នេះបង្ហាញពីស្ថិតិសរុបនៃស្ថានភាពជីវភាព សុខភាព និងការសិក្សារបស់សិស្សក្នុងថ្នាក់របស់អ្នក។
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
