/**
 * System Roles:
 * - 'teacher': គ្រូបន្ទុកថ្នាក់ (Homeroom Teacher)
 * - 'principal': នាយកសាលា (Principal)
 * - 'admin': អ្នកគ្រប់គ្រងប្រព័ន្ធ (System Administrator)
 * - 'monitor': ប្រធានថ្នាក់ (Class Monitor)
 */
export type UserRole = 'teacher' | 'principal' | 'admin' | 'monitor';
export type Role = UserRole;

export interface AIGeneration {
  id: string;
  teacher_id: string;
  class_id: string;
  type: 'lesson_plan' | 'quiz' | 'worksheet';
  title: string;
  content_json: Record<string, any>;
  created_at: string;
}

export interface Document {
  id: string;
  class_id: string;
  uploader_id: string;
  title: string;
  type: 'excel' | 'word' | 'pdf' | 'archive' | 'image' | 'other';
  file_url: string;
  size: string;
  category: 'upload' | 'export' | 'template' | 'geip' | 'giep';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  school_id: string;
  school_code: string;
  phone?: string | null;
  subject?: string | null;
  subject_specialty?: string | null;
  qualification_level?: string | null;
  ministry_id?: string | null;
  is_giep_trained?: boolean;
  is_active?: boolean;
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
  room?: string | null;
  academic_year_id?: string | null;
  subjects: Subject[];
  is_archived?: boolean;
  shift?: string;
  room_number?: string | null;
  track?: string;
  student_count?: number;
  female_count?: number;
  created_at: string;
}

export interface AcademicYear {
  id: string;
  school_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_archived: boolean;
  created_at: string;
}

export interface HomeVisit {
  id: string;
  student_id: string;
  visit_date?: string;
  date?: string;
  reason: string;
  observations?: string;
  parent_name?: string;
  contract_notes?: string;
  photo_url?: string;
  status: 'completed' | 'pending' | 'submitted';
  conducted_by?: string | null;
  created_at?: string;
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
  scholarship?: 'yes' | 'no' | null;
  orphan?: 'yes' | 'no' | null;
  indigenous?: 'yes' | 'no' | null;
  weight_kg?: number | null;
  height_m?: number | null;
  bmi?: number | null;
  nutrition_status?: string | null;
  enrollment_status?: string | null;
  current_status?: string | null;
  created_at?: string;
  updated_at?: string;
  // GEIP specific fields
  poor_id_status?: 'none' | 'poor_1' | 'poor_2';
  is_orphan?: boolean;
  transport_mode?: 'bicycle' | 'motorbike' | 'walking';
  dropout_risk?: boolean;
  home_visits?: HomeVisit[];
  desk_number?: string | null;
  room_number?: string | null;
  scholarship_status?: string | null;
  special_needs_status?: string | null;
  transfer_history?: any[];
  giep_device_received?: boolean;
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

export interface Grade {
  id: string;
  class_id: string;
  student_id: string;
  period: string;
  scores: Record<string, number>;
  total_score?: number;
  average?: number;
  rank?: number;
  status?: 'draft' | 'published';
  created_at?: string;
  updated_at?: string;
}

export interface GradeRecord {
  id: string;
  class_id: string;
  student_id: string;
  subject_id?: string;
  period?: string;
  period_id?: string;
  scores?: Record<string, number>;
  score_knowledge?: number;
  score_skill?: number;
  score_attitude?: number;
  total_score?: number;
  status?: 'draft' | 'published';
  updated_at?: string;
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
  severity: 'low' | 'medium' | 'high';
}


export interface MonthlyReportCard {
  id: string;
  class_id: string;
  student_id: string;
  month: string;
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
  weight_kg?: number;
  height_cm?: number;
  bmi?: number;
  vision_left?: string;
  vision_right?: string;
  hearing?: string;
  dental?: string;
  notes?: string;
  created_at?: string;
}

export type SupportCaseStatus = 'open' | 'in_progress' | 'monitoring' | 'resolved' | 'closed';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SupportCase {
  id: string;
  student_id: string;
  class_id?: string | null;
  teacher_id?: string | null;
  risk_type: 'attendance' | 'academic' | 'behavior' | 'health' | 'financial';
  risk_level: RiskLevel;
  status: SupportCaseStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupportIntervention {
  id: string;
  case_id: string;
  student_id: string;
  intervention_type: 'counseling' | 'tutoring' | 'home_visit' | 'parent_meeting' | 'financial_aid';
  description?: string | null;
  action_date: string;
  outcome?: string | null;
  conducted_by?: string | null;
  created_at?: string;
}

export interface ParentContact {
  id: string;
  student_id: string;
  parent_name: string;
  relationship: string;
  phone_number: string;
  notes?: string | null;
  last_contact_date?: string | null;
  created_at?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  target_role: 'all' | 'teacher' | 'student' | 'principal';
  author_id?: string | null;
  status: 'draft' | 'published' | 'archived';
  created_at?: string;
  updated_at?: string;
}

export interface GradeSnapshot {
  id: string;
  period: string;
  class_id?: string | null;
  created_by?: string | null;
  snapshot_label: string;
  records_count: number;
  grades_payload: any[];
  created_at: string;
  profiles?: {
    full_name?: string | null;
  } | null;
}
