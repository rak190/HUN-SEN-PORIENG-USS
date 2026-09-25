import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TELEGRAM_BOT_TOKEN = process.env.PARENT_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-telegram-bot-api-secret-token');
    if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const update = await req.json();

    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      // Handle Contact Sharing
      if (update.message.contact) {
        let phone = update.message.contact.phone_number;
        if (phone.startsWith('+')) phone = phone.substring(1);
        
        const { data: students, error } = await supabase
          .from('students')
          .select('id, full_name, guardian_phone, father_phone, mother_phone');
          
        if (error || !students) {
          await sendMessage(chatId, '❌ មានបញ្ហាក្នុងការស្វែងរកទិន្នន័យ។ សូមព្យាយាមម្តងទៀត។');
          return NextResponse.json({ ok: true });
        }

        const matchedStudents = students.filter(s => 
          (s.guardian_phone && s.guardian_phone.replace(/\\D/g, '').endsWith(phone.substring(phone.length - 8))) ||
          (s.father_phone && s.father_phone.replace(/\\D/g, '').endsWith(phone.substring(phone.length - 8))) ||
          (s.mother_phone && s.mother_phone.replace(/\\D/g, '').endsWith(phone.substring(phone.length - 8)))
        );

        if (matchedStudents.length === 0) {
          await sendMessage(chatId, '❌ មិនមានទិន្នន័យសិស្សដែលប្រើប្រាស់លេខទូរស័ព្ទនេះទេ។ សូមទាក់ទងគ្រូប្រចាំថ្នាក់។');
          return NextResponse.json({ ok: true });
        }

        const parentName = update.message.contact.first_name || 'Parent';
        for (const student of matchedStudents) {
          await supabase
            .from('telegram_parent_subscriptions')
            .upsert({
              telegram_chat_id: chatId,
              student_id: student.id,
              guardian_phone: phone,
              parent_name: parentName,
              verified_method: 'phone_match',
              is_active: true
            }, { onConflict: 'telegram_chat_id, student_id' });
        }

        const studentNames = matchedStudents.map((s: any) => s.full_name).join(', ');
        await sendMessage(chatId, `✅ ជោគជ័យ! អ្នកបានភ្ជាប់ជាមួយសិស្ស៖ <b>${studentNames}</b>។\n\nចាប់ពីពេលនេះតទៅ លោកអ្នកនឹងទទួលបានលទ្ធផលសិក្សាប្រចាំខែតាមរយៈ Telegram នេះ។`, { remove_keyboard: true });
        return NextResponse.json({ ok: true });
      }

      // Handle /start
      if (text === '/start') {
        const replyMarkup = {
          keyboard: [
            [{ text: "📱 ចែករំលែកលេខទូរស័ព្ទ (Share Contact)", request_contact: true }]
          ],
          resize_keyboard: true,
          one_time_keyboard: true
        };
        await sendMessage(
          chatId, 
          'សួស្តី! សូមស្វាគមន៍មកកាន់ប្រព័ន្ធផ្ញើដំណឹងសាលា ហ៊ុន សែន ពាមរក៍។\n\nដើម្បីទទួលបានលទ្ធផលសិក្សារបស់កូន សូមចុចប៊ូតុងខាងក្រោមដើម្បីចែករំលែកលេខទូរស័ព្ទរបស់អ្នក៖', 
          replyMarkup
        );
      }
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ ok: false });
  }
}
