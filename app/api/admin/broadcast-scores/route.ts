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

export async function POST(req: NextRequest) {
  try {
    const { class_id, month } = await req.json();

    if (!class_id || !month) {
      return NextResponse.json({ error: 'class_id and month are required' }, { status: 400 });
    }

    // 1. Get class info
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('name')
      .eq('id', class_id)
      .single();

    if (classError || !classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // 2. Get students in the class
    // Wait, the new schema uses student_enrollments to map students to classes
    // But since the project uses class_students or enrollments, let's query student_enrollments.
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('student_enrollments')
      .select('student_id, students(full_name)')
      .eq('class_id', class_id);

    if (enrollmentsError || !enrollments) {
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }

    const studentIds = enrollments.map(e => e.student_id);

    // 3. Get active Telegram subscriptions for these students
    const { data: subscriptions, error: subsError } = await supabase
      .from('telegram_parent_subscriptions')
      .select('telegram_chat_id, student_id')
      .in('student_id', studentIds)
      .eq('is_active', true);

    if (subsError || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No active subscriptions found for this class', count: 0 });
    }

    // 4. Fetch scores & attendance
    const { data: masterScores, error: scoreError } = await supabase
      .from('grades')
      .select('student_id, total_score')
      .eq('class_id', class_id)
      .eq('period', month);

    // Compute ranks and averages in-memory if needed, but for now we'll just sort by total_score
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

    let successCount = 0;
    
    // 5. Broadcast to each subscribed parent
    for (const sub of subscriptions) {
      const student = enrollments.find(e => e.student_id === sub.student_id)?.students;
      if (!student) continue;

      const scoreData = rankedScores.find(s => s.student_id === sub.student_id);
      
      const attData = attendance?.filter(a => a.student_id === sub.student_id && a.status !== 'present') || [];
      const absences = attData.length;

      const message = `
🏫 <b>សាលា:</b> វិទ្យាល័យ ហ៊ុន សែន ពាមរក៍
👤 <b>សិស្ស:</b> ${(student as any).full_name} | ថ្នាក់: ${classData.name}
📊 <b>លទ្ធផលសិក្សាប្រចាំខែ:</b> ${month}
------------------------------
🥇 <b>ចំណាត់ថ្នាក់:</b> ${scoreData?.rank || 'N/A'}
📈 <b>ពិន្ទុសរុប:</b> ${scoreData?.total_score || 0}
📅 <b>អវត្តមានខែនេះ:</b> ${absences} ដង
------------------------------
<i>សូមជម្រាបជូនអាណាព្យាបាលជ្រាបជាព័ត៌មាន។ សូមអរគុណ!</i>
      `;

      await sendMessage(sub.telegram_chat_id, message);
      successCount++;

      // Rate limiting: 20 msgs/sec safely
      await delay(50);
    }

    return NextResponse.json({ success: true, count: successCount });
  } catch (error) {
    console.error('Broadcast Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
