import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurriculumSchemaForClass, fetchClassExamStandards } from '@/lib/curriculum';
import { calculateStudentMonthlyGrade, assignGradeRanks } from '@/lib/domain/grading';
import { resolvePeriodDateRange } from '@/lib/domain/periods';

export const maxDuration = 300;

const TELEGRAM_BOT_TOKEN = process.env.PARENT_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hun-sen-porieng-uss.vercel.app';

// Initialize Supabase with service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sendMessage(chatId: number, text: string) {
  return fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML'
    })
  });
}

async function sendPhotoOrMessage(chatId: number, photoUrl: string, caption: string) {
  try {
    const res = await fetch(`${TELEGRAM_API_URL}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: 'HTML'
      })
    });
    if (res.ok) return res;
    // Fallback to text message if photo delivery encounters an error
    return await sendMessage(chatId, caption);
  } catch {
    return await sendMessage(chatId, caption);
  }
}

// Helper to delay for rate limits (20 requests/sec safe window)
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function POST(req: NextRequest) {
  try {
    const { getServerAuth } = await import('@/lib/auth-server');
    const { user, profile, role } = await getServerAuth();
    if (!user || (role !== 'admin' && role !== 'principal' && role !== 'teacher')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const { class_id, month } = await req.json();

    if (!class_id || !month) {
      return NextResponse.json({ error: 'class_id and month are required' }, { status: 400 });
    }

    // 1. Get class info including school, academic year, grade, track, and teacher_id
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name, school_id, academic_year_id, grade, track, teacher_id')
      .eq('id', class_id)
      .single();

    if (classError || !classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    if ((role === 'principal' || role === 'teacher') && classData.school_id !== profile?.school_id) {
      return NextResponse.json({ error: 'Forbidden: You cannot broadcast scores for a class outside your school.' }, { status: 403 });
    }

    if (role === 'teacher' && classData.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only broadcast scores for your assigned homeroom class.' }, { status: 403 });
    }

    // Fetch Academic Year details for period boundary resolution
    let academicYear: { start_date?: string; end_date?: string; name?: string } | null = null;
    if (classData.academic_year_id) {
      const { data: yearData } = await supabase
        .from('academic_years')
        .select('name, start_date, end_date')
        .eq('id', classData.academic_year_id)
        .maybeSingle();
      academicYear = yearData;
    }

    // 2. Get students enrolled in the class
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('student_enrollments')
      .select('student_id, students(id, full_name, is_active)')
      .eq('class_id', class_id);

    if (enrollmentsError || !enrollments) {
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }

    const studentIds = enrollments.map(e => e.student_id);

    if (studentIds.length === 0) {
      return NextResponse.json({ message: 'No students found in this class', count: 0 });
    }

    // 3. Get active Telegram subscriptions for these students
    const { data: subscriptions, error: subsError } = await supabase
      .from('telegram_parent_subscriptions')
      .select('telegram_chat_id, student_id')
      .in('student_id', studentIds)
      .eq('is_active', true);

    if (subsError || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No active subscriptions found for this class', count: 0 });
    }

    // 4. Fetch published scores restricted to class, period, and academic year
    let scoreQuery = supabase
      .from('grades')
      .select('student_id, total_score, scores, status, academic_year_id')
      .eq('class_id', class_id)
      .eq('period', month)
      .eq('status', 'published');

    if (classData.academic_year_id) {
      scoreQuery = scoreQuery.eq('academic_year_id', classData.academic_year_id);
    }

    const { data: masterScores, error: scoreError } = await scoreQuery;
    if (scoreError) {
      return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 });
    }

    const rankedScores = assignGradeRanks(
      (masterScores || []).map(s => ({
        ...s,
        totalCount: (masterScores || []).length
      })),
      s => s.total_score || 0
    );

    // 5. Query attendance using dual-source resolution (Monthly Summaries + Daily Records with E/A codes)
    const range = resolvePeriodDateRange(month, academicYear);
    const targetIsoMonth = range.startDate.substring(0, 7);

    const { data: monthlySummaries } = await supabase
      .from('monthly_attendance_summaries')
      .select('student_id, permission_count, absent_count')
      .eq('class_id', class_id)
      .eq('month', targetIsoMonth);

    const monthlySummaryMap = new Map<string, { excused: number; unexcused: number }>();
    if (monthlySummaries) {
      for (const ms of monthlySummaries) {
        monthlySummaryMap.set(ms.student_id, {
          excused: Number(ms.permission_count || 0),
          unexcused: Number(ms.absent_count || 0)
        });
      }
    }

    const { data: attendance, error: attError } = await supabase
      .from('attendance_records')
      .select('student_id, status')
      .eq('class_id', class_id)
      .gte('date', range.startDate)
      .lte('date', range.endDate);

    if (attError) {
      return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
    }

    const { schema, gradingScales, totalCoefficient } = await fetchClassExamStandards(
      supabase,
      classData.academic_year_id,
      classData.grade,
      classData.track
    );
    let successCount = 0;
    
    // 6. Broadcast to each subscribed parent
    for (const sub of subscriptions) {
      const student = enrollments.find(e => e.student_id === sub.student_id)?.students;
      if (!student) continue;

      const scoreData = rankedScores.find(s => s.student_id === sub.student_id);
      const studentScores = (scoreData?.scores as Record<string, number>) || {};
      const calculation = calculateStudentMonthlyGrade(studentScores, schema, gradingScales);

      let excused = 0;
      let unexcused = 0;
      const monthlySummary = monthlySummaryMap.get(sub.student_id);
      if (monthlySummary) {
        excused = monthlySummary.excused;
        unexcused = monthlySummary.unexcused;
      } else {
        const attData = attendance?.filter(a => a.student_id === sub.student_id) || [];
        for (const a of attData) {
          const s = (a.status || '').toLowerCase();
          if (s === 'permission' || s === 'e' || s === 'excused') excused++;
          else if (s === 'absent' || s === 'a' || s === 'unexcused') unexcused++;
        }
      }

      const message = `
🏫 <b>វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</b>
📜 <b>ព្រឹត្តិបត្រពិន្ទុ:</b> ${range.khmerLabel}
👤 <b>សិស្ស:</b> ${(student as any).full_name} | ថ្នាក់៖ ${classData.name}
------------------------------
🥇 <b>ចំណាត់ថ្នាក់:</b> ${scoreData ? `${scoreData.rank} / ${scoreData.totalCount}` : 'N/A'}
📈 <b>ពិន្ទុសរុប:</b> ${scoreData?.total_score || 0} / ${calculation.maxTotal}
⭐️ <b>មធ្យមភាគ:</b> ${calculation.averageScore50.toFixed(2)} / 50 (មេគុណ: ${calculation.totalCoefficient}) | និទ្ទេស: ${calculation.gradeMentionKh}
📅 <b>អវត្តមាន:</b> ច្បាប់ ${excused} ដង | ឥតច្បាប់ ${unexcused} ដង
------------------------------
<i>ភ្ជាប់ជូននូវសន្លឹកព្រឹត្តិបត្រពិន្ទុផ្លូវការ (រូបភាព)។</i>
      `.trim();

      const reportCardImageUrl = `${APP_URL}/api/report-cards/image?student_id=${sub.student_id}&period=${encodeURIComponent(month)}${classData.academic_year_id ? `&academic_year_id=${classData.academic_year_id}` : ''}`;

      const tgRes = await sendPhotoOrMessage(sub.telegram_chat_id, reportCardImageUrl, message);
      if (tgRes && tgRes.ok) {
        successCount++;
      } else {
        const err = await tgRes.json().catch(() => ({}));
        console.error(`Telegram send failed for student ${sub.student_id}:`, err);
      }

      // Rate limiting: 75ms delay
      await delay(75);
    }

    return NextResponse.json({ success: true, count: successCount });
  } catch (error) {
    console.error('Broadcast Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

