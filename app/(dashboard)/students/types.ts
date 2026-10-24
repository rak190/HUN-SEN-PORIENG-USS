export interface MassiveProfilingStudent {
  id: string;
  class_id?: string;
  // Tab 1: Basic
  student_id_number: string;
  desk_number?: string;
  room_number?: string;
  full_name: string;
  english_name?: string;
  photo_url?: string;
  gender: string;
  date_of_birth?: string;
  dob?: string;
  age?: number;
  birth_cert_no?: string;
  student_phone?: string;
  parent_phone?: string;
  // Tab 2: Academic
  status: 'new' | 'repeater' | 'transfer';
  prev_school?: string;
  scholarship?: 'yes' | 'no';
  id_poor?: 'none' | 'level_1' | 'level_2';
  orphan?: 'yes' | 'no';
  indigenous?: 'yes' | 'no';
  distance_km?: number;
  // Tab 3: Health
  weight_kg?: number;
  height_m?: number;
  bmi?: number;
  nutrition_status?: string;
  disability?: 'none' | 'mild' | 'severe';
  assistive_device?: string;
  health_issues?: string;
  // Tab 4: Family
  father_name?: string; father_job?: string; father_phone?: string;
  mother_name?: string; mother_job?: string; mother_phone?: string;
  guardian_name?: string; guardian_job?: string; guardian_phone?: string;
  siblings_count?: number;
  migrant_status?: 'none' | 'parents' | 'student';
  domestic_violence?: 'yes' | 'no';
  housing?: string;
  income?: number;
  // Tab 5: Address & Status
  address?: string;
  current_status: 'active' | 'dropout' | 'deceased' | 'transfer';
  // Risk & Class tracking (from Mockup)
  risk_level?: 'low' | 'medium' | 'high';
  attendance_rate?: number;
}

export const DEFAULT_FORM: Partial<MassiveProfilingStudent> = {
  gender: undefined, status: 'new', prev_school: '', scholarship: undefined, id_poor: undefined, orphan: undefined, indigenous: undefined, distance_km: 0,
  weight_kg: undefined, height_m: undefined, disability: undefined, assistive_device: '', health_issues: '',
  siblings_count: 0, migrant_status: 'none', domestic_violence: undefined, housing: '', income: 0, current_status: 'active',
  risk_level: 'low', attendance_rate: 100
};

export function calculateProfileCompleteness(student: Partial<MassiveProfilingStudent>): number {
  const fieldsToCheck = [
    'date_of_birth', 'birth_cert_no', 'student_phone', 'prev_school',
    'weight_kg', 'height_m', 'disability', 'father_name', 'father_phone',
    'mother_name', 'mother_phone', 'guardian_name', 'guardian_phone', 'address'
  ];
  let filled = 0;
  for (const field of fieldsToCheck) {
    const val = (student as any)[field];
    if (val !== undefined && val !== null && val !== '' && val !== 'none') {
      filled++;
    }
  }
  return Math.round((filled / fieldsToCheck.length) * 100);
}

export interface BatchStudentUpdateItem {
  id: string;
  desk_number?: string;
  room_number?: string;
  full_name?: string;
  english_name?: string;
  gender?: string;
  date_of_birth?: string;
  birth_cert_no?: string;
  student_phone?: string;
  status?: 'new' | 'repeater' | 'transfer';
  prev_school?: string;
  scholarship?: 'yes' | 'no';
  id_poor?: 'none' | 'level_1' | 'level_2';
  orphan?: 'yes' | 'no';
  distance_km?: number;
  weight_kg?: number;
  height_m?: number;
  disability?: 'none' | 'mild' | 'severe';
  health_issues?: string;
  father_name?: string;
  father_job?: string;
  father_phone?: string;
  mother_name?: string;
  mother_job?: string;
  mother_phone?: string;
  guardian_name?: string;
  guardian_job?: string;
  guardian_phone?: string;
  siblings_count?: number;
  income?: number;
  address?: string;
  migrant_status?: 'none' | 'parents' | 'student';
  housing?: string;
}

export function normalizeKhmerDigits(val: string): string {
  if (!val) return '';
  const khmerNums: Record<string, string> = {
    '០': '0', '១': '1', '២': '2', '៣': '3', '៤': '4',
    '៥': '5', '៦': '6', '៧': '7', '៨': '8', '៩': '9'
  };
  return val.replace(/[០-៩]/g, m => khmerNums[m]);
}

