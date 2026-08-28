import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clientName,
      clientPhone,
      addressLine1,
      serviceType,
      price,
      date,
      startTime,
      notes,
    } = body;

    if (!clientName || !clientPhone || !addressLine1) {
      return NextResponse.json(
        { error: 'Имя, телефон и адрес обязательны для заполнения' },
        { status: 400 }
      );
    }

    // Генерируем уникальный номер заказа (например BH-2608-492)
    const datePrefix = new Date().toISOString().slice(2, 7).replace('-', '');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const orderNumber = `BH-${datePrefix}-${randomSuffix}`;

    const slot = startTime ? `${startTime} — 14:00` : '10:00 — 14:00';

    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        addressLine1: addressLine1.trim(),
        serviceType: serviceType || 'Стандартная уборка',
        price: Number(price) || 0,
        date: date ? new Date(date) : new Date(),
        timeSlot: slot,
        status: 'NEW',
        notes: notes ? `Онлайн-бронирование: ${notes}` : 'Онлайн-бронирование через сайт',
      },
    });

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания онлайн-заявки:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
