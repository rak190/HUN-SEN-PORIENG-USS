import { sendMessage } from '../bot';
import { UNKNOWN_COMMAND_TEXT } from '../content/messages';
import { MAIN_MENU_KEYBOARD } from '../menus';

export async function handleMessage(chatId: number, text: string) {
  // If the user sends a raw message that isn't a command, gently guide them back to the menu
  await sendMessage(chatId, UNKNOWN_COMMAND_TEXT, MAIN_MENU_KEYBOARD);
}
