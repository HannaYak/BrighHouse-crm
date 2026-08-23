import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = process.env.TELEGRAM_BOT_TOKEN;

    // 1. ОБРАБОТКА НАЖАТИЯ КНОПКИ «✅ Приняла заказ»
    if (body.callback_query) {
      const cq = body.callback_query;
      const data = cq.data; // Формат: accept_ORDERID_CLEANERID
      const chatId = cq.message?.chat?.id;
      const messageId = cq.message?.message_id;

      if (data && data.startsWith('accept_')) {
        const parts = data.split('_');
        const orderIdentifier = parts[1];
        const cleanerId = parseInt(parts[2], 10);

        // Ищем заказ
        const order = await prisma.order.findFirst({
          where: {
            OR: [{ id: orderIdentifier }, { orderNumber: orderIdentifier }],
          },
        });

        if (order) {
          // Отмечаем принятие в связке OrderCleaner
          await prisma.orderCleaner.updateMany({
            where: {
              orderId: order.id,
              cleanerId: cleanerId,
            },
            data: {
              isAccepted: true,
            },
          });

          // Ответ Telegram всплывающим уведомлением
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: cq.id,
              text: 'Заказ успешно подтверждён! 🎉',
              show_alert: false,
            }),
          });

          // Редактируем сообщение, убирая кнопку и добавляя галочку
          const originalText = cq.message.text || '';
          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: `${originalText}\n\n✅ *ВЫ ПОДТВЕРДИЛИ ПРИНЯТИЕ ЗАКАЗА*`,
              parse_mode: 'Markdown',
            }),
          });
        }
      }

      return NextResponse.json({ ok: true });
    }

    // 2. ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ И PIN-КОДОВ
    const message = body.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id.toString();
    const text = message.text.trim();

    const sendMessage = async (reply: string) => {
      if (!token) return;
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: reply, parse_mode: 'Markdown' }),
      });
    };

    let pinCandidate = text;
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      if (parts.length > 1) {
        pinCandidate = parts[1].trim();
      } else {
        await sendMessage('👋 Привет! Отправь мне свой **6-значный PIN-код** из CRM BrightHouse, чтобы привязать профиль.');
        return NextResponse.json({ ok: true });
      }
    }

    const cleaner = await prisma.cleaner.findFirst({
      where: { authCode: pinCandidate },
    });

    if (cleaner) {
      await prisma.cleaner.update({
        where: { id: cleaner.id },
        data: {
          telegramChatId: chatId,
          authCode: null,
        },
      });

      await sendMessage(`✅ *Успешно привязано!*\n\nПривет, ${cleaner.name}! Теперь сюда будут приходить твои заказы с кнопкой подтверждения, адресами и навигацией.`);
    } else {
      await sendMessage('❌ Код не найден или устарел. Сгенерируй новый PIN-код в CRM во вкладке «Справочники».');
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Ошибка webhook Telegram:', error);
    return NextResponse.json({ ok: true });
  }
}
