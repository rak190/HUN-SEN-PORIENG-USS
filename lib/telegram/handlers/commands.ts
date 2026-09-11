import { sendMessage } from '../bot';
import { MAIN_MENU_TEXT, MAIN_MENU_KEYBOARD } from '../menus';

export async function handleCommand(chatId: number, text: string) {
  const command = text.split(' ')[0].toLowerCase();

  switch (command) {
    case '/start':
    case '/help':
    case '/menu':
      await sendMessage(chatId, MAIN_MENU_TEXT, MAIN_MENU_KEYBOARD);
      break;
      
    // Future commands can be added here
      
    default:
      // We don't respond to unknown commands here, we let the generic message handler deal with it
      return false; 
  }
  return true;
}
