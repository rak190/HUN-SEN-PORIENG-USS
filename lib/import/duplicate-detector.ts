import { createClient } from '@supabase/supabase-js';

export interface DuplicateDetectionResult {
  status: 'new' | 'matched_existing' | 'possible_duplicate' | 'duplicate_within_file';
  matchedId?: string;
  reason?: string;
}

export async function detectDuplicate(
  student: Record<string, any>,
  existingStudentsInDb: any[],
  studentsInCurrentFile: any[]
): Promise<DuplicateDetectionResult> {
  const idNum = student.student_id_number;
  const fullName = student.full_name;
  const dob = student.dob;
  const gender = student.gender;

  // 1. Check against students already processed in the current file
  const duplicateInFile = studentsInCurrentFile.find(s => 
    s !== student && 
    ((s.student_id_number && s.student_id_number === idNum) || 
     (s.full_name === fullName && s.dob === dob && dob))
  );

  if (duplicateInFile) {
    return { status: 'duplicate_within_file', reason: 'មានសិស្សស្ទួនក្នុងឯកសារនេះ' };
  }

  // 2. Check against Database
  if (idNum) {
    const exactIdMatch = existingStudentsInDb.find(s => s.student_id_number === idNum);
    if (exactIdMatch) {
      // It exists in DB. This is an update/re-enrollment.
      return { status: 'matched_existing', matchedId: exactIdMatch.id, reason: 'រកឃើញអត្តលេខសិស្ស' };
    }
  }

  if (fullName && dob) {
    const strongMatch = existingStudentsInDb.find(s => 
      s.full_name === fullName && 
      s.dob === dob && 
      s.gender === gender
    );
    if (strongMatch) {
      return { status: 'matched_existing', matchedId: strongMatch.id, reason: 'រកឃើញឈ្មោះនិងថ្ងៃខែឆ្នាំកំណើត' };
    }
  }

  if (fullName) {
    const possibleMatch = existingStudentsInDb.find(s => 
      s.full_name === fullName && 
      (!s.dob || !dob || s.dob !== dob)
    );
    if (possibleMatch) {
      return { status: 'possible_duplicate', matchedId: possibleMatch.id, reason: 'ឈ្មោះដូចគ្នា តែថ្ងៃខែឆ្នាំកំណើតខុសគ្នា' };
    }
  }

  return { status: 'new' };
}
