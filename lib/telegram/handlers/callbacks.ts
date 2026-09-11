import { TelegramCallbackQuery } from '../types';
import { editMessageText, sendPhoto, deleteMessage, answerCallbackQuery } from '../bot';
import { ERROR_TEXT } from '../content/messages';
import {
  MAIN_MENU_TEXT, MAIN_MENU_KEYBOARD,
  STUDENTS_MENU_TEXT, STUDENTS_MENU_KEYBOARD,
  ACADEMICS_MENU_TEXT, ACADEMICS_MENU_KEYBOARD,
  MANAGEMENT_MENU_TEXT, MANAGEMENT_MENU_KEYBOARD,
  getStandardNavigation
} from '../menus';

// Guide Content
import { guides as studentGuides } from '../guides/students';
import { academicsGuides } from '../guides/academics';
import { managementGuides } from '../guides/management';
import { faqGuide } from '../guides/faq';

export async function handleCallback(callbackQuery: TelegramCallbackQuery) {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;

  if (!chatId || !messageId || !data) {
    console.error('Invalid callback query data');
    return;
  }

  // 1. MUST always acknowledge the callback immediately to stop the loading spinner
  await answerCallbackQuery(callbackQuery.id);

  try {
    // 2. Route the callback data
    switch (data) {
      // --- MAIN MENUS ---
      case 'menu_main':
        await editMessageText(chatId, messageId, MAIN_MENU_TEXT, MAIN_MENU_KEYBOARD);
        break;
      case 'menu_students':
        await editMessageText(chatId, messageId, STUDENTS_MENU_TEXT, STUDENTS_MENU_KEYBOARD);
        break;
      case 'menu_academics':
        await editMessageText(chatId, messageId, ACADEMICS_MENU_TEXT, ACADEMICS_MENU_KEYBOARD);
        break;
      case 'menu_management':
        await editMessageText(chatId, messageId, MANAGEMENT_MENU_TEXT, MANAGEMENT_MENU_KEYBOARD);
        break;

      // --- STUDENT GUIDES ---
      case 'guide_student_profile':
        await renderGuide(chatId, messageId, studentGuides.profile);
        break;
      case 'guide_attendance':
        await renderGuide(chatId, messageId, studentGuides.attendance);
        break;
      case 'guide_health':
        await renderGuide(chatId, messageId, studentGuides.health);
        break;
      case 'guide_support':
        await renderGuide(chatId, messageId, studentGuides.support);
        break;

      // --- ACADEMIC GUIDES ---
      case 'guide_grades':
        await renderGuide(chatId, messageId, academicsGuides.grades);
        break;
      case 'guide_report_cards':
        await renderGuide(chatId, messageId, academicsGuides.reportCards);
        break;
      case 'guide_records':
        await renderGuide(chatId, messageId, academicsGuides.records);
        break;

      // --- MANAGEMENT GUIDES ---
      case 'guide_parents':
        await renderGuide(chatId, messageId, managementGuides.parents);
        break;
      case 'guide_monthly_reports':
        await renderGuide(chatId, messageId, managementGuides.monthlyReports);
        break;
      case 'guide_documents':
        await renderGuide(chatId, messageId, managementGuides.documents);
        break;

      // --- FAQ ---
      case 'menu_faq':
        await renderGuide(chatId, messageId, faqGuide);
        break;

      default:
        await editMessageText(chatId, messageId, 'មិនស្គាល់ជម្រើសនេះទេ។', getStandardNavigation('menu_main'));
    }
  } catch (error) {
    console.error(`Error handling callback ${data}:`, error);
    await editMessageText(chatId, messageId, ERROR_TEXT, getStandardNavigation('menu_main'));
  }
}

/**
 * Helper function to render a guide. 
 * If a guide has a photo, we must delete the current text message and send a new photo message.
 * If a guide is text-only, we just edit the current text message (faster, no flicker).
 */
async function renderGuide(chatId: number, messageId: number, guide: { photoUrl?: string, text: string, markup: any }) {
  if (guide.photoUrl) {
    // Delete the old menu message
    await deleteMessage(chatId, messageId);
    // Send a new message containing the photo + caption text
    await sendPhoto(chatId, guide.photoUrl, guide.text, guide.markup);
  } else {
    // Just edit the existing text message inline
    await editMessageText(chatId, messageId, guide.text, guide.markup);
  }
}
