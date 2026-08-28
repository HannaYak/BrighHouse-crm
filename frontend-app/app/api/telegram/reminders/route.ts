import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET || '12824Hanna';

export async function GET(request: Request) {
  // 1. Защита роута паролем от случайных запусков
  const { searchParams } = new URL(request.url);
  if (searchParams.get('key') !== CRON_SECRET) {
    return NextResponse.json({ error: 'Отказано в доступе' }, { status: 401 });
  }

  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: 'Telegram token not configured' }, { status: 500 });
  }

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Ищем все подтвержденные заказы на завтра
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
        // Подтягиваем клинеров, которым ЕЩЕ НЕ отправляли напоминание
        assignedCleaners: {
          where: { reminderSent: false },
          include: { cleaner: true },
        },
      },
    });

    let clientReminders = 0;
    let cleanerReminders = 0;

    for (const order of orders) {
      // --- 1. НАПОМИНАНИЯ КЛИЕНТАМ ---
      if (order.clientPhone) {
        const conversation = await prisma.conversation.findFirst({
          where: { phone: order.clientPhone, channel: 'TELEGRAM' },
        });

        if (conversation && conversation.externalId) {
          const messageText = `🌸 <b>Напоминаем об уборке!</b>\n\nЗдравствуйте, <b>${order.clientName}</b>! Завтра (${tomorrowStr}) ждем вас на уборку.\n⏱ <b>Время:</b> ${order.timeSlot || '10:00 — 14:00'}\n📍 <b>Адрес:</b> ${order.addressLine1}\n\nЕсли у вас изменились планы, пожалуйста, дайте нам знать. До встречи! ✨`;
          
          try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: conversation.externalId, text: messageText, parse_mode: 'HTML' }),
            });
            clientReminders++;
          } catch (err) {
            console.error(`Ошибка отправки напоминания клиенту ${order.clientName}:`, err);
          }
        }
      }

      // --- 2. НАПОМИНАНИЯ КЛИНЕРАМ (С ЗАЩИТОЙ ОТ СПАМА) ---
      for (const assignment of order.assignedCleaners) {
        const chatId = assignment.cleaner.telegramChatId;
        if (chatId) {
           const text = `🔔 *Напоминание о смене!*\n\nЗавтра (${tomorrowStr}) у вас запланирована уборка.\n\n⏰ Время: ${order.timeSlot || '10:00 — 14:00'}\n📍 Адрес: ${order.addressLine1}\n\nПожалуйста, не опаздывайте. Детали заказа доступны в истории нарядов.`;
           
           const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
           });

           if (response.ok) {
             // Ставим флаг, чтобы не дублировать сообщения клинеру
             await prisma.orderCleaner.update({
               where: { orderId_cleanerId: { orderId: order.id, cleanerId: assignment.cleanerId } },
               data: { reminderSent: true }
             });
             cleanerReminders++;
           }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      dateChecked: tomorrowStr, 
      clientReminders, 
      cleanerReminders 
    });
  } catch (error) {
    console.error('Ошибка в скрипте напоминаний:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
