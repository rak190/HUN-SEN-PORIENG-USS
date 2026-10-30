import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurriculumSchemaForClass, fetchClassExamStandards } from '@/lib/curriculum';
import { calculateStudentMonthlyGrade, assignGradeRanks } from '@/lib/domain/grading';
import { resolvePeriodDateRange } from '@/lib/domain/periods';

const TELEGRAM_BOT_TOKEN = process.env.PARENT_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hun-sen-porieng-uss.vercel.app';

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

// Helper to delay for rate limits
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export interface BroadcastSummary {
  total: number;
  succeeded: { classId: string; className: string }[];
  failed: { classId: string; className: string; error: string }[];
  isFullSuccess: boolean;
  isPartialSuccess: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { getServerAuth } = await import('@/lib/auth-server');
    const { user, profile, role } = await getServerAuth();
    if (!user || !profile?.is_active || !profile.school_id || (role !== 'admin' && role !== 'principal')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const { class_ids, month } = await req.json();

    if (!class_ids || !Array.isArray(class_ids) || !month) {
      return NextResponse.json({ error: 'class_ids array and month are required' }, { status: 400 });
    }

    // Next.js imports route modules during builds. Privileged clients belong to authorized requests only.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Broadcast service is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' }, { status: 503 });
    }
    const supabase = createAdminClient();

    const summary: BroadcastSummary = {
      total: class_ids.length,
      succeeded: [],
      failed: [],
      isFullSuccess: false,
      isPartialSuccess: false,
    };

    // Process classes sequentially to prevent overwhelming the DB or hitting global rate limits too fast
    for (const class_id of class_ids) {
      try {
        // 1. Get class info
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id, name, school_id, academic_year_id, grade, track')
          .eq('id', class_id)
          .single();

        if (classError || !classData) {
          throw new Error('Class not found');
        }

        if (classData.school_id !== profile.school_id) {
          throw new Error('Forbidden: You cannot broadcast scores for a class outside your school.');
        }

        const className = classData.name;

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

        // 2. Get students in the class
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('student_enrollments')
          .select('student_id, students(id, full_name, is_active)')
          .eq('class_id', class_id);

        if (enrollmentsError || !enrollments) {
          throw new Error('Failed to fetch students');
        }

        const studentIds = enrollments.map(e => e.student_id);

        if (studentIds.length === 0) {
          summary.failed.push({ classId: class_id, className, error: 'មិនទាន់មានសិស្សក្នុងថ្នាក់នេះ' });
          continue; // No students to broadcast to
        }

        // 3. Get active Telegram subscriptions for these students
        const { data: subscriptions, error: subsError } = await supabase
          .from('telegram_parent_subscriptions')
          .select('telegram_chat_id, student_id')
          .in('student_id', studentIds)
          .eq('is_active', true);

        if (subsError) {
          throw new Error('Failed to fetch parent subscriptions');
        }
        
        if (!subscriptions || subscriptions.length === 0) {
          summary.failed.push({ classId: class_id, className, error: 'មិនទាន់កំណត់ Telegram Chat ID ឬគ្មានអ្នកទទួល' });
          continue; // No subscriptions
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
        if (scoreError) throw new Error('Failed to fetch scores');

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

        if (attError) throw new Error('Failed to fetch attendance');

        const { schema, gradingScales, totalCoefficient } = await fetchClassExamStandards(
          supabase,
          classData.academic_year_id,
          classData.grade,
          classData.track
        );
        let classHasErrors = false;
        let lastErrorMsg = '';
        
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
👤 <b>សិស្ស:</b> ${(student as any).full_name} | ថ្នាក់៖ ${className}
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
          if (!tgRes || !tgRes.ok) {
            const errBody = tgRes ? await tgRes.json().catch(() => ({})) : {};
            const errorMsg = errBody.description || (tgRes ? `HTTP ${tgRes.status}` : 'Network error');
            console.error(`Telegram failed for student ${sub.student_id} in class ${className}:`, errorMsg);
            classHasErrors = true;
            lastErrorMsg = errorMsg;
          }
          // Rate limiting: delay between 50-75ms as requested to respect limits
          await delay(75);
        }

        if (classHasErrors) {
          summary.failed.push({ classId: class_id, className, error: lastErrorMsg });
        } else {
          summary.succeeded.push({ classId: class_id, className });
        }
        
        // Wait between classes to reduce overall load
        await delay(100);

      } catch (classProcessingError: any) {
         console.error(`Failed to process class ${class_id}:`, classProcessingError);
         summary.failed.push({ 
           classId: class_id, 
           className: class_id, // We might not have the class name if it failed early
           error: classProcessingError.message || 'Unknown error' 
         });
      }
    }

    
    // Resolve class names for failed items that couldn't fetch it
    for (const f of summary.failed) {
       if (f.className === f.classId) {
          const { data } = await supabase.from('classes').select('name').eq('id', f.classId).eq('school_id', profile.school_id).single();
          if (data) f.className = data.name;
       }
    }

    summary.isFullSuccess = summary.failed.length === 0 && summary.total > 0;
    summary.isPartialSuccess = summary.failed.length > 0 && summary.succeeded.length > 0;

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Batch Broadcast Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
