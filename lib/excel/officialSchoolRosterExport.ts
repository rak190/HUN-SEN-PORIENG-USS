import ExcelJS from 'exceljs';

export interface SchoolInfoExportData {
  name?: string | null;
  province?: string | null;
  department?: string | null;
  abbreviation?: string | null;
}

export interface ClassInfoExportData {
  id: string;
  name: string;
  grade?: number | string | null;
  academic_year_id?: string | null;
}

export interface AcademicYearExportData {
  id?: string;
  name?: string | null;
}

export interface StudentRosterRecord {
  id: string;
  student_id_number?: string | null;
  full_name: string;
  gender?: string | null;
  date_of_birth?: string | null;
  dob?: string | null;
  pob?: string | null;
  prev_school?: string | null;
  room_number?: string | null;
  desk_number?: string | null;
  exam_grade?: string | null;
  father_name?: string | null;
  father_job?: string | null;
  father_phone?: string | null;
  mother_name?: string | null;
  mother_job?: string | null;
  mother_phone?: string | null;
  guardian_name?: string | null;
  guardian_job?: string | null;
  guardian_phone?: string | null;
  current_address?: string | null;
  address?: string | null;
  student_phone?: string | null;
  indigenous?: string | null;
  scholarship?: string | null;
  scholarship_status?: string | null;
  disability?: string | null;
  assistive_device?: string | null;
  id_poor?: string | null;
  family_condition?: string | null;
  elective_subject?: string | null;
  student_roles?: string | null;
  health_issues?: string | null;
  notes?: string | null;
}

export interface GenerateRosterExportOptions {
  students: StudentRosterRecord[];
  classInfo: ClassInfoExportData;
  academicYear?: AcademicYearExportData | null;
  schoolInfo?: SchoolInfoExportData | null;
}

/**
 * Parses a combined Khmer address string into 4 distinct components:
 * ភូមិ (Village), ឃុំ/សង្កាត់ (Commune), ស្រុក/ក្រុង/ខណ្ឌ (District), ខេត្ត/រាជធានី (Province)
 */
export function parseKhmerAddressParts(addr?: string | null): {
  village: string;
  commune: string;
  district: string;
  province: string;
} {
  if (!addr || !addr.trim()) {
    return { village: '', commune: '', district: '', province: '' };
  }

  const raw = addr.trim();

  // Pattern matching for standard Cambodian address markers
  // Example: "ភូមិព្រៃស្រឡៅ ឃុំពោធិ៍រៀង ស្រុកពោធិ៍រៀង ខេត្តព្រៃវែង"
  let village = '';
  let commune = '';
  let district = '';
  let province = '';

  const vMatch = raw.match(/ភូមិ\s*([^,\s]+(?:\s+[^,\s]+)*?)(?=\s*(?:ឃុំ|សង្កាត់|ស្រុក|ក្រុង|ខណ្ឌ|ខេត្ត|រាជធានី|$))/);
  if (vMatch) village = vMatch[1].trim();

  const cMatch = raw.match(/(?:ឃុំ|សង្កាត់)\s*([^,\s]+(?:\s+[^,\s]+)*?)(?=\s*(?:ស្រុក|ក្រុង|ខណ្ឌ|ខេត្ត|រាជធានី|$))/);
  if (cMatch) commune = cMatch[1].trim();

  const dMatch = raw.match(/(?:ស្រុក|ក្រុង|ខណ្ឌ)\s*([^,\s]+(?:\s+[^,\s]+)*?)(?=\s*(?:ខេត្ត|រាជធានី|$))/);
  if (dMatch) district = dMatch[1].trim();

  const pMatch = raw.match(/(?:ខេត្ត|រាជធានី)\s*([^,\s]+(?:\s+[^,\s]+)*?)(?=\s*$)/);
  if (pMatch) province = pMatch[1].trim();

  // Fallback: if no keywords matched, keep entire string in village for visibility
  if (!village && !commune && !district && !province) {
    village = raw;
  }

  return { village, commune, district, province };
}

