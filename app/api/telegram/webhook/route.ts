import { NextResponse } from 'next/server';

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

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
        [{ text: '🌐 បើកប្រព័ន្ធគ្រប់គ្រង (App)', url: 'https://porieng.edu.kh' }]
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
              [{ text: '📋 បញ្ជីឈ្មោះ និងប្រវត្តិសិស្ស', callback_data: 'guide_student_profile' }],
              [{ text: '📅 ស្រង់វត្តមាន (Attendance)', callback_data: 'guide_attendance' }],
              [{ text: '🏥 តាមដានសុខភាពសិស្ស', callback_data: 'guide_health' }],
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
              [{ text: '📝 បញ្ចូលពិន្ទុ (នាំចូល Excel)', callback_data: 'guide_grades' }],
              [{ text: '📊 បោះពុម្ពព្រឹត្តិបត្រពិន្ទុ', callback_data: 'guide_report_cards' }],
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
          responseText = `📋 **របៀបមើលបញ្ជីឈ្មោះសិស្ស**\n\n1. ចូលទៅកាន់ "ការគ្រប់គ្រងសិស្ស" > "បញ្ជីឈ្មោះសិស្ស"។\n2. លោកអ្នកនឹងឃើញតារាងឈ្មោះសិស្សក្នុងថ្នាក់របស់លោកអ្នក។\n3. ចុចលើឈ្មោះសិស្ស ដើម្បីមើលប្រវត្តិលម្អិត លទ្ធផលសិក្សា និងវត្តមាន។`;
          keyboard = { inline_keyboard: [[{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_students' }]] };
          break;

        case 'guide_attendance':
          responseText = `📅 **របៀបស្រង់វត្តមានសិស្ស**\n\n1. ចូលទៅកាន់ "វត្តមាន" ពីរបារចំហៀង។\n2. ជ្រើសរើសថ្ងៃខែឆ្នាំដែលចង់ស្រង់ (លេខ១ ដល់ ៣១)។\n3. ធីក (Tick) លើឈ្មោះសិស្សដែលអវត្តមាន។\n4. បញ្ជាក់មូលហេតុ (មានច្បាប់ ឈឺ ឬអត់ច្បាប់)។\n5. ប្រព័ន្ធនឹងធ្វើការកត់ត្រាដោយស្វ័យប្រវត្តិ។`;
          keyboard = { inline_keyboard: [[{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_students' }]] };
          break;

        case 'guide_health':
          responseText = `🏥 **របៀបកត់ត្រាសុខភាពសិស្ស**\n\n1. ចូលទៅកាន់ "សុខភាពសិក្សា" (Health)។\n2. លោកអ្នកអាចកត់ត្រា កម្ពស់ ទម្ងន់ និងបញ្ហាសុខភាព (ឧ. ខ្សោយគំហើញ)។\n3. ប្រព័ន្ធនឹងបង្ហាញចំណាត់ថ្នាក់ BMI (ស្គម ធាត់) ដោយស្វ័យប្រវត្តិ។`;
          keyboard = { inline_keyboard: [[{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_students' }]] };
          break;

        case 'guide_support':
          responseText = `🤝 **របៀបចុះកំណត់ត្រាគាំទ្រសិស្ស**\n\n1. ចូលទៅកាន់ "គាំទ្រសិស្ស" (Support)។\n2. ចុចប៊ូតុង "+ បង្កើតករណីថ្មី"។\n3. ជ្រើសរើសឈ្មោះសិស្ស, ប្រភេទបញ្ហា (ឧ. អវត្តមានច្រើន), និងកម្រិតអាទិភាព។\n4. បំពេញការពិពណ៌នា ហើយចុចរក្សាទុក ដើម្បីឱ្យសាលាតាមដាន។`;
          keyboard = { inline_keyboard: [[{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_students' }]] };
          break;

        // --- GUIDES: ACADEMICS ---
        case 'guide_grades':
          responseText = `📝 **របៀបបញ្ចូលពិន្ទុតាមរយៈ Excel**\n\n1. ចូលទៅកាន់ "ពិន្ទុ & ថ្នាក់បំប៉ន" (Grades)។\n2. ជ្រើសរើសខែ/ឆមាស ខាងលើ។\n3. ចុចប៊ូតុង "ទាញយកគំរូ Excel" ដើម្បីដោនឡូតតារាង។\n4. បើកឯកសារ Excel នោះ រួចវាយពិន្ទុមុខវិជ្ជា។\n5. រក្សាទុក (Save) ហើយត្រឡប់មកប្រព័ន្ធវិញ ចុច "នាំចូលពិន្ទុ" និងរើសឯកសារ Excel នោះ។`;
          keyboard = { inline_keyboard: [[{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_academics' }]] };
          break;

        case 'guide_report_cards':
          responseText = `📊 **របៀបទាញយកព្រឹត្តិបត្រពិន្ទុ**\n\n1. ចូលទៅកាន់ "ព្រឹត្តិបត្រពិន្ទុ" (Report Cards)។\n2. ជ្រើសរើស ថ្នាក់ និង ខែ/ឆមាស។\n3. ប្រព័ន្ធនឹងបង្កើតព្រឹត្តិបត្រពិន្ទុសម្រាប់សិស្សទាំងអស់។\n4. ចុចប៊ូតុង "បោះពុម្ពព្រឹត្តិបត្រ" នៅខាងលើស្តាំ ដើម្បីព្រីន ឬរក្សាទុកជា PDF។`;
          keyboard = { inline_keyboard: [[{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_academics' }]] };
          break;

        case 'guide_records':
          responseText = `📖 **របៀបប្រើប្រាស់សៀវភៅសិក្ខាគារិក**\n\n1. ចូលទៅកាន់ "សៀវភៅសិក្ខាគារិក"។\n2. ផ្ទាំងនេះបង្ហាញពីទិន្នន័យរួមបញ្ចូលគ្នារបស់សិស្សម្នាក់ៗ (វត្តមាន ពិន្ទុ ចំណាត់ថ្នាក់) សរុបប្រចាំឆ្នាំ។\n3. វាប្រើសម្រាប់សរុបលទ្ធផលចុងឆ្នាំ។`;
          keyboard = { inline_keyboard: [[{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_academics' }]] };
          break;

        // --- GUIDES: MANAGEMENT ---
        case 'guide_parents':
          responseText = `📞 **ទំនាក់ទំនងមាតាបិតា**\n\n1. ចូលទៅកាន់ "មាតាបិតា"។\n2. លោកអ្នកនឹងឃើញលេខទូរស័ព្ទរបស់អាណាព្យាបាលសិស្សទាំងអស់ក្នុងថ្នាក់។\n3. អ្នកអាចចុចលេខដើម្បីហៅចេញដោយផ្ទាល់។`;
          keyboard = { inline_keyboard: [[{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_management' }]] };
          break;

        case 'guide_monthly_reports':
          responseText = `📈 **របាយការណ៍ប្រចាំខែ**\n\n1. ចូលទៅកាន់ "របាយការណ៍"។\n2. ប្រព័ន្ធបានបូកសរុបទិន្នន័យ (សិស្សបោះបង់ការសិក្សា, អវត្តមាន, ការឡើងថ្នាក់) រួចជាស្រេច។\n3. អ្នកអាចចុចទាញយក (Download) ដើម្បីយកឯកសារនេះបញ្ជូនទៅនាយកសាលា។`;
          keyboard = { inline_keyboard: [[{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_management' }]] };
          break;

        case 'guide_documents':
          responseText = `📂 **ឯកសារទូទៅ & គម្រោង**\n\n- ប្រើផ្ទាំង "ឯកសារ" សម្រាប់រក្សាទុក ឬទាញយកឯកសាររដ្ឋបាលផ្សេងៗរបស់សាលា។\n- ប្រើផ្ទាំង "ឯកសារគម្រោង" (GEIP) ដើម្បីបញ្ជូនរូបភាពសកម្មភាព (ឧ. សកម្មភាពបង្រៀនបំប៉ន) ទៅកាន់គណៈគ្រប់គ្រងសាលា។`;
          keyboard = { inline_keyboard: [[{ text: '« ត្រឡប់ក្រោយ', callback_data: 'menu_management' }]] };
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
