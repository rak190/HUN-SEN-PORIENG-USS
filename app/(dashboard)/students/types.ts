export interface MassiveProfilingStudent {
  id: string;
  class_id?: string;
  // Tab 1: Basic
  student_id_number: string;
  desk_number?: string;
  room_number?: string;
  full_name: string;
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
