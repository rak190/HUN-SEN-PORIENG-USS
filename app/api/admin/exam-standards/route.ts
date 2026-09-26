import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';

export async function GET(req: Request) {
  const { user, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get('academicYearId');
  if (!academicYearId) {
    return NextResponse.json({ standards: null });
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ standards: null });
  }

  const [subjectsRes, scalesRes] = await Promise.all([
    adminClient.from('exam_subject_standards').select('*').eq('academic_year_id', academicYearId),
    adminClient.from('exam_grading_scales').select('*').eq('academic_year_id', academicYearId)
  ]);

  const globalSubjects: any[] = [];
  
  if (subjectsRes.data && subjectsRes.data.length > 0) {
    const subjectMap = new Map<string, any>();
    
    subjectsRes.data.forEach(row => {
      if (!subjectMap.has(row.subject_name)) {
        subjectMap.set(row.subject_name, {
          id: Math.random().toString(), // Transient ID
          name: row.subject_name,
          grades: [], // We'll reconstruct this simply as ['7','8','9','10','11','12'] for UI logic
          type: row.is_core ? 'កំហិត' : 'ជ្រើសរើស',
          sci: 1, soc: 1, gen: 1, maxSci: 50, maxSoc: 50, maxGen: 50
        });
      }
      
      const sub = subjectMap.get(row.subject_name);
      
      // If grade is < 10, it's gen
      if (row.grade_level < 10) {
        sub.gen = row.coefficient;
        sub.maxGen = row.max_score;
      } else {
        if (row.stream_type === 'science') {
          sub.sci = row.coefficient;
          sub.maxSci = row.max_score;
        } else if (row.stream_type === 'social') {
          sub.soc = row.coefficient;
          sub.maxSoc = row.max_score;
        } else {
          sub.gen = row.coefficient;
          sub.maxGen = row.max_score;
        }
      }
    });

    // Just hardcode grades array for simplicity in UI, since the UI filters by stream/grades anyway
    globalSubjects.push(...Array.from(subjectMap.values()).map((s: any, idx) => ({ ...s, id: String(idx+1), grades: ['7','8','9','10','11','12'] })));
  }

  const gradingRanges = (scalesRes.data || []).map(r => ({
    id: r.grade_letter,
    label: r.description_khmer,
    min: r.min_percentage,
    max: r.max_percentage,
    color: r.grade_letter === 'A' || r.grade_letter === 'B' ? 'emerald' :
           r.grade_letter === 'C' ? 'blue' :
           r.grade_letter === 'D' ? 'amber' :
           r.grade_letter === 'E' ? 'orange' : 'rose'
  }));

  return NextResponse.json({ standards: { globalSubjects, gradingRanges } });
}

export async function PATCH(req: Request) {
  const { user, role } = await getServerAuth();

  if (!user || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const body = await req.json();
  const { standards, academicYearId } = body;

  if (!standards || !academicYearId) {
    return NextResponse.json({ error: 'standards and academicYearId are required' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  // 1. Sync exam_subject_standards
  if (standards.globalSubjects && Array.isArray(standards.globalSubjects)) {
    try {
      const recordsToUpsert: any[] = [];
      
      standards.globalSubjects.forEach((subject: any) => {
        const isCore = subject.type === 'កំហិត';
        const grades = subject.grades || [];
        
        grades.forEach((gradeStr: string) => {
          const gradeLevel = parseInt(gradeStr);
          if (isNaN(gradeLevel)) return;
          
          if (gradeLevel >= 11) {
            // Science stream
            recordsToUpsert.push({
              academic_year_id: academicYearId,
              subject_name: subject.name,
              grade_level: gradeLevel,
              stream_type: 'science',
              coefficient: subject.sci || 1.0,
              max_score: subject.maxSci || 50.0,
              is_core: isCore
            });
            // Social stream
            recordsToUpsert.push({
              academic_year_id: academicYearId,
              subject_name: subject.name,
              grade_level: gradeLevel,
              stream_type: 'social',
              coefficient: subject.soc || 1.0,
              max_score: subject.maxSoc || 50.0,
              is_core: isCore
            });
          } else {
            // General stream
            recordsToUpsert.push({
              academic_year_id: academicYearId,
              subject_name: subject.name,
              grade_level: gradeLevel,
              stream_type: 'general',
              coefficient: subject.gen || 1.0,
              max_score: subject.maxGen || 50.0,
              is_core: isCore
            });
          }
        });
      });

      if (recordsToUpsert.length > 0) {
        const { error: syncError } = await adminClient
          .from('exam_subject_standards')
          .upsert(recordsToUpsert, { onConflict: 'academic_year_id,grade_level,subject_name,stream_type' });
          
        if (syncError) {
          console.error("Failed to sync exam_subject_standards:", syncError);
          return NextResponse.json({ error: 'បរាជ័យក្នុងការរក្សាទុកមុខវិជ្ជា: ' + syncError.message }, { status: 500 });
        }
      }
    } catch (e: any) {
      console.error("Error building records to upsert:", e);
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // 2. Sync exam_grading_scales
  if (standards.gradingRanges && Array.isArray(standards.gradingRanges)) {
    try {
      const scalesToUpsert = standards.gradingRanges.map((r: any) => {
        // compute mock gpa_point based on letter grade (A=4, B=3, etc.)
        let gpa = 0;
        if (r.id === 'A') gpa = 4.0;
        else if (r.id === 'B') gpa = 3.0;
        else if (r.id === 'C') gpa = 2.0;
        else if (r.id === 'D') gpa = 1.0;
        else if (r.id === 'E') gpa = 0.5;
        
        return {
          academic_year_id: academicYearId,
          grade_letter: r.id,
          min_percentage: r.min,
          max_percentage: r.max,
          gpa_point: gpa,
          description_khmer: r.label
        };
      });

      if (scalesToUpsert.length > 0) {
        const { error: scaleError } = await adminClient
          .from('exam_grading_scales')
          .upsert(scalesToUpsert, { onConflict: 'academic_year_id,grade_letter' });
          
        if (scaleError) {
          console.error("Failed to sync exam_grading_scales:", scaleError);
          return NextResponse.json({ error: 'បរាជ័យក្នុងការរក្សាទុកនិទ្ទេស: ' + scaleError.message }, { status: 500 });
        }
      }
    } catch (e: any) {
      console.error("Error building grading scales:", e);
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // Log to audit logs
  await adminClient.from('audit_logs').insert([{
    action: `បានកែសម្រួលស្តង់ដារការប្រលង និងការកំណត់ពិន្ទុ`,
    type: 'info',
    user_id: user.id
  }]);

  return NextResponse.json({ success: true });
}
