import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TELEGRAM_BOT_TOKEN = process.env.PARENT_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getPersistentMenu() {
  return {
    keyboard: [
      [{ text: "📊 មើលពិន្ទុខែចុងក្រោយ" }, { text: "⚠️ មើលវត្តមានខែនេះ" }],
      [{ text: "👨‍👩‍👧‍👦 កូនៗរបស់ខ្ញុំ" }, { text: "➕ បន្ថែមកូនម្នាក់ទៀត" }]
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
    const secret = req.headers.get('x-telegram-bot-api-secret-token');
    if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
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
        const { data: classes } = await supabase
          .from('classes')
          .select('id, name')
          .eq('is_archived', false)
          .order('name');
          
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
        
        const { data: students } = await supabase
          .from('students')
          .select('id, full_name, guardian_phone, father_phone, mother_phone');
          
        const matchedStudents = (students || []).filter(s => 
          (s.guardian_phone && s.guardian_phone.replace(/\D/g, '').endsWith(phone.substring(phone.length - 8))) ||
          (s.father_phone && s.father_phone.replace(/\D/g, '').endsWith(phone.substring(phone.length - 8))) ||
          (s.mother_phone && s.mother_phone.replace(/\D/g, '').endsWith(phone.substring(phone.length - 8)))
        );

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
        
        const parts = dobInput.split(/[-\/]/);
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
        } else {
          await sendMessage(chatId, '⚠️ ថ្ងៃខែឆ្នាំកំណើតមិនត្រឹមត្រូវឡើយ។ សូមសាកល្បងម្ដងទៀត ឬទាក់ទងគ្រូបន្ទុកថ្នាក់។', {
            inline_keyboard: [[{ text: "⬅️ ត្រឡប់ក្រោយ", callback_data: "manual_select_start" }]]
          });
        }
        return NextResponse.json({ ok: true });
      }

      if (text === '👨‍👩‍👧‍👦 កូនៗរបស់ខ្ញុំ') {
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
      else if (text === '📊 មើលពិន្ទុខែចុងក្រោយ') {
        const { data: subs } = await supabase.from('telegram_parent_subscriptions').select('student_id, students(full_name)').eq('telegram_chat_id', chatId).eq('is_active', true);
        if (!subs || subs.length === 0) {
          await sendMessage(chatId, 'សូមភ្ជាប់ឈ្មោះសិស្សជាមុនសិន។');
          return NextResponse.json({ ok: true });
        }

        const studentIds = subs.map(s => s.student_id);
        const { data: recentGrades } = await supabase.from('grades').select('*').in('student_id', studentIds).order('created_at', { ascending: false }).limit(studentIds.length);
        
        if (recentGrades && recentGrades.length > 0) {
          let msg = `📊 <b>ពិន្ទុខែចុងក្រោយ៖</b>\n\n`;
          for (const sub of subs) {
            const g = recentGrades.find(r => r.student_id === sub.student_id);
            if (g) {
              msg += `👤 <b>${(sub.students as any).full_name}</b> (ខែ ${g.period})\nពិន្ទុសរុប៖ ${g.total_score}\n\n`;
            }
          }
          await sendMessage(chatId, msg);
        } else {
          await sendMessage(chatId, 'មិនទាន់មានទិន្នន័យពិន្ទុនៅឡើយទេ។');
        }
      }
      else if (text === '⚠️ មើលវត្តមានខែនេះ') {
        await sendMessage(chatId, 'មុខងារនេះកំពុងស្ថិតក្នុងការរៀបចំ។');
      }
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ ok: false });
  }
}