/**
 * Determines whether the class belongs to Upper Secondary (Grades 10-12) or Lower Secondary (Grades 7-9)
 */
export function isUpperSecondary(classInfo: ClassInfoExportData): boolean {
  const rawGrade = classInfo.grade;
  if (rawGrade !== undefined && rawGrade !== null) {
    const num = parseInt(String(rawGrade).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num) && num >= 10) return true;
    if (!isNaN(num) && num >= 7 && num <= 9) return false;
  }

  const name = classInfo.name || '';
  if (
    name.includes('10') ||
    name.includes('11') ||
    name.includes('12') ||
    name.includes('១០') ||
    name.includes('១១') ||
    name.includes('១២')
  ) {
    return true;
  }

  return false;
}

// 20 Standard Subject headers
const SCORE_SUBJECT_HEADERS = [
  'តែង', 'សរសេរ', 'សីល', 'ភូមិ', 'ប្រវត្តិ', 'គណិត', 'ផែន', 'រូប', 'គីមី', 'ជីវៈ',
  'គេហ', 'សិល្បៈ', 'កសិកម្ម', 'អង់', 'បារាំង', 'អប់រំកាយ', 'ព័ត៌មាន', 'ពិ.សរុប', 'មធ្យម', 'និទ្ទេស'
];

/**
 * Generates an official, beautifully styled Excel workbook mirroring:
 * គំរូ_បញ្ជីឈ្មោះសិស្ស_គ្រូ_ឆ្នាំសិក្សា_2026_2027 (2).xlsx
 */
