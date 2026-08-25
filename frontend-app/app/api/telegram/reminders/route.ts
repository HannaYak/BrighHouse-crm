import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function GET(request: Request) {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ error: 'Telegram token not configured' }, { status: 500 });
    }

    // Вычисляем завтрашнюю дату (в формате YYYY-MM-DD)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Ищем все подтвержденные заказы на завтра, у которых есть клиент с Telegram-чатом
    // (предполагаем, что у клиента может быть привязан chat_id, либо ищем по его телефону в базе диалогов)
    const orders = await prisma.order.findMany({
      where: {
        date: {
          gte: new Date(`${tomorrowStr}T00:00:00.000Z`),
          lte: new Date(`${tomorrowStr}T23:59:59.999Z`),
        },
        status: { not: 'CANCELLED' },
      },
      include: {
        client: true,
      },
    });

    let sentCount = 0;

    for (const order of orders) {
      if (!order.clientPhone) continue;

      // Ищем диалог с этим клиентом в нашей таблице Conversation по телефону
      const conversation = await prisma.conversation.findFirst({
        where: { phone: order.clientPhone, channel: 'TELEGRAM' },
      });

      if (conversation && conversation.externalId) {
        const messageText = `
🌸 <b>Напоминаем об уборке!</b>

Здравствуйте, <b>${order.clientName}</b>! Завтра (${tomorrowStr}) ждем вас на уборку.
⏱ <b>Время:</b> ${order.timeSlot || order.startTime || '10:00'}
📍 <b>Адрес:</b> ${order.addressLine1}

Если у вас изменились планы, пожалуйста, дайте нам знать. До встречи! ✨
        `;

        try {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: conversation.externalId,
              text: messageText,
              parse_mode: 'HTML',
            }),
          });
          sentCount++;
        } catch (err) {
          console.error(`Ошибка отправки напоминания клиенту ${order.clientName}:`, err);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      dateChecked: tomorrowStr, 
      remindersSent: sentCount 
    });
  } catch (error) {
    console.error('Ошибка в скрипте напоминаний:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
