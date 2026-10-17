import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurriculumSchemaForClass, fetchClassExamStandards } from '@/lib/curriculum';
import { calculateStudentMonthlyGrade } from '@/lib/domain/grading';
import { resolvePeriodDateRange } from '@/lib/domain/periods';

const TELEGRAM_BOT_TOKEN = process.env.PARENT_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hun-sen-porieng-uss.vercel.app';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getPersistentMenu() {
  return {
    keyboard: [
      [{ text: "📊 ពិន្ទុចុងក្រោយ" }, { text: "👨‍👩‍👧 កូនៗរបស់ខ្ញុំ" }],
      [{ text: "➕ បន្ថែមកូនម្នាក់ទៀត" }, { text: "⚠️ រាយការណ៍បញ្ហា" }]
    ],
    resize_keyboard: true,
    is_persistent: true
  };
}

async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  return fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    })
  });
}

async function sendPhoto(chatId: number, photoUrl: string, caption: string, replyMarkup?: any) {
  try {
    const res = await fetch(`${TELEGRAM_API_URL}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('Telegram sendPhoto failed, falling back to sendMessage:', err);
      return await sendMessage(chatId, caption, replyMarkup);
    }
    return res;
  } catch (err) {
    console.error('sendPhoto network error, falling back to sendMessage:', err);
    return await sendMessage(chatId, caption, replyMarkup);
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text
    })
  });
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token');

    // Fail closed: Webhook secret must be set and match exactly
    if (!webhookSecret || incomingSecret !== webhookSecret) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const update = await req.json();

    // ============================================
    // Handle Callback Queries (Inline Keyboards)
    // ============================================
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const data = callbackQuery.data;
      const chatId = callbackQuery.message.chat.id;

      if (data === 'manual_select_start') {
        const { data: activeYear } = await supabase
          .from('academic_years')
          .select('id')
          .eq('is_active', true)
          .maybeSingle();

        let classQuery = supabase
          .from('classes')
          .select('id, name')
          .eq('is_archived', false)
          .order('name');

        if (activeYear?.id) {
          classQuery = classQuery.eq('academic_year_id', activeYear.id);
        }

        const { data: classes } = await classQuery;
          
        if (classes) {
          const keyboard = [];
          for (let i = 0; i < classes.length; i += 3) {
            keyboard.push(classes.slice(i, i + 3).map(c => ({
              text: c.name,
              callback_data: `class_${c.id}`
            })));
          }
          await sendMessage(chatId, '📚 សូមជ្រើសរើសថ្នាក់រៀនរបស់កូន៖', { inline_keyboard: keyboard });
        }
      } 
      else if (data.startsWith('class_')) {
        const classId = data.replace('class_', '');
        const { data: enrollments } = await supabase
          .from('student_enrollments')
          .select('students!inner(id, full_name, is_active)')
          .eq('class_id', classId)
          .eq('students.is_active', true);
          
        if (enrollments && enrollments.length > 0) {
          const students = enrollments.map(e => e.students).sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));
          
          const keyboard = [];
          for (let i = 0; i < students.length; i += 2) {
            keyboard.push(students.slice(i, i + 2).map((s: any) => ({
              text: s.full_name,
              callback_data: `student_${s.id}`
            })));
          }
          keyboard.push([{ text: "⬅️ ថយក្រោយ", callback_data: "manual_select_start" }]);
          
          await sendMessage(chatId, '👥 សូមជ្រើសរើសឈ្មោះកូនរបស់អ្នក៖', { inline_keyboard: keyboard });
        } else {
          await sendMessage(chatId, '❌ មិនមានសិស្សក្នុងថ្នាក់នេះទេ។', {
            inline_keyboard: [[{ text: "⬅️ ថយក្រោយ", callback_data: "manual_select_start" }]]
          });
        }
      }
      else if (data.startsWith('student_')) {
        const studentId = data.replace('student_', '');
        const { data: student } = await supabase.from('students').select('full_name').eq('id', studentId).single();
        
        if (student) {
          await supabase.from('telegram_bot_sessions').upsert({
            telegram_chat_id: chatId,
            step: 'awaiting_dob',
            data: { student_id: studentId, student_name: student.full_name }
          });
          
          await sendMessage(chatId, `🔒 ដើម្បីសុវត្ថិភាពទិន្នន័យ សូមបញ្ចូល <b>ថ្ងៃខែឆ្នាំកំណើត</b> របស់កូនឈ្មោះ <b>${student.full_name}</b>\n\n👉 <i>ទម្រង់៖ ថ្ងៃ/ខែ/ឆ្នាំ (ឧទាហរណ៍៖ 11/06/2013)</i>`);
        }
      }
      else if (data === 'check_scores') {
        await handleScoreCheck(chatId);
      }

      await answerCallbackQuery(callbackQuery.id);
      return NextResponse.json({ ok: true });
    }

    // ============================================
    // Handle Messages
    // ============================================
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text || '';

      if (update.message.contact) {
        let phone = update.message.contact.phone_number;
        if (phone.startsWith('+')) phone = phone.substring(1);
        
        const last8 = phone.length >= 8 ? phone.substring(phone.length - 8) : phone;
        
        const { data: students } = await supabase
          .from('students')
          .select('id, full_name, guardian_phone, father_phone, mother_phone')
          .eq('is_active', true)
          .or(`guardian_phone.ilike.%${last8}%,father_phone.ilike.%${last8}%,mother_phone.ilike.%${last8}%`);
          
        const matchedStudents = students || [];

        if (matchedStudents.length === 0) {
          await sendMessage(chatId, '❌ មិនមានទិន្នន័យសិស្សដែលប្រើប្រាស់លេខទូរស័ព្ទនេះនៅក្នុងប្រព័ន្ធឡើយ។\n\nតើលោកអ្នកចង់ជ្រើសរើសឈ្មោះកូនដោយដៃផ្ទាល់ដែរឬទេ?', {
            inline_keyboard: [[{ text: "🔍 ជ្រើសរើសតាមថ្នាក់ & ឈ្មោះកូន", callback_data: "manual_select_start" }]]
          });
          return NextResponse.json({ ok: true });
        }

        const parentName = update.message.contact.first_name || 'Parent';
        for (const student of matchedStudents) {
          await supabase.from('telegram_parent_subscriptions').upsert({
            telegram_chat_id: chatId,
            student_id: student.id,
            guardian_phone: phone,
            parent_name: parentName,
            verified_method: 'phone_match',
            is_active: true
          }, { onConflict: 'telegram_chat_id, student_id' });
        }

        const studentNames = matchedStudents.map((s: any) => s.full_name).join(', ');
        await sendMessage(chatId, `✅ ជោគជ័យ! អ្នកបានភ្ជាប់ជាមួយសិស្ស៖ <b>${studentNames}</b>។\n\nចាប់ពីពេលនេះតទៅ លោកអ្នកនឹងទទួលបានលទ្ធផលសិក្សាប្រចាំខែដោយស្វ័យប្រវត្តិ។`, getPersistentMenu());
        await sendMessage(chatId, 'តើលោកអ្នកចង់ធ្វើអ្វីបន្តទៀត?', {
          inline_keyboard: [
            [{ text: "📊 មើលពិន្ទុឥឡូវនេះ", callback_data: "check_scores" }],
            [{ text: "➕ បន្ថែមកូនម្នាក់ទៀត", callback_data: "manual_select_start" }]
          ]
        });
        return NextResponse.json({ ok: true });
      }

      if (text === '/start' || text === '➕ បន្ថែមកូនម្នាក់ទៀត') {
        const replyMarkup = {
          keyboard: [[{ text: "📱 ចែករំលែកលេខទូរស័ព្ទ (Share Contact)", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true
        };
        await sendMessage(chatId, 'សួស្តី! សូមស្វាគមន៍មកកាន់ប្រព័ន្ធផ្ញើដំណឹងសាលា <b>វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</b>។\n\nដើម្បីទទួលបានលទ្ធផលសិក្សារបស់កូន សូមចុចប៊ូតុងខាងក្រោមដើម្បីចែករំលែកលេខទូរស័ព្ទរបស់អ្នក៖', replyMarkup);
        
        await sendMessage(chatId, 'បើលេខរបស់អ្នកមិនទាន់បានចុះឈ្មោះក្នុងសាលាទេ សូមជ្រើសរើសដោយដៃ៖', {
          inline_keyboard: [[{ text: "🔍 ជ្រើសរើសតាមថ្នាក់ & ឈ្មោះកូន", callback_data: "manual_select_start" }]]
        });
        return NextResponse.json({ ok: true });
      }

      const { data: session } = await supabase.from('telegram_bot_sessions').select('*').eq('telegram_chat_id', chatId).single();
      
      if (session && session.step === 'awaiting_dob') {
        const studentId = session.data.student_id;
        const studentName = session.data.student_name;
        
        const dobInput = text.trim();
        let parsedDate: Date | null = null;
        
        const khmerNums: Record<string, string> = { '០':'0', '១':'1', '២':'2', '៣':'3', '៤':'4', '៥':'5', '៦':'6', '៧':'7', '៨':'8', '៩':'9' };
        const normalizedDob = dobInput
          .replace(/[០-៩]/g, (m: string) => khmerNums[m])
          .replace(/[\s\.\-\\]/g, '/');
        
        const parts = normalizedDob.split('/').filter(Boolean);
        if (parts.length === 3) {
          if (parts[2].length === 4) { // DD/MM/YYYY
            parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          } else if (parts[0].length === 4) { // YYYY-MM-DD
            parsedDate = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
          }
        }

        if (!parsedDate || isNaN(parsedDate.getTime())) {
          await sendMessage(chatId, '⚠️ ទម្រង់ថ្ងៃខែមិនត្រឹមត្រូវទេ។ សូមវាយបញ្ជូលម្តងទៀត (ឧទាហរណ៍៖ 11/06/2013)៖');
          return NextResponse.json({ ok: true });
        }

        const { data: student } = await supabase.from('students').select('dob').eq('id', studentId).single();
        
        const dbDateStr = student?.dob ? new Date(student.dob).toISOString().split('T')[0] : '';
        const inputDateStr = parsedDate.toISOString().split('T')[0];

        if (dbDateStr === inputDateStr) {
          await supabase.from('telegram_parent_subscriptions').upsert({
            telegram_chat_id: chatId,
            student_id: studentId,
            verified_method: 'dob_verification',
            is_active: true
          }, { onConflict: 'telegram_chat_id, student_id' });

          await supabase.from('telegram_bot_sessions').delete().eq('telegram_chat_id', chatId);
          await sendMessage(chatId, `🎉 អបអរសាទរ! លោកអ្នកបានភ្ជាប់ជាមួយសិស្ស <b>${studentName}</b> ដោយជោគជ័យ។`, getPersistentMenu());
          await sendMessage(chatId, 'តើលោកអ្នកចង់ធ្វើអ្វីបន្តទៀត?', {
            inline_keyboard: [
              [{ text: "📊 មើលពិន្ទុឥឡូវនេះ", callback_data: "check_scores" }],
              [{ text: "➕ បន្ថែមកូនម្នាក់ទៀត", callback_data: "manual_select_start" }]
            ]
          });
        } else {
          await sendMessage(chatId, '⚠️ ថ្ងៃខែឆ្នាំកំណើតមិនត្រឹមត្រូវឡើយ។ សូមសាកល្បងម្ដងទៀត ឬទាក់ទងគ្រូបន្ទុកថ្នាក់។', {
            inline_keyboard: [[{ text: "⬅️ ត្រឡប់ក្រោយ", callback_data: "manual_select_start" }]]
          });
        }
        return NextResponse.json({ ok: true });
      }

      if (text === '👨‍👩‍👧 កូនៗរបស់ខ្ញុំ' || text === '👨‍👩‍👧‍👦 កូនៗរបស់ខ្ញុំ') {
        const { data: subs } = await supabase
          .from('telegram_parent_subscriptions')
          .select('students(full_name)')
          .eq('telegram_chat_id', chatId)
          .eq('is_active', true);
          
        if (subs && subs.length > 0) {
          const names = subs.map((s: any) => `• ${s.students.full_name}`).join('\n');
          await sendMessage(chatId, `បញ្ជីឈ្មោះកូនរបស់អ្នក៖\n${names}`);
        } else {
          await sendMessage(chatId, 'អ្នកមិនទាន់បានភ្ជាប់ឈ្មោះសិស្សនៅឡើយទេ។', {
            inline_keyboard: [[{ text: "🔍 ជ្រើសរើសឈ្មោះកូន", callback_data: "manual_select_start" }]]
          });
        }
      }
      else if (
        text === '📊 ពិន្ទុចុងក្រោយ' || 
        text === '📊 មើលពិន្ទុខែចុងក្រោយ' || 
        text === '📜 ព្រឹត្តិបត្រពិន្ទុ' || 
        text === '/scores' || 
        text === '/report_card'
      ) {
        await handleScoreCheck(chatId);
      }
      else if (text === '⚠️ រាយការណ៍បញ្ហា' || text === '⚠️ មើលវត្តមានខែនេះ') {
        await sendMessage(chatId, '⚠️ បើមានបញ្ហាទាក់ទងនឹងប្រព័ន្ធ សូមទាក់ទងទៅកាន់ទីចាត់ការសាលា ឬលោកគ្រូ/អ្នកគ្រូបន្ទុកថ្នាក់ផ្ទាល់។ សូមអរគុណ!');
      }
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ ok: false });
  }
}

async function handleScoreCheck(chatId: number) {
  const { data: subs, error: subsError } = await supabase
    .from('telegram_parent_subscriptions')
    .select('student_id, students(id, full_name)')
    .eq('telegram_chat_id', chatId)
    .eq('is_active', true);

  if (subsError || !subs || subs.length === 0) {
    await sendMessage(chatId, 'សូមភ្ជាប់ឈ្មោះសិស្សជាមុនសិន ដោយចុច "➕ បន្ថែមកូនម្នាក់ទៀត" ឬចែករំលែកលេខទូរស័ព្ទ។');
    return;
  }

  // 1. Fetch Active Academic Year
  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id, name, start_date, end_date')
    .eq('status', 'active')
    .maybeSingle();

  let foundAnyGrades = false;

  for (const sub of subs) {
    const studentName = (sub.students as any)?.full_name || 'សិស្ស';

    // 2. Fetch the latest published grade for this student in the active academic year
    let gradeQuery = supabase
      .from('grades')
      .select('id, student_id, class_id, period, total_score, scores, status, academic_year_id, created_at')
      .eq('student_id', sub.student_id)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (activeYear?.id) {
      gradeQuery = gradeQuery.eq('academic_year_id', activeYear.id);
    }

    const { data: latestGrades } = await gradeQuery.limit(1);
    const g = latestGrades && latestGrades.length > 0 ? latestGrades[0] : null;

    if (!g) {
      await sendMessage(chatId, `ℹ️ <b>${studentName}</b>៖ មិនទាន់មានទិន្នន័យពិន្ទុដែលបានចេញផ្សាយ (Published) នៅឡើយទេ។`);
      continue;
    }

    foundAnyGrades = true;

    // 3. Fetch class information for curriculum schema & name
    const { data: classData } = await supabase
      .from('classes')
      .select('id, name, grade, track')
      .eq('id', g.class_id)
      .maybeSingle();

    const className = classData?.name || 'ទូទៅ';

    // 4. Calculate dynamic standards (coefficients and grading scale from /admin/exam-standards)
    const { schema, gradingScales } = await fetchClassExamStandards(
      supabase,
      g.academic_year_id || activeYear?.id,
      classData?.grade,
      classData?.track
    );
    const scores = (g.scores as Record<string, number>) || {};
    const calculation = calculateStudentMonthlyGrade(scores, schema, gradingScales);

    // 5. Calculate class rank strictly among published grades in the same academic year
    let rankStr = 'N/A';
    let rankQuery = supabase
      .from('grades')
      .select('student_id, total_score')
      .eq('class_id', g.class_id)
      .eq('period', g.period)
      .eq('status', 'published');

    if (g.academic_year_id) {
      rankQuery = rankQuery.eq('academic_year_id', g.academic_year_id);
    }

    const { data: classGrades } = await rankQuery;
    if (classGrades && classGrades.length > 0) {
      const sorted = [...classGrades].sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
      const idx = sorted.findIndex(s => s.student_id === sub.student_id);
      if (idx !== -1) {
        rankStr = `${idx + 1}/${sorted.length}`;
      }
    }

    // 6. Query attendance using authoritative period date range
    const range = resolvePeriodDateRange(g.period, activeYear);
    const { data: attendance } = await supabase
      .from('attendance_records')
      .select('status')
      .eq('student_id', sub.student_id)
      .gte('date', range.startDate)
      .lte('date', range.endDate);

    const excused = (attendance || []).filter(a => a.status === 'permission').length;
    const unexcused = (attendance || []).filter(a => a.status === 'absent').length;

    // 7. Compose Official Khmer Caption with Scale 50 Average and Dynamic Divisor
    const caption = `🏫 <b>វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</b>\n` +
      `📜 <b>ព្រឹត្តិបត្រពិន្ទុ:</b> ${range.khmerLabel}\n` +
      `👤 <b>សិស្ស:</b> <b>${studentName}</b> | ថ្នាក់៖ ${className}\n` +
      `------------------------------\n` +
      `🥇 <b>ចំណាត់ថ្នាក់៖</b> ${rankStr}\n` +
      `📈 <b>ពិន្ទុសរុប៖</b> ${calculation.totalScore} / ${calculation.maxTotal}\n` +
      `⭐️ <b>មធ្យមភាគ៖</b> ${calculation.averageScore50.toFixed(2)} / 50 (មេគុណ៖ ${calculation.totalCoefficient}) | និទ្ទេស៖ ${calculation.gradeMentionKh}\n` +
      `📅 <b>អវត្តមាន៖</b> ច្បាប់ ${excused} ដង | ឥតច្បាប់ ${unexcused} ដង\n` +
      `------------------------------\n` +
      `<i>ភ្ជាប់ជូននូវសន្លឹកព្រឹត្តិបត្រពិន្ទុផ្លូវការ (រូបភាព)។</i>`;

    // 8. Generate Report Card Image URL and send via sendPhoto
    const reportCardImageUrl = `${APP_URL}/api/report-cards/image?student_id=${sub.student_id}&period=${encodeURIComponent(g.period)}${g.academic_year_id ? `&academic_year_id=${g.academic_year_id}` : ''}`;

    await sendPhoto(chatId, reportCardImageUrl, caption, getPersistentMenu());
  }

  if (!foundAnyGrades) {
    await sendMessage(chatId, 'មិនទាន់មានទិន្នន័យពិន្ទុដែលបានចេញផ្សាយនៅឡើយទេ។ សូមទាក់ទងគ្រូបន្ទុកថ្នាក់។', getPersistentMenu());
  }
}

