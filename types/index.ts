/**
 * System Roles (strictly 3 roles):
 * - 'teacher': គ្រូបន្ទុកថ្នាក់ (Homeroom Teacher)
 * - 'principal': នាយកសាលា (Principal)
 * - 'admin': អ្នកគ្រប់គ្រងប្រព័ន្ធ (System Administrator)
 * - 'monitor': ប្រធានថ្នាក់ (Class Monitor)
 */
export type UserRole = 'teacher' | 'principal' | 'admin' | 'monitor';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  school_id: string;
  school_code: string;
  created_at: string;
}

export interface School {
  id: string;
  name: string;
  code: string;
  principal_id?: string | null;
  created_at: string;
}

export interface Subject {
  id: string;
  label: string;
}

export interface Classroom {
  id: string;
  school_id: string;
  teacher_id?: string | null;
  name: string;
  grade: string;
  subjects: Subject[];
  created_at: string;
}

export interface HomeVisit {
  id: string;
  student_id: string;
  date: string;
  reason: string;
  parent_name: string;
  contract_notes: string;
  photo_url?: string;
  status: 'pending' | 'submitted';
}

export interface Student {
  id: string;
  class_id: string | null;
  student_id_number: string | null;
  full_name: string;
  gender: string | null;
  date_of_birth?: string | null;
  status?: 'new' | 'repeater' | 'transfer';
  disability?: 'none' | 'mild' | 'severe';
  distance_km?: number | null;
  id_poor?: 'none' | 'level_1' | 'level_2';
  parent_phone?: string | null;
  health_info?: string | null;
  is_active: boolean | null;
  is_slow_learner?: boolean;
  created_at?: string;
  updated_at?: string;
  // GEIP specific fields
  poor_id_status?: 'none' | 'poor_1' | 'poor_2';
  is_orphan?: boolean;
  transport_mode?: 'bicycle' | 'motorbike' | 'walking';
  dropout_risk?: boolean;
  home_visits?: HomeVisit[];
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'permission' | 'P' | 'A' | 'L' | 'E';

export type RootCauseAbsence = 'farming' | 'poverty' | 'illness' | 'transport' | 'migration' | 'other';

export interface AttendanceRecord {
  id: string;
  class_id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
  root_cause?: RootCauseAbsence;
  recorded_by?: string | null;
  updated_at: string;
}

export interface GradeRecord {
  id: string;
  class_id: string;
  student_id: string;
  subject_id: string;
  period_id: string;
  score_knowledge: number;
  score_skill: number;
  score_attitude: number;
  total_score: number;
  updated_at: string;
  // Remedial tracking for GEIP
  pre_test_score?: number;
  post_test_score?: number;
}

export type ActivityType = 'report' | 'attendance' | 'award' | 'student';

export interface ActivityLog {
  id: string;
  title: string;
  description: string;
  activity_type: ActivityType;
  class_id?: string;
  created_by?: string;
  created_at: string;
}

export interface MonthlyAttendanceSummary {
  id: string;
  class_id: string;
  student_id: string;
  month: string; // Format: 'YYYY-MM'
  absent_count: number;
  permission_count: number;
  late_count: number;
  root_cause?: RootCauseAbsence | null;
  needs_home_visit?: boolean;
  recorded_by?: string | null;
  updated_at: string;
}

export interface AtRiskStudent {
  id: string;
  name: string;
  reasons: string[];
  severity: 'high' | 'medium';
}

export interface MonthlyReportCard {
  id: string;
  class_id: string;
  student_id: string;
  month: string; // Format: 'YYYY-MM'
  total_score: number;
  average_score: number;
  rank: number;
  overall_grade?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  teacher_comments?: string;
  created_at: string;
}

export interface StudentHealthRecord {
  id: string;
  student_id: string;
  class_id: string;
  recorded_date: string;
  weight_kg: number;
  height_cm: number;
  vision_left?: string;
  vision_right?: string;
  hearing?: string;
  dental?: string;
  notes?: string;
}

