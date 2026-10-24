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
  age?: number;
  birth_cert_no?: string;
  student_phone?: string;
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
  gender: 'M', status: 'new', prev_school: '', scholarship: 'no', id_poor: 'none', orphan: 'no', indigenous: 'no', distance_km: 0,
  weight_kg: 40, height_m: 1.50, disability: 'none', assistive_device: '', health_issues: '',
  siblings_count: 0, migrant_status: 'none', domestic_violence: 'no', housing: '', income: 0, current_status: 'active',
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

export function normalizePastedCell(field: string, rawVal: string): any {
  if (rawVal === undefined || rawVal === null) return '';
  let str = normalizeKhmerDigits(rawVal.trim());

  // 1. Date of birth normalization
  if (field === 'date_of_birth' || field === 'dob') {
    if (!str) return '';
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
    return str === 'F' || str === 'ស្រី' ? 'F' : 'M';
  }

  // 3. Health Height & Weight
  if (field === 'height_m') {
    const num = parseFloat(str);
    if (isNaN(num) || num <= 0) return null;
    // If entered in cm (e.g. 155), convert to meters (1.55)
    return num > 3 ? parseFloat((num / 100).toFixed(2)) : parseFloat(num.toFixed(2));
  }
  if (field === 'weight_kg') {
    const num = parseFloat(str);
    return isNaN(num) || num <= 0 ? null : Math.round(num);
  }

  // 4. Academic Status
  if (field === 'status') {
    if (str.includes('ត្រួត') || str.toLowerCase().includes('repeat')) return 'repeater';
    if (str.includes('ផ្ទេរ') || str.toLowerCase().includes('transfer')) return 'transfer';
    return 'new';
  }

  // 5. Poverty ID Poor
  if (field === 'id_poor') {
    if (str.includes('គ្មាន') || str.toLowerCase().includes('none') || str === '-') return 'none';
    if (str.includes('1') || str.includes('១')) return 'level_1';
    if (str.includes('2') || str.includes('២')) return 'level_2';
    return str as any;
  }

  // 6. Scholarship
  if (field === 'scholarship') {
    if (str.includes('គ្មាន') || str.toLowerCase() === 'no' || str === '0' || str === '-') return 'no';
    if (str.includes('មាន') || str.toLowerCase() === 'yes' || str === '1') return 'yes';
    return 'no';
  }

  // 7. Disability
  if (field === 'disability') {
    if (str.includes('គ្មាន') || str.toLowerCase().includes('none') || str === '-') return 'none';
    if (str.includes('ធ្ងន់') || str.toLowerCase().includes('severe')) return 'severe';
    if (str.includes('ស្រាល') || str.includes('មាន') || str.toLowerCase().includes('mild')) return 'mild';
    return 'none';
  }

  // 8. Yes/No Fields: Orphan, Domestic Violence, Indigenous
  if (['orphan', 'domestic_violence', 'indigenous'].includes(field)) {
    if (str.includes('គ្មាន') || str.includes('ទេ') || str.toLowerCase() === 'no' || str === '0') return 'no';
    if (str.includes('មាន') || str.includes('បាទ') || str.includes('ចាស') || str.toLowerCase() === 'yes' || str === '1') return 'yes';
    return 'no';
  }

  // 8. Numbers
  if (['distance_km', 'income', 'siblings_count', 'age'].includes(field)) {
    const num = parseFloat(str.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  }

  // 9. Phone Numbers
  if (['student_phone', 'father_phone', 'mother_phone', 'guardian_phone'].includes(field)) {
    return str.replace(/[^0-9+]/g, '');
  }

  return str;
}


