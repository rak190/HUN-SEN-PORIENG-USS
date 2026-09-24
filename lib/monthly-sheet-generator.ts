import * as XLSX from 'xlsx';

export interface TabConfig {
  sheetName: string;
  grade: string;
  track?: string | null;
  label: string;
}

export const EXAM_TABS_CONFIG: TabConfig[] = [
  { sheetName: 'ថ្នាក់ទី ៧', grade: '7', track: null, label: 'ថ្នាក់ទី៧' },
  { sheetName: 'ថ្នាក់ទី ៨', grade: '8', track: null, label: 'ថ្នាក់ទី៨' },
  { sheetName: 'ថ្នាក់ទី ៩', grade: '9', track: null, label: 'ថ្នាក់ទី៩' },
  { sheetName: 'ថ្នាក់ទី ១០', grade: '10', track: null, label: 'ថ្នាក់ទី១០' },
  { sheetName: '11 SC', grade: '11', track: 'science', label: 'ថ្នាក់ទី១១ វិទ្យាសាស្ត្រពិត' },
  { sheetName: '11 SS', grade: '11', track: 'social', label: 'ថ្នាក់ទី១១ វិទ្យាសាស្ត្រសង្គម' },
  { sheetName: '12 SC', grade: '12', track: 'science', label: 'ថ្នាក់ទី១២ វិទ្យាសាស្ត្រពិត' },
  { sheetName: '12 SS', grade: '12', track: 'social', label: 'ថ្នាក់ទី១២ វិទ្យាសាស្ត្រសង្គម' },
];

