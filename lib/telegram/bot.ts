import { InlineKeyboardMarkup } from './types';

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
// Using Vercel's NEXT_PUBLIC_SITE_URL or fallback. 
// Important: Images must be publicly accessible via this URL.
export const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hun-sen-porieng-uss.vercel.app';

/**
 * Send a simple text message with an optional inline keyboard
 */
export async function sendMessage(chatId: number, text: string, replyMarkup?: InlineKeyboardMarkup, parseMode: string = 'Markdown') {
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

/**
 * Edit an existing message (used heavily for menu navigation)
 */
export async function editMessageText(chatId: number, messageId: number, text: string, replyMarkup?: InlineKeyboardMarkup, parseMode: string = 'Markdown') {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
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
    
    // If the message is exactly the same, Telegram returns a 400 error. We can silently ignore it.
    if (!response.ok) {
      const data = await response.json();
      if (data.description && data.description.includes('message is not modified')) {
        return;
      }
      console.error('Telegram editMessageText error:', data);
    }
  } catch (error) {
    console.error('Error editing message:', error);
  }
}

/**
 * Send a photo with a caption and optional keyboard.
 * The photo URL must be publicly accessible.
 */
export async function sendPhoto(chatId: number, photoUrl: string, caption: string, replyMarkup?: InlineKeyboardMarkup, parseMode: string = 'Markdown') {
  try {
    await fetch(`${TELEGRAM_API_URL}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        reply_markup: replyMarkup,
        parse_mode: parseMode,
      }),
    });
  } catch (error) {
    console.error('Error sending photo:', error);
    // Fallback: if photo fails (e.g. invalid URL), just send the text
    await sendMessage(chatId, `[Image failed to load]\n\n${caption}`, replyMarkup, parseMode);
  }
}

/**
 * Delete a message (useful when switching from text to photo flows)
 */
export async function deleteMessage(chatId: number, messageId: number) {
  try {
    await fetch(`${TELEGRAM_API_URL}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
      }),
    });
  } catch (error) {
    console.error('Error deleting message:', error);
  }
}

/**
 * MUST be called for every callback query to prevent the loading spinner 
 * from hanging on the user's Telegram client.
 */
export async function answerCallbackQuery(callbackQueryId: string, text?: string, showAlert: boolean = false) {
  try {
    await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      }),
    });
  } catch (error) {
    console.error('Error answering callback query:', error);
  }
}