export function normalizePastedCell(field: string, rawVal: any): any {
  if (rawVal === undefined || rawVal === null) return undefined;
  const strVal = typeof rawVal === 'string' ? rawVal.trim() : String(rawVal).trim();
  if (strVal === '') return undefined;
  let str = normalizeKhmerDigits(strVal);

  // 1. Date of birth normalization
  if (field === 'date_of_birth' || field === 'dob') {
    // Handle Excel serial date numbers (e.g. 39553 -> 2008-04-15)
    const numDate = Number(str);
    if (!isNaN(numDate) && numDate > 25000 && numDate < 65000) {
      const dateObj = new Date((numDate - 25569) * 86400 * 1000);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0];
      }
    }
    // Match DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const [_, d, m, y] = dmyMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // Match YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    return str;
  }

  // 2. Gender normalization
  if (field === 'gender') {
    const lower = str.toLowerCase();
    if (['f', 'female', 'ស្រី', 'ស'].includes(lower)) return 'F';
    if (['m', 'male', 'ប្រុស', 'ប'].includes(lower)) return 'M';
    if (str === 'F' || str === 'ស្រី') return 'F';
    if (str === 'M' || str === 'ប្រុស') return 'M';
    return undefined;
  }

  // 3. Health Height & Weight
  if (field === 'height_m') {
    const num = parseFloat(str);
    if (isNaN(num) || num <= 0) return undefined;
    // If entered in cm (e.g. 155), convert to meters (1.55)
    return num > 3 ? parseFloat((num / 100).toFixed(2)) : parseFloat(num.toFixed(2));
  }
  if (field === 'weight_kg') {
    const num = parseFloat(str);
    return isNaN(num) || num <= 0 ? undefined : Math.round(num);
  }

  // 4. Academic Status
  if (field === 'status') {
    if (str.includes('ត្រួត') || str.toLowerCase().includes('repeat')) return 'repeater';
    if (str.includes('ផ្ទេរ') || str.toLowerCase().includes('transfer')) return 'transfer';
    return 'new';
  }

  // 5. Poverty ID Poor
  if (field === 'id_poor') {
    const lower = str.toLowerCase();
    if (str.includes('គ្មាន') || lower === 'none' || str === '-' || str === '0') return 'none';
    if (str.includes('1') || str.includes('១') || lower.includes('level_1') || lower.includes('level 1')) return 'level_1';
    if (str.includes('2') || str.includes('២') || lower.includes('level_2') || lower.includes('level 2')) return 'level_2';
    return undefined;
  }

  // 6. Scholarship
  if (field === 'scholarship') {
    const lower = str.toLowerCase();
    if (str.includes('គ្មាន') || lower === 'no' || str === '0' || str === '-') return 'no';
    if (str.includes('មាន') || lower === 'yes' || str === '1') return 'yes';
    return undefined;
  }

  // 7. Disability
  if (field === 'disability') {
    const lower = str.toLowerCase();
    if (str.includes('គ្មាន') || lower === 'none' || str === '-' || str === '0') return 'none';
    if (str.includes('ធ្ងន់') || lower.includes('severe')) return 'severe';
    if (str.includes('ស្រាល') || str.includes('មាន') || lower.includes('mild')) return 'mild';
    return undefined;
  }

  // 8. Yes/No Fields: Orphan, Domestic Violence, Indigenous
  if (['orphan', 'domestic_violence', 'indigenous'].includes(field)) {
    const lower = str.toLowerCase();
    if (str.includes('គ្មាន') || str.includes('ទេ') || lower === 'no' || str === '0' || str === '-') return 'no';
    if (str.includes('មាន') || str.includes('បាទ') || str.includes('ចាស') || lower === 'yes' || str === '1') return 'yes';
    return undefined;
  }

  // 9. Numbers
  if (['distance_km', 'income', 'siblings_count', 'age'].includes(field)) {
    const num = parseFloat(str.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? undefined : num;
  }

  // 10. Phone Numbers
  if (['student_phone', 'father_phone', 'mother_phone', 'guardian_phone'].includes(field)) {
    const cleaned = str.replace(/[^0-9+]/g, '');
    return cleaned || undefined;
  }

  return str;
}

