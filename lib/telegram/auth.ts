import { createAdminClient } from '@/lib/supabase/admin';
import { sendMessage } from './bot';
import { MAIN_MENU_KEYBOARD, MAIN_MENU_TEXT } from './menus';

export interface TelegramAuthSession {
  userId: string;
  role: string;
  schoolId: string;
  fullName: string;
}

/**
 * Checks if a Telegram Chat ID is linked to a Supabase Profile.
 */
export async function authenticateUser(chatId: number): Promise<TelegramAuthSession | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, role, school_id, full_name')
    .eq('telegram_chat_id', chatId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    userId: data.id,
    role: data.role,
    schoolId: data.school_id,
    fullName: data.full_name
  };
}

/**
 * Handles the /link <code> command from Telegram.
 */
export async function handleLinkCommand(chatId: number, code: string): Promise<boolean> {
  const adminClient = createAdminClient();
  // Find the user with this link code
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, full_name')
    .eq('telegram_link_code', code)
    .single();

  if (error || !data) {
    await sendMessage(
      chatId, 
      '⚠️ កូដភ្ជាប់មិនត្រឹមត្រូវ ឬផុតកំណត់។ សូមចូលទៅកាន់កម្មវិធី ដើម្បីបង្កើតកូដភ្ជាប់ម្តងទៀត។'
    );
    return false;
  }

  // Update the user's profile with their chat ID and clear the link code
  const updateRes = await adminClient
    .from('profiles')
    .update({ 
      telegram_chat_id: chatId,
      telegram_link_code: null // clear the code after use
    })
    .eq('id', data.id);

  if (updateRes.error) {
    await sendMessage(chatId, '⚠️ មានបញ្ហាក្នុងការភ្ជាប់គណនី។ សូមព្យាយាមម្តងទៀត។');
    return false;
  }

  await sendMessage(
    chatId,
    `✅ ភ្ជាប់គណនីជោគជ័យ!\n\nសួស្តី លោកគ្រូ/អ្នកគ្រូ **${data.full_name}** 👋\n\nឥឡូវនេះលោកគ្រូអ្នកគ្រូអាចប្រើប្រាស់មុខងារផ្សេងៗរបស់ Bot បានហើយ។`,
    MAIN_MENU_KEYBOARD
  );

  return true;
}
