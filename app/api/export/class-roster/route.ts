import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerAuth } from '@/lib/auth-server';
import { generateOfficialSchoolRosterWorkbook } from '@/lib/excel/officialSchoolRosterExport';

export async function GET(request: Request) {
  try {
    const { user, profile } = await getServerAuth();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const academicYearId = searchParams.get('academicYearId');

    if (!classId) {
      return new NextResponse('Missing classId', { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Verify class existence & access
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name, grade, teacher_id, school_id, academic_year_id')
      .eq('id', classId)
      .single();

    if (classError || !classData) {
      return new NextResponse('Class not found', { status: 404 });
    }

    const allowedRoles = ['admin', 'principal', 'teacher'];
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      return new NextResponse('Forbidden: Insufficient privileges to export class roster.', { status: 403 });
    }

    if (profile.role === 'teacher') {
      if (classData.teacher_id !== user.id) {
        return new NextResponse('Forbidden: You do not own this class', { status: 403 });
      }
    } else if (profile.role === 'principal') {
      if (classData.school_id && profile.school_id && classData.school_id !== profile.school_id) {
        return new NextResponse('Forbidden: Class belongs to another school', { status: 403 });
      }
    }

    const effectiveYearId = academicYearId || classData.academic_year_id;

    // 2. Fetch students, academic year, and school information concurrently
    let rosterQuery = supabase
      .from('active_class_rosters')
      .select('*')
      .eq('enrollment_class_id', classId)
      .order('student_id_number', { ascending: true })
      .limit(500);

    if (effectiveYearId) {
      rosterQuery = rosterQuery.eq('academic_year_id', effectiveYearId);
    }

    const yearPromise = effectiveYearId
      ? supabase.from('academic_years').select('id, name').eq('id', effectiveYearId).maybeSingle()
      : supabase.from('academic_years').select('id, name').eq('is_active', true).maybeSingle();

    const schoolPromise = supabase
      .from('schools')
      .select('name, abbreviation, department, province')
      .eq('id', classData.school_id || profile?.school_id || 'main-school')
      .maybeSingle();

    const [rosterRes, yearRes, schoolRes] = await Promise.all([
      rosterQuery,
      yearPromise,
      schoolPromise,
    ]);

    if (rosterRes.error) {
      throw rosterRes.error;
    }

    const students = rosterRes.data;
    if (!students || students.length === 0) {
      return new NextResponse('No students found', { status: 404 });
    }

    const academicYear = yearRes.data;
    const schoolInfo = schoolRes.data;

    // 3. Generate high-fidelity Excel workbook matching official school template
    const wb = await generateOfficialSchoolRosterWorkbook({
      students,
      classInfo: {
        id: classData.id,
        name: classData.name,
        grade: classData.grade,
        academic_year_id: classData.academic_year_id,
      },
      academicYear,
      schoolInfo,
    });

    const buf = await wb.xlsx.writeBuffer();

    // 4. Clean Unicode Khmer filename with RFC 5987 encoding
    const cleanClassName = (classData.name || 'ថ្នាក់').replace(/[\\/:*?"<>|]/g, '_');
    const cleanYearName = (academicYear?.name || '២០២៦-២០២៧').replace(/[\\/:*?"<>|]/g, '_');
    const filenameKhmer = `បញ្ជីឈ្មោះសិស្ស_ថ្នាក់ទី${cleanClassName}_${cleanYearName}.xlsx`;
    const encodedFilename = encodeURIComponent(filenameKhmer);

    return new NextResponse(buf as any, {
      headers: {
        'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error: any) {
    console.error('Export Error:', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
