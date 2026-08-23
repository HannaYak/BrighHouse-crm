import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { sendTelegramOrderNotification } from '../../../../lib/telegram';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Парсинг входящего лида из любого источника (Инстаграм, Сайт, Oferteo, WhatsApp)
    const clientName = body.clientName || body.name || body.senderName || 'Новый Лид';
    const clientPhone = body.clientPhone || body.phone || body.from || '+48000000000';
    const address = body.address || body.location || 'Уточняется в переписке';
    const notes = body.message || body.notes || body.text || 'Заявка из внешнего канала';
    const source = body.source || 'Входящий канал';

    const orderNumber = `LEAD-${Math.floor(100 + Math.random() * 900)}`;

    // 2. Создаем заказ со статусом NEW
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        date: new Date(),
        timeSlot: '10:00 — 14:00',
        serviceType: 'STANDARD',
        areaM2: 45,
        roomsCount: 1,
        bathroomsCount: 1,
        windowsCount: 0,
        clientName: `${clientName} (${source})`,
        clientPhone,
        addressLine1: address,
        price: 200,
        cleanersCount: 1,
        notes: `[Источник: ${source}]\n${notes}`,
        status: 'NEW',
        urgency: 'URGENT',
      },
    });

    // 3. Уведомление администратора в рабочий чат о новом лиде
    await sendTelegramOrderNotification({
      orderNumber,
      date: new Date().toLocaleDateString('ru-RU'),
      timeSlot: 'Срочно / Не согласовано',
      address,
      price: 200,
      tags: {},
      notes: `⚡ ВХОДЯЩИЙ ЛИД (${source}): ${notes} | Тел: ${clientPhone}`,
    });

    return NextResponse.json({ success: true, orderId: newOrder.id, orderNumber }, { status: 201 });
  } catch (error) {
    console.error('Ошибка обработки входящего вебхука лида:', error);
    return NextResponse.json({ error: 'Ошибка сохранения входящей заявки' }, { status: 500 });
  }
}