export function formatKhmerAddress(village?: string, commune?: string, district?: string, province?: string): string {
  const parts: string[] = [];
  if (village?.trim()) {
    const v = village.trim();
    parts.push(v.startsWith('ភូមិ') ? v : `ភូមិ${v}`);
  }
  if (commune?.trim()) {
    const c = commune.trim();
    parts.push(c.startsWith('ឃុំ') || c.startsWith('សង្កាត់') ? c : `ឃុំ${c}`);
  }
  if (district?.trim()) {
    const d = district.trim();
    parts.push(d.startsWith('ស្រុក') || d.startsWith('ក្រុង') || d.startsWith('ខណ្ឌ') ? d : `ស្រុក${d}`);
  }
  if (province?.trim()) {
    const p = province.trim();
    parts.push(p.startsWith('ខេត្ត') || p.startsWith('រាជធានី') ? p : `ខេត្ត${p}`);
  }
  return parts.join(' ');
}

export type OfficialTemplateType = '7-9' | '10-12';

export interface ParsedOfficialExcelCandidate {
  rawIndex: number;
  student_id_number?: string;
  full_name?: string;
  gender?: string;
  date_of_birth?: string;
  pob?: string;
  room_number?: string;
  desk_number?: string;
  prev_school?: string;
  father_name?: string;
  father_job?: string;
  father_phone?: string;
  mother_name?: string;
  mother_job?: string;
  mother_phone?: string;
  address?: string;
  student_phone?: string;
  indigenous?: 'yes' | 'no';
  scholarship?: 'yes' | 'no';
  disability?: 'none' | 'mild' | 'severe';
  id_poor?: 'none' | 'level_1' | 'level_2';
}

/**
 * Parses a single row copied from official Ministry Excel template (Worksheet A or B)
 */
