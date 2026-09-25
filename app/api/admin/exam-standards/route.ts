import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';

export async function GET() {
  const { user, role } = await getServerAuth();

  if (!user || (role !== 'admin' && role !== 'principal')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ standards: null });
  }

  const { data } = await adminClient
    .from('system_settings')
    .select('value')
    .eq('key', 'exam_standards')
    .maybeSingle();

  return NextResponse.json({ standards: data?.value || null });
}

export async function PATCH(req: Request) {
  const { user, role } = await getServerAuth();

  if (!user || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const body = await req.json();
  const { standards } = body;

  if (!standards) {
    return NextResponse.json({ error: 'standards payload is required' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  const { error } = await adminClient
    .from('system_settings')
    .upsert({
      key: 'exam_standards',
      value: standards,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync to relational exam_subject_standards table
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
              subject_name: subject.name,
              grade_level: gradeLevel,
              stream_type: 'science',
              coefficient: subject.sci || 1.0,
              max_score: subject.maxSci || 50.0,
              is_core: isCore
            });
            // Social stream
            recordsToUpsert.push({
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
          .upsert(recordsToUpsert, { onConflict: 'subject_name,grade_level,stream_type' });
          
        if (syncError) {
          console.error("Failed to sync exam_subject_standards:", syncError);
        }
      }
    } catch (e) {
      console.error("Error building records to upsert:", e);
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
