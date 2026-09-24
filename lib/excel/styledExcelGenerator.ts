import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface WorkbookOptions {
  sheetName: string;
  orientation: 'portrait' | 'landscape';
  documentTitle: string;
  classInfo?: string;
  teacherName?: string;
  schoolName?: string;
}

export function createOfficialMoEYSWorkbook(options: WorkbookOptions): { 
  workbook: ExcelJS.Workbook, 
  worksheet: ExcelJS.Worksheet,
  startRow: number 
} {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'KruAI - School Management System';
  workbook.created = new Date();

  // Excel sheet names max out at 31 chars
  const sanitizedSheetName = options.sheetName.substring(0, 31).replace(/[\\/*?:[\]]/g, '');
  const worksheet = workbook.addWorksheet(sanitizedSheetName, {
    views: [{ showGridLines: true }],
    pageSetup: {
      orientation: options.orientation,
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5, right: 0.5,
        top: 0.5, bottom: 0.5,
        header: 0.3, footer: 0.3
      }
    }
  });

  const totalCols = options.orientation === 'landscape' ? 20 : 10; 
  // We don't merge across exact totalCols yet because we don't know the final table size,
  // but for the headers, merging across a large number like 10 or 20 usually looks fine 
  // and we'll adjust the print area later if needed.
  // A better approach is to let the caller merge the title based on their actual column count.
  // We'll return the worksheet and let the caller merge, but provide helpers.

  const schoolName = options.schoolName || 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង';

  // 1. Left Header (MoEYS) & Right Header (Kingdom)
  const headerLeftCell = worksheet.getCell('A1');
  headerLeftCell.value = `ក្រសួងអប់រំ យុវជន និងកីឡា\nមន្ទីរអប់រំ យុវជន និងកីឡាខេត្តព្រៃវែង\n${schoolName}`;
  headerLeftCell.font = { name: 'Khmer OS Muol Light', size: 10, bold: true };
  headerLeftCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  
  // We just put it in A1 and merge A1:C3
  worksheet.mergeCells('A1:C3');

  // Right Header needs to be placed at the right side of the table. 
  // We'll leave the exact placement of the right header to a helper function 
  // once the total columns are known.
  
  // Actually, standardizing it is tricky if we don't know totalCols. 
  // We can just add rows and the caller will merge them.
  worksheet.getCell('A1').value = 'ក្រសួងអប់រំ យុវជន និងកីឡា';
  worksheet.getCell('A2').value = 'មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តព្រៃវែង';
  worksheet.getCell('A3').value = schoolName;

  ['A1', 'A2', 'A3'].forEach(cell => {
    worksheet.getCell(cell).font = { name: 'Khmer OS Muol Light', size: 10, bold: true };
    worksheet.getCell(cell).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // We'll return the workbook and let the caller use applyMoEYSHeaders for exact merging.
  
  return { workbook, worksheet, startRow: 8 };
}

export function applyMoEYSHeaders(
  worksheet: ExcelJS.Worksheet, 
  totalCols: number, 
  title: string, 
  subtitle?: string
) {
  // Merge left headers (already written in A1..A3)
  const leftMergeCols = Math.min(4, Math.floor(totalCols / 2));
  worksheet.mergeCells(1, 1, 1, leftMergeCols);
  worksheet.mergeCells(2, 1, 2, leftMergeCols);
  worksheet.mergeCells(3, 1, 3, leftMergeCols);

  // Right Headers
  const rightStartCol = totalCols - Math.min(3, Math.floor(totalCols / 2)) + 1;
  worksheet.mergeCells(1, rightStartCol, 1, totalCols);
  worksheet.mergeCells(2, rightStartCol, 2, totalCols);
  
  const right1 = worksheet.getCell(1, rightStartCol);
  right1.value = 'ព្រះរាជាណាចក្រកម្ពុជា';
  right1.font = { name: 'Khmer OS Muol Light', size: 12, bold: true };
  right1.alignment = { horizontal: 'center', vertical: 'middle' };

  const right2 = worksheet.getCell(2, rightStartCol);
  right2.value = 'ជាតិ សាសនា ព្រះមហាក្សត្រ';
  right2.font = { name: 'Khmer OS Muol Light', size: 12, bold: true, underline: true };
  right2.alignment = { horizontal: 'center', vertical: 'middle' };

  // Document Title (Row 5)
  worksheet.mergeCells(5, 1, 5, totalCols);
  const titleCell = worksheet.getCell(5, 1);
  titleCell.value = title;
  titleCell.font = { name: 'Khmer OS Muol Light', size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Subtitle (Row 6)
  if (subtitle) {
    worksheet.mergeCells(6, 1, 6, totalCols);
    const subtitleCell = worksheet.getCell(6, 1);
    subtitleCell.value = subtitle;
    subtitleCell.font = { name: 'Khmer OS Battambang', size: 11, italic: true };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  }
}

export function applyStandardTableStyles(
  worksheet: ExcelJS.Worksheet, 
  headerRowIndex: number, 
  dataStartRow: number, 
  totalRows: number, 
  totalCols: number
) {
  // Apply style to Header Row
  const headerRow = worksheet.getRow(headerRowIndex);
  for (let c = 1; c <= totalCols; c++) {
    const cell = headerRow.getCell(c);
    cell.font = { name: 'Khmer OS Battambang', size: 10, bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }
    };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }

  // Apply style to Data Rows
  for (let r = dataStartRow; r < dataStartRow + totalRows; r++) {
    const row = worksheet.getRow(r);
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      if (!cell.font) {
        cell.font = { name: 'Khmer OS Battambang', size: 10 };
      } else {
        cell.font = { ...cell.font, name: 'Khmer OS Battambang', size: 10 };
      }
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
      if (!cell.alignment) {
        cell.alignment = { vertical: 'middle', wrapText: true };
      } else {
        cell.alignment = { ...cell.alignment, vertical: 'middle', wrapText: true };
      }
    }
  }
}

export function autoAdjustColumnWidths(worksheet: ExcelJS.Worksheet, totalCols: number, minWidths: number[] = []) {
  for (let c = 1; c <= totalCols; c++) {
    const column = worksheet.getColumn(c);
    let maxLength = 0;
    
    column.eachCell({ includeEmpty: true }, (cell) => {
      // Don't count merged header cells in length calculation
      if (cell.isMerged && parseInt(cell.row as string) < 8) return; 
      
      const columnLength = cell.value ? cell.value.toString().length : 0;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });

    // Add padding
    let finalWidth = maxLength + 4;
    
    // Apply minimum widths if provided
    if (minWidths[c - 1] && finalWidth < minWidths[c - 1]) {
      finalWidth = minWidths[c - 1];
    } else if (finalWidth < 8) {
      finalWidth = 8;
    }

    column.width = finalWidth;
  }
}

export function addSignatureBlock(
  worksheet: ExcelJS.Worksheet, 
  startRow: number, 
  totalCols: number, 
  teacherName: string
) {
  const leftEndCol = Math.min(4, Math.floor(totalCols / 2));
  const rightStartCol = totalCols - Math.min(3, Math.floor(totalCols / 2)) + 1;

  // Left Signature
  worksheet.mergeCells(startRow, 1, startRow, leftEndCol);
  const sigLeft1 = worksheet.getCell(startRow, 1);
  sigLeft1.value = 'បានឃើញ និងឯកភាព';
  sigLeft1.font = { name: 'Khmer OS Muol Light', size: 11, bold: true };
  sigLeft1.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells(startRow + 1, 1, startRow + 1, leftEndCol);
  const sigLeft2 = worksheet.getCell(startRow + 1, 1);
  sigLeft2.value = 'ថ្ងៃទី....... ខែ....... ឆ្នាំ២០២...';
  sigLeft2.font = { name: 'Khmer OS Battambang', size: 11 };
  sigLeft2.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells(startRow + 2, 1, startRow + 2, leftEndCol);
  const sigLeft3 = worksheet.getCell(startRow + 2, 1);
  sigLeft3.value = 'នាយកវិទ្យាល័យ';
  sigLeft3.font = { name: 'Khmer OS Muol Light', size: 11, bold: true };
  sigLeft3.alignment = { horizontal: 'center', vertical: 'middle' };

  // Right Signature
  worksheet.mergeCells(startRow, rightStartCol, startRow, totalCols);
  const sigRight1 = worksheet.getCell(startRow, rightStartCol);
  sigRight1.value = 'ថ្ងៃ................... ខែ........... ឆ្នាំ............. ព.ស. ២៥៦...';
  sigRight1.font = { name: 'Khmer OS Battambang', size: 11 };
  sigRight1.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells(startRow + 1, rightStartCol, startRow + 1, totalCols);
  const sigRight2 = worksheet.getCell(startRow + 1, rightStartCol);
  sigRight2.value = 'ពោធិ៍រៀង, ថ្ងៃទី....... ខែ....... ឆ្នាំ២០២...';
  sigRight2.font = { name: 'Khmer OS Battambang', size: 11 };
  sigRight2.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells(startRow + 2, rightStartCol, startRow + 2, totalCols);
  const sigRight3 = worksheet.getCell(startRow + 2, rightStartCol);
  sigRight3.value = 'គ្រូបន្ទុកថ្នាក់';
  sigRight3.font = { name: 'Khmer OS Muol Light', size: 11, bold: true };
  sigRight3.alignment = { horizontal: 'center', vertical: 'middle' };

  // Teacher Name placeholder
  worksheet.mergeCells(startRow + 6, rightStartCol, startRow + 6, totalCols);
  const sigRightName = worksheet.getCell(startRow + 6, rightStartCol);
  sigRightName.value = teacherName;
  sigRightName.font = { name: 'Khmer OS Muol Light', size: 11, bold: true };
  sigRightName.alignment = { horizontal: 'center', vertical: 'middle' };
}

export async function downloadExcel(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
}
