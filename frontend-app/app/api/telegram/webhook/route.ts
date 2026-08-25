import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Функция для отправки ответа пользователю
async function sendMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

export async function POST(request: Request) {
  try {
    const update = await request.json();

    // Если это обычное текстовое сообщение
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();
      const username = update.message.from.username ? `@${update.message.from.username}` : null;

      // Если клинер отправил 6-значный PIN-код
      if (/^\d{6}$/.test(text)) {
        // Ищем сотрудника с таким PIN
        const cleaner = await prisma.cleaner.findFirst({
          where: { authCode: text },
        });

        if (cleaner) {
          // Привязываем Telegram к профилю и удаляем разовый PIN
          await prisma.cleaner.update({
            where: { id: cleaner.id },
            data: {
              telegramChatId: chatId.toString(),
              telegramHandle: username || cleaner.telegramHandle,
              authCode: null, // Сбрасываем пин
            },
          });

          await sendMessage(chatId, `✅ <b>${cleaner.name}</b>, ваш аккаунт успешно привязан к BrightHouse CRM!\n\nСюда будут приходить новые заказы и расписание.`);
        } else {
          await sendMessage(chatId, `❌ Неверный или устаревший PIN-код. Запросите новый код у администратора.`);
        }
      } 
      else if (text === '/start') {
        await sendMessage(chatId, `👋 Привет! Я бот BrightHouse CRM.\n\nПожалуйста, отправьте мне <b>6-значный PIN-код</b>, который вам выдал администратор, чтобы привязать ваш аккаунт.`);
      }
      else {
        await sendMessage(chatId, `Я понимаю только PIN-коды из 6 цифр. Отправьте код для привязки аккаунта.`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
