import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST() {
  try {
    // Находим подтвержденные заказы на завтра
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);

    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['CONFIRMED', 'PENDING'] as any },
        date: {
          gte: new Date(`${dateStr}T00:00:00.000Z`),
          lte: new Date(`${dateStr}T23:59:59.999Z`),
        },
      },
      include: {
        assignedCleaners: {
          include: { cleaner: true },
        },
      },
    });

    const results = [];

    for (const order of orders) {
      const o = order as any;
      const timeSlot = o.timeSlot || `${o.startTime || '10:00'} — ${o.endTime || '14:00'}`;
      const address = `${o.addressLine1 || ''} ${o.addressLine2 ? `(кв/оф ${o.addressLine2})` : ''}`.trim();

      const reminderText = `Здравствуйте, ${o.clientName || 'клиент'}! 🌸\n\nНапоминаем о запланированной уборке от BrightHouse завтра (${new Date(o.date).toLocaleDateString('ru-RU')}):\n⏰ Время: ${timeSlot}\n📍 Адрес: ${address}\n💵 Сумма к оплате: ${o.price} zł\n\nЕсли изменились планы или нужно скорректировать время, пожалуйста, дайте знать! ✨`;

      let conversation: any = null;

      // Безопасный поиск диалога по телефону или имени
      if (o.clientPhone) {
        conversation = await prisma.conversation.findFirst({
          where: {
            channel: 'TELEGRAM',
            OR: [
              { phone: o.clientPhone },
              { externalId: o.clientPhone },
            ],
          },
        });
      }

      if (!conversation && o.clientName) {
        conversation = await prisma.conversation.findFirst({
          where: {
            channel: 'TELEGRAM',
            senderName: {
              contains: o.clientName,
              mode: 'insensitive',
            },
          },
        });
      }

      if (conversation?.externalId && TELEGRAM_BOT_TOKEN) {
        try {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: conversation.externalId,
              text: reminderText,
            }),
          });

          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderId: 'system',
              senderName: 'Бот напоминаний',
              senderType: 'MANAGER',
              text: reminderText,
              isIncoming: false,
              timestamp: new Date(),
            },
          });

          results.push({ orderId: o.id, status: 'SENT' });
        } catch (err) {
          results.push({ orderId: o.id, status: 'ERROR', error: String(err) });
        }
      } else {
        results.push({ orderId: o.id, status: 'NO_CHAT_FOUND' });
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error: any) {
    console.error('Ошибка отправки напоминаний:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}
