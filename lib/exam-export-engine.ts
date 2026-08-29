import * as XLSX from 'xlsx';
import { RoomDistribution, ExamHeaderMetadata, ExamCandidate } from './exam-allocation-engine';

export interface ExamExportOptions {
  mode: 'single_sheet' | 'multi_grade_sections' | 'one_sheet_per_room';
  eventTitle: string;
  academicYear: string;
  examDate: string;
  metadata?: ExamHeaderMetadata;
}

/**
 * Splits full Khmer name into Last Name (គោត្តនាម) and First Name (នាម)
 */
function splitKhmerName(fullName: string): { lastName: string; firstName: string } {
  const clean = (fullName || '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    return { lastName: parts[0], firstName: '' };
  }
  const lastName = parts[0];
  const firstName = parts.slice(1).join(' ');
  return { lastName, firstName };
}

/**
 * Splits date of birth YYYY-MM-DD into [day, month, year]
 */
function splitDob(dobStr?: string): { day: string; month: string; year: string } {
  if (!dobStr) return { day: '', month: '', year: '' };
  const parts = dobStr.split('-');
  if (parts.length === 3) {
    return { day: String(parseInt(parts[2], 10) || ''), month: String(parseInt(parts[1], 10) || ''), year: parts[0] };
  }
  return { day: '', month: '', year: '' };
}

/**
 * Helper to get grade group key for Mode 2
 */
function getGradeGroupKey(grade: string | number, track?: string | null, className?: string): string {
  const gStr = String(grade).trim();
  const cName = (className || '').toUpperCase();
  const tStr = (track || '').toLowerCase();

  if (gStr === '7' || cName.startsWith('7')) return 'G7';
  if (gStr === '8' || cName.startsWith('8')) return 'G8';
  if (gStr === '9' || cName.startsWith('9')) return 'G9';
  if (gStr === '10' || cName.startsWith('10')) return 'G10';
  
  if (gStr === '11' || cName.startsWith('11')) {
    if (tStr.includes('sci') || tStr.includes('ពិត') || cName.includes('SC') || cName.includes('វិទ្យា')) {
      return 'G11 SC';
    }
    return 'G11SS';
  }

  if (gStr === '12' || cName.startsWith('12')) {
    if (tStr.includes('sci') || tStr.includes('ពិត') || cName.includes('SC') || cName.includes('វិទ្យា')) {
      return 'G12SC';
    }
    return 'G12SS';
  }

  return `G${gStr}`;
}

const GRADE_ORDER = ['G7', 'G8', 'G9', 'G10', 'G11 SC', 'G11SS', 'G12SC', 'G12SS'];

const GRADE_LABELS: Record<string, string> = {
  'G7': 'ថ្នាក់ទី៧',
  'G8': 'ថ្នាក់ទី៨',
  'G9': 'ថ្នាក់ទី៩',
  'G10': 'ថ្នាក់ទី១០',
  'G11 SC': 'ថ្នាក់ទី១១ វិទ្យាសាស្ត្រពិត',
  'G11SS': 'ថ្នាក់ទី១១ វិទ្យាសាស្ត្រសង្គម',
  'G12SC': 'ថ្នាក់ទី១២ វិទ្យាសាស្ត្រពិត',
  'G12SS': 'ថ្នាក់ទី១២ វិទ្យាសាស្ត្រសង្គម',
};

/**
 * Main Export Engine: Generates complete Excel Workbook according to selected mode
 */
