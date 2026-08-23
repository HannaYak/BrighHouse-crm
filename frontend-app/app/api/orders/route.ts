import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { sendPersonalOrderNotification } from '../../../lib/telegram';

// 1. Получение всех заказов
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        assignedCleaners: {
          include: { cleaner: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Ошибка получения заказов:', error);
    return NextResponse.json({ error: 'Ошибка получения заказов' }, { status: 500 });
  }
}

// 2. Создание нового заказа
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderNumber = `ORD-${Math.floor(100 + Math.random() * 900)}`;

    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        date: new Date(body.date),
        timeSlot: body.timeSlot || '10:00 — 14:00',
        serviceType: body.serviceType || 'STANDARD',
        areaM2: Number(body.areaM2) || 45,
        roomsCount: Number(body.roomsCount) || 1,
        bathroomsCount: Number(body.bathroomsCount) || 1,
        windowsCount: Number(body.windowsCount) || 0,

        hasOven: Boolean(body.hasOven),
        hasFridge: Boolean(body.hasFridge),
        hasMicrowave: Boolean(body.hasMicrowave),
        hasBalcony: Boolean(body.hasBalcony),
        hasDishes: Boolean(body.hasDishes),
        hasIroning: Boolean(body.hasIroning),
        hasVacuum: Boolean(body.hasVacuum),
        hasPets: Boolean(body.hasPets),
        hasKeys: Boolean(body.hasKeys),

        clientName: body.clientName || 'Новый Клиент',
        clientPhone: body.clientPhone || '',
        addressLine1: body.addressLine1 || '',
        addressLine2: body.addressLine2 || '',
        price: Number(body.price),
        cleanersCount: Number(body.cleanersCount) || 1,
        notes: body.notes || '',
        status: body.status || 'NEW',
        urgency: body.urgency || 'NORMAL',
        assignedCleaners: {
          create: (body.assignedCleaners || []).map((c: { id: number }) => ({
            cleanerId: c.id,
          })),
        },
      },
      include: {
        assignedCleaners: {
          include: { cleaner: true },
        },
      },
    });

    // Персональная отправка клинерам в Telegram
// Персональная отправка клинерам в Telegram
    await sendPersonalOrderNotification({
      orderId: newOrder.id,
      orderNumber,
      date: new Date(body.date).toLocaleDateString('ru-RU'),
      timeSlot: body.timeSlot || '10:00 — 14:00',
      serviceType: body.serviceType || 'Стандартная',
      areaM2: Number(body.areaM2) || 45,
      roomsCount: Number(body.roomsCount) || 1,
      bathroomsCount: Number(body.bathroomsCount) || 1,
      windowsCount: Number(body.windowsCount) || 0,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      price: Number(body.price),
      assignedCleaners: body.assignedCleaners || [],
      tags: {
        oven: body.hasOven,
        fridge: body.hasFridge,
        microwave: body.hasMicrowave,
        balcony: body.hasBalcony,
        dishes: body.hasDishes,
        ironing: body.hasIroning,
        vacuum: body.hasVacuum,
        pets: body.hasPets,
        keys: body.hasKeys,
      },
      notes: body.notes,
    });

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error('Ошибка сохранения заказа:', error);
    return NextResponse.json({ error: 'Ошибка сохранения заказа' }, { status: 500 });
  }
}

// 3. Обновление статуса (Drag-and-Drop)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, cancelReason } = body;

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status,
        ...(cancelReason ? { cancelReason } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Ошибка обновления статуса заказа:', error);
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
  }
}
