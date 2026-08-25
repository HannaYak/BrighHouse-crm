import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { sendAdminLeadNotification } from '../../../../lib/telegram';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, service, address, notes, date, timeSlot, price } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Имя и телефон обязательны' }, { status: 400 });
    }

    // 1. Ищем или создаем клиента по номеру телефона
    let client = await prisma.client.findFirst({
      where: { phone },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          name,
          phone,
          addressLine1: address || 'Адрес не указан',
        },
      });
    }

    // 2. Генерируем уникальный номер заказа (например, #BH-1042)
    const count = await prisma.order.count();
    const orderNumber = `#BH-${1000 + count + 1}`;

    // 3. Создаем заказ в статусе NEW (попадает прямо в первую колонку Канбана)
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        status: 'NEW',
        clientId: client.id,
        clientName: name,
        clientPhone: phone,
        serviceType: service || 'STANDARD',
        addressLine1: address || 'Адрес не указан',
        date: date ? new Date(date) : new Date(),
        timeSlot: timeSlot || '10:00 — 14:00',
        price: price ? parseFloat(price) : 250, // Дефолтная цена, если калькулятор на сайте не посчитал
        notes: notes || 'Заявка с сайта',
      },
    });

    // 4. Отправляем уведомление администратору в Telegram
    await sendAdminLeadNotification({
      name,
      phone,
      service: `${service || 'Уборка'} (${price ? price + ' zł' : 'цена уточняется'})`,
      notes: `Адрес: ${address}\nДата: ${date} (${timeSlot})\nКомментарий: ${notes}`,
    });

    return NextResponse.json({ success: true, orderNumber: newOrder.orderNumber }, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания лида с сайта:', error);
    return NextResponse.json({ error: 'Ошибка сервера при создании заявки' }, { status: 500 });
  }
}

// Разрешаем CORS, чтобы форма на любом внешнем сайте могла отправлять данные к нам
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