export async function generateOfficialSchoolRosterWorkbook(
  options: GenerateRosterExportOptions
): Promise<ExcelJS.Workbook> {
  const { students, classInfo, academicYear, schoolInfo } = options;
  const isUpper = isUpperSecondary(classInfo);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hun Sen Porieng USS - KruAI';
  workbook.created = new Date();

  const sheetName = isUpper ? 'បញ្ជីឈ្មោះសិស្ស 10-12' : 'បញ្ជីឈ្មោះសិស្ស7-9';
  const totalCols = isUpper ? 62 : 59;

  const ws = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // Color & Font Tokens matching the official template
  const headerBgColor = isUpper ? 'FFD9E1F2' : 'FFD9E1F2'; // Soft pastel ice blue (#D9E1F2)
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };

  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Khmer OS Siemreap',
    size: 9,
    bold: false,
    color: { argb: 'FF000000' },
  };

  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: headerBgColor },
  };

  const headerAlignment: Partial<ExcelJS.Alignment> = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true,
  };

  // Build Metadata text
  const departmentName =
    schoolInfo?.department ||
    `មន្ទីរអប់រំ យុវជន និងកីឡាខេត្ត${schoolInfo?.province || 'ព្រៃវែង'}`;
  const schoolName = schoolInfo?.name || 'វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង';
  const yearName = academicYear?.name || '២០២៦-២០២៧';
  const gradeLabel = isUpper ? 'ថ្នាក់ទី10-12' : 'ថ្នាក់ទី៧-៩';
  const subTitleGradeClass = classInfo.name ? `ថ្នាក់ទី ${classInfo.name}` : gradeLabel;

  if (!isUpper) {
    // ==========================================
    // GRADE 7–9 TEMPLATE (59 Columns)
    // ==========================================

    // Column widths matching sheet 'បញ្ជីឈ្មោះសិស្ស7-9'
    const colWidths = [
      6.7, 8.5, 18.0, 7.0, 13.5, 40.0, 25.0, 17.0, 13.0, 13.5, 15.5, 15.5, 8.0, 15.5, // A-N (1-14)
      11.5, 10.0, 9.0, 8.5, // O-R Address (15-18)
      14.0, 11.5, // S-T Student Phone, Indigenous (19-20)
      6.0, 7.0, 7.0, 7.0, // U-X Scholarship (21-24)
      9.0, 5.0, 4.0, // Y-AA Disability, Grade, Month (25-27)
      // AB-AU Scores (28-47) - 20 subjects
      4.0, 5.5, 4.5, 4.0, 4.5, 5.5, 4.0, 3.5, 4.0, 4.0, 4.5, 5.5, 6.5, 4.0, 5.0, 7.0, 6.5, 6.0, 5.0, 5.5,
      7.0, 6.5, // AV-AW Absences (48-49)
      8.0, // AX Elective (50)
      10.0, 10.0, // AY-AZ Poverty (51-52)
      16.5, 10.0, 10.0, 10.0, 10.0, 10.0, // BA-BF Roles (53-58)
      10.0, // BG Other (59)
    ];

    colWidths.forEach((w, idx) => {
      ws.getColumn(idx + 1).width = w;
    });

    // Row 1: Kingdom Motto
    ws.mergeCells(1, 1, 1, 25);
    const r1 = ws.getCell('A1');
    r1.value = 'ព្រះរាជាណាចក្រកម្ពុជា';
    r1.font = { name: 'Khmer OS Muol Light', size: 11, bold: true, color: { argb: 'FF000000' } };
    r1.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 2: Nation Religion King
    ws.mergeCells(2, 1, 2, 25);
    const r2 = ws.getCell('A2');
    r2.value = 'ជាតិ សាសនា ព្រះមហាក្សត្រ';
    r2.font = { name: 'Khmer OS Muol Light', size: 11, bold: true, color: { argb: 'FF000000' } };
    r2.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 3: Department
    ws.mergeCells(3, 1, 3, 5);
    const r3 = ws.getCell('A3');
    r3.value = departmentName;
    r3.font = { name: 'Khmer OS Battambang', size: 10, bold: true, color: { argb: 'FF000000' } };
    r3.alignment = { horizontal: 'left', vertical: 'middle' };

    // Row 4: School
    ws.mergeCells(4, 1, 4, 5);
    const r4 = ws.getCell('A4');
    r4.value = schoolName;
    r4.font = { name: 'Khmer OS Battambang', size: 10, bold: true, color: { argb: 'FF000000' } };
    r4.alignment = { horizontal: 'left', vertical: 'middle' };

    // Row 5: Document Title
    ws.mergeCells(5, 1, 5, 25);
    const r5 = ws.getCell('A5');
    r5.value = 'ព័ត៌មានសិស្ស';
    r5.font = { name: 'Khmer OS Muol Light', size: 12, bold: true, color: { argb: 'FF000000' } };
    r5.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 6: Subtitle with grade and year
    ws.mergeCells(6, 1, 6, 25);
    const r6 = ws.getCell('A6');
    r6.value = {
      richText: [
        { font: { name: 'Khmer OS Muol Light', size: 10, color: { argb: 'FFFF0000' } }, text: `${subTitleGradeClass} ដើម ` },
        { font: { name: 'Khmer OS Muol Light', size: 10, color: { argb: 'FF000000' } }, text: `ឆ្នាំសិក្សាៈ ${yearName}` },
      ],
    };
    r6.alignment = { horizontal: 'center', vertical: 'middle' };

    // Table Headers (Rows 7 & 8)
    const singleHeadersG7 = [
      { col: 1, text: 'ល.រ' },
      { col: 2, text: 'អត្តលេខ' },
      { col: 3, text: 'គោត្តនាម និងនាម' },
      { col: 4, text: 'ភេទ' },
      { col: 5, text: 'ថ្ងៃ ខែ ឆ្នាំ កំណើត' },
      { col: 6, text: 'ទីកន្លែងកំណើត' },
      { col: 7, text: 'មកពីសាលាបឋមសិក្សា' },
      { col: 8, text: 'មកពីសាលាមធ្យមសិក្សា' },
      { col: 9, text: 'ឈ្មោះឪពុក ' },
      { col: 10, text: 'មុខរបរ' },
      { col: 11, text: 'លេខទូសព្ទ' },
      { col: 12, text: 'ឈ្មោះម្តាយ' },
      { col: 13, text: 'មុខរបរ' },
      { col: 14, text: 'លេខទូសព្ទ' },
      { col: 19, text: 'លេខទូសព្ទសិស្ស' },
      { col: 20, text: 'ជនជាតិ / ជនជាតិដើមភាគតិច' },
      { col: 25, text: 'លក្ខណៈពិសេស (ពិការភាព)' },
      { col: 26, text: 'ថ្នាក់ទី' },
      { col: 27, text: 'ខែ' },
      { col: 50, text: 'មុខវិជ្ជាជ្រើសរើស' },
      { col: 59, text: 'ផ្សេងៗ' },
    ];

    singleHeadersG7.forEach(h => {
      ws.mergeCells(7, h.col, 8, h.col);
      const c = ws.getCell(7, h.col);
      c.value = h.text;
    });

    // Merged Top Categories G7
    const groupHeadersG7 = [
      {
        startCol: 15,
        endCol: 18,
        title: 'អាសយដ្ឋានបច្ចុប្បន្ន',
        subs: ['ភូមិ', 'ឃុំ', 'ស្រុក', 'ខេត្ត'],
      },
      {
        startCol: 21,
        endCol: 24,
        title: 'អាហារូបករណ៏',
        subs: ['គម្រោង/កម្មវិធី', 'សម្ភារៈ', 'ថវិកា', 'ផ្សេងៗ'],
      },
      {
        startCol: 28,
        endCol: 47,
        title: 'ពិន្ទុ',
        subs: SCORE_SUBJECT_HEADERS,
      },
      {
        startCol: 48,
        endCol: 49,
        title: 'អវត្តមាន',
        subs: ['មានច្បាប់', 'អត់ច្បាប់'],
      },
      {
        startCol: 51,
        endCol: 52,
        title: 'ស្ថានភាពជីវភាពគ្រួសារ',
        subs: ['ក្រ១', 'ក្រ២'],
      },
      {
        startCol: 53,
        endCol: 58,
        title: 'តួនាទីសិស្សក្នុងសាលារៀន',
        subs: ['ក្រុមប្រឹក្សាកុមារ', 'ក្រុមប្រឹក្សាយុវជន', 'កាកបាទក្រហម', 'កាយរិទ្ធិ', 'សសយក', 'ផ្សេងៗ'],
      },
    ];

    groupHeadersG7.forEach(g => {
      ws.mergeCells(7, g.startCol, 7, g.endCol);
      ws.getCell(7, g.startCol).value = g.title;
      g.subs.forEach((sub, sIdx) => {
        ws.getCell(8, g.startCol + sIdx).value = sub;
      });
    });

    // Apply Styles to Headers (Rows 7 & 8)
    for (let r = 7; r <= 8; r++) {
      const row = ws.getRow(r);
      row.height = r === 7 ? 22 : 28;
      for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c);
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.border = thinBorder;
        cell.alignment = headerAlignment;
      }
    }

    // Populate Data Rows (Starting at Row 9)
    let currentDataRow = 9;
    students.forEach((std, idx) => {
      const row = ws.getRow(currentDataRow);
      row.height = 20;

      const addr = parseKhmerAddressParts(std.current_address || std.address);
      const genderText = std.gender === 'F' || std.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស';

      // Poverty checks
      const isPoor1 = std.id_poor === 'level_1' || std.family_condition?.includes('កម្រិត ១');
      const isPoor2 = std.id_poor === 'level_2' || std.family_condition?.includes('កម្រិត ២');

      // Scholarship check
      const hasScholarship = std.scholarship === 'yes' || (std.scholarship_status && std.scholarship_status !== 'none');

      // Values array for 59 columns
      const rowValues: any[] = new Array(totalCols).fill('');

      rowValues[0] = idx + 1; // A: ល.រ
      rowValues[1] = std.student_id_number || ''; // B: អត្តលេខ
      rowValues[2] = std.full_name || ''; // C: គោត្តនាម និងនាម
      rowValues[3] = genderText; // D: ភេទ
      rowValues[4] = std.date_of_birth || std.dob || ''; // E: ថ្ងៃ ខែ ឆ្នាំ កំណើត
      rowValues[5] = std.pob || ''; // F: ទីកន្លែងកំណើត
      rowValues[6] = std.prev_school || ''; // G: មកពីសាលាបឋមសិក្សា
      rowValues[7] = ''; // H: មកពីសាលាមធ្យមសិក្សា (typically blank for G7)
      rowValues[8] = std.father_name || ''; // I: ឈ្មោះឪពុក
      rowValues[9] = std.father_job || ''; // J: មុខរបរ
      rowValues[10] = std.father_phone || ''; // K: លេខទូសព្ទ
      rowValues[11] = std.mother_name || ''; // L: ឈ្មោះម្តាយ
      rowValues[12] = std.mother_job || ''; // M: មុខរបរ
      rowValues[13] = std.mother_phone || ''; // N: លេខទូសព្ទ
      rowValues[14] = addr.village; // O: ភូមិ
      rowValues[15] = addr.commune; // P: ឃុំ
      rowValues[16] = addr.district; // Q: ស្រុក
      rowValues[17] = addr.province; // R: ខេត្ត
      rowValues[18] = std.student_phone || ''; // S: លេខទូសព្ទសិស្ស
      rowValues[19] = std.indigenous === 'yes' ? 'បាទ/ចាស' : std.indigenous || ''; // T: ជនជាតិ
      rowValues[20] = hasScholarship ? '✔' : ''; // U: អាហារូបករណ៏ - គម្រោង
      rowValues[21] = ''; // V: សម្ភារៈ
      rowValues[22] = ''; // W: ថវិកា
      rowValues[23] = ''; // X: ផ្សេងៗ
      rowValues[24] = std.disability && std.disability !== 'none' ? (std.assistive_device || std.disability) : ''; // Y: ពិការភាព
      rowValues[25] = classInfo.name || ''; // Z: ថ្នាក់ទី
      rowValues[26] = ''; // AA: ខែ
      // AB-AU (Cols 28-47) remain empty for score entry
      // AV-AW (Cols 48-49) remain empty for absence entry
      rowValues[49] = std.elective_subject || ''; // AX: មុខវិជ្ជាជ្រើសរើស
      rowValues[50] = isPoor1 ? '✔' : ''; // AY: ក្រ១
      rowValues[51] = isPoor2 ? '✔' : ''; // AZ: ក្រ២
      // BA-BF (Cols 53-58) Student roles
      rowValues[58] = std.notes || std.health_issues || ''; // BG: ផ្សេងៗ

      // Write values & apply styling
      for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c);
        cell.value = rowValues[c - 1];
        cell.border = thinBorder;
        cell.font = {
          name: c === 3 ? 'Khmer OS Battambang' : 'Khmer OS Siemreap',
          size: c === 3 ? 10 : 9,
          color: { argb: 'FF000000' },
        };
        // Alignment: Center for numbers, IDs, gender, dates; Left for names and addresses
        if ([1, 2, 4, 5, 11, 14, 19, 21, 22, 23, 24, 25, 26, 27, 51, 52].includes(c)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }

      currentDataRow++;
    });

  } else {
    // ==========================================
    // GRADE 10–12 TEMPLATE (62 Columns)
    // ==========================================

    // Column widths matching sheet 'បញ្ជីឈ្មោះសិស្ស 10-12'
    const colWidths10 = [
      5.5, 9.0, 18.0, 6.0, 13.5, 33.0, 20.0, // A-G (1-7)
      8.0, 8.0, 10.0, 27.0, // H-K Lower Secondary Exam (8-11: Room, Desk, Grade, Secondary School)
      13.0, 10.0, 16.0, // L-N Father (12-14)
      14.0, 10.0, 14.0, // O-Q Mother (15-17)
      13.0, 11.0, 9.0, 9.0, // R-U Address (18-21)
      15.5, 20.0, // V-W Student Phone, Indigenous (22-23)
      6.0, 7.5, 7.0, 8.0, // X-AA Scholarship (24-27)
      9.0, 5.0, 4.0, // AB-AD Disability, Grade, Month (28-30)
      // AE-AX Scores (31-50) - 20 subjects
      4.0, 5.5, 4.5, 4.0, 4.5, 5.5, 4.0, 3.5, 4.0, 4.0, 4.5, 5.5, 6.5, 4.0, 5.0, 7.0, 6.5, 6.0, 5.0, 5.5,
      7.0, 6.5, // AY-AZ Absences (51-52)
      12.0, // BA Elective (53)
      14.0, 10.0, // BB-BC Poverty (54-55)
      14.0, 16.0, 10.5, 9.5, 9.5, 9.5, // BD-BI Roles (56-61)
      9.5, // BJ Other (62)
    ];

    colWidths10.forEach((w, idx) => {
      ws.getColumn(idx + 1).width = w;
    });

    // Row 1: Kingdom Motto
    ws.mergeCells(1, 1, 1, 28);
    const r1 = ws.getCell('A1');
    r1.value = 'ព្រះរាជាណាចក្រកម្ពុជា';
    r1.font = { name: 'Khmer OS Muol Light', size: 11, bold: true, color: { argb: 'FF000000' } };
    r1.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 2: Nation Religion King
    ws.mergeCells(2, 1, 2, 28);
    const r2 = ws.getCell('A2');
    r2.value = 'ជាតិ សាសនា ព្រះមហាក្សត្រ';
    r2.font = { name: 'Khmer OS Muol Light', size: 11, bold: true, color: { argb: 'FF000000' } };
    r2.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 3: Department
    ws.mergeCells(3, 1, 3, 5);
    const r3 = ws.getCell('A3');
    r3.value = departmentName;
    r3.font = { name: 'Khmer OS Battambang', size: 10, bold: true, color: { argb: 'FF000000' } };
    r3.alignment = { horizontal: 'left', vertical: 'middle' };

    // Row 4: School
    ws.mergeCells(4, 1, 4, 5);
    const r4 = ws.getCell('A4');
    r4.value = schoolName;
    r4.font = { name: 'Khmer OS Battambang', size: 10, bold: true, color: { argb: 'FF000000' } };
    r4.alignment = { horizontal: 'left', vertical: 'middle' };

    // Row 5: Blank spacer
    ws.getRow(5).height = 10;

    // Row 6: Document Title
    ws.mergeCells(6, 1, 6, 28);
    const r6 = ws.getCell('A6');
    r6.value = 'ព័ត៌មានសិស្ស';
    r6.font = { name: 'Khmer OS Muol Light', size: 12, bold: true, color: { argb: 'FF000000' } };
    r6.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 7: Subtitle
    ws.mergeCells(7, 1, 7, 28);
    const r7 = ws.getCell('A7');
    r7.value = {
      richText: [
        { font: { name: 'Khmer OS Muol Light', size: 10, color: { argb: 'FFFF0000' } }, text: `${subTitleGradeClass} ដើម ` },
        { font: { name: 'Khmer OS Muol Light', size: 10, color: { argb: 'FF000000' } }, text: `ឆ្នាំសិក្សាៈ ${yearName}` },
      ],
    };
    r7.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 8 & 9: Spacer to align headers at Row 10
    ws.getRow(8).height = 8;
    ws.getRow(9).height = 8;

    // Table Headers (Rows 10 & 11)
    const singleHeadersG10 = [
      { col: 1, text: 'ល.រ' },
      { col: 2, text: 'អត្តលេខ' },
      { col: 3, text: 'គោត្តនាម និងនាម' },
      { col: 4, text: 'ភេទ' },
      { col: 5, text: 'ថ្ងៃ ខែ ឆ្នាំ កំណើត' },
      { col: 6, text: 'ទីកន្លែងកំណើត' },
      { col: 7, text: 'មកពីសាលាបឋមសិក្សា' },
      { col: 12, text: 'ឈ្មោះឪពុក ' },
      { col: 13, text: 'មុខរបរ' },
      { col: 14, text: 'លេខទូសព្ទ' },
      { col: 15, text: 'ឈ្មោះម្តាយ' },
      { col: 16, text: 'មុខរបរ' },
      { col: 17, text: 'លេខទូសព្ទ' },
      { col: 22, text: 'លេខទូសព្ទសិស្ស' },
      { col: 23, text: 'ជនជាតិ / ជនជាតិដើមភាគតិច' },
      { col: 28, text: 'លក្ខណៈពិសេស (ពិការភាព)' },
      { col: 29, text: 'ថ្នាក់ទី' },
      { col: 30, text: 'ខែ' },
      { col: 53, text: 'មុខវិជ្ជាជ្រើសរើស' },
      { col: 62, text: 'ផ្សេងៗ' },
    ];

    singleHeadersG10.forEach(h => {
      ws.mergeCells(10, h.col, 11, h.col);
      ws.getCell(10, h.col).value = h.text;
    });

    // Merged Top Categories G10
    const groupHeadersG10 = [
      {
        startCol: 8,
        endCol: 11,
        title: 'ប្រឡងសញ្ញាបត្រមធ្យមសិក្សាបឋមភូមិ',
        subs: ['លេខបន្ទប់', 'លេខតុ', 'និទ្ទេស', 'មកពីសាលាមធ្យមសិក្សា'],
      },
      {
        startCol: 18,
        endCol: 21,
        title: 'អាសយដ្ឋានបច្ចុប្បន្ន',
        subs: ['ភូមិ', 'ឃុំ', 'ស្រុក', 'ខេត្ត'],
      },
      {
        startCol: 24,
        endCol: 27,
        title: 'អាហារូបករណ៏',
        subs: ['គម្រោង/កម្មវិធី', 'សម្ភារៈ', 'ថវិកា', 'ផ្សេងៗ'],
      },
      {
        startCol: 31,
        endCol: 50,
        title: 'ពិន្ទុ',
        subs: SCORE_SUBJECT_HEADERS,
      },
      {
        startCol: 51,
        endCol: 52,
        title: 'អវត្តមាន',
        subs: ['មានច្បាប់', 'អត់ច្បាប់'],
      },
      {
        startCol: 54,
        endCol: 55,
        title: 'ស្ថានភាពជីវភាពគ្រួសារ',
        subs: ['ក្រ១', 'ក្រ២'],
      },
      {
        startCol: 56,
        endCol: 61,
        title: 'តួនាទីសិស្សក្នុងសាលារៀន',
        subs: ['ក្រុមប្រឹក្សាកុមារ', 'ក្រុមប្រឹក្សាយុវជន', 'កាកបាទក្រហម', 'កាយរិទ្ធិ', 'សសយក', 'ផ្សេងៗ'],
      },
    ];

    groupHeadersG10.forEach(g => {
      ws.mergeCells(10, g.startCol, 10, g.endCol);
      ws.getCell(10, g.startCol).value = g.title;
      g.subs.forEach((sub, sIdx) => {
        ws.getCell(11, g.startCol + sIdx).value = sub;
      });
    });

    // Apply Styles to Headers (Rows 10 & 11)
    for (let r = 10; r <= 11; r++) {
      const row = ws.getRow(r);
      row.height = r === 10 ? 22 : 28;
      for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c);
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.border = thinBorder;
        cell.alignment = headerAlignment;
      }
    }

    // Populate Data Rows (Starting at Row 12)
    let currentDataRow = 12;
    students.forEach((std, idx) => {
      const row = ws.getRow(currentDataRow);
      row.height = 20;

      const addr = parseKhmerAddressParts(std.current_address || std.address);
      const genderText = std.gender === 'F' || std.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស';

      const isPoor1 = std.id_poor === 'level_1' || std.family_condition?.includes('កម្រិត ១');
      const isPoor2 = std.id_poor === 'level_2' || std.family_condition?.includes('កម្រិត ២');
      const hasScholarship = std.scholarship === 'yes' || (std.scholarship_status && std.scholarship_status !== 'none');

      const rowValues: any[] = new Array(totalCols).fill('');

      rowValues[0] = idx + 1; // A: ល.រ
      rowValues[1] = std.student_id_number || ''; // B: អត្តលេខ
      rowValues[2] = std.full_name || ''; // C: គោត្តនាម និងនាម
      rowValues[3] = genderText; // D: ភេទ
      rowValues[4] = std.date_of_birth || std.dob || ''; // E: ថ្ងៃ ខែ ឆ្នាំ កំណើត
      rowValues[5] = std.pob || ''; // F: ទីកន្លែងកំណើត
      rowValues[6] = std.prev_school || ''; // G: មកពីសាលាបឋមសិក្សា
      // H-K: ប្រឡងសញ្ញាបត្រមធ្យមសិក្សាបឋមភូមិ
      rowValues[7] = std.room_number || ''; // H: លេខបន្ទប់
      rowValues[8] = std.desk_number || ''; // I: លេខតុ
      rowValues[9] = std.exam_grade || ''; // J: និទ្ទេស
      rowValues[10] = std.prev_school || ''; // K: មកពីសាលាមធ្យមសិក្សា
      rowValues[11] = std.father_name || ''; // L: ឈ្មោះឪពុក
      rowValues[12] = std.father_job || ''; // M: មុខរបរ
      rowValues[13] = std.father_phone || ''; // N: លេខទូសព្ទ
      rowValues[14] = std.mother_name || ''; // O: ឈ្មោះម្តាយ
      rowValues[15] = std.mother_job || ''; // P: មុខរបរ
      rowValues[16] = std.mother_phone || ''; // Q: លេខទូសព្ទ
      rowValues[17] = addr.village; // R: ភូមិ
      rowValues[18] = addr.commune; // S: ឃុំ
      rowValues[19] = addr.district; // T: ស្រុក
      rowValues[20] = addr.province; // U: ខេត្ត
      rowValues[21] = std.student_phone || ''; // V: លេខទូសព្ទសិស្ស
      rowValues[22] = std.indigenous === 'yes' ? 'បាទ/ចាស' : std.indigenous || ''; // W: ជនជាតិ
      rowValues[23] = hasScholarship ? '✔' : ''; // X: អាហារូបករណ៏ - គម្រោង
      rowValues[24] = ''; // Y: សម្ភារៈ
      rowValues[25] = ''; // Z: ថវិកា
      rowValues[26] = ''; // AA: ផ្សេងៗ
      rowValues[27] = std.disability && std.disability !== 'none' ? (std.assistive_device || std.disability) : ''; // AB: ពិការភាព
      rowValues[28] = classInfo.name || ''; // AC: ថ្នាក់ទី
      rowValues[29] = ''; // AD: ខែ
      // AE-AX (Cols 31-50) remain empty for score entry
      // AY-AZ (Cols 51-52) remain empty for absence entry
      rowValues[52] = std.elective_subject || ''; // BA: មុខវិជ្ជាជ្រើសរើស
      rowValues[53] = isPoor1 ? '✔' : ''; // BB: ក្រ១
      rowValues[54] = isPoor2 ? '✔' : ''; // BC: ក្រ២
      // BD-BI (Cols 56-61) Student roles
      rowValues[61] = std.notes || std.health_issues || ''; // BJ: ផ្សេងៗ

      for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c);
        cell.value = rowValues[c - 1];
        cell.border = thinBorder;
        cell.font = {
          name: c === 3 ? 'Khmer OS Battambang' : 'Khmer OS Siemreap',
          size: c === 3 ? 10 : 9,
          color: { argb: 'FF000000' },
        };
        if ([1, 2, 4, 5, 8, 9, 10, 14, 17, 22, 24, 25, 26, 27, 28, 29, 30, 54, 55].includes(c)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }

      currentDataRow++;
    });
  }

  return workbook;
}
