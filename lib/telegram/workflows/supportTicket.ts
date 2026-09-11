import { getFile, downloadFile, sendPhoto, sendMessage } from '../bot';
import { TelegramAuthSession } from '../auth';

export async function handleSupportTicket(chatId: number, fileId: string, session: TelegramAuthSession, caption?: string) {
  const adminGroupId = process.env.ADMIN_TELEGRAM_GROUP_ID;
  
  if (!adminGroupId) {
    // If no admin group is configured, just send a friendly fallback message
    await sendMessage(
      chatId, 
      '✅ អរគុណសម្រាប់ការផ្ញើរូបភាព!\n\n(ចំណាំ: បច្ចុប្បន្នប្រព័ន្ធមិនទាន់បានភ្ជាប់ជាមួយក្រុម Admin នៅឡើយទេ។ សូមទាក់ទង Admin ដោយផ្ទាល់។)'
    );
    return;
  }

  // Acknowledge receipt to the teacher
  await sendMessage(chatId, '📤 ទទួលបានរូបភាព! កំពុងបញ្ជូនទៅកាន់ក្រុមការងារ Admin...');

  try {
    // 1. Get file metadata from Telegram
    const fileData = await getFile(fileId);
    if (!fileData || !fileData.file_path) {
      await sendMessage(chatId, '⚠️ មានបញ្ហាក្នុងការទាញយករូបភាព។ សូមផ្ញើវាម្តងទៀត។');
      return;
    }

    // Since Telegram bots can pass file_ids directly to other chats (if the bot can see both),
    // we don't actually need to download the buffer to forward it! We can just use the file_id.
    // This is much faster and saves bandwidth.
    
    const roleKhmer = session.role === 'admin' ? 'អ្នកគ្រប់គ្រង' : (session.role === 'principal' ? 'នាយកសាលា' : 'លោកគ្រូ/អ្នកគ្រូ');
    const ticketCaption = `🚨 **ជំនួយបច្ចេកទេសថ្មី**\n\n👤 ពី: ${session.fullName} (${roleKhmer})\n🏫 សាលា: ${session.schoolId}\n💬 សារ: ${caption || 'គ្មានសារបញ្ជាក់'}\n\nសូមក្រុមការងារជួយពិនិត្យមើលរូបភាពនេះ!`;

    // 2. Forward the photo to the Admin Group using the existing file_id
    await sendPhoto(Number(adminGroupId), fileId, ticketCaption);

    // 3. Confirm with the user
    await sendMessage(
      chatId,
      '✅ រូបភាពត្រូវបានបញ្ជូនទៅកាន់ក្រុម Admin រួចរាល់។\n\nក្រុមការងារនឹងពិនិត្យ និងទាក់ទងទៅលោកគ្រូ/អ្នកគ្រូក្នុងពេលឆាប់ៗនេះ។'
    );
  } catch (error) {
    console.error('Error forwarding support ticket:', error);
    await sendMessage(chatId, '⚠️ មានបញ្ហាក្នុងការបញ្ជូនរូបភាពទៅ Admin។ សូមទាក់ទង Admin ដោយផ្ទាល់។');
  }
}
