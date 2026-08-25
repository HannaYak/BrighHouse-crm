import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendMessage(chatId: string | number, text: string, replyMarkup?: any) {
  if (!TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    }),
  });
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    }),
  });
}

export async function POST(request: Request) {
  try {
    const update = await request.json();

    // 1. Обработка нажатий на инлайн-кнопки клинерами
    if (update.callback_query) {
      const callback = update.callback_query;
      const data = callback.data;
      const chatId = callback.message.chat.id;

      if (data.startsWith('start_order_')) {
        const orderId = data.replace('start_order_', '');
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'IN_WORK' },
        });

        await answerCallbackQuery(callback.id, 'Статус обновлен: В работе!');
        await sendMessage(
          chatId,
          `🚗 <b>Вы начали выполнение заказа!</b>\nСтатус в CRM переведен в «В работе». Удачной уборки! ✨`,
          {
            inline_keyboard: [
              [{ text: '✅ Завершить уборку', callback_data: `done_order_${orderId}` }]
            ]
          }
        );
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith('done_order_')) {
        const orderId = data.replace('done_order_', '');
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'COMPLETED' },
        });

        await answerCallbackQuery(callback.id, 'Уборка завершена!');
        await sendMessage(chatId, `🎉 <b>Отличная работа!</b> Заказ отмечен как выполненный.`);
        return NextResponse.json({ ok: true });
      }
    }

    // 2. Обработка текстовых сообщений
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();
      const username = update.message.from.username ? `@${update.message.from.username}` : null;
      const firstName = update.message.from.first_name || 'Клиент';

      // Привязка клинера по 6-значному PIN
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

      // Диалог с клиентом
      let conversation = await prisma.conversation.findUnique({
        where: { externalId: chatId.toString() },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            channel: 'TELEGRAM',
            externalId: chatId.toString(),
            clientName: username ? `${firstName} (${username})` : firstName,
          },
        });
      }

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderType: 'CLIENT',
          text: text,
        },
      });

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
