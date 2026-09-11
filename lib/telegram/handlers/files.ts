import { TelegramMessage } from '../types';
import { sendMessage } from '../bot';
import { authenticateUser } from '../auth';

// We will implement the actual logic for processing files in workflows
import { handleGradeImport } from '../workflows/importGrades';
import { handleSupportTicket } from '../workflows/supportTicket';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function handleIncomingFile(chatId: number, message: TelegramMessage) {
  // 1. Authenticate user
  const authSession = await authenticateUser(chatId);
  if (!authSession) {
    await sendMessage(chatId, '⚠️ អ្នកមិនទាន់បានភ្ជាប់គណនីទេ។ សូមបង្កើតកូដភ្ជាប់ពីក្នុងកម្មវិធីសាលា ហើយផ្ញើវាមកទីនេះ។');
    return;
  }

  // 2. Handle Documents (Excel/CSV)
  if (message.document) {
    const doc = message.document;
    
    if (doc.file_size && doc.file_size > MAX_FILE_SIZE) {
      await sendMessage(chatId, '⚠️ ឯកសារនេះធំពេក (លើសពី 20MB)។ សូមបំបែកជាឯកសារតូចៗរួចសាកល្បងម្តងទៀត។');
      return;
    }

    const mime = doc.mime_type || '';
    const name = (doc.file_name || '').toLowerCase();
    
    // Check if it's an Excel or CSV file
    if (
      mime.includes('spreadsheet') || 
      mime.includes('excel') || 
      mime.includes('csv') ||
      name.endsWith('.xlsx') || 
      name.endsWith('.xls') || 
      name.endsWith('.csv')
    ) {
      // Send processing message
      await sendMessage(chatId, '📥 កំពុងទទួលឯកសារពិន្ទុ...\n⏳ សូមរង់ចាំបន្តិច ខ្ញុំកំពុងពិនិត្យទិន្នន័យ។');
      
      // Process grade import
      await handleGradeImport(chatId, doc.file_id, authSession);
      return;
    } else {
      await sendMessage(chatId, '⚠️ ឯកសារនេះមិនមែនជា Excel ឬ CSV ទេ។\n\nសូមទាញយក "គំរូ Excel" ពីក្នុងប្រព័ន្ធ បញ្ចូលពិន្ទុ រួចផ្ញើត្រឡប់មកវិញ។');
      return;
    }
  }

  // 3. Handle Photos
  if (message.photo && message.photo.length > 0) {
    // Photos come in multiple sizes, take the largest one
    const photo = message.photo[message.photo.length - 1];
    
    if (photo.file_size && photo.file_size > MAX_FILE_SIZE) {
      await sendMessage(chatId, '⚠️ រូបភាពនេះធំពេក។ សូមបន្ថយទំហំ ឬផ្ញើជារូបភាពធម្មតា។');
      return;
    }

    // Default to handling it as a support ticket (could add inline keyboard later to choose GEIP vs Support)
    await handleSupportTicket(chatId, photo.file_id, authSession, message.caption);
    return;
  }
}
