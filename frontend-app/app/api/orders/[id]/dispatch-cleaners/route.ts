import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        assignedCleaners: {
          include: { cleaner: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    if (!order.assignedCleaners || order.assignedCleaners.length === 0) {
      return NextResponse.json({ error: 'На этот заказ не назначены клинеры' }, { status: 400 });
    }

    const dateFormatted = new Date(order.date).toLocaleDateString('ru-RU');
    const teamList = order.assignedCleaners.map(ac => ac.cleaner?.name).filter(Boolean).join(' + ');

    const results = [];

    for (const item of order.assignedCleaners) {
      const cleaner = item.cleaner;
      const chatId = (cleaner as any)?.telegramChatId || (cleaner as any)?.telegramId;

      const messageText = `🧹 *НОВЫЙ НАРЯД НА УБОРКУ!*

📋 *Заказ:* \`${order.orderNumber}\`
📅 *Дата:* ${dateFormatted}
⏰ *Время:* ${order.timeSlot || '10:00 — 14:00'}
📍 *Адрес:* ${order.addressLine1} ${order.addressLine2 ? `(кв/оф ${order.addressLine2})` : ''}
👤 *Клиент:* ${order.clientName || 'Клиент'} (${order.clientPhone || 'номер уточняйте у менеджера'})

✨ *Параметры:*
• Тариф: ${order.serviceType || 'Стандарт'}
• Площадь / Комнаты: ${order.areaM2 || 45} м² (${order.roomsCount || 1} комн., ${order.bathroomsCount || 1} сануз.)
${order.windowsCount ? `• Окна: ${order.windowsCount} шт.\n` : ''}👥 *Состав бригады:* ${teamList}

📝 *Особенности / Примечания:*
${order.notes || 'Без особых указаний'}

Пожалуйста, подтвердите получение наряда! ✨`;

      if (chatId && TELEGRAM_BOT_TOKEN) {
        try {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: messageText,
              parse_mode: 'Markdown',
            }),
          });
          results.push({ cleaner: cleaner.name, status: 'SENT' });
        } catch (err) {
          results.push({ cleaner: cleaner.name, status: 'ERROR', error: String(err) });
        }
      } else {
        results.push({ cleaner: cleaner.name, status: 'NO_TELEGRAM_LINKED' });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Ошибка отправки наряда клинерам:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