export function parseOfficialExcelRow(
  template: OfficialTemplateType,
  cells: string[],
  rawIndex: number
): ParsedOfficialExcelCandidate {
  const safeCell = (idx: number) => (cells[idx] !== undefined ? cells[idx].trim() : '');

  // Common identity indices
  const idNum = normalizeKhmerDigits(safeCell(1)); // Col B
  const fullName = safeCell(2); // Col C
  const gender = normalizePastedCell('gender', safeCell(3)); // Col D
  const dob = normalizePastedCell('date_of_birth', safeCell(4)); // Col E
  const pob = safeCell(5); // Col F

  if (template === '10-12') {
    // Upper Secondary (Worksheet B)
    const prevPrimary = safeCell(6); // Col G
    const roomNumber = safeCell(7); // Col H (បន្ទប់)
    const deskNumber = safeCell(8); // Col I (លេខតុ)
    const prevSecondary = safeCell(10); // Col K
    const fatherName = safeCell(11); // Col L
    const fatherJob = safeCell(12); // Col M
    const fatherPhone = normalizePastedCell('father_phone', safeCell(13)); // Col N
    const motherName = safeCell(14); // Col O
    const motherJob = safeCell(15); // Col P
    const motherPhone = normalizePastedCell('mother_phone', safeCell(16)); // Col Q
    const village = safeCell(17); // Col R
    const commune = safeCell(18); // Col S
    const district = safeCell(19); // Col T
    const province = safeCell(20); // Col U
    const studentPhone = normalizePastedCell('student_phone', safeCell(21)); // Col V
    const indigenous = safeCell(22) ? (normalizePastedCell('indigenous', safeCell(22)) as any) : undefined; // Col W

    // Scholarship across cols X-AA (indices 23, 24, 25, 26)
    const scholarshipCells = [safeCell(23), safeCell(24), safeCell(25), safeCell(26)].filter(Boolean);
    let scholarship: 'yes' | 'no' | undefined = undefined;
    if (scholarshipCells.length > 0) {
      if (scholarshipCells.some(v => v !== 'គ្មាន' && v !== '-' && v !== '0')) {
        scholarship = 'yes';
      } else if (scholarshipCells.every(v => v === 'គ្មាន' || v === '-' || v === '0')) {
        scholarship = 'no';
      }
    }

    // Disability at Col AB (index 27)
    const disabilityRaw = safeCell(27);
    const disability = disabilityRaw ? (normalizePastedCell('disability', disabilityRaw) as any) : undefined;

    // ID Poor: Col BB is ក្រ១ (index 53), Col BC is ក្រ២ (index 54)
    const poor1 = safeCell(53);
    const poor2 = safeCell(54);
    let idPoor: 'none' | 'level_1' | 'level_2' | undefined = undefined;
    if (poor1 && poor1 !== '-' && poor1 !== '0' && poor1 !== 'គ្មាន') {
      idPoor = 'level_1';
    } else if (poor2 && poor2 !== '-' && poor2 !== '0' && poor2 !== 'គ្មាន') {
      idPoor = 'level_2';
    } else if ((poor1 === 'គ្មាន' || poor1 === '-') || (poor2 === 'គ្មាន' || poor2 === '-')) {
      idPoor = 'none';
    }

    const address = formatKhmerAddress(village, commune, district, province);

    return {
      rawIndex,
      student_id_number: idNum || undefined,
      full_name: fullName || undefined,
      gender: gender || undefined,
      date_of_birth: dob || undefined,
      pob: pob || undefined,
      room_number: roomNumber || undefined,
      desk_number: deskNumber || undefined,
      prev_school: [prevPrimary, prevSecondary].filter(Boolean).join(', ') || undefined,
      father_name: fatherName || undefined,
      father_job: fatherJob || undefined,
      father_phone: fatherPhone || undefined,
      mother_name: motherName || undefined,
      mother_job: motherJob || undefined,
      mother_phone: motherPhone || undefined,
      address: address || undefined,
      student_phone: studentPhone || undefined,
      indigenous,
      scholarship,
      disability,
      id_poor: idPoor,
    };
  }

  // Lower Secondary (Worksheet A: Grades 7-9)
  const prevPrimary = safeCell(6); // Col G
  const prevSecondary = safeCell(7); // Col H
  const fatherName = safeCell(8); // Col I
  const fatherJob = safeCell(9); // Col J
  const fatherPhone = normalizePastedCell('father_phone', safeCell(10)); // Col K
  const motherName = safeCell(11); // Col L
  const motherJob = safeCell(12); // Col M
  const motherPhone = normalizePastedCell('mother_phone', safeCell(13)); // Col N
  const village = safeCell(14); // Col O
  const commune = safeCell(15); // Col P
  const district = safeCell(16); // Col Q
  const province = safeCell(17); // Col R
  const studentPhone = normalizePastedCell('student_phone', safeCell(18)); // Col S
  const indigenous = safeCell(19) ? (normalizePastedCell('indigenous', safeCell(19)) as any) : undefined; // Col T

  // Scholarship across cols U-X (indices 20, 21, 22, 23)
  const scholarshipCells = [safeCell(20), safeCell(21), safeCell(22), safeCell(23)].filter(Boolean);
  let scholarship: 'yes' | 'no' | undefined = undefined;
  if (scholarshipCells.length > 0) {
    if (scholarshipCells.some(v => v !== 'គ្មាន' && v !== '-' && v !== '0')) {
      scholarship = 'yes';
    } else if (scholarshipCells.every(v => v === 'គ្មាន' || v === '-' || v === '0')) {
      scholarship = 'no';
    }
  }

  // Disability at Col Y (index 24)
  const disabilityRaw = safeCell(24);
  const disability = disabilityRaw ? (normalizePastedCell('disability', disabilityRaw) as any) : undefined;

  // ID Poor: Col AY is ក្រ១ (index 50), Col AZ is ក្រ២ (index 51)
  const poor1 = safeCell(50);
  const poor2 = safeCell(51);
  let idPoor: 'none' | 'level_1' | 'level_2' | undefined = undefined;
  if (poor1 && poor1 !== '-' && poor1 !== '0' && poor1 !== 'គ្មាន') {
    idPoor = 'level_1';
  } else if (poor2 && poor2 !== '-' && poor2 !== '0' && poor2 !== 'គ្មាន') {
    idPoor = 'level_2';
  } else if ((poor1 === 'គ្មាន' || poor1 === '-') || (poor2 === 'គ្មាន' || poor2 === '-')) {
    idPoor = 'none';
  }

  const address = formatKhmerAddress(village, commune, district, province);

  return {
    rawIndex,
    student_id_number: idNum || undefined,
    full_name: fullName || undefined,
    gender: gender || undefined,
    date_of_birth: dob || undefined,
    pob: pob || undefined,
    prev_school: [prevPrimary, prevSecondary].filter(Boolean).join(', ') || undefined,
    father_name: fatherName || undefined,
    father_job: fatherJob || undefined,
    father_phone: fatherPhone || undefined,
    mother_name: motherName || undefined,
    mother_job: motherJob || undefined,
    mother_phone: motherPhone || undefined,
    address: address || undefined,
    student_phone: studentPhone || undefined,
    indigenous,
    scholarship,
    disability,
    id_poor: idPoor,
  };
}


