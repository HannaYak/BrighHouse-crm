import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        assignedCleaners: {
          include: { cleaner: true }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ error: 'Бот не настроен' }, { status: 500 });
    }

    let sent = 0;

    for (const assignment of order.assignedCleaners) {
      const cleaner = assignment.cleaner;
      if (cleaner.telegramChatId) {
        const text = `
🧹 <b>Новый заказ: ${order.orderNumber}</b>

📍 <b>Адрес:</b> ${order.addressLine1}
⏱ <b>Время:</b> ${order.timeSlot || '10:00'}
👤 <b>Клиент:</b> ${order.clientName} (${order.clientPhone})
📝 <b>Детали:</b> ${order.notes || 'Без примечаний'}
        `;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cleaner.telegramChatId,
            text,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🚗 Выехал на объект / Начать', callback_data: `start_order_${order.id}` }]
              ]
            }
          })
        });
        sent++;
      }
    }

    return NextResponse.json({ success: true, sentTo: sent });
  } catch (error) {
    console.error('Ошибка отправки наряда клинеру:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
