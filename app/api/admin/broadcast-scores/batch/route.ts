import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TELEGRAM_BOT_TOKEN = process.env.PARENT_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

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
    const { class_ids, month } = await req.json();

    if (!class_ids || !Array.isArray(class_ids) || !month) {
      return NextResponse.json({ error: 'class_ids array and month are required' }, { status: 400 });
    }

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
          .select('name')
          .eq('id', class_id)
          .single();

        if (classError || !classData) {
          throw new Error('Class not found');
        }

        const className = classData.name;

        // 2. Get students in the class
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('student_enrollments')
          .select('student_id, students(full_name)')
          .eq('class_id', class_id);

        if (enrollmentsError || !enrollments) {
          throw new Error('Failed to fetch students');
        }

        const studentIds = enrollments.map(e => e.student_id);

        if (studentIds.length === 0) {
          summary.failed.push({ classId: class_id, className, error: 'មិនទាន់កំណត់ Telegram Chat ID ឬគ្មានអ្នកទទួល' });
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

        // 4. Fetch scores & attendance
        const { data: masterScores, error: scoreError } = await supabase
          .from('grades')
          .select('student_id, total_score')
          .eq('class_id', class_id)
          .eq('period', month);

        if (scoreError) throw new Error('Failed to fetch scores');

        const sortedScores = (masterScores || []).sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
        const rankedScores = sortedScores.map((s, index) => ({
          ...s,
          rank: index + 1
        }));

        const { data: attendance, error: attError } = await supabase
          .from('attendance_records')
          .select('student_id, status')
          .eq('class_id', class_id)
          .like('date', `${month}%`); // Simple matching for YYYY-MM

        if (attError) throw new Error('Failed to fetch attendance');

        let classHasErrors = false;
        let lastErrorMsg = '';
        
        // 5. Broadcast to each subscribed parent
        for (const sub of subscriptions) {
          const student = enrollments.find(e => e.student_id === sub.student_id)?.students;
          if (!student) continue;

          const scoreData = rankedScores.find(s => s.student_id === sub.student_id);
          const attData = attendance?.filter(a => a.student_id === sub.student_id && a.status !== 'present') || [];
          const absences = attData.length;

          const message = `
🏫 <b>សាលា:</b> វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង
👤 <b>សិស្ស:</b> ${(student as any).full_name} | ថ្នាក់: ${className}
📊 <b>លទ្ធផលសិក្សាប្រចាំខែ:</b> ${month}
------------------------------
🥇 <b>ចំណាត់ថ្នាក់:</b> ${scoreData?.rank || 'N/A'}
📈 <b>ពិន្ទុសរុប:</b> ${scoreData?.total_score || 0}
📅 <b>អវត្តមានខែនេះ:</b> ${absences} ដង
------------------------------
<i>សូមជម្រាបជូនអាណាព្យាបាលជ្រាបជាព័ត៌មាន។ សូមអរគុណ!</i>
          `;

          const tgRes = await sendMessage(sub.telegram_chat_id, message);
          if (!tgRes.ok) {
             const errBody = await tgRes.json().catch(() => ({}));
             const errorMsg = errBody.description || `HTTP ${tgRes.status}`;
             console.error(`Telegram failed for class ${className}:`, errorMsg);
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
          const { data } = await supabase.from('classes').select('name').eq('id', f.classId).single();
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
