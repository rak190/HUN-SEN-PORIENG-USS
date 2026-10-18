import { NextRequest, NextResponse } from 'next/server';
import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { getCurriculumSchemaForClass, fetchClassExamStandards } from '@/lib/curriculum';
import { calculateStudentMonthlyGrade, computeStudentRank } from '@/lib/domain/grading';
import { resolvePeriodDateRange } from '@/lib/domain/periods';

export const runtime = 'nodejs';

// Pre-load font and stamp assets once in memory
let fontData: Buffer | null = null;
let stampDataUri: string | null = null;

try {
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Suwannaphum-Regular.ttf');
  if (fs.existsSync(fontPath)) {
    fontData = fs.readFileSync(fontPath);
  }
  const stampPath = path.join(process.cwd(), 'public', 'images', 'principal-stamp.png');
  if (fs.existsSync(stampPath)) {
    const stampBuf = fs.readFileSync(stampPath);
    stampDataUri = `data:image/png;base64,${stampBuf.toString('base64')}`;
  }
} catch (e) {
  console.error('Failed to load static assets for report card image:', e);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('student_id');
    const period = searchParams.get('period');
    const academicYearId = searchParams.get('academic_year_id');

    if (!studentId || !period) {
      return new NextResponse('Missing required query parameters: student_id and period', { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch Student & Enrollment Info
    const { data: student, error: stdError } = await supabase
      .from('students')
      .select('id, full_name, gender, dob, date_of_birth')
      .eq('id', studentId)
      .maybeSingle();

    if (stdError || !student) {
      return new NextResponse('Student not found', { status: 404 });
    }

    let enrollQuery = supabase
      .from('student_enrollments')
      .select('class_id, academic_year_id, classes(id, name, grade, track, teacher_id, profiles:teacher_id(full_name))')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (academicYearId) {
      enrollQuery = enrollQuery.eq('academic_year_id', academicYearId);
    }

    const { data: enrollment } = await enrollQuery.limit(1).maybeSingle();
    const classInfo = enrollment?.classes as any;
    const yearId = academicYearId || enrollment?.academic_year_id;

    // 2. Fetch Academic Year Info
    let academicYear: { start_date?: string; end_date?: string; name?: string } | null = null;
    if (yearId) {
      const { data: yearData } = await supabase
        .from('academic_years')
        .select('name, start_date, end_date')
        .eq('id', yearId)
        .maybeSingle();
      academicYear = yearData;
    } else {
      const { data: activeYear } = await supabase
        .from('academic_years')
        .select('name, start_date, end_date')
        .eq('status', 'active')
        .maybeSingle();
      academicYear = activeYear;
    }

    // 3. Fetch Published Grade for this period
    let gradeQuery = supabase
      .from('grades')
      .select('id, period, total_score, scores, status, class_id, academic_year_id')
      .eq('student_id', studentId)
      .eq('period', period)
      .eq('status', 'published');

    if (yearId) {
      gradeQuery = gradeQuery.eq('academic_year_id', yearId);
    }

    const { data: grade } = await gradeQuery.maybeSingle();

    // 4. Resolve Date Range & Attendance (Dual-source: Monthly Summaries + Daily Records with E/A codes)
    const range = resolvePeriodDateRange(period, academicYear);
    const targetIsoMonth = range.startDate.substring(0, 7);

    let excusedAbsences = 0;
    let unexcusedAbsences = 0;
    let foundMonthlySummary = false;

    if (enrollment?.class_id) {
      const { data: monthlySummary } = await supabase
        .from('monthly_attendance_summaries')
        .select('permission_count, absent_count')
        .eq('student_id', studentId)
        .eq('class_id', enrollment.class_id)
        .eq('month', targetIsoMonth)
        .maybeSingle();

      if (monthlySummary) {
        excusedAbsences = Number(monthlySummary.permission_count || 0);
        unexcusedAbsences = Number(monthlySummary.absent_count || 0);
        foundMonthlySummary = true;
      }
    }

    if (!foundMonthlySummary) {
      const { data: attendance } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('student_id', studentId)
        .gte('date', range.startDate)
        .lte('date', range.endDate);

      if (attendance) {
        for (const a of attendance) {
          const s = (a.status || '').toLowerCase();
          if (s === 'permission' || s === 'e' || s === 'excused') {
            excusedAbsences++;
          } else if (s === 'absent' || s === 'a' || s === 'unexcused') {
            unexcusedAbsences++;
          }
        }
      }
    }

    // 5. Calculate Published Rank in Class
    let rankStr = 'N/A';
    let classTotalCount = 0;
    if (enrollment?.class_id) {
      let rankQuery = supabase
        .from('grades')
        .select('student_id, total_score')
        .eq('class_id', enrollment.class_id)
        .eq('period', period)
        .eq('status', 'published');

      if (yearId) {
        rankQuery = rankQuery.eq('academic_year_id', yearId);
      }

      const { data: classGrades } = await rankQuery;
      if (classGrades && classGrades.length > 0) {
        classTotalCount = classGrades.length;
        const studentScore = grade?.total_score;
        if (studentScore !== undefined && studentScore !== null) {
          const rank = computeStudentRank(
            studentScore,
            classGrades.map(s => s.total_score || 0)
          );
          rankStr = `${rank} / ${classTotalCount}`;
        }
      }
    }

    // 6. Dynamically resolve standards (coefficients, subjects, and grading scale from /admin/exam-standards)
    const { schema, gradingScales } = await fetchClassExamStandards(
      supabase,
      yearId,
      classInfo?.grade,
      classInfo?.track
    );
    const scores = (grade?.scores as Record<string, number>) || {};
    const calculation = calculateStudentMonthlyGrade(scores, schema, gradingScales);

    const className = classInfo?.name || 'ទូទៅ';
    const teacherName = classInfo?.profiles?.full_name || 'លោកគ្រូ/អ្នកគ្រូ';
    const studentDob = student.date_of_birth || student.dob || '';
    const genderKh = student.gender === 'F' || student.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស';

    // 7. Render Card Element via ImageResponse
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            backgroundColor: '#ffffff',
            padding: '36px 40px',
            fontFamily: fontData ? 'Suwannaphum' : 'sans-serif',
            color: '#0f172a',
            position: 'relative',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>ក្រសួងអប់រំ យុវជន និងកីឡា</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1d4ed8', marginTop: '2px' }}>វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                ឆ្នាំសិក្សា {academicYear?.name || '២០២៦-២០២៧'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>ព្រះរាជាណាចក្រកម្ពុជា</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
              <div style={{ width: '80px', height: '2px', backgroundColor: '#cbd5e1', marginTop: '4px' }} />
            </div>
          </div>

          {/* Bulletin Title Banner */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#eff6ff',
              border: '2px solid #bfdbfe',
              borderRadius: '12px',
              padding: '10px 16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e40af' }}>
              ព្រឹត្តិបត្រពិន្ទុសិក្សាប្រចាំ {range.labelKh}
            </div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
              (លទ្ធផលផ្លូវការដែលបានបោះពុម្ពផ្សាយដោយគណៈគ្រប់គ្រងសាលា)
            </div>
          </div>

          {/* Student Profile Info Grid */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 18px',
              marginBottom: '16px',
              fontSize: '14px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex' }}>
                <span style={{ color: '#64748b', width: '90px' }}>ឈ្មោះសិស្ស៖</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{student.full_name}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ color: '#64748b', width: '90px' }}>ភេទ៖</span>
                <span style={{ fontWeight: 700 }}>{genderKh}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ color: '#64748b', width: '90px' }}>ថ្ងៃខែកំណើត៖</span>
                <span style={{ fontWeight: 700 }}>{studentDob || 'N/A'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex' }}>
                <span style={{ color: '#64748b', width: '100px' }}>ថ្នាក់រៀន៖</span>
                <span style={{ fontWeight: 800, color: '#1d4ed8' }}>{className}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ color: '#64748b', width: '100px' }}>គ្រូបន្ទុកថ្នាក់៖</span>
                <span style={{ fontWeight: 700 }}>{teacherName}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ color: '#64748b', width: '100px' }}>សិស្សសរុបក្នុងថ្នាក់៖</span>
                <span style={{ fontWeight: 700 }}>{classTotalCount > 0 ? `${classTotalCount} នាក់` : '-'}</span>
              </div>
            </div>
          </div>

          {/* Subject Grades Table */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '16px',
            }}
          >
            {/* Table Header */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#f1f5f9',
                borderBottom: '2px solid #cbd5e1',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 800,
                color: '#334155',
              }}
            >
              <div style={{ width: '40px', textAlign: 'center' }}>ល.រ</div>
              <div style={{ flex: 1 }}>មុខវិជ្ជា</div>
              <div style={{ width: '90px', textAlign: 'center' }}>ពិន្ទុពេញ</div>
              <div style={{ width: '100px', textAlign: 'center' }}>ពិន្ទុទទួលបាន</div>
              <div style={{ width: '70px', textAlign: 'center' }}>និទ្ទេស</div>
              <div style={{ width: '100px', textAlign: 'center' }}>លទ្ធផល</div>
            </div>

            {/* Table Rows (All subjects in curriculum) */}
            {calculation.subjectBreakdowns.map((sub, idx) => (
              <div
                key={sub.subjectId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 12px',
                  fontSize: '12px',
                  borderBottom: idx === calculation.subjectBreakdowns.length - 1 ? 'none' : '1px solid #f1f5f9',
                  backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                }}
              >
                <div style={{ width: '40px', textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</div>
                <div style={{ flex: 1, fontWeight: 700, color: '#1e293b' }}>{sub.label}</div>
                <div style={{ width: '90px', textAlign: 'center', color: '#64748b' }}>{sub.maxScore}</div>
                <div style={{ width: '100px', textAlign: 'center', fontWeight: 800, color: sub.isPassing ? '#1d4ed8' : '#e11d48' }}>
                  {sub.score}
                </div>
                <div style={{ width: '70px', textAlign: 'center', fontWeight: 700 }}>
                  {sub.percentage >= 90 ? 'A' : sub.percentage >= 80 ? 'B' : sub.percentage >= 70 ? 'C' : sub.percentage >= 60 ? 'D' : sub.percentage >= 50 ? 'E' : 'F'}
                </div>
                <div
                  style={{
                    width: '100px',
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: '12px',
                    color: sub.isPassing ? '#059669' : '#e11d48',
                  }}
                >
                  {sub.isPassing ? 'ជាប់' : 'ធ្លាក់'}
                </div>
              </div>
            ))}
          </div>

          {/* Summary KPI Cards Grid */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
            >
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>ពិន្ទុសរុប</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
                {calculation.totalScore} / {calculation.maxTotal}
              </span>
            </div>

            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
              }}
            >
              <span style={{ fontSize: '11px', color: '#1e40af', fontWeight: 700 }}>មធ្យមភាគ (ពិន្ទុ ៥០)</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#1d4ed8', marginTop: '2px' }}>
                {calculation.averageScore50.toFixed(2)}
              </span>
              <span style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
                មេគុណ: {calculation.totalCoefficient}
              </span>
            </div>

            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px',
                backgroundColor: '#fefce8',
                border: '1px solid #fef08a',
                borderRadius: '8px',
              }}
            >
              <span style={{ fontSize: '11px', color: '#854d0e', fontWeight: 700 }}>ចំណាត់ថ្នាក់</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#ca8a04', marginTop: '2px' }}>
                {rankStr}
              </span>
            </div>

            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
              }}
            >
              <span style={{ fontSize: '11px', color: '#166534', fontWeight: 700 }}>និទ្ទេស / លទ្ធផល</span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                {calculation.gradeLetter} ({calculation.gradeMentionKh.split(' ')[0] || (calculation.isPassing ? 'ជាប់' : 'ធ្លាក់')})
              </span>
            </div>
          </div>

          {/* Attendance Stats Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              borderRadius: '8px',
              padding: '8px 16px',
              marginBottom: '20px',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <span style={{ color: '#475569', marginRight: '16px' }}>វត្តមានប្រចាំខែ៖</span>
            <span style={{ color: '#0f172a', marginRight: '24px' }}>
              អវត្តមានមានច្បាប់: <b style={{ color: '#1d4ed8' }}>{excusedAbsences}</b> ដង
            </span>
            <span style={{ color: '#0f172a' }}>
              អវត្តមានឥតច្បាប់: <b style={{ color: '#e11d48' }}>{unexcusedAbsences}</b> ដង
            </span>
          </div>

          {/* Signatures & Stamp Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', position: 'relative' }}>
            {/* Director Sign & Stamp */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '220px', position: 'relative' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>បានឃើញ និងឯកភាព</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>នាយកសាលា</div>
              {stampDataUri && (
                <img
                  src={stampDataUri}
                  alt="Principal Stamp"
                  style={{
                    position: 'absolute',
                    top: '20px',
                    width: '100px',
                    height: '100px',
                    opacity: 0.9,
                  }}
                />
              )}
              <div style={{ height: '70px' }} />
              <div style={{ width: '140px', height: '1px', borderBottom: '1px dashed #94a3b8' }} />
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>ហត្ថលេខា និងត្រា</div>
            </div>

            {/* Homeroom Teacher Sign */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '220px' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>ធ្វើនៅពោធិ៍រៀង, ថ្ងៃទី... ខែ... ឆ្នាំ២០២...</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>គ្រូបន្ទុកថ្នាក់</div>
              <div style={{ height: '40px' }} />
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#1d4ed8' }}>{teacherName}</div>
              <div style={{ width: '140px', height: '1px', borderBottom: '1px dashed #94a3b8', marginTop: '4px' }} />
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>ហត្ថលេខា</div>
            </div>
          </div>
        </div>
      ),
      {
        width: 850,
        height: 1150,
        fonts: fontData
          ? [
              {
                name: 'Suwannaphum',
                data: fontData,
                style: 'normal',
                weight: 400,
              },
            ]
          : undefined,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      }
    );
  } catch (error: any) {
    console.error('Error generating report card image:', error);
    return new NextResponse('Internal server error generating image', { status: 500 });
  }
}
