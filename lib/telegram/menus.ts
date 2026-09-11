import { InlineKeyboardMarkup } from './types';
import { APP_URL } from './bot';

export const MAIN_MENU_TEXT = `👋 សួស្តី! ខ្ញុំជា Bot ជំនួយការរបស់ **វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង**។\n\nសូមជ្រើសរើសផ្នែកដែលលោកគ្រូ/អ្នកគ្រូត្រូវការជំនួយខាងក្រោម៖`;

export const MAIN_MENU_KEYBOARD: InlineKeyboardMarkup = {
  inline_keyboard: [
    [{ text: '👥 ការគ្រប់គ្រងសិស្ស', callback_data: 'menu_students' }],
    [{ text: '📚 ការសិក្សា និងពិន្ទុ', callback_data: 'menu_academics' }],
    [{ text: '🏢 ការងាររដ្ឋបាល', callback_data: 'menu_management' }],
    [{ text: '❓ សំណួរទូទៅ (FAQ)', callback_data: 'menu_faq' }],
    [{ text: '🌐 បើកប្រព័ន្ធគ្រប់គ្រងផ្ទាល់', url: APP_URL }]
  ]
};

export const STUDENTS_MENU_TEXT = `👥 **ការគ្រប់គ្រងសិស្ស**\n\nតើអ្នកចង់ដឹងពីរបៀបធ្វើអ្វីខ្លះទាក់ទងនឹងសិស្ស?`;
export const STUDENTS_MENU_KEYBOARD: InlineKeyboardMarkup = {
  inline_keyboard: [
    [{ text: '📋 របៀបមើលបញ្ជី និងបន្ថែមសិស្ស', callback_data: 'guide_student_profile' }],
    [{ text: '📅 របៀបស្រង់វត្តមានប្រចាំថ្ងៃ', callback_data: 'guide_attendance' }],
    [{ text: '🏥 របៀបកត់ត្រាសុខភាព (BMI)', callback_data: 'guide_health' }],
    [{ text: '🤝 របៀបចុះករណីគាំទ្រសិស្ស', callback_data: 'guide_support' }],
    [{ text: '🏠 ត្រឡប់ទៅម៉ឺនុយដើម', callback_data: 'menu_main' }]
  ]
};

export const ACADEMICS_MENU_TEXT = `📚 **ការសិក្សា និងពិន្ទុ**\n\nតើអ្នកចង់ដឹងពីរបៀបធ្វើអ្វីខ្លះទាក់ទងនឹងការសិក្សា?`;
export const ACADEMICS_MENU_KEYBOARD: InlineKeyboardMarkup = {
  inline_keyboard: [
    [{ text: '📝 របៀបបញ្ចូលពិន្ទុ (Excel)', callback_data: 'guide_grades' }],
    [{ text: '📊 របៀបទាញយកព្រឹត្តិបត្រពិន្ទុ', callback_data: 'guide_report_cards' }],
    [{ text: '📖 សៀវភៅសិក្ខាគារិក (ចុងឆ្នាំ)', callback_data: 'guide_records' }],
    [{ text: '🏠 ត្រឡប់ទៅម៉ឺនុយដើម', callback_data: 'menu_main' }]
  ]
};

export const MANAGEMENT_MENU_TEXT = `🏢 **ការងាររដ្ឋបាល**\n\nតើអ្នកចង់ដឹងពីការងាររដ្ឋបាលមួយណា?`;
export const MANAGEMENT_MENU_KEYBOARD: InlineKeyboardMarkup = {
  inline_keyboard: [
    [{ text: '📞 របៀបស្វែងរកលេខទូរស័ព្ទមាតាបិតា', callback_data: 'guide_parents' }],
    [{ text: '📈 របៀបធ្វើរបាយការណ៍ប្រចាំខែ', callback_data: 'guide_monthly_reports' }],
    [{ text: '📂 ឯកសារទូទៅ & គម្រោង GEIP', callback_data: 'guide_documents' }],
    [{ text: '🏠 ត្រឡប់ទៅម៉ឺនុយដើម', callback_data: 'menu_main' }]
  ]
};

/**
 * Reusable helper to generate standard navigation buttons (Back, Home)
 */
export function getStandardNavigation(backCallback: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '⬅️ ត្រឡប់ក្រោយ', callback_data: backCallback },
        { text: '🏠 ម៉ឺនុយដើម', callback_data: 'menu_main' }
      ]
    ]
  };
}

/**
 * Navigation with an action button (like Open App)
 */
export function getActionNavigation(actionText: string, actionUrl: string, backCallback: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: `🚀 ${actionText}`, url: actionUrl }],
      [
        { text: '⬅️ ត្រឡប់ក្រោយ', callback_data: backCallback },
        { text: '🏠 ម៉ឺនុយដើម', callback_data: 'menu_main' }
      ]
    ]
  };
}
