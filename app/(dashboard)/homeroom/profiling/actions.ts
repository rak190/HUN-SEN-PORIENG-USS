'use server';

import { createClient } from '@/lib/supabase/server';
import { getServerAuth } from '@/lib/auth-server';

export interface StudentCompletionStats {
  id: string;
  studentId: string;
  fullName: string;
  englishName: string;
  gender: string;
  overallProgress: number; // 0 - 100
  missingFields: string[];
  identityComplete: boolean;
  familyComplete: boolean;
  socioeconomicComplete: boolean;
  healthComplete: boolean;
}

export async function getProfileCompletionStats(classId: string, academicYearId: string) {
  const supabase = await createClient();
  const { user } = await getServerAuth();

  if (!user) throw new Error("Unauthorized");

  // 1. Fetch Class Roster
  const { data: students, error: stdErr } = await supabase
    .from('active_class_rosters')
    .select('*')
    .eq('enrollment_class_id', classId)
    .order('full_name', { ascending: true });

  if (stdErr) throw stdErr;

  // 2. Fetch Health Records for these students for the active year
  const studentIds = students?.map(s => s.id) || [];
  
  let healthMap = new Map();
  if (studentIds.length > 0) {
    const { data: healthRecs, error: healthErr } = await supabase
      .from('student_health_records')
      .select('*')
      .in('student_id', studentIds)
      .eq('academic_year_id', academicYearId);
      
    if (!healthErr) {
      healthRecs?.forEach((h: any) => {
        const existing = healthMap.get(h.student_id);
        if (!existing || new Date(h.recorded_date) > new Date(existing.recorded_date)) {
          healthMap.set(h.student_id, h);
        }
      });
    }
  }

  // 3. Calculate Completion
  const results: StudentCompletionStats[] = (students || []).map((s: any) => {
    const missingFields: string[] = [];
    const health = healthMap.get(s.id);
    
    // Group 1: Identity (Weight 20%)
    let identityScore = 20;
    if (!s.student_id_number) { identityScore -= 5; missingFields.push("អត្តលេខ (ID)"); }
    if (!s.full_name) { identityScore -= 5; missingFields.push("ឈ្មោះ (Name)"); }
    if (!s.gender) { identityScore -= 5; missingFields.push("ភេទ (Gender)"); }
    if (!s.dob) { identityScore -= 5; missingFields.push("ថ្ងៃខែឆ្នាំកំណើត (DOB)"); }

    // Group 2: Family (Weight 30%)
    let familyScore = 30;
    if (!s.father_name) { familyScore -= 10; missingFields.push("ឈ្មោះឪពុក (Father)"); }
    if (!s.mother_name) { familyScore -= 10; missingFields.push("ឈ្មោះម្តាយ (Mother)"); }
    if (!s.parent_phone && !s.father_phone && !s.mother_phone && !s.guardian_phone) { 
      familyScore -= 10; 
      missingFields.push("លេខទូរស័ព្ទ (Parent Phone)"); 
    }

    // Group 3: Socioeconomic (Weight 20%)
    let socioScore = 20;
    if (!s.distance_km && s.distance_km !== 0) { socioScore -= 10; missingFields.push("គម្លាតពីផ្ទះ (Distance)"); }
    if (!s.id_poor && !s.poverty_status) { 
      // It might be 'none', but if it's completely null, we flag it to ensure it was asked.
      if (s.id_poor === null && s.poverty_status === null) {
        socioScore -= 10; 
        missingFields.push("បណ្ណក្រីក្រ (Poverty Status)"); 
      }
    }

    // Group 4: Health (Weight 30%)
    let healthScore = 30;
    if (!health) {
      healthScore = 0;
      missingFields.push("កំណត់ត្រាសុខភាព (Health Record)");
    } else {
      if (!health.weight_kg) { healthScore -= 5; missingFields.push("ទម្ងន់ (Weight)"); }
      if (!health.height_cm && !health.height_m) { healthScore -= 5; missingFields.push("កម្ពស់ (Height)"); }
      if (!health.vision_left || !health.vision_right) { healthScore -= 10; missingFields.push("គំហើញ (Vision)"); }
      if (!health.dental) { healthScore -= 10; missingFields.push("ធ្មេញ (Dental)"); }
    }

    const overallProgress = Math.max(0, identityScore + familyScore + socioScore + healthScore);

    return {
      id: s.id,
      studentId: s.student_id_number,
      fullName: s.full_name,
      englishName: s.english_name,
      gender: s.gender,
      overallProgress,
      missingFields,
      identityComplete: identityScore === 20,
      familyComplete: familyScore === 30,
      socioeconomicComplete: socioScore === 20,
      healthComplete: healthScore === 30
    };
  });

  return results;
}
