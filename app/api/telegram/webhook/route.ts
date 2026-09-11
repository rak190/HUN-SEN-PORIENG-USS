import { NextResponse } from 'next/server';
import { TelegramUpdate } from '@/lib/telegram/types';
import { handleCommand } from '@/lib/telegram/handlers/commands';
import { handleCallback } from '@/lib/telegram/handlers/callbacks';
import { handleMessage } from '@/lib/telegram/handlers/messages';

export async function POST(req: Request) {
  try {
    // 0. Verify Telegram Webhook Secret Token
    const secretToken = req.headers.get('x-telegram-bot-api-secret-token');
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    
    // We only enforce the check if the secret is configured
    if (expectedSecret && secretToken !== expectedSecret) {
      console.warn('Unauthorized telegram webhook invocation attempt');
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const update: TelegramUpdate = await req.json();

    // 1. Handle Button Clicks (Callbacks)
    if (update.callback_query) {
      await handleCallback(update.callback_query);
      return NextResponse.json({ ok: true });
    }

    // 2. Handle Text Messages
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      // Try to handle as a command first
      const isCommand = await handleCommand(chatId, text);
      
      // If it wasn't a recognized command, send the gentle fallback
      if (!isCommand) {
        await handleMessage(chatId, text);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Always return 200 to Telegram so it stops retrying the same failing message
    return NextResponse.json({ ok: true });
  }
}
