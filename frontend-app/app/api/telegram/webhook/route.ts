import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Функция для отправки ответа пользователю в Telegram
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

    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();
      const username = update.message.from.username ? `@${update.message.from.username}` : null;
      const firstName = update.message.from.first_name || 'Клиент';

      // 1. Проверяем, может это привязка по PIN-коду (6 цифр)
      if (/^\d{6}$/.test(text)) {
        const cleaner = await prisma.cleaner.findFirst({
          where: { authCode: text },
        });

        if (cleaner) {
          await prisma.cleaner.update({
            where: { id: cleaner.id },
            data: {
              telegramChatId: chatId.toString(),
              telegramHandle: username || cleaner.telegramHandle,
              authCode: null,
            },
          });
          await sendMessage(chatId, `✅ <b>${cleaner.name}</b>, ваш аккаунт успешно привязан к BrightHouse CRM!`);
          return NextResponse.json({ ok: true });
        }
      }

      // 2. Ищем, существует ли уже диалог с этим chatId в нашей базе
      let conversation = await prisma.conversation.findUnique({
        where: { externalId: chatId.toString() },
      });

      // Если диалога нет — создаем новый
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            channel: 'TELEGRAM',
            externalId: chatId.toString(),
            clientName: username ? `${firstName} (${username})` : firstName,
          },
        });
      }

      // 3. Сохраняем входящее сообщение от клиента в базу
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderType: 'CLIENT',
          text: text,
        },
      });

      // Если это команда /start
      if (text === '/start') {
        await sendMessage(chatId, `👋 Привет! Добро пожаловать в службу поддержки BrightHouse. Напишите нам ваш вопрос, и менеджер скоро ответит.`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram Webhook Error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
