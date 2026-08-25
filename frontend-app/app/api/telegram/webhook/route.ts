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

    // 1. Обработка нажатий на инлайн-кнопки
    if (update.callback_query) {
      const callback = update.callback_query;
      const data = callback.data as string;
      const chatId = callback.message.chat.id;

      // Клинер: Начало выполнения заказа
      if (data.startsWith('start_order_')) {
        const orderId = data.replace('start_order_', '');
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'IN_PROGRESS' as any },
        });

        await answerCallbackQuery(callback.id, 'Статус обновлен: В работе!');
        await sendMessage(
          chatId,
          `🚗 <b>Вы начали выполнение заказа!</b>\nСтатус переведен в работу. Удачной уборки! ✨`,
          {
            inline_keyboard: [
              [{ text: '✅ Завершить уборку', callback_data: `done_order_${orderId}` }]
            ]
          }
        );
        return NextResponse.json({ ok: true });
      }

      // Клинер: Завершение заказа + Авто-запрос отзыва у клиента
      if (data.startsWith('done_order_')) {
        const orderId = data.replace('done_order_', '');
        const order = await prisma.order.update({
          where: { id: orderId },
          data: { status: 'COMPLETED' as any },
          include: { client: true },
        });

        await answerCallbackQuery(callback.id, 'Уборка завершена!');
        await sendMessage(chatId, `🎉 <b>Отличная работа!</b> Заказ отмечен как выполненный.`);

        // Ищем чат с клиентом по его телефону или имени в диалогах
        if (order.clientPhone) {
          const clientConv = await prisma.conversation.findFirst({
            where: {
              OR: [
                { clientPhone: order.clientPhone },
                { clientName: { contains: order.clientName } }
              ]
            }
          });

          // Если у нас есть диалог с клиентом в Telegram — отправляем опрос качества
          if (clientConv && clientConv.externalId) {
            await sendMessage(
              clientConv.externalId,
              `✨ <b>Уборка завершена!</b>\n\nСпасибо, что выбрали <b>BrightHouse</b> 🌸\nПожалуйста, оцените качество уборки клинером:`,
              {
                inline_keyboard: [
                  [
                    { text: '⭐ 1', callback_data: `rate_${order.id}_1` },
                    { text: '⭐ 2', callback_data: `rate_${order.id}_2` },
                    { text: '⭐ 3', callback_data: `rate_${order.id}_3` },
                    { text: '⭐ 4', callback_data: `rate_${order.id}_4` },
                    { text: '⭐ 5', callback_data: `rate_${order.id}_5` },
                  ]
                ]
              }
            );
          }
        }

        return NextResponse.json({ ok: true });
      }

      // Клиент: Оценка качества уборки (1-5)
      if (data.startsWith('rate_')) {
        const parts = data.split('_');
        const stars = parseInt(parts[2], 10);

        await answerCallbackQuery(callback.id, `Спасибо за оценку: ${stars} ⭐!`);

        if (stars >= 5) {
          await sendMessage(
            chatId,
            `💖 <b>Огромное спасибо за высшую оценку!</b>\nМы очень рады, что вам всё понравилось. Будем благодарны, если оставите пару теплых слов о нас в отзывах! ✨`
          );
        } else {
          await sendMessage(
            chatId,
            `🙏 <b>Благодарим за обратную связь!</b>\nНам очень важно ваше мнение. Мы передали информацию руководству и свяжемся с вами, чтобы сделать наш сервис еще лучше.`
          );
        }

        return NextResponse.json({ ok: true });
      }
    }

    // 2. Обработка входящих текстовых сообщений
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();
      const username = update.message.from.username ? `@${update.message.from.username}` : null;
      const firstName = update.message.from.first_name || 'Клиент';

      // Привязка клинера по 6-значному PIN-коду
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
          await sendMessage(chatId, `✅ <b>${cleaner.name}</b>, ваш аккаунт успешно привязан к BrightHouse CRM! Теперь наряды на уборку будут приходить сюда.`);
          return NextResponse.json({ ok: true });
        }
      }

      // Сохранение переписки с клиентом в Omnichannel чат
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
        await sendMessage(chatId, `👋 Здравствуйте, ${firstName}! Добро пожаловать в службу заботы <b>BrightHouse</b> ✨\n\nНапишите ваш вопрос или детали квартиры, и наш менеджер оперативно ответит вам.`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram Webhook Error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
