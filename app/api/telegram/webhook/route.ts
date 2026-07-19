import { NextResponse } from 'next/server';

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hun-sen-porieng-uss.vercel.app';

async function sendMessage(chatId: number, text: string, replyMarkup?: any, parseMode: string = 'Markdown') {
  try {
    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: replyMarkup,
        parse_mode: parseMode,
      }),
    });
  } catch (error) {
    console.error('Error sending message to Telegram:', error);
  }
}

async function editMessageText(chatId: number, messageId: number, text: string, replyMarkup?: any, parseMode: string = 'Markdown') {
  try {
    await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        reply_markup: replyMarkup,
        parse_mode: parseMode,
      }),
    });
  } catch (error) {
    console.error('Error editing message:', error);
  }
}

export async function POST(req: Request) {
  try {
    const update = await req.json();

    // 1. MAIN MENU
    const MAIN_MENU_TEXT = `👋 សួស្តី! ខ្ញុំជា Bot ជំនួយការរបស់ **វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង**។\n\nសូមជ្រើសរើសផ្នែកដែលលោកគ្រូ/អ្នកគ្រូត្រូវការជំនួយខាងក្រោម៖`;
    const MAIN_MENU_KEYBOARD = {
      inline_keyboard: [
        [{ text: '👥 ការគ្រប់គ្រងសិស្ស', callback_data: 'menu_students' }],
        [{ text: '📚 ការសិក្សា និងពិន្ទុ', callback_data: 'menu_academics' }],
        [{ text: '🏢 ការងាររដ្ឋបាល', callback_data: 'menu_management' }],
        [{ text: '❓ សំណួរទូទៅ (FAQ)', callback_data: 'menu_faq' }],
        [{ text: '🌐 បើកប្រព័ន្ធគ្រប់គ្រងផ្ទាល់ (App)', url: APP_URL }]
      ]
    };

    // HANDLE TEXT COMMANDS
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      if (text === '/start' || text === '/help') {
        await sendMessage(chatId, MAIN_MENU_TEXT, MAIN_MENU_KEYBOARD);
      } else {
        await sendMessage(chatId, 'សូមចុចពាក្យ /start ដើម្បីបើកម៉ឺនុយជំនួយ។');
      }
      return NextResponse.json({ ok: true });
    }

    // HANDLE BUTTON CLICKS
    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const messageId = update.callback_query.message.message_id;
      const data = update.callback_query.data;

      let responseText = '';
      let keyboard: any = null;

      switch (data) {
        // --- BACK TO MAIN MENU ---
        case 'menu_main':
          responseText = MAIN_MENU_TEXT;
          keyboard = MAIN_MENU_KEYBOARD;
          break;

        // --- SUBMENU: STUDENTS ---
        case 'menu_students':
          responseText = `👥 **ការគ្រប់គ្រងសិស្ស**\n\nតើអ្នកចង់ដឹងពីរបៀបធ្វើអ្វីខ្លះទាក់ទងនឹងការគ្រប់គ្រងសិស្ស?`;
          keyboard = {
            inline_keyboard: [
              [{ text: '📋 មើលបញ្ជីឈ្មោះសិស្ស', callback_data: 'guide_student_profile' }],
              [{ text: '📅 ស្រង់វត្តមានប្រចាំថ្ងៃ', callback_data: 'guide_attendance' }],
              [{ text: '🏥 តាមដានសុខភាព (BMI)', callback_data: 'guide_health' }],
              [{ text: '🤝 ចុះករណីគាំទ្រសិស្ស', callback_data: 'guide_support' }],
              [{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_main' }]
            ]
          };
          break;

        // --- SUBMENU: ACADEMICS ---
        case 'menu_academics':
          responseText = `📚 **ការសិក្សា និងពិន្ទុ**\n\nតើអ្នកចង់ដឹងពីរបៀបធ្វើអ្វីខ្លះទាក់ទងនឹងការសិក្សា?`;
          keyboard = {
            inline_keyboard: [
              [{ text: '📝 បញ្ចូលពិន្ទុ (Excel)', callback_data: 'guide_grades' }],
              [{ text: '📊 ទាញយកព្រឹត្តិបត្រពិន្ទុ', callback_data: 'guide_report_cards' }],
              [{ text: '📖 សៀវភៅសិក្ខាគារិក', callback_data: 'guide_records' }],
              [{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_main' }]
            ]
          };
          break;

        // --- SUBMENU: MANAGEMENT ---
        case 'menu_management':
          responseText = `🏢 **ការងាររដ្ឋបាល**\n\nតើអ្នកចង់ដឹងពីការងាររដ្ឋបាលមួយណា?`;
          keyboard = {
            inline_keyboard: [
              [{ text: '📞 ទំនាក់ទំនងមាតាបិតា', callback_data: 'guide_parents' }],
              [{ text: '📈 របាយការណ៍ប្រចាំខែ', callback_data: 'guide_monthly_reports' }],
              [{ text: '📂 ឯកសារទូទៅ & គម្រោង', callback_data: 'guide_documents' }],
              [{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_main' }]
            ]
          };
          break;

        // --- GUIDES: STUDENTS ---
        case 'guide_student_profile':
          responseText = `📋 **របៀបមើលបញ្ជីឈ្មោះសិស្ស**\n\n🔹 **ជំហានទី១៖** ចុចលើប៊ូតុងខាងក្រោមដើម្បីចូលទៅទំព័រ "សិស្ស"\n🔹 **ជំហានទី២៖** មើលតារាងឈ្មោះសិស្ស\n🔹 **ជំហានទី៣៖** ចុចលើឈ្មោះសិស្សណាមួយដើម្បីមើលព័ត៌មានលម្អិត (វត្តមាន, ពិន្ទុ, ល...)។`;
          keyboard = { inline_keyboard: [
            [{ text: '🚀 បើកទំព័រសិស្ស (Open App)', url: `${APP_URL}/students` }],
            [{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_students' }]
          ] };
          break;

        case 'guide_attendance':
          responseText = `📅 **របៀបស្រង់វត្តមានសិស្ស**\n\n🔹 **ជំហានទី១៖** ចុចលើប៊ូតុង "បើកទំព័រវត្តមាន" ខាងក្រោម។\n🔹 **ជំហានទី២៖** ជ្រើសរើសថ្ងៃខែដែលអ្នកចង់ស្រង់។\n🔹 **ជំហានទី៣៖** ចុច ធីក (✔️) លើឈ្មោះសិស្សអវត្តមាន រួចរើសមូលហេតុ (មានច្បាប់/ឥតច្បាប់)។\nប្រព័ន្ធនឹងរក្សាទុកដោយស្វ័យប្រវត្តិ!`;
          keyboard = { inline_keyboard: [
            [{ text: '🚀 បើកទំព័រវត្តមាន (Open App)', url: `${APP_URL}/attendance` }],
            [{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_students' }]
          ] };
          break;

        case 'guide_health':
          responseText = `🏥 **របៀបកត់ត្រាសុខភាពសិស្ស**\n\n🔹 **ជំហានទី១៖** ចុចលើប៊ូតុង "បើកទំព័រសុខភាព" ខាងក្រោម។\n🔹 **ជំហានទី២៖** វាយបញ្ចូល កម្ពស់ និង ទម្ងន់ របស់សិស្ស។\n🔹 **ជំហានទី៣៖** ប្រព័ន្ធគណនា BMI និងប្រាប់ពីស្ថានភាព (ស្គម ធាត់) ភ្លាមៗ!`;
          keyboard = { inline_keyboard: [
            [{ text: '🚀 បើកទំព័រសុខភាព (Open App)', url: `${APP_URL}/health` }],
            [{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_students' }]
          ] };
          break;

        case 'guide_support':
          responseText = `🤝 **របៀបចុះករណីគាំទ្រសិស្ស**\n\nបើមានសិស្សអវត្តមានច្រើន ឬរៀនខ្សោយខ្លាំង៖\n🔹 **ជំហានទី១៖** ចុចប៊ូតុងខាងក្រោមដើម្បីចូលទំព័រ "គាំទ្រសិស្ស"\n🔹 **ជំហានទី២៖** ចុច "+ បង្កើតថ្មី"\n🔹 **ជំហានទី៣៖** រើសឈ្មោះសិស្ស និងបញ្ហា។ រួចចុច "រក្សាទុក"។`;
          keyboard = { inline_keyboard: [
            [{ text: '🚀 បើកទំព័រគាំទ្រ (Open App)', url: `${APP_URL}/support` }],
            [{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_students' }]
          ] };
          break;

        // --- GUIDES: ACADEMICS ---
        case 'guide_grades':
          responseText = `📝 **របៀបបញ្ចូលពិន្ទុតាមរយៈ Excel**\n\n🔹 **ជំហានទី១៖** ចុចប៊ូតុងខាងក្រោមដើម្បីទៅទំព័រ "ពិន្ទុ"\n🔹 **ជំហានទី២៖** ចុចប៊ូតុង 📥 "ទាញយកគំរូ Excel"\n🔹 **ជំហានទី៣៖** វាយពិន្ទុចូលក្នុង Excel រួច Save\n🔹 **ជំហានទី៤៖** ចុចប៊ូតុង 📤 "នាំចូលពិន្ទុ" (Import) និងរើស File នោះជាការស្រេច!`;
          keyboard = { inline_keyboard: [
            [{ text: '🚀 បើកទំព័រពិន្ទុ (Open App)', url: `${APP_URL}/grades` }],
            [{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_academics' }]
          ] };
          break;

        case 'guide_report_cards':
          responseText = `📊 **របៀបទាញយកព្រឹត្តិបត្រពិន្ទុ**\n\n🔹 **ជំហានទី១៖** ចុចប៊ូតុងខាងក្រោមដើម្បីទៅទំព័រ "ព្រឹត្តិបត្រពិន្ទុ"\n🔹 **ជំហានទី២៖** ជ្រើសរើសខែ ឬឆមាសដែលអ្នកចង់បាន\n🔹 **ជំហានទី៣៖** ប្រព័ន្ធនឹងចេញតារាងព្រឹត្តិបត្រទាំងអស់។ ចុច "បោះពុម្ព" (Print) ជាការស្រេច!`;
          keyboard = { inline_keyboard: [
            [{ text: '🚀 បើកទំព័រព្រឹត្តិបត្រ (Open App)', url: `${APP_URL}/report-cards` }],
            [{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_academics' }]
          ] };
          break;

        case 'guide_records':
          responseText = `📖 **សៀវភៅសិក្ខាគារិក (សរុបចុងឆ្នាំ)**\n\n🔹 ទំព័រនេះជួយលោកគ្រូ/អ្នកគ្រូក្នុងការសរុបលទ្ធផលចុងឆ្នាំដោយស្វ័យប្រវត្តិ។\n🔹 ចុចប៊ូតុងខាងក្រោមដើម្បីចូលមើល!`;
          keyboard = { inline_keyboard: [
            [{ text: '🚀 បើកទំព័រសៀវភៅ (Open App)', url: `${APP_URL}/student-records` }],
            [{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_academics' }]
          ] };
          break;

        // --- GUIDES: MANAGEMENT ---
        case 'guide_parents':
          responseText = `📞 **ទំនាក់ទំនងមាតាបិតាសិស្ស**\n\nលោកគ្រូ/អ្នកគ្រូមិនចាំបាច់កត់លេខទូរស័ព្ទអាណាព្យាបាលសិស្សទុកទៀតទេ!\n🔹 ចុចប៊ូតុងខាងក្រោម អ្នកនឹងឃើញលេខទូរស័ព្ទរបស់អាណាព្យាបាលទាំងអស់។\n🔹 ចុចលើលេខនោះ ដើម្បីហៅទូរស័ព្ទចេញតែម្តង!`;
          keyboard = { inline_keyboard: [
            [{ text: '🚀 បើកទំព័រមាតាបិតា (Open App)', url: `${APP_URL}/parents` }],
            [{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_management' }]
          ] };
          break;

        case 'guide_monthly_reports':
          responseText = `📈 **របាយការណ៍ប្រចាំខែ**\n\n🔹 ប្រព័ន្ធនេះបូកសរុបអវត្តមានសិស្ស និងលទ្ធផលសិស្សដោយស្វ័យប្រវត្តិ។\n🔹 ចុចប៊ូតុងខាងក្រោម ដើម្បីទាញយករបាយការណ៍ផ្ញើទៅនាយកសាលា!`;
          keyboard = { inline_keyboard: [
            [{ text: '🚀 បើកទំព័ររបាយការណ៍ (Open App)', url: `${APP_URL}/reports` }],
            [{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_management' }]
          ] };
          break;

        case 'guide_documents':
          responseText = `📂 **ឯកសាររដ្ឋបាល & GEIP**\n\n🔹 **ឯកសារទូទៅ:** ទាញយកលិខិតរដ្ឋបាលពីសាលា។\n🔹 **គម្រោង GEIP:** អាប់ឡូតរូបភាពសកម្មភាពបង្រៀន (ឯកសារយោង) សម្រាប់ប្រាក់ឧបត្ថម្ភ។\n🔹 ចុចប៊ូតុងខាងក្រោមដើម្បីអនុវត្ត!`;
          keyboard = { inline_keyboard: [
            [{ text: '🚀 បើកទំព័រឯកសារ (Open App)', url: `${APP_URL}/documents` }],
            [{ text: '🚀 បើកទំព័រគម្រោង (GEIP)', url: `${APP_URL}/giep` }],
            [{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_management' }]
          ] };
          break;

        // --- FAQ ---
        case 'menu_faq':
          responseText = `❓ **សំណួរទូទៅ (FAQ)**\n\n**១. ខ្ញុំភ្លេចលេខសម្ងាត់ តើត្រូវធ្វើដូចម្តេច?**\nសូមទាក់ទងទៅកាន់អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin) ប្រចាំសាលាដើម្បីកំណត់លេខសម្ងាត់ថ្មី។\n\n**២. ខ្ញុំបញ្ចូលពិន្ទុខុស តើអាចកែបានទេ?**\nបាន! លោកអ្នកអាចអាប់ឡូតឯកសារ Excel ពិន្ទុថ្មីម្តងទៀត ប្រព័ន្ធនឹងធ្វើបច្ចុប្បន្នភាពទិន្នន័យថ្មី។\n\n**៣. តើខ្ញុំអាចប្រើប្រព័ន្ធនេះលើទូរស័ព្ទដៃបានទេ?**\nបាន! ប្រព័ន្ធត្រូវបានរចនាឡើងឱ្យដំណើរការយ៉ាងរលូនលើទូរស័ព្ទដៃ (Mobile Responsive)។`;
          keyboard = { inline_keyboard: [[{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_main' }]] };
          break;

        default:
          responseText = 'មិនស្គាល់ជម្រើសនេះទេ។ សូមចុចពាក្យ /start សារជាថ្មី។';
          keyboard = null;
      }

      await editMessageText(chatId, messageId, responseText, keyboard);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