export function generateExamExcelWorkbook(
  distributions: RoomDistribution[],
  options: ExamExportOptions
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const meta = options.metadata || {};
  const kingdom = meta.kingdom || 'ព្រះរាជាណាចក្រកម្ពុជា';
  const motto = meta.motto || 'ជាតិ សាសនា ព្រះមហាក្សត្រ';
  const ministry = meta.ministry || 'មន្ទីរអប់រំយុវជន និងកីឡាខេត្តព្រៃវែង';
  const school = meta.school || 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង';
  const examDateLabel = options.examDate ? `សម័យប្រឡងៈ ${options.examDate}` : (meta.exam_date_label || 'សម័យប្រឡងៈ ...');

  // =========================================================================
  // MODE 1: Single Worksheet with all candidates across all rooms
  // =========================================================================
  if (options.mode === 'single_sheet') {
    const rows: any[][] = [];
    rows.push([kingdom]);
    rows.push([motto]);
    rows.push([ministry]);
    rows.push([school]);
    rows.push([`${options.eventTitle} ឆ្នាំសិក្សា ${options.academicYear}`]);
    rows.push([examDateLabel]);
    rows.push([]);
    rows.push(['លេខតុ', 'អត្តលេខ', 'គោត្តនាម', 'នាម', 'ភេទ', 'ថ្ងៃ', 'ខែ', 'ឆ្នាំ', 'ថ្នាក់', 'បន្ទប់លេខ', 'កៅអីលេខ', 'ស្ថានភាព']);

    distributions.forEach(dist => {
      dist.candidates.forEach(cItem => {
        const { lastName, firstName } = splitKhmerName(cItem.candidate.full_name);
        const { day, month, year } = splitDob(cItem.candidate.dob);
        const genderKh = (cItem.candidate.gender === 'female' || cItem.candidate.gender === 'ស្រី') ? 'ស្រី' : 'ប្រុស';

        rows.push([
          cItem.examOrderNumber,
          cItem.candidate.student_id_number || '',
          lastName,
          firstName,
          genderKh,
          day,
          month,
          year,
          cItem.candidate.class_name,
          dist.roomNumber,
          cItem.seatNumber,
          cItem.status === 'absent' ? 'អវត្តមាន' : (cItem.status === 'withdrawn' ? 'លុបឈ្មោះ' : 'ធម្មតា')
        ]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'បញ្ជីបេក្ខជនសរុប');
    return wb;
  }

  // =========================================================================
  // MODE 3: One Worksheet per Room
  // =========================================================================
  if (options.mode === 'one_sheet_per_room') {
    distributions.forEach(dist => {
      const rows: any[][] = [];
      rows.push([kingdom]);
      rows.push([motto]);
      rows.push([ministry]);
      rows.push([school]);
      rows.push([`បន្ទប់លេខៈ`, '', dist.roomNumber]);
      rows.push([`${options.eventTitle} ឆ្នាំសិក្សា ${options.academicYear}`]);
      rows.push([examDateLabel]);
      rows.push([]);
      rows.push(['លេខតុ', 'អត្តលេខ', 'គោត្តនាម', 'នាម', 'ភេទ', 'ថ្ងៃ', 'ខែ', 'ឆ្នាំ', 'ថ្នាក់', 'ស្ថានភាព']);

      let femaleCount = 0;
      dist.candidates.forEach(cItem => {
        const { lastName, firstName } = splitKhmerName(cItem.candidate.full_name);
        const { day, month, year } = splitDob(cItem.candidate.dob);
        const genderKh = (cItem.candidate.gender === 'female' || cItem.candidate.gender === 'ស្រី') ? 'ស្រី' : 'ប្រុស';
        if (genderKh === 'ស្រី') femaleCount++;

        rows.push([
          cItem.examOrderNumber,
          cItem.candidate.student_id_number || '',
          lastName,
          firstName,
          genderKh,
          day,
          month,
          year,
          cItem.candidate.class_name,
          cItem.status === 'absent' ? 'អវត្តមាន' : (cItem.status === 'withdrawn' ? 'លុបឈ្មោះ' : '')
        ]);
      });

      rows.push([]);
      rows.push(['', `បញ្ឈប់បញ្ជីត្រឹមចំនួន `, '', '', '', dist.candidates.length, 'នាក់', 'ស្រី', femaleCount, 'នាក់']);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, `បន្ទប់_${dist.roomNumber}`);
    });

    return wb;
  }

  // =========================================================================
  // MODE 2 (DEFAULT): Official Real School Format (One Sheet per Grade/Track with Repeated Room Sections)
  // Worksheets: G7, G8, G9, G10, G11 SC, G11SS, G12SC, G12SS
  // =========================================================================
  // Group room candidate slices by grade sheet
  const gradeBuckets: Record<string, { dist: RoomDistribution; candidates: any[] }[]> = {};

  GRADE_ORDER.forEach(gKey => {
    gradeBuckets[gKey] = [];
  });

  distributions.forEach(dist => {
    // A single room may have candidates from a grade or mixed grades
    const roomGradeMap: Record<string, any[]> = {};
    dist.candidates.forEach(cItem => {
      const gKey = getGradeGroupKey(cItem.candidate.grade, cItem.candidate.track, cItem.candidate.class_name);
      if (!roomGradeMap[gKey]) roomGradeMap[gKey] = [];
      roomGradeMap[gKey].push(cItem);
    });

    Object.keys(roomGradeMap).forEach(gKey => {
      if (!gradeBuckets[gKey]) gradeBuckets[gKey] = [];
      gradeBuckets[gKey].push({
        dist,
        candidates: roomGradeMap[gKey]
      });
    });
  });

  GRADE_ORDER.forEach(gKey => {
    const roomSlices = gradeBuckets[gKey];
    if (!roomSlices || roomSlices.length === 0) return;

    const sheetRows: any[][] = [];
    const gradeLabel = GRADE_LABELS[gKey] || gKey;

    roomSlices.forEach(slice => {
      const dist = slice.dist;
      const candidates = slice.candidates;
      if (candidates.length === 0) return;

      // Section Header Banner
      sheetRows.push([kingdom]);
      sheetRows.push([motto]);
      sheetRows.push([ministry]);
      sheetRows.push([school]);
      sheetRows.push([`បន្ទប់លេខៈ`, '', dist.roomNumber]);
      sheetRows.push([`បញ្ជីឈ្មោះបេក្ខជនប្រឡង${options.eventTitle} ${gradeLabel} ឆ្នាំសិក្សា ${options.academicYear}`]);
      sheetRows.push([examDateLabel]);

      // Table Header Row
      sheetRows.push(['លេខតុ', 'អត្តលេខ', 'គោត្តនាម', 'នាម', 'ភេទ', 'ថ្ងៃ', 'ខែ', 'ឆ្នាំ', 'ថ្នាក់']);

      let femaleCount = 0;
      candidates.forEach(cItem => {
        const { lastName, firstName } = splitKhmerName(cItem.candidate.full_name);
        const { day, month, year } = splitDob(cItem.candidate.dob);
        const genderKh = (cItem.candidate.gender === 'female' || cItem.candidate.gender === 'ស្រី') ? 'ស្រី' : 'ប្រុស';
        if (genderKh === 'ស្រី') femaleCount++;

        sheetRows.push([
          cItem.examOrderNumber,
          cItem.candidate.student_id_number || '',
          lastName,
          firstName,
          genderKh,
          day,
          month,
          year,
          cItem.candidate.class_name
        ]);
      });

      // Closing Room Section Footer
      sheetRows.push([]);
      sheetRows.push([
        '',
        `បញ្ឈប់បញ្ជីត្រឹមចំនួន `,
        '', '', '',
        candidates.length,
        'នាក់',
        'ស្រី',
        femaleCount,
        'នាក់'
      ]);
      sheetRows.push([]);
      sheetRows.push([]);
      sheetRows.push([]); // Visual separation before next room
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    ws['!cols'] = [
      { wch: 8 },  // លេខតុ
      { wch: 10 }, // អត្តលេខ
      { wch: 14 }, // គោត្តនាម
      { wch: 16 }, // នាម
      { wch: 8 },  // ភេទ
      { wch: 6 },  // ថ្ងៃ
      { wch: 6 },  // ខែ
      { wch: 8 },  // ឆ្នាំ
      { wch: 10 }  // ថ្នាក់
    ];

    XLSX.utils.book_append_sheet(wb, ws, gKey);
  });

  return wb;
}

/**
 * Mode 4: Generates Printable Room Posters HTML string (1 room per page)
 */
export function generatePrintableRoomPosters(
  distributions: RoomDistribution[],
  options: ExamExportOptions
): string {
  const meta = options.metadata || {};
  const kingdom = meta.kingdom || 'ព្រះរាជាណាចក្រកម្ពុជា';
  const motto = meta.motto || 'ជាតិ សាសនា ព្រះមហាក្សត្រ';
  const ministry = meta.ministry || 'មន្ទីរអប់រំយុវជន និងកីឡាខេត្តព្រៃវែង';
  const school = meta.school || 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង';

  let html = `<!DOCTYPE html>
<html lang="km">
<head>
<meta charset="utf-8">
<title>បញ្ជីបេក្ខជនប្រឡងតាមបន្ទប់ - ${school}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700;800&family=Moul&display=swap');
  @page { size: A4 portrait; margin: 15mm; }
  body { font-family: 'Kantumruy Pro', sans-serif; margin: 0; padding: 0; color: #1e293b; }
  .room-page { page-break-after: always; padding-bottom: 20px; }
  .room-page:last-child { page-break-after: auto; }
  .header-box { text-align: center; margin-bottom: 15px; }
  .kingdom { font-family: 'Moul', serif; font-size: 14px; margin: 0; }
  .motto { font-family: 'Moul', serif; font-size: 12px; margin: 2px 0 10px 0; }
  .school-title { font-size: 13px; font-weight: 700; text-align: left; }
  .room-badge { font-family: 'Moul', serif; font-size: 18px; color: #1e3a8a; margin: 8px 0; }
  .exam-title { font-size: 14px; font-weight: 800; margin: 4px 0; }
  .exam-date { font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  th, td { border: 1px solid #94a3b8; padding: 5px 6px; text-align: left; }
  th { background-color: #f1f5f9; font-weight: 800; text-align: center; }
  .center { text-align: center; }
  .desk-num { font-weight: 800; font-size: 13px; color: #0f172a; text-align: center; }
  .footer-summary { margin-top: 15px; font-weight: 700; font-size: 12px; display: flex; justify-content: space-between; }
</style>
</head>
<body>`;

  distributions.forEach(dist => {
    let femaleCount = 0;
    const rowsHtml = dist.candidates.map(item => {
      const { lastName, firstName } = splitKhmerName(item.candidate.full_name);
      const genderKh = (item.candidate.gender === 'female' || item.candidate.gender === 'ស្រី') ? 'ស្រី' : 'ប្រុស';
      if (genderKh === 'ស្រី') femaleCount++;

      return `<tr>
        <td class="desk-num">${item.examOrderNumber}</td>
        <td class="center">${item.candidate.student_id_number || '-'}</td>
        <td>${lastName}</td>
        <td>${firstName}</td>
        <td class="center">${genderKh}</td>
        <td class="center">${item.candidate.dob || '-'}</td>
        <td class="center font-bold">${item.candidate.class_name}</td>
        <td class="center">${item.status === 'absent' ? '<span style="color:red; font-weight:bold;">អវត្តមាន</span>' : '✓'}</td>
      </tr>`;
    }).join('\n');

    html += `
  <div class="room-page">
    <div class="header-box">
      <div class="kingdom">${kingdom}</div>
      <div class="motto">${motto}</div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 5px;">
        <div class="school-title">
          <div>${ministry}</div>
          <div style="font-weight: 800; color: #1e3a8a;">${school}</div>
        </div>
        <div class="room-badge" style="border: 2px solid #1e3a8a; padding: 4px 16px; border-radius: 8px;">
          បន្ទប់លេខៈ ${dist.roomNumber}
        </div>
      </div>
      <div class="exam-title" style="margin-top: 10px;">${options.eventTitle} ឆ្នាំសិក្សា ${options.academicYear}</div>
      <div class="exam-date">${options.examDate ? 'សម័យប្រឡងៈ ' + options.examDate : ''} (តុលេខៈ ${dist.startOrder} ដល់ ${dist.endOrder})</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 55px;">លេខតុ</th>
          <th style="width: 75px;">អត្តលេខ</th>
          <th>គោត្តនាម</th>
          <th>នាម</th>
          <th style="width: 45px;">ភេទ</th>
          <th style="width: 85px;">ថ្ងៃខែឆ្នាំកំណើត</th>
          <th style="width: 65px;">ថ្នាក់</th>
          <th style="width: 55px;">វត្តមាន</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="footer-summary">
      <div>បញ្ឈប់បញ្ជីត្រឹមចំនួន៖ <strong>${dist.candidates.length} នាក់</strong> (ស្រី៖ <strong>${femaleCount} នាក់</strong>)</div>
      <div>កាលបរិច្ឆេទបោះពុម្ព៖ ${new Date().toLocaleDateString('km-KH')}</div>
    </div>
  </div>`;
  });

  html += `</body></html>`;
  return html;
}
