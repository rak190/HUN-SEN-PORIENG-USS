import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import * as XLSX from 'xlsx';
import { getServerAuth } from '@/lib/auth-server';

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

    // Verify access
    if (profile?.role === 'teacher') {
      const { data: classData } = await supabase
        .from('classes')
        .select('id, teacher_id')
        .eq('id', classId)
        .single();
        
      if (!classData || classData.teacher_id !== user.id) {
        return new NextResponse('Forbidden: You do not own this class', { status: 403 });
      }
    }

    // Fetch students
    let query = supabase
      .from('active_class_rosters')
      .select('*')
      .eq('enrollment_class_id', classId)
      .order('student_id_number', { ascending: true });

    if (academicYearId) {
      query = query.eq('academic_year_id', academicYearId);
    }

    const { data: students, error } = await query;

    if (error) {
      throw error;
    }

    if (!students || students.length === 0) {
      return new NextResponse('No students found', { status: 404 });
    }

    const wsData = students.map((std: any) => ({
      'អត្តលេខ': std.student_id_number,
      'គោត្តនាម និងនាម': std.full_name,
      'ភេទ': std.gender === 'F' ? 'ស្រី' : 'ប្រុស',
      'ថ្ងៃខែឆ្នាំកំណើត': std.dob || '',
      'លេខសំបុត្រកំណើត': std.birth_cert_no || '',
      'ស្ថានភាពសិស្ស': std.status === 'new' ? 'ថ្មី' : std.status === 'repeater' ? 'ត្រួតថ្នាក់' : 'ផ្ទេរចូល',
      'សាលាចំណុះឬក្រៅចំណុះ': std.prev_school || '',
      'ជនជាតិដើមភាគតិច': std.indigenous === 'yes' ? 'បាទ/ចាស' : 'ទេ',
      'ប្រភេទពិការភាព': std.disability === 'none' ? 'គ្មាន' : std.disability === 'mild' ? 'ស្រាល' : 'ធ្ងន់ធ្ងរ',
      'ឧបករណ៍ជំនួយ': std.assistive_device || '',
      'កំព្រា': std.orphan === 'yes' ? 'បាទ/ចាស' : 'ទេ',
      'បណ្ណក្រីក្រ': std.id_poor === 'none' ? 'គ្មាន' : std.id_poor === 'level_1' ? 'កម្រិត ១' : 'កម្រិត ២',
      'អាហារូបករណ៍': std.scholarship === 'yes' ? 'បាទ/ចាស' : 'ទេ',
      'ចម្ងាយ (គ.ម)': std.distance_km || '',
      'ទម្ងន់ (kg)': std.weight_kg || '',
      'កម្ពស់ (m)': std.height_m || '',
      'BMI': std.bmi || '',
      'លទ្ធផលវាយតម្លៃសុខភាព': std.nutrition_status || '',
      'បញ្ហាសុខភាព': std.health_issues || '',
      'ឈ្មោះឪពុក': std.father_name || '', 
      'មុខរបរឪពុក': std.father_job || '', 
      'ទូរស័ព្ទឪពុក': std.father_phone || '',
      'ឈ្មោះម្តាយ': std.mother_name || '', 
      'មុខរបរម្តាយ': std.mother_job || '', 
      'ទូរស័ព្ទម្តាយ': std.mother_phone || '',
      'ចំណាកស្រុក': std.migrant_status || '',
      'ហឹង្សាក្នុងគ្រួសារ': std.domestic_violence === 'yes' ? 'មាន' : 'គ្មាន',
      'ជម្រក': std.housing || '',
      'ប្រាក់ចំណូល/ខែ': std.income ? `$${std.income}` : '',
      'បងប្អូនបង្កើត': std.siblings_count || '',
      'អាសយដ្ឋានបច្ចុប្បន្ន': std.current_address || '',
      'លេខទូរស័ព្ទសិស្ស': std.student_phone || '',
      'ស្ថានភាពចុងក្រោយ': std.current_enrollment_status || '',
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GEIP Master Profiling");
    
    // Write to buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Disposition': `attachment; filename="MoEYS_GEIP_Master_Data.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error: any) {
    console.error('Export Error:', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