interface StudentRecord {
  id: string;
  student_id_number?: string;
  desk_number?: string;
  room_number?: string;
  full_name: string;
  gender?: string;
  dob?: string;
  class_id?: string;
  classes?: {
    id: string;
    name: string;
    grade: string | number;
    track?: string | null;
  };
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

export interface SheetDataMap {
  [sheetName: string]: {
    rows: any[][];
    cols: { wch: number }[];
  };
}

export function generateMonthlyExamData(
  students: StudentRecord[],
  classes: any[],
  periodLabel: string = 'ប្រចាំខែ',
  academicYear: string = '២០២៥-២០២៦'
): SheetDataMap {
  const result: SheetDataMap = {};

  EXAM_TABS_CONFIG.forEach(tab => {
    // 1. Filter students for this tab
    const tabStudents = students.filter(s => {
      const cls = s.classes || classes.find(c => c.id === s.class_id);
      if (!cls) return false;
      const matchGrade = String(cls.grade) === tab.grade;
      if (!matchGrade) return false;

      if (tab.track) {
        const clsTrack = (cls.track || '').toLowerCase();
        if (tab.track === 'science') {
          return clsTrack.includes('sci') || clsTrack.includes('ពិត') || cls.name.includes('វិទ្យា') || cls.name.includes('SC');
        } else if (tab.track === 'social') {
          return clsTrack.includes('soc') || clsTrack.includes('សង្គម') || cls.name.includes('សង្គម') || cls.name.includes('SS');
        }
      }
      return true;
    });

    // Sort students strictly by Room -> Desk -> Class -> Name
    tabStudents.sort((a, b) => {
      const rA = parseInt((a.room_number || '').replace(/\D/g, '') || '0', 10);
      const rB = parseInt((b.room_number || '').replace(/\D/g, '') || '0', 10);
      if (rA && rB && rA !== rB) return rA - rB;

      const dA = parseInt(a.desk_number || '0', 10);
      const dB = parseInt(b.desk_number || '0', 10);
      if (dA && dB && dA !== dB) return dA - dB;

      const cA = a.classes?.name || '';
      const cB = b.classes?.name || '';
      if (cA !== cB) return cA.localeCompare(cB);

      return a.full_name.localeCompare(b.full_name, 'km');
    });

    // 2. Build rooms: check if students have room numbers assigned
    const hasAssignedRooms = tabStudents.some(s => !!s.room_number);
    const roomsMap: { roomNum: string | number; roomStudents: StudentRecord[] }[] = [];

    if (hasAssignedRooms) {
      const grouped = new Map<string, StudentRecord[]>();
      tabStudents.forEach(s => {
        const rKey = (s.room_number || '1').trim();
        const list = grouped.get(rKey) || [];
        list.push(s);
        grouped.set(rKey, list);
      });
      // Convert map to sorted rooms
      Array.from(grouped.keys()).sort((a, b) => {
        const nA = parseInt(a.replace(/\D/g, '') || '0', 10);
        const nB = parseInt(b.replace(/\D/g, '') || '0', 10);
        if (nA && nB) return nA - nB;
        return a.localeCompare(b);
      }).forEach(k => {
        roomsMap.push({ roomNum: k, roomStudents: grouped.get(k) || [] });
      });
    } else {
      const studentsPerRoom = 26;
      const totalRooms = Math.max(1, Math.ceil(tabStudents.length / studentsPerRoom));
      for (let r = 0; r < totalRooms; r++) {
        roomsMap.push({
          roomNum: r + 1,
          roomStudents: tabStudents.slice(r * studentsPerRoom, (r + 1) * studentsPerRoom)
        });
      }
    }

    const sheetRows: any[][] = [];

    roomsMap.forEach(({ roomNum, roomStudents }, roomIdx) => {
      // Header Banner
      sheetRows.push(['ព្រះរាជាណាចក្រកម្ពុជា']);
      sheetRows.push(['ជាតិ សាសនា ព្រះមហាក្សត្រ']);
      sheetRows.push(['មន្ទីរអប់រំយុវជន និងកីឡាខេត្តព្រៃវែង']);
      sheetRows.push(['វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង']);
      sheetRows.push([`បន្ទប់លេខៈ`, '', roomNum]);
      sheetRows.push([`បញ្ជីឈ្មោះបេក្ខជនប្រឡង${periodLabel} ${tab.label} ឆ្នាំសិក្សា ${academicYear}`]);
      sheetRows.push([`សម័យប្រឡងៈ ថ្ងៃទី... ខែ... ឆ្នាំ...`]);

      // Row 1: Subject Main Headers (Row 8)
      const subHeaderRow: string[] = [
        '', '', '', '', '', '', '', '', '', '',
        'សរសេរ', '', '',
        'តែង', '', '',
        'អានល្បឿន',
        'គណិត', '', '',
        'រូប', '', '',
        'គីមី', '', '',
        'ជីវៈ', '', '',
        'ប្រវត្តិ', '', '',
        'ICT', '', '',
        'សីល', '', '',
        'ផែន', '', '',
        'ភូមិ', '', '',
        'អង់', '', '',
        'កីឡា', '', '',
        'សរសេរ', 'តែង', 'អានល្បឿន', 'គណិត', 'រូប', 'គីមី', 'ជីវ', 'ប្រវតិ្ត', 'ICT', 'សីល', 'ផែនដី', 'ភូមិ', 'កីឡា', 'អង់គ្លេស'
      ];
      sheetRows.push(subHeaderRow);

      // Row 2: Submetrics & Column Headers (Row 9)
      const colHeaderRow: string[] = [
        'លេខតុ', 'អត្តលេខ', 'គោត្តនាម', 'នាម', 'ភេទ', 'ថ្ងៃ', 'ខែ', 'ឆ្នាំ', 'ថ្នាក់', 'បន្ទប់',
        'វិជ្ជា', 'បំណិន', 'ចរិយា', // សរសេរ (K-M)
        'វិជ្ជា', 'បំណិន', 'ចរិយា', // តែង (N-P)
        'ពិន្ទុ',                  // អានល្បឿន (Q)
        'វិជ្ជា', 'បំណិន', 'ចរិយា', // គណិត (R-T)
        'វិជ្ជា', 'បំណិន', 'ចរិយា', // រូប (U-W)
        'វិជ្ជា', 'បំណិន', 'ចរិយា', // គីមី (X-Z)
        'វិជ្ជា', 'បំណិន', 'ចរិយា', // ជីវៈ (AA-AC)
        'វិជ្ជា', 'បំណិន', 'ចរិយា', // ប្រវត្តិ (AD-AF)
        'វិជ្ជា', 'បំណិន', 'ចរិយា', // ICT (AG-AI)
        'វិជ្ជា', 'បំណិន', 'ចរិយា', // សីល (AJ-AL)
        'វិជ្ជា', 'បំណិន', 'ចរិយា', // ផែន (AM-AO)
        'វិជ្ជា', 'បំណិន', 'ចរិយា', // ភូមិ (AP-AR)
        'វិជ្ជា', 'បំណិន', 'ចរិយា', // អង់ (AS-AU)
        'វិជ្ជា', 'បំណិន', 'ចរិយា', // កីឡា (AV-AX)
        'សរុប', 'សរុប', 'ពិន្ទុ', 'សរុប', 'សរុប', 'សរុប', 'សរុប', 'សរុប', 'សរុប', 'សរុប', 'សរុប', 'សរុប', 'សរុប', 'សរុប'
      ];
      sheetRows.push(colHeaderRow);

      // Student rows
      let femaleCount = 0;
      roomStudents.forEach((std, sIdx) => {
        const deskNum = std.desk_number || String(roomIdx * 26 + sIdx + 1);
        const idNum = std.student_id_number || '';
        const { lastName, firstName } = splitKhmerName(std.full_name);
        const gender = std.gender === 'female' || std.gender === 'ស្រី' || std.gender === 'F' ? 'ស្រី' : 'ប្រុស';
        if (gender === 'ស្រី') femaleCount++;

        const { day, month, year } = splitDob(std.dob);
        const clsName = std.classes?.name || tab.grade;

        const row: any[] = [
          deskNum, idNum, lastName, firstName, gender, day, month, year, clsName, roomNum
        ];

        // Fill blanks for score entries (40 empty columns)
        for (let k = 10; k < 50; k++) {
          row.push('');
        }

        // Add =SUM formulas for Google Sheets (row is 1-indexed, sheetRows.length + 1)
        const r = sheetRows.length + 1;
        row.push(`=SUM(K${r}:M${r})`); // សរសេរ (AY)
        row.push(`=SUM(N${r}:P${r})`); // តែង (AZ)
        row.push(`=Q${r}`);            // អានល្បឿន (BA)
        row.push(`=SUM(R${r}:T${r})`); // គណិត (BB)
        row.push(`=SUM(U${r}:W${r})`); // រូប (BC)
        row.push(`=SUM(X${r}:Z${r})`); // គីមី (BD)
        row.push(`=SUM(AA${r}:AC${r})`); // ជីវៈ (BE)
        row.push(`=SUM(AD${r}:AF${r})`); // ប្រវត្តិ (BF)
        row.push(`=SUM(AG${r}:AI${r})`); // ICT (BG)
        row.push(`=SUM(AJ${r}:AL${r})`); // សីល (BH)
        row.push(`=SUM(AM${r}:AO${r})`); // ផែនដី (BI)
        row.push(`=SUM(AP${r}:AR${r})`); // ភូមិ (BJ)
        row.push(`=SUM(AV${r}:AX${r})`); // កីឡា (BK) - Note: columns AV-AX are កីឡា
        row.push(`=SUM(AS${r}:AU${r})`); // អង់គ្លេស (BL) - Note: columns AS-AU are អង់

        sheetRows.push(row);
      });

      // If room was empty, put 1 placeholder row
      if (roomStudents.length === 0) {
        const dummyRow: any[] = [1, '4901', 'គំរូ', 'សិស្ស', 'ប្រុស', 1, 1, 2012, tab.grade, roomNum];
        for (let k = 10; k < 50; k++) dummyRow.push('');
        const r = sheetRows.length + 1;
        dummyRow.push(`=SUM(K${r}:M${r})`, `=SUM(N${r}:P${r})`, `=Q${r}`, `=SUM(R${r}:T${r})`, `=SUM(U${r}:W${r})`, `=SUM(X${r}:Z${r})`, `=SUM(AA${r}:AC${r})`, `=SUM(AD${r}:AF${r})`, `=SUM(AG${r}:AI${r})`, `=SUM(AJ${r}:AL${r})`, `=SUM(AM${r}:AO${r})`, `=SUM(AP${r}:AR${r})`, `=SUM(AV${r}:AX${r})`, `=SUM(AS${r}:AU${r})`);
        sheetRows.push(dummyRow);
      }

      // Closing room summary
      sheetRows.push([]);
      sheetRows.push([
        '',
        `បញ្ឈប់បញ្ជីត្រឹមចំនួន `,
        '', '', '', '',
        roomStudents.length,
        'នាក់',
        'ស្រី',
        femaleCount,
        'នាក់'
      ]);
      sheetRows.push([]);
      sheetRows.push([]);
    });

    result[tab.sheetName] = {
      rows: sheetRows,
      cols: [
        { wch: 8 },  // លេខតុ
        { wch: 10 }, // អត្តលេខ
        { wch: 12 }, // គោត្តនាម
        { wch: 14 }, // នាម
        { wch: 8 },  // ភេទ
        { wch: 6 },  // ថ្ងៃ
        { wch: 6 },  // ខែ
        { wch: 8 },  // ឆ្នាំ
        { wch: 10 }, // ថ្នាក់
        { wch: 8 },  // បន្ទប់
      ]
    };
  });

  return result;
}

/**
 * Generates an official 8-Tab Exam Spreadsheet compatible with MoEYS & Telegram Workflow
 */
export function generateMonthlyExamWorkbook(
  students: StudentRecord[],
  classes: any[],
  periodLabel: string = 'ប្រចាំខែ',
  academicYear: string = '២០២៥-២០២៦'
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const dataMap = generateMonthlyExamData(students, classes, periodLabel, academicYear);

  Object.entries(dataMap).forEach(([sheetName, data]) => {
    const ws = XLSX.utils.aoa_to_sheet(data.rows);
    ws['!cols'] = data.cols;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  return wb;
}
