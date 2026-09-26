import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAdmin();
    const supabase = createAdminClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Failed to initialize Supabase client.' }, { status: 500 });
    }

    // Fetch snapshot of core tables sequentially to limit concurrent DB strain
    const { data: academicYears } = await supabase.from('academic_years').select('*');
    const { data: classes } = await supabase.from('classes').select('*');
    const { data: students } = await supabase.from('students').select('*');
    const { data: enrollments } = await supabase.from('student_enrollments').select('*');
    const { data: attendance } = await supabase.from('attendance_records').select('*');
    const { data: grades } = await supabase.from('grades').select('*');
    
    // For profiles, omit sensitive or unnecessary fields if needed, 
    // but this is a database backup for admins so all non-secret metadata is fine.
    const { data: profiles } = await supabase.from('profiles').select('id, email, full_name, role, created_at');

    const backupPayload = {
      version: "1.0",
      schoolName: "វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង",
      exportedAt: new Date().toISOString(),
      exportedBy: user.email,
      data: {
        academicYears,
        classes,
        students,
        enrollments,
        attendance,
        grades,
        profiles
      }
    };

    // Audit Logging
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'Full Database Backup Generated',
      type: 'warning',
      status: 'success'
    });

    const fileName = `backup-hunsen-porieng-${new Date().toISOString().slice(0, 10)}.json`;
    const jsonString = JSON.stringify(backupPayload, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error: any) {
    console.error('Backup generation failed:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
