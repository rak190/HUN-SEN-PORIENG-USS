import { MassiveProfilingStudent } from '@/app/(dashboard)/students/types';

export interface CompletenessReport {
  score: number; // 0 to 100
  checks: {
    category: 'Identity' | 'Enrollment' | 'Family' | 'Documents';
    status: 'pass' | 'warn' | 'fail';
    message: string;
  }[];
}

export function calculateCompleteness(student: any): CompletenessReport {
  const checks: CompletenessReport['checks'] = [];
  let passed = 0;
  let total = 0;

  const addCheck = (category: any, status: 'pass' | 'warn' | 'fail', message: string) => {
    total++;
    if (status === 'pass') passed++;
    else if (status === 'warn') passed += 0.5; // partial credit
    checks.push({ category, status, message });
  };

  // Identity
  if (student.student_id_number && student.full_name && student.gender) {
    addCheck('Identity', 'pass', '✓ ព័ត៌មានមូលដ្ឋានពេញលេញ');
  } else {
    addCheck('Identity', 'fail', '⚠ បាត់ព័ត៌មានមូលដ្ឋាន (អត្តលេខ, ឈ្មោះ, ភេទ)');
  }

  if (student.dob) {
    addCheck('Identity', 'pass', '✓ មានថ្ងៃខែឆ្នាំកំណើត');
  } else {
    addCheck('Identity', 'warn', '⚠ បាត់ថ្ងៃខែឆ្នាំកំណើត');
  }

  // Address
  if (student.address || student.current_address) {
    addCheck('Identity', 'pass', '✓ មានអាសយដ្ឋាន');
  } else {
    addCheck('Identity', 'warn', '⚠ បាត់អាសយដ្ឋាន');
  }

  // Enrollment
  if (student.class_id || student.current_status) {
    addCheck('Enrollment', 'pass', '✓ មានព័ត៌មានការសិក្សា');
  } else {
    addCheck('Enrollment', 'fail', '⚠ បាត់ព័ត៌មានថ្នាក់រៀន');
  }

  // Family
  const hasParentPhone = student.parent_phone || student.father_phone || student.mother_phone || student.guardian_phone;
  if (hasParentPhone) {
    addCheck('Family', 'pass', '✓ មានលេខទូរស័ព្ទអាណាព្យាបាល');
  } else {
    addCheck('Family', 'warn', '⚠ បាត់លេខទូរស័ព្ទ');
  }

  const score = Math.round((passed / total) * 100);
  return { score, checks };
}

export interface QualityIssue {
  severity: 'high' | 'medium' | 'low';
  message: string;
}

export function checkDataQuality(student: any, allStudents: any[]): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Duplicates
  if (student.student_id_number) {
    const dups = allStudents.filter(s => s.student_id_number === student.student_id_number && s.id !== student.id);
    if (dups.length > 0) {
      issues.push({ severity: 'high', message: 'អត្តលេខស្ទួន' });
    }
  }

  // Missing required
  if (!student.full_name) {
    issues.push({ severity: 'high', message: 'បាត់ឈ្មោះ' });
  }
  
  if (!student.student_id_number) {
    issues.push({ severity: 'high', message: 'បាត់អត្តលេខសិស្ស' });
  }

  return issues;
}
